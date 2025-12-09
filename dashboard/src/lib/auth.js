// Simple auth helper using the backend /api/auth routes from your Express server.
// It stores the JWT returned by backend in localStorage (key: cc_token).
// Exposes: login, register, logout, getCurrentUser, requireAuth (client-side)

import { api } from './api';

const TOKEN_KEY = 'cc_token';

export async function login(email, password) {
  throw new Error('Email/password login is disabled. Please use Google Sign-In.');
}

export async function register(payload) {
  throw new Error('Registration via email/password is disabled. Please use Google Sign-In.');
}

export async function logout() {
  // call backend logout if implemented
  try {
    await api.get('/auth/logout');
  } catch (err) {
    // ignore errors on logout
  }
  api.setToken(null);
  localStorage.removeItem(TOKEN_KEY);
}

export async function getCurrentUser() {
  try {
    const me = await api.get('/auth/me');
    return me && me.data ? me.data : me;
  } catch (err) {
    // not authenticated
    return null;
  }
}