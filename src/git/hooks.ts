/**
 * Git hooks installation and management
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

export interface HookInstallOptions {
  force?: boolean;
  backup?: boolean;
}

export class GitHooksManager {
  private gitDir: string;
  private hooksDir: string;

  constructor(repoPath: string = process.cwd()) {
    this.gitDir = path.join(repoPath, '.git');
    this.hooksDir = path.join(this.gitDir, 'hooks');
  }

  /**
   * Check if we're in a git repository
   */
  async isGitRepo(): Promise<boolean> {
    try {
      await fs.access(this.gitDir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Install pre-commit hook
   */
  async installPreCommit(options: HookInstallOptions = {}): Promise<void> {
    const hookPath = path.join(this.hooksDir, 'pre-commit');
    
    if (!await this.isGitRepo()) {
      throw new Error('Not a git repository');
    }

    // Ensure hooks directory exists
    await fs.mkdir(this.hooksDir, { recursive: true });

    // Backup existing hook if requested
    if (options.backup) {
      await this.backupHook('pre-commit');
    }

    // Check if hook already exists
    if (!options.force) {
      try {
        await fs.access(hookPath);
        throw new Error('pre-commit hook already exists. Use --force to overwrite');
      } catch (error: any) {
        if (error.code !== 'ENOENT') throw error;
      }
    }

    const hookContent = this.generatePreCommitHook();
    await fs.writeFile(hookPath, hookContent, { mode: 0o755 });
    
    logger.success('pre-commit hook installed');
  }

  /**
   * Install pre-push hook
   */
  async installPrePush(options: HookInstallOptions = {}): Promise<void> {
    const hookPath = path.join(this.hooksDir, 'pre-push');
    
    if (!await this.isGitRepo()) {
      throw new Error('Not a git repository');
    }

    await fs.mkdir(this.hooksDir, { recursive: true });

    if (options.backup) {
      await this.backupHook('pre-push');
    }

    if (!options.force) {
      try {
        await fs.access(hookPath);
        throw new Error('pre-push hook already exists. Use --force to overwrite');
      } catch (error: any) {
        if (error.code !== 'ENOENT') throw error;
      }
    }

    const hookContent = this.generatePrePushHook();
    await fs.writeFile(hookPath, hookContent, { mode: 0o755 });
    
    logger.success('pre-push hook installed');
  }

  /**
   * Install all hooks
   */
  async installAll(options: HookInstallOptions = {}): Promise<void> {
    await this.installPreCommit(options);
    await this.installPrePush(options);
  }

  /**
   * Uninstall pre-commit hook
   */
  async uninstallPreCommit(): Promise<void> {
    const hookPath = path.join(this.hooksDir, 'pre-commit');
    
    try {
      const content = await fs.readFile(hookPath, 'utf-8');
      
      // Only remove if it's our hook
      if (content.includes('ai-review')) {
        await fs.unlink(hookPath);
        logger.success('pre-commit hook removed');
      } else {
        throw new Error('Hook was not installed by ai-review');
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.warn('pre-commit hook not found');
      } else {
        throw error;
      }
    }
  }

  /**
   * Uninstall pre-push hook
   */
  async uninstallPrePush(): Promise<void> {
    const hookPath = path.join(this.hooksDir, 'pre-push');
    
    try {
      const content = await fs.readFile(hookPath, 'utf-8');
      
      if (content.includes('ai-review')) {
        await fs.unlink(hookPath);
        logger.success('pre-push hook removed');
      } else {
        throw new Error('Hook was not installed by ai-review');
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.warn('pre-push hook not found');
      } else {
        throw error;
      }
    }
  }

  /**
   * Uninstall all hooks
   */
  async uninstallAll(): Promise<void> {
    await this.uninstallPreCommit();
    await this.uninstallPrePush();
  }

  /**
   * Check hook installation status
   */
  async getStatus(): Promise<{
    isGitRepo: boolean;
    preCommit: 'installed' | 'not-installed' | 'foreign';
    prePush: 'installed' | 'not-installed' | 'foreign';
  }> {
    const isGitRepo = await this.isGitRepo();
    
    if (!isGitRepo) {
      return {
        isGitRepo: false,
        preCommit: 'not-installed',
        prePush: 'not-installed',
      };
    }

    const preCommit = await this.checkHook('pre-commit');
    const prePush = await this.checkHook('pre-push');

    return { isGitRepo, preCommit, prePush };
  }

  /**
   * Check individual hook status
   */
  private async checkHook(hookName: string): Promise<'installed' | 'not-installed' | 'foreign'> {
    const hookPath = path.join(this.hooksDir, hookName);
    
    try {
      const content = await fs.readFile(hookPath, 'utf-8');
      return content.includes('ai-review') ? 'installed' : 'foreign';
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return 'not-installed';
      }
      throw error;
    }
  }

  /**
   * Backup existing hook
   */
  private async backupHook(hookName: string): Promise<void> {
    const hookPath = path.join(this.hooksDir, hookName);
    const backupPath = `${hookPath}.backup-${Date.now()}`;
    
    try {
      await fs.access(hookPath);
      await fs.copyFile(hookPath, backupPath);
      logger.info(`Backed up existing hook to ${path.basename(backupPath)}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  /**
   * Generate pre-commit hook script
   */
  private generatePreCommitHook(): string {
    return `#!/bin/sh
# ai-review pre-commit hook
# Auto-generated - do not edit manually

# Colors
RED='\\033[0;31m'
YELLOW='\\033[1;33m'
GREEN='\\033[0;32m'
NC='\\033[0m' # No Color

echo "🔍 Running AI code review (pre-commit)..."

# Find ai-review executable
if command -v ai-review &> /dev/null; then
    AI_REVIEW_CMD="ai-review"
elif [ -f "./node_modules/.bin/ai-review" ]; then
    AI_REVIEW_CMD="./node_modules/.bin/ai-review"
elif [ -f "./dist/cli.js" ]; then
    AI_REVIEW_CMD="node ./dist/cli.js"
else
    echo "\${YELLOW}⚠ ai-review not found, skipping review\${NC}"
    exit 0
fi

# Run review with timeout
timeout 60 $AI_REVIEW_CMD review --staged 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 124 ]; then
    echo "\${YELLOW}⚠ Review timed out (60s), allowing commit\${NC}"
    exit 0
elif [ $EXIT_CODE -ne 0 ]; then
    echo "\${RED}✗ Review failed. Fix issues or use --no-verify to skip\${NC}"
    exit 1
fi

echo "\${GREEN}✓ Review passed\${NC}"
exit 0
`;
  }

  /**
   * Generate pre-push hook script
   */
  private generatePrePushHook(): string {
    return `#!/bin/sh
# ai-review pre-push hook
# Auto-generated - do not edit manually

RED='\\033[0;31m'
YELLOW='\\033[1;33m'
GREEN='\\033[0;32m'
NC='\\033[0m'

echo "🔍 Running full AI code review (pre-push)..."

# Find ai-review executable
if command -v ai-review &> /dev/null; then
    AI_REVIEW_CMD="ai-review"
elif [ -f "./node_modules/.bin/ai-review" ]; then
    AI_REVIEW_CMD="./node_modules/.bin/ai-review"
elif [ -f "./dist/cli.js" ]; then
    AI_REVIEW_CMD="node ./dist/cli.js"
else
    echo "\${YELLOW}⚠ ai-review not found, skipping review\${NC}"
    exit 0
fi

# Run full review with longer timeout
timeout 300 $AI_REVIEW_CMD review --commit HEAD 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 124 ]; then
    echo "\${YELLOW}⚠ Review timed out (5min), allowing push\${NC}"
    exit 0
elif [ $EXIT_CODE -ne 0 ]; then
    echo "\${RED}✗ Review failed. Fix issues or use --no-verify to skip\${NC}"
    exit 1
fi

echo "\${GREEN}✓ Review passed\${NC}"
exit 0
`;
  }
}
