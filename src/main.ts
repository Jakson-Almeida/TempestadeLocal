import './style.css'
import { ConfigProvider } from './context/ConfigContext.tsx'
import { getLocationFromIP } from './services/location.ts'
import { computeStormRisk, fetchHourlyWeather } from './services/weather.ts'
import type { LocationInfo, StormRiskSummary } from './types.d.ts'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Elemento raiz #app não encontrado')
}

const state: {
  loading: boolean
  error: string | null
  location: LocationInfo | null
  risk: StormRiskSummary | null
  activeTab: 'dashboard' | 'settings'
} = {
  loading: true,
  error: null,
  location: null,
  risk: null,
  activeTab: 'dashboard',
}

function render() {
  const locationLabel = state.location
    ? `${state.location.city ?? ''} ${state.location.region ?? ''} ${state.location.country ?? ''}`.trim()
    : 'Desconhecido'

  const riskLevel = state.risk?.level ?? '—'
  const riskReason = state.risk?.reason ?? 'Carregando dados...'

  const dashboardVisible = state.activeTab === 'dashboard'
  const settingsVisible = state.activeTab === 'settings'

  app.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <div>
          <h1>TempestadeLocal</h1>
          <p class="subtitle">Monitor local de risco de tempestades</p>
        </div>
        <nav class="tabs">
          <button class="tab ${dashboardVisible ? 'active' : ''}" data-tab="dashboard">Resumo</button>
          <button class="tab ${settingsVisible ? 'active' : ''}" data-tab="settings">Configurações</button>
        </nav>
      </header>

      <main class="app-main">
        ${
          state.loading
            ? `<div class="panel"><p>Carregando localização e previsão...</p></div>`
            : state.error
              ? `<div class="panel panel-error">
                  <h2>Não foi possível atualizar os dados</h2>
                  <p>${state.error}</p>
                </div>`
              : `
            <section class="panel ${dashboardVisible ? '' : 'hidden'}" data-panel="dashboard">
              <h2>Risco nas próximas horas</h2>
              <p class="location-label">Local aproximado: <strong>${locationLabel}</strong></p>
              <div class="risk-card risk-${riskLevel}">
                <span class="risk-label">Nível de risco:</span>
                <span class="risk-value risk-${riskLevel}">${riskLevel.toUpperCase()}</span>
              </div>
              <p class="risk-reason">${riskReason}</p>
              <p class="hint">
                Este é um cálculo simples baseado em probabilidade de chuva, rajadas de vento e códigos de tempestade do Open-Meteo.
              </p>
            </section>

            <section class="panel ${settingsVisible ? '' : 'hidden'}" data-panel="settings">
              <h2>Configurações de IA</h2>
              <p>
                Aqui você poderá configurar sua própria chave de API (OpenRouter ou OpenAI). 
                No momento, o backend de IA ainda está sendo conectado – mas a chave já pode ser salva de forma criptografada no seu navegador.
              </p>
              <p class="hint">
                A chave nunca sai do seu dispositivo; ela é armazenada no <code>localStorage</code>, cifrada com uma senha mestra que você informa.
              </p>
            </section>
          `
        }
      </main>
      <footer class="app-footer">
        <small>
          Dados de localização via ipapi.co, previsão via Open-Meteo. 
          Este projeto é experimental e não substitui alertas oficiais de defesa civil.
        </small>
      </footer>
    </div>
  `

  app.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((btn) => {
    btn.onclick = () => {
      const tab = btn.getAttribute('data-tab')
      if (tab === 'dashboard' || tab === 'settings') {
        state.activeTab = tab
        render()
      }
    }
  })
}

async function bootstrap() {
  try {
    render()
    const location = await getLocationFromIP()
    const hourly = await fetchHourlyWeather(location.latitude, location.longitude)
    const risk = computeStormRisk(hourly)
    state.location = location
    state.risk = risk
    state.loading = false
    render()
  } catch (err) {
    state.loading = false
    state.error = err instanceof Error ? err.message : 'Erro desconhecido ao carregar dados'
    render()
  }
}

render()
bootstrap()
