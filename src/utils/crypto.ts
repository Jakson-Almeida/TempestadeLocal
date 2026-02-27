const SALT_KEY = 'tempestadelocal_salt'

async function getOrCreateSalt(): Promise<Uint8Array> {
  const existing = localStorage.getItem(SALT_KEY)
  if (existing) {
    return Uint8Array.from(atob(existing), (c) => c.charCodeAt(0))
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  localStorage.setItem(SALT_KEY, btoa(String.fromCharCode(...salt)))
  return salt
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  )
}

export interface EncryptedPayload {
  iv: string
  ciphertext: string
}

export async function encryptApiKey(plainKey: string, password: string): Promise<EncryptedPayload> {
  const salt = await getOrCreateSalt()
  const key = await deriveKey(password, salt)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plainKey))

  const ciphertextBytes = new Uint8Array(encrypted)

  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...ciphertextBytes)),
  }
}

export async function decryptApiKey(payload: EncryptedPayload, password: string): Promise<string> {
  const salt = await getOrCreateSalt()
  const key = await deriveKey(password, salt)

  const ivBytes = Uint8Array.from(atob(payload.iv), (c) => c.charCodeAt(0))
  const ciphertextBytes = Uint8Array.from(atob(payload.ciphertext), (c) => c.charCodeAt(0))

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, ciphertextBytes)

  const dec = new TextDecoder()
  return dec.decode(decrypted)
}

