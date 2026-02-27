import type { StormRiskSummary } from '../types.d.ts'

export interface AIAdviceParams {
  locationLabel: string
  summary: StormRiskSummary
}

export async function getAIAdvice(apiKey: string, params: AIAdviceParams): Promise<string> {
  const { locationLabel, summary } = params
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
    const errText = await res.text()
    throw new Error(`Falha ao chamar o modelo de IA (OpenRouter): ${res.status} ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('Resposta inesperada do modelo de IA')
  }
  return content
}
