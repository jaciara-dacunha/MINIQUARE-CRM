// src/pages/Leads.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

const STATUS_OPTIONS = [
  { v: "New",       color: "bg-gray-200 text-gray-700" },
  { v: "Follow Up", color: "bg-amber-100 text-amber-800" },
  { v: "Open",      color: "bg-blue-100 text-blue-800" },
  { v: "Overdue",   color: "bg-red-100 text-red-700" },
  { v: "Accepted",  color: "bg-emerald-100 text-emerald-800" },
  { v: "Closed",    color: "bg-zinc-200 text-zinc-700" },
  { v: "Rejected",  color: "bg-rose-100 text-rose-800" },
  { v: "Hotkey Request",  color: "bg-rose-100 text-rose-800" },
  { v: "Hotkeyed",      color: "bg-blue-100 text-green-800" },
  { v: "CFA Sent",      color: "bg-blue-100 text-blue-800" },
  { v: "No Answer",    color: "bg-zinc-200 text-zinc-700" },
];

function pillClass(status) {
  const m = STATUS_OPTIONS.find(
    (s) => s.v.toLowerCase() === (status || "").toLowerCase()
  );
  return m ? m.color : "bg-gray-100 text-gray-600";
}

export default function LeadsPage({ currentUser, canSeeAll }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    let query = supabase
      .from("leads")
      .select(
        "id,name,email,phone,address,status,next_action_date,created_at,landlord_name,user_id",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (!canSeeAll && currentUser?.id) query = query.eq("user_id", currentUser.id);

    const { data, error } = await query;
    if (error) console.error(error);
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, canSeeAll]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.name, r.email, r.phone, r.address, r.landlord_name]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(s))
    );
  }, [rows, q]);

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-teal-900">Leads</h1>
        <div className="flex items-center gap-3">
          <input
            className="border rounded-lg px-4 py-2 w-[320px] max-w-[60vw]"
            placeholder="Search name, phone, email, address..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-xl text-white"
            style={{ background: "#023c3f" }}
          >
            + Add lead
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600">
              <th className="py-3 px-4">Lead</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Next action</th>
              <th className="py-3 px-4">Address</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="py-6 px-4 text-gray-500" colSpan={4}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="py-6 px-4 text-gray-500" colSpan={4}>
                  No leads.
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="py-3 px-4">
                    <div className="font-medium text-teal-900">{l.name || "—"}</div>
                    <div className="text-sm text-gray-600">{l.email || "—"}</div>
                    <div className="text-sm text-gray-600">{l.phone || "—"}</div>
                    {l.landlord_name && (
                      <div className="text-xs text-gray-500 mt-1">
                        Landlord: {l.landlord_name}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm ${pillClass(
                        l.status
                      )}`}
                    >
                      {l.status || "—"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {l.next_action_date
                      ? new Date(l.next_action_date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="py-3 px-4 text-gray-700">{l.address || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddLeadModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            load();
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

function AddLeadModal({ onClose, onSaved, currentUser }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    landlord_name: "",
    status: "New",
    next_action_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setErr("");
    if (!form.name) {
      setErr("Please enter name");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      user_id: currentUser?.id || null,
      next_action_date: form.next_action_date || null,
    };
    const { error } = await supabase.from("leads").insert(payload);
    setSaving(false);
    if (error) {
      setErr(error.message);
    } else {
      onSaved();
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] max-w-[94vw] bg-white rounded-2xl shadow-xl">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-teal-900">Add lead</h3>
          <button className="text-gray-500" onClick={onClose}>✕</button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name">
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Email">
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
          <Field label="Phone">
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </Field>
          <Field label="Address">
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </Field>
          <Field label="Landlord name">
            <input
              className="border rounded-lg px-3 py-2 w-full"
              value={form.landlord_name}
              onChange={(e) => setForm((f) => ({ ...f, landlord_name: e.target.value }))}
              placeholder="e.g., Mr. Patel"
            />
          </Field>
          <Field label="Status">
            <select
              className="border rounded-lg px-3 py-2 w-full"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.v} value={s.v}>{s.v}</option>
              ))}
            </select>
          </Field>
          <Field label="Next action date">
            <input
              type="date"
              className="border rounded-lg px-3 py-2 w-full"
              value={form.next_action_date}
              onChange={(e) => setForm((f) => ({ ...f, next_action_date: e.target.value }))}
            />
          </Field>
        </div>

        {err && <div className="px-6 pb-2 text-sm text-red-600">{err}</div>}

        <div className="p-6 pt-0 flex items-center justify-end gap-3">
          <button className="px-4 py-2 rounded-lg border" onClick={onClose}>Cancel</button>
          <button
            className="px-4 py-2 rounded-lg text-white disabled:opacity-60"
            style={{ background: "#023c3f" }}
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="text-sm">
      <div className="text-gray-600 mb-1">{label}</div>
      {children}
    </label>
  );
}
