import type { IAiAdvice } from '@florist/contracts';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerEnvConfig } from '../../config/server-env';
import { RequestCareAdviceDto } from './dto/request-care-advice.dto';

function buildFallbackAdvice(payload: RequestCareAdviceDto): IAiAdvice {
  const wateringNeededCount = payload.flowers.filter(flower => flower.careStatus === 'watering-needed').length;
  const outdoorCount = payload.flowers.filter(flower => flower.placement === 'outdoor_open_air').length;
  const recentlyWateredCount = payload.flowers.filter((flower) => {
    if (!flower.lastWateredAt) {
      return false;
    }

    return Date.now() - new Date(flower.lastWateredAt).getTime() <= 24 * 60 * 60 * 1000;
  }).length;

  const warningTips = [
    payload.weather.precipitationProbability >= 60
      ? '今天可能有雨，浇水前先看盆土，不要按习惯补水。'
      : '今天降水压力不大，可以按盆土干湿和叶片状态判断。',
    payload.weather.windSpeed >= 25 && outdoorCount > 0
      ? `你有 ${outdoorCount} 盆户外植物，风大时先放稳。`
      : '风力整体平稳，重点观察日照和通风即可。',
    wateringNeededCount > 0
      ? `当前还有 ${wateringNeededCount} 盆植物偏缺水，适合优先巡查。`
      : '目前没有明显缺水植株，可以按日常节奏温柔巡园。',
  ];

  return {
    dailyAdvice: `${payload.weather.cityName} 今天 ${payload.weather.weatherText}，气温 ${Math.round(payload.weather.temperature)}°C。先做一次轻量巡园，再决定是否浇水或擦叶。`,
    seasonalAdvice: payload.weather.temperature >= 30
      ? '高温季节尽量避开正午浇水，阳台植物优先观察叶面灼伤和盆土升温情况。'
      : '当前温度相对温和，适合维持规律观察，把节奏放在盆土干湿和新芽状态上。',
    warningTips,
    wateringCycleDays: recentlyWateredCount > 0 || payload.weather.precipitationProbability >= 60 ? 3 : 2,
    fertilizingCycleDays: payload.weather.temperature >= 32 ? 14 : 10,
  };
}

@Injectable()
export class AiProxyService {
  public constructor(private readonly configService: ConfigService) {}

  public async getCareAdvice(payload: RequestCareAdviceDto): Promise<IAiAdvice> {
    const appConfig = this.configService.getOrThrow<ServerEnvConfig>('app');
    const shouldUseFallback = appConfig.aiProxyBaseUrl.includes('example.com')
      || appConfig.aiProxyApiKey.includes('replace-with-local-key');

    if (shouldUseFallback) {
      return buildFallbackAdvice(payload);
    }

    try {
      const response = await fetch(appConfig.aiProxyBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${appConfig.aiProxyApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('AI 中转服务不可用');
      }

      return response.json() as Promise<IAiAdvice>;
    }
    catch {
      return buildFallbackAdvice(payload);
    }
  }
}
