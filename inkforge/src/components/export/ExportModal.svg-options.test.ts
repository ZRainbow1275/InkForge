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
    expect(EXPORT_MODAL_SOURCE).toContain('markdownToWechatWithStats(props.content, preset, exportOptions.value)')
  })

  it('keeps the all-module showcase slot aligned with the registered SVG module catalog', () => {
    const showcase = WECHAT_SVG_APPLICATION_SLOTS.find(slot => slot.id === 'showcase')

    expect(SVG_MODULES).toHaveLength(27)
    expect(showcase?.modules.map(module => module.id)).toEqual(SVG_MODULES.map(module => module.id))
  })
})
