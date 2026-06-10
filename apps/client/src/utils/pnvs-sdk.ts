/**
 * 阿里云 PNVS H5 一键登录 SDK 封装。
 *
 * SDK 脚本 `numberAuth-web-sdk.js` 需放置在 `public/` 目录，运行时通过
 * 动态 script 标签加载。加载后 SDK 会在 window 上挂载 PhoneNumberServer 构造函数。
 *
 * 接口文档：https://help.aliyun.com/zh/pnvs/developer-reference/h5-client-access
 */

type PhoneNumberServerInstance = InstanceType<typeof window.PhoneNumberServer>

interface SdkResult {
  code: string
  content?: Array<{ vender: string; result: string; resultCode: string; msgId: string }>
  msg: string
  requestId: string
  spToken?: string
}

interface SdkInstance {
  setLoggerEnable(enabled: boolean): void
  getConnection(): 'wifi' | 'cellular' | 'unknown'
  checkLoginAvailable(options: {
    accessToken: string
    jwtToken: string
    timeout?: number
    success: (res: SdkResult) => void
    error: (res: SdkResult) => void
  }): void
  getLoginToken(options: {
    timeout?: number
    success: (res: SdkResult & { clearInput?: () => void; focusOn?: (index: number) => void; setMessage?: (msg: Record<string, unknown>) => void }) => void
    error: (res: SdkResult) => void
    watch?: (status: string, data: unknown) => void
    authPageOption?: {
      navText?: string
      subtitle?: string
      isHideLogo?: boolean
      logoImg?: string
      btnText?: string
      agreeSymbol?: string
      privacyOne?: [string, string]
      privacyTwo?: [string, string]
      privacyBefore?: string
      privacyEnd?: string
      vendorPrivacyPrefix?: string
      vendorPrivacySuffix?: string
      isDialog?: boolean
      manualClose?: boolean
      showCustomView?: boolean
      customView?: { element: string; style: string; js: string }
    }
  }): void
  closeLoginPage(): void
  getVersion(): string
}

declare global {
  interface Window {
    PhoneNumberServer: new () => SdkInstance
  }
}

const SDK_SCRIPT_SRC = '/numberAuth-web-sdk.js'
const SDK_LOAD_TIMEOUT_MS = 15_000
const CHECK_LOGIN_TIMEOUT_MS = 10_000
const GET_TOKEN_TIMEOUT_MS = 25_000

let loadingPromise: Promise<SdkInstance> | null = null
let sdkInstance: SdkInstance | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 已存在则不重复加载
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.charset = 'utf-8'
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('一键登录 SDK 加载失败，请检查网络后重试'))
    document.head.appendChild(script)
  })
}

/** 加载 PNVS SDK 并返回 PhoneNumberServer 实例 */
export async function loadPnvsSdk(): Promise<SdkInstance> {
  if (sdkInstance) return sdkInstance

  if (!loadingPromise) {
    loadingPromise = (async () => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('一键登录 SDK 加载超时，请稍后重试')), SDK_LOAD_TIMEOUT_MS),
      )

      await Promise.race([loadScript(SDK_SCRIPT_SRC), timeoutPromise])

      if (typeof window.PhoneNumberServer !== 'function') {
        throw new Error('一键登录 SDK 未正确挂载，请刷新页面后重试')
      }

      sdkInstance = new window.PhoneNumberServer()
      // 开发环境开启 SDK 日志
      sdkInstance.setLoggerEnable(true)
      return sdkInstance
    })()

    loadingPromise.catch(() => {
      loadingPromise = null
    })
  }

  return loadingPromise
}

/** 检查当前网络环境是否支持一键登录 */
export function isCellularNetwork(): boolean {
  if (!sdkInstance) return false
  return sdkInstance.getConnection() === 'cellular'
}

const CODE_MESSAGES: Record<string, string> = {
  '600000': '操作成功',
  '600008': '请在手机移动数据网络（4G/5G）下使用一键登录',
  '600010': '号码认证服务异常，请稍后再试',
  '600011': '获取运营商 Token 失败，请尝试短信验证码登录',
  '600013': '运营商正在升级维护，请使用短信验证码登录',
  '600014': '今日一键登录次数已达上限，请使用短信验证码登录',
  '600015': '运营商网络超时，请检查移动数据网络后重试',
  '600025': '号码认证服务配置异常，请稍后再试',
}

function resolveSdkError(res: SdkResult): string {
  return CODE_MESSAGES[res.code] ?? `一键登录失败 (${res.code})，请使用短信验证码登录`
}

/** 调用 SDK checkLoginAvailable 进行身份鉴权 */
export function checkOneClickAvailable(
  accessToken: string,
  jwtToken: string,
): Promise<{ success: true }> {
  return new Promise((resolve, reject) => {
    if (!sdkInstance) {
      reject(new Error('一键登录 SDK 尚未初始化'))
      return
    }

    sdkInstance.checkLoginAvailable({
      accessToken,
      jwtToken,
      timeout: CHECK_LOGIN_TIMEOUT_MS,
      success: (res) => {
        if (res.code === '600000') {
          resolve({ success: true })
        } else {
          reject(new Error(resolveSdkError(res)))
        }
      },
      error: (res) => {
        reject(new Error(resolveSdkError(res)))
      },
    })
  })
}

/** 调用 SDK getLoginToken 拉起授权页并获取 spToken */
export function getOneClickToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!sdkInstance) {
      reject(new Error('一键登录 SDK 尚未初始化'))
      return
    }

    sdkInstance.getLoginToken({
      timeout: GET_TOKEN_TIMEOUT_MS,
      success: (res) => {
        if (res.code === '600000' && res.spToken) {
          // 授权页由用户手动关闭或 SDK 自动关闭
          resolve(res.spToken)
        } else {
          reject(new Error(resolveSdkError(res)))
        }
      },
      error: (res) => {
        reject(new Error(resolveSdkError(res)))
      },
    })
  })
}

/** 手动关闭授权页 */
export function closeOneClickLoginPage(): void {
  sdkInstance?.closeLoginPage()
}
