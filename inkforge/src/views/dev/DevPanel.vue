<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import { storeToRefs } from 'pinia'
import { Activity, Copy, Database, Download, FileCode, HardDrive, Network, RefreshCw, Share2, ShieldAlert, X, Zap } from 'lucide-vue-next'
import { useDevPanelStore } from '@/stores/devPanel'
import { useDiagnosticsStore } from '@/stores/diagnostics'
import { usePerformanceStore } from '@/stores/performance'
import {
  DEV_PANEL_TAB_VALUES,
  STORE_PATCH_CONFIRMATION,
  activityLogToDevToolsEvent,
  clearNetworkDiagnostics,
  devToolsEventBus,
  getLargeJsonThresholdBytes,
  getProseMirrorSnapshot,
  getTipTapEditorSnapshot,
  listIndexedDbTables,
  listPiniaStores,
  patchPiniaStorePrimitive,
  readDevPanelPerformanceSnapshot,
  readIndexedDbRows,
  snapshotNetworkDiagnostics,
  type DevPanelPerformanceSnapshot,
  type DevPanelTabId,
  type DevToolsEvent,
  type IndexedDbRowsResult,
  type IndexedDbTableSummary,
  type NetworkDiagnosticsSnapshot,
  type ProseMirrorSnapshot,
  type StoreInspectorEntry,
  type TipTapEditorSnapshot,
} from '@/services/dev-tools'

const TAB_META: Record<DevPanelTabId, { label: string; icon: Component; compact: boolean }> = {
  editor: { label: 'Editor', icon: FileCode, compact: true },
  prosemirror: { label: 'ProseMirror', icon: Share2, compact: false },
  stores: { label: 'Stores', icon: Database, compact: false },
  performance: { label: 'Performance', icon: Activity, compact: false },
  events: { label: 'Events', icon: Zap, compact: true },
  indexeddb: { label: 'IndexedDB', icon: HardDrive, compact: true },
  network: { label: 'Network', icon: Network, compact: false },
}

const devPanelStore = useDevPanelStore()
const diagnosticsStore = useDiagnosticsStore()
const performanceStore = usePerformanceStore()
const { activeTab, isPanelVisible, drawerHeightVh, lastActivationSource } = storeToRefs(devPanelStore)
const { logs: diagnosticLogs, summary: diagnosticSummary } = storeToRefs(diagnosticsStore)
const { summary: performanceSummary, recentSamples, recentEvents, isCollecting: performanceCollecting } = storeToRefs(performanceStore)

const editorSnapshot = ref<TipTapEditorSnapshot>(getTipTapEditorSnapshot())
const pmSnapshot = ref<ProseMirrorSnapshot>(getProseMirrorSnapshot())
const stores = ref<StoreInspectorEntry[]>([])
const selectedStoreId = ref<string | null>(null)
const storePatchPath = ref('')
const storePatchValue = ref('')
const storePatchMessage = ref<string | null>(null)
const eventBusEvents = ref<DevToolsEvent[]>([])
const selectedEventId = ref<string | null>(null)
const idbTables = ref<IndexedDbTableSummary[]>([])
const selectedTable = ref<string | null>(null)
const idbRows = ref<IndexedDbRowsResult | null>(null)
const idbSearch = ref('')
const idbError = ref<string | null>(null)
const networkSnapshot = ref<NetworkDiagnosticsSnapshot>(snapshotNetworkDiagnostics())
const perfSnapshot = ref<DevPanelPerformanceSnapshot | null>(null)
const refreshError = ref<string | null>(null)
let refreshTimer: number | null = null
let unsubscribeEvents: (() => void) | null = null

const visibleTabs = computed(() => window.innerWidth < 960
  ? DEV_PANEL_TAB_VALUES.filter(tab => TAB_META[tab].compact)
  : [...DEV_PANEL_TAB_VALUES])
const selectedStore = computed(() => stores.value.find(store => store.id === selectedStoreId.value) ?? stores.value[0] ?? null)
const selectedEvent = computed(() => {
  const persisted = diagnosticLogs.value.map(activityLogToDevToolsEvent)
  const allEvents = [...eventBusEvents.value, ...persisted]
  return allEvents.find(event => event.id === selectedEventId.value) ?? allEvents[0] ?? null
})

function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function formatTime(timestamp: number | null | undefined): string {
  if (!timestamp) return '--'
  return new Date(timestamp).toLocaleTimeString()
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function handleHeightInput(event: Event): void {
  const input = event.target instanceof HTMLInputElement ? event.target : null
  if (input) devPanelStore.setDrawerHeight(Number(input.value))
}

function setTab(tab: DevPanelTabId): void {
  devPanelStore.setActiveTab(tab)
}

async function refreshEditor(): Promise<void> {
  editorSnapshot.value = getTipTapEditorSnapshot()
  pmSnapshot.value = getProseMirrorSnapshot()
}

async function refreshStores(): Promise<void> {
  stores.value = listPiniaStores()
  if (!selectedStoreId.value || !stores.value.some(store => store.id === selectedStoreId.value)) {
    selectedStoreId.value = stores.value[0]?.id ?? null
  }
}

async function refreshEvents(): Promise<void> {
  eventBusEvents.value = devToolsEventBus.snapshot().events
  await diagnosticsStore.loadLogs({ limit: 100 })
}

async function refreshIndexedDb(): Promise<void> {
  idbTables.value = await listIndexedDbTables()
  if (!selectedTable.value || !idbTables.value.some(table => table.name === selectedTable.value)) {
    selectedTable.value = idbTables.value[0]?.name ?? null
  }
  await reloadSelectedTable()
}

async function refreshPerformance(): Promise<void> {
  perfSnapshot.value = await readDevPanelPerformanceSnapshot()
  await performanceStore.loadRecent('local-profile')
}

async function refreshAll(): Promise<void> {
  refreshError.value = null
  try {
    await Promise.all([refreshEditor(), refreshStores(), refreshEvents(), refreshIndexedDb(), refreshPerformance()])
    networkSnapshot.value = snapshotNetworkDiagnostics()
  } catch (error) {
    refreshError.value = error instanceof Error ? error.message : String(error)
  }
}

async function reloadSelectedTable(): Promise<void> {
  if (!selectedTable.value) return
  idbError.value = null
  try {
    idbRows.value = await readIndexedDbRows(selectedTable.value, { search: idbSearch.value, pageSize: 50 })
  } catch (error) {
    idbError.value = error instanceof Error ? error.message : String(error)
  }
}

async function patchSelectedStore(): Promise<void> {
  if (!selectedStore.value) return
  if (!window.confirm(`Patch ${selectedStore.value.id}.${storePatchPath.value}? This writes to the live Pinia state.`)) return
  try {
    const result = patchPiniaStorePrimitive({
      storeId: selectedStore.value.id,
      path: storePatchPath.value,
      nextValue: storePatchValue.value,
      confirmation: STORE_PATCH_CONFIRMATION,
    })
    storePatchMessage.value = `Patched ${result.storeId}.${result.path} at ${formatTime(result.patchedAt)}`
    await refreshStores()
  } catch (error) {
    storePatchMessage.value = error instanceof Error ? error.message : String(error)
  }
}

function exportJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

async function copyJson(value: unknown): Promise<void> {
  await navigator.clipboard?.writeText(JSON.stringify(value, null, 2))
}

function clearNetwork(): void {
  clearNetworkDiagnostics()
  networkSnapshot.value = snapshotNetworkDiagnostics()
}

watch(selectedTable, () => {
  void reloadSelectedTable()
})

watch(isPanelVisible, visible => {
  if (visible) void refreshAll()
})

onMounted(() => {
  unsubscribeEvents = devToolsEventBus.subscribe(event => {
    eventBusEvents.value = [event, ...eventBusEvents.value].slice(0, 300)
  })
  void refreshAll()
  refreshTimer = window.setInterval(() => {
    void refreshAll()
  }, 2_000)
})

onBeforeUnmount(() => {
  unsubscribeEvents?.()
  if (refreshTimer) window.clearInterval(refreshTimer)
})
</script>

<template>
  <Teleport to="body">
    <section
      v-if="isPanelVisible"
      class="dev-panel"
      :style="{ '--dev-panel-height': drawerHeightVh + 'vh' }"
      role="dialog"
      aria-label="InkForge DevPanel"
    >
      <header class="dev-panel__header">
        <div>
          <p class="dev-panel__eyebrow">
            InkForge Runtime Diagnostics
          </p>
          <h2>DevPanel</h2>
        </div>
        <div class="dev-panel__actions">
          <span class="dev-panel__status">source: {{ lastActivationSource || 'unknown' }}</span>
          <input
            class="dev-panel__height"
            type="range"
            min="20"
            max="80"
            :value="drawerHeightVh"
            aria-label="DevPanel height"
            @input="handleHeightInput"
          >
          <button
            type="button"
            class="dev-panel__icon-btn"
            aria-label="Refresh DevPanel"
            @click="refreshAll"
          >
            <RefreshCw :size="16" />
          </button>
          <button
            type="button"
            class="dev-panel__icon-btn"
            aria-label="Close DevPanel"
            @click="devPanelStore.closePanel('ui')"
          >
            <X :size="18" />
          </button>
        </div>
      </header>

      <div
        v-if="refreshError"
        class="dev-panel__alert"
      >
        <ShieldAlert :size="15" /><span>{{ refreshError }}</span>
      </div>

      <nav
        class="dev-panel__tabs"
        aria-label="DevPanel tabs"
      >
        <button
          v-for="tab in visibleTabs"
          :key="tab"
          type="button"
          class="dev-panel__tab"
          :class="{ active: activeTab === tab }"
          @click="setTab(tab)"
        >
          <component
            :is="TAB_META[tab].icon"
            :size="15"
          />
          <span>{{ TAB_META[tab].label }}</span>
        </button>
      </nav>

      <main class="dev-panel__body">
        <section
          v-if="activeTab === 'editor'"
          class="dev-panel__grid dev-panel__grid--two"
        >
          <div class="dev-card">
            <div class="dev-card__header">
              <h3>TipTap JSON</h3><div class="dev-card__buttons">
                <button
                  type="button"
                  @click="copyJson(editorSnapshot.doc)"
                >
                  <Copy :size="14" /> Copy
                </button><button
                  type="button"
                  @click="exportJson('inkforge-editor-json.json', editorSnapshot.doc)"
                >
                  <Download :size="14" /> Download
                </button>
              </div>
            </div>
            <p
              v-if="!editorSnapshot.available"
              class="dev-empty"
            >
              No active TipTap editor is registered.
            </p>
            <p
              v-else-if="editorSnapshot.autoUpdateDisabled"
              class="dev-warning"
            >
              JSON is larger than 5 MB; automatic display is disabled until manual refresh.
            </p>
            <pre
              v-else
              class="dev-json"
            >{{ stringify(editorSnapshot.doc) }}</pre>
          </div>
          <div class="dev-card">
            <h3>Selection / Marks / Scroll</h3><dl class="dev-kv">
              <dt>Article</dt><dd>{{ editorSnapshot.articleId || '--' }}</dd><dt>JSON size</dt><dd>{{ formatBytes(editorSnapshot.jsonSizeBytes) }}</dd><dt>Large threshold</dt><dd>{{ formatBytes(getLargeJsonThresholdBytes()) }}</dd><dt>Characters</dt><dd>{{ editorSnapshot.characters }}</dd><dt>Words</dt><dd>{{ editorSnapshot.words }}</dd><dt>Selection</dt><dd>{{ editorSnapshot.selection ? stringify(editorSnapshot.selection) : '--' }}</dd><dt>Scroll</dt><dd>{{ editorSnapshot.scroll ? stringify(editorSnapshot.scroll) : '--' }}</dd>
            </dl><pre class="dev-json dev-json--short">{{ stringify(editorSnapshot.activeMarks) }}</pre>
          </div>
        </section>

        <section
          v-else-if="activeTab === 'prosemirror'"
          class="dev-panel__grid dev-panel__grid--two"
        >
          <div class="dev-card">
            <h3>PM Document</h3><p
              v-if="!pmSnapshot.available"
              class="dev-empty"
            >
              No ProseMirror state is available.
            </p><pre
              v-else
              class="dev-json"
            >{{ stringify(pmSnapshot.doc) }}</pre>
          </div>
          <div class="dev-card">
            <h3>Plugins and Transactions</h3><div class="dev-list">
              <details
                v-for="plugin in pmSnapshot.plugins"
                :key="plugin.key"
              >
                <summary>{{ plugin.key }} / props: {{ plugin.props.join(', ') || 'none' }}</summary><pre class="dev-json dev-json--short">{{ stringify(plugin.state) }}</pre>
              </details>
            </div><div class="dev-list dev-list--compact">
              <div
                v-for="tr in pmSnapshot.transactions"
                :key="tr.id"
                class="dev-row"
              >
                <span>{{ formatTime(tr.timestamp) }}</span><strong>{{ tr.docChanged ? 'doc' : 'state' }} / steps {{ tr.stepCount }}</strong>
              </div>
            </div>
          </div>
        </section>

        <section
          v-else-if="activeTab === 'stores'"
          class="dev-panel__grid dev-panel__grid--sidebar"
        >
          <aside class="dev-card dev-sidebar">
            <button
              v-for="store in stores"
              :key="store.id"
              type="button"
              :class="{ active: selectedStore?.id === store.id }"
              @click="selectedStoreId = store.id"
            >
              {{ store.id }} <span>{{ store.primitiveCount }}</span>
            </button>
          </aside>
          <div class="dev-card">
            <h3>{{ selectedStore?.id || 'No store selected' }}</h3><pre class="dev-json">{{ stringify(selectedStore?.state ?? null) }}</pre><div class="dev-form-row">
              <input
                v-model="storePatchPath"
                placeholder="path.to.primitive"
                aria-label="Store patch path"
              ><input
                v-model="storePatchValue"
                placeholder="JSON primitive or text"
                aria-label="Store patch value"
              ><button
                type="button"
                @click="patchSelectedStore"
              >
                Patch with confirmation
              </button>
            </div><p class="dev-muted">
              Only primitive state fields are editable. Every accepted patch writes dev.store.patch.
            </p><p
              v-if="storePatchMessage"
              class="dev-warning"
            >
              {{ storePatchMessage }}
            </p>
          </div>
        </section>

        <section
          v-else-if="activeTab === 'performance'"
          class="dev-panel__grid dev-panel__grid--two"
        >
          <div class="dev-card">
            <h3>Performance SLO</h3><dl class="dev-kv">
              <dt>Status</dt><dd>{{ performanceSummary.status }}</dd><dt>Samples</dt><dd>{{ performanceSummary.sampleCount }}</dd><dt>Events</dt><dd>{{ performanceSummary.eventCount }}</dd><dt>Collector</dt><dd>{{ performanceCollecting ? 'on' : 'off' }}</dd><dt>Snapshot</dt><dd>{{ perfSnapshot ? formatTime(perfSnapshot.collectedAt) : '--' }}</dd>
            </dl><button
              type="button"
              @click="performanceStore.refreshSnapshot('local-profile', 'dev-panel', 'dev-panel')"
            >
              Collect real snapshot
            </button>
          </div>
          <div class="dev-card">
            <h3>Recent Samples / Degradations</h3><div class="dev-list dev-list--compact">
              <div
                v-for="sample in recentSamples"
                :key="sample.id"
                class="dev-row"
              >
                <span>{{ sample.metric }}</span><strong>{{ sample.value ?? '--' }} {{ sample.thresholdUnit }} / {{ sample.status }}</strong>
              </div><div
                v-for="event in recentEvents"
                :key="event.id"
                class="dev-row dev-row--warn"
              >
                <span>{{ event.metric }}</span><strong>{{ event.level }} / {{ event.message }}</strong>
              </div>
            </div>
          </div>
        </section>

        <section
          v-else-if="activeTab === 'events'"
          class="dev-panel__grid dev-panel__grid--two"
        >
          <div class="dev-card">
            <h3>Event Stream</h3><dl class="dev-kv dev-kv--inline">
              <dt>Persisted</dt><dd>{{ diagnosticSummary.total }}</dd><dt>Queued</dt><dd>{{ diagnosticSummary.queued }}</dd><dt>Trace</dt><dd>{{ diagnosticSummary.traceBuffered }}</dd>
            </dl><div class="dev-list dev-list--compact">
              <button
                v-for="event in eventBusEvents"
                :key="event.id"
                type="button"
                class="dev-row dev-row--button"
                @click="selectedEventId = event.id"
              >
                <span>{{ formatTime(event.timestamp) }} / {{ event.level }}</span><strong>{{ event.summary }}{{ event.sampled ? ' / sampled' : '' }}</strong>
              </button>
            </div>
          </div>
          <div class="dev-card">
            <h3>Selected Event</h3><pre class="dev-json">{{ stringify(selectedEvent) }}</pre>
          </div>
        </section>

        <section
          v-else-if="activeTab === 'indexeddb'"
          class="dev-panel__grid dev-panel__grid--sidebar"
        >
          <aside class="dev-card dev-sidebar">
            <button
              v-for="table in idbTables"
              :key="table.name"
              type="button"
              :class="{ active: selectedTable === table.name }"
              @click="selectedTable = table.name"
            >
              {{ table.name }} <span>{{ table.rowCount }}</span>
            </button>
          </aside>
          <div class="dev-card">
            <div class="dev-card__header">
              <h3>{{ selectedTable || 'IndexedDB' }}</h3><input
                v-model="idbSearch"
                placeholder="Search sanitized rows"
                aria-label="IndexedDB search"
                @change="reloadSelectedTable"
              >
            </div><p
              v-if="idbRows?.table.sensitive"
              class="dev-warning"
            >
              Sensitive table: read-only browsing/export only.
            </p><p
              v-if="idbError"
              class="dev-warning"
            >
              {{ idbError }}
            </p><dl
              v-if="idbRows"
              class="dev-kv dev-kv--inline"
            >
              <dt>Total</dt><dd>{{ idbRows.totalRows }}</dd><dt>Filtered</dt><dd>{{ idbRows.filteredRows }}</dd><dt>Indexes</dt><dd>{{ idbRows.table.indexes.join(', ') || '--' }}</dd>
            </dl><pre class="dev-json">{{ stringify(idbRows?.rows ?? []) }}</pre>
          </div>
        </section>

        <section
          v-else-if="activeTab === 'network'"
          class="dev-panel__grid dev-panel__grid--two"
        >
          <div class="dev-card">
            <div class="dev-card__header">
              <h3>Network Ring Buffer</h3><button
                type="button"
                @click="clearNetwork"
              >
                Clear
              </button>
            </div><p class="dev-muted">
              Bodies are never stored. URLs and metadata are redacted before display.
            </p><div class="dev-list dev-list--compact">
              <div
                v-for="entry in networkSnapshot.entries"
                :key="entry.id"
                class="dev-row"
              >
                <span>{{ entry.kind }} / {{ entry.method }}</span><strong>{{ entry.status }} / {{ entry.durationMs }} ms</strong>
              </div>
            </div>
          </div>
          <div class="dev-card">
            <h3>Captured Entries</h3><pre class="dev-json">{{ stringify(networkSnapshot) }}</pre>
          </div>
        </section>
      </main>
    </section>
  </Teleport>
</template>

<style scoped>
.dev-panel{--dev-panel-height:40vh;position:fixed;inset:auto 18px 18px;z-index:9000;display:flex;flex-direction:column;height:var(--dev-panel-height);min-height:280px;overflow:hidden;border:1px solid rgba(148,163,184,.28);border-radius:18px;background:linear-gradient(135deg,#07111f 0%,#111827 46%,#1f2937 100%);color:#e5edf7;box-shadow:0 28px 90px rgba(2,6,23,.46);font-family:"SF Mono","Cascadia Code","Fira Code",monospace}.dev-panel__header,.dev-panel__tabs,.dev-panel__actions,.dev-card__header,.dev-card__buttons,.dev-form-row{display:flex;align-items:center}.dev-panel__header{justify-content:space-between;gap:20px;padding:14px 16px 10px;border-bottom:1px solid rgba(148,163,184,.18)}.dev-panel__eyebrow{margin:0 0 2px;color:#93c5fd;font-size:11px;letter-spacing:.12em;text-transform:uppercase}.dev-panel h2,.dev-card h3{margin:0}.dev-panel h2{font-size:18px}.dev-panel__actions{gap:10px}.dev-panel__status,.dev-muted{color:#94a3b8;font-size:12px}.dev-panel__height{width:110px}.dev-panel__icon-btn,.dev-panel__tab,.dev-card button,.dev-sidebar button,.dev-form-row button{border:1px solid rgba(148,163,184,.28);border-radius:10px;background:rgba(15,23,42,.72);color:#e5edf7;cursor:pointer}.dev-panel__icon-btn{display:grid;place-items:center;width:34px;height:34px}.dev-panel__tabs{gap:8px;padding:10px 16px;overflow-x:auto}.dev-panel__tab{gap:7px;padding:8px 11px;white-space:nowrap}.dev-panel__tab.active,.dev-sidebar button.active{border-color:rgba(96,165,250,.8);background:rgba(37,99,235,.34)}.dev-panel__body{flex:1;overflow:auto;padding:0 16px 16px}.dev-panel__grid{display:grid;gap:14px;min-height:100%}.dev-panel__grid--two{grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr)}.dev-panel__grid--sidebar{grid-template-columns:260px minmax(0,1fr)}.dev-card{min-width:0;overflow:hidden;padding:14px;border:1px solid rgba(148,163,184,.18);border-radius:14px;background:rgba(15,23,42,.56)}.dev-card__header{justify-content:space-between;gap:12px;margin-bottom:10px}.dev-card__buttons,.dev-form-row{gap:8px}.dev-card button,.dev-form-row button{display:inline-flex;align-items:center;gap:6px;padding:7px 9px}.dev-json{max-height:calc(var(--dev-panel-height) - 180px);overflow:auto;padding:12px;border-radius:12px;background:rgba(2,6,23,.7);color:#dbeafe;font-size:12px;line-height:1.55;white-space:pre-wrap}.dev-json--short{max-height:180px}.dev-kv{display:grid;grid-template-columns:140px minmax(0,1fr);gap:8px 12px;margin:12px 0}.dev-kv--inline{grid-template-columns:repeat(3,auto 1fr)}.dev-kv dt{color:#93c5fd}.dev-kv dd{min-width:0;margin:0;color:#e5edf7;overflow-wrap:anywhere}.dev-list{display:grid;gap:8px;max-height:calc(var(--dev-panel-height) - 210px);overflow:auto}.dev-list--compact{gap:6px}.dev-row,.dev-row--button{display:flex;justify-content:space-between;gap:12px;padding:8px 10px;border:1px solid rgba(148,163,184,.16);border-radius:10px;background:rgba(15,23,42,.55);color:inherit;text-align:left}.dev-row span{color:#93c5fd}.dev-row strong{min-width:0;overflow-wrap:anywhere}.dev-row--warn strong,.dev-warning{color:#fbbf24}.dev-sidebar{display:flex;flex-direction:column;gap:8px;overflow:auto}.dev-sidebar button{display:flex;justify-content:space-between;padding:9px 10px;text-align:left}.dev-form-row{margin-top:12px}.dev-form-row input,.dev-card__header input{min-width:0;padding:8px 10px;border:1px solid rgba(148,163,184,.28);border-radius:10px;background:rgba(2,6,23,.5);color:#e5edf7}.dev-panel__alert,.dev-empty{display:flex;align-items:center;gap:8px;margin:10px 16px;padding:10px 12px;border:1px solid rgba(251,191,36,.34);border-radius:12px;color:#fde68a;background:rgba(120,53,15,.24)}@media (max-width:960px){.dev-panel{inset:8px;height:calc(100vh - 16px)}.dev-panel__grid--two,.dev-panel__grid--sidebar{grid-template-columns:1fr}.dev-sidebar{max-height:180px}}
</style>
