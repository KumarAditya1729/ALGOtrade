import { create } from 'zustand';

export interface UserRole {
  id: string;
  permissions: string[];
}

export interface User {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  timezone: string;
  role: UserRole | string;
  must_change_initial_password?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

// Rehydrate user from localStorage on startup
const _storedUser = (): User | null => {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set: any) => ({
  user: _storedUser(),
  isAuthenticated: !!localStorage.getItem('auth_token'),
  login: (token, user) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    set({ user: null, isAuthenticated: false });
  },
}));
