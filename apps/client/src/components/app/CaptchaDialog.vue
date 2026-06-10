<script setup lang="ts">
/**
 * CaptchaDialog — 图形验证码弹窗
 *
 * 居中弹出，用于短信发送前的人机验证。
 * 展示一道算术题 SVG，用户输入答案后确认。
 */

interface CaptchaDialogProps {
  /** 是否展示弹窗 */
  modelValue: boolean
  /** 验证码 SVG 字符串（原始，通过 v-html 内联渲染） */
  captchaSvg: string
  /** 正在加载验证码图片 */
  loading?: boolean
  /** 正在发送中（确认按钮 loading 态） */
  sending?: boolean
}

const props = withDefaults(defineProps<CaptchaDialogProps>(), {
  loading: false,
  sending: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** 用户输入答案后点击确认，payload 为答案字符串 */
  confirm: [answer: string]
  /** 用户取消 */
  cancel: []
  /** 用户点击验证码图片请求刷新 */
  refresh: []
}>()

const answer = ref('')

const canConfirm = computed(() => answer.value.trim().length > 0 && !props.sending)

function handleConfirm(): void {
  if (!canConfirm.value) return
  emit('confirm', answer.value.trim())
}

function handleCancel(): void {
  answer.value = ''
  emit('cancel')
  emit('update:modelValue', false)
}

function handleRefresh(): void {
  answer.value = ''
  emit('refresh')
}

function handleMaskTap(): void {
  handleCancel()
}

// 弹窗关闭时清空输入
watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) {
      answer.value = ''
    }
  },
)
</script>

<template>
  <view
    v-if="props.modelValue"
    class="fixed inset-0 z-80 flex items-center justify-center bg-slate-900/50 px-8"
    @tap.stop="handleMaskTap"
  >
    <view
      class="w-full max-w-[600rpx] rounded-[32rpx] bg-[var(--color-surface)] px-6 py-6 shadow-[0_12rpx_48rpx_rgba(15,23,42,0.24)] dark:bg-slate-900"
      @tap.stop="() => {}"
    >
      <!-- 标题 -->
      <view class="mb-5 text-center">
        <text class="text-base font-700 text-app-ink dark:text-slate-100">安全验证</text>
        <text class="mt-2 block text-xs text-app-muted dark:text-slate-400">
          请计算下方算术题，完成后发送验证码
        </text>
      </view>

      <!-- 验证码图片（点击刷新，SVG 内联渲染避免 UniApp image 组件对 data URI 的兼容问题） -->
      <view
        class="mb-4 flex h-[120rpx] items-center justify-center overflow-hidden rounded-[20rpx] bg-[#F5F7FA] p-2 dark:bg-slate-800"
        @tap="handleRefresh"
      >
        <view
          v-if="props.captchaSvg"
          class="captcha-svg-wrapper flex items-center justify-center"
          v-html="props.captchaSvg"
        />
        <text
          v-else
          class="text-xs text-app-muted/70 dark:text-slate-400"
        >
          {{ props.loading ? '加载中...' : '点击加载验证码' }}
        </text>
      </view>

      <!-- 答案输入 -->
      <input
        v-model="answer"
        class="mb-4 h-[80rpx] w-full rounded-[24rpx] bg-[var(--color-cream)]/40 px-4 text-center text-base text-app-ink dark:bg-slate-800 dark:text-slate-100"
        type="number"
        :maxlength="3"
        placeholder="请输入计算结果"
        @confirm="handleConfirm"
      />

      <!-- 操作按钮 -->
      <view class="flex gap-3">
        <button
          class="btn-base h-[76rpx] flex-1 justify-center rounded-[24rpx] border-none bg-slate-100 text-sm text-app-muted dark:bg-slate-800 dark:text-slate-300"
          hover-class="opacity-92"
          @tap="handleCancel"
        >
          取消
        </button>
        <button
          class="btn-base h-[76rpx] flex-1 justify-center rounded-[24rpx] border-none text-sm font-600 text-white"
          :class="
            canConfirm
              ? 'bg-[#4A8C7E] dark:bg-[#3D6B5E]'
              : 'bg-slate-300 dark:bg-slate-600'
          "
          :disabled="!canConfirm"
          hover-class="opacity-92"
          @tap="handleConfirm"
        >
          {{ props.sending ? '发送中...' : '确认发送' }}
        </button>
      </view>
    </view>
  </view>
</template>
