/**
 * 标签状态统一用于植株状态、时间轴状态和通用视觉提示。
 */
export type TagLabelStatus =
  | 'watering-needed'
  | 'healthy'
  | 'dormant'
  | 'fertilizing-needed'
  | 'custom'

/**
 * 统一的柔和色调枚举，避免组件各自硬编码颜色方案。
 */
export type SoftTone = 'mint' | 'blush' | 'cream' | 'slate'

/**
 * 植株卡片内展示的简要养护信息。
 */
export interface FlowerCardCareItem {
  readonly label: string
  readonly value: string
}

/**
 * 植株卡片快捷操作配置。
 */
export interface FlowerCardQuickAction {
  readonly key: string
  readonly label: string
  readonly disabled?: boolean
}

/**
 * 时间轴节点的数据结构，适合记录流、提醒流和动态流复用。
 */
export interface TimelineItem {
  readonly id: string
  readonly title: string
  readonly timestamp: string
  readonly description?: string
  readonly tags?: ReadonlyArray<string>
  readonly status?: Exclude<TagLabelStatus, 'custom'>
  readonly tone?: SoftTone
  readonly dotLabel?: string
  readonly images?: ReadonlyArray<{ url: string; id: string }>
}

/**
 * 空状态场景枚举，用于映射插画和默认文案。
 */
export type EmptyStateScene = 'flower' | 'record' | 'data'

/**
 * 提交按钮渐变风格。
 */
export type SubmitButtonVariant = 'mint' | 'blush' | 'sunrise'
