import type { IsoDateTimeString } from './common'

export type AiDiagnosisSeverity = 'low' | 'medium' | 'high'

export interface IAiPlantDiagnosis {
  /** 对应植株 id，未绑定植株时可为空。 */
  readonly targetFlowerId?: string
  /** 对应植株名称。 */
  readonly targetFlowerName?: string
  /** 当前更值得优先排查的病症或虫害名称。 */
  readonly diagnosisTitle: string
  /** 给新手用户看的总体说明。 */
  readonly summary: string
  /** 风险等级。 */
  readonly severity: AiDiagnosisSeverity
  /** 当前判断可信度说明。 */
  readonly confidenceLabel: string
  /** 这次识别重点关注到的症状。 */
  readonly symptomHighlights: ReadonlyArray<string>
  /** 可能成因。 */
  readonly possibleCauses: ReadonlyArray<string>
  /** 处理步骤。 */
  readonly treatmentSteps: ReadonlyArray<string>
  /** 后续预防建议。 */
  readonly preventionTips: ReadonlyArray<string>
  /** 二次观察方向，帮助用户继续确认。 */
  readonly observationTips: ReadonlyArray<string>
  /** 生成时间。 */
  readonly generatedAt: IsoDateTimeString
  /** 本地兜底时给用户的温柔提示。 */
  readonly gentleFallbackMessage?: string
}

export interface IAiTripCarePlan {
  /** 对应植株 id，未绑定植株时可为空。 */
  readonly targetFlowerId?: string
  /** 对应植株名称。 */
  readonly targetFlowerName?: string
  /** 当前使用的城市名。 */
  readonly cityName: string
  /** 出差天数。 */
  readonly travelDays: number
  /** 整体托管摘要。 */
  readonly summary: string
  /** 风险等级。 */
  readonly riskLevel: AiDiagnosisSeverity
  /** 结合天气得到的重点风险。 */
  readonly weatherAlerts: ReadonlyArray<string>
  /** 出发前建议。 */
  readonly beforeTripActions: ReadonlyArray<string>
  /** 无人托管期间建议。 */
  readonly duringTripAdvice: ReadonlyArray<string>
  /** 回家后的检查清单。 */
  readonly returnHomeChecklist: ReadonlyArray<string>
  /** 生成时间。 */
  readonly generatedAt: IsoDateTimeString
  /** 本地兜底时给用户的温柔提示。 */
  readonly gentleFallbackMessage?: string
}
