'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function Login() {
  const router = useRouter();
  const [form, setForm]         = useState({ username: '', password: '' });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) { setError('Username and password are required'); return; }
    setLoading(true); setError('');
    try {
      const r = await axios.post('/api/auth/login', form);
      localStorage.setItem('tibamax_token', r.data.token);
      localStorage.setItem('tibamax_user', JSON.stringify(r.data.user));
      router.push('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg">A</div>
          <h1 className="text-3xl font-bold text-white">TibaMax HMIS</h1>
          <p className="text-blue-300 text-sm mt-1">Webuye West Sub-County Hospital</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Staff Login</h2>
          <p className="text-gray-400 text-sm mb-6">Sign in to access TibaMax HMIS</p>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>
          )}
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Username</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500 transition-all">
                <span className="text-gray-400 mr-3 text-sm">👤</span>
                <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                  placeholder="Enter your username" autoComplete="username"
                  className="flex-1 outline-none text-sm text-gray-700 bg-transparent" />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Password</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500 transition-all">
                <span className="text-gray-400 mr-3 text-sm">🔒</span>
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  placeholder="Enter your password" autoComplete="current-password"
                  className="flex-1 outline-none text-sm text-gray-700 bg-transparent" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="text-gray-400 hover:text-blue-600 text-xs ml-2">{showPass ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl transition-all text-sm">
              {loading ? 'Signing in...' : 'Sign In to TibaMax HMIS'}
            </button>
          </form>
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Default Credentials</p>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Username:</span><span className="font-mono font-semibold text-gray-700">admin</span></div>
              <div className="flex justify-between text-sm mt-1"><span className="text-gray-500">Password:</span><span className="font-mono font-semibold text-gray-700">Admin@2026</span></div>
            </div>
          </div>
        </div>
        <p className="text-center text-blue-400 text-xs mt-6">TibaMax HMIS v1.0 — Bungoma County, Kenya</p>
      </div>
    </div>
  );
}