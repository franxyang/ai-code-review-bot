# AI Code Review Bot

## 🎯 项目目标
本地运行的 AI 代码审查工具，集成到 Git 工作流中，提供自动化代码质量分析。

## 📐 核心功能

### 1. Git Hook 集成
- **pre-commit**: 快速检查（linting, 格式）
- **pre-push**: 深度 AI 审查（推送前完整分析）
- **手动模式**: `ai-review --file <path>` 或 `ai-review --commit <hash>`

### 2. 多层次分析
```
Layer 1: 静态分析 (快速)
├─ 语法错误
├─ 代码风格 (ESLint/Pylint)
├─ 类型检查
└─ 安全扫描 (硬编码密钥/SQL注入)

Layer 2: AI 审查 (深度)
├─ 代码质量评分
├─ 性能优化建议
├─ 设计模式建议
├─ 潜在 bug 检测
└─ 可维护性分析

Layer 3: 上下文理解 (可选)
├─ 与项目历史对比
├─ 依赖关系分析
└─ 架构一致性检查
```

### 3. 报告生成
- **终端输出**: 彩色、分级（error/warning/info）
- **Markdown 报告**: 可提交到 PR
- **JSON 格式**: 可集成 CI/CD
- **历史记录**: 追踪代码质量趋势

## 🏗️ 技术架构

### 核心技术栈
```
├─ 语言: TypeScript (Node.js)
├─ Git 集成: simple-git
├─ 静态分析: 
│  ├─ ESLint (JavaScript/TypeScript)
│  ├─ Pylint/Ruff (Python)
│  └─ cargo clippy (Rust)
├─ AI 模型:
│  ├─ 主模型: Claude (Anthropic API)
│  ├─ 备选: OpenAI GPT-4
│  └─ 本地: Ollama (隐私模式)
├─ 报告: 
│  ├─ chalk (终端彩色)
│  └─ marked (Markdown 渲染)
└─ 配置: cosmiconfig (支持多种配置格式)
```

### 项目结构
```
ai-code-review-bot/
├─ src/
│  ├─ cli.ts              # 命令行入口
│  ├─ git/
│  │  ├─ hooks.ts         # Git hook 管理
│  │  └─ diff-parser.ts   # Git diff 解析
│  ├─ analyzers/
│  │  ├─ static.ts        # 静态分析器
│  │  ├─ ai-reviewer.ts   # AI 审查引擎
│  │  └─ security.ts      # 安全扫描
│  ├─ reporters/
│  │  ├─ terminal.ts      # 终端输出
│  │  ├─ markdown.ts      # Markdown 报告
│  │  └─ json.ts          # JSON 导出
│  ├─ models/
│  │  ├─ claude.ts        # Claude 集成
│  │  ├─ openai.ts        # OpenAI 集成
│  │  └─ ollama.ts        # Ollama 本地模型
│  └─ utils/
│     ├─ config.ts        # 配置管理
│     └─ logger.ts        # 日志系统
├─ templates/
│  └─ prompts/            # AI prompt 模板
├─ tests/
├─ .aireviewrc.example    # 示例配置
└─ package.json
```

## 🔒 安全设计

### 1. API 密钥管理
- ✅ 从环境变量读取 (`ANTHROPIC_API_KEY`)
- ✅ 支持 `.env` 文件（自动 .gitignore）
- ✅ 本地加密存储（可选，使用 keytar）
- ❌ 禁止硬编码任何密钥

### 2. 代码隐私
- ✅ 本地优先：静态分析不发送外部
- ✅ AI 审查前提示用户（是否包含敏感代码）
- ✅ 支持完全离线模式（Ollama）
- ✅ 可配置忽略文件/目录

### 3. 依赖安全
- ✅ 使用 npm audit / yarn audit
- ✅ 锁定依赖版本
- ✅ 定期更新扫描

### 4. Hook 安全
- ✅ 可禁用/跳过 hook (`--no-verify`)
- ✅ 超时机制（避免阻塞提交）
- ✅ 错误不阻断 Git 操作（可配置）

## 📊 AI Prompt 设计

### 系统 Prompt（精简版）
```markdown
You are an expert code reviewer. Analyze the provided code diff and provide:
1. **Quality Score** (0-10)
2. **Issues** (categorized by severity: error/warning/info)
3. **Suggestions** (actionable improvements)
4. **Positive Points** (what's done well)

Focus on:
- Security vulnerabilities
- Performance bottlenecks
- Code maintainability
- Best practices
- Potential bugs

Output in structured JSON format.
```

### 上下文注入
```typescript
{
  language: "python",
  fileType: "backend/api",
  changedLines: 45,
  additions: 30,
  deletions: 15,
  projectContext: "Flask REST API with PostgreSQL"
}
```

## 🎨 用户体验

### CLI 界面示例
```bash
$ ai-review --commit HEAD

🔍 Analyzing commit: feat(auth): add OAuth2 support

📂 Files changed: 3
  ✓ src/auth/oauth.py (+120, -5)
  ✓ src/config/settings.py (+8, -2)
  ✓ tests/test_oauth.py (+45, -0)

⚡ Running static analysis...
  ✓ No syntax errors
  ⚠ 2 style warnings

🤖 Running AI review...
  [████████████████] 100% (12s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Overall Score: 8.5/10

🔴 Errors (0)

🟡 Warnings (2)
  ⚠ src/auth/oauth.py:42
    Hardcoded redirect URI - use environment variable
    
  ⚠ src/auth/oauth.py:67
    Missing error handling for network failures

💡 Suggestions (3)
  ✓ src/auth/oauth.py:88
    Consider caching OAuth tokens to reduce API calls
    
  ✓ src/config/settings.py:15
    Add validation for OAUTH_CLIENT_ID length

✅ Positive Points
  • Excellent test coverage (100%)
  • Clear function naming and docstrings
  • Proper use of type hints

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 Full report saved to: .ai-review/reports/2026-01-29-133000.md

Push anyway? [Y/n]
```

## 📅 开发计划

### Phase 1: 核心框架 (Day 1-2)
- [x] 项目初始化
- [ ] Git diff 解析
- [ ] 静态分析集成
- [ ] 基础 CLI 界面

### Phase 2: AI 集成 (Day 2-3)
- [ ] Claude API 集成
- [ ] Prompt 工程
- [ ] 响应解析
- [ ] 错误处理

### Phase 3: Hook 系统 (Day 3-4)
- [ ] Pre-commit hook
- [ ] Pre-push hook
- [ ] Hook 安装/卸载
- [ ] 配置系统

### Phase 4: 报告与优化 (Day 4-5)
- [ ] 终端美化
- [ ] Markdown 报告
- [ ] 历史追踪
- [ ] 性能优化

### Phase 5: 测试与文档 (Day 5)
- [ ] 单元测试
- [ ] 集成测试
- [ ] README 文档
- [ ] 使用示例

## 🔧 配置示例

### .aireviewrc.json
```json
{
  "enabled": true,
  "hooks": {
    "preCommit": "static",
    "prePush": "full"
  },
  "ai": {
    "provider": "claude",
    "model": "claude-sonnet-4",
    "maxTokens": 4000,
    "temperature": 0.2
  },
  "analyzers": {
    "static": true,
    "security": true,
    "performance": true
  },
  "ignore": [
    "node_modules/**",
    "dist/**",
    "*.min.js",
    ".env*"
  ],
  "thresholds": {
    "blockPush": 6.0,
    "warning": 7.5
  },
  "output": {
    "terminal": true,
    "markdown": true,
    "json": false
  }
}
```

## 🚨 风险与限制

### 技术风险
1. **API 成本**: AI 调用可能产生费用
   - 缓解: 支持本地模型，设置每日限额
   
2. **性能**: 大型 diff 审查耗时
   - 缓解: 异步处理，增量分析
   
3. **准确性**: AI 可能误报
   - 缓解: 分级系统，用户可反馈

### 使用限制
- 需要网络连接（除非使用 Ollama）
- 仅支持文本代码（不支持二进制文件）
- 有限的语言支持（初期：Python/JS/TS/Go）

## 📈 未来扩展
- [ ] VSCode 扩展
- [ ] GitHub Action 集成
- [ ] 团队共享配置
- [ ] 自定义规则引擎
- [ ] 机器学习改进（基于用户反馈）

---

**状态**: 🚧 规划完成，准备开发
**开始时间**: 2026-01-29 13:30
**预计完成**: 2026-02-03
