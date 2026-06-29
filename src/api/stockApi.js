import axios from 'axios'

const BASE = '/stock/investment/v1.0/stockAnalyser'

// Analyse can take 4-8 minutes (NSE data fetch + 4 periods × OpenAI web search)
const analyseClient = axios.create({ timeout: 600_000 })  // 10 min
const defaultClient = axios.create({ timeout: 30_000 })   // 30s for quick reads

export const api = {
  // Get all analysed symbols
  getSymbols: () => defaultClient.get(`${BASE}/symbols`).then(r => r.data),

  // Screener — ranked stocks for a given period
  getScreener: (period = '1Y', topN = 50) =>
    defaultClient.get(`${BASE}/screener?period=${period}&topN=${topN}`).then(r => r.data),

  // Get stored analysis for a symbol (all periods)
  getResult: (symbol) =>
    defaultClient.get(`${BASE}/result/${symbol.toUpperCase()}`).then(r => r.data),

  // Run (or refresh) analysis — uses long timeout (up to 10 min for new symbols)
  analyse: (symbol, lookbackDays = 756, includeAiCommentary = true) =>
    analyseClient.post(`${BASE}/analyse`, { symbol, lookbackDays, includeAiCommentary }).then(r => r.data),

  // OpenAI key status
  getKeyStatus: () => defaultClient.get(`${BASE}/openai/key-status`).then(r => r.data),

  // Latest close price from stock_history DB (no external API, no CORS issues)
  getLatestPrice: (symbol) =>
    defaultClient.get(`${BASE}/latest-price/${symbol}`).then(r => r.data),
}
