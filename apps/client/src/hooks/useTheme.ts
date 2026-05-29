import { storeToRefs } from 'pinia'
import { watch } from 'vue'
import type { ThemeSkinId } from '@/interfaces'
import { ClientPlatform } from '@/interfaces'
import { useAppStore, useMemberStore } from '@/store'
import { buildThemeStyleVariables, resolveThemeSkin, syncNativeThemeColors } from '@/utils'
import { getRuntimePlatform } from '@/utils/platform'

/**
 * 构建主题背景渐变字符串（使用固定的颜色值，不依赖 CSS 变量）
 */
function buildThemeBackground(theme: ReturnType<typeof resolveThemeSkin>): string {
  return [
    `radial-gradient(circle at top left, ${theme.variables.blush}/22, transparent 34%)`,
    `radial-gradient(circle at top right, ${theme.variables.mint}/18, transparent 28%)`,
    `linear-gradient(180deg, ${theme.variables.ivory} 0%, ${theme.variables.cream} 52%, ${theme.variables.ivory} 100%)`,
  ].join(', ')
}

/**
 * 主题皮肤应用 composable
 *
 * H5 端：CSS 变量写入 document.documentElement，背景渐变直接设置到 uni-page-body
 * 小程序端：依赖 .theme-* class 级联
 */
export function useTheme() {
  const memberStore = useMemberStore()
  const appStore = useAppStore()
  const { memberCache } = storeToRefs(memberStore)

  /** H5：将 CSS 变量和背景渐变注入到页面级元素 */
  function applyThemeToH5(themeSkinId: ThemeSkinId): void {
    const platform = appStore.runtimePlatform ?? getRuntimePlatform()
    if (platform !== ClientPlatform.H5) return

    const theme = resolveThemeSkin(themeSkinId)
    const variables = buildThemeStyleVariables(themeSkinId)
    const bgGradient = buildThemeBackground(theme)

    // 1. CSS 变量注入 html 元素，确保全局级联
    const root = document.documentElement
    for (const [key, value] of Object.entries(variables)) {
      root.style.setProperty(key, value)
    }

    // 2. 核心：直接设置 uni-page-body 的背景和 CSS 变量
    //    因为 uni.setBackgroundColor 只能设纯色，会覆盖渐变
    function applyToPageBody(retries = 0): void {
      const pageBody = document.querySelector('uni-page-body') as HTMLElement | null

      if (pageBody) {
        for (const [key, value] of Object.entries(variables)) {
          pageBody.style.setProperty(key, value)
        }
        pageBody.style.background = bgGradient
        pageBody.style.minHeight = '100%'
        pageBody.style.color = theme.variables.ink
        return
      }

      // DOM 可能尚未就绪，最多重试 10 次（约 160ms）
      if (retries < 10) {
        requestAnimationFrame(() => applyToPageBody(retries + 1))
      }
    }

    applyToPageBody()
  }

  /** 完整应用一套主题 */
  function applyTheme(themeSkinId: ThemeSkinId): void {
    applyThemeToH5(themeSkinId)
    syncNativeThemeColors(themeSkinId)
  }

  /** 启动：初始应用 + 监听切换 */
  function start(): void {
    const initialId = memberStore.memberCache?.themeSkinId
    if (initialId) {
      applyTheme(initialId)
    }

    watch(
      () => memberCache.value.themeSkinId,
      (nextId) => {
        applyTheme(nextId)
      },
    )
  }

  return { applyTheme, start }
}
