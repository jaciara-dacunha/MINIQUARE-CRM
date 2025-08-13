import React from 'react'
const map = {
  "New": { bg:"#e6f0ff", text:"#1d4ed8", ring:"#bfdbfe" },
  "In Review": { bg:"#ede9fe", text:"#6d28d9", ring:"#ddd6fe" },
  "Accepted": { bg:"#ecfdf5", text:"#047857", ring:"#a7f3d0" },
  "Follow Up": { bg:"#fffbeb", text:"#92400e", ring:"#fde68a" },
  "Overdue": { bg:"#fef2f2", text:"#b91c1c", ring:"#fecaca" },
  "Hotkey request": { bg:"#eef2ff", text:"#3730a3", ring:"#c7d2fe" },
  "Hotkeyed": { bg:"#f0fdf4", text:"#166534", ring:"#bbf7d0" },
  "CFA sent": { bg:"#f5f3ff", text:"#6b21a8", ring:"#ddd6fe" },
  "CFA received": { bg:"#eff6ff", text:"#075985", ring:"#bfdbfe" },
  "Reject": { bg:"#fff1f2", text:"#be123c", ring:"#fecdd3" },
  "More Information required": { bg:"#fefce8", text:"#854d0e", ring:"#fde68a" },
}
export default function StatusBadge({ value }) {
  const s = map[value] || { bg:"#f5f5f5", text:"#374151", ring:"#e5e7eb" }
  return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" style={{background:s.bg,color:s.text, boxShadow:`0 0 0 1px ${s.ring} inset`}}>{value}</span>
}
