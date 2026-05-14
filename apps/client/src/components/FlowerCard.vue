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
   * 状态展示文案，允许覆盖默认状态标签文案。
   */
  statusText?: string
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
  statusText: '',
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
    class="card-soft app-fade-up overflow-hidden p-0 dark:bg-slate-900 dark:shadow-[0_18rpx_48rpx_rgba(15,23,42,0.28)]">
    <view class="relative">
      <AppImage :src="props.imageSrc" mode="aspectFill" class="h-[280rpx] w-full bg-app-cream" error-text="封面图先休息一下" />
      <view class="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-[#32404a]/36 via-[#32404a]/10 to-transparent" />
      <view class="absolute left-4 top-4 flex items-center gap-2">
        <TagLabel :status="props.status" :text="props.statusText" />
      </view>
    </view>

    <view class="flex flex-col gap-4 p-4">
      <view class="flex items-start justify-between gap-3">
        <view class="flex-1">
          <text class="block text-[34rpx] font-800 text-app-ink dark:text-slate-100">
            {{ props.title }}
          </text>
          <text v-if="props.subtitle" class="mt-1 block text-sm leading-6 text-app-muted dark:text-slate-300">
            {{ props.subtitle }}
          </text>
        </view>
        <view class="badge-soft bg-app-cream/92 text-app-muted dark:bg-slate-800 dark:text-slate-300">
          可爱养护中
        </view>
      </view>

      <view class="grid grid-cols-3 gap-2">
        <view v-for="item in displayCareItems" :key="item.label" class="surface-soft px-3 py-3 dark:bg-slate-800">
          <text class="block text-2xs text-app-muted/80 dark:text-slate-500">
            {{ item.label }}
          </text>
          <text class="mt-1 block text-sm font-700 text-app-ink dark:text-slate-100">
            {{ item.value }}
          </text>
        </view>
      </view>

      <view v-if="props.quickActions.length" class="flex flex-wrap gap-2">
        <button v-for="action in props.quickActions" :key="action.key"
          class="surface-soft app-pressable h-9 rounded-full border-none bg-white/78 px-4 text-2xs font-700 text-app-muted dark:bg-slate-800 dark:text-slate-200"
          :class="action.disabled ? 'opacity-50 shadow-none' : ''" :disabled="Boolean(action.disabled)"
          hover-class="opacity-92" @tap="handleQuickAction(action.key, action.disabled)">
          {{ action.label }}
        </button>
      </view>

      <SubmitBtn :text="props.primaryActionText" variant="sunrise" @click="handlePrimaryAction" />
    </view>
  </view>
</template>
