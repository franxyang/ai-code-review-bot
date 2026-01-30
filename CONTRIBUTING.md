# Contributing to AI Code Review Bot

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Code of Conduct

This project adheres to a simple code of conduct:
- Be respectful and constructive
- Welcome newcomers
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- (Optional) Ollama for local AI testing
- (Optional) AI provider API keys (Gemini, Claude, or OpenAI)

### Quick Start

1. **Fork the repository**
   ```bash
   gh repo fork franxyang/ai-code-review-bot --clone
   cd ai-code-review-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Link globally** (optional)
   ```bash
   npm link
   ```

5. **Set up environment**
   ```bash
   cp .env.example .env
   # Add your API keys to .env
   ```

6. **Run tests**
   ```bash
   npm test
   ```

## Development Setup

### Project Structure

```
ai-code-review-bot/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── models/             # AI provider integrations
│   │   ├── claude.ts
│   │   ├── gemini.ts
│   │   ├── openai.ts
│   │   └── ollama.ts
│   ├── analyzers/          # Static analysis
│   │   └── static.ts
│   ├── git/                # Git integration
│   │   ├── diff-parser.ts
│   │   └── hooks.ts
│   ├── reporters/          # Output formatting
│   │   └── terminal.ts
│   └── utils/              # Utilities
│       ├── config.ts
│       ├── logger.ts
│       └── retry.ts
├── tests/                  # Test files
├── docs/                   # Documentation
└── dist/                   # Compiled output
```

### Build Commands

```bash
# Development build (watch mode)
npm run dev

# Production build
npm run build

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Lint code
npm run lint

# Format code
npm run format
```

### Environment Variables

Create a `.env` file:

```bash
# Gemini (recommended for development - free tier)
GEMINI_API_KEY=your-gemini-key

# Claude (optional)
ANTHROPIC_API_KEY=your-claude-key

# OpenAI (optional)
OPENAI_API_KEY=your-openai-key

# Ollama (optional, default: http://localhost:11434)
OLLAMA_API_URL=http://localhost:11434
```

## How to Contribute

### Types of Contributions

We welcome:
- 🐛 **Bug fixes**
- ✨ **New features**
- 📝 **Documentation improvements**
- 🧪 **Tests**
- 🎨 **UI/UX improvements**
- 🌍 **Translations**

### Workflow

1. **Create an issue** (if one doesn't exist)
2. **Fork and clone** the repository
3. **Create a branch** from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes**
5. **Write or update tests**
6. **Run tests and linting**
   ```bash
   npm test
   npm run lint
   ```
7. **Commit your changes** (see commit guidelines below)
8. **Push to your fork**
9. **Open a Pull Request**

## Coding Standards

### TypeScript Guidelines

- Use TypeScript for all new code
- Enable strict type checking
- Avoid `any` when possible
- Use interfaces for public APIs
- Document complex types

Example:
```typescript
export interface ReviewResult {
  overallScore: number; // 0-10
  issues: ReviewIssue[];
  suggestions: string[];
  summary: string;
}
```

### Code Style

We use ESLint and Prettier:

```bash
# Fix linting issues
npm run lint -- --fix

# Format code
npm run format
```

**Key rules:**
- 2-space indentation
- Single quotes for strings
- No semicolons
- Trailing commas in multi-line structures
- Max line length: 100 characters

### Naming Conventions

- **Files:** `kebab-case.ts`
- **Classes:** `PascalCase`
- **Functions/variables:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Interfaces:** `PascalCase` (no `I` prefix)

Example:
```typescript
const MAX_RETRY_ATTEMPTS = 3;

export class GeminiReviewer {
  private config: AIConfig;
  
  async reviewChanges(context: ReviewContext): Promise<ReviewResult> {
    // ...
  }
}
```

### Documentation

- Add JSDoc comments for public APIs
- Keep comments concise and meaningful
- Update README.md when adding features
- Add examples for new features

Example:
```typescript
/**
 * Review code changes using AI
 * @param context - Git diff context with file changes
 * @returns Review result with score and issues
 * @throws Error if AI API fails or response is invalid
 */
async reviewChanges(context: ReviewContext): Promise<ReviewResult> {
  // ...
}
```

## Testing Guidelines

### Writing Tests

- Use Jest for all tests
- Write tests for new features
- Update tests when changing behavior
- Aim for >80% code coverage

**Test file location:**
```
src/utils/retry.ts  →  tests/retry.test.ts
```

### Test Structure

```typescript
describe('FeatureName', () => {
  describe('methodName', () => {
    it('should do something specific', async () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = await doSomething(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test retry.test.ts

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### Mocking

Use Jest mocks for external dependencies:

```typescript
jest.mock('../src/models/gemini');

const mockReview = jest.fn().mockResolvedValue({
  overallScore: 8,
  issues: [],
  suggestions: [],
});
```

## Submitting Changes

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(ollama): add local AI support

- Implement OllamaReviewer class
- Add model detection and validation
- Include comprehensive documentation

Closes #42
```

```bash
fix(retry): handle network timeout correctly

The retry mechanism was not catching timeout errors.
Now it properly retries on ETIMEDOUT.

Fixes #56
```

### Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Ensure all tests pass**
4. **Update CHANGELOG.md** (for significant changes)
5. **Link related issues**
6. **Request review** from maintainers

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All tests pass
- [ ] New tests added
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style
- [ ] Documentation updated
- [ ] No new warnings
- [ ] CHANGELOG.md updated
```

## Reporting Bugs

### Before Reporting

1. **Check existing issues** - Your bug might already be reported
2. **Try latest version** - The bug might be fixed
3. **Isolate the problem** - Create a minimal reproduction case

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Run command '...'
2. See error '...'

**Expected behavior**
What you expected to happen.

**Screenshots/Logs**
If applicable, add screenshots or logs.

**Environment:**
 - OS: [e.g., macOS 14.0]
 - Node.js: [e.g., 20.10.0]
 - Version: [e.g., 0.2.0]
 - AI Provider: [e.g., Gemini]

**Additional context**
Any other relevant information.
```

## Suggesting Features

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of the desired solution.

**Describe alternatives you've considered**
Other solutions you've thought about.

**Additional context**
Any other context, mockups, or examples.
```

### Discussion

- Open an issue to discuss major features
- Smaller features can go straight to PR
- Be open to feedback and iteration

## Questions?

- 💬 **GitHub Discussions** - For general questions
- 🐛 **GitHub Issues** - For bugs and features
- 📧 **Email** - For private inquiries

---

## Recognition

Contributors will be recognized in:
- README.md contributors section
- CHANGELOG.md for significant changes
- GitHub releases

Thank you for contributing! 🎉
