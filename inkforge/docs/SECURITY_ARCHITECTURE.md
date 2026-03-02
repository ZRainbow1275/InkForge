# InkForge 安全架构设计文档

> 版本: 1.0.0
> 更新日期: 2026-01-30
> 适用范围: Web + Tauri 双平台

---

## 1. 安全设计原则

### 1.1 核心原则

| 原则 | 说明 | 实现位置 |
|------|------|----------|
| **最小权限** | 仅授予完成任务所需的最低权限 | `crypto/key-management.ts` - extractable=false |
| **纵深防御** | 多层安全控制，单点失效不导致全面沦陷 | HTML + CSS + 输入验证三层净化 |
| **安全默认** | 默认配置即为安全配置 | `config/security.ts` 集中管理 |
| **失败安全** | 发生错误时回退到安全状态 | Store 初始化失败调用 reset() |

### 1.2 威胁模型

```
┌─────────────────────────────────────────────────────────────┐
│                      攻击面分析                              │
├─────────────────────────────────────────────────────────────┤
│  用户输入 ──► HTML 净化 ──► CSS 净化 ──► 渲染              │
│      │                                                      │
│      ▼                                                      │
│  外部 URL ──► SSRF 防护 ──► 内容解析 ──► 存储              │
│      │                                                      │
│      ▼                                                      │
│  本地存储 ──► 加密保护 ──► 权限验证 ──► 导出              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 安全模块架构

### 2.1 模块依赖图

```
┌─────────────────────────────────────────────────────────────┐
│                    config/security.ts                        │
│              (Single Source of Truth)                        │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ html-sanitizer│   │ css-sanitizer │   │ key-management│
│   (DOMPurify) │   │  (正则检测)   │   │  (Web Crypto) │
└───────────────┘   └───────────────┘   └───────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                ┌───────────────────────┐
                │    services/error     │
                │   (审计日志 + 脱敏)   │
                └───────────────────────┘
```

### 2.2 配置中心 (`config/security.ts`)

所有安全相关常量的单一来源：

```typescript
// 密码策略
PASSWORD_POLICY.MIN_LENGTH = 8

// 版本管理
VERSION_MANAGEMENT.MAX_VERSIONS_PER_DOCUMENT = 50

// AI 服务
OLLAMA_CONFIG.ALLOWED_HOSTS = ['localhost', '127.0.0.1']

// 日志安全
LOG_SECURITY.SENSITIVE_FIELDS = ['password', 'token', 'secret', ...]
```

---

## 3. 关键安全机制

### 3.1 HTML 净化 (`html-sanitizer.ts`)

**设计决策**：
- 使用 DOMPurify 作为底层引擎
- 提供多种预设模式适配不同场景
- 同步版本避免全局 hooks 状态污染
- 异步版本使用互斥锁保证并发安全

**模式对照**：

| 模式 | 使用场景 | 安全级别 |
|------|----------|----------|
| `strict` | 用户生成内容 | 最高 |
| `standard` | 常规内容 | 高 |
| `markdown-render` | Markdown 渲染 | 中 |
| `wechat-export` | 微信导出 | 中（保留样式） |

### 3.2 CSS 净化 (`css-sanitizer.ts`)

**防护模式**：
- IE Expression (`expression()`)
- JavaScript URL (`javascript:`)
- Mozilla Binding (`-moz-binding`)
- 编码绕过（十六进制、八进制、URL编码、HTML实体）

**性能优化**：
- 单次 replace 操作替代 test + replace
- 每次调用创建新 RegExp 实例避免 lastIndex 污染

### 3.3 加密服务 (`crypto/`)

**密钥层级**：

```
┌─────────────────────────────────────────┐
│           用户密码 (PBKDF2)             │
│                   │                      │
│                   ▼                      │
│           包装密钥 (Wrapping Key)        │
│                   │                      │
│                   ▼                      │
│           主密钥 (Master Key)            │
│          AES-GCM-256                     │
│                   │                      │
│                   ▼                      │
│           数据加密/解密                  │
└─────────────────────────────────────────┘
```

**安全增强**：
- 日常操作使用 `extractable=false` 密钥
- 仅在导出/密码更改时创建可导出密钥
- 所有敏感操作记录审计日志

### 3.4 SSRF 防护 (`ai.ts`)

**验证策略**：

| 环境 | 非白名单主机行为 |
|------|------------------|
| 开发环境 | 警告日志 |
| 生产环境 | 直接拒绝 + 抛出异常 |

**白名单**：
```typescript
OLLAMA_CONFIG.ALLOWED_HOSTS = ['localhost', '127.0.0.1']
```

---

## 4. 日志与审计

### 4.1 敏感信息脱敏

自动脱敏字段：
- `password`, `secret`, `token`
- `apiKey`, `accessToken`, `refreshToken`
- `authorization`, `cookie`
- `privateKey`, `encryptionKey`

### 4.2 审计日志格式

```typescript
logger.info('[SECURITY AUDIT] 操作描述', {
    action: 'action_name',
    timestamp: new Date().toISOString(),
    // 脱敏后的上下文
})
```

### 4.3 日志采样（生产环境）

| 级别 | 采样率 |
|------|--------|
| debug | 10% |
| info | 50% |
| warn | 100% |
| error | 100% |

---

## 5. 错误处理策略

### 5.1 错误边界

```typescript
// Store 初始化失败
try {
    await loadData()
} catch (error) {
    reset()  // 回退到安全状态
    throw error
}
```

### 5.2 错误信息安全

- 用户端：显示友好的业务错误消息
- 日志端：记录技术细节但脱敏敏感信息
- 生产环境：不暴露堆栈跟踪

---

## 6. 平台特定安全

### 6.1 Web 环境

- IndexedDB 存储加密后的密钥
- CORS 限制
- CSP 策略（建议配置）

### 6.2 Tauri 环境

- 系统密钥链存储（Keychain/Credential Manager）
- IPC 通道类型安全
- 文件系统沙箱

---

## 7. 安全检查清单

### 7.1 开发阶段

- [ ] 所有用户输入经过 Zod Schema 验证
- [ ] HTML 内容使用 `sanitizeHTML()` 净化
- [ ] CSS 内容使用 `sanitizeCSS()` 净化
- [ ] 外部 URL 验证通过白名单检查
- [ ] 敏感操作添加审计日志

### 7.2 代码审查

- [ ] 无硬编码密钥/密码
- [ ] 无 `eval()` / `innerHTML` 直接赋值
- [ ] 错误处理不泄露敏感信息
- [ ] 加密密钥默认不可导出

### 7.3 发布前

- [ ] 运行安全扫描工具
- [ ] 验证生产环境配置
- [ ] 检查依赖漏洞 (`pnpm audit`)

---

## 8. 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0.0 | 2026-01-30 | 初始版本，涵盖核心安全架构 |

---

## 9. 参考资料

- [OWASP Top 10](https://owasp.org/Top10/)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Tauri Security](https://tauri.app/v1/guides/security/)
