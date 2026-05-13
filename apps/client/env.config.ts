export type ClientAppMode = 'development' | 'production' | 'test'

export interface ClientEnvSource {
  readonly MODE?: string
  readonly VITE_APP_TITLE?: string
  readonly VITE_APP_PORT?: string
  readonly VITE_APP_PUBLIC_BASE?: string
  readonly VITE_SERVER_BASEURL?: string
  readonly VITE_APP_PROXY_ENABLE?: string
  readonly VITE_APP_PROXY_PREFIX?: string
  readonly VITE_DELETE_CONSOLE?: string
  readonly VITE_STORAGE_AES_KEY?: string
  readonly VITE_STORAGE_NAMESPACE?: string
  readonly VITE_UNI_APPID?: string
  readonly VITE_WX_APPID?: string
}

export interface ClientEnvConfig {
  readonly mode: ClientAppMode
  readonly appTitle: string
  readonly appPort: number
  readonly appPublicBase: string
  readonly serverBaseUrl: string
  readonly proxyEnabled: boolean
  readonly proxyPrefix: string
  readonly deleteConsole: boolean
  readonly storageAesKey: string
  readonly storageNamespace: string
  readonly uniAppId: string
  readonly wxAppId: string
}

export const CLIENT_ENV_DEFAULTS = {
  appTitle: '养花人',
  appPort: 9000,
  appPublicBase: '/',
  serverBaseUrl: 'http://localhost:3000',
  proxyEnabled: true,
  proxyPrefix: '/api',
  deleteConsole: false,
  storageAesKey: 'replace-with-local-aes-key',
  storageNamespace: 'florist',
  uniAppId: '__UNI__FLORIST',
  wxAppId: 'wx0000000000000000',
} as const

function normalizeMode(mode?: string): ClientAppMode {
  if (mode === 'production') {
    return 'production'
  }

  if (mode === 'test') {
    return 'test'
  }

  return 'development'
}

function normalizeString(value: string | undefined, fallback: string): string {
  const normalizedValue = value?.trim()
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : fallback
}

function normalizeBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return fallback
}

function normalizeNumber(value: string | undefined, fallback: number): number {
  const parsedValue = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

function normalizeBaseUrl(value: string | undefined): string {
  return normalizeString(value, CLIENT_ENV_DEFAULTS.serverBaseUrl).replace(/\/$/, '')
}

export function resolveClientEnv(envSource: ClientEnvSource): ClientEnvConfig {
  return {
    mode: normalizeMode(envSource.MODE),
    appTitle: normalizeString(envSource.VITE_APP_TITLE, CLIENT_ENV_DEFAULTS.appTitle),
    appPort: normalizeNumber(envSource.VITE_APP_PORT, CLIENT_ENV_DEFAULTS.appPort),
    appPublicBase: normalizeString(
      envSource.VITE_APP_PUBLIC_BASE,
      CLIENT_ENV_DEFAULTS.appPublicBase,
    ),
    serverBaseUrl: normalizeBaseUrl(envSource.VITE_SERVER_BASEURL),
    proxyEnabled: normalizeBoolean(
      envSource.VITE_APP_PROXY_ENABLE,
      CLIENT_ENV_DEFAULTS.proxyEnabled,
    ),
    proxyPrefix: normalizeString(
      envSource.VITE_APP_PROXY_PREFIX,
      CLIENT_ENV_DEFAULTS.proxyPrefix,
    ),
    deleteConsole: normalizeBoolean(
      envSource.VITE_DELETE_CONSOLE,
      CLIENT_ENV_DEFAULTS.deleteConsole,
    ),
    storageAesKey: normalizeString(
      envSource.VITE_STORAGE_AES_KEY,
      CLIENT_ENV_DEFAULTS.storageAesKey,
    ),
    storageNamespace: normalizeString(
      envSource.VITE_STORAGE_NAMESPACE,
      CLIENT_ENV_DEFAULTS.storageNamespace,
    ),
    uniAppId: normalizeString(envSource.VITE_UNI_APPID, CLIENT_ENV_DEFAULTS.uniAppId),
    wxAppId: normalizeString(envSource.VITE_WX_APPID, CLIENT_ENV_DEFAULTS.wxAppId),
  }
}
