<script setup lang="ts">
import { ref } from 'vue'
import TagLabel from '@/components/TagLabel.vue'
import PageHero from '@/components/PageHero.vue'
import ActionHintButton from '@/components/ActionHintButton.vue'
import { FLORIST_SHOP_PRODUCTS, SHOP_CATEGORY_DEFINITIONS, getShopCategoryLabel, openExternalLink } from '@/utils'
import { usePageTheme } from '@/hooks/usePageTheme'

const themeClass = usePageTheme()

const pageMessage = ref('')

async function handleOpenProduct(url: string): Promise<void> {
  const opened = await openExternalLink(url)
  pageMessage.value = opened
    ? '已处理商品外链。H5 会新开页面，小程序会复制链接，不会进入交易流程。'
    : '这次没有成功处理外链，请稍后再试。'
}
</script>

<template>
  <view class="page-shell safe-pb min-h-screen bg-linear-to-b from-app-ivory via-[var(--color-cream)] to-app-ivory" :class="themeClass">
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-4 pb-[40rpx]">
      <PageHero
        badge="极简养花商城"
        title="只保留养花刚需，不做复杂营销和交易流程"
        tip="花盆、肥料、药剂、工具、营养土 — 五类基础商品。没有弹窗推送、没有强制跳转、也不做站内下单，安静挑选。"
        emoji="🛍️"
      />

      <view v-if="pageMessage"
        class="rounded-[28rpx] bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-700 shadow-[0_12rpx_28rpx_rgba(251,191,36,0.12)]">
        {{ pageMessage }}
      </view>

      <view class="card-soft rounded-[32rpx]">
        <view>
          <text class="block text-base font-800 text-app-ink">商城边界</text>
          <text class="mt-1 block text-sm text-app-muted">不做凑单、秒杀、满减、弹窗、开屏或诱导式消费文案。</text>
        </view>

        <view class="mt-4 grid grid-cols-2 gap-3">
          <view v-for="category in SHOP_CATEGORY_DEFINITIONS" :key="category.id"
            class="rounded-[24rpx] bg-[var(--color-cream)]/50 px-4 py-4">
            <view class="flex items-center gap-2">
              <text class="text-lg">{{ category.emoji }}</text>
              <text class="text-sm font-800 text-app-ink">{{ category.label }}</text>
            </view>
            <text class="mt-2 block text-2xs leading-6 text-app-muted">{{ category.description }}</text>
          </view>
        </view>
      </view>

      <view class="flex flex-col gap-3">
        <view v-for="product in FLORIST_SHOP_PRODUCTS" :key="product.id" class="card-soft rounded-[32rpx]">
          <view class="flex items-start justify-between gap-3">
            <view class="min-w-0 flex-1">
              <view class="flex flex-wrap items-center gap-2">
                <text class="text-base font-800 text-app-ink">{{ product.title }}</text>
                <TagLabel :text="getShopCategoryLabel(product.category)" tone="cream" />
                <TagLabel :text="product.highlightLabel" tone="mint" />
              </view>
              <text class="mt-2 block text-sm text-app-muted">{{ product.subtitle }}</text>
              <text class="mt-3 block text-sm leading-6 text-app-muted">{{ product.intro }}</text>
            </view>
          </view>

          <view class="mt-4 rounded-[24rpx] bg-[var(--color-cream)]/40 px-4 py-4">
            <text class="block text-2xs tracking-[0.2em] text-app-muted/70">适配植物</text>
            <view class="mt-3 flex flex-wrap gap-2">
              <text v-for="item in product.suitablePlants" :key="item"
                class="rounded-full bg-[var(--color-surface)] px-3 py-1.5 text-2xs text-app-muted">
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
