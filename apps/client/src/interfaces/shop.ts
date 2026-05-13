export enum ShopCategory {
  Flowerpot = 'flowerpot',
  Fertilizer = 'fertilizer',
  Pesticide = 'pesticide',
  Tool = 'tool',
  PottingSoil = 'potting_soil',
}

export interface ShopProduct {
  readonly id: string
  readonly category: ShopCategory
  readonly title: string
  readonly subtitle: string
  readonly intro: string
  readonly suitablePlants: ReadonlyArray<string>
  readonly highlightLabel: string
  readonly externalUrl: string
}

export interface ShopCategoryDefinition {
  readonly id: ShopCategory
  readonly label: string
  readonly emoji: string
  readonly description: string
}
