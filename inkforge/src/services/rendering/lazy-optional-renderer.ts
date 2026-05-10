type OptionalRendererModule = typeof import('./optional-renderers')

let optionalRendererModulePromise: Promise<OptionalRendererModule> | null = null

async function loadOptionalRendererModule(): Promise<OptionalRendererModule> {
  if (!optionalRendererModulePromise) {
    optionalRendererModulePromise = import('./optional-renderers')
  }

  return optionalRendererModulePromise
}

export async function renderMarkdownWithLazyOptionalEnhancements(markdown: string): Promise<string> {
  const { renderMarkdownWithOptionalEnhancements } = await loadOptionalRendererModule()
  return renderMarkdownWithOptionalEnhancements(markdown)
}
