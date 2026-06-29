import React from 'react'
import { Brain } from 'lucide-react'

const SECTION_EMOJIS = ['📊', '🎯', '⚠️', '💡']

const sectionConfig = {
  '📊': { bg: 'bg-blue-900/20 border-blue-800',   hdr: 'text-blue-300'  },
  '🎯': { bg: 'bg-green-900/20 border-green-800',  hdr: 'text-green-300' },
  '⚠️': { bg: 'bg-red-900/20 border-red-800',     hdr: 'text-red-300'   },
  '💡': { bg: 'bg-amber-900/20 border-amber-800',  hdr: 'text-amber-300' },
}

/** Strip markdown citation links — keep the visible text, drop the URL */
function stripCitations(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [text](url) → text
    .replace(/\(https?:\/\/[^\s)]+\)/g, '')    // bare (url) → nothing
    .trim()
}

/** Split raw commentary into {emoji, header, body[]} sections */
function parseSections(commentary) {
  const sections = []
  let current = null

  for (const rawLine of commentary.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    // Detect a section header: starts with one of the known emojis
    const emoji = SECTION_EMOJIS.find(e => line.startsWith(e))
    if (emoji) {
      if (current) sections.push(current)
      current = { emoji, header: line, body: [] }
    } else if (current) {
      const clean = stripCitations(line)
      if (clean) current.body.push(clean)
    }
  }
  if (current) sections.push(current)
  return sections
}

export default function AiCommentary({ commentary, symbol, period }) {
  if (!commentary ||
      commentary === 'AI commentary unavailable.' ||
      commentary === 'No commentary available.') return null

  const sections = parseSections(commentary)

  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2 flex-wrap">
        <Brain size={15} className="text-purple-400"/>
        AI Commentary
        <span className="text-gray-400 font-normal">— {symbol} ({period})</span>
        <span className="text-xs text-gray-600 font-normal">powered by GPT + web search</span>
      </h3>

      {sections.length === 0 ? (
        /* Fallback: no recognisable sections — render as plain text */
        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
          {stripCitations(commentary)}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sections.map((sec, i) => {
            const cfg = sectionConfig[sec.emoji] || { bg: 'bg-gray-800 border-gray-700', hdr: 'text-white' }
            return (
              <div key={i} className={`rounded-xl border p-4 ${cfg.bg}`}>
                <h4 className={`font-semibold mb-2.5 text-sm ${cfg.hdr}`}>
                  {stripCitations(sec.header)}
                </h4>
                <div className="space-y-1.5">
                  {sec.body.map((line, j) => (
                    <p key={j} className="text-gray-300 text-sm leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
