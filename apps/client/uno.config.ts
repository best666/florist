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
          --color-mint: #95E1D3;
          --color-blush: #F8C8DC;
          --color-cream: #FFF5E4;
          --color-ivory: #FAFAFA;
          --radius-card: 12px;
          --shadow-soft: 0 12px 30px rgba(149, 225, 211, 0.18);
        }
      `,
    },
  ],
  shortcuts: {
    'page-shell': 'min-h-screen bg-app-ivory px-6 py-6 text-slate-700',
    'card-soft': 'rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-soft)]',
    'badge-soft': 'inline-flex items-center rounded-full px-3 py-1 text-xs font-600',
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
