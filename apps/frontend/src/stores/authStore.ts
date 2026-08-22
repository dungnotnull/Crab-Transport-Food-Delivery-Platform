import { create } from 'zustand';
import type { User } from '../types/user.types';
import { socketService } from '../services/socket.service';
import { useTripStore } from './tripStore';
import { useDriverStore } from './driverStore';
import { clearSessionBoundState, startAuthenticatedSession } from '../utils/sessionIsolation.utils';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

// Helper lưu trữ token/user ưu tiên sessionStorage để hỗ trợ mở nhiều tab độc lập
const getStored = (key: string) => sessionStorage.getItem(key) || localStorage.getItem(key);
const setStored = (key: string, value: string) => {
  sessionStorage.setItem(key, value);
};
const removeStored = (key: string) => {
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
};

export const useAuthStore = create<AuthState>((set) => {
  // Đọc từ SessionStorage nếu có
  const savedToken = getStored('crab_access_token');
  const savedUserStr = getStored('crab_user');
  let savedUser: User | null = null;
  if (savedUserStr) {
    try {
      savedUser = JSON.parse(savedUserStr);
    } catch {
      // ignore
    }
  }

  // Khởi tạo socket nếu đã có token
  if (savedToken && savedUser) {
    socketService.connect();
  }

  return {
    user: savedUser,
    token: savedToken,
    isAuthenticated: !!savedToken && !!savedUser,

    login: (user, token) => {
      startAuthenticatedSession({
        disconnectSocket: () => socketService.disconnect(),
        resetTripState: () => useTripStore.getState().resetBooking(),
        resetDriverState: () => useDriverStore.getState().resetSessionState(),
        connectSocket: () => {
          setStored('crab_access_token', token);
          setStored('crab_user', JSON.stringify(user));
          set({ user, token, isAuthenticated: true });
          socketService.connect();
        },
      });
    },

    logout: () => {
      clearSessionBoundState({
        disconnectSocket: () => socketService.disconnect(),
        resetTripState: () => useTripStore.getState().resetBooking(),
        resetDriverState: () => useDriverStore.getState().resetSessionState(),
      });
      removeStored('crab_access_token');
      removeStored('crab_user');
      set({ user: null, token: null, isAuthenticated: false });
    },

    updateUser: (partialUser) => {
      set((state) => {
        if (!state.user) return state;
        const updated = { ...state.user, ...partialUser };
        setStored('crab_user', JSON.stringify(updated));
        return { user: updated };
      });
    },
  };
});
