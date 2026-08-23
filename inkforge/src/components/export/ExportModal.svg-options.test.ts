/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'

import EXPORT_MODAL_SOURCE from './ExportModal.vue?raw'
import {
  SVG_MODULES,
  WECHAT_SVG_APPLICATION_SLOTS,
} from '@/services/export'

describe('ExportModal WeChat SVG option UI contract', () => {
  it('exposes the WeChat SVG application slots in the real export modal source', () => {
    expect(EXPORT_MODAL_SOURCE).toContain('WECHAT_SVG_APPLICATION_SLOTS')
    expect(EXPORT_MODAL_SOURCE).toContain('handleWechatSvgModulesToggle')
    expect(EXPORT_MODAL_SOURCE).toContain('handleWechatSvgSlotChange')
    expect(EXPORT_MODAL_SOURCE).toContain('wechat-svg-options')
    expect(EXPORT_MODAL_SOURCE).toContain('wechat-svg-slot-grid')
    expect(EXPORT_MODAL_SOURCE).toContain('getWechatSvgSlotModuleId(slot.id)')
  })

  it('binds the UI controls to the same exportOptions object used by the WeChat renderer', () => {
    expect(EXPORT_MODAL_SOURCE).toContain('exportOptions.enableSvgModules === true')
    expect(EXPORT_MODAL_SOURCE).toContain('svgInjectionPlan: setWechatSvgApplicationSlot')
    expect(EXPORT_MODAL_SOURCE).toContain('markdownToWechatWithStats(props.content, preset, renderExportOptions)')
  })

  it('uses canonical appearance typography instead of a second export-only font state', () => {
    expect(EXPORT_MODAL_SOURCE).toContain('typographyToWechatCss({')
    expect(EXPORT_MODAL_SOURCE).toContain('...appearance.typography')
    expect(EXPORT_MODAL_SOURCE).toContain('settingsStore.settings.appearance.typography.fontSize === size.id')
    expect(EXPORT_MODAL_SOURCE).not.toContain('exportOptions.fontFamily')
    expect(EXPORT_MODAL_SOURCE).not.toContain('exportOptions.fontSize')
  })

  it('keeps one primary preset selector and moves parameters and proof data into secondary drawers', () => {
    expect(EXPORT_MODAL_SOURCE).toContain('class="preset-grid"')
    expect(EXPORT_MODAL_SOURCE.match(/class="preset-grid"/g)).toHaveLength(1)
    expect(EXPORT_MODAL_SOURCE).toContain('class="ctrl-section style-options-drawer"')
    expect(EXPORT_MODAL_SOURCE).toContain('class="ctrl-section style-diagnostics-drawer"')
    expect(EXPORT_MODAL_SOURCE).toContain('class="ctrl-section export-diagnostics-drawer"')
    expect(EXPORT_MODAL_SOURCE).toContain('高级参数')
    expect(EXPORT_MODAL_SOURCE).toContain('渲染诊断与证据')
    expect(EXPORT_MODAL_SOURCE).toContain('质量与导出预检')
    expect(EXPORT_MODAL_SOURCE).not.toContain('@click="selectStyleChoice(row)"')
    expect(EXPORT_MODAL_SOURCE).not.toContain('function selectStyleChoice(')
    expect(EXPORT_MODAL_SOURCE).toContain(':data-style-choice-id="row.availability.choice.id"')
    expect(EXPORT_MODAL_SOURCE).toContain(':aria-pressed="row.selected"')
    expect(EXPORT_MODAL_SOURCE).toContain(':disabled="!row.selectable"')
    expect(EXPORT_MODAL_SOURCE).toContain('@click="row.application && selectPreset(row.application.presetId)"')
    expect(EXPORT_MODAL_SOURCE).toContain('const selectedStyleChoiceApplications = computed(() =>')
    expect(EXPORT_MODAL_SOURCE).toContain('对应能力 ${selectedCapabilityLabels.length} 项')

    const diagnosticsStart = EXPORT_MODAL_SOURCE.indexOf('class="ctrl-section export-diagnostics-drawer"')
    const diagnosticsEnd = EXPORT_MODAL_SOURCE.indexOf('</details>', diagnosticsStart)
    const exportDiagnostics = EXPORT_MODAL_SOURCE.slice(diagnosticsStart, diagnosticsEnd)
    expect(exportDiagnostics).toContain('质量检测')
    expect(exportDiagnostics).toContain('导出预检')
    expect(exportDiagnostics).not.toMatch(/^class="[^"]+"\s+open/m)
    expect(EXPORT_MODAL_SOURCE).not.toMatch(/<details(?=[^>]*class="ctrl-section (?:style-options|style-diagnostics|export-diagnostics)-drawer")[^>]*\sopen(?:\s|>)/)
  })

  it('keeps credentialed draft creation out of the local export flow', () => {
    expect(EXPORT_MODAL_SOURCE).not.toContain('publishWechatDraft')
    expect(EXPORT_MODAL_SOURCE).not.toContain('getWechatPublishStatus')
    expect(EXPORT_MODAL_SOURCE).not.toContain('wechat-draft-area')
    expect(EXPORT_MODAL_SOURCE).not.toContain('微信草稿')
  })

  it('surfaces current-round local WeChat readiness without claiming external proof', () => {
    expect(EXPORT_MODAL_SOURCE).toContain('styleCurrentRoundLocalTarget')
    expect(EXPORT_MODAL_SOURCE).toContain('current-round-local-target')
    expect(EXPORT_MODAL_SOURCE).toContain('当前轮本地目标已就绪')
    expect(EXPORT_MODAL_SOURCE).toContain('不等同手机预览、同步或发布证明')
  })

  it('keeps the all-module showcase slot aligned with the registered SVG module catalog', () => {
    const showcase = WECHAT_SVG_APPLICATION_SLOTS.find(slot => slot.id === 'showcase')

    expect(SVG_MODULES).toHaveLength(27)
    expect(showcase?.modules.map(module => module.id)).toEqual(SVG_MODULES.map(module => module.id))
  })
})
