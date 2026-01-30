/**
 * Unit tests for StaticAnalyzer
 */

import { StaticAnalyzer } from '../src/analyzers/static.js';
import { FileChange } from '../src/git/diff-parser.js';

describe('StaticAnalyzer', () => {
  let analyzer: StaticAnalyzer;

  beforeEach(() => {
    analyzer = new StaticAnalyzer();
  });

  describe('Python Analysis', () => {
    it('should detect hardcoded secrets', () => {
      const file: FileChange = {
        path: 'test.py',
        language: 'python',
        additions: 1,
        deletions: 0,
        changes: 1,
        binary: false,
        diff: `@@ -0,0 +1,1 @@
+API_KEY = "sk-1234567890abcdef"`,
        hunks: [],
      };

      const result = analyzer.analyze([file]);
      
      expect(result.issuesFound).toBeGreaterThan(0);
      expect(result.issues[0].category).toBe('security');
      expect(result.issues[0].message).toContain('secret');
    });

    it('should detect SQL injection', () => {
      const file: FileChange = {
        path: 'test.py',
        language: 'python',
        additions: 1,
        deletions: 0,
        changes: 1,
        binary: false,
        diff: `@@ -0,0 +1,1 @@
+query = f"SELECT * FROM users WHERE id = {user_id}"`,
        hunks: [],
      };

      const result = analyzer.analyze([file]);
      
      expect(result.issuesFound).toBeGreaterThan(0);
      expect(result.issues[0].category).toBe('security');
      expect(result.issues[0].message).toContain('SQL injection');
    });

    it('should detect eval usage', () => {
      const file: FileChange = {
        path: 'test.py',
        language: 'python',
        additions: 1,
        deletions: 0,
        changes: 1,
        binary: false,
        diff: `@@ -0,0 +1,1 @@
+result = eval(user_input)`,
        hunks: [],
      };

      const result = analyzer.analyze([file]);
      
      expect(result.issuesFound).toBeGreaterThan(0);
      expect(result.issues[0].severity).toBe('error');
      expect(result.issues[0].message).toContain('eval');
    });

    it('should detect bare except', () => {
      const file: FileChange = {
        path: 'test.py',
        language: 'python',
        additions: 1,
        deletions: 0,
        changes: 1,
        binary: false,
        diff: `@@ -0,0 +1,1 @@
+except:`,
        hunks: [],
      };

      const result = analyzer.analyze([file]);
      
      expect(result.issuesFound).toBeGreaterThan(0);
      expect(result.issues[0].severity).toBe('warning');
    });
  });

  describe('JavaScript Analysis', () => {
    it('should detect == usage', () => {
      const file: FileChange = {
        path: 'test.js',
        language: 'javascript',
        additions: 1,
        deletions: 0,
        changes: 1,
        binary: false,
        diff: `@@ -0,0 +1,1 @@
+if (x == 5) { }`,
        hunks: [],
      };

      const result = analyzer.analyze([file]);
      
      expect(result.issuesFound).toBeGreaterThan(0);
      expect(result.issues[0].message).toContain('===');
    });

    it('should detect innerHTML usage', () => {
      const file: FileChange = {
        path: 'test.js',
        language: 'javascript',
        additions: 1,
        deletions: 0,
        changes: 1,
        binary: false,
        diff: `@@ -0,0 +1,1 @@
+element.innerHTML = userInput;`,
        hunks: [],
      };

      const result = analyzer.analyze([file]);
      
      expect(result.issuesFound).toBeGreaterThan(0);
      expect(result.issues[0].category).toBe('security');
      expect(result.issues[0].message).toContain('XSS');
    });

    it('should detect var usage', () => {
      const file: FileChange = {
        path: 'test.js',
        language: 'javascript',
        additions: 1,
        deletions: 0,
        changes: 1,
        binary: false,
        diff: `@@ -0,0 +1,1 @@
+var x = 10;`,
        hunks: [],
      };

      const result = analyzer.analyze([file]);
      
      expect(result.issuesFound).toBeGreaterThan(0);
      expect(result.issues[0].category).toBe('best-practice');
    });
  });

  describe('Generic Analysis', () => {
    it('should detect TODO comments', () => {
      const file: FileChange = {
        path: 'test.txt',
        language: 'unknown',
        additions: 1,
        deletions: 0,
        changes: 1,
        binary: false,
        diff: `@@ -0,0 +1,1 @@
+// TODO: fix this later`,
        hunks: [],
      };

      const result = analyzer.analyze([file]);
      
      expect(result.issuesFound).toBeGreaterThan(0);
      expect(result.issues[0].message).toContain('TODO');
    });

    it('should skip binary files', () => {
      const file: FileChange = {
        path: 'test.bin',
        language: 'unknown',
        additions: 0,
        deletions: 0,
        changes: 0,
        binary: true,
        diff: '',
        hunks: [],
      };

      const result = analyzer.analyze([file]);
      
      expect(result.filesAnalyzed).toBe(0);
      expect(result.issuesFound).toBe(0);
    });
  });

  describe('Multiple Files', () => {
    it('should analyze multiple files', () => {
      const files: FileChange[] = [
        {
          path: 'test1.py',
          language: 'python',
          additions: 1,
          deletions: 0,
          changes: 1,
          binary: false,
          diff: `@@ -0,0 +1,1 @@
+password = "admin123"`,
          hunks: [],
        },
        {
          path: 'test2.js',
          language: 'javascript',
          additions: 1,
          deletions: 0,
          changes: 1,
          binary: false,
          diff: `@@ -0,0 +1,1 @@
+eval(code)`,
          hunks: [],
        },
      ];

      const result = analyzer.analyze(files);
      
      expect(result.filesAnalyzed).toBe(2);
      expect(result.issuesFound).toBeGreaterThan(1);
    });
  });
});
