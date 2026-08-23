/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import { createPinia } from 'pinia'

import EXPORT_MODAL_SOURCE from './ExportModal.vue?raw'
import ExportModal from './ExportModal.vue'
import { useSettingsStore } from '@/stores/settings'

const {
  buildPlatformArtifactBundleMock,
  revealPathInFileManagerMock,
  writeLocalDeliveryBundleMock,
} = vi.hoisted(() => ({
  buildPlatformArtifactBundleMock: vi.fn(),
  revealPathInFileManagerMock: vi.fn(),
  writeLocalDeliveryBundleMock: vi.fn(),
}))

vi.mock('@/services/export/platform-artifact-bundle', () => ({
  buildPlatformArtifactBundle: (...args: unknown[]) => buildPlatformArtifactBundleMock(...args),
}))

vi.mock('@/services/desktop', () => ({
  revealPathInFileManager: (...args: unknown[]) => revealPathInFileManagerMock(...args),
  writeLocalDeliveryBundle: (...args: unknown[]) => writeLocalDeliveryBundleMock(...args),
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise })
  return { promise, resolve }
}

async function flushVue() {
  for (let index = 0; index < 12; index += 1) {
    await Promise.resolve()
    await nextTick()
  }
}

async function waitForEnabledButton(text: string): Promise<HTMLButtonElement | undefined> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const button = [...document.querySelectorAll<HTMLButtonElement>('button')]
      .find(candidate => candidate.textContent?.includes(text))
    if (button && !button.disabled) return button
    await new Promise(resolve => setTimeout(resolve, 10))
    await flushVue()
  }
  return [...document.querySelectorAll<HTMLButtonElement>('button')]
    .find(candidate => candidate.textContent?.includes(text))
}

describe('ExportModal local delivery contract', () => {
  it('keeps folder and static blog delivery on the real native write boundary', () => {
    expect(EXPORT_MODAL_SOURCE).toContain('buildLocalDeliveryBundle')
    expect(EXPORT_MODAL_SOURCE).not.toContain('pickNativeDirectory')
    expect(EXPORT_MODAL_SOURCE).not.toContain('selectLocalDeliveryDirectory')
    expect(EXPORT_MODAL_SOURCE).toContain('writeLocalDeliveryBundle')
    expect(EXPORT_MODAL_SOURCE).toContain('选择目录并写入')
    expect(EXPORT_MODAL_SOURCE).toContain('选择个人文件夹')
    expect(EXPORT_MODAL_SOURCE).toContain('个人文件夹')
    expect(EXPORT_MODAL_SOURCE).toContain('个人博客')
    expect(EXPORT_MODAL_SOURCE).toContain("localDeliveryFormat = 'markdown'")
    expect(EXPORT_MODAL_SOURCE).toContain("localDeliveryFormat = 'html'")
    expect(EXPORT_MODAL_SOURCE).toContain('逐一回读验证')
    expect(EXPORT_MODAL_SOURCE).toContain("recordExportArtifact(entry?.content ?? props.content, 'write-local', `${localDeliveryTargetLabel.value} ${localDeliveryFormatLabel.value}`, 'local')")
    expect(EXPORT_MODAL_SOURCE).not.toContain('WordPress 发布成功')
    expect(EXPORT_MODAL_SOURCE).not.toContain('Ghost 发布成功')
  })

  it('opens on the valid persisted platform preset instead of resetting the export style', () => {
    expect(EXPORT_MODAL_SOURCE).toContain('const storedPlatform = settingsStore.settings.export.defaultPlatform')
    expect(EXPORT_MODAL_SOURCE).toContain('const storedPresetId = settingsStore.settings.export.defaultPresetId')
    expect(EXPORT_MODAL_SOURCE).toContain('getPlatformPresets(storedPlatform).some')
    expect(EXPORT_MODAL_SOURCE).toContain('platformPresetIds.value[storedPlatform] = storedPresetId')
    expect(EXPORT_MODAL_SOURCE).toContain('themePresets.find(item => item.id === platformPresetIds.value.wechat)')
    expect(EXPORT_MODAL_SOURCE).toContain('const nextPresetId = settingsStore.settings.export.defaultPresetId')
    expect(EXPORT_MODAL_SOURCE).toContain('platformPresetIds.value[nextPlatform] = nextPresetId')
    expect(EXPORT_MODAL_SOURCE).toContain('@click="selectPlatform(p.id)"')
    expect(EXPORT_MODAL_SOURCE).toMatch(
      /function selectPlatform\(platform: Platform\): void \{[\s\S]{0,300}?defaultPlatform = platform[\s\S]{0,300}?defaultPresetId = platformPresetIds\.value\[platform\]/,
    )
    expect(EXPORT_MODAL_SOURCE).toMatch(
      /function selectPreset\(id: string\) \{[\s\S]{0,300}?defaultPlatform = selectedPlatform\.value[\s\S]{0,300}?defaultPresetId = id/,
    )
  })

  it('keeps one primary copy/download path on the platform-native artifact', () => {
    expect(EXPORT_MODAL_SOURCE).not.toContain('async function handleCopy()')
    expect(EXPORT_MODAL_SOURCE).not.toContain('function handleDownload()')
    expect(EXPORT_MODAL_SOURCE).not.toContain('class="native-actions"')
    expect(EXPORT_MODAL_SOURCE).not.toContain('下载样式版')
    expect(EXPORT_MODAL_SOURCE).not.toContain('样式版` }}</span>')
    expect(EXPORT_MODAL_SOURCE).toContain('@click="handleCopyNative"')
    expect(EXPORT_MODAL_SOURCE).toContain('@click="handleDownloadNative"')
    expect(EXPORT_MODAL_SOURCE).toContain("{{ nativeFormatLabel }}")
    expect(EXPORT_MODAL_SOURCE).toContain("`复制 ${nativeFormatLabel}`")
    expect(EXPORT_MODAL_SOURCE).toContain(": nativeDownloadLabel }}")
    expect(EXPORT_MODAL_SOURCE).toContain("'导出小红书图文包'")
    expect(EXPORT_MODAL_SOURCE).toContain("'导出知乎 Markdown 资产包'")
  })

  it('writes XHS and Zhihu exact artifact packs through the native file boundary', () => {
    expect(EXPORT_MODAL_SOURCE).toContain('buildPlatformArtifactBundle')
    expect(EXPORT_MODAL_SOURCE).toContain('writeLocalDeliveryBundle')
    expect(EXPORT_MODAL_SOURCE).toContain('导出小红书图文包')
    expect(EXPORT_MODAL_SOURCE).toContain('导出知乎 Markdown 资产包')
    expect(EXPORT_MODAL_SOURCE).toContain('真实 PNG')
    expect(EXPORT_MODAL_SOURCE).toContain('真实图片 fallback')
  })

  it('keeps the verified local delivery result visible after the native writer returns its directory', async () => {
    writeLocalDeliveryBundleMock.mockReset()
    revealPathInFileManagerMock.mockReset()
    writeLocalDeliveryBundleMock.mockResolvedValue({
      ok: true,
      value: {
        rootPath: 'C:/inkforge-delivery',
        files: [{
          relativePath: 'article.md',
          absolutePath: 'C:/inkforge-delivery/article.md',
          bytes: 9,
          readbackVerified: true,
        }],
        cleanupWarning: null,
      },
      source: 'tauri',
    })
    revealPathInFileManagerMock.mockResolvedValue({ ok: true, value: undefined, source: 'tauri' })

    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp(ExportModal, {
      visible: true,
      content: '# article',
      title: 'Article',
      initialPlatform: 'wechat',
    })
    app.use(createPinia())
    app.mount(host)

    const write = await waitForEnabledButton('选择目录并写入')
    expect(write).toBeDefined()
    write?.click()
    await flushVue()

    const directoryText = document.querySelector('.local-directory-path')?.textContent
    const resultText = document.querySelector('.local-delivery-result')?.textContent
    const reveal = [...document.querySelectorAll<HTMLButtonElement>('button')]
      .find(button => button.textContent?.includes('打开目录'))
    reveal?.click()
    await flushVue()

    app.unmount()
    host.remove()
    writeLocalDeliveryBundleMock.mockClear()

    expect(directoryText).toContain('C:/inkforge-delivery')
    expect(resultText).toContain('1 个文件已逐一回读验证')
    expect(reveal).toBeDefined()
    expect(revealPathInFileManagerMock).toHaveBeenCalledWith('C:/inkforge-delivery')
  })

  it('snapshots artifact writes and ignores stale results after a platform switch', () => {
    expect(EXPORT_MODAL_SOURCE).toContain('platformArtifactWriteVersion')
    expect(EXPORT_MODAL_SOURCE).toContain('nativeOptions: snapshotWechatExportOptions(effectiveExportOptions.value)')
    expect(EXPORT_MODAL_SOURCE).toContain('if (!isCurrentPlatformArtifactWriteRequest(request)) return')
    expect(EXPORT_MODAL_SOURCE).toContain('资产包写入失败：${result.message}')
  })

  it('shows the registry-derived WeChat native component handoff without claiming insertion', () => {
    expect(EXPORT_MODAL_SOURCE).toContain('buildWechatNativeComponentHandoffReport')
    expect(EXPORT_MODAL_SOURCE).toContain('formatWechatNativeComponentHandoffReport')
    expect(EXPORT_MODAL_SOURCE).toContain('registry {{ wechatNativeHandoffReport.registryMatrix.length }} 项已动态枚举')
    expect(EXPORT_MODAL_SOURCE).toContain('当前文稿实例本地执行 {{ wechatNativeRegistryLocalCount }}/{{ wechatNativeHandoffReport.currentArtifactOccurrenceCount }}')
    expect(EXPORT_MODAL_SOURCE).toContain("wechatNativeHandoffReport.issues.length ? `${wechatNativeHandoffReport.issues.length} 个本地阻断` : '本地执行账本有效'")
    expect(EXPORT_MODAL_SOURCE).toContain('当前未证明原生绑定，未发布')
    expect(EXPORT_MODAL_SOURCE).toContain('平台原生手动插入')
    expect(EXPORT_MODAL_SOURCE).toContain('@click="handleCopyNativeComponentHandoff"')
  })

  it('drops a delayed artifact writer result after a platform switch', async () => {
    const writer = deferred<{
      ok: true
      value: { rootPath: string; files: []; cleanupWarning: null }
      source: 'tauri'
    }>()
    buildPlatformArtifactBundleMock.mockResolvedValue({
      platform: 'xiaohongshu',
      entryPath: 'article.xiaohongshu/post.txt',
      manifestPath: 'article.xiaohongshu/manifest.json',
      files: [{ relativePath: 'article.xiaohongshu/post.txt', content: 'old artifact' }],
      nativeResult: { format: 'text', content: 'old artifact' },
      manifest: {},
      manifestIssues: [],
      localArtifactReady: true,
      externalReadbackRequired: true,
    })
    writeLocalDeliveryBundleMock.mockReturnValueOnce(writer.promise)

    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp(ExportModal, {
      visible: true,
      content: '# old article',
      title: 'Old article',
      initialPlatform: 'xiaohongshu',
    })
    const pinia = createPinia()
    app.use(pinia)
    const settingsStore = useSettingsStore(pinia)
    const historySpy = vi.spyOn(settingsStore, 'recordExportHistory')
    app.mount(host)

    const download = await waitForEnabledButton('导出小红书图文包')
    expect(download).toBeDefined()
    expect(download?.disabled).toBe(false)
    download?.click()
    await flushVue()
    expect(buildPlatformArtifactBundleMock).toHaveBeenCalledWith(expect.objectContaining({
      platform: 'xiaohongshu',
      markdown: '# old article',
      title: 'Old article',
      nativeOptions: expect.objectContaining({
        presetId: expect.any(String),
        exportOptions: expect.any(Object),
      }),
    }))
    expect(writeLocalDeliveryBundleMock).toHaveBeenCalledTimes(1)
    expect(writeLocalDeliveryBundleMock).toHaveBeenCalledWith(
      expect.any(Array),
      expect.stringContaining('小红书'),
    )

    const zhihu = [...document.querySelectorAll<HTMLButtonElement>('button.pill-btn')]
      .find(button => button.textContent?.includes('知乎'))
    expect(zhihu).toBeDefined()
    zhihu?.click()
    await flushVue()
    const staleWriteGuard = document.querySelector<HTMLButtonElement>('.action-bar .act-secondary')
    expect(staleWriteGuard?.disabled).toBe(true)
    expect(staleWriteGuard?.textContent).toContain('生成并回读中')
    writer.resolve({
      ok: true,
      value: { rootPath: 'C:/inkforge-delivery', files: [], cleanupWarning: null },
      source: 'tauri',
    })
    await flushVue()

    expect(staleWriteGuard?.disabled).toBe(false)
    expect(staleWriteGuard?.textContent).toContain('导出知乎 Markdown 资产包')
    expect(historySpy).not.toHaveBeenCalled()
    expect(document.querySelector('.local-delivery-result')).toBeNull()
    expect(document.querySelector('.feedback-success')).toBeNull()

    app.unmount()
    host.remove()
  })

  it('surfaces a Rust target-conflict error without recording success', async () => {
    buildPlatformArtifactBundleMock.mockReset()
    writeLocalDeliveryBundleMock.mockReset()
    buildPlatformArtifactBundleMock.mockResolvedValue({
      platform: 'xiaohongshu',
      entryPath: 'article.xiaohongshu/post.txt',
      manifestPath: 'article.xiaohongshu/manifest.json',
      files: [{ relativePath: 'article.xiaohongshu/post.txt', content: 'article' }],
      nativeResult: { format: 'text', content: 'article' },
      manifest: {},
      manifestIssues: [],
      localArtifactReady: true,
      externalReadbackRequired: true,
    })
    writeLocalDeliveryBundleMock.mockResolvedValue({
      ok: false,
      reason: 'failed',
      message: 'Rust 拒绝写入：目标目录存在同名目标。',
      source: 'tauri',
    })

    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp(ExportModal, {
      visible: true,
      content: '# article',
      title: 'Article',
      initialPlatform: 'xiaohongshu',
    })
    const pinia = createPinia()
    app.use(pinia)
    const settingsStore = useSettingsStore(pinia)
    const historySpy = vi.spyOn(settingsStore, 'recordExportHistory')
    app.mount(host)

    const download = await waitForEnabledButton('导出小红书图文包')
    expect(download).toBeDefined()
    download?.click()
    await flushVue()

    expect(writeLocalDeliveryBundleMock).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.feedback-error')?.textContent).toContain('Rust 拒绝写入：目标目录存在同名目标。')
    expect(document.querySelector('.feedback-success')).toBeNull()
    expect(document.querySelector('.local-delivery-result')).toBeNull()
    expect(historySpy).not.toHaveBeenCalled()

    app.unmount()
    host.remove()
  })
})
