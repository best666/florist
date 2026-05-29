<script setup lang="ts">
import type { IAiChatResponse } from '@florist/contracts'
import type { LocalFlower, WeatherSnapshot } from '@/interfaces'
import { computed, ref, watch } from 'vue'
import { fetchAiChat } from '@/api'
import { useFreeTierLimits } from '@/hooks/useFreeTierLimits'

interface Props {
  visible: boolean
  weather: WeatherSnapshot | null
  flowers?: ReadonlyArray<LocalFlower>
  flower?: LocalFlower | null
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

const freeTier = useFreeTierLimits()
const question = ref('')
const loading = ref(false)
const response = ref<IAiChatResponse | null>(null)
const errorMessage = ref('')

const canAsk = computed(() =>
  !freeTier.consultationExceeded.value && question.value.trim().length >= 3 && !loading.value,
)

const remainingText = computed(() =>
  freeTier.consultationExceeded.value
    ? `今日 AI 咨询次数已用完（${freeTier.consultationRemaining.value} 次剩余）`
    : `今日还可咨询 ${freeTier.consultationRemaining.value} 次`,
)

watch(() => props.visible, (v) => {
  if (!v) {
    question.value = ''
    response.value = null
    errorMessage.value = ''
  }
})

async function handleSubmit(): Promise<void> {
  if (!canAsk.value) return

  loading.value = true
  errorMessage.value = ''

  try {
    const result = await fetchAiChat({
      question: question.value.trim(),
      ...(props.weather ? { weather: props.weather } : {}),
      ...(props.flower ? { flower: props.flower } : {}),
      ...(props.flowers ? { flowers: props.flowers } : {}),
    })
    response.value = result
    freeTier.recordConsultationUse()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'AI 暂时没有回应，稍后再试试。'
  } finally {
    loading.value = false
  }
}

function handleClose(): void {
  emit('update:visible', false)
}
</script>

<template>
  <view
    v-if="visible"
    class="fixed inset-0 z-60 flex items-end justify-center bg-slate-900/32 px-5 pb-8 pt-10 backdrop-blur-[6rpx]"
    @tap="handleClose"
  >
    <view
      class="w-full max-w-[720rpx] rounded-[36rpx] bg-[var(--color-surface)] px-5 py-5 shadow-[0_18rpx_60rpx_rgba(15,23,42,0.18)]"
      @tap.stop="() => {}"
    >
      <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200" />

      <view class="mb-4 flex items-center justify-between gap-3">
        <view>
          <text class="block text-base font-800 text-app-ink">
            {{ props.flower ? '问问这株植物的 AI 顾问' : '问问花园 AI 顾问' }}
          </text>
          <text class="mt-1 block text-xs text-app-muted">{{ remainingText }}</text>
        </view>
        <button
          class="h-10 w-10 flex items-center justify-center rounded-full border-none bg-slate-100 text-lg text-app-muted"
          hover-class="opacity-92"
          @tap="handleClose"
        >
          ×
        </button>
      </view>

      <!-- AI 回复 -->
      <view
        v-if="response"
        class="mb-4 rounded-[24rpx] bg-[var(--color-cream)]/50 px-4 py-4"
      >
        <text class="block text-2xs text-app-muted/70">AI 回复</text>
        <text class="mt-2 block text-sm leading-7 text-app-ink">{{ response.answer }}</text>
      </view>

      <!-- 错误 -->
      <view
        v-if="errorMessage"
        class="mb-4 rounded-[24rpx] bg-[var(--color-blush)]/15 px-4 py-3 text-sm leading-6 text-[var(--color-ink)]"
      >
        {{ errorMessage }}
      </view>

      <!-- 输入区 -->
      <view class="flex items-stretch gap-3">
        <textarea
          v-model="question"
          class="field-textarea min-h-[100rpx] flex-1 rounded-[24rpx] bg-[var(--color-cream)]/50 px-4 py-3 text-sm leading-6 text-app-ink"
          :maxlength="200"
          auto-height
          :disabled="freeTier.consultationExceeded.value"
          placeholder="例如：我的龟背竹最近叶子有点发黄，该怎么办？"
        />
        <button
          class="btn-base h-[100rpx] min-h-[100rpx] w-[120rpx] flex-none rounded-[24rpx] text-sm font-700"
          :class="canAsk ? 'bg-[var(--color-mint)] text-app-ink' : 'bg-slate-100 text-app-muted/60'"
          :disabled="!canAsk"
          :loading="loading"
          hover-class="opacity-92"
          @tap="handleSubmit"
        >
          {{ loading ? '...' : (response ? '再问' : '发送') }}
        </button>
      </view>
    </view>
  </view>
</template>
