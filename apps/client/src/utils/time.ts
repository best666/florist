export type TimeInput = Date | number | string

export interface FormatDateOptions {
  /**
   * 输出模板，默认 YYYY-MM-DD HH:mm:ss。
   */
  readonly pattern?: string
}

export interface TimeAgoOptions {
  /**
   * 计算基准时间。
   */
  readonly now?: TimeInput
  /**
   * 超出一定天数后直接格式化日期。
   */
  readonly absoluteAfterDays?: number
}

export enum SeasonType {
  Spring = 'spring',
  Summer = 'summer',
  Autumn = 'autumn',
  Winter = 'winter',
}

interface SolarTermBoundary {
  readonly name: string
  readonly month: number
  readonly day: number
}

const SOLAR_TERM_BOUNDARIES: ReadonlyArray<SolarTermBoundary> = [
  { name: '小寒', month: 1, day: 5 },
  { name: '大寒', month: 1, day: 20 },
  { name: '立春', month: 2, day: 4 },
  { name: '雨水', month: 2, day: 19 },
  { name: '惊蛰', month: 3, day: 5 },
  { name: '春分', month: 3, day: 20 },
  { name: '清明', month: 4, day: 4 },
  { name: '谷雨', month: 4, day: 20 },
  { name: '立夏', month: 5, day: 5 },
  { name: '小满', month: 5, day: 21 },
  { name: '芒种', month: 6, day: 5 },
  { name: '夏至', month: 6, day: 21 },
  { name: '小暑', month: 7, day: 7 },
  { name: '大暑', month: 7, day: 22 },
  { name: '立秋', month: 8, day: 7 },
  { name: '处暑', month: 8, day: 23 },
  { name: '白露', month: 9, day: 7 },
  { name: '秋分', month: 9, day: 23 },
  { name: '寒露', month: 10, day: 8 },
  { name: '霜降', month: 10, day: 23 },
  { name: '立冬', month: 11, day: 7 },
  { name: '小雪', month: 11, day: 22 },
  { name: '大雪', month: 12, day: 7 },
  { name: '冬至', month: 12, day: 21 },
] as const

function padNumber(value: number): string {
  return String(value).padStart(2, '0')
}

export function toDate(value: TimeInput): Date | null {
  const resolvedDate = value instanceof Date ? value : new Date(value)

  return Number.isNaN(resolvedDate.getTime()) ? null : resolvedDate
}

export function formatDateTime(
  value: TimeInput,
  options?: FormatDateOptions,
): string {
  const resolvedDate = toDate(value)

  if (!resolvedDate) {
    return ''
  }

  const pattern = options?.pattern ?? 'YYYY-MM-DD HH:mm:ss'
  const tokenMap: Record<string, string> = {
    YYYY: String(resolvedDate.getFullYear()),
    MM: padNumber(resolvedDate.getMonth() + 1),
    DD: padNumber(resolvedDate.getDate()),
    HH: padNumber(resolvedDate.getHours()),
    mm: padNumber(resolvedDate.getMinutes()),
    ss: padNumber(resolvedDate.getSeconds()),
  }

  return Object.entries(tokenMap).reduce(
    (currentValue, [token, tokenValue]) =>
      currentValue.replace(new RegExp(token, 'g'), tokenValue),
    pattern,
  )
}

export function getTimeAgo(
  value: TimeInput,
  options?: TimeAgoOptions,
): string {
  const targetDate = toDate(value)
  const currentDate = toDate(options?.now ?? Date.now())

  if (!targetDate || !currentDate) {
    return ''
  }

  const diffInSeconds = Math.floor((currentDate.getTime() - targetDate.getTime()) / 1000)

  if (diffInSeconds < 0) {
    return '刚刚'
  }

  const absoluteAfterDays = options?.absoluteAfterDays ?? 7
  const diffInDays = Math.floor(diffInSeconds / 86400)

  if (diffInDays >= absoluteAfterDays) {
    return formatDateTime(targetDate, { pattern: 'YYYY-MM-DD' })
  }

  if (diffInSeconds < 60) {
    return '刚刚'
  }

  if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}分钟前`
  }

  if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}小时前`
  }

  return `${diffInDays}天前`
}

export function getSeasonByDate(value: TimeInput): SeasonType | null {
  const resolvedDate = toDate(value)

  if (!resolvedDate) {
    return null
  }

  const month = resolvedDate.getMonth() + 1

  if (month >= 3 && month <= 5) {
    return SeasonType.Spring
  }

  if (month >= 6 && month <= 8) {
    return SeasonType.Summer
  }

  if (month >= 9 && month <= 11) {
    return SeasonType.Autumn
  }

  return SeasonType.Winter
}

/**
 * 节气使用常见公历近似分界日判断，适合 UI 提示与季节归类，不应用于天文级精度计算。
 */
export function getSolarTerm(value: TimeInput): string | null {
  const resolvedDate = toDate(value)

  if (!resolvedDate) {
    return null
  }

  const month = resolvedDate.getMonth() + 1
  const day = resolvedDate.getDate()

  let currentTerm = SOLAR_TERM_BOUNDARIES[SOLAR_TERM_BOUNDARIES.length - 1]?.name ?? null

  for (const boundary of SOLAR_TERM_BOUNDARIES) {
    if (month > boundary.month || (month === boundary.month && day >= boundary.day)) {
      currentTerm = boundary.name
      continue
    }

    break
  }

  return currentTerm
}
