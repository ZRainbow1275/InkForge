import { describe, it, expect } from 'vitest'
import {
  posterViewBox,
  buildSvgDataUri,
  svgToImgTag,
  hasDom,
  rasterizeSvg,
} from '../raster'

// 测试环境为 node（无 canvas / 无 document）：只覆盖纯函数 + 守卫抛错路径，
// 绝不在测试里触发真实 canvas。

describe('posterViewBox', () => {
  it('3:4 → 1080×1440（小红书封面）', () => {
    expect(posterViewBox('3:4')).toEqual({ width: 1080, height: 1440 })
  })

  it('1:1 → 1080×1080（小红书内容）', () => {
    expect(posterViewBox('1:1')).toEqual({ width: 1080, height: 1080 })
  })
})

describe('buildSvgDataUri', () => {
  it('返回 data:image/svg+xml 且注入显式 width/height', () => {
    const uri = buildSvgDataUri('<svg viewBox="0 0 10 10"></svg>', 100, 100)
    expect(uri.startsWith('data:image/svg+xml')).toBe(true)
    const decoded = decodeURIComponent(uri.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''))
    expect(decoded).toContain('width="100"')
    expect(decoded).toContain('height="100"')
    // 保留原 viewBox 以维持比例。
    expect(decoded).toContain('viewBox="0 0 10 10"')
  })

  it('覆盖已有的固定/百分比尺寸而非重复', () => {
    const uri = buildSvgDataUri('<svg width="100%" viewBox="0 0 10 10"></svg>', 200, 300)
    const decoded = decodeURIComponent(uri.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''))
    expect(decoded).toContain('width="200"')
    expect(decoded).toContain('height="300"')
    expect(decoded).not.toContain('width="100%"')
  })

  it('无 <svg> 时用带 viewBox 的外壳包裹', () => {
    const uri = buildSvgDataUri('<g></g>', 50, 60)
    const decoded = decodeURIComponent(uri.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''))
    expect(decoded).toContain('<svg')
    expect(decoded).toContain('width="50"')
    expect(decoded).toContain('height="60"')
    expect(decoded).toContain('<g></g>')
  })
})

describe('svgToImgTag', () => {
  it('保留 data-ink-svg 哨兵、自适应宽度与 src', () => {
    const tag = svgToImgTag('data:image/png;base64,X', 'endmark-fin', '结束')
    expect(tag).toContain('data-ink-svg="endmark-fin"')
    expect(tag).toContain('width:100%')
    expect(tag).toContain('src="data:image/png;base64,X"')
    expect(tag).toContain('alt="结束"')
  })
})

describe('hasDom', () => {
  it('返回布尔值', () => {
    expect(typeof hasDom()).toBe('boolean')
  })
})

describe('rasterizeSvg', () => {
  it('无 DOM/canvas 环境时拒绝', async () => {
    if (hasDom()) {
      // 真浏览器/Tauri 环境下不在单测里跑真实 canvas，跳过。
      return
    }
    await expect(rasterizeSvg('<svg viewBox="0 0 10 10"></svg>', { width: 10, height: 10 })).rejects.toThrow(
      /DOM\/canvas/,
    )
  })
})
