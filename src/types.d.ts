export type StormRiskLevel = 'baixo' | 'moderado' | 'alto'

export interface LocationInfo {
  city?: string
  region?: string
  country?: string
  latitude: number
  longitude: number
}

export interface HourlyWeatherPoint {
  time: string
  precipitationProbability?: number
  weatherCode?: number
  cloudCover?: number
  windGusts?: number
}

export interface StormRiskSummary {
  level: StormRiskLevel
  reason: string
  nextHours: HourlyWeatherPoint[]
}

