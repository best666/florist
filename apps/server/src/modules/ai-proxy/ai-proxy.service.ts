import type {
  IAiAdvice,
  IAiExtremeWeatherAlert,
  IPlantAiAdvice,
} from '@florist/contracts';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ServerEnvConfig } from '../../config/server-env';
import {
  RequestCareAdviceDto,
  RequestSinglePlantCareAdviceDto,
} from './dto/request-care-advice.dto';

function createGeneratedAt(): string {
  return new Date().toISOString();
}

function normalizeFlowerName(
  flower: Pick<RequestSinglePlantCareAdviceDto['flower'], 'name' | 'nickname'>,
): string {
  const nickname = flower.nickname?.trim();
  return nickname && nickname.length > 0 ? nickname : flower.name;
}

function buildExtremeWeatherAlerts(
  weather: RequestCareAdviceDto['weather'] | RequestSinglePlantCareAdviceDto['weather'],
): IAiExtremeWeatherAlert[] {
  const alerts: IAiExtremeWeatherAlert[] = [];

  if (weather.precipitationProbability >= 85 || weather.weatherText.includes('暴雨')) {
    alerts.push({
      type: 'storm',
      title: '暴雨天先别忙着补水',
      description: '今天雨势偏重，先观察盆土透气和积水情况，别让根系一直闷着。',
    });
  }

  if (weather.temperature <= 8) {
    alerts.push({
      type: 'low-temperature',
      title: '低温天动作放轻一点',
      description: '气温偏低时，浇水和换盆都要更克制，先保暖再谈折腾。',
    });
  }

  if (weather.temperature >= 35) {
    alerts.push({
      type: 'high-temperature',
      title: '高温天以避晒和通风为主',
      description: '中午前后先别施肥，暴晒位植物也尽量缓一缓，避免叶片烫伤。',
    });
  }

  if (weather.humidity >= 85 && weather.temperature >= 18 && weather.temperature <= 28) {
    alerts.push({
      type: 'humid-south',
      title: '回南天气要防闷根',
      description: '空气又湿又黏，盆土不干就先别浇，通风比勤快补水更重要。',
    });
  }

  if (weather.temperature <= 2) {
    alerts.push({
      type: 'frost',
      title: '霜冻风险要先避开',
      description: '今晚可能很冷，怕冻的植物先往室内挪一挪，别让嫩叶直接受寒。',
    });
  }

  return alerts;
}

function buildSeasonalText(
  weather: RequestCareAdviceDto['weather'] | RequestSinglePlantCareAdviceDto['weather'],
): string {
  if (weather.season.includes('夏')) {
    return '现在更适合少量多次观察，重点放在避晒、通风和盆土升温上。';
  }

  if (weather.season.includes('冬')) {
    return '现在养护节奏要慢一点，先保温，再决定是否补水或修剪。';
  }

  if (weather.season.includes('春')) {
    return '现在是比较适合恢复生长的季节，可以温柔增加观察频率，但别一下子用力过猛。';
  }

  return '这个季节适合保持稳定节奏，先看叶色、盆土和新芽，再决定今天动哪一步。';
}

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
    seasonalAdvice: buildSeasonalText(payload.weather),
    warningTips,
    wateringCycleDays: recentlyWateredCount > 0 || payload.weather.precipitationProbability >= 60 ? 3 : 2,
    fertilizingCycleDays: payload.weather.temperature >= 32 ? 14 : 10,
    generatedAt: createGeneratedAt(),
  };
}

function buildSinglePlantFallbackAdvice(payload: RequestSinglePlantCareAdviceDto): IPlantAiAdvice {
  const flowerName = normalizeFlowerName(payload.flower);
  const latestRecord = payload.flower.records[0];
  const extremeWeatherAlerts = buildExtremeWeatherAlerts(payload.weather);
  const focusActions = [
    payload.flower.careStatus === 'watering-needed'
      ? '先摸摸盆土，真的偏干再慢慢补水。'
      : '先观察叶片精神和盆土松紧，再决定要不要动手。',
    payload.weather.temperature >= 32
      ? '把它放到更柔和的散射光位置，别让正午太阳直接烤叶子。'
      : '保持通风和稳定光照，让它今天过得轻松一点。',
    latestRecord
      ? `它最近一次养护是 ${latestRecord.actionType}，今天先别把节奏一下子拉太满。`
      : '它最近还没有明确养护记录，今天先从最基础的观察开始就够了。',
  ];
  const forbiddenActions = [
    extremeWeatherAlerts.some(alert => alert.type === 'storm')
      ? '今天别因为下雨就顺手再补一轮水。'
      : '在没看盆土前，先别按固定习惯机械浇水。',
    extremeWeatherAlerts.some(alert => alert.type === 'high-temperature')
      ? '正午先别施肥，也别急着大修剪。'
      : '一次别同时做太多动作，留点缓冲更稳。',
  ];

  return {
    targetFlowerId: payload.flower.id,
    targetFlowerName: flowerName,
    season: payload.weather.season,
    ...(payload.weather.solarTerm ? { solarTerm: payload.weather.solarTerm } : {}),
    summary: `${flowerName} 今天更适合“轻观察、少折腾”的节奏，先看状态，再做一件最必要的小事。`,
    dailyAdvice: `${payload.weather.cityName} 今天 ${payload.weather.weatherText}，${flowerName} 所在环境是${payload.flower.placement}。先看看叶片和盆土，再决定是否补水或调整位置。`,
    seasonalAdvice: buildSeasonalText(payload.weather),
    warningTips: [
      ...extremeWeatherAlerts.map(alert => alert.title),
      payload.flower.note
        ? `你之前给它留过备注：“${payload.flower.note.slice(0, 28)}${payload.flower.note.length > 28 ? '…' : ''}”，今天也可以顺手对照一下。`
        : '今天以稳定为主，不需要把所有步骤一次做满。',
    ],
    wateringCycleDays: payload.weather.precipitationProbability >= 60 ? 3 : 2,
    fertilizingCycleDays: payload.weather.temperature >= 32 ? 14 : 10,
    generatedAt: createGeneratedAt(),
    focusActions,
    forbiddenActions,
    extremeWeatherAlerts,
    gentleFallbackMessage: '这是本地兜底生成的建议，已经尽量按你家这盆植物今天的天气和状态来组织啦。',
  };
}

@Injectable()
export class AiProxyService {
  public constructor(private readonly configService: ConfigService) {}

  private resolveShouldUseFallback(): boolean {
    const appConfig = this.configService.getOrThrow<ServerEnvConfig>('app');
    return appConfig.aiProxyBaseUrl.includes('example.com')
      || appConfig.aiProxyApiKey.includes('replace-with-local-key');
  }

  private async requestUpstream<TResponse>(path: string, payload: unknown): Promise<TResponse> {
    const appConfig = this.configService.getOrThrow<ServerEnvConfig>('app');
    const requestUrl = appConfig.aiProxyBaseUrl.endsWith(path)
      ? appConfig.aiProxyBaseUrl
      : `${appConfig.aiProxyBaseUrl.replace(/\/$/, '')}${path}`;

    const response = await fetch(requestUrl, {
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

    return response.json() as Promise<TResponse>;
  }

  public async getCareAdvice(payload: RequestCareAdviceDto): Promise<IAiAdvice> {
    if (this.resolveShouldUseFallback()) {
      return buildFallbackAdvice(payload);
    }

    try {
      return await this.requestUpstream<IAiAdvice>('/care-advice', payload);
    }
    catch {
      return buildFallbackAdvice(payload);
    }
  }

  public async getSinglePlantCareAdvice(
    payload: RequestSinglePlantCareAdviceDto,
  ): Promise<IPlantAiAdvice> {
    if (this.resolveShouldUseFallback()) {
      return buildSinglePlantFallbackAdvice(payload);
    }

    try {
      return await this.requestUpstream<IPlantAiAdvice>('/plant-care-advice', payload);
    }
    catch {
      return buildSinglePlantFallbackAdvice(payload);
    }
  }
}
