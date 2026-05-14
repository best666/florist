import type { Preset } from 'unocss'
import { presetUni } from '@uni-helper/unocss-preset-uni'
import { presetLegacyCompat } from '@unocss/preset-legacy-compat'
import {
  defineConfig,
  presetIcons,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    presetUni({
      attributify: false,
    }),
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
        :root {
          --color-mint: #92dccb;
          --color-blush: #f2c8d7;
          --color-cream: #fff1dc;
          --color-ivory: #fff8f1;
          --color-surface: #ffffff;
          --radius-card: 28rpx;
          --radius-pill: 999px;
          --space-page-x: 24rpx;
          --space-page-y: 24rpx;
          --space-card: 24rpx;
          --shadow-soft: 0 14rpx 32rpx rgba(148, 163, 184, 0.12);
        }

        html,
        body,
        #app {
          min-height: 100%;
          background: var(--color-ivory);
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
          overscroll-behavior: none;
        }

        body {
          margin: 0;
          scrollbar-width: none;
          -ms-overflow-style: none;
          touch-action: manipulation;
        }

        body::-webkit-scrollbar {
          width: 0;
          height: 0;
        }
      `,
    },
  ],
  shortcuts: {
    'page-shell': 'min-h-screen bg-app-ivory px-[var(--space-page-x)] py-[var(--space-page-y)] text-slate-700',
    'card-soft': 'rounded-[var(--radius-card)] bg-[var(--color-surface)] p-[var(--space-card)] shadow-[var(--shadow-soft)]',
    'badge-soft': 'inline-flex items-center rounded-[var(--radius-pill)] px-3 py-1 text-xs font-600',
  },
  theme: {
    colors: {
      'app-mint': 'var(--color-mint)',
      'app-blush': 'var(--color-blush)',
      'app-cream': 'var(--color-cream)',
      'app-ivory': 'var(--color-ivory)',
    },
    boxShadow: {
      soft: 'var(--shadow-soft)',
    },
    fontSize: {
      '2xs': ['20rpx', '28rpx'],
      '3xs': ['18rpx', '26rpx'],
    },
  },
  rules: [
    ['safe-pb', { 'padding-bottom': 'env(safe-area-inset-bottom)' }],
    ['safe-pt', { 'padding-top': 'env(safe-area-inset-top)' }],
  ],
  safelist: ['text-app-mint', 'bg-app-cream', 'bg-app-blush'],
})
