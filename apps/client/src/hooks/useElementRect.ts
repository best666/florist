import { nextTick } from 'vue'

/**
 * 获取元素在屏幕上的 boundingClientRect。
 * 用于 popover / tooltip 等需要相对定位的场景。
 */
export function useElementRect() {
  async function getRect(
    componentRef: any,
    selector: string,
  ): Promise<{ left: number; top: number; right: number; bottom: number; width: number; height: number } | null> {
    await nextTick()

    return new Promise((resolve) => {
      const query = uni.createSelectorQuery().in(componentRef)
      query.select(selector).boundingClientRect((rect: any) => {
        if (rect && rect.width > 0) {
          resolve({
            left: rect.left as number,
            top: rect.top as number,
            right: rect.right as number,
            bottom: rect.bottom as number,
            width: rect.width as number,
            height: rect.height as number,
          })
        } else {
          resolve(null)
        }
      }).exec()
    })
  }

  return { getRect }
}
