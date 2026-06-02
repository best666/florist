import type { Preset } from 'unocss'
import { presetApplet, presetRemRpx } from 'unocss-applet'
import { presetLegacyCompat } from '@unocss/preset-legacy-compat'
import { defineConfig, presetIcons, transformerVariantGroup } from 'unocss'

export default defineConfig({
  presets: [
    presetApplet({}) as Preset,
    presetRemRpx({}) as Preset,
    presetIcons(),
    presetLegacyCompat({
      commaStyleColorFunction: true,
      legacyColorSpace: true,
    }) as Preset,
  ],
  transformers: [transformerVariantGroup()],
  preflights: [
    {
      getCSS: () => `
        /* 动画和工具类由 UnoCSS preflight 注入 */
        /* CSS 变量和页面背景由 global.css + .theme-* 类管理 */

        /* 所有原生 button 默认文字居中 */
button { display: flex; align-items: center; justify-content: center; text-align: center; }

@keyframes fade-up {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes float-soft {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8rpx); }
        }

        @keyframes pulse-soft {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.04); opacity: 0.92; }
        }

        .app-fade-up         { animation: fade-up 460ms ease-out both; }
        .app-fade-up-delay-1 { animation-delay: 80ms; }
        .app-fade-up-delay-2 { animation-delay: 140ms; }
        .app-float-soft      { animation: float-soft 4.8s ease-in-out infinite; }
        .app-breathe         { animation: pulse-soft 2.6s ease-in-out infinite; }
        .app-pressable       { transition: transform 180ms ease, box-shadow 220ms ease, opacity 180ms ease, filter 180ms ease; }
        .app-pressable:active { transform: translateY(2rpx) scale(0.985); filter: saturate(0.98); }
      `,
    },
  ],
  shortcuts: {
    'page-shell':
      'min-h-screen bg-[var(--color-ivory)] px-[var(--space-page-x)] py-[var(--space-page-y)] text-[var(--color-ink)]',
    'card-soft':
      'rounded-[var(--radius-card)] border border-[var(--color-cream)]/40 bg-[var(--color-surface)] p-[var(--space-card)] shadow-[var(--shadow-soft)]',
    'hero-shell': 'overflow-hidden rounded-[var(--radius-panel)] px-5 py-5 shadow-[var(--shadow-hero)]',
    'badge-soft':
      'inline-flex items-center rounded-[var(--radius-pill)] border border-[var(--color-cream)]/30 bg-[var(--color-surface)]/70 px-3 py-1.5 text-2xs font-700 tracking-[0.04em] text-[var(--color-ink)]',
    'surface-soft':
      'rounded-[var(--radius-control)] border border-[var(--color-cream)]/30 bg-[var(--color-cream)]/40 shadow-[var(--shadow-soft)]',
    'info-soft':
      'rounded-[var(--radius-card)] border border-[var(--color-gold)]/30 bg-[var(--color-cream)]/60 px-4 py-4 text-sm leading-6 shadow-[var(--shadow-soft)] text-[var(--color-ink)]',
    'btn-base':
      'flex items-center justify-center text-center align-middle whitespace-nowrap border-none leading-none transition-all duration-180 active:translate-y-[2rpx] active:scale-[0.985]',
    'btn-pill-sm': 'btn-base h-[72rpx] min-h-[72rpx] rounded-full px-4 text-2xs font-700',
    'btn-pill-md': 'btn-base h-[80rpx] min-h-[80rpx] rounded-full px-5 text-sm font-700',
    'btn-chip':
      'btn-base h-[76rpx] min-h-[76rpx] flex-none rounded-full px-5 text-2xs font-700 tracking-[0.01em]',
    'btn-chip-wide': 'btn-chip min-w-[148rpx] justify-center',
    'btn-segment':
      'btn-base h-[76rpx] min-h-[76rpx] min-w-0 rounded-full px-4 text-2xs font-700 text-center leading-none whitespace-nowrap overflow-hidden',
    'btn-panel': 'btn-base h-[88rpx] min-h-[88rpx] rounded-[24rpx] px-5 text-sm font-800',
    'bottom-nav-shell':
      'flex w-full max-w-[760rpx] items-center gap-2 rounded-full border border-[var(--color-cream)]/40 bg-[var(--color-surface)]/78 p-2 shadow-[var(--shadow-lift)]',
    'bottom-nav-item': 'btn-base min-w-0 flex-1 flex-col rounded-full px-2 py-3 text-center',
    'field-input':
      'w-full rounded-[22rpx] border border-[var(--color-cream)]/40 bg-[var(--color-surface)] px-4 text-sm leading-[1.25] text-[var(--color-ink)]',
    'field-input-md': 'field-input h-[88rpx] min-h-[88rpx]',
    'field-input-sm': 'field-input h-[80rpx] min-h-[80rpx] rounded-[18rpx] px-3 text-sm',
    'field-textarea': 'field-input min-h-[160rpx] px-4 py-3 leading-6',
    // 深色模式叠加 class：背景深色自动配浅色文字
    // 用法：class="card-soft on-dark"  或  class="surface-soft on-dark-subtle"
    'on-dark': 'dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700',
    'on-dark-subtle': 'dark:bg-slate-800 dark:text-slate-200',
  },
  theme: {
    colors: {
      'app-mint': 'var(--color-mint)',
      'app-sage': 'var(--color-sage)',
      'app-blush': 'var(--color-blush)',
      'app-cream': 'var(--color-cream)',
      'app-ivory': 'var(--color-ivory)',
      'app-gold': 'var(--color-gold)',
      'app-ink': 'var(--color-ink)',
      'app-muted': 'var(--color-muted)',
      'app-surface': 'var(--color-surface)',
    },
    boxShadow: {
      soft: '0 18rpx 44rpx rgba(148, 163, 184, 0.14)',
    },
    fontSize: {
      '2xs': ['20rpx', '28rpx'],
      '3xs': ['18rpx', '26rpx'],
      body: ['28rpx', '42rpx'],
      title: ['46rpx', '58rpx'],
    },
  },
  rules: [
    ['safe-pb', { 'padding-bottom': 'env(safe-area-inset-bottom)' }],
    ['safe-pt', { 'padding-top': 'env(safe-area-inset-top)' }],
  ],
  safelist: ['text-app-mint', 'bg-app-cream', 'bg-app-blush', 'bg-app-ivory', 'text-app-ink'],
})
