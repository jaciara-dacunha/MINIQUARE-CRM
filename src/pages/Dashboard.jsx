import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

/* time helpers */
const startOfMonthISO = (d = new Date()) => {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
};
const todayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
const monthsBack = (n) => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - n);
  return d;
};

/** format like "Aug" */
const monthKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (d) =>
  d.toLocaleString(undefined, { month: "short" });

export default function Dashboard({
  role = "user",
  currentUser,
  onJumpTo,
}) {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState({
    acceptedThisMonth: 0,
    overdue: 0,
    open: 0,
    followUp: 0,
  });
  const [series, setSeries] = useState([]); // [{key,label,count}]
  const [usersCount, setUsersCount] = useState(1); // for team/admin target sizing

  const canSeeAll = useMemo(
    () => ["admin", "team_leader"].includes(role),
    [role]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);

      // Determine scope: if the user is admin or team leader, they can see all leads.
      // Otherwise, restrict to their own leads. If we don't have the user ID yet,
      // fall back to a sentinel value that won't match any real user. This allows
      // the queries to run and return zero counts until the user ID is available.
      const userId = currentUser?.id;
      const scope = canSeeAll ? {} : { user_id: userId ?? "__invalid__" };

      // Helper: always return a new query builder scoped to the appropriate user.
      const makeQuery = () =>
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .match(scope);

      const today = todayISO();

      // Accepted (all time)
      const { count: acceptedCount } = await makeQuery().eq(
        "status",
        "Accepted"
      );

      // Follow up
      const { count: followUpCount } = await makeQuery().eq(
        "status",
        "Follow Up"
      );

      // Overdue: not accepted, not follow up, next_action_at < today
      const { count: overdueCount } = await makeQuery()
        .lt("next_action_at", today)
        .neq("status", "Accepted")
        .neq("status", "Follow Up");

      // Open: not accepted, not follow up, and not overdue
      const { count: openCount } = await makeQuery()
        .neq("status", "Accepted")
        .neq("status", "Follow Up")
        .or(`next_action_at.is.null,next_action_at.gte.${today}`);

      // last 6 months accepted for bar chart
      const sixBack = monthsBack(5);
      const { data: acceptedRows } = await supabase
        .from("leads")
        .select("id, created_at")
        .match(scope)
        .eq("status", "Accepted")
        .gte("created_at", sixBack.toISOString());

      const buckets = new Map();
      for (let i = 5; i >= 0; i--) {
        const m = monthsBack(i);
        buckets.set(monthKey(m), {
          key: monthKey(m),
          label: monthLabel(m),
          count: 0,
        });
      }
      (acceptedRows || []).forEach((r) => {
        const d = new Date(r.created_at);
        const k = monthKey(d);
        if (buckets.has(k)) buckets.get(k).count += 1;
      });
      const chartSeries = Array.from(buckets.values());

      // count users (role=user) for team/admin target math
      let uCount = 1;
      const { count: profCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "user");
      if (profCount != null && profCount > 0) uCount = profCount;

      if (!alive) return;
      setCards({
        acceptedThisMonth: acceptedCount ?? 0,
        overdue: overdueCount ?? 0,
        open: openCount ?? 0,
        followUp: followUpCount ?? 0,
      });
      setSeries(chartSeries);
      setUsersCount(uCount);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [canSeeAll, currentUser?.id]);

  function goToLeadsQuickFilter(filter) {
    localStorage.setItem("leads.quickFilter", JSON.stringify(filter));
    onJumpTo?.({ status: filter?.status || null });
  }

  // ---- Target math per role ----
  const perUserTarget = 3;  // baseline user target
  const perUserIncentive = 5;
  const perUserBonus = 7;

  const target = role === "admin"
    ? usersCount * 7
    : role === "team_leader"
      ? usersCount * 5
      : 3;

  const acceptedSoFar = cards.acceptedThisMonth || 0;
  const progressPct = Math.min(100, Math.round((acceptedSoFar / Math.max(1, target)) * 100));

  const incentiveMark = role === "user" ? perUserIncentive : usersCount * perUserIncentive;
  const bonusMark     = role === "user" ? perUserBonus     : usersCount * perUserBonus;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-semibold">
        Let’s do it, <span className="text-emerald-900">{currentUser?.user_metadata?.name || "there"}</span>
        {role && <span className="ml-1 text-gray-500">({role})</span>}
      </h1>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Tile
          title="Accepted Leads"
          value={cards.acceptedThisMonth}
          loading={loading}
          bgColor="#047857"  // dark green
          onClick={() => goToLeadsQuickFilter({ type: "acceptedThisMonth", status: "Accepted", scope: canSeeAll ? "all" : "mine" })}
        />
        <Tile
          title="Overdue Cases"
          value={cards.overdue}
          loading={loading}
          bgColor="#DC2626"  // dark red
          onClick={() => goToLeadsQuickFilter({ type: "overdue", status: "Any", scope: canSeeAll ? "all" : "mine", extra: { overdue: true } })}
        />
        <Tile
          title="Open Cases"
          value={cards.open}
          loading={loading}
          bgColor="#2563EB"  // dark blue
          onClick={() => goToLeadsQuickFilter({ type: "open", status: "Any", scope: canSeeAll ? "all" : "mine", extra: { open: true } })}
        />
        <Tile
          title="Follow-Up Cases"
          value={cards.followUp}
          loading={loading}
          bgColor="#2F4F4F"  // Dark Slate
          onClick={() => goToLeadsQuickFilter({ type: "followup", status: "Follow Up", scope: canSeeAll ? "all" : "mine" })}
        />
      </div>

      {/* ---- Moved UP: Monthly target progress ---- */}
      <div className="rounded-2xl border p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">
              Monthly Target ({canSeeAll ? "team-wide" : "per-user"})
            </div>
            <div className="text-2xl font-semibold" style={{ color: "#023c3f" }}>
              {role === "admin" ? "Admin target" : role === "team_leader" ? "Team-leader target" : "Your monthly target"}{" "}
              <span className="text-gray-500 text-base ml-2">
                ({role === "user" ? `${perUserTarget} × you` : `${role === "admin" ? 7 : 5} × ${usersCount} users`})
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600">Accepted this month</div>
            <div className="text-3xl font-semibold" style={{ color: "#023c3f" }}>
              {acceptedSoFar} <span className="text-gray-400 text-lg">/ {target}</span>
            </div>
          </div>
        </div>

        {/* progress bar */}
        <div className="mt-4 relative">
          <div className="h-4 w-full bg-emerald-50 rounded-full" />
          <div
            className="h-4 bg-emerald-600 rounded-full -mt-4 transition-all"
            style={{ width: `${progressPct}%` }}
          />
          {/* markers */}
          <Marker label="Target" value={target} current={target} total={target} color="#065f46" />
          <Marker label="Incentive" value={incentiveMark} current={acceptedSoFar} total={target} color="#2563eb" />
          <Marker label="Bonus" value={bonusMark} current={acceptedSoFar} total={target} color="#7c3aed" />
          <div className="flex justify-between text-gray-500 text-sm mt-1">
            <span>0</span><span>{progressPct}%</span><span>{target}</span>
          </div>
        </div>

        <div className="mt-2 text-sm text-gray-700">
          {acceptedSoFar >= bonusMark
            ? "🎉 Bonus achieved!"
            : acceptedSoFar >= incentiveMark
              ? "✨ Incentive achieved—push for bonus!"
              : `Only ${Math.max(0, target - acceptedSoFar)} more to hit this month’s goal.`}
        </div>
      </div>

      {/* ---- Now BELOW: Last 6 months chart ---- */}
      <div className="rounded-2xl border p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Accepted – last 6 months</h2>
          {!loading && <div className="text-sm text-gray-500">Scoped: {canSeeAll ? "team-wide" : "you"}</div>}
        </div>
        <MiniBarChart data={series} height={160} />
      </div>
    </div>
  );
}

function Tile({ title, value, loading, onClick, bgColor }) {
  const isDark = bgColor && bgColor !== "white";
  const textStyle = { color: isDark ? "#FFFFFF" : "#023c3f" };

  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border p-4 hover:shadow-sm transition"
      style={{ backgroundColor: bgColor || "white" }}
    >
      <div style={textStyle} className="text-sm">{title}</div>
      <div style={textStyle} className="text-4xl font-semibold mt-3">
        {loading ? "_" : value}
      </div>
    </button>
  );
}

/* Simple SVG bar chart: no external deps */
function MiniBarChart({ data = [], height = 160 }) {
  const max = Math.max(1, ...data.map(d => d.count));
  const barW = 36, gap = 20;
  const w = data.length * barW + (data.length - 1) * gap;
  const h = height, padB = 26, padT = 10;

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} role="img" aria-label="Accepted leads by month">
        {data.map((d, i) => {
          const x = i * (barW + gap);
          const barH = ((h - padB - padT) * d.count) / max;
          const y = h - padB - barH;
          return (
            <g key={d.key} transform={`translate(${x},0)`}>
              <rect x={0} y={y} width={barW} height={barH} rx="8" fill="#065f46" opacity="0.9" />
              <text x={barW / 2} y={h - 8} textAnchor="middle" fontSize="12" fill="#64748b">
                {d.label}
              </text>
              <text x={barW / 2} y={y - 6} textAnchor="middle" fontSize="12" fill="#111827">
                {d.count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Marker({ label, value, total, color }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, total)) * 100));
  return (
    <div className="absolute -mt-5" style={{ left: `calc(${pct}% - 8px)` }}>
      <div className="h-5 w-0.5" style={{ background: color, opacity: 0.9 }} />
      <div className="text-xs" style={{ color }}>{label}</div>
    </div>
  );
}
