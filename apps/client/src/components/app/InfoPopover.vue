<script setup lang="ts">
import { computed, ref } from 'vue'

interface InfoPopoverProps {
  content: string
  icon?: 'info' | 'help'
}

const props = withDefaults(defineProps<InfoPopoverProps>(), { icon: 'info' })

const visible = ref(false)

const iconClass = computed(() =>
  props.icon === 'help'
    ? 'bg-[var(--color-gold)]/10 text-[var(--color-ink)] dark:bg-amber-500/10 dark:text-amber-200'
    : 'bg-[var(--color-cream)]/60 text-app-muted dark:bg-slate-700/60 dark:text-slate-200',
)

const iconText = computed(() => (props.icon === 'help' ? '?' : 'i'))

function open(): void {
  visible.value = true
}

function close(): void {
  visible.value = false
}
</script>

<template>
  <text
    class="inline-flex h-5 w-5 flex-none cursor-pointer items-center justify-center rounded-full text-2xs font-700 leading-none"
    :class="iconClass"
    @tap.stop="open"
  >
    {{ iconText }}
  </text>

  <view
    v-if="visible"
    class="fixed left-0 right-0 top-0 bottom-0"
    style="z-index: 999"
  >
    <view
      class="absolute left-0 right-0 top-0 bottom-0"
      style="background: rgba(0, 0, 0, 0.1)"
      @tap="close"
    />
    <view
      class="absolute w-[580rpx] max-w-full rounded-[24rpx] border border-[var(--color-cream)]/60 bg-white px-5 py-4 shadow-[0_12rpx_40rpx_rgba(15,23,42,0.20)] dark:border-slate-600 dark:bg-slate-800"
      style="left: 50%; top: 40%; transform: translate(-50%, -50%)"
    >
      <view class="text-xs leading-6 text-app-muted dark:text-slate-200">
        {{ content }}
      </view>
      <view class="mt-3 text-center">
        <text
          class="inline-block rounded-full bg-[var(--color-mint)]/12 px-5 py-2 text-2xs font-700 text-[var(--color-ink)] dark:bg-[var(--color-mint)]/12 dark:text-[var(--color-mint)]"
          @tap.stop="close"
          >知道了</text
        >
      </view>
    </view>
  </view>
</template>
