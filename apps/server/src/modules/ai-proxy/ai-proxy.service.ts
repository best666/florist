import type {
  IAiAdvice,
  IAiChatResponse,
  IAiPlantDiagnosis,
  IAiExtremeWeatherAlert,
  IAiTripCarePlan,
  IPlantAiAdvice,
  IPlantHealthCheck,
} from '@florist/contracts'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RuntimeCacheService } from '../../common/services/runtime-cache.service'
import { RequestMonitorService } from '../../common/services/request-monitor.service'
import type { ServerEnvConfig } from '../../config/server-env'
import { ImageService } from '../image/image.service'
import { UsersService } from '../users/users.service'
import {
  RequestAiChatDto,
  RequestCareAdviceDto,
  RequestPlantDiagnosisDto,
  RequestPlantHealthCheckDto,
  RequestSinglePlantCareAdviceDto,
  RequestTripCarePlanDto,
} from './dto/request-care-advice.dto'

function createGeneratedAt(): string {
  return new Date().toISOString()
}

function normalizeFlowerName(
  flower: Pick<RequestSinglePlantCareAdviceDto['flower'], 'name' | 'nickname'>,
): string {
  const nickname = flower.nickname?.trim()
  return nickname && nickname.length > 0 ? nickname : flower.name
}

function resolveSeverityScore(score: number): 'low' | 'medium' | 'high' {
  if (score >= 3) {
    return 'high'
  }

  if (score >= 2) {
    return 'medium'
  }

  return 'low'
}

function buildPlantDiagnosisFallback(payload: RequestPlantDiagnosisDto): IAiPlantDiagnosis {
  const flowerName = payload.flower ? normalizeFlowerName(payload.flower) : '这盆植物'
  const temperature = payload.weather?.temperature ?? 24
  const humidity = payload.weather?.humidity ?? 60
  const placement = payload.flower?.placement ?? 'indoor_balcony'
  const careStatus = payload.flower?.careStatus ?? 'healthy'
  const score = [
    humidity >= 80 ? 1 : 0,
    temperature >= 32 || temperature <= 8 ? 1 : 0,
    placement === 'indoor_shade' ? 1 : 0,
    careStatus === 'watering-needed' ? 1 : 0,
  ].reduce((sum, current) => sum + current, 0)
  const severity = resolveSeverityScore(score)

  if (humidity >= 80 && placement !== 'outdoor_open_air') {
    return {
      ...(payload.flower ? { targetFlowerId: payload.flower.id, targetFlowerName: flowerName } : {}),
      diagnosisTitle: '真菌性叶斑 / 白粉风险偏高',
      summary: `${flowerName} 当前更像是处在“闷湿环境引发的真菌性问题”风险里，先别急着猛喷药，优先做通风、隔离和叶面检查会更稳。`,
      severity,
      confidenceLabel: '环境关联排查',
      symptomHighlights: [
        '先看叶面有没有扩散中的浅白粉层或不规则褐斑。',
        '叶背和茎节附近是否有发黏、发闷或小面积水渍感。',
        '新叶和贴近盆土的位置，通常更容易先出现问题。',
      ],
      possibleCauses: [
        '空气湿度偏高，叶片表面长时间不易干。',
        '摆放位置通风不足，水汽和热气积在叶丛里。',
        '浇水偏勤或叶面残水没有及时散掉。',
      ],
      treatmentSteps: [
        '先把明显受损的叶片单独隔离观察，避免贴着其他植物。',
        '暂停叶面喷水，改为增强通风和拉开株距。',
        '有明显病斑的部位先局部修剪，再观察 2 到 3 天扩散速度。',
        '如果病斑继续扩大，再按常见真菌病思路做针对性处理。',
      ],
      preventionTips: [
        '浇水后尽量让叶面和盆土表层更快散湿。',
        '密集摆放时留一点风道，不要长期贴得太紧。',
        '阴雨或回南天把巡查重点放在叶背和盆土透气性上。',
      ],
      observationTips: [
        '重点看看病斑边缘是否继续扩大。',
        '闻一闻盆土有没有明显闷味或霉味。',
        '连拍 2 天对比照片，最容易判断有没有恶化。',
      ],
      generatedAt: createGeneratedAt(),
      gentleFallbackMessage: '这次用了本地兜底识别，更适合拿来做“先排查什么”的参考，不建议直接当成唯一结论。',
    }
  }

  if (temperature >= 32 && placement === 'outdoor_open_air') {
    return {
      ...(payload.flower ? { targetFlowerId: payload.flower.id, targetFlowerName: flowerName } : {}),
      diagnosisTitle: '晒伤伴随红蜘蛛风险',
      summary: `${flowerName} 更需要优先排查的是高温暴晒后的叶面损伤，以及叶背是否有细小虫点和蛛网感。`,
      severity,
      confidenceLabel: '高温场景排查',
      symptomHighlights: [
        '叶面是否有发白、发黄或半透明灼伤斑。',
        '叶背是否出现细密黄点、灰白小点或轻微结网。',
        '新叶边缘是否发脆、卷曲或有局部焦边。',
      ],
      possibleCauses: [
        '正午暴晒时间过长，叶片表层被灼伤。',
        '高温干燥时，红蜘蛛更容易快速滋生。',
        '盆土过热或缺水，会放大叶面应激反应。',
      ],
      treatmentSteps: [
        '先把它移到更柔和的散射光处缓一缓。',
        '用纸巾或湿棉片轻轻检查叶背，看有没有虫体或细丝。',
        '暂时停止施肥，先让环境和补水节奏稳定下来。',
        '如果叶背虫点明显，再按螨类/虫害方向处理。',
      ],
      preventionTips: [
        '高温天尽量避开正午直晒。',
        '保持基础通风，但别让热风持续直吹。',
        '定期翻看叶背，比等到整片叶子失色再处理更省力。',
      ],
      observationTips: [
        '观察灼伤斑有没有继续扩大。',
        '连续两天检查叶背是否仍有活动小虫。',
        '看新叶是否还能保持正常展开。',
      ],
      generatedAt: createGeneratedAt(),
      gentleFallbackMessage: '这次先按高温场景做了保守识别，真正处理前，最好再近距离看一遍叶背和虫点。',
    }
  }

  return {
    ...(payload.flower ? { targetFlowerId: payload.flower.id, targetFlowerName: flowerName } : {}),
    diagnosisTitle: '缺水应激或轻度虫害前兆',
    summary: `${flowerName} 目前更像是轻度应激状态，可能是缺水、空气过干，或早期小虫害一起造成的状态下滑，先做温和排查最合适。`,
    severity,
    confidenceLabel: '保守识别建议',
    symptomHighlights: [
      '先看叶缘、叶尖有没有干焦或失去光泽。',
      '留意叶背和茎节有没有小白点、小壳点或黏感。',
      '盆土如果长期过干，叶片精神会先松下来。',
    ],
    possibleCauses: [
      '浇水节奏和当前气温、风力不再匹配。',
      '空气偏干，植物蒸腾过快。',
      '小型虫害处在早期，肉眼还不算特别明显。',
    ],
    treatmentSteps: [
      '先摸盆土确认干湿，再决定是否补水。',
      '把叶背、叶柄和节间擦拭一遍，顺便排查虫点。',
      '这两天先不要叠加施肥和重修剪。',
      '如果 48 小时内状态继续变差，再按更具体的虫害或病害方向处理。',
    ],
    preventionTips: [
      '每次浇水前都先看盆土，不按固定天数机械补水。',
      '保持基础通风和柔和光照，让植物别长期处在闷或暴晒里。',
      '每周固定翻看一次叶背，小问题会更早发现。',
    ],
    observationTips: [
      '重点看叶片下垂、卷边有没有加重。',
      '观察盆土回湿后精神状态是否能恢复。',
      '如有新虫点，尽量拍更近的局部图再次识别。',
    ],
    generatedAt: createGeneratedAt(),
    gentleFallbackMessage: '这次识别没有调用到上游模型，所以我先给你一份更稳妥的排查版建议。',
  }
}

function buildTripCarePlanFallback(payload: RequestTripCarePlanDto): IAiTripCarePlan {
  const flowerName = normalizeFlowerName(payload.flower)
  const weatherAlerts = buildExtremeWeatherAlerts(payload.weather).map((alert) => alert.title)
  const riskScore = [
    payload.travelDays >= 7 ? 1 : 0,
    payload.travelDays >= 10 ? 1 : 0,
    payload.weather.temperature >= 32 || payload.weather.temperature <= 8 ? 1 : 0,
    payload.weather.precipitationProbability >= 75 ? 1 : 0,
  ].reduce((sum, current) => sum + current, 0)
  const riskLevel = resolveSeverityScore(riskScore)

  return {
    targetFlowerId: payload.flower.id,
    targetFlowerName: flowerName,
    cityName: payload.weather.cityName,
    travelDays: payload.travelDays,
    summary:
      payload.travelDays <= 3
        ? `${flowerName} 这次出差时间不算长，重点是出门前把环境稳住，不要因为不放心而猛浇一轮。`
        : `${flowerName} 这次要独自待 ${payload.travelDays} 天，更适合提前做减负和稳态托管，核心是控水、避晒和防闷。`,
    riskLevel,
    weatherAlerts,
    beforeTripActions: [
      payload.flower.careStatus === 'watering-needed'
        ? '出门前先摸盆土，确实偏干再补一次透但不过量的水。'
        : '出门前先观察盆土和叶片，状态稳定就别因为焦虑临时加大浇水。',
      payload.weather.temperature >= 32
        ? '把它挪到更柔和的散射光位置，尽量避开正午直晒。'
        : '保持它熟悉的光照环境，临出门前不要突然大幅换位。',
      payload.travelDays >= 5
        ? '如果家里特别干，可以准备保水托盘或自吸水装置，但先小范围试过再用。'
        : '短途出差不建议临时套袋保湿，容易把环境捂得太闷。',
    ],
    duringTripAdvice: [
      payload.travelDays >= 7
        ? '超过一周时，优先考虑请熟悉植物的人帮忙看一眼，比远程猜状态更稳。'
        : '这几天以“少打扰”为主，不需要让人频繁代浇。',
      payload.weather.precipitationProbability >= 70 && payload.flower.placement === 'outdoor_open_air'
        ? '如果它在户外，出门前要优先避开连续淋雨和积水风险。'
        : '无人照顾期间，核心是避免暴晒、闷根和环境剧烈变化。',
      '不要把多个补救动作叠在一起，例如同时大浇水、施肥、换盆。',
    ],
    returnHomeChecklist: [
      '回家先看盆土和叶片精神，不要一进门就补一大轮水。',
      '检查叶背、茎节和盆土表层，确认有没有闷坏、黄叶或虫点。',
      '若状态明显变差，先做一件最必要的小动作，再观察半天到一天。',
    ],
    generatedAt: createGeneratedAt(),
    gentleFallbackMessage: '这是本地兜底生成的无人托管方案，已经按天气和出差时长尽量帮你收紧风险了。',
  }
}

function buildExtremeWeatherAlerts(
  weather: RequestCareAdviceDto['weather'] | RequestSinglePlantCareAdviceDto['weather'],
): IAiExtremeWeatherAlert[] {
  const alerts: IAiExtremeWeatherAlert[] = []

  if (weather.precipitationProbability >= 85 || weather.weatherText.includes('暴雨')) {
    alerts.push({
      type: 'storm',
      title: '暴雨天先别忙着补水',
      description: '今天雨势偏重，先观察盆土透气和积水情况，别让根系一直闷着。',
    })
  }

  if (weather.temperature <= 8) {
    alerts.push({
      type: 'low-temperature',
      title: '低温天动作放轻一点',
      description: '气温偏低时，浇水和换盆都要更克制，先保暖再谈折腾。',
    })
  }

  if (weather.temperature >= 35) {
    alerts.push({
      type: 'high-temperature',
      title: '高温天以避晒和通风为主',
      description: '中午前后先别施肥，暴晒位植物也尽量缓一缓，避免叶片烫伤。',
    })
  }

  if (weather.humidity >= 85 && weather.temperature >= 18 && weather.temperature <= 28) {
    alerts.push({
      type: 'humid-south',
      title: '回南天气要防闷根',
      description: '空气又湿又黏，盆土不干就先别浇，通风比勤快补水更重要。',
    })
  }

  if (weather.temperature <= 2) {
    alerts.push({
      type: 'frost',
      title: '霜冻风险要先避开',
      description: '今晚可能很冷，怕冻的植物先往室内挪一挪，别让嫩叶直接受寒。',
    })
  }

  return alerts
}

function buildSeasonalText(
  weather: RequestCareAdviceDto['weather'] | RequestSinglePlantCareAdviceDto['weather'],
): string {
  if (weather.season.includes('夏')) {
    return '现在更适合少量多次观察，重点放在避晒、通风和盆土升温上。'
  }

  if (weather.season.includes('冬')) {
    return '现在养护节奏要慢一点，先保温，再决定是否补水或修剪。'
  }

  if (weather.season.includes('春')) {
    return '现在是比较适合恢复生长的季节，可以温柔增加观察频率，但别一下子用力过猛。'
  }

  return '这个季节适合保持稳定节奏，先看叶色、盆土和新芽，再决定今天动哪一步。'
}

function buildFallbackAdvice(payload: RequestCareAdviceDto): IAiAdvice {
  const wateringNeededCount = payload.flowers.filter(
    (flower) => flower.careStatus === 'watering-needed',
  ).length
  const outdoorCount = payload.flowers.filter((flower) => flower.placement === 'outdoor_open_air').length
  const recentlyWateredCount = payload.flowers.filter((flower) => {
    if (!flower.lastWateredAt) {
      return false
    }

    return Date.now() - new Date(flower.lastWateredAt).getTime() <= 24 * 60 * 60 * 1000
  }).length

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
  ]

  return {
    dailyAdvice: `${payload.weather.cityName} 今天 ${payload.weather.weatherText}，气温 ${Math.round(payload.weather.temperature)}°C。先做一次轻量巡园，再决定是否浇水或擦叶。`,
    seasonalAdvice: buildSeasonalText(payload.weather),
    warningTips,
    wateringCycleDays: recentlyWateredCount > 0 || payload.weather.precipitationProbability >= 60 ? 3 : 2,
    fertilizingCycleDays: payload.weather.temperature >= 32 ? 14 : 10,
    generatedAt: createGeneratedAt(),
  }
}

function buildSinglePlantFallbackAdvice(payload: RequestSinglePlantCareAdviceDto): IPlantAiAdvice {
  const flowerName = normalizeFlowerName(payload.flower)
  const latestRecord = payload.flower.records[0]
  const extremeWeatherAlerts = buildExtremeWeatherAlerts(payload.weather)
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
  ]
  const forbiddenActions = [
    extremeWeatherAlerts.some((alert) => alert.type === 'storm')
      ? '今天别因为下雨就顺手再补一轮水。'
      : '在没看盆土前，先别按固定习惯机械浇水。',
    extremeWeatherAlerts.some((alert) => alert.type === 'high-temperature')
      ? '正午先别施肥，也别急着大修剪。'
      : '一次别同时做太多动作，留点缓冲更稳。',
  ]

  return {
    targetFlowerId: payload.flower.id,
    targetFlowerName: flowerName,
    season: payload.weather.season,
    ...(payload.weather.solarTerm ? { solarTerm: payload.weather.solarTerm } : {}),
    summary: `${flowerName} 今天更适合“轻观察、少折腾”的节奏，先看状态，再做一件最必要的小事。`,
    dailyAdvice: `${payload.weather.cityName} 今天 ${payload.weather.weatherText}，${flowerName} 所在环境是${payload.flower.placement}。先看看叶片和盆土，再决定是否补水或调整位置。`,
    seasonalAdvice: buildSeasonalText(payload.weather),
    warningTips: [
      ...extremeWeatherAlerts.map((alert) => alert.title),
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
    gentleFallbackMessage: 'AI建议只供参考，具体需要根据植株真实状态来哦！',
  }
}

interface OpenAiCompatibleResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

function stripJsonCodeFence(content: string): string {
  return content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()
}

function buildCareAdvicePrompt(payload: RequestCareAdviceDto): string {
  return [
    '你是植愈日记应用的植物养护助手。',
    '请结合天气与多株植物状态，返回更适合新手理解的中文建议。',
    '输出必须是纯 JSON，字段必须严格匹配 IAiAdvice。',
    '文案要温柔、简洁、可执行，warningTips 保持 3 条。',
    `输入数据: ${JSON.stringify(payload)}`,
  ].join('\n')
}

function buildSinglePlantPrompt(payload: RequestSinglePlantCareAdviceDto): string {
  return [
    '你是植愈日记应用的单株植物养护助手。',
    '请只输出纯 JSON，字段严格匹配 IPlantAiAdvice。',
    'summary、focusActions、forbiddenActions 要具体，适合直接展示给新手。',
    `输入数据: ${JSON.stringify(payload)}`,
  ].join('\n')
}

function buildDiagnosisPrompt(payload: RequestPlantDiagnosisDto): string {
  return [
    '你是植物病虫害识别助手。',
    '请基于图片与上下文做保守识别，只输出纯 JSON，字段严格匹配 IAiPlantDiagnosis。',
    '不要夸大结论，优先给出排查方向和温和处理步骤。',
    `输入数据: ${JSON.stringify(payload)}`,
  ].join('\n')
}

function buildTripPlanPrompt(payload: RequestTripCarePlanDto): string {
  return [
    '你是出差托管养护规划助手。',
    '请返回纯 JSON，字段严格匹配 IAiTripCarePlan。',
    '强调低风险、少折腾、适合个人开发产品直接展示。',
    `输入数据: ${JSON.stringify(payload)}`,
  ].join('\n')
}

function buildChatPrompt(payload: RequestAiChatDto): string {
  const contextLines: string[] = []

  if (payload.weather) {
    contextLines.push(`天气: ${JSON.stringify(payload.weather)}`)
  }
  if (payload.flowers && payload.flowers.length > 0) {
    contextLines.push(`花园植株: ${JSON.stringify(payload.flowers)}`)
  } else if (payload.flower) {
    contextLines.push(`当前植株: ${JSON.stringify(payload.flower)}`)
  }

  return [
    '你是植愈日记应用的植物养护顾问。',
    '请用温柔、实用的中文回答用户问题，适合新手理解。',
    '输出必须是纯 JSON，格式: {"answer": "你的回复内容"}',
    contextLines.length > 0 ? `参考上下文: ${contextLines.join('; ')}` : '',
    `用户问题: ${payload.question}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function buildChatFallback(payload: RequestAiChatDto): IAiChatResponse {
  const plantHint = payload.flower
    ? `关于「${payload.flower.name ?? payload.flower.nickname ?? '这株植物'}」`
    : payload.flowers && payload.flowers.length > 0
      ? `关于你花园里的 ${payload.flowers.length} 株植物`
      : ''

  return {
    answer: `${plantHint}，建议你先观察叶片状态和土壤干湿情况。如果方便的话，可以拍一张清晰的照片，或者描述一下具体症状，我能给你更准确的建议。`,
    generatedAt: new Date().toISOString(),
  }
}

@Injectable()
export class AiProxyService {
  public constructor(
    private readonly configService: ConfigService,
    private readonly runtimeCacheService: RuntimeCacheService,
    private readonly requestMonitorService: RequestMonitorService,
    private readonly imageService: ImageService,
    private readonly usersService: UsersService,
  ) {}

  private resolveShouldUseAgent(): boolean {
    const appConfig = this.configService.getOrThrow<ServerEnvConfig>('app')
    // Agent 配置了非默认值即视为可用
    return !appConfig.aiAgentUrl.includes('example.com') && !appConfig.aiAgentApiKey.includes('change-me')
  }

  private resolveShouldUseFallback(): boolean {
    const appConfig = this.configService.getOrThrow<ServerEnvConfig>('app')
    return (
      appConfig.aiProxyBaseUrl.includes('example.com') ||
      appConfig.aiProxyApiKey.includes('replace-with-local-key')
    )
  }

  /** 调用 AI Agent 的结构化端点 */
  private async requestAgent<TResponse>(
    scope: string,
    payload: unknown,
    userId?: string,
  ): Promise<TResponse> {
    const appConfig = this.configService.getOrThrow<ServerEnvConfig>('app')
    const baseUrl = appConfig.aiAgentUrl.replace(/\/$/, '')
    const resolvedUserId = userId ?? 'anonymous'

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': appConfig.aiAgentApiKey,
    }

    let requestUrl: string
    let body: unknown

    switch (scope) {
      case 'care-advice': {
        const p = payload as RequestCareAdviceDto
        requestUrl = `${baseUrl}/advice/daily`
        body = {
          user_id: resolvedUserId,
          city_name: p.weather.cityName,
          force_refresh: false,
        }
        break
      }
      case 'plant-care-advice': {
        const p = payload as RequestSinglePlantCareAdviceDto
        requestUrl = `${baseUrl}/advice/analyze`
        body = {
          user_id: resolvedUserId,
          focus: `single_plant:${p.flower.id}`,
        }
        break
      }
      case 'plant-diagnosis': {
        const p = payload as RequestPlantDiagnosisDto
        requestUrl = `${baseUrl}/diagnosis/plant`
        body = {
          user_id: resolvedUserId,
          plant_id: p.flower?.id ?? null,
          symptoms: p.flower ? `${p.flower.name}（状态: ${p.flower.careStatus}）` : '未知植物异常',
          image_data_url: p.imageDataUrl,
          weather: p.weather
            ? {
                temperature: p.weather.temperature,
                humidity: p.weather.humidity,
                weather_text: p.weather.weatherText,
              }
            : null,
        }
        break
      }
      case 'trip-care-plan': {
        const p = payload as RequestTripCarePlanDto
        requestUrl = `${baseUrl}/advice/trip-plan`
        body = {
          user_id: resolvedUserId,
          plant_id: p.flower.id,
          travel_days: p.travelDays,
          city_name: p.weather.cityName,
        }
        break
      }
      case 'chat': {
        const p = payload as RequestAiChatDto
        requestUrl = `${baseUrl}/chat`
        body = {
          user_id: resolvedUserId,
          message: p.question,
          city_name: p.weather?.cityName ?? null,
          attachments: [],
        }
        break
      }
      case 'plant-health-check': {
        const p = payload as RequestPlantHealthCheckDto
        requestUrl = `${baseUrl}/advice/analyze`
        body = {
          user_id: resolvedUserId,
          focus: 'health_overview',
        }
        break
      }
      case 'taxonomy-suggest': {
        const p = payload as { plantName: string }
        requestUrl = `${baseUrl}/taxonomy/suggest`
        body = { plant_name: p.plantName }
        break
      }
      default:
        throw new Error(`Unknown AI scope: ${scope}`)
    }

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`AI Agent 返回错误: ${response.status}`)
    }

    return response.json() as Promise<TResponse>
  }

  /** 直接调 AI（保留向后兼容，Agent 不可用时降级） */
  private async requestDirectAi<TResponse>(scope: string, prompt: string): Promise<TResponse> {
    const appConfig = this.configService.getOrThrow<ServerEnvConfig>('app')
    const requestUrl = `${appConfig.aiProxyBaseUrl.replace(/\/$/, '')}/chat/completions`

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${appConfig.aiProxyApiKey}`,
      },
      body: JSON.stringify({
        model: appConfig.aiProxyModel,
        temperature: 0.4,
        messages: [
          { role: 'system', content: '你只返回纯 JSON，不要输出 markdown，不要解释。' },
          { role: 'user', content: prompt },
        ],
        metadata: { scope, app: 'florist' },
      }),
    })

    if (!response.ok) {
      throw new Error('AI 中转服务不可用')
    }

    const result = (await response.json()) as OpenAiCompatibleResponse
    const rawContent = result.choices?.[0]?.message?.content

    if (!rawContent) {
      throw new Error('AI 返回内容为空')
    }

    return JSON.parse(stripJsonCodeFence(rawContent)) as TResponse
  }

  private async resolveAiResponse<TResponse>(input: {
    scope:
      | 'care-advice'
      | 'plant-care-advice'
      | 'plant-diagnosis'
      | 'trip-care-plan'
      | 'chat'
      | 'plant-health-check'
      | 'taxonomy-suggest'
    userId?: string
    payload: unknown
    prompt: string
    fallbackFactory: () => TResponse
  }): Promise<TResponse> {
    const appConfig = this.configService.getOrThrow<ServerEnvConfig>('app')
    const resolvedUserId = await this.usersService.resolveCurrentUserId(input.userId)
    const requestHash = this.requestMonitorService.createPayloadHash(input.scope, input.payload)
    const cacheKey = `ai:${input.scope}:${resolvedUserId}:${requestHash}`
    const startedAt = Date.now()
    let upstreamProvider = 'local-fallback'

    try {
      const { value, cacheHit } = await this.runtimeCacheService.remember<TResponse>(
        cacheKey,
        appConfig.aiCacheTtlMs,
        async () => {
          const useAgent = this.resolveShouldUseAgent()
          const useDirectAi = !this.resolveShouldUseFallback()

          // 优先：AI Agent
          if (useAgent) {
            try {
              const result = await this.requestAgent<TResponse>(input.scope, input.payload, resolvedUserId)
              upstreamProvider = 'ai-agent'
              return result
            } catch {
              // Agent 失败 → 降级到直接 AI
            }
          }

          // 其次：直接 AI（兼容旧配置）
          if (useDirectAi) {
            try {
              const result = await this.requestDirectAi<TResponse>(input.scope, input.prompt)
              // 调用成功后才扣减配额，避免失败浪费额度
              await this.requestMonitorService.ensureAiQuota(resolvedUserId, input.scope, 1)
              upstreamProvider = appConfig.aiProxyModel
              return result
            } catch {
              // 直接 AI 失败 → 降级到本地 fallback
            }
          }

          // 最后：本地 fallback
          upstreamProvider = 'local-fallback'
          return input.fallbackFactory()
        },
      )

      await this.requestMonitorService.logProxyRequest({
        scope: 'ai-proxy',
        endpoint: input.scope,
        userId: resolvedUserId,
        requestHash,
        cacheHit,
        success: true,
        statusCode: 200,
        durationMs: Date.now() - startedAt,
        quotaCost: cacheHit || upstreamProvider === 'local-fallback' ? 0 : 1,
        upstreamProvider,
      })

      return value
    } catch (error) {
      await this.requestMonitorService.logProxyRequest({
        scope: 'ai-proxy',
        endpoint: input.scope,
        userId: resolvedUserId,
        requestHash,
        cacheHit: false,
        success: false,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
        quotaCost: 0,
        upstreamProvider,
        errorMessage: error instanceof Error ? error.message : 'unknown error',
      })

      return input.fallbackFactory()
    }
  }

  public async getCareAdvice(payload: RequestCareAdviceDto, userId?: string): Promise<IAiAdvice> {
    return this.resolveAiResponse({
      scope: 'care-advice',
      payload,
      prompt: buildCareAdvicePrompt(payload),
      fallbackFactory: () => buildFallbackAdvice(payload),
      ...(userId ? { userId } : {}),
    })
  }

  public async getSinglePlantCareAdvice(
    payload: RequestSinglePlantCareAdviceDto,
    userId?: string,
  ): Promise<IPlantAiAdvice> {
    return this.resolveAiResponse({
      scope: 'plant-care-advice',
      payload,
      prompt: buildSinglePlantPrompt(payload),
      fallbackFactory: () => buildSinglePlantFallbackAdvice(payload),
      ...(userId ? { userId } : {}),
    })
  }

  public async getPlantDiagnosis(
    payload: RequestPlantDiagnosisDto,
    userId?: string,
  ): Promise<IAiPlantDiagnosis> {
    const compressedImage = await this.imageService.compressForDiagnosis(payload.imageDataUrl)
    const normalizedPayload: RequestPlantDiagnosisDto = {
      ...payload,
      imageDataUrl: compressedImage.dataUrl,
    }

    return this.resolveAiResponse({
      scope: 'plant-diagnosis',
      payload: normalizedPayload,
      prompt: buildDiagnosisPrompt(normalizedPayload),
      fallbackFactory: () => buildPlantDiagnosisFallback(normalizedPayload),
      ...(userId ? { userId } : {}),
    })
  }

  public async getTripCarePlan(payload: RequestTripCarePlanDto, userId?: string): Promise<IAiTripCarePlan> {
    return this.resolveAiResponse({
      scope: 'trip-care-plan',
      payload,
      prompt: buildTripPlanPrompt(payload),
      fallbackFactory: () => buildTripCarePlanFallback(payload),
      ...(userId ? { userId } : {}),
    })
  }

  public async getAiChat(payload: RequestAiChatDto, userId?: string): Promise<IAiChatResponse> {
    return this.resolveAiResponse({
      scope: 'chat',
      payload,
      prompt: buildChatPrompt(payload),
      fallbackFactory: () => buildChatFallback(payload),
      ...(userId ? { userId } : {}),
    })
  }

  public async getPlantHealthCheck(
    payload: RequestPlantHealthCheckDto,
    userId?: string,
  ): Promise<IPlantHealthCheck> {
    return this.resolveAiResponse({
      scope: 'plant-health-check',
      payload,
      prompt: [
        '你是植株健康快检助手。请基于植物状态做快速判断，只输出纯 JSON。',
        '格式: {"status":"healthy|attention|warning","summary":"一句话总结","suggestedAction":"建议操作（可选）"}',
        `输入数据: ${JSON.stringify(payload)}`,
      ].join('\n'),
      fallbackFactory: (): IPlantHealthCheck => ({
        status: 'healthy',
        summary: '暂无足够数据做精确判断，从已有记录看状态平稳。',
        generatedAt: new Date().toISOString(),
      }),
      ...(userId ? { userId } : {}),
    })
  }

  /**
   * AI 内容审核 —— 检查反馈/评论是否合规。
   * 返回 { passed: true } 表示通过，{ passed: false, reason: '...' } 表示驳回。
   */
  public async moderateFeedbackContent(content: string): Promise<{ passed: boolean; reason?: string }> {
    // 优先走 Agent 专用审核端点
    if (this.resolveShouldUseAgent()) {
      try {
        const appConfig = this.configService.getOrThrow<ServerEnvConfig>('app')
        const response = await fetch(`${appConfig.aiAgentUrl.replace(/\/$/, '')}/tools/moderate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': appConfig.aiAgentApiKey,
          },
          body: JSON.stringify({ content }),
        })

        if (response.ok) {
          return response.json() as Promise<{ passed: boolean; reason?: string }>
        }
      } catch {
        // Agent 审核失败 → 降级
      }
    }

    // 降级：走通用 AI 审核
    const prompt = [
      '你是内容审核助手。请判断以下用户反馈是否合规，只输出纯 JSON。',
      '合规标准：不包含侮辱性/攻击性语言、不包含广告/垃圾信息、内容与植物养护或应用体验相关。',
      '格式: {"passed": true} 或 {"passed": false, "reason": "不合规原因（简短中文）"}',
      `用户内容: "${content}"`,
    ].join('\n')

    try {
      const result = await this.resolveAiResponse<{ passed: boolean; reason?: string }>({
        scope: 'chat',
        payload: { content },
        prompt,
        fallbackFactory: () => ({ passed: true }),
      })
      return result
    } catch {
      return { passed: true }
    }
  }

  public async suggestFlowerTaxonomy(
    plantName: string,
    userId?: string,
  ): Promise<{
    category: string
    placement: string
    careDifficulty: string
    careStatus: string
    confidence: string
  }> {
    return this.resolveAiResponse({
      scope: 'taxonomy-suggest',
      payload: { plantName },
      prompt: `根据植物名称"${plantName}"，推断它的品类、摆放位置、养护难度和当前状态。返回JSON格式。`,
      fallbackFactory: () => ({
        category: 'herbaceous',
        placement: 'indoor_balcony',
        careDifficulty: 'easy',
        careStatus: 'healthy',
        confidence: 'low',
      }),
      ...(userId ? { userId } : {}),
    })
  }
}
