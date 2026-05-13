import type { IAiPlantDiagnosis, IAiTripCarePlan, IImageAsset } from '@florist/contracts'
import type { LocalFlower } from './flower-manager'
import type { WeatherSnapshot } from './weather-reminder'

export const DAILY_FREE_PLANT_DIAGNOSIS_LIMIT = 3
export const MAX_PLANT_DOCTOR_HISTORY_COUNT = 12

export interface PlantDoctorDiagnosisContext {
  readonly image: IImageAsset
  readonly flower: LocalFlower | null
  readonly weather: WeatherSnapshot | null
}

export interface PlantDoctorTripPlanContext {
  readonly flower: LocalFlower
  readonly weather: WeatherSnapshot
  readonly travelDays: number
}

export interface PlantDoctorUsageQuota {
  readonly dateKey: string
  readonly usedCount: number
  readonly freeLimit: number
  readonly remainingCount: number
  readonly isMemberUnlimited: boolean
  readonly exceeded: boolean
}

export interface PlantDoctorHistoryItem {
  readonly id: string
  readonly createdAt: string
  readonly flowerId?: string
  readonly flowerName?: string
  readonly cityName?: string
  readonly weatherText?: string
  readonly travelDays?: number
  readonly image?: IImageAsset
  readonly diagnosis?: IAiPlantDiagnosis
  readonly tripCarePlan?: IAiTripCarePlan
}

export interface PlantDoctorCenterState {
  history: ReadonlyArray<PlantDoctorHistoryItem>
  quota: PlantDoctorUsageQuota
  latestLimitMessage: string
}
