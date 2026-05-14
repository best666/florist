<script setup lang="ts">
import { computed } from 'vue'
import type { FlowerCardCareItem, FlowerCardQuickAction, TagLabelStatus } from '@/interfaces'
import SubmitBtn from './SubmitBtn.vue'
import TagLabel from './TagLabel.vue'

interface FlowerCardProps {
  /**
   * 植株名称。
   */
  title: string
  /**
   * 辅助名称，如昵称或品类。
   */
  subtitle?: string
  /**
   * 封面图地址。
   */
  imageSrc?: string
  /**
   * 状态标签。
   */
  status?: Exclude<TagLabelStatus, 'custom'>
  /**
   * 简要养护信息。
   */
  careItems?: ReadonlyArray<FlowerCardCareItem>
  /**
   * 快捷操作。
   */
  quickActions?: ReadonlyArray<FlowerCardQuickAction>
  /**
   * 右下角主操作文案。
   */
  primaryActionText?: string
}

const props = withDefaults(defineProps<FlowerCardProps>(), {
  subtitle: '',
  imageSrc: '',
  status: 'healthy',
  careItems: () => [],
  quickActions: () => [],
  primaryActionText: '记录一下',
})

const emit = defineEmits<{
  action: [key: string]
  primary: []
}>()

const displayCareItems = computed(() => props.careItems.slice(0, 3))

function handleQuickAction(key: string, disabled?: boolean): void {
  if (disabled) {
    return
  }

  emit('action', key)
}

function handlePrimaryAction(): void {
  emit('primary')
}
</script>

<template>
  <view
    class="overflow-hidden rounded-[32rpx] bg-white shadow-[0_18rpx_48rpx_rgba(148,163,184,0.16)] dark:bg-slate-900 dark:shadow-[0_18rpx_48rpx_rgba(15,23,42,0.28)]">
    <view class="relative">
      <AppImage :src="props.imageSrc" mode="aspectFill" class="h-[280rpx] w-full bg-app-cream" error-text="封面图先休息一下" />
      <view class="absolute inset-x-0 bottom-0 h-18 bg-linear-to-t from-slate-900/32 to-transparent" />
      <view class="absolute left-4 top-4 flex items-center gap-2">
        <TagLabel :status="props.status" />
      </view>
    </view>

    <view class="flex flex-col gap-4 p-4">
      <view class="flex items-start justify-between gap-3">
        <view class="flex-1">
          <text class="block text-lg font-800 text-slate-800 dark:text-slate-100">
            {{ props.title }}
          </text>
          <text v-if="props.subtitle" class="mt-1 block text-sm text-slate-500 dark:text-slate-300">
            {{ props.subtitle }}
          </text>
        </view>
        <view class="rounded-full bg-app-cream px-3 py-1 text-2xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          可爱养护中
        </view>
      </view>

      <view class="grid grid-cols-3 gap-2">
        <view v-for="item in displayCareItems" :key="item.label"
          class="rounded-[22rpx] bg-app-ivory px-3 py-3 dark:bg-slate-800">
          <text class="block text-2xs text-slate-400 dark:text-slate-500">
            {{ item.label }}
          </text>
          <text class="mt-1 block text-sm font-700 text-slate-700 dark:text-slate-100">
            {{ item.value }}
          </text>
        </view>
      </view>

      <view v-if="props.quickActions.length" class="flex flex-wrap gap-2">
        <button v-for="action in props.quickActions" :key="action.key"
          class="h-9 rounded-full border-none bg-slate-100 px-4 text-2xs font-700 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
          :class="action.disabled ? 'opacity-50' : 'active:scale-98'" :disabled="Boolean(action.disabled)"
          hover-class="opacity-92" @tap="handleQuickAction(action.key, action.disabled)">
          {{ action.label }}
        </button>
      </view>

      <SubmitBtn :text="props.primaryActionText" variant="sunrise" @click="handlePrimaryAction" />
    </view>
  </view>
</template>
