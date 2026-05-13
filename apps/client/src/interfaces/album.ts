import type { IImageAsset } from '@florist/contracts'
import type { LocalFlower } from './flower-manager'

export type GrowthAlbumSourceType = 'flower-archive' | 'record-checkin'

export type GrowthPosterTemplateId =
  | 'soft-bloom'
  | 'daylight-diary'
  | 'member-garden-party'
  | 'member-moonlight-letter'

export interface GrowthAlbumPhotoItem {
  readonly id: string
  readonly flowerId: string
  readonly createdAt: string
  readonly image: IImageAsset
  readonly sourceType: GrowthAlbumSourceType
  readonly title: string
  readonly subtitle: string
  readonly tags: ReadonlyArray<string>
}

export interface GrowthPosterTemplateDefinition {
  readonly id: GrowthPosterTemplateId
  readonly name: string
  readonly subtitle: string
  readonly memberOnly: boolean
  readonly badgeText: string
  readonly backgroundTopColor: string
  readonly backgroundBottomColor: string
  readonly accentColor: string
  readonly panelColor: string
  readonly stickerEmoji: string
}

export interface GrowthPosterRenderPayload {
  readonly flower: LocalFlower
  readonly careDays: number
  readonly template: GrowthPosterTemplateDefinition
  readonly imagePaths: ReadonlyArray<string>
  readonly isMember: boolean
}

export interface GrowthPosterOutputSize {
  readonly width: number
  readonly height: number
}
