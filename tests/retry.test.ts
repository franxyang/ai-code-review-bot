import { withRetry, withTimeout } from '../src/utils/retry';

describe('Retry Utility', () => {
  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValueOnce('success');
      
      const result = await withRetry(fn, { maxAttempts: 3, delayMs: 10 });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should fail after max attempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Always fail'));
      
      await expect(withRetry(fn, { maxAttempts: 2, delayMs: 10 }))
        .rejects.toThrow('Always fail');
      
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Invalid input'));
      
      await expect(withRetry(fn, { 
        maxAttempts: 3, 
        delayMs: 10,
        retryableErrors: ['rate limit']
      })).rejects.toThrow('Invalid input');
      
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should apply exponential backoff', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('429'))
        .mockRejectedValueOnce(new Error('429'))
        .mockResolvedValueOnce('success');
      
      const startTime = Date.now();
      await withRetry(fn, { 
        maxAttempts: 3, 
        delayMs: 100,
        backoffMultiplier: 2
      });
      const duration = Date.now() - startTime;
      
      // Should wait: 100ms + 200ms = 300ms minimum
      expect(duration).toBeGreaterThanOrEqual(250);
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('withTimeout', () => {
    it('should complete before timeout', async () => {
      const promise = Promise.resolve('done');
      const result = await withTimeout(promise, 1000);
      
      expect(result).toBe('done');
    });

    it('should timeout on slow promise', async () => {
      const promise = new Promise(resolve => setTimeout(() => resolve('done'), 1000));
      
      await expect(withTimeout(promise, 100, 'Too slow'))
        .rejects.toThrow('Too slow');
    });

    it('should use default error message', async () => {
      const promise = new Promise(resolve => setTimeout(() => resolve('done'), 1000));
      
      await expect(withTimeout(promise, 100))
        .rejects.toThrow('Operation timed out');
    });
  });
});
