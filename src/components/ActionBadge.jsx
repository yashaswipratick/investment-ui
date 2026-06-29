import React from 'react'

const config = {
  BUY:     { cls: 'badge-buy',   label: '✓ BUY'    },
  HOLD:    { cls: 'badge-hold',  label: '⟳ HOLD'   },
  SELL:    { cls: 'badge-sell',  label: '↓ SELL'   },
  AVOID:   { cls: 'badge-avoid', label: '✕ AVOID'  },
  NO_DATA: { cls: 'badge-avoid', label: '— N/A'    },
}

export default function ActionBadge({ action, large }) {
  const { cls, label } = config[action] || config.NO_DATA
  return (
    <span className={`${cls} ${large ? 'text-sm px-3 py-1' : ''}`}>
      {label}
    </span>
  )
}
