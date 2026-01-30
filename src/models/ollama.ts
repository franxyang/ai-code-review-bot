/**
 * Ollama local AI integration for code review
 * Provides AI-powered code analysis using locally hosted Ollama models
 */

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

export class OllamaReviewer {
  private baseUrl: string;
  private config: AIConfig;

  constructor(config: AIConfig, baseUrl = 'http://localhost:11434') {
    this.config = config;
    this.baseUrl = baseUrl;
  }

  /**
   * Review code changes using Ollama
   */
  async reviewChanges(context: ReviewContext): Promise<ReviewResult> {
    const startTime = Date.now();

    try {
      const prompt = this.buildPrompt(context);
      
      logger.debug('Sending request to Ollama...');
      
      // Use retry logic with timeout
      const response = await withRetry(
        () => withTimeout(
          fetch(`${this.baseUrl}/api/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: this.config.model,
              prompt,
              stream: false,
              options: {
                temperature: this.config.temperature,
                num_predict: this.config.maxTokens,
              },
            }),
          }),
          120000, // 2 minute timeout for local models
          'Ollama request timed out after 2 minutes'
        ),
        {
          maxAttempts: 2,
          delayMs: 1000,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as { response?: string };
      const reviewTime = Date.now() - startTime;
      
      if (!data.response) {
        throw new Error('No response from Ollama');
      }
      
      const result = this.parseResponse(data.response);
      result.reviewTime = reviewTime;
      
      return result;

    } catch (error) {
      logger.error('Ollama API error:', error);
      throw new Error(`AI review failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build prompt for Ollama
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
    const MAX_DIFF_CHARS = 6000; // Smaller for local models
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
Provide your review in the following JSON format (output ONLY valid JSON, no markdown):

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

Be constructive and specific. Provide actionable feedback. Output ONLY the JSON, nothing else.`;
  }

  /**
   * Parse Ollama's response
   */
  private parseResponse(responseText: string): ReviewResult {
    try {
      // Remove markdown code blocks if present
      let cleanedText = responseText.trim();
      cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/\s*```$/,'');
      cleanedText = cleanedText.replace(/^```\s*/i, '').replace(/\s*```$/, '');
      
      // Extract JSON from response
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

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
   * Test connection to Ollama API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json() as { models?: Array<{ name: string }> };
      
      // Check if the configured model is available
      if (data.models && Array.isArray(data.models)) {
        const modelExists = data.models.some(
          m => m.name === this.config.model || m.name.startsWith(this.config.model)
        );
        
        if (!modelExists) {
          logger.warn(`Model ${this.config.model} not found in Ollama. Available models:`, 
            data.models.map(m => m.name).join(', '));
        }
        
        return modelExists;
      }
      
      return true;
    } catch (error) {
      logger.error('Ollama connection test failed:', error);
      return false;
    }
  }

  /**
   * List available models from Ollama
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json() as { models?: Array<{ name: string }> };
      if (data.models && Array.isArray(data.models)) {
        return data.models.map(m => m.name);
      }
      
      return [];
    } catch (error) {
      logger.error('Failed to list Ollama models:', error);
      return [];
    }
  }
}
