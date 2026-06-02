<script setup lang="ts">
import type { IUser } from '@florist/contracts'
import { computed, reactive, ref, watch } from 'vue'
import {
  handleCatchAndToast,
  showGentleToast,
} from '@/utils'
import { useBottomSheetGesture } from '@/hooks/useBottomSheetGesture'
import { usePreparedImageAssets } from '@/hooks/usePreparedImageAssets'
import AppImage from './app/AppImage.vue'
import CloseButton from './app/CloseButton.vue'
import SubmitBtn from './app/SubmitBtn.vue'

interface UserProfilePopupProps {
  modelValue: boolean
  currentUser: IUser | null
  loading?: boolean
}

const props = withDefaults(defineProps<UserProfilePopupProps>(), {
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: { nickname: string, avatarUrl: string, profileSignature: string }]
}>()

const formState = reactive({
  nickname: '',
  avatarUrl: '',
  profileSignature: '',
})
const choosingAvatar = ref(false)
const { chooseUploadedSingleImageUrl } = usePreparedImageAssets()

const modalClass = computed(() => (props.modelValue ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'))
const panelClass = computed(() => (props.modelValue ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-[0.98] opacity-0'))

watch(
  () => [props.modelValue, props.currentUser] as const,
  ([visible]) => {
    if (!visible) {
      return
    }

    formState.nickname = props.currentUser?.nickname ?? ''
    formState.avatarUrl = props.currentUser?.avatarUrl ?? ''
    formState.profileSignature = props.currentUser?.profileSignature ?? ''
  },
  { immediate: true },
)

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
})

async function handleChooseAvatar(): Promise<void> {
  choosingAvatar.value = true

  try {
    const avatarUrl = await chooseUploadedSingleImageUrl({
      assetPrefix: 'avatar',
      cropMode: 'square',
      maxWidth: 720,
      quality: 82,
      maxSizeInBytes: 1.2 * 1024 * 1024,
      initialQuality: 0.88,
      scope: 'avatar',
    })

    if (!avatarUrl) {
      return
    }

    formState.avatarUrl = avatarUrl
  }
  catch (error) {
    handleCatchAndToast(error, '头像处理失败，请换一张图片再试。')
  }
  finally {
    choosingAvatar.value = false
  }
}

function handleSubmit(): void {
  const nickname = formState.nickname.trim()
  const profileSignature = formState.profileSignature.trim()

  if (!nickname) {
    showGentleToast('昵称不能为空。')
    return
  }

  emit('submit', {
    nickname,
    avatarUrl: formState.avatarUrl.trim(),
    profileSignature,
  })
}
</script>

<template>
  <view class="fixed inset-0 z-70 flex items-end bg-slate-900/34 backdrop-blur-[6rpx]" :class="modalClass"
    :style="maskMotionStyle" @tap="closePopup">
    <view
      class="relative max-h-[90vh] w-full rounded-t-[40rpx] bg-[var(--color-surface)] px-5 pb-6 pt-4 shadow-[0_-18rpx_60rpx_rgba(15,23,42,0.14)] will-change-transform"
      :class="panelClass" :style="panelMotionStyle" @tap.stop="() => { }">
      <view class="mb-4" @touchstart.stop="handleTouchStart" @touchmove.stop.prevent="handleTouchMove"
        @touchend.stop="handleTouchEnd" @touchcancel.stop="handleTouchEnd">
        <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200" />
        <CloseButton @click="closePopup" />
        <view class="flex items-start justify-between gap-3">
          <view>
            <text class="block text-[38rpx] font-800 leading-tight text-app-ink">
              编辑资料
            </text>
            <text class="mt-2 block text-[26rpx] leading-6 text-app-muted">
              可以更新昵称、个性签名和头像，这些信息会跟随当前账号保存。
            </text>
          </view>
        </view>
      </view>

      <view class="flex flex-col gap-4">
        <button class="flex items-center gap-4 rounded-[28rpx] border-none bg-[#FBF6EE] px-4 py-4 text-left"
          hover-class="opacity-92" @tap="handleChooseAvatar">
          <view class="relative h-[128rpx] w-[128rpx] shrink-0">
            <view
              class="h-full w-full overflow-hidden rounded-full bg-[var(--color-surface)] shadow-[0_10rpx_24rpx_rgba(148,163,184,0.14)]">
              <AppImage class="h-full w-full" :src="formState.avatarUrl" mode="aspectFill" error-text="" />
            </view>
            <view v-if="choosingAvatar"
              class="absolute inset-0 flex items-center justify-center rounded-full bg-black/18 backdrop-blur-[2rpx]">
              <view class="h-7 w-7 rounded-full border-3 border-white/80 border-t-[#F59F54] animate-spin" />
            </view>
            <view
              class="absolute bottom-[6rpx] left-1/2 max-w-[104rpx] -translate-x-1/2 rounded-full bg-[#E9A15A] px-3 py-[4rpx] text-center text-[18rpx] leading-none text-white">
              替换头像
            </view>
          </view>
          <view class="min-w-0 flex-1">
            <text class="block text-[24rpx] leading-5 text-app-muted">点击头像替换，会自动裁成合适比例再压缩上传。</text>
          </view>
        </button>

        <view class="rounded-[28rpx] bg-[#F6F7FB] px-4 py-4">
          <text class="block text-[28rpx] font-700 text-app-ink">昵称</text>
          <input v-model="formState.nickname"
            class="mt-3 h-[96rpx] rounded-[24rpx] bg-[var(--color-surface)] px-4 text-[28rpx] text-app-ink" :maxlength="40"
            placeholder="给这片花园起一个称呼" />
        </view>

        <view class="rounded-[28rpx] bg-[#F7F3FA] px-4 py-4">
          <text class="block text-[28rpx] font-700 text-app-ink">个性签名</text>
          <textarea v-model="formState.profileSignature"
            class="field-textarea mt-3 min-h-[148rpx] rounded-[24rpx] bg-[var(--color-surface)] px-4 text-[27rpx] leading-7 text-app-ink"
            :maxlength="80" auto-height placeholder="写一句你想留给这片花园的话" />
        </view>

        <SubmitBtn text="保存资料" :loading="props.loading || choosingAvatar" variant="mint" size="md"
          @click="handleSubmit" />
      </view>
    </view>
  </view>
</template>
