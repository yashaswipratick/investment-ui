import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Target, Shield, Brain } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, ErrorBar } from 'recharts'
import { api } from '../api/stockApi'
import ActionBadge from '../components/ActionBadge'
import AiCommentary from '../components/AiCommentary'
import LoadingSpinner from '../components/LoadingSpinner'

const PERIODS = ['6M', '1Y', '2Y', '3Y']

export default function StockDetail() {
  const { symbol } = useParams()
  const navigate   = useNavigate()
  const [data, setData]           = useState(null)
  const [period, setPeriod]       = useState('1Y')
  const [loading, setLoading]     = useState(true)
  const [analysing, setAnalysing] = useState(false)
  const [livePrice, setLivePrice] = useState(null)
  const [livePriceLoading, setLivePriceLoading] = useState(false)

  // Fetch latest close price from stock_history Cassandra table via backend
  const fetchLivePrice = () => {
    setLivePriceLoading(true)
    api.getLatestPrice(symbol)
      .then(d => {
        if (d?.closePrice) {
          setLivePrice({
            price:  d.closePrice?.toFixed(2),
            prev:   d.prevClose?.toFixed(2),
            change: d.changePercent?.toFixed(2),
            date:   d.latestDate,
          })
        }
      })
      .catch(() => setLivePrice(null))
      .finally(() => setLivePriceLoading(false))
  }

  const load = () => {
    setLoading(true)
    fetchLivePrice()
    api.getResult(symbol).then(d => {
      setData(d)
      // Default to best available period
      const available = Object.keys(d)
      if (available.includes('1Y')) setPeriod('1Y')
      else if (available.length > 0) setPeriod(available[0])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [symbol])

  const runAnalysis = () => {
    setAnalysing(true)
    api.analyse(symbol).then(() => load()).catch(console.error).finally(() => setAnalysing(false))
  }

  if (loading) return <LoadingSpinner />

  const pData  = data?.[period]
  const rec    = pData?.recommendation || {}
  const tech   = pData?.technical || {}
  const projs  = pData?.projections || []
  const entry  = pData?.entryTiming || {}
  const slStrat= pData?.stopLossStrategy || {}
  const cs     = tech?.candlestickSignals || {}
  const bt     = tech?.backtestResult || null

  const projChartData = projs.map(p => ({
    name:  p.horizon,
    value: p.expectedReturnPct || 0,
    bull:  p.bullCasePct,
    bear:  p.bearCasePct,
    targetPrice:    p.targetPrice,
    bullCasePrice:  p.bullCasePrice,
    bearCasePrice:  p.bearCasePrice,
    vol:   p.annualizedVolatilityPct,
    conf:  p.confidence,
  }))

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400">
            <ArrowLeft size={16}/>
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{symbol}</h1>
              {/* Live current price */}
              {livePriceLoading ? (
                <span className="text-gray-500 text-sm animate-pulse">Loading price…</span>
              ) : livePrice ? (
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-white">₹{livePrice.price}</span>
                  <span className={`text-sm font-semibold px-2 py-0.5 rounded ${
                    parseFloat(livePrice.change) >= 0
                      ? 'text-green-400 bg-green-900/30'
                      : 'text-red-400 bg-red-900/30'
                  }`}>
                    {parseFloat(livePrice.change) >= 0 ? '+' : ''}{livePrice.change}% today
                  </span>
                  <span className="text-xs text-gray-500">Close {livePrice.date}</span>
                </div>
              ) : null}
            </div>
            <p className="text-gray-400 text-sm mt-0.5">
              Analysis: {pData?.dataFrom} → {pData?.dataTo} · {pData?.totalDataPoints || 0} candles
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Period tabs */}
          <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                disabled={!data?.[p]}
                className={`px-3 py-1 text-sm rounded-md transition-colors
                  ${period === p ? 'tab-active' : data?.[p] ? 'tab-inactive' : 'opacity-30 cursor-not-allowed bg-gray-800 text-gray-600'}`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={runAnalysis}
            disabled={analysing}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw size={14} className={analysing ? 'animate-spin' : ''}/>
            {analysing ? 'Analysing…' : 'Re-analyse'}
          </button>
        </div>
      </div>

      {!pData ? (
        <div className="card text-center py-12">
          <p className="text-gray-400">No analysis for {period} period. Click Re-analyse to run it.</p>
        </div>
      ) : (<>
        {/* Stale data banner — shown when new features are missing from old analysis */}
        {pData && !tech?.candlestickSignals && (
          <div className="flex items-center gap-3 bg-amber-900/30 border border-amber-700 rounded-xl px-4 py-3 text-sm">
            <span className="text-amber-400 text-lg">⚠️</span>
            <div>
              <p className="text-amber-300 font-semibold">Analysis needs refresh</p>
              <p className="text-amber-500 text-xs mt-0.5">
                Breakout analysis, chart patterns, candlestick signals and backtest results are missing from this older analysis.
                Click <strong>Re-analyse</strong> to regenerate with all new features.
              </p>
            </div>
            <button
              onClick={runAnalysis}
              disabled={analysing}
              className="ml-auto flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors"
            >
              <RefreshCw size={12} className={analysing ? 'animate-spin' : ''}/>
              {analysing ? 'Running…' : 'Re-analyse now'}
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column — main analysis */}
          <div className="lg:col-span-2 space-y-5">

            {/* Action summary */}
            <div className="card">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <ActionBadge action={rec.action} large/>
                    <span className="text-gray-300 text-sm">{rec.timeframe?.replace('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed max-w-xl">
                    {rec.rationale?.split(' | ').slice(0,3).join(' · ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">
                    {rec.confidenceScore}<span className="text-lg text-gray-400">%</span>
                  </p>
                  <p className="text-xs text-gray-500">confidence</p>
                </div>
              </div>

              {/* Entry / Target / SL row */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                {/* Entry Zone — show as pending if waiting for trigger */}
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  {entry?.signal === 'WAIT_FOR_TRIGGER' || entry?.signal === 'AVOID' ? (
                    <>
                      <p className="font-bold text-amber-400 text-sm">
                        {rec.entryPriceLow && rec.entryPriceHigh ? `₹${rec.entryPriceLow.toFixed(0)}–${rec.entryPriceHigh.toFixed(0)}` : '—'}
                      </p>
                      <p className="text-xs text-amber-500/70 mt-0.5">⏳ Pending trigger</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-blue-400">
                        {rec.entryPriceLow && rec.entryPriceHigh ? `₹${rec.entryPriceLow.toFixed(0)}–${rec.entryPriceHigh.toFixed(0)}` : '—'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Entry Zone</p>
                    </>
                  )}
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <p className="font-bold text-green-400">{rec.targetPrice ? `₹${rec.targetPrice.toLocaleString('en-IN')}` : '—'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Target Price</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <p className="font-bold text-red-400">{rec.stopLossPrice ? `₹${rec.stopLossPrice.toLocaleString('en-IN')}` : '—'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Stop Loss (exit immediately if breached)</p>
                </div>
              </div>

              {/* Upside / Downside / R:R — with tooltips */}
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="bg-gray-800 rounded-lg p-3 text-center group relative cursor-help">
                  <p className="font-bold text-green-400">
                    {rec.potentialUpsidePct != null ? `+${rec.potentialUpsidePct?.toFixed(1)}%` : '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Upside ↑</p>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-700 text-white text-xs rounded px-2 py-1 w-48 text-center z-10">
                    % profit from entry top (₹{rec.entryPriceHigh?.toFixed(0)}) to target (₹{rec.targetPrice?.toFixed(0)})
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center group relative cursor-help">
                  <p className="font-bold text-red-400">
                    {rec.potentialDownsidePct != null ? `-${Math.abs(rec.potentialDownsidePct)?.toFixed(1)}%` : '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Downside ↓</p>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-700 text-white text-xs rounded px-2 py-1 w-48 text-center z-10">
                    % loss from entry bottom (₹{rec.entryPriceLow?.toFixed(0)}) to stop loss (₹{rec.stopLossPrice?.toFixed(0)})
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-center group relative cursor-help">
                  <p className="font-bold text-indigo-400">
                    {rec.riskRewardRatio != null ? `${rec.riskRewardRatio?.toFixed(2)}` : '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">R/R Ratio</p>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-700 text-white text-xs rounded px-2 py-1 w-52 text-center z-10">
                    Risk/Reward: for every ₹1 you risk (stop loss), you could gain ₹{rec.riskRewardRatio?.toFixed(1)}. Above 2 is good.
                  </div>
                </div>
              </div>
            </div>

            {/* Projections chart */}
            {projChartData.length > 0 && (
              <div className="card">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <TrendingUp size={16} className="text-indigo-400"/>
                      Projected Returns by Time Horizon
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      How much % profit is possible if you hold for 3 months, 6 months, 1 year etc.
                      Based on trend + historical volatility. Not guaranteed — these are probability estimates.
                    </p>
                  </div>
                  {projChartData[0]?.vol && (
                    <div className="text-xs text-gray-400 bg-gray-800 px-2.5 py-1 rounded-lg">
                      Historical volatility: <span className="text-amber-400 font-semibold">{projChartData[0].vol?.toFixed(1)}%/yr</span>
                      <span className="text-gray-600 ml-1">(±1σ band shown)</span>
                    </div>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={projChartData} margin={{ top: 15, right: 5, bottom: 5, left: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`}/>
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                      formatter={(value, name, props) => {
                        const p = props.payload
                        if (name === 'value') return [
                          <div key="v" className="text-xs space-y-0.5">
                            <div>Base: <b>{value?.toFixed(1)}%</b> → ₹{p.targetPrice?.toFixed(0)}</div>
                            {p.bull != null && <div className="text-green-400">Bull (+1σ): {p.bull?.toFixed(1)}% → ₹{p.bullCasePrice?.toFixed(0)}</div>}
                            {p.bear != null && <div className="text-red-400">Bear (-1σ): {p.bear?.toFixed(1)}% → ₹{p.bearCasePrice?.toFixed(0)}</div>}
                          </div>,
                          p.conf
                        ]
                        return null
                      }}
                    />
                    <ReferenceLine y={0} stroke="#374151"/>
                    {/* Base case bars */}
                    <Bar dataKey="value" radius={[4,4,0,0]} maxBarSize={40}>
                      {projChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.value >= 0 ? '#16a34a' : '#dc2626'} fillOpacity={0.85}/>
                      ))}
                    </Bar>
                    {/* Bull case dots */}
                    <Bar dataKey="bull" fill="#4ade80" fillOpacity={0.25} radius={[2,2,0,0]} maxBarSize={40}/>
                    {/* Bear case dots */}
                    <Bar dataKey="bear" fill="#f87171" fillOpacity={0.25} radius={[2,2,0,0]} maxBarSize={40}/>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2 text-xs text-gray-500 justify-center">
                  <span><span className="text-green-500">■</span> Base case</span>
                  <span><span className="text-green-300 opacity-60">■</span> Bull (+1σ)</span>
                  <span><span className="text-red-300 opacity-60">■</span> Bear (-1σ)</span>
                </div>

                {/* Backtest stats */}
                {bt && bt.occurrences > 0 && (
                  <div className={`mt-4 rounded-xl border p-3 ${bt.statistically_significant ? 'bg-indigo-900/20 border-indigo-800' : 'bg-gray-800/50 border-gray-700'}`}>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        🔬 Backtest Results
                        <span className={`text-xs px-2 py-0.5 rounded-full ${bt.statistically_significant ? 'bg-green-900/40 text-green-400 border border-green-700' : 'bg-amber-900/40 text-amber-400 border border-amber-700'}`}>
                          {bt.occurrences} historical matches {bt.statistically_significant ? '✓ Significant' : '(low sample)'}
                        </span>
                      </h4>
                      <span className="text-xs text-gray-500">Signal: <code className="text-gray-400">{bt.signalFingerprint}</code></span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-700">
                            {['Period','Avg Return','Median','Win Rate','Best','Worst','Max Drawdown','Expected Value'].map(h => (
                              <th key={h} className="text-right first:text-left pb-1.5 pr-3 font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bt.horizonStats?.map(hs => (
                            <tr key={hs.horizon} className="border-b border-gray-800/50">
                              <td className="py-1.5 pr-3 font-bold text-white">{hs.horizon}</td>
                              <td className={`text-right pr-3 py-1.5 ${hs.avgReturnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {hs.avgReturnPct >= 0 ? '+' : ''}{hs.avgReturnPct?.toFixed(1)}%
                              </td>
                              <td className={`text-right pr-3 py-1.5 ${hs.medianReturnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {hs.medianReturnPct >= 0 ? '+' : ''}{hs.medianReturnPct?.toFixed(1)}%
                              </td>
                              <td className={`text-right pr-3 py-1.5 font-semibold ${hs.winRatePct >= 65 ? 'text-green-400' : hs.winRatePct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                {hs.winRatePct?.toFixed(0)}%
                              </td>
                              <td className="text-right pr-3 py-1.5 text-green-400">+{hs.bestReturnPct?.toFixed(1)}%</td>
                              <td className="text-right pr-3 py-1.5 text-red-400">{hs.worstReturnPct?.toFixed(1)}%</td>
                              <td className="text-right pr-3 py-1.5 text-orange-400">-{hs.maxDrawdownPct?.toFixed(1)}%</td>
                              <td className={`text-right py-1.5 font-semibold ${hs.expectedValuePct >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>
                                {hs.expectedValuePct >= 0 ? '+' : ''}{hs.expectedValuePct?.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!bt.statistically_significant && (
                      <p className="text-xs text-amber-400/70 mt-2">
                        ⚠️ Only {bt.occurrences} historical occurrences found — more data needed for reliable statistics (minimum 5).
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Technical indicators grid */}
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Technical Indicators</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {[
                  { label: 'RSI-14',     value: tech.rsi14?.toFixed(1),    signal: tech.rsiSignal     },
                  { label: 'MACD',       value: tech.macdLine?.toFixed(2), signal: tech.macdSignalType },
                  { label: 'Trend',      value: tech.trendDirection,       signal: tech.maSignal       },
                  { label: 'ADX-14',     value: tech.adx14?.toFixed(1),    signal: tech.adx14 > 25 ? 'STRONG' : 'WEAK' },
                  { label: 'BB Signal',  value: tech.bbSignal?.replace('_',' '), signal: null },
                  { label: 'Vol Trend',  value: tech.volumeTrend,          signal: null },
                  { label: 'SMA 50',     value: tech.sma50 ? `₹${tech.sma50.toFixed(0)}` : '—', signal: null },
                  { label: 'SMA 200',    value: tech.sma200 ? `₹${tech.sma200.toFixed(0)}` : 'N/A', signal: null },
                  { label: `${tech.priceChangePeriodLabel || '1Y'} Change`, value: tech.priceChangePct != null ? `${tech.priceChangePct?.toFixed(1)}%` : '—', signal: null },
                ].map(({ label, value, signal }) => (
                  <div key={label} className="bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-1">{label}</p>
                    <p className="font-semibold text-white">{value || '—'}</p>
                    {signal && <p className="text-xs text-gray-500 mt-0.5">{signal}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Breakout Analysis */}
            {tech?.breakoutAnalysis && (
              <div className={`card border ${
                tech.breakoutAnalysis.signal === 'BULLISH_BREAKOUT_CONFIRMED' ? 'border-green-800 bg-green-900/10' :
                tech.breakoutAnalysis.signal === 'FRESH_BREAKOUT' ? 'border-blue-800 bg-blue-900/10' :
                tech.breakoutAnalysis.signal === 'BREAKOUT_RETEST_IN_PROGRESS' ? 'border-amber-800 bg-amber-900/10' :
                'border-gray-800'
              }`}>
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  🚀 Breakout Analysis
                </h3>
                {tech.breakoutAnalysis.breakoutFound ? (
                  <div className="space-y-3">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
                      tech.breakoutAnalysis.signal === 'BULLISH_BREAKOUT_CONFIRMED' ? 'bg-green-900/40 text-green-400 border border-green-700' :
                      tech.breakoutAnalysis.signal === 'FRESH_BREAKOUT' ? 'bg-blue-900/40 text-blue-400 border border-blue-700' :
                      'bg-amber-900/40 text-amber-400 border border-amber-700'
                    }`}>
                      {tech.breakoutAnalysis.signal?.replace(/_/g,' ')}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="bg-gray-800 rounded p-2">
                        <p className="text-gray-500">Breakout Level</p>
                        <p className="text-white font-bold">₹{tech.breakoutAnalysis.breakoutLevel?.toFixed(0)}</p>
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        <p className="text-gray-500">Days Ago</p>
                        <p className="text-white font-bold">{tech.breakoutAnalysis.daysAgoBreakout} days</p>
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        <p className="text-gray-500">Retested?</p>
                        <p className={tech.breakoutAnalysis.retested ? 'text-green-400 font-bold' : 'text-gray-400'}>
                          {tech.breakoutAnalysis.retested ? (tech.breakoutAnalysis.retestConfirmed ? '✓ Confirmed' : '⚠️ In progress') : 'Not yet'}
                        </p>
                      </div>
                      <div className="bg-gray-800 rounded p-2">
                        <p className="text-gray-500">Date</p>
                        <p className="text-white">{tech.breakoutAnalysis.breakoutDate}</p>
                      </div>
                    </div>
                    <div className="bg-gray-800/60 rounded-lg p-3 text-sm text-gray-300 leading-relaxed">
                      {tech.breakoutAnalysis.explanation}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">{tech.breakoutAnalysis.explanation}</p>
                )}
              </div>
            )}

            {/* Chart Patterns */}
            {tech?.chartPatterns?.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  📊 6-Month Chart Patterns
                  <span className="text-xs text-gray-500 font-normal">What the chart shape is telling us</span>
                </h3>
                <div className="space-y-3">
                  {tech.chartPatterns.map((p, i) => (
                    <div key={i} className={`rounded-xl border p-4 ${
                      p.signal === 'BULLISH' ? 'bg-green-900/15 border-green-800' :
                      p.signal === 'BEARISH' ? 'bg-red-900/15 border-red-800' :
                      'bg-gray-800/50 border-gray-700'
                    }`}>
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{p.patternName}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            p.signal === 'BULLISH' ? 'bg-green-900/50 text-green-400 border border-green-700' :
                            p.signal === 'BEARISH' ? 'bg-red-900/50 text-red-400 border border-red-700' :
                            'bg-gray-700 text-gray-400 border border-gray-600'
                          }`}>{p.signal}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          p.confidence === 'HIGH' ? 'text-green-400 bg-green-900/30' :
                          p.confidence === 'MEDIUM' ? 'text-amber-400 bg-amber-900/30' :
                          'text-gray-400 bg-gray-800'
                        }`}>Confidence: {p.confidence}</span>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{p.description}</p>
                      <div className="bg-black/20 rounded p-2.5 mb-2">
                        <p className="text-xs text-gray-500 mb-1">💡 What this means (in plain English)</p>
                        <p className="text-gray-300 text-xs leading-relaxed">{p.whatItMeans}</p>
                      </div>
                      <div className={`rounded p-2.5 ${p.signal === 'BULLISH' ? 'bg-green-900/20' : p.signal === 'BEARISH' ? 'bg-red-900/20' : 'bg-gray-800/50'}`}>
                        <p className="text-xs text-gray-500 mb-1">📌 Trading Signal</p>
                        <p className="text-gray-200 text-xs leading-relaxed">{p.tradingSignal}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Candlestick patterns */}
            {(cs.candlestickPatterns?.length > 0 || cs.gapSignals?.length > 0) && (
              <div className="card">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                  🕯️ Price Action Signals
                  <span className="text-xs text-gray-500 font-normal">What today's candle shape is saying</span>
                </h3>
                <div className="space-y-3">
                  {cs.candlestickPatterns?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Candlestick Patterns Detected</p>
                      <div className="flex flex-wrap gap-2">
                        {cs.candlestickPatterns.map(p => (
                          <span key={p} className={`text-xs px-2 py-1 rounded-md font-medium border
                            ${p.startsWith('BULLISH') || p.includes('HAMMER') || p.includes('MORNING') || p.includes('WHITE') || p.includes('PIERCING') || p.includes('KICKER') && !p.includes('BEARISH')
                              ? 'bg-green-900/30 text-green-400 border-green-800'
                              : p.startsWith('BEARISH') || p.includes('SHOOTING') || p.includes('HANGING') || p.includes('EVENING') || p.includes('CROW') || p.includes('DARK')
                              ? 'bg-red-900/30 text-red-400 border-red-800'
                              : 'bg-amber-900/30 text-amber-400 border-amber-800'}`}>
                            {p.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {cs.gapSignals?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Opening Gap — What happened at market open</p>
                      {cs.gapSignals.map(g => (
                        <div key={g}>
                          <span className={`text-xs px-2 py-1 rounded-md ${g.includes('UP') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{g}</span>
                          <p className="text-xs text-gray-500 mt-1">
                            {g.includes('UP')
                              ? 'The stock opened HIGHER than yesterday — buyers were excited overnight. Positive early signal.'
                              : 'The stock opened LOWER than yesterday — sellers were active overnight. Bearish early signal.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-800 rounded p-2">
                      <p className="text-gray-500 mb-0.5">5-Day Price Change</p>
                      <span className={`font-semibold ${cs.momentum5dPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {cs.momentum5dPct >= 0 ? '+' : ''}{cs.momentum5dPct?.toFixed(2)}%
                      </span>
                      <p className="text-gray-600 mt-0.5">
                        {cs.momentum5dPct >= 2 ? 'Strong short-term rise' : cs.momentum5dPct >= 0 ? 'Slight rise' : cs.momentum5dPct > -2 ? 'Slight fall' : 'Sharp recent fall'}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded p-2">
                      <p className="text-gray-500 mb-0.5">10-Day Price Change</p>
                      <span className={`font-semibold ${cs.momentum10dPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {cs.momentum10dPct >= 0 ? '+' : ''}{cs.momentum10dPct?.toFixed(2)}%
                      </span>
                      <p className="text-gray-600 mt-0.5">
                        {cs.momentum10dPct >= 3 ? 'Strong 2-week momentum' : cs.momentum10dPct >= 0 ? 'Stable' : cs.momentum10dPct > -3 ? 'Weak 2-week trend' : 'Strong selling pressure'}
                      </p>
                    </div>
                    <div className="bg-gray-800 rounded p-2 col-span-2">
                      <p className="text-gray-500 mb-0.5">Today's Trading Volume vs Normal</p>
                      <span className="text-gray-300 font-medium">{cs.volumeConfirmation?.split(' — ')[0] || '—'}</span>
                      {cs.volumeConfirmation?.includes(' — ') && (
                        <p className="text-gray-500 mt-0.5">{cs.volumeConfirmation.split(' — ')[1]}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Entry timing — with explicit price instructions */}
            <div className="card">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Target size={15} className="text-blue-400"/>
                When to Invest
              </h3>

              {/* Signal badge */}
              <div className={`text-center py-2 rounded-lg mb-3 text-sm font-bold
                ${entry.goodTimeToInvest ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-amber-900/30 text-amber-400 border border-amber-800'}`}>
                {entry.signal?.replace(/_/g, ' ') || '—'}
              </div>

              {/* ── Explicit price action table ──────────────────────── */}
              <div className="space-y-2 mb-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-green-900/20 border border-green-900 rounded-lg p-2.5">
                    <p className="text-green-500 font-semibold mb-0.5">📥 BUY / Enter at</p>
                    <p className="text-white font-bold text-sm">
                      ₹{rec.entryPriceLow?.toFixed(0)} – ₹{rec.entryPriceHigh?.toFixed(0)}
                    </p>
                    <p className="text-green-600 mt-0.5">Ideal entry zone</p>
                  </div>
                  <div className="bg-blue-900/20 border border-blue-900 rounded-lg p-2.5">
                    <p className="text-blue-400 font-semibold mb-0.5">🎯 SELL / Exit at</p>
                    <p className="text-white font-bold text-sm">₹{rec.targetPrice?.toFixed(0)}</p>
                    <p className="text-blue-600 mt-0.5">Target price (+{rec.potentialUpsidePct?.toFixed(1)}%)</p>
                  </div>
                  <div className="bg-red-900/20 border border-red-900 rounded-lg p-2.5 col-span-2">
                    <p className="text-red-400 font-semibold mb-0.5">🛑 STOP LOSS — Exit immediately if below</p>
                    <p className="text-white font-bold text-sm">₹{rec.stopLossPrice?.toFixed(0)}</p>
                    <p className="text-red-600 mt-0.5">
                      {rec.potentialDownsidePct != null ? `Risk: ${Math.abs(rec.potentialDownsidePct).toFixed(1)}% from entry` : ''}
                      {livePrice && rec.stopLossPrice
                        ? ` · Currently ${parseFloat(livePrice.price) > rec.stopLossPrice ? '✓ Above SL' : '⚠️ Below SL!'}`
                        : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current situation & trigger */}
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Current Situation</p>
                  <p className="text-gray-300 text-xs mt-1 leading-relaxed">{entry.currentSituation || '—'}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2.5">
                  <p className="text-gray-500 text-xs mb-1">What to watch for before buying</p>
                  <p className="text-gray-200 text-xs leading-relaxed">{entry.entryTrigger || '—'}</p>
                </div>
                <div className="bg-indigo-900/20 border border-indigo-800 rounded-lg p-2.5">
                  <p className="text-indigo-400 text-xs mb-0.5">Key Level to Watch</p>
                  <p className="text-gray-200 text-xs">{entry.keyLevelToWatch || '—'}</p>
                </div>
              </div>
            </div>

            {/* Stop loss strategy */}
            <div className="card">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Shield size={15} className="text-red-400"/>
                Stop Loss Strategy
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Stop Loss Price</span>
                  <span className="text-red-400 font-bold">₹{slStrat.stopLossPrice?.toFixed(0) || '—'}</span>
                </div>
                {/* Show loss from entry price (not current price) to avoid confusion */}
                {slStrat.stopLossPct != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Loss if stopped (from entry low ₹{rec.entryPriceLow?.toFixed(0)})</span>
                    <span className="text-red-400">-{Math.abs(slStrat.stopLossPct)?.toFixed(1)}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="text-gray-300">{slStrat.stopLossType?.replace(/_/g,' ') || '—'}</span>
                </div>
                <div className="bg-red-900/20 border border-red-900 rounded p-2 mt-1">
                  <p className="text-red-400 text-xs font-medium mb-0.5">If Stop Hit</p>
                  <p className="text-gray-300 text-xs leading-relaxed">{slStrat.actionOnStopHit || '—'}</p>
                </div>
                <div className="bg-gray-800 rounded p-2">
                  <p className="text-gray-500 mb-0.5">Recovery Plan</p>
                  <p className="text-gray-300 leading-relaxed">{slStrat.recoveryPlan || '—'}</p>
                </div>
                <div className="bg-blue-900/20 border border-blue-900 rounded p-2">
                  <p className="text-blue-400 mb-0.5">Re-entry Condition</p>
                  <p className="text-gray-300 leading-relaxed">{slStrat.reEntryCondition || '—'}</p>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-gray-500">Max Allocation</span>
                  <span className="text-amber-400 font-medium">{slStrat.maxAllocationAdvice || '—'}</span>
                </div>
              </div>
            </div>

            {/* Window status */}
            <div className={`card border ${pData.windowStatus === 'FULL' ? 'border-green-800' : pData.windowStatus === 'PARTIAL' ? 'border-amber-800' : 'border-red-800'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                  ${pData.windowStatus === 'FULL' ? 'bg-green-900/40 text-green-400' :
                    pData.windowStatus === 'PARTIAL' ? 'bg-amber-900/40 text-amber-400' : 'bg-red-900/40 text-red-400'}`}>
                  {pData.windowStatus}
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{pData.windowMessage}</p>
              {pData.dataNote && (
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{pData.dataNote}</p>
              )}
            </div>
          </div>

          {/* AI Commentary — full width */}
          {rec.aiCommentary && (
            <div className="lg:col-span-3">
              <AiCommentary commentary={rec.aiCommentary} symbol={symbol} period={period}/>
            </div>
          )}
        </div>
      </>)}
    </div>
  )
}
