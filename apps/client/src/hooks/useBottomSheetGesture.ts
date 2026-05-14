import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

interface TouchPoint {
  readonly clientY?: number
  readonly pageY?: number
}

interface TouchLikeEvent {
  readonly touches?: readonly TouchPoint[]
  readonly changedTouches?: readonly TouchPoint[]
}

interface UseBottomSheetGestureOptions {
  readonly visible: MaybeRefOrGetter<boolean>
  readonly onClose: () => void
  readonly closeThreshold?: number
  readonly hiddenOffset?: number
}

function getTouchY(event: TouchLikeEvent): number | null {
  const touch = event.touches?.[0] ?? event.changedTouches?.[0]

  if (!touch) {
    return null
  }

  return touch.clientY ?? touch.pageY ?? null
}

export function useBottomSheetGesture(options: UseBottomSheetGestureOptions) {
  const dragOffset = ref(0)
  const startY = ref<number | null>(null)
  const isDragging = ref(false)
  const closeThreshold = options.closeThreshold ?? 108
  const hiddenOffset = options.hiddenOffset ?? 72

  watch(
    () => toValue(options.visible),
    (visible) => {
      if (!visible) {
        dragOffset.value = 0
        startY.value = null
        isDragging.value = false
      }
    },
    { immediate: true },
  )

  function resetGesture(): void {
    dragOffset.value = 0
    startY.value = null
    isDragging.value = false
  }

  function handleTouchStart(event: TouchLikeEvent): void {
    if (!toValue(options.visible)) {
      return
    }

    const touchY = getTouchY(event)

    if (touchY === null) {
      return
    }

    startY.value = touchY
    isDragging.value = true
  }

  function handleTouchMove(event: TouchLikeEvent): void {
    if (!isDragging.value || startY.value === null) {
      return
    }

    const touchY = getTouchY(event)

    if (touchY === null) {
      return
    }

    dragOffset.value = Math.min(Math.max(0, touchY - startY.value), 260)
  }

  function handleTouchEnd(): void {
    if (!isDragging.value) {
      return
    }

    const shouldClose = dragOffset.value >= closeThreshold
    resetGesture()

    if (shouldClose) {
      options.onClose()
    }
  }

  const panelMotionStyle = computed(() => {
    const visible = toValue(options.visible)

    if (!visible) {
      return {
        transform: `translateY(${hiddenOffset}rpx) scale(0.97)`,
        opacity: '0',
        transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease',
      }
    }

    const scale = Math.max(0.94, 1 - dragOffset.value / 1800)

    return {
      transform: `translateY(${dragOffset.value}px) scale(${scale})`,
      opacity: '1',
      transition: isDragging.value
        ? 'none'
        : 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease',
    }
  })

  const maskMotionStyle = computed(() => {
    const visible = toValue(options.visible)

    if (!visible) {
      return {
        opacity: '0',
        transition: 'opacity 220ms ease',
      }
    }

    const opacity = Math.max(0.38, 1 - dragOffset.value / 220)

    return {
      opacity: String(opacity),
      transition: isDragging.value ? 'none' : 'opacity 220ms ease',
    }
  })

  return {
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
    maskMotionStyle,
    panelMotionStyle,
  }
}
