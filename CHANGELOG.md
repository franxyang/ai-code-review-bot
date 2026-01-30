# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-01-30

### Added
- **Ollama Integration**: Complete offline AI review support
  - Support for CodeLlama, DeepSeek Coder, Qwen, and other models
  - Auto-detection of available models
  - Custom Ollama URL configuration
  - Comprehensive documentation in `docs/OLLAMA.md`
- **OpenAI GPT-4 Support**: Full integration with OpenAI API
  - JSON response format for structured output
  - Support for GPT-4, GPT-4 Turbo, GPT-4o
  - Retry logic with exponential backoff
- **GitHub Actions Integration**:
  - Automatic PR review workflow
  - Comment posting on pull requests
  - Report artifact uploads
  - Manual workflow dispatch
  - Complete setup guide in `docs/GITHUB_ACTIONS.md`
- **Retry Mechanism**:
  - Exponential backoff for rate limits
  - Timeout handling (60s for cloud, 120s for local)
  - Smart error categorization (retryable vs fatal)
  - Unit tests with full coverage
- **Testing Infrastructure**:
  - Retry logic tests (`tests/retry.test.ts`)
  - Jest configuration for ES modules
  - Static analyzer tests
  - Test coverage reporting

### Changed
- **Gemini Configuration**: Updated default model to `gemini-2.5-flash-lite` (free tier)
- **Environment Variables**: Now loaded automatically via `dotenv/config`
- **Error Messages**: Improved clarity for API connection failures
- **Documentation**: Major updates to README with Ollama and GitHub Actions sections

### Fixed
- **macOS Compatibility**: Removed `timeout` command from Git hooks
- **API Key Loading**: Fixed `.env` file not being read correctly
- **TypeScript Compilation**: Fixed type errors in retry utility
- **Model Selection**: Gemini models now use stable free-tier versions

## [0.1.0] - 2026-01-29

### Added
- **Core Features**:
  - Git diff parsing and file change detection
  - Static code analysis (security, performance, style)
  - Terminal reporter with colored output
  - Markdown report generation
  - Configuration system via `.aireviewrc.json`
- **AI Providers**:
  - Google Gemini integration
  - Anthropic Claude integration (initial)
- **Git Hooks**:
  - Pre-commit hook for staged changes
  - Pre-push hook for commit history
  - Hook installation/uninstallation commands
  - Status checking for hook installation
- **CLI Commands**:
  - `ai-review review` - Review code changes
  - `ai-review init` - Initialize configuration
  - `ai-review status` - Check setup status
  - `ai-review hooks` - Manage Git hooks
- **Configuration**:
  - Provider selection (Gemini, Claude, OpenAI, Ollama)
  - Model customization
  - Threshold configuration (block/warning scores)
  - Analyzer toggles (static, security, performance, style)
  - Ignore patterns for files/directories
- **Documentation**:
  - Comprehensive README.md
  - Example configuration file
  - Feature documentation
  - Troubleshooting guide

### Security
- API keys loaded from environment variables only
- `.env` file excluded from version control
- No hardcoded secrets in codebase

## [0.0.1] - 2026-01-28

### Added
- Initial project structure
- TypeScript configuration
- Basic CLI skeleton
- npm package setup

---

## Release Notes

### v0.2.0 Highlights

This release marks a major milestone with **all 4 AI providers** now supported and full GitHub Actions integration. The tool is now production-ready for both cloud and local deployments.

**Key Features:**
- 🏠 **Offline Mode**: Run reviews completely offline with Ollama
- 🤖 **4 AI Providers**: Gemini (free), Claude, OpenAI, Ollama (local)
- 🚀 **GitHub Actions**: Auto-review PRs with configurable providers
- 🔄 **Retry Logic**: Robust error handling with exponential backoff
- 📊 **Better Testing**: Comprehensive test suite for reliability

**Breaking Changes:** None

**Migration Guide:**
- Existing configurations continue to work
- New `.env` support is optional but recommended
- GitHub Actions workflow requires separate setup

### v0.1.0 Highlights

First stable release with core functionality complete.

**Major Features:**
- Git integration with hooks
- Static analysis + AI review
- Multi-provider support
- Comprehensive documentation

---

## Upgrade Guide

### From 0.1.0 to 0.2.0

1. **Update dependencies:**
   ```bash
   npm install
   ```

2. **Rebuild:**
   ```bash
   npm run build
   ```

3. **(Optional) Add .env file:**
   ```bash
   echo "GEMINI_API_KEY=your-key" > .env
   ```

4. **(Optional) Update config for Ollama:**
   ```json
   {
     "ai": {
       "provider": "ollama",
       "model": "deepseek-coder:6.7b"
     }
   }
   ```

5. **Test:**
   ```bash
   ai-review status
   ai-review review --staged
   ```

---

## Links

- [GitHub Repository](https://github.com/franxyang/ai-code-review-bot)
- [Issue Tracker](https://github.com/franxyang/ai-code-review-bot/issues)
- [Documentation](README.md)

[Unreleased]: https://github.com/franxyang/ai-code-review-bot/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/franxyang/ai-code-review-bot/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/franxyang/ai-code-review-bot/releases/tag/v0.1.0
