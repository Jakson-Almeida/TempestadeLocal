import './style.css'
import { getDecryptedKey, hasStoredKey, loadStoredConfig, saveApiKey } from './lib/config.ts'
import { getAIAdvice } from './services/ai.ts'
import { getLocationFromIP } from './services/location.ts'
import { computeStormRisk, fetchHourlyWeather } from './services/weather.ts'
import type { LocationInfo, StormRiskSummary } from './types.d.ts'

const appEl = document.querySelector<HTMLDivElement>('#app')
if (!appEl) throw new Error('Elemento raiz #app não encontrado')
const app = appEl

const state: {
  loading: boolean
  error: string | null
  location: LocationInfo | null
  risk: StormRiskSummary | null
  activeTab: 'dashboard' | 'settings'
  settingsSaveMessage: string | null
  aiAdvice: string | null
  aiError: string | null
  aiLoading: boolean
  showPasswordPrompt: boolean
} = {
  loading: true,
  error: null,
  location: null,
  risk: null,
  activeTab: 'dashboard',
  settingsSaveMessage: null,
  aiAdvice: null,
  aiError: null,
  aiLoading: false,
  showPasswordPrompt: false,
}

const storedProvider = () => loadStoredConfig()?.provider ?? 'openrouter'

function render() {
  const locationLabel = state.location
    ? `${state.location.city ?? ''} ${state.location.region ?? ''} ${state.location.country ?? ''}`.trim()
    : 'Desconhecido'

  const riskLevel = state.risk?.level ?? '—'
  const riskReason = state.risk?.reason ?? 'Carregando dados...'

  const dashboardVisible = state.activeTab === 'dashboard'
  const settingsVisible = state.activeTab === 'settings'

  const aiBlock =
    state.aiLoading ?
      '<p class="ai-status">Carregando orientação da IA...</p>'
    : state.aiError ?
      `<div class="ai-error">${state.aiError}</div>`
    : state.aiAdvice ?
      `<div class="ai-advice">${state.aiAdvice.replace(/\n/g, '<br>')}</div>`
    : ''

  const passwordPromptBlock =
    state.showPasswordPrompt ?
      `<div class="password-prompt">
        <label for="master-password-input">Senha mestra (para descriptografar a chave):</label>
        <input type="password" id="master-password-input" placeholder="Senha mestra" autocomplete="off" />
        <div class="prompt-actions">
          <button type="button" id="confirm-ai-btn">Confirmar e pedir orientação</button>
          <button type="button" id="cancel-prompt-btn">Cancelar</button>
        </div>
      </div>`
    : ''

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
                <span class="risk-value risk-${riskLevel}">${riskLevel === '—' ? '—' : riskLevel.toUpperCase()}</span>
              </div>
              <p class="risk-reason">${riskReason}</p>
              <p class="hint">
                Este é um cálculo simples baseado em probabilidade de chuva, rajadas de vento e códigos de tempestade do Open-Meteo.
              </p>
              ${hasStoredKey() ? `<button type="button" id="ask-ai-btn" class="btn-primary">Pedir orientação da IA</button>` : '<p class="hint">Configure uma chave de API em <strong>Configurações</strong> para obter orientações em linguagem natural.</p>'}
              ${passwordPromptBlock}
              ${aiBlock}
            </section>

            <section class="panel ${settingsVisible ? '' : 'hidden'}" data-panel="settings">
              <h2>Configurações de IA</h2>
              <p>
                Insira sua chave de API (OpenRouter ou OpenAI). A chave é salva no seu navegador, criptografada com a senha mestra.
              </p>
              <form id="settings-form" class="settings-form">
                <label for="provider-select">Provedor</label>
                <select id="provider-select">
                  <option value="openrouter" ${storedProvider() === 'openrouter' ? 'selected' : ''}>OpenRouter</option>
                  <option value="openai" ${storedProvider() === 'openai' ? 'selected' : ''}>OpenAI (em breve)</option>
                </select>
                <label for="api-key-input">Chave de API</label>
                <input type="password" id="api-key-input" placeholder="sk-..." autocomplete="off" />
                <label for="master-password-settings">Senha mestra (para criptografar a chave)</label>
                <input type="password" id="master-password-settings" placeholder="Senha mestra" autocomplete="new-password" />
                <button type="submit" class="btn-primary">Salvar configuração</button>
              </form>
              ${state.settingsSaveMessage ? `<p class="settings-msg">${state.settingsSaveMessage}</p>` : ''}
              <p class="hint">
                A chave nunca sai do seu dispositivo; ela é armazenada no <code>localStorage</code>, cifrada com a senha mestra.
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
        state.settingsSaveMessage = null
        render()
      }
    }
  })

  const confirmBtn = app.querySelector<HTMLButtonElement>('#confirm-ai-btn')
  const cancelBtn = app.querySelector<HTMLButtonElement>('#cancel-prompt-btn')
  const passwordInput = app.querySelector<HTMLInputElement>('#master-password-input')
  if (confirmBtn && passwordInput) {
    confirmBtn.onclick = async () => {
      const pwd = passwordInput.value.trim()
      if (!pwd) return
      state.showPasswordPrompt = false
      state.aiLoading = true
      state.aiError = null
      state.aiAdvice = null
      render()
      try {
        const apiKey = await getDecryptedKey(pwd)
        if (!apiKey) {
          state.aiLoading = false
          state.aiError = 'Senha mestra incorreta ou chave não configurada.'
          render()
          return
        }
        if (!state.location || !state.risk) {
          state.aiLoading = false
          state.aiError = 'Dados de localização ou risco indisponíveis.'
          render()
          return
        }
        const advice = await getAIAdvice(apiKey, {
          locationLabel,
          summary: state.risk,
        })
        state.aiAdvice = advice
        state.aiLoading = false
        render()
      } catch (err) {
        state.aiLoading = false
        state.aiError = err instanceof Error ? err.message : 'Erro ao obter orientação da IA.'
        render()
      }
    }
  }
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      state.showPasswordPrompt = false
      render()
    }
  }

  const askAiBtn = app.querySelector<HTMLButtonElement>('#ask-ai-btn')
  if (askAiBtn) {
    askAiBtn.onclick = () => {
      state.showPasswordPrompt = true
      state.aiError = null
      render()
      setTimeout(() => app.querySelector<HTMLInputElement>('#master-password-input')?.focus(), 80)
    }
  }

  const settingsForm = app.querySelector<HTMLFormElement>('#settings-form')
  if (settingsForm) {
    settingsForm.onsubmit = async (e) => {
      e.preventDefault()
      const apiKeyInput = app.querySelector<HTMLInputElement>('#api-key-input')
      const masterPwdInput = app.querySelector<HTMLInputElement>('#master-password-settings')
      const providerSelect = app.querySelector<HTMLSelectElement>('#provider-select')
      const apiKey = apiKeyInput?.value?.trim()
      const masterPwd = masterPwdInput?.value?.trim()
      const provider = (providerSelect?.value as 'openrouter' | 'openai') ?? 'openrouter'
      if (!apiKey || !masterPwd) {
        state.settingsSaveMessage = 'Preencha a chave de API e a senha mestra.'
        render()
        return
      }
      try {
        await saveApiKey(apiKey, masterPwd, provider)
        state.settingsSaveMessage = 'Configuração salva com sucesso. A chave está criptografada no seu dispositivo.'
        apiKeyInput?.value && (apiKeyInput.value = '')
        masterPwdInput?.value && (masterPwdInput.value = '')
        render()
      } catch (err) {
        state.settingsSaveMessage = err instanceof Error ? err.message : 'Erro ao salvar.'
        render()
      }
    }
  }
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
