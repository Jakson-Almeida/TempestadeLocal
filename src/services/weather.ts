import type { HourlyWeatherPoint, StormRiskLevel, StormRiskSummary } from '../types.d.ts'

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'

interface OpenMeteoResponse {
  hourly?: {
    time?: string[]
    precipitation_probability?: number[]
    weathercode?: number[]
    cloudcover?: number[]
    windgusts_10m?: number[]
  }
}

export async function fetchHourlyWeather(latitude: number, longitude: number): Promise<HourlyWeatherPoint[]> {
  const url = new URL(OPEN_METEO_URL)
  url.searchParams.set('latitude', latitude.toString())
  url.searchParams.set('longitude', longitude.toString())
  url.searchParams.set(
    'hourly',
    ['time', 'precipitation_probability', 'weathercode', 'cloudcover', 'windgusts_10m'].join(','),
  )
  url.searchParams.set('forecast_days', '1')
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error('Falha ao obter previsão do tempo')
  }

  const data: OpenMeteoResponse = await res.json()
  const hourly = data.hourly

  if (!hourly || !hourly.time) {
    throw new Error('Resposta de previsão inválida')
  }

  const points: HourlyWeatherPoint[] = hourly.time.map((time, index) => ({
    time,
    precipitationProbability: hourly.precipitation_probability?.[index],
    weatherCode: hourly.weathercode?.[index],
    cloudCover: hourly.cloudcover?.[index],
    windGusts: hourly.windgusts_10m?.[index],
  }))

  return points
}

export function computeStormRisk(points: HourlyWeatherPoint[], hoursAhead = 6): StormRiskSummary {
  const now = new Date()
  const limit = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000)

  const upcoming = points.filter((p) => {
    const t = new Date(p.time)
    return t >= now && t <= limit
  })

  if (upcoming.length === 0) {
    return {
      level: 'baixo',
      reason: 'Sem dados suficientes para o período próximo.',
      nextHours: [],
    }
  }

  let maxPrecipitation = 0
  let MaxWindGusts = 0
  let hasThunderstormCode = false

  for (const p of upcoming) {
    if (typeof p.precipitationProbability === 'number') {
      maxPrecipitation = Math.max(maxPrecipitation, p.precipitationProbability)
    }
    if (typeof p.windGusts === 'number') {
      MaxWindGusts = Math.max(MaxWindGusts, p.windGusts)
    }
    if (typeof p.weatherCode === 'number' && [95, 96, 99].includes(p.weatherCode)) {
      hasThunderstormCode = true
    }
  }

  let level: StormRiskLevel = 'baixo'
  let reason = 'Condições estáveis nas próximas horas.'

  if (hasThunderstormCode || (maxPrecipitation >= 70 && MaxWindGusts >= 15)) {
    level = 'alto'
    reason = 'Alta probabilidade de tempestades intensas nas próximas horas.'
  } else if (maxPrecipitation >= 40 || MaxWindGusts >= 10) {
    level = 'moderado'
    reason = 'Chance moderada de chuva forte e rajadas de vento.'
  }

  return {
    level,
    reason,
    nextHours: upcoming,
  }
}

