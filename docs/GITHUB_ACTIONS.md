# GitHub Actions Integration

This guide shows you how to set up AI Code Review Bot to automatically review Pull Requests in your GitHub repository.

## Quick Setup

### 1. Add the Workflow File

Copy `.github/workflows/ai-review.yml` to your repository:

```bash
mkdir -p .github/workflows
cp .github/workflows/ai-review.yml .github/workflows/
```

### 2. Configure API Keys

Add your AI provider API key as a GitHub repository secret:

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add one or more of the following:

| Secret Name | Description |
|-------------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key (recommended for free tier) |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `OPENAI_API_KEY` | OpenAI GPT API key |

### 3. Configure Provider (Optional)

The workflow uses **Gemini** by default. To change the provider, edit `.aireviewrc.json` in your repository:

```json
{
  "ai": {
    "provider": "gemini",  // or "claude" or "openai"
    "model": "gemini-2.5-flash-lite"
  }
}
```

### 4. Test the Workflow

Create a Pull Request and the AI review will run automatically!

## Workflow Features

### Automatic Triggers

The workflow runs on:
- **Pull Request opened**
- **New commits pushed to PR**
- **PR reopened**

### Manual Trigger

You can also run the review manually:
1. Go to **Actions** tab
2. Select **AI Code Review** workflow
3. Click **Run workflow**

### Review Output

The workflow will:
1. ✅ Run static analysis
2. 🤖 Generate AI-powered review
3. 💬 Post results as a PR comment
4. 📊 Upload detailed report as artifact

### PR Comment Format

```
## 🤖 AI Code Review

📂 Files changed: 3
🎯 Overall Score: 8.5/10 - Very Good

📝 Summary:
Excellent implementation with minor suggestions for improvement.

🟡 Warnings (1)
  ⚠ src/auth.ts:42
    Consider adding input validation

✅ What's Good
  • Clear naming conventions
  • Good error handling
  • Comprehensive tests

---
Powered by AI Code Review Bot
```

## Advanced Configuration

### Custom Review Thresholds

Create `.aireviewrc.json` to customize:

```json
{
  "enabled": true,
  "ai": {
    "provider": "gemini",
    "model": "gemini-2.5-flash-lite",
    "maxTokens": 4000,
    "temperature": 0.2
  },
  "thresholds": {
    "blockPush": 5.0,
    "warning": 7.0
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
    "*.min.js"
  ]
}
```

### Review Specific Commits

Modify the workflow to review specific commits:

```yaml
- name: Run AI Code Review
  run: |
    ai-review review --commit ${{ github.event.pull_request.head.sha }}
```

### Fail on Low Scores

Add a step to fail the workflow if the score is too low:

```yaml
- name: Check review score
  run: |
    SCORE=$(grep "Overall Score:" review-output.txt | grep -oE '[0-9]+\.[0-9]+' || echo "0")
    if (( $(echo "$SCORE < 5.0" | bc -l) )); then
      echo "Review score $SCORE is below threshold"
      exit 1
    fi
```

### Multi-Provider Reviews

Run reviews with multiple AI providers for comparison:

```yaml
- name: Review with Gemini
  env:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
  run: ai-review review --commit HEAD > gemini-review.txt

- name: Review with Claude
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    echo '{"ai":{"provider":"claude"}}' > .aireviewrc.json
    ai-review review --commit HEAD > claude-review.txt
```

## Cost Management

### Free Tier Options

**Gemini (Recommended for CI/CD):**
- ✅ Free tier available
- ✅ Model: `gemini-2.5-flash-lite`
- ✅ Good performance/cost ratio

**Claude:**
- ⚠️ Paid API
- ✅ High quality reviews
- ⚠️ Consider usage limits

**OpenAI:**
- ⚠️ Paid API
- ✅ Excellent quality
- ⚠️ Higher cost per request

### Reduce Costs

1. **Limit file sizes**: Add large files to `ignore` list
2. **Review only changed files**: Default behavior
3. **Use caching**: GitHub Actions caches dependencies
4. **Rate limiting**: Configure workflow to run on specific branches only

```yaml
on:
  pull_request:
    branches: [main, develop]  # Only on specific branches
```

## Troubleshooting

### "No API key found"

**Solution:** Add the appropriate secret to your repository settings.

### "Review failed"

**Possible causes:**
- Invalid API key
- Rate limit exceeded
- Large diff (>10,000 lines)

**Solutions:**
- Check API key is correct
- Wait for rate limit reset
- Split large PRs into smaller ones

### "Comment not posted"

**Solution:** Ensure the workflow has `pull-requests: write` permission:

```yaml
permissions:
  contents: read
  pull-requests: write
```

## Examples

### Public Repository Example

See this workflow in action:
- Repository: [franxyang/ai-code-review-bot](https://github.com/franxyang/ai-code-review-bot)
- Pull Requests tab for example reviews

### Private Repository

The workflow works the same way for private repositories. Just ensure:
1. API keys are added as secrets
2. Workflow has correct permissions
3. `.aireviewrc.json` is committed

## Best Practices

1. ✅ **Start with Gemini free tier** for testing
2. ✅ **Review config before enabling** on production repos
3. ✅ **Ignore generated files** (build artifacts, dependencies)
4. ✅ **Set reasonable thresholds** (start with 5.0 blocking, 7.0 warning)
5. ✅ **Monitor API usage** to avoid unexpected costs
6. ✅ **Keep reports as artifacts** for historical analysis

## Support

For issues or questions:
- 📖 [Full Documentation](../README.md)
- 🐛 [Report Issues](https://github.com/franxyang/ai-code-review-bot/issues)
- 💬 [Discussions](https://github.com/franxyang/ai-code-review-bot/discussions)

---

**Happy Reviewing! 🚀**
