import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

const STATUS_OPTIONS = [
  'New',
  'In Review',
  'Follow Up',
  'Overdue',
  'Accepted',
  'Hotkey request',
  'Hotkeyed',
  'CFA sent',
  'CFA received',
  'Reject',
  'More Information required',
];

function cls(...a){ return a.filter(Boolean).join(' ') }

export default function LeadsPage({ currentUser, canSeeAll }) {
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [owners, setOwners] = useState({}); // id -> {name,email}
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Load leads, then (if admin/leader) load owner profiles in bulk
  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);

      const { data: leadRows, error } = await supabase
        .from('leads')
        .select('id,name,email,phone,address,status,landlord_name,created_at,owner_id')
        .order('created_at', { ascending: false });

      if (!alive) return;
      if (error) console.error(error);

      const rows = leadRows || [];
      setLeads(rows);

      // Fetch owner profiles in one batch (admin/team leader only)
      if (canSeeAll && rows.length) {
        const ownerIds = Array.from(new Set(rows.map(r => r.owner_id).filter(Boolean)));
        if (ownerIds.length) {
          const { data: profs, error: perr } = await supabase
            .from('profiles')
            .select('id,name,email')
            .in('id', ownerIds);
          if (!alive) return;
          if (perr) {
            console.error(perr);
            setOwners({});
          } else {
            const map = {};
            (profs || []).forEach(p => { map[p.id] = { name: p.name, email: p.email }; });
            setOwners(map);
          }
        } else {
          setOwners({});
        }
      } else {
        setOwners({});
      }

      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [canSeeAll]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return leads;
    return leads.filter(l => {
      const owner = owners[l.owner_id];
      return [
        l.name, l.email, l.phone, l.address, l.status, l.landlord_name,
        owner?.name, owner?.email
      ]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(k));
    });
  }, [q, leads, owners]);

  function openDrawer(lead) {
    // enrich with owner for the drawer header
    const owner = owners[lead.owner_id] || null;
    setSelected(owner ? { ...lead, owner } : lead);
    setDrawerOpen(true);
  }

  function onSaved(updated) {
    // Replace in list
    setLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)));
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold flex-1">Leads</h1>
        <input
          className="border rounded px-3 py-2 w-80"
          placeholder={`Filter by name, email, phone, address, status${canSeeAll ? ', owner' : ''}…`}
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      <div className="border rounded overflow-hidden bg-white">
        <table className="w-full">
          <thead className="bg-gray-50 text-left text-sm">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Address</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filtered.map(l => {
              const owner = owners[l.owner_id];
              return (
                <tr
                  key={l.id}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => openDrawer(l)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{l.name || '—'}</div>
                    <div className="text-gray-500">{l.email || '—'}</div>
                    <div className="text-gray-500">{l.phone || '—'}</div>
                    {l.landlord_name && (
                      <div className="text-gray-500">Landlord: {l.landlord_name}</div>
                    )}
                    {canSeeAll && (
                      <div className="text-gray-600 mt-1">
                        <span className="text-[11px] uppercase tracking-wide text-gray-400">
                          Owner:
                        </span>{' '}
                        {owner?.name || '—'}
                        {owner?.email ? (
                          <span className="text-gray-400"> · {owner.email}</span>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cls(
                        'inline-block px-2.5 py-1 rounded-full border text-xs',
                        l.status === 'Accepted' && 'border-green-600 text-green-700 bg-green-50',
                        l.status === 'Overdue' && 'border-red-600 text-red-700 bg-red-50',
                        !['Accepted', 'Overdue'].includes(l.status) &&
                          'border-gray-300 text-gray-700 bg-gray-50'
                      )}
                    >
                      {l.status || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">{l.address || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!loading && filtered.length === 0 && (
          <div className="p-4 text-sm text-gray-600">No leads.</div>
        )}
        {loading && <div className="p-4 text-sm">Loading…</div>}
      </div>

      {drawerOpen && selected && (
        <LeadDrawer
          lead={selected}
          onClose={() => setDrawerOpen(false)}
          onSaved={onSaved}
          canSeeAll={canSeeAll}
        />
      )}
    </div>
  );
}

/* ---------------- Drawer ---------------- */

function LeadDrawer({ lead, onClose, onSaved, canSeeAll }) {
  const [form, setForm] = useState({
    name: lead.name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    address: lead.address || '',
    status: lead.status || 'New',
    landlord_name: lead.landlord_name || '',
  });

  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    let alive = true;
    async function loadNotes() {
      setLoadingNotes(true);
      const { data, error } = await supabase
        .from('lead_notes')
        .select('id,note,created_at,user_id')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });
      if (!alive) return;
      if (error) console.error(error);
      setNotes(data || []);
      setLoadingNotes(false);
    }
    loadNotes();
    return () => { alive = false; };
  }, [lead.id]);

  function updateField(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function saveLead() {
    setSaving(true);
    const payload = {
      name: form.name?.trim() || null,
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      address: form.address?.trim() || null,
      status: form.status,
      landlord_name: form.landlord_name?.trim() || null,
    };
    const { data, error } = await supabase
      .from('leads')
      .update(payload)
      .eq('id', lead.id)
      .select()
      .maybeSingle();
    setSaving(false);
    if (error) { console.error(error); return; }
    if (data) onSaved(data);
    onClose();
  }

  async function changeStatus(v) {
    setForm(prev => ({ ...prev, status: v })); // instant UI update
    const { data, error } = await supabase
      .from('leads')
      .update({ status: v })
      .eq('id', lead.id)
      .select()
      .maybeSingle();
    if (error) { console.error(error); return; }
    if (data) onSaved(data);
  }

  async function addNote() {
    const txt = note.trim();
    if (!txt) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('lead_notes')
      .insert({ lead_id: lead.id, note: txt }) // user_id auto-set by trigger
      .select()
      .single();
    setSaving(false);
    if (error) { console.error(error); return; }
    setNote('');
    setNotes(prev => [data, ...prev]); // show immediately
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-start justify-end z-50">
      <div className="bg-white w-[720px] max-w-[95vw] h-full overflow-auto p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Edit lead</h2>
          <button onClick={onClose} className="text-2xl leading-none">×</button>
        </div>

        {/* Owner info (admin/leader only) */}
        {canSeeAll && lead.owner && (
          <div className="text-sm text-gray-600 -mt-2">
            <span className="text-[11px] uppercase tracking-wide text-gray-400">Owner:</span>{' '}
            {lead.owner.name}
            {lead.owner.email ? <span className="text-gray-400"> · {lead.owner.email}</span> : null}
          </div>
        )}

        {/* two-column form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-600">Name</label>
            <input className="border rounded px-3 py-2 w-full"
                   value={form.name}
                   onChange={e => updateField('name', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Email</label>
            <input className="border rounded px-3 py-2 w-full"
                   value={form.email}
                   onChange={e => updateField('email', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Phone</label>
            <input className="border rounded px-3 py-2 w-full"
                   value={form.phone}
                   onChange={e => updateField('phone', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Address</label>
            <input className="border rounded px-3 py-2 w-full"
                   value={form.address}
                   onChange={e => updateField('address', e.target.value)} />
          </div>

          {/* Landlord */}
          <div>
            <label className="block text-sm text-gray-600">Landlord name</label>
            <input className="border rounded px-3 py-2 w-full"
                   placeholder="e.g., Mr. Patel"
                   value={form.landlord_name}
                   onChange={e => updateField('landlord_name', e.target.value)} />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm text-gray-600">Status</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={form.status}
              onChange={e => changeStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={saveLead}
            className="px-4 py-2 rounded text-white"
            style={{ background: '#023c3f' }}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
        </div>

        {/* Notes */}
        <div className="pt-2">
          <h3 className="text-lg font-semibold">Notes &amp; comments</h3>
          {loadingNotes && <div className="text-sm p-2">Loading notes…</div>}
          {notes.length === 0 && !loadingNotes && (
            <div className="text-sm text-gray-600 p-2">No notes yet.</div>
          )}
          <div className="space-y-3 mt-2">
            {notes.map(n => (
              <div key={n.id} className="border rounded p-2">
                <div className="text-sm">{n.note}</div>
                <div className="text-[11px] text-gray-500 mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-start gap-2">
            <textarea
              className="border rounded p-2 flex-1"
              rows={3}
              placeholder="Add a note…"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <button
              onClick={addNote}
              className="px-4 py-2 rounded text-white self-stretch"
              style={{ background: '#023c3f' }}
              disabled={saving || !note.trim()}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
