<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { requestH5PhoneCode } from '@/api'
import { ClientPlatform } from '@/interfaces'
import { useBottomSheetGesture } from '@/hooks/useBottomSheetGesture'
import { showGentleToast } from '@/utils'
import SubmitBtn from './SubmitBtn.vue'

interface AuthLoginPopupProps {
  modelValue: boolean
  platform: ClientPlatform
  loading?: boolean
}

const props = withDefaults(defineProps<AuthLoginPopupProps>(), {
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submitH5: [payload: { phoneNumber: string, verificationCode: string }]
  loginWechat: []
}>()

const h5Form = reactive({
  phoneNumber: '',
  verificationCode: '',
})
const requestingCode = ref(false)
const countdownSeconds = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const isH5 = computed(() => props.platform === ClientPlatform.H5)
const canRequestVerificationCode = computed(() => (
  isH5.value
  && /^1\d{10}$/.test(h5Form.phoneNumber.trim())
  && !requestingCode.value
  && countdownSeconds.value === 0
))
const verificationCodeButtonText = computed(() => (
  countdownSeconds.value > 0 ? `${countdownSeconds.value}s 后重试` : '获取验证码'
))

function closePopup(): void {
  emit('update:modelValue', false)
}

const {
  handleTouchEnd,
  handleTouchMove,
  handleTouchStart,
  maskMotionStyle,
  panelMotionStyle,
} = useBottomSheetGesture({
  visible: () => props.modelValue,
  onClose: closePopup,
  closeThreshold: 96,
  hiddenOffset: 56,
})

function handleMaskTap(): void {
  closePopup()
}

function handleSubmitH5(): void {
  emit('submitH5', {
    phoneNumber: h5Form.phoneNumber.trim(),
    verificationCode: h5Form.verificationCode.trim(),
  })
}

function clearCountdownTimer(): void {
  if (!countdownTimer) {
    return
  }

  clearInterval(countdownTimer)
  countdownTimer = null
}

function startCountdown(seconds: number): void {
  clearCountdownTimer()
  countdownSeconds.value = Math.max(Math.floor(seconds), 0)

  if (countdownSeconds.value <= 0) {
    return
  }

  countdownTimer = setInterval(() => {
    if (countdownSeconds.value <= 1) {
      countdownSeconds.value = 0
      clearCountdownTimer()
      return
    }

    countdownSeconds.value -= 1
  }, 1000)
}

async function handleRequestH5Code(): Promise<void> {
  const phoneNumber = h5Form.phoneNumber.trim()

  if (!/^1\d{10}$/.test(phoneNumber)) {
    showGentleToast('请先输入正确的 11 位手机号。')
    return
  }

  requestingCode.value = true

  try {
    const result = await requestH5PhoneCode({ phoneNumber })

    if (result.verificationCode) {
      h5Form.verificationCode = result.verificationCode
    }

    startCountdown(result.cooldownSeconds)
    showGentleToast(result.verificationCode
      ? `${result.message} 已为你自动填入验证码。`
      : `${result.message} 请留意 ${result.maskedPhoneNumber}。`)
  }
  catch (error) {
    showGentleToast(error instanceof Error ? error.message : '验证码暂时发送失败，请稍后再试。')
  }
  finally {
    requestingCode.value = false
  }
}

function handleWechatLogin(): void {
  emit('loginWechat')
}

onBeforeUnmount(() => {
  clearCountdownTimer()
})
</script>

<template>
  <view class="fixed inset-0 z-70 flex items-end justify-center bg-slate-900/34 px-5 pb-8 pt-10 backdrop-blur-[6rpx]"
    :class="props.modelValue ? 'pointer-events-auto' : 'pointer-events-none'" :style="maskMotionStyle"
    @tap="handleMaskTap">
    <view class="w-full max-w-[720rpx] rounded-[36rpx] bg-[var(--color-surface)] px-5 py-5 shadow-[0_18rpx_60rpx_rgba(15,23,42,0.18)]"
      :style="panelMotionStyle" @tap.stop="() => { }">
      <view @touchstart.stop="handleTouchStart" @touchmove.stop.prevent="handleTouchMove"
        @touchend.stop="handleTouchEnd" @touchcancel.stop="handleTouchEnd">
        <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200" />
        <view class="mb-5 flex flex-col gap-2 text-center">
          <text class="text-lg font-700 text-app-ink">
            {{ isH5 ? '手机号验证登录' : '微信小程序登录' }}
          </text>
          <text class="text-sm leading-6 text-app-muted">
            {{ isH5 ? 'H5 采用手机号 + 验证码登录，本次登录会把后续请求切换到你的个人花园。' : '小程序会直接调用微信登录能力，成功后自动切换到你的个人花园。' }}
          </text>
        </view>
      </view>

      <view v-if="isH5" class="flex flex-col gap-3">
        <input v-model="h5Form.phoneNumber" class="h-[92rpx] rounded-[24rpx] bg-[var(--color-cream)]/60 px-4 text-sm text-app-ink"
          type="number" :maxlength="11" placeholder="请输入手机号" />
        <view class="flex items-stretch gap-3">
          <input v-model="h5Form.verificationCode"
            class="h-[92rpx] min-w-0 flex-1 rounded-[24rpx] bg-[var(--color-cream)]/40 px-4 text-sm text-app-ink" type="number"
            :maxlength="12" placeholder="请输入验证码" />
          <button
            class="btn-base h-[92rpx] min-h-[92rpx] min-w-[220rpx] flex-none justify-center rounded-[24rpx] border-none px-4 text-center text-sm font-700 leading-none"
            :class="canRequestVerificationCode ? 'bg-[var(--color-mint)]/20 text-[var(--color-sage)]' : 'bg-slate-100 text-app-muted/70'"
            :disabled="!canRequestVerificationCode" hover-class="opacity-92" @tap="handleRequestH5Code">
            <text class="text-center leading-none">{{ requestingCode ? '发送中...' : verificationCodeButtonText }}</text>
          </button>
        </view>
        <view class="rounded-[24rpx] bg-[var(--color-cream)]/50 px-4 py-4 text-sm leading-6 text-app-muted">
          当前开发环境已配置一组可验证账号。需要先获取验证码，验证码会自动回填，且仅在最近一次请求后的 5 分钟内有效。验证码不正确或已过期时，需要重新获取后再登录。
        </view>
        <SubmitBtn text="立即登录" :loading="props.loading" variant="mint" size="md" @click="handleSubmitH5" />
      </view>

      <view v-else class="flex flex-col gap-3">
        <view class="rounded-[24rpx] bg-[var(--color-cream)]/50 px-4 py-4 text-sm leading-6 text-app-muted">
          点击下方按钮后会调用微信登录，获取到临时 code 再交给当前后端完成用户识别。
        </view>
        <SubmitBtn text="使用微信登录" :loading="props.loading" variant="mint" size="md" @click="handleWechatLogin" />
      </view>

      <button class="btn-pill-md mt-3 bg-slate-100 text-app-muted" hover-class="opacity-92" @tap="closePopup">
        先看看
      </button>
    </view>
  </view>
</template>
