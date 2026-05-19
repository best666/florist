<script setup lang="ts">
import { computed } from 'vue'
import type { LocalFlower } from '@/interfaces'
import { getFlowerDisplayName, getTimeAgo } from '@/utils'
import { useFlowerTaxonomyStore } from '@/store'
import { useBottomSheetGesture } from '@/hooks/useBottomSheetGesture'
import TagLabel from './TagLabel.vue'

interface FlowerDetailPopupProps {
  modelValue: boolean
  flower: LocalFlower | null
}

const props = defineProps<FlowerDetailPopupProps>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  edit: [flower: LocalFlower]
  record: [flower: LocalFlower]
  album: [flower: LocalFlower]
  preview: [flower: LocalFlower]
  delete: [flower: LocalFlower]
}>()

const flowerTaxonomyStore = useFlowerTaxonomyStore()

function closePopup(): void {
  emit('update:modelValue', false)
}

const { handleTouchEnd, handleTouchMove, handleTouchStart, maskMotionStyle, panelMotionStyle } =
  useBottomSheetGesture({
    visible: () => props.modelValue,
    onClose: closePopup,
  })

const modalClass = computed(() =>
  props.modelValue ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
)

const panelClass = computed(() =>
  props.modelValue ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-[0.98] opacity-0',
)

const coverImage = computed(() => {
  if (!props.flower) return ''
  if (props.flower.coverImageId) {
    const found = props.flower.images.find((img) => img.id === props.flower!.coverImageId)
    if (found) return found.url
  }
  return props.flower.images[0]?.url ?? ''
})
</script>

<template>
  <view
    class="fixed inset-0 z-70 flex items-end overflow-hidden bg-slate-900/34 backdrop-blur-[6rpx]"
    :class="modalClass"
    :style="maskMotionStyle"
    @tap="closePopup"
  >
    <view
      class="relative max-h-[90svh] w-full max-w-[100vw] overflow-x-hidden rounded-t-[40rpx] bg-white px-5 pb-6 pt-4 shadow-[0_-18rpx_60rpx_rgba(15,23,42,0.14)] will-change-transform dark:bg-slate-900"
      :class="panelClass"
      :style="panelMotionStyle"
      @tap.stop="() => {}"
    >
      <button
        class="absolute right-2 top-2 z-10 h-8 w-8 flex items-center justify-center rounded-full border-none bg-[#FFF5E9] text-lg text-[#C28652] shadow-[0_8rpx_18rpx_rgba(233,161,90,0.14)] dark:bg-slate-800 dark:text-[#F3C58E]"
        hover-class="opacity-92"
        @tap="closePopup"
      >
        <text class="leading-none">×</text>
      </button>

      <view
        class="py-4"
        @touchstart.stop="handleTouchStart"
        @touchmove.stop.prevent="handleTouchMove"
        @touchend.stop="handleTouchEnd"
        @touchcancel.stop="handleTouchEnd"
      >
        <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
      </view>

      <scroll-view
        v-if="props.flower"
        scroll-y
        class="max-h-[68vh] w-full overflow-x-hidden pr-1"
      >
        <view class="flex flex-col gap-4 pb-4">
          <!-- 封面图 -->
          <view class="relative overflow-hidden rounded-[24rpx] bg-app-cream">
            <AppImage
              :src="coverImage"
              mode="aspectFill"
              class="h-[320rpx] w-full"
              error-text="暂无封面图"
            />
            <view class="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-[#32404a]/50 to-transparent" />
            <view class="absolute bottom-3 left-4 right-4">
              <view class="flex items-end justify-between gap-3">
                <view class="min-w-0 flex-1">
                  <text class="block truncate text-lg font-800 text-white drop-shadow-[0_2rpx_6rpx_rgba(0,0,0,0.35)]">
                    {{ getFlowerDisplayName(props.flower) }}
                  </text>
                </view>
                <TagLabel
                  :status="props.flower.careStatus"
                  :text="flowerTaxonomyStore.resolveFlowerCareStatusLabel(props.flower)"
                />
              </view>
            </view>
          </view>

          <!-- 基础信息 -->
          <view class="rounded-[24rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-2xs text-slate-400 dark:text-slate-500">基础信息</text>
            <view class="mt-2 grid grid-cols-2 gap-2">
              <view class="surface-soft rounded-[18rpx] px-3 py-2.5 dark:bg-slate-900">
                <text class="block text-2xs text-slate-400 dark:text-slate-500">品类</text>
                <text class="mt-0.5 block truncate text-sm font-700 text-slate-700 dark:text-slate-100">
                  {{ flowerTaxonomyStore.resolveFlowerCategoryLabel(props.flower) }}
                </text>
              </view>
              <view class="surface-soft rounded-[18rpx] px-3 py-2.5 dark:bg-slate-900">
                <text class="block text-2xs text-slate-400 dark:text-slate-500">位置</text>
                <text class="mt-0.5 block truncate text-sm font-700 text-slate-700 dark:text-slate-100">
                  {{ flowerTaxonomyStore.resolveFlowerPlacementLabel(props.flower) }}
                </text>
              </view>
              <view class="surface-soft rounded-[18rpx] px-3 py-2.5 dark:bg-slate-900">
                <text class="block text-2xs text-slate-400 dark:text-slate-500">难度</text>
                <text class="mt-0.5 block truncate text-sm font-700 text-slate-700 dark:text-slate-100">
                  {{ flowerTaxonomyStore.resolveFlowerCareDifficultyLabel(props.flower) }}
                </text>
              </view>
              <view class="surface-soft rounded-[18rpx] px-3 py-2.5 dark:bg-slate-900">
                <text class="block text-2xs text-slate-400 dark:text-slate-500">状态</text>
                <text class="mt-0.5 block truncate text-sm font-700 text-slate-700 dark:text-slate-100">
                  {{ flowerTaxonomyStore.resolveFlowerCareStatusLabel(props.flower) }}
                </text>
              </view>
            </view>
          </view>

          <!-- 养护信息 -->
          <view class="rounded-[24rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-2xs text-slate-400 dark:text-slate-500">养护记录</text>
            <view class="mt-2 grid grid-cols-2 gap-2">
              <view class="surface-soft rounded-[18rpx] px-3 py-2.5 dark:bg-slate-900">
                <text class="block text-2xs text-slate-400 dark:text-slate-500">最近浇水</text>
                <text class="mt-0.5 block truncate text-sm font-700 text-slate-700 dark:text-slate-100">
                  {{ props.flower.lastWateredAt ? getTimeAgo(props.flower.lastWateredAt) : '待记录' }}
                </text>
              </view>
              <view class="surface-soft rounded-[18rpx] px-3 py-2.5 dark:bg-slate-900">
                <text class="block text-2xs text-slate-400 dark:text-slate-500">最近施肥</text>
                <text class="mt-0.5 block truncate text-sm font-700 text-slate-700 dark:text-slate-100">
                  {{ props.flower.lastFertilizedAt ? getTimeAgo(props.flower.lastFertilizedAt) : '待记录' }}
                </text>
              </view>
            </view>
            <view
              v-if="props.flower.note"
              class="surface-soft mt-2 rounded-[18rpx] px-3 py-2.5 dark:bg-slate-900"
            >
              <text class="block text-2xs text-slate-400 dark:text-slate-500">备注</text>
              <text class="mt-0.5 block text-sm leading-5 text-slate-600 dark:text-slate-300">
                {{ props.flower.note }}
              </text>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view class="flex flex-wrap gap-2">
            <button
              class="surface-soft app-pressable h-9 rounded-full border-none bg-white/78 px-4 text-2xs font-700 text-app-muted dark:bg-slate-800 dark:text-slate-200"
              hover-class="opacity-92"
              @tap="emit('edit', props.flower)"
            >
              编辑档案
            </button>
            <button
              class="surface-soft app-pressable h-9 rounded-full border-none bg-white/78 px-4 text-2xs font-700 text-app-muted dark:bg-slate-800 dark:text-slate-200"
              hover-class="opacity-92"
              @tap="emit('record', props.flower)"
            >
              去打卡
            </button>
            <button
              class="surface-soft app-pressable h-9 rounded-full border-none bg-white/78 px-4 text-2xs font-700 text-app-muted dark:bg-slate-800 dark:text-slate-200"
              hover-class="opacity-92"
              @tap="emit('album', props.flower)"
            >
              成长相册
            </button>
            <button
              class="surface-soft app-pressable h-9 rounded-full border-none bg-white/78 px-4 text-2xs font-700 text-app-muted dark:bg-slate-800 dark:text-slate-200"
              :class="props.flower.images.length === 0 ? 'opacity-50 shadow-none' : ''"
              :disabled="props.flower.images.length === 0"
              hover-class="opacity-92"
              @tap="emit('preview', props.flower)"
            >
              预览图片
            </button>
            <button
              class="surface-soft app-pressable h-9 rounded-full border-none bg-white/78 px-4 text-2xs font-700 text-rose-500 dark:bg-slate-800"
              hover-class="opacity-92"
              @tap="emit('delete', props.flower)"
            >
              移入回收站
            </button>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>
