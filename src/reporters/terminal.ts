/**
 * Terminal reporter - beautiful console output for review results
 */

import chalk from 'chalk';
import boxen from 'boxen';
import { ReviewResult, ReviewIssue } from '../models/claude.js';
import { ReviewContext } from '../git/diff-parser.js';

export class TerminalReporter {
  /**
   * Print full review report to terminal
   */
  printReview(context: ReviewContext, result: ReviewResult): void {
    console.log();
    this.printHeader(context);
    console.log();
    this.printScore(result.overallScore);
    console.log();
    this.printSummary(result.summary);
    console.log();
    
    if (result.issues.length > 0) {
      this.printIssues(result.issues);
      console.log();
    }
    
    if (result.suggestions.length > 0) {
      this.printSuggestions(result.suggestions);
      console.log();
    }
    
    if (result.positivePoints.length > 0) {
      this.printPositivePoints(result.positivePoints);
      console.log();
    }
    
    this.printFooter(result);
  }

  /**
   * Print header with file changes
   */
  private printHeader(context: ReviewContext): void {
    const title = context.commit 
      ? `🔍 Reviewing commit: ${context.commit.substring(0, 8)}`
      : '🔍 Reviewing changes';
    
    console.log(chalk.bold.cyan(title));
    console.log(chalk.dim('━'.repeat(60)));
    
    console.log(chalk.bold('\n📂 Files changed:'), context.totalFiles);
    
    const fileList = context.files
      .filter(f => !f.binary)
      .slice(0, 10) // Show max 10 files
      .map(f => {
        const icon = f.additions > f.deletions ? chalk.green('✓') : chalk.yellow('~');
        const stats = chalk.dim(`(+${f.additions}, -${f.deletions})`);
        return `  ${icon} ${f.path} ${stats}`;
      })
      .join('\n');
    
    console.log(fileList);
    
    if (context.files.length > 10) {
      console.log(chalk.dim(`  ... and ${context.files.length - 10} more files`));
    }
  }

  /**
   * Print overall score with visual indicator
   */
  private printScore(score: number): void {
    const scoreBox = this.getScoreBox(score);
    console.log(scoreBox);
  }

  /**
   * Get styled score box
   */
  private getScoreBox(score: number): string {
    let color: typeof chalk.green = chalk.green;
    let emoji = '🎉';
    let label = 'Excellent';

    if (score < 5) {
      color = chalk.red;
      emoji = '🔴';
      label = 'Needs Work';
    } else if (score < 7) {
      color = chalk.yellow;
      emoji = '🟡';
      label = 'Good';
    } else if (score < 8.5) {
      color = chalk.cyan;
      emoji = '🟢';
      label = 'Very Good';
    }

    const content = `${emoji} Overall Score: ${color.bold(score.toFixed(1))}/10 - ${label}`;

    return boxen(content, {
      padding: { left: 2, right: 2, top: 0, bottom: 0 },
      borderStyle: 'round',
      borderColor: score < 5 ? 'red' : score < 7 ? 'yellow' : 'green',
    });
  }

  /**
   * Print summary
   */
  private printSummary(summary: string): void {
    console.log(chalk.bold('📝 Summary:'));
    console.log(chalk.white(summary));
  }

  /**
   * Print issues grouped by severity
   */
  private printIssues(issues: ReviewIssue[]): void {
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    const infos = issues.filter(i => i.severity === 'info');

    if (errors.length > 0) {
      console.log(chalk.bold.red(`\n🔴 Errors (${errors.length})`));
      this.printIssueList(errors, 'red');
    }

    if (warnings.length > 0) {
      console.log(chalk.bold.yellow(`\n🟡 Warnings (${warnings.length})`));
      this.printIssueList(warnings, 'yellow');
    }

    if (infos.length > 0) {
      console.log(chalk.bold.blue(`\n💡 Info (${infos.length})`));
      this.printIssueList(infos, 'blue');
    }
  }

  /**
   * Print list of issues
   */
  private printIssueList(issues: ReviewIssue[], color: 'red' | 'yellow' | 'blue'): void {
    const colorFn = chalk[color];
    
    issues.forEach((issue, index) => {
      const location = issue.line 
        ? `${issue.file}:${issue.line}`
        : issue.file;
      
      console.log(`  ${colorFn('⚠')} ${chalk.dim(location)}`);
      console.log(`    ${issue.message}`);
      
      if (issue.suggestion) {
        console.log(chalk.dim(`    💡 ${issue.suggestion}`));
      }
      
      if (index < issues.length - 1) {
        console.log();
      }
    });
  }

  /**
   * Print suggestions
   */
  private printSuggestions(suggestions: string[]): void {
    console.log(chalk.bold.cyan('💡 Suggestions'));
    suggestions.forEach(suggestion => {
      console.log(`  • ${suggestion}`);
    });
  }

  /**
   * Print positive points
   */
  private printPositivePoints(points: string[]): void {
    console.log(chalk.bold.green('✅ What\'s Good'));
    points.forEach(point => {
      console.log(`  • ${point}`);
    });
  }

  /**
   * Print footer with metadata
   */
  private printFooter(result: ReviewResult): void {
    console.log(chalk.dim('━'.repeat(60)));
    const timeStr = (result.reviewTime / 1000).toFixed(1);
    console.log(chalk.dim(`⏱️  Review completed in ${timeStr}s`));
  }

  /**
   * Print simple progress indicator
   */
  printProgress(message: string): void {
    console.log(chalk.cyan(`⏳ ${message}...`));
  }

  /**
   * Print warning message
   */
  printWarning(message: string): void {
    console.log(chalk.yellow(`⚠️  ${message}`));
  }

  /**
   * Print error message
   */
  printError(message: string): void {
    console.log(chalk.red(`✗ ${message}`));
  }

  /**
   * Print success message
   */
  printSuccess(message: string): void {
    console.log(chalk.green(`✓ ${message}`));
  }
}
