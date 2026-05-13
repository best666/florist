import type { Maybe, Nil, Nullable } from '@/interfaces'

const IMAGE_EXTENSION_REGEXP = /\.(png|jpe?g|gif|webp|bmp|heic|svg)$/i
const IMAGE_BASE64_REGEXP = /^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml);base64,/i
const IMAGE_URL_REGEXP = /^(https?:\/\/|blob:|data:image\/|\/|\.\/|\.\.\/)/i

export function isNil(value: unknown): value is Nil {
  return value === null || value === undefined
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function isBlankString(value: Maybe<string>): boolean {
  return typeof value !== 'string' || value.trim().length === 0
}

export function toSafeString(value: Maybe<string>, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function isEmptyValue(value: unknown): boolean {
  if (isNil(value)) {
    return true
  }

  if (typeof value === 'string') {
    return value.trim().length === 0
  }

  if (Array.isArray(value)) {
    return value.length === 0
  }

  if (value instanceof Map || value instanceof Set) {
    return value.size === 0
  }

  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length === 0
  }

  return false
}

export function isValidImageExtension(value: string): boolean {
  return IMAGE_EXTENSION_REGEXP.test(value)
}

export function isValidImageBase64(value: string): boolean {
  return IMAGE_BASE64_REGEXP.test(value)
}

export function isValidImageSource(value: Maybe<string>): value is string {
  if (!isNonEmptyString(value)) {
    return false
  }

  return IMAGE_URL_REGEXP.test(value) || isValidImageExtension(value)
}

export function ensureNullable<TValue>(
  value: Maybe<TValue>,
): Nullable<TValue> {
  return value ?? null
}
