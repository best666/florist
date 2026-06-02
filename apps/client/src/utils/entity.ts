import type { IImageAsset } from '@florist/contracts'

/**
 * 生成前端实体唯一标识，格式为 `${prefix}-${timestamp}-${random}`。
 * 离线和在线场景统一使用此函数，避免依赖服务端自增 ID。
 */
export function createEntityId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 浅拷贝图片数组，避免多处共享同一引用导致意外修改。
 */
export function cloneImages(images: ReadonlyArray<IImageAsset>): IImageAsset[] {
  return images.map((image) => ({ ...image }))
}

/**
 * 标准化可选字符串：trim 后若非空则返回，否则返回 undefined。
 * 用于表单字段“不填即不写入实体”的语义。
 */
export function normalizeOptionalString(value?: string): string | undefined {
  if (!value) return undefined
  const normalizedValue = value.trim()
  return normalizedValue.length > 0 ? normalizedValue : undefined
}
