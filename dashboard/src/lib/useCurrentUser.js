import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export function useCurrentUser() {
  // caches current user info; key: ['currentUser']
  return useQuery(['currentUser'], async () => {
    // GET /api/auth/me — your backend returns user data if token valid
    try {
      const res = await api.get('/auth/me');
      // backend might return { success, data } or direct user object
      return res.data || res.user || res;
    } catch (err) {
      // ensure unauthorized leads to null so UI can handle it
      return null;
    }
  }, {
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false
  });
}