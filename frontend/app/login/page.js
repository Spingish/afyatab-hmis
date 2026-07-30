'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { HeartPulse, User, Lock, Eye, EyeOff, LoaderCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <HeartPulse size={28} className="text-teal-700" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">TibaMax HMIS</h1>
          <p className="text-teal-200 text-sm mt-1">Webuye West Sub-County Hospital</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Staff Login</h2>
          <p className="text-slate-400 text-sm mb-6">Sign in to access TibaMax HMIS</p>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Username</label>
              <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 focus-within:border-teal-600 transition-colors">
                <User size={16} className="text-slate-400 mr-3 flex-shrink-0" />
                <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                  placeholder="Enter your username" autoComplete="username"
                  className="flex-1 outline-none text-sm text-slate-700 bg-transparent" />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Password</label>
              <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 focus-within:border-teal-600 transition-colors">
                <Lock size={16} className="text-slate-400 mr-3 flex-shrink-0" />
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  placeholder="Enter your password" autoComplete="current-password"
                  className="flex-1 outline-none text-sm text-slate-700 bg-transparent" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="text-slate-400 hover:text-teal-700 flex-shrink-0 ml-2">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 disabled:bg-teal-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
              {loading ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : 'Sign In to TibaMax HMIS'}
            </button>
          </form>
        </div>

        <p className="text-center text-teal-300/70 text-xs mt-6">TibaMax HMIS v1.0 - Bungoma County, Kenya</p>
      </div>
    </div>
  );
}