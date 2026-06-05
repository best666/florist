import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  fetchReminderConfig,
  fetchWeatherByCity,
  reverseGeocodeCity,
  searchCitiesByKeyword,
  updateReminderConfigOnServer,
} from '@/api'
import { useEncryptedStorage } from '@/hooks/useEncryptedStorage'
import type {
  CityOption,
  LocalReminderConfig,
  LocationWeatherCache,
  UseLocationWeatherReminderState,
  WeatherCareTip,
} from '@/interfaces'
import {
  ClientPlatform,
  DEFAULT_CITY_OPTIONS,
  DEFAULT_LOCAL_REMINDER_CONFIG,
} from '@/interfaces'
import {
  containsIllegalCharacters,
  debounce,
  getCurrentDeviceLocation,
  getRuntimePlatform,
  openPlatformPermissionSetting,
  showGentleToast,
} from '@/utils'

const WEATHER_CACHE_KEY = 'weather-cache'
const CITY_CACHE_KEY = 'weather-city'
const REMINDER_CACHE_KEY = 'weather-reminder-config'
const WEATHER_CACHE_TTL_MS = 12 * 60 * 60 * 1000
const REMINDER_POLLING_INTERVAL_MS = 60 * 1000

let reminderConfigRequest: Promise<LocalReminderConfig> | null = null
let initialLocationRequest: Promise<void> | null = null
let hasAttemptedInitialLocationRequest = false
const weatherRequestMap = new Map<string, Promise<void>>()

function isSameDay(isoTime: string, compareDate = new Date()): boolean {
  const targetDate = new Date(isoTime)
  return targetDate.getFullYear() === compareDate.getFullYear()
    && targetDate.getMonth() === compareDate.getMonth()
    && targetDate.getDate() === compareDate.getDate()
}

function buildWeatherTips(weather: NonNullable<UseLocationWeatherReminderState['weather']>): WeatherCareTip[] {
  const tips: WeatherCareTip[] = []

  if (weather.temperature >= 32) {
    tips.push({
      id: 'high-temperature',
      title: '高温防晒',
      description: '今天温度偏高，午后尽量避开暴晒，叶片薄的植物可以往散射光位置挪一挪。',
    })
  }

  if (weather.precipitationProbability >= 60 || weather.weatherText.includes('雨')) {
    tips.push({
      id: 'rainy-control-water',
      title: '雨天控水',
      description: '空气湿度和降水概率都偏高，浇水前先摸摸盆土，别让根系闷住。',
    })
  }

  if (weather.humidity <= 35) {
    tips.push({
      id: 'dry-air',
      title: '空气偏干',
      description: '空气有些干，观叶植物可以擦擦叶子，顺手观察叶缘有没有缺水卷边。',
    })
  }

  if (weather.windSpeed >= 25) {
    tips.push({
      id: 'wind-care',
      title: '大风留意',
      description: '风力偏大，阳台和窗边的小盆栽记得放稳，避免嫩枝被吹折。',
    })
  }

  if (tips.length === 0) {
    tips.push({
      id: 'gentle-day',
      title: '今天适合轻轻巡园',
      description: '天气平稳，正适合做一次柔和的日常观察，看看盆土、叶色和新芽。',
    })
  }

  return tips
}

// 免打扰窗口支持跨天（如 22:00-08:00），start > end 时按"当天开始→次日结束"处理
function isWithinQuietHours(config: LocalReminderConfig, currentDate = new Date()): boolean {
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes()
  const startMinutes = config.quietHours.startHour * 60 + config.quietHours.startMinute
  const endMinutes = config.quietHours.endHour * 60 + config.quietHours.endMinute

  if (startMinutes === endMinutes) {
    return false
  }

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }

  // 跨天窗口：例如 22:00 → 08:00，当前时间 >= 22:00 或 < 08:00 都在窗口内
  return currentMinutes >= startMinutes || currentMinutes < endMinutes
}

function shouldTriggerReminder(config: LocalReminderConfig, currentDate = new Date()): boolean {
  if (!config.enabled || isWithinQuietHours(config, currentDate)) {
    return false
  }

  const currentKey = currentDate.toISOString().slice(0, 10)

  if (config.lastTriggeredDate === currentKey) {
    return false
  }

  return currentDate.getHours() === config.reminderHour
    && currentDate.getMinutes() >= config.reminderMinute
}

function getFallbackCity(): CityOption | null {
  return DEFAULT_CITY_OPTIONS[0] ?? null
}

// 模块级共享状态，确保所有调用方拿到同一份数据
// useCount 跟踪组件引用数，只在首个挂载/最后一个卸载时启停
let sharedInstance: ReturnType<typeof createWeatherReminderInstance> | null = null
let instanceUseCount = 0

function createWeatherReminderInstance() {
  const cityStorage = useEncryptedStorage<CityOption>(CITY_CACHE_KEY)
  const weatherStorage = useEncryptedStorage<LocationWeatherCache>(WEATHER_CACHE_KEY)
  const reminderStorage = useEncryptedStorage<LocalReminderConfig>(REMINDER_CACHE_KEY)
  const cachedWeather = weatherStorage.getValue()

  const state = reactive<UseLocationWeatherReminderState>({
    city: cityStorage.getValue(),
    weather: cachedWeather && isSameDay(cachedWeather.weather.fetchedAt) ? cachedWeather.weather : null,
    weatherTips: cachedWeather && isSameDay(cachedWeather.weather.fetchedAt)
      ? buildWeatherTips(cachedWeather.weather)
      : [],
    citySearchKeyword: '',
    citySearchResults: DEFAULT_CITY_OPTIONS,
    reminderConfig: reminderStorage.getValue() ?? { ...DEFAULT_LOCAL_REMINDER_CONFIG },
    locationDenied: false,
    loadingLocation: false,
    loadingWeather: false,
    searchingCity: false,
    latestErrorMessage: '',
  })

  const reminderTimer = ref<ReturnType<typeof setInterval> | null>(null)

  function setErrorMessage(message: string): void {
    state.latestErrorMessage = message
  }

  async function applyCity(city: CityOption): Promise<void> {
    state.city = city
    cityStorage.setValue(city)
    await refreshWeather(city)
  }

  async function refreshWeather(targetCity?: CityOption): Promise<void> {
    const city = targetCity ?? state.city

    if (!city) {
      setErrorMessage('还没有定位到城市，可以手动选一个常用城市。')
      return
    }

    const cachedWeather = weatherStorage.getValue()

    if (cachedWeather && cachedWeather.city.id === city.id && isSameDay(cachedWeather.weather.fetchedAt)) {
      state.weather = cachedWeather.weather
      state.weatherTips = buildWeatherTips(cachedWeather.weather)
      return
    }

    state.loadingWeather = true

    const weatherRequestKey = city.id

    if (weatherRequestMap.has(weatherRequestKey)) {
      try {
        await weatherRequestMap.get(weatherRequestKey)
      }
      finally {
        state.loadingWeather = false
      }
      return
    }

    const weatherRequest = (async () => {
      try {
        const weather = await fetchWeatherByCity(city)
        state.weather = weather
        state.weatherTips = buildWeatherTips(weather)
        weatherStorage.setValue({ city, weather }, WEATHER_CACHE_TTL_MS)
        setErrorMessage('')
      }
      catch {
        setErrorMessage('天气暂时没有取到，先看看缓存或手动切换城市也可以。')
        const cache = weatherStorage.getValue()

        if (cache) {
          state.weather = cache.weather
          state.weatherTips = buildWeatherTips(cache.weather)
        }
      }
    })()

    weatherRequestMap.set(weatherRequestKey, weatherRequest)

    try {
      await weatherRequest
    }
    finally {
      weatherRequestMap.delete(weatherRequestKey)
      state.loadingWeather = false
    }
  }

  async function locateCity(): Promise<void> {
    state.loadingLocation = true

    try {
      const deviceLocation = await getCurrentDeviceLocation()

      if (!deviceLocation) {
        state.locationDenied = true
        setErrorMessage(
          getRuntimePlatform() === ClientPlatform.H5
            ? 'H5 没有拿到定位权限，请检查浏览器站点定位权限，并确保当前运行在 localhost 或 HTTPS。'
            : '定位权限没有开启，先手动选择城市也能继续用天气和提醒。',
        )
        return
      }

      const city = await reverseGeocodeCity(deviceLocation.latitude, deviceLocation.longitude)

      if (!city) {
        setErrorMessage('定位到了经纬度，但没能解析出城市，手动选择会更稳妥。')
        return
      }

      state.locationDenied = false
      await applyCity(city)
    }
    catch {
      state.locationDenied = true
      setErrorMessage('定位过程中出了点小岔子，手动选城市也完全可以继续。')
    }
    finally {
      state.loadingLocation = false
    }
  }

  const performCitySearch = debounce(async (keyword: string) => {
    if (keyword.trim().length === 0) {
      state.citySearchResults = DEFAULT_CITY_OPTIONS
      state.searchingCity = false
      return
    }

    state.searchingCity = true

    try {
      const results = await searchCitiesByKeyword(keyword)
      state.citySearchResults = results.length > 0 ? results : DEFAULT_CITY_OPTIONS
      setErrorMessage(results.length > 0 ? '' : '没搜到这个城市，先从常用城市里选一个也可以。')
    }
    catch {
      state.citySearchResults = DEFAULT_CITY_OPTIONS
      setErrorMessage('城市搜索暂时不可用，先选常用城市也不会影响后续提醒。')
    }
    finally {
      state.searchingCity = false
    }
  }, 400)

  function searchCities(keyword: string): void {
    state.citySearchKeyword = keyword
    void performCitySearch(keyword)
  }

  function setManualCity(city: CityOption): void {
    void applyCity(city)
  }

  async function requestLocationPermissionAgain(): Promise<boolean> {
    if (getRuntimePlatform() === ClientPlatform.H5) {
      await locateCity()

      if (state.locationDenied) {
        showGentleToast('H5 请检查浏览器地址栏里的站点定位权限，然后重新点击定位。')
      }

      return !state.locationDenied
    }

    const opened = await openPlatformPermissionSetting()

    if (!opened) {
      setErrorMessage('权限页面没有成功打开，先手动选城市也不影响使用。')
      return false
    }

    await locateCity()
    return true
  }

  async function ensureInitialLocationPermissionRequest(): Promise<void> {
    if (state.city || state.loadingLocation || hasAttemptedInitialLocationRequest) {
      return
    }

    if (initialLocationRequest) {
      return initialLocationRequest
    }

    hasAttemptedInitialLocationRequest = true
    initialLocationRequest = locateCity()
      .catch(() => {
        // 首次主动请求失败时保留现有手动选城兜底，本次应用启动不重复弹权限。
      })
      .finally(() => {
        initialLocationRequest = null
      })

    return initialLocationRequest
  }

  function updateReminderConfig(partialConfig: Partial<LocalReminderConfig>): void {
    const nextConfig: LocalReminderConfig = {
      ...state.reminderConfig,
      ...partialConfig,
      quietHours: {
        ...state.reminderConfig.quietHours,
        ...(partialConfig.quietHours ?? {}),
      },
    }

    if (containsIllegalCharacters(nextConfig.reminderText)) {
      setErrorMessage('提醒文案里含有不支持的字符，换成更简单的文字会更稳。')
      return
    }

    state.reminderConfig = nextConfig
    reminderStorage.setValue(nextConfig)
    void updateReminderConfigOnServer(nextConfig)
      .then((serverConfig) => {
        state.reminderConfig = serverConfig
        reminderStorage.setValue(serverConfig)
      })
      .catch(() => {
        // 保留本地提醒配置作为兜底。
      })
  }

  function triggerReminderToast(): void {
    showGentleToast({
      title: state.reminderConfig.reminderText,
      duration: 3000,
    })

    const currentKey = new Date().toISOString().slice(0, 10)
    updateReminderConfig({
      lastTriggeredDate: currentKey,
    })
  }

  function runReminderCheck(): void {
    if (shouldTriggerReminder(state.reminderConfig)) {
      triggerReminderToast()
    }
  }

  function startReminderPolling(): void {
    if (reminderTimer.value) {
      return
    }

    runReminderCheck()
    reminderTimer.value = setInterval(runReminderCheck, REMINDER_POLLING_INTERVAL_MS)
  }

  function stopReminderPolling(): void {
    if (!reminderTimer.value) {
      return
    }

    clearInterval(reminderTimer.value)
    reminderTimer.value = null
  }

  const hasWeatherData = computed(() => state.weather !== null)

  onMounted(() => {
    startReminderPolling()

    if (!reminderConfigRequest) {
      reminderConfigRequest = fetchReminderConfig()
    }

    void reminderConfigRequest
      .then((serverConfig) => {
        state.reminderConfig = serverConfig
        reminderStorage.setValue(serverConfig)
      })
      .catch(() => {
        // 后端不可用时继续使用本地提醒配置。
      })
      .finally(() => {
        reminderConfigRequest = null
      })

    if (state.city) {
      void refreshWeather(state.city)
      return
    }

    const fallbackCity = getFallbackCity()

    if (fallbackCity) {
      void refreshWeather(fallbackCity)
    }

    void ensureInitialLocationPermissionRequest()
  })

  instanceUseCount++

  onBeforeUnmount(() => {
    // 只有最后一个使用该单例的组件卸载时才真正停止轮询
    if (--instanceUseCount <= 0) {
      instanceUseCount = 0
      stopReminderPolling()
    }
  })

  return {
    state,
    hasWeatherData,
    locateCity,
    requestLocationPermissionAgain,
    ensureInitialLocationPermissionRequest,
    searchCities,
    setManualCity,
    refreshWeather,
    updateReminderConfig,
    startReminderPolling,
    stopReminderPolling,
  }
}

export function useLocationWeatherReminder() {
  if (!sharedInstance) {
    sharedInstance = createWeatherReminderInstance()
  }
  return sharedInstance
}
