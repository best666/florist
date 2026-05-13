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
}
