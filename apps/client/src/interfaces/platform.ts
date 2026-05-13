import type { Nullable } from './base'

export interface H5ViewportInfo {
  width: number
  height: number
  devicePixelRatio: number
}

export interface WeixinMiniProgramInfo {
  appId: string
  envVersion: string
}

export interface PlatformSnapshot {
  viewport: Nullable<H5ViewportInfo>
  miniProgram: Nullable<WeixinMiniProgramInfo>
}
