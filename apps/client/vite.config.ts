import path from 'node:path'
import process from 'node:process'
import Uni from '@uni-helper/plugin-uni'
import UniManifest from '@uni-helper/vite-plugin-uni-manifest'
import UniPages from '@uni-helper/vite-plugin-uni-pages'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(process.cwd(), 'env'))
  const isProduction = mode === 'production'
  const appBase = env.VITE_APP_PUBLIC_BASE ?? '/'
  const appPort = Number.parseInt(env.VITE_APP_PORT ?? '9000', 10)
  const proxyPrefix = env.VITE_APP_PROXY_PREFIX ?? '/api'
  const serverBaseUrl = env.VITE_SERVER_BASEURL ?? 'http://localhost:3000'
  const serverConfig = {
    host: '0.0.0.0',
    port: appPort,
    ...(env.VITE_APP_PROXY_ENABLE === 'true'
      ? {
          proxy: {
            [proxyPrefix]: {
              target: serverBaseUrl,
              changeOrigin: true,
              rewrite: (requestPath: string) =>
                requestPath.replace(new RegExp(`^${proxyPrefix}`), ''),
            },
          },
        }
      : {}),
  }
  const buildConfig = {
    sourcemap: false,
    target: 'es2018',
    cssCodeSplit: true,
    minify: isProduction ? ('terser' as const) : false,
    ...(isProduction
      ? {
          terserOptions: {
            compress: {
              drop_console: env.VITE_DELETE_CONSOLE === 'true',
              drop_debugger: true,
              pure_funcs:
                env.VITE_DELETE_CONSOLE === 'true'
                  ? ['console.log', 'console.info', 'console.debug']
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
    base: appBase,
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
