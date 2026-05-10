<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  HELP_TOPICS,
  MARKDOWN_CHEATSHEET_SECTIONS,
  buildShortcutHelpGroups,
  searchHelpContent,
} from '@/services/ftue/content'
import { useFTUEStore } from '@/stores/ftue'
import { useSettingsStore } from '@/stores/settings'
import type { HelpCenterTab, HelpKey, HelpSearchResult } from '@/services/ftue/types'

const ftueStore = useFTUEStore()
const settingsStore = useSettingsStore()
const closeButton = ref<HTMLButtonElement | null>(null)

const tabs: readonly { id: HelpCenterTab; label: string }[] = [
  { id: 'markdown', label: 'Markdown 速查' },
  { id: 'shortcuts', label: '快捷键' },
  { id: 'topics', label: '主题文档' },
  { id: 'search', label: '搜索' },
]

const shortcutGroups = computed(() => buildShortcutHelpGroups(settingsStore.settings.shortcuts))
const searchResults = computed(() => searchHelpContent(ftueStore.helpSearchQuery, settingsStore.settings.shortcuts))

watch(
  () => ftueStore.helpCenterOpen,
  async (isOpen) => {
    if (!isOpen) {
      return
    }

    await nextTick()
    closeButton.value?.focus()
  },
)

function setTab(tab: HelpCenterTab): void {
  ftueStore.setHelpTab(tab)

  if (tab === 'markdown') {
    void ftueStore.acknowledgeHelp('markdown-cheatsheet')
  }

  if (tab === 'shortcuts') {
    void ftueStore.acknowledgeHelp('keyboard-shortcuts')
  }
}

function openTopic(helpKey: HelpKey): void {
  ftueStore.setHelpTab('topics')
  void ftueStore.acknowledgeHelp(helpKey)
}

function handleSearchInput(event: Event): void {
  const target = event.target
  if (target instanceof HTMLInputElement) {
    ftueStore.setHelpSearchQuery(target.value)
  }
}

function handleResultClick(result: HelpSearchResult): void {
  if (result.source === 'markdown') {
    setTab('markdown')
  } else if (result.source === 'shortcut') {
    setTab('shortcuts')
  } else {
    setTab('topics')
  }
}

function close(): void {
  ftueStore.closeHelpCenter()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="if-help-slide">
      <aside
        v-if="ftueStore.helpCenterOpen"
        class="if-help"
        role="dialog"
        aria-modal="true"
        aria-labelledby="if-help-title"
        @keydown.esc="close"
      >
        <div class="if-help__panel">
          <header class="if-help__header">
            <div>
              <p class="if-help__eyebrow">
                帮助中心
              </p>
              <h2 id="if-help-title">
                内置帮助
              </h2>
              <p>Markdown 速查、快捷键和主题说明均来自当前真实配置。</p>
            </div>
            <button
              ref="closeButton"
              type="button"
              class="if-help__close"
              aria-label="关闭帮助中心"
              @click="close"
            >
              关闭
            </button>
          </header>

          <nav
            class="if-help__tabs"
            role="tablist"
            aria-label="帮助中心分类"
          >
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              role="tab"
              class="if-help__tab"
              :class="{ 'if-help__tab--active': ftueStore.activeHelpTab === tab.id }"
              :aria-selected="ftueStore.activeHelpTab === tab.id"
              @click="setTab(tab.id)"
            >
              {{ tab.label }}
            </button>
          </nav>

          <div class="if-help__body">
            <section
              v-if="ftueStore.activeHelpTab === 'markdown'"
              class="if-help__section"
              aria-label="Markdown 速查"
            >
              <article
                v-for="section in MARKDOWN_CHEATSHEET_SECTIONS"
                :key="section.id"
                class="if-help__card"
              >
                <h3>{{ section.title }}</h3>
                <p>{{ section.summary }}</p>
                <div class="if-help__examples">
                  <div
                    v-for="example in section.examples"
                    :key="example.label"
                    class="if-help__example"
                  >
                    <span>{{ example.label }}</span>
                    <code>{{ example.markdown }}</code>
                    <small>{{ example.description }}</small>
                  </div>
                </div>
              </article>
            </section>

            <section
              v-else-if="ftueStore.activeHelpTab === 'shortcuts'"
              class="if-help__section"
              aria-label="快捷键"
            >
              <article
                v-for="group in shortcutGroups"
                :key="group.id"
                class="if-help__card"
              >
                <h3>{{ group.label }}</h3>
                <p>{{ group.description }}</p>
                <div class="if-help__shortcut-list">
                  <div
                    v-for="shortcut in group.shortcuts"
                    :key="shortcut.id"
                    class="if-help__shortcut"
                  >
                    <div>
                      <strong>{{ shortcut.label }}</strong>
                      <span>{{ shortcut.description }}</span>
                    </div>
                    <kbd>{{ shortcut.binding }}</kbd>
                  </div>
                </div>
              </article>
            </section>

            <section
              v-else-if="ftueStore.activeHelpTab === 'topics'"
              class="if-help__section"
              aria-label="主题文档"
            >
              <article
                v-for="topic in HELP_TOPICS"
                :key="topic.id"
                class="if-help__card if-help__topic"
              >
                <button
                  type="button"
                  class="if-help__topic-button"
                  @click="openTopic(topic.id)"
                >
                  <span>{{ topic.title }}</span>
                  <small>{{ ftueStore.hasSeenHelp(topic.id) ? '已读' : '未读' }}</small>
                </button>
                <p>{{ topic.summary }}</p>
                <ul>
                  <li
                    v-for="line in topic.body"
                    :key="line"
                  >
                    {{ line }}
                  </li>
                </ul>
              </article>
            </section>

            <section
              v-else
              class="if-help__section"
              aria-label="帮助搜索"
            >
              <label class="if-help__search">
                <span>搜索帮助内容</span>
                <input
                  :value="ftueStore.helpSearchQuery"
                  type="search"
                  placeholder="例如：加粗、Ctrl+B、导出"
                  @input="handleSearchInput"
                >
              </label>

              <div
                v-if="searchResults.length > 0"
                class="if-help__results"
              >
                <button
                  v-for="result in searchResults"
                  :key="result.id"
                  type="button"
                  class="if-help__result"
                  @click="handleResultClick(result)"
                >
                  <span>{{ result.title }}</span>
                  <small>{{ result.binding ? result.binding + ' / ' : '' }}{{ result.description }}</small>
                </button>
              </div>
              <p
                v-else
                class="if-help__empty"
              >
                输入关键词后显示真实帮助内容和当前快捷键绑定。
              </p>
            </section>
          </div>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.if-help {
  position: fixed;
  inset: 0;
  z-index: 1190;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(8px);
}

.if-help__panel {
  width: min(720px, 100%);
  height: 100%;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto auto 1fr;
  background: #f8fafc;
  color: #0f172a;
  box-shadow: -18px 0 70px rgba(15, 23, 42, 0.24);
}

.if-help__header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 28px 30px 20px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: linear-gradient(135deg, #ffffff, #eef2f7);
}

.if-help__eyebrow {
  margin: 0 0 6px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.if-help h2,
.if-help h3,
.if-help p {
  margin-top: 0;
}

.if-help h2 {
  margin-bottom: 8px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 32px;
}

.if-help__header p,
.if-help__card p,
.if-help__empty {
  color: #64748b;
  line-height: 1.7;
}

.if-help__close,
.if-help__tab,
.if-help__topic-button,
.if-help__result {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.if-help__close {
  align-self: flex-start;
  padding: 8px 12px;
  border-radius: 999px;
  background: #0f172a;
  color: #ffffff;
}

.if-help__tabs {
  display: flex;
  gap: 8px;
  padding: 14px 30px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  overflow-x: auto;
}

.if-help__tab {
  flex: 0 0 auto;
  padding: 9px 14px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #334155;
  font-weight: 700;
}

.if-help__tab--active {
  background: #0f172a;
  color: #ffffff;
}

.if-help__body {
  overflow: auto;
  padding: 24px 30px 36px;
}

.if-help__section {
  display: grid;
  gap: 16px;
}

.if-help__card {
  padding: 20px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 22px;
  background: #ffffff;
}

.if-help__examples,
.if-help__shortcut-list,
.if-help__results {
  display: grid;
  gap: 10px;
}

.if-help__example,
.if-help__shortcut,
.if-help__result {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 14px;
  background: #f8fafc;
}

.if-help__example code,
.if-help__shortcut kbd {
  width: fit-content;
  padding: 4px 8px;
  border-radius: 8px;
  background: #111827;
  color: #f8fafc;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
}

.if-help__shortcut {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.if-help__shortcut strong,
.if-help__topic-button span,
.if-help__result span {
  color: #0f172a;
}

.if-help__shortcut span,
.if-help__example small,
.if-help__topic-button small,
.if-help__result small {
  color: #64748b;
}

.if-help__topic-button {
  display: flex;
  width: 100%;
  justify-content: space-between;
  gap: 12px;
  padding: 0;
  background: transparent;
  text-align: left;
}

.if-help__topic ul {
  margin: 12px 0 0;
  padding-left: 18px;
  color: #475569;
  line-height: 1.7;
}

.if-help__search {
  display: grid;
  gap: 8px;
  font-weight: 700;
}

.if-help__search input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 14px;
  font: inherit;
}

.if-help__result {
  text-align: left;
}

.if-help__close:focus-visible,
.if-help__tab:focus-visible,
.if-help__topic-button:focus-visible,
.if-help__result:focus-visible,
.if-help__search input:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.35);
  outline-offset: 3px;
}

.if-help-slide-enter-active,
.if-help-slide-leave-active {
  transition: opacity 180ms ease;
}

.if-help-slide-enter-active .if-help__panel,
.if-help-slide-leave-active .if-help__panel {
  transition: transform 220ms ease;
}

.if-help-slide-enter-from,
.if-help-slide-leave-to {
  opacity: 0;
}

.if-help-slide-enter-from .if-help__panel,
.if-help-slide-leave-to .if-help__panel {
  transform: translateX(36px);
}

@media (max-width: 720px) {
  .if-help__header,
  .if-help__tabs,
  .if-help__body {
    padding-left: 18px;
    padding-right: 18px;
  }

  .if-help__header {
    flex-direction: column;
  }
}
</style>