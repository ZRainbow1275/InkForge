<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  ArrowLeft,
  ArrowRight,
  Cloud,
  Download,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  Trash2,
  UserRound,
  Users,
} from 'lucide-vue-next'
import { useAccountStore } from '@/stores/account'
import { logger } from '@/services/error'

const router = useRouter()
const accountStore = useAccountStore()
const fileInputRef = ref<HTMLInputElement | null>(null)
const createLoading = ref(false)
const saveLoading = ref(false)
const switchLoadingId = ref<string | null>(null)
const exportLoading = ref(false)
const deleteLoading = ref(false)
const showCreateAccountModal = ref(false)

const { accounts, currentAccount, avatarUrl, loading, error, avatarInitial } = storeToRefs(accountStore)

const profileForm = reactive({
  name: '',
  email: '',
  bio: '',
})

const createForm = reactive({
  name: '',
  email: '',
  bio: '',
})

const currentAccountId = computed(() => currentAccount.value?.id ?? null)

watch(currentAccount, (value) => {
  profileForm.name = value?.name ?? ''
  profileForm.email = value?.email ?? ''
  profileForm.bio = value?.bio ?? ''
}, { immediate: true })

async function loadAccountCenter(): Promise<void> {
  await accountStore.loadAccount()
  await accountStore.listAccounts()
}

function goBack(): void {
  void router.push('/')
}

function goToWorkstation(): void {
  void router.push('/workstation')
}

function goToSettingsTab(tab: 'account' | 'sync'): void {
  void router.push({
    path: '/settings',
    query: { tab },
  })
}

async function handleSaveProfile(): Promise<void> {
  if (!profileForm.name.trim()) return
  saveLoading.value = true
  try {
    await accountStore.updateAccount({
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
      bio: profileForm.bio.trim(),
    })
    await accountStore.listAccounts()
  } finally {
    saveLoading.value = false
  }
}

function triggerAvatarUpload(): void {
  fileInputRef.value?.click()
}

async function handleAvatarChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    await accountStore.updateAvatar(file)
    await accountStore.listAccounts()
  } catch (err) {
    logger.error('更新头像失败', err instanceof Error ? err : new Error(String(err)))
  } finally {
    input.value = ''
  }
}

async function handleCreateAccount(): Promise<void> {
  if (!createForm.name.trim()) return
  createLoading.value = true
  try {
    const created = await accountStore.createNewAccount({
      name: createForm.name.trim(),
      email: createForm.email.trim(),
      bio: createForm.bio.trim(),
    })
    createForm.name = ''
    createForm.email = ''
    createForm.bio = ''
    if (created) {
      await accountStore.listAccounts()
      showCreateAccountModal.value = false
    }
  } finally {
    createLoading.value = false
  }
}

async function handleSwitchAccount(accountId: string): Promise<void> {
  if (accountId === currentAccountId.value) return
  switchLoadingId.value = accountId
  try {
    await accountStore.switchAccount(accountId)
  } finally {
    switchLoadingId.value = null
  }
}

async function handleExport(): Promise<void> {
  exportLoading.value = true
  try {
    const payload = await accountStore.exportAccountData()
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inkforge-account-${Date.now()}.json`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } finally {
    exportLoading.value = false
  }
}

async function handleDeleteCurrent(): Promise<void> {
  if (!currentAccount.value) return
  const confirmed = window.confirm(`确认删除账户「${currentAccount.value.name}」？`)
  if (!confirmed) return

  deleteLoading.value = true
  try {
    await accountStore.deleteCurrentAccount()
    await accountStore.listAccounts()
  } finally {
    deleteLoading.value = false
  }
}

onMounted(() => {
  void loadAccountCenter()
})
</script>

<template>
  <main class="account-page">
    <section class="account-shell">
      <header class="account-header">
        <button
          type="button"
          class="account-header__back"
          @click="goBack"
        >
          <ArrowLeft :size="16" />
          返回 Hub
        </button>
        <div class="account-header__title">
          <p class="account-header__eyebrow">
            Account Center
          </p>
          <h1>本地账户管理</h1>
        </div>
        <button
          type="button"
          class="account-header__refresh"
          :disabled="loading"
          @click="loadAccountCenter"
        >
          <Loader2
            v-if="loading"
            :size="16"
            class="spin"
          />
          <RefreshCw
            v-else
            :size="16"
          />
          刷新
        </button>
      </header>

      <p
        v-if="error"
        class="account-error"
      >
        {{ error }}
      </p>

      <section class="account-quick-links">
        <button
          type="button"
          class="account-quick-link"
          @click="goToSettingsTab('account')"
        >
          <span class="account-quick-link__icon">
            <Settings2 :size="16" />
          </span>
          <span class="account-quick-link__copy">
            <strong>前往资料设置</strong>
            <span>在 Settings 的账户页继续维护本地身份资料。</span>
          </span>
          <ArrowRight :size="16" />
        </button>
        <button
          type="button"
          class="account-quick-link"
          @click="goToSettingsTab('sync')"
        >
          <span class="account-quick-link__icon">
            <Cloud :size="16" />
          </span>
          <span class="account-quick-link__copy">
            <strong>前往同步设置</strong>
            <span>检查同步目标、凭据与冲突处理策略。</span>
          </span>
          <ArrowRight :size="16" />
        </button>
      </section>

      <div class="account-grid">
        <article class="account-card account-card--profile">
          <div class="account-card__header">
            <h2>当前账户</h2>
            <button
              type="button"
              class="account-card__icon-button"
              title="上传头像"
              @click="triggerAvatarUpload"
            >
              <ImagePlus :size="16" />
            </button>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleAvatarChange"
            >
          </div>

          <div class="account-profile">
            <div class="account-avatar">
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                alt="头像"
              >
              <span v-else>
                {{ avatarInitial }}
              </span>
            </div>
            <div class="account-fields">
              <label class="account-field">
                <span>名称</span>
                <input
                  v-model="profileForm.name"
                  type="text"
                  maxlength="50"
                  placeholder="输入账户名称"
                >
              </label>
              <label class="account-field">
                <span>邮箱</span>
                <input
                  v-model="profileForm.email"
                  type="email"
                  maxlength="100"
                  placeholder="可选邮箱"
                >
              </label>
              <label class="account-field">
                <span>简介</span>
                <textarea
                  v-model="profileForm.bio"
                  rows="3"
                  maxlength="200"
                  placeholder="写下你的创作偏好"
                />
              </label>
            </div>
          </div>

          <div class="account-actions">
            <button
              type="button"
              class="account-button account-button--primary account-button--wide"
              @click="goToWorkstation"
            >
              <ArrowRight :size="16" />
              进入工作台
            </button>
            <button
              type="button"
              class="account-button account-button--primary"
              :disabled="saveLoading || !profileForm.name.trim()"
              @click="handleSaveProfile"
            >
              <Loader2
                v-if="saveLoading"
                :size="16"
                class="spin"
              />
              <Save
                v-else
                :size="16"
              />
              保存资料
            </button>
            <button
              type="button"
              class="account-button"
              :disabled="exportLoading"
              @click="handleExport"
            >
              <Loader2
                v-if="exportLoading"
                :size="16"
                class="spin"
              />
              <Download
                v-else
                :size="16"
              />
              导出数据
            </button>
            <button
              type="button"
              class="account-button account-button--danger"
              :disabled="deleteLoading || !currentAccount"
              @click="handleDeleteCurrent"
            >
              <Loader2
                v-if="deleteLoading"
                :size="16"
                class="spin"
              />
              <Trash2
                v-else
                :size="16"
              />
              删除当前账户
            </button>
          </div>
        </article>

        <article class="account-card">
          <div class="account-card__header">
            <h2>账户列表</h2>
            <span class="account-badge">
              <Users :size="14" />
              {{ accounts.length }}
            </span>
          </div>
          <div
            v-if="accounts.length"
            class="account-list"
          >
            <button
              v-for="item in accounts"
              :key="item.id"
              type="button"
              class="account-list__item"
              :class="{ 'account-list__item--active': item.id === currentAccountId }"
              @click="handleSwitchAccount(item.id)"
            >
              <span class="account-list__name">{{ item.name }}</span>
              <span class="account-list__meta">{{ item.email || '无邮箱' }}</span>
              <span
                v-if="switchLoadingId === item.id"
                class="account-list__switching"
              >
                <Loader2
                  :size="14"
                  class="spin"
                />
                切换中
              </span>
              <span
                v-else-if="item.id === currentAccountId"
                class="account-list__current"
              >
                当前
              </span>
            </button>
          </div>
          <div
            v-else
            class="account-empty"
          >
            当前没有可用账户
          </div>
        </article>

        <article class="account-card">
          <div class="account-card__header">
            <h2>创建账户</h2>
            <UserRound :size="16" />
          </div>
          <div class="account-create-callout">
            <p class="account-create-callout__title">
              通过独立创建面板维护新的本地身份。
            </p>
            <p class="account-create-callout__desc">
              新账户创建完成后会立刻切换，并同步回 Settings 的账户配置。
            </p>
          </div>
          <button
            type="button"
            class="account-button account-button--primary mt-4"
            @click="showCreateAccountModal = true"
          >
            <Plus :size="16" />
            打开创建面板
          </button>
        </article>
      </div>
    </section>
  </main>

  <Teleport to="body">
    <div
      v-if="showCreateAccountModal"
      class="account-modal-overlay"
      @click="showCreateAccountModal = false"
    >
      <div
        class="account-modal"
        @click.stop
      >
        <div class="account-modal__header">
          <div>
            <p class="account-modal__eyebrow">
              Account Draft
            </p>
            <h2>创建并切换账户</h2>
          </div>
          <button
            type="button"
            class="account-card__icon-button"
            title="关闭创建面板"
            @click="showCreateAccountModal = false"
          >
            <ArrowLeft :size="16" />
          </button>
        </div>

        <div class="account-fields account-modal__body">
          <label class="account-field">
            <span>名称</span>
            <input
              v-model="createForm.name"
              type="text"
              maxlength="50"
              placeholder="例如：编辑团队"
            >
          </label>
          <label class="account-field">
            <span>邮箱</span>
            <input
              v-model="createForm.email"
              type="email"
              maxlength="100"
              placeholder="可选邮箱"
            >
          </label>
          <label class="account-field">
            <span>简介</span>
            <textarea
              v-model="createForm.bio"
              rows="4"
              maxlength="200"
              placeholder="账户描述"
            />
          </label>
        </div>

        <div class="account-modal__footer">
          <button
            type="button"
            class="account-button"
            @click="showCreateAccountModal = false"
          >
            稍后再说
          </button>
          <button
            type="button"
            class="account-button account-button--primary"
            :disabled="createLoading || !createForm.name.trim()"
            @click="handleCreateAccount"
          >
            <Loader2
              v-if="createLoading"
              :size="16"
              class="spin"
            />
            <Plus
              v-else
              :size="16"
            />
            创建并切换
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.account-page {
  min-height: 100vh;
  padding: 28px;
  background:
    radial-gradient(circle at top left, rgba(211, 47, 47, 0.08), transparent 38%),
    linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
}

.account-shell {
  width: min(1280px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.account-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.account-header__back,
.account-header__refresh {
  min-height: 42px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.85);
  color: #475569;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
}

.account-header__title {
  min-width: 0;
  text-align: center;
}

.account-header__eyebrow {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #d32f2f;
  font-weight: 700;
}

.account-header__title h1 {
  margin: 4px 0 0;
  font-size: 28px;
  color: #263238;
}

.account-error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
  font-weight: 600;
}

.account-quick-links {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.account-quick-link {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.9);
  color: #334155;
  text-align: left;
}

.account-quick-link__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 14px;
  background: rgba(211, 47, 47, 0.08);
  color: #d32f2f;
}

.account-quick-link__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.account-quick-link__copy strong {
  color: #263238;
  font-size: 14px;
}

.account-quick-link__copy span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.account-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
}

.account-card {
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px);
  padding: 18px;
}

.account-card--profile {
  grid-row: span 2;
}

.account-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.account-card__header h2 {
  margin: 0;
  font-size: 17px;
  color: #263238;
}

.account-card__icon-button {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.account-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: #fff1f2;
  color: #d32f2f;
  font-size: 12px;
  font-weight: 700;
}

.account-profile {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  align-items: start;
}

.account-avatar {
  width: 74px;
  height: 74px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #eceff1 0%, #cfd8dc 100%);
  color: #37474f;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.account-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.account-fields {
  display: grid;
  gap: 12px;
}

.account-field {
  display: grid;
  gap: 6px;
}

.account-field span {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
}

.account-field input,
.account-field textarea {
  width: 100%;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 10px 12px;
  font-size: 13px;
  color: #334155;
  outline: none;
  transition: border-color 0.2s ease;
}

.account-field input:focus,
.account-field textarea:focus {
  border-color: rgba(211, 47, 47, 0.45);
}

.account-actions {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.account-button--wide {
  min-width: min(220px, 100%);
}

.account-button {
  min-height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
}

.account-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.account-button--primary {
  border-color: #d32f2f;
  background: #d32f2f;
  color: #fff;
}

.account-button--danger {
  border-color: #fecaca;
  color: #b91c1c;
  background: #fff5f5;
}

.account-create-callout {
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.96) 100%);
  padding: 14px;
}

.account-create-callout__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #263238;
}

.account-create-callout__desc {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: #64748b;
}

.account-list {
  display: grid;
  gap: 10px;
}

.account-list__item {
  width: 100%;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 10px 12px;
  text-align: left;
  display: grid;
  gap: 4px;
}

.account-list__item--active {
  border-color: rgba(211, 47, 47, 0.4);
  background: rgba(254, 242, 242, 0.8);
}

.account-list__name {
  font-size: 14px;
  font-weight: 700;
  color: #263238;
}

.account-list__meta {
  font-size: 12px;
  color: #64748b;
}

.account-list__current,
.account-list__switching {
  margin-top: 2px;
  font-size: 12px;
  color: #d32f2f;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.account-empty {
  border-radius: 14px;
  border: 1px dashed #cbd5e1;
  background: #f8fafc;
  padding: 16px;
  text-align: center;
  font-size: 13px;
  color: #64748b;
}

.hidden {
  display: none;
}

.account-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(10px);
}

.account-modal {
  width: min(560px, 100%);
  border-radius: 24px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 32px 80px rgba(15, 23, 42, 0.22);
  padding: 20px;
}

.account-modal__header,
.account-modal__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.account-modal__eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #94a3b8;
}

.account-modal__header h2 {
  margin: 0;
  font-size: 20px;
  color: #263238;
}

.account-modal__body {
  margin-top: 18px;
}

.account-modal__footer {
  margin-top: 18px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 1023px) {
  .account-quick-links {
    grid-template-columns: 1fr;
  }

  .account-grid {
    grid-template-columns: 1fr;
  }

  .account-card--profile {
    grid-row: auto;
  }
}

@media (max-width: 767px) {
  .account-page {
    padding: 18px;
  }

  .account-header {
    flex-wrap: wrap;
    justify-content: center;
  }

  .account-profile {
    grid-template-columns: 1fr;
  }
}
</style>
