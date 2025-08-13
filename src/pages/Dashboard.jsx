import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import TargetBar from "../components/TargetBar";

export default function Dashboard({ role, profile, onJumpTo }) {
  const [acceptedThisMonth, setAcceptedThisMonth] = useState(0);
  const [usersCount, setUsersCount] = useState(1); // default for safety

  // Load accepted count for this user (and all users if team_leader/admin)
  useEffect(() => {
    const load = async () => {
      const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
      const end = new Date();   end.setMonth(end.getMonth()+1, 0); end.setHours(23,59,59,999);

      if (["admin","team_leader"].includes(role)) {
        // Count accepted across all users
        const { data, error } = await supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("status", "Accepted")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());
        if (!error) setAcceptedThisMonth(data?.length ?? 0);
      } else {
        // Count accepted for current user only
        const { data, error } = await supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("status", "Accepted")
          .eq("owner_id", profile.id)
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());
        if (!error) setAcceptedThisMonth(data?.length ?? 0);
      }
    };
    load();
  }, [role, profile?.id]);

  // Load users count (for team targets)
  useEffect(() => {
    const loadUsers = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (!error) setUsersCount(data?.length ?? 1);
    };
    if (["admin","team_leader"].includes(role)) loadUsers();
  }, [role]);

  // Targets
  const personalTarget = 3; // per user
  const teamLeaderPerUser = 5; // leader target per user
  const adminPerUser = 7;      // admin target per user

  const personalTargetTotal = personalTarget;                // for a single user
  const leaderTargetTotal = usersCount * teamLeaderPerUser;  // for team leader
  const adminTargetTotal  = usersCount * adminPerUser;       // for admin

  return (
    <div className="p-6 space-y-6">
      {/* Top heading with tick and the “Let’s do it” message */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Let’s do it, <span style={{ color: "#023c3f" }}>{profile?.name || "there"}</span>
        </h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-teal-900 text-white flex items-center justify-center font-semibold">
              {String(profile?.name || "U").slice(0,1).toUpperCase()}
            </div>
            {/* green tick */}
            <span className="absolute -right-1 -bottom-1 bg-white rounded-full">
              <svg width="18" height="18" viewBox="0 0 24 24" className="text-green-600">
                <circle cx="12" cy="12" r="10" fill="currentColor" opacity=".15"/>
                <path d="M7 12.5l3 3 7-7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
              </svg>
            </span>
          </div>
          <div className="text-sm">
            <div className="font-medium">{profile?.name}</div>
            <div className="text-gray-500">{role}</div>
          </div>
        </div>
      </div>

      {/* Cards row (clickable counters to jump to Leads) */}
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: "Accepted Leads This Month", key: "Accepted" },
          { label: "Overdue Cases",              key: "Overdue"  },
          { label: "Open Cases",                 key: "Open"     },
          { label: "Follow-Up Cases",            key: "Follow Up"}
        ].map(card => (
          <button
            key={card.key}
            onClick={()=>onJumpTo?.({status:card.key})}
            className="card p-4 text-left hover:shadow-md transition"
          >
            <div className="text-gray-600">{card.label}</div>
            <div className="text-3xl font-semibold mt-1" style={{color:"#023c3f"}}>
              {/* We only show the accepted figure here for demo; real counts would mirror earlier logic */}
              {card.key === "Accepted" ? acceptedThisMonth : "—"}
            </div>
          </button>
        ))}
      </div>

      {/* Big motivation target bar – personal or team-wide depending on role */}
      {role === "user" && (
        <TargetBar
          title="Your monthly target"
          subtitle={`(${personalTarget} × you)`}
          acceptedCount={acceptedThisMonth}
          targetCount={personalTargetTotal}
        />
      )}

      {role === "team_leader" && (
        <TargetBar
          title="Team Leader target (team-wide)"
          subtitle={`(${teamLeaderPerUser} × ${usersCount} users)`}
          acceptedCount={acceptedThisMonth}
          targetCount={leaderTargetTotal}
        />
      )}

      {role === "admin" && (
        <TargetBar
          title="Admin target (team-wide)"
          subtitle={`(${adminPerUser} × ${usersCount} users)`}
          acceptedCount={acceptedThisMonth}
          targetCount={adminTargetTotal}
        />
      )}
    </div>
  );
}
