import type { IAiAdvice, IPlantAiAdvice } from '@florist/contracts'
import type { LocalFlower } from './flower-manager'
import type { LocalRecord } from './record-manager'
import type { WeatherSnapshot } from './weather-reminder'

export interface GardenAiAdviceContext {
  readonly weather: WeatherSnapshot
  readonly flowers: ReadonlyArray<LocalFlower>
  readonly records: ReadonlyArray<LocalRecord>
}

export interface SingleFlowerAiAdviceContext {
  readonly flower: LocalFlower
  readonly weather: WeatherSnapshot
  readonly records: ReadonlyArray<LocalRecord>
  readonly isOffline: boolean
}

export interface SingleFlowerAiAdviceState {
  advice: IPlantAiAdvice | null
  loading: boolean
  latestMessage: string
  disabled: boolean
}

export type GardenAiAdviceResponse = IAiAdvice
