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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 items-center">
        
        {/* Left Side - Branding & Info */}
        <div className="flex-1 text-center lg:text-left">
          <div className="flex justify-center lg:justify-start mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-600 rounded-2xl flex items-center justify-center font-bold text-3xl text-white shadow-xl">
              CC
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">CampusCurator</h1>
          <p className="text-xl text-gray-600 mb-6">Streamlining Academic Project Excellence</p>
          <div className="space-y-3 text-gray-700">
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <span className="text-2xl">⚙️</span>
              <span>Unified project management</span>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <span className="text-2xl">👥</span>
              <span>Smart team collaboration</span>
            </div>
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <span className="text-2xl">📊</span>
              <span>Real-time progress tracking</span>
            </div>
          </div>
        </div>

        {/* Right Side - Login Card */}
        <div className="w-full lg:w-[480px]">
          <Card variant="elevated">
            <CardBody>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600 mb-6">Sign in to access your dashboard</p>

              <form onSubmit={onSubmit} className="space-y-5" aria-describedby={err ? 'login-error' : undefined}>
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-gray-900 transition"
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 text-gray-900 transition"
                    required
                  />
                </div>

                {err && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                    <p className="text-red-700 text-sm font-medium">⚠️ {err}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={loading}
                  className="w-full justify-center bg-teal-600 hover:bg-teal-700 border-0 font-semibold text-base py-3"
                >
                  {loading ? '🔄 Signing in...' : '→ Sign In'}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <GoogleSignInButton />
              </div>

              {/* Demo Credentials */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowDemo(!showDemo)}
                  className="w-full bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 text-amber-900 px-4 py-3 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2"
                >
                  <span>🔑</span>
                  {showDemo ? 'Hide Demo Credentials' : 'Show Demo Credentials for Testing'}
                </button>

                {showDemo && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border-2 border-blue-200 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="text-lg">👤</span>
                            <span>Administrator</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">Full system access</p>
                        </div>
                        <Button 
                          type="button" 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => quickLogin({ email: 'admin@campuscurator.com', password: 'admin123' })}
                          className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                        >
                          Use →
                        </Button>
                      </div>
                      <div className="font-mono text-xs text-gray-700 bg-white/60 px-3 py-2 rounded">
                        admin@campuscurator.com / admin123
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border-2 border-green-200 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="text-lg">🎓</span>
                            <span>Mentor</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">Evaluate & guide students</p>
                        </div>
                        <Button 
                          type="button" 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => quickLogin({ email: 'john.smith@campuscurator.com', password: 'mentor123' })}
                          className="bg-green-600 hover:bg-green-700 text-white border-0"
                        >
                          Use →
                        </Button>
                      </div>
                      <div className="font-mono text-xs text-gray-700 bg-white/60 px-3 py-2 rounded">
                        john.smith@campuscurator.com / mentor123
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border-2 border-purple-200 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="text-lg">📚</span>
                            <span>Student</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">Submit projects & track progress</p>
                        </div>
                        <Button 
                          type="button" 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => quickLogin({ email: 'alice.w@student.com', password: 'student123' })}
                          className="bg-purple-600 hover:bg-purple-700 text-white border-0"
                        >
                          Use →
                        </Button>
                      </div>
                      <div className="font-mono text-xs text-gray-700 bg-white/60 px-3 py-2 rounded">
                        alice.w@student.com / student123
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => { setEmail(''); setPassword(''); }}
                      className="w-full text-sm text-gray-600 hover:text-gray-900 underline mt-2"
                    >
                      Clear form
                    </button>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Footer */}
          <p className="text-center text-gray-500 text-sm mt-6">
            © 2025 CampusCurator. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}