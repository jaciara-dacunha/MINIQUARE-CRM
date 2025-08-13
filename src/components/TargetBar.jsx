import React from "react";

export default function TargetBar({
  title,               // e.g. "Your monthly target" / "Team Leader target" / "Admin target"
  subtitle,            // e.g. "(3 × you)" or "(5 × 7 users)"
  acceptedCount,       // number accepted this month
  targetCount          // target total for the month
}) {
  const pct = targetCount > 0 ? Math.min(100, Math.round((acceptedCount / targetCount) * 100)) : 0;
  const remaining = Math.max(0, targetCount - acceptedCount);

  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-lg font-semibold" style={{color:"#023c3f"}}>{title}</div>
          {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
        </div>
        <div className="text-3xl font-semibold" style={{color:"#023c3f"}}>
          {acceptedCount} <span className="text-gray-500 text-base">/ {targetCount}</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="w-full h-5 rounded-full bg-teal-50 relative overflow-hidden">
          <div
            className="h-5 rounded-full transition-all"
            style={{ width: `${pct}%`, background: "#023c3f" }}
            aria-label={`${pct}%`}
          />
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-700">
            {pct}%
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0</span>
          <span>{targetCount}</span>
        </div>

        <div className="text-sm mt-2">
          {remaining > 0
            ? <>Only <strong>{remaining}</strong> more to hit this month’s goal.</>
            : <>Goal achieved—great job!</>}
        </div>
      </div>
    </div>
  );
}
