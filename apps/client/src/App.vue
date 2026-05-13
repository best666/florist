<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/store'
import { getRuntimePlatform } from '@/utils/platform'

const appStore = useAppStore()

onLaunch(() => {
  appStore.setRuntimePlatform(getRuntimePlatform())
})

onShow(() => {
  appStore.setRuntimePlatform(getRuntimePlatform())
})
</script>

<template>
  <slot />
</template>
