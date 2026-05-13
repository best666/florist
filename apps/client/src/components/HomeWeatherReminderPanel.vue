<script setup lang="ts">
import type { IAiAdvice } from '@florist/contracts'
import { computed } from 'vue'
import type {
  CityOption,
  LocalFlower,
  UseLocationWeatherReminderState,
  WeatherCareTip,
} from '@/interfaces'
import { buildFlowerWeatherContextTips, formatDateTime } from '@/utils'
import TagLabel from './TagLabel.vue'

interface WeatherMetricItem {
  readonly key: string
  readonly label: string
  readonly value: string
  readonly accentClass: string
}

interface HomeWeatherReminderPanelProps {
  state: UseLocationWeatherReminderState
  flowers: ReadonlyArray<LocalFlower>
  aiAdvice: IAiAdvice | null
  loadingAiAdvice: boolean
}

const props = defineProps<HomeWeatherReminderPanelProps>()

const emit = defineEmits<{
  locate: []
  'open-permission': []
  'search-city': [keyword: string]
  'select-city': [city: CityOption]
  'toggle-reminder': []
  'update-reminder-hour': [value: number]
  'update-reminder-minute': [value: number]
  'update-quiet-start-hour': [value: number]
  'update-quiet-end-hour': [value: number]
  'update-reminder-text': [value: string]
}>()

const cityDisplayName = computed(() => {
  if (!props.state.city) {
    return '还没选城市'
  }

  return props.state.city.admin1
    ? `${props.state.city.name} · ${props.state.city.admin1}`
    : props.state.city.name
})

const weatherMetrics = computed<ReadonlyArray<WeatherMetricItem>>(() => {
  if (!props.state.weather) {
    return []
  }

  return [
    {
      key: 'temperature',
      label: '气温',
      value: `${Math.round(props.state.weather.temperature)}°C`,
      accentClass: 'from-[#FFD7B8] to-[#FFF1D6]',
    },
    {
      key: 'humidity',
      label: '湿度',
      value: `${props.state.weather.humidity}%`,
      accentClass: 'from-[#BCEFE6] to-[#E4FFF9]',
    },
    {
      key: 'precipitation',
      label: '降水',
      value: `${props.state.weather.precipitationProbability}%`,
      accentClass: 'from-[#CFE5FF] to-[#EDF5FF]',
    },
    {
      key: 'wind',
      label: '风速',
      value: `${props.state.weather.windSpeed} km/h`,
      accentClass: 'from-[#F8CADB] to-[#FFF0F5]',
    },
  ]
})

const reminderTimeText = computed(() => (
  `${String(props.state.reminderConfig.reminderHour).padStart(2, '0')}:${String(props.state.reminderConfig.reminderMinute).padStart(2, '0')}`
))

const quietHoursText = computed(() => {
  const config = props.state.reminderConfig.quietHours

  return `${String(config.startHour).padStart(2, '0')}:${String(config.startMinute).padStart(2, '0')} - ${String(config.endHour).padStart(2, '0')}:${String(config.endMinute).padStart(2, '0')}`
})

const contextualTips = computed(() => buildFlowerWeatherContextTips(props.flowers, props.state.weather))

const mergedTips = computed<ReadonlyArray<WeatherCareTip>>(() => [
  ...props.state.weatherTips,
  ...contextualTips.value,
])

function emitSearchCity(event: { detail: { value: string } }): void {
  emit('search-city', event.detail.value)
}

function emitReminderHour(event: { detail: { value: string } }): void {
  emit('update-reminder-hour', Number(event.detail.value || 0))
}

function emitReminderMinute(event: { detail: { value: string } }): void {
  emit('update-reminder-minute', Number(event.detail.value || 0))
}

function emitQuietStartHour(event: { detail: { value: string } }): void {
  emit('update-quiet-start-hour', Number(event.detail.value || 0))
}

function emitQuietEndHour(event: { detail: { value: string } }): void {
  emit('update-quiet-end-hour', Number(event.detail.value || 0))
}

function emitReminderText(event: { detail: { value: string } }): void {
  emit('update-reminder-text', event.detail.value)
}
</script>

<template>
  <view class="card-soft rounded-[32rpx] dark:bg-slate-900">
    <view class="flex items-start justify-between gap-3">
      <view>
        <text class="block text-base font-800 text-slate-800 dark:text-slate-100">
          今日天气与提醒
        </text>
        <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
          自动定位或手动选城市，缓存今日天气，并把本地提醒安静地安排好。
        </text>
      </view>
      <TagLabel :text="props.state.weather?.weatherText ?? '等待天气'" tone="mint" />
    </view>

    <view
      class="mt-4 rounded-[28rpx] bg-linear-to-br from-[#F7FBFF] via-white to-[#FFF8F1] p-4 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
      <view class="flex items-center justify-between gap-3">
        <view>
          <text class="block text-lg font-800 text-slate-800 dark:text-slate-100">
            {{ cityDisplayName }}
          </text>
          <text class="mt-1 block text-sm text-slate-500 dark:text-slate-300">
            {{ props.state.weather
              ? `更新时间 ${formatDateTime(props.state.weather.fetchedAt, { pattern: 'YYYY-MM-DD HH:mm' })}`
              : '还没有拉到天气，先定位或选城市。' }}
          </text>
        </view>

        <view class="flex flex-wrap justify-end gap-2">
          <button class="h-9 rounded-full border-none bg-app-mint px-4 text-2xs font-700 text-slate-700"
            :class="props.state.loadingLocation ? 'opacity-60' : ''" hover-class="opacity-92" @tap="emit('locate')">
            {{ props.state.loadingLocation ? '定位中' : '重新定位' }}
          </button>
          <button v-if="props.state.locationDenied"
            class="h-9 rounded-full border-none bg-app-blush px-4 text-2xs font-700 text-slate-700"
            hover-class="opacity-92" @tap="emit('open-permission')">
            去开权限
          </button>
        </view>
      </view>

      <view v-if="props.state.latestErrorMessage"
        class="mt-3 rounded-[22rpx] bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700 dark:bg-amber-500/14 dark:text-amber-100">
        {{ props.state.latestErrorMessage }}
      </view>

      <view v-if="weatherMetrics.length > 0" class="mt-4 grid grid-cols-2 gap-3">
        <view v-for="metric in weatherMetrics" :key="metric.key"
          class="rounded-[24rpx] bg-white/90 px-4 py-4 shadow-[0_10rpx_22rpx_rgba(148,163,184,0.08)] dark:bg-slate-900">
          <view class="h-2 w-12 rounded-full bg-linear-to-r" :class="metric.accentClass" />
          <text class="mt-3 block text-2xs text-slate-400 dark:text-slate-500">
            {{ metric.label }}
          </text>
          <text class="mt-1 block text-lg font-800 text-slate-800 dark:text-slate-100">
            {{ metric.value }}
          </text>
        </view>
      </view>

      <view class="mt-4 flex flex-col gap-3">
        <view v-for="tip in mergedTips" :key="tip.id" class="rounded-[24rpx] bg-white/88 px-4 py-4 dark:bg-slate-900">
          <text class="block text-sm font-700 text-slate-800 dark:text-slate-100">
            {{ tip.title }}
          </text>
          <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
            {{ tip.description }}
          </text>
        </view>
      </view>

      <view class="mt-4 rounded-[24rpx] bg-white/88 px-4 py-4 dark:bg-slate-900">
        <view class="flex items-center justify-between gap-3">
          <text class="block text-sm font-700 text-slate-800 dark:text-slate-100">
            AI 养护建议
          </text>
          <TagLabel :text="props.loadingAiAdvice ? '生成中' : '已就绪'" tone="blush" />
        </view>

        <view v-if="props.aiAdvice" class="mt-3 flex flex-col gap-3">
          <view>
            <text class="block text-2xs text-slate-400 dark:text-slate-500">今日建议</text>
            <text class="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">
              {{ props.aiAdvice.dailyAdvice }}
            </text>
          </view>
          <view>
            <text class="block text-2xs text-slate-400 dark:text-slate-500">节奏建议</text>
            <text class="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">
              {{ props.aiAdvice.seasonalAdvice }}
            </text>
          </view>
          <view class="flex flex-wrap gap-2">
            <TagLabel v-for="tip in props.aiAdvice.warningTips" :key="tip" :text="tip" tone="cream" />
          </view>
        </view>

        <text v-else class="mt-3 block text-sm leading-6 text-slate-500 dark:text-slate-300">
          暂时还没有可用的 AI 建议，先用天气提示安排今天的巡园节奏。
        </text>
      </view>
    </view>

    <view class="mt-4 rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
      <view class="flex items-center justify-between gap-3">
        <view>
          <text class="block text-sm font-700 text-slate-700 dark:text-slate-100">
            手动选择城市
          </text>
          <text class="mt-1 block text-2xs leading-5 text-slate-400 dark:text-slate-500">
            定位不方便时，直接搜城市或选常用城市也可以。
          </text>
        </view>
        <TagLabel :text="props.state.searchingCity ? '搜索中' : `${props.state.citySearchResults.length} 个候选`"
          tone="slate" />
      </view>

      <input :value="props.state.citySearchKeyword" placeholder="输入城市名，例如 杭州"
        class="mt-3 h-11 rounded-[22rpx] bg-white px-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-100"
        @input="emitSearchCity">

      <scroll-view scroll-x class="mt-3 whitespace-nowrap">
        <view class="flex items-center gap-2 pb-1">
          <button v-for="city in props.state.citySearchResults" :key="city.id"
            class="h-10 rounded-full border-none px-4 text-2xs font-700"
            :class="props.state.city?.id === city.id ? 'bg-app-mint text-slate-700' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'"
            hover-class="opacity-92" @tap="emit('select-city', city)">
            {{ city.name }}{{ city.admin1 ? ` · ${city.admin1}` : '' }}
          </button>
        </view>
      </scroll-view>
    </view>

    <view class="mt-4 rounded-[28rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
      <view class="flex items-center justify-between gap-3">
        <view>
          <text class="block text-sm font-700 text-slate-700 dark:text-slate-100">
            本地提醒与夜间免打扰
          </text>
          <text class="mt-1 block text-2xs leading-5 text-slate-400 dark:text-slate-500">
            当前提醒时间 {{ reminderTimeText }}，免打扰 {{ quietHoursText }}。
          </text>
        </view>

        <button class="h-9 rounded-full border-none px-4 text-2xs font-700"
          :class="props.state.reminderConfig.enabled ? 'bg-app-mint text-slate-700' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'"
          hover-class="opacity-92" @tap="emit('toggle-reminder')">
          {{ props.state.reminderConfig.enabled ? '提醒已开启' : '开启提醒' }}
        </button>
      </view>

      <view class="mt-4 grid grid-cols-2 gap-3">
        <view class="rounded-[24rpx] bg-white px-4 py-4 dark:bg-slate-900">
          <text class="block text-2xs text-slate-400 dark:text-slate-500">提醒小时</text>
          <input :value="String(props.state.reminderConfig.reminderHour)" type="number"
            class="mt-2 h-10 rounded-[18rpx] bg-app-ivory px-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-100"
            @input="emitReminderHour">
        </view>
        <view class="rounded-[24rpx] bg-white px-4 py-4 dark:bg-slate-900">
          <text class="block text-2xs text-slate-400 dark:text-slate-500">提醒分钟</text>
          <input :value="String(props.state.reminderConfig.reminderMinute)" type="number"
            class="mt-2 h-10 rounded-[18rpx] bg-app-ivory px-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-100"
            @input="emitReminderMinute">
        </view>
        <view class="rounded-[24rpx] bg-white px-4 py-4 dark:bg-slate-900">
          <text class="block text-2xs text-slate-400 dark:text-slate-500">免打扰开始小时</text>
          <input :value="String(props.state.reminderConfig.quietHours.startHour)" type="number"
            class="mt-2 h-10 rounded-[18rpx] bg-app-ivory px-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-100"
            @input="emitQuietStartHour">
        </view>
        <view class="rounded-[24rpx] bg-white px-4 py-4 dark:bg-slate-900">
          <text class="block text-2xs text-slate-400 dark:text-slate-500">免打扰结束小时</text>
          <input :value="String(props.state.reminderConfig.quietHours.endHour)" type="number"
            class="mt-2 h-10 rounded-[18rpx] bg-app-ivory px-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-100"
            @input="emitQuietEndHour">
        </view>
      </view>

      <view class="mt-3 rounded-[24rpx] bg-white px-4 py-4 dark:bg-slate-900">
        <text class="block text-2xs text-slate-400 dark:text-slate-500">提醒文案</text>
        <textarea :value="props.state.reminderConfig.reminderText" :maxlength="50" auto-height
          class="mt-2 min-h-[120rpx] rounded-[18rpx] bg-app-ivory px-3 py-3 text-sm leading-6 text-slate-700 dark:bg-slate-800 dark:text-slate-100"
          placeholder="写一段温柔提醒自己看看小植物的话。" @input="emitReminderText" />
      </view>
    </view>
  </view>
</template>
