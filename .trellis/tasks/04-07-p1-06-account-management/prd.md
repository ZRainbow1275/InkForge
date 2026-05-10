# 本地账户管理 + Hub 头像入口

## 规格参考
- `prompts/0327/06-account-auth-spec.md` (完整规范)

## 背景
纯 Local-First 架构，无远程认证。所有账户数据存储在 IndexedDB accounts 表。Account Store 已完整实现但缺少 UI 入口。

## 当前基线差距
- [已实现] AccountWelcome.vue 不存在
- [已实现] Hub 无头像入口按钮
- [已实现] 多账户切换 UI 不存在
- [已实现] account.ts Store 已完整 (ensureDefaultAccount/loadAccount/updateAccount/updateAvatar/exportAccountData/deleteCurrentAccount)
- [已实现] Store 缺少 listAccounts() / switchAccount() / createNewAccount()

## Requirements

### 1. AccountWelcome.vue
新建 `inkforge/src/views/AccountWelcome.vue`:
- 路由: `/account`
- 居中卡片式布局 (max-width 480px)
- 显示当前账户: 头像 (80x80 圆角) + 名称 + 邮箱 + 简介
- 操作按钮: "进入工作台" / "编辑个人资料" / "管理账户"
- 账户列表: 切换多个本地账户
- "创建新账户" 按钮
- "远程同步 (即将推出)" 占位 disabled

### 2. 创建本地账户表单
- 内联模态框 (不跳转页面)
- 字段: 显示名称 (max 50, required) / 邮箱 (optional) / 简介 (max 200, optional)
- Zod 验证
- 创建后自动切换

### 3. Account Store 增强
`stores/account.ts` 新增:
```typescript
async function listAccounts(): Promise<Account[]>
async function switchAccount(accountId: string): Promise<void>
async function createNewAccount(data: { name: string; email?: string; bio?: string }): Promise<Account>
```

### 4. HubHeader 头像入口
在 `components/hub/HubHeader.vue` 中:
- 位置: 设置按钮之后 / 新建按钮之前
- 36x36px 圆角 (10px) 按钮
- 有头像: `<img>` 显示
- 无头像: 首字母圆形 (品牌红背景白字)
- CSS: 白色边框 + hover 上浮+阴影
- `@click` → `router.push('/account')` 或 emit `open-account`

### 5. Settings Account Tab 增强
底部添加:
- "安全 (即将推出)" 卡片 — disabled 灰色
- "账户切换" 快捷卡片 — 点击跳转 /account

### 6. 路由注册
`router/index.ts` 添加:
```typescript
{ path: '/account', name: 'Account', component: () => import('@/views/AccountWelcome.vue') }
```

## Acceptance Criteria
- [x] /account 页面正常渲染
- [x] 创建本地账户 + Zod 验证
- [x] 多账户列表 + 切换
- [x] 头像上传 (裁剪 200x200)
- [x] 数据导出 GDPR JSON
- [x] Hub 头像按钮显示
- [x] 纯本地无远程认证
- [x] `cd inkforge && npx vue-tsc --noEmit` 零错误

## Implementation Note - 2026-04-25

### 本轮已落地的真实垂直切片
- 新增 `inkforge/src/utils/db.ts` 的 `AccountRecord` 与 Dexie v4 `accounts` 表，保留既有 `categories/articles/contents/documents/versions/assets` 表不迁移、不删除。
- 新增 `inkforge/src/stores/account.ts`，实现 `ensureDefaultAccount()`、`loadAccount()`、`listAccounts()`、`switchAccount()`、`createNewAccount()`、`updateAccount()`、`updateAvatar()`、`exportAccountData()`、`deleteCurrentAccount()`。
- `createNewAccount()` 与 `updateAccount()` 使用 Zod 对显示名称、邮箱、简介进行入口校验；头像上传使用真实 `File` -> `Canvas` 200x200 PNG 裁剪 -> `db.assets` 写入 -> `accounts.avatarAssetId` 绑定。
- 新增 `inkforge/src/views/AccountWelcome.vue` 与 `/account` 路由，支持当前账户资料展示、资料编辑、多账户列表、切换、创建、头像上传、GDPR JSON 导出、远程同步禁用占位、安全能力禁用占位。
- Hub 顶部静态远程 DiceBear 头像已替换为本地账户入口；无头像时使用本地首字母 fallback，不使用远程图片或 mock 数据。
- Settings 关于页底部新增“本地账户与安全”快捷卡片：账户切换跳转 `/account`，本地密码 / Windows Hello 保持禁用状态，不伪装为已实现。

### 本轮验证
- Targeted account checks passed: TypeScript transpile、Vue template compile、accounts 表、store actions、Zod schema、头像裁剪、`/account` 路由、Hub 本地头像、Settings 账户卡片、无 `window.prompt`。
- Emoji surrogate scan passed: 本轮新增账户相关文件未引入 emoji 图标。

### 仍阻塞的正式守卫
- `pnpm -C D:/Desktop/Inkforge/inkforge exec vue-tsc --noEmit` 仍失败于本机依赖状态：`Command "vue-tsc" not found`，随后 `entities@7.0.1/dist/commonjs/decode.js` 抛 `ReferenceError: exports is not defined`。
- `pnpm -C D:/Desktop/Inkforge/inkforge exec vite build` 仍失败于本机 ACL：`EPERM: operation not permitted, open ...vite/bin/vite.js`。
- 因正式守卫未通过，本任务保持 pending/blocked，不标记 completed。


## 2026-04-29 Completion Note

- P1-06 的真实源码验收已重新跑通。`AccountWelcome.vue` 提供 `/account` 页面、当前账户展示、资料编辑、多账户列表、创建表单、头像上传、GDPR JSON 导出、禁用的安全/同步能力展示。
- `stores/account.ts` 真实使用 Dexie `accounts` 表、Zod 输入校验、`localStorage` 当前账户指针、`File` 到 Canvas 200x200 PNG 裁剪、`db.assets` 写入和 `accounts.avatarAssetId` 绑定；没有远程登录或 mock 账户。
- Hub 顶部入口在当前真实应用结构中落于 `HubView.vue` 的 topbar，而不是不存在的独立 `HubHeader.vue` 文件；入口使用 `accountStore.avatarUrl` / `accountStore.avatarInitial` 并跳转 `/account`。
- Settings 底部保留本地账户与安全卡片，账户切换跳转 `/account`；本地密码、Windows Hello、远程同步均保持 disabled/即将推出，不伪装为已完成认证。
- 2026-04-25 的本地依赖/ACL blocker 已失效：本轮 `P1_06_STATIC_OK`、`pnpm exec vue-tsc --noEmit`、`pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`、`pnpm build` 均已通过，构建仅保留既有 chunk size warning。
- 0420 的 Chrome Profile 级硬隔离、每账户独立 IndexedDB、多窗口并行、本地密码、Windows Hello 与权限审计属于后续 Profile/security 切片；本任务只关闭 P1-06 local-first 账户入口与账户资料管理基线。
