import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

// small helper
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
const fmt = (n) => new Intl.NumberFormat().format(n);

export default function Dashboard({ role = "user" }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load ALL leads the current RLS lets this user see
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select("id,status,created_at,next_action_date");
      if (!ignore) {
        if (error) console.error("Dashboard load error:", error);
        setLeads(data || []);
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // ----- Calculations --------------------------------------------------------
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const monthAccepted = useMemo(() => {
    return leads.filter((l) => {
      const created = l?.created_at ? new Date(l.created_at) : null;
      return (
        l?.status?.toLowerCase() === "accepted" &&
        created &&
        created >= monthStart &&
        created <= monthEnd
      );
    }).length;
  }, [leads]);

  const overdue = useMemo(() => {
    return leads.filter((l) => {
      if (!l?.next_action_date) return false;
      const next = new Date(l.next_action_date);
      const isAccepted = (l?.status || "").toLowerCase() === "accepted";
      return !isAccepted && next < today;
    }).length;
  }, [leads]);

  const open = useMemo(() => {
    const s = (x) => (x || "").toLowerCase();
    return leads.filter((l) => !["accepted", "closed", "rejected"].includes(s(l?.status))).length;
  }, [leads]);

  const followup = useMemo(() => {
    const s = (x) => (x || "").toLowerCase();
    return leads.filter((l) => s(l?.status) === "follow up" || s(l?.status) === "follow-up")
      .length;
  }, [leads]);

  // 6-month tiny trend (accepted per month, including current)
  const last6 = useMemo(() => {
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const from = startOfMonth(d);
      const to = endOfMonth(d);
      const count = leads.filter((l) => {
        const created = l?.created_at ? new Date(l.created_at) : null;
        return (
          created &&
          created >= from &&
          created <= to &&
          (l?.status || "").toLowerCase() === "accepted"
        );
      }).length;
      buckets.push({
        label: d.toLocaleString(undefined, { month: "short" }),
        count,
      });
    }
    return buckets;
  }, [leads]);

  // Target logic (same rules we discussed)
  // user: 3 per user
  // team_leader: 5 per user (we only know this viewer’s perspective -> display 5 × you)
  // admin: 7 per user (display 7 × you)
  const perUserTarget = role === "admin" ? 7 : role === "team_leader" ? 5 : 3;
  const target = perUserTarget * 1; // this viewer; team totals are shown on team views
  const progress = target > 0 ? Math.min(100, Math.round((monthAccepted / target) * 100)) : 0;

  // ----- UI ------------------------------------------------------------------
  return (
    <div className="p-6 md:p-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard title="Accepted Leads This Month" value={fmt(monthAccepted)} />
        <KpiCard title="Overdue Cases" value="—" hint={fmt(overdue)} />
        <KpiCard title="Open Cases" value="—" hint={fmt(open)} />
        <KpiCard title="Follow-Up Cases" value="—" hint={fmt(followup)} />
      </div>

      {/* Monthly Target block */}
      <div className="mt-8 rounded-2xl border bg-white p-6">
        <div className="text-sm text-gray-500 mb-1">Your monthly target</div>
        <div className="flex items-end justify-between mb-2">
          <h3 className="text-2xl font-semibold text-teal-900">
            {role === "admin"
              ? "Admin target"
              : role === "team_leader"
              ? "Team leader target"
              : "Your target"}{" "}
            <span className="text-base font-normal text-gray-500">
              ({perUserTarget} × you)
            </span>
          </h3>
          <div className="text-3xl font-semibold text-teal-900">
            {fmt(monthAccepted)} <span className="text-gray-500 text-base">/ {fmt(target)}</span>
          </div>
        </div>

        <Progress value={progress} />

        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>0</span>
          <span>{progress}%</span>
          <span>{fmt(target)}</span>
        </div>

        <div className="text-sm text-gray-600 mt-3">
          {monthAccepted >= target ? (
            <>Nice! You’ve hit this month’s goal.</>
          ) : (
            <>
              Only <b>{fmt(target - monthAccepted)}</b> more to hit this month’s goal.
            </>
          )}
        </div>
      </div>

      {/* Simple last-6-months mini trend (no external charts) */}
      <div className="mt-8 rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-teal-900">Accepted – last 6 months</h3>
        </div>
        <MiniBars data={last6} />
      </div>

      {loading && (
        <div className="mt-6 text-sm text-gray-500">Loading dashboard data…</div>
      )}
    </div>
  );
}

function KpiCard({ title, value, hint }) {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="text-gray-600">{title}</div>
      <div className="text-4xl font-semibold text-teal-900 mt-3">{value}</div>
      {typeof hint !== "undefined" && (
        <div className="mt-1 text-sm text-gray-500">{hint}</div>
      )}
    </div>
  );
}

function Progress({ value = 0 }) {
  return (
    <div className="w-full h-4 rounded-full bg-teal-50 overflow-hidden">
      <div
        className="h-4 rounded-full"
        style={{
          width: `${value}%`,
          background:
            "linear-gradient(90deg, rgba(2,60,63,1) 0%, rgba(2,110,114,1) 100%)",
        }}
      />
    </div>
  );
}

// tiny bar chart with pure CSS
function MiniBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="grid grid-cols-6 gap-3 items-end h-36">
      {data.map((d, idx) => (
        <div key={idx} className="flex flex-col items-center">
          <div
            className="w-7 rounded-md"
            style={{
              height: `${(d.count / max) * 100 || 0}%`,
              background:
                "linear-gradient(180deg, rgba(2,110,114,1) 0%, rgba(2,60,63,1) 100%)",
              boxShadow: "0 2px 8px rgba(2,60,63,0.2)",
            }}
            title={`${d.label}: ${d.count}`}
          />
          <div className="text-xs text-gray-500 mt-2">{d.label}</div>
          <div className="text-xs text-gray-700">{d.count}</div>
        </div>
      ))}
    </div>
  );
}
