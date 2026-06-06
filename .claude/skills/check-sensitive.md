---
name: check-sensitive
description: 每次提交前检查敏感信息泄露 — API Key、密码、Token、密钥等不应出现在代码中
triggers:
  - 提交
  - commit
  - 敏感信息
  - 检查泄露
  - 加密
  - pre-commit
---

# 敏感信息检查协议

每次 `git commit` 前自动执行。

## Phase 1: 扫描变更文件

读取 `git diff --cached --name-only` 获取即将提交的文件列表，然后逐个扫描。

## Phase 2: 检查规则

| 规则 | 正则 / 检查方式 | 说明 |
|------|-----------------|------|
| DeepSeek / OpenAI Key | `sk-[a-zA-Z0-9]{20,60}` | AI 服务 API Key |
| 通用 API Key 模式 | `(api_key\|apiKey\|ApiKey)\s*[:=]\s*["'][a-zA-Z0-9_-]{10,}` | 非占位符的 real key |
| 密码赋值 | `(password\|passwd\|secret)\s*[:=]\s*["'](?!changeme\|replace\|your\|test\|example\|xxx)[^"']{4,}` | 排除已知占位符 |
| JWT / Token | `eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}` | JWT 格式 token |
| 私钥 | `-----BEGIN (RSA\|EC\|OPENSSH\|DSA) PRIVATE KEY-----` | SSH/GPG 私钥 |
| 微信 Secret | `(WECHAT\|wechat).*(secret\|Secret\|appsecret)\s*[:=]\s*["'][a-zA-Z0-9]{10,}` | 非占位符的微信密钥 |
| IP 地址（生产） | `\b(?!127\.\|0\.\|255\.\|192\.168\.\|10\.\|172\.1[6-9]\|172\.2\d\|172\.3[0-1])\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b` | 非私有 IP |
| 数据库连接串 | `mysql://.*:.*@` | 包含真实密码的连接串 |
| 支付宝 Key | `(alipay\|aliyun).*(key\|secret)\s*[:=]\s*["'][a-zA-Z0-9]{10,}` | 阿里系密钥 |

### 排除规则（安全）

以下情况不报警：
- 文件名包含 `.example`、`.sample`、`.template`
- 值包含 `changeme`、`replace`、`your-`、`test-`、`example`、`xxx`
- `.env.example` 文件中的占位符
- 测试文件（`*.test.ts`、`*.spec.ts`）中的 mock 值

## Phase 3: 输出

```
## 敏感信息检查报告

✅ 未发现敏感信息泄露 — 可以安全提交

或

⚠️ 发现 N 处可疑敏感信息：

| 文件 | 行号 | 内容摘要 | 建议 |
|------|------|---------|------|
| apps/server/env/.env | 5 | `API_KEY=sk-xxx` | 移至环境变量，提交 .env.example 替代 |
| ... | ... | ... | ... |

❌ 提交已阻止。请将敏感信息移至环境变量后重新提交。
```

## Phase 4: 修复指导

如发现泄露：
1. 将敏感值移出代码，放至 `.env` 文件
2. 在对应位置创建 `.env.example` 模板（使用占位符）
3. 确认 `.gitignore` 包含对应文件
4. 如果密钥已泄露到 git 历史，建议轮换密钥

## 约束

- 仅检查 `git diff --cached` 中的变更，不扫描全仓库
- 先检查文件名是否在白名单排除列表中
- 遇到不确定的情况（如随机字符串碰巧匹配规则），标记为 INFO 而非 ERROR，不阻止提交
- 如果变更是 `.env.example` 或文档文件（`*.md`），仅扫描不阻止
