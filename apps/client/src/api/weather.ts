import type { CityOption, WeatherSnapshot } from '@/interfaces'
import { http } from '@/utils/request'

interface OpenMeteoGeocodingResult {
  readonly id: number
  readonly name: string
  readonly latitude: number
  readonly longitude: number
  readonly country: string
  readonly admin1?: string
  readonly timezone?: string
}

interface OpenMeteoGeocodingResponse {
  readonly results?: ReadonlyArray<OpenMeteoGeocodingResult>
}

interface OpenMeteoWeatherResponse {
  readonly current: {
    readonly temperature_2m: number
    readonly relative_humidity_2m: number
    readonly precipitation_probability: number
    readonly wind_speed_10m: number
    readonly weather_code: number
    readonly time: string
  }
}

function buildCityId(city: Pick<CityOption, 'name' | 'country'>): string {
  return `${city.name}-${city.country}`.toLowerCase().replace(/\s+/g, '-')
}

function mapGeocodingResult(result: OpenMeteoGeocodingResult): CityOption {
  return {
    id: String(result.id ?? buildCityId({ name: result.name, country: result.country })),
    name: result.name,
    country: result.country,
    ...(result.admin1 ? { admin1: result.admin1 } : {}),
    latitude: result.latitude,
    longitude: result.longitude,
    ...(result.timezone ? { timezone: result.timezone } : {}),
  }
}

export async function searchCitiesByKeyword(keyword: string): Promise<ReadonlyArray<CityOption>> {
  const normalizedKeyword = keyword.trim()

  if (normalizedKeyword.length === 0) {
    return []
  }

  const response = await http.get<OpenMeteoGeocodingResponse>('https://geocoding-api.open-meteo.com/v1/search', {
    name: normalizedKeyword,
    count: 8,
    language: 'zh',
    format: 'json',
  }, {
    showLoading: false,
    skipErrorToast: true,
    cancelDuplicate: true,
  })

  return (response.results ?? []).map(mapGeocodingResult)
}

export async function reverseGeocodeCity(latitude: number, longitude: number): Promise<CityOption | null> {
  const response = await http.get<OpenMeteoGeocodingResponse>('https://geocoding-api.open-meteo.com/v1/reverse', {
    latitude,
    longitude,
    language: 'zh',
    format: 'json',
  }, {
    showLoading: false,
    skipErrorToast: true,
    cancelDuplicate: true,
  })

  const targetCity = response.results?.[0]
  return targetCity ? mapGeocodingResult(targetCity) : null
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
  const response = await http.get<OpenMeteoWeatherResponse>('https://api.open-meteo.com/v1/forecast', {
    latitude: city.latitude,
    longitude: city.longitude,
    current: 'temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,weather_code',
    timezone: city.timezone ?? 'Asia/Shanghai',
    forecast_days: 1,
  }, {
    showLoading: false,
    skipErrorToast: true,
    cancelDuplicate: true,
  })

  return {
    city,
    temperature: response.current.temperature_2m,
    humidity: response.current.relative_humidity_2m,
    precipitationProbability: response.current.precipitation_probability,
    windSpeed: response.current.wind_speed_10m,
    weatherCode: response.current.weather_code,
    weatherText: resolveWeatherText(response.current.weather_code),
    fetchedAt: response.current.time,
  }
}
