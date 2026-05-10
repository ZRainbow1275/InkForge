> 版本: v2.1.0-draft
> 阶段: Phase 1（编辑器层）
> 依赖: 01-spec-editor-typora / 10-markdown-authority-spec / 28-asset-pipeline-spec / 05-toolbar-complete-spec
> 被依赖: 15-export-publish-spec（图片嵌入策略）/ 28-asset-pipeline-spec（图片注册）
> 来源决策: E-09 D（选中/调大小/对齐/替换/alt/删除/说明文字/画廊）/ T05-03 D / T05-11 D
> 权威来源: 混合（0408 增强问卷 E-09 + T05-03 + T05-11）
> 创建日期: 2026-04-21
> 铁律遵循: R-01, R-02, R-05, R-14, R-15

# 53 — Image Extension v2 Spec

## 目录

- §1 背景与目标
- §2 范围与边界
- §3 节点 Schema 定义
- §4 选中状态与操作工具栏
- §5 对齐方式
- §6 尺寸调整（Resize Handle）
- §7 图片标题（Caption / figcaption）
- §8 图片链接
- §9 懒加载与占位符
- §10 加载失败处理
- §11 本地图片显示（asset:// 协议）
- §12 粘贴图片
- §13 拖放图片到编辑器
- §14 AssetPipeline 集成
- §15 GFM 序列化
- §16 TypeScript 类型定义
- §17 Vue NodeView 组件架构
- §18 模块架构
- §19 导出行为
- §20 性能 SLO
- §21 无障碍
- §22 测试矩阵
- §23 验收标准

---

## §1 背景与目标

### 1.1 问题背景

InkForge v2.0 的图片节点基于 TipTap 默认 `@tiptap/extension-image`，功能极简：
- 仅支持 `src` / `alt` / `title` 属性
- 无 resize 能力
- 无对齐操作
- 无 caption 支持

问卷 E-09 D 要求完整图片交互（选中/调大小/对齐/替换/alt/删除/说明文字/画廊），
T05-03 D 要求图片走 Tauri 文件系统（asset:// 协议），
T05-11 D 要求所有入口（拖放/粘贴/按钮）统一走资源清洗管线。

### 1.2 目标

1. 重写图片节点为完整的 `Figure + Figcaption` 结构（支持 caption）。
2. 提供选中后浮现的操作工具栏（8 个操作）。
3. 提供 4 角 Resize Handle 支持拖拽调整图片大小。
4. 支持 5 种对齐方式（左/居中/右/浮动左/浮动右）。
5. 懒加载（IntersectionObserver）+ 骨架屏占位符。
6. 加载失败时显示灰色占位 + 刷新按钮。
7. 粘贴/拖放图片触发 AssetPipeline 统一处理。

---

## §2 范围与边界

### 2.1 本 Spec 覆盖

| 能力 | 说明 |
|---|---|
| 图片节点 Schema | `figure` + `figcaption` 节点对 |
| 操作工具栏 | 选中图片时显示 8 个操作按钮 |
| Resize Handle | 四角拖拽，可选锁定宽高比 |
| 对齐方式 | 5 种（含浮动） |
| Caption | `<figcaption>` 编辑 |
| 图片链接 | `data-link` 属性 |
| 懒加载 | IntersectionObserver |
| 骨架屏 | 加载中占位符 |
| 失败处理 | 灰色占位 + 刷新 |
| asset:// URL | Tauri 资产协议 |
| 粘贴 | clipboard API → AssetPipeline |
| 拖放 | dragover/drop → AssetPipeline |
| GFM 序列化 | `![alt](src)` / `![alt](src =WxH)` |

### 2.2 非目标

- 图片编辑（裁剪/滤镜）：v2.2+ 候选
- 图片 OCR：v2.2+
- 视频/音频节点：独立 Spec
- 图片画廊独立页面（画廊 Modal 在本 Spec 覆盖，但独立画廊浏览器不做）

---

## §3 节点 Schema 定义

### 3.1 节点结构

InkForge v2 的图片使用 `figure` 节点（而非直接使用 `image` 节点），
以支持 `figcaption`：

```
figure (block node)
├── image (inline node, attrs: src/alt/title/width/height/align/data-link)
└── figcaption? (block node, optional, content: inline*)
```

### 3.2 Figure 节点定义

```typescript
// src/extensions/ImageV2/figureNode.ts
const Figure = Node.create({
  name: 'figure',
  group: 'block',
  content: 'image figcaption?',
  draggable: true,

  parseHTML: () => [{ tag: 'figure' }],
  renderHTML: ({ HTMLAttributes }) => ['figure', HTMLAttributes, 0],

  addAttributes() {
    return {
      align: {
        default: 'center',
        parseHTML: (el) => el.dataset.align ?? 'center',
        renderHTML: (attrs) => ({ 'data-align': attrs.align }),
      },
    };
  },
});
```

### 3.3 Image 节点定义

```typescript
const ImageNode = Node.create({
  name: 'image',
  inline: true,
  group: 'inline',
  draggable: true,
  selectable: true,
  atom: true, // 图片作为原子节点，不可在内部放置光标

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      title: { default: null },
      width: { default: null },   // number | null
      height: { default: null },  // number | null
      naturalWidth: { default: null },   // 原始宽度（加载后填入）
      naturalHeight: { default: null },  // 原始高度
      'data-link': { default: null },    // 点击跳转链接
      'data-asset-id': { default: null }, // AssetPipeline 关联 ID
    };
  },

  parseHTML: () => [
    { tag: 'img[src]' },
  ],

  renderHTML: ({ HTMLAttributes, node }) => {
    const attrs = { ...HTMLAttributes };
    if (node.attrs.width)  attrs.width  = node.attrs.width;
    if (node.attrs.height) attrs.height = node.attrs.height;
    return ['img', attrs];
  },
});
```

### 3.4 Figcaption 节点

```typescript
const Figcaption = Node.create({
  name: 'figcaption',
  content: 'inline*',
  parseHTML: () => [{ tag: 'figcaption' }],
  renderHTML: () => ['figcaption', { class: 'image-caption' }, 0],
});
```

---

## §4 选中状态与操作工具栏

### 4.1 选中检测

当用户点击图片（`NodeSelection` 选中 figure/image 节点）时，
`ImageNodeView` 添加 `selected` CSS 类并显示工具栏：

```typescript
// NodeView 选中状态
update(node: ProseMirrorNode): boolean {
  this.node = node;
  this.updateDOM();
  return true;
}

selectNode(): void {
  this.dom.classList.add('selected');
  this.toolbar.show();
}

deselectNode(): void {
  this.dom.classList.remove('selected');
  this.toolbar.hide();
}
```

### 4.2 工具栏位置

定位在图片正上方，水平居中，距离图片 top 8px：
- z-index: 高于正文内容
- 若图片紧贴视口顶部，工具栏移到图片下方

### 4.3 工具栏按钮（8 个）

| # | 按钮 | 图标 | 动作 |
|---|---|---|---|
| 1 | 对齐 | `AlignLeft/Center/Right/Float` | 切换 figure.attrs.align |
| 2 | 调整大小 | `Maximize2` | 打开调整大小面板（宽×高输入） |
| 3 | 加标题 | `Type` | 插入/切换 figcaption 节点 |
| 4 | 添加链接 | `Link` | 设置 data-link 属性 |
| 5 | 替换图片 | `RefreshCw` | 触发 AssetPipeline 重新选择 |
| 6 | 查看原图 | `Maximize` | 新标签/弹窗查看全尺寸 |
| 7 | 复制链接 | `Copy` | 复制 src URL 到剪贴板 |
| 8 | 删除图片 | `Trash2` | 删除 figure 节点 |

### 4.4 对齐切换下拉

对齐按钮展开下拉（5 个选项）：

| 对齐 | 图标 | CSS 行为 |
|---|---|---|
| 左对齐 | `AlignLeft` | `float: none; margin: 0 auto 0 0` |
| 居中（默认） | `AlignCenter` | `display: block; margin: 0 auto` |
| 右对齐 | `AlignRight` | `float: none; margin: 0 0 0 auto` |
| 浮动左 | `MoveLeft` | `float: left; margin: 0 1em 0.5em 0` |
| 浮动右 | `MoveRight` | `float: right; margin: 0 0 0.5em 1em` |

---

## §5 对齐方式

### 5.1 存储

对齐存储在 `figure` 节点的 `data-align` 属性：
```
data-align="left" | "center" | "right" | "float-left" | "float-right"
```

### 5.2 CSS 渲染

```css
/* 编辑器容器内 */
.inkforge-editor figure[data-align="center"] {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.inkforge-editor figure[data-align="left"] {
  align-items: flex-start;
}

.inkforge-editor figure[data-align="right"] {
  align-items: flex-end;
}

.inkforge-editor figure[data-align="float-left"] {
  float: left;
  margin: 0 1em 0.5em 0;
  max-width: 50%;
}

.inkforge-editor figure[data-align="float-right"] {
  float: right;
  margin: 0 0 0.5em 1em;
  max-width: 50%;
}
```

### 5.3 GFM 序列化中的对齐

GFM 不支持图片对齐，序列化时：
- `center`（默认）：`![alt](src)` — 不加任何对齐标记
- 其他对齐：`![alt](src)` — 对齐信息丢失，记录在 HTML 注释 `<!-- align: left -->`（可选）

导出到 HTML/平台时，各 exporter 负责将 `data-align` 转为平台支持的样式。

---

## §6 尺寸调整（Resize Handle）

### 6.1 Handle 位置

四个角分别显示 8px × 8px 的方形拖拽 Handle（选中状态下显示）：

```
┌──●────────────────●─┐
│                      │
│       图片           │
│                      │
└──●────────────────●─┘
```

Handle 样式：
```css
.resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--color-accent);
  border: 1px solid white;
  border-radius: 2px;
  cursor: nwse-resize; /* 左上/右下角 */
}
.resize-handle.top-right,
.resize-handle.bottom-left {
  cursor: nesw-resize;
}
```

### 6.2 拖拽行为

```typescript
// src/extensions/ImageV2/ResizeHandle.vue
function startResize(corner: 'tl' | 'tr' | 'bl' | 'br', event: MouseEvent): void {
  const startX = event.clientX;
  const startY = event.clientY;
  const startWidth = currentWidth.value;
  const startHeight = currentHeight.value;
  const aspectRatio = startWidth / startHeight;

  const onMouseMove = (e: MouseEvent) => {
    let dx = e.clientX - startX;
    let dy = e.clientY - startY;

    // 右侧 handle 向右拖增大，左侧 handle 向左拖增大
    if (corner === 'tl' || corner === 'bl') dx = -dx;
    if (corner === 'tl' || corner === 'tr') dy = -dy;

    const newWidth = Math.max(MIN_WIDTH, startWidth + dx);

    // 按住 Shift 时解除宽高比锁定
    const lockRatio = !e.shiftKey;
    const newHeight = lockRatio
      ? Math.round(newWidth / aspectRatio)
      : Math.max(MIN_HEIGHT, startHeight + dy);

    // 更新 DOM（实时预览，不修改 PM 文档）
    imgEl.value!.style.width = `${newWidth}px`;
    imgEl.value!.style.height = `${newHeight}px`;
  };

  const onMouseUp = (e: MouseEvent) => {
    // 确认尺寸写入 ProseMirror 文档
    const finalWidth = parseInt(imgEl.value!.style.width);
    const finalHeight = parseInt(imgEl.value!.style.height);
    editor.commands.updateImage({ width: finalWidth, height: finalHeight });

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}
```

### 6.3 尺寸约束

| 约束 | 值 |
|---|---|
| 最小宽度 | 40px |
| 最小高度 | 40px |
| 最大宽度 | 编辑器可用宽度（100%） |
| 默认行为 | 锁定宽高比（Shift 解除锁定） |
| 宽高比锁定精度 | 保持 2 位小数 |

### 6.4 数值输入

工具栏"调整大小"按钮打开尺寸输入 Popover：
```
宽度: [240] px  高度: [160] px  [锁定比例 ☑]
[应用] [重置为原始尺寸]
```

---

## §7 图片标题（Caption / figcaption）

### 7.1 添加 Caption

工具栏"加标题"按钮：
- 若 figure 无 figcaption → 在 figure 末尾插入 `figcaption` 节点，光标置入
- 若已有 figcaption → 将光标置入 figcaption 节点

### 7.2 Typora 模式编辑

Caption 在 Typora 模式下：
- 光标不在 caption 时：渲染为样式化文字（灰色斜体，居中）
- 光标进入 caption：变为普通文本输入框，可编辑

### 7.3 Caption 样式

```css
.inkforge-editor figcaption {
  display: block;
  text-align: center;
  font-size: 0.85em;
  color: var(--color-text-tertiary);
  font-style: italic;
  margin-top: 6px;
  padding: 0 1em;
}

/* 空 caption 的占位提示 */
.inkforge-editor figcaption:empty::before {
  content: '点击添加说明文字...';
  color: var(--color-text-placeholder);
  pointer-events: none;
}
```

### 7.4 删除 Caption

Caption 内容全部删除后，按 Backspace → figcaption 节点自动移除。

### 7.5 GFM 序列化

```markdown
<!-- 带 caption 的图片 -->
![alt text](src "title")
*说明文字*
```

反序列化时不自动识别（仅手动插入 caption）。

---

## §8 图片链接

### 8.1 定义

图片可关联一个跳转链接（`data-link` 属性），点击图片时触发跳转。

### 8.2 设置方式

工具栏"添加链接"按钮打开 Popover：
```
链接 URL: [https://example.com]  [在新标签打开 ☑]
[确认] [移除链接]
```

### 8.3 渲染方式

```html
<!-- 有链接的图片 -->
<figure data-align="center">
  <a href="https://example.com" target="_blank" rel="noopener noreferrer">
    <img src="asset://abc" alt="图片">
  </a>
  <figcaption>说明文字</figcaption>
</figure>
```

### 8.4 Typora 模式行为

Typora 模式下点击链接图片：
- 按住 Ctrl/Cmd 点击 → 打开链接（`open()` Tauri shell）
- 普通点击 → 选中图片节点（不跳转）

### 8.5 GFM 序列化

```markdown
[![alt](src)](https://example.com)
```

---

## §9 懒加载与占位符

### 9.1 懒加载实现

```typescript
// src/extensions/ImageV2/ImageNodeView.vue
const observer = ref<IntersectionObserver | null>(null);
const isLoaded = ref(false);
const isLoading = ref(false);

onMounted(() => {
  observer.value = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !isLoaded.value) {
        loadImage();
      }
    },
    {
      rootMargin: '200px', // 提前 200px 预加载
      threshold: 0,
    }
  );
  observer.value.observe(containerEl.value!);
});

onUnmounted(() => {
  observer.value?.disconnect();
});
```

### 9.2 骨架屏占位符

图片未加载时显示骨架屏：
- 宽度：图片 `width` 属性（若无则 100%）
- 高度：`width / (naturalWidth / naturalHeight)` 估算（若无则固定 200px）
- 样式：`background: var(--color-skeleton)`，带动画光泽效果

```css
.image-skeleton {
  background: linear-gradient(
    90deg,
    var(--color-surface-overlay) 25%,
    var(--color-surface-elevated) 50%,
    var(--color-surface-overlay) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 9.3 宽高比预估

若图片有 `width` 和 `height` 属性：
```typescript
const skeletonStyle = computed(() => ({
  width: node.attrs.width ? `${node.attrs.width}px` : '100%',
  aspectRatio: node.attrs.width && node.attrs.height
    ? `${node.attrs.width} / ${node.attrs.height}`
    : '16 / 9', // 默认 16:9
}));
```

---

## §10 加载失败处理

### 10.1 失败检测

```typescript
async function loadImage(): Promise<void> {
  isLoading.value = true;
  loadError.value = null;

  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // 存储原始尺寸
        if (!node.attrs.naturalWidth) {
          editor.commands.updateImage({
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
          });
        }
        resolve();
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = node.attrs.src;
    });
    isLoaded.value = true;
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : '未知错误';
  } finally {
    isLoading.value = false;
  }
}
```

### 10.2 失败 UI

```
┌─────────────────────────────┐
│   [图片图标]                │
│   图片加载失败              │
│   alt: 图片说明文字         │
│                             │
│   [重试]                    │
└─────────────────────────────┘
```

样式：
```css
.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-elevated);
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  color: var(--color-text-tertiary);
  padding: 2em;
  min-height: 100px;
}
```

### 10.3 重试逻辑

点击"重试"按钮 → 清除 `loadError`，重新触发 `loadImage()`。
最多重试 3 次（第 3 次失败后"重试"按钮不再显示，改为"移除图片"）。

---

## §11 本地图片显示（asset:// 协议）

### 11.1 Tauri 资产 URL

本地图片通过 AssetPipeline 存储后，返回 `asset://` 协议 URL：
```
asset://localhost/com.inkforge.app/assets/abc123-uuid.png
```

### 11.2 浏览器兼容

`asset://` 协议需要 Tauri 的 `asset` protocol allowlist 配置：
```json
// tauri.conf.json
{
  "tauri": {
    "allowlist": {
      "protocol": {
        "asset": true,
        "assetScope": ["$APPDATA/inkforge/assets/**"]
      }
    }
  }
}
```

### 11.3 图片 URL 解析优先级

```typescript
function resolveImageSrc(src: string): string {
  if (src.startsWith('asset://')) return src;         // Tauri 本地资产
  if (src.startsWith('http://') || src.startsWith('https://')) return src; // 远程 URL
  if (src.startsWith('data:')) return src;            // base64（导入场景）
  // 相对路径 → 解析为 asset:// URL
  return resolveAssetPath(src);
}
```

---

## §12 粘贴图片

### 12.1 粘贴处理

```typescript
addProseMirrorPlugins() {
  return [
    new Plugin({
      props: {
        handlePaste: (view, event) => {
          const items = Array.from(event.clipboardData?.items ?? []);
          const imageItems = items.filter(item => item.type.startsWith('image/'));

          if (imageItems.length === 0) return false;

          event.preventDefault();

          imageItems.forEach(async (item) => {
            const file = item.getAsFile();
            if (!file) return;
            await insertImageFromFile(view, file);
          });

          return true;
        },
      },
    }),
  ];
}
```

### 12.2 AssetPipeline 处理

```typescript
async function insertImageFromFile(view: EditorView, file: File): Promise<void> {
  // 1. 创建临时 blob URL 显示骨架屏
  const tempId = `temp-${Date.now()}`;
  const tempPos = view.state.selection.anchor;

  // 插入临时占位节点
  const tempFigure = createTempFigureNode(tempId);
  const tr = view.state.tr.insert(tempPos, tempFigure);
  view.dispatch(tr);

  // 2. 走 AssetPipeline
  const assetId = await assetPipeline.importAsset({
    source: 'paste',
    data: await file.arrayBuffer(),
    filename: file.name || `image-${Date.now()}.png`,
    mimeType: file.type,
    documentId: currentDocumentId,
  });

  // 3. 替换临时节点为正式节点
  const assetSrc = `asset://localhost/.../${assetId}`;
  replaceTempNode(view, tempId, {
    src: assetSrc,
    'data-asset-id': assetId,
    alt: file.name.replace(/\.[^.]+$/, ''),
  });
}
```

### 12.3 粘贴 HTML 中的图片

粘贴含图片的 HTML 片段时（如从网页复制）：
1. 提取 `<img>` 标签的 `src` 属性
2. 若 src 为远程 URL → 保留原 URL，标记 `data-source="remote"`（不下载）
3. 若 src 为 base64 → 解码后走 AssetPipeline

---

## §13 拖放图片到编辑器

### 13.1 拖放处理

```typescript
handleDrop: (view, event, slice, moved) => {
  // moved: 编辑器内部拖拽（如 BlockDragHandle），不处理
  if (moved) return false;

  const files = Array.from(event.dataTransfer?.files ?? [])
    .filter(f => f.type.startsWith('image/'));

  if (files.length === 0) return false;

  event.preventDefault();

  // 确定插入位置
  const dropPos = view.posAtCoords({ x: event.clientX, y: event.clientY });
  if (!dropPos) return false;

  // 逐个处理图片
  files.forEach(async (file, index) => {
    await insertImageFromFile(view, file, dropPos.pos + index);
  });

  return true;
},
```

### 13.2 拖放 URL

从浏览器或文件管理器拖入图片 URL 时：
```typescript
const urls = event.dataTransfer?.getData('text/uri-list')?.split('\n') ?? [];
const imageUrls = urls.filter(url => /\.(png|jpg|jpeg|gif|svg|webp)(\?.*)?$/i.test(url));
```
远程图片 URL 直接插入（不下载），`src` 保留原 URL。

---

## §14 AssetPipeline 集成

### 14.1 集成接口

```typescript
import { assetPipeline } from '@/services/assetPipeline';

// 导入图片
const assetId = await assetPipeline.importAsset({
  source: 'paste' | 'drop' | 'button' | 'import',
  data: ArrayBuffer,
  filename: string,
  mimeType: string,
  documentId: string,
});

// 获取图片 URL
const url = assetPipeline.getAssetUrl(assetId);
// 返回 "asset://localhost/com.inkforge.app/assets/{assetId}"

// 注册引用
await assetPipeline.addReference(assetId, documentId);

// 注销引用（图片删除时）
await assetPipeline.removeReference(assetId, documentId);
```

### 14.2 图片删除联动

删除 figure 节点时，自动调用 `assetPipeline.removeReference(assetId, documentId)`。
AssetPipeline 负责孤儿检测和清理（→ 28-asset-pipeline-spec）。

---

## §15 GFM 序列化

### 15.1 基础格式

```markdown
![alt text](src "title")
```

### 15.2 带尺寸格式

当图片有明确的 `width`/`height` 时，使用扩展语法：
```markdown
![alt text](src =240x160)
```
注：此格式为 Typora 扩展，非标准 GFM。

序列化选择：
```typescript
export function serializeImage(node: ProseMirrorNode): string {
  const { src, alt, title, width, height } = node.attrs;
  const altText = alt ?? '';
  const srcPart = title ? `${src} "${title}"` : src;

  // width/height 均存在时追加尺寸
  const sizePart = (width && height) ? ` =${width}x${height}` : '';

  return `![${altText}](${srcPart}${sizePart})`;
}
```

### 15.3 asset:// URL 序列化

`asset://` URL 在序列化时保留原始路径（相对于文档目录）：
```typescript
function serializeSrc(src: string, documentPath: string): string {
  if (src.startsWith('asset://')) {
    // 转为相对路径
    const assetPath = src.replace('asset://localhost/com.inkforge.app/assets/', './assets/');
    return assetPath;
  }
  return src;
}
```

### 15.4 带 Caption 的序列化

```markdown
![alt](src)
*说明文字*
```

或 HTML 格式（更准确）：
```html
<figure>
<img src="src" alt="alt">
<figcaption>说明文字</figcaption>
</figure>
```

InkForge 默认使用 Markdown 近似格式（斜体紧跟图片），在导出 HTML 时使用完整 figure 结构。

---

## §16 TypeScript 类型定义

```typescript
// src/extensions/ImageV2/types.ts

export type ImageAlign =
  | 'left'
  | 'center'
  | 'right'
  | 'float-left'
  | 'float-right';

export interface ImageAttrs {
  src: string | null;
  alt: string;
  title: string | null;
  width: number | null;
  height: number | null;
  naturalWidth: number | null;
  naturalHeight: number | null;
  'data-link': string | null;
  'data-asset-id': string | null;
}

export interface FigureAttrs {
  align: ImageAlign;
}

export interface ImageToolbarAction {
  id: string;
  label: string;
  icon: string; // lucide-vue-next 图标名
  handler: (editor: Editor) => void;
  disabled?: (attrs: ImageAttrs) => boolean;
}

export interface ResizeState {
  isResizing: boolean;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  corner: 'tl' | 'tr' | 'bl' | 'br';
  lockRatio: boolean;
}

export interface LoadState {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  error: string | null;
  retryCount: number;
}

export interface AssetImportOptions {
  source: 'paste' | 'drop' | 'button' | 'import';
  data: ArrayBuffer;
  filename: string;
  mimeType: string;
  documentId: string;
}
```

---

## §17 Vue NodeView 组件架构

### 17.1 组件结构

```
ImageNodeView.vue（NodeView Wrapper）
├── FigureContainer（figure DOM 节点）
│   ├── ImageToolbar.vue（浮动工具栏，Teleport to body）
│   ├── ResizeHandles.vue（四角 Handle，选中时显示）
│   ├── ImageContent（img 或 骨架屏 或 失败占位）
│   └── FigcaptionView（figcaption 内容，NodeViewContent）
└── AlignWrapper（处理 float 布局）
```

### 17.2 NodeView 注册

```typescript
// src/extensions/ImageV2/index.ts
addNodeView() {
  return VueNodeViewRenderer(ImageNodeView);
},
```

### 17.3 NodeViewContent 使用

Figcaption 内容使用 `NodeViewContent`（允许 TipTap 管理内部光标）：
```vue
<!-- ImageNodeView.vue -->
<node-view-content as="figcaption" class="image-caption" />
```

---

## §18 模块架构

```
src/extensions/ImageV2/
├── index.ts                      # Extension 导出
├── types.ts                      # TypeScript 类型
├── figureNode.ts                 # Figure 节点定义
├── imageNode.ts                  # Image 节点定义
├── figcaptionNode.ts             # Figcaption 节点定义
├── imageSerializer.ts            # GFM 序列化
├── imageInputRules.ts            # 输入规则（Markdown 语法转节点）
├── imagePastePlugin.ts           # 粘贴处理 Plugin
├── imageDropPlugin.ts            # 拖放处理 Plugin
├── ImageNodeView.vue             # NodeView 主组件
├── components/
│   ├── ImageToolbar.vue          # 操作工具栏
│   ├── ResizeHandles.vue         # Resize 手柄
│   ├── ImageSkeleton.vue         # 骨架屏占位符
│   ├── ImageError.vue            # 加载失败 UI
│   └── ImageAlignDropdown.vue    # 对齐方式下拉
└── __tests__/
    ├── imageSerializer.test.ts
    ├── imageInputRules.test.ts
    ├── imagePastePlugin.test.ts
    └── imageDropPlugin.test.ts
```

---

## §19 导出行为

| 导出目标 | 图片处理 |
|---|---|
| Markdown | `![alt](src)` 或 `![alt](src =WxH)` |
| HTML | 完整 `<figure>` + `<img>` + `<figcaption>`，保留 CSS |
| 微信公众号 | 图片转 base64 内联，移除 float（微信不支持 float） |
| 知乎 | 保留远程 URL（知乎有自己的图片 CDN 上传流程） |
| 小红书 | 保留远程 URL |

`asset://` URL 在导出时：
- HTML 导出：转为相对路径或 base64（取决于 exporter 配置）
- 平台导出：自动上传图片并替换为平台 CDN URL（由各平台 exporter 实现）

---

## §20 性能 SLO

| 场景 | 目标 |
|---|---|
| 图片选中 → 工具栏显示 | < 50ms |
| Resize 拖拽响应 | < 16ms（60fps） |
| 懒加载触发（IntersectionObserver） | 进入视口前 200px 触发 |
| 骨架屏到图片切换过渡 | `opacity 200ms ease` |
| 粘贴图片（1MB） → AssetPipeline 完成 | < 3s |
| 大文档（50 张图片）渲染 | 首屏 < 1s（懒加载保证） |

---

## §21 无障碍

### 21.1 Alt 文本

`alt` 属性始终保留，不允许为 `undefined`（默认 `''`）。
工具栏"调整大小"面板提供 `alt` 输入字段。

### 21.2 Caption 屏幕阅读器

`<figcaption>` 自动关联 `<figure>`，屏幕阅读器朗读图片时会包含 caption 内容。

### 21.3 键盘操作

选中图片后：
- `Backspace` / `Delete`：删除图片
- `Enter`：若有图片链接，跳转链接
- `Tab`：将焦点移到工具栏第一个按钮

### 21.4 ARIA

```html
<figure aria-label="图片：{alt}" role="figure">
  <img src="..." alt="..." aria-describedby="caption-id">
  <figcaption id="caption-id">说明文字</figcaption>
</figure>
```

---

## §22 测试矩阵

| # | 测试场景 | 期望结果 |
|---|---|---|
| T01 | 点击图片选中 | 四角 Handle 出现，工具栏显示 |
| T02 | 点击图片外 | Handle 和工具栏消失 |
| T03 | 工具栏：居中对齐 | figure data-align="center" |
| T04 | 工具栏：浮动左 | figure data-align="float-left"，文字环绕 |
| T05 | 拖拽右下角 Handle 增大 | width/height 更新，宽高比保持 |
| T06 | 拖拽 Handle 时按 Shift | 宽高比解除，独立调整 |
| T07 | 最小宽度约束（40px） | 拖拽不低于 40px |
| T08 | 工具栏：加标题 | figcaption 节点插入，光标置入 |
| T09 | Caption 输入文字 | figcaption 内容更新 |
| T10 | Caption 内容全删后 Backspace | figcaption 节点移除 |
| T11 | 工具栏：添加链接 | data-link 属性设置 |
| T12 | Ctrl+Click 图片链接 | 调用 Tauri shell.open() |
| T13 | 工具栏：替换图片 | 文件选择器打开 |
| T14 | 图片进入视口前 200px | 加载开始，骨架屏显示 |
| T15 | 图片加载成功 | 骨架屏淡出，图片淡入 |
| T16 | 图片加载失败 | 灰色占位 + 重试按钮 |
| T17 | 重试按钮点击 | 重新加载，计数 +1 |
| T18 | 重试 3 次仍失败 | 重试按钮变为"移除图片" |
| T19 | 粘贴 PNG 图片 | AssetPipeline 调用，asset:// URL 插入 |
| T20 | 粘贴 GIF 图片 | 正确存储，动画保留 |
| T21 | 从文件管理器拖放图片 | 图片插入到光标位置 |
| T22 | 拖放远程图片 URL | src 保留原 URL，不下载 |
| T23 | GFM 序列化（无尺寸） | `![alt](src)` |
| T24 | GFM 序列化（有尺寸） | `![alt](src =240x160)` |
| T25 | GFM 序列化（带 caption） | `![alt](src)\n*caption*` |
| T26 | 删除图片 | figure 节点移除，AssetPipeline.removeReference 调用 |
| T27 | Ctrl+Z 撤销图片插入 | 图片移除，asset 引用解除 |
| T28 | Source 模式查看图片语法 | 显示 `![alt](src)` 原始语法 |

---

## §23 验收标准

1. 图片选中时四角 Handle 可见，拖拽调整尺寸流畅（60fps），最小尺寸约束生效。
2. 五种对齐方式视觉效果正确，GFM 序列化保留对齐注释（或近似）。
3. Caption 可通过工具栏添加，内容在 Typora 模式下可编辑。
4. 粘贴和拖放图片均触发 AssetPipeline，图片以 `asset://` URL 存储。
5. 懒加载在滚动到图片前 200px 触发，骨架屏正确显示。
6. 加载失败时显示灰色占位和重试按钮，重试逻辑正确。
7. GFM 序列化结果可被标准 Markdown 渲染器正确解析。
8. 图片删除时调用 AssetPipeline.removeReference，无孤儿资产泄漏。
