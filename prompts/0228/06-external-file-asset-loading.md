# 06 - 外部文件与素材加载

## 问题描述

InkForge 当前仅支持在 IndexedDB 中创建和编辑文章。用户无法：
1. 导入本地 `.md` 文件进行编辑
2. 批量导入文件夹中的 Markdown 文件
3. 从外部 URL 拉取文章内容
4. 管理本地图片素材并自动内联到导出 HTML

需要参考 SiYuan Notes 和 Obsidian 的文件管理体验。

## 设计方案

### 1. 文件导入管线

```
用户操作 → FileImporter → ArticleStore → EditorStore → 编辑器渲染

支持的导入源：
  a. 单个 .md 文件 → 解析 frontmatter + body
  b. 目录（递归） → 批量导入 .md 文件
  c. URL → 下载 + 解析 HTML → 转 Markdown
  d. 剪贴板 → 粘贴 Markdown 或富文本
```

### 2. Markdown 文件导入

```typescript
// services/file-importer.ts

import { parse as parseYaml } from 'yaml'

interface ImportResult {
  title: string
  body: string
  description?: string
  tags?: string[]
  category?: string
  frontmatter?: Record<string, unknown>
}

/**
 * 解析 Markdown 文件内容，提取 frontmatter 和正文
 */
export function parseMarkdownFile(content: string, filename: string): ImportResult {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)

  if (match) {
    const frontmatter = parseYaml(match[1]) as Record<string, unknown>
    const body = match[2].trim()

    return {
      title: (frontmatter.title as string) || filenameToTitle(filename),
      body,
      description: frontmatter.description as string | undefined,
      tags: frontmatter.tags as string[] | undefined,
      category: frontmatter.category as string | undefined,
      frontmatter,
    }
  }

  // 无 frontmatter
  return {
    title: filenameToTitle(filename),
    body: content.trim(),
  }
}

function filenameToTitle(filename: string): string {
  return filename.replace(/\.md$/i, '').replace(/[-_]/g, ' ')
}
```

### 3. Tauri 文件系统集成

```typescript
// services/file-system.ts

import { platform } from '@/utils/platform'

/**
 * 打开文件选择对话框
 * Tauri: 使用 @tauri-apps/plugin-dialog
 * Web: 使用 <input type="file">
 */
export async function selectFiles(options: {
  multiple?: boolean
  directory?: boolean
  filters?: { name: string; extensions: string[] }[]
}): Promise<FileEntry[]> {
  if (platform.isTauri) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const result = await open({
      multiple: options.multiple,
      directory: options.directory,
      filters: options.filters,
    })
    if (!result) return []

    const paths = Array.isArray(result) ? result : [result]
    return Promise.all(paths.map(readTauriFile))
  }

  // Web fallback
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = options.multiple ?? false
    if (options.filters) {
      input.accept = options.filters.flatMap(f => f.extensions.map(e => `.${e}`)).join(',')
    }
    input.onchange = async () => {
      const files = Array.from(input.files || [])
      const entries = await Promise.all(files.map(readWebFile))
      resolve(entries)
    }
    input.click()
  })
}

interface FileEntry {
  name: string
  path: string
  content: string
  size: number
}

async function readTauriFile(path: string): Promise<FileEntry> {
  const { readTextFile } = await import('@tauri-apps/plugin-fs')
  const content = await readTextFile(path)
  const name = path.split(/[/\\]/).pop() || 'unknown.md'
  return { name, path, content, size: content.length }
}

async function readWebFile(file: File): Promise<FileEntry> {
  const content = await file.text()
  return { name: file.name, path: file.name, content, size: file.size }
}
```

### 4. 批量导入工作流

```typescript
// stores/article.ts — 新增方法

async importFiles(files: FileEntry[]): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] }

  for (const file of files) {
    try {
      if (!file.name.endsWith('.md')) {
        results.errors.push(`跳过非 Markdown 文件: ${file.name}`)
        results.failed++
        continue
      }

      const parsed = parseMarkdownFile(file.content, file.name)

      await this.addArticle({
        title: parsed.title,
        rawContent: parsed.body,
        description: parsed.description,
        tags: parsed.tags,
        source: 'import',
        sourceUrl: file.path,
      })

      results.success++
    } catch (error) {
      results.failed++
      results.errors.push(`导入失败 ${file.name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return results
}
```

### 5. 素材文件管理

```typescript
// services/asset-loader.ts

/**
 * 图片素材处理管线
 *
 * 1. 用户上传/拖拽图片
 * 2. 生成缩略图 (canvas resize)
 * 3. 存储到 IndexedDB (Blob)
 * 4. 在 Tauri 环境下可选存储到本地文件系统
 * 5. 导出时将图片内联为 base64（微信/小红书需要）或保持 URL（知乎）
 */

export async function processImageAsset(file: File): Promise<ProcessedAsset> {
  // 验证文件类型和大小
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB
  if (file.size > MAX_SIZE) {
    throw new Error(`图片大小超过限制: ${(file.size / 1024 / 1024).toFixed(1)}MB > 10MB`)
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`不支持的图片格式: ${file.type}`)
  }

  // 生成缩略图
  const thumbnail = await generateThumbnail(file, 200, 200)

  // 读取为 ArrayBuffer 存储
  const buffer = await file.arrayBuffer()

  return {
    name: file.name,
    type: file.type,
    size: file.size,
    data: buffer,
    thumbnailData: thumbnail,
    createdAt: new Date().toISOString(),
  }
}

async function generateThumbnail(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const canvas = document.createElement('canvas')
      let { width, height } = img

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Thumbnail generation failed')); return }
        blob.arrayBuffer().then(resolve).catch(reject)
      }, 'image/jpeg', 0.7)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }

    img.src = url
  })
}
```

### 6. FileManager UI 增强

在 FileManager 顶部添加导入按钮：

```html
<!-- 文件操作栏 -->
<div class="file-actions">
  <button class="action-btn" @click="createNewArticle" title="新建">
    <!-- plus icon -->
    <span>新建</span>
  </button>
  <button class="action-btn" @click="importFile" title="导入 Markdown">
    <!-- upload icon -->
    <span>导入</span>
  </button>
  <button class="action-btn" @click="importFolder" title="批量导入">
    <!-- folder icon -->
    <span>批量</span>
  </button>
</div>

<!-- 导入结果通知 -->
<Transition name="fade">
  <div v-if="importResult" class="import-result" :class="importResult.failed > 0 ? 'warning' : 'success'">
    <span>导入完成: {{ importResult.success }} 成功 / {{ importResult.failed }} 失败</span>
    <button @click="importResult = null">关闭</button>
  </div>
</Transition>
```

## 修改文件清单

### 需要创建
| 文件 | 说明 |
|------|------|
| `src/services/file-importer.ts` | Markdown 文件解析（frontmatter + body） |
| `src/services/file-system.ts` | 文件选择抽象（Tauri / Web） |
| `src/services/asset-loader.ts` | 图片素材处理管线 |

### 需要修改
| 文件 | 修改内容 |
|------|----------|
| `src/stores/article.ts` | 添加 `importFiles()` 方法 |
| `src/stores/asset.ts` | 增强素材 CRUD（Blob 存储、缩略图） |
| `src/components/file/FileManager.vue` | 添加导入按钮和结果通知 |
| `src/schemas/article.ts` | 扩展 schema 支持 source/sourceUrl 字段 |

### 依赖添加
| 包 | 用途 |
|----|------|
| `yaml` | YAML frontmatter 解析 |
| `@tauri-apps/plugin-dialog` | Tauri 文件选择对话框 |
| `@tauri-apps/plugin-fs` | Tauri 文件系统读写 |

## 验证标准

1. 点击「导入」按钮可选择并导入 .md 文件
2. Frontmatter (title, tags, category) 正确解析
3. 批量导入文件夹中的所有 .md 文件
4. 图片上传生成缩略图并存储到 IndexedDB
5. Tauri 环境下使用原生文件对话框
6. Web 环境下使用浏览器文件选择器
7. 导入结果通知显示成功/失败计数

## 优先级

**P2** — 高级功能
