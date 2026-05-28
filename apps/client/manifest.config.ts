import path from 'node:path'
import process from 'node:process'
import { defineManifestConfig } from '@uni-helper/vite-plugin-uni-manifest'
import { loadEnv } from 'vite'

function resolveMode(): string {
  const args = process.argv.slice(2)
  const modeIndex = args.findIndex(argument => argument === '--mode')

  if (modeIndex >= 0) {
    return args[modeIndex + 1] ?? 'development'
  }

  return args[0] === 'build' ? 'production' : 'development'
}

const env = loadEnv(resolveMode(), path.resolve(process.cwd(), 'env'))
const appTitle = env.VITE_APP_TITLE ?? '养花人'
const appId = env.VITE_UNI_APPID ?? '__UNI__FLORIST'
const appBase = env.VITE_APP_PUBLIC_BASE ?? '/'
const weixinAppId = env.VITE_WX_APPID ?? 'wx0000000000000000'

export default defineManifestConfig({
  name: appTitle,
  appid: appId,
  description: '养花人花卉养护小程序',
  versionName: '0.1.0',
  versionCode: '1',
  transformPx: false,
  h5: {
    router: {
      base: appBase,
    },
    devServer: {
      port: Number(env.VITE_APP_PORT ?? 9000),
    },
  },
  'mp-weixin': {
    appid: weixinAppId,
    setting: {
      urlCheck: false,
      es6: true,
      minified: true,
      enhance: true,
    },
    optimization: {
      subPackages: true,
    },
    usingComponents: true,
    mergeVirtualHostAttributes: true,
    permission: {
      'scope.userLocation': {
        desc: '获取你所在城市的天气信息，为你的植物提供更精准的养护建议',
      },
    },
    requiredPrivateInfos: ['getLocation'],
  },
  uniStatistics: {
    enable: false,
  },
  vueVersion: '3',
})
