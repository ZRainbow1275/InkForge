<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Contact,
  Copyright,
  Image as ImageIcon,
  Link2,
  Music2,
  Newspaper,
  Plus,
  Trash2,
} from 'lucide-vue-next'

import {
  CREATIVE_COMMONS_LICENSE_OPTIONS,
  DeliveryAdornmentConfigSchema,
  createDeliveryAdornmentFragments,
  getDeliveryComponentTypeLabel,
} from '@/services/export'
import type {
  CreativeCommonsLicenseId,
  DeliveryAdornmentComponentStatus,
  DeliveryAdornmentConfig,
  DeliveryComponentType,
  DeliveryPlatformComponent,
  Platform,
} from '@/services/export'
import { generateId } from '@/utils/uuid'

const props = withDefaults(defineProps<{
  modelValue: DeliveryAdornmentConfig
  platform: Platform
  compact?: boolean
}>(), {
  compact: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: DeliveryAdornmentConfig]
}>()

const draft = ref<DeliveryAdornmentConfig>(cloneConfig(props.modelValue))
const validationIssues = ref<string[]>([])
const invalidFieldPaths = ref<string[]>([])

const componentTypes: readonly {
  type: DeliveryComponentType
  label: string
  icon: typeof Music2
}[] = [
  { type: 'song', label: '歌曲', icon: Music2 },
  { type: 'image', label: '图片', icon: ImageIcon },
  { type: 'link', label: '链接', icon: Link2 },
  { type: 'related-article', label: '关联文章', icon: Newspaper },
  { type: 'contact-card', label: '名片', icon: Contact },
]

const activeComponentCount = computed(() =>
  draft.value.components.filter(component => component.enabled).length,
)

const selectedLicense = computed(() =>
  CREATIVE_COMMONS_LICENSE_OPTIONS.find(option => option.id === draft.value.license)
    ?? CREATIVE_COMMONS_LICENSE_OPTIONS[0],
)

watch(
  () => props.modelValue,
  value => {
    const parsed = DeliveryAdornmentConfigSchema.safeParse(value)
    if (!parsed.success) return
    draft.value = cloneConfig(parsed.data)
    validationIssues.value = []
    invalidFieldPaths.value = []
  },
  { deep: true },
)

function cloneConfig(value: DeliveryAdornmentConfig): DeliveryAdornmentConfig {
  return {
    readingTime: { ...value.readingTime },
    license: value.license,
    components: value.components.map(component => ({ ...component })),
  }
}

function commitDraft(): void {
  const parsed = DeliveryAdornmentConfigSchema.safeParse(draft.value)
  if (!parsed.success) {
    invalidFieldPaths.value = parsed.error.issues.map(issue => issue.path.join('.'))
    validationIssues.value = Array.from(new Set(
      parsed.error.issues.map(issue => issue.message),
    ))
    return
  }

  invalidFieldPaths.value = []
  validationIssues.value = []
  draft.value = cloneConfig(parsed.data)
  emit('update:modelValue', cloneConfig(parsed.data))
}

function hasValidationIssue(path: string): boolean {
  return invalidFieldPaths.value.includes(path)
}

function componentFieldInvalid(index: number, field: string): boolean {
  return hasValidationIssue(`components.${index}.${field}`)
}

function setLicense(event: Event): void {
  const target = event.target
  if (!target || !('value' in target) || typeof target.value !== 'string') return
  const value = target.value as CreativeCommonsLicenseId
  draft.value.license = value
  commitDraft()
}

function addComponent(type: DeliveryComponentType): void {
  if (draft.value.components.length >= 24) return
  draft.value.components.push(createComponent(type))
  commitDraft()
}

function createComponent(type: DeliveryComponentType): DeliveryPlatformComponent {
  const base = {
    id: `delivery-${type}-${generateId()}`,
    enabled: true,
  }

  switch (type) {
    case 'song':
      return { ...base, type, title: '', artist: '', url: '' }
    case 'image':
      return { ...base, type, url: '', alt: '', caption: '' }
    case 'link':
      return { ...base, type, url: '', title: '', description: '' }
    case 'related-article':
      return { ...base, type, url: '', title: '', summary: '' }
    case 'contact-card':
      return { ...base, type, displayName: '', accountId: '', profileUrl: '' }
    default: {
      const exhaustive: never = type
      return exhaustive
    }
  }
}

function removeComponent(index: number): void {
  draft.value.components.splice(index, 1)
  commitDraft()
}

function moveComponent(index: number, direction: -1 | 1): void {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= draft.value.components.length) return

  const [component] = draft.value.components.splice(index, 1)
  draft.value.components.splice(nextIndex, 0, component)
  commitDraft()
}

function componentStatus(component: DeliveryPlatformComponent): {
  status: DeliveryAdornmentComponentStatus
  label: string
  message: string
} {
  const format = props.platform === 'wechat'
    ? 'html'
    : props.platform === 'xiaohongshu'
      ? 'text'
      : 'markdown'
  const result = createDeliveryAdornmentFragments({
    sourceMarkdown: '',
    platform: props.platform,
    format,
    config: {
      readingTime: { enabled: false, wordsPerMinute: 300 },
      license: 'none',
      components: [component],
    },
  })
  const row = result.report?.components[0]
  const status = row?.status ?? 'invalid'
  const labels: Record<DeliveryAdornmentComponentStatus, string> = {
    applied: '直接写入',
    degraded: '安全降级',
    'manual-required': '平台内完成',
    invalid: '待补充',
    disabled: '已停用',
  }

  return {
    status,
    label: labels[status],
    message: row?.message ?? '组件尚未通过校验。',
  }
}
</script>

<template>
  <section
    class="delivery-panel"
    :class="{ compact }"
    aria-labelledby="delivery-panel-title"
  >
    <header class="delivery-panel__header">
      <div class="delivery-panel__heading">
        <span class="delivery-panel__eyebrow">交付快照</span>
        <h3 id="delivery-panel-title">
          文前、组件与许可
        </h3>
        <p>预览、导出与发布交接共用同一份配置；平台不支持的内容不会写入假占位。</p>
      </div>
      <span class="delivery-panel__count">
        {{ activeComponentCount }} 个组件
      </span>
    </header>

    <div
      class="delivery-panel__foundation"
      data-delivery-section="overview"
    >
      <label class="delivery-switch">
        <span class="delivery-switch__icon"><Clock3 :size="16" /></span>
        <span class="delivery-switch__copy">
          <strong>文前阅读时间</strong>
          <small>根据当前正文与阅读速度实时计算</small>
        </span>
        <input
          v-model="draft.readingTime.enabled"
          type="checkbox"
          @change="commitDraft"
        >
      </label>
      <label class="delivery-speed">
        <span>阅读速度</span>
        <span class="delivery-number-field">
          <input
            v-model.number="draft.readingTime.wordsPerMinute"
            type="number"
            min="120"
            max="1000"
            step="10"
            :disabled="!draft.readingTime.enabled"
            :aria-invalid="hasValidationIssue('readingTime.wordsPerMinute') || undefined"
            :aria-describedby="hasValidationIssue('readingTime.wordsPerMinute') ? 'delivery-validation' : undefined"
            @change="commitDraft"
          >
          <small>字/分钟</small>
        </span>
      </label>

      <label
        class="delivery-license"
        data-delivery-section="license"
      >
        <span class="delivery-license__icon"><Copyright :size="16" /></span>
        <span class="delivery-license__copy">
          <strong>文末 CC 协议</strong>
          <small>{{ selectedLicense.description }}</small>
        </span>
        <select
          :value="draft.license"
          @change="setLicense"
        >
          <option
            v-for="license in CREATIVE_COMMONS_LICENSE_OPTIONS"
            :key="license.id"
            :value="license.id"
          >
            {{ license.label }}
          </option>
        </select>
      </label>
    </div>

    <div class="delivery-components">
      <div class="delivery-components__header">
        <div>
          <strong>平台组件</strong>
          <small>按列表顺序写入正文尾部、许可协议之前</small>
        </div>
        <span>{{ draft.components.length }} / 24</span>
      </div>

      <div class="delivery-add-grid">
        <button
          v-for="item in componentTypes"
          :key="item.type"
          type="button"
          :data-delivery-add-type="item.type"
          :disabled="draft.components.length >= 24"
          @click="addComponent(item.type)"
        >
          <Plus :size="13" />
          <component
            :is="item.icon"
            :size="14"
          />
          {{ item.label }}
        </button>
      </div>

      <div
        v-if="draft.components.length === 0"
        class="delivery-empty"
      >
        <Link2 :size="18" />
        <span>尚未添加平台组件。可按交付顺序加入歌曲、图片、链接、关联文章或名片。</span>
      </div>

      <article
        v-for="(component, index) in draft.components"
        :key="component.id"
        class="delivery-component"
        :class="{ disabled: !component.enabled }"
        :data-delivery-component-type="component.type"
      >
        <header class="delivery-component__header">
          <label class="delivery-component__toggle">
            <input
              v-model="component.enabled"
              type="checkbox"
              @change="commitDraft"
            >
            <strong>{{ getDeliveryComponentTypeLabel(component.type) }}</strong>
          </label>
          <span
            class="delivery-support"
            :class="`status-${componentStatus(component).status}`"
            :title="componentStatus(component).message"
          >
            {{ componentStatus(component).label }}
          </span>
          <div class="delivery-component__actions">
            <button
              type="button"
              :disabled="index === 0"
              :aria-label="`上移${getDeliveryComponentTypeLabel(component.type)}`"
              @click="moveComponent(index, -1)"
            >
              <ChevronUp :size="14" />
            </button>
            <button
              type="button"
              :disabled="index === draft.components.length - 1"
              :aria-label="`下移${getDeliveryComponentTypeLabel(component.type)}`"
              @click="moveComponent(index, 1)"
            >
              <ChevronDown :size="14" />
            </button>
            <button
              type="button"
              class="danger"
              :aria-label="`删除${getDeliveryComponentTypeLabel(component.type)}`"
              @click="removeComponent(index)"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </header>

        <div class="delivery-component__fields">
          <template v-if="component.type === 'song'">
            <label>
              <span>歌曲名</span>
              <input
                v-model="component.title"
                maxlength="240"
                @input="commitDraft"
              >
            </label>
            <label>
              <span>作者 / 歌手</span>
              <input
                v-model="component.artist"
                maxlength="240"
                @input="commitDraft"
              >
            </label>
            <label class="field-wide">
              <span>公开歌曲链接（用于抬头预览与安全降级）</span>
              <input
                v-model="component.url"
                type="url"
                maxlength="2048"
                placeholder="https://"
                :aria-invalid="componentFieldInvalid(index, 'url') || undefined"
                :aria-describedby="componentFieldInvalid(index, 'url') ? 'delivery-validation' : undefined"
                @input="commitDraft"
              >
            </label>
            <label class="field-wide">
              <span>歌曲封面（可选）</span>
              <input
                v-model="component.coverUrl"
                type="url"
                maxlength="2048"
                placeholder="https://"
                aria-label="歌曲封面 HTTPS 地址"
                :aria-invalid="componentFieldInvalid(index, 'coverUrl') || undefined"
                :aria-describedby="componentFieldInvalid(index, 'coverUrl') ? 'delivery-validation' : undefined"
                @input="commitDraft"
              >
            </label>
          </template>

          <template v-else-if="component.type === 'image'">
            <label class="field-wide">
              <span>HTTPS 图片地址</span>
              <input
                v-model="component.url"
                type="url"
                maxlength="2048"
                placeholder="https://"
                :aria-invalid="componentFieldInvalid(index, 'url') || undefined"
                :aria-describedby="componentFieldInvalid(index, 'url') ? 'delivery-validation' : undefined"
                @input="commitDraft"
              >
            </label>
            <label>
              <span>替代文本</span>
              <input
                v-model="component.alt"
                maxlength="240"
                @input="commitDraft"
              >
            </label>
            <label>
              <span>图片说明</span>
              <input
                v-model="component.caption"
                maxlength="240"
                @input="commitDraft"
              >
            </label>
          </template>

          <template v-else-if="component.type === 'link'">
            <label class="field-wide">
              <span>链接地址</span>
              <input
                v-model="component.url"
                type="url"
                maxlength="2048"
                placeholder="https://"
                :aria-invalid="componentFieldInvalid(index, 'url') || undefined"
                :aria-describedby="componentFieldInvalid(index, 'url') ? 'delivery-validation' : undefined"
                @input="commitDraft"
              >
            </label>
            <label>
              <span>标题</span>
              <input
                v-model="component.title"
                maxlength="240"
                @input="commitDraft"
              >
            </label>
            <label>
              <span>说明</span>
              <input
                v-model="component.description"
                maxlength="240"
                @input="commitDraft"
              >
            </label>
          </template>

          <template v-else-if="component.type === 'related-article'">
            <label class="field-wide">
              <span>文章地址</span>
              <input
                v-model="component.url"
                type="url"
                maxlength="2048"
                placeholder="https://"
                :aria-invalid="componentFieldInvalid(index, 'url') || undefined"
                :aria-describedby="componentFieldInvalid(index, 'url') ? 'delivery-validation' : undefined"
                @input="commitDraft"
              >
            </label>
            <label>
              <span>文章标题</span>
              <input
                v-model="component.title"
                maxlength="240"
                @input="commitDraft"
              >
            </label>
            <label>
              <span>摘要</span>
              <input
                v-model="component.summary"
                maxlength="240"
                @input="commitDraft"
              >
            </label>
          </template>

          <template v-else>
            <label>
              <span>显示名称</span>
              <input
                v-model="component.displayName"
                maxlength="240"
                @input="commitDraft"
              >
            </label>
            <label>
              <span>平台账号</span>
              <input
                v-model="component.accountId"
                maxlength="240"
                @input="commitDraft"
              >
            </label>
            <label class="field-wide">
              <span>公开资料链接（可选）</span>
              <input
                v-model="component.profileUrl"
                type="url"
                maxlength="2048"
                placeholder="https://"
                :aria-invalid="componentFieldInvalid(index, 'profileUrl') || undefined"
                :aria-describedby="componentFieldInvalid(index, 'profileUrl') ? 'delivery-validation' : undefined"
                @input="commitDraft"
              >
            </label>
            <label class="field-wide">
              <span>名片简介（可选）</span>
              <input
                v-model="component.description"
                maxlength="240"
                aria-label="名片简介"
                @input="commitDraft"
              >
            </label>
            <label class="field-wide">
              <span>名片头像（可选）</span>
              <input
                v-model="component.avatarUrl"
                type="url"
                maxlength="2048"
                placeholder="https://"
                aria-label="名片头像 HTTPS 地址"
                :aria-invalid="componentFieldInvalid(index, 'avatarUrl') || undefined"
                :aria-describedby="componentFieldInvalid(index, 'avatarUrl') ? 'delivery-validation' : undefined"
                @input="commitDraft"
              >
            </label>
            <label class="field-wide">
              <span>名片二维码（可选）</span>
              <input
                v-model="component.qrImageUrl"
                type="url"
                maxlength="2048"
                placeholder="https://"
                aria-label="名片二维码 HTTPS 地址"
                :aria-invalid="componentFieldInvalid(index, 'qrImageUrl') || undefined"
                :aria-describedby="componentFieldInvalid(index, 'qrImageUrl') ? 'delivery-validation' : undefined"
                @input="commitDraft"
              >
            </label>
          </template>
        </div>

        <p class="delivery-component__message">
          <Check
            v-if="['applied', 'degraded'].includes(componentStatus(component).status)"
            :size="13"
          />
          <AlertCircle
            v-else
            :size="13"
          />
          {{ componentStatus(component).message }}
        </p>
      </article>
    </div>

    <p
      v-if="validationIssues.length"
      id="delivery-validation"
      class="delivery-validation"
      role="alert"
    >
      <AlertCircle :size="14" />
      {{ validationIssues.join('；') }}。修正前不会覆盖已保存的交付快照。
    </p>
  </section>
</template>

<style scoped>
.delivery-panel {
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgba(211, 47, 47, 0.16);
  border-radius: 16px;
  background:
    linear-gradient(145deg, rgba(211, 47, 47, 0.045), transparent 34%),
    #FFFFFF;
  color: #263238;
}

.delivery-panel.compact {
  gap: 14px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.delivery-panel__header,
.delivery-components__header,
.delivery-component__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.delivery-panel__heading {
  min-width: 0;
}

.delivery-panel__eyebrow {
  display: block;
  margin-bottom: 4px;
  color: #D32F2F;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.delivery-panel h3 {
  margin: 0;
  font-family: var(--font-heading, inherit);
  font-size: 16px;
  line-height: 1.35;
}

.delivery-panel__heading p {
  margin: 5px 0 0;
  color: #78909C;
  font-size: 11px;
  line-height: 1.55;
}

.delivery-panel__count,
.delivery-components__header > span {
  flex: 0 0 auto;
  padding: 5px 9px;
  border-radius: 999px;
  background: #F3F5F6;
  color: #607D8B;
  font-size: 10px;
  font-weight: 700;
}

.delivery-panel__foundation {
  display: grid;
  gap: 10px;
}

.delivery-switch,
.delivery-license {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid #E8ECEF;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.88);
}

.delivery-switch__icon,
.delivery-license__icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 9px;
  background: rgba(211, 47, 47, 0.08);
  color: #D32F2F;
}

.delivery-switch__copy,
.delivery-license__copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.delivery-switch__copy strong,
.delivery-license__copy strong,
.delivery-components__header strong {
  font-size: 12px;
  line-height: 1.4;
}

.delivery-switch__copy small,
.delivery-license__copy small,
.delivery-components__header small {
  color: #90A4AE;
  font-size: 10px;
  line-height: 1.45;
}

.delivery-switch input[type="checkbox"],
.delivery-component__toggle input[type="checkbox"] {
  accent-color: #D32F2F;
}

.delivery-speed {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px;
  color: #607D8B;
  font-size: 11px;
}

.delivery-number-field {
  display: flex;
  align-items: center;
  gap: 7px;
}

.delivery-number-field input {
  width: 82px;
}

.delivery-license {
  grid-template-columns: 34px minmax(0, 1fr);
}

.delivery-license select {
  grid-column: 1 / -1;
  width: 100%;
}

.delivery-panel input:not([type="checkbox"]),
.delivery-panel select {
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border: 1px solid #DDE3E7;
  border-radius: 8px;
  outline: none;
  background: #FFFFFF;
  color: #37474F;
  font: inherit;
  font-size: 11px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.delivery-panel input:not([type="checkbox"]):focus,
.delivery-panel select:focus {
  border-color: rgba(211, 47, 47, 0.56);
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.09);
}

.delivery-panel input[aria-invalid="true"] {
  border-color: #C62828;
  box-shadow: 0 0 0 2px rgba(198, 40, 40, 0.12);
}

.delivery-panel input:disabled {
  opacity: 0.55;
}

.delivery-components {
  display: grid;
  gap: 10px;
}

.delivery-components__header > div {
  display: grid;
  gap: 2px;
}

.delivery-add-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}

.delivery-panel.compact .delivery-add-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.delivery-add-grid button,
.delivery-component__actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #E1E6E9;
  background: #FFFFFF;
  color: #607D8B;
  cursor: pointer;
  transition: border-color 0.16s ease, color 0.16s ease, background 0.16s ease;
}

.delivery-add-grid button {
  min-width: 0;
  min-height: 34px;
  gap: 4px;
  padding: 6px;
  border-radius: 9px;
  font-size: 10px;
  white-space: nowrap;
}

.delivery-add-grid button:hover:not(:disabled),
.delivery-component__actions button:hover:not(:disabled) {
  border-color: rgba(211, 47, 47, 0.35);
  background: rgba(211, 47, 47, 0.045);
  color: #D32F2F;
}

.delivery-add-grid button:disabled,
.delivery-component__actions button:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.delivery-empty {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px;
  border: 1px dashed #D7DEE2;
  border-radius: 10px;
  color: #90A4AE;
  font-size: 10px;
  line-height: 1.55;
}

.delivery-component {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #E5EAED;
  border-radius: 12px;
  background: #FFFFFF;
  transition: opacity 0.16s ease, border-color 0.16s ease;
}

.delivery-component.disabled {
  opacity: 0.58;
}

.delivery-component__header {
  align-items: center;
}

.delivery-component__toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
}

.delivery-support {
  padding: 4px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
}

.status-applied {
  background: #EAF5EC;
  color: #2E7D32;
}

.status-degraded {
  background: #FFF5E5;
  color: #A15C00;
}

.status-manual-required,
.status-invalid {
  background: #FFF0F0;
  color: #C62828;
}

.status-disabled {
  background: #F0F2F3;
  color: #78909C;
}

.delivery-component__actions {
  display: flex;
  gap: 4px;
}

.delivery-component__actions button {
  width: 27px;
  height: 27px;
  padding: 0;
  border-radius: 7px;
}

.delivery-component__actions button.danger:hover:not(:disabled) {
  border-color: #EF9A9A;
  background: #FFF0F0;
  color: #C62828;
}

.delivery-component__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.delivery-component__fields label {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.delivery-component__fields label > span {
  color: #78909C;
  font-size: 9px;
  font-weight: 650;
}

.delivery-component__fields .field-wide {
  grid-column: 1 / -1;
}

.delivery-component__message,
.delivery-validation {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  font-size: 9px;
  line-height: 1.5;
}

.delivery-component__message {
  color: #78909C;
}

.delivery-component__message svg,
.delivery-validation svg {
  flex: 0 0 auto;
  margin-top: 1px;
}

.delivery-validation {
  padding: 10px 12px;
  border: 1px solid #EF9A9A;
  border-radius: 9px;
  background: #FFF5F5;
  color: #B71C1C;
}

@media (max-width: 1120px) {
  .delivery-add-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .delivery-panel *,
  .delivery-panel *::before,
  .delivery-panel *::after {
    transition-duration: 0.01ms !important;
  }
}
</style>
