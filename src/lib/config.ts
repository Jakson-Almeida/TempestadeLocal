import type { EncryptedPayload } from '../utils/crypto.ts'
import { decryptApiKey, encryptApiKey } from '../utils/crypto.ts'

const STORAGE_KEY = 'tempestadelocal_ai_config'

export type Provider = 'openrouter' | 'openai'

interface StoredConfig {
  provider: Provider
  encryptedKey?: EncryptedPayload
}

export function loadStoredConfig(): StoredConfig | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredConfig
  } catch {
    return null
  }
}

function persistConfig(config: StoredConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export async function saveApiKey(apiKey: string, masterPassword: string, provider: Provider): Promise<void> {
  const encrypted = await encryptApiKey(apiKey, masterPassword)
  const current = loadStoredConfig() ?? { provider: 'openrouter' }
  persistConfig({ ...current, provider, encryptedKey: encrypted })
}

export async function getDecryptedKey(masterPassword: string): Promise<string | null> {
  const stored = loadStoredConfig()
  if (!stored?.encryptedKey) return null
  try {
    return await decryptApiKey(stored.encryptedKey, masterPassword)
  } catch {
    return null
  }
}

export function hasStoredKey(): boolean {
  const stored = loadStoredConfig()
  return !!stored?.encryptedKey
}
