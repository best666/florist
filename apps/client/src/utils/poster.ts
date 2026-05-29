import type {
  GrowthPosterOutputSize,
  GrowthPosterTemplateDefinition,
} from '@/interfaces'
import { openPlatformPermissionSetting } from './platform'

export const FREE_GROWTH_POSTER_TEMPLATES: ReadonlyArray<GrowthPosterTemplateDefinition> = [
  {
    id: 'soft-bloom',
    name: '软绒花讯',
    subtitle: '奶油薄荷底色，适合记录从幼苗到舒展的柔软阶段。',
    memberOnly: false,
    badgeText: '免费',
    backgroundTopColor: '#FFF8EC',
    backgroundBottomColor: '#E7FFF5',
    accentColor: '#86D6C1',
    panelColor: '#FFFFFF',
    stickerEmoji: '🌷',
  },
  {
    id: 'daylight-diary',
    name: '晴光日记',
    subtitle: '杏子和日光的轻快配色，适合活泼一点的生长记录。',
    memberOnly: false,
    badgeText: '免费',
    backgroundTopColor: '#FFF3D9',
    backgroundBottomColor: '#FFE9F3',
    accentColor: '#FFB97C',
    panelColor: '#FFFDF9',
    stickerEmoji: '🌼',
  },
] as const

export const MEMBER_GROWTH_POSTER_TEMPLATES: ReadonlyArray<GrowthPosterTemplateDefinition> = [
  {
    id: 'member-garden-party',
    name: '花园派对',
    subtitle: '会员专属拼贴风，支持更完整的大图展示和无水印导出。',
    memberOnly: true,
    badgeText: '会员',
    backgroundTopColor: '#FEE7EF',
    backgroundBottomColor: '#E7F8FF',
    accentColor: '#E88AB5',
    panelColor: '#FFFDFB',
    stickerEmoji: '🎀',
  },
  {
    id: 'member-moonlight-letter',
    name: '月光信笺',
    subtitle: '会员专属月夜配色，适合做更安静、更细腻的成长海报。',
    memberOnly: true,
    badgeText: '会员',
    backgroundTopColor: '#E8ECFF',
    backgroundBottomColor: '#FFF2E6',
    accentColor: '#7C90E8',
    panelColor: '#FFFFFF',
    stickerEmoji: '🌙',
  },
] as const

export const ALL_GROWTH_POSTER_TEMPLATES: ReadonlyArray<GrowthPosterTemplateDefinition> = [
  ...FREE_GROWTH_POSTER_TEMPLATES,
  ...MEMBER_GROWTH_POSTER_TEMPLATES,
]

export function resolveGrowthPosterTemplate(
  templateId: GrowthPosterTemplateDefinition['id'],
): GrowthPosterTemplateDefinition {
  return ALL_GROWTH_POSTER_TEMPLATES.find(template => template.id === templateId)
    ?? FREE_GROWTH_POSTER_TEMPLATES[0]!
}

export function getGrowthPosterOutputSize(isMember: boolean): GrowthPosterOutputSize {
  return isMember
    ? {
        width: 1080,
        height: 1620,
      }
    : {
        width: 900,
        height: 1380,
      }
}

export function resolvePosterFileName(flowerName: string): string {
  return `${flowerName}-成长海报-${Date.now()}.png`
}

export function buildPosterWatermarkText(flowerName: string): string {
  return `植愈日记 · ${flowerName} 成长相册`
}

export function resolvePosterImageSource(image: { url: string, compressedUrl?: string }): string {
  return image.compressedUrl ?? image.url
}

export async function savePosterImageToAlbum(filePath: string, fileName: string): Promise<string> {
  // #ifdef MP-WEIXIN
  const authorized = await new Promise<boolean>((resolve) => {
    uni.authorize({
      scope: 'scope.writePhotosAlbum',
      success: () => resolve(true),
      fail: async () => {
        const opened = await openPlatformPermissionSetting()
        resolve(opened)
      },
    })
  })

  if (!authorized) {
    throw new Error('还没有相册权限，去微信权限设置里打开后就能保存啦。')
  }

  await uni.saveImageToPhotosAlbum({ filePath })
  return '海报已经保存到系统相册啦。'
  // #endif

  // #ifdef H5
  const downloadLink = document.createElement('a')
  downloadLink.href = filePath
  downloadLink.download = fileName
  downloadLink.rel = 'noopener'
  document.body.appendChild(downloadLink)
  downloadLink.click()
  document.body.removeChild(downloadLink)
  return '海报已经下载到本地设备啦。'
  // #endif

  throw new Error('当前平台暂不支持保存海报。')
}
