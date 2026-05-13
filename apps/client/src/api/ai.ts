import type { IAiAdvice } from '@florist/contracts'
import { http } from '@/utils/request'
import type { LocalFlower, WeatherSnapshot } from '@/interfaces'

interface AiAdviceRequestFlower {
  name: string
  nickname?: string
  placement: LocalFlower['placement']
  careStatus: LocalFlower['careStatus']
  lastWateredAt?: string
}

export interface RequestAiCareAdvicePayload {
  weather: WeatherSnapshot
  flowers: ReadonlyArray<LocalFlower>
}

export function fetchAiCareAdvice(payload: RequestAiCareAdvicePayload): Promise<IAiAdvice> {
  return http.post<IAiAdvice, {
    weather: {
      cityName: string
      weatherText: string
      temperature: number
      humidity: number
      precipitationProbability: number
      windSpeed: number
    }
    flowers: AiAdviceRequestFlower[]
  }>('/ai-proxy/care-advice', {
    weather: {
      cityName: payload.weather.city.name,
      weatherText: payload.weather.weatherText,
      temperature: payload.weather.temperature,
      humidity: payload.weather.humidity,
      precipitationProbability: payload.weather.precipitationProbability,
      windSpeed: payload.weather.windSpeed,
    },
    flowers: payload.flowers.map(flower => ({
      name: flower.name,
      ...(flower.nickname ? { nickname: flower.nickname } : {}),
      placement: flower.placement,
      careStatus: flower.careStatus,
      ...(flower.lastWateredAt ? { lastWateredAt: flower.lastWateredAt } : {}),
    })),
  }, {
    showLoading: false,
    skipErrorToast: true,
    cancelDuplicate: true,
  })
}
