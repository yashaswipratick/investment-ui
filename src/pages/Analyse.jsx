import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, CheckCircle, XCircle, Clock, RefreshCw, Download } from 'lucide-react'
import { api } from '../api/stockApi'

const PRESET_STOCKS = ['INFY','TCS','RELIANCE','HDFCBANK','ICICIBANK','BHARTIARTL','WIPRO',
  'SUNPHARMA','KOTAKBANK','SBIN','AXISBANK','HINDUNILVR','NESTLEIND','TITAN','BAJFINANCE']

const PERIODS = [
  { label: '3 Years (All periods)',  value: 756, desc: 'Generates 3Y + 2Y + 1Y + 6M — recommended' },
  { label: '2 Years',                value: 504, desc: 'Generates 2Y + 1Y + 6M' },
  { label: '1 Year',                 value: 252, desc: 'Generates 1Y + 6M' },
  { label: '6 Months',              value: 180, desc: 'Generates 6M only' },
]

export default function Analyse() {
  const [symbol, setSymbol]               = useState('')
  const [lookback, setLookback]           = useState(756)
  const [includeAi, setIncludeAi]         = useState(true)
  const [queue, setQueue]                 = useState([])
  const [running, setRunning]             = useState(false)
  const [symbols, setSymbols]             = useState([])
  const [selectedRefetch, setSelectedRefetch] = useState(new Set())
  const [downloadingCsv, setDownloadingCsv] = useState(false)
  const [bulkCsvStocks, setBulkCsvStocks] = useState('')
  const [downloadingBulkCsv, setDownloadingBulkCsv] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.getSymbols().then(setSymbols).catch(() => {})
  }, [])

  const addToQueue = (input) => {
    // Support comma-separated symbols: "INFY, TCS, RELIANCE" → adds all three
    const symbols = input
      .split(',')
      .map(s => s.toUpperCase().trim())
      .filter(s => s.length > 0)

    const newItems = symbols
      .filter(s => !queue.find(q => q.symbol === s))
      .map(s => ({ symbol: s, status: 'pending' }))

    if (newItems.length > 0) {
      setQueue(prev => [...prev, ...newItems])
    }
    setSymbol('')
  }

  const runQueue = async () => {
    if (running) return
    setRunning(true)
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status === 'done' || queue[i].status === 'error') continue
      setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'running' } : q))
      try {
        await api.analyse(queue[i].symbol, lookback, includeAi)
        setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'done' } : q))
      } catch (err) {
        setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'error', error: err?.message } : q))
      }
    }
    setRunning(false)
  }

  const removeFromQueue = (sym) => setQueue(prev => prev.filter(q => q.symbol !== sym))

  const downloadCsv = async () => {
    const stockName = symbol.trim().toUpperCase()
    if (!stockName || downloadingCsv) return

    setDownloadingCsv(true)
    try {
      await api.downloadStockHistoryCsv(stockName)
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) {
        alert(`No stock history found for ${stockName}`)
      } else {
        alert(`Unable to download stock history for ${stockName}`)
      }
    } finally {
      setDownloadingCsv(false)
    }
  }

  const downloadBulkCsv = async () => {
    const requested = bulkCsvStocks
      .split(',')
      .map(stock => stock.trim())
      .filter(Boolean)
    if (requested.length === 0 || downloadingBulkCsv) return
    setDownloadingBulkCsv(true)
    try {
      await api.downloadStockHistoryCsvBulk(requested.join(','))
    } catch (err) {
      alert(err?.response?.status === 404
        ? 'No stock history found for the selected stocks'
        : 'Unable to download the selected stock histories')
    } finally {
      setDownloadingBulkCsv(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Analyse Stocks</h1>
        <p className="text-gray-400 text-sm mt-0.5">Add symbols to queue and run analysis in batch</p>
      </div>

      {/* Re-fetch existing stocks */}
      {symbols.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <RefreshCw size={14} className="text-indigo-400"/>
                Re-fetch Already Analysed Stocks
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Select stocks to re-run their analysis with fresh data
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedRefetch(
                  selectedRefetch.size === symbols.length
                    ? new Set()
                    : new Set(symbols)
                )}
                className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-2.5 py-1 rounded-lg transition-colors"
              >
                {selectedRefetch.size === symbols.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedRefetch.size > 0 && (
                <button
                  onClick={() => {
                    selectedRefetch.forEach(s => addToQueue(s))
                    setSelectedRefetch(new Set())
                  }}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  <RefreshCw size={12}/>
                  Re-fetch {selectedRefetch.size} stock{selectedRefetch.size !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {symbols.map(s => {
              const selected = selectedRefetch.has(s)
              return (
                <button
                  key={s}
                  onClick={() => {
                    setSelectedRefetch(prev => {
                      const next = new Set(prev)
                      selected ? next.delete(s) : next.add(s)
                      return next
                    })
                  }}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all font-medium ${
                    selected
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-indigo-600 hover:text-white'
                  }`}
                >
                  {selected && <span className="mr-1">✓</span>}
                  {s}
                </button>
              )
            })}
          </div>

          <div className="border-t border-gray-800 pt-3 space-y-2">
            <div>
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <Download size={14} className="text-emerald-400"/>
                Download Stock History CSVs
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Enter stock names comma-separated. Example: APOLLO, INFY, TCS
              </p>
            </div>
            <div className="flex gap-2">
              <input
                value={bulkCsvStocks}
                onChange={e => setBulkCsvStocks(e.target.value)}
                placeholder="APOLLO, INFY, TCS"
                className="flex-1 min-w-0 bg-gray-900 border border-gray-700 focus:border-emerald-600 outline-none text-white px-3 py-2 rounded-lg text-sm"
              />
              <button
                onClick={downloadBulkCsv}
                disabled={!bulkCsvStocks.trim() || downloadingBulkCsv}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
              >
                <Download size={14}/>
                {downloadingBulkCsv ? 'Downloading…' : 'Download CSVs'}
              </button>
            </div>
          </div>

          {selectedRefetch.size === 0 && (
            <p className="text-xs text-gray-600 italic">
              Click a stock to select it for re-fetching, or use "Select All"
            </p>
          )}
          {selectedRefetch.size > 0 && (
            <p className="text-xs text-indigo-400">
              {selectedRefetch.size} stock{selectedRefetch.size !== 1 ? 's' : ''} selected — click "Re-fetch" to add to the queue below
            </p>
          )}

          <div className="border-t border-gray-800 pt-2">
            <p className="text-xs text-gray-500">View only (no re-fetch):</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {symbols.map(s => (
                <button key={s} onClick={() => navigate(`/stock/${s}`)}
                  className="text-xs text-gray-500 hover:text-indigo-400 transition-colors">
                  {s} →
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Config */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-white text-sm">Analysis Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Lookback Period</label>
            <div className="space-y-1.5">
              {PERIODS.map(p => (
                <label key={p.value} className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-colors
                  ${lookback === p.value ? 'bg-indigo-900/30 border-indigo-700' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}`}>
                  <input type="radio" name="lookback" value={p.value} checked={lookback === p.value}
                    onChange={() => setLookback(p.value)} className="mt-0.5 accent-indigo-500"/>
                  <div>
                    <p className="text-sm text-white">{p.label}</p>
                    <p className="text-xs text-gray-500">{p.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Options</label>
            <label className={`flex items-center gap-2.5 p-3 rounded-lg cursor-pointer border transition-colors
              ${includeAi ? 'bg-indigo-900/30 border-indigo-700' : 'bg-gray-800 border-gray-700'}`}>
              <input type="checkbox" checked={includeAi} onChange={e => setIncludeAi(e.target.checked)} className="accent-indigo-500"/>
              <div>
                <p className="text-sm text-white">Include AI Commentary</p>
                <p className="text-xs text-gray-500">GPT web search + analysis (adds ~15-30s per stock)</p>
              </div>
            </label>
            <div className="mt-3 p-3 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-400">Preset symbols:</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {PRESET_STOCKS.filter(s => !queue.find(q => q.symbol === s)).map(s => (
                  <button key={s} onClick={() => addToQueue(s)}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-0.5 rounded transition-colors">
                    +{s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add symbol input — supports comma-separated symbols */}
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <input
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && addToQueue(symbol)}
            placeholder="Enter symbol(s) — e.g. INFY, TCS, RELIANCE"
            className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <button onClick={() => addToQueue(symbol)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap">
            Add
          </button>
          <button
            onClick={downloadCsv}
            disabled={!symbol.trim() || downloadingCsv}
            title="Download persisted stock history as CSV"
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
          >
            <Download size={14}/>
            {downloadingCsv ? 'Downloading…' : 'CSV'}
          </button>
          {queue.length > 0 && (
            <button onClick={runQueue} disabled={running}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap">
              <Zap size={14}/>
              {running ? 'Running…' : `Run ${queue.length} stock${queue.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Tip: paste multiple symbols separated by commas — e.g. <span className="text-gray-400">INFY, TCS, RELIANCE, HDFCBANK</span>
        </p>
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="card space-y-2">
          <p className="text-sm font-semibold text-white mb-3">Queue ({queue.length})</p>
          {queue.map(q => (
            <div key={q.symbol} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2.5">
                {q.status === 'done'    && <CheckCircle size={15} className="text-green-400"/>}
                {q.status === 'error'   && <XCircle size={15} className="text-red-400"/>}
                {q.status === 'running' && <Clock size={15} className="text-indigo-400 animate-pulse"/>}
                {q.status === 'pending' && <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-600"/>}
                <span className="font-medium text-white text-sm">{q.symbol}</span>
                {q.status === 'error' && <span className="text-xs text-red-400">{q.error}</span>}
              </div>
              <div className="flex items-center gap-2">
                {q.status === 'done' && (
                  <button onClick={() => navigate(`/stock/${q.symbol}`)}
                    className="text-xs text-indigo-400 hover:text-indigo-300">View →</button>
                )}
                {q.status !== 'running' && (
                  <button onClick={() => removeFromQueue(q.symbol)}
                    className="text-xs text-gray-500 hover:text-red-400">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
