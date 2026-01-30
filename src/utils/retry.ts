/**
 * Retry utility for handling transient errors
 */

import { logger } from './logger.js';

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'Too Many Requests',
    '429',
    'rate limit',
    'quota',
  ],
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryable(error: any, retryableErrors: string[]): boolean {
  const errorString = String(error?.message || error).toLowerCase();
  return retryableErrors.some(pattern => 
    errorString.includes(pattern.toLowerCase())
  );
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on last attempt or non-retryable errors
      if (attempt >= opts.maxAttempts || !isRetryable(error, opts.retryableErrors)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt - 1);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(
        `Attempt ${attempt}/${opts.maxAttempts} failed: ${errorMessage}. ` +
        `Retrying in ${delay}ms...`
      );
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Timeout wrapper for promises
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}
