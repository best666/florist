import type { ShopCategoryDefinition, ShopProduct } from '@/interfaces'
import { ShopCategory } from '@/interfaces'

export const SHOP_CATEGORY_DEFINITIONS: ReadonlyArray<ShopCategoryDefinition> = [
  {
    id: ShopCategory.Flowerpot,
    label: '花盆',
    emoji: '🪴',
    description: '优先透气、排水稳定，适合日常换盆与控水。',
  },
  {
    id: ShopCategory.Fertilizer,
    label: '肥料',
    emoji: '🌾',
    description: '以温和通用型为主，不堆刺激型产品。',
  },
  {
    id: ShopCategory.Pesticide,
    label: '药剂',
    emoji: '🧴',
    description: '只保留常见病虫害的基础处理方向。',
  },
  {
    id: ShopCategory.Tool,
    label: '工具',
    emoji: '✂️',
    description: '围绕修剪、松土、喷壶等刚需工具选择。',
  },
  {
    id: ShopCategory.PottingSoil,
    label: '营养土',
    emoji: '🌱',
    description: '面向多肉、观叶和通用园艺的基础土壤。',
  },
] as const

export const FLORIST_SHOP_PRODUCTS: ReadonlyArray<ShopProduct> = [
  {
    id: 'pot-vented-ceramic',
    category: ShopCategory.Flowerpot,
    title: '透气陶盆',
    subtitle: '基础日常款，适合控水和换盆观察',
    intro: '盆壁透气、排水孔清晰，适合新手先从稳定的基础花盆开始。',
    suitablePlants: ['多肉', '虎皮兰', '龟背竹小苗'],
    highlightLabel: '排水稳定',
    externalUrl: 'https://s.taobao.com/search?q=%E9%80%8F%E6%B0%94%E9%99%B6%E7%9B%86',
  },
  {
    id: 'fertilizer-general-liquid',
    category: ShopCategory.Fertilizer,
    title: '通用液体肥',
    subtitle: '低门槛，适合规律薄肥勤施',
    intro: '适合大多数观叶与草本植物，重点是稀释方便、少量多次。',
    suitablePlants: ['绿萝', '吊兰', '草本花卉'],
    highlightLabel: '温和补养',
    externalUrl: 'https://search.jd.com/Search?keyword=%E9%80%9A%E7%94%A8%E6%B6%B2%E4%BD%93%E8%82%A5',
  },
  {
    id: 'pesticide-basic-neem',
    category: ShopCategory.Pesticide,
    title: '基础除虫喷剂',
    subtitle: '适合常见小飞虫、介壳虫的日常处理',
    intro: '优先选择说明清晰、适合家庭园艺的小规格喷剂，避免一次买太重的药。',
    suitablePlants: ['月季', '薄荷', '观叶植物'],
    highlightLabel: '家庭常备',
    externalUrl: 'https://s.taobao.com/search?q=%E5%AE%B6%E5%BA%AD%E5%9B%AD%E8%89%BA%E9%99%A4%E8%99%AB%E5%96%B7%E5%89%82',
  },
  {
    id: 'tool-pruning-set',
    category: ShopCategory.Tool,
    title: '修剪护理套装',
    subtitle: '剪刀、镊子、铲勺三件够用就好',
    intro: '围绕修叶、翻土和局部整理的轻量工具组合，避免买一堆闲置工具。',
    suitablePlants: ['多肉', '观叶植物', '小型花卉'],
    highlightLabel: '轻量够用',
    externalUrl: 'https://search.jd.com/Search?keyword=%E5%9B%AD%E8%89%BA%E4%BF%AE%E5%89%AA%E5%A5%97%E8%A3%85',
  },
  {
    id: 'soil-succulent-mix',
    category: ShopCategory.PottingSoil,
    title: '颗粒型营养土',
    subtitle: '适合怕闷根的多肉和耐旱类植物',
    intro: '颗粒比例更高，排水快，适合容易因浇水过量出问题的植物。',
    suitablePlants: ['多肉', '仙人掌', '玉树'],
    highlightLabel: '排水快',
    externalUrl: 'https://s.taobao.com/search?q=%E5%A4%9A%E8%82%89%E9%A2%97%E7%B2%92%E5%9C%9F',
  },
  {
    id: 'soil-foliage-mix',
    category: ShopCategory.PottingSoil,
    title: '观叶通用营养土',
    subtitle: '疏松保水平衡，适合大多数家养观叶',
    intro: '适合作为绿萝、龟背竹、白掌等观叶植物的换盆基础土。',
    suitablePlants: ['绿萝', '白掌', '龟背竹'],
    highlightLabel: '通用稳妥',
    externalUrl: 'https://search.jd.com/Search?keyword=%E8%A7%82%E5%8F%B6%E9%80%9A%E7%94%A8%E8%90%A5%E5%85%BB%E5%9C%9F',
  },
] as const

export function getShopCategoryLabel(category: ShopCategory): string {
  return SHOP_CATEGORY_DEFINITIONS.find(item => item.id === category)?.label ?? '商品'
}

export function getWeakAdFeaturedProduct(): ShopProduct {
  return FLORIST_SHOP_PRODUCTS[0]!
}
