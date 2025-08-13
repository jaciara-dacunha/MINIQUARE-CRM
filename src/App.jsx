import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import Dashboard from "./pages/Dashboard.jsx";
import LeadsPage from "./pages/Leads.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import "./index.css";

function Sidebar({ active, setActive, onLogout, role, profile }) {
  const items = [
    { key: "dashboard", label: "Dashboard" },
    { key: "leads", label: "Leads" },
  ];
  if (role === "admin") items.push({ key: "users", label: "Users" });
  return (
    <aside className="w-64 border-r h-screen p-4 bg-white flex flex-col">
      <div className="text-lg font-bold mb-4" style={{ color: "#023c3f" }}>
        MINIQUARE CRM
      </div>
      {profile && (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm" style={{ background:"#023c3f" }}>
            {profile.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="font-medium">{profile.name || profile.email}</div>
          <span className="text-emerald-600 text-lg">✓</span>
        </div>
      )}
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

// ---- Daily rotating login background + quote ----
const MOTIVATION = [
  { q: "Work hard in silence; let results speak.", a: "— Unknown" },
  { q: "Little by little, a little becomes a lot.", a: "— Tanzanian Proverb" },
  { q: "Do the best you can until you know better.", a: "— Maya Angelou" },
  { q: "Success is the sum of small efforts, repeated daily.", a: "— R. Collier" },
  { q: "Discipline equals freedom.", a: "— Jocko Willink" },
  { q: "Action is the antidote to anxiety.", a: "— Unknown" },
  { q: "Dream big. Start small. Act now.", a: "— Robin Sharma" },
];
const BG = [
  // Unsplash images (royalty-free). Change if you prefer.
  "https://images.unsplash.com/photo-1529336953121-ad3a9d818eb4?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1475728017904-b712052c192a?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1520975954732-35dd22d9381e?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500534314210-7d3d58b9f2d8?q=80&w=1600&auto=format&fit=crop",
];

function dayIndex(len) {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const day = Math.floor(diff / 86400000); // day of year
  return day % len;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const qi = dayIndex(MOTIVATION.length);
  const bi = dayIndex(BG.length);

  async function signIn(e) {
    e.preventDefault();
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 relative">
      {/* image side */}
      <div
        className="hidden md:block"
        style={{
          backgroundImage: `url(${BG[bi]})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="w-full h-full bg-black/30 flex items-end">
          <div className="p-8 text-white max-w-lg">
            <div className="text-xs opacity-80 mb-1">Today’s nudge</div>
            <div className="text-2xl font-semibold leading-snug">
              {MOTIVATION[qi].q}
            </div>
            <div className="opacity-70 mt-1">{MOTIVATION[qi].a}</div>
          </div>
        </div>
      </div>

      {/* form side */}
      <div className="flex items-center justify-center p-6 bg-white">
        <form onSubmit={signIn} className="w-full max-w-md card p-8 space-y-4">
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
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input
              type="password"
              className="border rounded px-3 py-2 w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button className="btn-brand w-full">Login</button>
          <div className="text-center">
            <a className="text-sm text-emerald-800 underline" href="/reset-password">
              Forgot your password?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("dashboard");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) =>
      setSession(session)
    );
    return () => subscription.unsubscribe();
  }, []);

  const [profileError, setProfileError] = useState(null);
  useEffect(() => {
    async function loadProfile() {
      setProfileError(null);
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
      } else {
        setProfile(data);
      }
    }
    loadProfile();
  }, [session]);

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

  async function logout() {
    await supabase.auth.signOut();
  }

  const canSeeAll = ["admin", "team_leader"].includes(profile.role);
  const main =
    tab === "dashboard" ? (
      <Dashboard role={profile.role} onJumpTo={() => setTab("leads")} />
    ) : tab === "leads" ? (
      <LeadsPage currentUser={session.user} canSeeAll={canSeeAll} />
    ) : tab === "users" ? (
      <AdminUsers />
    ) : null;

  return (
    <div className="h-screen w-screen flex">
      <Sidebar
        active={tab}
        setActive={setTab}
        onLogout={logout}
        role={profile.role}
        profile={profile}
      />
      <main className="flex-1 overflow-auto">
        <div className="p-4 text-xl font-semibold">
          {`Let’s do it, ${profile.name || "there"} `}
          <span className="text-emerald-600">✓</span>
        </div>
        {main}
      </main>
    </div>
  );
}
