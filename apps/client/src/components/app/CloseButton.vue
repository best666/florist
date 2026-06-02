<script setup lang="ts">
defineEmits<{
  click: []
}>()
</script>

<template>
  <view class="absolute right-4 top-4 z-10">
    <button
      class="btn-base h-[56rpx] w-[56rpx] rounded-full bg-slate-100 text-lg text-app-muted dark:bg-slate-800 dark:text-slate-300"
      hover-class="opacity-80"
      @tap="$emit('click')"
    >
      <text class="leading-none">×</text>
    </button>
  </view>
</template>
