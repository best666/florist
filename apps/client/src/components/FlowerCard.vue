<script setup lang="ts">
import type { FlowerCardQuickAction, TagLabelStatus } from '@/interfaces'
import AppImage from './AppImage.vue'
import TagLabel from './TagLabel.vue'

interface FlowerCardProps {
  name: string
  nickname?: string
  imageSrc?: string
  status?: Exclude<TagLabelStatus, 'custom'>
  statusText?: string
}

const props = withDefaults(defineProps<FlowerCardProps>(), {
  nickname: '',
  imageSrc: '',
  status: 'healthy',
  statusText: '',
})

const emit = defineEmits<{
  tap: []
}>()

function handleTap(): void {
  emit('tap')
}
</script>

<template>
  <view
    class="card-soft app-fade-up overflow-hidden p-0 dark:bg-slate-900"
    hover-class="opacity-90"
    @tap="handleTap"
  >
    <view class="relative aspect-1 overflow-hidden bg-app-cream">
      <AppImage
        :src="props.imageSrc"
        mode="aspectFill"
        class="h-full w-full"
        error-text="暂无封面"
      />
      <view class="absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-[#32404a]/40 to-transparent" />
      <view class="absolute left-2 top-2">
        <TagLabel :status="props.status" :text="props.statusText" />
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
    </view>
  </view>
</template>
