<script setup lang="ts">
import { computed } from 'vue'
import type { TagLabelStatus } from '@/interfaces'
import AppImage from '../app/AppImage.vue'

interface FlowerCardProps {
  name: string
  nickname?: string
  imageSrc?: string
  emoji?: string
  status?: Exclude<TagLabelStatus, 'custom'>
  statusText?: string
  aiHealthText?: string
}

const props = withDefaults(defineProps<FlowerCardProps>(), {
  nickname: '',
  imageSrc: '',
  emoji: '🪴',
  status: 'healthy',
  statusText: '',
  aiHealthText: '',
})

const emit = defineEmits<{
  tap: []
}>()

function handleTap(): void {
  emit('tap')
}

const dotColor = computed(() => {
  switch (props.status) {
    case 'healthy':
      return 'bg-emerald-400 shadow-[0_0_6rpx_rgba(52,211,153,0.5)]'
    case 'watering-needed':
    case 'fertilizing-needed':
      return 'bg-amber-400 shadow-[0_0_6rpx_rgba(251,191,36,0.5)]'
    default:
      return 'bg-slate-400'
  }
})
</script>

<template>
  <view
    class="card-soft app-fade-up overflow-hidden p-0 dark:bg-slate-900"
    hover-class="opacity-90"
    @tap="handleTap"
  >
    <!-- 封面区：有图显示图，无图显示 emoji -->
    <view class="relative aspect-1 overflow-hidden bg-[var(--color-cream)]/40">
      <AppImage
        v-if="props.imageSrc"
        :src="props.imageSrc"
        mode="aspectFill"
        class="h-full w-full"
        error-text=""
      />
      <view
        v-else
        class="flex h-full w-full items-center justify-center text-[72rpx]"
      >
        {{ props.emoji }}
      </view>
      <view class="absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-[#32404a]/20 to-transparent" />
      <view class="absolute left-2 top-2 flex items-center gap-1">
        <view
          class="h-2 w-2 flex-none rounded-full"
          :class="dotColor"
        />
        <text
          v-if="props.statusText"
          class="text-3xs leading-none text-white/90 text-shadow-sm"
          >{{ props.statusText }}</text
        >
      </view>
    </view>

    <view class="px-3 py-2.5">
      <text class="block truncate text-sm font-700 text-app-ink dark:text-slate-100">
        {{ props.name }}
      </text>
      <text
        v-if="props.nickname"
        class="mt-0.5 block truncate text-2xs text-app-muted dark:text-app-muted/70"
      >
        {{ props.nickname }}
      </text>
      <!-- AI 健康分析 -->
      <text
        v-if="props.aiHealthText"
        class="mt-1 block truncate text-3xs leading-5"
        :class="props.status === 'healthy' ? 'text-[var(--color-sage)]' : 'text-[var(--color-blush)]'"
      >
        {{ props.aiHealthText }}
      </text>
    </view>
  </view>
</template>
