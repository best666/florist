<script setup lang="ts">
import type { IUser } from '@florist/contracts'
import { computed, reactive, ref, watch } from 'vue'
import { uploadPreparedImage } from '@/api'
import {
  compressImageSafely,
  readImageAsDataUrl,
  revokeCompressedImageUrl,
  showGentleToast,
} from '@/utils'
import { useBottomSheetGesture } from '@/hooks/useBottomSheetGesture'
import AppImage from './AppImage.vue'
import SubmitBtn from './SubmitBtn.vue'

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
    const imageResult = await uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    })
    const tempFilePath = imageResult.tempFilePaths[0]

    if (!tempFilePath) {
      return
    }

    const compressed = await compressImageSafely(tempFilePath, {
      maxSizeInBytes: 1.2 * 1024 * 1024,
      initialQuality: 0.88,
    })
    const dataUrl = await readImageAsDataUrl(compressed.filePath)
    const uploaded = await uploadPreparedImage({
      dataUrl,
      scope: 'avatar',
      cropMode: 'square',
      maxWidth: 720,
      quality: 82,
    })

    if (compressed.filePath !== tempFilePath) {
      revokeCompressedImageUrl(compressed.filePath)
    }

    formState.avatarUrl = uploaded.url
  }
  catch (error) {
    showGentleToast(error instanceof Error ? error.message : '头像处理失败，请换一张图片再试。')
  }
  finally {
    choosingAvatar.value = false
  }
}

function handleSubmit(): void {
  const nickname = formState.nickname.trim()
  const profileSignature = formState.profileSignature.trim()

  if (!nickname) {
    showGentleToast('用户名不能为空。')
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
      class="max-h-[90vh] w-full rounded-t-[40rpx] bg-white px-5 pb-6 pt-4 shadow-[0_-18rpx_60rpx_rgba(15,23,42,0.14)] will-change-transform"
      :class="panelClass" :style="panelMotionStyle" @tap.stop="() => { }">
      <view class="mb-4" @touchstart.stop="handleTouchStart" @touchmove.stop.prevent="handleTouchMove"
        @touchend.stop="handleTouchEnd" @touchcancel.stop="handleTouchEnd">
        <view class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200" />
        <view class="flex items-start justify-between gap-3">
          <view>
            <text class="block text-xl font-800 text-slate-800">
              编辑个人资料
            </text>
            <text class="mt-1 block text-sm leading-6 text-slate-500">
              用户名、头像和个性签名会跟随当前登录账号保存。
            </text>
          </view>
        </view>
      </view>

      <view class="flex flex-col gap-4">
        <view class="flex items-center gap-4 rounded-[28rpx] bg-[#FBF6EE] px-4 py-4">
          <view
            class="h-[120rpx] w-[120rpx] overflow-hidden rounded-full bg-white shadow-[0_10rpx_24rpx_rgba(148,163,184,0.14)]">
            <AppImage class="h-full w-full" :src="formState.avatarUrl" mode="aspectFill" error-text="头像" />
          </view>
          <view class="min-w-0 flex-1">
            <text class="block text-sm font-700 text-slate-800">头像</text>
            <text class="mt-1 block text-2xs leading-5 text-slate-500">会自动居中裁剪成头像比例，再压缩上传。</text>
          </view>
          <button class="btn-panel bg-[#EAF6EF] px-4 text-[#2E8D76]" hover-class="opacity-92" :loading="choosingAvatar"
            @tap="handleChooseAvatar">
            更换头像
          </button>
        </view>

        <view class="rounded-[28rpx] bg-[#FBF6EE] px-4 py-4">
          <text class="block text-sm font-700 text-slate-800">用户名</text>
          <input v-model="formState.nickname"
            class="mt-3 h-[92rpx] rounded-[24rpx] bg-white px-4 text-sm text-slate-700" :maxlength="40"
            placeholder="给自己起一个名字" />
        </view>

        <view class="rounded-[28rpx] bg-[#F6F7FB] px-4 py-4">
          <text class="block text-sm font-700 text-slate-800">个性签名</text>
          <textarea v-model="formState.profileSignature"
            class="field-textarea mt-3 min-h-[160rpx] rounded-[24rpx] bg-white px-4 text-sm leading-7 text-slate-700"
            :maxlength="80" auto-height placeholder="写一句你想留给这片花园的话" />
        </view>

        <SubmitBtn text="保存资料" :loading="props.loading || choosingAvatar" variant="mint" size="md"
          @click="handleSubmit" />
      </view>
    </view>
  </view>
</template>
