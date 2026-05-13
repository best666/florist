import type { FeedbackStatus } from '../enums'
import type { IImageAsset, IsoDateTimeString } from './common'

/**
 * 用户反馈实体，字段与前端本地反馈历史保持一致，并补充后端处理状态。
 */
export interface IFeedback {
  /** 反馈唯一标识。 */
  readonly id: string
  /** 反馈内容。 */
  readonly content: string
  /** 反馈附带图片。 */
  readonly images: ReadonlyArray<IImageAsset>
  /** 提交时间。 */
  readonly createdAt: IsoDateTimeString
  /** 处理状态。 */
  readonly status: FeedbackStatus
}
