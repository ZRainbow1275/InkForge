import { createDefaultLayoutState } from './defaults'
import {
  EDITOR_MODE_VALUES,
  EDITOR_WIDTH_VALUES,
  LAYOUT_PANEL_WIDTH_LIMITS,
  MANAGER_TAB_VALUES,
  RIGHT_PANEL_MODE_VALUES,
  SPLIT_VIEW_FONT_SCALE_LIMIT,
  SPLIT_VIEW_RATIO_LIMIT,
  WORKSTATION_PANEL_VALUES,
  ZOOM_LIMIT,
  LayoutStateRecordSchema,
  ModeLayoutsSchema,
  SerializedTabSchema,
  type LayoutEditorMode,
  type LayoutEditorWidth,
  type LayoutManagerTab,
  type LayoutPanelKey,
  type LayoutRightPanelMode,
  type LayoutStatePatch,
  type LayoutStateRecord,
  type ModeLayouts,
  type PanelWidths,
  type PerModeLayout,
} from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T)
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

function asTimestamp(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback
}

function normalizeModeLayout(input: unknown, fallback: PerModeLayout): PerModeLayout {
  const candidate = isRecord(input) ? input : {}
  return {
    managerCollapsed: asBoolean(candidate.managerCollapsed, fallback.managerCollapsed),
    stageCollapsed: asBoolean(candidate.stageCollapsed, fallback.stageCollapsed),
    inspectorCollapsed: asBoolean(candidate.inspectorCollapsed, fallback.inspectorCollapsed),
    rightPanelMode: isOneOf(candidate.rightPanelMode, RIGHT_PANEL_MODE_VALUES) ? candidate.rightPanelMode : fallback.rightPanelMode,
  }
}

function normalizeModeLayouts(input: unknown, fallback: ModeLayouts): ModeLayouts {
  const candidate = isRecord(input) ? input : {}
  return ModeLayoutsSchema.parse({
    typora: normalizeModeLayout(candidate.typora, fallback.typora),
    source: normalizeModeLayout(candidate.source, fallback.source),
    preview: normalizeModeLayout(candidate.preview, fallback.preview),
  })
}

function normalizePanelWidths(input: unknown, fallback: PanelWidths): PanelWidths {
  const candidate = isRecord(input) ? input : {}
  return WORKSTATION_PANEL_VALUES.reduce<PanelWidths>((widths, panel) => {
    const limits = LAYOUT_PANEL_WIDTH_LIMITS[panel]
    widths[panel] = clampNumber(candidate[panel], fallback[panel], limits.min, limits.max)
    return widths
  }, { ...fallback })
}

function normalizeStatusBarFieldVisibility(input: unknown, fallback: Record<string, boolean>): Record<string, boolean> {
  if (!isRecord(input)) return { ...fallback }
  return Object.entries(input).reduce<Record<string, boolean>>((fields, [key, value]) => {
    if (typeof value === 'boolean') fields[key] = value
    return fields
  }, {})
}

function normalizeSerializedTabs(input: unknown, fallback: LayoutStateRecord['openTabs']): LayoutStateRecord['openTabs'] {
  if (!Array.isArray(input)) return fallback
  return input.reduce<LayoutStateRecord['openTabs']>((tabs, rawTab) => {
    const parsed = SerializedTabSchema.safeParse(rawTab)
    if (parsed.success) tabs.push(parsed.data)
    return tabs
  }, [])
}

function normalizeNullableId(input: unknown, fallback: string | null): string | null {
  if (input === null) return null
  if (typeof input === 'string' && input.length > 0) return input
  return fallback
}

export function normalizeLayoutStatePatch(input: LayoutStatePatch, base: LayoutStateRecord): LayoutStatePatch {
  const openTabs = normalizeSerializedTabs(input.openTabs, base.openTabs)
  const openTabIds = new Set(openTabs.map(tab => tab.id))
  const tabOrder = Array.isArray(input.tabOrder)
    ? input.tabOrder.filter((id): id is string => typeof id === 'string' && id.length > 0 && openTabIds.has(id))
    : base.tabOrder.filter(id => openTabIds.has(id))
  const normalizedActiveTabId = normalizeNullableId(input.activeTabId, base.activeTabId)

  return {
    managerCollapsed: asBoolean(input.managerCollapsed, base.managerCollapsed),
    stageCollapsed: asBoolean(input.stageCollapsed, base.stageCollapsed),
    inspectorCollapsed: asBoolean(input.inspectorCollapsed, base.inspectorCollapsed),
    rightPanelMode: isOneOf(input.rightPanelMode, RIGHT_PANEL_MODE_VALUES) ? input.rightPanelMode : base.rightPanelMode,
    managerTab: isOneOf(input.managerTab, MANAGER_TAB_VALUES) ? input.managerTab : base.managerTab,
    editorMode: isOneOf(input.editorMode, EDITOR_MODE_VALUES) ? input.editorMode : base.editorMode,
    editorWidth: isOneOf(input.editorWidth, EDITOR_WIDTH_VALUES) ? input.editorWidth : base.editorWidth,
    modeLayouts: normalizeModeLayouts(input.modeLayouts, base.modeLayouts),
    panelWidths: normalizePanelWidths(input.panelWidths, base.panelWidths),
    openTabs,
    tabOrder: tabOrder.length > 0 ? tabOrder : openTabs.map(tab => tab.id),
    activeTabId: normalizedActiveTabId && openTabIds.has(normalizedActiveTabId) ? normalizedActiveTabId : openTabs[0]?.id ?? null,
    activeArticleId: normalizeNullableId(input.activeArticleId, base.activeArticleId),
    statusBarVisible: asBoolean(input.statusBarVisible, base.statusBarVisible),
    statusBarFieldVisibility: normalizeStatusBarFieldVisibility(input.statusBarFieldVisibility, base.statusBarFieldVisibility),
    zoomLevel: clampNumber(input.zoomLevel, base.zoomLevel, ZOOM_LIMIT.min, ZOOM_LIMIT.max),
    splitViewEnabled: asBoolean(input.splitViewEnabled, base.splitViewEnabled),
    splitViewRatio: clampNumber(input.splitViewRatio, base.splitViewRatio, SPLIT_VIEW_RATIO_LIMIT.min, SPLIT_VIEW_RATIO_LIMIT.max),
    splitViewSyncScroll: asBoolean(input.splitViewSyncScroll, base.splitViewSyncScroll),
    splitViewLeftFontScale: clampNumber(input.splitViewLeftFontScale, base.splitViewLeftFontScale, SPLIT_VIEW_FONT_SCALE_LIMIT.min, SPLIT_VIEW_FONT_SCALE_LIMIT.max),
    splitViewRightFontScale: clampNumber(input.splitViewRightFontScale, base.splitViewRightFontScale, SPLIT_VIEW_FONT_SCALE_LIMIT.min, SPLIT_VIEW_FONT_SCALE_LIMIT.max),
  }
}

export function migrateLayoutState(input: unknown, profileId: string, windowId: string, now: number = Date.now()): LayoutStateRecord {
  const fallback = createDefaultLayoutState(profileId, windowId, now)
  if (!isRecord(input)) return fallback

  const patch = normalizeLayoutStatePatch(input as LayoutStatePatch, fallback)
  const savedAt = asTimestamp(input.savedAt, now)
  return LayoutStateRecordSchema.parse({
    ...fallback,
    ...patch,
    id: fallback.id,
    schemaVersion: 1,
    profileId,
    windowId,
    layoutVersion: 1,
    savedAt,
    createdAt: asTimestamp(input.createdAt, fallback.createdAt),
    updatedAt: asTimestamp(input.updatedAt, now),
  })
}

export function isLayoutEditorMode(value: unknown): value is LayoutEditorMode {
  return isOneOf(value, EDITOR_MODE_VALUES)
}

export function isLayoutEditorWidth(value: unknown): value is LayoutEditorWidth {
  return isOneOf(value, EDITOR_WIDTH_VALUES)
}

export function isLayoutManagerTab(value: unknown): value is LayoutManagerTab {
  return isOneOf(value, MANAGER_TAB_VALUES)
}

export function isLayoutRightPanelMode(value: unknown): value is LayoutRightPanelMode {
  return isOneOf(value, RIGHT_PANEL_MODE_VALUES)
}

export function clampPanelWidth(panel: LayoutPanelKey, value: unknown): number {
  const limits = LAYOUT_PANEL_WIDTH_LIMITS[panel]
  return clampNumber(value, limits.default, limits.min, limits.max)
}