/**
 * OpenAI GPT integration for code review
 * Provides AI-powered code analysis using OpenAI's GPT models
 */

import OpenAI from 'openai';
import { AIConfig } from '../utils/config.js';
import { ReviewContext } from '../git/diff-parser.js';
import { logger } from '../utils/logger.js';
import { withRetry, withTimeout } from '../utils/retry.js';

export interface ReviewIssue {
  severity: 'error' | 'warning' | 'info';
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
  category: 'security' | 'performance' | 'style' | 'bug' | 'maintainability' | 'best-practice';
}

export interface ReviewResult {
  overallScore: number; // 0-10
  issues: ReviewIssue[];
  suggestions: string[];
  positivePoints: string[];
  summary: string;
  reviewTime: number; // milliseconds
}

export class OpenAIReviewer {
  private client: OpenAI;
  private config: AIConfig;

  constructor(apiKey: string, config: AIConfig) {
    this.client = new OpenAI({ apiKey });
    this.config = config;
  }

  /**
   * Review code changes using OpenAI GPT
   */
  async reviewChanges(context: ReviewContext): Promise<ReviewResult> {
    const startTime = Date.now();

    try {
      const prompt = this.buildPrompt(context);
      
      logger.debug('Sending request to OpenAI...');
      
      // Use retry logic with timeout
      const response = await withRetry(
        () => withTimeout(
          this.client.chat.completions.create({
            model: this.config.model,
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
            messages: [{
              role: 'user',
              content: prompt,
            }],
            response_format: { type: 'json_object' },
          }),
          60000, // 60 second timeout
          'OpenAI request timed out after 60 seconds'
        ),
        {
          maxAttempts: 2,
          delayMs: 2000,
        }
      );

      const reviewTime = Date.now() - startTime;
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }
      
      const result = this.parseResponse(content);
      result.reviewTime = reviewTime;
      
      return result;

    } catch (error) {
      logger.error('OpenAI API error:', error);
      throw new Error(`AI review failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build prompt for OpenAI
   */
  private buildPrompt(context: ReviewContext): string {
    const { files, totalAdditions, totalDeletions, totalFiles } = context;

    // Filter out binary files and very large diffs
    const reviewableFiles = files.filter(f => !f.binary && f.changes < 1000);

    if (reviewableFiles.length === 0) {
      throw new Error('No reviewable code changes found');
    }

    // Build file summaries
    const fileSummaries = reviewableFiles.map(f => 
      `- ${f.path} (+${f.additions}, -${f.deletions}) [${f.language}]`
    ).join('\n');

    // Build detailed diffs (truncate if too long)
    const MAX_DIFF_CHARS = 8000; // Leave room for prompt structure
    let diffsText = '';
    let totalChars = 0;

    for (const file of reviewableFiles) {
      const fileDiff = `\n### File: ${file.path}\nLanguage: ${file.language}\n\n\`\`\`diff\n${file.diff}\n\`\`\`\n`;
      
      if (totalChars + fileDiff.length > MAX_DIFF_CHARS) {
        diffsText += '\n[... Additional files truncated due to size ...]';
        break;
      }
      
      diffsText += fileDiff;
      totalChars += fileDiff.length;
    }

    return `You are an expert code reviewer. Analyze the following code changes and provide a comprehensive review.

## Change Summary
- Files changed: ${totalFiles}
- Lines added: ${totalAdditions}
- Lines deleted: ${totalDeletions}

## Files:
${fileSummaries}

## Code Changes:
${diffsText}

## Review Instructions:
Provide your review in the following JSON format (output ONLY valid JSON):

{
  "overallScore": <number 0-10>,
  "issues": [
    {
      "severity": "error|warning|info",
      "file": "path/to/file",
      "line": <line number or null>,
      "message": "Description of the issue",
      "suggestion": "How to fix it (optional)",
      "category": "security|performance|style|bug|maintainability|best-practice"
    }
  ],
  "suggestions": [
    "General improvement suggestion 1",
    "General improvement suggestion 2"
  ],
  "positivePoints": [
    "What was done well 1",
    "What was done well 2"
  ],
  "summary": "Overall assessment of the changes in 2-3 sentences"
}

## Focus Areas:
1. **Security**: Hardcoded secrets, SQL injection, XSS, authentication issues
2. **Performance**: Inefficient algorithms, N+1 queries, memory leaks
3. **Code Quality**: Readability, maintainability, proper naming
4. **Best Practices**: Design patterns, error handling, testing
5. **Potential Bugs**: Logic errors, edge cases, race conditions

Be constructive and specific. Provide actionable feedback.`;
  }

  /**
   * Parse OpenAI's JSON response
   */
  private parseResponse(responseText: string): ReviewResult {
    try {
      const parsed = JSON.parse(responseText);

      // Validate structure
      if (typeof parsed.overallScore !== 'number' || 
          !Array.isArray(parsed.issues) ||
          !Array.isArray(parsed.suggestions) ||
          !Array.isArray(parsed.positivePoints)) {
        throw new Error('Invalid response structure');
      }

      // Normalize score to 0-10 range
      const score = Math.max(0, Math.min(10, parsed.overallScore));

      return {
        overallScore: score,
        issues: parsed.issues || [],
        suggestions: parsed.suggestions || [],
        positivePoints: parsed.positivePoints || [],
        summary: parsed.summary || 'No summary provided',
        reviewTime: 0, // Will be set by caller
      };

    } catch (error) {
      logger.error('Failed to parse AI response:', responseText);
      
      // Return a fallback result
      return {
        overallScore: 7,
        issues: [{
          severity: 'warning',
          file: 'unknown',
          message: 'AI response could not be parsed. Manual review recommended.',
          category: 'maintainability',
        }],
        suggestions: [],
        positivePoints: [],
        summary: 'Review completed with parsing errors. See raw response in logs.',
        reviewTime: 0,
      };
    }
  }

  /**
   * Test connection to OpenAI API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: this.config.model,
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'Hello',
        }],
      });
      return true;
    } catch (error) {
      logger.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}
