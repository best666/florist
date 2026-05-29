import type { IsoDateTimeString } from './common'

export type AiExtremeWeatherType =
  | 'storm'
  | 'low-temperature'
  | 'high-temperature'
  | 'humid-south'
  | 'frost'

export interface IAiExtremeWeatherAlert {
  readonly type: AiExtremeWeatherType
  readonly title: string
  readonly description: string
}

/**
 * AI 养护建议实体，适配后端接口直接返回给前端页面或卡片模块。
 */
export interface IAiAdvice {
  /** 日用养护建议。 */
  readonly dailyAdvice: string
  /** 季节性养护建议。 */
  readonly seasonalAdvice: string
  /** 禁忌提醒。 */
  readonly warningTips: ReadonlyArray<string>
  /** 建议浇水周期，单位为天。 */
  readonly wateringCycleDays: number
  /** 建议施肥周期，单位为天。 */
  readonly fertilizingCycleDays: number
  /** 生成时间。 */
  readonly generatedAt: IsoDateTimeString
}

/**
 * 单株专属养护建议，适合首页卡片或详情页直接展示。
 */
export interface IPlantAiAdvice extends IAiAdvice {
  /** 对应植株 id。 */
  readonly targetFlowerId: string
  /** 对应植株名称。 */
  readonly targetFlowerName: string
  /** 当前季节文案。 */
  readonly season: string
  /** 当前节气文案。 */
  readonly solarTerm?: string
  /** 给养花小白看的简短总结。 */
  readonly summary: string
  /** 今天优先做的事。 */
  readonly focusActions: ReadonlyArray<string>
  /** 今天尽量别做的事。 */
  readonly forbiddenActions: ReadonlyArray<string>
  /** 极端天气提醒。 */
  readonly extremeWeatherAlerts: ReadonlyArray<IAiExtremeWeatherAlert>
  /** 温柔降级文案。 */
  readonly gentleFallbackMessage?: string
}

/** 植株健康快检结果 */
export interface IPlantHealthCheck {
  /** 健康状态 */
  readonly status: 'healthy' | 'attention' | 'warning'
  /** 一句话总结 */
  readonly summary: string
  /** 建议操作（可选） */
  readonly suggestedAction?: string
  /** 生成时间 */
  readonly generatedAt: IsoDateTimeString
}

/** AI 聊天响应 */
export interface IAiChatResponse {
  /** AI 回复内容 */
  readonly answer: string
  /** 生成时间 */
  readonly generatedAt: IsoDateTimeString
}
