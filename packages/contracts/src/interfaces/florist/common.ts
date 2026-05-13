/**
 * 后端接口与前端缓存统一使用 ISO 时间字符串。
 */
export type IsoDateTimeString = string

/**
 * 金额统一使用分，避免浮点误差。
 */
export type PriceInCents = number

/**
 * 图片资源统一结构，便于前后端复用。
 */
export interface IImageAsset {
  /** 图片唯一标识。 */
  readonly id: string
  /** 原始资源地址，可为本地地址或远程 URL。 */
  readonly url: string
  /** 压缩后资源地址，非所有场景必有。 */
  readonly compressedUrl?: string
  /** 图片上传或拍摄时间。 */
  readonly createdAt: IsoDateTimeString
}
