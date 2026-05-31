<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  Download,
  Edit3,
  LockKeyhole,
  Plus,
  ShieldAlert,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-vue-next'
import {
  accountSecurityCapabilities,
  DEFAULT_ACCOUNT_ID,
  useAccountStore,
  type AccountProfileInput,
} from '@/stores/account'
import type { AccountRecord } from '@/utils/db'

const router = useRouter()
const accountStore = useAccountStore()
const { accounts, currentAccount, error, avatarUrl, displayName, avatarInitial } = storeToRefs(accountStore)

const avatarInputRef = ref<HTMLInputElement | null>(null)
const editMode = ref(false)
const createMode = ref(false)
const managementOpen = ref(true)
const savingProfile = ref(false)
const creatingAccount = ref(false)
const switchingAccountId = ref<string | null>(null)
const exporting = ref(false)
const deleting = ref(false)
const formError = ref<string | null>(null)
const createError = ref<string | null>(null)
const deleteConfirmation = ref('')

const profileForm = reactive<AccountProfileInput>({
  name: '',
  email: '',
  bio: '',
})

const createForm = reactive<AccountProfileInput>({
  name: '',
  email: '',
  bio: '',
})

const activeAccountCount = computed(() => accounts.value.length)
const canDeleteCurrentAccount = computed(() => Boolean(currentAccount.value))
const deleteConfirmationTarget = computed(() => currentAccount.value?.name ?? '')
const deleteActionEnabled = computed(() => {
  return canDeleteCurrentAccount.value && deleteConfirmation.value.trim() === deleteConfirmationTarget.value
})

const createdAtLabel = computed(() => formatDateTime(currentAccount.value?.createdAt))
const lastActiveAtLabel = computed(() => formatDateTime(currentAccount.value?.lastActiveAt))

function syncProfileForm(account: AccountRecord | null): void {
  profileForm.name = account?.name ?? ''
  profileForm.email = account?.email ?? ''
  profileForm.bio = account?.bio ?? ''
}

function resetCreateForm(): void {
  createForm.name = ''
  createForm.email = ''
  createForm.bio = ''
  createError.value = null
}

function formatDateTime(value?: Date): string {
  if (!value) {
    return '未记录'
  }

  return new Date(value).toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getErrorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : String(caught)
}

function goBackToHub(): void {
  void router.push('/')
}

function enterWorkstation(): void {
  void router.push('/workstation')
}

function triggerAvatarPicker(): void {
  avatarInputRef.value?.click()
}

async function handleAvatarSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }

  formError.value = null
  try {
    await accountStore.updateAvatar(file)
  } catch (caught) {
    formError.value = getErrorMessage(caught)
  }
}

async function saveProfile(): Promise<void> {
  if (savingProfile.value) {
    return
  }

  savingProfile.value = true
  formError.value = null
  try {
    await accountStore.updateAccount({
      name: profileForm.name,
      email: profileForm.email,
      bio: profileForm.bio,
    })
    editMode.value = false
  } catch (caught) {
    formError.value = getErrorMessage(caught)
  } finally {
    savingProfile.value = false
  }
}

async function createAccount(): Promise<void> {
  if (creatingAccount.value) {
    return
  }

  creatingAccount.value = true
  createError.value = null
  try {
    await accountStore.createNewAccount({
      name: createForm.name,
      email: createForm.email,
      bio: createForm.bio,
    })
    createMode.value = false
    resetCreateForm()
    editMode.value = false
  } catch (caught) {
    createError.value = getErrorMessage(caught)
  } finally {
    creatingAccount.value = false
  }
}

async function switchAccount(accountId: string): Promise<void> {
  if (switchingAccountId.value || accountId === currentAccount.value?.id) {
    return
  }

  switchingAccountId.value = accountId
  formError.value = null
  try {
    await accountStore.switchAccount(accountId)
    editMode.value = false
    deleteConfirmation.value = ''
  } catch (caught) {
    formError.value = getErrorMessage(caught)
  } finally {
    switchingAccountId.value = null
  }
}

async function downloadAccountExport(): Promise<void> {
  if (exporting.value) {
    return
  }

  exporting.value = true
  formError.value = null
  try {
    const payload = await accountStore.exportAccountData()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const safeName = displayName.value.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'local-account'
    link.href = url
    link.download = `inkforge-${safeName}-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (caught) {
    formError.value = getErrorMessage(caught)
  } finally {
    exporting.value = false
  }
}

async function deleteCurrentAccount(): Promise<void> {
  if (!deleteActionEnabled.value || deleting.value) {
    return
  }

  deleting.value = true
  formError.value = null
  try {
    await accountStore.deleteCurrentAccount()
    deleteConfirmation.value = ''
    editMode.value = false
  } catch (caught) {
    formError.value = getErrorMessage(caught)
  } finally {
    deleting.value = false
  }
}

function openCreateForm(): void {
  createMode.value = true
  resetCreateForm()
}

function closeCreateForm(): void {
  createMode.value = false
  resetCreateForm()
}

watch(currentAccount, (account) => {
  syncProfileForm(account)
}, { immediate: true })

onMounted(async () => {
  await accountStore.ensureDefaultAccount()
})
</script>

<template>
  <div class="account-page">
    <header class="account-topbar">
      <button
        type="button"
        class="back-btn"
        @click="goBackToHub"
      >
        <ArrowLeft
          :size="18"
          :stroke-width="2.2"
        />
        <span>返回首页</span>
      </button>
      <div class="topbar-copy">
        <span class="eyebrow">本地资料</span>
        <h1>本地账户</h1>
      </div>
    </header>

    <main class="account-main">
      <section
        class="profile-card"
        aria-label="当前本地账户"
      >
        <div class="profile-ambient" />
        <div class="profile-avatar-wrap">
          <button
            type="button"
            class="profile-avatar-btn"
            @click="triggerAvatarPicker"
          >
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              class="profile-avatar-img"
              :alt="displayName"
            >
            <span
              v-else
              class="profile-avatar-fallback"
            >{{ avatarInitial }}</span>
            <span class="avatar-action"><Upload
              :size="14"
              :stroke-width="2.2"
            /> 上传</span>
          </button>
          <input
            ref="avatarInputRef"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="sr-only"
            @change="handleAvatarSelected"
          >
        </div>

        <div class="profile-copy">
          <span class="local-badge"><User
            :size="14"
            :stroke-width="2.3"
          /> 仅本机</span>
          <h2>{{ displayName }}</h2>
          <p class="profile-email">
            {{ currentAccount?.email || '未设置邮箱' }}
          </p>
          <p class="profile-bio">
            {{ currentAccount?.bio || '尚未填写简介。资料只保存在当前设备的 IndexedDB 中。' }}
          </p>
        </div>

        <div class="profile-meta-grid">
          <div>
            <span>账户数</span>
            <strong>{{ activeAccountCount }}</strong>
          </div>
          <div>
            <span>创建时间</span>
            <strong>{{ createdAtLabel }}</strong>
          </div>
          <div>
            <span>最近访问</span>
            <strong>{{ lastActiveAtLabel }}</strong>
          </div>
        </div>

        <div
          v-if="error || formError"
          class="account-alert"
        >
          {{ formError || error }}
        </div>

        <div class="profile-actions">
          <button
            type="button"
            class="primary-btn"
            @click="enterWorkstation"
          >
            <Briefcase
              :size="16"
              :stroke-width="2.2"
            />
            <span>进入工作台</span>
            <ArrowUpRight
              :size="15"
              :stroke-width="2.2"
              class="nib-arrow"
            />
          </button>
          <button
            type="button"
            class="secondary-btn"
            @click="editMode = !editMode"
          >
            <Edit3
              :size="16"
              :stroke-width="2.2"
            />
            <span>{{ editMode ? '收起编辑' : '编辑资料' }}</span>
          </button>
          <button
            type="button"
            class="secondary-btn"
            @click="managementOpen = !managementOpen"
          >
            <Users
              :size="16"
              :stroke-width="2.2"
            />
            <span>{{ managementOpen ? '收起管理' : '管理账户' }}</span>
          </button>
        </div>
      </section>

      <section
        v-if="editMode"
        class="panel-card compact-panel"
        aria-label="编辑资料"
      >
        <div class="section-heading">
          <h3>编辑个人资料</h3>
          <p>名称、邮箱与简介会立即写入本地账户表。</p>
        </div>
        <form
          class="account-form"
          @submit.prevent="saveProfile"
        >
          <label>
            <span>显示名称</span>
            <input
              v-model.trim="profileForm.name"
              type="text"
              maxlength="50"
              required
            >
          </label>
          <label>
            <span>邮箱</span>
            <input
              v-model.trim="profileForm.email"
              type="email"
              placeholder="可选"
            >
          </label>
          <label class="full-row">
            <span>简介</span>
            <textarea
              v-model.trim="profileForm.bio"
              maxlength="200"
              rows="4"
              placeholder="可选，最多 200 字"
            />
          </label>
          <div class="form-actions full-row">
            <button
              type="button"
              class="ghost-btn"
              @click="syncProfileForm(currentAccount); editMode = false"
            >
              取消
            </button>
            <button
              type="submit"
              class="primary-btn"
              :disabled="savingProfile"
            >
              <CheckCircle2
                :size="16"
                :stroke-width="2.2"
              />
              <span>{{ savingProfile ? '保存中...' : '保存资料' }}</span>
            </button>
          </div>
        </form>
      </section>

      <section
        v-show="managementOpen"
        class="management-grid"
        aria-label="账户管理"
      >
        <div class="panel-card">
          <div class="section-heading split-heading">
            <div>
              <h3>本地账户列表</h3>
              <p>切换只改变当前本地 Profile 指针，不触发远程认证。</p>
            </div>
            <button
              type="button"
              class="secondary-btn"
              @click="openCreateForm"
            >
              <Plus
                :size="16"
                :stroke-width="2.2"
              />
              <span>创建新账户</span>
            </button>
          </div>

          <div class="account-list">
            <button
              v-for="account in accounts"
              :key="account.id"
              type="button"
              class="account-row"
              :class="{ active: account.id === currentAccount?.id }"
              :disabled="switchingAccountId === account.id || account.id === currentAccount?.id"
              @click="switchAccount(account.id)"
            >
              <span class="row-avatar">{{ account.name.slice(0, 1).toUpperCase() || 'I' }}</span>
              <span class="row-copy">
                <strong>{{ account.name }}</strong>
                <small>{{ account.email || '本机账户' }} · {{ formatDateTime(account.lastActiveAt) }}</small>
              </span>
              <span
                v-if="account.id === currentAccount?.id"
                class="active-pill"
              >当前</span>
              <span
                v-else
                class="switch-pill"
              >切换</span>
            </button>
          </div>

          <div
            v-if="createMode"
            class="create-inline"
          >
            <div class="section-heading split-heading">
              <div>
                <h4>创建本地账户</h4>
                <p>Zod 会校验显示名称、邮箱格式与简介长度。</p>
              </div>
              <button
                type="button"
                class="icon-close"
                title="关闭"
                @click="closeCreateForm"
              >
                <X
                  :size="16"
                  :stroke-width="2.4"
                />
              </button>
            </div>
            <form
              class="account-form"
              @submit.prevent="createAccount"
            >
              <label>
                <span>显示名称</span>
                <input
                  v-model.trim="createForm.name"
                  type="text"
                  maxlength="50"
                  required
                >
              </label>
              <label>
                <span>邮箱</span>
                <input
                  v-model.trim="createForm.email"
                  type="email"
                  placeholder="可选"
                >
              </label>
              <label class="full-row">
                <span>简介</span>
                <textarea
                  v-model.trim="createForm.bio"
                  maxlength="200"
                  rows="3"
                  placeholder="可选，最多 200 字"
                />
              </label>
              <p
                v-if="createError"
                class="form-error full-row"
              >
                {{ createError }}
              </p>
              <div class="form-actions full-row">
                <button
                  type="button"
                  class="ghost-btn"
                  @click="closeCreateForm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  class="primary-btn"
                  :disabled="creatingAccount"
                >
                  <Plus
                    :size="16"
                    :stroke-width="2.2"
                  />
                  <span>{{ creatingAccount ? '创建中...' : '创建并切换' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        <div class="panel-card">
          <div class="section-heading">
            <h3>安全与同步</h3>
            <p>本切片只开放真实本地账户能力，后续认证能力保持禁用展示。</p>
          </div>
          <div class="capability-list">
            <div
              v-for="item in accountSecurityCapabilities"
              :key="item.id"
              class="capability-card disabled"
            >
              <div class="capability-icon">
                <LockKeyhole
                  v-if="item.id === 'local-password'"
                  :size="17"
                  :stroke-width="2.2"
                />
                <ShieldAlert
                  v-else
                  :size="17"
                  :stroke-width="2.2"
                />
              </div>
              <div>
                <strong>{{ item.label }}</strong>
                <p>{{ item.description }}</p>
              </div>
              <span>{{ item.status === 'planned' ? '即将推出' : '未启用' }}</span>
            </div>
          </div>

          <div class="export-box">
            <div>
              <h4>GDPR JSON 导出</h4>
              <p>导出当前本地账户、账户列表与真实 IndexedDB 工作区快照。</p>
            </div>
            <button
              type="button"
              class="secondary-btn"
              :disabled="exporting"
              @click="downloadAccountExport"
            >
              <Download
                :size="16"
                :stroke-width="2.2"
              />
              <span>{{ exporting ? '导出中...' : '导出 JSON' }}</span>
            </button>
          </div>

          <div class="danger-box">
            <div>
              <h4>{{ currentAccount?.id === DEFAULT_ACCOUNT_ID ? '重置默认账户' : '软删除当前账户' }}</h4>
              <p>输入当前账户名称确认。默认账户会重置资料，非默认账户会标记为 deleted 并切回默认账户。</p>
            </div>
            <input
              v-model.trim="deleteConfirmation"
              type="text"
              :placeholder="deleteConfirmationTarget"
            >
            <button
              type="button"
              class="danger-btn"
              :disabled="!deleteActionEnabled || deleting"
              @click="deleteCurrentAccount"
            >
              <Trash2
                :size="16"
                :stroke-width="2.2"
              />
              <span>{{ deleting ? '处理中...' : '确认执行' }}</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.account-page {
  min-height: 100vh;
  padding: 28px;
  background:
    radial-gradient(circle at 14% 12%, var(--ember-soft), transparent 28%),
    linear-gradient(135deg, var(--bg-surface, #FDFCFB) 0%, var(--paper-warm, #F6F3EE) 100%);
  color: var(--text-primary, #263238);
}

.account-topbar {
  max-width: 1080px;
  margin: 0 auto 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.back-btn,
.primary-btn,
.secondary-btn,
.ghost-btn,
.danger-btn,
.icon-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  cursor: pointer;
  font: inherit;
  transition: transform var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-fast) var(--ease-out-quart),
    border-color var(--motion-fast) var(--ease-out-quart),
    background-color var(--motion-fast) var(--ease-out-quart);
}

.back-btn {
  padding: 10px 14px;
  border-radius: 999px;
  color: var(--text-secondary, #607D8B);
  background: var(--bg-surface, rgba(255, 255, 255, 0.82));
  border: 1px solid var(--hairline, #ECEFF1);
}

.back-btn:hover,
.secondary-btn:hover,
.ghost-btn:hover {
  transform: translateY(-1px);
  border-color: var(--accent-primary, #D32F2F);
  color: var(--accent-primary, #D32F2F);
}

.topbar-copy {
  text-align: right;
}

.eyebrow {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-primary, #D32F2F);
}

.topbar-copy h1 {
  margin: 0;
  font-size: 28px;
  letter-spacing: -0.04em;
}

.account-main {
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.profile-card,
.panel-card {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--hairline, rgba(224, 224, 224, 0.82));
  border-radius: 24px;
  background: var(--bg-surface, rgba(255, 255, 255, 0.88));
  box-shadow: var(--elev-3);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.profile-card {
  max-width: 480px;
  width: 100%;
  margin: 0 auto;
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 18px;
}

.profile-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(135deg, var(--ember-soft), transparent 46%);
}

.profile-avatar-wrap,
.profile-copy,
.profile-meta-grid,
.profile-actions,
.account-alert {
  position: relative;
  z-index: 1;
}

.profile-avatar-btn {
  position: relative;
  width: 96px;
  height: 96px;
  padding: 0;
  border: 3px solid var(--bg-surface, #FFFFFF);
  border-radius: 28px;
  overflow: hidden;
  background: var(--accent-primary, #D32F2F);
  color: #FFFFFF;
  box-shadow: var(--elev-2);
  cursor: pointer;
}

.profile-avatar-img,
.profile-avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  object-fit: cover;
}

.profile-avatar-fallback {
  font-size: 42px;
  font-weight: 900;
}

.avatar-action {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 999px;
  background: var(--scrim, rgba(38, 50, 56, 0.72));
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 700;
}

.local-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--accent-primary-light, #FFEBEE);
  color: var(--accent-primary, #D32F2F);
  font-size: 12px;
  font-weight: 800;
}

.profile-copy h2 {
  margin: 12px 0 4px;
  font-size: 30px;
  letter-spacing: -0.05em;
}

.profile-email,
.profile-bio {
  margin: 0;
  color: var(--text-secondary, #607D8B);
  line-height: 1.6;
}

.profile-bio {
  margin-top: 8px;
}

.profile-meta-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.profile-meta-grid div {
  padding: 12px 10px;
  border-radius: 16px;
  background: var(--bg-rice-paper, rgba(250, 251, 252, 0.9));
  border: 1px solid var(--hairline, #ECEFF1);
}

.profile-meta-grid span {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--text-muted, #90A4AE);
}

.profile-meta-grid strong {
  font-size: 12px;
  color: var(--text-primary, #263238);
}

.account-alert,
.form-error {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--warning-light, #FFF8E1);
  color: var(--warning, #A15C00);
  font-size: 13px;
  text-align: left;
}

.profile-actions,
.form-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.primary-btn,
.secondary-btn,
.ghost-btn,
.danger-btn {
  min-height: 40px;
  padding: 9px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 800;
}

.primary-btn {
  background: var(--accent-primary, #D32F2F);
  color: #FFFFFF;
  box-shadow: var(--elev-1);
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--glow-ember);
}

.nib-arrow {
  transition: transform var(--motion-fast) var(--ease-out-quart);
}

.primary-btn:hover:not(:disabled) .nib-arrow {
  transform: translate(2px, -2px);
}

.secondary-btn,
.ghost-btn {
  background: var(--bg-surface, #FFFFFF);
  color: var(--text-secondary, #607D8B);
  border: 1px solid var(--hairline, #ECEFF1);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none !important;
}

.compact-panel {
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  padding: 22px;
}

.panel-card {
  padding: 22px;
}

.section-heading {
  margin-bottom: 16px;
}

.section-heading h3,
.section-heading h4 {
  margin: 0 0 5px;
  letter-spacing: -0.03em;
}

.section-heading p,
.capability-card p,
.export-box p,
.danger-box p {
  margin: 0;
  color: var(--text-secondary, #78909C);
  line-height: 1.55;
  font-size: 13px;
}

.split-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.account-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.account-form label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 12px;
  font-weight: 800;
  color: var(--text-secondary, #607D8B);
}

.account-form input,
.account-form textarea,
.danger-box input {
  width: 100%;
  border: 1px solid var(--hairline, #E0E0E0);
  border-radius: 12px;
  background: var(--bg-surface, #FFFFFF);
  color: var(--text-primary, #263238);
  font: inherit;
  padding: 10px 12px;
  outline: none;
}

.account-form input:focus,
.account-form textarea:focus,
.danger-box input:focus {
  border-color: var(--accent-primary, #D32F2F);
  box-shadow: var(--focus-ring);
}

.full-row {
  grid-column: 1 / -1;
}

.management-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 18px;
}

.account-list,
.capability-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.account-row,
.capability-card,
.export-box,
.danger-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--hairline, #ECEFF1);
  border-radius: 16px;
  background: var(--bg-rice-paper, #FAFBFC);
}

.account-row {
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.account-row.active {
  border-color: var(--accent-primary, #D32F2F);
  background: var(--accent-primary-light, #FFEBEE);
}

.row-avatar,
.capability-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-primary, #D32F2F);
  color: #FFFFFF;
  font-weight: 900;
}

.row-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.row-copy small {
  color: var(--text-secondary, #78909C);
}

.active-pill,
.switch-pill,
.capability-card > span {
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.active-pill {
  background: var(--accent-primary, #D32F2F);
  color: #FFFFFF;
}

.switch-pill,
.capability-card > span {
  background: var(--hairline, #ECEFF1);
  color: var(--text-secondary, #607D8B);
}

.create-inline {
  margin-top: 16px;
  padding: 16px;
  border-radius: 18px;
  border: 1px dashed var(--accent-primary, #D32F2F);
  background: var(--accent-primary-light, rgba(255, 235, 238, 0.35));
}

.icon-close {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--bg-surface, #FFFFFF);
  color: var(--text-secondary, #607D8B);
}

.capability-card.disabled {
  opacity: 0.82;
}

.export-box,
.danger-box {
  margin-top: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.export-box > div,
.danger-box > div {
  flex: 1;
}

.danger-box {
  flex-wrap: wrap;
  border-color: var(--danger, #FFCDD2);
  background: var(--danger-soft, #FFF8F8);
}

.danger-box input {
  flex: 1 1 180px;
}

.danger-btn {
  background: transparent;
  color: var(--danger, #D32F2F);
  border: 1px solid var(--danger, #D32F2F);
}

.danger-btn:hover:not(:disabled) {
  background: var(--danger, #D32F2F);
  color: #FFFFFF;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 860px) {
  .account-page {
    padding: 18px;
  }

  .account-topbar,
  .management-grid,
  .account-form,
  .profile-meta-grid {
    grid-template-columns: 1fr;
  }

  .account-topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .topbar-copy {
    text-align: left;
  }

  .profile-card,
  .panel-card,
  .compact-panel {
    border-radius: 20px;
    padding: 18px;
  }

  .split-heading,
  .export-box,
  .danger-box {
    flex-direction: column;
  }
}
</style>
