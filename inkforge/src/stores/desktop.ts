import { defineStore } from 'pinia'
import {
  getDesktopRuntimeSnapshot,
  openExternalUrl,
  revealPathInFileManager,
  type DesktopCapabilityStatus,
  type DesktopCommandResult,
  type DesktopRuntimeSnapshot,
} from '@/services/desktop'

interface DesktopState {
  snapshot: DesktopRuntimeSnapshot | null
  loading: boolean
  error: string | null
  lastCommand: DesktopCommandResult<void> | null
}

export const useDesktopStore = defineStore('desktop', {
  state: (): DesktopState => ({
    snapshot: null,
    loading: false,
    error: null,
    lastCommand: null,
  }),

  getters: {
    runtimeKindLabel: (state): string => {
      if (!state.snapshot) return 'Unknown'
      return state.snapshot.runtime.kind === 'tauri' ? 'Tauri Desktop' : 'Web Runtime'
    },

    capabilityGroups: (state): DesktopCapabilityStatus[] => state.snapshot?.capabilities ?? [],

    availableCapabilityCount: (state): number =>
      state.snapshot?.capabilities.filter(capability => capability.state === 'available').length ?? 0,
  },

  actions: {
    async refresh(): Promise<void> {
      this.loading = true
      this.error = null
      try {
        this.snapshot = await getDesktopRuntimeSnapshot()
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error)
      } finally {
        this.loading = false
      }
    },

    async revealPath(filePath: string): Promise<DesktopCommandResult<void>> {
      const result = await revealPathInFileManager(filePath)
      this.lastCommand = result
      return result
    },

    async openUrl(url: string): Promise<DesktopCommandResult<void>> {
      const result = await openExternalUrl(url)
      this.lastCommand = result
      return result
    },
  },
})
