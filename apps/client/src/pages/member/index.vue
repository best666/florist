<script setup lang="ts">
import type { IMemberPackagePlan } from '@florist/contracts'
import {
  MemberBenefitType,
  MemberPaymentChannel,
  MemberPaymentStatus,
  MemberPackageType,
} from '@florist/contracts'
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import PaymentQrPanel from '@/components/PaymentQrPanel.vue'
import { useAppStore, useMemberStore } from '@/store'
import {
  requestMiniProgramMemberPayment,
} from '@/api'
import {
  THEME_SKIN_DEFINITIONS,
  formatDateTime,
  formatPriceInYuan,
  getMemberBenefitDescription,
  getMemberBenefitLabel,
  resolveMemberPaymentChannel,
  resolveMemberPlan,
} from '@/utils'

const appStore = useAppStore()
const memberStore = useMemberStore()
const pageMessage = ref('')
const isSubmittingPayment = ref(false)

onShow(() => {
  memberStore.syncMembershipStatus()
})

const packagePlans = computed<ReadonlyArray<IMemberPackagePlan>>(() => memberStore.packagePlans)
const selectedPlan = computed(() => resolveMemberPlan(memberStore.selectedPackageType))
const themeSkins = computed(() => THEME_SKIN_DEFINITIONS)
const currentOrder = computed(() => memberStore.currentOrder)
const currentThemeId = computed(() => memberStore.memberCache.themeSkinId)
const paymentChannel = computed(() => resolveMemberPaymentChannel(appStore.runtimePlatform ?? 'h5'))
const isH5Payment = computed(() => paymentChannel.value === MemberPaymentChannel.H5QrCode)
const memberExpiresText = computed(() => {
  if (!memberStore.memberCache.expiredAt) {
    return memberStore.memberCache.activePackageType === MemberPackageType.Lifetime
      ? '终身有效'
      : '未开通'
  }

  return formatDateTime(memberStore.memberCache.expiredAt, {
    pattern: 'YYYY-MM-DD HH:mm',
  })
})

const visibleBenefits = computed(() => {
  const benefitSet = new Set<MemberBenefitType>()

  packagePlans.value.forEach((plan) => {
    plan.benefitTypes.forEach((benefit) => {
      if ([
        MemberBenefitType.UnlimitedAiAdvice,
        MemberBenefitType.NoWatermark,
        MemberBenefitType.AllThemes,
        MemberBenefitType.CloudBackup,
        MemberBenefitType.AdFree,
      ].includes(benefit)) {
        benefitSet.add(benefit)
      }
    })
  })

  return Array.from(benefitSet)
})

function handleSelectPackage(packageType: MemberPackageType): void {
  memberStore.selectPackage(packageType)
  pageMessage.value = ''
}

async function handleSubmitPayment(): Promise<void> {
  isSubmittingPayment.value = true

  try {
    if (isH5Payment.value) {
      memberStore.createPaymentOrder(MemberPaymentChannel.H5QrCode)
      pageMessage.value = '二维码已生成，请扫码后点击“我已完成支付”确认一次性购买。'
      return
    }

    const order = memberStore.createPaymentOrder(MemberPaymentChannel.MpWeixin)
    const result = await requestMiniProgramMemberPayment(order)
    memberStore.replaceCurrentOrder(result)

    if (result.status === MemberPaymentStatus.Paid) {
      memberStore.completeCurrentOrder()
      pageMessage.value = memberStore.latestMessage
      return
    }

    memberStore.cancelCurrentOrder()
    pageMessage.value = '你已取消本次支付，没有发生自动续费或隐性扣费。'
  }
  finally {
    isSubmittingPayment.value = false
  }
}

function handleConfirmH5Payment(): void {
  if (!currentOrder.value || currentOrder.value.status !== MemberPaymentStatus.Pending) {
    pageMessage.value = '先生成一笔待支付订单，再确认扫码结果。'
    return
  }

  memberStore.completeCurrentOrder()
  pageMessage.value = memberStore.latestMessage
}

function handleCancelOrder(): void {
  memberStore.cancelCurrentOrder()
  pageMessage.value = '当前订单已取消，不会继续扣费。'
}

function handleApplyTheme(themeId: (typeof THEME_SKIN_DEFINITIONS)[number]['id']): void {
  const succeeded = memberStore.setTheme(themeId)
  pageMessage.value = succeeded ? memberStore.latestMessage : memberStore.latestMessage
}
</script>

<template>
  <view class="page-shell safe-pb min-h-screen bg-linear-to-b from-[#FFF7F0] via-[#FAF6F0] to-[#FFFDF8]">
    <view class="mx-auto flex max-w-[760rpx] flex-col gap-4 pb-8">
      <view
        class="overflow-hidden rounded-[36rpx] bg-linear-to-br from-[#F6DFC2] via-[#FFF4E5] to-[#E2F5EC] px-5 py-5 shadow-[0_18rpx_54rpx_rgba(226,199,155,0.22)]">
        <view class="flex items-start justify-between gap-4">
          <view class="flex-1">
            <view class="badge-soft bg-white/80 text-slate-600">会员体系 + 皮肤主题中心</view>
            <view class="mt-3 text-[42rpx] font-900 leading-tight text-slate-800">
              会员一次购买生效，不自动续费，到期自动降级
            </view>
            <view class="mt-2 text-sm leading-6 text-slate-600">
              三种套餐统一走显式确认，不做隐性扣费。会员状态、本地权益和过期时间都会加密缓存，并用于全局权限拦截。
            </view>
          </view>
          <view class="flex h-[150rpx] w-[150rpx] items-center justify-center rounded-full bg-white/60 text-[64rpx]">
            👑
          </view>
        </view>
      </view>

      <view v-if="pageMessage"
        class="rounded-[28rpx] bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-700 shadow-[0_12rpx_28rpx_rgba(251,191,36,0.12)]">
        {{ pageMessage }}
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <view class="flex items-center justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800">当前状态</text>
            <text class="mt-1 block text-sm text-slate-500">{{ memberStore.currentStatusLabel }}</text>
          </view>
          <TagLabel :text="memberStore.isMemberActive ? '权益生效中' : '免费版'"
            :tone="memberStore.isMemberActive ? 'mint' : 'slate'" />
        </view>

        <view class="mt-4 grid grid-cols-2 gap-3">
          <view class="rounded-[24rpx] bg-[#FBF6EE] px-4 py-4">
            <text class="block text-2xs text-slate-400">当前套餐</text>
            <text class="mt-2 block text-sm font-800 text-slate-800">{{ memberStore.memberCache.activePackageType ?
              resolveMemberPlan(memberStore.memberCache.activePackageType).title : '未开通' }}</text>
          </view>
          <view class="rounded-[24rpx] bg-[#F6F7FB] px-4 py-4">
            <text class="block text-2xs text-slate-400">到期时间</text>
            <text class="mt-2 block text-sm font-800 text-slate-800">{{ memberExpiresText }}</text>
          </view>
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <view>
          <text class="block text-base font-800 text-slate-800">套餐选择</text>
          <text class="mt-1 block text-sm text-slate-500">月卡、年卡、终身卡都为一次性购买，不自动续费。</text>
        </view>

        <view class="mt-4 flex flex-col gap-3">
          <button v-for="plan in packagePlans" :key="plan.packageType"
            class="rounded-[28rpx] border-none px-4 py-4 text-left"
            :class="memberStore.selectedPackageType === plan.packageType ? 'bg-linear-to-r from-[#F5E1C5] via-[#FFF2DD] to-[#E7F5EE]' : 'bg-[#FBF7F1]'"
            hover-class="opacity-92" @tap="handleSelectPackage(plan.packageType)">
            <view class="flex items-center justify-between gap-3">
              <view>
                <view class="flex items-center gap-2">
                  <text class="text-sm font-800 text-slate-800">{{ plan.title }}</text>
                  <text v-if="plan.highlightLabel"
                    class="rounded-full bg-white/80 px-2 py-1 text-3xs font-800 text-slate-500">{{ plan.highlightLabel
                    }}</text>
                </view>
                <text class="mt-1 block text-2xs leading-5 text-slate-500">{{ plan.subtitle }}</text>
              </view>
              <view class="text-right">
                <text class="block text-lg font-900 text-slate-800">￥{{ formatPriceInYuan(plan.priceInCents) }}</text>
                <text v-if="plan.originPriceInCents" class="mt-1 block text-3xs text-slate-400 line-through">￥{{
                  formatPriceInYuan(plan.originPriceInCents) }}</text>
              </view>
            </view>
            <text class="mt-3 block text-2xs leading-5 text-slate-500">{{ plan.disclaimer }}</text>
          </button>
        </view>

        <view class="mt-4 rounded-[24rpx] bg-[#FFF7ED] px-4 py-4">
          <text class="block text-sm font-800 text-slate-800">已选套餐</text>
          <text class="mt-2 block text-sm text-slate-600">{{ selectedPlan.title }} · ￥{{
            formatPriceInYuan(selectedPlan.priceInCents) }}</text>
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <view>
          <text class="block text-base font-800 text-slate-800">会员权益</text>
          <text class="mt-1 block text-sm text-slate-500">权益枚举会直接参与功能判断，不走模糊字符串匹配。</text>
        </view>

        <view class="mt-4 flex flex-col gap-3">
          <view v-for="benefit in visibleBenefits" :key="benefit" class="rounded-[24rpx] bg-[#FBF6EE] px-4 py-4">
            <view class="flex items-center justify-between gap-3">
              <text class="text-sm font-800 text-slate-800">{{ getMemberBenefitLabel(benefit) }}</text>
              <TagLabel :text="memberStore.hasBenefit(benefit) ? '已解锁' : '会员专属'"
                :tone="memberStore.hasBenefit(benefit) ? 'mint' : 'cream'" />
            </view>
            <text class="mt-2 block text-2xs leading-6 text-slate-500">{{ getMemberBenefitDescription(benefit) }}</text>
          </view>
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <view class="flex items-center justify-between gap-3">
          <view>
            <text class="block text-base font-800 text-slate-800">支付确认</text>
            <text class="mt-1 block text-sm text-slate-500">小程序优先走微信支付桥接，H5 展示扫码二维码。</text>
          </view>
          <TagLabel :text="isH5Payment ? 'H5 扫码支付' : '微信支付'" tone="blush" />
        </view>

        <view class="mt-4 rounded-[24rpx] bg-[#FBF7F1] px-4 py-4 text-sm leading-6 text-slate-600">
          当前不会自动续费。每次购买前都需要你显式确认套餐和金额，取消支付不会产生后续扣费。
        </view>

        <button
          class="mt-4 h-[92rpx] rounded-[24rpx] border-none bg-linear-to-r from-[#EFD3A4] to-[#E6E6C7] text-sm font-800 text-slate-700"
          hover-class="opacity-92" :loading="isSubmittingPayment" @tap="handleSubmitPayment">
          {{ isH5Payment ? '生成 H5 支付二维码' : '发起微信支付' }}
        </button>

        <view v-if="currentOrder && currentOrder.status === MemberPaymentStatus.Pending && isH5Payment"
          class="mt-4 flex flex-col gap-3">
          <PaymentQrPanel :text="currentOrder.qrCodeText ?? currentOrder.id" />
          <view class="grid grid-cols-2 gap-3">
            <button class="h-[88rpx] rounded-[22rpx] border-none bg-[#E8F6EE] text-sm font-700 text-emerald-700"
              hover-class="opacity-92" @tap="handleConfirmH5Payment">
              我已完成支付
            </button>
            <button class="h-[88rpx] rounded-[22rpx] border-none bg-[#F9E6E6] text-sm font-700 text-rose-600"
              hover-class="opacity-92" @tap="handleCancelOrder">
              取消订单
            </button>
          </view>
        </view>
      </view>

      <view class="card-soft rounded-[32rpx] bg-white">
        <view>
          <text class="block text-base font-800 text-slate-800">皮肤主题中心</text>
          <text class="mt-1 block text-sm text-slate-500">切换后会立即刷新全局 UnoCSS 变量配色。</text>
        </view>

        <view class="mt-4 grid grid-cols-2 gap-3">
          <button v-for="theme in themeSkins" :key="theme.id" class="rounded-[24rpx] border-none px-4 py-4 text-left"
            :class="currentThemeId === theme.id ? 'bg-linear-to-br from-[#F5E6D2] to-[#EEF6ED]' : 'bg-[#FBF7F1]'"
            hover-class="opacity-92" @tap="handleApplyTheme(theme.id)">
            <view class="flex items-center justify-between gap-2">
              <text class="text-lg">{{ theme.previewEmoji }}</text>
              <text v-if="theme.memberOnly"
                class="rounded-full bg-white/80 px-2 py-1 text-3xs font-800 text-slate-500">会员</text>
            </view>
            <text class="mt-3 block text-sm font-800 text-slate-800">{{ theme.label }}</text>
            <text class="mt-1 block text-2xs leading-5 text-slate-500">{{ theme.description }}</text>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>
