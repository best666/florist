<script setup lang="ts">
import { useBottomSheetGesture } from '@/hooks/useBottomSheetGesture'
import CloseButton from './app/CloseButton.vue'

export interface CarePromptAction {
  readonly key: string
  readonly label: string
  readonly description: string
  readonly icon: string
  readonly accentClass: string
}

interface CarePromptDrawerProps {
  modelValue: boolean
  title: string
  description: string
  actions: ReadonlyArray<CarePromptAction>
}

const props = defineProps<CarePromptDrawerProps>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [key: string]
}>()

function close(): void {
  emit('update:modelValue', false)
}

const { handleTouchEnd, handleTouchMove, handleTouchStart, maskMotionStyle, panelMotionStyle } =
  useBottomSheetGesture({
    visible: () => props.modelValue,
    onClose: close,
    closeThreshold: 96,
    hiddenOffset: 56,
  })

function handleSelect(key: string): void {
  emit('select', key)
  close()
}
</script>

<template>
  <view
    class="fixed inset-0 z-60 flex items-end justify-center bg-slate-900/28 px-5 pb-8 pt-10 backdrop-blur-[6rpx]"
    :class="props.modelValue ? 'pointer-events-auto' : 'pointer-events-none'"
    :style="maskMotionStyle"
    @tap="close"
  >
    <view
      class="relative w-full max-w-[720rpx] rounded-[36rpx] bg-[var(--color-surface)] px-5 py-5 shadow-[0_18rpx_60rpx_rgba(15,23,42,0.18)] dark:bg-slate-900"
      :style="panelMotionStyle"
      @tap.stop="() => {}"
    >
      <view
        @touchstart.stop="handleTouchStart"
        @touchmove.stop.prevent="handleTouchMove"
        @touchend.stop="handleTouchEnd"
        @touchcancel.stop="handleTouchEnd"
      >
        <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />

        <view class="mb-5">
          <text class="block text-lg font-800 text-app-ink dark:text-slate-100">
            {{ props.title }}
          </text>
          <text class="mt-2 block text-sm leading-6 text-app-muted dark:text-slate-300">
            {{ props.description }}
          </text>
        </view>
        <CloseButton @click="close" />

        <view class="flex flex-col gap-3">
          <button
            v-for="action in props.actions"
            :key="action.key"
            class="flex items-center gap-4 rounded-[24rpx] bg-slate-50 p-4 text-left dark:bg-slate-800"
            hover-class="opacity-92"
            @tap="handleSelect(action.key)"
          >
            <view
              class="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-linear-to-br text-xl"
              :class="action.accentClass"
            >
              {{ action.icon }}
            </view>
            <view class="min-w-0 flex-1">
              <text class="block text-sm font-700 text-app-ink dark:text-slate-100">
                {{ action.label }}
              </text>
              <text class="mt-0.5 block text-2xs leading-5 text-app-muted/70 dark:text-app-muted">
                {{ action.description }}
              </text>
            </view>
            <text class="text-lg text-slate-300 dark:text-app-muted">›</text>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>
