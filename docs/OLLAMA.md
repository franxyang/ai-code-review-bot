# Ollama Local AI Setup Guide

Run AI code reviews **completely offline** using Ollama and local models.

## Why Ollama?

✅ **Privacy**: Code never leaves your machine  
✅ **Free**: No API costs  
✅ **Fast**: No network latency  
✅ **Offline**: Works without internet  
✅ **Control**: Choose any open-source model  

## Quick Setup

### 1. Install Ollama

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from [ollama.com](https://ollama.com/download)

### 2. Start Ollama Server

```bash
ollama serve
```

Keep this running in the background.

### 3. Pull a Code Model

**Recommended models for code review:**

```bash
# Best: DeepSeek Coder (6.7B - good balance)
ollama pull deepseek-coder:6.7b

# Alternative: Qwen 2.5 Coder (7B - very good)
ollama pull qwen2.5-coder:7b

# Larger: CodeLlama (13B - better quality, slower)
ollama pull codellama:13b

# Smaller: CodeLlama (7B - faster, less accurate)
ollama pull codellama:7b
```

### 4. Configure AI Review Bot

Edit `.aireviewrc.json`:

```json
{
  "ai": {
    "provider": "ollama",
    "model": "deepseek-coder:6.7b",
    "maxTokens": 4000,
    "temperature": 0.2
  }
}
```

### 5. Test It

```bash
ai-review status
ai-review review --staged
```

## Model Comparison

| Model | Size | Speed | Quality | RAM Needed |
|-------|------|-------|---------|------------|
| `codellama:7b` | 3.8 GB | Fast | Good | 8 GB |
| `deepseek-coder:6.7b` | 3.8 GB | Fast | Very Good | 8 GB |
| `qwen2.5-coder:7b` | 4.7 GB | Fast | Excellent | 8 GB |
| `codellama:13b` | 7.4 GB | Medium | Very Good | 16 GB |
| `codellama:34b` | 19 GB | Slow | Excellent | 32 GB |

### Recommended Setup

**8 GB RAM:** `deepseek-coder:6.7b` or `qwen2.5-coder:7b`  
**16 GB RAM:** `codellama:13b`  
**32 GB+ RAM:** `codellama:34b`  

## Advanced Configuration

### Custom Ollama URL

If Ollama is running on a different host:

```bash
export OLLAMA_API_URL="http://192.168.1.100:11434"
```

Or in `.aireviewrc.json`:
```json
{
  "ai": {
    "provider": "ollama",
    "model": "deepseek-coder:6.7b",
    "ollamaUrl": "http://192.168.1.100:11434"
  }
}
```

### GPU Acceleration

Ollama automatically uses GPU if available (NVIDIA CUDA, AMD ROCm, or Metal on macOS).

**Check GPU usage:**
```bash
ollama ps
```

### Multiple Models

Switch models easily:

```bash
# Fast reviews
echo '{"ai":{"model":"codellama:7b"}}' > .aireviewrc.json

# High quality reviews
echo '{"ai":{"model":"codellama:13b"}}' > .aireviewrc.json
```

## Performance Tips

### 1. Keep Models in Memory

Models load faster when kept in memory:

```bash
# Keep model loaded
ollama run deepseek-coder:6.7b "test"
# Now reviews will be instant
```

### 2. Quantized Models

Use quantized models for lower RAM usage:

```bash
# Q4 quantization (smaller, faster)
ollama pull deepseek-coder:6.7b-q4

# Q8 quantization (balanced)
ollama pull deepseek-coder:6.7b-q8
```

### 3. Adjust Context Length

For large diffs, increase context:

```json
{
  "ai": {
    "maxTokens": 8000
  }
}
```

## Troubleshooting

### "Ollama connection failed"

**Solution 1:** Check if Ollama is running
```bash
ollama ps
```

**Solution 2:** Start Ollama
```bash
ollama serve
```

**Solution 3:** Check firewall
```bash
curl http://localhost:11434/api/tags
```

### "Model not found"

**Solution:** Pull the model first
```bash
ollama pull deepseek-coder:6.7b
```

List available models:
```bash
ollama list
```

### Slow performance

**Solutions:**
- Use a smaller model (`codellama:7b`)
- Enable GPU acceleration
- Reduce `maxTokens` in config
- Preload model: `ollama run <model> "test"`

### Out of memory

**Solutions:**
- Use a smaller model
- Use quantized version (`q4` or `q8`)
- Close other applications
- Reduce `maxTokens`

## Privacy & Security

### What stays local?

✅ All code stays on your machine  
✅ Review results stay local  
✅ No telemetry or logging  
✅ No internet connection needed  

### Best practices

1. **Use Ollama for sensitive code** - private repos, proprietary code
2. **Use cloud AI for public repos** - faster, better quality
3. **Combine both** - Ollama for pre-commit, cloud for CI/CD

## Comparison: Ollama vs Cloud AI

| Feature | Ollama | Gemini | Claude | OpenAI |
|---------|--------|--------|--------|--------|
| **Privacy** | ✅ 100% local | ⚠️ Cloud | ⚠️ Cloud | ⚠️ Cloud |
| **Cost** | ✅ Free | ✅ Free tier | ❌ Paid | ❌ Paid |
| **Speed** | ⚡ Fast | ⚡ Fast | ⚡ Fast | ⚡ Fast |
| **Quality** | 🟡 Good | ✅ Excellent | ✅ Excellent | ✅ Excellent |
| **Offline** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Setup** | 🟡 Moderate | ✅ Easy | ✅ Easy | ✅ Easy |

## Example Workflow

### Hybrid Setup

Use Ollama locally, cloud AI in CI:

**.aireviewrc.json** (local):
```json
{
  "ai": {
    "provider": "ollama",
    "model": "deepseek-coder:6.7b"
  }
}
```

**.github/workflows/ai-review.yml** (CI):
```yaml
env:
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

This way:
- ⚡ Fast local reviews before commit
- 🤖 High-quality cloud reviews in CI

## Resources

- 📖 [Ollama Documentation](https://github.com/ollama/ollama)
- 🤖 [Model Library](https://ollama.com/library)
- 💬 [Ollama Discord](https://discord.gg/ollama)
- 🐛 [Report Issues](https://github.com/franxyang/ai-code-review-bot/issues)

---

**Happy Offline Reviewing! 🏠**
