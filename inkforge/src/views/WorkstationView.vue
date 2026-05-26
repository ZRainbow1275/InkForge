<script setup lang="ts">
/**
 * WorkstationView - InkForge 宸ヤ綔绔?(v2)
 *
 * 鍥涙爮鍔ㄦ€佸姏鍦哄竷灞€锛歁anager | Editor | Stage | Inspector
 * 璁捐璇█锛欵thereal Constructivism
 *
 * 闈㈡澘鎶樺彔/灞曞紑 + 蹇嵎閿?+ 涓撴敞妯″紡 + 澶氬钩鍙伴瑙?
 */
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { Editor as TiptapEditor } from '@tiptap/core'
import { useEditorStore } from '@/stores/editor'
import { useArticleStore } from '@/stores/article'
import { useSettingsStore } from '@/stores/settings'
import { useCrashRecoveryStore } from '@/stores/crashRecovery'
import { useWritingAssistStore } from '@/stores/writingAssist'
import { useCommandPaletteStore } from '@/stores/command-palette'
import { useProfileStore } from '@/stores/profile'
import { useLayoutPersistenceStore } from '@/stores/layoutPersistence'
import { useTocStore } from '@/stores/toc'
import { useWorkstationTabsStore } from '@/stores/workstationTabs'
import type { WorkstationTabDocType } from '@/stores/workstationTabs'
import type { WorkstationCommandBridge } from '@/types/command-palette'
import {
  copyToClipboard,
  getPlatformPresets,
  type Platform,
} from '@/services/export'
import { usePreviewRenderer } from '@/composables/usePreviewRenderer'
import {
  computeContentWordCount,
  computeWritingWindowStats,
  type WritingGoalProgress,
  type WritingWindowEntry,
} from '@/composables/useTextStats'
import { logger } from '@/services/error'
import { DEFAULT_PROFILE_ID } from '@/services/profile/types'
import { layoutPersistenceService, type LayoutStatePatch, type LayoutStateRecord, type SerializedTab } from '@/services/layout-persistence'
import type { Article } from '@/schemas/article'
import { FONT_STACKS } from '@/constants'
import { isDraftBoxStatus } from '@/core/lifecycle'
import { useTypography } from '@/composables/useTypography'
import { useSyncScroll } from '@/composables/useSyncScroll'
import { useEdgeMagnetism } from '@/composables/useEdgeMagnetism'
import { resolveExportIcon } from '@/utils/iconography'
import {
  type EditorMode,
  type EditorWidth,
  type TyporaSyncState,
  isLikelyHtmlContent,
  serializeHtmlToMarkdown,
} from '@/extensions/TyporaMode'

// 鈹€鈹€鈹€ 瀛愮粍浠?鈹€鈹€鈹€
import FileManager from '@/components/file/FileManager.vue'
import VersionPanel from '@/components/version/VersionPanel.vue'
import OutlinePanel from '@/components/outline/OutlinePanel.vue'
import EditorPanel from '@/components/editor/EditorPanel.vue'
import EditorStatusBar from '@/components/editor/EditorStatusBar.vue'
import MarkdownPreview from '@/components/editor/MarkdownPreview.vue'
import WritingAssistPanel from '@/components/editor/WritingAssistPanel.vue'
import FocusSessionSummaryModal from '@/components/editor/FocusSessionSummaryModal.vue'
import AssetManager from '@/components/asset/AssetManager.vue'
import ExportModal from '@/components/export/ExportModal.vue'
import TagBrowser from '@/components/tag-system/TagBrowser.vue'

// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
// Router & Stores
// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

const router = useRouter()
const route = useRoute()
const editorStore = useEditorStore()
const articleStore = useArticleStore()
const settingsStore = useSettingsStore()
const crashRecoveryStore = useCrashRecoveryStore()
const writingAssistStore = useWritingAssistStore()
const commandPaletteStore = useCommandPaletteStore()
const profileStore = useProfileStore()
const layoutPersistenceStore = useLayoutPersistenceStore()
const tocStore = useTocStore()
const workstationTabsStore = useWorkstationTabsStore()
workstationTabsStore.initialize()

const {
  status: editorStatus,
  currentContent,
} = storeToRefs(editorStore)

const { articles, selectedArticle, selectedArticleId } = storeToRefs(articleStore)
const {
  primaryPendingPayload,
  pendingRecoveryCount,
  restoringKey,
  error: crashRecoveryError,
  shouldEnterSafeMode,
} = storeToRefs(crashRecoveryStore)

const routeArticleId = computed<string | null>(() => {
  const rawId = route.query.id
  const normalizedId = Array.isArray(rawId) ? rawId[0] : rawId
  return typeof normalizedId === 'string' && normalizedId.trim().length > 0
    ? normalizedId
    : null
})

// 鈹€鈹€鈹€ EditorPanel ref (鏆撮湶 bodyEditor 缁?OutlinePanel) 鈹€鈹€鈹€
interface EditorPanelExpose {
  getBodyEditor?: () => TiptapEditor | undefined
  getEditorScrollElement?: () => HTMLElement | null
  flushPendingChanges?: () => Promise<void>
}

const editorPanelRef = ref<EditorPanelExpose | null>(null)
const outlineEditor = computed(() => editorPanelRef.value?.getBodyEditor?.())

type CompatibleEditorSettings = typeof settingsStore.settings.editor & {
  editorMode?: EditorMode
  editorWidth?: EditorWidth
}

const EDITOR_MODE_STORAGE_KEY = 'inkforge.editor.editorMode'
const LAST_NON_PREVIEW_EDITOR_MODE_STORAGE_KEY = 'inkforge.editor.lastNonPreviewMode'
const EDITOR_WIDTH_STORAGE_KEY = 'inkforge.editor.editorWidth'
const MODE_LAYOUTS_STORAGE_KEY = 'inkforge.workstation.modeLayouts'
const WORKSTATION_PANEL_WIDTHS_STORAGE_KEY = 'inkforge.workstation.panelWidths'
const EDITOR_MODE_VALUES = ['typora', 'source', 'preview'] as const
const NON_PREVIEW_EDITOR_MODE_VALUES = ['typora', 'source'] as const
const EDITOR_MODE_CYCLE = ['typora', 'source', 'preview'] as const
const EDITOR_WIDTH_CYCLE = ['narrow', 'medium', 'wide', 'full'] as const
const editorSettingsCompat = computed(() => settingsStore.settings.editor as CompatibleEditorSettings)
type NonPreviewEditorMode = typeof NON_PREVIEW_EDITOR_MODE_VALUES[number]
type WorkstationModeLayout = {
  managerCollapsed: boolean
  stageCollapsed: boolean
  inspectorCollapsed: boolean
}
type WorkstationModeLayouts = Record<EditorMode, WorkstationModeLayout>
type WorkstationPanelKey = 'manager' | 'stage' | 'inspector'
type WorkstationPanelWidths = Record<WorkstationPanelKey, number>
type WorkstationLayoutPresetId = 'default' | 'writing' | 'review' | 'focus'

const SPLIT_VIEW_MIN_RATIO = 0.2
const SPLIT_VIEW_MAX_RATIO = 0.8
const SPLIT_VIEW_DEFAULT_RATIO = 0.5
const SPLIT_VIEW_RATIO_STEP = 0.02
const SPLIT_VIEW_RESPONSIVE_BREAKPOINT = 900
const SPLIT_VIEW_FONT_MIN = 12
const SPLIT_VIEW_FONT_MAX = 24

interface WorkstationLayoutPreset {
  id: WorkstationLayoutPresetId
  label: string
  description: string
  layout: WorkstationModeLayout
  widths: WorkstationPanelWidths
  focusMode: boolean
}

const WORKSTATION_PANEL_WIDTH_LIMITS: Record<WorkstationPanelKey, { default: number; min: number; max: number }> = {
  manager: { default: 280, min: 220, max: 380 },
  stage: { default: 320, min: 280, max: 520 },
  inspector: { default: 260, min: 240, max: 460 },
}

const FOCUS_MODE_LAYOUT: WorkstationModeLayout = {
  managerCollapsed: true,
  stageCollapsed: true,
  inspectorCollapsed: true,
}

function cloneModeLayout(layout: WorkstationModeLayout): WorkstationModeLayout {
  return {
    managerCollapsed: layout.managerCollapsed,
    stageCollapsed: layout.stageCollapsed,
    inspectorCollapsed: layout.inspectorCollapsed,
  }
}

function createDefaultModeLayouts(): WorkstationModeLayouts {
  return {
    typora: {
      managerCollapsed: false,
      stageCollapsed: true,
      inspectorCollapsed: true,
    },
    source: {
      managerCollapsed: false,
      stageCollapsed: true,
      inspectorCollapsed: true,
    },
    preview: {
      managerCollapsed: true,
      stageCollapsed: true,
      inspectorCollapsed: true,
    },
  }
}

function createDefaultPanelWidths(): WorkstationPanelWidths {
  return {
    manager: WORKSTATION_PANEL_WIDTH_LIMITS.manager.default,
    stage: WORKSTATION_PANEL_WIDTH_LIMITS.stage.default,
    inspector: WORKSTATION_PANEL_WIDTH_LIMITS.inspector.default,
  }
}

function clampPanelWidth(panel: WorkstationPanelKey, value: unknown): number {
  const limits = WORKSTATION_PANEL_WIDTH_LIMITS[panel]
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(limits.max, Math.max(limits.min, value))
    : limits.default
}

const WORKSTATION_LAYOUT_PRESETS: WorkstationLayoutPreset[] = [
  {
    id: 'default',
    label: '默认',
    description: '展开完整四栏工作台，并使用舒展的默认面板宽度',
    layout: { managerCollapsed: false, stageCollapsed: false, inspectorCollapsed: false },
    widths: createDefaultPanelWidths(),
    focusMode: false,
  },
  {
    id: 'writing',
    label: '写作',
    description: '保留文件管理与检查器，收起预览栏并扩大正文区域',
    layout: { managerCollapsed: false, stageCollapsed: true, inspectorCollapsed: false },
    widths: { manager: 280, stage: 320, inspector: 260 },
    focusMode: false,
  },
  {
    id: 'review',
    label: '审阅',
    description: '展开全部面板并加宽检查器，便于排版与发布复核',
    layout: { managerCollapsed: false, stageCollapsed: false, inspectorCollapsed: false },
    widths: { manager: 280, stage: 380, inspector: 400 },
    focusMode: false,
  },
  {
    id: 'focus',
    label: '专注',
    description: '复用现有专注模式，进入纯写作视图',
    layout: FOCUS_MODE_LAYOUT,
    widths: createDefaultPanelWidths(),
    focusMode: true,
  },
]

function isModeLayoutCandidate(value: unknown): value is WorkstationModeLayout {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  return typeof candidate.managerCollapsed === 'boolean'
    && typeof candidate.stageCollapsed === 'boolean'
    && typeof candidate.inspectorCollapsed === 'boolean'
}

function readEditorPreference<T extends string>(
  key: string,
  validValues: readonly T[],
  fallback: T,
): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw && validValues.includes(raw as T)) {
      return raw as T
    }
  } catch {
    // localStorage 涓嶅彲鐢ㄦ椂鍥為€€榛樿鍊?
  }

  return fallback
}

function writeEditorPreference(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 闈欓粯鍥為€€鍒拌繍琛屾椂鍐呭瓨鐘舵€?
  }
}

function readModeLayoutsPreference(): WorkstationModeLayouts {
  const fallback = createDefaultModeLayouts()

  try {
    const raw = localStorage.getItem(MODE_LAYOUTS_STORAGE_KEY)
    if (!raw) {
      return fallback
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>
    const nextLayouts = createDefaultModeLayouts()
    for (const mode of EDITOR_MODE_VALUES) {
      const candidate = parsed?.[mode]
      if (isModeLayoutCandidate(candidate)) {
        nextLayouts[mode] = cloneModeLayout(candidate)
      }
    }
    return nextLayouts
  } catch {
    return fallback
  }
}

function writeModeLayoutsPreference(layouts: WorkstationModeLayouts): void {
  try {
    localStorage.setItem(MODE_LAYOUTS_STORAGE_KEY, JSON.stringify(layouts))
  } catch {
    // 闈欓粯鍥為€€鍒拌繍琛屾椂鍐呭瓨鐘舵€?
  }
}

function readPanelWidthsPreference(): WorkstationPanelWidths {
  const fallback = createDefaultPanelWidths()

  try {
    const raw = localStorage.getItem(WORKSTATION_PANEL_WIDTHS_STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      manager: clampPanelWidth('manager', parsed.manager),
      stage: clampPanelWidth('stage', parsed.stage),
      inspector: clampPanelWidth('inspector', parsed.inspector),
    }
  } catch {
    return fallback
  }
}

function writePanelWidthsPreference(widths: WorkstationPanelWidths): void {
  try {
    localStorage.setItem(WORKSTATION_PANEL_WIDTHS_STORAGE_KEY, JSON.stringify(widths))
  } catch {
    // 闈㈡澘瀹藉害鍋忓ソ涓嶅奖鍝嶆枃妗ｇ紪杈戯紝澶辫触鏃朵粎淇濇寔杩愯鏃剁姸鎬併€?
  }
}

const lastNonPreviewMode = ref<NonPreviewEditorMode>(
  readEditorPreference(LAST_NON_PREVIEW_EDITOR_MODE_STORAGE_KEY, NON_PREVIEW_EDITOR_MODE_VALUES, 'typora'),
)

const editorMode = computed<EditorMode>({
  get() {
    const runtimeValue = editorSettingsCompat.value.editorMode
    if (runtimeValue === 'typora' || runtimeValue === 'source' || runtimeValue === 'preview') {
      return runtimeValue
    }

    return readEditorPreference(EDITOR_MODE_STORAGE_KEY, EDITOR_MODE_VALUES, 'typora')
  },
  set(value) {
    editorSettingsCompat.value.editorMode = value
    writeEditorPreference(EDITOR_MODE_STORAGE_KEY, value)
    if (value !== 'preview') {
      lastNonPreviewMode.value = value
      writeEditorPreference(LAST_NON_PREVIEW_EDITOR_MODE_STORAGE_KEY, value)
    }
  },
})

const editorWidth = computed<EditorWidth>({
  get() {
    const runtimeValue = editorSettingsCompat.value.editorWidth
    if (runtimeValue === 'narrow' || runtimeValue === 'medium' || runtimeValue === 'wide' || runtimeValue === 'full') {
      return runtimeValue
    }

    return readEditorPreference(EDITOR_WIDTH_STORAGE_KEY, ['narrow', 'medium', 'wide', 'full'], 'medium')
  },
  set(value) {
    editorSettingsCompat.value.editorWidth = value
    writeEditorPreference(EDITOR_WIDTH_STORAGE_KEY, value)
  },
})

const editorSyncState = ref<TyporaSyncState>('offline')

function handleEditorSyncStateChange(nextState: TyporaSyncState): void {
  editorSyncState.value = nextState
}

async function toggleEditorMode(): Promise<void> {
  await cycleEditorMode(1)
}

async function toggleEditorModeReverse(): Promise<void> {
  await cycleEditorMode(-1)
}

const isPreviewMode = computed(() => editorMode.value === 'preview')
const canUseSplitView = computed(() => !isPreviewMode.value && splitViewWideEnough.value)
const isSplitViewActive = computed(() => splitViewEnabled.value && canUseSplitView.value)
const showStagePanel = computed(() => editorMode.value !== 'source' && editorMode.value !== 'preview' && !isSplitViewActive.value)

async function enterPreviewMode(): Promise<void> {
  await switchEditorMode('preview')
}

async function exitPreviewMode(targetMode: NonPreviewEditorMode = lastNonPreviewMode.value): Promise<void> {
  await switchEditorMode(targetMode)
}

async function togglePreviewMode(): Promise<void> {
  if (editorMode.value === 'preview') {
    await exitPreviewMode()
    return
  }

  await enterPreviewMode()
}

async function handleModeSelection(nextMode: EditorMode): Promise<void> {
  await switchEditorMode(nextMode)
}

async function cycleEditorMode(direction: 1 | -1): Promise<void> {
  const currentIndex = EDITOR_MODE_CYCLE.indexOf(editorMode.value)
  const nextIndex = (currentIndex + direction + EDITOR_MODE_CYCLE.length) % EDITOR_MODE_CYCLE.length
  await switchEditorMode(EDITOR_MODE_CYCLE[nextIndex])
}

function cycleEditorWidth(direction: 1 | -1): void {
  const currentIndex = EDITOR_WIDTH_CYCLE.indexOf(editorWidth.value)
  const nextIndex = (currentIndex + direction + EDITOR_WIDTH_CYCLE.length) % EDITOR_WIDTH_CYCLE.length
  editorWidth.value = EDITOR_WIDTH_CYCLE[nextIndex]
  scheduleLayoutPersistenceSave()
}

const editorWidthOptions: { value: EditorWidth; label: string; title: string }[] = [
  { value: 'narrow', label: '窄', title: '窄版心 560px' },
  { value: 'medium', label: '中', title: '中版心 680px' },
  { value: 'wide', label: '宽', title: '宽版心 860px' },
  { value: 'full', label: '全', title: '全宽（占满可用宽度）' },
]

// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
// 闈㈡澘鐘舵€?
// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

/** 宸︽爮鎶樺彔 */
const managerCollapsed = ref(false)
/** 棰勮鏍忔姌鍙?*/
const stageCollapsed = ref(false)
/** 鍙虫爮鎶樺彔 */
const inspectorCollapsed = ref(true)
const inspectorPinned = ref(false)
/** 涓撴敞妯″紡 (浠呯紪杈戝櫒鍙) */
const isFocusMode = ref(false)
const showFocusSummary = ref(false)
const modeLayouts = ref<WorkstationModeLayouts>(readModeLayoutsPreference())
const panelWidths = ref<WorkstationPanelWidths>(readPanelWidthsPreference())
const activeLayoutPresetId = ref<WorkstationLayoutPresetId>('default')
const isApplyingModeLayout = ref(false)
const focusModeRestoreLayout = ref<WorkstationModeLayout | null>(null)
const splitViewEnabled = ref(false)
const splitViewRatio = ref(SPLIT_VIEW_DEFAULT_RATIO)
const splitViewSyncScroll = ref(true)
const splitViewLeftFontScale = ref(16)
const splitViewRightFontScale = ref(16)
const splitViewWideEnough = ref(true)
const splitViewContainerRef = ref<HTMLElement | null>(null)
const splitViewLeftPaneRef = ref<HTMLElement | null>(null)
const splitViewRightPaneRef = ref<HTMLElement | null>(null)
const splitViewRightScrollRef = ref<HTMLElement | null>(null)
const isDraggingSplitDivider = ref(false)
const inspectorPanelEl = ref<HTMLElement | null>(null)

const isReviewLayout = computed(() => activeLayoutPresetId.value === 'review')
const inspectorMagnetismForceCollapsed = computed(() => isFocusMode.value || isReviewLayout.value || isPreviewMode.value)
const inspectorMagnetismPaused = computed(() => isFocusMode.value)

const edgeMagnetism = useEdgeMagnetism(inspectorPanelEl, {
  triggerWidth: 48,
  triggerHoldMs: 200,
  collapseDistance: 480,
  collapseDelayMs: 600,
  initialCollapsed: true,
  forceCollapsed: inspectorMagnetismForceCollapsed,
  pinned: inspectorPinned,
  paused: inspectorMagnetismPaused,
})

watch(edgeMagnetism.collapsed, (next) => {
  if (next !== inspectorCollapsed.value) {
    inspectorCollapsed.value = next
  }
})

watch(inspectorCollapsed, (next) => {
  if (next !== edgeMagnetism.collapsed.value) {
    edgeMagnetism.setCollapsed(next)
  }
})

function withSuspendedLayoutPersistence(callback: () => void): void {
  isApplyingModeLayout.value = true
  try {
    callback()
  } finally {
    isApplyingModeLayout.value = false
  }
}

function clampSplitRatio(value: number): number {
  return Math.min(SPLIT_VIEW_MAX_RATIO, Math.max(SPLIT_VIEW_MIN_RATIO, value))
}

function clampSplitFontScale(value: number): number {
  return Math.min(SPLIT_VIEW_FONT_MAX, Math.max(SPLIT_VIEW_FONT_MIN, value))
}

function createCurrentModeLayout(): WorkstationModeLayout {
  return {
    managerCollapsed: managerCollapsed.value,
    stageCollapsed: stageCollapsed.value,
    inspectorCollapsed: inspectorCollapsed.value,
  }
}

function getPersistableCurrentLayout(): WorkstationModeLayout {
  return focusModeRestoreLayout.value
    ? cloneModeLayout(focusModeRestoreLayout.value)
    : createCurrentModeLayout()
}

function applyModeLayout(layout: WorkstationModeLayout): void {
  withSuspendedLayoutPersistence(() => {
    managerCollapsed.value = layout.managerCollapsed
    stageCollapsed.value = layout.stageCollapsed
    inspectorCollapsed.value = layout.inspectorCollapsed
  })
}

function saveLayoutForMode(
  mode: EditorMode,
  layout: WorkstationModeLayout = getPersistableCurrentLayout(),
): void {
  modeLayouts.value = {
    ...modeLayouts.value,
    [mode]: cloneModeLayout(layout),
  }
  writeModeLayoutsPreference(modeLayouts.value)
  scheduleLayoutPersistenceSave()
}

function restoreLayoutForMode(mode: EditorMode): void {
  applyModeLayout(modeLayouts.value[mode] ?? createDefaultModeLayouts()[mode])
}

function applyPanelWidths(widths: WorkstationPanelWidths): void {
  panelWidths.value = {
    manager: clampPanelWidth('manager', widths.manager),
    stage: clampPanelWidth('stage', widths.stage),
    inspector: clampPanelWidth('inspector', widths.inspector),
  }
  writePanelWidthsPreference(panelWidths.value)
  scheduleLayoutPersistenceSave()
}


function getLayoutPersistenceProfileId(): string {
  return profileStore.activeProfileId ?? DEFAULT_PROFILE_ID
}

function toLayoutPersistenceModeLayouts(layouts: WorkstationModeLayouts = modeLayouts.value): LayoutStateRecord['modeLayouts'] {
  return {
    typora: { ...layouts.typora, rightPanelMode: 'inspector' },
    source: { ...layouts.source, rightPanelMode: 'inspector' },
    preview: { ...layouts.preview, rightPanelMode: 'inspector' },
  }
}

function fromLayoutPersistenceModeLayouts(record: LayoutStateRecord): WorkstationModeLayouts {
  return {
    typora: cloneModeLayout(record.modeLayouts.typora),
    source: cloneModeLayout(record.modeLayouts.source),
    preview: cloneModeLayout(record.modeLayouts.preview),
  }
}

function getSessionRestoreTabs(): SerializedTab[] {
  return workstationTabsStore.serializeForLayout()
}

function captureLayoutPersistencePatch(): LayoutStatePatch {
  const openTabs = getSessionRestoreTabs()

  return {
    managerCollapsed: managerCollapsed.value,
    stageCollapsed: stageCollapsed.value,
    inspectorCollapsed: inspectorCollapsed.value,
    rightPanelMode: 'inspector',
    managerTab: managerTab.value,
    editorMode: editorMode.value,
    editorWidth: editorWidth.value,
    modeLayouts: toLayoutPersistenceModeLayouts(),
    panelWidths: { ...panelWidths.value },
    openTabs,
    tabOrder: openTabs.map(tab => tab.id),
    activeTabId: workstationTabsStore.activeTabId,
    activeArticleId: selectedArticleId.value ?? workstationTabsStore.activeTab?.articleId ?? null,
    statusBarVisible: !isFocusMode.value,
    splitViewEnabled: splitViewEnabled.value,
    splitViewRatio: splitViewRatio.value,
    splitViewSyncScroll: splitViewSyncScroll.value,
    splitViewLeftFontScale: splitViewLeftFontScale.value,
    splitViewRightFontScale: splitViewRightFontScale.value,
  }
}

function scheduleLayoutPersistenceSave(): void {
  if (isApplyingModeLayout.value) {
    return
  }

  layoutPersistenceStore.scheduleSave(captureLayoutPersistencePatch(), getLayoutPersistenceProfileId())
}

function flushSessionRestoreSnapshot(reason: string): void {
  try {
    scheduleLayoutPersistenceSave()
    void layoutPersistenceStore.flushScheduledSave().catch(error => {
      logger.warn('workstation.sessionRestore.flush.failed', {
        reason,
        error: error instanceof Error ? error.message : String(error),
      })
    })
  } catch (error) {
    logger.warn('workstation.sessionRestore.flush.failed', {
      reason,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

function handlePageHide(): void {
  flushSessionRestoreSnapshot('pagehide')
}

function handleVisibilityChange(): void {
  if (document.visibilityState === 'hidden') {
    flushSessionRestoreSnapshot('visibilitychange')
  }
}
function getSplitLeftScrollElement(): HTMLElement | null {
  return editorPanelRef.value?.getEditorScrollElement?.() ?? splitViewLeftPaneRef.value
}

function getSplitRightScrollElement(): HTMLElement | null {
  return splitViewRightScrollRef.value ?? splitViewRightPaneRef.value
}

function getSplitPreviewRootElement(): HTMLElement | null {
  return splitViewRightScrollRef.value?.querySelector('.markdown-preview') ?? splitViewRightScrollRef.value
}

const splitSyncScroll = useSyncScroll({
  enabled: computed(() => splitViewSyncScroll.value),
  active: computed(() => isSplitViewActive.value),
  leftScrollElement: getSplitLeftScrollElement,
  rightScrollElement: getSplitRightScrollElement,
  previewRootElement: getSplitPreviewRootElement,
  editor: () => outlineEditor.value,
  headings: () => tocStore.flatHeadings,
  onBeforeRebuild(editor) {
    tocStore.updateFromEditor(editor)
  },
  onLoopDetected() {
    splitViewSyncScroll.value = false
    scheduleLayoutPersistenceSave()
    logger.warn('workstation.syncScroll.loopDetected')
  },
})

function applyPersistedLayoutTabs(record: LayoutStateRecord): string | null {
  const articlesById = new Map(articleStore.articles.map(article => [article.id, article]))
  const validation = layoutPersistenceService.validateSerializedTabs(record.openTabs, record.activeTabId, Array.from(articlesById.keys()))
  const openTabs = validation.openTabs.map(tab => ({
    ...tab,
    title: articlesById.get(tab.articleId)?.title ?? tab.title,
  }))

  workstationTabsStore.restoreFromLayout(openTabs, validation.activeTabId)

  if (validation.removedTabIds.length > 0) {
    logger.warn('workstation.sessionRestore.removedMissingTabs', {
      removedTabIds: validation.removedTabIds,
    })
  }

  const activeTabArticleId = openTabs.find(tab => tab.id === validation.activeTabId)?.articleId ?? null
  const persistedActiveArticleId = record.activeArticleId && articlesById.has(record.activeArticleId)
    ? record.activeArticleId
    : null
  return activeTabArticleId ?? persistedActiveArticleId ?? openTabs[0]?.articleId ?? null
}

function applyPersistedLayoutRecord(record: LayoutStateRecord): void {
  let nextActiveArticleId: string | null = null

  withSuspendedLayoutPersistence(() => {
    editorMode.value = record.editorMode
    editorWidth.value = record.editorWidth
    modeLayouts.value = fromLayoutPersistenceModeLayouts(record)
    writeModeLayoutsPreference(modeLayouts.value)
    managerTab.value = record.managerTab
    applyPanelWidths(record.panelWidths)
    managerCollapsed.value = record.managerCollapsed
    stageCollapsed.value = record.stageCollapsed
    inspectorCollapsed.value = record.inspectorCollapsed
    splitViewEnabled.value = record.splitViewEnabled
    splitViewRatio.value = clampSplitRatio(record.splitViewRatio)
    splitViewSyncScroll.value = record.splitViewSyncScroll
    splitViewLeftFontScale.value = clampSplitFontScale(record.splitViewLeftFontScale)
    splitViewRightFontScale.value = clampSplitFontScale(record.splitViewRightFontScale)
    nextActiveArticleId = applyPersistedLayoutTabs(record)
  })

  if (nextActiveArticleId && hasArticle(nextActiveArticleId)) {
    articleStore.selectArticle(nextActiveArticleId)
  }
}

async function initializeLayoutPersistence(): Promise<void> {
  const profileId = getLayoutPersistenceProfileId()
  try {
    const result = await layoutPersistenceStore.initialize(profileId)
    if (result.record) {
      applyPersistedLayoutRecord(result.record)
    }
    await layoutPersistenceStore.cleanupStaleLayouts(profileId)
  } catch (error) {
    logger.warn('workstation.layoutPersistence.restore.failed', {
      profileId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

function setSplitViewRatio(nextRatio: number): void {
  splitViewRatio.value = clampSplitRatio(nextRatio)
  scheduleLayoutPersistenceSave()
}

function toggleSplitView(): void {
  if (isPreviewMode.value || !splitViewWideEnough.value) {
    splitViewEnabled.value = false
    scheduleLayoutPersistenceSave()
    return
  }

  splitViewEnabled.value = !splitViewEnabled.value
  scheduleLayoutPersistenceSave()
}

function toggleSplitViewSyncScroll(): void {
  splitViewSyncScroll.value = !splitViewSyncScroll.value
  scheduleLayoutPersistenceSave()
  if (splitViewSyncScroll.value) {
    void nextTick(() => {
      splitSyncScroll.scheduleRebuild(0)
      splitSyncScroll.alignFromLeft()
    })
  }
}

function resetSplitViewRatio(): void {
  setSplitViewRatio(SPLIT_VIEW_DEFAULT_RATIO)
}

function updateSplitViewAvailability(): void {
  if (typeof window === 'undefined') return
  splitViewWideEnough.value = window.innerWidth >= SPLIT_VIEW_RESPONSIVE_BREAKPOINT
  if (!splitViewWideEnough.value && splitViewEnabled.value) {
    splitViewEnabled.value = false
    scheduleLayoutPersistenceSave()
  }
}

function updateSplitViewRatioFromPointer(clientX: number): void {
  const container = splitViewContainerRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  if (rect.width <= 0) return
  setSplitViewRatio((clientX - rect.left) / rect.width)
}

function handleSplitDividerPointerMove(event: PointerEvent): void {
  if (!isDraggingSplitDivider.value) return
  event.preventDefault()
  updateSplitViewRatioFromPointer(event.clientX)
}

function stopSplitDividerDrag(): void {
  isDraggingSplitDivider.value = false
  if (typeof document !== 'undefined') {
    document.body.classList.remove('split-view-resizing')
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointermove', handleSplitDividerPointerMove)
    window.removeEventListener('pointerup', stopSplitDividerDrag)
  }
}

function startSplitDividerDrag(event: PointerEvent): void {
  event.preventDefault()
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  isDraggingSplitDivider.value = true
  document.body.classList.add('split-view-resizing')
  updateSplitViewRatioFromPointer(event.clientX)
  window.addEventListener('pointermove', handleSplitDividerPointerMove)
  window.addEventListener('pointerup', stopSplitDividerDrag, { once: true })
}

function handleSplitDividerKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    setSplitViewRatio(splitViewRatio.value - SPLIT_VIEW_RATIO_STEP)
    return
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    setSplitViewRatio(splitViewRatio.value + SPLIT_VIEW_RATIO_STEP)
    return
  }
  if (event.key === 'Home') {
    event.preventDefault()
    setSplitViewRatio(SPLIT_VIEW_MIN_RATIO)
    return
  }
  if (event.key === 'End') {
    event.preventDefault()
    setSplitViewRatio(SPLIT_VIEW_MAX_RATIO)
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    resetSplitViewRatio()
  }
}

// ── Inspector resize (drag handle) ──
const isDraggingInspector = ref(false)

function handleInspectorResizeMove(event: PointerEvent): void {
  if (!isDraggingInspector.value) return
  event.preventDefault()
  const container = document.querySelector('.main-content') as HTMLElement | null
  if (!container) return
  const rect = container.getBoundingClientRect()
  const newWidth = rect.right - event.clientX
  panelWidths.value = {
    ...panelWidths.value,
    inspector: clampPanelWidth('inspector', newWidth),
  }
}

function stopInspectorResize(): void {
  isDraggingInspector.value = false
  if (typeof document !== 'undefined') {
    document.body.classList.remove('split-view-resizing')
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointermove', handleInspectorResizeMove)
    window.removeEventListener('pointerup', stopInspectorResize)
  }
  writePanelWidthsPreference(panelWidths.value)
}

function startInspectorResize(event: PointerEvent): void {
  event.preventDefault()
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  isDraggingInspector.value = true
  document.body.classList.add('split-view-resizing')
  window.addEventListener('pointermove', handleInspectorResizeMove)
  window.addEventListener('pointerup', stopInspectorResize, { once: true })
}

function resetInspectorWidth(): void {
  panelWidths.value = {
    ...panelWidths.value,
    inspector: WORKSTATION_PANEL_WIDTH_LIMITS.inspector.default,
  }
  writePanelWidthsPreference(panelWidths.value)
}

function applyLayoutPreset(presetId: WorkstationLayoutPresetId): void {
  const preset = WORKSTATION_LAYOUT_PRESETS.find(item => item.id === presetId)
  if (!preset) return

  activeLayoutPresetId.value = preset.id

  if (preset.focusMode) {
    enterFocusMode()
    return
  }

  if (isFocusMode.value) {
    isFocusMode.value = false
    focusModeRestoreLayout.value = null
  }

  applyPanelWidths(preset.widths)
  applyModeLayout(preset.layout)
  saveLayoutForMode(editorMode.value, preset.layout)
}

async function switchEditorMode(nextMode: EditorMode): Promise<void> {
  const currentMode = editorMode.value
  if (nextMode === currentMode) {
    return
  }

  saveLayoutForMode(currentMode)

  if (nextMode === 'preview' && currentMode !== 'preview') {
    await editorPanelRef.value?.flushPendingChanges?.()
  }

  editorMode.value = nextMode
  if (nextMode === 'preview' && splitViewEnabled.value) {
    splitViewEnabled.value = false
  }

  showModeSwitchToast(nextMode)

  const nextLayout = cloneModeLayout(modeLayouts.value[nextMode] ?? createDefaultModeLayouts()[nextMode])
  if (isFocusMode.value) {
    focusModeRestoreLayout.value = nextLayout
    applyModeLayout(FOCUS_MODE_LAYOUT)
    scheduleLayoutPersistenceSave()
    return
  }

  focusModeRestoreLayout.value = null
  applyModeLayout(nextLayout)
  scheduleLayoutPersistenceSave()
}

const modeSwitchToast = ref<{ message: string; visible: boolean }>({ message: '', visible: false })
let modeSwitchToastTimer: ReturnType<typeof setTimeout> | null = null

function showModeSwitchToast(mode: EditorMode): void {
  const messageMap: Record<EditorMode, string> = {
    typora: '已切换到 Typora · Ctrl+\\ 切换源码',
    source: '已切换到源码模式 · Ctrl+\\ 切回 Typora',
    preview: '已进入预览模式 · Ctrl+Shift+V 返回',
  }
  modeSwitchToast.value = { message: messageMap[mode] ?? '', visible: true }
  if (modeSwitchToastTimer) {
    clearTimeout(modeSwitchToastTimer)
  }
  modeSwitchToastTimer = setTimeout(() => {
    modeSwitchToast.value = { ...modeSwitchToast.value, visible: false }
    modeSwitchToastTimer = null
  }, 2400)
}

function enterFocusMode(): void {
  if (isFocusMode.value) {
    return
  }

  focusModeRestoreLayout.value = createCurrentModeLayout()
  writingAssistStore.enterFocusMode(
    currentDocumentWordCount.value,
    writingGoalProgress.value.dailyPercent ?? 0,
  )
  showFocusSummary.value = false
  isFocusMode.value = true
  applyModeLayout(FOCUS_MODE_LAYOUT)
}

function exitFocusMode(): void {
  if (!isFocusMode.value) {
    return
  }

  const restoreLayout = focusModeRestoreLayout.value
    ? cloneModeLayout(focusModeRestoreLayout.value)
    : cloneModeLayout(modeLayouts.value[editorMode.value])
  const dailyPercent = writingGoalProgress.value.dailyPercent ?? 0
  const summary = writingAssistStore.exitFocusMode(
    currentDocumentWordCount.value,
    dailyPercent,
    dailyPercent >= 100,
  )

  isFocusMode.value = false
  focusModeRestoreLayout.value = null
  showFocusSummary.value = Boolean(summary)
  applyModeLayout(restoreLayout)
  saveLayoutForMode(editorMode.value, restoreLayout)
}

function closeFocusSummary(): void {
  showFocusSummary.value = false
  writingAssistStore.dismissSummary()
}

function returnHubFromFocusSummary(): void {
  closeFocusSummary()
  handleBack()
}

function toggleTypewriterMode(): void {
  settingsStore.settings.editor.typewriterMode = !settingsStore.settings.editor.typewriterMode
}

// 鈹€鈹€鈹€ 宸︽爮 Tab 鈹€鈹€鈹€
type ManagerTab = 'files' | 'versions' | 'outline' | 'tags'
const managerTab = ref<ManagerTab>('files')

// 鈹€鈹€鈹€ 鍙虫爮 Tab 鈹€鈹€鈹€锛堝凡鏀逛负婊氬姩寮?section锛屼笉鍐嶉渶瑕?tab 鍒囨崲锛?

// 鈹€鈹€鈹€ 排版风格涓昏壊閫夋嫨 鈹€鈹€鈹€
const accentColors = [
  { value: '#D32F2F', label: 'Constructive Red' },
  { value: '#1565C0', label: 'Swiss Blue' },
  { value: '#7B1FA2', label: 'Classic Purple' },
  { value: '#00796B', label: '墨青' },
  { value: '#263238', label: '雅黑' },
]

function selectAccentColor(color: string): void {
  settingsStore.settings.appearance.accentColor = color
}

// 鈹€鈹€鈹€ 鎺掔増棰勮蹇€熷垏鎹?鈹€鈹€鈹€
// ─── 排版预设快速切换（平台感知） ───
// 替换原 themePresets.slice(0, 5) 的硬编码上限；按当前选中平台动态返回全部预设：
// - wechat: 12 个
// - xiaohongshu: 5 个（xhs-*）
// - zhihu: 3 个（zhihu-*）
// Inspector 排版策略条消费此数据（双行 chip：name + persona 微标签）。
const topPresets = computed<Array<{ id: string; name: string; icon?: string; description?: string; persona?: string }>>(() => {
  const presets = getPlatformPresets(selectedPlatform.value)
  return presets.map(p => ({
    id: p.id,
    name: p.name,
    icon: p.icon,
    description: p.description,
    persona: p.persona,
  }))
})

function applyPreset(presetId: string): void {
  settingsStore.settings.export.defaultPresetId = presetId
}

// 鈹€鈹€鈹€ 鎺掔増鎺у埗锛坈omposable锛?鈹€鈹€鈹€
const {
  typography,
  sliderControls: typographySliders,
  updateTypography,
} = useTypography()

const headingStyles: { value: 'underline' | 'background' | 'border-left' | 'none'; label: string }[] = [
  { value: 'none', label: '无' },
  { value: 'underline', label: '下划线' },
  { value: 'background', label: '背景' },
  { value: 'border-left', label: '左侧边线' },
]

// 鈹€鈹€鈹€ 寮曠敤鍧楅鏍?鈹€鈹€鈹€
const blockquoteStyles: { value: 'classic' | 'modern' | 'minimal'; label: string }[] = [
  { value: 'classic', label: '经典' },
  { value: 'modern', label: '现代' },
  { value: 'minimal', label: '极简' },
]

// 鈹€鈹€鈹€ 字体鎺у埗 鈹€鈹€鈹€
const fontFamilyMap: Record<string, string> = {
  serif: FONT_STACKS.serif,
  sans: FONT_STACKS.sans,
  kai: 'KaiTi, STKaiti, "AR PL UKai CN", serif',
  mono: FONT_STACKS.mono,
}

const currentFontStack = computed(() => {
  const key = settingsStore.settings.appearance.fontFamily
  return fontFamilyMap[key] ?? FONT_STACKS.sans
})

// 鈹€鈹€鈹€ 骞冲彴閫夋嫨 鈹€鈹€鈹€
const selectedPlatform = ref<Platform>('wechat')

const platformOptions: { value: Platform; label: string }[] = [
  { value: 'wechat', label: '微信' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'zhihu', label: '知乎' },
]

// 鈹€鈹€鈹€ 鏍囬缂栬緫 鈹€鈹€鈹€
const isEditingTitle = ref(false)
const editTitleValue = ref('')

function startEditTitle() {
  editTitleValue.value = currentContent.value?.title ?? ''
  isEditingTitle.value = true
}

function confirmEditTitle() {
  isEditingTitle.value = false
  const newTitle = editTitleValue.value.trim()
  if (newTitle && newTitle !== currentContent.value?.title) {
    editorStore.updateContent({ title: newTitle })
  }
}

function cancelEditTitle() {
  isEditingTitle.value = false
}

// 鈹€鈹€鈹€ 导出妯℃€?鈹€鈹€鈹€
const showExportModal = ref(false)

// 鈹€鈹€鈹€ 澶嶅埗鍙嶉 鈹€鈹€鈹€
const copySuccess = ref(false)
let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined

// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
// 淇濆瓨鐘舵€佹枃妗?
// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?


const recoveryBannerPayload = computed(() => primaryPendingPayload.value)
const recoveryBannerArticle = computed(() => recoveryBannerPayload.value?.payload.activeArticle ?? null)
const recoverySavedAtText = computed(() => {
  const savedAt = recoveryBannerPayload.value?.payload.savedAt
  return savedAt ? new Date(savedAt).toLocaleString() : ''
})
const recoveryLostCharactersText = computed(() => {
  const activeArticle = recoveryBannerArticle.value
  if (!activeArticle) {
    return '0'
  }

  return String(Math.max(0, activeArticle.omittedLength))
})
const isRestoringPrimaryRecovery = computed(() => {
  const key = recoveryBannerPayload.value?.key
  return Boolean(key && restoringKey.value === key)
})

async function restorePrimaryRecoveryPayload(): Promise<void> {
  const key = recoveryBannerPayload.value?.key
  if (!key) return
  await crashRecoveryStore.restorePayload(key)
}

function dismissPrimaryRecoveryPayload(): void {
  const key = recoveryBannerPayload.value?.key
  if (!key) return
  crashRecoveryStore.dismissPayload(key)
}
const saveStatusText = computed<string>(() => {
  if (editorStatus.value === 'error') return '保存失败'
  if (editorStatus.value === 'loading') return '加载中…'
  if (editorStatus.value === 'idle') return '就绪'
  if (editorStatus.value === 'saving') return '保存中…'
  if (editorSyncState.value === 'syncing') return '同步中…'
  if (editorSyncState.value === 'synced') return '已同步 · 已保存'
  return '已保存'
})

const normalizedBody = computed(() => {
  const rawBody = currentContent.value?.body ?? ''
  return isLikelyHtmlContent(rawBody) ? serializeHtmlToMarkdown(rawBody) : rawBody
})

watch(
  () => [normalizedBody.value, isSplitViewActive.value, splitViewRatio.value, editorMode.value] as const,
  () => {
    if (isSplitViewActive.value && splitViewSyncScroll.value) {
      splitSyncScroll.scheduleRebuild()
    }
  },
  { flush: 'post' },
)

watch(outlineEditor, () => {
  if (isSplitViewActive.value && splitViewSyncScroll.value) {
    splitSyncScroll.scheduleRebuild(0)
  }
})

watch(splitViewSyncScroll, (enabled) => {
  if (enabled && isSplitViewActive.value) {
    void nextTick(() => {
      splitSyncScroll.scheduleRebuild(0)
      splitSyncScroll.alignFromLeft()
    })
  }
})

function toProgressPercent(current: number, target: number | undefined): number | undefined {
  if (!target || target < 1) {
    return undefined
  }

  return Math.max(0, Math.min(100, Math.round((current / target) * 100)))
}

const currentDocumentWordCount = computed(() => computeContentWordCount(normalizedBody.value))

const writingWindowEntries = computed<WritingWindowEntry[]>(() => {
  const activeArticleId = selectedArticleId.value ?? routeArticleId.value
  const entries: WritingWindowEntry[] = articles.value.map(article => {
    if (!activeArticleId || article.id !== activeArticleId) {
      return {
        rawContent: article.rawContent,
        updatedAt: article.updatedAt,
        createdAt: article.createdAt,
      }
    }

    return {
      rawContent: normalizedBody.value,
      updatedAt: article.updatedAt ?? article.createdAt ?? new Date(),
      createdAt: article.createdAt,
    }
  })

  if (
    activeArticleId
    && !entries.some(entry => 'id' in entry && entry.id === activeArticleId)
    && normalizedBody.value.trim().length > 0
  ) {
    entries.push({
      rawContent: normalizedBody.value,
      updatedAt: new Date(),
    })
  }

  return entries
})

const writingWindowStats = computed(() => computeWritingWindowStats(writingWindowEntries.value))

const writingGoalProgress = computed<WritingGoalProgress>(() => {
  const goal = settingsStore.settings.writingGoal

  return {
    documentTarget: goal.documentTarget,
    dailyTarget: goal.dailyTarget,
    weeklyTarget: goal.weeklyTarget,
    currentDocumentWords: currentDocumentWordCount.value,
    todayWords: writingWindowStats.value.todayWords,
    weeklyWords: writingWindowStats.value.weeklyWords,
    documentPercent: toProgressPercent(currentDocumentWordCount.value, goal.documentTarget),
    dailyPercent: toProgressPercent(writingWindowStats.value.todayWords, goal.dailyTarget),
    weeklyPercent: toProgressPercent(writingWindowStats.value.weeklyWords, goal.weeklyTarget),
  }
})

watch(
  () => ({
    currentDocWords: currentDocumentWordCount.value,
    todayWords: writingWindowStats.value.todayWords,
    weeklyWords: writingWindowStats.value.weeklyWords,
    documentTarget: settingsStore.settings.writingGoal.documentTarget,
  }),
  nextStats => writingAssistStore.updateStats(nextStats),
  { immediate: true },
)

const activeArticleStatus = computed(() => selectedArticle.value?.status ?? null)
const pendingWorkstationCloseTabId = ref<string | null>(null)

function getWorkstationTabDocType(article: Article): WorkstationTabDocType {
  return isDraftBoxStatus(article.status) ? 'draft' : 'article'
}

const selectedArticleTabIdentity = computed(() => {
  const article = selectedArticle.value
  if (!article) {
    return null
  }

  return {
    id: article.id,
    title: article.title,
    docType: getWorkstationTabDocType(article),
  }
})

function hasArticle(articleId: string): boolean {
  return articles.value.some(article => article.id === articleId)
}

function replaceWorkstationRouteArticle(articleId: string): void {
  if (route.name === 'Workstation' && routeArticleId.value === articleId) {
    return
  }

  void router.replace({
    name: 'Workstation',
    query: {
      ...route.query,
      id: articleId,
    },
  })
}

function activateWorkstationTab(tabId: string): void {
  const tab = workstationTabsStore.activateTab(tabId)
  if (!tab || !hasArticle(tab.articleId)) {
    return
  }

  if (selectedArticleId.value !== tab.articleId) {
    articleStore.selectArticle(tab.articleId)
  }
  replaceWorkstationRouteArticle(tab.articleId)
}

function closeWorkstationTab(tabId: string): void {
  if (tabId === selectedArticleId.value && editorStatus.value === 'saving') {
    pendingWorkstationCloseTabId.value = tabId
    return
  }

  if (
    tabId === selectedArticleId.value
    && editorStatus.value === 'error'
    && typeof window !== 'undefined'
    && !window.confirm('The active document save failed. Close this tab anyway?')
  ) {
    return
  }

  const result = workstationTabsStore.closeTab(tabId)
  if (!result) {
    return
  }

  if (result.nextActiveTabId) {
    activateWorkstationTab(result.nextActiveTabId)
    return
  }

  void router.push({ name: 'Hub' })
}

function closeActiveWorkstationTab(): void {
  const activeId = workstationTabsStore.activeTabId
  if (activeId) {
    closeWorkstationTab(activeId)
  }
}

function restoreClosedWorkstationTab(): void {
  const restored = workstationTabsStore.restoreRecentlyClosed()
  if (!restored) {
    return
  }

  if (!hasArticle(restored.articleId)) {
    workstationTabsStore.closeTab(restored.id, { remember: false })
    return
  }

  activateWorkstationTab(restored.id)
}

function handleWorkstationTabShortcut(event: KeyboardEvent): boolean {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) {
    return false
  }

  if (event.key === 'Tab') {
    event.preventDefault()
    const nextTab = workstationTabsStore.cycleActiveTab(event.shiftKey ? -1 : 1)
    if (nextTab) {
      activateWorkstationTab(nextTab.id)
    }
    return true
  }

  const normalizedKey = normalizeShortcutKey(event)
  if (!normalizedKey) {
    return false
  }

  if (!event.shiftKey && normalizedKey === 'W') {
    event.preventDefault()
    closeActiveWorkstationTab()
    return true
  }

  if (event.shiftKey && normalizedKey === 'T') {
    event.preventDefault()
    restoreClosedWorkstationTab()
    return true
  }

  if (!event.shiftKey && /^[1-9]$/u.test(normalizedKey)) {
    event.preventDefault()
    const targetTab = workstationTabsStore.activateTabAtShortcutIndex(Number(normalizedKey))
    if (targetTab) {
      activateWorkstationTab(targetTab.id)
    }
    return true
  }

  return false
}


function openWritingGoalSettings(): void {
  void router.push({
    path: '/settings',
    query: {
      tab: 'editor',
      section: 'writing-goal',
    },
  })
}

function openEditorSettings(): void {
  void router.push({
    path: '/settings',
    query: {
      tab: 'editor',
    },
  })
}

async function openDocumentStatusTarget(): Promise<void> {
  const flushPendingChanges = editorPanelRef.value?.flushPendingChanges
  if (flushPendingChanges) {
    try {
      await flushPendingChanges()
    } catch (error) {
      logger.warn('[Workstation] status-bar navigation flush failed; continuing route change', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (activeArticleStatus.value && isDraftBoxStatus(activeArticleStatus.value)) {
    await router.push({ name: 'Drafts' })
    return
  }

  await router.push({ name: 'Hub' })
}

// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
// 棰勮娓叉煋锛堟櫤鑳介槻鎶?composable锛?
// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

const { previewHtml, previewLoading, lastRenderTime, previewMeta } = usePreviewRenderer({
  body: computed(() => normalizedBody.value),
  platform: selectedPlatform,
  getExportSettings: () => ({ ...settingsStore.settings.export }),
  getAppearance: () => ({
    accentColor: settingsStore.settings.appearance.accentColor,
    fontFamily: settingsStore.settings.appearance.fontFamily,
  }),
})

// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
// 引用链接鎻愬彇
// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

interface ExtractedLink {
  text: string
  href: string
}

const extractedLinks = computed<ExtractedLink[]>(() => {
  const body = normalizedBody.value
  if (!body) return []

  const links: ExtractedLink[] = []
  const seen = new Set<string>()
  let match: RegExpExecArray | null

  // Pattern 1: [text](url) 鈥?鏍囧噯 Markdown 閾炬帴
  const mdLinkRegex = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g
  while ((match = mdLinkRegex.exec(body)) !== null) {
    const href = match[2]
    if (!seen.has(href)) {
      seen.add(href)
      links.push({ text: match[1] || href, href })
    }
  }

  // Pattern 2: <url> 鈥?鑷姩閾炬帴
  const autoLinkRegex = /<(https?:\/\/[^>]+)>/g
  while ((match = autoLinkRegex.exec(body)) !== null) {
    const href = match[1]
    if (!seen.has(href)) {
      seen.add(href)
      links.push({ text: href, href })
    }
  }

  // Pattern 3: [ref]: url 鈥?寮曠敤寮忛摼鎺ュ畾涔?
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

// 鈹€鈹€鈹€ 閾炬帴澶嶅埗鍙嶉 鈹€鈹€鈹€
const copiedLinkIndex = ref<number | null>(null)
let linkCopyTimer: ReturnType<typeof setTimeout> | undefined

async function copyLinkToClipboard(href: string, index: number): Promise<void> {
  try {
    await navigator.clipboard.writeText(href)
    copiedLinkIndex.value = index
    clearTimeout(linkCopyTimer)
    linkCopyTimer = setTimeout(() => {
      copiedLinkIndex.value = null
    }, 1500)
  } catch {
    // 闈欓粯澶勭悊
  }
}

// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
// 鎿嶄綔
// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

function handleBack() {
  router.push('/')
}

async function handleSave() {
  if (!editorStore.isReady) return
  await editorPanelRef.value?.flushPendingChanges?.()
}

async function handleCopyToClipboard() {
  if (!previewHtml.value) return
  const ok = await copyToClipboard(previewHtml.value)
  if (ok) {
    copySuccess.value = true
    clearTimeout(copyFeedbackTimer)
    copyFeedbackTimer = setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  }
}

function toggleFocusMode() {
  if (isFocusMode.value) {
    exitFocusMode()
    return
  }

  enterFocusMode()
}

function toggleManagerPanel() {
  managerCollapsed.value = !managerCollapsed.value
}

// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
// 蹇嵎閿?
// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

function normalizeShortcutKey(event: KeyboardEvent): string | null {
  if (event.code.startsWith('Key')) {
    return event.code.slice(3).toUpperCase()
  }

  if (event.code.startsWith('Digit')) {
    return event.code.slice(5)
  }

  if (event.code === 'Backslash') {
    return '\\'
  }

  if (event.code === 'Space') {
    return 'Space'
  }

  if (event.key.startsWith('Arrow')) {
    return event.key.replace('Arrow', '')
  }

  if (/^F\d{1,2}$/u.test(event.key)) {
    return event.key.toUpperCase()
  }

  if (event.key.length === 1) {
    return event.key.toUpperCase()
  }

  if (event.key === 'Esc') {
    return 'Escape'
  }

  return event.key || null
}

function matchesShortcut(event: KeyboardEvent, binding: string | undefined): boolean {
  if (!binding) {
    return false
  }

  const normalizedKey = normalizeShortcutKey(event)
  if (!normalizedKey) {
    return false
  }

  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) {
    parts.push('Ctrl')
  }
  if (event.shiftKey) {
    parts.push('Shift')
  }
  if (event.altKey) {
    parts.push('Alt')
  }
  parts.push(normalizedKey)

  return parts.join('+') === binding
}

function getShortcutBinding(shortcutId: string, fallback: string): string {
  const binding = settingsStore.settings.shortcuts[shortcutId]
  return typeof binding === 'string' && binding.trim().length > 0 ? binding : fallback
}

function handleKeydown(e: KeyboardEvent) {
  if (e.isComposing) {
    return
  }

  if (e.key === 'Escape' && showFocusSummary.value) {
    e.preventDefault()
    closeFocusSummary()
    return
  }

  if (handleWorkstationTabShortcut(e)) {
    return
  }

  const saveBinding = getShortcutBinding('save', 'Ctrl+S')
  const outlineBinding = getShortcutBinding('toggleOutline', 'Ctrl+Shift+O')
  const focusBinding = getShortcutBinding('focusMode', 'F11')
  const typewriterBinding = getShortcutBinding('typewriterMode', 'F9')
  const splitViewBinding = getShortcutBinding('toggleSplitView', 'Ctrl+Shift+E')
  const sidebarBinding = getShortcutBinding('toggleSidebar', 'Ctrl+Shift+B')
  const previewBinding = getShortcutBinding('togglePreview', 'Ctrl+Shift+V')
  const editorModeBinding = getShortcutBinding('toggleEditorMode', 'Ctrl+\\')
  const editorModeReverseBinding = getShortcutBinding('toggleEditorModeReverse', 'Ctrl+Shift+\\')
  const setTyporaBinding = getShortcutBinding('setTyporaMode', 'Ctrl+Alt+T')
  const setSourceBinding = getShortcutBinding('setSourceMode', 'Ctrl+Alt+S')
  const setPreviewBinding = getShortcutBinding('setPreviewMode', 'Ctrl+Alt+P')
  const paperWidthNextBinding = getShortcutBinding('paperWidthNext', 'Ctrl+=')
  const paperWidthPrevBinding = getShortcutBinding('paperWidthPrev', 'Ctrl+-')

  if (matchesShortcut(e, saveBinding)) {
    e.preventDefault()
    void handleSave()
    return
  }

  if (matchesShortcut(e, outlineBinding)) {
    e.preventDefault()
    if (managerCollapsed.value) {
      managerCollapsed.value = false
    }
    managerTab.value = 'outline'
    return
  }

  // Escape 閫€鍑轰笓娉ㄦā寮?
  if (e.key === 'Escape' && isFocusMode.value) {
    e.preventDefault()
    exitFocusMode()
    return
  }

  if (matchesShortcut(e, focusBinding)) {
    e.preventDefault()
    toggleFocusMode()
    return
  }

  if (matchesShortcut(e, typewriterBinding)) {
    e.preventDefault()
    toggleTypewriterMode()
    return
  }

  if (matchesShortcut(e, previewBinding)) {
    e.preventDefault()
    void togglePreviewMode()
    return
  }

  if (matchesShortcut(e, setTyporaBinding)) {
    e.preventDefault()
    void switchEditorMode('typora')
    return
  }

  if (matchesShortcut(e, setSourceBinding)) {
    e.preventDefault()
    void switchEditorMode('source')
    return
  }

  if (matchesShortcut(e, setPreviewBinding)) {
    e.preventDefault()
    void switchEditorMode('preview')
    return
  }

  if (matchesShortcut(e, editorModeBinding)) {
    const selection = document.getSelection()
    if (selection && selection.type === 'Range' && String(selection).trim().length > 0) {
      return
    }

    e.preventDefault()
    void toggleEditorMode()
    return
  }

  if (matchesShortcut(e, editorModeReverseBinding)) {
    const selection = document.getSelection()
    if (selection && selection.type === 'Range' && String(selection).trim().length > 0) {
      return
    }

    e.preventDefault()
    void toggleEditorModeReverse()
    return
  }

  if (matchesShortcut(e, splitViewBinding)) {
    e.preventDefault()
    toggleSplitView()
    return
  }

  if (matchesShortcut(e, sidebarBinding)) {
    e.preventDefault()
    toggleManagerPanel()
    return
  }

  if (matchesShortcut(e, paperWidthNextBinding)) {
    e.preventDefault()
    cycleEditorWidth(1)
    return
  }

  if (matchesShortcut(e, paperWidthPrevBinding)) {
    e.preventDefault()
    cycleEditorWidth(-1)
    return
  }
}

function syncRouteArticleSelection(targetArticleId: string | null): void {
  if (!targetArticleId || selectedArticleId.value === targetArticleId) {
    return
  }

  const hasMatchingArticle = articleStore.articles.some(article => article.id === targetArticleId)
  if (!hasMatchingArticle) {
    return
  }

  articleStore.selectArticle(targetArticleId)
}

watch(
  [routeArticleId, () => articleStore.articles.length],
  ([nextRouteArticleId]) => {
    syncRouteArticleSelection(nextRouteArticleId)
  },
  { immediate: true },
)

watch(
  selectedArticleTabIdentity,
  (articleTab) => {
    if (!articleTab) {
      return
    }

    workstationTabsStore.openOrRefreshTab({
      articleId: articleTab.id,
      title: articleTab.title,
      docType: articleTab.docType,
    })

    if (route.name === 'Workstation' && routeArticleId.value !== articleTab.id) {
      replaceWorkstationRouteArticle(articleTab.id)
    }
  },
  { immediate: true },
)

watch(
  [routeArticleId, () => articles.value.length, () => workstationTabsStore.activeTabId],
  ([nextRouteArticleId]) => {
    if (nextRouteArticleId) {
      return
    }

    const activeId = workstationTabsStore.activeTabId
    if (!activeId || selectedArticleId.value === activeId || !hasArticle(activeId)) {
      return
    }

    articleStore.selectArticle(activeId)
    replaceWorkstationRouteArticle(activeId)
  },
  { immediate: true },
)

watch(editorStatus, (nextStatus) => {
  const pendingTabId = pendingWorkstationCloseTabId.value
  if (nextStatus === 'saving' || !pendingTabId) {
    return
  }

  pendingWorkstationCloseTabId.value = null
  closeWorkstationTab(pendingTabId)
})

watch(
  [managerCollapsed, stageCollapsed, inspectorCollapsed],
  () => {
    if (isApplyingModeLayout.value || isFocusMode.value) {
      return
    }

    saveLayoutForMode(editorMode.value, createCurrentModeLayout())
  },
  { flush: 'sync' },
)

watch(
  managerTab,
  () => scheduleLayoutPersistenceSave(),
  { flush: 'sync' },
)

watch(
  selectedArticleId,
  () => scheduleLayoutPersistenceSave(),
  { flush: 'post' },
)

watch(
  () => JSON.stringify({
    activeTabId: workstationTabsStore.activeTabId,
    tabs: workstationTabsStore.orderedTabs.map(tab => ({
      id: tab.id,
      articleId: tab.articleId,
      title: tab.title,
      isPinned: tab.isPinned,
    })),
  }),
  () => scheduleLayoutPersistenceSave(),
  { flush: 'post' },
)

watch(
  () => profileStore.activeProfileId,
  () => {
    void initializeLayoutPersistence()
  },
)

onMounted(() => {
  restoreLayoutForMode(editorMode.value)
  updateSplitViewAvailability()
  void initializeLayoutPersistence()
  window.addEventListener('resize', updateSplitViewAvailability)
  window.addEventListener('pagehide', handlePageHide)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('pagehide', handlePageHide)
  window.removeEventListener('resize', updateSplitViewAvailability)
  stopSplitDividerDrag()
  clearTimeout(copyFeedbackTimer)
  clearTimeout(linkCopyTimer)
  commandPaletteStore.clearWorkstationBridge()
  flushSessionRestoreSnapshot('unmount')
  void writingAssistStore.cleanup()
})

// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
// 璁＄畻灞炴€?
// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

const displayTitle = computed(() => {
  return currentContent.value?.title || selectedArticle.value?.title || 'Untitled document'
})

const hasContent = computed(() => {
  return editorStatus.value === 'ready' || editorStatus.value === 'saving'
})

const commandWorkstationBridge = computed<WorkstationCommandBridge>(() => ({
  activeDocumentId: selectedArticleId.value,
  editorMode: editorMode.value,
  isFocusMode: isFocusMode.value,
  canExport: hasContent.value,
  actions: {
    toggleFocusMode,
    toggleTypewriterMode,
    switchEditorMode,
    openExportModal: () => {
      showExportModal.value = true
    },
    toggleManagerPanel,
    togglePreviewMode,
    toggleSplitView,
  },
}))

watch(
  commandWorkstationBridge,
  bridge => commandPaletteStore.registerWorkstationBridge(bridge),
  { immediate: true },
)

const workstationLayoutStyle = computed<Record<string, string>>(() => ({
  '--workstation-manager-width': `${panelWidths.value.manager}px`,
  '--workstation-stage-width': `${panelWidths.value.stage}px`,
  '--workstation-inspector-width': `${panelWidths.value.inspector}px`,
  '--focus-vignette-height': `${writingAssistStore.vignette.height}px`,
  '--split-left-ratio': `${splitViewRatio.value}`,
  '--split-right-ratio': `${1 - splitViewRatio.value}`,
  '--split-left-font-size': `${splitViewLeftFontScale.value}px`,
  '--split-right-font-size': `${splitViewRightFontScale.value}px`,
}))
</script>

<template>
  <div
    class="workstation"
    :class="{ 'focus-mode': isFocusMode, 'focus-vignette': writingAssistStore.vignette.isEnabled, 'split-view-active': isSplitViewActive, [`mode-${editorMode}`]: true }"
    :style="workstationLayoutStyle"
  >
    <!-- Focus Overlay (涓撴敞妯″紡鏆楄) -->
    <div class="focus-overlay" />

    <button
      v-if="isFocusMode"
      class="focus-exit-btn"
      title="退出专注模式 (Esc)"
      @click="toggleFocusMode"
    >
      <span>退出专注</span>
      <span class="focus-exit-shortcut">Esc</span>
    </button>

    <!-- 鈺愨晲鈺?Header (52px, 瀵归綈鍘熷瀷) 鈺愨晲鈺?-->
    <header class="workstation-header">
      <!-- 鍝佺墝鍖?-->
      <div
        class="header-brand"
        title="返回首页"
        @click="handleBack"
      >
        <div class="header-logo">
          IF
        </div>
        <span class="header-brand-name">InkForge</span>
      </div>

      <!-- 鏍囬鍖?-->
      <div class="header-title">
        <template v-if="isEditingTitle">
          <input
            v-model="editTitleValue"
            class="header-title-input"
            autofocus
            placeholder="Untitled article"
            @blur="confirmEditTitle"
            @keydown.enter="confirmEditTitle"
            @keydown.escape="cancelEditTitle"
          >
        </template>
        <template v-else>
          <input
            type="text"
            class="header-title-input"
            :value="displayTitle"
            readonly
            :title="displayTitle"
            @dblclick="startEditTitle"
          >
        </template>

        <!-- 淇濆瓨鐘舵€?Pill -->
        <div
          class="status-pill"
          :class="editorStatus === 'error' ? 'error' : editorStatus === 'saving' || editorSyncState === 'syncing' ? 'unsaved' : 'saved'"
          :title="saveStatusText"
        >
          <span class="status-dot" />
          {{ saveStatusText }}
        </div>
      </div>

      <!-- 鎿嶄綔鍖?-->
      <div class="header-actions">
        <!-- 澶嶅埗 -->
        <button
          class="icon-btn"
          :class="{ success: copySuccess }"
          :disabled="!hasContent"
          :title="copySuccess ? 'Copied' : 'Copy to clipboard'"
          @click="handleCopyToClipboard"
        >
          <svg
            v-if="copySuccess"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <svg
            v-else
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect
              x="9"
              y="9"
              width="13"
              height="13"
              rx="2"
              ry="2"
            /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>

        <!-- 导出 -->
        <button
          class="icon-btn"
          :disabled="!hasContent"
          title="导出"
          @click="showExportModal = true"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line
              x1="12"
              y1="3"
              x2="12"
              y2="15"
            />
          </svg>
        </button>

        <!-- 涓撴敞妯″紡 -->
        <button
          class="icon-btn"
          :class="{ active: isFocusMode }"
          :title="isFocusMode ? '退出专注模式 (F11)' : '进入专注模式 (F11)'"
          @click="toggleFocusMode"
        >
          <svg
            v-if="!isFocusMode"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
          <svg
            v-else
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" />
          </svg>
        </button>

        <!-- 布局预设 -->
        <div
          class="layout-presets"
          aria-label="布局预设"
        >
          <button
            v-for="preset in WORKSTATION_LAYOUT_PRESETS"
            :key="preset.id"
            type="button"
            class="layout-preset-btn"
            :class="{ active: activeLayoutPresetId === preset.id || (preset.id === 'focus' && isFocusMode) }"
            :title="preset.description"
            @click="applyLayoutPreset(preset.id)"
          >
            {{ preset.label }}
          </button>
        </div>

        <button
          type="button"
          class="icon-btn"
          :class="{ active: isSplitViewActive }"
          title="Toggle split view (Ctrl+Shift+E)"
          @click="toggleSplitView"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect
              x="3"
              y="4"
              width="18"
              height="16"
              rx="2"
            />
            <path d="M12 4v16" />
          </svg>
        </button>

        <!-- 发布鎸夐挳 CTA -->
        <button
          class="publish-btn"
          @click="showExportModal = true"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line
              x1="22"
              y1="2"
              x2="11"
              y2="13"
            /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          发布
        </button>
      </div>
    </header>

    <section
      v-if="recoveryBannerPayload"
      class="crash-recovery-banner"
      data-testid="crash-recovery-banner"
    >
      <div
        class="recovery-banner-mark"
        aria-hidden="true"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="M9 12l2 2 4-5" />
        </svg>
      </div>
      <div class="recovery-banner-body">
        <strong>检测到可恢复的异常退出草稿</strong>
        <span>
          {{ recoveryBannerArticle?.title || '未命名文稿' }} · {{ recoverySavedAtText }} · 待恢复 {{ pendingRecoveryCount }} 项
        </span>
        <span
          v-if="recoveryBannerArticle?.truncated"
          class="recovery-banner-warning"
        >
          当前 emergency payload 仅保留最近内容，约省略 {{ recoveryLostCharactersText }} 个字符。
        </span>
        <span
          v-if="shouldEnterSafeMode"
          class="recovery-banner-warning"
        >
          连续异常启动计数已达到 SafeMode 阈值；本基线先保留恢复入口，完整 SafeMode Shell 由后续切片接入。
        </span>
        <span
          v-if="crashRecoveryError"
          class="recovery-banner-error"
        >{{ crashRecoveryError }}</span>
      </div>
      <div class="recovery-banner-actions">
        <button
          class="recovery-action recovery-action-primary"
          :disabled="isRestoringPrimaryRecovery"
          @click="restorePrimaryRecoveryPayload"
        >
          {{ isRestoringPrimaryRecovery ? '恢复中...' : '恢复此文稿' }}
        </button>
        <button
          class="recovery-action"
          :disabled="isRestoringPrimaryRecovery"
          @click="dismissPrimaryRecoveryPayload"
        >
          忽略
        </button>
      </div>
    </section>

    <!-- 鈺愨晲鈺?涓诲唴瀹瑰尯 鈺愨晲鈺?-->
    <div class="main-content">
      <!-- Edge Trigger 宸?-->
      <div
        v-if="managerCollapsed"
        class="edge-trigger left"
        @mouseenter="managerCollapsed = false"
      />

      <!-- 鈹€鈹€鈹€ 宸︽爮 (Manager) 鈹€鈹€鈹€ -->
      <aside
        class="panel panel-manager"
        :class="{ collapsed: managerCollapsed }"
      >
        <!-- 鎶樺彔鎬佺珫鏍囩 -->
        <div
          v-if="managerCollapsed"
          class="collapsed-label"
          @click="managerCollapsed = false"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span>管理</span>
        </div>

        <!-- 灞曞紑鎬佸唴瀹?-->
        <template v-else>
          <!-- Tab 鏍?-->
          <div class="panel-tabs">
            <div class="panel-tab-strip">
              <button
                class="panel-tab"
                :class="{ active: managerTab === 'files' }"
                @click="managerTab = 'files'"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>文件</span>
              </button>
              <button
                class="panel-tab"
                :class="{ active: managerTab === 'versions' }"
                @click="managerTab = 'versions'"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <line
                    x1="6"
                    y1="3"
                    x2="6"
                    y2="15"
                  /><circle
                    cx="18"
                    cy="6"
                    r="3"
                  /><circle
                    cx="6"
                    cy="18"
                    r="3"
                  /><path d="M18 9a9 9 0 0 1-9 9" />
                </svg>
                <span>版本</span>
              </button>
              <button
                class="panel-tab"
                :class="{ active: managerTab === 'outline' }"
                @click="managerTab = 'outline'"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <line
                    x1="8"
                    y1="6"
                    x2="21"
                    y2="6"
                  /><line
                    x1="8"
                    y1="12"
                    x2="21"
                    y2="12"
                  /><line
                    x1="8"
                    y1="18"
                    x2="21"
                    y2="18"
                  /><line
                    x1="3"
                    y1="6"
                    x2="3.01"
                    y2="6"
                  /><line
                    x1="3"
                    y1="12"
                    x2="3.01"
                    y2="12"
                  /><line
                    x1="3"
                    y1="18"
                    x2="3.01"
                    y2="18"
                  />
                </svg>
                <span>大纲</span>
              </button>
              <button
                class="panel-tab"
                :class="{ active: managerTab === 'tags' }"
                @click="managerTab = 'tags'"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
                  <circle
                    cx="7.5"
                    cy="7.5"
                    r=".5"
                    fill="currentColor"
                  />
                </svg>
                <span>标签</span>
              </button>
            </div>

            <!-- 鎶樺彔鎸夐挳 -->
            <button
              class="collapse-trigger"
              title="收起面板"
              @click="managerCollapsed = true"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          </div>

          <!-- Tab 鍐呭 -->
          <div class="panel-body">
            <div
              v-show="managerTab === 'files'"
              class="tab-content"
            >
              <FileManager />
            </div>
            <div
              v-show="managerTab === 'versions'"
              class="tab-content"
            >
              <VersionPanel />
            </div>
            <div
              v-show="managerTab === 'outline'"
              class="tab-content"
            >
              <OutlinePanel :editor="outlineEditor" />
            </div>
            <div
              v-show="managerTab === 'tags'"
              class="tab-content"
            >
              <TagBrowser />
            </div>
          </div>
        </template>
      </aside>

      <!-- 鈹€鈹€鈹€ 缂栬緫鍣ㄦ爮 鈹€鈹€鈹€ -->
      <main
        :id="selectedArticleId ? 'workstation-document-' + selectedArticleId : undefined"
        class="panel panel-editor"
        :class="{ 'panel-editor--preview': isPreviewMode, 'panel-editor--split': isSplitViewActive }"
      >
        <!-- Vignette Overlay (暗角聚焦，独立于 focus mode，锚定在编辑区) -->
        <div
          v-if="writingAssistStore.vignette.isEnabled"
          class="vignette-overlay"
          aria-hidden="true"
        />

        <div
          v-if="!isPreviewMode"
          ref="splitViewContainerRef"
          class="editor-split-shell"
          :class="{ active: isSplitViewActive }"
        >
          <section
            ref="splitViewLeftPaneRef"
            class="split-pane split-pane-left"
            aria-label="主编辑区"
          >
            <div class="editor-wrapper">
              <EditorPanel
                ref="editorPanelRef"
                :editor-mode="editorMode"
                :editor-width="editorWidth"
                :is-focus-mode="isFocusMode"
                :external-preview-active="isSplitViewActive"
                @sync-state-change="handleEditorSyncStateChange"
                @toggle-editor-mode="toggleEditorMode"
              />
            </div>
          </section>

          <div
            v-if="isSplitViewActive"
            class="split-divider"
            role="separator"
            tabindex="0"
            aria-orientation="vertical"
            aria-controls="split-view-preview-pane"
            :aria-valuemin="Math.round(SPLIT_VIEW_MIN_RATIO * 100)"
            :aria-valuemax="Math.round(SPLIT_VIEW_MAX_RATIO * 100)"
            :aria-valuenow="Math.round(splitViewRatio * 100)"
            aria-label="调整分栏预览宽度"
            @pointerdown="startSplitDividerDrag"
            @dblclick="resetSplitViewRatio"
            @keydown="handleSplitDividerKeydown"
          >
            <span class="split-divider-grip" />
          </div>

          <aside
            v-if="isSplitViewActive"
            id="split-view-preview-pane"
            ref="splitViewRightPaneRef"
            class="split-pane split-pane-right"
            aria-label="只读分栏预览"
          >
            <div class="split-pane-toolbar">
              <div class="split-pane-title">
                <span class="split-pane-kicker">预览</span>
                <strong>分栏视图</strong>
              </div>
              <div class="split-pane-actions">
                <button
                  type="button"
                  class="split-toolbar-btn"
                  :class="{ active: splitViewSyncScroll }"
                  :title="splitViewSyncScroll ? '暂停同步滚动' : '启用同步滚动'"
                  role="switch"
                  :aria-checked="splitViewSyncScroll"
                  :aria-label="splitViewSyncScroll ? '暂停同步滚动' : '启用同步滚动'"
                  @click="toggleSplitViewSyncScroll"
                >
                  <svg
                    v-if="splitViewSyncScroll"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <svg
                    v-else
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M9 17H7A5 5 0 0 1 7 7h2" />
                    <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
                    <path d="M8 12h8" />
                    <path d="m2 2 20 20" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="split-toolbar-btn"
                  title="关闭分栏视图"
                  @click="toggleSplitView"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div
              ref="splitViewRightScrollRef"
              class="split-preview-content"
            >
              <MarkdownPreview :markdown="normalizedBody" />
            </div>
          </aside>
        </div>
        <div
          v-else
          class="preview-mode-shell"
        >
          <div class="preview-mode-header">
            <div>
              <h2 class="preview-mode-title">
                预览模式
              </h2>
              <p class="preview-mode-caption">
                基于当前 Markdown 真值源的只读渲染视图。
              </p>
            </div>
            <button
              type="button"
              class="stage-btn-secondary preview-mode-back"
              title="返回上一编辑模式 (Ctrl+Shift+V)"
              @click="void togglePreviewMode()"
            >
              返回编辑
            </button>
          </div>
          <div class="preview-mode-body">
            <MarkdownPreview :markdown="normalizedBody" />
          </div>
        </div>
        <EditorStatusBar
          v-show="!isFocusMode && settingsStore.settings.editor.statusBarVisible"
          :editor="isPreviewMode ? undefined : editorPanelRef?.getBodyEditor?.()"
          :last-render-time="lastRenderTime"
          :editor-mode="editorMode"
          :article-status="activeArticleStatus"
          :fallback-markdown="normalizedBody"
          :fallback-html="previewHtml"
          :writing-goal="writingGoalProgress"
          @open-document-status="void openDocumentStatusTarget()"
          @open-editor-settings="openEditorSettings"
          @open-writing-goal="openWritingGoalSettings"
          @set-mode="void handleModeSelection($event)"
        />
      </main>

      <!-- 鈹€鈹€鈹€ 棰勮鏍?(Stage) 鈹€鈹€鈹€ -->
      <aside
        v-show="showStagePanel"
        class="panel panel-stage"
        :class="{ collapsed: stageCollapsed }"
      >
        <!-- 鎶樺彔鎬侊細12px 瑙﹀彂鏉?+ hover 绾㈣壊鎸囩ず鍣?-->
        <div
          v-if="stageCollapsed"
          class="stage-collapsed-bar"
          @click="stageCollapsed = false"
        >
          <div class="stage-collapsed-indicator" />
        </div>

        <!-- 灞曞紑鎬佸唴瀹?-->
        <template v-else>
          <!-- 骞冲彴 Tab 鍒囨崲锛堝渾瑙掕嵂涓告寜閽級 -->
          <div class="stage-header">
            <div class="stage-platform-tabs">
              <button
                v-for="opt in platformOptions"
                :key="opt.value"
                class="stage-tab"
                :class="{ active: selectedPlatform === opt.value }"
                @click="selectedPlatform = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
            <button
              class="collapse-trigger"
              title="收起面板"
              @click="stageCollapsed = true"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <div class="stage-body">
            <!-- iPhone 璁惧妗?-->
            <div class="device-frame">
              <!-- 鍒樻捣锛堥粦鑹插渾瑙掔煩褰級 -->
              <div class="device-notch" />
              <!-- 灞忓箷鍐呭鍖哄煙 -->
              <div class="device-screen">
                <!-- 鍔犺浇涓?-->
                <div
                  v-if="previewLoading"
                  class="preview-loading"
                >
                  <svg
                    class="spinner"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span>渲染中...</span>
                </div>

                <!-- 鏃犲唴瀹?-->
                <div
                  v-else-if="!previewHtml"
                  class="preview-empty"
                >
                  <svg
                    class="preview-empty-icon"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle
                      cx="12"
                      cy="12"
                      r="3"
                    />
                  </svg>
                  <span class="preview-empty-title">请选择文章以预览</span>
                  <span class="preview-empty-hint">选择左侧任意草稿即可即时查看预览效果</span>
                </div>

                <!-- 娓叉煋棰勮 -->
                <template v-else>
                  <div
                    v-if="previewMeta?.isSample"
                    class="preview-sample-hint"
                  >
                    示例内容
                  </div>
                  <transition
                    name="preset-fade"
                    mode="out-in"
                  >
                    <div
                      :key="settingsStore.settings.export.defaultPresetId"
                      class="preview-content"
                      v-html="previewHtml"
                    />
                  </transition>
                </template>
              </div>
              <!-- Home Indicator锛堢伆鑹插渾瑙掓潯锛?-->
              <div class="device-home-indicator" />
            </div>

            <!-- 棰勮蹇€熼€夋嫨锛堝綋鍓嶅钩鍙板墠 5 涓級 -->
            <!-- 鎿嶄綔鎸夐挳缁?-->
            <div class="stage-actions">
              <button
                class="stage-btn-primary"
                :class="{ success: copySuccess }"
                :disabled="!hasContent"
                @click="handleCopyToClipboard"
              >
                <svg
                  v-if="copySuccess"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <svg
                  v-else
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect
                    x="9"
                    y="9"
                    width="13"
                    height="13"
                    rx="2"
                    ry="2"
                  /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {{ copySuccess ? '已复制' : '复制平台输出' }}
              </button>
              <button
                class="stage-btn-secondary"
                :disabled="!hasContent"
                @click="showExportModal = true"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
                全屏导出
              </button>
            </div>
          </div>
        </template>
      </aside>

      <!-- 鈹€鈹€鈹€ 鍙虫爮 (Inspector) 鈹€鈹€鈹€ -->
      <aside
        ref="inspectorPanelEl"
        class="panel panel-inspector"
        :class="{ collapsed: inspectorCollapsed, pinned: inspectorPinned }"
      >
        <!-- 鎶樺彔鎬侊細12px 瑙﹀彂鏉?+ hover 绾㈣壊鎸囩ず鍣?-->
        <div
          v-if="inspectorCollapsed"
          class="inspector-collapsed-bar"
          @click="inspectorCollapsed = false"
        >
          <div class="inspector-collapsed-indicator" />
        </div>

        <!-- 展开态：左侧 drag handle，拖拽改变宽度 -->
        <div
          v-if="!inspectorCollapsed"
          class="inspector-resize-handle"
          :class="{ active: isDraggingInspector }"
          title="拖动调整宽度 / 双击重置"
          @pointerdown="startInspectorResize"
          @dblclick="resetInspectorWidth"
        />

        <!-- 灞曞紑鎬佸唴瀹癸細4涓瀭鐩存粴鍔?Section -->
        <template v-if="!inspectorCollapsed">
          <div class="inspector-header">
            <span class="inspector-title">检查器</span>
            <button
              type="button"
              class="inspector-pin-btn"
              :class="{ active: inspectorPinned }"
              :title="inspectorPinned ? '已钉住，再次点击恢复磁吸' : '钉住右栏（禁用磁吸自动收起）'"
              :aria-pressed="inspectorPinned"
              @click="inspectorPinned = !inspectorPinned"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line
                  x1="12"
                  y1="17"
                  x2="12"
                  y2="22"
                />
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" />
              </svg>
            </button>
            <button
              class="collapse-trigger"
              title="收起右栏"
              @click="inspectorCollapsed = true"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <div class="inspector-scroll">
            <!-- Section 1: 排版风格 -->
            <div class="inspector-section">
              <div class="inspector-label">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                  /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
                </svg>
                <span>排版风格</span>
              </div>
              <!-- 涓昏壊閫夋嫨鍣?-->
              <div class="accent-picker">
                <button
                  v-for="color in accentColors"
                  :key="color.value"
                  class="accent-dot"
                  :class="{ active: settingsStore.settings.appearance.accentColor === color.value }"
                  :style="{ background: color.value }"
                  :title="color.label"
                  @click="selectAccentColor(color.value)"
                >
                  <svg
                    v-if="settingsStore.settings.appearance.accentColor === color.value"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    stroke-width="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              </div>

              <!-- 棰勮蹇€熷垏鎹㈡潯 -->
              <div class="preset-strip">
                <button
                  v-for="preset in topPresets"
                  :key="preset.id"
                  type="button"
                  class="preset-chip"
                  :class="{ active: settingsStore.settings.export.defaultPresetId === preset.id }"
                  :title="preset.description"
                  @click="applyPreset(preset.id)"
                >
                  <div class="preset-chip-row-top">
                    <component
                      :is="resolveExportIcon(preset.icon || preset.id, preset.id)"
                      class="preset-icon"
                      :size="12"
                      :stroke-width="2"
                    />
                    <span class="preset-name">{{ preset.name }}</span>
                  </div>
                  <span
                    v-if="preset.persona"
                    class="preset-persona"
                  >{{ preset.persona }}</span>
                </button>
              </div>

              <!-- 版心宽度（从底部状态栏迁移） -->
              <div class="control-group">
                <label>版心宽度</label>
                <div class="style-options">
                  <button
                    v-for="opt in editorWidthOptions"
                    :key="opt.value"
                    class="style-option"
                    :class="{ active: editorWidth === opt.value }"
                    :title="opt.title"
                    @click="editorWidth = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <!-- 鎺掔増鍙傛暟婊戝潡锛堟潵鑷?useTypography composable锛?-->
              <div
                v-for="(ctrl, key) in typographySliders"
                :key="key"
                class="inspector-control"
              >
                <label class="control-label">
                  <span>{{ ctrl.label }}</span>
                  <span class="control-value">{{ ctrl.unit === '' ? Number(ctrl.value).toFixed(1) : ctrl.value }}{{ ctrl.unit }}</span>
                </label>
                <input
                  type="range"
                  class="control-slider"
                  :min="ctrl.min"
                  :max="ctrl.max"
                  :step="ctrl.step"
                  :value="ctrl.value"
                  @input="updateTypography(key as string, Number(($event.target as HTMLInputElement).value))"
                >
              </div>

              <!-- 首行缩进寮€鍏?-->
              <label class="control-toggle">
                <span>首行缩进</span>
                <button
                  class="indent-toggle"
                  :class="{ active: typography.paragraphIndent }"
                  @click="updateTypography('paragraphIndent', !typography.paragraphIndent)"
                >
                  {{ typography.paragraphIndent ? '2em' : '无' }}
                </button>
              </label>

              <!-- 鏍囬瑁呴グ椋庢牸 -->
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

              <!-- 寮曠敤鍧楅鏍?-->
              <div class="control-group">
                <label>引用样式</label>
                <div class="style-options">
                  <button
                    v-for="style in blockquoteStyles"
                    :key="style.value"
                    class="style-option"
                    :class="{ active: typography.blockquoteStyle === style.value }"
                    @click="typography.blockquoteStyle = style.value"
                  >
                    {{ style.label }}
                  </button>
                </div>
              </div>

              <router-link
                to="/themes"
                class="inspector-link"
              >
                查看全部预设
              </router-link>
            </div>

            <!-- Section 2: 字体鎺у埗 -->
            <div class="inspector-section">
              <div class="inspector-label">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="4 7 4 4 20 4 20 7" /><line
                    x1="9"
                    y1="20"
                    x2="15"
                    y2="20"
                  /><line
                    x1="12"
                    y1="4"
                    x2="12"
                    y2="20"
                  />
                </svg>
                <span>字体</span>
              </div>
              <!-- 字体鏃忛€夋嫨鎸夐挳缁?-->
              <div class="font-family-group">
                <button
                  class="font-family-btn"
                  :class="{ active: settingsStore.settings.appearance.fontFamily === 'serif' }"
                  @click="settingsStore.settings.appearance.fontFamily = 'serif'"
                >
                  <span
                    class="font-family-preview"
                    :style="{ fontFamily: fontFamilyMap.serif }"
                  >Aa</span>
                  <span class="font-family-name">衬线</span>
                </button>
                <button
                  class="font-family-btn"
                  :class="{ active: settingsStore.settings.appearance.fontFamily === 'sans' }"
                  @click="settingsStore.settings.appearance.fontFamily = 'sans'"
                >
                  <span
                    class="font-family-preview"
                    :style="{ fontFamily: fontFamilyMap.sans }"
                  >Aa</span>
                  <span class="font-family-name">无衬线</span>
                </button>
                <button
                  class="font-family-btn"
                  :class="{ active: settingsStore.settings.appearance.fontFamily === 'kai' }"
                  @click="settingsStore.settings.appearance.fontFamily = 'kai'"
                >
                  <span
                    class="font-family-preview"
                    :style="{ fontFamily: fontFamilyMap.kai }"
                  >Aa</span>
                  <span class="font-family-name">楷体</span>
                </button>
                <button
                  class="font-family-btn"
                  :class="{ active: settingsStore.settings.appearance.fontFamily === 'mono' }"
                  @click="settingsStore.settings.appearance.fontFamily = 'mono'"
                >
                  <span
                    class="font-family-preview"
                    :style="{ fontFamily: fontFamilyMap.mono }"
                  >Aa</span>
                  <span class="font-family-name">等宽</span>
                </button>
              </div>

              <!-- 瀛楀彿婊戝潡 (12-24px, 姝ヨ繘 1px) -->
              <div class="inspector-control">
                <label class="control-label">
                  <span>正文字号</span>
                  <span class="control-value">{{ settingsStore.settings.appearance.fontSize }}px</span>
                </label>
                <input
                  type="range"
                  class="control-slider"
                  min="12"
                  max="24"
                  step="1"
                  :value="settingsStore.settings.appearance.fontSize"
                  @input="settingsStore.settings.appearance.fontSize = Number(($event.target as HTMLInputElement).value)"
                >
              </div>

              <!-- 行高婊戝潡 (1.4-2.4, 姝ヨ繘 0.1) -->
              <div class="inspector-control">
                <label class="control-label">
                  <span>行高</span>
                  <span class="control-value">{{ settingsStore.settings.appearance.lineHeight.toFixed(1) }}</span>
                </label>
                <input
                  type="range"
                  class="control-slider"
                  min="1.4"
                  max="2.4"
                  step="0.1"
                  :value="settingsStore.settings.appearance.lineHeight"
                  @input="settingsStore.settings.appearance.lineHeight = Number(($event.target as HTMLInputElement).value)"
                >
              </div>

              <!-- 字体棰勮 -->
              <div
                class="font-preview"
                :style="{
                  fontFamily: currentFontStack,
                  fontSize: settingsStore.settings.appearance.fontSize + 'px',
                  lineHeight: settingsStore.settings.appearance.lineHeight,
                }"
              >
                永远相信美好的事情即将发生。
                <br>山河入墨，字里行间自有光。
              </div>
            </div>

            <!-- Section 3: Writing Assist -->
            <div class="inspector-section">
              <WritingAssistPanel
                :current-document-words="writingGoalProgress.currentDocumentWords"
                :today-words="writingGoalProgress.todayWords"
                :weekly-words="writingGoalProgress.weeklyWords"
                :document-target="writingGoalProgress.documentTarget"
                :daily-target="writingGoalProgress.dailyTarget"
                :weekly-target="writingGoalProgress.weeklyTarget"
                :document-percent="writingGoalProgress.documentPercent"
                :daily-percent="writingGoalProgress.dailyPercent"
                :weekly-percent="writingGoalProgress.weeklyPercent"
                :is-focus-mode="isFocusMode"
                :typewriter-mode="settingsStore.settings.editor.typewriterMode"
                @toggle-focus="toggleFocusMode"
                @toggle-typewriter="toggleTypewriterMode"
              />
            </div>

            <!-- Section 4: 绱犳潗搴?-->
            <div class="inspector-section">
              <div class="inspector-label">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                    ry="2"
                  /><circle
                    cx="8.5"
                    cy="8.5"
                    r="1.5"
                  /><polyline points="21 15 16 10 5 21" />
                </svg>
                <span>素材</span>
              </div>
              <div class="inspector-asset-wrapper">
                <AssetManager :article-id="selectedArticleId ?? undefined" />
              </div>
            </div>

            <!-- Section 4: 引用链接 -->
            <div class="inspector-section">
              <div class="inspector-label">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span>引用链接</span>
                <span
                  v-if="extractedLinks.length > 0"
                  class="inspector-count"
                >{{ extractedLinks.length }}</span>
              </div>
              <div
                v-if="extractedLinks.length === 0"
                class="inspector-empty-hint"
              >
                <p>暂无外部链接引用</p>
                <p class="inspector-empty-sub">
                  在 Markdown 中使用 [文字](URL) 添加链接
                </p>
              </div>
              <div
                v-else
                class="inspector-links-list"
              >
                <div
                  v-for="(link, idx) in extractedLinks"
                  :key="idx"
                  class="link-item"
                >
                  <a
                    :href="link.href"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="link-item-main"
                    :title="link.href"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line
                        x1="10"
                        y1="14"
                        x2="21"
                        y2="3"
                      />
                    </svg>
                    <div class="link-item-content">
                      <span class="link-text">{{ link.text }}</span>
                      <span class="link-href">{{ link.href }}</span>
                    </div>
                  </a>
                  <button
                    class="link-copy-btn"
                    :class="{ copied: copiedLinkIndex === idx }"
                    :title="copiedLinkIndex === idx ? 'Copied' : 'Copy link'"
                    @click="copyLinkToClipboard(link.href, idx)"
                  >
                    <svg
                      v-if="copiedLinkIndex === idx"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <svg
                      v-else
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        ry="2"
                      /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </aside>
    </div>

    <!-- 鈺愨晲鈺?导出妯℃€佹 鈺愨晲鈺?-->
    <transition name="mode-toast">
      <div
        v-if="modeSwitchToast.visible"
        class="mode-switch-toast"
        role="status"
        aria-live="polite"
      >
        {{ modeSwitchToast.message }}
      </div>
    </transition>

    <ExportModal
      :visible="showExportModal"
      :content="normalizedBody"
      @close="showExportModal = false"
    />
    <FocusSessionSummaryModal
      v-if="showFocusSummary"
      :summary="writingAssistStore.lastSummary"
      :today-words="writingGoalProgress.todayWords"
      :daily-target="writingGoalProgress.dailyTarget"
      @continue-writing="closeFocusSummary"
      @return-hub="returnHubFromFocusSummary"
    />
  </div>
</template>

<style scoped>
/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
   WorkstationView - Ethereal Constructivism
   鍥涙爮鍔ㄦ€佸姏鍦哄竷灞€
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/

/* 鈹€鈹€鈹€ 鏍瑰鍣?鈹€鈹€鈹€ */
.workstation {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #FAFBFC;
  overflow: hidden;
  color: #263238;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', sans-serif;
}

/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
   Header (52px, 瀵归綈鍘熷瀷)
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/


.crash-recovery-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 10px 16px 0;
  padding: 12px 14px;
  background: linear-gradient(135deg, #FFF7ED 0%, #FFFBEB 100%);
  border: 1px solid #FDBA74;
  border-radius: 14px;
  color: #7C2D12;
  box-shadow: 0 10px 30px rgba(124, 45, 18, 0.08);
  z-index: 20;
}

.recovery-banner-mark {
  width: 34px;
  height: 34px;
  min-width: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: #C2410C;
  background: rgba(251, 146, 60, 0.18);
}

.recovery-banner-body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
  line-height: 1.45;
}

.recovery-banner-body strong {
  font-size: 13px;
  letter-spacing: 0.02em;
}

.recovery-banner-warning {
  color: #9A3412;
}

.recovery-banner-error {
  color: #B91C1C;
  font-weight: 600;
}

.recovery-banner-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.recovery-action {
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(194, 65, 12, 0.28);
  background: rgba(255, 255, 255, 0.72);
  color: #9A3412;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.recovery-action:hover:not(:disabled) {
  background: #FFFFFF;
  border-color: rgba(194, 65, 12, 0.48);
}

.recovery-action:disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.recovery-action-primary {
  background: #C2410C;
  border-color: #C2410C;
  color: #FFFFFF;
}

.recovery-action-primary:hover:not(:disabled) {
  background: #9A3412;
}
.workstation-header {
  height: 52px;
  min-height: 52px;
  background: #FFFFFF;
  border-bottom: 1px solid #ECEFF1;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 16px;
  backdrop-filter: blur(12px);
  z-index: 10;
}

/* 鈹€鈹€鈹€ 鍝佺墝鍖?鈹€鈹€鈹€ */
.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 16px;
  border-right: 1px solid #ECEFF1;
  cursor: pointer;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.header-brand:hover {
  opacity: 0.7;
}

.header-logo {
  width: 28px;
  height: 28px;
  background: #D32F2F;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 11px;
  flex-shrink: 0;
}

.header-brand-name {
  font-size: 14px;
  font-weight: 600;
  color: #263238;
}

/* 鈹€鈹€鈹€ 鏍囬鍖?鈹€鈹€鈹€ */
.header-title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.header-title-input {
  font-size: 14px;
  font-weight: 500;
  color: #263238;
  background: transparent;
  border: none;
  outline: none;
  padding: 6px 10px;
  border-radius: 6px;
  min-width: 280px;
  max-width: 400px;
  transition: background 0.15s;
}

.header-title-input:hover {
  background: #FAFBFC;
}

.header-title-input:focus {
  background: #FFEBEE;
}

/* 鈹€鈹€鈹€ 淇濆瓨鐘舵€?Pill 鈹€鈹€鈹€ */
.status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
  background: #F5F5F5;
  color: #90A4AE;
}

.status-pill .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-pill.saved {
  background: #E8F5E9;
  color: #2E7D32;
}

.status-pill.unsaved {
  background: #FFF3E0;
  color: #F57C00;
}

.status-pill.error {
  background: #FFEBEE;
  color: #C62828;
}

/* 鈹€鈹€鈹€ Header 鎿嶄綔鍖?鈹€鈹€鈹€ */
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.icon-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #90A4AE;
  cursor: pointer;
  transition: all 0.15s;
}

.icon-btn:hover {
  background: #FAFBFC;
  color: #607D8B;
  transform: scale(1.05);
}

.icon-btn.active {
  background: #FFEBEE;
  color: #D32F2F;
}

.icon-btn.success {
  background: #E8F5E9;
  color: #2E7D32;
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.layout-presets {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  background: #FAFBFC;
}

.layout-preset-btn {
  height: 28px;
  padding: 0 9px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #607D8B;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.layout-preset-btn:hover,
.layout-preset-btn.active {
  background: #FFEBEE;
  color: #D32F2F;
}

/* 鈹€鈹€鈹€ 发布鎸夐挳 CTA 鈹€鈹€鈹€ */
.publish-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: #D32F2F;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(211, 47, 47, 0.25);
}

/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
   涓诲唴瀹瑰尯鍩?
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/

.main-content {
  position: relative;
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
   Edge Triggers (杈圭紭瑙﹀彂鍣?
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/

.edge-trigger {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 12px;
  z-index: 100;
  cursor: pointer;
}

.edge-trigger.left {
  left: 0;
}

.edge-trigger.right {
  right: 0;
}

.edge-trigger::before {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 48px;
  background: #B0BEC5;
  border-radius: 2px;
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.edge-trigger.left::before {
  left: 4px;
}

.edge-trigger.right::before {
  right: 4px;
}

.edge-trigger:hover::before {
  opacity: 0.6;
  transform: translateY(-50%) scaleY(1.2);
}

/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
   閫氱敤闈㈡澘
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/

.panel {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #E5E7EB;
  overflow: hidden;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1), flex-basis 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
  .panel {
    transition: width 0.1s ease, min-width 0.1s ease, flex-basis 0.1s ease;
  }
}

.panel:last-child {
  border-right: none;
}

/* 鈹€鈹€鈹€ 宸︽爮 鈹€鈹€鈹€ */
.panel-manager {
  width: var(--workstation-manager-width, 280px);
  min-width: var(--workstation-manager-width, 280px);
  flex-shrink: 0;
}

.panel-manager.collapsed {
  width: 36px;
  min-width: 36px;
}

/* 鈹€鈹€鈹€ 缂栬緫鍣ㄦ爮 鈹€鈹€鈹€ */
.panel-editor {
  position: relative;
  flex: 1;
  min-width: 0;
  border-right: 1px solid #E5E7EB;
  container-type: inline-size;
}

/* 鈹€鈹€鈹€ Vignette Overlay (鏆楄鑱氱劍锛屾爣鍦ㄧ紪杈戝尯) 鈹€鈹€鈹€ */
.vignette-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.focus-vignette .vignette-overlay {
  opacity: 1;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.18) 0,
    transparent var(--focus-vignette-height),
    transparent calc(100% - var(--focus-vignette-height)),
    rgba(0, 0, 0, 0.18) 100%
  );
}

.panel-editor--preview {
  background: #FAFBFC;
}

.editor-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.editor-split-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
  background: #FFFFFF;
}

.split-pane {
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.split-pane-left {
  flex: var(--split-left-ratio, 0.5) 1 0;
  min-width: 280px;
  font-size: var(--split-left-font-size, 16px);
}

.editor-split-shell:not(.active) .split-pane-left {
  flex: 1 1 auto;
  width: 100%;
}

.split-pane-right {
  flex: var(--split-right-ratio, 0.5) 1 0;
  display: flex;
  flex-direction: column;
  min-width: 280px;
  overflow: hidden;
  border-left: 1px solid #E5E7EB;
  background: #FAFAFA;
  font-size: var(--split-right-font-size, 16px);
}

.split-divider {
  width: 12px;
  min-width: 12px;
  display: flex;
  align-items: stretch;
  justify-content: center;
  cursor: col-resize;
  background: linear-gradient(90deg, transparent 0, #E5E7EB 45%, #E5E7EB 55%, transparent 100%);
  outline: none;
}

.split-divider:hover,
.split-divider:focus-visible {
  background: linear-gradient(90deg, transparent 0, #B0BEC5 45%, #B0BEC5 55%, transparent 100%);
}

.split-divider-grip {
  width: 3px;
  margin: 12px 0;
  border-radius: 999px;
  background: currentColor;
  color: rgba(96, 125, 139, 0.35);
}

.split-pane-toolbar {
  height: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px;
  border-bottom: 1px solid #E5E7EB;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
}

.split-pane-title {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 12px;
  color: #263238;
}

.split-pane-kicker {
  color: #90A4AE;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.split-pane-actions {
  display: flex;
  gap: 6px;
}

.split-toolbar-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #FFFFFF;
  color: #607D8B;
  cursor: pointer;
}

.split-toolbar-btn:hover,
.split-toolbar-btn.active {
  border-color: #D32F2F;
  color: #D32F2F;
  background: #FFEBEE;
}

.split-preview-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 20px 24px;
}

.split-preview-content :deep(.markdown-preview) {
  min-height: 100%;
  height: auto;
  overflow: visible;
  padding: 0;
  background: transparent;
}

:global(body.split-view-resizing) {
  cursor: col-resize;
  user-select: none;
}

:global(body.split-view-resizing) .panel-inspector {
  transition: none;
}

@container (max-width: 720px) {
  .editor-split-shell,
  .editor-split-shell.active {
    display: block;
  }

  .split-pane-left {
    width: 100%;
    min-width: 0;
    flex: none;
  }

  .split-divider,
  .split-pane-right {
    display: none;
  }
}

@media (min-width: 901px) and (max-width: 1440px) {
  .panel-manager:not(.collapsed) {
    width: min(var(--workstation-manager-width, 280px), 280px);
    min-width: min(var(--workstation-manager-width, 280px), 280px);
  }

  .panel-stage:not(.collapsed) {
    width: min(var(--workstation-stage-width, 320px), 320px);
    min-width: min(var(--workstation-stage-width, 320px), 320px);
  }

  .panel-inspector:not(.collapsed) {
    width: min(var(--workstation-inspector-width, 260px), 260px);
    min-width: min(var(--workstation-inspector-width, 260px), 260px);
  }
}

@media (max-width: 900px) {
  .workstation {
    width: 100%;
    min-height: 100vh;
    height: auto;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .workstation-header {
    height: auto;
    min-height: 0;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px 12px;
  }

  .header-brand {
    border-right: none;
    padding-right: 8px;
  }

  .header-title {
    order: 2;
    flex-basis: 100%;
    width: 100%;
  }

  .header-title-input {
    min-width: 0;
    max-width: none;
    flex: 1;
    padding-left: 0;
  }

  .header-actions {
    order: 3;
    width: 100%;
    flex-wrap: wrap;
    overflow: visible;
    gap: 6px;
    padding-bottom: 0;
  }

  .header-actions .icon-btn {
    width: 30px;
    height: 30px;
  }

  .layout-presets {
    flex-wrap: wrap;
    max-width: calc(100% - 78px);
  }

  .layout-preset-btn {
    height: 30px;
    padding: 0 8px;
  }

  .publish-btn {
    min-height: 34px;
    padding: 8px 12px;
    flex-shrink: 0;
  }

  .main-content {
    flex-direction: column;
    min-height: 0;
    overflow: visible;
  }

  .edge-trigger {
    display: none;
  }

  .panel {
    width: 100% !important;
    min-width: 0 !important;
    flex: none;
    border-right: none;
    border-bottom: 1px solid #E5E7EB;
  }

  .panel-manager {
    min-height: 260px;
    max-height: 420px;
  }

  .panel-editor {
    min-height: 640px;
    border-right: none;
  }

  .editor-wrapper,
  .editor-split-shell {
    min-height: 560px;
  }

  .editor-split-shell,
  .editor-split-shell.active {
    display: block;
  }

  .split-pane-left {
    width: 100%;
    min-width: 0;
    flex: none;
  }

  .split-divider,
  .split-pane-right {
    display: none;
  }

  .panel-stage,
  .panel-inspector {
    min-height: 520px;
    max-height: none;
  }

  .panel-manager.collapsed,
  .panel-stage.collapsed,
  .panel-inspector.collapsed {
    width: 100% !important;
    min-width: 0 !important;
    height: 44px;
    min-height: 44px;
    overflow: hidden;
  }

  .collapsed-label,
  .stage-collapsed-bar,
  .inspector-collapsed-bar {
    height: 44px;
  }

  .stage-body,
  .inspector-scroll {
    max-height: none;
  }

  .device-frame {
    width: min(100%, 430px);
    margin: 16px auto;
  }

  .stage-actions {
    padding-bottom: 16px;
  }
}

.preview-mode-shell {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  background: #FAFBFC;
}

.preview-mode-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid #E5E7EB;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
}

.preview-mode-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #24343D;
}

.preview-mode-caption {
  margin: 4px 0 0;
  font-size: 12px;
  color: #60717A;
}

.preview-mode-back {
  flex-shrink: 0;
}

.preview-mode-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 28px;
  background:
    radial-gradient(circle at top left, rgba(211, 47, 47, 0.04), transparent 28%),
    linear-gradient(180deg, #FAFBFC 0%, #F5F7F8 100%);
}

.preview-mode-body :deep(.markdown-preview) {
  max-width: 920px;
  min-height: 100%;
  margin: 0 auto;
  padding: 56px 64px;
  border-radius: 2px;
  background: #FFFFFF;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.06), 0 2px 6px rgba(15, 23, 42, 0.04);
}

/* 鈹€鈹€鈹€ 棰勮鏍?鈹€鈹€鈹€ */
.panel-stage {
  width: var(--workstation-stage-width, 320px);
  min-width: var(--workstation-stage-width, 320px);
  flex-shrink: 0;
  transition: width 0.25s ease, min-width 0.25s ease;
}

.panel-stage.collapsed {
  width: 12px;
  min-width: 12px;
  overflow: hidden;
}

/* 鈹€鈹€鈹€ Stage 鎶樺彔瑙﹀彂鏉?鈹€鈹€鈹€ */
.stage-collapsed-bar {
  width: 100%;
  height: 100%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.stage-collapsed-indicator {
  width: 4px;
  height: 100%;
  background: transparent;
  transition: background 0.15s ease;
  border-radius: 2px;
}

.stage-collapsed-bar:hover .stage-collapsed-indicator {
  background: #B0BEC5;
}

/* 鈹€鈹€鈹€ 鍙虫爮 鈹€鈹€鈹€ */
.panel-inspector {
  position: relative;
  width: var(--workstation-inspector-width, 260px);
  min-width: var(--workstation-inspector-width, 260px);
  flex-shrink: 0;
  border-right: none;
  border-left: 1px solid #E5E7EB;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
}

.inspector-resize-handle {
  position: absolute;
  left: -2px;
  top: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
  background: transparent;
  transition: background 0.15s ease;
  touch-action: none;
  user-select: none;
}

.inspector-resize-handle:hover,
.inspector-resize-handle.active {
  background: rgba(211, 47, 47, 0.18);
}

.panel-inspector.pinned:not(.collapsed) {
  box-shadow: -2px 0 12px rgba(0, 0, 0, 0.04);
}

.panel-inspector.collapsed {
  width: 12px;
  min-width: 12px;
  overflow: hidden;
  border-left: none;
}

/* 鈹€鈹€鈹€ Inspector 鎶樺彔瑙﹀彂鏉?鈹€鈹€鈹€ */
.inspector-collapsed-bar {
  width: 100%;
  height: 100%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.inspector-collapsed-indicator {
  width: 4px;
  height: 100%;
  background: transparent;
  transition: background 0.15s ease;
  border-radius: 2px;
}

.inspector-collapsed-bar:hover .inspector-collapsed-indicator {
  background: #B0BEC5;
}

/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
   鎶樺彔鎬佺珫鏍囩
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/

.collapsed-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  width: 100%;
  height: 100%;
  cursor: pointer;
  color: #90A4AE;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.15s ease;
  user-select: none;
}

.collapsed-label:hover {
  color: #D32F2F;
  background: #FFEBEE;
}

.collapsed-label svg {
  writing-mode: horizontal-tb;
}

/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
   闈㈡澘 Tab 鏍?
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/

.panel-tabs {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0 8px 0 0;
  gap: 4px;
  overflow: hidden;
}

.panel-tab-strip {
  display: flex;
  gap: 2px;
  padding: 4px;
  background: rgba(207, 216, 220, 0.32);
  border-radius: 999px;
  align-items: stretch;
  flex: 1 1 auto;
  min-width: 0;
  margin: 12px 8px;
}

.panel-tab {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 9px 4px;
  font-size: 13px;
  font-weight: 500;
  color: #607D8B;
  text-align: center;
  border-radius: 999px;
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.panel-tab :deep(svg) {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  stroke-width: 2;
}

.panel-tab:hover:not(.active) {
  color: #455A64;
  background: rgba(255, 255, 255, 0.5);
}

.panel-tab.active {
  background: #FFFFFF;
  color: #D32F2F;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(38, 50, 56, 0.10);
}

@media (prefers-reduced-motion: reduce) {
  .panel-tab {
    transition: none;
  }
}

html.theme-dark .panel-tab-strip,
html[data-theme="dark"] .panel-tab-strip {
  background: rgba(255, 255, 255, 0.06);
}

html.theme-dark .panel-tab,
html[data-theme="dark"] .panel-tab {
  color: #B0BEC5;
}

html.theme-dark .panel-tab:hover:not(.active),
html[data-theme="dark"] .panel-tab:hover:not(.active) {
  color: #ECEFF4;
  background: rgba(255, 255, 255, 0.04);
}

html.theme-dark .panel-tab.active,
html[data-theme="dark"] .panel-tab.active {
  background: rgba(255, 255, 255, 0.10);
  color: #EF9A9A;
  box-shadow: none;
}

.collapse-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-left: auto;
  border: none;
  background: transparent;
  color: #CFD8DC;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.collapse-trigger:hover {
  background: #FFEBEE;
  color: #D32F2F;
}

/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
   闈㈡澘鍐呭
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/

.panel-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.tab-content {
  height: 100%;
  overflow: hidden;
}

/* 鈹€鈹€鈹€ 璁╁瓙缁勪欢鑷€傚簲瀹瑰櫒 鈹€鈹€鈹€ */
.tab-content > :deep(*) {
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  height: 100%;
}

/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
   棰勮鏍?(Stage) 鈥?iPhone 璁惧妗嗛鏍?
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/

.stage-header {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 12px;
  border-bottom: 1px solid #ECEFF1;
  flex-shrink: 0;
  background: transparent;
}

/* 平台分段控件 (segmented control) */
.stage-platform-tabs {
  display: flex;
  gap: 2px;
  flex: 1;
  background: rgba(207, 216, 220, 0.24);
  border-radius: 999px;
  padding: 4px;
  overflow: hidden;
}

.stage-tab {
  flex: 1 1 0;
  min-width: 0;
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: #607D8B;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 999px;
  transition: background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
  text-align: center;
  white-space: nowrap;
}

.stage-tab:hover {
  color: #37474F;
}

.stage-tab.active {
  background: #FFFFFF;
  color: #D32F2F;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(38, 50, 56, 0.10);
}

.stage-header .collapse-trigger {
  margin-left: 2px;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 999px;
  color: #90A4AE;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.stage-header .collapse-trigger:hover {
  background: rgba(207, 216, 220, 0.32);
  color: #37474F;
}

/* ─── 预览面板「示例内容」徽章 ─── */
.preview-sample-hint {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 3;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  color: #607D8B;
  font-size: 11px;
  line-height: 1.6;
  opacity: 0.78;
  pointer-events: none;
}

/* ─── 预设切换 100ms 淡入淡出过渡 ─── */
.preset-fade-enter-active,
.preset-fade-leave-active {
  transition: opacity 100ms ease-out;
}

.preset-fade-enter-from,
.preset-fade-leave-to {
  opacity: 0;
}

.stage-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 12px 12px;
  gap: 12px;
  background: linear-gradient(180deg, #F2F3F5 0%, #ECEEF0 100%);
  overflow: hidden;
}

/* 鈹€鈹€鈹€ iPhone 璁惧妗?鈹€鈹€鈹€ */
.device-frame {
  width: 100%;
  max-width: 320px;
  flex: 1 1 0;
  min-height: 320px;
  background: #FAFAF7;
  border-radius: 28px;
  border: 1px solid #ECEFF1;
  padding: 46px 12px 22px;
  position: relative;
  box-shadow:
    0 12px 32px -8px rgba(38, 50, 56, 0.18),
    0 2px 6px rgba(38, 50, 56, 0.06);
  display: flex;
  flex-direction: column;
}

/* 鍒樻捣 */
.device-notch {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 88px;
  height: 24px;
  background: #0F0F0F;
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

/* 灞忓箷鍐呭鍖?*/
.device-screen {
  background: #FFFFFF;
  border-radius: 18px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  position: relative;
  box-shadow: inset 0 0 0 1px rgba(207, 216, 220, 0.32);
}

/* Home Indicator */
.device-home-indicator {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 34px;
  height: 3px;
  background: #CFD8DC;
  border-radius: 999px;
  flex-shrink: 0;
}

/* 璁惧灞忓箷鍐呮粴鍔ㄦ潯 */
.device-screen::-webkit-scrollbar {
  width: 2px;
}

.device-screen::-webkit-scrollbar-thumb {
  background: rgba(38, 50, 56, 0.12);
  border-radius: 1px;
}

.device-screen::-webkit-scrollbar-thumb:hover {
  background: rgba(38, 50, 56, 0.24);
}

/* 鈹€鈹€鈹€ 棰勮鐘舵€?鈹€鈹€鈹€ */
.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 200px;
  color: #90A4AE;
  font-size: 13px;
}

.preview-loading .spinner {
  animation: stage-preview-spin 0.9s linear infinite;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 240px;
  text-align: center;
  padding: 24px 12px;
}

.preview-empty-icon {
  color: #CFD8DC;
  flex-shrink: 0;
}

.preview-empty-title {
  font-size: 13px;
  font-weight: 500;
  color: #90A4AE;
  letter-spacing: 0.01em;
}

.preview-empty-hint {
  font-size: 12px;
  font-weight: 400;
  color: #B0BEC5;
  line-height: 1.5;
  max-width: 220px;
}

.preview-content {
  font-size: 14px;
  line-height: 1.6;
  color: #263238;
  overflow-wrap: break-word;
  word-break: break-word;
}

@keyframes stage-preview-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .preview-loading .spinner {
    animation: none;
  }
}

/* 鈹€鈹€鈹€ Stage 棰勮蹇€熼€夋嫨 鈹€鈹€鈹€ */
/* 鈹€鈹€鈹€ Stage 鎿嶄綔鎸夐挳缁?鈹€鈹€鈹€ */
.stage-actions {
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 320px;
  margin-top: 4px;
}

.stage-btn-primary {
  flex: 1 1 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid #D32F2F;
  border-radius: 999px;
  background: #D32F2F;
  color: #FFFFFF;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 10px -4px rgba(211, 47, 47, 0.42);
  transition: background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
}

.stage-btn-primary:hover:not(:disabled) {
  background: #C62828;
  border-color: #C62828;
  box-shadow: 0 6px 14px -4px rgba(211, 47, 47, 0.50);
}

.stage-btn-primary:active:not(:disabled) {
  transform: translateY(0.5px);
  box-shadow: 0 2px 6px -2px rgba(211, 47, 47, 0.40);
}

.stage-btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.stage-btn-primary.success {
  background: #2E7D32;
  border-color: #2E7D32;
  box-shadow: 0 4px 10px -4px rgba(46, 125, 50, 0.42);
}

.stage-btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid #E0E0E0;
  border-radius: 999px;
  background: #FFFFFF;
  color: #607D8B;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.12s ease;
}

.stage-btn-secondary:hover:not(:disabled) {
  border-color: #BDBDBD;
  background: #FAFAFA;
  color: #263238;
}

.stage-btn-secondary:active:not(:disabled) {
  transform: translateY(0.5px);
}

.stage-btn-secondary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 在预览舞台底部把次按钮做成红色描边幽灵按钮，与主按钮形成色彩呼应 */
.stage-actions .stage-btn-secondary {
  flex: 1 1 0;
  border-color: rgba(211, 47, 47, 0.42);
  background: transparent;
  color: #D32F2F;
}

.stage-actions .stage-btn-secondary:hover:not(:disabled) {
  background: rgba(211, 47, 47, 0.06);
  border-color: rgba(211, 47, 47, 0.62);
  color: #C62828;
}

.stage-actions .stage-btn-secondary:disabled {
  border-color: #E0E0E0;
  color: #90A4AE;
}

@media (prefers-reduced-motion: reduce) {
  .stage-btn-primary,
  .stage-btn-secondary {
    transition: none;
  }
  .stage-btn-primary:active:not(:disabled),
  .stage-btn-secondary:active:not(:disabled) {
    transform: none;
  }
}

/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
   鍙虫爮 Inspector 鈥?婊氬姩寮?Section
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/

.inspector-header {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border-bottom: 1px solid #E5E7EB;
  flex-shrink: 0;
}

.inspector-title {
  font-size: 12px;
  font-weight: 600;
  color: #607D8B;
  flex: 1;
}

.inspector-pin-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #90A4AE;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.inspector-pin-btn:hover {
  background: rgba(120, 144, 156, 0.1);
  color: #546E7A;
}

.inspector-pin-btn.active {
  border-color: rgba(176, 190, 197, 0.6);
  background: rgba(236, 239, 241, 0.85);
  color: #455A64;
  transform: rotate(-30deg);
}

.inspector-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.inspector-section {
  padding: 16px;
  border-bottom: 1px solid #F0F1F3;
}

.inspector-section:last-child {
  border-bottom: none;
}

.inspector-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #607D8B;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* 鈹€鈹€鈹€ 涓昏壊閫夋嫨鍣?鈹€鈹€鈹€ */
.accent-picker {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.accent-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.accent-dot:hover {
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.accent-dot.active {
  border-color: #263238;
  box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px currentColor;
}

.inspector-link {
  font-size: 12px;
  color: var(--accent-primary, #D32F2F);
  text-decoration: none;
  font-weight: 500;
  display: block;
}

.inspector-link:hover {
  text-decoration: underline;
}

/* 鈹€鈹€鈹€ 字体鏃忔寜閽粍 鈹€鈹€鈹€ */
.font-family-group {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.font-family-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #FFFFFF;
  cursor: pointer;
  transition: all 0.15s ease;
}

.font-family-btn:hover {
  border-color: #CFD8DC;
  background: #F5F5F5;
}

.font-family-btn.active {
  border-color: var(--accent-primary, #D32F2F);
  background: #FFEBEE;
}

.font-family-preview {
  font-size: 18px;
  font-weight: 500;
  color: #263238;
  line-height: 1.2;
}

.font-family-btn.active .font-family-preview {
  color: var(--accent-primary, #D32F2F);
}

.font-family-name {
  font-size: 10px;
  color: #90A4AE;
  white-space: nowrap;
}

.font-family-btn.active .font-family-name {
  color: var(--accent-primary, #D32F2F);
  font-weight: 500;
}

/* 鈹€鈹€鈹€ 绱犳潗鍖哄煙 鈹€鈹€鈹€ */
.inspector-asset-wrapper {
  min-height: 120px;
}

.inspector-asset-wrapper > :deep(*) {
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
}

/* 鈹€鈹€鈹€ 绌烘彁绀?鈹€鈹€鈹€ */
.inspector-empty-hint {
  text-align: center;
  padding: 16px 0;
  color: #CFD8DC;
  font-size: 12px;
}

.inspector-empty-hint p {
  margin: 0;
}

.inspector-empty-sub {
  margin-top: 4px;
  font-size: 11px;
  color: #E0E0E0;
}

/* 鈹€鈹€鈹€ 引用链接鍒楄〃 鈹€鈹€鈹€ */
.inspector-count {
  margin-left: auto;
  background: #ECEFF1;
  color: #607D8B;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 8px;
  line-height: 1.4;
}

.inspector-links-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.link-item {
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
  transition: background 0.15s;
}

.link-item:hover {
  background: rgba(21, 101, 192, 0.04);
}

.link-item-main {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 8px;
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: #607D8B;
  text-decoration: none;
  transition: color 0.15s;
  overflow: hidden;
}

.link-item-main:hover {
  color: #1565C0;
}

.link-item-main svg {
  flex-shrink: 0;
  opacity: 0.5;
  margin-top: 2px;
}

.link-item-main:hover svg {
  opacity: 1;
}

.link-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.link-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: inherit;
}

.link-href {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
  color: #B0BEC5;
  max-width: 100%;
}

.link-copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #CFD8DC;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.link-copy-btn:hover {
  background: #ECEFF1;
  color: #607D8B;
}

.link-copy-btn.copied {
  color: #4CAF50;
}

/* 鈹€鈹€鈹€ 鎺掔増鍙傛暟婊戝潡鎺т欢 (useTypography) 鈹€鈹€鈹€ */
.inspector-control {
  padding: 6px 0;
}

.control-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #607D8B;
  margin-bottom: 6px;
}

.control-value {
  font-variant-numeric: tabular-nums;
  color: #263238;
  font-weight: 500;
}

.control-slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #E5E7EB;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.control-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-primary, #D32F2F);
  border: 2px solid #FFFFFF;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.control-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #607D8B;
  padding: 6px 0;
  cursor: default;
}

/* 鈹€鈹€鈹€ 棰勮蹇€熷垏鎹㈡潯 鈹€鈹€鈹€ */
.preset-strip {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.preset-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 5px 8px;
  min-height: 34px;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  background: #FFFFFF;
  font-size: 11px;
  color: #607D8B;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.preset-chip:hover {
  border-color: #CFD8DC;
  background: #F5F5F5;
  color: #263238;
}

.preset-chip.active {
  border-color: var(--accent-primary, #D32F2F);
  background: #FFEBEE;
  color: var(--accent-primary, #D32F2F);
  font-weight: 500;
}

.preset-chip-row-top {
  display: flex;
  align-items: center;
  gap: 4px;
}

.preset-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.preset-name {
  font-size: 11px;
}

.preset-persona {
  font-size: 10px;
  line-height: 1.2;
  opacity: 0.65;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* 鈹€鈹€鈹€ 鎺у埗缁?鈹€鈹€鈹€ */
.control-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.control-group label {
  font-size: 12px;
  color: #607D8B;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 鈹€鈹€鈹€ 首行缩进鍒囨崲 鈹€鈹€鈹€ */
.indent-toggle {
  padding: 4px 12px;
  border: 1px solid #E5E7EB;
  border-radius: 4px;
  background: #FFFFFF;
  color: #90A4AE;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 48px;
  text-align: center;
}

.indent-toggle:hover {
  border-color: #CFD8DC;
}

.indent-toggle.active {
  border-color: var(--accent-primary, #D32F2F);
  background: #FFEBEE;
  color: var(--accent-primary, #D32F2F);
  font-weight: 500;
}

/* 鈹€鈹€鈹€ 鑼冨洿婊戝潡 鈹€鈹€鈹€ */
.range-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.inspector-range {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #E5E7EB;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.inspector-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-primary, #D32F2F);
  border: 2px solid #FFFFFF;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.range-value {
  font-size: 11px;
  color: #90A4AE;
  min-width: 36px;
  text-align: right;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

/* 鈹€鈹€鈹€ 标题风格閫夐」 鈹€鈹€鈹€ */
.style-options {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.style-option {
  padding: 3px 8px;
  border: 1px solid #E5E7EB;
  border-radius: 4px;
  background: #FFFFFF;
  color: #90A4AE;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.style-option:hover {
  border-color: #CFD8DC;
  color: #607D8B;
}

.style-option.active {
  border-color: var(--accent-primary, #D32F2F);
  background: #FFEBEE;
  color: var(--accent-primary, #D32F2F);
  font-weight: 500;
}

/* 鈹€鈹€鈹€ 瀛楀彿姝ヨ繘鍣?鈹€鈹€鈹€ */
.stepper {
  display: flex;
  align-items: center;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  overflow: hidden;
}

.stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: #FFFFFF;
  color: #607D8B;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.stepper-btn:hover:not(:disabled) {
  background: #F5F5F5;
  color: #263238;
}

.stepper-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.stepper-value {
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
  color: #263238;
  border-left: 1px solid #E5E7EB;
  border-right: 1px solid #E5E7EB;
  min-width: 48px;
  text-align: center;
  line-height: 28px;
  font-variant-numeric: tabular-nums;
}

/* 鈹€鈹€鈹€ 字体棰勮 鈹€鈹€鈹€ */
.font-preview {
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid #F0F1F3;
  border-radius: 6px;
  background: #FAFBFC;
  color: #607D8B;
  word-break: break-word;
}

/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
   Spinner 鍔ㄧ敾
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/

.spinner {
  animation: spin 1s linear infinite;
}

/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
   Focus Overlay (涓撴敞妯″紡鏆楄)
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/

.focus-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 50;
  opacity: 0;
  transition: opacity 0.5s;
  background: radial-gradient(
    ellipse 80% 60% at 50% 50%,
    transparent 0%,
    rgba(0, 0, 0, 0.03) 60%,
    rgba(0, 0, 0, 0.08) 100%
  );
}

.focus-mode .focus-overlay {
  opacity: 1;
}

.focus-mode.focus-vignette .focus-overlay {
  background:
    linear-gradient(
      to bottom,
      rgba(38, 50, 56, 0.14) 0,
      transparent var(--focus-vignette-height),
      transparent calc(100% - var(--focus-vignette-height)),
      rgba(38, 50, 56, 0.14) 100%
    ),
    radial-gradient(
      ellipse 80% 60% at 50% 50%,
      transparent 0%,
      rgba(0, 0, 0, 0.03) 60%,
      rgba(0, 0, 0, 0.08) 100%
    );
}

.focus-exit-btn {
  position: fixed;
  top: 18px;
  right: 20px;
  z-index: 120;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: rgba(38, 50, 56, 0.18);
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  opacity: 0.3;
  backdrop-filter: blur(10px);
  transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.focus-exit-btn:hover {
  opacity: 0.8;
  transform: translateY(-1px);
  background: rgba(38, 50, 56, 0.32);
}

.focus-exit-shortcut {
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 11px;
}

/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
   涓撴敞妯″紡
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/

.focus-mode .panel-manager,
.focus-mode .panel-stage,
.focus-mode .panel-inspector {
  width: 0;
  min-width: 0;
  border-width: 0;
  overflow: hidden;
}

.focus-mode .panel-manager.collapsed,
.focus-mode .panel-stage.collapsed,
.focus-mode .panel-inspector.collapsed {
  width: 0;
  min-width: 0;
}

.focus-mode .workstation-header {
  opacity: 0.3;
  transition: opacity 0.3s;
}

.focus-mode .workstation-header:hover {
  opacity: 1;
}

/* focus mode 涓嬮殣钘忛《鏍忔搷浣滃尯锛岄伩鍏嶄笌 .focus-exit-btn (top:18/right:20) 閲嶅彔 */
.focus-mode .workstation-header .header-actions,
.focus-mode .workstation-header .layout-presets,
.focus-mode .workstation-header .publish-btn {
  display: none;
}

/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
   婊氬姩鏉?
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/

.stage-body::-webkit-scrollbar,
.panel-body::-webkit-scrollbar,
.inspector-scroll::-webkit-scrollbar {
  width: 4px;
}

.stage-body::-webkit-scrollbar-track,
.panel-body::-webkit-scrollbar-track,
.inspector-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.stage-body::-webkit-scrollbar-thumb,
.panel-body::-webkit-scrollbar-thumb,
.inspector-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}

.stage-body::-webkit-scrollbar-thumb:hover,
.panel-body::-webkit-scrollbar-thumb:hover,
.inspector-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
   Reduced Motion
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/

@media (prefers-reduced-motion: reduce) {
  .workstation *,
  .workstation *::before,
  .workstation *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* ── 模式切换 Toast ── */
.mode-switch-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1200;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(38, 50, 56, 0.92);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.24);
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
}

.mode-toast-enter-active,
.mode-toast-leave-active {
  transition: opacity 0.22s ease, transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.mode-toast-enter-from {
  opacity: 0;
  transform: translate(-50%, 12px);
}

.mode-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}

@media (prefers-reduced-motion: reduce) {
  .mode-toast-enter-active,
  .mode-toast-leave-active {
    transition: opacity 0.1s ease;
  }
}
</style>
