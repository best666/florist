<script setup lang="ts">
import { computed } from 'vue'
import type { EmptyStateScene } from '@/interfaces'
import SubmitBtn from './SubmitBtn.vue'

interface EmptyEmptyProps {
  /**
   * 空状态场景，用于映射默认插画与文案。
   */
  scene?: EmptyStateScene
  /**
   * 标题文案。
   */
  title?: string
  /**
   * 描述文案。
   */
  description?: string
  /**
   * 行动按钮文案，不传则不渲染按钮。
   */
  actionText?: string
}

const props = withDefaults(defineProps<EmptyEmptyProps>(), {
  scene: 'data',
  title: '',
  description: '',
  actionText: '',
})

const emit = defineEmits<{
  action: []
}>()

const sceneMetaMap: Record<EmptyStateScene, { title: string, description: string, emoji: string }> = {
  flower: {
    title: '还没有植株入住',
    description: '把第一盆小可爱放进档案里，之后的养护提醒和成长记录都会更顺手。',
    emoji: '🪴',
  },
  record: {
    title: '还没有养护足迹',
    description: '今天的浇水、施肥或修剪都值得被温柔记下，时间轴会替你保存成长节奏。',
    emoji: '🌿',
  },
  data: {
    title: '这里暂时空空的',
    description: '先歇一会儿也没关系，等你准备好再回来继续整理花园。',
    emoji: '☁️',
  },
}

const resolvedMeta = computed(() => sceneMetaMap[props.scene])

const resolvedTitle = computed(() => props.title || resolvedMeta.value.title)
const resolvedDescription = computed(() => props.description || resolvedMeta.value.description)

function handleAction(): void {
  emit('action')
}
</script>

<template>
  <view
    class="card-soft app-fade-up flex flex-col items-center justify-center gap-4 rounded-[32rpx] px-6 py-8 text-center dark:bg-slate-900 dark:text-slate-100">
    <view
      class="app-float-soft flex h-22 w-22 items-center justify-center rounded-full bg-linear-to-br from-app-cream via-app-surface to-[var(--color-blush)]/20 text-4xl shadow-[0_14rpx_32rpx_rgba(248,200,220,0.18)] dark:from-slate-800 dark:to-slate-700">
      {{ resolvedMeta.emoji }}
    </view>
    <view class="flex flex-col gap-2">
      <text class="text-[34rpx] font-800 text-app-ink dark:text-slate-100">
        {{ resolvedTitle }}
      </text>
      <text class="text-sm leading-6 text-app-muted dark:text-slate-300">
        {{ resolvedDescription }}
      </text>
    </view>
    <SubmitBtn v-if="props.actionText" :text="props.actionText" variant="blush" :block="false" @click="handleAction" />
  </view>
</template>
