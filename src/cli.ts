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
      
      // Validate configuration
      const validation = validateConfig(config);
      if (!validation.valid) {
        logger.error('Configuration validation failed:');
        validation.errors.forEach(err => logger.error(`  - ${err}`));
        process.exit(1);
      }

      if (!config.enabled) {
        logger.warn('AI review is disabled in configuration');
        process.exit(0);
      }

      // Initialize components
      const diffParser = new DiffParser();
      const reporter = new TerminalReporter();
      
      // Get API key
      const apiKey = getAPIKey(config);
      if (!apiKey) {
        logger.error('Missing API key. Set ANTHROPIC_API_KEY environment variable.');
        process.exit(1);
      }

      const reviewer = new ClaudeReviewer(apiKey, config.ai);

      // Test API connection
      const spinner = ora('Testing AI connection...').start();
      const connected = await reviewer.testConnection();
      
      if (!connected) {
        spinner.fail('Failed to connect to AI service');
        process.exit(1);
      }
      spinner.succeed('Connected to AI service');

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

      // Run AI review
      spinner.text = 'Running AI code review...';
      spinner.start();
      
      const result = await reviewer.reviewChanges(context);
      
      spinner.succeed('Review completed');

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

      console.log(chalk.bold('\n📋 AI Code Review Status\n'));
      console.log(`Enabled: ${config.enabled ? chalk.green('✓') : chalk.red('✗')}`);
      console.log(`AI Provider: ${config.ai.provider}`);
      console.log(`Model: ${config.ai.model}`);
      console.log(`Pre-commit: ${config.hooks.preCommit}`);
      console.log(`Pre-push: ${config.hooks.prePush}`);
      
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
