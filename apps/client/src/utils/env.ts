import { AppEnvMode } from '@/interfaces'
import { resolveClientEnv } from '../../env.config'

const clientEnv = resolveClientEnv(import.meta.env)

export function getAppMode(): AppEnvMode {
  const mode = clientEnv.mode

  if (mode === AppEnvMode.Production) {
    return AppEnvMode.Production
  }

  if (mode === AppEnvMode.Test) {
    return AppEnvMode.Test
  }

  return AppEnvMode.Development
}

export function getApiBaseUrl(): string {
  return clientEnv.serverBaseUrl
}

export function shouldUseProxy(): boolean {
  return clientEnv.proxyEnabled
}

export function getStorageNamespace(): string {
  return clientEnv.storageNamespace
}

export function getStorageAesKey(): string {
  return clientEnv.storageAesKey
}

export function getClientEnvConfig() {
  return clientEnv
}
