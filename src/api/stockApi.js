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

  // Download all persisted stock history rows as CSV
  downloadStockHistoryCsv: (stockName) =>
    defaultClient.post('/stock/investment/v1.0/stockHistoryCSV', { stockName }, {
      responseType: 'blob',
    }).then(response => {
      const contentDisposition = response.headers['content-disposition'] || ''
      const match = contentDisposition.match(/filename="?([^";]+)"?/i)
      const filename = match?.[1] || `${stockName.toUpperCase()}_stock_history.csv`

      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    }),

  // Download multiple persisted stock histories as one ZIP
  downloadStockHistoryCsvBulk: (stockNames) =>
    defaultClient.post('/stock/investment/v1.0/stockHistoryCSV/bulk', { stockNames }, {
      responseType: 'blob',
    }).then(response => {
      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = 'stock_history_csv.zip'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    }),
}
