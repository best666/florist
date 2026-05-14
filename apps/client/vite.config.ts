import path from 'node:path'
import process from 'node:process'
import Uni from '@uni-helper/plugin-uni'
import UniManifest from '@uni-helper/vite-plugin-uni-manifest'
import UniPages from '@uni-helper/vite-plugin-uni-pages'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { resolveClientEnv } from './env.config'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = resolveClientEnv({
    MODE: mode,
    ...loadEnv(mode, path.resolve(process.cwd(), 'env')),
  })
  const isProduction = env.mode === 'production'
  const serverConfig = {
    host: '0.0.0.0',
    port: env.appPort,
    ...(env.proxyEnabled
      ? {
          proxy: {
            [env.proxyPrefix]: {
              target: env.serverBaseUrl,
              changeOrigin: true,
              rewrite: (requestPath: string) =>
                requestPath.replace(new RegExp(`^${env.proxyPrefix}`), ''),
            },
          },
        }
      : {}),
  }
  const buildConfig = {
    sourcemap: false,
    target: 'es2018',
    cssCodeSplit: true,
    cssMinify: isProduction,
    reportCompressedSize: false,
    assetsInlineLimit: 1024,
    minify: isProduction ? ('terser' as const) : false,
    ...(isProduction
      ? {
          terserOptions: {
            compress: {
              drop_console: env.deleteConsole,
              drop_debugger: true,
              pure_funcs: env.deleteConsole
                ? ['console.log', 'console.info', 'console.debug', 'console.warn']
                : [],
            },
            mangle: true,
            format: {
              comments: false,
            },
          },
        }
      : {}),
  }

  return {
    envDir: './env',
    base: env.appPublicBase,
    plugins: [
      UniManifest(),
      UniPages({
        dts: 'src/interfaces/uni-pages.d.ts',
      }),
      Uni(),
      UnoCSS(),
      AutoImport({
        imports: ['vue', 'pinia', 'uni-app'],
        dts: 'src/interfaces/auto-import.d.ts',
        dirs: ['src/hooks'],
        vueTemplate: true,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
    },
    server: serverConfig,
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0'),
    },
    build: buildConfig,
  }
})
