'use client';
import { useState } from 'react';
import { login } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { Card, CardBody, Button } from '@/components/UI';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [showDemo, setShowDemo] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();

  async function handleRedirectByRole() {
    try {
      const res = await api.get('/auth/me');
      const user = res.data || null;
      if (!user) {
        router.push('/auth/login');
        return;
      }
      const role = user.role || 'student';
      if (role === 'mentor') router.push('/mentor/dashboard');
      else if (role === 'admin') router.push('/admin/dashboard');
      else router.push('/drives');
    } catch (e) {
      console.error('Redirect error:', e);
      router.push('/auth/login');
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      if (!user) throw new Error('Login failed - no user returned');
      await qc.invalidateQueries({ queryKey: ['currentUser'] });
      await handleRedirectByRole();
    } catch (error) {
      setErr(error.message || 'Login failed');
      setLoading(false);
    }
  };

  const quickLogin = (creds) => {
    setEmail(creds.email);
    setPassword(creds.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-orange-500 rounded-xl flex items-center justify-center font-bold text-2xl text-white">
              CC
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white">CampusCurator</h1>
          <p className="text-gray-300 mt-2">Project Evaluation Platform</p>
        </div>

        {/* Login Card */}
        <Card variant="elevated">
          <CardBody>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign In</h2>

            <form onSubmit={onSubmit} className="space-y-4" aria-describedby={err ? 'login-error' : undefined}>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-400 text-gray-900 transition"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-400 text-gray-900 transition"
                  required
                />
              </div>

              {err && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                  <p className="text-red-700 text-sm font-medium">{err}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full justify-center bg-orange-500 hover:bg-orange-600 border-0"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <GoogleSignInButton />
            </div>

            {/* Demo Credentials */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDemo(!showDemo)}
                  className="flex-1 text-sm"
                >
                  {showDemo ? 'Hide demo' : 'Show demo credentials'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setEmail(''); setPassword(''); setShowDemo(false); }}
                  className="text-sm"
                >
                  Clear
                </Button>
              </div>

              {showDemo && (
                <div className="mt-4 space-y-3 text-sm">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="font-semibold text-gray-900 mb-2">Admin</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-800 flex-1">admin@campuscurator.com</span>
                      <Button type="button" variant="secondary" size="sm" onClick={() => quickLogin({ email: 'admin@campuscurator.com', password: 'admin123' })}>Use</Button>
                    </div>
                    <p className="text-gray-600 font-mono text-xs mt-2">admin123</p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <div className="font-semibold text-gray-900 mb-2">Mentor</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-800 flex-1">john.smith@campuscurator.com</span>
                      <Button type="button" variant="secondary" size="sm" onClick={() => quickLogin({ email: 'john.smith@campuscurator.com', password: 'mentor123' })}>Use</Button>
                    </div>
                    <p className="text-gray-600 font-mono text-xs mt-2">mentor123</p>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <div className="font-semibold text-gray-900 mb-2">Student</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-800 flex-1">alice.w@student.com</span>
                      <Button type="button" variant="secondary" size="sm" onClick={() => quickLogin({ email: 'alice.w@student.com', password: 'student123' })}>Use</Button>
                    </div>
                    <p className="text-gray-600 font-mono text-xs mt-2">student123</p>
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-8">
          2025 CampusCurator. All rights reserved.
        </p>
      </div>
    </div>
  );
}