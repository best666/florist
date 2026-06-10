import type { IUserAuthSession } from '@florist/contracts'
import { useAuthStore } from '@/store'
import { handleCatchAndToast, showGentleSuccess, showGentleToast } from '@/utils'

interface UseAuthSessionActionsOptions {
  readonly onLoginSuccess?: (session: IUserAuthSession) => void | Promise<void>
  readonly onCloseLoginPopup?: () => void
}

export function useAuthSessionActions(options?: UseAuthSessionActionsOptions) {
  const authStore = useAuthStore()

  async function handleH5Login(payload: { phoneNumber: string, verificationCode: string }): Promise<void> {
    if (!/^1\d{10}$/.test(payload.phoneNumber)) {
      showGentleToast('请输入正确的 11 位手机号。')
      return
    }

    if (!payload.verificationCode) {
      showGentleToast('请输入验证码。')
      return
    }

    try {
      const session = await authStore.loginByH5PhoneCode(payload)
      options?.onCloseLoginPopup?.()
      await options?.onLoginSuccess?.(session)
      showGentleSuccess(session.isNewUser ? '登录成功，已经为你创建新的个人花园。' : '登录成功，已经切换到你的个人花园。')
    }
    catch (error) {
      handleCatchAndToast(error, '手机号登录暂时没有接稳。')
    }
  }

  async function handleH5OneClickLogin(): Promise<void> {
    try {
      const session = await authStore.loginByH5OneClick()
      options?.onCloseLoginPopup?.()
      await options?.onLoginSuccess?.(session)
      showGentleSuccess(session.isNewUser ? '一键登录成功，已经为你创建新的个人花园。' : '一键登录成功，已经切换到你的个人花园。')
    } catch (error) {
      handleCatchAndToast(error, '一键登录暂不可用，请使用短信验证码登录。')
    }
  }

  async function handleWechatLogin(): Promise<void> {
    try {
      const session = await authStore.loginByWechatMiniProgram()
      options?.onCloseLoginPopup?.()
      await options?.onLoginSuccess?.(session)
      showGentleSuccess(session.isNewUser ? '微信登录成功，已经为你创建新的个人花园。' : '微信登录成功，已经切换到你的个人花园。')
    }
    catch (error) {
      handleCatchAndToast(error, '微信登录暂时没有接稳。')
    }
  }

  return {
    handleH5Login,
    handleH5OneClickLogin,
    handleWechatLogin,
  }
}
