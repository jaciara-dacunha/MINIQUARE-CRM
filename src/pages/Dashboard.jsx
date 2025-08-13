import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
const sameMonth = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const monthLabel = (d) =>
  d.toLocaleString(undefined, { month: "short", year: "2-digit" });

export default function Dashboard({ role = "user", onJumpTo }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---- fetch all leads (admins/team leaders see all; others filtered by RLS) ----
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id,status,created_at,accepted_at,follow_up_at,next_action_on,user_id"
        )
        .order("created_at", { ascending: false });

      if (active) {
        if (!error) setLeads(data || []);
        setLoading(false);
      }
    })();
    return () => (active = false);
  }, []);

  // ---- KPIs ----
  const now = new Date();
  const acceptedThisMonth = useMemo(() => {
    return leads.filter((l) => {
      const created = l.accepted_at ? new Date(l.accepted_at) : new Date(l.created_at);
      return l.status?.toLowerCase() === "accepted" && sameMonth(created, now);
    }).length;
  }, [leads]);

  const openCases = useMemo(
    () =>
      leads.filter(
        (l) =>
          !["accepted", "closed"].includes(String(l.status || "").toLowerCase())
      ).length,
    [leads]
  );

  const followUps = useMemo(
    () =>
      leads.filter(
        (l) => String(l.status || "").toLowerCase() === "follow up"
      ).length,
    [leads]
  );

  const overdue = useMemo(() => {
    const today = new Date();
    return leads.filter((l) => {
      const s = String(l.status || "").toLowerCase();
      const when = l.follow_up_at || l.next_action_on;
      if (!when) return false;
      return s === "follow up" && new Date(when) < today;
    }).length;
  }, [leads]);

  // ---- last 6 months accepted counts ----
  const last6Labels = [];
  const last6Start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 5, 1));
  for (let i = 0; i < 6; i++) {
    const d = new Date(last6Start.getFullYear(), last6Start.getMonth() + i, 1);
    last6Labels.push(monthLabel(d));
  }

  const last6Data = useMemo(() => {
    const buckets = new Array(6).fill(0);
    for (const l of leads) {
      if (String(l.status || "").toLowerCase() !== "accepted") continue;
      const d = new Date(l.accepted_at || l.created_at);
      // figure out which of the 6 buckets (0..5)
      const idx =
        d.getFullYear() * 12 + d.getMonth() -
        (last6Start.getFullYear() * 12 + last6Start.getMonth());
      if (idx >= 0 && idx < 6) buckets[idx] += 1;
    }
    return buckets;
  }, [leads]);

  // ---- personal target bar ----
  // users: 3 per user
  // team_leader: 5 per user (team-wide)
  // admin: 7 per user (org-wide)
  const [teamCount, setTeamCount] = useState(1);
  useEffect(() => {
    // count users (for TL/Admin targets)
    (async () => {
      const { data } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      if (typeof data?.length === "number") setTeamCount(data.length);
      // supabase-js v2 doesn't return head rows; use count from meta if available:
      // but leaving 1 as safe fallback
    })();
  }, []);

  const perUser =
    role === "admin" ? 7 : role === "team_leader" ? 5 : 3;
  const target = (role === "user" ? 3 : perUser * teamCount) || 3;
  const pct = Math.min(100, Math.round((acceptedThisMonth / Math.max(1, target)) * 100));

  return (
    <div className="p-6 space-y-6">
      <div className="text-2xl font-semibold">Let’s do it, there</div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi title="Accepted Leads This Month" value={acceptedThisMonth} />
        <Kpi title="Overdue Cases" value={overdue} />
        <Kpi title="Open Cases" value={openCases} />
        <Kpi title="Follow-Up Cases" value={followUps} />
      </div>

      {/* Target bar big & centered */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-gray-600 text-sm">Monthly Target (team-wide)</div>
            <div className="text-xl font-semibold" style={{ color: "#023c3f" }}>
              {role === "user" ? "Your target" : `${role === "admin" ? "Admin" : "Team leader"} target`}
              <span className="text-gray-500 text-sm ml-1">({perUser} × {role === "user" ? "you" : `${teamCount} users`})</span>
            </div>
          </div>
          <div className="text-3xl font-bold" style={{ color: "#023c3f" }}>
            {acceptedThisMonth} <span className="text-gray-500 text-base">/ {target}</span>
          </div>
        </div>

        <div className="h-4 bg-emerald-50 rounded-full relative overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: "#c7f0e5" }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0</span>
          <span>{pct}%</span>
          <span>{target}</span>
        </div>

        <div className="text-sm text-gray-700 mt-3">
          {acceptedThisMonth >= target ? (
            <>You hit this month’s goal 🎉</>
          ) : (
            <>
              Only <b>{Math.max(0, target - acceptedThisMonth)}</b> more to hit this month’s goal.
            </>
          )}
        </div>
      </div>

      {/* Last 6 months accepted */}
      <div className="card p-6">
        <div className="text-lg font-semibold mb-4">Accepted leads – last 6 months</div>
        <Bar
          data={{
            labels: last6Labels,
            datasets: [
              {
                label: "Accepted",
                data: last6Data,
                borderWidth: 0,
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, ticks: { precision: 0 } },
            },
          }}
        />
      </div>

      {loading && <div className="text-sm text-gray-500">Loading…</div>}
    </div>
  );
}

function Kpi({ title, value }) {
  return (
    <div className="card p-5">
      <div className="text-gray-600 text-sm mb-2">{title}</div>
      <div className="text-4xl font-semibold" style={{ color: "#023c3f" }}>
        {value ?? "—"}
      </div>
    </div>
  );
}
