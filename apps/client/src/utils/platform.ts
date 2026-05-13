import { ClientPlatform } from '@/interfaces'
import type {
  DeviceLocation,
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

export function getCurrentDeviceLocation(): Promise<Nullable<DeviceLocation>> {
  return new Promise((resolve) => {
    uni.getLocation({
      type: 'gcj02',
      success: (result) => {
        resolve({
          latitude: result.latitude,
          longitude: result.longitude,
          ...(typeof result.accuracy === 'number' ? { accuracy: result.accuracy } : {}),
        })
      },
      fail: () => resolve(null),
    })
  })
}

export async function openExternalLink(url: string): Promise<boolean> {
  // #ifdef H5
  try {
    window.open(url, '_blank', 'noopener,noreferrer')
    return true
  }
  catch {
    return false
  }
  // #endif

  // #ifdef MP-WEIXIN
  try {
    await new Promise<void>((resolve, reject) => {
      uni.setClipboardData({
        data: url,
        success: () => resolve(),
        fail: () => reject(new Error('copy failed')),
      })
    })

    uni.showModal({
      title: '外链已复制',
      content: '小程序不能直接打开外部商城，链接已复制。你可以粘贴到浏览器或微信对话框后再打开。',
      showCancel: false,
      confirmText: '知道了',
    })
    return true
  }
  catch {
    return false
  }
  // #endif

  return false
}
