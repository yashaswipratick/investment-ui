import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, Bot } from 'lucide-react'
import { api } from '../api/stockApi'
import ActionBadge from '../components/ActionBadge'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Dashboard() {
  const [screener, setScreener] = useState([])
  const [keyStatus, setKeyStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.getScreener('1Y', 20),
      api.getKeyStatus(),
    ]).then(([s, k]) => {
      setScreener(s)
      setKeyStatus(k)
    }).finally(() => setLoading(false))
  }, [])

  const counts = screener.reduce((acc, s) => {
    acc[s.action] = (acc[s.action] || 0) + 1
    return acc
  }, {})

  const statCards = [
    { label: 'Stocks Analysed', value: screener.length, icon: TrendingUp, color: 'text-indigo-400' },
    { label: 'BUY signals',  value: counts.BUY  || 0, icon: TrendingUp,  color: 'text-green-400'  },
    { label: 'HOLD signals', value: counts.HOLD || 0, icon: Minus,       color: 'text-amber-400'  },
    { label: 'SELL / AVOID', value: (counts.SELL || 0) + (counts.AVOID || 0), icon: TrendingDown, color: 'text-red-400' },
  ]

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Investment analysis overview — 1Y period</p>
        </div>
        {keyStatus && (
          <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border
            ${keyStatus.keyValid
              ? 'bg-green-900/30 border-green-700 text-green-400'
              : 'bg-red-900/30 border-red-700 text-red-400'}`}>
            {keyStatus.keyValid ? <CheckCircle size={14}/> : <AlertCircle size={14}/>}
            <Bot size={14}/>
            AI {keyStatus.keyValid ? 'Active' : 'Inactive'}
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-3">
            <div className={`${color} bg-gray-800 p-2 rounded-lg`}>
              <Icon size={20}/>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top BUY opportunities */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-green-400"/>
          Top Investment Opportunities
        </h2>
        {screener.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No analysed stocks yet. Go to Analyse to run analysis.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2 pr-4">Symbol</th>
                  <th className="text-left py-2 pr-4">Action</th>
                  <th className="text-right py-2 pr-4">Price</th>
                  <th className="text-right py-2 pr-4">Confidence</th>
                  <th className="text-right py-2 pr-4">Upside</th>
                  <th className="text-right py-2 pr-4">Entry Zone</th>
                  <th className="text-right py-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                {screener.map((s) => (
                  <tr
                    key={s.symbol}
                    onClick={() => navigate(`/stock/${s.symbol}`)}
                    className="border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 pr-4 font-bold text-white">{s.symbol}</td>
                    <td className="py-2.5 pr-4"><ActionBadge action={s.action}/></td>
                    <td className="py-2.5 pr-4 text-right text-gray-200">
                      {s.currentPrice ? `₹${s.currentPrice.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${s.confidenceScore >= 65 ? 'bg-green-500' : s.confidenceScore >= 45 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${s.confidenceScore}%` }}
                          />
                        </div>
                        <span className="text-gray-300 text-xs">{s.confidenceScore}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      {s.upsidePct != null ? (
                        <span className={s.upsidePct >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {s.upsidePct >= 0 ? '+' : ''}{s.upsidePct?.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-gray-400 text-xs">
                      {s.entryPriceLow && s.entryPriceHigh
                        ? `₹${s.entryPriceLow.toFixed(0)}–₹${s.entryPriceHigh.toFixed(0)}`
                        : '—'}
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={`text-xs ${
                        s.trendDirection === 'UPTREND' ? 'text-green-400' :
                        s.trendDirection === 'DOWNTREND' ? 'text-red-400' : 'text-amber-400'}`}>
                        {s.trendDirection === 'UPTREND' ? '↑' : s.trendDirection === 'DOWNTREND' ? '↓' : '→'} {s.trendDirection}
                      </span>
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
