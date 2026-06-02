/**
 * 主题调色板 — 语义色定义
 *
 * 所有页面/组件通过 CSS 变量引用颜色，切换 .theme-* class 时自动更新。
 *
 * 使用方式：
 *   UnoCSS: bg-app-ivory / text-app-mint / border-app-cream
 *   inline: style="color: var(--color-ink)"
 *   shortcut: card-soft / hero-shell / badge-soft 等（自动使用 CSS 变量）
 *
 * 注意：颜色具体值由 global.css (.theme-*) 和 member.ts (THEME_SKIN_DEFINITIONS) 共同定义。
 *       本文件仅为类型级别的引用常量，不包含颜色值。
 */

/** CSS 变量名常量 */
export const THEME_VARS = {
  mint: '--color-mint',
  sage: '--color-sage',
  blush: '--color-blush',
  cream: '--color-cream',
  gold: '--color-gold',
  ivory: '--color-ivory',
  surface: '--color-surface',
  ink: '--color-ink',
  muted: '--color-muted',
  radiusCard: '--radius-card',
  radiusPanel: '--radius-panel',
  radiusControl: '--radius-control',
  radiusPill: '--radius-pill',
  spacePageX: '--space-page-x',
  spacePageY: '--space-page-y',
  spaceCard: '--space-card',
  shadowSoft: '--shadow-soft',
  shadowLift: '--shadow-lift',
  shadowHero: '--shadow-hero',
} as const

/** 语义色 class 名，用于 safelist 确保 UnoCSS 生成对应工具类 */
export const SEMANTIC_COLORS = [
  'app-mint', 'app-sage', 'app-blush', 'app-cream',
  'app-gold', 'app-ivory', 'app-ink', 'app-muted', 'app-surface',
] as const

/** 通用页面背景渐变 */
export const PAGE_BG_GRADIENT = 'bg-linear-to-b from-app-ivory via-[var(--color-cream)] to-app-ivory'

/** 通用 Hero 区域渐变 */
export const HERO_GRADIENT = 'bg-linear-to-br from-[var(--color-blush)] via-[var(--color-cream)] to-[var(--color-mint)]'

/** Tag 色调映射 */
export const TAG_TONES = {
  mint:  { bg: 'bg-[var(--color-mint)]/10',  text: 'text-[var(--color-ink)]' },
  blush: { bg: 'bg-[var(--color-blush)]/10', text: 'text-[var(--color-ink)]' },
  cream: { bg: 'bg-[var(--color-cream)]/20', text: 'text-[var(--color-ink)]' },
  slate: { bg: 'bg-[var(--color-muted)]/8',  text: 'text-[var(--color-ink)]' },
} as const

export type TagTone = keyof typeof TAG_TONES
