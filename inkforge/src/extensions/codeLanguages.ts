import { createLowlight } from 'lowlight'
import { INKFORGE_CODE_LANGUAGE_GRAMMARS } from './codeLanguageGrammars'

export const SUPPORTED_CODE_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'c',
  'cpp',
  'csharp',
  'go',
  'rust',
  'sql',
  'bash',
  'shell',
  'json',
  'yaml',
  'xml',
  'css',
  'markdown',
  'diff',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'dart',
  'lua',
  'r',
  'scala',
  'graphql',
  'ini',
  'scss',
  'less',
  'makefile',
  'perl',
  'objectivec',
  'wasm',
  'vbnet',
  'arduino',
  'plaintext',
] as const

export type SupportedCodeLanguage = typeof SUPPORTED_CODE_LANGUAGES[number]

export function createInkforgeLowlight() {
  return createLowlight(INKFORGE_CODE_LANGUAGE_GRAMMARS)
}
