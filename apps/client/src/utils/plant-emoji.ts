import { FlowerCategory } from '@florist/contracts'

const CATEGORY_EMOJI_MAP: Record<string, string> = {
  [FlowerCategory.Succulent]: '🪴',
  [FlowerCategory.Herbaceous]: '🌱',
  [FlowerCategory.Woody]: '🌳',
  [FlowerCategory.Hydroponic]: '💧',
  [FlowerCategory.Vine]: '🌿',
}

const NAME_KEYWORD_EMOJI: Array<[RegExp, string]> = [
  [/龟背竹|龟背|蓬莱蕉/, '🌿'],
  [/玫瑰|月季|蔷薇/, '🌹'],
  [/兰花|兰草|蝴蝶兰|君子兰/, '🌺'],
  [/仙人掌|仙人球|仙人/, '🌵'],
  [/多肉|肉肉|石莲花|景天/, '🪴'],
  [/茉莉|栀子|桂花|米兰/, '🌸'],
  [/绿萝|吊兰|常春藤|爬山虎/, '🌿'],
  [/发财树|金钱树|摇钱/, '💰'],
  [/文竹|富贵竹|转运竹/, '🎋'],
  [/芦荟|虎皮兰|虎尾兰/, '🌵'],
  [/绣球|无尽夏/, '🌸'],
  [/薄荷|迷迭香|罗勒|紫苏|香草/, '🌱'],
  [/番茄|西红柿|辣椒|草莓|蓝莓/, '🍅'],
  [/睡莲|荷花|碗莲|水草|水培/, '🪷'],
  [/向日葵|太阳花/, '🌻'],
  [/郁金香|风信子|百合/, '🌷'],
  [/菊花|雏菊|玛格丽特/, '🌼'],
  [/樱花|桃花|杏花/, '🌸'],
  [/竹子|富贵竹|凤尾竹/, '🎋'],
  [/蕨|铁线蕨|鹿角蕨/, '🌿'],
  [/铜钱草|金钱草/, '🍀'],
  [/琴叶榕|橡皮树|幸福树/, '🌳'],
  [/空气凤梨/, '🌬️'],
  [/捕蝇草|猪笼草|食虫/, '🪴'],
]

export function resolvePlantEmoji(name: string, category?: string): string {
  for (const [pattern, emoji] of NAME_KEYWORD_EMOJI) {
    if (pattern.test(name)) return emoji
  }
  if (category && CATEGORY_EMOJI_MAP[category]) {
    return CATEGORY_EMOJI_MAP[category]
  }
  return '🪴'
}
