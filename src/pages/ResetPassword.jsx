import React, { useState } from 'react';
import { supabase } from '../supabase';

export default function ResetPassword({ onDone }) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    if (p1.length < 8) return setMsg('Use at least 8 characters.');
    if (p1 !== p2) return setMsg('Passwords do not match.');

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: p1 });
    setLoading(false);

    if (error) setMsg(error.message);
    else {
      setMsg('Password updated. You can sign in now.');
      // optional: small delay then go back to login/dashboard
      setTimeout(() => onDone?.(), 1000);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 border rounded p-6 bg-white">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <input
          type="password"
          className="border rounded px-3 py-2 w-full"
          placeholder="New password"
          value={p1}
          onChange={e => setP1(e.target.value)}
        />
        <input
          type="password"
          className="border rounded px-3 py-2 w-full"
          placeholder="Confirm new password"
          value={p2}
          onChange={e => setP2(e.target.value)}
        />
        {msg && <div className="text-sm text-red-600">{msg}</div>}
        <button disabled={loading} className="px-4 py-2 rounded text-white" style={{ background: '#023c3f' }}>
          {loading ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
