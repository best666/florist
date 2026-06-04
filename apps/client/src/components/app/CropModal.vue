<script setup lang="ts">
// #ifdef H5
import { ref } from 'vue'
import { Cropper, type CropperResult } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

interface CropModalProps {
  modelValue: boolean
  imageSrc: string
  aspectRatio?: number
}

const props = withDefaults(defineProps<CropModalProps>(), {
  aspectRatio: 4 / 3,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [croppedBlob: Blob]
  cancel: []
}>()

const cropperRef = ref<InstanceType<typeof Cropper> | null>(null)
const isProcessing = ref(false)

function getResult(): CropperResult | null {
  const cropper = cropperRef.value as { getResult?: () => CropperResult } | null
  return cropper?.getResult?.() ?? null
}

function handleCancel(): void {
  emit('cancel')
  emit('update:modelValue', false)
}

function handleConfirm(): void {
  if (isProcessing.value) return

  const result = getResult()
  if (!result?.canvas) {
    console.error('[CropModal] 裁剪结果为空')
    handleCancel()
    return
  }

  isProcessing.value = true
  ;(result.canvas as HTMLCanvasElement).toBlob(
    (blob) => {
      isProcessing.value = false
      if (!blob) {
        console.error('[CropModal] canvas.toBlob 返回 null')
        handleCancel()
        return
      }
      emit('confirm', blob)
      emit('update:modelValue', false)
    },
    'image/jpeg',
    0.92,
  )
}
// #endif
</script>

<template>
  <!-- #ifdef H5 -->
  <view
    v-if="props.modelValue"
    class="fixed inset-0 z-100 flex flex-col bg-slate-900"
    style="padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom)"
  >
    <!-- 顶部操作栏 -->
    <view class="flex mt-80rpx flex-none items-center justify-between px-4 py-3">
      <button
        class="btn-base h-10 min-w-[64px] rounded-full bg-white/10 px-4 text-sm text-white"
        hover-class="opacity-80"
        @tap="handleCancel"
      >
        取消
      </button>
      <text class="text-xs text-white/60">移动或缩放裁剪框</text>
      <button
        class="btn-base h-10 min-w-[64px] rounded-full bg-[var(--color-mint)] px-5 text-sm font-700 text-white"
        hover-class="opacity-90"
        :loading="isProcessing"
        @tap="handleConfirm"
      >
        确定
      </button>
    </view>

    <!-- 裁剪区域：使用 calc 保证不会溢出 -->
    <view
      class="flex-1 overflow-hidden"
      style="min-height: 0"
    >
      <Cropper
        v-if="props.imageSrc"
        ref="cropperRef"
        :src="props.imageSrc"
        :stencil-props="{
          aspectRatio: props.aspectRatio,
        }"
        class="h-full w-full"
        style="max-height: 100%"
      />
    </view>
  </view>
  <!-- #endif -->

  <view v-if="false" />
</template>
