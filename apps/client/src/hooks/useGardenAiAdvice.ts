import type { IAiAdvice } from '@florist/contracts'
import { computed, ref, watch } from 'vue'
import type { GardenAiAdviceContext, LocalFlower, LocalRecord, WeatherSnapshot } from '@/interfaces'
import { fetchGardenAiCareAdvice } from '@/api'
import { getEncryptedStorage, setEncryptedStorage } from '@/utils/storage'

const GARDEN_ADVICE_CACHE_KEY = 'garden-advice-daily'
const GARDEN_ADVICE_NAMESPACE = 'ai-advice'

interface DailyAdviceCache {
  dateKey: string   // YYYY-MM-DD
  cityId: string
  advice: IAiAdvice
  cachedAt: number
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function readDailyCache(): DailyAdviceCache | null {
  return getEncryptedStorage<DailyAdviceCache>(GARDEN_ADVICE_CACHE_KEY, {
    namespace: GARDEN_ADVICE_NAMESPACE,
  })
}

function writeDailyCache(cache: DailyAdviceCache): void {
  setEncryptedStorage(GARDEN_ADVICE_CACHE_KEY, cache, {
    namespace: GARDEN_ADVICE_NAMESPACE,
  })
}

/**
 * 花园全局 AI 养护建议 composable
 *
 * 每天仅调用一次 AI，后续请求复用当日缓存。
 * 传入当前所有植株、近 8 条养护记录、天气数据，AI 综合习性、近期照护、天气给出总体建议。
 */
export function useGardenAiAdvice() {
  const advice = ref<IAiAdvice | null>(null)
  const loading = ref(false)
  const message = ref('')

  /** 当日的缓存 key，包含日期 + 城市 + 植株数，确保跨天 / 换城市 / 增删植株时刷新 */
  function buildDailyCacheKey(weather: WeatherSnapshot, flowerCount: number): { dateKey: string; cityId: string } {
    return { dateKey: todayKey(), cityId: weather.city.id }
  }

  /** 尝试读取当日有效缓存 */
  function getCachedAdvice(cityId: string): IAiAdvice | null {
    const cached = readDailyCache()
    if (cached && cached.dateKey === todayKey() && cached.cityId === cityId) {
      return cached.advice
    }
    return null
  }

  /** 获取 AI 建议（当日首次调用 AI，后续走缓存） */
  async function fetchAdvice(
    weather: WeatherSnapshot,
    flowers: ReadonlyArray<LocalFlower>,
    records: ReadonlyArray<LocalRecord>,
    options?: { force?: boolean },
  ): Promise<void> {
    if (flowers.length === 0) {
      advice.value = null
      message.value = ''
      return
    }

    const { cityId } = buildDailyCacheKey(weather, flowers.length)

    // 当日已有缓存且非强制刷新 → 直接返回
    if (!options?.force) {
      const cached = getCachedAdvice(cityId)
      if (cached) {
        advice.value = cached
        message.value = ''
        return
      }
    }

    loading.value = true

    try {
      const result = await fetchGardenAiCareAdvice({
        weather,
        flowers,
        records: records.slice(0, 8), // 最近 8 条记录提供照护上下文
      })

      advice.value = result
      message.value = ''

      writeDailyCache({
        dateKey: todayKey(),
        cityId,
        advice: result,
        cachedAt: Date.now(),
      })
    } catch (error) {
      message.value = error instanceof Error
        ? error.message
        : 'AI 建议刚刚没有接上，先用天气卡片安排今天的照顾节奏。'
    } finally {
      loading.value = false
    }
  }

  /** 强制刷新（忽略当日缓存） */
  async function refresh(
    weather: WeatherSnapshot,
    flowers: ReadonlyArray<LocalFlower>,
    records: ReadonlyArray<LocalRecord>,
  ): Promise<void> {
    return fetchAdvice(weather, flowers, records, { force: true })
  }

  return { advice, loading, message, fetchAdvice, refresh }
}
