import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase";

// ---- Status colors (Tailwind classes)
const statusStyles = {
  "New": "bg-sky-100 text-sky-800",
  "Follow Up": "bg-amber-100 text-amber-800",
  "Open": "bg-indigo-100 text-indigo-800",
  "Accepted": "bg-emerald-100 text-emerald-800",
  "Rejected": "bg-rose-100 text-rose-800",
  "Hotkey Request": "bg-yellow-100 text-yellow-800",
  "Hotkeyed": "bg-orange-100 text-orange-800",
  "CFA Sent": "bg-purple-100 text-purple-800",
  "No Answer": "bg-gray-200 text-gray-700",
  "Not Interested": "bg-red-200 text-red-800",
};

const allStatuses = [
  "New",
  "Follow Up",
  "Open",
  "Accepted",
  "Rejected",
  "Hotkey Request",
  "Hotkeyed",
  "CFA Sent",
  "No Answer",
  "Not Interested",
];

// UK time helpers
const fmtDateUK = (iso) =>
  iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London" }) : "—";

export default function LeadsPage({ currentUser, canSeeAll }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [drawer, setDrawer] = useState(null); // lead being edited
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [adding, setAdding] = useState(false);
  const [reminderNote, setReminderNote] = useState("");
  const [saveErr, setSaveErr] = useState("");
  const [saving, setSaving] = useState(false);

  const scopeFilter = useMemo(
    () => (canSeeAll ? {} : { user_id: currentUser?.id || "__none__" }),
    [canSeeAll, currentUser]
  );

  // pick up a quick filter from Dashboard tile click
  const [initialFilter, setInitialFilter] = useState(null);
  useEffect(() => {
    const raw = localStorage.getItem("leads.quickFilter");
    if (raw) {
      try {
        setInitialFilter(JSON.parse(raw));
      } catch {}
      localStorage.removeItem("leads.quickFilter");
    }
  }, []);

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, canSeeAll, currentUser]);

  async function loadLeads() {
    setLoading(true);

    // include profiles(name,email) if FK leads.user_id -> profiles.id exists
    let query = supabase
      .from("leads")
      .select("*, profiles:profiles(name,email)")
      .order("created_at", { ascending: false });

    // scope by user if needed
    if (Object.keys(scopeFilter).length) {
      query = query.match(scopeFilter);
    }

    // apply quick filter ONCE
    const f = initialFilter;
    if (f?.type === "acceptedThisMonth") {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      query = query.eq("status", "Accepted").gte("created_at", d.toISOString());
    } else if (f?.type === "overdue") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.lt("next_action_at", today.toISOString()).neq("status", "Accepted");
    } else if (f?.type === "open") {
      query = query.neq("status", "Accepted");
    } else if (f?.type === "followup") {
      query = query.eq("status", "Follow Up");
    }
    if (initialFilter) setInitialFilter(null);

    // text search
    if (q?.trim()) {
      const like = `%${q.trim()}%`;
      query = query.or(
        `name.ilike.${like},email.ilike.${like},phone.ilike.${like},address1.ilike.${like},landlord_name.ilike.${like}`
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error("Load leads error", error);
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }

  function openNewLead() {
    setDrawer({
      id: null,
      name: "",
      email: "",
      phone: "",
      address1: "",
      landlord_name: "",
      status: "New",
      next_action_at: null, // ISO string
      user_id: currentUser?.id || null,
    });
    setNotes([]);
    setNoteText("");
    setReminderNote("");
    setAdding(true);
    setSaveErr("");
  }

  function openLead(lead) {
    setDrawer(lead);
    loadNotes(lead.id);
    setReminderNote("");
    setAdding(false);
    setSaveErr("");
  }

  async function loadNotes(leadId) {
    const { data } = await supabase
      .from("lead_notes")
      .select("id,note,created_at,user_id")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    setNotes(data || []);
  }

  async function saveLead() {
    setSaveErr("");
    setSaving(true);

    // Basic validation
    const trimmedName = (drawer.name || "").trim();
    if (!trimmedName) {
      setSaveErr("Please enter a name.");
      setSaving(false);
      return;
    }

    const payload = {
      name: trimmedName,
      email: drawer.email?.trim() || null,
      phone: drawer.phone?.trim() || null,
      address1: drawer.address1?.trim() || null,
      landlord_name: drawer.landlord_name?.trim() || null,
      status: drawer.status || "New",
      next_action_at: drawer.next_action_at || null,
      user_id: drawer.id ? drawer.user_id : currentUser?.id || null,
    };

    try {
      if (!drawer.id) {
        const { data, error } = await supabase
          .from("leads")
          .insert(payload)
          .select("id")
          .single();

        if (error) {
          console.error("Insert lead error:", error);
          setSaveErr(error.message || "Failed to save lead (insert).");
          setSaving(false);
          return;
        }

        const newId = data?.id;
        if (newId && reminderNote.trim()) {
          const { error: noteErr } = await supabase.from("lead_notes").insert({
            lead_id: newId,
            user_id: currentUser?.id || null,
            note: `Reminder: ${reminderNote.trim()}`,
          });
          if (noteErr) {
            console.error("Insert reminder note error:", noteErr);
          }
        }

        setDrawer(null);
        await loadLeads();
      } else {
        const { error } = await supabase.from("leads").update(payload).eq("id", drawer.id);
        if (error) {
          console.error("Update lead error:", error);
          setSaveErr(error.message || "Failed to save lead (update).");
          setSaving(false);
          return;
        }
        if (reminderNote.trim()) {
          const { error: noteErr } = await supabase.from("lead_notes").insert({
            lead_id: drawer.id,
            user_id: currentUser?.id || null,
            note: `Reminder: ${reminderNote.trim()}`,
          });
          if (noteErr) {
            console.error("Insert reminder note error:", noteErr);
          }
        }
        await loadLeads();
        setDrawer(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function addNote() {
    if (!drawer?.id || !noteText.trim()) return;
    const { error } = await supabase.from("lead_notes").insert({
      lead_id: drawer.id,
      user_id: currentUser?.id || null,
      note: noteText.trim(),
    });
    if (!error) {
      setNoteText("");
      await loadNotes(drawer.id);
    }
  }

  // ---------- Reminders (popup + bell) ----------
  const scheduled = useRef(new Set()); // lead_id set
  const [alarm, setAlarm] = useState(null); // {lead, latestNote}

  // Scan visible leads and schedule alarms for future next_action_at
  useEffect(() => {
    const now = Date.now();

    rows.forEach((r) => {
      if (!r.next_action_at) return;
      if (!canSeeAll && r.user_id !== currentUser?.id) return;

      const t = new Date(r.next_action_at).getTime();
      if (isNaN(t) || t <= now) return;

      const key = `${r.id}:${t}`;
      if (scheduled.current.has(key)) return;
      scheduled.current.add(key);

      const delay = t - now;
      window.setTimeout(async () => {
        let latest = null;
        const { data } = await supabase
          .from("lead_notes")
          .select("id,note,created_at")
          .eq("lead_id", r.id)
          .order("created_at", { ascending: false })
          .limit(1);
        latest = data?.[0] || null;

        setAlarm({ lead: r, latestNote: latest });
        ringBell();
      }, Math.min(delay, 24 * 60 * 60 * 1000)); // cap at 24h
    });
  }, [rows, canSeeAll, currentUser]);

  function ringBell() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.01);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      o.stop(ctx.currentTime + 1.25);
    } catch {}
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Leads</h1>

        <div className="flex items-center gap-2">
          <input
            className="border rounded px-3 py-2 w-[420px] max-w-[70vw]"
            placeholder="Search name, phone, email, address..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button onClick={openNewLead} className="px-3 py-2 rounded text-white" style={{ background: "#023c3f" }}>
            + Add lead
          </button>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Lead</th>
              {canSeeAll && <th className="text-left p-3">Owner</th>}
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Next action (UK)</th>
              <th className="text-left p-3">Address</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td className="p-5 text-gray-500" colSpan={canSeeAll ? 5 : 4}>
                  No leads.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => openLead(r)}>
                <td className="p-3">
                  <div className="font-medium">{r.name || "—"}</div>
                  <div className="text-gray-500 text-sm">{r.email || "—"}</div>
                  <div className="text-gray-500 text-sm">{r.phone || "—"}</div>
                </td>
                {canSeeAll && (
                  <td className="p-3">
                    <div className="text-sm">
                      {r.profiles?.name || r.profiles?.email || "—"}
                    </div>
                  </td>
                )}
                <td className="p-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      statusStyles[r.status] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {r.status || "—"}
                  </span>
                </td>
                <td className="p-3 text-gray-700">{fmtDateUK(r.next_action_at)}</td>
                <td className="p-3">{r.address1 || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer / Modal */}
      {drawer && (
        <div className="fixed inset-0 bg-black/30 flex items-start justify-center overflow-auto z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl my-10 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{adding ? "Add lead" : "Edit lead"}</h2>
              <button className="text-2xl" onClick={() => setDrawer(null)}>
                ×
              </button>
            </div>

            {saveErr && (
              <div className="mt-4 mb-2 p-3 rounded bg-red-50 text-red-700 border border-red-200">
                {saveErr}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 mt-4">
              <Field label="Name">
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={drawer.name || ""}
                  onChange={(e) => setDrawer({ ...drawer, name: e.target.value })}
                />
              </Field>

              <Field label="Email">
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={drawer.email || ""}
                  onChange={(e) => setDrawer({ ...drawer, email: e.target.value })}
                />
              </Field>

              <Field label="Phone">
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={drawer.phone || ""}
                  onChange={(e) => setDrawer({ ...drawer, phone: e.target.value })}
                />
              </Field>

              <Field label="Address">
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={drawer.address1 || ""}
                  onChange={(e) => setDrawer({ ...drawer, address1: e.target.value })}
                />
              </Field>

              <Field label="Landlord name">
                <input
                  className="border rounded px-3 py-2 w-full"
                  value={drawer.landlord_name || ""}
                  onChange={(e) => setDrawer({ ...drawer, landlord_name: e.target.value })}
                />
              </Field>

              <Field label="Status">
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={drawer.status || "New"}
                  onChange={(e) => setDrawer({ ...drawer, status: e.target.value })}
                >
                  {allStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Next action (UK time)">
                <input
                  type="datetime-local"
                  className="border rounded px-3 py-2 w-full"
                  value={
                    drawer.next_action_at
                      ? new Date(drawer.next_action_at).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value ? new Date(e.target.value) : null;
                    setDrawer({ ...drawer, next_action_at: val ? val.toISOString() : null });
                  }}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Shown & scheduled in UK time (Europe/London).
                </div>
              </Field>

              <Field label="Reminder note (saved to notes when you save)">
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="eg. Callback client about documents"
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                />
              </Field>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                className="px-4 py-2 rounded text-white disabled:opacity-60"
                style={{ background: "#023c3f" }}
                onClick={saveLead}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button className="px-4 py-2 rounded border" onClick={() => setDrawer(null)}>
                Cancel
              </button>
            </div>

            {/* Notes & comments */}
            {!adding && (
              <div className="mt-10">
                <h3 className="text-lg font-semibold mb-3">Notes & comments</h3>

                {notes.length === 0 && <div className="text-gray-500 mb-4">No notes yet.</div>}

                <ul className="space-y-3 mb-5">
                  {notes.map((n) => (
                    <li key={n.id} className="border rounded px-3 py-2">
                      <div className="text-sm">{n.note}</div>
                      <div className="text-xs text-gray-500 mt-1">{fmtDateUK(n.created_at)}</div>
                    </li>
                  ))}
                </ul>

                <div className="flex gap-2">
                  <input
                    className="border rounded px-3 py-2 w-full"
                    placeholder="Add a note…"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                  <button
                    className="px-4 py-2 rounded text-white"
                    style={{ background: "#023c3f" }}
                    onClick={addNote}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reminder popup */}
      {alarm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl p-6 w-[520px] shadow-xl">
            <div className="text-xl font-semibold mb-1">Reminder</div>
            <div className="text-sm text-gray-600 mb-4">
              {fmtDateUK(alarm.lead.next_action_at)}
            </div>
            <div className="border rounded p-3 mb-3">
              <div className="font-medium">{alarm.lead.name || "Lead"}</div>
              <div className="text-sm text-gray-600">{alarm.lead.email || alarm.lead.phone || "—"}</div>
              <div className="mt-2 text-sm">
                <span className="font-medium">Note: </span>
                {alarm.latestNote?.note || "—"}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 rounded border" onClick={() => setAlarm(null)}>
                Dismiss
              </button>
              <button
                className="px-4 py-2 rounded text-white"
                style={{ background: "#023c3f" }}
                onClick={() => {
                  setAlarm(null);
                  openLead(alarm.lead);
                }}
              >
                Open lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      {children}
    </label>
  );
}
