#!/usr/bin/env node

/**
 * AI Code Review Bot - CLI Entry Point
 */

import { Command } from 'commander';
import { loadConfig, getAPIKey, validateConfig, getExampleConfig } from './utils/config.js';
import { logger } from './utils/logger.js';
import { DiffParser } from './git/diff-parser.js';
import { ClaudeReviewer } from './models/claude.js';
import { TerminalReporter } from './reporters/terminal.js';
import { StaticAnalyzer } from './analyzers/static.js';
import { GitHooksManager } from './git/hooks.js';
import fs from 'fs/promises';
import path from 'path';
import ora from 'ora';

const program = new Command();

program
  .name('ai-review')
  .description('AI-powered code review tool')
  .version('0.1.0');

/**
 * Review command - main functionality
 */
program
  .command('review')
  .description('Review code changes')
  .option('-c, --commit <hash>', 'Review specific commit')
  .option('-f, --file <path>', 'Review specific file')
  .option('--staged', 'Review staged changes (default)')
  .option('--unstaged', 'Review unstaged changes')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      logger.setVerbose(options.verbose || false);
      
      // Load configuration
      const config = await loadConfig();

      if (!config.enabled) {
        logger.warn('AI review is disabled in configuration');
        process.exit(0);
      }
      
      // Check if API key is available
      const apiKey = getAPIKey(config);
      
      // Validate configuration (skip API key check if running static-only)
      if (apiKey) {
        const validation = validateConfig(config);
        if (!validation.valid) {
          logger.error('Configuration validation failed:');
          validation.errors.forEach(err => logger.error(`  - ${err}`));
          process.exit(1);
        }
      } else {
        logger.info('No API key found - running in static analysis mode');
      }

      // Initialize components
      const diffParser = new DiffParser();
      const reporter = new TerminalReporter();
      const reviewer = apiKey ? new ClaudeReviewer(apiKey, config.ai) : null;

      // Test API connection if available
      const spinner = ora();
      if (reviewer) {
        spinner.text = 'Testing AI connection...';
        spinner.start();
        const connected = await reviewer.testConnection();
        
        if (!connected) {
          spinner.fail('Failed to connect to AI service');
          logger.warn('Falling back to static analysis only');
        } else {
          spinner.succeed('Connected to AI service');
        }
      } else {
        logger.info('No API key configured - using static analysis only');
      }

      // Get diff based on options
      let context;
      
      if (options.commit) {
        spinner.text = `Analyzing commit ${options.commit}...`;
        spinner.start();
        context = await diffParser.getCommitDiff(options.commit);
      } else if (options.file) {
        spinner.text = `Analyzing file ${options.file}...`;
        spinner.start();
        const fileChange = await diffParser.getFileDiff(options.file, !options.unstaged);
        if (!fileChange) {
          spinner.fail('No changes found in file');
          process.exit(0);
        }
        context = {
          files: [fileChange],
          totalAdditions: fileChange.additions,
          totalDeletions: fileChange.deletions,
          totalFiles: 1,
        };
      } else if (options.unstaged) {
        spinner.text = 'Analyzing unstaged changes...';
        spinner.start();
        context = await diffParser.getUnstagedDiff();
      } else {
        spinner.text = 'Analyzing staged changes...';
        spinner.start();
        context = await diffParser.getStagedDiff();
      }

      spinner.succeed('Code changes loaded');

      if (context.totalFiles === 0) {
        logger.info('No changes to review');
        process.exit(0);
      }

      // Run static analysis first
      const staticAnalyzer = new StaticAnalyzer();
      spinner.text = 'Running static analysis...';
      spinner.start();
      
      const staticResult = staticAnalyzer.analyze(context.files);
      spinner.succeed(`Static analysis: ${staticResult.issuesFound} issues found`);

      // Run AI review if API key is available
      let result;
      if (reviewer && apiKey) {
        spinner.text = 'Running AI code review...';
        spinner.start();
        
        result = await reviewer.reviewChanges(context);
        
        // Merge static analysis issues
        result.issues = [...staticResult.issues, ...result.issues];
        
        spinner.succeed('Review completed');
      } else {
        // Static only mode
        logger.warn('No API key - running in static analysis mode only');
        result = {
          overallScore: staticResult.issuesFound === 0 ? 8 : Math.max(5, 8 - staticResult.issuesFound),
          issues: staticResult.issues,
          suggestions: [],
          positivePoints: [],
          summary: `Static analysis found ${staticResult.issuesFound} issues in ${staticResult.filesAnalyzed} files.`,
          reviewTime: 0,
        };
      }

      // Print results
      reporter.printReview(context, result);

      // Save report if configured
      if (config.output.markdown) {
        await saveMarkdownReport(context, result);
      }

      // Check thresholds
      if (result.overallScore < config.thresholds.blockPush) {
        logger.error(`\nScore below blocking threshold (${config.thresholds.blockPush}). Please address issues before pushing.`);
        process.exit(1);
      } else if (result.overallScore < config.thresholds.warning) {
        logger.warn(`\nScore below warning threshold (${config.thresholds.warning}). Consider improvements.`);
      }

    } catch (error) {
      logger.error(`Review failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (logger['verbose']) {
        console.error(error);
      }
      process.exit(1);
    }
  });

/**
 * Init command - create configuration file
 */
program
  .command('init')
  .description('Initialize AI review configuration')
  .action(async () => {
    try {
      const configPath = path.join(process.cwd(), '.aireviewrc.json');
      
      // Check if config already exists
      try {
        await fs.access(configPath);
        logger.warn('Configuration file already exists');
        process.exit(0);
      } catch {
        // File doesn't exist, create it
      }

      const exampleConfig = getExampleConfig();
      await fs.writeFile(configPath, exampleConfig, 'utf-8');
      
      logger.success(`Configuration file created: ${configPath}`);
      logger.info('Edit the file to customize your review settings');
      
    } catch (error) {
      logger.error(`Failed to create config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

/**
 * Status command - show current configuration
 */
program
  .command('status')
  .description('Show current configuration and status')
  .action(async () => {
    try {
      const config = await loadConfig();
      const validation = validateConfig(config);
      const hooksManager = new GitHooksManager();
      const hookStatus = await hooksManager.getStatus();

      console.log(chalk.bold('\n📋 AI Code Review Status\n'));
      console.log(`Enabled: ${config.enabled ? chalk.green('✓') : chalk.red('✗')}`);
      console.log(`AI Provider: ${config.ai.provider}`);
      console.log(`Model: ${config.ai.model}`);
      
      console.log(chalk.bold('\n🪝 Git Hooks'));
      console.log(`Git repo: ${hookStatus.isGitRepo ? chalk.green('✓') : chalk.red('✗')}`);
      console.log(`Pre-commit: ${getHookStatusIcon(hookStatus.preCommit)}`);
      console.log(`Pre-push: ${getHookStatusIcon(hookStatus.prePush)}`);
      
      console.log(chalk.bold('\n🎯 Thresholds'));
      console.log(`Block push: < ${config.thresholds.blockPush}`);
      console.log(`Warning: < ${config.thresholds.warning}`);

      console.log(chalk.bold('\n⚙️  Analyzers'));
      console.log(`Static: ${config.analyzers.static ? '✓' : '✗'}`);
      console.log(`Security: ${config.analyzers.security ? '✓' : '✗'}`);
      console.log(`Performance: ${config.analyzers.performance ? '✓' : '✗'}`);

      if (!validation.valid) {
        console.log(chalk.bold.red('\n⚠️  Configuration Issues:'));
        validation.errors.forEach(err => console.log(chalk.red(`  - ${err}`)));
      } else {
        console.log(chalk.green('\n✓ Configuration is valid'));
      }

    } catch (error) {
      logger.error(`Failed to load status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

/**
 * Hooks command - manage git hooks
 */
program
  .command('hooks')
  .description('Manage Git hooks')
  .argument('<action>', 'install, uninstall, or status')
  .option('--force', 'Overwrite existing hooks')
  .option('--backup', 'Backup existing hooks')
  .action(async (action: string, options) => {
    try {
      const hooksManager = new GitHooksManager();

      switch (action) {
        case 'install':
          await hooksManager.installAll(options);
          logger.success('All hooks installed successfully');
          break;

        case 'uninstall':
          await hooksManager.uninstallAll();
          logger.success('All hooks removed');
          break;

        case 'status':
          const status = await hooksManager.getStatus();
          console.log(chalk.bold('\n🪝 Git Hooks Status\n'));
          console.log(`Git repository: ${status.isGitRepo ? chalk.green('✓') : chalk.red('✗')}`);
          console.log(`Pre-commit: ${getHookStatusIcon(status.preCommit)}`);
          console.log(`Pre-push: ${getHookStatusIcon(status.prePush)}`);
          break;

        default:
          logger.error(`Unknown action: ${action}. Use install, uninstall, or status`);
          process.exit(1);
      }
    } catch (error) {
      logger.error(`Hooks management failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

/**
 * Helper to get hook status icon
 */
function getHookStatusIcon(status: 'installed' | 'not-installed' | 'foreign'): string {
  switch (status) {
    case 'installed':
      return chalk.green('✓ installed');
    case 'not-installed':
      return chalk.dim('✗ not installed');
    case 'foreign':
      return chalk.yellow('⚠ installed by another tool');
  }
}

/**
 * Save markdown report
 */
async function saveMarkdownReport(context: any, result: any): Promise<void> {
  const reportDir = path.join(process.cwd(), '.ai-review', 'reports');
  await fs.mkdir(reportDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const reportPath = path.join(reportDir, `review-${timestamp}.md`);
  
  const markdown = generateMarkdownReport(context, result);
  await fs.writeFile(reportPath, markdown, 'utf-8');
  
  logger.info(`Report saved: ${reportPath}`);
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(context: any, result: any): string {
  let md = `# Code Review Report\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Files Changed:** ${context.totalFiles}\n`;
  md += `**Lines Added:** ${context.totalAdditions}\n`;
  md += `**Lines Deleted:** ${context.totalDeletions}\n\n`;
  
  md += `## Overall Score: ${result.overallScore}/10\n\n`;
  md += `${result.summary}\n\n`;
  
  if (result.issues.length > 0) {
    md += `## Issues\n\n`;
    result.issues.forEach((issue: any) => {
      md += `### ${issue.severity.toUpperCase()}: ${issue.file}\n`;
      md += `${issue.message}\n\n`;
      if (issue.suggestion) {
        md += `**Suggestion:** ${issue.suggestion}\n\n`;
      }
    });
  }
  
  if (result.suggestions.length > 0) {
    md += `## Suggestions\n\n`;
    result.suggestions.forEach((s: string) => md += `- ${s}\n`);
    md += '\n';
  }
  
  if (result.positivePoints.length > 0) {
    md += `## Positive Points\n\n`;
    result.positivePoints.forEach((p: string) => md += `- ${p}\n`);
  }
  
  return md;
}

// Import chalk for status command
import chalk from 'chalk';

program.parse();
