<script setup lang="ts">
import { useBottomSheetGesture } from '@/hooks/useBottomSheetGesture'
import ActionHintButton from './ActionHintButton.vue'
import CloseButton from './app/CloseButton.vue'

interface HomeQuickDrawerAction {
  readonly key: string
  readonly title: string
  readonly hint: string
  readonly icon: string
}

interface HomeQuickDrawerProps {
  modelValue: boolean
  actions: ReadonlyArray<HomeQuickDrawerAction>
}

const props = defineProps<HomeQuickDrawerProps>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [key: string]
}>()

function closeDrawer(): void {
  emit('update:modelValue', false)
}

const {
  handleTouchEnd,
  handleTouchMove,
  handleTouchStart,
  maskMotionStyle,
  panelMotionStyle,
} = useBottomSheetGesture({
  visible: () => props.modelValue,
  onClose: closeDrawer,
  closeThreshold: 96,
  hiddenOffset: 56,
})

function handleSelect(key: string): void {
  emit('select', key)
  closeDrawer()
}
</script>

<template>
  <view class="fixed inset-0 z-60 flex items-end justify-center bg-slate-900/28 px-5 pb-8 pt-10 backdrop-blur-[6rpx]"
    :class="props.modelValue ? 'pointer-events-auto' : 'pointer-events-none'" :style="maskMotionStyle"
    @tap="closeDrawer">
    <view
      class="relative w-full max-w-[720rpx] rounded-[36rpx] bg-[var(--color-surface)] px-5 py-5 shadow-[0_18rpx_60rpx_rgba(15,23,42,0.18)] dark:bg-slate-900"
      :style="panelMotionStyle" @tap.stop="() => { }">
      <view @touchstart.stop="handleTouchStart" @touchmove.stop.prevent="handleTouchMove"
        @touchend.stop="handleTouchEnd" @touchcancel.stop="handleTouchEnd">
        <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
        <view class="mb-5">
          <text class="block text-lg font-800 text-app-ink dark:text-slate-100">
            花园工具抽屉
          </text>
          <text class="mt-2 block text-sm leading-6 text-app-muted dark:text-slate-300">
            把低频但重要的功能收进这里，首页只保留你最常操作的入口。
          </text>
        </view>
        <CloseButton @click="closeDrawer" />
      </view>

      <view class="flex flex-col gap-3">
        <ActionHintButton v-for="action in props.actions" :key="action.key" :title="action.title" :hint="action.hint"
          :icon="action.icon" @click="handleSelect(action.key)" />
      </view>

      <button class="btn-pill-md mt-4 bg-slate-100 text-app-muted dark:bg-slate-800 dark:text-slate-200"
        hover-class="opacity-92" @tap="closeDrawer">
        先收起来
      </button>
    </view>
  </view>
</template>
