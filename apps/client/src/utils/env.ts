import { AppEnvMode } from '@/interfaces'

export function getAppMode(): AppEnvMode {
  const mode = import.meta.env.MODE

  if (mode === AppEnvMode.Production) {
    return AppEnvMode.Production
  }

  if (mode === AppEnvMode.Test) {
    return AppEnvMode.Test
  }

  return AppEnvMode.Development
}

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_SERVER_BASEURL.replace(/\/$/, '')
}

export function shouldUseProxy(): boolean {
  return import.meta.env.VITE_APP_PROXY_ENABLE === 'true'
}

export function getStorageNamespace(): string {
  return import.meta.env.VITE_STORAGE_NAMESPACE
}

export function getStorageAesKey(): string {
  return import.meta.env.VITE_STORAGE_AES_KEY
}
