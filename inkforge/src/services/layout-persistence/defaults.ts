import { generateId } from '@/utils/uuid'
import {
  LAYOUT_PANEL_WIDTH_LIMITS,
  LAYOUT_STATE_VERSION,
  ZOOM_LIMIT,
  SPLIT_VIEW_FONT_SCALE_LIMIT,
  SPLIT_VIEW_RATIO_LIMIT,
  type LayoutEditorMode,
  type LayoutStateRecord,
  type ModeLayouts,
  type PanelWidths,
  type PerModeLayout,
} from './types'

export function layoutStateKey(profileId: string, windowId: string): string {
  return `${profileId}:${windowId}`
}

export function createDefaultModeLayout(mode: LayoutEditorMode): PerModeLayout {
  if (mode === 'source') {
    return { managerCollapsed: false, stageCollapsed: true, inspectorCollapsed: false, rightPanelMode: 'inspector' }
  }
  if (mode === 'preview') {
    return { managerCollapsed: true, stageCollapsed: true, inspectorCollapsed: false, rightPanelMode: 'inspector' }
  }
  return { managerCollapsed: false, stageCollapsed: true, inspectorCollapsed: false, rightPanelMode: 'inspector' }
}

export function createDefaultModeLayouts(): ModeLayouts {
  return {
    typora: createDefaultModeLayout('typora'),
    source: createDefaultModeLayout('source'),
    preview: createDefaultModeLayout('preview'),
  }
}

export function createDefaultPanelWidths(): PanelWidths {
  return {
    manager: LAYOUT_PANEL_WIDTH_LIMITS.manager.default,
    stage: LAYOUT_PANEL_WIDTH_LIMITS.stage.default,
    inspector: LAYOUT_PANEL_WIDTH_LIMITS.inspector.default,
  }
}

export function createDefaultLayoutState(profileId: string, windowId: string, now: number = Date.now()): LayoutStateRecord {
  return {
    id: layoutStateKey(profileId, windowId),
    schemaVersion: 1,
    profileId,
    windowId,
    layoutVersion: LAYOUT_STATE_VERSION,
    managerCollapsed: false,
    stageCollapsed: true,
    inspectorCollapsed: false,
    rightPanelMode: 'inspector',
    managerTab: 'files',
    editorMode: 'typora',
    editorWidth: 'medium',
    modeLayouts: createDefaultModeLayouts(),
    panelWidths: createDefaultPanelWidths(),
    openTabs: [],
    tabOrder: [],
    activeTabId: null,
    activeArticleId: null,
    statusBarVisible: true,
    statusBarFieldVisibility: {},
    zoomLevel: ZOOM_LIMIT.default,
    splitViewEnabled: false,
    splitViewRatio: SPLIT_VIEW_RATIO_LIMIT.default,
    splitViewSyncScroll: true,
    splitViewLeftFontScale: SPLIT_VIEW_FONT_SCALE_LIMIT.default,
    splitViewRightFontScale: SPLIT_VIEW_FONT_SCALE_LIMIT.default,
    savedAt: now,
    createdAt: now,
    updatedAt: now,
  }
}

export function getLayoutWindowId(storage: Storage | null = typeof sessionStorage === 'undefined' ? null : sessionStorage): string {
  const key = 'inkforge.layout.windowId'
  if (!storage) return generateId()
  const existing = storage.getItem(key)
  if (existing) return existing
  const next = generateId()
  storage.setItem(key, next)
  return next
}