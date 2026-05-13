export enum PlantCategory {
  Succulent = 'succulent',
  Herbaceous = 'herbaceous',
  Woody = 'woody',
  Hydroponic = 'hydroponic',
  Vine = 'vine',
}

export enum PlacementType {
  IndoorBalcony = 'indoor_balcony',
  OutdoorOpenAir = 'outdoor_open_air',
  IndoorShade = 'indoor_shade',
}

export enum LightExposureType {
  FullSun = 'full_sun',
  PartialSun = 'partial_sun',
  Shade = 'shade',
}

export enum CareActionType {
  Watering = 'watering',
  Fertilizing = 'fertilizing',
  Pruning = 'pruning',
  Repotting = 'repotting',
  PestControl = 'pest_control',
  LeafCleaning = 'leaf_cleaning',
  LightAdjustment = 'light_adjustment',
}

export enum PlantStatus {
  Normal = 'normal',
  NeedsWater = 'needs_water',
  NeedsFertilizer = 'needs_fertilizer',
  Dormant = 'dormant',
  Abnormal = 'abnormal',
}

export enum SyncDirection {
  Upload = 'upload',
  Download = 'download',
  Bidirectional = 'bidirectional',
}

export enum SyncStatus {
  Pending = 'pending',
  Running = 'running',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Conflict = 'conflict',
}
