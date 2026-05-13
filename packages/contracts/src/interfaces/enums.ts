/**
 * 花卉品类枚举，用于植株档案分类与筛选。
 */
export enum FlowerCategory {
  Succulent = 'succulent',
  Herbaceous = 'herbaceous',
  Woody = 'woody',
  Hydroponic = 'hydroponic',
  Vine = 'vine',
}

/**
 * 植株摆放位置枚举，用于天气和养护建议判断。
 */
export enum FlowerPlacement {
  IndoorBalcony = 'indoor_balcony',
  OutdoorOpenAir = 'outdoor_open_air',
  IndoorShade = 'indoor_shade',
}

/**
 * 养护难度枚举，用于新手提示和分类筛选。
 */
export enum FlowerCareDifficulty {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard',
}

/**
 * 养护记录操作类型枚举。
 */
export enum RecordActionType {
  Watering = 'watering',
  Fertilizing = 'fertilizing',
  Pruning = 'pruning',
  Repotting = 'repotting',
  PestControl = 'pest_control',
  LeafCleaning = 'leaf_cleaning',
  LightAdjustment = 'light_adjustment',
}

/**
 * 天气状态枚举，用于前后端统一映射天气文案。
 */
export enum WeatherCondition {
  Sunny = 'sunny',
  Cloudy = 'cloudy',
  Overcast = 'overcast',
  Rainy = 'rainy',
  Storm = 'storm',
  Snow = 'snow',
  Foggy = 'foggy',
  Hazy = 'hazy',
}

/**
 * 会员权益项枚举。
 */
export enum MemberBenefitType {
  UnlimitedAiAdvice = 'unlimited_ai_advice',
  CloudBackup = 'cloud_backup',
  AdvancedTheme = 'advanced_theme',
  GrowthPoster = 'growth_poster',
  TripCarePlan = 'trip_care_plan',
  AdFree = 'ad_free',
}

/**
 * 会员套餐枚举。
 */
export enum MemberPackageType {
  Monthly = 'monthly',
  Yearly = 'yearly',
  Lifetime = 'lifetime',
}

/**
 * 会员状态枚举。
 */
export enum MemberStatus {
  Inactive = 'inactive',
  Active = 'active',
  Expired = 'expired',
  GracePeriod = 'grace_period',
}

/**
 * 用户状态枚举。
 */
export enum UserStatus {
  Normal = 'normal',
  Disabled = 'disabled',
}
