'use client';
import Link from 'next/link';
import { useCurrentUser } from '@/lib/useCurrentUser';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function Header() {
  const { data: user } = useCurrentUser();
  const [showMenu, setShowMenu] = useState(false);
  const [switching, setSwitching] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();

  const handleLogout = () => {
    // Close the dropdown menu
    setShowMenu(false);

    // Clear token from API client
    api.setToken(null);

    // Clear token from localStorage
    localStorage.removeItem('cc_token');

    // Immediately invalidate currentUser query to force refetch
    qc.invalidateQueries({ queryKey: ['currentUser'] });

    // Clear all React Query cache
    qc.clear();

    // Redirect to login
    router.push('/auth/login');
  };

  const handleRoleChange = async (role) => {
    if (!user || role === user.activeRole) return;
    try {
      setSwitching(true);
      const res = await api.post('/auth/switch-role', { body: { role } });
      const token = res.token;
      const updatedUser = res.user || res.data;
      if (token) {
        api.setToken(token);
      }
      if (updatedUser?.activeRole) {
        localStorage.setItem('cc_active_role', updatedUser.activeRole);
      }
      await qc.invalidateQueries({ queryKey: ['currentUser'] });
      setShowMenu(false);
    } catch (err) {
      console.error('Role switch failed', err);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="bg-slate-800 text-white border-b border-slate-700">
      <div className="w-full px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-sm">
              CC
            </div>
            <span className="font-bold text-lg">CampusCurator</span>
          </Link>

          {/* Navigation */}
          {user && (
            <nav className="hidden md:flex items-center gap-8 text-sm">
              {(user.activeRole || user.role) === 'admin' && (
                <>
                  <Link href="/admin/dashboard" className="text-gray-300 hover:text-orange-400 transition font-medium">
                    Dashboard
                  </Link>
                  <Link href="/admin/drives/new" className="text-gray-300 hover:text-orange-400 transition font-medium">
                    New Drive
                  </Link>
                </>
              )}
              {(user.activeRole || user.role) === 'mentor' && (
                <>
                  <Link href="/mentor/dashboard" className="text-gray-300 hover:text-orange-400 transition font-medium">
                    My Groups
                  </Link>
                  <Link href="/mentor/reviews" className="text-gray-300 hover:text-orange-400 transition font-medium">
                    Reviews
                  </Link>
                  <Link href="/mentor/evaluations" className="text-gray-300 hover:text-orange-400 transition font-medium">
                    Evaluations
                  </Link>
                </>
              )}
              {(user.activeRole || user.role) === 'student' && (
                <>
                  <Link href="/drives" className="text-gray-300 hover:text-orange-400 transition font-medium">
                    Dashboard
                  </Link>
                  <Link href="/students/submit" className="text-gray-300 hover:text-orange-400 transition font-medium">
                    Submit
                  </Link>
                  <Link href="/students/results" className="text-gray-300 hover:text-orange-400 transition font-medium">
                    Results
                  </Link>
                </>
              )}
            </nav>
          )}

          {/* User Menu */}
          <div className="relative">
            {user ? (
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-slate-700 rounded-lg transition"
              >
                <div className="flex flex-col items-end">
                  <span className="text-white font-medium">{user.name}</span>
                  <span className="text-xs text-orange-200">{user.activeRole || user.role}</span>
                </div>
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              </button>
            ) : (
              <Link href="/auth/login" className="px-6 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition font-medium">
                Sign In
              </Link>
            )}

            {/* Dropdown Menu */}
            {showMenu && user && (
              <div className="absolute right-0 mt-2 w-48 bg-white text-gray-900 rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{user.email}</p>
                  {Array.isArray(user.roles) && user.roles.length > 1 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1">Current role</p>
                      <div className="flex flex-wrap gap-2">
                        {user.roles.map((role) => {
                          const isActive = (user.activeRole || user.role) === role;
                          return (
                            <button
                              key={role}
                              disabled={switching}
                              onClick={() => handleRoleChange(role)}
                              className={`px-3 py-1 rounded-full text-xs border transition ${isActive
                                ? 'bg-orange-500 text-white border-orange-500'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                                } ${switching ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                              {role}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 text-sm transition"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}