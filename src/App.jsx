import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import Dashboard from "./pages/Dashboard.jsx";
import LeadsPage from "./pages/Leads.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import "./index.css";

/* -------------------------- Motivation helpers -------------------------- */
const QUOTES = [
  "Small steps daily beat big intentions.",
  "Discipline is choosing what you want most over what you want now.",
  "Momentum starts with one action. Take it.",
  "Consistency compounds. Keep going.",
  "Focus on the next right thing.",
  "Win the morning, win the day.",
  "Greatness is a habit, not an event.",
  "You don’t need perfect — just progress.",
  "Targets don’t move; you do.",
  "Work hard in silence; let results speak.",
  "Energy follows focus.",
  "Make your future self proud.",
  "A little more today than yesterday.",
  "No zero days.",
  "Show up. Ship. Improve.",
  "Action cures anxiety.",
  "Earn your wins.",
  "You’re closer than you think.",
  "Be so good they can’t ignore you.",
  "Quality comes from quantity of attempts.",
  "Finish strong.",
  "Make it count.",
  "Don’t wait for motivation — create it.",
  "You only fail if you quit.",
  "Be the thermostat, not the thermometer."
];

// choose a quote that doesn’t repeat within the same ISO week
function isoWeekNumber(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}
function weeklyQuote() {
  const week = isoWeekNumber();
  const dow = new Date().getDay(); // 0..6
  const idx = (week * 7 + dow) % QUOTES.length;
  return QUOTES[idx];
}
// simple changing background (Unsplash) – daily seed
function dailyImageUrl() {
  const seed = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  // light abstract / office artwork
  return `https://source.unsplash.com/featured/800x800/?abstract,gradient,office&sig=${seed}`;
}

/* ------------------------------- UI pieces ------------------------------ */
function Sidebar({ active, setActive, onLogout, role }) {
  const items = useMemo(() => {
    const base = [
      { key: "dashboard", label: "Dashboard" },
      { key: "leads", label: "Leads" },
    ];
    if (role === "admin") base.push({ key: "users", label: "Users" });
    return base;
  }, [role]);

  return (
    <aside className="w-64 border-r h-screen p-4 bg-white flex flex-col">
      <div className="text-lg font-bold mb-4" style={{ color: "#023c3f" }}>
        MINIQUARE CRM
      </div>
      <nav className="flex flex-col gap-1">
        {items.map((it) => (
          <button
            key={it.key}
            className={`text-left px-3 py-2 rounded ${
              active === it.key ? "text-white" : ""
            }`}
            style={active === it.key ? { background: "#023c3f" } : {}}
            onClick={() => setActive(it.key)}
          >
            {it.label}
          </button>
        ))}
      </nav>
      <div className="mt-auto">
        <button className="px-3 py-2 border rounded w-full" onClick={onLogout}>
          Log out
        </button>
      </div>
    </aside>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function signIn(e) {
    e.preventDefault();
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
  }

  const quote = weeklyQuote();
  const bg = dailyImageUrl();

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left image + quote */}
      <div
        className="hidden md:flex items-center justify-center p-8 bg-cover bg-center"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="backdrop-blur-sm bg-white/70 rounded-2xl p-6 max-w-sm">
          <div className="text-sm text-gray-500">Today’s nudge</div>
          <div className="mt-2 text-lg font-semibold" style={{ color: "#023c3f" }}>
            {quote}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6">
        <form onSubmit={signIn} className="w-full max-w-md bg-white border rounded-2xl p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white"
              style={{ background: "#023c3f" }}
            >
              M
            </div>
            <div>
              <div className="text-sm text-gray-500">MINIQUARE</div>
              <div className="text-xs text-gray-400 -mt-0.5">CRM</div>
            </div>
          </div>
          <h1 className="text-2xl font-semibold leading-tight">
            Welcome to <span style={{ color: "#023c3f" }}>MINIQUARE</span> CRM
          </h1>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input
              type="password"
              className="border rounded px-3 py-2 w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button
            className="w-full px-4 py-2 rounded text-white"
            style={{ background: "#023c3f" }}
          >
            Login
          </button>

          {/* Forgot password */}
          <div className="text-sm text-center">
            <a
              className="text-blue-700 hover:underline"
              href="/reset-password"
              onClick={(e) => {
                e.preventDefault();
                // You already wired the ResetPassword route/component earlier.
                // If you use hash or router, navigate accordingly; otherwise leave link.
                window.location.href = "/reset-password";
              }}
            >
              Forgot your password?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------- App root ------------------------------- */
export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s)
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadProfile() {
      setProfileError("");
      if (!session?.user) {
        setProfile(null);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,name,role")
        .eq("id", session.user.id)
        .single();
      if (error) {
        setProfileError(error.message);
        setProfile(null);
        return;
      }
      setProfile(data);
    }
    loadProfile();
  }, [session]);

  async function logout() {
    await supabase.auth.signOut();
  }

  if (!session) return <Login />;

  if (profileError) {
    return (
      <div className="p-8 space-y-2">
        <div className="text-lg font-semibold">Couldn’t load your profile</div>
        <div className="text-sm text-red-600">{profileError}</div>
        <div className="text-sm text-gray-600">
          Check that your <code>profiles</code> row exists and RLS allows select.
        </div>
      </div>
    );
  }

  if (!profile) return <div className="p-8">Loading profile…</div>;

  const canSeeAll = ["admin", "team_leader"].includes(profile.role);

  const main =
    tab === "dashboard" ? (
      <Dashboard
        role={profile.role}
        onJumpTo={({ status }) => {
          setTab("leads");
        }}
      />
    ) : tab === "leads" ? (
      <LeadsPage currentUser={session.user} canSeeAll={canSeeAll} />
    ) : tab === "users" ? (
      <AdminUsers />
    ) : null;

  return (
    <div className="h-screen w-screen flex">
      <Sidebar active={tab} setActive={setTab} onLogout={logout} role={profile.role} />

      <main className="flex-1 overflow-auto">
        {/* Top header: “Let’s do it, {name}” + green tick */}
        <div className="flex items-center justify-between border-b bg-white px-4 py-3">
          <div className="text-lg font-semibold" style={{ color: "#023c3f" }}>
            {profile?.name ? `Let's do it, ${profile.name}!` : "Let's do it!"}{" "}
            <span title="You’re signed in" className="ml-1 text-green-600">✔︎</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 capitalize">{profile.role}</div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white"
              style={{ background: "#023c3f" }}
              title={profile?.email}
            >
              {profile?.name ? profile.name[0]?.toUpperCase() : "U"}
            </div>
          </div>
        </div>

        {main}
      </main>
    </div>
  );
}
