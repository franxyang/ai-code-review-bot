/**
 * Static code analyzer - runs without AI
 * Detects common issues through pattern matching
 */

import { FileChange } from '../git/diff-parser.js';
import { ReviewIssue } from '../models/claude.js';

export interface StaticAnalysisResult {
  issues: ReviewIssue[];
  filesAnalyzed: number;
  issuesFound: number;
}

export class StaticAnalyzer {
  /**
   * Analyze code changes for common issues
   */
  analyze(files: FileChange[]): StaticAnalysisResult {
    const issues: ReviewIssue[] = [];

    for (const file of files) {
      if (file.binary) continue;

      // Analyze based on language
      switch (file.language) {
        case 'python':
          issues.push(...this.analyzePython(file));
          break;
        case 'javascript':
        case 'typescript':
          issues.push(...this.analyzeJavaScript(file));
          break;
        case 'go':
          issues.push(...this.analyzeGo(file));
          break;
        default:
          issues.push(...this.analyzeGeneric(file));
      }
    }

    return {
      issues,
      filesAnalyzed: files.filter(f => !f.binary).length,
      issuesFound: issues.length,
    };
  }

  /**
   * Analyze Python code
   */
  private analyzePython(file: FileChange): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const lines = file.diff.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = this.getLineNumber(lines, i);

      // Skip if not an addition
      if (!line.startsWith('+') || line.startsWith('+++')) continue;

      const content = line.substring(1).trim();

      // Security: Hardcoded secrets
      if (this.containsHardcodedSecret(content)) {
        issues.push({
          severity: 'error',
          file: file.path,
          line: lineNumber,
          message: 'Potential hardcoded secret detected',
          suggestion: 'Use environment variables or a secrets manager',
          category: 'security',
        });
      }

      // Security: SQL injection patterns
      if (this.hasSQLInjectionRisk(content)) {
        issues.push({
          severity: 'error',
          file: file.path,
          line: lineNumber,
          message: 'Potential SQL injection vulnerability',
          suggestion: 'Use parameterized queries or an ORM',
          category: 'security',
        });
      }

      // Security: eval/exec usage
      if (/\b(eval|exec)\s*\(/.test(content)) {
        issues.push({
          severity: 'error',
          file: file.path,
          line: lineNumber,
          message: 'Use of eval() or exec() is dangerous',
          suggestion: 'Avoid dynamic code execution',
          category: 'security',
        });
      }

      // Security: pickle usage
      if (/import\s+pickle|from\s+pickle/.test(content)) {
        issues.push({
          severity: 'warning',
          file: file.path,
          line: lineNumber,
          message: 'pickle module can execute arbitrary code',
          suggestion: 'Consider using json or a safer serialization format',
          category: 'security',
        });
      }

      // Performance: list concatenation in loop
      if (/for\s+.*:\s*\n\s*.*\+=/m.test(content)) {
        issues.push({
          severity: 'info',
          file: file.path,
          line: lineNumber,
          message: 'List concatenation in loop is inefficient',
          suggestion: 'Use list comprehension or append()',
          category: 'performance',
        });
      }

      // Style: print statements (might be debug code)
      if (/^\s*print\s*\(/.test(content) && !content.includes('#')) {
        issues.push({
          severity: 'info',
          file: file.path,
          line: lineNumber,
          message: 'print() statement found - debug code?',
          suggestion: 'Use logging instead of print() in production',
          category: 'style',
        });
      }

      // Bug: bare except
      if (/except\s*:/.test(content)) {
        issues.push({
          severity: 'warning',
          file: file.path,
          line: lineNumber,
          message: 'Bare except clause catches all exceptions',
          suggestion: 'Catch specific exceptions',
          category: 'bug',
        });
      }

      // Maintainability: very long line
      if (content.length > 120) {
        issues.push({
          severity: 'info',
          file: file.path,
          line: lineNumber,
          message: `Line too long (${content.length} chars)`,
          suggestion: 'Break into multiple lines (PEP 8: max 79-120 chars)',
          category: 'style',
        });
      }
    }

    return issues;
  }

  /**
   * Analyze JavaScript/TypeScript code
   */
  private analyzeJavaScript(file: FileChange): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const lines = file.diff.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = this.getLineNumber(lines, i);

      if (!line.startsWith('+') || line.startsWith('+++')) continue;

      const content = line.substring(1).trim();

      // Security: Hardcoded secrets
      if (this.containsHardcodedSecret(content)) {
        issues.push({
          severity: 'error',
          file: file.path,
          line: lineNumber,
          message: 'Potential hardcoded secret detected',
          suggestion: 'Use environment variables',
          category: 'security',
        });
      }

      // Security: eval usage
      if (/\beval\s*\(/.test(content)) {
        issues.push({
          severity: 'error',
          file: file.path,
          line: lineNumber,
          message: 'eval() is dangerous and should be avoided',
          suggestion: 'Use safer alternatives',
          category: 'security',
        });
      }

      // Security: innerHTML usage
      if (/\.innerHTML\s*=/.test(content)) {
        issues.push({
          severity: 'warning',
          file: file.path,
          line: lineNumber,
          message: 'innerHTML can lead to XSS vulnerabilities',
          suggestion: 'Use textContent or a sanitization library',
          category: 'security',
        });
      }

      // Bug: == instead of ===
      if (/[^=!<>]==[^=]/.test(content) && !content.includes('===')) {
        issues.push({
          severity: 'warning',
          file: file.path,
          line: lineNumber,
          message: 'Use === instead of == for comparison',
          suggestion: 'Strict equality prevents type coercion bugs',
          category: 'bug',
        });
      }

      // Style: console.log (might be debug code)
      if (/console\.(log|debug|info)/.test(content) && !content.includes('//')) {
        issues.push({
          severity: 'info',
          file: file.path,
          line: lineNumber,
          message: 'console.log() found - debug code?',
          suggestion: 'Remove or use proper logging library',
          category: 'style',
        });
      }

      // Bug: var usage
      if (/\bvar\s+/.test(content)) {
        issues.push({
          severity: 'info',
          file: file.path,
          line: lineNumber,
          message: 'var is deprecated, use let or const',
          suggestion: 'const for constants, let for variables',
          category: 'best-practice',
        });
      }

      // Performance: nested loops
      if (/for\s*\(.*\)\s*{[\s\S]*for\s*\(/m.test(content)) {
        issues.push({
          severity: 'info',
          file: file.path,
          line: lineNumber,
          message: 'Nested loops detected - check complexity',
          suggestion: 'Consider optimization if data set is large',
          category: 'performance',
        });
      }
    }

    return issues;
  }

  /**
   * Analyze Go code
   */
  private analyzeGo(file: FileChange): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const lines = file.diff.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = this.getLineNumber(lines, i);

      if (!line.startsWith('+') || line.startsWith('+++')) continue;

      const content = line.substring(1).trim();

      // Security: Hardcoded secrets
      if (this.containsHardcodedSecret(content)) {
        issues.push({
          severity: 'error',
          file: file.path,
          line: lineNumber,
          message: 'Potential hardcoded secret detected',
          suggestion: 'Use environment variables or config files',
          category: 'security',
        });
      }

      // Bug: ignoring errors
      if (/,\s*_\s*:?=/.test(content) && content.includes('err')) {
        issues.push({
          severity: 'warning',
          file: file.path,
          line: lineNumber,
          message: 'Error value is being ignored',
          suggestion: 'Always handle errors in Go',
          category: 'bug',
        });
      }

      // Performance: defer in loop
      if (/for\s.*{[\s\S]*defer\s/m.test(content)) {
        issues.push({
          severity: 'warning',
          file: file.path,
          line: lineNumber,
          message: 'defer inside loop can cause resource issues',
          suggestion: 'Move defer outside loop or use explicit cleanup',
          category: 'performance',
        });
      }
    }

    return issues;
  }

  /**
   * Generic analysis for all languages
   */
  private analyzeGeneric(file: FileChange): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const lines = file.diff.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = this.getLineNumber(lines, i);

      if (!line.startsWith('+') || line.startsWith('+++')) continue;

      const content = line.substring(1).trim();

      // Security: Hardcoded secrets
      if (this.containsHardcodedSecret(content)) {
        issues.push({
          severity: 'error',
          file: file.path,
          line: lineNumber,
          message: 'Potential hardcoded secret detected',
          suggestion: 'Use environment variables or a secrets manager',
          category: 'security',
        });
      }

      // Style: TODO/FIXME comments
      if (/TODO|FIXME|XXX|HACK/.test(content)) {
        issues.push({
          severity: 'info',
          file: file.path,
          line: lineNumber,
          message: 'TODO/FIXME comment found',
          suggestion: 'Create a ticket to track this work',
          category: 'maintainability',
        });
      }
    }

    return issues;
  }

  /**
   * Check if line contains hardcoded secret patterns
   */
  private containsHardcodedSecret(line: string): boolean {
    const secretPatterns = [
      // API keys
      /api[_-]?key\s*=\s*["'][^"']{20,}["']/i,
      /apikey\s*=\s*["'][^"']{20,}["']/i,
      
      // Tokens
      /token\s*=\s*["'][^"']{20,}["']/i,
      /secret\s*=\s*["'][^"']{20,}["']/i,
      /auth[_-]?token\s*=\s*["'][^"']{20,}["']/i,
      
      // Passwords
      /password\s*=\s*["'][^"']+["']/i,
      /passwd\s*=\s*["'][^"']+["']/i,
      /pwd\s*=\s*["'][^"']+["']/i,
      
      // AWS
      /AKIA[0-9A-Z]{16}/,
      
      // Private keys
      /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
      
      // Generic secrets
      /sk-[a-zA-Z0-9]{32,}/,
      /ghp_[a-zA-Z0-9]{36}/,
    ];

    return secretPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Check for SQL injection patterns
   */
  private hasSQLInjectionRisk(line: string): boolean {
    // String formatting with SQL keywords
    const sqlPatterns = [
      /f["'].*SELECT.*\{.*\}.*["']/i,
      /f["'].*INSERT.*\{.*\}.*["']/i,
      /f["'].*UPDATE.*\{.*\}.*["']/i,
      /f["'].*DELETE.*\{.*\}.*["']/i,
      /["'].*SELECT.*["']\s*\+/i,
      /["'].*INSERT.*["']\s*\+/i,
      /\.format\(.*\).*SELECT/i,
      /%s.*SELECT/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Extract line number from diff context
   */
  private getLineNumber(lines: string[], index: number): number | undefined {
    // Look backwards for the last hunk header
    for (let i = index; i >= 0; i--) {
      const hunkMatch = lines[i].match(/^@@ -\d+,?\d* \+(\d+),?\d* @@/);
      if (hunkMatch) {
        const startLine = parseInt(hunkMatch[1]);
        // Count additions from hunk start to current line
        let offset = 0;
        for (let j = i + 1; j <= index; j++) {
          if (lines[j].startsWith('+') && !lines[j].startsWith('+++')) {
            offset++;
          }
        }
        return startLine + offset - 1;
      }
    }
    return undefined;
  }
}
