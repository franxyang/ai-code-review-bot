# Usage Guide

## Setup

### 1. Set API Key

First, set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

Or create a `.env` file:

```bash
cp .env.example .env
# Edit .env and add your API key
```

### 2. Install globally (optional)

```bash
npm link
```

Or use directly:

```bash
node dist/cli.js
```

## Testing the Tool

### Create a test file with intentional issues

```bash
cat > test-code.py << 'EOF'
import os

# Bad: Hardcoded credentials
API_KEY = "sk-1234567890abcdef"
DATABASE_URL = "postgresql://user:password@localhost/db"

def fetch_user(user_id):
    # Bad: SQL injection vulnerability
    query = f"SELECT * FROM users WHERE id = {user_id}"
    
    # Bad: No error handling
    result = database.execute(query)
    return result

def process_data(data):
    # Bad: Inefficient loop
    result = []
    for item in data:
        for i in range(len(item)):
            result.append(item[i])
    return result

# Good: Well-documented function
def calculate_total(items: list) -> float:
    """
    Calculate the total sum of item prices.
    
    Args:
        items: List of dictionaries with 'price' key
        
    Returns:
        Total sum of all prices
    """
    return sum(item['price'] for item in items)
EOF
```

### Stage and review

```bash
git add test-code.py
ai-review review --verbose
```

## Example Workflows

### 1. Pre-commit workflow

```bash
# Make changes
vim src/auth.ts

# Stage changes
git add src/auth.ts

# Review before committing
ai-review review

# If score is good, commit
git commit -m "Add OAuth support"
```

### 2. Review specific commit

```bash
# Review the last commit
ai-review review --commit HEAD

# Review a specific commit
ai-review review --commit abc123
```

### 3. Review a specific file

```bash
ai-review review --file src/security.ts --verbose
```

### 4. Check configuration

```bash
ai-review status
```

## Configuration Tips

### Adjust thresholds

Edit `.aireviewrc.json`:

```json
{
  "thresholds": {
    "blockPush": 6.0,    // Block if score < 6
    "warning": 8.0       // Warn if score < 8
  }
}
```

### Ignore files

```json
{
  "ignore": [
    "**/*.test.ts",
    "legacy/**",
    "vendor/**"
  ]
}
```

### Change AI model

```json
{
  "ai": {
    "provider": "claude",
    "model": "claude-sonnet-4-5",
    "temperature": 0.1    // Lower = more deterministic
  }
}
```

## Integration with Development Workflow

### VS Code Task

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "AI Code Review",
      "type": "shell",
      "command": "ai-review review",
      "problemMatcher": [],
      "group": {
        "kind": "test",
        "isDefault": false
      }
    }
  ]
}
```

### Git Alias

Add to `~/.gitconfig`:

```ini
[alias]
    review = !git add -A && ai-review review
```

Usage:
```bash
git review
```

## Troubleshooting

### Test API connection

```bash
node -e "import('@anthropic-ai/sdk').then(m => {
  const client = new m.default({ apiKey: process.env.ANTHROPIC_API_KEY });
  client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 10,
    messages: [{ role: 'user', content: 'Hi' }]
  }).then(() => console.log('✓ API connection successful'))
    .catch(e => console.error('✗ API error:', e.message));
})"
```

### Debug mode

```bash
ai-review review --verbose 2>&1 | tee review-debug.log
```

### Check Git status

```bash
git status
git diff --cached --stat
```

## Advanced Usage

### Custom prompt templates (future)

Place custom prompts in `.ai-review/prompts/`:

```
.ai-review/
  prompts/
    security-focused.md
    performance-focused.md
```

### Team configurations

Share `.aireviewrc.json` in your repository for consistent team standards.

### CI/CD Integration (future)

```yaml
# .github/workflows/code-review.yml
name: AI Code Review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run AI Review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          npm install -g ai-code-review-bot
          ai-review review --commit ${{ github.sha }}
```
