/**
 * Logging utility with colored output
 */

import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export class Logger {
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  debug(message: string, ...args: any[]): void {
    if (this.verbose) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    console.log(chalk.blue(`ℹ ${message}`), ...args);
  }

  success(message: string, ...args: any[]): void {
    console.log(chalk.green(`✓ ${message}`), ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.log(chalk.yellow(`⚠ ${message}`), ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(chalk.red(`✗ ${message}`), ...args);
  }

  section(title: string): void {
    console.log('\n' + chalk.bold.underline(title));
  }

  subsection(title: string): void {
    console.log('\n' + chalk.bold(title));
  }

  separator(): void {
    console.log(chalk.dim('━'.repeat(60)));
  }

  newLine(): void {
    console.log();
  }
}

// Global logger instance
export const logger = new Logger();
