<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isValidImageSource } from '@/utils'

interface AppImageProps {
  src?: string
  mode?: UniHelper.ImageMode
  fallbackSrc?: string
  errorText?: string
}

const props = withDefaults(defineProps<AppImageProps>(), {
  src: '',
  mode: 'aspectFill',
  fallbackSrc: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 240 240%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22%3E%3Cstop stop-color=%22%23f8ead8%22/%3E%3Cstop offset=%221%22 stop-color=%22%23e4f5ee%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%22240%22 height=%22240%22 rx=%2236%22 fill=%22url(%23g)%22/%3E%3Ccircle cx=%22120%22 cy=%2290%22 r=%2224%22 fill=%22%2382c8b2%22/%3E%3Cpath d=%22M80 156c14-24 32-36 40-36s26 12 40 36%22 fill=%22none%22 stroke=%22%23669384%22 stroke-width=%2214%22 stroke-linecap=%22round%22/%3E%3Cpath d=%22M116 118c-10-24-26-34-42-34%22 fill=%22none%22 stroke=%22%23669384%22 stroke-width=%2212%22 stroke-linecap=%22round%22/%3E%3Cpath d=%22M124 120c10-24 26-34 42-34%22 fill=%22none%22 stroke=%22%23669384%22 stroke-width=%2212%22 stroke-linecap=%22round%22/%3E%3C/svg%3E',
  errorText: '图片正在休息',
})

const currentSrc = ref('')
const loading = ref(true)
const failed = ref(false)

const imageClass = computed(() => (
  props.mode === 'widthFix' ? 'w-full' : 'h-full w-full'
))

function resetImageState(): void {
  const source = isValidImageSource(props.src) ? props.src : props.fallbackSrc
  currentSrc.value = source
  failed.value = !isValidImageSource(props.src)
  loading.value = !failed.value
}

watch(
  () => props.src,
  () => {
    resetImageState()
  },
  {
    immediate: true,
  },
)

function handleLoad(): void {
  loading.value = false
}

function handleError(): void {
  if (currentSrc.value !== props.fallbackSrc) {
    currentSrc.value = props.fallbackSrc
    failed.value = true
    loading.value = false
    return
  }

  failed.value = true
  loading.value = false
}
</script>

<template>
  <view class="relative overflow-hidden" :class="$attrs.class">
    <image :src="currentSrc" :mode="props.mode" :class="imageClass" @load="handleLoad" @error="handleError" />
    <view v-if="loading"
      class="absolute inset-0 flex items-center justify-center bg-linear-to-br from-[#FFF8EF] via-white to-[#F2FBF6]">
      <view class="h-8 w-8 rounded-full border-3 border-[#CFEADD] border-t-[#7BC4AE] animate-spin" />
    </view>
    <view v-else-if="failed && props.errorText"
      class="absolute inset-x-0 bottom-0 bg-linear-to-t from-white/92 to-transparent px-3 pb-3 pt-8 text-center text-2xs text-slate-500">
      {{ props.errorText }}
    </view>
  </view>
</template>
