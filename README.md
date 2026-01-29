# 🤖 AI Code Review Bot

An intelligent code review tool powered by Claude AI, designed to catch bugs, security issues, and suggest improvements before your code reaches production.

## ✨ Features

- 🔍 **Deep Code Analysis**: AI-powered review using Claude Sonnet
- 🔐 **Security Scanning**: Detect hardcoded secrets, SQL injection, XSS vulnerabilities
- ⚡ **Performance Insights**: Identify bottlenecks and inefficient code
- 🎨 **Style & Best Practices**: Enforce coding standards
- 📊 **Detailed Reports**: Terminal output + Markdown reports
- 🔗 **Git Integration**: Pre-commit and pre-push hooks (coming soon)
- ⚙️ **Highly Configurable**: Customize thresholds, analyzers, and output

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd ai-code-review-bot

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link
```

### Configuration

1. Set your Anthropic API key:
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

2. Initialize configuration:
```bash
ai-review init
```

This creates `.aireviewrc.json` in your project directory. Customize as needed.

### Usage

#### Review Staged Changes (default)
```bash
ai-review review
```

#### Review a Specific Commit
```bash
ai-review review --commit abc123
```

#### Review a Specific File
```bash
ai-review review --file src/auth.ts
```

#### Review Unstaged Changes
```bash
ai-review review --unstaged
```

#### Verbose Output
```bash
ai-review review --verbose
```

### Check Status
```bash
ai-review status
```

## 📋 Configuration

### Example `.aireviewrc.json`

```json
{
  "enabled": true,
  "hooks": {
    "preCommit": "static",
    "prePush": "full"
  },
  "ai": {
    "provider": "claude",
    "model": "claude-sonnet-4-5",
    "maxTokens": 4000,
    "temperature": 0.2
  },
  "analyzers": {
    "static": true,
    "security": true,
    "performance": true,
    "style": true
  },
  "ignore": [
    "node_modules/**",
    "dist/**",
    "*.min.js",
    ".env*"
  ],
  "thresholds": {
    "blockPush": 5.0,
    "warning": 7.0
  },
  "output": {
    "terminal": true,
    "markdown": true,
    "json": false,
    "verbose": false
  },
  "timeout": 300
}
```

### Configuration Options

#### `ai`
- **provider**: AI service (`"claude"` | `"openai"` | `"ollama"`)
- **model**: Model name (e.g., `"claude-sonnet-4-5"`)
- **maxTokens**: Maximum tokens for AI response
- **temperature**: Creativity level (0.0 - 1.0)

#### `thresholds`
- **blockPush**: Minimum score to allow push (0-10)
- **warning**: Minimum score to avoid warnings (0-10)

#### `analyzers`
- **static**: Enable static analysis
- **security**: Enable security scanning
- **performance**: Enable performance checks
- **style**: Enable style checks

#### `output`
- **terminal**: Print to console
- **markdown**: Save Markdown report
- **json**: Export JSON results
- **verbose**: Detailed logging

## 📊 Example Output

```
🔍 Reviewing staged changes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📂 Files changed: 2
  ✓ src/auth/oauth.py (+120, -5)
  ✓ tests/test_oauth.py (+45, -0)

╭────────────────────────────────────────────╮
│  🟢 Overall Score: 8.5/10 - Very Good     │
╰────────────────────────────────────────────╯

📝 Summary:
Excellent implementation of OAuth2 with comprehensive test coverage.
Minor improvements suggested for error handling and configuration management.

🟡 Warnings (2)
  ⚠ src/auth/oauth.py:42
    Hardcoded redirect URI - use environment variable
    💡 Move to config.OAUTH_REDIRECT_URI

  ⚠ src/auth/oauth.py:67
    Missing error handling for network failures

💡 Suggestions
  • Consider caching OAuth tokens to reduce API calls
  • Add retry logic for token refresh

✅ What's Good
  • Excellent test coverage (100%)
  • Clear function naming and docstrings
  • Proper use of type hints

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️  Review completed in 8.3s
```

## 🛠️ Development

### Project Structure

```
ai-code-review-bot/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── git/
│   │   └── diff-parser.ts  # Git diff parsing
│   ├── models/
│   │   └── claude.ts       # AI integration
│   ├── reporters/
│   │   └── terminal.ts     # Output formatting
│   └── utils/
│       ├── config.ts       # Configuration
│       └── logger.ts       # Logging
├── dist/                   # Compiled output
└── .aireviewrc.json        # Configuration
```

### Build & Test

```bash
# Development build (watch mode)
npm run dev

# Production build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format
```

## 🔒 Security & Privacy

### API Key Management
- ✅ Keys read from environment variables
- ✅ Never committed to version control
- ✅ Optional local encryption (future)

### Code Privacy
- ✅ Local static analysis (no external calls)
- ✅ AI review prompts user consent
- ✅ Configurable file/directory ignoring
- ✅ Offline mode via Ollama (future)

### Best Practices
- Always review `.aireviewrc.json` before sharing
- Use `.gitignore` for sensitive files
- Audit AI responses for false positives

## 🗺️ Roadmap

### Phase 1: Core Features ✅
- [x] Git diff parsing
- [x] Claude AI integration
- [x] Terminal reporting
- [x] Configuration system

### Phase 2: Git Hooks (In Progress)
- [ ] Pre-commit hook installation
- [ ] Pre-push hook installation
- [ ] Hook bypass mechanisms
- [ ] Timeout handling

### Phase 3: Additional Features
- [ ] OpenAI GPT-4 support
- [ ] Ollama local model support
- [ ] GitHub Actions integration
- [ ] VS Code extension
- [ ] Custom rule engine
- [ ] Historical trend analysis

### Phase 4: Polish
- [ ] Comprehensive test suite
- [ ] Performance optimizations
- [ ] Multi-language prompt templates
- [ ] Team configuration sharing

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 🐛 Troubleshooting

### "Missing API key" error
Set `ANTHROPIC_API_KEY` environment variable:
```bash
export ANTHROPIC_API_KEY="your-key"
```

### "No changes to review"
Make sure you have staged changes:
```bash
git add .
ai-review review
```

### Build errors
Clean and rebuild:
```bash
rm -rf dist node_modules
npm install
npm run build
```

## 📧 Support

For issues and questions, please open a GitHub issue.

---

**Built with ❤️ using Claude AI**
