# Technical Design — 恢复品牌化渲染设计并重构视觉预设

## 1. Root cause

当前调用链是正确的：

```text
real article
  -> platform preset
  -> resolveVisualVariant()
  -> buildReadingTimeHeader()
  -> generateThemeCSS()
  -> getVisualVariantCSS()
  -> existing decorator / Juice / sanitizer
  -> preview + copied HTML
```

问题集中在两个共享点：

1. `buildMastheadIdentity()` 只返回一个通用 `<p>` 和相同子节点；
2. `commonVariantCSS()` 除了排版基线，还定义了通用 masthead、组件和语义轮廓。

因此 Variant 信息虽然进入了调用链，却只改变排列顺序和颜色，没有改变出版构图。

## 2. Boundary

继续复用：

- `visual-variants.ts` 的七 Variant、十 Profile 和 24 个 legacy preset 映射；
- `utils.ts` 的真实 metadata、转义与抬头注入；
- `themes.ts` 的 preview/export CSS 双轨；
- `writing-components.ts` 的唯一数据模型和类型类名；
- 现有 decorators、SVG 模块、Juice、DOMPurify、quality detector 和平台适配器。

不新增 renderer、store、数据库 schema、模板语言、依赖或运行时概念板资产。

## 3. Minimal implementation

### 3.1 Masthead composition

保持 `buildReadingTimeHeader()` 公共签名和 `.ink-article-masthead` 外层合同。
将 `buildMastheadIdentity()` 的七个分支升级为七个微信安全、normal-flow 的结构，
每套携带独占的 `data-ink-masthead-composition`：

| Variant | Composition hook | Normal-flow structure |
|---|---|---|
| V1 | `bound-volume` | 书脊栏 + 版本索引 + 居中书名页 + 双轨规则 |
| V2 | `coordinate-field` | 坐标轴 + 法理栏目 + 权威层级条 + 左对齐标题 |
| V3 | `section-cut` | 深色剖面场 + 版次/数字端点 + 黄铜标题轨 |
| V4 | `edition-wire` | 版次条 + Kiln 信息块 + 事实状态栏 + 硬标题 |
| V5 | `forge-track` | BUILD 热端 + 冷热构建轨 + Mono 锻次 + 标题 |
| V6 | `weave-map` | 五节点经纬线 + 知识栏目 + 问题轨 + 标题 |
| V7 | `editorial-collage` / `quiet-letter` | playful 拼贴带或 quiet 信笺栏 |

所有标题、分类和 metadata 仍来自调用者；装饰节点只含固定栏目语言和空几何。

### 3.2 Shared CSS contraction

`commonVariantCSS()` 只保留：

- root 安全背景/文字/行高；
- direct paragraph 连续流 reset；
- 图片最大宽度；
- 基础表格 collapse；
- code/pre 最低可读性；
- writing-component 数据内容的安全继承；
- H4–H6 最低层级和 fallback。

从 shared 层移除通用 masthead 轮廓、通用左轨卡、统一组件圆角和统一 footer 造型。

### 3.3 Variant-owned surfaces

七个现有 CSS builder 继续是唯一艺术指导入口，各自负责：

- masthead 独占 hook；
- H1–H6 结构、比例和节奏；
- paragraph typography；
- quote/list/table/code/figure；
- writing-component family silhouettes；
- song、license、delivery links、colophon。

不复制 writing-component DOM 或字段。组件类型继续通过现有
`.ink-writing-component--<Type>` 选择器主题化。

### 3.4 Profile modifiers

`presetId` 已经存在，不增加新的状态：

- V4：`news` 添加 edition/source 事实节拍；`commentary` 添加 thesis/evidence 节拍。
- V5：`aigc` 使用 media/prompt 强度；`code` 使用 build/version 强度。
- V7：`meme` 使用 collage；`life`/`elegant` 使用 quiet letter，但 `elegant` 的章节比例更典雅。

Profile modifier 只控制有限结构 hook 与 CSS，不能改变内容或伪造组件。

## 4. Tests

新增失败优先断言：

1. 七个 canonical preset 的 masthead composition 值唯一；
2. 七个 masthead 的结构指纹唯一，不仅文字和颜色不同；
3. 共享 Variant 的 profile modifier 可辨；
4. direct paragraph 持续为透明、无边框、无 padding；
5. 七套均覆盖 semantic surface selectors；
6. 16 个微信 preset、10 profile、24 legacy ID 不变；
7. inline 后保留独占 masthead 与 footer hook；
8. 安全检查、幂等、custom CSS URL 清理和 Typography 回归不变。

结构测试只作为防退化门；最终美感以原生 contact sheet 为准。

## 5. Visual review loop

1. 从本机真实文章只读选择短文、长文和组件最丰富文稿；
2. 使用 Release Tauri 生成七套相同内容的首屏/中段/文末；
3. 与仓库最终方向板并排审查：
   - 构图轮廓；
   - 标题比例；
   - 正文节奏；
   - 专属语义组件；
   - 品牌 DNA；
4. 任意两套出现同骨架换色，回到对应 builder/masthead 修复；
5. 临时图不提交，私有正文不写入证据。

## 6. Compatibility and rollback

- 公共导出函数名、preset ID 和 store 不变；
- `buildReadingTimeHeader()` 外层 sentinel/class 不变；
- 旧调用者未提供 title/category/song 时继续安全省略；
- 每套 CSS/masthead 分支可独立回退，不涉及用户数据；
- 小红书、知乎仍通过现有 platform adapter，当前只做回归。
