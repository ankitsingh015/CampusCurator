'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

/**
 * GoogleSignInButton
 * - Renders Google's One Tap / Sign-In button via the Google Identity Services script.
 * - On successful sign-in it POSTs the idToken to your backend (/api/auth/google).
 * - Stores the returned app JWT using api.setToken (and localStorage) so subsequent requests are authenticated.
 * - Invalidates/fetches the currentUser cache and redirects the user to the correct role dashboard:
 *     - student -> /student/dashboard
 *     - mentor  -> /mentor/dashboard
 *     - admin   -> /admin
 *
 * Environment:
 * - NEXT_PUBLIC_GOOGLE_CLIENT_ID must be set in the frontend env (.env.local)
 * - NEXT_PUBLIC_API_BASE should point to your backend API root (e.g. http://localhost:5000/api)
 */
export default function GoogleSignInButton({ onSuccessRedirect = null }) {
  const router = useRouter();
  const qc = useQueryClient();

  // helper: redirect based on user role (expects a user object)
  function redirectByRole(user) {
    if (!user) {
      router.push('/');
      return;
    }
    const role = user.role || 'student';
    if (role === 'mentor') router.push('/mentor/dashboard');
    else if (role === 'admin') router.push('/admin');
    else router.push('/student/dashboard');
  }

  // helper: after storing token, refresh current user and redirect appropriately
  async function handlePostLoginRedirect() {
    try {
      // invalidate currentUser so it's refetched fresh
      qc.invalidateQueries(['currentUser']);

      // attempt to fetch the current user directly from backend (ensures we have role)
      const meResp = await api.get('/auth/me');
      const user = meResp && (meResp.data || meResp.user || meResp);
      // If backend returns wrapped { success, data }, handle that too:
      const resolvedUser = user && user.data ? user.data : user;

      // If no user found, just land on root or fallback
      if (!resolvedUser) {
        router.push('/');
        return;
      }

      redirectByRole(resolvedUser);
    } catch (err) {
      console.error('Error fetching current user after Google sign-in:', err);
      // fallback redirect
      router.push('/');
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Insert Google Identity Services script
    if (!document.getElementById('gsi-script')) {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.id = 'gsi-script';
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }

    let initTimer = null;

    const initGSI = () => {
      if (!window.google || !window.google.accounts) return false;
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set.');
        return false;
      }

      // Initialize the GSI client with a callback that receives the id_token
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            // response.credential is the id_token (JWT from Google)
            const idToken = response.credential;
            if (!idToken) throw new Error('No id token returned from Google');

            // Send idToken to backend to verify and create/find user & receive your app JWT
            const backendUrl = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api') + '/auth/google';
            const r = await fetch(backendUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken })
            });

            const payload = await r.json();
            if (!r.ok) {
              const msg = payload && payload.message ? payload.message : 'Google sign-in failed';
              throw new Error(msg);
            }

            // backend should return { success: true, token, user: {...} }
            const token = payload.token || (payload.data && payload.data.token);
            if (!token) {
              throw new Error('No token returned from backend after Google sign-in');
            }

            // store token for subsequent API calls
            api.setToken(token);
            try {
              // also keep cc_token in localStorage for compatibility with other code
              if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem('cc_token', token);
              }
            } catch (err) {
              console.warn('Could not persist token to localStorage', err);
            }

            // Invalidate currentUser cache and redirect based on role
            await handlePostLoginRedirect();
          } catch (err) {
            console.error('Google sign-in flow error:', err);
            alert(err.message || 'Google sign-in failed');
          }
        }
      });

      // Render the Google Sign-in button into the placeholder div with id 'gsi-button'
      const btn = document.getElementById('gsi-button');
      if (btn) {
        window.google.accounts.id.renderButton(btn, { theme: 'outline', size: 'large' });
      }

      // Optionally, you could auto-prompt One Tap here with window.google.accounts.id.prompt()
      return true;
    };

    // Keep trying until GSI is available (script loads async)
    initTimer = setInterval(() => {
      const ready = initGSI();
      if (ready && initTimer) {
        clearInterval(initTimer);
        initTimer = null;
      }
    }, 300);

    return () => {
      if (initTimer) clearInterval(initTimer);
    };
  }, [qc, router]);

  return <div id="gsi-button" />;
}