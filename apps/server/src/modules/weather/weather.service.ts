import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RuntimeCacheService } from '../../common/services/runtime-cache.service';
import { RequestMonitorService } from '../../common/services/request-monitor.service';
import type { ServerEnvConfig } from '../../config/server-env';

export interface CityOptionResponse {
  id: string;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface WeatherSnapshotResponse {
  city: CityOptionResponse;
  temperature: number;
  humidity: number;
  precipitationProbability: number;
  windSpeed: number;
  weatherCode: number;
  weatherText: string;
  fetchedAt: string;
}

interface OpenMeteoGeocodingResult {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  timezone?: string;
}

interface OpenMeteoGeocodingResponse {
  results?: OpenMeteoGeocodingResult[];
}

interface OpenMeteoWeatherResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation_probability: number;
    wind_speed_10m: number;
    weather_code: number;
    time: string;
  };
}

function buildCityId(city: Pick<CityOptionResponse, 'name' | 'country'>): string {
  return `${city.name}-${city.country}`.toLowerCase().replace(/\s+/g, '-');
}

function mapCity(result: OpenMeteoGeocodingResult): CityOptionResponse {
  return {
    id: String(result.id ?? buildCityId({ name: result.name, country: result.country })),
    name: result.name,
    country: result.country,
    ...(result.admin1 ? { admin1: result.admin1 } : {}),
    latitude: result.latitude,
    longitude: result.longitude,
    ...(result.timezone ? { timezone: result.timezone } : {}),
  };
}

function resolveWeatherText(weatherCode: number): string {
  if (weatherCode === 0) {
    return '晴朗';
  }

  if ([1, 2, 3].includes(weatherCode)) {
    return '多云';
  }

  if ([45, 48].includes(weatherCode)) {
    return '有雾';
  }

  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode)) {
    return '雨天';
  }

  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    return '降雪';
  }

  if ([95, 96, 99].includes(weatherCode)) {
    return '雷暴';
  }

  return '阴天';
}

@Injectable()
export class WeatherService {
  private readonly appEnv: ServerEnvConfig;

  public constructor(
    configService: ConfigService,
    private readonly runtimeCacheService: RuntimeCacheService,
    private readonly requestMonitorService: RequestMonitorService,
  ) {
    this.appEnv = configService.getOrThrow<ServerEnvConfig>('app');
  }

  private async requestJson<TResponse>(endpoint: string, baseUrl: string, query: Record<string, string | number>): Promise<TResponse> {
    const url = new URL(baseUrl);

    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });

    const requestHash = this.requestMonitorService.createPayloadHash('weather', {
      endpoint,
      query,
    });
    const startedAt = Date.now();
    const { value, cacheHit } = await this.runtimeCacheService.remember<TResponse>(
      `weather:${requestHash}`,
      this.appEnv.weatherCacheTtlMs,
      async () => {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('天气服务请求失败');
        }

        return response.json() as Promise<TResponse>;
      },
    );

    await this.requestMonitorService.logProxyRequest({
      scope: 'weather',
      endpoint,
      requestHash,
      cacheHit,
      success: true,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      upstreamProvider: 'open-meteo',
    });

    return value;
  }

  public async searchCities(keyword: string): Promise<CityOptionResponse[]> {
    const response = await this.requestJson<OpenMeteoGeocodingResponse>(
      'search',
      'https://geocoding-api.open-meteo.com/v1/search',
      {
        name: keyword.trim(),
        count: 8,
        language: 'zh',
        format: 'json',
      },
    );

    return (response.results ?? []).map(mapCity);
  }

  public async reverseGeocode(latitude: number, longitude: number): Promise<CityOptionResponse | null> {
    const response = await this.requestJson<OpenMeteoGeocodingResponse>(
      'reverse',
      'https://geocoding-api.open-meteo.com/v1/reverse',
      {
        latitude,
        longitude,
        language: 'zh',
        format: 'json',
      },
    );

    const targetCity = response.results?.[0];
    return targetCity ? mapCity(targetCity) : null;
  }

  public async fetchWeather(city: CityOptionResponse): Promise<WeatherSnapshotResponse> {
    const response = await this.requestJson<OpenMeteoWeatherResponse>(
      'current',
      'https://api.open-meteo.com/v1/forecast',
      {
        latitude: city.latitude,
        longitude: city.longitude,
        current: 'temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,weather_code',
        timezone: city.timezone ?? 'Asia/Shanghai',
        forecast_days: 1,
      },
    );

    return {
      city,
      temperature: response.current.temperature_2m,
      humidity: response.current.relative_humidity_2m,
      precipitationProbability: response.current.precipitation_probability,
      windSpeed: response.current.wind_speed_10m,
      weatherCode: response.current.weather_code,
      weatherText: resolveWeatherText(response.current.weather_code),
      fetchedAt: response.current.time,
    };
  }
}
