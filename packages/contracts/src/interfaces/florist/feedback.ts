import type { FeedbackStatus } from '../enums'
import type { IImageAsset, IsoDateTimeString } from './common'

export interface IFeedbackReply {
  /** 管理员回复内容。 */
  readonly content: string
  /** 回复时间。 */
  readonly repliedAt: IsoDateTimeString
  /** 回复人标识。 */
  readonly repliedBy: string
}

/** 反馈评论 */
export interface IFeedbackComment {
  /** 评论唯一标识。 */
  readonly id: string
  /** 评论内容。 */
  readonly content: string
  /** 评论者昵称。 */
  readonly authorName: string
  /** 评论者头像。 */
  readonly authorAvatar?: string
  /** 评论时间。 */
  readonly createdAt: IsoDateTimeString
}

/**
 * 用户反馈实体。
 */
export interface IFeedback {
  /** 反馈唯一标识。 */
  readonly id: string
  /** 反馈内容。 */
  readonly content: string
  /** 反馈附带图片。 */
  readonly images: ReadonlyArray<IImageAsset>
  /** 提交者昵称。 */
  readonly authorName: string
  /** 提交者头像。 */
  readonly authorAvatar?: string
  /** 提交时间。 */
  readonly createdAt: IsoDateTimeString
  /** 处理状态。 */
  readonly status: FeedbackStatus
  /** 是否已公开（AI 审核通过后展示在社区）。 */
  readonly isPublic: boolean
  /** 投票数。 */
  readonly voteCount: number
  /** 当前用户是否已投票。 */
  readonly hasVoted?: boolean
  /** 管理员回复。 */
  readonly reply?: IFeedbackReply
  /** 评论列表（社区页加载）。 */
  readonly comments?: ReadonlyArray<IFeedbackComment>
}

/** 社区反馈列表查询参数 */
export interface CommunityFeedbackQuery {
  /** 排序方式 */
  readonly sort: 'votes' | 'newest'
  /** 分页游标 */
  readonly cursor?: string
  /** 每页数量 */
  readonly limit: number
}

/** 社区反馈列表响应 */
export interface CommunityFeedbackResponse {
  readonly items: ReadonlyArray<IFeedback>
  readonly nextCursor: string | null
  readonly totalCount: number
}
