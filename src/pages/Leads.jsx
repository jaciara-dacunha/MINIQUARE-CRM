import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

const STATUS_COLORS = {
  "new": "bg-gray-100 text-gray-700",
  "open": "bg-blue-100 text-blue-700",
  "follow up": "bg-amber-100 text-amber-800",
  "overdue": "bg-red-100 text-red-700",
  "accepted": "bg-emerald-100 text-emerald-800",
  "closed": "bg-slate-200 text-slate-700",
  "rejected": "bg-rose-100 text-rose-700",
};

function StatusBadge({ status }) {
  const key = String(status || "").toLowerCase();
  const cls = STATUS_COLORS[key] || "bg-gray-100 text-gray-700";
  return (
    <span className={`px-3 py-1 rounded-full text-sm ${cls}`}>
      {status || "New"}
    </span>
  );
}

export default function LeadsPage({ currentUser, canSeeAll }) {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [show, setShow] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select(
        "id,name,email,phone,address1,status,created_at,follow_up_at,next_action_on,landlord_name,user_id"
      )
      .order("created_at", { ascending: false });
    if (!error) setLeads(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.name, l.email, l.phone, l.address1, l.landlord_name]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(q))
    );
  }, [leads, query]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="text-2xl font-semibold">Leads</div>
        <div className="flex-1 max-w-md">
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Search name, phone, email, address…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="text-sm text-gray-500 border-b">
            <tr>
              <th className="p-3">Lead</th>
              <th className="p-3">Status</th>
              <th className="p-3">Next action</th>
              <th className="p-3">Address</th>
              <th className="p-3 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="p-3">
                  <div className="font-semibold">{l.name || "—"}</div>
                  <div className="text-sm text-gray-500">
                    {l.email || "—"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {l.phone || "—"}
                  </div>
                </td>
                <td className="p-3">
                  <StatusBadge status={l.status} />
                </td>
                <td className="p-3">
                  {l.follow_up_at || l.next_action_on
                    ? new Date(l.follow_up_at || l.next_action_on).toLocaleDateString()
                    : "—"}
                </td>
                <td className="p-3">{l.address1 || "—"}</td>
                <td className="p-3">
                  <button
                    className="px-3 py-1 border rounded"
                    onClick={() => {
                      setSelected(l);
                      setShow(true);
                    }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-3 text-sm text-gray-600">No leads.</div>
        )}
      </div>

      {/* Drawer */}
      {show && (
        <LeadDrawer
          open={show}
          onClose={() => setShow(false)}
          initial={selected}
          onSaved={() => {
            setShow(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function LeadDrawer({ open, onClose, initial, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [lead, setLead] = useState(() => ({ ...initial }));
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lead_notes")
        .select("id, note, created_at, user_id")
        .eq("lead_id", initial.id)
        .order("created_at", { ascending: true });
      setNotes(data || []);
    })();
  }, [initial.id]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("leads")
      .update({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        address1: lead.address1,
        status: lead.status,
        landlord_name: lead.landlord_name,
        follow_up_at: lead.follow_up_at || null,
        next_action_on: lead.next_action_on || null,
      })
      .eq("id", lead.id);
    setSaving(false);
    if (!error) onSaved?.();
  }

  async function addNote() {
    const text = newNote.trim();
    if (!text) return;
    const { data, error } = await supabase
      .from("lead_notes")
      .insert([{ lead_id: lead.id, note: text }])
      .select()
      .single();
    if (!error) {
      setNotes((n) => [...n, data]);
      setNewNote("");
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[640px] bg-white shadow-xl overflow-auto">
        <div className="p-5 border-b flex items-center justify-between">
          <div className="text-xl font-semibold">
            {initial ? "Edit lead" : "New lead"}
          </div>
          <button className="text-2xl leading-none px-2" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Text label="Name" value={lead.name} onChange={(v) => setLead({ ...lead, name: v })} />
          <Text label="Email" value={lead.email} onChange={(v) => setLead({ ...lead, email: v })} />
          <Text label="Phone" value={lead.phone} onChange={(v) => setLead({ ...lead, phone: v })} />
          <Text label="Address" value={lead.address1} onChange={(v) => setLead({ ...lead, address1: v })} />

          <Text
            label="Landlord name"
            placeholder="e.g., Mr. Patel"
            value={lead.landlord_name}
            onChange={(v) => setLead({ ...lead, landlord_name: v })}
          />

          <div>
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={lead.status || ""}
              onChange={(e) => setLead({ ...lead, status: e.target.value })}
            >
              {["New","Open","Follow Up","Overdue","Accepted","Closed","Rejected"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="mt-2">
              <StatusBadge status={lead.status} />
            </div>
          </div>

          <Text
            label="Next action on"
            type="date"
            value={(lead.follow_up_at || lead.next_action_on || "").slice(0,10)}
            onChange={(v) =>
              setLead({ ...lead, follow_up_at: v, next_action_on: v })
            }
          />
        </div>

        <div className="px-6 pb-4">
          <button
            className="px-3 py-2 rounded text-white"
            style={{ background: "#023c3f" }}
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button className="ml-3 px-3 py-2 border rounded" onClick={onClose}>
            Cancel
          </button>
        </div>

        {/* Notes */}
        <div className="px-6 pt-4 pb-10 border-t">
          <div className="text-lg font-semibold mb-2">Notes & comments</div>
          {notes.length === 0 && (
            <div className="text-sm text-gray-500 mb-4">No notes yet.</div>
          )}
          <div className="space-y-3 mb-6">
            {notes.map((n) => (
              <div key={n.id} className="p-3 rounded bg-gray-50">
                <div className="text-sm">{n.note}</div>
                <div className="text-[11px] text-gray-500 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2">
            <textarea
              className="flex-1 border rounded p-2 min-h-[64px]"
              placeholder="Add a note…"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <button
              className="px-3 py-2 rounded text-white h-[40px] mt-[12px]"
              style={{ background: "#023c3f" }}
              onClick={addNote}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Text({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        className="border rounded px-3 py-2 w-full"
        value={value || ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
