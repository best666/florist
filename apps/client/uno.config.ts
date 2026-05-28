import type { Preset } from 'unocss'
import { presetApplet, presetRemRpx } from 'unocss-applet'
import { presetLegacyCompat } from '@unocss/preset-legacy-compat'
import {
  defineConfig,
  presetIcons,
  transformerVariantGroup,
} from 'unocss'

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
        page {
          --color-mint: #8ad8c5;
          --color-sage: #6ea891;
          --color-blush: #f2c8d7;
          --color-cream: #fff1dc;
          --color-gold: #eabf7d;
          --color-ivory: #fff8f1;
          --color-surface: #ffffff;
          --color-ink: #32404a;
          --color-muted: #7a8794;
          --radius-card: 28rpx;
          --radius-panel: 36rpx;
          --radius-control: 24rpx;
          --radius-pill: 999px;
          --space-page-x: 24rpx;
          --space-page-y: 24rpx;
          --space-card: 24rpx;
          --shadow-soft: 0 18rpx 44rpx rgba(148, 163, 184, 0.14);
          --shadow-lift: 0 14rpx 30rpx rgba(111, 165, 149, 0.18);
          --shadow-hero: 0 20rpx 56rpx rgba(210, 191, 160, 0.24);
        }

        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(18rpx);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float-soft {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-8rpx);
          }
        }

        @keyframes pulse-soft {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }

          50% {
            transform: scale(1.04);
            opacity: 0.92;
          }
        }

        page {
          min-height: 100%;
          background:
            radial-gradient(circle at top left, rgba(242, 200, 215, 0.22), transparent 34%),
            radial-gradient(circle at top right, rgba(138, 216, 197, 0.18), transparent 28%),
            linear-gradient(180deg, #fffdf9 0%, var(--color-ivory) 52%, #fff3e7 100%);
          color: var(--color-ink);
          -webkit-text-size-adjust: 100%;
          text-size-adjust: 100%;
          overscroll-behavior: none;
          margin: 0;
          scrollbar-width: none;
          -ms-overflow-style: none;
          touch-action: manipulation;
        }

        page::-webkit-scrollbar {
          width: 0;
          height: 0;
        }

        html,
        body,
        #app {
          min-height: 100%;
          background: inherit;
          color: inherit;
        }

        button,
        textarea,
        input {
          font: inherit;
          box-sizing: border-box;
        }

        button {
          line-height: 1;
          white-space: nowrap;
        }

        button::after {
          border: 0;
        }

        input,
        textarea {
          line-height: 1.4;
        }

        .app-fade-up {
          animation: fade-up 460ms ease-out both;
        }

        .app-fade-up-delay-1 {
          animation-delay: 80ms;
        }

        .app-fade-up-delay-2 {
          animation-delay: 140ms;
        }

        .app-float-soft {
          animation: float-soft 4.8s ease-in-out infinite;
        }

        .app-breathe {
          animation: pulse-soft 2.6s ease-in-out infinite;
        }

        .app-pressable {
          transition: transform 180ms ease, box-shadow 220ms ease, opacity 180ms ease, filter 180ms ease;
        }

        .app-pressable:active {
          transform: translateY(2rpx) scale(0.985);
          filter: saturate(0.98);
        }
      `,
    },
  ],
  shortcuts: {
    'page-shell': 'min-h-screen bg-app-ivory px-[24rpx] py-[24rpx] text-[var(--color-ink)]',
    'card-soft': 'rounded-[28rpx] border border-white/70 bg-white/88 p-[24rpx] shadow-[0_18rpx_44rpx_rgba(148,163,184,0.14)] backdrop-blur-[18rpx]',
    'hero-shell': 'overflow-hidden rounded-[36rpx] px-5 py-5 shadow-[0_20rpx_56rpx_rgba(210,191,160,0.24)]',
    'badge-soft': 'inline-flex items-center rounded-[999px] border border-white/60 px-3 py-1.5 text-2xs font-700 tracking-[0.04em]',
    'surface-soft': 'rounded-[24rpx] border border-white/70 bg-white/76 shadow-[0_12rpx_28rpx_rgba(148,163,184,0.1)]',
    'info-soft': 'rounded-[28rpx] border border-white/72 px-4 py-4 text-sm leading-6 shadow-[0_12rpx_28rpx_rgba(148,163,184,0.1)]',
    'btn-base': 'flex items-center justify-center text-center align-middle whitespace-nowrap border-none leading-none transition-all duration-180 active:translate-y-[2rpx] active:scale-[0.985]',
    'btn-pill-sm': 'btn-base h-[72rpx] min-h-[72rpx] rounded-full px-4 text-2xs font-700',
    'btn-pill-md': 'btn-base h-[80rpx] min-h-[80rpx] rounded-full px-5 text-sm font-700',
    'btn-chip': 'btn-base h-[76rpx] min-h-[76rpx] flex-none rounded-full px-5 text-2xs font-700 tracking-[0.01em]',
    'btn-chip-wide': 'btn-chip min-w-[148rpx] justify-center',
    'btn-segment': 'btn-base h-[76rpx] min-h-[76rpx] min-w-0 rounded-full px-4 text-2xs font-700 text-center leading-none whitespace-nowrap overflow-hidden',
    'btn-panel': 'btn-base h-[88rpx] min-h-[88rpx] rounded-[24rpx] px-5 text-sm font-800',
    'bottom-nav-shell': 'flex w-full max-w-[760rpx] items-center gap-2 rounded-full border border-white/76 bg-white/78 p-2 shadow-[0_18rpx_52rpx_rgba(100,116,139,0.18)] backdrop-blur-[20rpx] dark:border-slate-700 dark:bg-slate-950/82',
    'bottom-nav-item': 'btn-base min-w-0 flex-1 flex-col rounded-full px-2 py-3 text-center',
    'field-input': 'w-full rounded-[22rpx] border border-white/72 bg-white px-4 text-sm leading-[1.25] text-app-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]',
    'field-input-md': 'field-input h-[88rpx] min-h-[88rpx]',
    'field-input-sm': 'field-input h-[80rpx] min-h-[80rpx] rounded-[18rpx] px-3 text-sm',
    'field-textarea': 'field-input min-h-[160rpx] px-4 py-3 leading-6',
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
