<script setup lang="ts">
import { computed } from 'vue'
import { RecordActionType } from '@florist/contracts'
import type { LocalFlower } from '@/interfaces'
import { getFlowerDisplayName, getTimeAgo } from '@/utils'
import { useAuthStore, useFlowerTaxonomyStore } from '@/store'
import { useBottomSheetGesture } from '@/hooks/useBottomSheetGesture'
import AppImage from '../app/AppImage.vue'
import FloatingActionButton from '../app/FloatingActionButton.vue'

function navigateToRecordPage(flowerId: string, actionType: RecordActionType): void {
  uni.navigateTo({ url: `/pages/record/index?flowerId=${flowerId}&actionType=${actionType}` })
}

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
  'cover-tap': [flower: LocalFlower]
  'ai-advice': [flower: LocalFlower]
}>()

const flowerTaxonomyStore = useFlowerTaxonomyStore()
const authStore = useAuthStore()

function closePopup(): void {
  emit('update:modelValue', false)
}

function handleCoverTap(): void {
  if (!props.flower) return
  if (!authStore.isAuthenticated) {
    uni.showToast({ title: '请先登录后上传封面', icon: 'none', duration: 2000 })
    return
  }
  emit('cover-tap', props.flower)
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

const statusDotColor = computed(() => {
  if (!props.flower) return 'bg-slate-400'
  switch (props.flower.careStatus) {
    case 'healthy': return 'bg-emerald-400 shadow-[0_0_6rpx_rgba(52,211,153,0.5)]'
    case 'watering-needed':
    case 'fertilizing-needed': return 'bg-amber-400 shadow-[0_0_6rpx_rgba(251,191,36,0.5)]'
    default: return 'bg-slate-400'
  }
})

const statusLabel = computed(() => {
  if (!props.flower) return ''
  return flowerTaxonomyStore.resolveFlowerCareStatusLabel(props.flower).replace(/^\S+\s*/, '')
})

const coverHint = computed(() => {
  if (!props.flower) return ''
  return props.flower.images.length > 0 ? '点击更换封面' : '点击上传封面'
})

function handleFabClick(): void {
  if (props.flower) {
    emit('ai-advice', props.flower)
  }
}
</script>

<template>
  <view
    class="fixed inset-0 z-70 flex items-end overflow-hidden bg-slate-900/34 backdrop-blur-[6rpx]"
    :class="modalClass"
    :style="maskMotionStyle"
    @tap="closePopup"
  >
    <view
      class="relative max-h-[90svh] w-full max-w-[100vw] overflow-x-hidden rounded-t-[40rpx] bg-[var(--color-surface)] px-5 pb-6 pt-4 shadow-[0_-18rpx_60rpx_rgba(15,23,42,0.14)] will-change-transform dark:bg-slate-900"
      :class="panelClass"
      :style="panelMotionStyle"
      @tap.stop="() => {}"
    >
      <button
        class="btn-base absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-[#FFF5E9] text-lg text-[#C28652] shadow-[0_8rpx_18rpx_rgba(233,161,90,0.14)] dark:bg-slate-800 dark:text-[#F3C58E]"
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
          <!-- 封面图：点击上传/替换 -->
          <view
            class="relative overflow-hidden rounded-[24rpx] bg-app-cream app-pressable"
            hover-class="opacity-90"
            @tap="handleCoverTap"
          >
            <AppImage
              :src="coverImage"
              mode="aspectFill"
              class="h-[320rpx] w-full"
              error-text="暂无封面图"
            />
            <view class="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-[#32404a]/50 to-transparent" />
            <!-- 封面提示 -->
            <view class="absolute right-3 top-3 rounded-full bg-black/30 px-2.5 py-1 backdrop-blur-[4rpx]">
              <text class="text-3xs text-white/80">{{ coverHint }}</text>
            </view>
            <view class="absolute bottom-3 left-4 right-4">
              <view class="flex items-end justify-between gap-3">
                <view class="min-w-0 flex-1">
                  <text class="block truncate text-lg font-800 text-white drop-shadow-[0_2rpx_6rpx_rgba(0,0,0,0.35)]">
                    {{ getFlowerDisplayName(props.flower) }}
                  </text>
                </view>
                <!-- 状态圆点 + 文字 -->
                <view class="flex flex-none items-center gap-1 rounded-full bg-black/25 px-2 py-1 backdrop-blur-[4rpx]">
                  <view class="h-2 w-2 flex-none rounded-full" :class="statusDotColor" />
                  <text class="text-3xs leading-none text-white/90">{{ statusLabel }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 基础信息 -->
          <view class="rounded-[24rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-2xs text-app-muted/70 dark:text-app-muted">基础信息</text>
            <view class="mt-2 flex flex-wrap gap-8rpx">
              <view class="surface-soft w-[calc(50%-4rpx)] rounded-[18rpx] px-3 py-2.5 dark:bg-slate-900">
                <text class="block text-2xs text-app-muted/70 dark:text-app-muted">品类</text>
                <text class="mt-0.5 block truncate text-sm font-700 text-app-ink dark:text-slate-100">
                  {{ flowerTaxonomyStore.resolveFlowerCategoryLabel(props.flower) }}
                </text>
              </view>
              <view class="surface-soft w-[calc(50%-4rpx)] rounded-[18rpx] px-3 py-2.5 dark:bg-slate-900">
                <text class="block text-2xs text-app-muted/70 dark:text-app-muted">位置</text>
                <text class="mt-0.5 block truncate text-sm font-700 text-app-ink dark:text-slate-100">
                  {{ flowerTaxonomyStore.resolveFlowerPlacementLabel(props.flower) }}
                </text>
              </view>
              <view class="surface-soft w-[calc(50%-4rpx)] rounded-[18rpx] px-3 py-2.5 dark:bg-slate-900">
                <text class="block text-2xs text-app-muted/70 dark:text-app-muted">难度</text>
                <text class="mt-0.5 block truncate text-sm font-700 text-app-ink dark:text-slate-100">
                  {{ flowerTaxonomyStore.resolveFlowerCareDifficultyLabel(props.flower) }}
                </text>
              </view>
              <view class="surface-soft w-[calc(50%-4rpx)] rounded-[18rpx] px-3 py-2.5 dark:bg-slate-900">
                <text class="block text-2xs text-app-muted/70 dark:text-app-muted">状态</text>
                <text class="mt-0.5 block truncate text-sm font-700 text-app-ink dark:text-slate-100">
                  {{ flowerTaxonomyStore.resolveFlowerCareStatusLabel(props.flower) }}
                </text>
              </view>
            </view>
          </view>

          <!-- 养护信息 -->
          <view class="rounded-[24rpx] bg-app-ivory/90 p-4 dark:bg-slate-800">
            <text class="text-2xs text-app-muted/70 dark:text-app-muted">养护记录</text>
            <view class="mt-2 flex flex-wrap gap-8rpx">
              <view
                class="surface-soft app-pressable w-[calc(50%-4rpx)] rounded-[18rpx] px-3 py-2.5 dark:bg-slate-900"
                hover-class="opacity-80"
                @tap="navigateToRecordPage(props.flower!.id, RecordActionType.Watering)"
              >
                <text class="block text-2xs text-app-muted/70 dark:text-app-muted">最近浇水</text>
                <text class="mt-0.5 block truncate text-sm font-700 text-app-ink dark:text-slate-100">
                  {{ props.flower.lastWateredAt ? getTimeAgo(props.flower.lastWateredAt) : '待记录' }}
                </text>
              </view>
              <view
                class="surface-soft app-pressable w-[calc(50%-4rpx)] rounded-[18rpx] px-3 py-2.5 dark:bg-slate-900"
                hover-class="opacity-80"
                @tap="navigateToRecordPage(props.flower!.id, RecordActionType.Fertilizing)"
              >
                <text class="block text-2xs text-app-muted/70 dark:text-app-muted">最近施肥</text>
                <text class="mt-0.5 block truncate text-sm font-700 text-app-ink dark:text-slate-100">
                  {{ props.flower.lastFertilizedAt ? getTimeAgo(props.flower.lastFertilizedAt) : '待记录' }}
                </text>
              </view>
            </view>
            <view
              v-if="props.flower.note"
              class="surface-soft mt-2 rounded-[18rpx] px-3 py-2.5 dark:bg-slate-900"
            >
              <text class="block text-2xs text-app-muted/70 dark:text-app-muted">备注</text>
              <text class="mt-0.5 block text-sm leading-5 text-app-muted dark:text-slate-300">
                {{ props.flower.note }}
              </text>
            </view>
          </view>

          <!-- 操作按钮 -->
          <view class="flex flex-wrap gap-2">
            <button
              class="btn-base surface-soft app-pressable h-9 rounded-full bg-[var(--color-surface)]/78 px-4 text-2xs font-700 text-app-muted dark:bg-slate-800 dark:text-slate-200"
              hover-class="opacity-92"
              @tap="emit('edit', props.flower)"
            >
              编辑档案
            </button>
            <button
              class="btn-base surface-soft app-pressable h-9 rounded-full bg-[var(--color-surface)]/78 px-4 text-2xs font-700 text-app-muted dark:bg-slate-800 dark:text-slate-200"
              hover-class="opacity-92"
              @tap="emit('record', props.flower)"
            >
              去打卡
            </button>
            <button
              class="btn-base surface-soft app-pressable h-9 rounded-full bg-[var(--color-surface)]/78 px-4 text-2xs font-700 text-app-muted dark:bg-slate-800 dark:text-slate-200"
              hover-class="opacity-92"
              @tap="emit('album', props.flower)"
            >
              成长相册
            </button>
            <button
              class="btn-base surface-soft app-pressable h-9 rounded-full bg-[var(--color-surface)]/78 px-4 text-2xs font-700 text-app-muted dark:bg-slate-800 dark:text-slate-200"
              :class="props.flower.images.length === 0 ? 'opacity-50 shadow-none' : ''"
              :disabled="props.flower.images.length === 0"
              hover-class="opacity-92"
              @tap="emit('preview', props.flower)"
            >
              预览图片
            </button>
            <button
              class="btn-base surface-soft app-pressable h-9 rounded-full bg-[var(--color-surface)]/78 px-4 text-2xs font-700 text-rose-500 dark:bg-slate-800"
              hover-class="opacity-92"
              @tap="emit('delete', props.flower)"
            >
              移入回收站
            </button>
          </view>
        </view>
      </scroll-view>

      <!-- 悬浮 AI 建议按钮（可拖拽） -->
      <FloatingActionButton
        icon="✦"
        text="AI 建议"
        color="mint"
        :initial-right="20"
        :initial-bottom="20"
        @click="handleFabClick"
      />
    </view>
  </view>
</template>
