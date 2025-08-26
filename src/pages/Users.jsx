import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function UsersPage({ role }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'user' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase.from('profiles').select('id, name, role, email');
      if (!error) setUsers(data);
    }
    fetchUsers();
  }, []);

  async function addUser(e) {
    e.preventDefault();
    setMessage('');
    const res = await fetch('/api/createUser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    
    let result;
    try {
      // Attempt to parse JSON response. If the server responded with
      // HTML (e.g. an error page), this will throw and we catch below.
      result = await res.json();
    } catch (err) {
      const text = await res.text();
      // Try to parse text as JSON if possible, otherwise return raw text
      try {
        result = JSON.parse(text);
      } catch (jsonErr) {
        result = { error: text };
      }
    }
    if (res.ok) {
      // On success, append the new user to the list and reset the form
      setUsers([
        ...users,
        {
          id: result.user.id,
          name: form.name,
          role: form.role,
          email: form.email,
        },
      ]);
      setForm({ email: '', password: '', name: '', role: 'user' });
      setMessage('User created successfully');
    } else {
      // Display the error returned from the API or a generic message
      setMessage(result.error || 'Error creating user');
    }

  }

  if (!['admin', 'team_leader'].includes(role)) {
    return <p>You do not have permission to view this page.</p>;
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Manage Users</h1>
      <form onSubmit={addUser} className="space-y-2">
        <div>
          <label>Email:</label>
          <input className="border p-1 ml-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div>
          <label>Password:</label>
          <input type="password" className="border p-1 ml-2" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div>
          <label>Name:</label>
          <input className="border p-1 ml-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label>Role:</label>
          <select className="border p-1 ml-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="user">User</option>
            <option value="team_leader">Team Leader</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" className="bg-emerald-600 text-white px-4 py-1 rounded">Add User</button>
      </form>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      <h2 className="text-lg font-semibold mt-4">Existing Users</h2>
      <table className="border-collapse border w-full mt-2">
        <thead>
          <tr>
            <th className="border p-1">Name</th>
            <th className="border p-1">Email</th>
            <th className="border p-1">Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td className="border p-1">{u.name}</td>
              <td className="border p-1">{u.email}</td>
              <td className="border p-1">{u.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
