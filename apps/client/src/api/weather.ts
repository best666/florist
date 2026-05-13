import type { CityOption, WeatherSnapshot } from '@/interfaces'
import { http } from '@/utils/request'

export async function searchCitiesByKeyword(keyword: string): Promise<ReadonlyArray<CityOption>> {
  const normalizedKeyword = keyword.trim()

  if (normalizedKeyword.length === 0) {
    return []
  }

  return http.get<ReadonlyArray<CityOption>>('/weather/search', {
    keyword: normalizedKeyword,
  }, {
    showLoading: false,
    skipErrorToast: true,
    cancelDuplicate: true,
  })
}

export async function reverseGeocodeCity(latitude: number, longitude: number): Promise<CityOption | null> {
  return http.get<CityOption | null>('/weather/reverse', {
    latitude,
    longitude,
  }, {
    showLoading: false,
    skipErrorToast: true,
    cancelDuplicate: true,
  })
}

export function resolveWeatherText(weatherCode: number): string {
  if (weatherCode === 0) {
    return '晴朗'
  }

  if ([1, 2, 3].includes(weatherCode)) {
    return '多云'
  }

  if ([45, 48].includes(weatherCode)) {
    return '有雾'
  }

  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode)) {
    return '雨天'
  }

  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    return '降雪'
  }

  if ([95, 96, 99].includes(weatherCode)) {
    return '雷暴'
  }

  return '阴天'
}

export async function fetchWeatherByCity(city: CityOption): Promise<WeatherSnapshot> {
  return http.get<WeatherSnapshot>('/weather/current', {
    id: city.id,
    name: city.name,
    country: city.country,
    admin1: city.admin1,
    latitude: city.latitude,
    longitude: city.longitude,
    timezone: city.timezone ?? 'Asia/Shanghai',
  }, {
    showLoading: false,
    skipErrorToast: true,
    cancelDuplicate: true,
  })
}
