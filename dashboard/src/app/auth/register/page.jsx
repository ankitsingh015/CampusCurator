'use client';
import Link from 'next/link';
import GoogleSignInButton from '@/components/GoogleSignInButton';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">CC</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-400">Registration is via Google Sign-In only.</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 space-y-4 shadow-xl text-center">
          <p className="text-gray-300 text-sm mb-2">Use your Google account to sign up and sign in.</p>
          <GoogleSignInButton />
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400">Already have an account? <Link href="/auth/login" className="text-orange-500 hover:text-orange-400 font-medium">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}