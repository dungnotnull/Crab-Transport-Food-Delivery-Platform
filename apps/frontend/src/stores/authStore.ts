import { create } from 'zustand';
import { User, UserRole } from '../types/user.types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Đọc từ LocalStorage nếu có
  const savedToken = localStorage.getItem('crab_access_token');
  const savedUserStr = localStorage.getItem('crab_user');
  let savedUser: User | null = null;
  if (savedUserStr) {
    try {
      savedUser = JSON.parse(savedUserStr);
    } catch {
      // ignore
    }
  }

  return {
    user: savedUser,
    token: savedToken,
    isAuthenticated: !!savedToken && !!savedUser,

    login: (user, token) => {
      localStorage.setItem('crab_access_token', token);
      localStorage.setItem('crab_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true });
    },

    logout: () => {
      localStorage.removeItem('crab_access_token');
      localStorage.removeItem('crab_user');
      set({ user: null, token: null, isAuthenticated: false });
    },

    updateUser: (partialUser) => {
      set((state) => {
        if (!state.user) return state;
        const updated = { ...state.user, ...partialUser };
        localStorage.setItem('crab_user', JSON.stringify(updated));
        return { user: updated };
      });
    },
  };
});
