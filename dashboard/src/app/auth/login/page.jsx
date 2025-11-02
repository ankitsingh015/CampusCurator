'use client';
import { useState } from 'react';
import { login } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import GoogleSignInButton from '@/components/GoogleSignInButton';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const router = useRouter();
  const qc = useQueryClient();

  async function handleRedirectByRole() {
    // refresh currentUser query so role is available
    const user = await qc.fetchQuery(['currentUser'], { staleTime: 0 }).catch(() => null);
    if (!user) {
      router.push('/');
      return;
    }
    const role = user.role || 'student';
    if (role === 'mentor') router.push('/mentor/dashboard');
    else if (role === 'admin') router.push('/admin');
    else router.push('/student/dashboard');
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      const user = await login(email, password); // login stores token in localStorage
      // invalidate currentUser cache and redirect based on role
      await qc.invalidateQueries(['currentUser']);
      await handleRedirectByRole();
    } catch (error) {
      setErr(error.message || 'Login failed');
    }
  };

  // If you also use GoogleSignInButton it will store token similarly and you can call handleRedirectByRole after login
  return (
    <div className="max-w-md mx-auto py-16">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border p-2 rounded" />
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" className="w-full border p-2 rounded" />
        {err && <div className="text-red-600">{err}</div>}
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Login</button>
      </form>

      <div className="my-4 text-center">Or sign in with</div>
      <GoogleSignInButton onSuccessRedirect={null /* we'll redirect by fetching user below */} />
      <div className="text-sm text-gray-500 mt-3">After signing in with Google you will be redirected to your role-specific dashboard.</div>
    </div>
  );
}