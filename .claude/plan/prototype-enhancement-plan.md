# InkForge 原型增强计划

> **版本**：v1.0
> **日期**：2026-01-23
> **策略**：混合策略 - 原型增强 → 验证 → 迁移到 inkforge 项目

---

## 一、计划概览

### 1.1 目标

将 prototype 文件夹下的 HTML 原型从"静态展示"升级为"功能可用"，验证核心交互后迁移到 inkforge 项目。

### 1.2 技术栈

| 层级 | 原型 (prototype/) | 正式项目 (inkforge/) |
|------|------------------|---------------------|
| 框架 | Vue 3 CDN | Vue 3 + Vite |
| 状态 | Vue ref/reactive | Pinia |
| 编辑器 | contenteditable | TipTap |
| 持久化 | LocalStorage | Dexie (IndexedDB) |
| 导出 | 字符串拼接 | juice + marked |

### 1.3 阶段划分

| 阶段 | 内容 | 时间 | 优先级 |
|------|------|------|--------|
| Phase 1 | 悬浮菜单功能、预览同步 | Day 1 | P0 |
| Phase 2 | 版本管理、主题应用 | Day 2 | P0 |
| Phase 3 | 斜杠命令系统 | Day 3 | P1 |
| Phase 4 | 验证并迁移到 inkforge | Day 4-5 | P1 |

---

## 二、Phase 1：悬浮菜单 & 预览同步

### 2.1 悬浮菜单功能实现

**目标文件**：`prototype/inkforge_workstation.html`

**当前状态**：按钮存在但无功能

**实现方案**：使用 `document.execCommand()` 实现基础格式化

```javascript
// 添加到 setup() 中
function formatText(command, value = null) {
    document.execCommand(command, false, value);
    // 保持焦点
    editorPaper.value?.focus();
}

// 悬浮菜单按钮绑定
// B - 加粗
function toggleBold() { formatText('bold'); }
// I - 斜体
function toggleItalic() { formatText('italic'); }
// U - 下划线
function toggleUnderline() { formatText('underline'); }
// S - 删除线
function toggleStrikethrough() { formatText('strikeThrough'); }
// 链接
function insertLink() {
    const url = prompt('请输入链接地址:', 'https://');
    if (url) formatText('createLink', url);
}
// 行内代码
function toggleCode() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const code = document.createElement('code');
        code.textContent = range.toString();
        range.deleteContents();
        range.insertNode(code);
    }
}
// 标题
function setHeading(level) {
    formatText('formatBlock', `<h${level}>`);
}
```

**HTML 模板修改**：
```html
<div class="floating-menu" ...>
    <button @click="toggleBold" title="加粗 (Ctrl+B)"><b>B</b></button>
    <button @click="toggleItalic" title="斜体 (Ctrl+I)"><i>I</i></button>
    <button @click="toggleUnderline" title="下划线"><u>U</u></button>
    <button @click="toggleStrikethrough" title="删除线" style="text-decoration: line-through;">S</button>
    <div class="divider"></div>
    <button @click="insertLink" title="链接">🔗</button>
    <button @click="toggleCode" title="代码">⌘</button>
    <div class="divider"></div>
    <button @click="showHeadingMenu" title="标题">H▼</button>
</div>
```

### 2.2 预览同步实现

**当前状态**：预览面板 device-screen 内容硬编码

**实现方案**：编辑器内容变化时同步到预览

```javascript
// 添加响应式预览内容
const previewContent = ref('');

// 编辑器输入时同步
const onEditorInput = () => {
    isDirty.value = true;
    const text = editorPaper.value?.innerText || '';
    wordCount.value = text.replace(/\s/g, '').length;

    // 同步到预览面板
    syncPreview();
};

function syncPreview() {
    if (editorPaper.value) {
        // 获取编辑器 HTML 并应用主题样式
        const html = editorPaper.value.innerHTML;
        previewContent.value = applyThemeStyles(html);
    }
}

function applyThemeStyles(html) {
    const color = themeColors[themeColor.value] || '#D32F2F';
    // 简单样式注入（后续用完整 CSS 生成）
    return html
        .replace(/<h1>/g, `<h1 style="color: ${color}; font-size: 18px;">`)
        .replace(/<h2>/g, `<h2 style="color: ${color}; font-size: 16px; border-bottom: 2px solid ${color};">`);
}

const themeColors = {
    red: '#D32F2F',
    blue: '#1565C0',
    purple: '#7B1FA2',
    teal: '#00796B',
    black: '#263238'
};
```

**预览面板 HTML**：
```html
<div class="device-screen" v-html="previewContent || defaultPreview"></div>
```

---

## 三、Phase 2：版本管理 & 主题应用

### 3.1 版本管理 (LocalStorage)

**数据结构**：
```javascript
const versions = ref([]);
const currentVersionId = ref('v1');

// 初始化时从 LocalStorage 加载
onMounted(() => {
    const saved = localStorage.getItem('inkforge_versions');
    if (saved) {
        versions.value = JSON.parse(saved);
    } else {
        // 创建初始版本
        versions.value = [{
            id: 'v1',
            label: 'v1',
            title: articleTitle.value,
            content: editorPaper.value?.innerHTML || '',
            createdAt: new Date().toISOString(),
            isInitial: true
        }];
        saveVersions();
    }
});

function saveVersions() {
    localStorage.setItem('inkforge_versions', JSON.stringify(versions.value));
}

function createVersion() {
    const newId = `v${versions.value.length + 1}`;
    const newVersion = {
        id: newId,
        label: newId,
        title: articleTitle.value,
        content: editorPaper.value?.innerHTML || '',
        createdAt: new Date().toISOString(),
        description: '手动保存'
    };
    versions.value.unshift(newVersion);
    currentVersionId.value = newId;
    saveVersions();
    isDirty.value = false;
}

function switchVersion(versionId) {
    const version = versions.value.find(v => v.id === versionId);
    if (version) {
        currentVersionId.value = versionId;
        articleTitle.value = version.title;
        if (editorPaper.value) {
            editorPaper.value.innerHTML = version.content;
        }
        syncPreview();
    }
}
```

### 3.2 自动保存机制

```javascript
let autoSaveTimer = null;

onMounted(() => {
    // 每 5 分钟自动保存
    autoSaveTimer = setInterval(() => {
        if (isDirty.value) {
            autoSave();
        }
    }, 5 * 60 * 1000);
});

function autoSave() {
    // 更新当前版本内容
    const currentVersion = versions.value.find(v => v.id === currentVersionId.value);
    if (currentVersion) {
        currentVersion.content = editorPaper.value?.innerHTML || '';
        currentVersion.title = articleTitle.value;
        currentVersion.updatedAt = new Date().toISOString();
        saveVersions();
        isDirty.value = false;
    }
}

onUnmounted(() => {
    if (autoSaveTimer) clearInterval(autoSaveTimer);
});
```

### 3.3 主题预设即时应用

**实现思路**：主题切换时动态更新 CSS 变量

```javascript
watch(themeColor, (newColor) => {
    const color = themeColors[newColor];
    document.documentElement.style.setProperty('--accent-primary', color);
    document.documentElement.style.setProperty('--accent-primary-light', color + '20');
    syncPreview(); // 重新应用预览样式
});

watch(fontFamily, (newFont) => {
    const fontMap = {
        serif: "'Noto Serif SC', serif",
        sans: "'Inter', sans-serif",
        kai: "'KaiTi', serif"
    };
    if (editorPaper.value) {
        editorPaper.value.style.fontFamily = fontMap[newFont];
    }
});
```

---

## 四、Phase 3：斜杠命令系统

### 4.1 命令菜单实现

```javascript
const showSlashMenu = ref(false);
const slashMenuPosition = ref({ top: '0px', left: '0px' });
const slashFilter = ref('');
const slashCommands = [
    { id: 'h2', label: '标题 2', icon: 'H2', action: () => setHeading(2) },
    { id: 'h3', label: '标题 3', icon: 'H3', action: () => setHeading(3) },
    { id: 'quote', label: '引用块', icon: '❝', action: () => formatText('formatBlock', '<blockquote>') },
    { id: 'code', label: '代码块', icon: '⌘', action: insertCodeBlock },
    { id: 'divider', label: '分割线', icon: '—', action: insertDivider },
    { id: 'image', label: '图片', icon: '🖼', action: insertImage }
];

// 监听编辑器输入
function onEditorKeyDown(e) {
    if (e.key === '/') {
        // 获取光标位置
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            slashMenuPosition.value = {
                top: `${rect.bottom + 8}px`,
                left: `${rect.left}px`
            };
            showSlashMenu.value = true;
            slashFilter.value = '';
        }
    } else if (showSlashMenu.value) {
        if (e.key === 'Escape') {
            showSlashMenu.value = false;
        } else if (e.key === 'Backspace' && slashFilter.value === '') {
            showSlashMenu.value = false;
        }
    }
}

function executeSlashCommand(command) {
    // 删除斜杠
    document.execCommand('delete');
    // 执行命令
    command.action();
    showSlashMenu.value = false;
}
```

### 4.2 斜杠菜单 HTML

```html
<div class="slash-menu" v-if="showSlashMenu" :style="slashMenuPosition">
    <div class="slash-menu-header">插入内容</div>
    <div v-for="cmd in filteredCommands" :key="cmd.id"
         class="slash-menu-item"
         @click="executeSlashCommand(cmd)">
        <span class="icon">{{ cmd.icon }}</span>
        <span class="label">{{ cmd.label }}</span>
    </div>
</div>
```

---

## 五、Phase 4：迁移到 inkforge 项目

### 5.1 迁移清单

| 原型功能 | inkforge 对应位置 | 说明 |
|----------|-------------------|------|
| 悬浮菜单 | `components/editor/FloatingMenu.vue` | TipTap 原生支持 |
| 版本管理 | `stores/editor.ts` | 使用 Dexie 持久化 |
| 主题应用 | `stores/theme.ts` | 已有 generatedCSS |
| 预览同步 | `components/preview/MarkdownPreview.vue` | marked + DOMPurify |
| 斜杠命令 | TipTap Commands 扩展 | @tiptap/extension-commands |

### 5.2 优先迁移项

1. **版本管理逻辑** → `stores/editor.ts` (FSM 已设计)
2. **主题预设数据** → `stores/theme.ts` (presets 数组)
3. **导出逻辑** → `services/export.ts` (juice + marked)

---

## 六、验收标准

### 6.1 Phase 1 验收

- [ ] 悬浮菜单 8 个按钮全部可用
- [ ] 编辑器内容实时同步到预览面板
- [ ] 主题色切换即时生效

### 6.2 Phase 2 验收

- [ ] 创建版本后数据持久化
- [ ] 刷新页面后版本列表保留
- [ ] 切换版本加载历史内容
- [ ] 5 分钟自动保存触发

### 6.3 Phase 3 验收

- [ ] 输入 `/` 弹出命令菜单
- [ ] 支持 6 种基础命令
- [ ] ESC 关闭菜单

### 6.4 Phase 4 验收

- [ ] inkforge 项目核心功能与原型一致
- [ ] 使用 TipTap 替代 contenteditable
- [ ] 使用 IndexedDB 替代 LocalStorage

---

*计划生成时间：2026-01-23*
*策略：混合策略（原型增强 → 验证 → 迁移）*
