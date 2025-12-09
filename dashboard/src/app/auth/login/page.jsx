'use client';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { Card, CardBody } from '@/components/UI';

export default function LoginPage() {
  const router = useRouter();

  async function handleRedirectByRole() {
    try {
      const res = await api.get('/auth/me');
      const user = (res && (res.data || res.user || res)) || null;
      if (!user) {
        router.push('/auth/login');
        return;
      }
      const role = user.activeRole || user.role || 'student';
      if (role === 'mentor') router.push('/mentor/dashboard');
      else if (role === 'admin') router.push('/admin/dashboard');
      else router.push('/students/dashboard');
    } catch (e) {
      console.error('Redirect error:', e);
      router.push('/auth/login');
    }
  }

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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In with Google</h2>
            <p className="text-sm text-gray-600 mb-6">Email/password login is disabled. Please use your institution Google account.</p>

            <div className="pt-2">
              <GoogleSignInButton />
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