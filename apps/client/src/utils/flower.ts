import { FlowerPlacement, type IsoDateTimeString } from '@florist/contracts'
import type { LocalFlower, WeatherCareTip, WeatherSnapshot } from '@/interfaces'

const RECENT_WATERING_WINDOW_MS = 24 * 60 * 60 * 1000

interface FlowerWeatherContextSummary {
  outdoorCount: number
  balconyCount: number
  wateringNeededCount: number
  recentlyWateredCount: number
}

export function getFlowerDisplayName(flower: Pick<LocalFlower, 'name' | 'nickname'>): string {
  const nickname = flower.nickname?.trim()
  return nickname && nickname.length > 0 ? nickname : flower.name
}

export function createFlowerDisplayNameMap(
  flowers: ReadonlyArray<LocalFlower>,
): Readonly<Record<string, string>> {
  return flowers.reduce<Record<string, string>>((accumulator, flower) => {
    accumulator[flower.id] = getFlowerDisplayName(flower)
    return accumulator
  }, {})
}

function isRecentlyWatered(lastWateredAt?: IsoDateTimeString): boolean {
  if (!lastWateredAt) {
    return false
  }

  return Date.now() - new Date(lastWateredAt).getTime() <= RECENT_WATERING_WINDOW_MS
}

function summarizeFlowers(flowers: ReadonlyArray<LocalFlower>): FlowerWeatherContextSummary {
  return flowers.reduce<FlowerWeatherContextSummary>((summary, flower) => {
    if (flower.placement === FlowerPlacement.OutdoorOpenAir) {
      summary.outdoorCount += 1
    }

    if (flower.placement === FlowerPlacement.IndoorBalcony) {
      summary.balconyCount += 1
    }

    if (flower.careStatus === 'watering-needed') {
      summary.wateringNeededCount += 1
    }

    if (isRecentlyWatered(flower.lastWateredAt)) {
      summary.recentlyWateredCount += 1
    }

    return summary
  }, {
    outdoorCount: 0,
    balconyCount: 0,
    wateringNeededCount: 0,
    recentlyWateredCount: 0,
  })
}

export function buildFlowerWeatherContextTips(
  flowers: ReadonlyArray<LocalFlower>,
  weather: WeatherSnapshot | null,
): ReadonlyArray<WeatherCareTip> {
  if (!weather) {
    return []
  }

  const summary = summarizeFlowers(flowers)
  const sunFacingCount = summary.outdoorCount + summary.balconyCount
  const tips: WeatherCareTip[] = []

  if (weather.temperature >= 32 && sunFacingCount > 0) {
    tips.push({
      id: 'flower-heat-link',
      title: '高温和阳光位植物更需要留意',
      description: `你有 ${sunFacingCount} 盆阳光位植物，今天高温时段可以先挪到散射光位置，避免叶面晒伤。`,
    })
  }

  if (weather.precipitationProbability >= 60 && summary.recentlyWateredCount > 0) {
    tips.push({
      id: 'flower-rain-link',
      title: '刚浇过水的植物今天别急着再补水',
      description: `有 ${summary.recentlyWateredCount} 盆植物在最近一天内刚浇过水，今天又可能下雨，先观察盆土会更稳妥。`,
    })
  }

  if (weather.humidity <= 35 && summary.wateringNeededCount > 0) {
    tips.push({
      id: 'flower-dry-link',
      title: '空气偏干，缺水植物可以优先照顾',
      description: `目前有 ${summary.wateringNeededCount} 盆植物处于缺水状态，今天可以优先巡查叶片和盆土，别让它们继续硬撑。`,
    })
  }

  if (weather.windSpeed >= 25 && summary.outdoorCount > 0) {
    tips.push({
      id: 'flower-wind-link',
      title: '户外植物今天记得放稳一点',
      description: `你有 ${summary.outdoorCount} 盆户外植物，风力偏大时可以靠墙或靠角落放置，减少倒伏和折枝风险。`,
    })
  }

  return tips.slice(0, 3)
}
