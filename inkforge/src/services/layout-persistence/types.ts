import { z } from 'zod'

export const LAYOUT_STATE_VERSION = 1
export const LAYOUT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export const EDITOR_MODE_VALUES = ['typora', 'source', 'preview'] as const
export const EDITOR_WIDTH_VALUES = ['narrow', 'medium', 'wide', 'full'] as const
export const MANAGER_TAB_VALUES = ['files', 'versions', 'outline', 'tags'] as const
export const RIGHT_PANEL_MODE_VALUES = ['inspector', 'assets', 'export', 'writing-assist'] as const
export const WORKSTATION_PANEL_VALUES = ['manager', 'stage', 'inspector'] as const

export type LayoutEditorMode = typeof EDITOR_MODE_VALUES[number]
export type LayoutEditorWidth = typeof EDITOR_WIDTH_VALUES[number]
export type LayoutManagerTab = typeof MANAGER_TAB_VALUES[number]
export type LayoutRightPanelMode = typeof RIGHT_PANEL_MODE_VALUES[number]
export type LayoutPanelKey = typeof WORKSTATION_PANEL_VALUES[number]

export interface LayoutWidthLimit {
  default: number
  min: number
  max: number
}

export const LAYOUT_PANEL_WIDTH_LIMITS: Record<LayoutPanelKey, LayoutWidthLimit> = {
  manager: { default: 240, min: 220, max: 380 },
  stage: { default: 320, min: 280, max: 520 },
  inspector: { default: 260, min: 240, max: 460 },
}

export const ZOOM_LIMIT = { default: 1, min: 0.5, max: 2 } as const
export const SPLIT_VIEW_RATIO_LIMIT = { default: 0.5, min: 0.2, max: 0.8 } as const
export const SPLIT_VIEW_FONT_SCALE_LIMIT = { default: 16, min: 12, max: 24 } as const

const TimestampMsSchema = z.number().int().nonnegative()
const NonEmptyStringSchema = z.string().min(1)
const EditorModeSchema = z.enum(EDITOR_MODE_VALUES)
const EditorWidthSchema = z.enum(EDITOR_WIDTH_VALUES)
const ManagerTabSchema = z.enum(MANAGER_TAB_VALUES)
const RightPanelModeSchema = z.enum(RIGHT_PANEL_MODE_VALUES)

export const PerModeLayoutSchema = z.object({
  managerCollapsed: z.boolean(),
  stageCollapsed: z.boolean(),
  inspectorCollapsed: z.boolean(),
  rightPanelMode: RightPanelModeSchema.default('inspector'),
})

export type PerModeLayout = z.infer<typeof PerModeLayoutSchema>

export const ModeLayoutsSchema = z.object({
  typora: PerModeLayoutSchema,
  source: PerModeLayoutSchema,
  preview: PerModeLayoutSchema,
})

export type ModeLayouts = z.infer<typeof ModeLayoutsSchema>

export const PanelWidthsSchema = z.object({
  manager: z.number(),
  stage: z.number(),
  inspector: z.number(),
})

export type PanelWidths = z.infer<typeof PanelWidthsSchema>

export const SerializedTabSchema = z.object({
  id: NonEmptyStringSchema,
  articleId: NonEmptyStringSchema,
  title: z.string(),
  isPinned: z.boolean(),
})

export type SerializedTab = z.infer<typeof SerializedTabSchema>

export const StatusBarFieldVisibilitySchema = z.record(z.string(), z.boolean())
export type StatusBarFieldVisibility = z.infer<typeof StatusBarFieldVisibilitySchema>

export const LayoutStateRecordSchema = z.object({
  id: NonEmptyStringSchema,
  schemaVersion: z.literal(1),
  profileId: NonEmptyStringSchema,
  windowId: NonEmptyStringSchema,
  layoutVersion: z.literal(LAYOUT_STATE_VERSION),
  managerCollapsed: z.boolean(),
  stageCollapsed: z.boolean(),
  inspectorCollapsed: z.boolean(),
  rightPanelMode: RightPanelModeSchema,
  managerTab: ManagerTabSchema,
  editorMode: EditorModeSchema,
  editorWidth: EditorWidthSchema,
  modeLayouts: ModeLayoutsSchema,
  panelWidths: PanelWidthsSchema,
  openTabs: z.array(SerializedTabSchema),
  tabOrder: z.array(NonEmptyStringSchema),
  activeTabId: z.string().min(1).nullable(),
  activeArticleId: z.string().min(1).nullable(),
  statusBarVisible: z.boolean(),
  statusBarFieldVisibility: StatusBarFieldVisibilitySchema,
  zoomLevel: z.number(),
  splitViewEnabled: z.boolean().default(false),
  splitViewRatio: z.number().min(SPLIT_VIEW_RATIO_LIMIT.min).max(SPLIT_VIEW_RATIO_LIMIT.max).default(SPLIT_VIEW_RATIO_LIMIT.default),
  splitViewSyncScroll: z.boolean().default(true),
  splitViewLeftFontScale: z.number().min(SPLIT_VIEW_FONT_SCALE_LIMIT.min).max(SPLIT_VIEW_FONT_SCALE_LIMIT.max).default(SPLIT_VIEW_FONT_SCALE_LIMIT.default),
  splitViewRightFontScale: z.number().min(SPLIT_VIEW_FONT_SCALE_LIMIT.min).max(SPLIT_VIEW_FONT_SCALE_LIMIT.max).default(SPLIT_VIEW_FONT_SCALE_LIMIT.default),
  savedAt: TimestampMsSchema,
  createdAt: TimestampMsSchema,
  updatedAt: TimestampMsSchema,
})

export type LayoutStateRecord = z.infer<typeof LayoutStateRecordSchema>

export type LayoutStatePatch = Partial<Omit<LayoutStateRecord, 'id' | 'schemaVersion' | 'profileId' | 'windowId' | 'layoutVersion' | 'createdAt' | 'updatedAt' | 'savedAt'>> & {
  savedAt?: number
}

export interface LayoutInitializeResult {
  record: LayoutStateRecord | null
  migrated: boolean
}

export interface LayoutSaveResult {
  record: LayoutStateRecord
  persisted: boolean
}

export interface LayoutCleanupResult {
  deleted: number
  cutoff: number
}

export interface LayoutTabValidationResult {
  openTabs: SerializedTab[]
  tabOrder: string[]
  activeTabId: string | null
  removedTabIds: string[]
}