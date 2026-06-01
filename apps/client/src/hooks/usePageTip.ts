import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

/**
 * 页面动态提示组合式函数。
 * 每次进入页面时从词库中随机选一条，避免连续两次出现同一条。
 *
 * @param tips  提示词库（至少 1 条）
 * @returns     当前提示文本
 */
export function usePageTip(tips: readonly string[]): { currentTip: Readonly<ReturnType<typeof ref<string>>> } {
  if (tips.length === 0) {
    throw new Error('usePageTip: tips 数组不能为空')
  }

  // 首次随机选一条
  const currentTip = ref(pickRandom(tips))

  // 每次页面显示时换一条
  onShow(() => {
    const pool = tips.length > 1 ? tips.filter(t => t !== currentTip.value) : tips
    currentTip.value = pickRandom(pool)
  })

  return { currentTip }
}

function pickRandom(list: readonly string[]): string {
  const index = Math.floor(Math.random() * list.length)
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return list[index]!
}
