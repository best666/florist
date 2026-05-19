<script setup lang="ts">
import type { IAiAdvice } from '@florist/contracts'
import { computed, ref } from 'vue'
import type { CityOption, LocalFlower, UseLocationWeatherReminderState, WeatherCareTip } from '@/interfaces'
import { DEFAULT_CITY_OPTIONS, formatCityDisplayName } from '@/interfaces'
import { buildFlowerWeatherContextTips, formatDateTime } from '@/utils'
import TagLabel from './TagLabel.vue'

const showReminderSettings = ref(false)

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
  aiAdviceMessage: string
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
  return formatCityDisplayName(
    props.state.city ?? props.state.weather?.city ?? DEFAULT_CITY_OPTIONS[0] ?? null,
  )
})

const weatherTagText = computed(() => props.state.weather?.weatherText ?? '等待天气')

const weatherUpdateText = computed(() => {
  if (!props.state.weather) {
    return '还没有拉到天气，先定位或选城市。'
  }
  return `更新时间 ${formatDateTime(props.state.weather.fetchedAt, { pattern: 'YYYY-MM-DD HH:mm' })}`
})

function formatCandidateCity(city: CityOption): string {
  return formatCityDisplayName(city)
}

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

const reminderTimeText = computed(
  () =>
    `${String(props.state.reminderConfig.reminderHour).padStart(2, '0')}:${String(props.state.reminderConfig.reminderMinute).padStart(2, '0')}`,
)

const quietHoursText = computed(() => {
  const config = props.state.reminderConfig.quietHours

  return `${String(config.startHour).padStart(2, '0')}:${String(config.startMinute).padStart(2, '0')} - ${String(config.endHour).padStart(2, '0')}:${String(config.endMinute).padStart(2, '0')}`
})

const contextualTips = computed(() => buildFlowerWeatherContextTips(props.flowers, props.state.weather))

const mergedTips = computed<ReadonlyArray<WeatherCareTip>>(() => [
  ...props.state.weatherTips,
  ...contextualTips.value,
])

function isSelectedCity(candidate: CityOption): boolean {
  return props.state.city?.id === candidate.id
}

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
    <!-- Header: City + Weather tag + Update time -->
    <view class="flex items-start justify-between gap-3">
      <view class="min-w-0 flex-1">
        <text class="block text-base font-800 leading-6 text-slate-800 dark:text-slate-100">
          {{ cityDisplayName }}
        </text>
        <text class="mt-0.5 block text-2xs leading-5 text-slate-400 dark:text-slate-500">
          {{ weatherUpdateText }}
        </text>
      </view>
      <TagLabel
        :text="weatherTagText"
        tone="mint"
      />
    </view>

    <!-- Location actions -->
    <view class="mt-3 flex items-center gap-2">
      <button
        class="btn-pill-sm flex-none gap-1.5 px-3 text-2xs text-slate-700 bg-app-mint"
        :class="props.state.loadingLocation ? 'opacity-60' : ''"
        hover-class="opacity-92"
        @tap="emit('locate')"
      >
        <view
          class="flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-[20rpx] text-slate-700"
        >
          ⌖
        </view>
        <text>{{ props.state.loadingLocation ? '定位中' : '重新定位' }}</text>
      </button>
      <button
        v-if="props.state.locationDenied"
        class="btn-pill-sm flex-none gap-1.5 px-3 text-2xs text-slate-700 bg-app-blush"
        hover-class="opacity-92"
        @tap="emit('open-permission')"
      >
        <view
          class="flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-[20rpx] text-slate-700"
        >
          ⚙
        </view>
        <text>去开权限</text>
      </button>
    </view>

    <!-- Error banner -->
    <view
      v-if="props.state.latestErrorMessage"
      class="mt-3 rounded-[22rpx] bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700 dark:bg-amber-500/14 dark:text-amber-100"
    >
      {{ props.state.latestErrorMessage }}
    </view>

    <!-- Weather metrics -->
    <view
      v-if="weatherMetrics.length > 0"
      class="mt-4 grid grid-cols-2 gap-3"
    >
      <view
        v-for="metric in weatherMetrics"
        :key="metric.key"
        class="rounded-[24rpx] bg-slate-50/80 px-4 py-4 dark:bg-slate-800/60"
      >
        <view
          class="h-2 w-12 rounded-full bg-linear-to-r"
          :class="metric.accentClass"
        />
        <text class="mt-3 block text-2xs text-slate-400 dark:text-slate-500">
          {{ metric.label }}
        </text>
        <text class="mt-1 block text-lg font-800 text-slate-800 dark:text-slate-100">
          {{ metric.value }}
        </text>
      </view>
    </view>

    <!-- Divider -->
    <view
      v-if="mergedTips.length > 0 && weatherMetrics.length > 0"
      class="mt-4 h-[1rpx] bg-slate-100 dark:bg-slate-800"
    />

    <!-- Care tips -->
    <view
      v-if="mergedTips.length > 0"
      class="mt-4 flex flex-col gap-2.5"
    >
      <view
        v-for="tip in mergedTips"
        :key="tip.id"
        class="rounded-[24rpx] bg-slate-50/80 px-4 py-4 dark:bg-slate-800/60"
      >
        <text class="block text-sm font-700 text-slate-800 dark:text-slate-100">
          {{ tip.title }}
        </text>
        <text class="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-300">
          {{ tip.description }}
        </text>
      </view>
    </view>

    <!-- AI advice (distinct accent card) -->
    <view
      class="mt-4 overflow-hidden rounded-[24rpx] border border-[#B8E6D8]/60 bg-[#F2FAF7] dark:border-slate-700 dark:bg-slate-800/60"
    >
      <view class="flex items-center justify-between gap-3 px-4 pt-4">
        <text class="text-sm font-700 text-slate-800 dark:text-slate-100"> AI 养护建议 </text>
        <TagLabel
          :text="props.loadingAiAdvice ? '生成中' : '已就绪'"
          :tone="props.loadingAiAdvice ? 'blush' : 'mint'"
          :icon="props.loadingAiAdvice ? '◌' : '✓'"
          size="md"
        />
      </view>

      <view
        v-if="props.aiAdvice"
        class="px-4 pb-4 pt-3 flex flex-col gap-3"
      >
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
          <TagLabel
            v-for="tip in props.aiAdvice.warningTips"
            :key="tip"
            :text="tip"
            tone="cream"
          />
        </view>
      </view>

      <text
        v-else
        class="block px-4 pb-4 pt-3 text-sm leading-6 text-slate-500 dark:text-slate-300"
      >
        {{ props.aiAdviceMessage || '暂时还没有可用的 AI 建议，先用天气提示安排今天的巡园节奏。' }}
      </text>
    </view>

    <!-- City search (only when no city selected) -->
    <view
      v-if="!props.state.city"
      class="mt-4 rounded-[24rpx] bg-app-ivory/90 p-4 dark:bg-slate-800"
    >
      <view class="flex items-center justify-between gap-3">
        <view>
          <text class="block text-sm font-700 text-slate-700 dark:text-slate-100"> 手动选择城市 </text>
          <text class="mt-1 block text-2xs leading-5 text-slate-400 dark:text-slate-500">
            定位不方便时，直接搜城市或选常用城市也可以。
          </text>
        </view>
        <TagLabel
          :text="props.state.searchingCity ? '搜索中' : `${props.state.citySearchResults.length} 个候选`"
          tone="slate"
        />
      </view>

      <input
        :value="props.state.citySearchKeyword"
        placeholder="输入城市名，例如 杭州"
        class="field-input-md mt-3 dark:bg-slate-900 dark:text-slate-100"
        @input="emitSearchCity"
      />

      <scroll-view
        scroll-x
        class="mt-3 whitespace-nowrap"
      >
        <view class="flex items-center gap-2 pb-1">
          <button
            v-for="candidate in props.state.citySearchResults"
            :key="candidate.id"
            class="btn-chip h-[68rpx] min-h-[68rpx] px-4 text-2xs"
            :class="
              isSelectedCity(candidate)
                ? 'bg-app-mint text-slate-700'
                : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'
            "
            hover-class="opacity-92"
            @tap="emit('select-city', candidate)"
          >
            {{ formatCandidateCity(candidate) }}
          </button>
        </view>
      </scroll-view>
    </view>

    <!-- Reminder settings (collapsible) -->
    <view class="mt-4 rounded-[24rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
      <view
        class="flex items-center justify-between gap-3"
        @tap="showReminderSettings = !showReminderSettings"
      >
        <view class="flex items-center gap-2">
          <text class="text-sm font-700 text-slate-700 dark:text-slate-100"> 本地提醒与夜间免打扰 </text>
          <text
            class="text-lg text-slate-400 transition-transform duration-200"
            :class="showReminderSettings ? 'rotate-90' : ''"
            >›</text
          >
        </view>

        <button
          class="btn-pill-sm"
          :class="
            props.state.reminderConfig.enabled
              ? 'bg-app-mint text-slate-700'
              : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-200'
          "
          hover-class="opacity-92"
          @tap.stop="emit('toggle-reminder')"
        >
          {{ props.state.reminderConfig.enabled ? '提醒已开启' : '开启提醒' }}
        </button>
      </view>

      <text class="mt-1 block text-2xs leading-5 text-slate-400 dark:text-slate-500">
        当前提醒时间 {{ reminderTimeText }}，免打扰 {{ quietHoursText }}。
      </text>

      <view
        v-if="showReminderSettings"
        class="mt-4 grid grid-cols-2 gap-3"
      >
        <view class="rounded-[24rpx] bg-white px-4 py-4 dark:bg-slate-900">
          <text class="block text-2xs text-slate-400 dark:text-slate-500">提醒小时</text>
          <input
            :value="String(props.state.reminderConfig.reminderHour)"
            type="number"
            class="field-input-sm mt-2 bg-app-ivory dark:bg-slate-800 dark:text-slate-100"
            @input="emitReminderHour"
          />
        </view>
        <view class="rounded-[24rpx] bg-white px-4 py-4 dark:bg-slate-900">
          <text class="block text-2xs text-slate-400 dark:text-slate-500">提醒分钟</text>
          <input
            :value="String(props.state.reminderConfig.reminderMinute)"
            type="number"
            class="field-input-sm mt-2 bg-app-ivory dark:bg-slate-800 dark:text-slate-100"
            @input="emitReminderMinute"
          />
        </view>
        <view class="rounded-[24rpx] bg-white px-4 py-4 dark:bg-slate-900">
          <text class="block text-2xs text-slate-400 dark:text-slate-500">免打扰开始小时</text>
          <input
            :value="String(props.state.reminderConfig.quietHours.startHour)"
            type="number"
            class="field-input-sm mt-2 bg-app-ivory dark:bg-slate-800 dark:text-slate-100"
            @input="emitQuietStartHour"
          />
        </view>
        <view class="rounded-[24rpx] bg-white px-4 py-4 dark:bg-slate-900">
          <text class="block text-2xs text-slate-400 dark:text-slate-500">免打扰结束小时</text>
          <input
            :value="String(props.state.reminderConfig.quietHours.endHour)"
            type="number"
            class="field-input-sm mt-2 bg-app-ivory dark:bg-slate-800 dark:text-slate-100"
            @input="emitQuietEndHour"
          />
        </view>
      </view>

      <view
        v-if="showReminderSettings"
        class="mt-3 rounded-[24rpx] bg-white px-4 py-4 dark:bg-slate-900"
      >
        <text class="block text-2xs text-slate-400 dark:text-slate-500">提醒文案</text>
        <textarea
          :value="props.state.reminderConfig.reminderText"
          :maxlength="50"
          auto-height
          class="field-textarea mt-2 min-h-[120rpx] rounded-[18rpx] bg-app-ivory px-3 dark:bg-slate-800 dark:text-slate-100"
          placeholder="写一段温柔提醒自己看看小植物的话。"
          @input="emitReminderText"
        />
      </view>
    </view>
  </view>
</template>
