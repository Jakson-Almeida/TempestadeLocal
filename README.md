# TempestadeLocal

Projeto open source para monitorar **risco de tempestades** de forma local, usando localização por IP, dados de previsão do tempo (Open-Meteo) e, opcionalmente, orientações em linguagem natural via IA (OpenRouter ou OpenAI).

## Objetivo

- Rodar **localmente** no seu navegador.
- Detectar sua **localização aproximada pelo IP** (sem GPS).
- Calcular um **nível de risco** (baixo / moderado / alto) com base em probabilidade de chuva, rajadas de vento e códigos de tempestade.
- Permitir que você configure sua **própria chave de API** (OpenRouter ou OpenAI) em **Configurações**; a chave é salva **apenas no seu dispositivo**, criptografada com uma senha mestra.
- Usar a IA para gerar **orientações práticas** sobre o risco nas próximas horas (em português do Brasil).

Este projeto é **experimental** e não substitui alertas oficiais de defesa civil ou órgãos meteorológicos.

## Como rodar

```bash
npm install
npm run dev
```

Abra o endereço indicado no terminal (geralmente `http://localhost:5173`).

### Build para produção

```bash
npm run build
npm run preview
```

Os arquivos de saída ficam em `dist/`.

## Configurações (chave de API)

1. Abra a aba **Configurações**.
2. Escolha o provedor (**OpenRouter** recomendado para uso direto no navegador).
3. Cole sua **chave de API** (ex.: chave do [OpenRouter](https://openrouter.ai/keys)).
4. Defina uma **senha mestra**: ela será usada para **criptografar** a chave no seu dispositivo (não é enviada a nenhum servidor).
5. Clique em **Salvar configuração**.

A chave fica armazenada no `localStorage` do navegador, cifrada com AES-GCM (derivação de chave com PBKDF2 e senha mestra). Para obter orientações da IA no **Resumo**, use o botão **Pedir orientação da IA** e informe a mesma senha mestra quando solicitado.

## Stack e fontes de dados

- **Frontend:** Vite + TypeScript (SPA vanilla, sem React).
- **Localização:** [ipapi.co](https://ipapi.co/) (geolocalização por IP, sem chave).
- **Previsão:** [Open-Meteo](https://open-meteo.com/) (sem chave).
- **IA:** [OpenRouter](https://openrouter.ai/) (modelo padrão: `openai/gpt-4o-mini`); chave configurável pelo usuário.

## Roadmap

- **MVP atual:** risco heurístico + IA opcional com chave salva localmente (criptografada).
- **Futuro:** integração mais profunda com [OpenClaw](https://github.com/openclaw/openclaw) (assistente pessoal open source), por exemplo como skill ou uso do ecossistema de ferramentas/IA.

## Licença

MIT.
