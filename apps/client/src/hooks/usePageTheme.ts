import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useMemberStore } from '@/store'

/**
 * 页面级主题 class 注入
 *
 * 每个 page 组件的根元素绑定此类后，.theme-* CSS 变量即可在组件内部直接生效，
 * 不依赖 App.vue 的样式跨组件级联（小程序样式隔离会阻断级联）。
 *
 * 用法：
 *   const themeClass = usePageTheme()
 *   // <view :class="['page-shell', themeClass]">
 */
export function usePageTheme() {
  const memberStore = useMemberStore()
  const { memberCache } = storeToRefs(memberStore)
  return computed(() => `theme-${memberCache.value.themeSkinId}`)
}
