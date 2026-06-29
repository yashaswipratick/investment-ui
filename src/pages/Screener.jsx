import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowUpDown } from 'lucide-react'
import { api } from '../api/stockApi'
import ActionBadge from '../components/ActionBadge'
import LoadingSpinner from '../components/LoadingSpinner'

const PERIODS = ['6M', '1Y', '2Y', '3Y']

export default function Screener() {
  const [period, setPeriod]   = useState('1Y')
  const [stocks, setStocks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [sortKey, setSortKey] = useState('confidenceScore')
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    api.getScreener(period, 100).then(setStocks).finally(() => setLoading(false))
  }, [period])

  const filtered = stocks
    .filter(s => s.symbol?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortKey === 'confidenceScore') return (b.confidenceScore || 0) - (a.confidenceScore || 0)
      if (sortKey === 'upsidePct') return (b.upsidePct || 0) - (a.upsidePct || 0)
      if (sortKey === 'riskReward') return (b.riskReward || 0) - (a.riskReward || 0)
      return 0
    })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Stock Screener</h1>
          <p className="text-gray-400 text-sm">Ranked by conviction — click a row for full analysis</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Period tabs */}
          <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${period === p ? 'tab-active' : 'tab-inactive'}`}
              >
                {p}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 text-gray-400" size={14}/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search symbol…"
              className="bg-gray-800 border border-gray-700 text-sm text-white rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-indigo-500 w-36"
            />
          </div>
          {/* Sort */}
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-sm text-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500"
          >
            <option value="confidenceScore">Sort: Confidence</option>
            <option value="upsidePct">Sort: Upside %</option>
            <option value="riskReward">Sort: R/R Ratio</option>
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <LoadingSpinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/80">
                <tr className="text-gray-400">
                  {['#','Symbol','Action','Price',`${period} Chg`,'Confidence','Upside (to Target)','R/R Ratio','Entry Zone','Stop Loss','Trend','Good Time?'].map(h => (
                    <th key={h} className="text-left px-3 py-3 font-medium whitespace-nowrap" title={
                      h === 'Upside (to Target)' ? '% gain from entry to target price' :
                      h === 'R/R Ratio' ? 'Risk/Reward: how much you can gain per ₹1 risked. Higher = better.' :
                      h === 'Stop Loss' ? 'Exit immediately if price closes below this level' :
                      h.endsWith('Chg') ? `Price change over the last ${period}` : ''
                    }>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-12 text-gray-500">No data — run /analyse first</td></tr>
                ) : filtered.map((s, i) => (
                  <tr
                    key={s.symbol}
                    onClick={() => navigate(`/stock/${s.symbol}`)}
                    className="border-t border-gray-800/60 hover:bg-gray-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{i + 1}</td>
                    <td className="px-3 py-2.5 font-bold text-white">{s.symbol}</td>
                    <td className="px-3 py-2.5"><ActionBadge action={s.action}/></td>
                    <td className="px-3 py-2.5 text-gray-200">
                      {s.currentPrice ? `₹${s.currentPrice.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {s.priceChangePct != null ? (
                        <span className={s.priceChangePct >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {s.priceChangePct >= 0 ? '+' : ''}{s.priceChangePct?.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-14 h-1.5 bg-gray-700 rounded-full">
                          <div className={`h-full rounded-full ${s.confidenceScore >= 65 ? 'bg-green-500' : s.confidenceScore >= 45 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${s.confidenceScore}%` }}/>
                        </div>
                        <span className="text-xs text-gray-300">{s.confidenceScore}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {s.upsidePct != null ? (
                        <span className={s.upsidePct >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {s.upsidePct >= 0 ? '+' : ''}{s.upsidePct?.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-300">{s.riskReward?.toFixed(2) || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                      {s.entryPriceLow ? `₹${s.entryPriceLow.toFixed(0)}–${s.entryPriceHigh?.toFixed(0)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-red-400">
                      {s.stopLossPrice ? `₹${s.stopLossPrice.toFixed(0)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs ${s.trendDirection === 'UPTREND' ? 'text-green-400' : s.trendDirection === 'DOWNTREND' ? 'text-red-400' : 'text-amber-400'}`}>
                        {s.trendDirection === 'UPTREND' ? '↑' : s.trendDirection === 'DOWNTREND' ? '↓' : '→'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {s.goodTimeToInvest
                        ? <span className="text-green-400 text-xs">✓ Yes</span>
                        : <span className="text-gray-500 text-xs">Wait</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
