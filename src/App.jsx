import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, Search, TrendingUp, Zap } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Screener  from './pages/Screener'
import StockDetail from './pages/StockDetail'
import Analyse from './pages/Analyse'

const nav = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/screener',  icon: Search,          label: 'Screener'  },
  { to: '/analyse',   icon: Zap,             label: 'Analyse'   },
]

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-indigo-400" size={22} />
            <span className="font-bold text-white text-sm">Investment AI</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">NSE Stock Analyser</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                 ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-800 text-xs text-gray-600">
          Backend: localhost:8080
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/screener"   element={<Screener />} />
          <Route path="/analyse"    element={<Analyse />} />
          <Route path="/stock/:symbol" element={<StockDetail />} />
        </Routes>
      </main>
    </div>
  )
}
