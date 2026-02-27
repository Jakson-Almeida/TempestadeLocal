import type { HourlyWeatherPoint, StormRiskLevel, StormRiskSummary } from '../types.d.ts'

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'

interface OpenMeteoResponse {
  hourly?: {
    time?: string[]
    precipitation?: number[]
    weather_code?: number[]
    wind_gusts_10m?: number[]
  }
}

export async function fetchHourlyWeather(latitude: number, longitude: number): Promise<HourlyWeatherPoint[]> {
  const url = new URL(OPEN_METEO_URL)
  url.searchParams.set('latitude', latitude.toString())
  url.searchParams.set('longitude', longitude.toString())
  // Não incluir "time" em hourly: a API retorna 400 (SurfacePressureAndHeightVariable). O array "time" vem na resposta automaticamente.
  url.searchParams.set('hourly', 'precipitation,weather_code,wind_gusts_10m')
  url.searchParams.set('forecast_days', '1')
  url.searchParams.set('timezone', 'UTC')

  const res = await fetch(url.toString())
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Falha ao obter previsão do tempo: ${res.status} ${errBody.slice(0, 200)}`)
  }

  const data: OpenMeteoResponse = await res.json()
  const hourly = data.hourly

  if (!hourly || !hourly.time) {
    throw new Error('Resposta de previsão inválida')
  }

  const points: HourlyWeatherPoint[] = hourly.time.map((time, index) => ({
    time,
    precipitationProbability: hourly.precipitation?.[index] != null ? Math.min(100, hourly.precipitation![index] * 10) : undefined,
    weatherCode: hourly.weather_code?.[index],
    cloudCover: undefined,
    windGusts: hourly.wind_gusts_10m?.[index],
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

