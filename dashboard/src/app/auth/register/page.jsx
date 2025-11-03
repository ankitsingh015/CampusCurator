'use client';
import { useState } from 'react';
import { register } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/UI';
import Link from 'next/link';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', batch: '' });
  const [err, setErr] = useState(null);
  const router = useRouter();

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await register(form);
      if (user) router.push('/dashboard');
    } catch (error) {
      setErr(error.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">CC</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-400">Join CampusCurator</p>
        </div>

        <form onSubmit={onSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-8 space-y-4 shadow-xl">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <input 
              id="name"
              value={form.name} 
              onChange={e=>setForm({...form, name:e.target.value})} 
              placeholder="John Doe" 
              className="w-full border-2 border-slate-600 bg-slate-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <input 
              id="email"
              value={form.email} 
              onChange={e=>setForm({...form, email:e.target.value})} 
              placeholder="you@example.com" 
              type="email"
              className="w-full border-2 border-slate-600 bg-slate-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <input 
              id="password"
              value={form.password} 
              onChange={e=>setForm({...form, password:e.target.value})} 
              placeholder="••••••••" 
              type="password" 
              className="w-full border-2 border-slate-600 bg-slate-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="batch" className="block text-sm font-medium text-gray-300 mb-2">Batch (e.g., 2025)</label>
            <input 
              id="batch"
              value={form.batch} 
              onChange={e=>setForm({...form, batch:e.target.value})} 
              placeholder="2025" 
              className="w-full border-2 border-slate-600 bg-slate-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none transition"
            />
          </div>

          {err && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <p className="text-red-700 text-sm font-medium">{err}</p>
            </div>
          )}

          <Button type="submit" variant="primary" className="w-full">Create Account</Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400">Already have an account? <Link href="/auth/login" className="text-orange-500 hover:text-orange-400 font-medium">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}