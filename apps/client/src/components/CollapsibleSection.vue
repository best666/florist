<script setup lang="ts">
import { ref } from 'vue'
import { useEncryptedStorage } from '@/hooks/useEncryptedStorage'

interface CollapsibleSectionProps {
  title: string
  description?: string
  defaultExpanded?: boolean
  tagText?: string
  tagTone?: 'mint' | 'blush' | 'cream' | 'slate'
  tagIcon?: string
  persistKey?: string
}

const props = withDefaults(defineProps<CollapsibleSectionProps>(), {
  description: '',
  defaultExpanded: false,
  tagText: '',
  tagTone: 'slate',
  tagIcon: '',
  persistKey: '',
})

function resolveCurrentRoute(): string {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const currentPage = pages[pages.length - 1]

  return currentPage?.route ?? 'shared'
}

const collapseStateStorage = useEncryptedStorage<boolean>(
  props.persistKey || `collapse:${resolveCurrentRoute()}:${props.title}`,
)

const expanded = ref(collapseStateStorage.getValue() ?? props.defaultExpanded)

function handleToggle(): void {
  expanded.value = !expanded.value
  collapseStateStorage.setValue(expanded.value)
}
</script>

<template>
  <view class="card-soft rounded-[32rpx] dark:bg-slate-900">
    <view class="flex items-start justify-between gap-3">
      <view class="min-w-0 flex-1">
        <text class="block text-base font-800 text-app-ink dark:text-slate-100">
          {{ props.title }}
        </text>
        <text v-if="props.description" class="mt-1 block text-sm leading-6 text-app-muted dark:text-slate-300">
          {{ props.description }}
        </text>
      </view>

      <view class="flex items-center gap-2">
        <slot name="header-extra" />
        <TagLabel v-if="props.tagText" :text="props.tagText" :tone="props.tagTone" :icon="props.tagIcon" />
        <button class="btn-pill-sm surface-soft bg-white/78 px-4 text-app-muted dark:bg-slate-800 dark:text-slate-200"
          hover-class="opacity-92" @tap="handleToggle">
          {{ expanded ? '收起' : '展开' }}
        </button>
      </view>
    </view>

    <view v-if="expanded" class="mt-4 app-fade-up">
      <slot />
    </view>
  </view>
</template>
