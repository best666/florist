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
  NoWatermark = 'no_watermark',
  CloudBackup = 'cloud_backup',
  AllThemes = 'all_themes',
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
 * 会员支付渠道枚举。
 */
export enum MemberPaymentChannel {
  MpWeixin = 'mp_weixin',
  H5QrCode = 'h5_qr_code',
}

/**
 * 会员支付订单状态枚举。
 */
export enum MemberPaymentStatus {
  Pending = 'pending',
  Paid = 'paid',
  Expired = 'expired',
  Closed = 'closed',
}

/**
 * 用户反馈处理状态枚举。
 */
export enum FeedbackStatus {
  /** 待 AI 审核 */
  Pending = 'pending',
  /** AI 审核通过，已公开 */
  Approved = 'approved',
  /** AI 审核驳回 */
  Rejected = 'rejected',
  /** 管理员已审阅 */
  Reviewed = 'reviewed',
  /** 已归档 */
  Archived = 'archived',
}

/**
 * 登录来源枚举。
 */
export enum UserLoginType {
  AnonymousLocal = 'anonymous_local',
  WechatMiniProgram = 'wechat_mini_program',
  H5PhoneCode = 'h5_phone_code',
}

/**
 * 用户状态枚举。
 */
export enum UserStatus {
  Normal = 'normal',
  Disabled = 'disabled',
}
