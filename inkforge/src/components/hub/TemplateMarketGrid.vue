<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { LayoutTemplate, Newspaper, Plus, Star } from 'lucide-vue-next'
import { ARTICLE_TEMPLATES, TEMPLATE_CATEGORY_NAMES, type ArticleTemplate } from '@/data/templates'

const emit = defineEmits<{
  (e: 'select', template: ArticleTemplate): void
  (e: 'create-new'): void
}>()

type CategoryKey = ArticleTemplate['category'] | 'all'

const activeCategory = ref<CategoryKey>('all')

const categoryPills = computed<{ key: CategoryKey; label: string; count: number }[]>(() => {
  const groups = (Object.entries(TEMPLATE_CATEGORY_NAMES) as Array<[ArticleTemplate['category'], string]>).map(([key, label]) => ({
    key: key as CategoryKey,
    label,
    count: ARTICLE_TEMPLATES.filter(t => t.category === key).length,
  }))
  return [{ key: 'all' as CategoryKey, label: '全部', count: ARTICLE_TEMPLATES.length }, ...groups]
})

const filteredTemplates = computed<readonly ArticleTemplate[]>(() => {
  if (activeCategory.value === 'all') return ARTICLE_TEMPLATES
  return ARTICLE_TEMPLATES.filter(t => t.category === activeCategory.value)
})

function getTemplateIcon(icon: string): Component {
  switch (icon) {
    case 'review':
      return Star
    case 'news':
      return Newspaper
    default:
      return LayoutTemplate
  }
}

function categoryLabel(template: ArticleTemplate): string {
  return TEMPLATE_CATEGORY_NAMES[template.category]
}

function truncate(text: string, max = 24): string {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
</script>

<template>
  <section
    class="template-market-section"
    aria-labelledby="template-market-title"
  >
    <header class="template-market-head">
      <div class="template-market-text">
        <p class="template-market-kicker">
          模板
        </p>
        <h2 id="template-market-title">
          精选模板
        </h2>
      </div>
      <span class="template-market-count">{{ filteredTemplates.length }} / {{ ARTICLE_TEMPLATES.length }}</span>
    </header>

    <div
      class="template-market-pills"
      role="tablist"
      aria-label="模板分类"
    >
      <button
        v-for="pill in categoryPills"
        :key="pill.key"
        type="button"
        role="tab"
        class="template-market-pill"
        :class="{ 'template-market-pill--active': activeCategory === pill.key }"
        :aria-selected="activeCategory === pill.key"
        @click="activeCategory = pill.key"
      >
        <span>{{ pill.label }}</span>
        <strong>{{ pill.count }}</strong>
      </button>
    </div>

    <div class="template-market-grid">
      <button
        type="button"
        class="template-market-card template-market-card--cta"
        @click="emit('create-new')"
      >
        <span
          class="template-market-cover template-market-cover--cta"
          aria-hidden="true"
        >
          <Plus
            :size="28"
            :stroke-width="2.4"
          />
        </span>
        <span class="template-market-body">
          <strong>新建模板</strong>
          <span>从空白起稿，保存为常用模板</span>
        </span>
      </button>

      <button
        v-for="template in filteredTemplates"
        :key="template.id"
        type="button"
        class="template-market-card"
        @click="emit('select', template)"
      >
        <span
          class="template-market-cover"
          aria-hidden="true"
        >
          <component
            :is="getTemplateIcon(template.icon)"
            :size="22"
            :stroke-width="2.1"
          />
        </span>
        <span class="template-market-body">
          <span class="template-market-tag">{{ categoryLabel(template) }}</span>
          <strong>{{ template.name }}</strong>
          <span class="template-market-desc">{{ truncate(template.description) }}</span>
        </span>
        <span class="template-market-cta">使用模板</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.template-market-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 22px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid #ECEFF1;
  border-radius: 16px;
  height: 100%;
  min-height: 0;
}

.template-market-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.template-market-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.template-market-kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  color: #D32F2F;
  text-transform: uppercase;
}

.template-market-text h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #263238;
}

.template-market-count {
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(211, 47, 47, 0.08);
  color: #D32F2F;
  font-size: 12px;
  font-weight: 700;
}

.template-market-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-market-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid #ECEFF1;
  border-radius: 999px;
  background: #FFFFFF;
  color: #455A64;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.template-market-pill strong {
  color: #90A4AE;
  font-size: 11px;
  font-weight: 700;
}

.template-market-pill:hover {
  border-color: #FAD4D8;
  color: #263238;
}

.template-market-pill--active {
  background: #D32F2F;
  border-color: #D32F2F;
  color: #FFFFFF;
}

.template-market-pill--active strong {
  color: rgba(255, 255, 255, 0.85);
}

.template-market-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  flex: 1;
  min-height: 0;
  align-content: stretch;
  grid-auto-rows: minmax(0, 1fr);
}

.template-market-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #ECEFF1;
  border-radius: 14px;
  background: #FFFFFF;
  text-align: left;
  cursor: pointer;
  min-height: 0;
  overflow: hidden;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.template-market-card:hover {
  transform: translateY(-2px);
  border-color: #FAD4D8;
  box-shadow: 0 14px 32px rgba(38, 50, 56, 0.08);
}

.template-market-card:focus-visible {
  outline: 2px solid #D32F2F;
  outline-offset: 2px;
}

.template-market-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 60px;
  border-radius: 10px;
  background: linear-gradient(135deg, #FFEBEE 0%, #FFF5F5 100%);
  color: #D32F2F;
}

.template-market-cover--cta {
  background: linear-gradient(135deg, #FAFBFC 0%, #ECEFF1 100%);
  color: #455A64;
  border: 1px dashed #B0BEC5;
}

.template-market-card--cta {
  background: #FAFBFC;
  border-style: dashed;
  border-color: #CFD8DC;
}

.template-market-card--cta:hover {
  border-color: #D32F2F;
  background: #FFFFFF;
}

.template-market-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.template-market-tag {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: #90A4AE;
  text-transform: uppercase;
}

.template-market-body strong {
  font-size: 14px;
  font-weight: 700;
  color: #263238;
  line-height: 1.3;
}

.template-market-desc {
  font-size: 12px;
  line-height: 1.5;
  color: #607D8B;
}

.template-market-cta {
  align-self: flex-start;
  margin-top: 4px;
  padding: 5px 11px;
  border-radius: 999px;
  background: rgba(211, 47, 47, 0.08);
  color: #D32F2F;
  font-size: 11px;
  font-weight: 700;
}

@media (max-width: 1100px) {
  .template-market-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .template-market-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .template-market-card,
  .template-market-pill {
    transition: none;
  }
}

html.theme-dark .template-market-section,
html[data-theme="dark"] .template-market-section {
  background: #131A23;
  border-color: rgba(255, 255, 255, 0.06);
}

html.theme-dark .template-market-text h2,
html[data-theme="dark"] .template-market-text h2 {
  color: #ECEFF4;
}

html.theme-dark .template-market-kicker,
html[data-theme="dark"] .template-market-kicker {
  color: #EF9A9A;
}

html.theme-dark .template-market-count,
html[data-theme="dark"] .template-market-count {
  background: rgba(239, 83, 80, 0.16);
  color: #EF9A9A;
}

html.theme-dark .template-market-pill,
html[data-theme="dark"] .template-market-pill {
  background: #1A222D;
  border-color: rgba(255, 255, 255, 0.08);
  color: #B5BFCC;
}

html.theme-dark .template-market-pill strong,
html[data-theme="dark"] .template-market-pill strong {
  color: #8590A0;
}

html.theme-dark .template-market-pill:hover,
html[data-theme="dark"] .template-market-pill:hover {
  border-color: rgba(239, 83, 80, 0.40);
  color: #ECEFF4;
}

html.theme-dark .template-market-pill--active,
html[data-theme="dark"] .template-market-pill--active {
  background: #EF5350;
  border-color: #EF5350;
  color: #FFFFFF;
}

html.theme-dark .template-market-pill--active strong,
html[data-theme="dark"] .template-market-pill--active strong {
  color: rgba(255, 255, 255, 0.85);
}

html.theme-dark .template-market-card,
html[data-theme="dark"] .template-market-card {
  background: #1A222D;
  border-color: rgba(255, 255, 255, 0.08);
}

html.theme-dark .template-market-card:hover,
html[data-theme="dark"] .template-market-card:hover {
  border-color: rgba(239, 83, 80, 0.40);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
}

html.theme-dark .template-market-card--cta,
html[data-theme="dark"] .template-market-card--cta {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.18);
}

html.theme-dark .template-market-card--cta:hover,
html[data-theme="dark"] .template-market-card--cta:hover {
  background: rgba(239, 83, 80, 0.06);
  border-color: #EF5350;
}

html.theme-dark .template-market-cover,
html[data-theme="dark"] .template-market-cover {
  background: linear-gradient(135deg, rgba(239, 83, 80, 0.20) 0%, rgba(239, 83, 80, 0.06) 100%);
  color: #EF9A9A;
}

html.theme-dark .template-market-cover--cta,
html[data-theme="dark"] .template-market-cover--cta {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
  border-color: rgba(255, 255, 255, 0.20);
  color: #B5BFCC;
}

html.theme-dark .template-market-tag,
html[data-theme="dark"] .template-market-tag {
  color: #8590A0;
}

html.theme-dark .template-market-body strong,
html[data-theme="dark"] .template-market-body strong {
  color: #ECEFF4;
}

html.theme-dark .template-market-desc,
html[data-theme="dark"] .template-market-desc {
  color: #B5BFCC;
}

html.theme-dark .template-market-cta,
html[data-theme="dark"] .template-market-cta {
  background: rgba(239, 83, 80, 0.16);
  color: #EF9A9A;
}
</style>
