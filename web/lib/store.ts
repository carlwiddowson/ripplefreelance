import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  wallet_address: string;
  email?: string;
  phone_number?: string;
  role: 'freelancer' | 'client' | 'both';
  profile_data?: {
    name?: string;
    bio?: string;
    skills?: string[];
    location?: string;
    avatar_url?: string;
  };
  reputation_score: number;
  is_verified: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
        }
        set({ user, token, isAuthenticated: true });
      },
      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
        }
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
