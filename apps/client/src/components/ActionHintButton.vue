<script setup lang="ts">
interface ActionHintButtonProps {
  title: string
  hint: string
  icon?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<ActionHintButtonProps>(), {
  icon: '↗',
  disabled: false,
})

const emit = defineEmits<{
  click: []
}>()

function handleTap(): void {
  if (props.disabled) {
    return
  }

  emit('click')
}
</script>

<template>
  <button
    class="btn-panel w-full items-stretch justify-between rounded-[26rpx] bg-linear-to-r from-[#e7f4eb] to-[#fff2de] px-4 py-4 text-app-ink shadow-[0_14rpx_30rpx_rgba(210,191,160,0.18)]"
    :class="props.disabled ? 'opacity-60 saturate-80' : ''" hover-class="opacity-92" @tap="handleTap">
    <view class="min-w-0 flex-1 text-left">
      <text class="block whitespace-nowrap text-sm font-800 leading-none text-app-ink">
        {{ props.title }}
      </text>
      <text class="mt-2 block text-2xs leading-5 text-app-muted">
        {{ props.hint }}
      </text>
    </view>
    <view
      class="ml-4 flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/72 text-[26rpx] text-app-ink">
      {{ props.icon }}
    </view>
  </button>
</template>
