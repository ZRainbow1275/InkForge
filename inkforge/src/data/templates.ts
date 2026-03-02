// ═══════════════════════════════════════════════════════════════════
// 文章模板数据
// 内置模板，提供多种文章类型的起手结构
// ═══════════════════════════════════════════════════════════════════

/** 模板定义 */
export interface ArticleTemplate {
    /** 模板 ID */
    id: string
    /** 模板名称 */
    name: string
    /** 模板描述 */
    description: string
    /** 模板图标（SVG 路径或 emoji） */
    icon: string
    /** 模板分类 */
    category: 'content' | 'tech' | 'life' | 'work'
    /** Markdown 内容 */
    body: string
}

/** 内置模板列表 */
export const ARTICLE_TEMPLATES: readonly ArticleTemplate[] = [
    {
        id: 'tutorial',
        name: '教程类',
        description: '适合技术教程、操作指南、入门手册',
        icon: '📖',
        category: 'tech',
        body: `# 标题：如何实现 XXX

> 一句话描述本教程要解决的问题。

## 背景

为什么需要了解这个主题？读者在什么场景下会遇到这个需求？

## 前置条件

- 条件 1
- 条件 2
- 条件 3

## 第一步：准备环境

详细说明第一步的操作步骤。

## 第二步：核心实现

核心代码或操作步骤。

\`\`\`
// 代码示例
\`\`\`

## 第三步：验证与测试

如何确认操作成功。

## 常见问题

### 问题 1

解答。

### 问题 2

解答。

## 总结

回顾要点，给出下一步建议。
`,
    },
    {
        id: 'review',
        name: '评测类',
        description: '适合产品评测、工具对比、体验报告',
        icon: '⚖️',
        category: 'content',
        body: `# 标题：XXX 深度评测

> 一句话点评。

## 产品简介

产品是什么，面向谁，解决什么问题。

## 核心功能体验

### 功能一

体验描述、截图说明。

### 功能二

体验描述、截图说明。

### 功能三

体验描述、截图说明。

## 优点

- 优点 1：描述
- 优点 2：描述
- 优点 3：描述

## 不足

- 不足 1：描述
- 不足 2：描述

## 竞品对比

| 维度 | 本产品 | 竞品 A | 竞品 B |
|------|--------|--------|--------|
| 功能 |        |        |        |
| 价格 |        |        |        |
| 体验 |        |        |        |

## 总结与推荐

总体评价，适合什么样的用户。

**推荐指数：★★★★☆**
`,
    },
    {
        id: 'journal',
        name: '日记/周记',
        description: '适合日常记录、工作周报、个人感悟',
        icon: '📔',
        category: 'life',
        body: `# YYYY年MM月DD日

## 今日记录

### 上午

-

### 下午

-

### 晚上

-

## 今日收获

最重要的一件事或一个想法。

## 明日计划

- [ ] 任务 1
- [ ] 任务 2
- [ ] 任务 3

## 随想

自由书写，记录灵感或感悟。
`,
    },
    {
        id: 'tech-blog',
        name: '技术博客',
        description: '适合技术分享、架构设计、实践总结',
        icon: '💻',
        category: 'tech',
        body: `# 标题：XXX 技术实践

## 背景

遇到了什么技术问题？为什么要解决它？

## 方案调研

### 方案一

简述方案、优缺点。

### 方案二

简述方案、优缺点。

### 最终选择

选了哪个方案，为什么。

## 技术实现

### 架构设计

整体架构图或流程图描述。

### 核心代码

\`\`\`typescript
// 关键代码实现
\`\`\`

### 踩坑记录

遇到了哪些坑，怎么解决的。

## 效果与数据

优化前后的对比数据。

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
|      |        |        |      |

## 总结与展望

核心经验总结，未来改进方向。
`,
    },
    {
        id: 'news',
        name: '新闻稿',
        description: '适合产品发布、活动通告、公告',
        icon: '📰',
        category: 'work',
        body: `# 标题：简洁有力的新闻标题

**YYYY年MM月DD日，地点** —— 导语，用一段话概括整个新闻的核心信息（谁、做了什么、为什么重要）。

## 正文

事件的详细描述，展开导语中的关键信息。

## 背景

提供必要的背景信息，帮助读者理解事件的来龙去脉。

## 引用

> "引用语" —— 发言人姓名，职位

## 关于我们

简短的团队/公司介绍。

---

**联系方式：** email@example.com
`,
    },
    {
        id: 'reading-notes',
        name: '读书笔记',
        description: '适合书评、读后感、知识摘录',
        icon: '📚',
        category: 'life',
        body: `# 《书名》读书笔记

**作者：** XXX
**出版年份：** YYYY
**阅读日期：** YYYY-MM-DD

## 一句话评价

> 用一句话概括这本书给你的最大启发。

## 核心观点

### 观点一

书中的核心论点，以及你的理解。

### 观点二

书中的核心论点，以及你的理解。

### 观点三

书中的核心论点，以及你的理解。

## 金句摘录

> "摘录 1" —— 第 X 页

> "摘录 2" —— 第 X 页

> "摘录 3" —— 第 X 页

## 个人感悟

这本书改变了你的哪些认知？你打算如何将书中的智慧应用到实践中？

## 推荐度

**推荐指数：★★★★☆**

适合人群：XXX
`,
    },
    {
        id: 'comparison',
        name: '对比分析',
        description: '适合方案对比、技术选型、决策分析',
        icon: '🔀',
        category: 'work',
        body: `# 标题：A vs B vs C 对比分析

## 分析目标

我们在什么场景下，需要从 A/B/C 中做出选择。

## 候选方案概述

### 方案 A

简述方案 A 的核心特点。

### 方案 B

简述方案 B 的核心特点。

### 方案 C

简述方案 C 的核心特点。

## 多维对比

| 维度 | 方案 A | 方案 B | 方案 C |
|------|--------|--------|--------|
| 功能完整度 | | | |
| 性能表现 | | | |
| 学习成本 | | | |
| 社区生态 | | | |
| 维护成本 | | | |
| 价格 | | | |

## 详细分析

### 维度一：功能完整度

逐一分析。

### 维度二：性能表现

逐一分析。

## 结论与建议

综合以上分析，推荐方案 X，原因如下：

1. 理由 1
2. 理由 2
3. 理由 3

## 风险与注意事项

选择该方案需要注意的潜在风险。
`,
    },
    {
        id: 'blank',
        name: '空白文档',
        description: '从零开始，自由创作',
        icon: '📝',
        category: 'content',
        body: `# 标题

从这里开始你的创作……
`,
    },
] as const

/** 模板分类名称映射 */
export const TEMPLATE_CATEGORY_NAMES: Record<ArticleTemplate['category'], string> = {
    content: '内容创作',
    tech: '技术写作',
    life: '生活记录',
    work: '工作文档',
}

/**
 * 按分类分组模板
 */
export function getTemplatesByCategory(): Record<string, ArticleTemplate[]> {
    const grouped: Record<string, ArticleTemplate[]> = {}

    for (const template of ARTICLE_TEMPLATES) {
        const categoryName = TEMPLATE_CATEGORY_NAMES[template.category]
        if (!grouped[categoryName]) {
            grouped[categoryName] = []
        }
        grouped[categoryName].push(template)
    }

    return grouped
}

/**
 * 根据 ID 获取模板
 */
export function getTemplateById(id: string): ArticleTemplate | undefined {
    return ARTICLE_TEMPLATES.find(t => t.id === id)
}
