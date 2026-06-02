<script setup lang="ts">
import { computed, ref } from 'vue'

interface FloatingActionButtonProps {
  icon?: string
  text?: string
  color?: 'mint' | 'blush' | 'sunrise'
  /** 距右边缘初始距离（px） */
  initialRight?: number
  /** 距底边缘初始距离（px） */
  initialBottom?: number
}

const props = withDefaults(defineProps<FloatingActionButtonProps>(), {
  icon: '✦',
  text: '',
  color: 'mint',
  initialRight: 20,
  initialBottom: 20,
})

const emit = defineEmits<{
  click: []
}>()

// --- 拖拽 ---
const offsetX = ref(0)
const offsetY = ref(0)
const isDragging = ref(false)
let dragStartX = 0
let dragStartY = 0
let btnStartX = 0
let btnStartY = 0
const DRAG_THRESHOLD = 6

function onTouchStart(e: TouchEvent): void {
  const touch = e.touches[0]
  if (!touch) return
  dragStartX = touch.clientX
  dragStartY = touch.clientY
  btnStartX = offsetX.value
  btnStartY = offsetY.value
  isDragging.value = false
}

function onTouchMove(e: TouchEvent): void {
  const touch = e.touches[0]
  if (!touch) return
  const dx = touch.clientX - dragStartX
  const dy = touch.clientY - dragStartY

  if (!isDragging.value && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
    isDragging.value = true
  }

  if (isDragging.value) {
    offsetX.value = btnStartX + dx
    offsetY.value = btnStartY + dy
  }
}

function onTouchEnd(): void {
  if (!isDragging.value) {
    emit('click')
  }
  isDragging.value = false
}

// --- 颜色 ---
const colorMap: Record<string, { bg: string; shadow: string; darkBg: string; darkShadow: string }> = {
  mint: {
    bg: 'bg-[var(--color-mint)]/92',
    shadow: 'shadow-[0_10rpx_24rpx_rgba(132,219,198,0.38)]',
    darkBg: 'dark:bg-emerald-500/85',
    darkShadow: 'dark:shadow-[0_10rpx_24rpx_rgba(16,185,129,0.35)]',
  },
  blush: {
    bg: 'bg-[var(--color-blush)]/92',
    shadow: 'shadow-[0_10rpx_24rpx_rgba(245,193,216,0.38)]',
    darkBg: 'dark:bg-rose-500/85',
    darkShadow: 'dark:shadow-[0_10rpx_24rpx_rgba(244,63,94,0.35)]',
  },
  sunrise: {
    bg: 'bg-[#ffc39e]/92',
    shadow: 'shadow-[0_10rpx_24rpx_rgba(255,195,158,0.38)]',
    darkBg: 'dark:bg-orange-500/85',
    darkShadow: 'dark:shadow-[0_10rpx_24rpx_rgba(249,115,22,0.35)]',
  },
}

const colorClasses = computed(() => colorMap[props.color]!)

const fabStyle = computed(() => ({
  right: `${props.initialRight - offsetX.value}px`,
  bottom: `${props.initialBottom - offsetY.value}px`,
}))
</script>

<template>
  <view
    class="absolute z-20"
    :style="fabStyle"
  >
    <button
      class="btn-base gap-1 rounded-full px-4 py-2.5 text-white backdrop-blur-[6rpx]"
      :class="[
        colorClasses.bg,
        colorClasses.shadow,
        colorClasses.darkBg,
        colorClasses.darkShadow,
        isDragging ? '' : 'active:scale-95',
      ]"
      :style="{ transition: isDragging ? 'none' : 'transform 0.18s ease, opacity 0.18s ease' }"
      @touchstart.stop="onTouchStart"
      @touchmove.stop.prevent="onTouchMove"
      @touchend.stop="onTouchEnd"
    >
      <text class="text-[24rpx] leading-none">{{ props.icon }}</text>
      <text
        v-if="props.text"
        class="text-3xs font-700 leading-none"
      >
        {{ props.text }}
      </text>
    </button>
  </view>
</template>
