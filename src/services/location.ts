import type { LocationInfo } from '../types.d.ts'

const IP_API_URL = 'https://ipapi.co/json'

export async function getLocationFromIP(): Promise<LocationInfo> {
  const res = await fetch(IP_API_URL)
  if (!res.ok) {
    throw new Error('Falha ao obter localização pelo IP')
  }

  const data = await res.json()

  if (!data || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
    throw new Error('Resposta de localização inválida')
  }

  return {
    city: data.city,
    region: data.region,
    country: data.country_name,
    latitude: data.latitude,
    longitude: data.longitude,
  }
}

