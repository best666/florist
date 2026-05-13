import { ClientPlatform } from '@/interfaces'
import type {
  H5ViewportInfo,
  Nullable,
  WeixinMiniProgramInfo,
} from '@/interfaces'

export function getRuntimePlatform(): ClientPlatform {
  // #ifdef H5
  return ClientPlatform.H5
  // #endif

  // #ifdef MP-WEIXIN
  return ClientPlatform.MpWeixin
  // #endif

  return ClientPlatform.H5
}

export function getH5ViewportInfo(): Nullable<H5ViewportInfo> {
  // #ifdef H5
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
  }
  // #endif

  // #ifndef H5
  return null
  // #endif
}

export function getWeixinMiniProgramInfo(): Nullable<WeixinMiniProgramInfo> {
  // #ifdef MP-WEIXIN
  const accountInfo = uni.getAccountInfoSync()

  return {
    appId: accountInfo.miniProgram.appId,
    envVersion: accountInfo.miniProgram.envVersion,
  }
  // #endif

  // #ifndef MP-WEIXIN
  return null
  // #endif
}

export function openPlatformPermissionSetting(): Promise<boolean> {
  // #ifdef MP-WEIXIN
  return new Promise(resolve => {
    uni.openSetting({
      success: () => resolve(true),
      fail: () => resolve(false),
    })
  })
  // #endif

  // #ifndef MP-WEIXIN
  uni.showToast({
    title: '当前平台不支持该能力',
    icon: 'none',
  })

  return Promise.resolve(false)
  // #endif
}
