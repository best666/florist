import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { createRequire } from 'node:module'
import process from 'node:process'
import Uni from '@uni-helper/plugin-uni'
import UniManifest from '@uni-helper/vite-plugin-uni-manifest'
import UniPages from '@uni-helper/vite-plugin-uni-pages'
import { codeInspectorPlugin } from 'code-inspector-plugin'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { resolveClientEnv } from './env.config'
import { defineConfig, loadEnv } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

const require = createRequire(import.meta.url)
const VUE_ROUTER_ESM_ENTRY = require.resolve('vue-router/dist/vue-router.mjs')
const SERVER_RUNTIME_FILE = path.resolve(process.cwd(), '../server/.runtime/dev-server.json')

interface BackendRuntimeInfo {
  port?: number
  origin?: string
}

function resolveClientEnvOverrides(envSource: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(envSource)
      .filter((entry): entry is [string, string] => (
        entry[0].startsWith('VITE_') && typeof entry[1] === 'string'
      ))
      .map(([key, value]) => [key, value]),
  )
}

function resolveDevBackendTarget(defaultTarget: string): string {
  try {
    const runtimeContent = fs.readFileSync(SERVER_RUNTIME_FILE, 'utf8')
    const runtimeInfo = JSON.parse(runtimeContent) as BackendRuntimeInfo

    if (runtimeInfo.origin) {
      return runtimeInfo.origin.replace(/\/$/, '')
    }

    if (typeof runtimeInfo.port === 'number' && Number.isFinite(runtimeInfo.port)) {
      return `http://127.0.0.1:${runtimeInfo.port}`
    }
  }
  catch {
  }

  return defaultTarget
}

function createDevApiProxyPlugin(proxyPrefix: string, defaultTarget: string): Plugin {
  return {
    name: 'florist-dev-api-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = request.url ?? ''

        if (!requestUrl.startsWith(proxyPrefix)) {
          next()
          return
        }

        forwardProxyRequest(request, response, resolveDevBackendTarget(defaultTarget))
      })
    },
  }
}

function forwardProxyRequest(
  request: IncomingMessage,
  response: ServerResponse,
  targetOrigin: string,
): void {
  const targetUrl = new URL(request.url ?? '/', targetOrigin)
  const transport = targetUrl.protocol === 'https:' ? https : http

  const proxyRequest = transport.request(targetUrl, {
    method: request.method,
    headers: {
      ...request.headers,
      host: targetUrl.host,
    },
  }, (proxyResponse) => {
    response.writeHead(proxyResponse.statusCode ?? 502, proxyResponse.headers)
    proxyResponse.pipe(response)
  })

  proxyRequest.on('error', (error) => {
    if (response.headersSent) {
      response.end()
      return
    }

    response.writeHead(502, { 'content-type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({
      success: false,
      code: 'BAD_GATEWAY',
      message: `Unable to reach florist backend at ${targetOrigin}: ${error.message}`,
      data: null,
    }))
  })

  request.pipe(proxyRequest)
}

function resolveVueRouterEntryPlugin() {
  return {
    name: 'florist-resolve-vue-router-entry',
    enforce: 'pre' as const,
    resolveId(id: string) {
      if (id === 'vue-router/dist/vue-router.esm-bundler.js') {
        return VUE_ROUTER_ESM_ENTRY
      }
    },
  }
}

export default defineConfig(({ mode, command }) => {
  const env = resolveClientEnv({
    MODE: mode,
    ...loadEnv(mode, path.resolve(process.cwd(), 'env')),
    ...resolveClientEnvOverrides(process.env),
  })
  const isProduction = env.mode === 'production'
  const enableCodeInspector = command === 'serve' && !isProduction
  const serverConfig = {
    host: '0.0.0.0',
    port: env.appPort,
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
      ...(env.proxyEnabled ? [createDevApiProxyPlugin(env.proxyPrefix, env.serverBaseUrl)] : []),
      ...(enableCodeInspector ? [codeInspectorPlugin({ bundler: 'vite' })] : []),
      resolveVueRouterEntryPlugin(),
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
