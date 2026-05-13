<script setup lang="ts">
interface AppSectionCardProps {
  title: string
  description: string
  accentClass?: string
}

const props = withDefaults(defineProps<AppSectionCardProps>(), {
  accentClass: 'bg-app-cream',
})
</script>

<template>
  <view class="card-soft flex flex-col gap-3">
    <view class="flex items-start justify-between gap-3">
      <view>
        <view class="text-base font-700 text-slate-800">
          {{ props.title }}
        </view>
        <view class="mt-1 text-sm leading-6 text-slate-500">
          {{ props.description }}
        </view>
      </view>
      <view :class="['h-10 w-10 rounded-full', props.accentClass]" />
    </view>
    <slot />
  </view>
</template>
