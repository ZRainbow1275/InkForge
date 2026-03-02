# 03 - 素材库真实化 Spec

## 目标
将 Mock 的素材库功能替换为基于 IndexedDB 的真实素材管理系统。

## 1. 数据库 Schema 扩展

### 1.1 新增 assets 表
```typescript
// utils/db.ts 扩展
interface AssetRecord {
  id: string
  articleId: string | null  // 关联文章，null 表示全局素材
  name: string
  type: 'image' | 'svg' | 'video' | 'file'
  mimeType: string
  size: number  // 字节
  blob: Blob    // 原始文件数据
  thumbnail?: Blob  // 缩略图（图片类型自动生成）
  width?: number
  height?: number
  tags: string[]
  createdAt: Date
  updatedAt: Date
}
```

### 1.2 Dexie 版本升级
```typescript
db.version(2).stores({
  // 现有表...
  assets: 'id, articleId, type, name, *tags, createdAt'
})
```

## 2. 素材上传功能

### 2.1 上传方式
- 拖拽上传（Drag & Drop）
- 点击选择文件（File Input）
- 剪贴板粘贴（Ctrl+V）
- 从编辑器中拖入图片

### 2.2 上传处理流程
1. 接收文件 → 验证类型和大小
2. 生成 UUID 作为 asset ID
3. 图片类型：Canvas API 生成缩略图（200x200）
4. 读取宽高信息
5. 存储到 IndexedDB
6. 更新素材列表

### 2.3 文件限制
- 单文件最大：10MB
- 支持类型：PNG, JPG, JPEG, GIF, SVG, WebP
- 图片自动压缩（>2MB 时质量压缩到 80%）

## 3. 素材管理器组件

### 3.1 AssetManager.vue
- 网格视图（4列缩略图）
- 列表视图（文件名 + 大小 + 日期）
- 搜索过滤（按名称、标签）
- 批量选择和删除
- 拖拽到编辑器插入

### 3.2 AssetUploader.vue
- 拖拽区域（虚线框 + 图标）
- 上传进度显示
- 多文件批量上传
- 错误提示

### 3.3 集成到 WorkstationView
- Inspector 面板的"素材"Tab
- 显示当前文章关联的素材
- 显示全局素材库
- 支持拖拽插入到编辑器

## 4. 与编辑器集成

### 4.1 图片插入
从素材库拖拽图片到 TipTap 编辑器时：
1. 读取 asset 的 Blob 数据
2. 创建 Object URL
3. 插入 `<img>` 节点到编辑器
4. 记录 assetId 到图片属性

### 4.2 TipTap Image 扩展
安装 `@tiptap/extension-image`，配置：
```typescript
Image.configure({
  inline: true,
  allowBase64: true,
  HTMLAttributes: {
    class: 'article-image',
  },
})
```

## 5. Stores

### 5.1 新增 asset.ts Store
```typescript
export const useAssetStore = defineStore('asset', () => {
  const assets = ref<AssetRecord[]>([])

  async function uploadAsset(file: File, articleId?: string): Promise<AssetRecord>
  async function deleteAsset(id: string): void
  async function loadAssets(articleId?: string): Promise<void>
  async function getAssetUrl(id: string): string  // Object URL
  function searchAssets(query: string): AssetRecord[]
})
```

## 验收标准
- [ ] 可通过拖拽上传图片到素材库
- [ ] 可通过文件选择器上传
- [ ] 可通过剪贴板粘贴图片
- [ ] 素材库显示真实上传的图片缩略图
- [ ] 可从素材库拖拽图片到编辑器
- [ ] 可删除素材
- [ ] 素材数据持久化到 IndexedDB
- [ ] 无任何 Mock 数据
