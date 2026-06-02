<script setup lang="ts">
import { ref } from 'vue'
import { useElementRect } from '@/hooks/useElementRect'

interface InfoPopoverProps {
  content: string
  icon?: 'info' | 'help'
}

withDefaults(defineProps<InfoPopoverProps>(), {
  icon: 'info',
})

const visible = ref(false)
const arrowStyle = ref<Record<string, string>>({})
const cardStyle = ref<Record<string, string>>({})
const iconRef = ref<any>(null)
const uid = `tip-${Math.random().toString(36).slice(2, 8)}`
const { getRect } = useElementRect()

async function open(): Promise<void> {
  visible.value = true
  const rect = await getRect(iconRef.value, `#${uid}`)
  if (!rect) return

  const cx = rect.left + rect.width / 2
  const arrowTop = rect.bottom + 6

  arrowStyle.value = {
    left: `${cx}px`,
    top: `${arrowTop}px`,
    transform: 'translateX(-50%)',
    fontSize: '28rpx',
    lineHeight: '1',
    zIndex: '1',
  }

  cardStyle.value = {
    left: '50%',
    top: `${arrowTop + 24}px`,
    transform: 'translateX(-50%)',
  }
}

function close(): void {
  visible.value = false
}
</script>

<template>
  <text
    :id="uid"
    ref="iconRef"
    class="inline-flex h-5 w-5 flex-none cursor-pointer items-center justify-center rounded-full text-2xs font-700 leading-none"
    :class="icon === 'help'
      ? 'bg-[var(--color-mint)]/25 text-[var(--color-sage)]'
      : 'bg-[var(--color-cream)]/60 text-app-muted'"
    @tap.stop="open"
  >
    {{ icon === 'help' ? '?' : 'i' }}
  </text>

  <view v-if="visible" class="fixed inset-0 z-50" @tap="close">
    <text
      class="absolute text-[var(--color-surface)] dark:text-slate-800"
      :style="arrowStyle"
    >▲</text>
    <view
      class="absolute w-[560rpx] max-w-[88vw] rounded-[20rpx] bg-[var(--color-surface)] px-5 py-4 shadow-[0_12rpx_40rpx_rgba(15,23,42,0.18)] dark:bg-slate-800"
      :style="cardStyle"
      @tap.stop
    >
      <text class="text-sm leading-7 text-app-muted dark:text-slate-200">{{ content }}</text>
      <view class="mt-3 text-center">
        <text
          class="inline-block rounded-full bg-[var(--color-mint)]/20 px-5 py-1.5 text-2xs font-700 text-[var(--color-sage)]"
          @tap.stop="close"
        >知道了</text>
      </view>
    </view>
  </view>
</template>
