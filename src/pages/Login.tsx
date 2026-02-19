import React, { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAppState } from '../context/AppContext';
import { backgroundOptions } from '../lib/backgrounds';

const Login: React.FC = () => {
  const { currentUser, token, login, backgroundTheme, setBackgroundTheme } = useAppState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (currentUser && token) {
    return <Navigate to="/" replace />;
  }

  return (
    <section className="hospital-scene-page min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white/95 backdrop-blur-sm border border-slate-200 shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-full bg-blue-100 mb-3">
            <FlaskConical className="h-8 w-8 text-blue-700" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Lab Inventory Login</h1>
          <p className="text-sm text-slate-600 mt-2">Secure access with role-based dashboards.</p>
        </div>
        <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
          Background Style
        </label>
        <select
          className="w-full rounded-full border border-slate-300 bg-white px-4 py-2 mb-4 text-sm text-slate-700"
          value={backgroundTheme}
          onChange={(event) => setBackgroundTheme(event.target.value as typeof backgroundTheme)}
        >
          {backgroundOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
        <input
          type="email"
          className="w-full rounded-full border border-slate-300 px-4 py-2 mb-3"
          placeholder="Enter email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError('');
          }}
        />

        <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
        <input
          type="password"
          className="w-full rounded-full border border-slate-300 px-4 py-2 mb-4"
          placeholder="Enter password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError('');
          }}
        />

        <button
          type="button"
          className="w-full rounded-full bg-blue-700 text-white py-2.5 font-semibold hover:bg-blue-800 transition-colors"
          onClick={async () => {
            const result = await login(email, password);
            if (!result.ok) {
              setError(result.message);
            }
          }}
        >
          Sign In
        </button>
        {error && <p className="text-xs text-red-700 mt-2">{error}</p>}
      </div>
    </section>
  );
};

export default Login;
