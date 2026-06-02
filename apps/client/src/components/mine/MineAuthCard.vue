<script setup lang="ts">
import type { IUser } from '@florist/contracts'
import { UserLoginType } from '@florist/contracts'
import { computed } from 'vue'
import TagLabel from '../app/TagLabel.vue'
import AppImage from '../app/AppImage.vue'
import InfoPopover from '../app/InfoPopover.vue'
import { ClientPlatform } from '@/interfaces'

interface MineAuthCardProps {
  readonly currentUser: IUser | null
  readonly isAuthenticated: boolean
  readonly loading: boolean
  readonly runtimePlatform: ClientPlatform
}

const props = defineProps<MineAuthCardProps>()

const emit = defineEmits<{
  login: []
  logout: []
  'edit-profile': []
}>()

const isH5Platform = computed(() => props.runtimePlatform === ClientPlatform.H5)
const authTitle = computed(() => props.currentUser?.nickname ?? '当前使用本地花园')
const authSubtitle = computed(() => {
  if (!props.currentUser) {
    return isH5Platform.value
      ? '本地花园会把数据安全保存在当前设备，登录后再切换到你的个人花园。'
      : '当前先使用本地花园记录，登录后会切换到你的个人花园数据。'
  }

  if (props.currentUser.loginType === UserLoginType.H5PhoneCode) {
    return '已连接你的个人花园，昵称和头像会跟随当前账号保存。'
  }

  if (props.currentUser.loginType === UserLoginType.WechatMiniProgram) {
    return '已连接你的微信花园资料，昵称和头像会跟随当前账号保存。'
  }

  return '当前使用本地花园记录，数据仅保存在这台设备中。'
})
const authTagText = computed(() => {
  if (!props.isAuthenticated) {
    return '本地花园模式'
  }

  return props.currentUser?.loginType === UserLoginType.WechatMiniProgram ? '微信花园' : '已登录'
})
const authButtonText = computed(() => (isH5Platform.value ? '手机号登录' : '微信登录'))
const authAvatarUrl = computed(() => props.currentUser?.avatarUrl ?? '')
const authSignature = computed(() => props.currentUser?.profileSignature?.trim() ?? '')
</script>

<template>
  <view class="card-soft app-fade-up rounded-[32rpx] bg-[var(--color-surface)] px-5 py-5">
    <view class="flex items-center justify-between gap-3">
      <view class="min-w-0 flex flex-1 items-center gap-4">
        <button
          v-if="props.isAuthenticated"
          class="btn-base h-[104rpx] min-h-[104rpx] w-[104rpx] min-w-[104rpx] overflow-hidden rounded-full bg-[#F7F1E7] p-0 shadow-[0_10rpx_24rpx_rgba(148,163,184,0.14)]"
          hover-class="opacity-92"
          @tap="emit('edit-profile')"
        >
          <AppImage
            class="h-full w-full"
            :src="authAvatarUrl"
            mode="aspectFill"
            error-text=""
          />
        </button>
        <view
          v-else
          class="h-[104rpx] w-[104rpx] overflow-hidden rounded-full bg-[#F7F1E7] shadow-[0_10rpx_24rpx_rgba(148,163,184,0.14)]"
        >
          <AppImage
            class="h-full w-full"
            :src="authAvatarUrl"
            mode="aspectFill"
            error-text=""
          />
        </view>
        <view class="min-w-0 flex-1 pt-1">
          <view class="flex items-center gap-[6rpx]">
            <text
              class="block max-w-[360rpx] truncate text-[34rpx] font-800 leading-tight text-app-ink"
            >
              {{ authTitle }}
            </text>
            <InfoPopover :content="authSubtitle" icon="help" />
            <button
              v-if="props.isAuthenticated"
              class="btn-base mx-0 h-[38rpx] min-h-[38rpx] w-[38rpx] min-w-[38rpx] rounded-full bg-[#EEF2FF] px-0 text-[20rpx] text-[#4D63B4]"
              hover-class="opacity-92"
              @tap="emit('edit-profile')"
            >
              ✎
            </button>
          </view>
          <text
            v-if="props.isAuthenticated && authSignature"
            class="mt-2 block text-[24rpx] leading-5 text-[#8C725B]"
          >
            {{ authSignature }}
          </text>
        </view>
      </view>
    </view>

    <view class="mt-5 grid grid-cols-2 gap-3">
      <TagLabel
        :text="authTagText"
        :tone="props.isAuthenticated ? 'mint' : 'slate'"
        :icon="props.isAuthenticated ? '✓' : '○'"
        size="md"
      />
      <button
        v-if="!props.isAuthenticated"
        class="btn-panel surface-soft min-h-[92rpx] bg-[var(--color-mint)]/20 text-[var(--color-sage)]"
        hover-class="opacity-92"
        :loading="props.loading"
        @tap="emit('login')"
      >
        {{ authButtonText }}
      </button>
      <view
        v-if="props.isAuthenticated"
        class="flex items-center justify-end"
      >
        <button
          class="btn-base h-[64rpx] min-h-[64rpx] rounded-full bg-transparent px-3 text-[24rpx] text-[#9A8D80]"
          hover-class="opacity-80"
          :loading="props.loading"
          @tap="emit('logout')"
        >
          暂时切回本地花园
        </button>
      </view>
    </view>
  </view>
</template>
