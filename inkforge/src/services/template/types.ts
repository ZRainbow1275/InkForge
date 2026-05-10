export type TemplateVariableType = 'text' | 'date' | 'number' | 'computed'

export interface TemplateVariable {
  name: string
  label: string
  type: TemplateVariableType
  required: boolean
  default?: string
  format?: string
  autoFill?: boolean
  expression?: 'currentWeekNumber'
}

export interface TemplateVariableContext {
  userInputs: Record<string, string>
  authorName: string
  createdAt: Date
  uuidFactory?: () => string
}

export interface RenderedTemplate {
  content: string
  cursorOffset: number | null
}

export interface TemplateValidationError {
  message: string
  position: number
}

export interface TemplateValidationResult {
  isValid: boolean
  errors: TemplateValidationError[]
}
