<script setup lang="ts">
import type { IPlantAiAdvice } from '@florist/contracts'
import { computed } from 'vue'
import type { LocalFlower } from '@/interfaces'
import { formatDateTime, getFlowerDisplayName } from '@/utils'
import SubmitBtn from './SubmitBtn.vue'
import TagLabel from './TagLabel.vue'

interface SingleFlowerAiAdvicePanelProps {
  flower: LocalFlower | null
  advice: IPlantAiAdvice | null
  loading: boolean
  message: string
  disabled: boolean
}

const props = defineProps<SingleFlowerAiAdvicePanelProps>()

const emit = defineEmits<{
  refresh: []
}>()

const flowerName = computed(() => (props.flower ? getFlowerDisplayName(props.flower) : '这盆植物'))
</script>

<template>
  <view class="card-soft rounded-[32rpx] dark:bg-slate-900">
    <view class="flex items-start justify-between gap-3">
      <view>
        <text class="block text-base font-800 text-app-ink dark:text-slate-100"> 单株 AI 养护建议 </text>
        <text class="mt-1 block text-sm leading-6 text-app-muted dark:text-slate-300">
          只围绕 {{ flowerName }} 这一盆来想，语气轻一点，动作也会更具体一点。
        </text>
      </view>
      <TagLabel
        :text="props.loading ? '思考中' : props.disabled ? '离线已暂停' : '已准备好'"
        :tone="props.loading ? 'blush' : props.disabled ? 'slate' : 'mint'"
        :icon="props.loading ? '◌' : props.disabled ? '⏸' : '✓'"
        size="md"
      />
    </view>

    <view
      v-if="props.advice"
      class="mt-4 flex flex-col gap-4 rounded-[28rpx] bg-linear-to-br from-[#FFF8F0] via-white to-[#F5FCF8] dark:from-slate-800 dark:via-slate-900 dark:to-slate-800"
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
        <view class="rounded-[24rpx] bg-[var(--color-surface)]/88 py-4 dark:bg-slate-900">
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

        <view class="rounded-[24rpx] bg-[var(--color-surface)]/88 py-4 dark:bg-slate-900">
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

      <view class="rounded-[24rpx] bg-[var(--color-surface)]/88 py-4 dark:bg-slate-900">
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

    <view
      v-else
      class="mt-4 rounded-[28rpx] bg-app-ivory/90 px-4 py-4 text-sm leading-6 text-app-muted dark:bg-slate-800 dark:text-slate-300"
    >
      {{
        props.message ||
        (props.disabled
          ? '当前离线，AI 建议先暂停一下。你可以先看盆土、叶片和今天的天气提示。'
          : '选中一盆植物后，我会按天气、摆放位置和历史养护记录，给出一份更具体的建议。')
      }}
    </view>

    <view class="mt-4">
      <SubmitBtn
        text="重新问问 AI"
        variant="mint"
        :disabled="props.loading || !props.flower"
        @click="emit('refresh')"
      />
    </view>
  </view>
</template>
