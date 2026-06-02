import type { IAiAdvice, IAiChatResponse, IPlantAiAdvice, IPlantHealthCheck } from '@florist/contracts'
import { getRecordActionLabel } from '@/interfaces'
import type {
  GardenAiAdviceContext,
  LocalFlower,
  LocalRecord,
  SingleFlowerAiAdviceContext,
  WeatherSnapshot,
} from '@/interfaces'
import {
  getFlowerDisplayName,
  getSeasonByDate,
  getSolarTerm,
} from '@/utils'
import { http } from '@/utils/request'
import { getEncryptedStorage, setEncryptedStorage } from '@/utils/storage'

interface AiHistoryRecordPayload {
  actionType: LocalRecord['actionType']
  note?: string
  createdAt: string
  cooldownMinutes: number
}

interface AiAdviceRequestFlower {
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
  records: ReadonlyArray<AiHistoryRecordPayload>
}

const AI_CACHE_NAMESPACE = 'ai-advice'
const AI_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const AI_REQUEST_GAP_MS = 3000

const pendingAiRequestMap = new Map<string, Promise<unknown>>()
const lastAiRequestTimeMap = new Map<string, number>()

function createFriendlyAiError(message: string): Error {
  return new Error(message)
}

async function ensureNetworkAvailable(): Promise<boolean> {
  return new Promise(resolve => {
    uni.getNetworkType({
      success: ({ networkType }) => resolve(networkType !== 'none'),
      fail: () => resolve(true),
    })
  })
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

function mapWeatherPayload(weather: WeatherSnapshot): {
  cityName: string
  weatherText: string
  temperature: number
  humidity: number
  precipitationProbability: number
  windSpeed: number
  season: string
  solarTerm?: string
} {
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

function mapHistoryRecords(
  records: ReadonlyArray<LocalRecord>,
  flowerId: string,
): ReadonlyArray<AiHistoryRecordPayload> {
  return records
    .filter(record => record.flowerId === flowerId)
    .slice(0, 8)
    .map(record => ({
      actionType: record.actionType,
      ...(record.note ? { note: record.note } : {}),
      createdAt: record.createdAt,
      cooldownMinutes: record.cooldownMinutes,
    }))
}

function mapFlowerPayload(
  flower: LocalFlower,
  records: ReadonlyArray<LocalRecord>,
): AiAdviceRequestFlower {
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
    records: mapHistoryRecords(records, flower.id),
  }
}

function buildGardenCacheKey(context: GardenAiAdviceContext): string {
  return [
    'garden',
    context.weather.city.id,
    context.weather.fetchedAt.slice(0, 10),
    context.flowers.map(flower => `${flower.id}:${flower.updatedAt}`).join('|'),
    context.records[0]?.createdAt ?? 'no-records',
  ].join('::')
}

function buildPlantCacheKey(context: SingleFlowerAiAdviceContext): string {
  const latestRecord = context.records.find(record => record.flowerId === context.flower.id)

  return [
    'plant',
    context.flower.id,
    context.weather.city.id,
    context.weather.fetchedAt.slice(0, 10),
    context.flower.updatedAt,
    latestRecord?.createdAt ?? 'no-records',
  ].join('::')
}

async function requestAiProxy<TResponse, TBody>(
  path: '/ai-proxy/care-advice' | '/ai-proxy/plant-care-advice',
  body: TBody,
  cacheKey: string,
): Promise<TResponse> {
  const cachedValue = getEncryptedStorage<TResponse>(cacheKey, { namespace: AI_CACHE_NAMESPACE })

  if (cachedValue) {
    return cachedValue
  }

  const isNetworkAvailable = await ensureNetworkAvailable()

  if (!isNetworkAvailable) {
    throw createFriendlyAiError('现在网络有点飘，AI 建议先休息一下，连上网后我再温柔地帮你问问。')
  }

  const pendingRequest = pendingAiRequestMap.get(cacheKey)

  if (pendingRequest) {
    return pendingRequest as Promise<TResponse>
  }

  const lastRequestedAt = lastAiRequestTimeMap.get(cacheKey) ?? 0
  const waitTime = AI_REQUEST_GAP_MS - (Date.now() - lastRequestedAt)

  if (waitTime > 0) {
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }

  lastAiRequestTimeMap.set(cacheKey, Date.now())

  const wrappedPromise = http.post<TResponse, TBody>(path, body, {
    showLoading: false,
    skipErrorToast: true,
    cancelDuplicate: true,
  })
    .then((response) => {
      setEncryptedStorage(cacheKey, response, {
        namespace: AI_CACHE_NAMESPACE,
        expiresInMs: AI_CACHE_TTL_MS,
      })
      return response
    })
    .finally(() => {
      pendingAiRequestMap.delete(cacheKey)
    })

  pendingAiRequestMap.set(cacheKey, wrappedPromise)

  return wrappedPromise
}

export function fetchGardenAiCareAdvice(context: GardenAiAdviceContext): Promise<IAiAdvice> {
  return requestAiProxy<IAiAdvice, {
    weather: ReturnType<typeof mapWeatherPayload>
    flowers: AiAdviceRequestFlower[]
  }>('/ai-proxy/care-advice', {
    weather: mapWeatherPayload(context.weather),
    flowers: context.flowers.map(flower => mapFlowerPayload(flower, context.records)),
  }, buildGardenCacheKey(context))
}

export function fetchSingleFlowerAiCareAdvice(
  context: SingleFlowerAiAdviceContext,
): Promise<IPlantAiAdvice> {
  const cacheKey = buildPlantCacheKey(context)

  if (context.isOffline) {
    const cachedValue = getEncryptedStorage<IPlantAiAdvice>(cacheKey, {
      namespace: AI_CACHE_NAMESPACE,
    })

    if (cachedValue) {
      return Promise.resolve(cachedValue)
    }

    return Promise.reject(
      createFriendlyAiError('现在是离线模式，AI 先不打扰你，等连上网我再帮这盆小植物认真想一份建议。'),
    )
  }

  return requestAiProxy<IPlantAiAdvice, {
    weather: ReturnType<typeof mapWeatherPayload>
    flower: AiAdviceRequestFlower
  }>('/ai-proxy/plant-care-advice', {
    weather: mapWeatherPayload(context.weather),
    flower: mapFlowerPayload(context.flower, context.records),
  }, cacheKey)
}

export function buildSingleFlowerAiSummary(flower: LocalFlower, advice: IPlantAiAdvice): string {
  return `${getFlowerDisplayName(flower)} 今天最适合：${advice.focusActions[0] ?? advice.dailyAdvice}`
}

export function buildSingleFlowerHistoryLabel(records: ReadonlyArray<LocalRecord>, flowerId: string): string {
  const latestRecord = records.find(record => record.flowerId === flowerId)

  if (!latestRecord) {
    return '还没有历史养护记录，今天先做一次轻轻的观察就很好。'
  }

  return `最近一次是${getRecordActionLabel(latestRecord.actionType)}，记录时间 ${latestRecord.createdAt.slice(0, 16).replace('T', ' ')}`
}

/** AI 聊天：发送问题 + 植物上下文，获取 AI 回复 */
export async function fetchAiChat(context: {
  question: string
  weather?: WeatherSnapshot
  flowers?: ReadonlyArray<LocalFlower>
  flower?: LocalFlower
  records?: ReadonlyArray<LocalRecord>
}): Promise<IAiChatResponse> {
  const payload: Record<string, unknown> = { question: context.question }

  if (context.weather) payload.weather = mapWeatherPayload(context.weather)
  if (context.flowers) payload.flowers = context.flowers.map(f => mapFlowerPayload(f, context.records ?? []))
  else if (context.flower) payload.flower = mapFlowerPayload(context.flower, context.records ?? [])

  return http.post<IAiChatResponse>('/ai-proxy/chat', payload, {
    timeout: 30000,
    loadingText: 'AI 正在思考中',
    skipErrorToast: true,
    cancelDuplicate: true,
  })
}

/** 单株植物健康快检：分析当前状态并给出简要建议，结果缓存 24h */
export async function fetchPlantHealthCheck(
  flower: LocalFlower,
  records: ReadonlyArray<LocalRecord>,
  weather?: WeatherSnapshot | null,
): Promise<IPlantHealthCheck> {
  const cacheKey = `plant-health::${flower.id}::${new Date().toISOString().slice(0, 10)}`

  const cached = getEncryptedStorage<IPlantHealthCheck>(cacheKey, { namespace: AI_CACHE_NAMESPACE })
  if (cached) return cached

  const payload: Record<string, unknown> = {
    flower: mapFlowerPayload(flower, records),
  }
  if (weather) payload.weather = mapWeatherPayload(weather)

  const result = await http.post<IPlantHealthCheck>('/ai-proxy/plant-health-check', payload, {
    timeout: 15000,
    skipErrorToast: true,
    cancelDuplicate: true,
  })

  setEncryptedStorage(cacheKey, result, { namespace: AI_CACHE_NAMESPACE, expiresInMs: AI_CACHE_TTL_MS })
  return result
}

export const fetchAiCareAdvice = fetchGardenAiCareAdvice

export interface TaxonomySuggestion {
  category?: string
  placement?: string
  careDifficulty?: string
  careStatus?: string
  confidence: 'high' | 'medium' | 'low'
}

/** AI 分类建议：根据植物名称推荐品类/位置/难度/状态 */
export function suggestFlowerTaxonomy(plantName: string): Promise<TaxonomySuggestion> {
  return http.post<TaxonomySuggestion>('/ai-proxy/taxonomy-suggest', { plantName }, {
    showLoading: false,
    skipErrorToast: true,
    timeout: 8000,
  })
}
