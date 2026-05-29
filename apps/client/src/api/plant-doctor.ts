import type { IAiPlantDiagnosis, IAiTripCarePlan } from '@florist/contracts'
import type {
  LocalFlower,
  PlantDoctorDiagnosisContext,
  PlantDoctorTripPlanContext,
  WeatherSnapshot,
} from '@/interfaces'
import { getSeasonByDate, getSolarTerm } from '@/utils'
import { http } from '@/utils/request'
import { getEncryptedStorage, setEncryptedStorage } from '@/utils/storage'

/** 出差方案客户端缓存 TTL：24 小时 */
const TRIP_PLAN_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const TRIP_PLAN_CACHE_NAMESPACE = 'ai-doctor'

interface PlantDoctorWeatherPayload {
  cityName: string
  weatherText: string
  temperature: number
  humidity: number
  precipitationProbability: number
  windSpeed: number
  season: string
  solarTerm?: string
}

interface PlantDoctorFlowerPayload {
  id: string
  name: string
  nickname?: string
  category: LocalFlower['category']
  placement: LocalFlower['placement']
  careDifficulty: LocalFlower['careDifficulty']
  careStatus: LocalFlower['careStatus']
  note?: string
  lastWateredAt?: string
  lastFertilizedAt?: string
  records: []
}

function normalizeSeasonLabel(weather: WeatherSnapshot): string {
  const season = getSeasonByDate(weather.fetchedAt)

  if (season === 'spring') {
    return '春季'
  }

  if (season === 'summer') {
    return '夏季'
  }

  if (season === 'autumn') {
    return '秋季'
  }

  return '冬季'
}

function mapWeatherPayload(weather: WeatherSnapshot): PlantDoctorWeatherPayload {
  const solarTerm = getSolarTerm(weather.fetchedAt)

  return {
    cityName: weather.city.name,
    weatherText: weather.weatherText,
    temperature: weather.temperature,
    humidity: weather.humidity,
    precipitationProbability: weather.precipitationProbability,
    windSpeed: weather.windSpeed,
    season: normalizeSeasonLabel(weather),
    ...(solarTerm ? { solarTerm } : {}),
  }
}

function mapFlowerPayload(flower: LocalFlower): PlantDoctorFlowerPayload {
  return {
    id: flower.id,
    name: flower.name,
    ...(flower.nickname ? { nickname: flower.nickname } : {}),
    category: flower.category,
    placement: flower.placement,
    careDifficulty: flower.careDifficulty,
    careStatus: flower.careStatus,
    ...(flower.note ? { note: flower.note } : {}),
    ...(flower.lastWateredAt ? { lastWateredAt: flower.lastWateredAt } : {}),
    ...(flower.lastFertilizedAt ? { lastFertilizedAt: flower.lastFertilizedAt } : {}),
    records: [],
  }
}

export function fetchPlantDiagnosis(
  context: PlantDoctorDiagnosisContext,
  imageDataUrl: string,
): Promise<IAiPlantDiagnosis> {
  return http.post<IAiPlantDiagnosis, {
    imageDataUrl: string
    imageName?: string
    weather?: PlantDoctorWeatherPayload
    flower?: PlantDoctorFlowerPayload
  }>('/ai-proxy/plant-diagnosis', {
    imageDataUrl,
    imageName: context.image.id,
    ...(context.weather ? { weather: mapWeatherPayload(context.weather) } : {}),
    ...(context.flower ? { flower: mapFlowerPayload(context.flower) } : {}),
  }, {
    timeout: 20000,
    loadingText: 'AI 正在看图中',
    skipErrorToast: true,
    cancelDuplicate: true,
  })
}

export async function fetchTripCarePlan(context: PlantDoctorTripPlanContext): Promise<IAiTripCarePlan> {
  // 客户端缓存：相同花 + 相同城市 + 相同天数 + 同一天 → 复用缓存
  const cacheKey = [
    'trip-plan',
    context.flower.id,
    context.weather.city.id,
    String(context.travelDays),
    new Date().toISOString().slice(0, 10),
  ].join('::')

  const cached = getEncryptedStorage<{ value: IAiTripCarePlan; cachedAt: number }>(cacheKey, {
    namespace: TRIP_PLAN_CACHE_NAMESPACE,
  })

  if (cached && Date.now() - cached.cachedAt < TRIP_PLAN_CACHE_TTL_MS) {
    return cached.value
  }

  const result = await http.post<IAiTripCarePlan, {
    travelDays: number
    weather: PlantDoctorWeatherPayload
    flower: PlantDoctorFlowerPayload
  }>('/ai-proxy/trip-care-plan', {
    travelDays: context.travelDays,
    weather: mapWeatherPayload(context.weather),
    flower: mapFlowerPayload(context.flower),
  }, {
    timeout: 20000,
    loadingText: 'AI 正在安排出差方案',
    skipErrorToast: true,
    cancelDuplicate: true,
  })

  setEncryptedStorage(cacheKey, { value: result, cachedAt: Date.now() }, {
    namespace: TRIP_PLAN_CACHE_NAMESPACE,
    expiresInMs: TRIP_PLAN_CACHE_TTL_MS,
  })

  return result
}
