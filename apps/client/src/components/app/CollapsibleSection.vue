<script setup lang="ts">
import { ref, watch } from 'vue'
import InfoPopover from './InfoPopover.vue'
import TagLabel from './TagLabel.vue'
import { useEncryptedStorage } from '@/hooks/useEncryptedStorage'

interface CollapsibleSectionProps {
  title: string
  description?: string
  defaultExpanded?: boolean
  expanded?: boolean
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

const emit = defineEmits<{
  'update:expanded': [value: boolean]
}>()

function resolveCurrentRoute(): string {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const currentPage = pages[pages.length - 1]

  return currentPage?.route ?? 'shared'
}

const collapseStateStorage = useEncryptedStorage<boolean>(
  props.persistKey || `collapse:${resolveCurrentRoute()}:${props.title}`,
)

const internalExpanded = ref(collapseStateStorage.getValue() ?? props.defaultExpanded)

watch(
  () => props.expanded,
  (val) => {
    if (val !== undefined) {
      internalExpanded.value = val
    }
  },
  { immediate: true },
)

function handleToggle(): void {
  internalExpanded.value = !internalExpanded.value
  collapseStateStorage.setValue(internalExpanded.value)
  emit('update:expanded', internalExpanded.value)
}
</script>

<template>
  <view class="card-soft rounded-[32rpx] dark:bg-slate-900">
    <view
      class="flex items-start justify-between gap-3"
      @tap="handleToggle"
    >
      <view class="min-w-0 flex-1">
        <view class="flex items-center gap-1">
          <text class="block text-base font-800 text-app-ink text-nowrap dark:text-slate-100">
            {{ props.title }}
          </text>
          <InfoPopover
            v-if="props.description"
            :content="props.description"
          />
        </view>
      </view>

      <view class="flex items-center gap-2">
        <slot name="header-extra" />
        <TagLabel
          v-if="props.tagText"
          :text="props.tagText"
          :tone="props.tagTone"
          :icon="props.tagIcon"
        />
        <view class="flex h-[48rpx] w-[48rpx] items-center justify-center text-app-muted/50 dark:text-slate-400">
          <view
            class="text-[24rpx] leading-none transition-transform duration-200"
            :style="{ transform: internalExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }"
          >
            ▼
          </view>
        </view>
      </view>
    </view>

    <view
      v-if="internalExpanded"
      class="mt-4 app-fade-up"
    >
      <slot />
    </view>
  </view>
</template>
