/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_PORT: string
  readonly VITE_APP_PUBLIC_BASE: string
  readonly VITE_SERVER_BASEURL: string
  readonly VITE_APP_PROXY_ENABLE: 'true' | 'false'
  readonly VITE_APP_PROXY_PREFIX: string
  readonly VITE_DELETE_CONSOLE: 'true' | 'false'
  readonly VITE_STORAGE_AES_KEY: string
  readonly VITE_STORAGE_NAMESPACE: string
  readonly VITE_UNI_APPID: string
  readonly VITE_WX_APPID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __APP_VERSION__: string
