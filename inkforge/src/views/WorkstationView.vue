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
import { onBeforeRouteLeave, useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { Editor as TiptapEditor } from '@tiptap/core'
import {
  AppWindow,
  ArrowLeft,
  Blocks,
  ChartNoAxesColumn,
  Check,
  ChevronDown,
  Columns2,
  Copy,
  Eye,
  Folder,
  GitBranch,
  GripHorizontal,
  Link2,
  ListTree,
  Maximize2,
  MessageSquare,
  Minimize2,
  MoveDiagonal2,
  PanelLeftClose,
  Send,
  Tags,
  Type,
  Unlink,
  Upload,
  X,
} from 'lucide-vue-next'
import { useEditorStore } from '@/stores/editor'
import { useArticleStore } from '@/stores/article'
import { useCategoryStore } from '@/stores/category'
import { useSettingsStore, type TypographySettings } from '@/stores/settings'
import { useCrashRecoveryStore } from '@/stores/crashRecovery'
import { useWritingAssistStore } from '@/stores/writingAssist'
import { useCommandPaletteStore } from '@/stores/command-palette'
import { useProfileStore } from '@/stores/profile'
import { useLayoutPersistenceStore } from '@/stores/layoutPersistence'
import { useTocStore } from '@/stores/toc'
import { useWorkstationTabsStore } from '@/stores/workstationTabs'
import type { WorkstationTab, WorkstationTabDocType, WorkstationTabSaveState } from '@/stores/workstationTabs'
import type { WorkstationCommandBridge } from '@/types/command-palette'
import {
  convertToNativeFormat,
  copyTextToClipboard,
  copyWechatHtmlToClipboard,
  getPlatformPresets,
  getWechatRenderingRuleCatalog,
  parseDeliveryAdornmentConfig,
  type CodeTheme,
  type DeliveryAdornmentConfig,
  type NativeExportOptions,
  type Platform,
  type PresetVisualSignature,
} from '@/services/export'
import { usePreviewRenderer } from '@/composables/usePreviewRenderer'
import { useVersionManager } from '@/composables/useVersionManager'
import {
  computeContentWordCount,
  computeWritingWindowStats,
  type WritingGoalProgress,
  type WritingWindowEntry,
} from '@/composables/useTextStats'
import { logger } from '@/services/error'
import type { AssetRecord } from '@/utils/db'
import { DEFAULT_PROFILE_ID } from '@/services/profile/types'
import { layoutPersistenceService, type LayoutStatePatch, type LayoutStateRecord, type SerializedTab } from '@/services/layout-persistence'
import type { Article } from '@/schemas/article'
import { FONT_STACKS, type FontFamily } from '@/constants'
import { isDraftBoxStatus } from '@/core/lifecycle'
import { useTypography } from '@/composables/useTypography'
import { useSyncScroll } from '@/composables/useSyncScroll'
import { useEdgeMagnetism } from '@/composables/useEdgeMagnetism'
import { resolveExportIcon } from '@/utils/iconography'
import { isTauriEnv } from '@/utils/platform'
import { closeNativeWindow, createInspectorWidgetWindow, focusNativeWindow } from '@/services/desktop'
import {
  buildDocumentStatistics,
  clampInspectorWidgetLayout,
  createDefaultInspectorWidgetLayouts,
  extractExternalLinks,
  INSPECTOR_WIDGET_CHANNEL,
  INSPECTOR_WIDGET_EVENTS,
  INSPECTOR_WIDGET_IDS,
  INSPECTOR_WIDGET_META,
  InspectorWidgetChannelMessageSchema,
  InspectorWidgetHandshakeSchema,
  normalizeInspectorWidgetLayouts,
  type InspectorWidgetId,
  type InspectorWidgetHandshake,
  type InspectorWidgetLayout,
  type InspectorWidgetLayouts,
  type InspectorWidgetPayload,
  type InspectorWidgetPlacement,
} from '@/services/inspector-widgets'
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
import WritingAssistPanel from '@/components/editor/WritingAssistPanel.vue'
import FocusSessionSummaryModal from '@/components/editor/FocusSessionSummaryModal.vue'
import AssetManager from '@/components/asset/AssetManager.vue'
import DeliverySettingsModal from '@/components/export/DeliverySettingsModal.vue'
import ExportModal from '@/components/export/ExportModal.vue'
import TagBrowser from '@/components/tag-system/TagBrowser.vue'
import AIChatPanel from '@/components/ai/AIChatPanel.vue'
import WorkstationTabBar, { type WorkstationTabBarItem } from '@/components/workstation/WorkstationTabBar.vue'
import InspectorWidgetActions from '@/components/workstation/InspectorWidgetActions.vue'
import InspectorWidgetContent from '@/components/workstation/InspectorWidgetContent.vue'

// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
// Router & Stores
// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

const router = useRouter()
const route = useRoute()
const editorStore = useEditorStore()
const articleStore = useArticleStore()
const categoryStore = useCategoryStore()
const settingsStore = useSettingsStore()
const crashRecoveryStore = useCrashRecoveryStore()
const writingAssistStore = useWritingAssistStore()
const commandPaletteStore = useCommandPaletteStore()
const profileStore = useProfileStore()
const layoutPersistenceStore = useLayoutPersistenceStore()
const tocStore = useTocStore()
const workstationTabsStore = useWorkstationTabsStore()
workstationTabsStore.initialize()

const versionManager = useVersionManager(editorStore)
const { updateAutoSnapshotConfig } = versionManager

watch(
  () => ({
    enabled: settingsStore.settings.data.autoBackup,
    interval: settingsStore.settings.data.backupInterval,
    maxBackups: settingsStore.settings.data.maxBackups,
  }),
  ({ enabled, interval, maxBackups }) => {
    const safeIntervalMinutes = Number.isFinite(interval)
      ? Math.min(240, Math.max(1, Math.trunc(interval)))
      : 7
    const safeMaxBackups = Number.isFinite(maxBackups)
      ? Math.min(50, Math.max(1, Math.trunc(maxBackups)))
      : 5

    updateAutoSnapshotConfig({
      enabled,
      intervalMs: safeIntervalMinutes * 60 * 1000,
      maxBackups: safeMaxBackups,
    })
  },
  { immediate: true, deep: true },
)

const {
  status: editorStatus,
  currentContent,
} = storeToRefs(editorStore)

const { articles, selectedArticle, selectedArticleId } = storeToRefs(articleStore)
const { categories } = storeToRefs(categoryStore)
const articleCategory = computed(() => {
  const categoryId = selectedArticle.value?.categoryId
  return categoryId
    ? categories.value.find(category => category.id === categoryId)?.name
    : undefined
})
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
  insertAssetImage?: (asset: AssetRecord) => boolean
  openComponentLibrary?: () => boolean
  flushPendingChanges?: () => Promise<void>
}

const editorPanelRef = ref<EditorPanelExpose | null>(null)
const outlineEditor = computed(() => editorPanelRef.value?.getBodyEditor?.())

function handleAssetInsert(asset: AssetRecord): void {
  const inserted = editorPanelRef.value?.insertAssetImage?.(asset) ?? false
  if (inserted) return

  const message = asset.type === 'image' || asset.type === 'svg'
    ? '当前预览模式不可插入素材，请切换到 Typora 或源码模式'
    : '仅支持将图片或 SVG 素材插入编辑器'
  showTransientToast(message)
}

function openWritingComponentLibrary(): void {
  if (editorPanelRef.value?.openComponentLibrary?.()) return
  showTransientToast('请切换到 Typora 或源码模式后插入组件')
}

async function flushPendingEditorChangesBeforeRoute(): Promise<boolean> {
  if (!editorStore.currentContent) {
    return true
  }

  try {
    await editorPanelRef.value?.flushPendingChanges?.()
    return true
  } catch (error) {
    logger.warn('[Workstation] navigation blocked because editor flush failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

onBeforeRouteLeave(flushPendingEditorChangesBeforeRoute)

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
const EDITOR_MODE_CYCLE: readonly EditorMode[] = ['typora', 'source']
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
const SPLIT_VIEW_MIN_CONTAINER_WIDTH = 720
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
  stage: { default: 400, min: 360, max: 520 },
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
      managerCollapsed: true,
      stageCollapsed: true,
      inspectorCollapsed: true,
    },
    source: {
      managerCollapsed: true,
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
    description: '保留文件管理与平台预览，检查器从右缘按需展开',
    layout: { managerCollapsed: false, stageCollapsed: false, inspectorCollapsed: true },
    widths: createDefaultPanelWidths(),
    focusMode: false,
  },
  {
    id: 'writing',
    label: '写作',
    description: '保留文件管理，收起预览与检查器并扩大正文区域',
    layout: { managerCollapsed: false, stageCollapsed: true, inspectorCollapsed: true },
    widths: { manager: 280, stage: 360, inspector: 260 },
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
const showStagePanel = computed(() => editorMode.value !== 'source' && editorMode.value !== 'preview' && !splitViewEnabled.value)

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
const managerCollapsed = ref(true)
const managerPanelRef = ref<HTMLElement | null>(null)
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
const workstationRootEl = ref<HTMLElement | null>(null)
const osPrefersReducedMotion = ref(false)
const effectiveReducedMotion = computed(
  () => settingsStore.settings.appearance.reducedMotion || osPrefersReducedMotion.value,
)
let reducedMotionMediaQuery: InstanceType<typeof globalThis.MediaQueryList> | null = null
const inspectorWidgetLayouts = ref<InspectorWidgetLayouts>(createDefaultInspectorWidgetLayouts())
const inspectorWidgetMenuOpen = ref(false)
const activeFloatingWidgetId = ref<InspectorWidgetId | null>(null)
let inspectorWidgetDrag: {
  surfaceId: InspectorWidgetId
  mode: 'move' | 'resize'
  startX: number
  startY: number
  origin: InspectorWidgetLayout
} | null = null
let nativeInspectorWidgetSyncTimer: ReturnType<typeof setTimeout> | undefined
let nativeInspectorWidgetsRestorePending = false
let inspectorWidgetChannel: InstanceType<typeof window.BroadcastChannel> | null = null
const inspectorWidgetCloseRequests = new Map<string, Promise<boolean>>()
const inspectorWidgetUnlisteners: Array<() => void> = []
let splitViewResizeObserver: ResizeObserver | null = null

const inspectorMagnetismForceCollapsed = computed(() => isFocusMode.value || isPreviewMode.value)
const inspectorMagnetismPaused = computed(() => isFocusMode.value)

const edgeMagnetism = useEdgeMagnetism(inspectorPanelEl, {
  triggerWidth: 12,
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

const floatingInspectorWidgetIds = computed(() => (
  INSPECTOR_WIDGET_IDS.filter(id => inspectorWidgetLayouts.value[id].placement === 'floating')
))

function inspectorWidgetPlacementText(placement: InspectorWidgetPlacement): string {
  return {
    docked: '已停靠',
    floating: '应用内悬浮',
    native: '桌面小组件',
    closed: '已关闭',
  }[placement]
}

function getInspectorWidgetBounds(): { width: number; height: number } {
  const rect = workstationRootEl.value?.getBoundingClientRect()
  return {
    width: rect?.width ?? window.innerWidth,
    height: rect?.height ?? window.innerHeight,
  }
}

function updateInspectorWidgetLayout(
  surfaceId: InspectorWidgetId,
  patch: Partial<InspectorWidgetLayout>,
  persist = true,
): void {
  inspectorWidgetLayouts.value = {
    ...inspectorWidgetLayouts.value,
    [surfaceId]: {
      ...inspectorWidgetLayouts.value[surfaceId],
      ...patch,
    },
  }
  if (persist) scheduleLayoutPersistenceSave()
}

function clampFloatingInspectorWidgets(persist = false): void {
  const bounds = getInspectorWidgetBounds()
  let nextLayouts = inspectorWidgetLayouts.value
  let changed = false

  for (const surfaceId of INSPECTOR_WIDGET_IDS) {
    const layout = nextLayouts[surfaceId]
    if (layout.placement !== 'floating') continue
    const clamped = clampInspectorWidgetLayout(layout, bounds)
    if (
      clamped.x !== layout.x
      || clamped.y !== layout.y
      || clamped.width !== layout.width
      || clamped.height !== layout.height
    ) {
      nextLayouts = { ...nextLayouts, [surfaceId]: clamped }
      changed = true
    }
  }

  if (changed) {
    inspectorWidgetLayouts.value = nextLayouts
    if (persist) scheduleLayoutPersistenceSave()
  }
}

async function closeDetachedInspectorWidget(layout: InspectorWidgetLayout): Promise<boolean> {
  const windowLabel = layout.nativeWindowLabel
  if (!windowLabel) return true
  const pending = inspectorWidgetCloseRequests.get(windowLabel)
  if (pending) return pending

  const request = closeNativeWindow(windowLabel)
    .then(result => {
      if (!result.ok) {
        logger.warn('workstation.inspectorWidget.close.failed', {
          windowLabel,
          reason: result.message,
        })
        showTransientToast(`桌面小组件关闭失败：${result.message}`)
      }
      return result.ok
    })
    .finally(() => inspectorWidgetCloseRequests.delete(windowLabel))
  inspectorWidgetCloseRequests.set(windowLabel, request)
  return request
}

async function focusWorkstationTarget(selector: string): Promise<boolean> {
  await nextTick()
  const target = workstationRootEl.value?.querySelector<HTMLElement>(selector)
  target?.focus()
  return Boolean(target)
}

async function restoreInspectorWidgetSourceFocus(focusMainWindow = false): Promise<void> {
  if (focusMainWindow && isTauriEnv()) {
    const result = await focusNativeWindow('main')
    if (!result.ok) {
      logger.warn('workstation.inspectorWidget.focusMain.failed', { reason: result.message })
    }
  }

  if (await focusWorkstationTarget('.inspector-widget-menu-trigger')) return
  editorPanelRef.value?.getBodyEditor?.()?.commands.focus()
}

function setInspectorWidgetMenuOpen(
  open: boolean,
  options: { restoreFocus?: boolean } = {},
): void {
  inspectorWidgetMenuOpen.value = open
  if (open) {
    void focusWorkstationTarget('#inspector-widget-menu-popover button')
  } else if (options.restoreFocus) {
    void restoreInspectorWidgetSourceFocus()
  }
}

function toggleInspectorWidgetMenu(): void {
  setInspectorWidgetMenuOpen(!inspectorWidgetMenuOpen.value, {
    restoreFocus: inspectorWidgetMenuOpen.value,
  })
}

async function floatInspectorWidget(surfaceId: InspectorWidgetId): Promise<void> {
  const previous = inspectorWidgetLayouts.value[surfaceId]
  if (previous.placement === 'native' && !await closeDetachedInspectorWidget(previous)) return
  const next = clampInspectorWidgetLayout({
    ...previous,
    placement: 'floating',
    nativeWindowLabel: null,
  }, getInspectorWidgetBounds())
  updateInspectorWidgetLayout(surfaceId, next)
  activeFloatingWidgetId.value = surfaceId
  setInspectorWidgetMenuOpen(false)
  void focusWorkstationTarget(
    `[data-inspector-widget-id="${surfaceId}"] .floating-inspector-widget__grip`,
  )
}

async function dockInspectorWidget(surfaceId: InspectorWidgetId): Promise<void> {
  const previous = inspectorWidgetLayouts.value[surfaceId]
  if (previous.placement === 'native' && !await closeDetachedInspectorWidget(previous)) return
  updateInspectorWidgetLayout(surfaceId, {
    placement: 'docked',
    nativeWindowLabel: null,
  })
  setInspectorWidgetMenuOpen(false)
  void restoreInspectorWidgetSourceFocus()
}

async function closeInspectorWidget(surfaceId: InspectorWidgetId): Promise<void> {
  const previous = inspectorWidgetLayouts.value[surfaceId]
  if (previous.placement === 'native' && !await closeDetachedInspectorWidget(previous)) return
  updateInspectorWidgetLayout(surfaceId, {
    placement: 'closed',
    nativeWindowLabel: null,
  })
  setInspectorWidgetMenuOpen(false)
  void restoreInspectorWidgetSourceFocus()
}

async function emitInspectorWidgetState(surfaceId: InspectorWidgetId): Promise<void> {
  if (!isTauriEnv()) return
  const layout = inspectorWidgetLayouts.value[surfaceId]
  if (layout.placement !== 'native' || !layout.nativeWindowLabel) return
  const state = {
    type: 'state' as const,
    data: {
      windowLabel: layout.nativeWindowLabel,
      payload: inspectorWidgetPayload.value,
    },
  }
  inspectorWidgetChannel?.postMessage(state)
  const { emit } = await import('@tauri-apps/api/event')
  await emit(INSPECTOR_WIDGET_EVENTS.state, state.data)
}

function scheduleNativeInspectorWidgetSync(): void {
  clearTimeout(nativeInspectorWidgetSyncTimer)
  nativeInspectorWidgetSyncTimer = setTimeout(() => {
    for (const surfaceId of INSPECTOR_WIDGET_IDS) {
      void emitInspectorWidgetState(surfaceId).catch(error => {
        const message = error instanceof Error ? error.message : String(error)
        logger.warn('workstation.inspectorWidget.sync.failed', { surfaceId, error: message })
        showTransientToast(`小组件同步失败：${message}`)
      })
    }
  }, 80)
}

async function detachInspectorWidgetToDesktop(surfaceId: InspectorWidgetId): Promise<void> {
  const articleId = selectedArticleId.value ?? routeArticleId.value
  if (!articleId) {
    showTransientToast('请先选择一篇文稿，再将检查器摘到桌面')
    return
  }

  const result = await createInspectorWidgetWindow(
    surfaceId,
    getLayoutPersistenceProfileId(),
    articleId,
  )
  if (!result.ok) {
    showTransientToast(`桌面小组件启动失败：${result.message}`)
    return
  }

  updateInspectorWidgetLayout(surfaceId, {
    placement: 'native',
    nativeWindowLabel: result.value,
  })
  setInspectorWidgetMenuOpen(false)
  scheduleNativeInspectorWidgetSync()
}

async function restoreNativeInspectorWidgets(): Promise<void> {
  const nativeSurfaceIds = INSPECTOR_WIDGET_IDS.filter(
    surfaceId => inspectorWidgetLayouts.value[surfaceId].placement === 'native',
  )
  if (nativeSurfaceIds.length === 0) {
    nativeInspectorWidgetsRestorePending = false
    return
  }
  const articleId = selectedArticleId.value ?? routeArticleId.value
  if (!articleId) {
    nativeInspectorWidgetsRestorePending = true
    return
  }
  nativeInspectorWidgetsRestorePending = false

  for (const surfaceId of nativeSurfaceIds) {
    const layout = inspectorWidgetLayouts.value[surfaceId]
    if (layout.placement !== 'native') continue
    const result = await createInspectorWidgetWindow(
      surfaceId,
      getLayoutPersistenceProfileId(),
      articleId,
    )
    if (!result.ok) {
      updateInspectorWidgetLayout(surfaceId, {
        placement: 'docked',
        nativeWindowLabel: null,
      })
      logger.warn('workstation.inspectorWidget.restore.failed', {
        surfaceId,
        reason: result.message,
      })
      continue
    }
    updateInspectorWidgetLayout(surfaceId, {
      placement: 'native',
      nativeWindowLabel: result.value,
    }, false)
  }
  scheduleLayoutPersistenceSave()
  scheduleNativeInspectorWidgetSync()
}

async function handleInspectorWidgetHandshake(
  action: 'ready' | 'redock' | 'close',
  handshake: InspectorWidgetHandshake,
): Promise<void> {
  const layout = inspectorWidgetLayouts.value[handshake.surfaceId]
  if (layout.placement !== 'native' || layout.nativeWindowLabel !== handshake.windowLabel) return
  if (action === 'ready') {
    await emitInspectorWidgetState(handshake.surfaceId)
    return
  }
  if (!await closeDetachedInspectorWidget(layout)) return
  const current = inspectorWidgetLayouts.value[handshake.surfaceId]
  if (current.placement !== 'native' || current.nativeWindowLabel !== handshake.windowLabel) return
  updateInspectorWidgetLayout(handshake.surfaceId, {
    placement: action === 'redock' ? 'docked' : 'closed',
    nativeWindowLabel: null,
  })
  void restoreInspectorWidgetSourceFocus(true)
}

function initializeInspectorWidgetChannel(): void {
  if (typeof window.BroadcastChannel === 'undefined') return
  inspectorWidgetChannel?.close()
  inspectorWidgetChannel = new window.BroadcastChannel(INSPECTOR_WIDGET_CHANNEL)
  inspectorWidgetChannel.onmessage = event => {
    const parsed = InspectorWidgetChannelMessageSchema.safeParse(event.data)
    if (!parsed.success || parsed.data.type === 'state') return
    void handleInspectorWidgetHandshake(parsed.data.type, parsed.data.data)
  }
}

async function initializeInspectorWidgetEvents(): Promise<void> {
  if (!isTauriEnv()) return
  const { listen } = await import('@tauri-apps/api/event')

  const bind = async (
    eventName: string,
    action: 'ready' | 'redock' | 'close',
  ): Promise<void> => {
    inspectorWidgetUnlisteners.push(await listen<unknown>(eventName, event => {
      const parsed = InspectorWidgetHandshakeSchema.safeParse(event.payload)
      if (parsed.success) void handleInspectorWidgetHandshake(action, parsed.data)
    }))
  }

  await bind(INSPECTOR_WIDGET_EVENTS.ready, 'ready')
  await bind(INSPECTOR_WIDGET_EVENTS.redock, 'redock')
  await bind(INSPECTOR_WIDGET_EVENTS.close, 'close')
}

function handleInspectorWidgetPointerMove(event: PointerEvent): void {
  if (!inspectorWidgetDrag) return
  const { surfaceId, mode, startX, startY, origin } = inspectorWidgetDrag
  const deltaX = event.clientX - startX
  const deltaY = event.clientY - startY
  const next = mode === 'move'
    ? { ...origin, x: origin.x + deltaX, y: origin.y + deltaY }
    : { ...origin, width: origin.width + deltaX, height: origin.height + deltaY }
  updateInspectorWidgetLayout(
    surfaceId,
    clampInspectorWidgetLayout(next, getInspectorWidgetBounds()),
    false,
  )
}

function stopInspectorWidgetDrag(): void {
  if (!inspectorWidgetDrag) return
  inspectorWidgetDrag = null
  window.removeEventListener('pointermove', handleInspectorWidgetPointerMove)
  window.removeEventListener('pointerup', stopInspectorWidgetDrag)
  scheduleLayoutPersistenceSave()
}

function startInspectorWidgetDrag(
  event: PointerEvent,
  surfaceId: InspectorWidgetId,
  mode: 'move' | 'resize',
): void {
  if (event.button !== 0) return
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus()
  event.preventDefault()
  stopInspectorWidgetDrag()
  activeFloatingWidgetId.value = surfaceId
  inspectorWidgetDrag = {
    surfaceId,
    mode,
    startX: event.clientX,
    startY: event.clientY,
    origin: { ...inspectorWidgetLayouts.value[surfaceId] },
  }
  window.addEventListener('pointermove', handleInspectorWidgetPointerMove)
  window.addEventListener('pointerup', stopInspectorWidgetDrag, { once: true })
}

function handleInspectorWidgetKeydown(
  event: KeyboardEvent,
  surfaceId: InspectorWidgetId,
  mode: 'move' | 'resize',
): void {
  const directions: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  }
  const direction = directions[event.key]
  if (!direction) return
  event.preventDefault()
  const step = event.shiftKey ? 24 : 8
  const current = inspectorWidgetLayouts.value[surfaceId]
  const next = mode === 'move'
    ? { ...current, x: current.x + direction[0] * step, y: current.y + direction[1] * step }
    : { ...current, width: current.width + direction[0] * step, height: current.height + direction[1] * step }
  updateInspectorWidgetLayout(
    surfaceId,
    clampInspectorWidgetLayout(next, getInspectorWidgetBounds()),
  )
}

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
    inspectorPinned: inspectorPinned.value,
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
    inspectorWidgets: normalizeInspectorWidgetLayouts(inspectorWidgetLayouts.value),
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
  return splitViewRightScrollRef.value?.querySelector('.preview-content') ?? splitViewRightScrollRef.value
}

const splitSyncScroll = useSyncScroll({
  enabled: computed(() => splitViewSyncScroll.value),
  active: computed(() => isSplitViewActive.value),
  leftScrollElement: getSplitLeftScrollElement,
  rightScrollElement: getSplitRightScrollElement,
  previewRootElement: getSplitPreviewRootElement,
  editor: () => editorMode.value === 'typora' ? outlineEditor.value : undefined,
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

interface ResolvedPersistedLayoutTabs {
  openTabs: SerializedTab[]
  activeTabId: string | null
  removedTabIds: string[]
  nextActiveArticleId: string | null
}

function resolvePersistedLayoutTabs(record: LayoutStateRecord): ResolvedPersistedLayoutTabs {
  const articlesById = new Map(articleStore.articles.map(article => [article.id, article]))
  const validation = layoutPersistenceService.validateSerializedTabs(
    record.openTabs,
    record.activeTabId,
    Array.from(articlesById.keys()),
  )
  const openTabs = validation.openTabs.map(tab => ({
    ...tab,
    title: articlesById.get(tab.articleId)?.title ?? tab.title,
  }))

  const activeTabArticleId = openTabs.find(tab => tab.id === validation.activeTabId)?.articleId ?? null
  const persistedActiveArticleId = record.activeArticleId && articlesById.has(record.activeArticleId)
    ? record.activeArticleId
    : null

  return {
    openTabs,
    activeTabId: validation.activeTabId,
    removedTabIds: validation.removedTabIds,
    nextActiveArticleId: activeTabArticleId ?? persistedActiveArticleId ?? openTabs[0]?.articleId ?? null,
  }
}

function applyPersistedLayoutTabs(resolvedTabs: ResolvedPersistedLayoutTabs): void {
  workstationTabsStore.restoreFromLayout(resolvedTabs.openTabs, resolvedTabs.activeTabId)

  if (resolvedTabs.removedTabIds.length > 0) {
    logger.warn('workstation.sessionRestore.removedMissingTabs', {
      removedTabIds: resolvedTabs.removedTabIds,
    })
  }
}

async function applyPersistedLayoutRecord(record: LayoutStateRecord): Promise<boolean> {
  const resolvedTabs = resolvePersistedLayoutTabs(record)
  const requestedArticle = routeArticleId.value
    ? articleStore.articles.find(article => article.id === routeArticleId.value) ?? null
    : null
  const persistedArticle = resolvedTabs.nextActiveArticleId
    ? articleStore.articles.find(article => article.id === resolvedTabs.nextActiveArticleId) ?? null
    : null
  const nextActiveArticle = requestedArticle ?? persistedArticle ?? selectedArticle.value

  if (
    nextActiveArticle
    && !await transitionToWorkstationArticle(nextActiveArticle.id)
  ) {
    logger.warn('workstation.layoutPersistence.restore.navigationRejected', {
      articleId: nextActiveArticle.id,
    })
    return false
  }

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
    inspectorPinned.value = record.inspectorPinned
    splitViewEnabled.value = record.splitViewEnabled
    splitViewRatio.value = clampSplitRatio(record.splitViewRatio)
    splitViewSyncScroll.value = record.splitViewSyncScroll
    splitViewLeftFontScale.value = clampSplitFontScale(record.splitViewLeftFontScale)
    splitViewRightFontScale.value = clampSplitFontScale(record.splitViewRightFontScale)
    inspectorWidgetLayouts.value = normalizeInspectorWidgetLayouts(record.inspectorWidgets)
    applyPersistedLayoutTabs(resolvedTabs)
  })

  await nextTick()
  clampFloatingInspectorWidgets()

  if (nextActiveArticle) {
    workstationTabsStore.openOrRefreshTab({
      articleId: nextActiveArticle.id,
      title: nextActiveArticle.title,
      docType: getWorkstationTabDocType(nextActiveArticle),
    })
  }

  return true
}

async function initializeLayoutPersistence(): Promise<void> {
  const profileId = getLayoutPersistenceProfileId()
  try {
    const result = await layoutPersistenceStore.initialize(profileId)
    if (result.record) {
      await applyPersistedLayoutRecord(result.record)
    }
    await restoreNativeInspectorWidgets()
    await layoutPersistenceStore.cleanupStaleLayouts(profileId)
  } catch (error) {
    logger.warn('workstation.layoutPersistence.restore.failed', {
      profileId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
  applyRequestedManagerTab()
}

function setSplitViewRatio(nextRatio: number): void {
  splitViewRatio.value = clampSplitRatio(nextRatio)
  scheduleLayoutPersistenceSave()
}

function toggleSplitView(): void {
  if (isPreviewMode.value) {
    showTransientToast('预览模式已占用整个编辑区，请返回编辑后启用分栏')
    return
  }

  splitViewEnabled.value = !splitViewEnabled.value
  scheduleLayoutPersistenceSave()
  if (splitViewEnabled.value) {
    void nextTick(() => {
      updateSplitViewAvailability()
      if (!splitViewWideEnough.value) {
        showTransientToast('分栏已保留；请收起侧栏或扩大窗口')
      }
    })
  }
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
  const containerWidth = splitViewContainerRef.value?.clientWidth
  const availableWidth = containerWidth && containerWidth > 0
    ? containerWidth
    : typeof window === 'undefined' ? 0 : window.innerWidth
  splitViewWideEnough.value = availableWidth >= SPLIT_VIEW_MIN_CONTAINER_WIDTH
}

function handleWorkstationResize(): void {
  updateSplitViewAvailability()
  clampFloatingInspectorWidgets(true)
}

watch(splitViewContainerRef, (element) => {
  splitViewResizeObserver?.disconnect()
  splitViewResizeObserver = null
  if (!element || typeof ResizeObserver === 'undefined') {
    updateSplitViewAvailability()
    return
  }
  splitViewResizeObserver = new ResizeObserver(updateSplitViewAvailability)
  splitViewResizeObserver.observe(element)
  updateSplitViewAvailability()
}, { flush: 'post' })

function toggleInspectorPinned(): void {
  inspectorPinned.value = !inspectorPinned.value
  scheduleLayoutPersistenceSave()
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
  const rect = inspectorPanelEl.value?.getBoundingClientRect()
  if (!rect) return
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

function showTransientToast(message: string): void {
  modeSwitchToast.value = { message, visible: true }
  if (modeSwitchToastTimer) clearTimeout(modeSwitchToastTimer)
  modeSwitchToastTimer = setTimeout(() => {
    modeSwitchToast.value = { ...modeSwitchToast.value, visible: false }
    modeSwitchToastTimer = null
  }, 2400)
}

function showModeSwitchToast(mode: EditorMode): void {
  const messageMap: Record<EditorMode, string> = {
    typora: '已切换到 Typora · Ctrl+\\ 切换源码',
    source: '已切换到源码模式 · Ctrl+\\ 切回 Typora',
    preview: '已进入预览模式 · Ctrl+Shift+V 返回',
  }
  showTransientToast(messageMap[mode] ?? '')
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
type ManagerTab = 'files' | 'versions' | 'outline' | 'tags' | 'ai'
const MANAGER_TABS: readonly ManagerTab[] = ['files', 'versions', 'outline', 'tags', 'ai']
const managerTab = ref<ManagerTab>('files')

function applyRequestedManagerTab(): void {
  const rawManager = route.query.manager
  const normalizedManager = Array.isArray(rawManager) ? rawManager[0] : rawManager
  if (typeof normalizedManager !== 'string' || !MANAGER_TABS.includes(normalizedManager as ManagerTab)) {
    return
  }
  managerTab.value = normalizedManager as ManagerTab
  managerCollapsed.value = false
}

watch(
  () => route.query.manager,
  () => applyRequestedManagerTab(),
  { immediate: true },
)

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
// - wechat: 16 个（12 base + 4 SVG flagship）
// - xiaohongshu: 5 个（xhs-*）
// - zhihu: 3 个（zhihu-*）
// Inspector 排版策略条消费此数据（双行 chip：name + persona 微标签）。
const selectedPlatform = ref<Platform>(settingsStore.settings.export.defaultPlatform)
const platformOptions: { value: Platform; label: string }[] = [
  { value: 'wechat', label: '微信' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'zhihu', label: '知乎' },
]
const platformPresetIds = ref<Record<Platform, string>>({
  wechat: 'thesis',
  xiaohongshu: 'xhs-fresh',
  zhihu: 'zhihu-academic',
})
const storedPreviewPresetId = settingsStore.settings.export.defaultPresetId
if (getPlatformPresets(selectedPlatform.value).some(preset => preset.id === storedPreviewPresetId)) {
  platformPresetIds.value[selectedPlatform.value] = storedPreviewPresetId
}
const selectedPreviewPresetId = computed(() => platformPresetIds.value[selectedPlatform.value])

interface WorkstationPresetOption {
  id: string
  name: string
  icon?: string
  description?: string
  persona?: string
  primaryColor: string
  visualSignature?: PresetVisualSignature
}

const topPresets = computed<WorkstationPresetOption[]>(() => {
  const presets = getPlatformPresets(selectedPlatform.value)
  return presets.map(p => ({
    id: p.id,
    name: p.name,
    icon: p.icon,
    description: p.description,
    persona: p.persona,
    primaryColor: p.primaryColor,
    visualSignature: p.visualSignature,
  }))
})

const selectedPresetOption = computed(() => (
  topPresets.value.find(preset => preset.id === selectedPreviewPresetId.value)
    ?? topPresets.value[0]
))

const wechatRenderingRuleByPreset = new Map(
  getWechatRenderingRuleCatalog().map(rule => [rule.presetId, rule]),
)
const selectedWechatRenderingRule = computed(() => (
  selectedPlatform.value === 'wechat'
    ? wechatRenderingRuleByPreset.get(selectedPreviewPresetId.value)
    : undefined
))

const selectedPresetSignatureHighlights = computed(() => {
  const rule = selectedWechatRenderingRule.value
  if (rule) {
    return [
      { label: '报头', value: rule.zones.masthead },
      { label: '标题', value: rule.zones.headingRhythm },
      { label: '正文', value: rule.zones.bodyFlow },
      { label: '语义', value: rule.zones.semanticBlocks.join(' · ') },
      { label: '投递', value: rule.zones.componentsAndDelivery.join(' · ') },
      { label: '文末', value: rule.zones.ending },
    ]
  }

  const signature = selectedPresetOption.value?.visualSignature
  if (!signature) return []
  return [
    { label: '节奏', value: signature.rhythm },
    { label: '标题', value: signature.heading },
    { label: '引用', value: signature.quote },
  ]
})

function applyPreset(presetId: string): void {
  platformPresetIds.value[selectedPlatform.value] = presetId
  settingsStore.settings.export.defaultPlatform = selectedPlatform.value
  settingsStore.settings.export.defaultPresetId = presetId
}

// 鈹€鈹€鈹€ 鎺掔増鎺у埗锛坈omposable锛?鈹€鈹€鈹€
const {
  typography,
  sliderControls: typographySliders,
  updateTypography,
} = useTypography()

interface TypographyChoice<T extends string> {
  value: T
  label: string
}

const textAlignStyles: TypographyChoice<TypographySettings['textAlign']>[] = [
  { value: 'left', label: '左对齐' },
  { value: 'justify', label: '两端对齐' },
]

const headingScales: TypographyChoice<TypographySettings['headingScale']>[] = [
  { value: 'compact', label: '克制' },
  { value: 'balanced', label: '均衡' },
  { value: 'display', label: '醒目' },
]

const headingStyles: TypographyChoice<TypographySettings['headingStyle']>[] = [
  { value: 'none', label: '无' },
  { value: 'underline', label: '下划线' },
  { value: 'background', label: '背景' },
  { value: 'border-left', label: '左侧边线' },
  { value: 'pill', label: '胶囊' },
  { value: 'marker', label: '马克笔' },
]

// 鈹€鈹€鈹€ 寮曠敤鍧楅鏍?鈹€鈹€鈹€
const blockquoteStyles: TypographyChoice<TypographySettings['blockquoteStyle']>[] = [
  { value: 'classic', label: '经典' },
  { value: 'modern', label: '现代' },
  { value: 'minimal', label: '极简' },
  { value: 'card', label: '卡片' },
  { value: 'double-line', label: '双线' },
]

const dividerStyles: TypographyChoice<TypographySettings['dividerStyle']>[] = [
  { value: 'line', label: '细线' },
  { value: 'dots', label: '点阵' },
  { value: 'ornament', label: '双线章' },
]

const mediaStyles: TypographyChoice<TypographySettings['mediaStyle']>[] = [
  { value: 'plain', label: '原图' },
  { value: 'rounded', label: '柔角' },
  { value: 'framed', label: '装裱' },
]

const fontFamilyOptions: Array<{ value: FontFamily; label: string; sample: string }> = [
  { value: 'serif', label: '宋体', sample: '文' },
  { value: 'sans', label: '黑体', sample: '文' },
  { value: 'kai', label: '楷体', sample: '文' },
  { value: 'fangsong', label: '仿宋', sample: '文' },
  { value: 'wenkai', label: '文楷', sample: '文' },
  { value: 'humanist', label: '人文', sample: '文' },
  { value: 'mono', label: '等宽', sample: 'Aa' },
]

const fontFamilyMap = FONT_STACKS

const currentFontStack = computed(() => {
  const key = settingsStore.settings.appearance.fontFamily
  return fontFamilyMap[key] ?? FONT_STACKS.serif
})

function selectPreviewPlatform(platform: Platform): void {
  selectedPlatform.value = platform
  settingsStore.settings.export.defaultPlatform = platform
  settingsStore.settings.export.defaultPresetId = selectedPreviewPresetId.value
  scheduleNativeInspectorWidgetSync()
}

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
const showDeliverySettings = ref(false)
const deliverySettingsSection = ref<'overview' | 'song' | 'profile' | 'license'>('overview')

async function openExportModal(): Promise<void> {
  if (!await flushPendingEditorChangesBeforeRoute()) {
    showTransientToast('当前文稿保存失败，暂时无法打开导出')
    return
  }
  showExportModal.value = true
}

function openDeliverySettings(section: 'overview' | 'song' | 'profile' | 'license' = 'overview'): void {
  deliverySettingsSection.value = section
  showDeliverySettings.value = true
}

function updateDeliveryAdornment(value: DeliveryAdornmentConfig): void {
  settingsStore.settings.export.deliveryAdornment = value
}

function openPublishCenter(): void {
  const articleId = currentContent.value?.articleId
  void router.push({
    path: '/publish',
    query: articleId ? { id: articleId } : {},
  })
}

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

const activeWorkstationTabSaveState = computed<WorkstationTabSaveState>(() => {
  if (editorStatus.value === 'error') return 'error'
  if (editorStatus.value === 'saving' || editorSyncState.value === 'syncing') return 'saving'
  if (editorStatus.value === 'ready' && editorSyncState.value === 'synced') return 'clean'
  return 'pending'
})

const saveStatusText = computed<string>(() => {
  if (activeWorkstationTabSaveState.value === 'error') return '保存失败'
  if (activeWorkstationTabSaveState.value === 'saving') {
    return editorSyncState.value === 'syncing' ? '同步中…' : '保存中…'
  }
  if (activeWorkstationTabSaveState.value === 'clean') return '已同步 · 已保存'
  if (editorSyncState.value === 'offline') return '离线 · 待同步'
  if (editorStatus.value === 'loading') return '加载中…'
  if (editorStatus.value === 'idle') return '就绪'
  return '未保存'
})

const normalizedBody = computed(() => {
  const rawBody = currentContent.value?.body ?? ''
  return isLikelyHtmlContent(rawBody) ? serializeHtmlToMarkdown(rawBody) : rawBody
})

watch(
  () => [normalizedBody.value, isSplitViewActive.value, splitViewRatio.value] as const,
  () => {
    if (isSplitViewActive.value && splitViewSyncScroll.value) {
      splitSyncScroll.scheduleRebuild()
    }
  },
  { flush: 'post' },
)

watch(editorMode, () => {
  if (isSplitViewActive.value && splitViewSyncScroll.value) {
    splitSyncScroll.rebind()
  }
}, { flush: 'post' })

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
    && !articles.value.some(article => article.id === activeArticleId)
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
const workstationTabTransitionPending = ref(false)

const workstationTabBarItems = computed<WorkstationTabBarItem[]>(() => (
  workstationTabsStore.orderedTabs.map(tab => ({
    ...tab,
    saveState: tab.id === workstationTabsStore.activeTabId
      ? activeWorkstationTabSaveState.value
      : 'clean',
  }))
))

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

async function replaceWorkstationRouteArticle(articleId: string): Promise<boolean> {
  if (route.name === 'Workstation' && routeArticleId.value === articleId) {
    return true
  }

  try {
    const failure = await router.replace({
      name: 'Workstation',
      query: {
        ...route.query,
        id: articleId,
      },
    })
    if (failure !== undefined) {
      logger.warn('[Workstation] article route navigation was rejected', {
        articleId,
        failure: failure.message,
      })
      return false
    }
    return route.name === 'Workstation' && routeArticleId.value === articleId
  } catch (error) {
    logger.warn('[Workstation] article route navigation failed', {
      articleId,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

function applyWorkstationTabActivation(tabId: string): boolean {
  const tab = workstationTabsStore.activateTab(tabId)
  if (!tab || !hasArticle(tab.articleId)) {
    return false
  }

  if (selectedArticleId.value !== tab.articleId) {
    articleStore.selectArticle(tab.articleId)
  }
  return true
}

async function transitionToWorkstationArticle(targetArticleId: string, targetTabId?: string): Promise<boolean> {
  if (!hasArticle(targetArticleId)) {
    return false
  }

  if (workstationTabTransitionPending.value) {
    return false
  }

  workstationTabTransitionPending.value = true
  try {
    if (
      targetArticleId !== selectedArticleId.value
      && !await flushPendingEditorChangesBeforeRoute()
    ) {
      return false
    }

    if (!await replaceWorkstationRouteArticle(targetArticleId)) {
      return false
    }

    if (targetTabId) {
      return applyWorkstationTabActivation(targetTabId)
    }

    if (selectedArticleId.value !== targetArticleId) {
      articleStore.selectArticle(targetArticleId)
    }
    return true
  } finally {
    workstationTabTransitionPending.value = false
  }
}

async function requestWorkstationArticleSelection(articleId: string): Promise<boolean> {
  const targetTab = workstationTabsStore.orderedTabs.find(tab => tab.articleId === articleId)
  return transitionToWorkstationArticle(articleId, targetTab?.id)
}

async function activateWorkstationTab(tabId: string): Promise<boolean> {
  const targetTab = workstationTabsStore.orderedTabs.find(tab => tab.id === tabId)
  if (!targetTab || !hasArticle(targetTab.articleId)) {
    return false
  }

  return transitionToWorkstationArticle(targetTab.articleId, tabId)
}

async function closeWorkstationTab(tabId: string): Promise<void> {
  const closesActiveArticle = tabId === workstationTabsStore.activeTabId
  if (closesActiveArticle && workstationTabTransitionPending.value) {
    return
  }

  if (closesActiveArticle) {
    workstationTabTransitionPending.value = true
  }

  try {
    if (closesActiveArticle && !await flushPendingEditorChangesBeforeRoute()) {
      return
    }

    if (!closesActiveArticle) {
      workstationTabsStore.closeTab(tabId)
      return
    }

    const orderedTabs = workstationTabsStore.orderedTabs
    const closingIndex = orderedTabs.findIndex(tab => tab.id === tabId)
    if (closingIndex === -1) {
      return
    }
    const remainingTabs = orderedTabs.filter(tab => tab.id !== tabId)
    const nextActiveTab: WorkstationTab | null = (
      remainingTabs[closingIndex]
      ?? remainingTabs[closingIndex - 1]
      ?? remainingTabs[remainingTabs.length - 1]
      ?? null
    )

    if (nextActiveTab) {
      if (!hasArticle(nextActiveTab.articleId)) {
        return
      }
      if (!await replaceWorkstationRouteArticle(nextActiveTab.articleId)) {
        return
      }
    } else {
      try {
        const failure = await router.push({ name: 'Hub' })
        if (failure !== undefined) {
          logger.warn('[Workstation] closing the last tab was rejected by the router', {
            tabId,
            failure: failure.message,
          })
          return
        }
        if (route.name !== 'Hub') {
          logger.warn('[Workstation] closing the last tab did not reach Hub', { tabId })
          return
        }
      } catch (error) {
        logger.warn('[Workstation] closing the last tab could not leave Workstation', {
          tabId,
          error: error instanceof Error ? error.message : String(error),
        })
        return
      }
    }

    const result = workstationTabsStore.closeTab(tabId)
    if (!result) {
      return
    }

    if (result.nextActiveTabId) {
      applyWorkstationTabActivation(result.nextActiveTabId)
    }
  } finally {
    if (closesActiveArticle) {
      workstationTabTransitionPending.value = false
    }
  }
}

function closeActiveWorkstationTab(): void {
  const activeId = workstationTabsStore.activeTabId
  if (activeId) {
    void closeWorkstationTab(activeId)
  }
}

function togglePinnedWorkstationTab(tabId: string): void {
  workstationTabsStore.togglePinnedTab(tabId)
}

function reorderWorkstationTab(payload: { draggedTabId: string; targetTabId: string; position: 'before' | 'after' }): void {
  workstationTabsStore.reorderTab(payload.draggedTabId, payload.targetTabId, payload.position)
}

async function restoreClosedWorkstationTab(): Promise<void> {
  if (workstationTabTransitionPending.value) {
    return
  }

  workstationTabTransitionPending.value = true
  try {
    if (!await flushPendingEditorChangesBeforeRoute()) {
      return
    }

    const candidate = workstationTabsStore.recentlyClosed[0]
    if (!candidate) {
      return
    }

    if (!hasArticle(candidate.articleId)) {
      const stale = workstationTabsStore.restoreRecentlyClosed()
      if (stale) {
        workstationTabsStore.closeTab(stale.id, { remember: false })
      }
      return
    }

    if (!await replaceWorkstationRouteArticle(candidate.articleId)) {
      return
    }

    const restored = workstationTabsStore.restoreRecentlyClosed()
    if (!restored) {
      return
    }
    applyWorkstationTabActivation(restored.id)
  } finally {
    workstationTabTransitionPending.value = false
  }
}

function handleWorkstationTabShortcut(event: KeyboardEvent): boolean {
  if (
    !(event.ctrlKey || event.metaKey)
    || event.altKey
    || workstationTabTransitionPending.value
  ) {
    return false
  }

  if (event.key === 'Tab') {
    const tabs = workstationTabsStore.orderedTabs
    if (tabs.length < 2) {
      return false
    }

    const currentIndex = tabs.findIndex(tab => tab.id === workstationTabsStore.activeTabId)
    const startIndex = currentIndex === -1
      ? (event.shiftKey ? 0 : -1)
      : currentIndex
    const nextIndex = (startIndex + (event.shiftKey ? -1 : 1) + tabs.length) % tabs.length
    const nextTab = tabs[nextIndex]
    if (!nextTab) {
      return false
    }

    event.preventDefault()
    void activateWorkstationTab(nextTab.id)
    return true
  }

  const normalizedKey = normalizeShortcutKey(event)
  if (!normalizedKey) {
    return false
  }

  if (!event.shiftKey && normalizedKey === 'W') {
    const activeTab = workstationTabsStore.orderedTabs.find(
      tab => tab.id === workstationTabsStore.activeTabId,
    )
    if (!activeTab || activeTab.isPinned) {
      return false
    }

    event.preventDefault()
    closeActiveWorkstationTab()
    return true
  }

  if (event.shiftKey && normalizedKey === 'T') {
    if (workstationTabsStore.recentlyClosed.length === 0) {
      return false
    }

    event.preventDefault()
    void restoreClosedWorkstationTab()
    return true
  }

  if (!event.shiftKey && /^[1-9]$/u.test(normalizedKey)) {
    const tabs = workstationTabsStore.orderedTabs
    const shortcutIndex = Number(normalizedKey)
    const targetTab = shortcutIndex === 9
      ? tabs[tabs.length - 1]
      : tabs[shortcutIndex - 1]
    if (!targetTab) {
      return false
    }

    event.preventDefault()
    void activateWorkstationTab(targetTab.id)
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
  if (activeArticleStatus.value && isDraftBoxStatus(activeArticleStatus.value)) {
    await router.push({ name: 'Drafts' })
    return
  }

  await router.push({ name: 'Hub' })
}

// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
// 棰勮娓叉煋锛堟櫤鑳介槻鎶?composable锛?
// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

const platformArtifactOptions = computed<NativeExportOptions>(() => {
  const appearance = settingsStore.settings.appearance
  const exportSettings = settingsStore.settings.export
  const typography = {
    ...appearance.typography,
    fontFamily: appearance.fontFamily,
  }

  return {
    presetId: selectedPreviewPresetId.value,
    exportOptions: {
      articleTitle: currentContent.value?.title || selectedArticle.value?.title || undefined,
      articleCategory: articleCategory.value,
      enableCiteStatus: exportSettings.convertFootnotes,
      enableLineNumbers: exportSettings.lineNumbers,
      enableReadingTime: exportSettings.deliveryAdornment.readingTime.enabled,
      readingSpeed: exportSettings.deliveryAdornment.readingTime.wordsPerMinute,
      enableMacCodeBlock: exportSettings.macCodeBlock,
      enableTextIndent: appearance.typography.paragraphIndent,
      codeTheme: exportSettings.codeTheme as CodeTheme,
      customCss: exportSettings.customCss || undefined,
      deliveryAdornment: parseDeliveryAdornmentConfig(exportSettings.deliveryAdornment),
      typography,
    },
    overrides: {
      primaryColor: appearance.accentColor,
      fontFamily: appearance.fontFamily,
      typography,
    },
    includeQualityReport: false,
  }
})

const { previewHtml, previewLoading, lastRenderTime, previewMeta } = usePreviewRenderer({
  body: computed(() => normalizedBody.value),
  platform: selectedPlatform,
  getExportSettings: () => ({
    ...settingsStore.settings.export,
    defaultPresetId: selectedPreviewPresetId.value,
    articleTitle: currentContent.value?.title || selectedArticle.value?.title || undefined,
    articleCategory: articleCategory.value,
  }),
  getAppearance: () => ({
    accentColor: settingsStore.settings.appearance.accentColor,
    fontFamily: settingsStore.settings.appearance.fontFamily,
    typography: {
      ...settingsStore.settings.appearance.typography,
      fontFamily: settingsStore.settings.appearance.fontFamily,
    },
  }),
  getNativeExportOptions: () => platformArtifactOptions.value,
})
const editorWechatStats = computed(() => (
  selectedPlatform.value === 'wechat' ? previewMeta.value?.stats : undefined
))

// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
// 引用链接鎻愬彇
// 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?

const extractedLinks = computed(() => extractExternalLinks(normalizedBody.value))
const selectedPlatformLabel = computed(() => (
  platformOptions.find(option => option.value === selectedPlatform.value)?.label ?? selectedPlatform.value
))
const platformCopyLabel = computed(() => ({
  wechat: '复制微信富文本',
  xiaohongshu: '复制小红书文本',
  zhihu: '复制知乎 Markdown',
})[selectedPlatform.value])
const inspectorWidgetPayload = computed<InspectorWidgetPayload>(() => ({
  articleId: selectedArticleId.value ?? routeArticleId.value,
  articleTitle: currentContent.value?.title || selectedArticle.value?.title || '未命名文稿',
  platform: selectedPlatform.value,
  platformLabel: selectedPlatformLabel.value,
  previewHtml: previewHtml.value,
  previewLoading: previewLoading.value,
  previewIsSample: Boolean(previewMeta.value?.isSample),
  links: extractedLinks.value,
  statistics: buildDocumentStatistics(
    normalizedBody.value,
    writingGoalProgress.value.currentDocumentWords,
    extractedLinks.value.length,
  ),
  updatedAt: Date.now(),
}))

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
  if (!await flushPendingEditorChangesBeforeRoute()) {
    showTransientToast('当前文稿保存失败，暂时无法复制')
    return
  }
  const markdown = normalizedBody.value
  if (!markdown.trim()) {
    showTransientToast('当前文章没有可复制的正文')
    return
  }

  const platform = selectedPlatform.value

  try {
    const result = await convertToNativeFormat(markdown, platform, platformArtifactOptions.value)
    if (!result.content.trim()) {
      showTransientToast('平台输出为空，请检查正文')
      return
    }

    const ok = result.format === 'html'
      ? await copyWechatHtmlToClipboard(result.content)
      : await copyTextToClipboard(result.content)
    if (!ok) {
      showTransientToast('复制失败，请检查剪贴板权限')
      return
    }

    const title = (currentContent.value?.title?.trim() || '未命名文章').slice(0, 120)
    settingsStore.recordExportHistory({
      platform: result.platform,
      title: `${title} · 快速平台输出`,
      bytes: new Blob([result.content]).size,
      action: 'copy',
    })
    copySuccess.value = true
    clearTimeout(copyFeedbackTimer)
    copyFeedbackTimer = setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (error) {
    logger.error('workstation.platformOutput.copyFailed', error, { platform })
    showTransientToast('复制平台输出失败，请重试')
  }
}

function toggleFocusMode() {
  if (isFocusMode.value) {
    exitFocusMode()
    return
  }

  enterFocusMode()
}

interface ManagerPanelEditorAnchor {
  scrollElement: HTMLElement
  scrollTop: number
  selectionViewportTop: number | null
}

function getEditorSelectionViewportTop(): number | null {
  const editor = editorPanelRef.value?.getBodyEditor?.()
  if (!editor) return null

  try {
    return editor.view.coordsAtPos(editor.state.selection.head).top
  } catch (error) {
    logger.debug('[Workstation] unable to capture editor selection geometry', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

function captureManagerPanelEditorAnchor(): ManagerPanelEditorAnchor | null {
  const scrollElement = editorPanelRef.value?.getEditorScrollElement?.()
  if (!scrollElement) return null

  const anchor = {
    scrollElement,
    scrollTop: scrollElement.scrollTop,
    selectionViewportTop: getEditorSelectionViewportTop(),
  }
  return anchor
}

function waitForManagerLayoutFrame(): Promise<void> {
  return new Promise(resolve => {
    window.requestAnimationFrame(() => resolve())
  })
}

function waitForManagerPanelTransition(): Promise<void> {
  const panel = managerPanelRef.value
  if (!panel || effectiveReducedMotion.value) {
    return waitForManagerLayoutFrame()
  }

  const transitionStyle = window.getComputedStyle(panel)
  const parseCssTime = (value: string): number => {
    const parsed = Number.parseFloat(value)
    if (!Number.isFinite(parsed)) return 0
    return value.trim().endsWith('ms') ? parsed : parsed * 1000
  }
  const durations = transitionStyle.transitionDuration.split(',').map(parseCssTime)
  const delays = transitionStyle.transitionDelay.split(',').map(parseCssTime)
  const transitionTotalMs = durations.reduce((longest, duration, index) => (
    Math.max(longest, duration + (delays[index % delays.length] ?? 0))
  ), 0)
  if (transitionTotalMs <= 0) {
    return waitForManagerLayoutFrame()
  }

  return new Promise(resolve => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      panel.removeEventListener('transitionend', handleTransitionEnd)
      panel.removeEventListener('transitioncancel', handleTransitionEnd)
      resolve()
    }
    const handleTransitionEnd = (event: InstanceType<typeof globalThis.TransitionEvent>) => {
      if (event.target !== panel || (event.propertyName !== 'width' && event.propertyName !== 'min-width')) {
        return
      }
      finish()
    }
    const timeoutId = window.setTimeout(finish, Math.ceil(transitionTotalMs) + 50)
    panel.addEventListener('transitionend', handleTransitionEnd)
    panel.addEventListener('transitioncancel', handleTransitionEnd)
  })
}

async function restoreManagerPanelEditorAnchor(anchor: ManagerPanelEditorAnchor): Promise<void> {
  await nextTick()
  await waitForManagerLayoutFrame()
  const initialScrollElement = editorPanelRef.value?.getEditorScrollElement?.() ?? anchor.scrollElement
  initialScrollElement.scrollTop = anchor.scrollTop

  await waitForManagerPanelTransition()
  await waitForManagerLayoutFrame()

  const scrollElement = editorPanelRef.value?.getEditorScrollElement?.() ?? anchor.scrollElement
  const selectionViewportTop = getEditorSelectionViewportTop()
  if (anchor.selectionViewportTop !== null && selectionViewportTop !== null) {
    scrollElement.scrollTop += selectionViewportTop - anchor.selectionViewportTop
    return
  }

  scrollElement.scrollTop = anchor.scrollTop
}

function toggleManagerPanel(nextCollapsed = !managerCollapsed.value): void {
  if (managerCollapsed.value === nextCollapsed) return

  const restorePanelFocus = Boolean(managerPanelRef.value?.contains(document.activeElement))
  const editorAnchor = captureManagerPanelEditorAnchor()
  managerCollapsed.value = nextCollapsed
  if (restorePanelFocus) {
    void focusWorkstationTarget(
      nextCollapsed ? '.manager-collapsed-bar' : `[data-manager-tab="${managerTab.value}"]`,
    )
  }
  if (editorAnchor) {
    void restoreManagerPanelEditorAnchor(editorAnchor)
  }
}

function setStageCollapsed(nextCollapsed: boolean): void {
  if (stageCollapsed.value === nextCollapsed) return
  stageCollapsed.value = nextCollapsed
  void focusWorkstationTarget(
    nextCollapsed ? '.stage-collapsed-bar' : '.panel-stage .collapse-trigger',
  )
}

function setInspectorCollapsed(nextCollapsed: boolean): void {
  if (inspectorCollapsed.value === nextCollapsed) return
  inspectorCollapsed.value = nextCollapsed
  if (nextCollapsed) setInspectorWidgetMenuOpen(false)
  void focusWorkstationTarget(
    nextCollapsed ? '.inspector-collapsed-bar' : '.panel-inspector .collapse-trigger',
  )
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
  if (e.defaultPrevented || e.isComposing) {
    return
  }

  if (e.key === 'Escape' && showFocusSummary.value) {
    e.preventDefault()
    closeFocusSummary()
    return
  }

  if (e.key === 'Escape' && inspectorWidgetMenuOpen.value) {
    e.preventDefault()
    setInspectorWidgetMenuOpen(false, { restoreFocus: true })
    return
  }

  if (e.key === 'Escape' && e.target instanceof Element) {
    const floatingWidget = e.target.closest<HTMLElement>('[data-inspector-widget-id]')
    const surfaceId = INSPECTOR_WIDGET_IDS.find(
      id => id === floatingWidget?.dataset.inspectorWidgetId,
    )
    if (surfaceId) {
      e.preventDefault()
      closeInspectorWidget(surfaceId)
      return
    }
  }

  if (handleWorkstationTabShortcut(e)) {
    return
  }

  const saveBinding = getShortcutBinding('save', 'Ctrl+S')
  const outlineBinding = getShortcutBinding('toggleOutline', 'Ctrl+Shift+O')
  const aiChatBinding = getShortcutBinding('toggleAIChat', 'Ctrl+Shift+J')
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

  if (matchesShortcut(e, aiChatBinding)) {
    e.preventDefault()
    if (managerCollapsed.value) {
      managerCollapsed.value = false
    }
    managerTab.value = 'ai'
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

async function syncRouteArticleSelection(targetArticleId: string | null): Promise<void> {
  if (!targetArticleId || selectedArticleId.value === targetArticleId) {
    return
  }

  const hasMatchingArticle = articleStore.articles.some(article => article.id === targetArticleId)
  if (!hasMatchingArticle) {
    return
  }

  if (workstationTabTransitionPending.value) {
    return
  }

  const previousArticleId = selectedArticleId.value
  const targetTab = workstationTabsStore.orderedTabs.find(tab => tab.articleId === targetArticleId)
  const activated = await transitionToWorkstationArticle(targetArticleId, targetTab?.id)
  if (!activated && previousArticleId && routeArticleId.value === targetArticleId) {
    const restored = await replaceWorkstationRouteArticle(previousArticleId)
    if (!restored) {
      logger.warn('[Workstation] rejected route change could not restore the previous article route', {
        previousArticleId,
        targetArticleId,
      })
    }
  }
}

watch(
  [routeArticleId, () => articleStore.articles.length],
  ([nextRouteArticleId]) => {
    void syncRouteArticleSelection(nextRouteArticleId)
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

    void syncRouteArticleSelection(activeId)
  },
  { immediate: true },
)

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
  () => {
    scheduleLayoutPersistenceSave()
    scheduleNativeInspectorWidgetSync()
    if (nativeInspectorWidgetsRestorePending) void restoreNativeInspectorWidgets()
  },
  { flush: 'post' },
)

watch(
  inspectorWidgetPayload,
  scheduleNativeInspectorWidgetSync,
  { deep: true, flush: 'post' },
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

function handleReducedMotionPreferenceChange(
  event: InstanceType<typeof globalThis.MediaQueryListEvent>,
): void {
  osPrefersReducedMotion.value = event.matches
}

onMounted(() => {
  reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  osPrefersReducedMotion.value = reducedMotionMediaQuery.matches
  reducedMotionMediaQuery.addEventListener('change', handleReducedMotionPreferenceChange)
  restoreLayoutForMode(editorMode.value)
  updateSplitViewAvailability()
  initializeInspectorWidgetChannel()
  void initializeLayoutPersistence()
  void initializeInspectorWidgetEvents()
    .catch(error => {
      logger.warn('workstation.inspectorWidget.initialize.failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    })
  window.addEventListener('resize', handleWorkstationResize)
  window.addEventListener('pagehide', handlePageHide)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  reducedMotionMediaQuery?.removeEventListener('change', handleReducedMotionPreferenceChange)
  reducedMotionMediaQuery = null
  splitViewResizeObserver?.disconnect()
  splitViewResizeObserver = null
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('pagehide', handlePageHide)
  window.removeEventListener('resize', handleWorkstationResize)
  stopSplitDividerDrag()
  stopInspectorWidgetDrag()
  clearTimeout(copyFeedbackTimer)
  clearTimeout(nativeInspectorWidgetSyncTimer)
  inspectorWidgetChannel?.close()
  inspectorWidgetChannel = null
  inspectorWidgetUnlisteners.splice(0).forEach(unlisten => unlisten())
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
    openExportModal,
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
  '--focus-cursor-position': `${writingAssistStore.cursorPosition * 100}%`,
  '--focus-vignette-intensity': `${Number.isFinite(writingAssistStore.vignette.intensity)
    ? writingAssistStore.vignette.intensity
    : 0.18}`,
  '--split-left-ratio': `${splitViewRatio.value}`,
  '--split-right-ratio': `${1 - splitViewRatio.value}`,
  '--split-left-font-size': `${splitViewLeftFontScale.value}px`,
  '--split-right-font-size': `${splitViewRightFontScale.value}px`,
}))
</script>

<template>
  <div
    ref="workstationRootEl"
    class="workstation"
    :class="{ 'focus-mode': isFocusMode, 'focus-vignette': writingAssistStore.vignette.isEnabled, 'split-view-active': isSplitViewActive, 'reduce-motion': effectiveReducedMotion, [`mode-${editorMode}`]: true }"
    :data-reduced-motion="effectiveReducedMotion ? 'true' : 'false'"
    :style="workstationLayoutStyle"
  >
    <!-- Focus Overlay (涓撴敞妯″紡鏆楄) -->
    <div class="focus-overlay" />

    <!-- 鈺愨晲鈺?Header (52px, 瀵归綈鍘熷瀷) 鈺愨晲鈺?-->
    <header class="workstation-header">
      <button
        type="button"
        class="icon-btn header-back-btn"
        aria-label="返回首页"
        title="返回首页"
        @click="handleBack"
      >
        <ArrowLeft :size="17" />
      </button>

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
          :class="activeWorkstationTabSaveState === 'error' ? 'error' : activeWorkstationTabSaveState === 'clean' ? 'saved' : 'unsaved'"
          :data-save-state="activeWorkstationTabSaveState"
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
          :title="copySuccess ? '已复制' : platformCopyLabel"
          @click="handleCopyToClipboard"
        >
          <Check
            v-if="copySuccess"
            :size="16"
          />
          <Copy
            v-else
            :size="16"
          />
        </button>

        <!-- 导出 -->
        <button
          class="icon-btn"
          :disabled="!hasContent"
          title="导出"
          @click="openExportModal"
        >
          <Upload :size="16" />
        </button>

        <!-- 涓撴敞妯″紡 -->
        <button
          class="icon-btn"
          :class="{ active: isFocusMode }"
          :title="isFocusMode ? '退出专注模式 (F11)' : '进入专注模式 (F11)'"
          @click="toggleFocusMode"
        >
          <Maximize2
            v-if="!isFocusMode"
            :size="16"
          />
          <Minimize2
            v-else
            :size="16"
          />
        </button>

        <!-- 布局预设 -->
        <div
          class="layout-presets"
          aria-label="布局预设"
        >
          <button
            v-for="preset in WORKSTATION_LAYOUT_PRESETS.filter(item => item.id === 'default' || item.id === 'writing')"
            :key="preset.id"
            type="button"
            class="layout-preset-btn"
            :class="{ active: activeLayoutPresetId === preset.id }"
            :title="preset.description"
            @click="applyLayoutPreset(preset.id)"
          >
            {{ preset.label }}
          </button>
        </div>

        <div
          class="workstation-mode-group"
          aria-label="工作模式"
        >
          <button
            type="button"
            class="mode-action-btn"
            data-testid="workstation-review-mode"
            :class="{ active: activeLayoutPresetId === 'review' }"
            :aria-pressed="activeLayoutPresetId === 'review'"
            title="展开审阅布局"
            @click="applyLayoutPreset('review')"
          >
            审阅
          </button>
          <button
            type="button"
            class="mode-action-btn"
            :class="{ active: splitViewEnabled, unavailable: splitViewEnabled && !splitViewWideEnough }"
            :aria-pressed="splitViewEnabled"
            :aria-expanded="isSplitViewActive"
            aria-controls="split-view-preview-pane"
            :title="splitViewEnabled && !splitViewWideEnough ? '分栏已保留；请收起侧栏或扩大窗口' : '切换分栏视图 (Ctrl+Shift+E)'"
            @click="toggleSplitView"
          >
            <Columns2 :size="15" />
            <span>分栏</span>
          </button>
        </div>

        <!-- 发布鎸夐挳 CTA -->
        <button
          class="publish-btn"
          :disabled="!hasContent"
          @click="openPublishCenter"
        >
          <Send
            class="publish-nib-arrow"
            :size="14"
          />
          发布
        </button>
      </div>
    </header>

    <WorkstationTabBar
      v-if="workstationTabBarItems.length > 0"
      v-show="!isFocusMode"
      :tabs="workstationTabBarItems"
      :active-tab-id="workstationTabsStore.activeTabId"
      :recently-closed-count="workstationTabsStore.recentlyClosed.length"
      @activate="activateWorkstationTab"
      @close="closeWorkstationTab"
      @toggle-pin="togglePinnedWorkstationTab"
      @restore-closed="restoreClosedWorkstationTab"
      @reorder="reorderWorkstationTab"
    />

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
    <div
      class="main-content"
      :class="{ 'stage-is-collapsed': stageCollapsed }"
    >
      <!-- 鈹€鈹€鈹€ 宸︽爮 (Manager) 鈹€鈹€鈹€ -->
      <aside
        ref="managerPanelRef"
        class="panel panel-manager"
        :class="{ collapsed: managerCollapsed }"
      >
        <!-- 鎶樺彔鎬佺珫鏍囩 -->
        <button
          v-if="managerCollapsed"
          type="button"
          class="manager-collapsed-bar"
          aria-label="展开文件管理面板"
          @click="toggleManagerPanel(false)"
        >
          <span class="manager-collapsed-indicator" />
        </button>

        <!-- 灞曞紑鎬佸唴瀹?-->
        <template v-else>
          <!-- Tab 鏍?-->
          <div class="panel-tabs">
            <div class="panel-tab-strip">
              <button
                type="button"
                class="panel-tab"
                :class="{ active: managerTab === 'files' }"
                data-manager-tab="files"
                :aria-pressed="managerTab === 'files'"
                title="文件"
                @click="managerTab = 'files'"
              >
                <Folder
                  :size="15"
                  aria-hidden="true"
                />
                <span>文件</span>
              </button>
              <button
                type="button"
                class="panel-tab"
                :class="{ active: managerTab === 'versions' }"
                data-manager-tab="versions"
                :aria-pressed="managerTab === 'versions'"
                title="版本"
                @click="managerTab = 'versions'"
              >
                <GitBranch
                  :size="15"
                  aria-hidden="true"
                />
                <span>版本</span>
              </button>
              <button
                type="button"
                class="panel-tab"
                :class="{ active: managerTab === 'outline' }"
                data-manager-tab="outline"
                :aria-pressed="managerTab === 'outline'"
                title="大纲"
                @click="managerTab = 'outline'"
              >
                <ListTree
                  :size="15"
                  aria-hidden="true"
                />
                <span>大纲</span>
              </button>
              <button
                type="button"
                class="panel-tab"
                :class="{ active: managerTab === 'tags' }"
                data-manager-tab="tags"
                :aria-pressed="managerTab === 'tags'"
                title="标签"
                @click="managerTab = 'tags'"
              >
                <Tags
                  :size="15"
                  aria-hidden="true"
                />
                <span>标签</span>
              </button>
              <button
                type="button"
                class="panel-tab"
                :class="{ active: managerTab === 'ai' }"
                data-manager-tab="ai"
                :aria-pressed="managerTab === 'ai'"
                title="对话"
                @click="managerTab = 'ai'"
              >
                <MessageSquare
                  :size="15"
                  aria-hidden="true"
                />
                <span>对话</span>
              </button>
            </div>

            <!-- 鎶樺彔鎸夐挳 -->
            <button
              type="button"
              class="collapse-trigger"
              title="收起面板"
              aria-label="收起文件管理面板"
              @click="toggleManagerPanel(true)"
            >
              <PanelLeftClose
                :size="14"
                aria-hidden="true"
              />
            </button>
          </div>

          <!-- Tab 鍐呭 -->
          <div class="panel-body">
            <div
              v-show="managerTab === 'files'"
              class="tab-content"
            >
              <FileManager :request-article-selection="requestWorkstationArticleSelection" />
            </div>
            <div
              v-show="managerTab === 'versions'"
              class="tab-content"
            >
              <VersionPanel :manager="versionManager" />
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
              <TagBrowser :request-article-selection="requestWorkstationArticleSelection" />
            </div>
            <div
              v-show="managerTab === 'ai'"
              class="tab-content"
            >
              <AIChatPanel :editor="outlineEditor" />
            </div>
          </div>
        </template>
      </aside>

      <!-- 鈹€鈹€鈹€ 缂栬緫鍣ㄦ爮 鈹€鈹€鈹€ -->
      <main
        id="workstation-document-panel"
        class="panel panel-editor"
        :class="{ 'panel-editor--preview': isPreviewMode, 'panel-editor--split': isSplitViewActive }"
        :role="workstationTabsStore.activeTabId ? 'tabpanel' : 'region'"
        :aria-labelledby="workstationTabsStore.activeTabId ? 'workstation-tab-' + workstationTabsStore.activeTabId : undefined"
        :aria-label="workstationTabsStore.activeTabId ? undefined : 'Document workspace'"
      >
        <!-- Vignette Overlay (暗角聚焦，独立于 focus mode，锚定在编辑区) -->
        <div
          v-if="writingAssistStore.vignette.isEnabled"
          class="vignette-overlay"
          aria-hidden="true"
        />

        <button
          v-if="isFocusMode"
          type="button"
          class="focus-exit-btn"
          title="退出专注模式 (Esc)"
          @click="toggleFocusMode"
        >
          <span>退出专注</span>
          <span class="focus-exit-shortcut">Esc</span>
        </button>

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
                :article-category="articleCategory"
                :wechat-stats="editorWechatStats"
                @sync-state-change="handleEditorSyncStateChange"
                @toggle-editor-mode="toggleEditorMode"
                @open-delivery-settings="openDeliverySettings"
              />
            </div>
          </section>

          <div
            v-if="splitViewEnabled && !splitViewWideEnough"
            class="split-view-unavailable"
            role="status"
          >
            <Columns2 :size="20" />
            <div>
              <strong>分栏空间不足</strong>
              <span>收起左侧、预览或已停靠检查器，或扩大窗口后会自动恢复。</span>
            </div>
            <button
              type="button"
              @click="toggleSplitView"
            >
              取消分栏
            </button>
          </div>

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
                  <Link2
                    v-if="splitViewSyncScroll"
                    :size="14"
                    aria-hidden="true"
                  />
                  <Unlink
                    v-else
                    :size="14"
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  class="split-toolbar-btn"
                  title="关闭分栏视图"
                  aria-label="关闭分栏视图"
                  @click="toggleSplitView"
                >
                  <X
                    :size="14"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
            <div
              ref="splitViewRightScrollRef"
              class="split-preview-content"
            >
              <div
                class="preview-device-frame"
                :data-platform="selectedPlatform"
              >
                <div
                  v-if="previewLoading"
                  class="preview-loading"
                >
                  正在生成平台预览...
                </div>
                <div
                  v-else-if="!previewHtml"
                  class="preview-empty"
                >
                  暂无可预览内容
                </div>
                <div
                  v-else
                  class="preview-content"
                  v-html="previewHtml"
                />
              </div>
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
            <div
              class="preview-device-frame"
              :data-platform="selectedPlatform"
            >
              <div
                v-if="previewLoading"
                class="preview-loading"
              >
                正在生成平台预览...
              </div>
              <div
                v-else-if="!previewHtml"
                class="preview-empty"
              >
                暂无可预览内容
              </div>
              <div
                v-else
                class="preview-content"
                v-html="previewHtml"
              />
            </div>
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
        <button
          v-if="stageCollapsed"
          type="button"
          class="stage-collapsed-bar"
          aria-label="展开预览面板"
          @click="setStageCollapsed(false)"
        >
          <span class="stage-collapsed-indicator" />
        </button>

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
                @click="selectPreviewPlatform(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
            <div class="stage-header-actions">
              <InspectorWidgetActions
                surface-id="platform-preview"
                :placement="inspectorWidgetLayouts['platform-preview'].placement"
                @float="floatInspectorWidget('platform-preview')"
                @native="void detachInspectorWidgetToDesktop('platform-preview')"
                @dock="dockInspectorWidget('platform-preview')"
                @close="closeInspectorWidget('platform-preview')"
              />
              <button
                type="button"
                class="collapse-trigger"
                title="收起面板"
                aria-label="收起预览面板"
                @click="setStageCollapsed(true)"
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
          </div>

          <div class="stage-body">
            <!-- iPhone 璁惧妗?-->
            <div
              v-if="inspectorWidgetLayouts['platform-preview'].placement === 'docked'"
              class="device-frame"
              :data-platform="selectedPlatform"
            >
              <!-- 鍒樻捣锛堥粦鑹插渾瑙掔煩褰級 -->
              <div class="device-notch" />
              <!-- 灞忓箷鍐呭鍖哄煙 -->
              <div class="device-screen">
                <InspectorWidgetContent
                  surface-id="platform-preview"
                  :payload="inspectorWidgetPayload"
                  variant="stage"
                />
              </div>
              <!-- Home Indicator锛堢伆鑹插渾瑙掓潯锛?-->
              <div class="device-home-indicator" />
            </div>

            <div
              v-else
              class="stage-widget-placeholder"
            >
              <Eye :size="24" />
              <strong>平台预览{{ inspectorWidgetPlacementText(inspectorWidgetLayouts['platform-preview'].placement) }}</strong>
              <span>复制和导出仍使用同一份真实渲染结果；需要在此查看时可立即重新停靠。</span>
              <button
                type="button"
                @click="dockInspectorWidget('platform-preview')"
              >
                重新停靠预览
              </button>
            </div>

            <!-- 棰勮蹇€熼€夋嫨锛堝綋鍓嶅钩鍙板墠 5 涓級 -->
            <!-- 鎿嶄綔鎸夐挳缁?-->
            <div class="stage-actions">
              <button
                type="button"
                class="stage-btn-secondary"
                :disabled="!hasContent"
                aria-label="打开组件库"
                @click="openWritingComponentLibrary"
              >
                <Blocks :size="14" />
                组件
              </button>
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
                {{ copySuccess ? '已复制' : platformCopyLabel }}
              </button>
              <button
                class="stage-btn-secondary"
                :disabled="!hasContent"
                @click="openExportModal"
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
        <button
          v-if="inspectorCollapsed"
          type="button"
          class="inspector-collapsed-bar"
          aria-label="展开检查器面板"
          @click="setInspectorCollapsed(false)"
        >
          <span class="inspector-collapsed-indicator" />
        </button>

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
            <div class="inspector-widget-menu">
              <button
                type="button"
                class="inspector-widget-menu-trigger"
                :class="{ active: inspectorWidgetMenuOpen }"
                aria-label="管理检查器小组件"
                :aria-expanded="inspectorWidgetMenuOpen"
                aria-controls="inspector-widget-menu-popover"
                title="管理检查器小组件"
                @click.stop="toggleInspectorWidgetMenu"
              >
                <AppWindow :size="13" />
              </button>
              <Transition name="inspector-window">
                <section
                  v-if="inspectorWidgetMenuOpen"
                  id="inspector-widget-menu-popover"
                  class="inspector-widget-menu-popover"
                  role="dialog"
                  aria-label="检查器窗口"
                  :data-capability-count="INSPECTOR_WIDGET_IDS.length"
                  @click.stop
                >
                  <header class="inspector-widget-menu-popover__header">
                    <span>
                      <strong>检查器窗口</strong>
                      <small>停靠、应用内悬浮或侧载到桌面</small>
                    </span>
                    <button
                      type="button"
                      aria-label="关闭检查器窗口管理"
                      title="关闭"
                      @click="setInspectorWidgetMenuOpen(false, { restoreFocus: true })"
                    >
                      <X :size="14" />
                    </button>
                  </header>
                  <div class="inspector-widget-menu-popover__list">
                    <article
                      v-for="surfaceId in INSPECTOR_WIDGET_IDS"
                      :key="surfaceId"
                      class="inspector-widget-menu-item"
                      :data-capability-id="surfaceId"
                      :data-placement="inspectorWidgetLayouts[surfaceId].placement"
                    >
                      <div class="inspector-widget-menu-item__identity">
                        <span class="inspector-widget-menu-item__icon">
                          <Eye
                            v-if="surfaceId === 'platform-preview'"
                            :size="14"
                          />
                          <Link2
                            v-else-if="surfaceId === 'references'"
                            :size="14"
                          />
                          <ChartNoAxesColumn
                            v-else
                            :size="14"
                          />
                        </span>
                        <span>
                          <strong>{{ INSPECTOR_WIDGET_META[surfaceId].title }}</strong>
                          <small>{{ inspectorWidgetPlacementText(inspectorWidgetLayouts[surfaceId].placement) }}</small>
                        </span>
                      </div>
                      <InspectorWidgetActions
                        :surface-id="surfaceId"
                        :placement="inspectorWidgetLayouts[surfaceId].placement"
                        @float="floatInspectorWidget(surfaceId)"
                        @native="void detachInspectorWidgetToDesktop(surfaceId)"
                        @dock="dockInspectorWidget(surfaceId)"
                        @close="closeInspectorWidget(surfaceId)"
                      />
                    </article>
                  </div>
                </section>
              </Transition>
            </div>
            <button
              type="button"
              class="inspector-pin-btn"
              :class="{ active: inspectorPinned }"
              :title="inspectorPinned ? '已钉住，再次点击恢复磁吸' : '钉住右栏（禁用磁吸自动收起）'"
              :aria-pressed="inspectorPinned"
              @click="toggleInspectorPinned"
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
              type="button"
              class="collapse-trigger"
              title="收起右栏"
              aria-label="收起检查器面板"
              @click="setInspectorCollapsed(true)"
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
                  type="button"
                  class="accent-dot"
                  :class="{ active: settingsStore.settings.appearance.accentColor === color.value }"
                  :style="{ background: color.value }"
                  :title="color.label"
                  :aria-label="color.label"
                  :aria-pressed="settingsStore.settings.appearance.accentColor === color.value"
                  @click="selectAccentColor(color.value)"
                >
                  <Check
                    v-if="settingsStore.settings.appearance.accentColor === color.value"
                    :size="12"
                    :stroke-width="3"
                    color="#fff"
                    aria-hidden="true"
                  />
                </button>
              </div>

              <!-- 棰勮蹇€熷垏鎹㈡潯 -->
              <div class="preset-strip">
                <button
                  v-for="preset in topPresets"
                  :key="preset.id"
                  type="button"
                  class="preset-chip"
                  :class="{ active: selectedPreviewPresetId === preset.id }"
                  :title="preset.description"
                  :aria-pressed="selectedPreviewPresetId === preset.id"
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

              <div
                v-if="selectedPresetOption?.visualSignature"
                :key="selectedPresetOption.id"
                class="preset-signature-card"
                :style="{ '--preset-accent': selectedPresetOption.primaryColor }"
                :data-rendering-rule-preset="selectedWechatRenderingRule?.presetId"
                aria-live="polite"
              >
                <div class="preset-signature-card__header">
                  <strong>{{ selectedPresetOption.name }}</strong>
                  <span>{{ selectedWechatRenderingRule ? '构图规则 v1' : '视觉签名' }}</span>
                </div>
                <dl class="preset-signature-card__details">
                  <div
                    v-for="item in selectedPresetSignatureHighlights"
                    :key="item.label"
                  >
                    <dt>{{ item.label }}</dt>
                    <dd>{{ item.value }}</dd>
                  </div>
                </dl>
                <div class="preset-signature-card__modules">
                  <span
                    v-for="moduleName in selectedPresetOption.visualSignature.modules"
                    :key="moduleName"
                  >{{ moduleName }}</span>
                </div>
              </div>

              <router-link
                to="/themes"
                class="inspector-link"
              >
                查看全部预设
              </router-link>

              <details
                v-if="selectedPlatform === 'wechat'"
                class="inspector-advanced-settings"
              >
                <summary class="inspector-advanced-settings__summary">
                  <span class="inspector-advanced-settings__copy">
                    <strong>高级排版参数</strong>
                    <small>微信安全字体、节奏与模块装饰</small>
                  </span>
                  <ChevronDown
                    class="inspector-advanced-settings__chevron"
                    :size="14"
                  />
                </summary>
                <div class="inspector-advanced-settings__body">

              <!-- 版心宽度（从底部状态栏迁移） -->
              <div class="control-group">
                <label>版心宽度</label>
                <div class="style-options">
                  <button
                    v-for="opt in editorWidthOptions"
                    :key="opt.value"
                    type="button"
                    class="style-option"
                    :class="{ active: editorWidth === opt.value }"
                    :title="opt.title"
                    :aria-pressed="editorWidth === opt.value"
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
                  :aria-label="ctrl.label"
                  @input="updateTypography(key, Number(($event.target as HTMLInputElement).value))"
                >
              </div>

              <!-- 首行缩进寮€鍏?-->
              <div class="control-toggle">
                <span>首行缩进</span>
                <button
                  type="button"
                  class="indent-toggle"
                  :class="{ active: typography.paragraphIndent }"
                  :aria-pressed="typography.paragraphIndent"
                  @click="updateTypography('paragraphIndent', !typography.paragraphIndent)"
                >
                  {{ typography.paragraphIndent ? '2em' : '无' }}
                </button>
              </div>

              <div class="control-group">
                <label>正文对齐</label>
                <div class="style-options">
                  <button
                    v-for="style in textAlignStyles"
                    :key="style.value"
                    type="button"
                    class="style-option"
                    :class="{ active: typography.textAlign === style.value }"
                    :aria-pressed="typography.textAlign === style.value"
                    @click="typography.textAlign = style.value"
                  >
                    {{ style.label }}
                  </button>
                </div>
              </div>

              <div class="control-group">
                <label>标题层级</label>
                <div class="style-options">
                  <button
                    v-for="style in headingScales"
                    :key="style.value"
                    type="button"
                    class="style-option"
                    :class="{ active: typography.headingScale === style.value }"
                    :aria-pressed="typography.headingScale === style.value"
                    @click="typography.headingScale = style.value"
                  >
                    {{ style.label }}
                  </button>
                </div>
              </div>

              <!-- 鏍囬瑁呴グ椋庢牸 -->
              <div class="control-group">
                <label>标题风格</label>
                <div class="style-options">
                  <button
                    v-for="style in headingStyles"
                    :key="style.value"
                    type="button"
                    class="style-option"
                    :class="{ active: typography.headingStyle === style.value }"
                    :aria-pressed="typography.headingStyle === style.value"
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
                    type="button"
                    class="style-option"
                    :class="{ active: typography.blockquoteStyle === style.value }"
                    :aria-pressed="typography.blockquoteStyle === style.value"
                    @click="typography.blockquoteStyle = style.value"
                  >
                    {{ style.label }}
                  </button>
                </div>
              </div>

              <div class="control-group">
                <label>分隔线</label>
                <div class="style-options">
                  <button
                    v-for="style in dividerStyles"
                    :key="style.value"
                    type="button"
                    class="style-option"
                    :class="{ active: typography.dividerStyle === style.value }"
                    :aria-pressed="typography.dividerStyle === style.value"
                    @click="typography.dividerStyle = style.value"
                  >
                    {{ style.label }}
                  </button>
                </div>
              </div>

              <div class="control-group">
                <label>图片</label>
                <div class="style-options">
                  <button
                    v-for="style in mediaStyles"
                    :key="style.value"
                    type="button"
                    class="style-option"
                    :class="{ active: typography.mediaStyle === style.value }"
                    :aria-pressed="typography.mediaStyle === style.value"
                    @click="typography.mediaStyle = style.value"
                  >
                    {{ style.label }}
                  </button>
                </div>
              </div>

              <div class="inspector-advanced-settings__font">
              <div class="inspector-label">
                <Type
                  :size="14"
                  aria-hidden="true"
                />
                <span>字体</span>
              </div>
              <!-- 字体鏃忛€夋嫨鎸夐挳缁?-->
              <div class="font-family-group">
                <button
                  v-for="font in fontFamilyOptions"
                  :key="font.value"
                  type="button"
                  class="font-family-btn"
                  :class="{ active: settingsStore.settings.appearance.fontFamily === font.value }"
                  :aria-pressed="settingsStore.settings.appearance.fontFamily === font.value"
                  @click="settingsStore.settings.appearance.fontFamily = font.value"
                >
                  <span
                    class="font-family-preview"
                    :style="{ fontFamily: fontFamilyMap[font.value] }"
                  >{{ font.sample }}</span>
                  <span class="font-family-name">{{ font.label }}</span>
                </button>
              </div>

              <!-- 字体棰勮 -->
              <div
                class="font-preview"
                :style="{
                  fontFamily: currentFontStack,
                  fontSize: typography.fontSize + 'px',
                  lineHeight: typography.lineHeight,
                  letterSpacing: typography.letterSpacing + 'em',
                }"
              >
                永远相信美好的事情即将发生。
                <br>山河入墨，字里行间自有光。
              </div>
              </div>
                </div>
              </details>
              <div
                v-else
                class="inspector-native-typography-note"
              >
                <strong>当前平台采用原生文本交付</strong>
                <span>小红书使用纯文本、知乎使用语义 Markdown；视觉差异由平台预设负责，不显示无法进入原生产物的微信 CSS 参数。</span>
              </div>
            </div>

            <Transition
              name="inspector-widget-dock"
              mode="out-in"
            >
              <div
                v-if="inspectorWidgetLayouts['document-statistics'].placement === 'docked'"
                key="document-statistics-docked"
                class="inspector-section inspector-widget-section"
              >
                <div class="inspector-widget-section-header">
                  <div class="inspector-label">
                    <ChartNoAxesColumn :size="14" />
                    <span>文稿统计</span>
                  </div>
                  <InspectorWidgetActions
                    surface-id="document-statistics"
                    :placement="inspectorWidgetLayouts['document-statistics'].placement"
                    @float="floatInspectorWidget('document-statistics')"
                    @native="void detachInspectorWidgetToDesktop('document-statistics')"
                    @dock="dockInspectorWidget('document-statistics')"
                    @close="closeInspectorWidget('document-statistics')"
                  />
                </div>
                <InspectorWidgetContent
                  surface-id="document-statistics"
                  :payload="inspectorWidgetPayload"
                />
              </div>
              <div
                v-else
                key="document-statistics-placeholder"
                class="inspector-section inspector-widget-placeholder"
              >
                <div class="inspector-widget-placeholder__identity">
                  <ChartNoAxesColumn :size="14" />
                  <span>
                    <strong>文稿统计</strong>
                    <small>{{ inspectorWidgetPlacementText(inspectorWidgetLayouts['document-statistics'].placement) }}</small>
                  </span>
                </div>
                <button
                  type="button"
                  @click="dockInspectorWidget('document-statistics')"
                >
                  在检查器中恢复
                </button>
              </div>
            </Transition>

            <!-- Section 3: Writing Assist -->
            <div class="inspector-section">
              <WritingAssistPanel
                :show-overview="false"
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
                <AssetManager
                  :article-id="selectedArticleId ?? undefined"
                  @insert="handleAssetInsert"
                />
              </div>
            </div>

            <!-- Section 5: 引用链接 -->
            <Transition
              name="inspector-widget-dock"
              mode="out-in"
            >
              <div
                v-if="inspectorWidgetLayouts.references.placement === 'docked'"
                key="references-docked"
                class="inspector-section inspector-widget-section inspector-widget-section--references"
              >
                <div class="inspector-widget-section-header">
                  <div class="inspector-label">
                    <Link2 :size="14" />
                    <span>引用链接</span>
                    <span
                      v-if="extractedLinks.length > 0"
                      class="inspector-count"
                    >{{ extractedLinks.length }}</span>
                  </div>
                  <InspectorWidgetActions
                    surface-id="references"
                    :placement="inspectorWidgetLayouts.references.placement"
                    @float="floatInspectorWidget('references')"
                    @native="void detachInspectorWidgetToDesktop('references')"
                    @dock="dockInspectorWidget('references')"
                    @close="closeInspectorWidget('references')"
                  />
                </div>
                <InspectorWidgetContent
                  surface-id="references"
                  :payload="inspectorWidgetPayload"
                />
              </div>
              <div
                v-else
                key="references-placeholder"
                class="inspector-section inspector-widget-placeholder"
              >
                <div class="inspector-widget-placeholder__identity">
                  <Link2 :size="14" />
                  <span>
                    <strong>引用链接</strong>
                    <small>{{ inspectorWidgetPlacementText(inspectorWidgetLayouts.references.placement) }}</small>
                  </span>
                </div>
                <button
                  type="button"
                  @click="dockInspectorWidget('references')"
                >
                  在检查器中恢复
                </button>
              </div>
            </Transition>
          </div>
        </template>
      </aside>
    </div>

    <TransitionGroup
      name="inspector-widget-float"
      tag="div"
      class="inspector-widget-layer"
      aria-label="应用内悬浮检查器小组件"
    >
      <article
        v-for="surfaceId in floatingInspectorWidgetIds"
        :key="surfaceId"
        class="floating-inspector-widget"
        :data-inspector-widget-id="surfaceId"
        :class="{ active: activeFloatingWidgetId === surfaceId }"
        :style="{
          width: inspectorWidgetLayouts[surfaceId].width + 'px',
          height: inspectorWidgetLayouts[surfaceId].height + 'px',
          transform: `translate3d(${inspectorWidgetLayouts[surfaceId].x}px, ${inspectorWidgetLayouts[surfaceId].y}px, 0)`,
        }"
        @pointerdown="activeFloatingWidgetId = surfaceId"
      >
        <header class="floating-inspector-widget__header">
          <button
            type="button"
            class="floating-inspector-widget__grip"
            :aria-label="`移动${INSPECTOR_WIDGET_META[surfaceId].title}；方向键微调，Shift 加速`"
            :title="`拖动${INSPECTOR_WIDGET_META[surfaceId].title}`"
            @pointerdown="startInspectorWidgetDrag($event, surfaceId, 'move')"
            @keydown="handleInspectorWidgetKeydown($event, surfaceId, 'move')"
          >
            <GripHorizontal :size="15" />
            <span>{{ INSPECTOR_WIDGET_META[surfaceId].title }}</span>
          </button>
          <InspectorWidgetActions
            :surface-id="surfaceId"
            :placement="inspectorWidgetLayouts[surfaceId].placement"
            @float="floatInspectorWidget(surfaceId)"
            @native="void detachInspectorWidgetToDesktop(surfaceId)"
            @dock="dockInspectorWidget(surfaceId)"
            @close="closeInspectorWidget(surfaceId)"
          />
        </header>
        <div class="floating-inspector-widget__body">
          <InspectorWidgetContent
            :surface-id="surfaceId"
            :payload="inspectorWidgetPayload"
          />
        </div>
        <button
          type="button"
          class="floating-inspector-widget__resize"
          :aria-label="`调整${INSPECTOR_WIDGET_META[surfaceId].title}大小；方向键微调，Shift 加速`"
          title="拖动或使用方向键调整大小"
          @pointerdown="startInspectorWidgetDrag($event, surfaceId, 'resize')"
          @keydown="handleInspectorWidgetKeydown($event, surfaceId, 'resize')"
        >
          <MoveDiagonal2 :size="13" />
        </button>
      </article>
    </TransitionGroup>

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

    <DeliverySettingsModal
      :visible="showDeliverySettings"
      :model-value="settingsStore.settings.export.deliveryAdornment"
      platform="wechat"
      :initial-section="deliverySettingsSection"
      @update:model-value="updateDeliveryAdornment"
      @close="showDeliverySettings = false"
    />
    <ExportModal
      :visible="showExportModal"
      :content="normalizedBody"
      :title="currentContent?.title"
      :article-category="articleCategory"
      :initial-platform="settingsStore.settings.export.defaultPlatform"
      :export-custom-css="settingsStore.settings.export.customCss"
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
  position: relative;
  width: 100vw;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-rice-paper);
  overflow: hidden;
  color: var(--text-primary);
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
  background: var(--warning-light);
  border: 1px solid var(--warning);
  border-radius: var(--radius-xlarge);
  color: var(--text-primary);
  box-shadow: var(--elev-2);
  z-index: 20;
}

.recovery-banner-mark {
  width: 34px;
  height: 34px;
  min-width: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-large);
  color: var(--warning);
  background: var(--warning-light);
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
  color: var(--warning);
}

.recovery-banner-error {
  color: var(--error);
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
  border-radius: var(--radius-round);
  border: 1px solid var(--hairline);
  background: var(--bg-surface);
  color: var(--warning);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.recovery-action:hover:not(:disabled) {
  background: var(--bg-rice-paper);
  border-color: var(--warning);
}

.recovery-action:disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.recovery-action-primary {
  background: var(--warning);
  border-color: var(--warning);
  color: #FFFFFF;
}

.recovery-action-primary:hover:not(:disabled) {
  background: var(--warning);
  filter: brightness(0.92);
}
.workstation-header {
  height: 52px;
  min-height: 52px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--hairline);
  box-shadow: var(--elev-1);
  display: flex;
  align-items: center;
  padding: 0 14px;
  gap: 12px;
  backdrop-filter: blur(12px);
  z-index: 10;
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
  color: var(--text-primary);
  background: transparent;
  border: none;
  outline: none;
  padding: 6px 10px;
  border-radius: var(--radius-medium);
  min-width: 120px;
  width: 100%;
  max-width: 400px;
  transition: background-color var(--motion-fast) var(--ease-out-quart);
}

.header-title-input:hover {
  background: var(--bg-rice-paper);
}

.header-title-input:focus {
  background: var(--accent-primary-light);
}

/* 鈹€鈹€鈹€ 淇濆瓨鐘舵€?Pill 鈹€鈹€鈹€ */
.status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-round);
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
  background: var(--bg-rice-paper);
  color: var(--text-muted);
}

.status-pill .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-pill.saved {
  background: var(--success-light);
  color: var(--success);
}

.status-pill.unsaved {
  background: var(--warning-light);
  color: var(--warning);
}

.status-pill.unsaved .status-dot {
  background: var(--ember);
  box-shadow: var(--glow-ember);
}

.status-pill.error {
  background: var(--error-light);
  color: var(--error);
}

/* 鈹€鈹€鈹€ Header 鎿嶄綔鍖?鈹€鈹€鈹€ */
.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  min-width: 0;
}

.icon-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-medium);
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart),
              transform var(--motion-fast) var(--ease-out-quart),
              box-shadow var(--motion-fast) var(--ease-out-quart);
}

.header-back-btn {
  flex-shrink: 0;
}

.icon-btn:hover {
  background: var(--bg-rice-paper);
  color: var(--text-secondary);
  box-shadow: var(--elev-1);
}

.icon-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.icon-btn.active {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

.icon-btn.success {
  background: var(--success-light);
  color: var(--success);
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
  border: 1px solid var(--hairline);
  border-radius: var(--radius-large);
  background: var(--bg-rice-paper);
}

.workstation-mode-group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-large);
  background: var(--bg-surface);
}

.layout-preset-btn {
  height: 28px;
  padding: 0 9px;
  border: none;
  border-radius: var(--radius-medium);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart);
}

.layout-preset-btn:hover,
.layout-preset-btn.active {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

.layout-preset-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.mode-action-btn {
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 9px;
  border: none;
  border-radius: var(--radius-medium);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart);
}

.mode-action-btn:hover,
.mode-action-btn.active {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

.mode-action-btn.unavailable {
  background: var(--warning-light);
  color: var(--warning);
}

.mode-action-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* 鈹€鈹€鈹€ 发布鎸夐挳 CTA 鈹€鈹€鈹€ */
.publish-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: var(--ember);
  color: #FFFFFF;
  border: none;
  border-radius: var(--radius-medium);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--motion-base) var(--ease-out-quart),
              color var(--motion-base) var(--ease-out-quart),
              transform var(--motion-fast) var(--ease-out-quart),
              box-shadow var(--motion-base) var(--ease-out-quart);
  box-shadow: var(--elev-1);
}

.publish-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--glow-ember);
}

.publish-btn:hover .publish-nib-arrow {
  transform: translate(2px, -2px);
}

.publish-nib-arrow {
  transition: transform var(--motion-fast) var(--ease-out-quart);
}

.publish-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
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

/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
   閫氱敤闈㈡澘
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/

.panel {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--hairline);
  overflow: hidden;
  transition: width var(--motion-slow) var(--ease-out-quart), min-width var(--motion-slow) var(--ease-out-quart), flex-basis var(--motion-slow) var(--ease-out-quart);
}

.panel:last-child {
  border-right: none;
}

/* 鈹€鈹€鈹€ 宸︽爮 鈹€鈹€鈹€ */
.panel-manager {
  width: var(--workstation-manager-width, 280px);
  min-width: var(--workstation-manager-width, 280px);
  flex-shrink: 0;
  /* OPEN feel = slow luxurious release (unchanged curve/duration) */
  transition:
    width var(--motion-slow) var(--ease-out-quart),
    min-width var(--motion-slow) var(--ease-out-quart),
    box-shadow var(--motion-base) var(--ease-out-quart);
}

/* Magnetic "seated" seam: a 1px inner ember hairline on the right edge that
   fades in DELAYED by --motion-slow, i.e. exactly when the width-open finishes
   → reads as the plate clicking into its dock. Only on the open state. */
.panel-manager:not(.collapsed) {
  box-shadow: inset -1px 0 0 0 var(--ember-border);
  transition:
    width var(--motion-slow) var(--ease-out-quart),
    min-width var(--motion-slow) var(--ease-out-quart),
    box-shadow var(--motion-base) var(--ease-out-quart) var(--motion-slow);
}

.panel-manager.collapsed {
  width: 12px;
  min-width: 12px;
  overflow: hidden;
  border-right: none;
  box-shadow: none;
  /* CLOSE feel = decisive snap-into-dock: shorter duration + iOS firm-arrival
     curve. Ends EXACTLY at target (NO overshoot → editor never shoved). */
  transition:
    width var(--motion-base) cubic-bezier(0.32, 0.72, 0, 1),
    min-width var(--motion-base) cubic-bezier(0.32, 0.72, 0, 1),
    box-shadow var(--motion-fast) var(--ease-out-quart);
}

/* 鈹€鈹€鈹€ 缂栬緫鍣ㄦ爮 鈹€鈹€鈹€ */
.panel-editor {
  position: relative;
  flex: 1;
  min-width: 0;
  border-right: 1px solid var(--hairline);
  container-type: inline-size;
}

/* 鈹€鈹€鈹€ Vignette Overlay (鏆楄鑱氱劍锛屾爣鍦ㄧ紪杈戝尯) 鈹€鈹€鈹€ */
.vignette-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  opacity: 0;
  transition: opacity var(--motion-slow) var(--ease-out-quart);
}

.focus-vignette .vignette-overlay {
  opacity: 1;
  background:
    radial-gradient(
      ellipse 92% calc(var(--focus-vignette-height) + var(--focus-vignette-height))
      at 50% var(--focus-cursor-position),
      transparent 0%,
      transparent 46%,
      rgb(23 29 32 / 0.035) 72%,
      rgb(23 29 32 / var(--focus-vignette-intensity)) 100%
    ),
    linear-gradient(
      to bottom,
      rgb(23 29 32 / var(--focus-vignette-intensity)) 0,
      transparent max(0%, calc(var(--focus-cursor-position) - var(--focus-vignette-height))),
      transparent min(100%, calc(var(--focus-cursor-position) + var(--focus-vignette-height))),
      rgb(23 29 32 / var(--focus-vignette-intensity)) 100%
    );
}

.panel-editor--preview {
  background: var(--bg-rice-paper);
}

.editor-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.editor-split-shell {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
  background: var(--bg-surface);
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
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  border-left: 1px solid var(--hairline);
  background: var(--bg-rice-paper);
  font-size: var(--split-right-font-size, 16px);
}

.split-divider {
  width: 12px;
  min-width: 12px;
  display: flex;
  align-items: stretch;
  justify-content: center;
  cursor: col-resize;
  background: linear-gradient(90deg, transparent 0, var(--hairline) 45%, var(--hairline) 55%, transparent 100%);
  outline: none;
}

.split-divider:hover,
.split-divider:focus-visible {
  background: linear-gradient(90deg, transparent 0, var(--ember-border) 45%, var(--ember-border) 55%, transparent 100%);
}

.split-divider-grip {
  width: 3px;
  margin: 12px 0;
  border-radius: var(--radius-round);
  background: currentColor;
  color: var(--text-muted);
}

.split-pane-toolbar {
  height: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px;
  border-bottom: 1px solid var(--hairline);
  background: var(--bg-surface);
  backdrop-filter: blur(12px);
}

.split-pane-title {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 12px;
  color: var(--text-primary);
}

.split-pane-kicker {
  color: var(--text-muted);
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
  border: 1px solid var(--hairline);
  border-radius: var(--radius-medium);
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              border-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart);
}

.split-toolbar-btn:hover,
.split-toolbar-btn.active {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: var(--accent-primary-light);
}

.split-toolbar-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.split-preview-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 20px 24px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: var(--paper-warm);
}

.split-preview-content .preview-content {
  min-height: 100%;
  height: auto;
  overflow: visible;
  padding: 0;
  background: transparent;
}

.split-view-unavailable {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 8;
  width: min(360px, calc(100% - 28px));
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--warning);
  border-radius: var(--radius-large);
  background: var(--bg-surface);
  color: var(--text-secondary);
  box-shadow: var(--elev-2);
}

.split-view-unavailable > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.split-view-unavailable strong {
  color: var(--text-primary);
  font-size: 12px;
}

.split-view-unavailable span {
  font-size: 11px;
  line-height: 1.45;
}

.split-view-unavailable button {
  min-height: 28px;
  padding: 0 9px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-medium);
  background: var(--bg-rice-paper);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.split-view-unavailable button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

:global(body.split-view-resizing) {
  cursor: col-resize;
  user-select: none;
}

:global(body.split-view-resizing) .panel-inspector {
  transition: none;
}

@container (max-width: 719px) {
  .editor-split-shell,
  .editor-split-shell.active {
    display: flex;
  }

  .split-pane-left {
    width: 100%;
    min-width: 0;
    flex: 1 1 auto;
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
    width: min(var(--workstation-stage-width, 400px), 400px);
    min-width: min(var(--workstation-stage-width, 400px), 400px);
  }

  .panel-inspector.pinned:not(.collapsed) {
    width: min(var(--workstation-inspector-width, 260px), 260px);
    min-width: min(var(--workstation-inspector-width, 260px), 260px);
  }
}

@media (min-width: 901px) and (max-width: 1180px) {
  .workstation-header {
    gap: 8px;
    padding-inline: 10px;
  }

  .header-actions {
    gap: 4px;
  }

  .layout-preset-btn,
  .mode-action-btn {
    padding-inline: 7px;
  }

  .publish-btn {
    padding-inline: 12px;
  }
}

@media (max-width: 900px) {
  .workstation {
    width: 100%;
    min-height: 100%;
    height: auto;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .workstation-header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    height: auto;
    min-height: 0;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
  }

  .header-back-btn {
    grid-column: 1;
    grid-row: 1;
  }

  .header-title {
    grid-column: 2;
    grid-row: 1;
    width: auto;
  }

  .header-title-input {
    min-width: 0;
    max-width: none;
    flex: 1;
    padding-left: 0;
  }

  .header-actions {
    grid-column: 1 / -1;
    grid-row: 2;
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
  }

  .workstation-mode-group {
    flex-wrap: wrap;
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

  .panel {
    width: 100% !important;
    min-width: 0 !important;
    flex: none;
    border-right: none;
    border-bottom: 1px solid var(--hairline);
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
    display: flex;
  }

  .split-pane-left {
    width: 100%;
    min-width: 0;
    flex: 1 1 auto;
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

  .manager-collapsed-bar,
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
  background: var(--bg-rice-paper);
}

.preview-mode-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--hairline);
  background: var(--bg-surface);
  backdrop-filter: blur(12px);
}

.preview-mode-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.preview-mode-caption {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.preview-mode-back {
  flex-shrink: 0;
}

.preview-mode-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 28px;
  background: var(--paper-warm);
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.preview-mode-body .preview-content {
  min-height: 100%;
  margin: 0;
  padding: 0;
  background: transparent;
}

/* 平台编辑画布承载层：宽度由平台 fidelity wrapper 自己声明。 */
.preview-device-frame {
  flex-shrink: 0;
  width: min(100%, 896px);
  max-width: 100%;
  background: var(--bg-surface);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-large);
  box-shadow: var(--elev-2);
  overflow: hidden;
}

@media (max-width: 600px) {
  .preview-device-frame {
    width: 100%;
    border: none;
    border-radius: 0;
    box-shadow: none;
  }
}

/* 鈹€鈹€鈹€ 棰勮鏍?鈹€鈹€鈹€ */
.panel-stage {
  width: var(--workstation-stage-width, 400px);
  min-width: var(--workstation-stage-width, 400px);
  flex-shrink: 0;
  transition: width var(--motion-slow) var(--ease-out-quart), min-width var(--motion-slow) var(--ease-out-quart);
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
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
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
  transition: background var(--motion-fast) var(--ease-out-quart);
  border-radius: 2px;
}

.stage-collapsed-bar:hover .stage-collapsed-indicator {
  background: var(--text-muted);
}

/* 鈹€鈹€鈹€ 鍙虫爮 鈹€鈹€鈹€ */
.panel-inspector {
  position: relative;
  width: var(--workstation-inspector-width, 260px);
  min-width: var(--workstation-inspector-width, 260px);
  margin-left: 0;
  flex: 0 0 auto;
  border-right: none;
  border-left: 1px solid var(--hairline);
  transition:
    width var(--motion-slow) var(--ease-out-quart),
    min-width var(--motion-slow) var(--ease-out-quart),
    margin-left var(--motion-slow) var(--ease-out-quart),
    transform var(--motion-slow) var(--ease-out-quart),
    box-shadow var(--motion-base) var(--ease-out-quart);
}

.panel-inspector:not(.collapsed) {
  overflow: visible;
}

@media (min-width: 901px) {
  .panel-inspector:not(.pinned):not(.collapsed) {
    margin-left: calc(12px - var(--workstation-inspector-width, 260px));
    transform: translateX(calc(0px - var(--workstation-stage-width, 400px)));
    z-index: 20;
    box-shadow: var(--elev-2);
  }

  .main-content.stage-is-collapsed .panel-inspector:not(.pinned):not(.collapsed) {
    transform: translateX(-12px);
  }
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
  transition: background var(--motion-fast) var(--ease-out-quart);
  touch-action: none;
  user-select: none;
}

.inspector-resize-handle:hover,
.inspector-resize-handle.active {
  background: var(--ember-soft);
}

.panel-inspector.pinned:not(.collapsed) {
  box-shadow: var(--elev-2);
}

.panel-inspector.collapsed {
  width: 12px;
  min-width: 12px;
  overflow: hidden;
  border-left: none;
}

/* ─── Inspector 折叠触发栏 ─── */
.inspector-collapsed-bar,
.manager-collapsed-bar {
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.manager-collapsed-bar {
  z-index: 101;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
}

.manager-collapsed-bar:focus-visible,
.stage-collapsed-bar:focus-visible,
.inspector-collapsed-bar:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 1px var(--ember);
}

.inspector-collapsed-indicator,
.manager-collapsed-indicator {
  width: 4px;
  height: 100%;
  background: transparent;
  transition: background var(--motion-fast) var(--ease-out-quart);
  border-radius: 2px;
}

.inspector-collapsed-bar:hover .inspector-collapsed-indicator {
  background: var(--text-muted);
}

/* ── Manager collapsed bar: ember magnetic latch (manager-only; inspector keeps quiet grey) ── */

/* Resting seam: a short, faintly-live ember nub — NOT full height, reads as a grabbable core. */
.manager-collapsed-indicator {
  width: 3px;
  height: 28px;                 /* override shared height:100% — short centered core */
  background: var(--ember);
  opacity: 0.5;                 /* dormant glow — alive even docked, but quiet */
  border-radius: 999px;
  transform: translateX(0) scaleY(1);
  transform-origin: center;
  transition:
    width var(--motion-base) var(--ease-bounce),
    height var(--motion-base) var(--ease-bounce),
    transform var(--motion-base) var(--ease-bounce),
    opacity var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-base) var(--ease-out-quart);
}

/* Hover: the magnet wakes — pill thickens, lengthens, springs slightly TOWARD the editor,
   and blooms with the dark-aware ember glow. Spring lives only on this 3-5px contained nub. */
.manager-collapsed-bar:hover .manager-collapsed-indicator {
  width: 5px;
  height: 44px;
  opacity: 1;
  background: var(--ember);
  transform: translateX(1.5px) scaleY(1.05);   /* the "reach" — magnetic invite */
  box-shadow: 0 0 0 1px var(--ember-border), var(--glow-ember);
}

/* Press: the latch clicks INWARD (recoil) — crisp instant feel, no laggy ease. */
.manager-collapsed-bar:active .manager-collapsed-indicator {
  transform: translateX(-1px) scaleY(0.9);
  width: 6px;
  box-shadow: 0 0 0 1px var(--ember), var(--glow-ember);
  transition:
    width var(--motion-instant) var(--ease-out-quart),
    transform var(--motion-instant) var(--ease-out-quart),
    box-shadow var(--motion-instant) var(--ease-out-quart);
}

/* Faint ember wash blooms across the 12px strip on hover so the WHOLE bar reads as
   pressable — contained to 12px, pointer-events:none so it never eats the click. */
.manager-collapsed-bar::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, var(--ember-soft), transparent);
  opacity: 0;
  transition: opacity var(--motion-fast) var(--ease-out-quart);
  pointer-events: none;
}
.manager-collapsed-bar:hover::before {
  opacity: 1;                   /* --ember-soft is already a low-alpha token (.08/.16) */
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
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart);
  user-select: none;
}

.collapsed-label:hover {
  color: var(--accent-primary);
  background: var(--accent-primary-light);
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
  padding: 0 6px 0 0;
  gap: 2px;
  overflow: visible;
}

.panel-tab-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 2px;
  padding: 4px;
  background: var(--bg-rice-paper);
  border-radius: var(--radius-round);
  align-items: stretch;
  flex: 1 1 auto;
  min-width: 0;
  margin: 10px 4px 10px 8px;
}

.panel-tab {
  min-width: 0;
  min-height: 42px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 5px 2px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  text-align: center;
  border-radius: var(--radius-round);
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 1.15;
  white-space: nowrap;
  transition: background var(--motion-base) var(--ease-out-quart), color var(--motion-base) var(--ease-out-quart), box-shadow var(--motion-base) var(--ease-out-quart);
}

.panel-tab :deep(svg) {
  flex: 0 0 auto;
  width: 15px;
  height: 15px;
  stroke-width: 2;
}

.panel-tab:hover:not(.active) {
  color: var(--text-primary);
  background: var(--bg-surface);
}

.panel-tab.active {
  background: var(--bg-surface);
  color: var(--ember);
  font-weight: 600;
  box-shadow: var(--elev-1);
}

.panel-tab:focus-visible,
.collapse-trigger:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

@media (prefers-reduced-motion: reduce) {
  .panel-tab {
    transition: none;
  }
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
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-small);
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart);
  flex-shrink: 0;
}

.collapse-trigger:hover {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
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

@keyframes manager-settle-in {
  from {
    opacity: 0;
    transform: translateX(-8px);   /* content slides out of the docked left seam */
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Tabs lead, body follows one instant-tick later = the magnetic "chain" the panel
   pulls its contents out. Both translate only (GPU, no layout thrash, no editor move). */
.panel-manager:not(.collapsed) .panel-tabs {
  animation: manager-settle-in var(--motion-base) var(--ease-out-quart) both;
}
.panel-manager:not(.collapsed) .panel-body {
  animation: manager-settle-in var(--motion-slow) var(--ease-out-quart) both;
  animation-delay: var(--motion-instant);   /* 80ms stagger = the settle */
}

@media (prefers-reduced-motion: reduce) {
  /* Kill the entrance animation outright → content appears at final state instantly. */
  .panel-manager:not(.collapsed) .panel-tabs,
  .panel-manager:not(.collapsed) .panel-body {
    animation: none;
  }
  /* Null the spring transform/glow + any lingering delay so the latch & dock seam
     snap to end-state with zero motion (universal !important zeroes duration only). */
  .manager-collapsed-indicator,
  .manager-collapsed-bar:hover .manager-collapsed-indicator,
  .manager-collapsed-bar:active .manager-collapsed-indicator {
    transition: none;
    transform: none;
  }
  .manager-collapsed-bar::before {
    transition: none;
  }
  .panel-manager:not(.collapsed) {
    transition-delay: 0ms;   /* drop the docked-seam stall */
  }
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
  border-bottom: 1px solid var(--hairline);
  flex-shrink: 0;
  background: transparent;
}

/* 平台分段控件 (segmented control) */
.stage-platform-tabs {
  display: flex;
  gap: 2px;
  flex: 1;
  background: var(--bg-rice-paper);
  border-radius: var(--radius-round);
  padding: 4px;
  overflow: hidden;
}

.stage-tab {
  flex: 1 1 0;
  min-width: 0;
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-round);
  transition: background-color var(--motion-base) var(--ease-out-quart), color var(--motion-base) var(--ease-out-quart), box-shadow var(--motion-base) var(--ease-out-quart);
  text-align: center;
  white-space: nowrap;
}

.stage-tab:hover {
  color: var(--text-primary);
}

.stage-tab.active {
  background: var(--bg-surface);
  color: var(--accent-primary);
  font-weight: 600;
  box-shadow: var(--elev-1);
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
  border-radius: var(--radius-round);
  color: var(--text-muted);
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart), color var(--motion-fast) var(--ease-out-quart);
}

.stage-header .collapse-trigger:hover {
  background: var(--bg-rice-paper);
  color: var(--text-primary);
}

.stage-header-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* ─── 预览面板「示例内容」徽章 ─── */
.preview-sample-hint {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 3;
  padding: 2px 10px;
  border-radius: var(--radius-round);
  background: var(--bg-rice-paper);
  color: var(--text-secondary);
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
  padding: 14px 4px 12px;
  gap: 12px;
  background: var(--bg-rice-paper);
  overflow: hidden;
}

/* 平台编辑画布：窄栏中按容器缩放，不伪造 iPhone chrome。 */
.device-frame {
  width: 100%;
  max-width: 375px;
  flex: 1 1 0;
  min-height: 320px;
  background: var(--bg-surface);
  border-radius: var(--radius-large);
  border: 1px solid var(--hairline);
  padding: 4px;
  position: relative;
  box-shadow: var(--elev-2);
  display: flex;
  flex-direction: column;
}

/* 旧设备装饰保留 DOM 兼容，但平台编辑器预览不显示伪造刘海与 Home Indicator。 */
.device-notch {
  display: none;
}

/* 编辑画布滚动区 */
.device-screen {
  background: var(--bg-surface);
  border-radius: calc(var(--radius-large) - 2px);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0;
  position: relative;
  box-shadow: none;
}

.device-screen > :deep(.widget-content) {
  height: 100%;
}

.stage-widget-placeholder {
  flex: 1;
  min-height: 260px;
  width: calc(100% - 20px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 24px;
  border: 1px dashed var(--hairline);
  border-radius: var(--radius-large);
  background: color-mix(in srgb, var(--bg-surface) 82%, transparent);
  color: var(--text-muted);
  text-align: center;
  box-sizing: border-box;
}

.stage-widget-placeholder strong {
  color: var(--text-secondary);
  font-size: 13px;
}

.stage-widget-placeholder span {
  max-width: 260px;
  font-size: 11px;
  line-height: 1.6;
}

.stage-widget-placeholder button {
  margin-top: 4px;
  padding: 7px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-medium);
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
}

/* Home Indicator */
.device-home-indicator {
  display: none;
}

/* 璁惧灞忓箷鍐呮粴鍔ㄦ潯 */
.device-screen::-webkit-scrollbar {
  width: 2px;
}

.device-screen::-webkit-scrollbar-thumb {
  background: var(--hairline);
  border-radius: 1px;
}

.device-screen::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* 鈹€鈹€鈹€ 棰勮鐘舵€?鈹€鈹€鈹€ */
.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 200px;
  color: var(--text-muted);
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
  color: var(--text-muted);
  flex-shrink: 0;
}

.preview-empty-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  letter-spacing: 0.01em;
}

.preview-empty-hint {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
  line-height: 1.5;
  max-width: 220px;
}

.preview-content {
  color: var(--text-primary);
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
  max-width: 360px;
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
  border: 1px solid var(--ember);
  border-radius: var(--radius-round);
  background: var(--ember);
  color: #FFFFFF;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: var(--elev-1);
  transition: background-color var(--motion-base) var(--ease-out-quart), border-color var(--motion-base) var(--ease-out-quart), box-shadow var(--motion-base) var(--ease-out-quart), transform var(--motion-fast) var(--ease-out-quart);
}

.stage-btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--glow-ember);
}

.stage-btn-primary:active:not(:disabled) {
  transform: translateY(0.5px);
  box-shadow: var(--elev-1);
}

.stage-btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.stage-btn-primary.success {
  background: var(--success);
  border-color: var(--success);
  box-shadow: var(--elev-1);
}

.stage-btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-round);
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color var(--motion-base) var(--ease-out-quart), border-color var(--motion-base) var(--ease-out-quart), color var(--motion-base) var(--ease-out-quart), transform var(--motion-fast) var(--ease-out-quart);
}

.stage-btn-secondary:hover:not(:disabled) {
  border-color: var(--text-muted);
  background: var(--bg-rice-paper);
  color: var(--text-primary);
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
  border-color: var(--ember-border);
  background: transparent;
  color: var(--ember);
}

.stage-actions .stage-btn-secondary:hover:not(:disabled) {
  background: var(--ember-soft);
  border-color: var(--ember);
  color: var(--ember);
}

.stage-actions .stage-btn-secondary:disabled {
  border-color: var(--hairline);
  color: var(--text-muted);
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
  border-bottom: 1px solid var(--hairline);
  flex-shrink: 0;
}

.inspector-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  flex: 1;
}

.inspector-widget-menu {
  position: relative;
}

.inspector-widget-menu-trigger {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-medium);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.inspector-widget-menu-trigger:hover,
.inspector-widget-menu-trigger.active {
  border-color: var(--hairline);
  background: var(--bg-rice-paper);
  color: var(--text-primary);
}

.inspector-widget-menu-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: -4px;
  z-index: 120;
  width: min(340px, calc(100vw - 24px));
  max-height: min(520px, calc(100vh - 150px));
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  padding: 0;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-large);
  background: color-mix(in srgb, var(--bg-surface) 97%, var(--bg-rice-paper));
  box-shadow: var(--elev-3);
}

.inspector-widget-menu-popover__header {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 10px 10px 12px;
  border-bottom: 1px solid var(--hairline);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 7%, transparent), transparent 55%),
    var(--bg-surface);
}

.inspector-widget-menu-popover__header > span {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inspector-widget-menu-popover__header strong {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 650;
}

.inspector-widget-menu-popover__header small {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inspector-widget-menu-popover__header button {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-medium);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.inspector-widget-menu-popover__header button:hover,
.inspector-widget-menu-popover__header button:focus-visible {
  border-color: var(--hairline);
  background: var(--bg-rice-paper);
  color: var(--text-primary);
}

.inspector-widget-menu-popover__list {
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 6px;
  overflow-y: auto;
  padding: 8px;
}

.inspector-widget-menu-item {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 9px;
  border: 1px solid transparent;
  border-radius: var(--radius-medium);
  background: color-mix(in srgb, var(--bg-rice-paper) 58%, transparent);
  color: var(--text-secondary);
}

.inspector-widget-menu-item:hover,
.inspector-widget-menu-item:focus-within {
  border-color: var(--hairline);
  background: var(--bg-rice-paper);
}

.inspector-widget-menu-item[data-placement='floating'],
.inspector-widget-menu-item[data-placement='native'] {
  border-color: color-mix(in srgb, var(--accent-primary) 22%, var(--hairline));
  background: color-mix(in srgb, var(--accent-primary) 6%, var(--bg-surface));
}

.inspector-widget-menu-item__identity {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
}

.inspector-widget-menu-item__identity > span:last-child {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.inspector-widget-menu-item__icon {
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-medium);
  background: var(--bg-surface);
  color: var(--text-muted);
}

.inspector-widget-menu-item strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inspector-widget-menu-item small {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inspector-window-enter-active,
.inspector-window-leave-active {
  transform-origin: top right;
  transition:
    opacity var(--motion-fast) var(--ease-out-quart),
    transform var(--motion-base) var(--ease-out-quart);
}

.inspector-window-enter-from,
.inspector-window-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.inspector-pin-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-medium);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background var(--motion-fast) var(--ease-out-quart), color var(--motion-fast) var(--ease-out-quart), border-color var(--motion-fast) var(--ease-out-quart), transform var(--motion-fast) var(--ease-out-quart);
}

.inspector-pin-btn:hover {
  background: var(--bg-rice-paper);
  color: var(--text-secondary);
}

.inspector-pin-btn.active {
  border-color: var(--hairline);
  background: var(--bg-rice-paper);
  color: var(--text-primary);
  transform: rotate(-30deg);
}

.inspector-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.inspector-section {
  padding: 16px;
  border-bottom: 1px solid var(--hairline);
}

.inspector-section:last-child {
  border-bottom: none;
}

.inspector-widget-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.inspector-widget-section-header .inspector-label {
  min-width: 0;
  margin-bottom: 0;
}

.inspector-widget-placeholder {
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 5%, transparent), transparent 48%),
    color-mix(in srgb, var(--bg-rice-paper) 58%, transparent);
}

.inspector-widget-placeholder__identity {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--text-muted);
}

.inspector-widget-placeholder__identity > span {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.inspector-widget-placeholder__identity strong {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inspector-widget-placeholder__identity small {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inspector-widget-placeholder > button {
  flex: 0 0 auto;
  padding: 6px 8px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-medium);
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 10px;
  cursor: pointer;
  transition:
    border-color var(--motion-fast) var(--ease-out-quart),
    background var(--motion-fast) var(--ease-out-quart),
    color var(--motion-fast) var(--ease-out-quart);
}

.inspector-widget-placeholder > button:hover,
.inspector-widget-placeholder > button:focus-visible {
  border-color: color-mix(in srgb, var(--accent-primary) 32%, var(--hairline));
  background: color-mix(in srgb, var(--accent-primary) 7%, var(--bg-surface));
  color: var(--text-primary);
}

.inspector-widget-dock-enter-active,
.inspector-widget-dock-leave-active {
  overflow: hidden;
  transition:
    opacity var(--motion-fast) var(--ease-out-quart),
    transform var(--motion-base) var(--ease-out-quart),
    max-height var(--motion-base) var(--ease-out-quart),
    padding-block var(--motion-base) var(--ease-out-quart);
}

.inspector-widget-dock-enter-active {
  max-height: 640px;
}

.inspector-widget-dock-enter-from,
.inspector-widget-dock-leave-to {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
  transform: translateY(-6px);
}

.inspector-widget-section--references {
  min-height: 260px;
}

.inspector-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
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
  transition: transform var(--motion-fast) var(--ease-out-quart),
              border-color var(--motion-fast) var(--ease-out-quart),
              box-shadow var(--motion-fast) var(--ease-out-quart);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.accent-dot:hover {
  transform: scale(1.15);
  box-shadow: var(--elev-2);
}

.accent-dot.active {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 2px var(--bg-surface), 0 0 0 4px currentColor;
}

.inspector-advanced-settings {
  margin-top: 12px;
  overflow: hidden;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-medium);
  background: var(--bg-surface);
}

.inspector-advanced-settings__summary {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 8px 10px;
  color: var(--text-secondary);
  cursor: pointer;
  list-style: none;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart);
}

.inspector-advanced-settings__summary::-webkit-details-marker {
  display: none;
}

.inspector-advanced-settings__summary:hover,
.inspector-advanced-settings__summary:focus-visible {
  color: var(--text-primary);
  background: var(--bg-rice-paper);
  outline: none;
}

.inspector-advanced-settings__summary:focus-visible {
  box-shadow: inset 0 0 0 2px var(--accent-primary);
}

.inspector-advanced-settings__copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inspector-advanced-settings__copy strong {
  color: inherit;
  font-size: 12px;
  font-weight: 600;
}

.inspector-advanced-settings__copy small {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inspector-advanced-settings__chevron {
  flex-shrink: 0;
  transition: transform var(--motion-fast) var(--ease-out-quart);
}

.inspector-advanced-settings[open] .inspector-advanced-settings__chevron {
  transform: rotate(180deg);
}

.inspector-advanced-settings__body {
  padding: 8px 10px 12px;
  border-top: 1px solid var(--hairline);
}

.inspector-advanced-settings__font {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--hairline);
}

.inspector-link {
  margin-top: 10px;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 12px;
}

.inspector-native-typography-note {
  display: grid;
  gap: 4px;
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px dashed var(--hairline);
  border-radius: var(--radius-medium);
  background: var(--bg-rice-paper);
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.55;
}

.inspector-native-typography-note strong {
  color: var(--text-secondary);
  font-size: 12px;
}

.font-family-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-medium);
  background: var(--bg-surface);
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              border-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart);
}

.font-family-btn:hover {
  border-color: var(--text-muted);
  background: var(--bg-rice-paper);
}

.font-family-btn.active {
  border-color: var(--accent-primary, #D32F2F);
  background: var(--accent-primary-light);
}

.font-family-preview {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.2;
}

.font-family-btn.active .font-family-preview {
  color: var(--accent-primary, #D32F2F);
}

.font-family-name {
  font-size: 10px;
  color: var(--text-muted);
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
  color: var(--text-muted);
  font-size: 12px;
}

.inspector-empty-hint p {
  margin: 0;
}

.inspector-empty-sub {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-muted);
}

/* 鈹€鈹€鈹€ 引用链接鍒楄〃 鈹€鈹€鈹€ */
.inspector-count {
  margin-left: auto;
  background: var(--bg-rice-paper);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius-medium);
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
  border-radius: var(--radius-medium);
  transition: background var(--motion-fast) var(--ease-out-quart);
}

.link-item:hover {
  background: var(--accent-secondary-light);
}

.link-item-main {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 8px;
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--motion-fast) var(--ease-out-quart);
  overflow: hidden;
}

.link-item-main:hover {
  color: var(--accent-secondary);
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
  color: var(--text-muted);
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
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-small);
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart);
  flex-shrink: 0;
}

.link-copy-btn:hover {
  background: var(--bg-rice-paper);
  color: var(--text-secondary);
}

.link-copy-btn.copied {
  color: var(--success);
}

/* 鈹€鈹€鈹€ 鎺掔増鍙傛暟婊戝潡鎺т欢 (useTypography) 鈹€鈹€鈹€ */
.inspector-control {
  padding: 6px 0;
}

.control-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.control-value {
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
  font-weight: 500;
}

.control-slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--hairline);
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
  border: 2px solid var(--bg-surface);
  box-shadow: var(--elev-1);
  cursor: pointer;
}

.control-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary);
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
  border: 1px solid var(--hairline);
  border-radius: var(--radius-medium);
  background: var(--bg-surface);
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              border-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart);
  white-space: nowrap;
}

.preset-chip:hover {
  border-color: var(--text-muted);
  background: var(--bg-rice-paper);
  color: var(--text-primary);
}

.preset-chip.active {
  border-color: var(--accent-primary, #D32F2F);
  background: var(--accent-primary-light);
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

.preset-signature-card {
  --preset-accent: var(--accent-primary, #D32F2F);
  position: relative;
  margin: 0 0 10px;
  padding: 10px 11px 11px;
  overflow: hidden;
  border: 1px solid var(--hairline);
  border-left: 3px solid var(--preset-accent);
  border-radius: var(--radius-medium);
  background: var(--bg-surface);
  box-shadow: var(--elev-1);
  animation: presetSignatureIn 180ms var(--ease-out-quart) both;
}

.preset-signature-card::after {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: linear-gradient(90deg, var(--preset-accent), transparent 70%);
  opacity: 0.45;
}

.preset-signature-card__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 7px;
}

.preset-signature-card__header strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-signature-card__header span {
  flex: none;
  color: var(--preset-accent);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.preset-signature-card__details {
  display: grid;
  gap: 5px;
  margin: 0;
}

.preset-signature-card__details > div {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 7px;
  align-items: baseline;
}

.preset-signature-card__details dt {
  color: var(--text-muted);
  font-size: 9px;
  letter-spacing: 0.08em;
}

.preset-signature-card__details dd {
  margin: 0;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.35;
}

.preset-signature-card__modules {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.preset-signature-card__modules span {
  padding: 2px 6px;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  background: var(--bg-rice-paper);
  color: var(--text-secondary);
  font-size: 9px;
  line-height: 1.35;
}

@keyframes presetSignatureIn {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
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
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

/* 鈹€鈹€鈹€ 首行缩进鍒囨崲 鈹€鈹€鈹€ */
.indent-toggle {
  padding: 4px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-small);
  background: var(--bg-surface);
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              border-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart);
  min-width: 48px;
  text-align: center;
}

.indent-toggle:hover {
  border-color: var(--text-muted);
}

.indent-toggle.active {
  border-color: var(--accent-primary, #D32F2F);
  background: var(--accent-primary-light);
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
  background: var(--hairline);
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
  border: 2px solid var(--bg-surface);
  box-shadow: var(--elev-1);
  cursor: pointer;
}

.range-value {
  font-size: 11px;
  color: var(--text-muted);
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
  border: 1px solid var(--hairline);
  border-radius: var(--radius-small);
  background: var(--bg-surface);
  color: var(--text-muted);
  font-size: 11px;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              border-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart);
}

.style-option:hover {
  border-color: var(--text-muted);
  color: var(--text-secondary);
}

.style-option.active {
  border-color: var(--accent-primary, #D32F2F);
  background: var(--accent-primary-light);
  color: var(--accent-primary, #D32F2F);
  font-weight: 500;
}

/* 鈹€鈹€鈹€ 瀛楀彿姝ヨ繘鍣?鈹€鈹€鈹€ */
.stepper {
  display: flex;
  align-items: center;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-medium);
  overflow: hidden;
}

.stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
              color var(--motion-fast) var(--ease-out-quart);
}

.stepper-btn:hover:not(:disabled) {
  background: var(--bg-rice-paper);
  color: var(--text-primary);
}

.stepper-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.stepper-value {
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  border-left: 1px solid var(--hairline);
  border-right: 1px solid var(--hairline);
  min-width: 48px;
  text-align: center;
  line-height: 28px;
  font-variant-numeric: tabular-nums;
}

/* 鈹€鈹€鈹€ 字体棰勮 鈹€鈹€鈹€ */
.font-preview {
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid var(--hairline);
  border-radius: var(--radius-medium);
  background: var(--bg-rice-paper);
  color: var(--text-secondary);
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
  transition: opacity var(--motion-slow) var(--ease-out-quart);
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
  background: radial-gradient(
    ellipse 84% calc(var(--focus-vignette-height) + var(--focus-vignette-height))
    at 50% var(--focus-cursor-position),
    transparent 0%,
    transparent 54%,
    rgb(23 29 32 / 0.035) 76%,
    rgb(23 29 32 / 0.1) 100%
  );
}

.focus-exit-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 120;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: var(--radius-round);
  background: rgba(38, 50, 56, 0.18);
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  opacity: 0.3;
  backdrop-filter: blur(10px);
  transition: opacity var(--motion-base) var(--ease-out-quart), transform var(--motion-base) var(--ease-out-quart), background var(--motion-base) var(--ease-out-quart);
}

.focus-exit-btn:hover {
  opacity: 0.8;
  transform: translateY(-1px);
  background: rgba(38, 50, 56, 0.32);
}

.focus-exit-shortcut {
  padding: 1px 6px;
  border-radius: var(--radius-round);
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
  transition: opacity var(--motion-slow) var(--ease-out-quart);
}

.focus-mode .workstation-header:hover {
  opacity: 1;
}

/* 专注模式只保留编辑区内的退出入口，应用标题栏安全区仍由全局 TitleBar 管理。 */
.focus-mode .workstation-header .header-actions,
.focus-mode .workstation-header .layout-presets,
.focus-mode .workstation-header .publish-btn {
  display: none;
}

.inspector-widget-layer {
  position: absolute;
  inset: 0;
  z-index: 900;
  pointer-events: none;
}

.floating-inspector-widget {
  position: absolute;
  top: 0;
  left: 0;
  min-width: 280px;
  min-height: 220px;
  display: grid;
  grid-template-rows: 38px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--hairline) 82%, var(--text-muted));
  border-radius: var(--radius-large);
  background: var(--bg-surface);
  box-shadow: var(--elev-3);
  pointer-events: auto;
  transition:
    border-color var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-base) var(--ease-out-quart);
}

.floating-inspector-widget.active {
  z-index: 2;
  border-color: color-mix(in srgb, var(--accent-primary) 36%, var(--hairline));
  box-shadow:
    0 18px 48px color-mix(in srgb, var(--text-primary) 15%, transparent),
    var(--elev-3);
}

.inspector-widget-float-enter-active,
.inspector-widget-float-leave-active {
  transition:
    opacity var(--motion-base) var(--ease-out-quart),
    scale var(--motion-base) var(--ease-out-quart),
    filter var(--motion-base) var(--ease-out-quart);
}

.inspector-widget-float-enter-from,
.inspector-widget-float-leave-to {
  opacity: 0;
  scale: 0.96;
  filter: blur(3px);
}

.floating-inspector-widget__header {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 0 7px;
  border-bottom: 1px solid var(--hairline);
  background: color-mix(in srgb, var(--bg-surface) 92%, var(--bg-rice-paper));
}

.floating-inspector-widget__grip {
  min-width: 0;
  flex: 1;
  height: 30px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 5px;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: grab;
  text-align: left;
}

.floating-inspector-widget__grip:active {
  cursor: grabbing;
}

.floating-inspector-widget__grip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
}

.floating-inspector-widget__body {
  min-height: 0;
  overflow: hidden;
  padding: 12px;
}

.floating-inspector-widget__resize {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: var(--radius-medium);
  background: color-mix(in srgb, var(--bg-surface) 80%, transparent);
  color: var(--text-muted);
  cursor: nwse-resize;
}

.floating-inspector-widget__resize:hover,
.floating-inspector-widget__resize:focus-visible {
  background: var(--bg-rice-paper);
  color: var(--text-primary);
}

/* 鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?
   婊氬姩鏉?
   鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺愨晲鈺?*/

/* Scrollbars on stage / panel / inspector defer to the global 6px rule
   (design-system.css) + theme-aware var(--scrollbar-thumb). The previous
   bespoke 4px rgba(0,0,0,.1) track was not dark-aware; removing it lets
   these panels inherit the unified treatment. */

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
  border-radius: var(--radius-round);
  background: rgba(38, 50, 56, 0.92);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  box-shadow: var(--elev-3);
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
}

.mode-toast-enter-active,
.mode-toast-leave-active {
  transition: opacity var(--motion-base) var(--ease-out-quart), transform var(--motion-slow) var(--ease-out-quart);
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
