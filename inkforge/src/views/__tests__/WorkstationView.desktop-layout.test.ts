import { describe, expect, it } from 'vitest'

import APP_SOURCE from '../../App.vue?raw'
import EDITOR_PANEL_SOURCE from '../../components/editor/EditorPanel.vue?raw'
import INSPECTOR_WIDGET_CONTENT_SOURCE from '../../components/workstation/InspectorWidgetContent.vue?raw'
import INSPECTOR_UTILITY_SOURCE from '../InspectorUtilityView.vue?raw'
import WORKSTATION_SOURCE from '../WorkstationView.vue?raw'

describe('WorkstationView desktop layout contracts', () => {
  it('commits native widget state only after the owned window closes successfully', () => {
    expect(WORKSTATION_SOURCE).toContain('const inspectorWidgetCloseRequests = new Map<string, Promise<boolean>>()')
    expect(WORKSTATION_SOURCE).toMatch(
      /async function closeDetachedInspectorWidget[\s\S]{0,900}?return result\.ok/,
    )
    expect(WORKSTATION_SOURCE).toMatch(
      /async function dockInspectorWidget[\s\S]{0,260}?await closeDetachedInspectorWidget\(previous\)[\s\S]{0,260}?updateInspectorWidgetLayout/,
    )
    expect(WORKSTATION_SOURCE).toMatch(
      /async function closeInspectorWidget[\s\S]{0,260}?await closeDetachedInspectorWidget\(previous\)[\s\S]{0,260}?updateInspectorWidgetLayout/,
    )
    expect(WORKSTATION_SOURCE).toMatch(
      /async function handleInspectorWidgetHandshake[\s\S]{0,700}?await closeDetachedInspectorWidget\(layout\)[\s\S]{0,350}?updateInspectorWidgetLayout/,
    )
    expect(INSPECTOR_UTILITY_SOURCE).not.toContain('await appWindow.close()')
  })

  it('keeps one application brand and a permanently mounted Review action', () => {
    expect(WORKSTATION_SOURCE).not.toContain("import ForgeNibMark from '@/components/chrome/ForgeNibMark.vue'")
    expect(WORKSTATION_SOURCE).not.toContain('class="header-brand"')
    expect(WORKSTATION_SOURCE).toContain('class="icon-btn header-back-btn"')
    expect(WORKSTATION_SOURCE).toContain('data-testid="workstation-review-mode"')
  })

  it('keeps the narrow command bar to a document row and an action row', () => {
    const narrowStart = WORKSTATION_SOURCE.indexOf('@media (max-width: 900px)')
    const narrowEnd = WORKSTATION_SOURCE.indexOf('@media (', narrowStart + 1)
    const narrowSource = WORKSTATION_SOURCE.slice(narrowStart, narrowEnd)

    expect(narrowStart).toBeGreaterThan(-1)
    expect(narrowEnd).toBeGreaterThan(narrowStart)
    expect(narrowSource).toMatch(/\.workstation-header\s*\{[^}]*display:\s*grid;/)
    expect(narrowSource).toMatch(/\.workstation-header\s*\{[^}]*grid-template-columns:\s*auto minmax\(0,\s*1fr\);/)
    expect(narrowSource).toMatch(/\.header-back-btn\s*\{[^}]*grid-row:\s*1;/)
    expect(narrowSource).toMatch(/\.header-title\s*\{[^}]*grid-row:\s*1;/)
    expect(narrowSource).toMatch(/\.header-actions\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*grid-row:\s*2;/)
  })

  it('keeps all manager destinations readable in a five-slot compact control group', () => {
    const tabStripStart = WORKSTATION_SOURCE.indexOf('class="panel-tab-strip"')
    const collapseTriggerStart = WORKSTATION_SOURCE.indexOf('class="collapse-trigger"', tabStripStart)
    const collapseButtonStart = WORKSTATION_SOURCE.lastIndexOf('<button', collapseTriggerStart)
    const managerTabsEnd = WORKSTATION_SOURCE.indexOf('</div>', collapseTriggerStart)
    const tabStripSource = WORKSTATION_SOURCE.slice(tabStripStart, collapseButtonStart)
    const managerTabsSource = WORKSTATION_SOURCE.slice(tabStripStart, managerTabsEnd)

    expect(tabStripStart).toBeGreaterThan(-1)
    expect(collapseTriggerStart).toBeGreaterThan(tabStripStart)
    expect(collapseButtonStart).toBeGreaterThan(tabStripStart)
    expect(managerTabsEnd).toBeGreaterThan(collapseTriggerStart)
    expect(tabStripSource.match(/data-manager-tab=/g)).toHaveLength(5)
    expect(tabStripSource.match(/type="button"/g)).toHaveLength(5)
    expect(tabStripSource.match(/:aria-pressed=/g)).toHaveLength(5)
    expect(tabStripSource).not.toContain('<svg')
    expect(tabStripSource.match(/<(?:Folder|GitBranch|ListTree|Tags|MessageSquare)\b/g)).toHaveLength(5)
    expect(managerTabsSource).not.toContain('<svg')
    expect(managerTabsSource).toContain('<PanelLeftClose')
    expect(WORKSTATION_SOURCE).toMatch(
      /\.panel-tab-strip\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\);/,
    )
    expect(WORKSTATION_SOURCE).toMatch(/\.panel-tab\s*\{[^}]*flex-direction:\s*column;/)
    expect(WORKSTATION_SOURCE).toMatch(/\.panel-tab:focus-visible[\s\S]{0,160}?box-shadow:\s*var\(--focus-ring\);/)
  })

  it('keeps the collapsed manager latched until an explicit reopen action', () => {
    const collapsedBarStart = WORKSTATION_SOURCE.indexOf('class="manager-collapsed-bar"')
    const collapsedBarEnd = WORKSTATION_SOURCE.indexOf('</button>', collapsedBarStart)
    const collapsedBarSource = WORKSTATION_SOURCE.slice(collapsedBarStart, collapsedBarEnd)

    expect(collapsedBarStart).toBeGreaterThan(-1)
    expect(collapsedBarEnd).toBeGreaterThan(collapsedBarStart)
    expect(collapsedBarSource).toContain('@click="toggleManagerPanel(false)"')
    expect(collapsedBarSource).not.toContain('@mouseenter="managerCollapsed = false"')
    expect(WORKSTATION_SOURCE).not.toContain('class="edge-trigger left"')
    expect(WORKSTATION_SOURCE).toContain('@click="toggleManagerPanel(true)"')
    expect(WORKSTATION_SOURCE).toMatch(
      /function toggleManagerPanel\(nextCollapsed = !managerCollapsed\.value\): void \{[\s\S]*?captureManagerPanelEditorAnchor\(\)[\s\S]*?restoreManagerPanelEditorAnchor\(editorAnchor\)/,
    )
  })

  it('reserves the fixed titlebar height without a collapsible top margin', () => {
    expect(APP_SOURCE).toMatch(/\.app-content\s*\{[^}]*padding-top:\s*var\(--ink-titlebar-height, 36px\);/)
    expect(APP_SOURCE).toMatch(/\.app-content\s*\{[^}]*box-sizing:\s*border-box;/)
    expect(APP_SOURCE).not.toMatch(/\.app-content\s*\{[^}]*margin-top:/)
    expect(WORKSTATION_SOURCE).toMatch(/\.workstation\s*\{[^}]*height:\s*100%;/)
    expect(WORKSTATION_SOURCE).not.toMatch(/\.workstation\s*\{[^}]*height:\s*100vh;/)
  })

  it('keeps the inspector as a coordinated right rail without covering stage actions', () => {
    expect(WORKSTATION_SOURCE).toMatch(
      /id: 'default',[\s\S]*?layout: \{ managerCollapsed: false, stageCollapsed: false, inspectorCollapsed: true \}/,
    )
    expect(WORKSTATION_SOURCE).toMatch(
      /id: 'writing',[\s\S]*?layout: \{ managerCollapsed: false, stageCollapsed: true, inspectorCollapsed: true \}/,
    )
    expect(WORKSTATION_SOURCE).toMatch(
      /id: 'review',[\s\S]*?layout: \{ managerCollapsed: false, stageCollapsed: false, inspectorCollapsed: false \}/,
    )
    expect(WORKSTATION_SOURCE).toMatch(
      /\.panel-inspector\s*\{[^}]*position:\s*relative;[^}]*flex:\s*0 0 auto;/,
    )
    expect(WORKSTATION_SOURCE).not.toMatch(
      /\.panel-inspector:not\(\.pinned\)\s*\{[^}]*position:\s*absolute;/,
    )
    expect(WORKSTATION_SOURCE).toContain('margin-left var(--motion-slow) var(--ease-out-quart)')
    expect(WORKSTATION_SOURCE).toContain('transform var(--motion-slow) var(--ease-out-quart)')
    expect(WORKSTATION_SOURCE).toContain('.panel-inspector:not(.pinned):not(.collapsed) {')
    expect(WORKSTATION_SOURCE).toContain(
      'margin-left: calc(12px - var(--workstation-inspector-width, 260px));',
    )
    expect(WORKSTATION_SOURCE).toContain(
      'transform: translateX(calc(0px - var(--workstation-stage-width, 400px)));',
    )
    expect(WORKSTATION_SOURCE).not.toMatch(
      /\.panel-inspector:not\(\.pinned\)\s*\{[^}]*right:\s*var\(--workstation-stage-width/,
    )
    expect(WORKSTATION_SOURCE).toContain('.main-content.stage-is-collapsed .panel-inspector:not(.pinned):not(.collapsed)')
    expect(WORKSTATION_SOURCE).toContain('transform: translateX(-12px);')
    expect(WORKSTATION_SOURCE).toMatch(
      /function handleInspectorResizeMove\(event: PointerEvent\): void \{[\s\S]*?inspectorPanelEl\.value\?\.getBoundingClientRect\(\)[\s\S]*?rect\.right - event\.clientX/,
    )
    expect(WORKSTATION_SOURCE.match(/v-for="opt in platformOptions"/g)).toHaveLength(1)
    expect(WORKSTATION_SOURCE).toMatch(/\.stage-header\s*\{[^}]*height:\s*44px;/)
  })

  it('places the focus exit control inside the editor surface with local positioning', () => {
    const editorStart = WORKSTATION_SOURCE.indexOf('class="panel panel-editor"')
    const editorEnd = WORKSTATION_SOURCE.indexOf('</main>', editorStart)
    const focusExit = WORKSTATION_SOURCE.indexOf('class="focus-exit-btn"')

    expect(focusExit).toBeGreaterThan(editorStart)
    expect(focusExit).toBeLessThan(editorEnd)
    expect(WORKSTATION_SOURCE).toMatch(/\.focus-exit-btn\s*\{[^}]*position:\s*absolute;/)
    expect(WORKSTATION_SOURCE).not.toMatch(/\.focus-exit-btn\s*\{[^}]*position:\s*fixed;/)
  })

  it('preserves requested split state and exposes the insufficient-space state', () => {
    const splitActionsStart = WORKSTATION_SOURCE.indexOf('class="split-pane-actions"')
    const splitPreviewContentStart = WORKSTATION_SOURCE.indexOf('ref="splitViewRightScrollRef"', splitActionsStart)
    const splitActionsSource = WORKSTATION_SOURCE.slice(splitActionsStart, splitPreviewContentStart)

    expect(WORKSTATION_SOURCE).toContain('class="split-view-unavailable"')
    expect(WORKSTATION_SOURCE).toContain(':aria-pressed="splitViewEnabled"')
    expect(WORKSTATION_SOURCE).toContain(':aria-expanded="isSplitViewActive"')
    expect(WORKSTATION_SOURCE).toContain('aria-controls="split-view-preview-pane"')
    expect(WORKSTATION_SOURCE).toContain('splitViewContainerRef.value?.clientWidth')
    expect(WORKSTATION_SOURCE).toContain('new ResizeObserver(updateSplitViewAvailability)')
    expect(WORKSTATION_SOURCE).not.toMatch(
      /function updateSplitViewAvailability\(\): void \{[\s\S]{0,500}?splitViewEnabled\.value = false/,
    )
    expect(WORKSTATION_SOURCE).not.toMatch(
      /if \(nextMode === 'preview' && splitViewEnabled\.value\) \{\s*splitViewEnabled\.value = false/,
    )
    expect(WORKSTATION_SOURCE).toMatch(
      /function toggleSplitView\(\): void \{[\s\S]*?void nextTick\(\(\) => \{\s*updateSplitViewAvailability\(\)/,
    )
    expect(splitActionsStart).toBeGreaterThan(-1)
    expect(splitPreviewContentStart).toBeGreaterThan(splitActionsStart)
    expect(splitActionsSource).toContain('<Link2')
    expect(splitActionsSource).toContain('<Unlink')
    expect(splitActionsSource).toContain('<X')
    expect(splitActionsSource).toContain('aria-label="关闭分栏视图"')
    expect(splitActionsSource).not.toContain('<svg')
  })

  it('uses the canonical platform preview in split and preview modes', () => {
    expect(WORKSTATION_SOURCE).not.toContain("import MarkdownPreview from '@/components/editor/MarkdownPreview.vue'")
    expect(WORKSTATION_SOURCE).not.toContain('<MarkdownPreview')
    expect(WORKSTATION_SOURCE.match(/v-html="previewHtml"/g)).toHaveLength(2)
    expect(WORKSTATION_SOURCE).toContain('surface-id="platform-preview"')
    expect(WORKSTATION_SOURCE).toContain(':payload="inspectorWidgetPayload"')
    expect(WORKSTATION_SOURCE).toContain("querySelector('.preview-content')")
  })

  it('keeps Ctrl+\\ as a Typora and Source toggle while Preview uses its own shortcut', () => {
    expect(WORKSTATION_SOURCE).toContain(
      "const EDITOR_MODE_CYCLE: readonly EditorMode[] = ['typora', 'source']",
    )
    expect(WORKSTATION_SOURCE).toContain("const previewBinding = getShortcutBinding('togglePreview', 'Ctrl+Shift+V')")
    expect(WORKSTATION_SOURCE).not.toContain(
      "const EDITOR_MODE_CYCLE = ['typora', 'source', 'preview']",
    )
  })

  it('keeps platform preview canvases explicitly scoped without flattening preset typography', () => {
    expect(WORKSTATION_SOURCE.match(/:data-platform="selectedPlatform"/g)?.length).toBeGreaterThanOrEqual(3)
    expect(INSPECTOR_WIDGET_CONTENT_SOURCE).toContain(
      ':data-platform="surfaceId === \'platform-preview\' ? payload.platform : undefined"',
    )
    expect(INSPECTOR_WIDGET_CONTENT_SOURCE).toContain(
      ':data-platform-editor-host="payload.platform"',
    )
    expect(WORKSTATION_SOURCE).not.toContain('.panel-stage .preview-content :deep(section)')
    expect(WORKSTATION_SOURCE).not.toMatch(
      /\.panel-stage[\s\S]{0,1200}?font-size:\s*\d+(?:\.\d+)?px\s*!important/,
    )
  })

  it('rebinds synchronized scrolling to the active editor surface', () => {
    expect(EDITOR_PANEL_SOURCE).toContain('ref="sourceModeLayoutRef"')
    expect(EDITOR_PANEL_SOURCE).toContain("querySelector<HTMLElement>('.cm-scroller')")
    expect(EDITOR_PANEL_SOURCE).toContain('findTypewriterScrollParent(editorDom)')
    expect(EDITOR_PANEL_SOURCE).toContain('getEditorScrollElement,')
    expect(WORKSTATION_SOURCE).toMatch(
      /\.split-pane-left\s*\{[\s\S]{0,240}?display:\s*flex;[\s\S]{0,160}?overflow:\s*hidden;/,
    )
    expect(WORKSTATION_SOURCE).toMatch(
      /@container \(max-width: 719px\)[\s\S]{0,180}?\.editor-split-shell\.active\s*\{[\s\S]{0,80}?display:\s*flex;/,
    )
    expect(WORKSTATION_SOURCE).toContain("editor: () => editorMode.value === 'typora' ? outlineEditor.value : undefined")
    expect(WORKSTATION_SOURCE).toMatch(
      /watch\(editorMode,[\s\S]{0,240}?splitSyncScroll\.rebind\(\)/,
    )
  })

  it('refreshes the live typewriter plugin when the cursor anchor changes', () => {
    expect(EDITOR_PANEL_SOURCE).toContain('TYPEWRITER_MODE_REFRESH_META')
    expect(EDITOR_PANEL_SOURCE).toMatch(
      /watch\([\s\S]{0,160}writingAssistStore\.cursorPosition[\s\S]{0,360}setMeta\(TYPEWRITER_MODE_REFRESH_META,\s*nextCursorPosition\)/,
    )
  })

  it('requests a typewriter realignment after asynchronous editor hydration settles', () => {
    expect(EDITOR_PANEL_SOURCE).toMatch(
      /await new Promise<void>\(\(resolve\) => requestAnimationFrame[\s\S]{0,700}?setMeta\(\s*TYPEWRITER_MODE_REFRESH_META,\s*currentHydration/,
    )
  })

  it('keeps every platform preview bound to a valid visibly selected preset', () => {
    expect(WORKSTATION_SOURCE).toContain('const platformPresetIds = ref<Record<Platform, string>>')
    expect(WORKSTATION_SOURCE).toContain('const selectedPreviewPresetId = computed')
    expect(WORKSTATION_SOURCE).toMatch(
      /function selectPreviewPlatform\(platform: Platform\): void \{[\s\S]{0,400}?defaultPlatform = platform[\s\S]{0,400}?defaultPresetId = selectedPreviewPresetId\.value/,
    )
    expect(WORKSTATION_SOURCE).toContain('defaultPresetId: selectedPreviewPresetId.value')
    expect(WORKSTATION_SOURCE).toContain(
      'articleTitle: currentContent.value?.title || selectedArticle.value?.title || undefined',
    )
    expect(WORKSTATION_SOURCE).toContain('articleCategory: articleCategory.value')
    expect(WORKSTATION_SOURCE).toContain(':class="{ active: selectedPreviewPresetId === preset.id }"')
  })

  it('projects the canonical selected preset and variant onto the live editing surface', () => {
    expect(EDITOR_PANEL_SOURCE).toContain('getPlatformPresets,')
    expect(EDITOR_PANEL_SOURCE).toContain('resolveVisualVariant,')
    expect(EDITOR_PANEL_SOURCE).toContain("from '@/services/export'")
    expect(EDITOR_PANEL_SOURCE).toContain('settingsStore.settings.export.defaultPresetId')
    expect(EDITOR_PANEL_SOURCE).toContain('resolveVisualVariant(editorPlatform.value, editorPresetId.value).variantId')
    expect(EDITOR_PANEL_SOURCE.match(/:data-preset-id="editorPresetId"/g)?.length).toBeGreaterThanOrEqual(2)
    expect(EDITOR_PANEL_SOURCE.match(/:data-visual-variant="editorVisualVariantId"/g)?.length).toBeGreaterThanOrEqual(2)
    expect(EDITOR_PANEL_SOURCE).toContain("'--paper-preset-accent': editorPresetAccent")
    expect(EDITOR_PANEL_SOURCE).toContain("'--paper-preset-text-accent': editorPresetTextAccent")
    expect(EDITOR_PANEL_SOURCE).toContain("'--paper-preset-font': editorPresetFontFamily")
    expect(EDITOR_PANEL_SOURCE).toContain('.editor-paper[data-visual-variant="machine-foundry"]')
    expect(EDITOR_PANEL_SOURCE).toContain('font-family: var(--paper-preset-font, var(--paper-font')
  })

  it('keeps one primary style selector and starts supported parameters in a collapsed advanced pane', () => {
    const selectorStart = WORKSTATION_SOURCE.indexOf('class="preset-strip"')
    const advancedStart = WORKSTATION_SOURCE.indexOf('class="inspector-advanced-settings"')
    const advancedEnd = WORKSTATION_SOURCE.indexOf('</details>', advancedStart)
    const advancedSource = WORKSTATION_SOURCE.slice(advancedStart, advancedEnd)

    expect(WORKSTATION_SOURCE.match(/class="preset-strip"/g)).toHaveLength(1)
    expect(selectorStart).toBeGreaterThan(-1)
    expect(advancedStart).toBeGreaterThan(selectorStart)
    expect(advancedEnd).toBeGreaterThan(advancedStart)
    expect(WORKSTATION_SOURCE.slice(advancedStart, WORKSTATION_SOURCE.indexOf('>', advancedStart))).not.toContain(' open')
    expect(advancedSource).toContain('高级排版参数')
    expect(advancedSource).toContain('版心宽度')
    expect(advancedSource).toContain('typographySliders')
    expect(advancedSource).toContain('首行缩进')
    expect(advancedSource).toContain('标题风格')
    expect(advancedSource).toContain('引用样式')
    expect(advancedSource).toContain('正文对齐')
    expect(advancedSource).toContain('标题层级')
    expect(advancedSource).toContain('分隔线')
    expect(advancedSource).toContain('图片')
    expect(advancedSource).toContain('font-family-group')
    expect(advancedSource).toContain('v-for="font in fontFamilyOptions"')
    expect(WORKSTATION_SOURCE).toContain('v-if="selectedPlatform === \'wechat\'"')
    expect(WORKSTATION_SOURCE).toContain('当前平台采用原生文本交付')
  })

  it('keeps one visible Stage component entry wired to the editor library', () => {
    expect(WORKSTATION_SOURCE).toContain('aria-label="打开组件库"')
    expect(WORKSTATION_SOURCE).toContain('@click="openWritingComponentLibrary"')
    expect(WORKSTATION_SOURCE).toContain('<Blocks :size="14" />')
    expect(WORKSTATION_SOURCE).toContain('组件')
    expect(EDITOR_PANEL_SOURCE).toContain('openComponentLibrary,')
    expect(EDITOR_PANEL_SOURCE).toContain('onComponentRequested: () => openComponentLibrary()')
    expect(EDITOR_PANEL_SOURCE).toContain('@insert="insertWritingComponent"')
    expect(EDITOR_PANEL_SOURCE).toContain('@request-image="requestContextImageInsert"')
  })

  it('projects canonical WeChat delivery slots around the editable document without persisting them', () => {
    const frontProjection = EDITOR_PANEL_SOURCE.indexOf('class="editor-delivery-projection editor-delivery-projection--front"')
    const editorMount = EDITOR_PANEL_SOURCE.indexOf('ref="editorContainerRef"', frontProjection)
    const endProjection = EDITOR_PANEL_SOURCE.indexOf('class="editor-delivery-projection editor-delivery-projection--end"', editorMount)

    expect(EDITOR_PANEL_SOURCE).toContain('resolveDeliveryAdornmentSlots(settingsStore.settings.export.deliveryAdornment)')
    expect(EDITOR_PANEL_SOURCE).toContain('wechatStats?: ExportStats')
    expect(EDITOR_PANEL_SOURCE).toContain("'全文统计待生成'")
    expect(EDITOR_PANEL_SOURCE).not.toContain('props.wechatStats?.wordCount ?? 0')
    expect(frontProjection).toBeGreaterThan(-1)
    expect(editorMount).toBeGreaterThan(frontProjection)
    expect(endProjection).toBeGreaterThan(editorMount)
    expect(EDITOR_PANEL_SOURCE).toContain('class="source-delivery-status"')
    expect(EDITOR_PANEL_SOURCE).toContain("emit('open-delivery-settings', 'song')")
    expect(EDITOR_PANEL_SOURCE).toContain("emit('open-delivery-settings', 'profile')")
    expect(WORKSTATION_SOURCE).toContain(':wechat-stats="editorWechatStats"')
    expect(WORKSTATION_SOURCE).toContain(':article-category="articleCategory"')
    expect(WORKSTATION_SOURCE).toContain('@open-delivery-settings="openDeliverySettings"')
    expect(WORKSTATION_SOURCE).toContain('<DeliverySettingsModal')
    expect(WORKSTATION_SOURCE).toContain(':model-value="settingsStore.settings.export.deliveryAdornment"')
    expect(WORKSTATION_SOURCE).toContain('@update:model-value="updateDeliveryAdornment"')
    expect(WORKSTATION_SOURCE).not.toContain('@open-delivery-settings="showExportModal = true"')
  })

  it('keeps rendering controls keyboard-explicit and owned by the installed icon system', () => {
    const accentStart = WORKSTATION_SOURCE.indexOf('class="accent-picker"')
    const presetStart = WORKSTATION_SOURCE.indexOf('class="preset-strip"', accentStart)
    const accentSource = WORKSTATION_SOURCE.slice(accentStart, presetStart)
    const advancedStart = WORKSTATION_SOURCE.indexOf('class="inspector-advanced-settings"')
    const advancedEnd = WORKSTATION_SOURCE.indexOf('</details>', advancedStart)
    const advancedSource = WORKSTATION_SOURCE.slice(advancedStart, advancedEnd)

    expect(accentStart).toBeGreaterThan(-1)
    expect(presetStart).toBeGreaterThan(accentStart)
    expect(accentSource).toContain('type="button"')
    expect(accentSource).toContain(':aria-label="color.label"')
    expect(accentSource).toContain(':aria-pressed="settingsStore.settings.appearance.accentColor === color.value"')
    expect(accentSource).toContain('<Check')
    expect(accentSource).not.toContain('<svg')
    expect(WORKSTATION_SOURCE).toMatch(/class="preset-chip"[\s\S]{0,160}?:aria-pressed="selectedPreviewPresetId === preset\.id"/)
    expect(WORKSTATION_SOURCE).toContain('class="preset-signature-card"')
    expect(WORKSTATION_SOURCE).toContain('selectedPresetSignatureHighlights')
    expect(WORKSTATION_SOURCE).toContain('getWechatRenderingRuleCatalog')
    expect(WORKSTATION_SOURCE).toContain(':data-rendering-rule-preset="selectedWechatRenderingRule?.presetId"')
    expect(WORKSTATION_SOURCE).toContain("{ label: '文末', value: rule.zones.ending }")
    expect(WORKSTATION_SOURCE).toContain('selectedPresetOption.visualSignature.modules')

    expect(advancedStart).toBeGreaterThan(-1)
    expect(advancedEnd).toBeGreaterThan(advancedStart)
    expect(advancedSource).toContain(':aria-label="ctrl.label"')
    expect(advancedSource).toContain('v-for="font in fontFamilyOptions"')
    expect(advancedSource).toContain(':aria-pressed="settingsStore.settings.appearance.fontFamily === font.value"')
    expect(advancedSource).toContain('v-for="style in headingStyles"')
    expect(advancedSource).toContain('v-for="style in blockquoteStyles"')
    expect(advancedSource).toContain('<Type')
    expect(advancedSource).not.toContain('<svg')
    expect(advancedSource).not.toContain('<label class="control-toggle">')
  })

  it('shares real inspector content across docked, floating, and native utility surfaces', () => {
    expect(WORKSTATION_SOURCE).toContain('class="inspector-widget-layer"')
    expect(WORKSTATION_SOURCE).toContain('class="floating-inspector-widget"')
    expect(WORKSTATION_SOURCE).toContain("surface-id=\"references\"")
    expect(WORKSTATION_SOURCE).toContain("surface-id=\"document-statistics\"")
    expect(WORKSTATION_SOURCE).toContain("detachInspectorWidgetToDesktop(surfaceId)")
    expect(WORKSTATION_SOURCE).toContain(':show-overview="false"')
    expect(APP_SOURCE).toMatch(/<InspectorUtilityView\s+v-if="inspectorWidgetRequest"/)
    expect(APP_SOURCE).toMatch(/<template v-else>\s*<TitleBar/)
    expect(INSPECTOR_UTILITY_SOURCE).toContain("await emit(INSPECTOR_WIDGET_EVENTS.ready")
    expect(INSPECTOR_UTILITY_SOURCE).toContain("await emit(INSPECTOR_WIDGET_EVENTS[action]")
    expect(INSPECTOR_UTILITY_SOURCE).not.toContain('await appWindow.emit(INSPECTOR_WIDGET_EVENTS')
    expect(WORKSTATION_SOURCE).not.toContain('已调度小组件同步')
    expect(WORKSTATION_SOURCE).not.toContain('同步小组件：')
  })

  it('keeps inspector widget placement changes visible, reversible, and animated', () => {
    const menuStart = WORKSTATION_SOURCE.indexOf('class="inspector-widget-menu-popover"')
    const menuEnd = WORKSTATION_SOURCE.indexOf('</Transition>', menuStart)
    const menuSource = WORKSTATION_SOURCE.slice(menuStart, menuEnd)

    expect(menuStart).toBeGreaterThan(-1)
    expect(menuEnd).toBeGreaterThan(menuStart)
    expect(menuSource).toContain('role="dialog"')
    expect(menuSource).toContain('检查器窗口')
    expect(menuSource).toContain(':data-capability-count="INSPECTOR_WIDGET_IDS.length"')
    expect(menuSource).toContain('v-for="surfaceId in INSPECTOR_WIDGET_IDS"')
    expect(menuSource).toContain(':data-capability-id="surfaceId"')
    expect(menuSource).toContain('<InspectorWidgetActions')
    expect(menuSource).toContain('@float="floatInspectorWidget(surfaceId)"')
    expect(menuSource).toContain('@native="void detachInspectorWidgetToDesktop(surfaceId)"')
    expect(menuSource).toContain('@dock="dockInspectorWidget(surfaceId)"')
    expect(menuSource).toContain('@close="closeInspectorWidget(surfaceId)"')

    expect(WORKSTATION_SOURCE).toContain('key="document-statistics-placeholder"')
    expect(WORKSTATION_SOURCE).toContain('key="references-placeholder"')
    expect(WORKSTATION_SOURCE).toContain('<TransitionGroup')
    expect(WORKSTATION_SOURCE).toContain('name="inspector-widget-float"')
    expect(WORKSTATION_SOURCE).toContain('name="inspector-widget-dock"')
    expect(WORKSTATION_SOURCE).toContain('.inspector-widget-float-enter-active')
    expect(WORKSTATION_SOURCE).toContain('.inspector-widget-dock-enter-active')
  })

  it('uses one effective app-or-OS reduced-motion contract for DOM and layout waits', () => {
    const transitionWaitStart = WORKSTATION_SOURCE.indexOf('function waitForManagerPanelTransition()')
    const transitionWaitEnd = WORKSTATION_SOURCE.indexOf(
      'async function restoreManagerPanelEditorAnchor',
      transitionWaitStart,
    )
    const transitionWaitSource = WORKSTATION_SOURCE.slice(transitionWaitStart, transitionWaitEnd)

    expect(WORKSTATION_SOURCE).toMatch(
      /const effectiveReducedMotion = computed\(\s*\(\) =>[\s\S]{0,180}?settingsStore\.settings\.appearance\.reducedMotion[\s\S]{0,80}?\|\|[\s\S]{0,80}?osPrefersReducedMotion\.value/,
    )
    expect(WORKSTATION_SOURCE).toContain("reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')")
    expect(WORKSTATION_SOURCE).toContain("reducedMotionMediaQuery.addEventListener('change', handleReducedMotionPreferenceChange)")
    expect(WORKSTATION_SOURCE).toContain("reducedMotionMediaQuery?.removeEventListener('change', handleReducedMotionPreferenceChange)")
    expect(WORKSTATION_SOURCE).toContain("'reduce-motion': effectiveReducedMotion")
    expect(WORKSTATION_SOURCE).toContain(":data-reduced-motion=\"effectiveReducedMotion ? 'true' : 'false'\"")
    expect(APP_SOURCE).toContain("const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')")
    expect(APP_SOURCE).toContain('settingsStore.settings.appearance.reducedMotion || reducedMotionQuery.matches')
    expect(APP_SOURCE).toContain("reducedMotionQuery.addEventListener('change', handleReducedMotionChange)")
    expect(APP_SOURCE).toContain("reducedMotionQuery.removeEventListener('change', handleReducedMotionChange)")
    expect(APP_SOURCE).toContain('.reduce-motion *')
    expect(APP_SOURCE).toContain('[data-reduced-motion="true"] *')

    expect(transitionWaitStart).toBeGreaterThan(-1)
    expect(transitionWaitEnd).toBeGreaterThan(transitionWaitStart)
    expect(transitionWaitSource).toContain('effectiveReducedMotion.value')
    expect(transitionWaitSource).toContain('window.getComputedStyle(panel)')
    expect(transitionWaitSource).toContain('transitionTotalMs <= 0')
    expect(transitionWaitSource).not.toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches")
    expect(transitionWaitSource).not.toContain('setTimeout(finish, 700)')
  })

  it('keeps the approved shell rows keyboard-semantic and restores lifecycle focus', () => {
    const keydownStart = WORKSTATION_SOURCE.indexOf('function handleKeydown(e: KeyboardEvent)')
    const keydownEnd = WORKSTATION_SOURCE.indexOf('async function syncRouteArticleSelection', keydownStart)
    const keydownSource = WORKSTATION_SOURCE.slice(keydownStart, keydownEnd)

    expect(WORKSTATION_SOURCE).toMatch(
      /<button\s+v-if="stageCollapsed"\s+type="button"\s+class="stage-collapsed-bar"[\s\S]{0,160}?@click="setStageCollapsed\(false\)"/,
    )
    expect(WORKSTATION_SOURCE).toMatch(
      /<button\s+v-if="inspectorCollapsed"\s+type="button"\s+class="inspector-collapsed-bar"[\s\S]{0,160}?@click="setInspectorCollapsed\(false\)"/,
    )
    expect(WORKSTATION_SOURCE).toContain('@click="setStageCollapsed(true)"')
    expect(WORKSTATION_SOURCE).toContain('@click="setInspectorCollapsed(true)"')
    expect(WORKSTATION_SOURCE).toContain('managerPanelRef.value?.contains(document.activeElement)')

    expect(WORKSTATION_SOURCE).toContain(':aria-expanded="inspectorWidgetMenuOpen"')
    expect(WORKSTATION_SOURCE).toContain('aria-controls="inspector-widget-menu-popover"')
    expect(WORKSTATION_SOURCE).toContain('id="inspector-widget-menu-popover"')
    expect(WORKSTATION_SOURCE).toContain('@click.stop="toggleInspectorWidgetMenu"')
    expect(WORKSTATION_SOURCE).toContain("setInspectorWidgetMenuOpen(false, { restoreFocus: true })")
    expect(WORKSTATION_SOURCE).toContain(':data-inspector-widget-id="surfaceId"')
    expect(WORKSTATION_SOURCE).toContain('if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus()')
    expect(WORKSTATION_SOURCE).toContain("focusNativeWindow('main')")
    expect(WORKSTATION_SOURCE).toContain('void restoreInspectorWidgetSourceFocus(true)')
    expect(INSPECTOR_UTILITY_SOURCE).toContain('ref="firstControlRef"')
    expect(INSPECTOR_UTILITY_SOURCE).toContain('firstControlRef.value?.focus()')
    expect(INSPECTOR_UTILITY_SOURCE).toContain("window.addEventListener('keydown', handleKeydown)")
    expect(INSPECTOR_UTILITY_SOURCE).toContain("window.removeEventListener('keydown', handleKeydown)")
    expect(INSPECTOR_UTILITY_SOURCE).toMatch(/event\.key !== 'Escape'[\s\S]{0,180}?void closeWindow\('close'\)/)

    expect(keydownStart).toBeGreaterThan(-1)
    expect(keydownEnd).toBeGreaterThan(keydownStart)
    expect(keydownSource).toContain('if (e.defaultPrevented || e.isComposing)')
    expect(keydownSource.indexOf("e.key === 'Escape' && inspectorWidgetMenuOpen.value"))
      .toBeLessThan(keydownSource.indexOf("e.key === 'Escape' && isFocusMode.value"))
    expect(WORKSTATION_SOURCE).not.toMatch(/create(?:Manager|Stage)Window/)
  })

  it('keeps many references in a readable independently scrolling panel', () => {
    expect(INSPECTOR_WIDGET_CONTENT_SOURCE).toMatch(
      /\.widget-content--references\.widget-content--panel\s*\{[^}]*height:\s*clamp\(240px,\s*44vh,\s*420px\);/,
    )
    expect(INSPECTOR_WIDGET_CONTENT_SOURCE).toMatch(
      /\.widget-reference-list\s*\{[^}]*flex:\s*1;[^}]*min-height:\s*0;[^}]*overflow:\s*auto;/,
    )
    expect(INSPECTOR_WIDGET_CONTENT_SOURCE).toMatch(
      /\.widget-reference-copy span\s*\{[^}]*overflow-wrap:\s*anywhere;/,
    )
  })

  it('keeps local export and channel publishing as separate actions', () => {
    const exportStart = WORKSTATION_SOURCE.indexOf('async function openExportModal()')
    const exportEnd = WORKSTATION_SOURCE.indexOf('function openDeliverySettings', exportStart)
    const exportSource = WORKSTATION_SOURCE.slice(exportStart, exportEnd)

    expect(WORKSTATION_SOURCE).toContain('function openPublishCenter()')
    expect(WORKSTATION_SOURCE).toContain("path: '/publish'")
    expect(WORKSTATION_SOURCE).toContain('@click="openPublishCenter"')
    expect(WORKSTATION_SOURCE).toContain('@click="openExportModal"')
    expect(exportSource).toContain('await flushPendingEditorChangesBeforeRoute()')
    expect(exportSource.indexOf('await flushPendingEditorChangesBeforeRoute()'))
      .toBeLessThan(exportSource.indexOf('showExportModal.value = true'))
    expect(WORKSTATION_SOURCE).not.toMatch(/class="publish-btn"[\s\S]{0,160}?@click="showExportModal = true"/)
  })

  it('copies the selected platform native artifact instead of preview HTML', () => {
    const copyStart = WORKSTATION_SOURCE.indexOf('async function handleCopyToClipboard()')
    const copyEnd = WORKSTATION_SOURCE.indexOf('function toggleFocusMode()', copyStart)
    const copySource = WORKSTATION_SOURCE.slice(copyStart, copyEnd)

    expect(copyStart).toBeGreaterThan(-1)
    expect(copyEnd).toBeGreaterThan(copyStart)
    expect(copySource).toContain('await flushPendingEditorChangesBeforeRoute()')
    expect(copySource.indexOf('await flushPendingEditorChangesBeforeRoute()'))
      .toBeLessThan(copySource.indexOf('const markdown = normalizedBody.value'))
    expect(copySource).toContain('const markdown = normalizedBody.value')
    expect(copySource).toContain('if (!markdown.trim())')
    expect(WORKSTATION_SOURCE).toContain('const platformArtifactOptions = computed<NativeExportOptions>')
    expect(WORKSTATION_SOURCE).toContain(
      'articleTitle: currentContent.value?.title || selectedArticle.value?.title || undefined',
    )
    expect(WORKSTATION_SOURCE).toContain('articleCategory: articleCategory.value')
    expect(WORKSTATION_SOURCE).toContain('deliveryAdornment: parseDeliveryAdornmentConfig(exportSettings.deliveryAdornment)')
    expect(WORKSTATION_SOURCE).toContain('getNativeExportOptions: () => platformArtifactOptions.value')
    expect(copySource).toContain('await convertToNativeFormat(markdown, platform, platformArtifactOptions.value)')
    expect(copySource).toContain("result.format === 'html'")
    expect(copySource).toContain('copyWechatHtmlToClipboard(result.content)')
    expect(copySource).toContain('copyTextToClipboard(result.content)')
    expect(copySource).toContain('bytes: new Blob([result.content]).size')
    expect(copySource).not.toContain('previewHtml.value')
    expect(WORKSTATION_SOURCE).not.toContain('copyToClipboard,')
    expect(WORKSTATION_SOURCE).toContain("wechat: '复制微信富文本'")
    expect(WORKSTATION_SOURCE).toContain("xiaohongshu: '复制小红书文本'")
    expect(WORKSTATION_SOURCE).toContain("zhihu: '复制知乎 Markdown'")
  })

  it('restores the core layout even when the optional Inspector event bridge fails', () => {
    const mountedStart = WORKSTATION_SOURCE.indexOf('onMounted(() => {')
    const mountedEnd = WORKSTATION_SOURCE.indexOf('\nonUnmounted(() => {', mountedStart)
    const mountedSource = WORKSTATION_SOURCE.slice(mountedStart, mountedEnd)

    expect(mountedSource).toContain('void initializeLayoutPersistence()')
    expect(mountedSource).toContain('void initializeInspectorWidgetEvents()')
    expect(mountedSource).not.toContain('.then(() => initializeLayoutPersistence())')
  })
})
