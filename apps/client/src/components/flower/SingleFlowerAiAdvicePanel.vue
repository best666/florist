<script setup lang="ts">
import type { IPlantAiAdvice } from '@florist/contracts'
import { computed } from 'vue'
import type { LocalFlower } from '@/interfaces'
import { formatDateTime, getFlowerDisplayName } from '@/utils'
import SubmitBtn from '../app/SubmitBtn.vue'
import TagLabel from '../app/TagLabel.vue'

interface SingleFlowerAiAdvicePanelProps {
  flowers: ReadonlyArray<LocalFlower>
  selectedFlowerId: string | null
  flower: LocalFlower | null
  advice: IPlantAiAdvice | null
  loading: boolean
  message: string
  disabled: boolean
  isVip: boolean
  todayUsedCount: number
}

const props = defineProps<SingleFlowerAiAdvicePanelProps>()

const emit = defineEmits<{
  'update:selectedFlowerId': [value: string]
  generate: []
}>()

const DAILY_LIMIT_FREE = 1

const flowerName = computed(() =>
  props.flower ? getFlowerDisplayName(props.flower) : '这盆植物',
)

const pickerOptions = computed(() =>
  props.flowers.map((f) => getFlowerDisplayName(f)),
)

const pickerIndex = computed(() => {
  if (!props.selectedFlowerId) return -1
  return props.flowers.findIndex((f) => f.id === props.selectedFlowerId)
})

const dailyLimitReached = computed(() => !props.isVip && props.todayUsedCount >= DAILY_LIMIT_FREE)

const buttonText = computed(() => {
  if (props.loading) return '正在生成...'
  if (dailyLimitReached.value) return '今日次数已用完'
  return props.advice ? '重新问问 AI' : '生成 AI 建议'
})

const buttonDisabled = computed(() => props.loading || !props.flower || dailyLimitReached.value)

const statusLabel = computed(() => {
  if (props.loading) return '思考中'
  if (props.disabled) return '离线已暂停'
  if (props.advice) return '已准备好'
  return '待生成'
})

const statusTone = computed(() => {
  if (props.loading) return 'blush' as const
  if (props.disabled) return 'slate' as const
  if (props.advice) return 'mint' as const
  return 'slate' as const
})

const statusIcon = computed(() => {
  if (props.loading) return '◌'
  if (props.disabled) return '⏸'
  if (props.advice) return '✓'
  return '○'
})

function handlePickerChange(e: { detail: { value: number } }): void {
  const index = e.detail.value
  const flower = props.flowers[index]
  if (flower) {
    emit('update:selectedFlowerId', flower.id)
  }
}

function handleGenerate(): void {
  if (buttonDisabled.value) return
  emit('generate')
}
</script>

<template>
  <view class="card-soft rounded-[32rpx] dark:bg-slate-900">
    <!-- 植物选择器（无预选植株时显示） -->
    <view
      v-if="!props.flower"
      class="mb-4"
    >
      <text class="block text-2xs font-700 text-app-muted/70 dark:text-slate-400">选择植株</text>
      <picker
        class="mt-2"
        mode="selector"
        :range="pickerOptions"
        :value="pickerIndex"
        @change="handlePickerChange"
      >
        <view
          class="flex items-center justify-between rounded-[20rpx] bg-[var(--color-cream)]/40 px-4 py-3 dark:bg-slate-800"
        >
          <text class="text-sm text-app-ink dark:text-slate-200">
            {{ props.flowers.length > 0 ? '请选择一盆植株' : '暂无植株' }}
          </text>
          <text class="text-app-muted/50 dark:text-slate-400">▼</text>
        </view>
      </picker>
    </view>

    <!-- 每日使用次数提示 -->
    <view
      v-if="!props.isVip"
      class="mb-4 flex items-center gap-2 rounded-[16rpx] bg-amber-50/80 px-3 py-2 dark:bg-amber-500/10"
    >
      <text class="text-2xs text-amber-700 dark:text-amber-200">
        普通用户每日可用 {{ DAILY_LIMIT_FREE }} 次，今日已用 {{ props.todayUsedCount }} 次
      </text>
    </view>

    <view
      v-if="dailyLimitReached"
      class="mb-4 rounded-[22rpx] bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700 dark:bg-amber-500/14 dark:text-amber-100"
    >
      今日 AI 建议次数已用完，明天再来吧。开通会员可享无限次使用。
    </view>

    <!-- 状态标签 -->
    <view class="flex items-start justify-between gap-3">
      <view>
        <text class="block text-sm leading-6 text-app-muted dark:text-slate-300">
          只围绕 {{ flowerName }} 这一盆的专属建议：
        </text>
      </view>
      <TagLabel
        :text="statusLabel"
        :tone="statusTone"
        :icon="statusIcon"
        size="md"
      />
    </view>

    <!-- AI 建议内容 -->
    <view
      v-if="props.advice"
      class="mt-4 flex flex-col gap-4 rounded-[28rpx] bg-linear-to-br from-[#FFF8F0] via-white to-[#F5FCF8] px-2 py-4 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800"
    >
      <view>
        <text class="block text-lg font-800 text-app-ink dark:text-slate-100">
          {{ props.advice.summary }}
        </text>
        <text class="mt-1 block text-2xs leading-5 text-app-muted/70 dark:text-app-muted">
          {{ props.advice.season }}{{ props.advice.solarTerm ? ` · ${props.advice.solarTerm}` : '' }} · 更新于
          {{ formatDateTime(props.advice.generatedAt, { pattern: 'YYYY-MM-DD HH:mm' }) }}
        </text>
      </view>

      <view class="rounded-[24rpx] bg-[var(--color-surface)]/88 px-2 py-4 dark:bg-slate-900">
        <text class="block text-2xs text-app-muted/70 dark:text-app-muted">今日建议</text>
        <text class="mt-1 block text-sm leading-6 text-app-ink dark:text-slate-200">
          {{ props.advice.dailyAdvice }}
        </text>
      </view>

      <view class="grid grid-cols-2 gap-3">
        <view class="rounded-[24rpx] bg-[var(--color-surface)]/88 px-3 py-4 dark:bg-slate-900">
          <text class="block text-2xs text-app-muted/70 dark:text-app-muted">今天优先做</text>
          <view class="mt-2 flex flex-col gap-2">
            <text
              v-for="item in props.advice.focusActions"
              :key="item"
              class="text-sm leading-6 text-app-ink dark:text-slate-200"
            >
              {{ item }}
            </text>
          </view>
        </view>

        <view class="rounded-[24rpx] bg-[var(--color-surface)]/88 px-3 py-4 dark:bg-slate-900">
          <text class="block text-2xs text-app-muted/70 dark:text-app-muted">今天先别急着做</text>
          <view class="mt-2 flex flex-col gap-2">
            <text
              v-for="item in props.advice.forbiddenActions"
              :key="item"
              class="text-sm leading-6 text-app-ink dark:text-slate-200"
            >
              {{ item }}
            </text>
          </view>
        </view>
      </view>

      <view class="rounded-[24rpx] bg-[var(--color-surface)]/88 px-2 py-4 dark:bg-slate-900">
        <text class="block text-2xs text-app-muted/70 dark:text-app-muted">极端天气禁忌提醒</text>
        <view class="mt-2 flex flex-col gap-3">
          <view
            v-for="alert in props.advice.extremeWeatherAlerts"
            :key="alert.type"
            class="rounded-[18rpx] bg-app-ivory px-3 py-3 dark:bg-slate-800"
          >
            <text class="block text-sm font-700 text-app-ink dark:text-slate-100">{{ alert.title }}</text>
            <text class="mt-1 block text-sm leading-6 text-app-muted dark:text-slate-300">{{
              alert.description
            }}</text>
          </view>
          <text
            v-if="props.advice.extremeWeatherAlerts.length === 0"
            class="text-sm leading-6 text-app-muted dark:text-slate-300"
          >
            今天天气不算极端，可以按稳定节奏照顾它，不必太紧张。
          </text>
        </view>
      </view>

      <view
        v-if="props.message"
        class="rounded-[22rpx] bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700 dark:bg-amber-500/14 dark:text-amber-100"
      >
        {{ props.message }}
      </view>
    </view>

    <!-- 未生成时的占位提示 -->
    <view
      v-else-if="!props.loading"
      class="mt-4 rounded-[28rpx] bg-app-ivory/90 px-4 py-4 text-sm leading-6 text-app-muted dark:bg-slate-800 dark:text-slate-300"
    >
      {{
        props.message ||
        (props.disabled
          ? '当前离线，AI 建议先暂停一下。你可以先看盆土、叶片和今天的天气提示。'
          : props.flower
            ? `点击下方按钮，我会按天气、摆放位置和 ${flowerName} 的历史养护记录，给出一份更具体的建议。`
            : '先在上方选择一盆植株，再点击按钮生成专属养护建议。')
      }}
    </view>

    <!-- 生成按钮 -->
    <view class="mt-4">
      <SubmitBtn
        :text="buttonText"
        variant="mint"
        :disabled="buttonDisabled"
        :loading="props.loading"
        @click="handleGenerate"
      />
    </view>
  </view>
</template>
