import type { Nullable } from './base'

export interface CityOption {
  readonly id: string
  readonly name: string
  readonly country: string
  readonly admin1?: string
  readonly latitude: number
  readonly longitude: number
  readonly timezone?: string
}

export interface DeviceLocation {
  readonly latitude: number
  readonly longitude: number
  readonly accuracy?: number
}

export interface WeatherSnapshot {
  readonly city: CityOption
  readonly temperature: number
  readonly humidity: number
  readonly precipitationProbability: number
  readonly windSpeed: number
  readonly weatherCode: number
  readonly weatherText: string
  readonly fetchedAt: string
}

export interface WeatherCareTip {
  readonly id: string
  readonly title: string
  readonly description: string
}

export interface QuietHoursConfig {
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
}

export interface LocalReminderConfig {
  enabled: boolean
  reminderHour: number
  reminderMinute: number
  quietHours: QuietHoursConfig
  reminderText: string
  lastTriggeredDate: Nullable<string>
}

export interface LocationWeatherCache {
  readonly city: CityOption
  readonly weather: WeatherSnapshot
}

export interface UseLocationWeatherReminderState {
  city: Nullable<CityOption>
  weather: Nullable<WeatherSnapshot>
  weatherTips: ReadonlyArray<WeatherCareTip>
  citySearchKeyword: string
  citySearchResults: ReadonlyArray<CityOption>
  reminderConfig: LocalReminderConfig
  locationDenied: boolean
  loadingLocation: boolean
  loadingWeather: boolean
  searchingCity: boolean
  latestErrorMessage: string
}

export const DEFAULT_CITY_OPTIONS: ReadonlyArray<CityOption> = [
  {
    id: 'beijing-cn',
    name: '北京',
    country: '中国',
    admin1: '北京',
    latitude: 39.9042,
    longitude: 116.4074,
    timezone: 'Asia/Shanghai',
  },
  {
    id: 'shanghai-cn',
    name: '上海',
    country: '中国',
    admin1: '上海',
    latitude: 31.2304,
    longitude: 121.4737,
    timezone: 'Asia/Shanghai',
  },
  {
    id: 'guangzhou-cn',
    name: '广州',
    country: '中国',
    admin1: '广东',
    latitude: 23.1291,
    longitude: 113.2644,
    timezone: 'Asia/Shanghai',
  },
  {
    id: 'shenzhen-cn',
    name: '深圳',
    country: '中国',
    admin1: '广东',
    latitude: 22.5431,
    longitude: 114.0579,
    timezone: 'Asia/Shanghai',
  },
  {
    id: 'chengdu-cn',
    name: '成都',
    country: '中国',
    admin1: '四川',
    latitude: 30.5728,
    longitude: 104.0668,
    timezone: 'Asia/Shanghai',
  },
] as const

export const DEFAULT_LOCAL_REMINDER_CONFIG: LocalReminderConfig = {
  enabled: false,
  reminderHour: 9,
  reminderMinute: 0,
  quietHours: {
    startHour: 22,
    startMinute: 0,
    endHour: 8,
    endMinute: 0,
  },
  reminderText: '今天也来看看小植物吧，轻轻浇水、擦叶或记录一下状态。',
  lastTriggeredDate: null,
}
