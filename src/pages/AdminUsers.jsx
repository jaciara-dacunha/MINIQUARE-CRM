import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function AdminUsers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    setErr('');
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('id,email,name,role').order('email');
    setLoading(false);
    if (error) setErr(error.message);
    else setRows(data || []);
  }

  useEffect(() => { load(); }, []);

  async function changeRole(id, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    if (error) alert(error.message);
    else load();
  }

  async function sendReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) alert(error.message);
    else alert(`Reset link sent to ${email}`);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <button className="px-3 py-2 border rounded" onClick={load}>Refresh</button>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="rounded-2xl border bg-white" style={{ borderColor: '#edf2f7' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="[&_th]:text-left [&_th]:px-3 [&_th]:py-2 text-gray-600">
              <th>Name</th><th>Email</th><th>Role</th><th className="text-right pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id} className="[&_td]:px-3 [&_td]:py-2 border-t">
                <td>{u.name || '—'}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    className="border rounded px-2 py-1"
                    value={u.role || 'user'}
                    onChange={e => changeRole(u.id, e.target.value)}
                  >
                    <option value="user">user</option>
                    <option value="team_leader">team_leader</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="text-right">
                  <button className="px-3 py-1.5 border rounded mr-2" onClick={()=>sendReset(u.email)}>
                    Send reset link
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="p-3 text-sm">Loading…</div>}
      </div>
    </div>
  );
}
