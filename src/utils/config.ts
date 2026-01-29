/**
 * Configuration management for AI Code Review Bot
 * Supports multiple config formats via cosmiconfig
 */

import { cosmiconfig } from 'cosmiconfig';

export interface AIConfig {
  provider: 'claude' | 'openai' | 'ollama';
  model: string;
  maxTokens: number;
  temperature: number;
  apiKey?: string; // Will be read from env if not provided
}

export interface HooksConfig {
  preCommit: 'disabled' | 'static' | 'full';
  prePush: 'disabled' | 'static' | 'full';
}

export interface AnalyzersConfig {
  static: boolean;
  security: boolean;
  performance: boolean;
  style: boolean;
}

export interface ThresholdsConfig {
  blockPush: number; // Score below this blocks push
  warning: number;   // Score below this shows warning
}

export interface OutputConfig {
  terminal: boolean;
  markdown: boolean;
  json: boolean;
  verbose: boolean;
}

export interface ReviewConfig {
  enabled: boolean;
  hooks: HooksConfig;
  ai: AIConfig;
  analyzers: AnalyzersConfig;
  ignore: string[];
  thresholds: ThresholdsConfig;
  output: OutputConfig;
  timeout: number; // Maximum time for review in seconds
}

// Default configuration
const DEFAULT_CONFIG: ReviewConfig = {
  enabled: true,
  hooks: {
    preCommit: 'static',
    prePush: 'full',
  },
  ai: {
    provider: 'claude',
    model: 'claude-sonnet-4-5',
    maxTokens: 4000,
    temperature: 0.2,
  },
  analyzers: {
    static: true,
    security: true,
    performance: true,
    style: true,
  },
  ignore: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '*.min.js',
    '*.min.css',
    '.env*',
    'package-lock.json',
    'yarn.lock',
  ],
  thresholds: {
    blockPush: 5.0,
    warning: 7.0,
  },
  output: {
    terminal: true,
    markdown: true,
    json: false,
    verbose: false,
  },
  timeout: 300, // 5 minutes
};

/**
 * Load configuration from file or return defaults
 */
export async function loadConfig(searchFrom?: string): Promise<ReviewConfig> {
  const explorer = cosmiconfig('aireview');
  
  try {
    const result = await explorer.search(searchFrom);
    
    if (result && !result.isEmpty) {
      // Merge with defaults to ensure all fields exist
      return mergeConfig(DEFAULT_CONFIG, result.config);
    }
  } catch (error) {
    console.warn('Error loading config, using defaults:', error);
  }
  
  return DEFAULT_CONFIG;
}

/**
 * Deep merge configuration with defaults
 */
function mergeConfig(defaults: ReviewConfig, custom: Partial<ReviewConfig>): ReviewConfig {
  return {
    ...defaults,
    ...custom,
    hooks: { ...defaults.hooks, ...custom.hooks },
    ai: { ...defaults.ai, ...custom.ai },
    analyzers: { ...defaults.analyzers, ...custom.analyzers },
    thresholds: { ...defaults.thresholds, ...custom.thresholds },
    output: { ...defaults.output, ...custom.output },
    ignore: custom.ignore || defaults.ignore,
  };
}

/**
 * Get API key from environment or config
 */
export function getAPIKey(config: ReviewConfig): string | undefined {
  if (config.ai.apiKey) {
    return config.ai.apiKey;
  }
  
  // Try environment variables based on provider
  switch (config.ai.provider) {
    case 'claude':
      return process.env.ANTHROPIC_API_KEY;
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'ollama':
      return undefined; // Ollama doesn't need API key
    default:
      return undefined;
  }
}

/**
 * Validate configuration
 */
export function validateConfig(config: ReviewConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check AI provider
  if (!['claude', 'openai', 'ollama'].includes(config.ai.provider)) {
    errors.push(`Invalid AI provider: ${config.ai.provider}`);
  }
  
  // Check API key for cloud providers
  if (config.ai.provider !== 'ollama') {
    const apiKey = getAPIKey(config);
    if (!apiKey) {
      errors.push(`Missing API key for ${config.ai.provider}. Set ${config.ai.provider === 'claude' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'} environment variable.`);
    }
  }
  
  // Check thresholds
  if (config.thresholds.blockPush < 0 || config.thresholds.blockPush > 10) {
    errors.push('blockPush threshold must be between 0 and 10');
  }
  
  if (config.thresholds.warning < 0 || config.thresholds.warning > 10) {
    errors.push('warning threshold must be between 0 and 10');
  }
  
  // Check timeout
  if (config.timeout <= 0) {
    errors.push('timeout must be positive');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create example configuration file
 */
export function getExampleConfig(): string {
  return JSON.stringify(DEFAULT_CONFIG, null, 2);
}
