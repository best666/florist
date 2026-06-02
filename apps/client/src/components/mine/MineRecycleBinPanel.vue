<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useFlowerStore } from '@/store'
import { formatDateTime, getTimeAgo, showGentleSuccess, showGentleToast } from '@/utils'

const flowerStore = useFlowerStore()
const { recycleBinFlowers } = storeToRefs(flowerStore)

defineProps<{
  recycleBinSummary: string
}>()

async function handleRestoreFlower(flowerId: string): Promise<void> {
  const restored = await flowerStore.restoreFlowerFromRecycleBin(flowerId)

  if (!restored) {
    showGentleToast('这株植物可能已经先一步回到花园了。')
    return
  }

  showGentleSuccess('植物已经回到花园啦。')
}
</script>

<template>
  <view
    v-if="recycleBinFlowers.length === 0"
    class="mt-4 rounded-[24rpx] bg-[var(--color-cream)]/50 px-4 py-5 text-sm leading-6 text-app-muted"
  >
    最近没有误删内容，后续删除的植物会先在这里静静保留。
  </view>

  <view
    v-else
    class="mt-4 flex flex-col gap-3"
  >
    <view
      v-for="flower in recycleBinFlowers"
      :key="flower.id"
      class="rounded-[24rpx] bg-[var(--color-cream)]/50 px-4 py-4"
    >
      <view class="flex items-center justify-between gap-3">
        <view class="min-w-0 flex-1">
          <text class="block truncate text-sm font-800 text-app-ink">{{ flower.name }}</text>
          <text class="mt-1 block text-2xs leading-5 text-app-muted">
            删除于 {{ flower.deletedAt ? getTimeAgo(flower.deletedAt) : '刚刚' }}
          </text>
          <text
            v-if="flower.pendingPurgeAt"
            class="mt-1 block text-2xs leading-5 text-app-muted/70"
          >
            预计清理：{{ formatDateTime(flower.pendingPurgeAt, { pattern: 'YYYY-MM-DD HH:mm' }) }}
          </text>
        </view>
        <button
          class="h-[76rpx] rounded-full border-none bg-[var(--color-mint)]/20 px-4 text-2xs font-800 text-[var(--color-sage)]"
          hover-class="opacity-92"
          @tap="handleRestoreFlower(flower.id)"
        >
          恢复
        </button>
      </view>
    </view>
  </view>
</template>
