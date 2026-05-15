import { ClientPlatform } from '@/interfaces'
import type {
  DeviceLocation,
  H5ViewportInfo,
  Nullable,
  WeixinMiniProgramInfo,
} from '@/interfaces'
import { showGentleConfirm, showGentleToast } from './feedback'

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
  showGentleToast('当前平台还不支持直接打开这里。')

  return Promise.resolve(false)
  // #endif
}

function normalizeDeviceLocation(payload: {
  latitude: number
  longitude: number
  accuracy?: number
}): DeviceLocation {
  return {
    latitude: payload.latitude,
    longitude: payload.longitude,
    ...(typeof payload.accuracy === 'number' ? { accuracy: payload.accuracy } : {}),
  }
}

export function getCurrentDeviceLocation(): Promise<Nullable<DeviceLocation>> {
  // #ifdef H5
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (result) => {
          resolve(normalizeDeviceLocation({
            latitude: result.coords.latitude,
            longitude: result.coords.longitude,
            ...(typeof result.coords.accuracy === 'number' ? { accuracy: result.coords.accuracy } : {}),
          }))
        },
        () => {
          uni.getLocation({
            type: 'wgs84',
            isHighAccuracy: true,
            highAccuracyExpireTime: 4_000,
            success: (result) => resolve(normalizeDeviceLocation(result)),
            fail: () => resolve(null),
          })
        },
        {
          enableHighAccuracy: true,
          timeout: 8_000,
          maximumAge: 0,
        },
      )
    })
  }
  // #endif

  return new Promise((resolve) => {
    uni.getLocation({
      type: 'wgs84',
      // #ifdef H5
      isHighAccuracy: true,
      highAccuracyExpireTime: 4_000,
      // #endif
      success: (result) => resolve(normalizeDeviceLocation(result)),
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

    void showGentleConfirm({
      title: '链接已经帮你复制好',
      content: '小程序里不能直接跳去外部商城，你可以把链接粘贴到浏览器或微信对话框里继续打开。',
      confirmText: '知道了',
      showCancel: false,
    })
    return true
  }
  catch {
    return false
  }
  // #endif

  return false
}
