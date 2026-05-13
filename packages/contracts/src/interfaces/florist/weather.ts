import type { WeatherCondition } from '../enums'

/**
 * 天气实体，用于 AI 建议与提醒服务统一消费。
 */
export interface IWeather {
  /** 城市名称。 */
  readonly city: string
  /** 当前温度，单位为摄氏度。 */
  readonly temperatureCelsius: number
  /** 当前湿度，范围 0-100。 */
  readonly humidity: number
  /** 当前风力描述。 */
  readonly windLevel: string
  /** 当前降水量，单位毫米。 */
  readonly precipitationMm: number
  /** 天气状况枚举。 */
  readonly condition: WeatherCondition
  /** 面向用户的提示文案。 */
  readonly prompt: string
}
