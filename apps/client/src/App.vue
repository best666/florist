<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { computed } from 'vue'
import { useAppStore } from '@/store'
import { useMemberStore } from '@/store'
import { getRuntimePlatform } from '@/utils/platform'

const appStore = useAppStore()
const memberStore = useMemberStore()

const themeStyleVariables = computed(() => memberStore.themeStyleVariables)

onLaunch(() => {
  appStore.setRuntimePlatform(getRuntimePlatform())
  memberStore.syncMembershipStatus()
})

onShow(() => {
  appStore.setRuntimePlatform(getRuntimePlatform())
  memberStore.syncMembershipStatus()
})
</script>

<template>
  <view class="min-h-screen" :style="themeStyleVariables">
    <slot />
    <GlobalAdBanner />
  </view>
</template>
