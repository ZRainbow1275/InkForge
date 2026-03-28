<script setup lang="ts">
import { Command, Plus, ScrollText, Search, Settings2 } from 'lucide-vue-next'

interface HubHeaderProps {
  currentDate: string
  articleCount: number
  avatarUrl?: string | null
  avatarInitial?: string
}

const props = defineProps<HubHeaderProps>()

const emit = defineEmits<{
  (e: 'new-article'): void
  (e: 'open-settings'): void
  (e: 'open-account'): void
}>()
</script>

<template>
  <header class="hub-header">
    <div class="hub-header__brand">
      <div class="hub-header__logo">
        IF
      </div>
      <div class="hub-header__brand-copy">
        <div class="hub-header__title-row">
          <h1 class="hub-header__title">
            InkForge
          </h1>
          <span class="hub-header__version">v7.0</span>
        </div>
        <p class="hub-header__date">
          {{ props.currentDate }}
        </p>
      </div>
    </div>

    <div class="hub-header__meta">
      <div class="hub-header__badge">
        <ScrollText :size="14" />
        <span>{{ props.articleCount }} 篇文章</span>
      </div>
      <div class="hub-header__hint">
        <Command :size="13" />
        <span>Ctrl/Cmd+N 新建</span>
        <Search :size="13" />
        <span>Ctrl/Cmd+F 搜索</span>
      </div>
      <button
        type="button"
        class="hub-header__button hub-header__button--ghost"
        title="设置"
        @click="emit('open-settings')"
      >
        <Settings2 :size="16" />
      </button>
      <button
        type="button"
        class="hub-header__avatar"
        title="账户管理"
        @click="emit('open-account')"
      >
        <img
          v-if="props.avatarUrl"
          :src="props.avatarUrl"
          alt="账户头像"
          class="hub-header__avatar-image"
        >
        <span
          v-else
          class="hub-header__avatar-fallback"
        >
          {{ props.avatarInitial || 'I' }}
        </span>
      </button>
      <button
        type="button"
        class="hub-header__button hub-header__button--primary"
        title="新建文章"
        @click="emit('new-article')"
      >
        <Plus :size="16" />
        <span>新建</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.hub-header {
  width: min(1400px, 100%);
  margin: 0 auto 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.hub-header__brand {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.hub-header__logo {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 800;
  box-shadow: 0 12px 28px rgba(211, 47, 47, 0.16);
  flex-shrink: 0;
}

.hub-header__brand-copy {
  min-width: 0;
}

.hub-header__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hub-header__title {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
  font-weight: 700;
  color: #263238;
}

.hub-header__version {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(211, 47, 47, 0.08);
  color: #d32f2f;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hub-header__date {
  margin: 6px 0 0;
  font-size: 14px;
  color: #607d8b;
}

.hub-header__meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.hub-header__badge,
.hub-header__hint {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid #eceff1;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: #607d8b;
  font-size: 12px;
  font-weight: 600;
}

.hub-header__hint {
  gap: 6px;
}

.hub-header__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  font-size: 13px;
  font-weight: 700;
}

.hub-header__avatar {
  position: relative;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 2px solid rgba(255, 255, 255, 0.96);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.hub-header__avatar:hover {
  border-color: rgba(211, 47, 47, 0.24);
  box-shadow: 0 8px 18px rgba(38, 50, 56, 0.12);
}

.hub-header__avatar-image,
.hub-header__avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hub-header__avatar-image {
  object-fit: cover;
}

.hub-header__avatar-fallback {
  font-size: 14px;
  font-weight: 700;
  color: #37474f;
  background: linear-gradient(135deg, #eceff1 0%, #cfd8dc 100%);
}


.hub-header__button--ghost {
  background: rgba(255, 255, 255, 0.88);
  border-color: #eceff1;
  color: #607d8b;
}

.hub-header__button--ghost:hover {
  border-color: rgba(211, 47, 47, 0.22);
  color: #d32f2f;
}

.hub-header__button--primary {
  background: #d32f2f;
  color: #fff;
  box-shadow: 0 10px 20px rgba(211, 47, 47, 0.22);
}

.hub-header__button--primary:hover {
  transform: translateY(-1px);
  background: #b71c1c;
}

@media (max-width: 1023px) {
  .hub-header {
    flex-direction: column;
    align-items: stretch;
  }

  .hub-header__meta {
    justify-content: flex-start;
  }
}

@media (max-width: 767px) {
  .hub-header {
    margin-bottom: 20px;
  }

  .hub-header__title {
    font-size: 26px;
  }

  .hub-header__hint {
    display: none;
  }
}
</style>
