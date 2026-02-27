import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { EncryptedPayload } from '../utils/crypto.ts'
import { decryptApiKey, encryptApiKey } from '../utils/crypto.ts'

const STORAGE_KEY = 'tempestadelocal_ai_config'

type Provider = 'openrouter' | 'openai'

interface StoredConfig {
  provider: Provider
  encryptedKey?: EncryptedPayload
}

interface ConfigContextValue {
  provider: Provider
  hasEncryptedKey: boolean
  masterPasswordSet: boolean
  setProvider: (provider: Provider) => void
  saveApiKey: (apiKey: string, masterPassword: string) => Promise<void>
  setMasterPassword: (password: string) => void
  getDecryptedKey: () => Promise<string | null>
}

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined)

function loadStoredConfig(): StoredConfig | null {
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

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProviderState] = useState<Provider>('openrouter')
  const [encryptedKey, setEncryptedKey] = useState<EncryptedPayload | undefined>(undefined)
  const [masterPassword, setMasterPasswordState] = useState<string | null>(null)

  useEffect(() => {
    const stored = loadStoredConfig()
    if (stored) {
      setProviderState(stored.provider ?? 'openrouter')
      if (stored.encryptedKey) {
        setEncryptedKey(stored.encryptedKey)
      }
    }
  }, [])

  const value: ConfigContextValue = useMemo(
    () => ({
      provider,
      hasEncryptedKey: !!encryptedKey,
      masterPasswordSet: masterPassword != null && masterPassword.length > 0,
      setProvider: (next) => {
        setProviderState(next)
        const current = loadStoredConfig() ?? { provider: next }
        persistConfig({ ...current, provider: next })
      },
      saveApiKey: async (apiKey, masterPasswordInput) => {
        const encrypted = await encryptApiKey(apiKey, masterPasswordInput)
        setEncryptedKey(encrypted)
        setMasterPasswordState(masterPasswordInput)
        const current = loadStoredConfig() ?? { provider }
        persistConfig({ ...current, encryptedKey: encrypted })
      },
      setMasterPassword: (password) => {
        setMasterPasswordState(password)
      },
      getDecryptedKey: async () => {
        if (!encryptedKey || !masterPassword) return null
        try {
          return await decryptApiKey(encryptedKey, masterPassword)
        } catch {
          return null
        }
      },
    }),
    [provider, encryptedKey, masterPassword],
  )

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export function useConfig() {
  const ctx = useContext(ConfigContext)
  if (!ctx) {
    throw new Error('useConfig must be used within ConfigProvider')
  }
  return ctx
}

