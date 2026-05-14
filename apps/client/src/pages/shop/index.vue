<script setup lang="ts">
import { ref } from 'vue'
import { FLORIST_SHOP_PRODUCTS, SHOP_CATEGORY_DEFINITIONS, getShopCategoryLabel, openExternalLink } from '@/utils'

const pageMessage = ref('')

async function handleOpenProduct(url: string): Promise<void> {
  const opened = await openExternalLink(url)
  pageMessage.value = opened
    ? '已处理商品外链。H5 会新开页面，小程序会复制链接，不会进入交易流程。'
    : '这次没有成功处理外链，请稍后再试。'
}
</script>

<template>
  <view class="page-shell safe-pb min-h-screen bg-linear-to-b from-[#FFF9F2] via-[#FAF7F1] to-[#FFFDF8]">
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-4 pb-8">
      <view
        class="overflow-hidden rounded-[36rpx] bg-linear-to-br from-[#E5F3EA] via-[#FFF7E9] to-[#FCE9DF] px-5 py-5 shadow-[0_18rpx_54rpx_rgba(192,214,193,0.18)]">
        <view class="flex items-start justify-between gap-4">
          <view class="flex-1">
            <view class="badge-soft bg-white/80 text-slate-600">极简养花商城</view>
            <view class="mt-3 text-[42rpx] font-900 leading-tight text-slate-800">
              只保留养花刚需，不做复杂营销和交易流程
            </view>
            <view class="mt-2 text-sm leading-6 text-slate-600">
              这里只展示花盆、肥料、药剂、工具、营养土五类基础商品。没有弹窗推送、没有强制跳转、也不做站内下单。
            </view>
          </view>
          <view class="flex h-[150rpx] w-[150rpx] items-center justify-center rounded-full bg-white/60 text-[64rpx]">
            🛍️
          </view>
        </view>
      </view>

      <view v-if="pageMessage"
        class="rounded-[28rpx] bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-700 shadow-[0_12rpx_28rpx_rgba(251,191,36,0.12)]">
        {{ pageMessage }}
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <view>
          <text class="block text-base font-800 text-slate-800">商城边界</text>
          <text class="mt-1 block text-sm text-slate-500">不做凑单、秒杀、满减、弹窗、开屏或诱导式消费文案。</text>
        </view>

        <view class="mt-4 grid grid-cols-2 gap-3">
          <view v-for="category in SHOP_CATEGORY_DEFINITIONS" :key="category.id"
            class="rounded-[24rpx] bg-[#FBF7F1] px-4 py-4">
            <view class="flex items-center gap-2">
              <text class="text-lg">{{ category.emoji }}</text>
              <text class="text-sm font-800 text-slate-800">{{ category.label }}</text>
            </view>
            <text class="mt-2 block text-2xs leading-6 text-slate-500">{{ category.description }}</text>
          </view>
        </view>
      </view>

      <view class="flex flex-col gap-3">
        <view v-for="product in FLORIST_SHOP_PRODUCTS" :key="product.id" class="card-soft rounded-[32rpx] bg-white">
          <view class="flex items-start justify-between gap-3">
            <view class="min-w-0 flex-1">
              <view class="flex flex-wrap items-center gap-2">
                <text class="text-base font-800 text-slate-800">{{ product.title }}</text>
                <TagLabel :text="getShopCategoryLabel(product.category)" tone="cream" />
                <TagLabel :text="product.highlightLabel" tone="mint" />
              </view>
              <text class="mt-2 block text-sm text-slate-600">{{ product.subtitle }}</text>
              <text class="mt-3 block text-sm leading-6 text-slate-500">{{ product.intro }}</text>
            </view>
          </view>

          <view class="mt-4 rounded-[24rpx] bg-[#F8F5EE] px-4 py-4">
            <text class="block text-2xs tracking-[0.2em] text-slate-400">适配植物</text>
            <view class="mt-3 flex flex-wrap gap-2">
              <text v-for="item in product.suitablePlants" :key="item"
                class="rounded-full bg-white px-3 py-1.5 text-2xs text-slate-600">
                {{ item }}
              </text>
            </view>
          </view>

          <view class="mt-4">
            <ActionHintButton title="查看外链" hint="不在站内交易" icon="↗" @click="handleOpenProduct(product.externalUrl)" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>
