# 06 -- 本地账户管理与 Hub 头像入口规范

> 优先级: P1
> 影响文件: 新增 AccountWelcome.vue, 修改 router, stores/account.ts, HubHeader.vue, HubView.vue, SettingsView.vue
> 核心目标: 实现纯本地账户管理界面，在 HubHeader 添加头像入口按钮
> 架构定位: **纯本地账户管理，无远程认证** -- InkForge 是 Local-First 应用，所有账户数据存储在 IndexedDB，不依赖任何远程服务器

---

## 一、问题描述

1. **无账户管理入口页面** -- 缺乏独立的本地账户管理 UI 流程
2. **Hub 无头像入口** -- HubHeader.vue 右侧操作区缺少可点击的用户头像按钮，用户无法快速访问账户管理
3. **账户管理功能分散** -- SettingsView 的 account Tab 有基础编辑功能，但缺乏独立入口页面和多账户切换能力

## 二、现有架构分析 (重要前提)

### 2.1 后端现状

**关键事实**: `server/` 目录当前仅包含同步数据文件 (manifest.json + .inkforge 文档)，没有 Hono.js 后端代码。

因此，账户系统**必须采用本地优先 (Local-First) 模式**:
- 账户数据存储在 IndexedDB `accounts` 表中
- 默认使用 `local-default` 账户 ID
- 所有页面均可直接访问，无认证路由守卫
- 不实现远程登录/注册流程
- 预留远程认证接口占位 (标注"即将推出")

### 2.2 前端 -- stores/account.ts (已存在, 完整)

| 功能 | 方法 | 说明 |
|---|---|---|
| 确保默认账户 | `ensureDefaultAccount()` | 如果不存在则创建 `local-default` 账户 |
| 加载账户 | `loadAccount(accountId?)` | 加载指定 ID 的账户, 默认从 settingsStore 读取 profileId |
| 更新账户 | `updateAccount(updates)` | Zod 验证后更新 (name, email, bio, avatarBlobId) |
| 上传头像 | `updateAvatar(file: File)` | 5MB 限制, Canvas 裁剪 200x200, IndexedDB Blob 存储 |
| 导出数据 | `exportAccountData()` | GDPR 风格导出: 账户+设置+文章+分类+内容+版本+素材+同步日志+活动日志+设置档案 |
| 删除账户 | `deleteCurrentAccount()` | 默认账户重置为初始值, 非默认账户直接删除 |
| 头像 URL | `avatarUrl: Ref<string \| null>` | Blob URL, 组件销毁时自动 revoke |
| 首字母 | `avatarInitial: ComputedRef<string>` | 显示名称首字符大写 |
| 显示名称 | `displayName: ComputedRef<string>` | 当前账户名称, 兜底 "InkForge 用户" |

### 2.3 Settings Store 中的 Account Schema

```typescript
const AccountSettingsSchema = z.object({
  profileId: z.string().min(1).default('local-default'),
})
```

### 2.4 相关安全能力

- `config/security.ts` -- 密码策略 (PASSWORD_POLICY: 12+ 字符, 大小写+数字)
- `utils/crypto/key-management.ts` -- 密钥管理 (PBKDF2 + AES-GCM)

## 三、页面设计规范

### 3.1 账户欢迎页 (AccountWelcome.vue)

> 本地账户配置的入口页面，非远程登录页面。

**路由**: `/account`

**布局**: 居中卡片式布局

```
+--------------------------------------------+
|                                            |
|           [InkForge Logo, 52x52]           |
|       InkForge 写作工坊                     |
|     "你的本地创作空间"                       |
|                                            |
|  +--------------------------------------+  |
|  |  当前账户                              |  |
|  |                                        |  |
|  |  [头像 80x80]  用户名                   |  |
|  |                email                    |  |
|  |                简介 (截断 1 行)           |  |
|  |                                        |  |
|  |  [       进入工作台       ]             |  |
|  |                                        |  |
|  |  --------- 或 ----------               |  |
|  |                                        |  |
|  |  [编辑个人资料]  [管理账户]              |  |
|  +--------------------------------------+  |
|                                            |
|  +--------------------------------------+  |
|  |  账户列表 (多账户切换)                  |  |
|  |                                        |  |
|  |  [local-default] -- 当前  [切换]        |  |
|  |  [+ 创建新账户]                         |  |
|  +--------------------------------------+  |
|                                            |
|  +--------------------------------------+  |
|  |  远程同步 (即将推出)                    |  |
|  |                                        |  |
|  |  配置 WebDAV/S3/REST 同步目标           |  |
|  |  以实现跨设备数据同步                    |  |
|  |                                        |  |
|  |  [配置同步]                             |  |
|  +--------------------------------------+  |
+--------------------------------------------+
```

**视觉风格**:
- 背景: 与 HubView 一致的渐变背景
  ```css
  background: radial-gradient(circle at top left, rgba(211, 47, 47, 0.08), transparent 30%),
              linear-gradient(180deg, #fafbfc 0%, #f4f6f8 100%);
  ```
- 卡片: 白色, rounded-[24px], shadow-lg, max-width: 480px, 居中
- 品牌色: #D32F2F (构成红)
- 主按钮: 全宽, rounded-2xl, bg-red-700, text-white
- 次按钮: rounded-2xl, border border-slate-200, bg-white, text-slate-600

**功能要求**:
- 显示当前账户信息 (从 `accountStore.currentAccount` 读取)
- 头像使用 `accountStore.avatarUrl` (有头像) 或 `accountStore.avatarInitial` (无头像, 显示首字母)
- "进入工作台" 按钮: `router.push('/')` 跳转到 Hub
- "编辑个人资料" 按钮: `router.push('/settings')` 并定位到 account Tab
- "管理账户" 按钮: 展开本地账户列表区域
- 账户列表从 IndexedDB accounts 表读取 (需要在 accountStore 中添加 `listAccounts()` 方法)
- "创建新账户" 按钮: 打开内联创建表单对话框
- "配置同步" 按钮: `router.push('/settings')` 并定位到 sync Tab

**图标使用** (lucide-vue-next):
- Logo 区域: 自定义 "IF" 方块 (复用 HubHeader 的 `.hub-header__logo` 样式)
- 进入工作台: `ArrowRight`
- 编辑个人资料: `Edit3`
- 管理账户: `Users`
- 创建新账户: `UserPlus`
- 配置同步: `Cloud`

### 3.2 创建本地账户表单

**位置**: 作为 AccountWelcome.vue 的内联模态框 (使用 Teleport)

**表单字段**:
| 字段 | 类型 | 验证 |
|---|---|---|
| 显示名称 | text input, maxlength=50 | `z.string().min(1, '请输入显示名称').max(50)` |
| 邮箱 | email input | `z.string().email('请输入有效的邮箱地址').optional().or(z.literal(''))` |
| 个人简介 | textarea, maxlength=200 | `z.string().max(200).optional()` |

**行为**:
- 创建后自动切换到新账户
- 调用 `accountStore.createAccount(data)` (需新增方法) 存储到 IndexedDB
- 更新 `settingsStore.settings.account.profileId` 为新账户 ID
- 关闭模态框并刷新账户列表

### 3.3 路由配置

**修改文件**: `inkforge/src/main.ts` 或 router 配置

```typescript
// 添加新路由
{ path: '/account', component: () => import('@/views/AccountWelcome.vue') }

// 注意: InkForge 是本地优先应用，不需要认证路由守卫
// 所有页面都可以直接访问
// /account 页面仅用于账户管理，不是强制入口
```

### 3.4 Account Store 增强

`stores/account.ts` 当前已有完整的单账户管理功能。需要增加多账户管理能力:

```typescript
// 新增方法

/** 列出所有本地账户 */
async function listAccounts(): Promise<Account[]> {
  return db.accounts.toArray()
}

/** 切换到指定账户 */
async function switchAccount(accountId: string): Promise<Account | null> {
  const account = await getAccount(accountId)
  if (!account) {
    error.value = '目标账户不存在'
    return null
  }

  currentAccount.value = account
  settingsStore.settings.account.profileId = accountId
  settingsStore.save()
  await syncAvatarUrl()
  return account
}

/** 创建新本地账户 */
async function createNewAccount(data: { name: string; email?: string; bio?: string }): Promise<Account> {
  const newAccount = await createAccount({
    id: generateId(),
    name: data.name,
    email: data.email ?? '',
    bio: data.bio ?? '',
    avatarBlobId: null,
  })

  await switchAccount(newAccount.id)
  return newAccount
}
```

**导出更新**: 在 return 对象中添加 `listAccounts`, `switchAccount`, `createNewAccount`

### 3.5 Settings Account Tab 增强

SettingsView.vue 的 `account` Tab 当前已有:
- 头像上传 (avatarInputRef, handleAvatarSelected, saveAccountProfile)
- 名称/邮箱/简介编辑 (accountForm)
- 数据导出 (exportAccountDataFile)
- 账户重置 (resetCurrentAccount)

**需要在 account Tab 底部添加的内容**:

```
+----------------------------------------------+
|  (现有) 账户资料卡片                           |
|  (现有) 数据归属卡片                           |
|                                                |
|  +------------------------------------------+  |
|  | 安全 (即将推出)                            |  |
|  |                                            |  |
|  | 修改本地密码功能将在远程认证上线后提供。     |  |
|  | 当前主密钥管理请在"同步"Tab 中操作。         |  |
|  +------------------------------------------+  |
|                                                |
|  +------------------------------------------+  |
|  | 账户切换                                   |  |
|  |                                            |  |
|  | [账户列表]                                  |  |
|  | [+ 创建新本地账户]                          |  |
|  +------------------------------------------+  |
+----------------------------------------------+
```

**图标**: `Shield` (安全), `Users` (账户切换), `UserPlus` (创建新账户)

## 四、HubHeader 头像入口

### 4.1 需求

在 HubHeader.vue 的右侧操作区 (`.hub-header__meta`) 添加可点击的用户头像按钮。

**当前 HubHeader 右侧操作区元素** (按顺序):
1. `hub-header__badge` -- 文章数量徽章
2. `hub-header__hint` -- 快捷键提示 (Ctrl+N / Ctrl+F)
3. `hub-header__button--ghost` -- 设置按钮 (Settings2 图标)
4. `hub-header__button--primary` -- 新建按钮 (Plus 图标)

**添加位置**: 在设置按钮之后、新建按钮之前，插入头像按钮。

### 4.2 头像按钮设计

**尺寸**: 36x36px (与原型 `prototype/inkforge_hub.html` line 207-213 的 `.avatar` 一致)

**外观**:
```css
.hub-header__avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(211, 47, 47, 0.16), rgba(211, 47, 47, 0.04));
  color: #B71C1C;
  font-size: 14px;
  font-weight: 700;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;
}

.hub-header__avatar:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
  border-color: rgba(211, 47, 47, 0.22);
}

.hub-header__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

### 4.3 HubHeader.vue 修改

**Props 变更**: 添加头像相关 props

```typescript
interface HubHeaderProps {
  currentDate: string
  articleCount: number
  avatarUrl: string | null      // 新增
  avatarInitial: string         // 新增
}
```

**Emits 变更**: 添加头像点击事件

```typescript
const emit = defineEmits<{
  (e: 'new-article'): void
  (e: 'open-settings'): void
  (e: 'open-account'): void     // 新增
}>()
```

**Template 修改**: 在设置按钮之后、新建按钮之前插入头像按钮:

```html
<!-- 设置按钮 (已有) -->
<button
  type="button"
  class="hub-header__button hub-header__button--ghost"
  title="设置"
  @click="emit('open-settings')"
>
  <Settings2 :size="16" />
</button>

<!-- 头像按钮 (新增) -->
<button
  type="button"
  class="hub-header__avatar"
  title="账户管理"
  @click="emit('open-account')"
>
  <img
    v-if="props.avatarUrl"
    :src="props.avatarUrl"
    alt="用户头像"
  />
  <span v-else>{{ props.avatarInitial }}</span>
</button>

<!-- 新建按钮 (已有) -->
<button
  type="button"
  class="hub-header__button hub-header__button--primary"
  title="新建文章"
  @click="emit('new-article')"
>
  <Plus :size="16" />
  <span>新建</span>
</button>
```

### 4.4 HubView.vue 对接

在 HubView.vue 中传递头像数据到 HubHeader:

```html
<HubHeader
  :current-date="currentDate"
  :article-count="stats.totalArticles"
  :avatar-url="accountStore.avatarUrl"
  :avatar-initial="accountStore.avatarInitial"
  @new-article="handleNewArticle"
  @open-settings="goToSettings"
  @open-account="goToAccount"
/>
```

添加 accountStore 引用和导航函数:

```typescript
import { useAccountStore } from '@/stores/account'

const accountStore = useAccountStore()

function goToAccount(): void {
  void router.push('/account')
}
```

### 4.5 响应式行为

- 768px+: 头像按钮正常显示
- <768px: 头像按钮保持显示 (36x36 不占太多空间)

### 4.6 重要说明: 纯本地架构

HubHeader 头像入口仅用于导航到本地账户管理页面 (`/account`)。不涉及任何远程认证:
- 点击头像 -> 跳转 `/account` 页面 (本地账户欢迎页)
- 不弹出登录对话框
- 不检查远程认证状态
- 不显示"在线/离线"状态标识
- 头像数据全部来自 IndexedDB 的 accounts 表 (通过 `accountStore.avatarUrl` / `accountStore.avatarInitial`)

## 五、文件清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | `views/AccountWelcome.vue` | 账户管理欢迎页 (本地优先, 非远程认证) |
| 修改 | `stores/account.ts` | 添加 `listAccounts()` / `switchAccount()` / `createNewAccount()` |
| 修改 | `main.ts` 或 router | 添加 `/account` 路由 |
| 修改 | `components/hub/HubHeader.vue` | 添加头像按钮 (avatarUrl/avatarInitial props + open-account emit) |
| 修改 | `views/HubView.vue` | 传递 accountStore 数据到 HubHeader, 添加 goToAccount 函数 |
| 修改 | `views/SettingsView.vue` | account Tab 底部添加"安全(即将推出)"和"账户切换"卡片 |

## 六、验收标准

- [ ] `/account` 页面正常显示当前账户信息 (头像/名称/邮箱/简介)
- [ ] 可创建新的本地账户 (Zod 验证, 存储到 IndexedDB)
- [ ] 可在多个本地账户之间切换 (更新 settingsStore.account.profileId)
- [ ] Settings account Tab 显示完整的资料编辑界面
- [ ] 头像上传和 Canvas 裁剪 (200x200) 功能正常
- [ ] 账户数据导出功能正常 (GDPR 风格 JSON)
- [ ] HubHeader 右侧显示 36x36 头像按钮 (有头像显示图片, 无头像显示首字母)
- [ ] 点击 HubHeader 头像跳转到 `/account` 页面
- [ ] 所有数据来自 IndexedDB (无 Mock 数据)
- [ ] 所有图标使用 lucide-vue-next (无 Emoji)
- [ ] 纯本地账户管理，无远程认证流程
