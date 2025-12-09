'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/useCurrentUser';

export default function ProtectedRole({ allowedRole, children }) {
  const { data: user, isLoading } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      // not authenticated — wait for login
      if (!user) {
        // redirect to login with return path
        router.push(`/auth/login`);
        return;
      }
      // role mismatch — redirect to correct dashboard based on activeRole (fallback to role)
      const role = user.activeRole || user.role || 'student';

      if (allowedRole === 'student' && role !== 'student') {
        if (role === 'mentor') router.push('/mentor/dashboard');
        else if (role === 'admin') router.push('/admin');
        else router.push('/');
      }

      if (allowedRole === 'mentor' && role !== 'mentor') {
        if (role === 'student') router.push('/students/dashboard');
        else if (role === 'admin') router.push('/admin');
        else router.push('/');
      }

      if (allowedRole === 'admin' && role !== 'admin') {
        if (role === 'mentor') router.push('/mentor/dashboard');
        else if (role === 'student') router.push('/students/dashboard');
        else router.push('/');
      }
    }
  }, [user, isLoading, allowedRole, router]);

  if (isLoading || !user) return <div>Loading...</div>;

  return <>{children}</>;
}