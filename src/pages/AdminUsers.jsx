import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function AdminUsers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // Local state for the new user form. These are kept inside the component
  // since React hooks must be called in a component body.  They default
  // to empty strings and a role of "user".
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user',
  });
  const [formMsg, setFormMsg] = useState('');

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

  // Create a new user by posting to our serverless function.  On success
  // we refresh the list and clear the form.  On failure we show the
  // returned error.  This function is bound to the form's submit event.
  async function addUser(e) {
    e.preventDefault();
    setFormMsg('');
    try {
      const res = await fetch('/api/createUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        // Refresh the users list to show the new account and clear the form
        await load();
        setNewUser({ email: '', password: '', name: '', role: 'user' });
        setFormMsg('User created successfully');
      } else {
        const text = await res.text();
        setFormMsg('Error: ' + text);
      }
    } catch (err) {
      setFormMsg('Error: ' + (err?.message || err));
    }
  }

  // Delete a user from Supabase.  Only call this if you have appropriate
  // privileges (e.g. admin).  It will remove the row from the profiles
  // table and refresh the list on success.
  async function deleteUser(id) {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) alert(error.message);
    else load();
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <button className="px-3 py-2 border rounded" onClick={load}>Refresh</button>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      {/* New user form for admins.  It uses controlled inputs tied to
          newUser state.  Submitting the form will call addUser(). */}
      <form onSubmit={addUser} className="space-y-2 bg-white border rounded p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm text-gray-600">Email:</label>
            <input
              type="email"
              required
              value={newUser.email}
              onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Password:</label>
            <input
              type="password"
              required
              value={newUser.password}
              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Name:</label>
            <input
              type="text"
              required
              value={newUser.name}
              onChange={e => setNewUser({ ...newUser, name: e.target.value })}
              className="border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Role:</label>
            <select
              value={newUser.role}
              onChange={e => setNewUser({ ...newUser, role: e.target.value })}
              className="border rounded px-2 py-1"
            >
              <option value="user">user</option>
              <option value="team_leader">team_leader</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </div>
        <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded">
          Add User
        </button>
        {formMsg && <div className="text-sm mt-2" style={{ color: formMsg.startsWith('Error') ? '#e53e3e' : '#38a169' }}>{formMsg}</div>}
      </form>

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
                  {/* Only show delete button for admin users; adjust condition as needed. */}
                  <button className="px-3 py-1.5 border rounded text-red-600" onClick={() => deleteUser(u.id)}>
                    Delete
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
