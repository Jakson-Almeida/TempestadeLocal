import type { StormRiskSummary } from '../types.d.ts'
import { useConfig } from '../context/ConfigContext.tsx'

interface AIAdviceParams {
  locationLabel: string
  summary: StormRiskSummary
}

interface UseAIAdviceResult {
  loading: boolean
  error: string | null
  advice: string | null
  requestAdvice: () => Promise<void>
}

async function callOpenRouter(apiKey: string, { locationLabel, summary }: AIAdviceParams): Promise<string> {
  const messages = [
    {
      role: 'system',
      content:
        'Você é um assistente meteorológico local. Explique o risco de tempestades de forma simples, em português do Brasil, com foco em segurança prática. Seja conciso (máx. 3 parágrafos curtos).',
    },
    {
      role: 'user',
      content: [
        `Local aproximado: ${locationLabel || 'desconhecido'}.`,
        `Nível de risco (heurística local): ${summary.level.toUpperCase()}.`,
        `Resumo: ${summary.reason}`,
      ].join('\n'),
    },
  ]

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages,
    }),
  })

  if (!res.ok) {
    throw new Error('Falha ao chamar o modelo de IA (OpenRouter)')
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('Resposta inesperada do modelo de IA')
  }
  return content
}

export function useAIAdvice(params: AIAdviceParams | null): UseAIAdviceResult {
  const { provider, getDecryptedKey } = useConfig()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [advice, setAdvice] = useState<string | null>(null)

  async function requestAdvice() {
    if (!params) return
    setLoading(true)
    setError(null)
    try {
      const apiKey = await getDecryptedKey()
      if (!apiKey) {
        throw new Error('API key não disponível. Confira as Configurações.')
      }

      let text: string
      if (provider === 'openrouter') {
        text = await callOpenRouter(apiKey, params)
      } else {
        throw new Error('Apenas OpenRouter está suportado neste MVP.')
      }
      setAdvice(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao buscar orientação da IA')
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, advice, requestAdvice }
}

