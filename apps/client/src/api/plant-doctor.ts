import type { IAiPlantDiagnosis, IAiTripCarePlan } from '@florist/contracts'
import type {
  LocalFlower,
  PlantDoctorDiagnosisContext,
  PlantDoctorTripPlanContext,
  WeatherSnapshot,
} from '@/interfaces'
import { getSeasonByDate, getSolarTerm } from '@/utils'
import { http } from '@/utils/request'

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

export function fetchTripCarePlan(context: PlantDoctorTripPlanContext): Promise<IAiTripCarePlan> {
  return http.post<IAiTripCarePlan, {
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
}
