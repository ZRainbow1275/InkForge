# 05 - Inspector 真实实现

## 问题描述

当前 WorkstationView 右栏 Inspector 面板包含 4 个 Section，但部分功能仅为 UI 壳子，缺乏真实业务逻辑：

| Section | 当前状态 | 问题 |
|---------|---------|------|
| 排版风格 | 部分真实 | 仅 5 个主色圆点 + "查看全部预设" 链接，缺少排版预设切换、间距/段落控制 |
| 字体 | 真实 | 仅 4 选项的 select，缺少字号/行高控制、字体预览 |
| 素材库 | 壳子 | AssetManager 组件存在但 CRUD 不完整，缺少拖拽插入编辑器 |
| 引用链接 | 基础 | 从 HTML 用正则提取 `<a>` 标签，但编辑器内容是 Markdown，应从 Markdown 语法提取 |

## 设计方案

### Section 1: 排版风格 — 增强为排版控制面板

```typescript
// 排版控制数据
interface TypographyControls {
  // 段落
  paragraphIndent: boolean      // 首行缩进
  paragraphSpacing: number      // 段间距 (px)

  // 间距
  letterSpacing: number         // 字间距 (em)

  // 装饰
  headingStyle: 'underline' | 'background' | 'border-left' | 'none'
  blockquoteStyle: 'classic' | 'modern' | 'minimal'

  // 预设（来自 themes.ts）
  presetId: string
}
```

UI 设计（参考 prototype 的 Inspector）：

```html
<div class="inspector-section">
  <div class="inspector-label">排版风格</div>

  <!-- 主色选择器（保留现有） -->
  <div class="accent-picker">...</div>

  <!-- 预设快速切换 -->
  <div class="preset-strip">
    <div
      v-for="preset in topPresets"
      :key="preset.id"
      class="preset-chip"
      :class="{ active: currentPresetId === preset.id }"
      @click="applyPreset(preset.id)"
    >
      <div class="preset-preview" :style="getPresetPreviewStyle(preset)"></div>
      <span>{{ preset.name }}</span>
    </div>
  </div>

  <!-- 段落控制 -->
  <div class="control-group">
    <label>首行缩进</label>
    <button
      class="toggle-btn"
      :class="{ active: typography.paragraphIndent }"
      @click="typography.paragraphIndent = !typography.paragraphIndent"
    >
      {{ typography.paragraphIndent ? '2em' : '无' }}
    </button>
  </div>

  <div class="control-group">
    <label>段间距</label>
    <input
      type="range"
      min="0" max="32" step="4"
      v-model.number="typography.paragraphSpacing"
    />
    <span class="range-value">{{ typography.paragraphSpacing }}px</span>
  </div>

  <!-- 标题装饰 -->
  <div class="control-group">
    <label>标题风格</label>
    <div class="style-options">
      <button
        v-for="style in headingStyles"
        :key="style.value"
        class="style-option"
        :class="{ active: typography.headingStyle === style.value }"
        @click="typography.headingStyle = style.value"
      >
        {{ style.label }}
      </button>
    </div>
  </div>

  <router-link to="/themes" class="inspector-link">查看全部预设</router-link>
</div>
```

### Section 2: 字体 — 增强为完整排版控制

```html
<div class="inspector-section">
  <div class="inspector-label">字体</div>

  <!-- 字体族选择（保留现有） -->
  <select class="inspector-select" v-model="fontFamily">
    <option value="serif">宋体 (Serif)</option>
    <option value="sans">黑体 (Sans)</option>
    <option value="kai">楷体 (Kai)</option>
    <option value="mono">等宽 (Mono)</option>
  </select>

  <!-- 字号控制 -->
  <div class="control-group">
    <label>正文字号</label>
    <div class="stepper">
      <button @click="fontSize = Math.max(12, fontSize - 1)">-</button>
      <span>{{ fontSize }}px</span>
      <button @click="fontSize = Math.min(24, fontSize + 1)">+</button>
    </div>
  </div>

  <!-- 行高控制 -->
  <div class="control-group">
    <label>行高</label>
    <input
      type="range"
      min="1.2" max="2.4" step="0.1"
      v-model.number="lineHeight"
    />
    <span class="range-value">{{ lineHeight.toFixed(1) }}</span>
  </div>

  <!-- 字体预览 -->
  <div class="font-preview" :style="{ fontFamily: fontStack, fontSize: fontSize + 'px', lineHeight: lineHeight }">
    永远相信美好的事情即将发生。
    <br>The quick brown fox jumps over the lazy dog.
  </div>
</div>
```

### Section 3: 素材库 — 真实 CRUD + 拖拽插入

```typescript
// 素材库增强
interface AssetActions {
  // 上传（支持拖拽、点击、粘贴）
  upload(file: File): Promise<Asset>

  // 插入到编辑器
  insertToEditor(asset: Asset): void

  // 删除
  deleteAsset(assetId: string): Promise<void>

  // 复制 Markdown 引用
  copyMarkdownRef(asset: Asset): void
}

// 插入到 TipTap 编辑器
function insertAssetToEditor(asset: Asset, editor: Editor) {
  if (asset.type === 'image') {
    editor.chain().focus().setImage({ src: asset.url, alt: asset.name }).run()
  } else {
    editor.chain().focus().insertContent(`[${asset.name}](${asset.url})`).run()
  }
}
```

```html
<div class="inspector-section">
  <div class="inspector-label">
    素材库
    <span class="inspector-count">{{ assets.length }}</span>
  </div>

  <!-- 拖拽上传区域 -->
  <div
    class="asset-dropzone"
    :class="{ dragging: isDragging }"
    @dragover.prevent="isDragging = true"
    @dragleave="isDragging = false"
    @drop.prevent="handleDrop"
    @click="triggerUpload"
  >
    <input ref="fileInput" type="file" hidden multiple accept="image/*" @change="handleFileSelect" />
    <span v-if="isDragging">释放以上传</span>
    <span v-else>拖拽或点击上传</span>
  </div>

  <!-- 素材网格 -->
  <div class="asset-grid">
    <div
      v-for="asset in articleAssets"
      :key="asset.id"
      class="asset-thumb"
      draggable="true"
      @dragstart="handleAssetDragStart(asset)"
      @click="insertAssetToEditor(asset)"
    >
      <img v-if="asset.type === 'image'" :src="asset.thumbnailUrl || asset.url" :alt="asset.name" />
      <div class="asset-overlay">
        <button class="asset-action" @click.stop="copyMarkdownRef(asset)" title="复制引用">
          <!-- copy icon -->
        </button>
        <button class="asset-action delete" @click.stop="deleteAsset(asset.id)" title="删除">
          <!-- delete icon -->
        </button>
      </div>
    </div>
  </div>
</div>
```

### Section 4: 引用链接 — 从 Markdown 源解析

```typescript
// 从 Markdown 源文本提取链接（而非从渲染后的 HTML）
const extractedLinks = computed<ExtractedLink[]>(() => {
  const body = currentContent.value?.body
  if (!body) return []

  const links: ExtractedLink[] = []
  const seen = new Set<string>()

  // Pattern 1: [text](url) — 标准 Markdown 链接
  const mdLinkRegex = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = mdLinkRegex.exec(body)) !== null) {
    const href = match[2]
    if (!seen.has(href)) {
      seen.add(href)
      links.push({ text: match[1] || href, href })
    }
  }

  // Pattern 2: <url> — 自动链接
  const autoLinkRegex = /<(https?:\/\/[^>]+)>/g
  while ((match = autoLinkRegex.exec(body)) !== null) {
    const href = match[1]
    if (!seen.has(href)) {
      seen.add(href)
      links.push({ text: href, href })
    }
  }

  // Pattern 3: [text][ref] + [ref]: url — 引用式链接
  const refDefRegex = /^\[([^\]]+)\]:\s*(https?:\/\/\S+)/gm
  while ((match = refDefRegex.exec(body)) !== null) {
    const href = match[2]
    if (!seen.has(href)) {
      seen.add(href)
      links.push({ text: match[1], href })
    }
  }

  return links
})
```

## 修改文件清单

### 需要创建
| 文件 | 说明 |
|------|------|
| `src/composables/useTypography.ts` | 排版控制 composable |
| `src/composables/useAssetManager.ts` | 素材库操作 composable |

### 需要修改
| 文件 | 修改内容 |
|------|----------|
| `src/views/WorkstationView.vue` | Inspector 4 个 Section 全面增强 |
| `src/components/asset/AssetManager.vue` | 拖拽上传、网格展示、CRUD 操作 |
| `src/stores/asset.ts` | 增强素材 CRUD（删除、关联文章） |
| `src/stores/settings.ts` | 添加排版控制字段到 settings schema |

### 依赖添加
- 无新依赖

## 验证标准

1. 排版风格 Section：预设切换实时生效；首行缩进/段间距/标题风格控制实时反映到预览
2. 字体 Section：字号步进器 12-24px 可调；行高滑块 1.2-2.4 可调；字体预览实时更新
3. 素材库 Section：拖拽上传图片成功；点击素材插入到 TipTap 编辑器；删除素材正常；复制 Markdown 引用正常
4. 引用链接 Section：从 Markdown 源文本正确提取所有链接格式；链接可点击在新窗口打开
5. 所有控制变更自动触发预览重新渲染
6. Settings 持久化：刷新页面后排版设置保持

## 优先级

**P0** — 核心编辑功能
