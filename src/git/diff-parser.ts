/**
 * Git diff parser - extracts changed files and line information
 */

import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';

export interface FileChange {
  path: string;
  language: string;
  additions: number;
  deletions: number;
  changes: number;
  binary: boolean;
  diff: string;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export interface ReviewContext {
  files: FileChange[];
  totalAdditions: number;
  totalDeletions: number;
  totalFiles: number;
  commit?: string;
}

export class DiffParser {
  private git: SimpleGit;

  constructor(repoPath: string = process.cwd()) {
    this.git = simpleGit(repoPath);
  }

  /**
   * Get diff for a specific commit
   */
  async getCommitDiff(commitHash: string): Promise<ReviewContext> {
    const fullDiff = await this.git.show([commitHash]);
    
    return this.parseDiff(fullDiff, commitHash);
  }

  /**
   * Get diff for staged changes
   */
  async getStagedDiff(): Promise<ReviewContext> {
    const fullDiff = await this.git.diff(['--cached']);
    
    return this.parseDiff(fullDiff);
  }

  /**
   * Get diff between current state and HEAD
   */
  async getUnstagedDiff(): Promise<ReviewContext> {
    const fullDiff = await this.git.diff();
    
    return this.parseDiff(fullDiff);
  }

  /**
   * Get diff for a specific file
   */
  async getFileDiff(filePath: string, staged = false): Promise<FileChange | null> {
    const args = staged ? ['--cached', '--', filePath] : ['--', filePath];
    const diff = await this.git.diff(args);
    
    if (!diff) {
      return null;
    }
    
    const context = this.parseDiff(diff);
    return context.files[0] || null;
  }

  /**
   * Parse unified diff format
   */
  private parseDiff(diffText: string, commit?: string): ReviewContext {
    const files: FileChange[] = [];
    let totalAdditions = 0;
    let totalDeletions = 0;

    // Split by file headers (diff --git)
    const fileBlocks = diffText.split(/^diff --git /m).slice(1);

    for (const block of fileBlocks) {
      const lines = block.split('\n');
      const headerLine = lines[0];
      
      // Extract file paths
      const match = headerLine.match(/a\/(.*?) b\/(.*)/);
      if (!match) continue;
      
      const filePath = match[2];
      
      // Check if binary
      const isBinary = block.includes('Binary files');
      if (isBinary) {
        files.push({
          path: filePath,
          language: this.detectLanguage(filePath),
          additions: 0,
          deletions: 0,
          changes: 0,
          binary: true,
          diff: '',
          hunks: [],
        });
        continue;
      }

      // Parse hunks
      const hunks: DiffHunk[] = [];
      let currentHunk: DiffHunk | null = null;
      let additions = 0;
      let deletions = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        // Hunk header: @@ -oldStart,oldLines +newStart,newLines @@
        const hunkMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (hunkMatch) {
          if (currentHunk) {
            hunks.push(currentHunk);
          }
          currentHunk = {
            oldStart: parseInt(hunkMatch[1]),
            oldLines: parseInt(hunkMatch[2] || '1'),
            newStart: parseInt(hunkMatch[3]),
            newLines: parseInt(hunkMatch[4] || '1'),
            lines: [],
          };
          continue;
        }

        if (currentHunk) {
          currentHunk.lines.push(line);
          
          if (line.startsWith('+') && !line.startsWith('+++')) {
            additions++;
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            deletions++;
          }
        }
      }

      if (currentHunk) {
        hunks.push(currentHunk);
      }

      totalAdditions += additions;
      totalDeletions += deletions;

      files.push({
        path: filePath,
        language: this.detectLanguage(filePath),
        additions,
        deletions,
        changes: additions + deletions,
        binary: false,
        diff: block,
        hunks,
      });
    }

    return {
      files,
      totalAdditions,
      totalDeletions,
      totalFiles: files.length,
      commit,
    };
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cc': 'cpp',
      '.h': 'cpp',
      '.hpp': 'cpp',
      '.cs': 'csharp',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.sh': 'shell',
      '.bash': 'shell',
      '.zsh': 'shell',
      '.md': 'markdown',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.toml': 'toml',
      '.xml': 'xml',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.sql': 'sql',
    };

    return languageMap[ext] || 'unknown';
  }

  /**
   * Check if repository is clean
   */
  async isClean(): Promise<boolean> {
    const status = await this.git.status();
    return status.isClean();
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    const branch = await this.git.branch();
    return branch.current;
  }

  /**
   * Get latest commit hash
   */
  async getLatestCommit(): Promise<string> {
    const log = await this.git.log({ maxCount: 1 });
    return log.latest?.hash || '';
  }
}
