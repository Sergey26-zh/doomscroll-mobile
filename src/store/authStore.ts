import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  token: string | null;
  username: string | null;
  isLoading: boolean;
  login: (token: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  username: null,
  isLoading: true,

  login: async (token: string, username: string) => {
    try {
      await SecureStore.setItemAsync('jwt_token', token);
      await SecureStore.setItemAsync('username', username);
      set({ token, username });
    } catch (e) {
      console.error('Error saving auth token:', e);
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('jwt_token');
      await SecureStore.deleteItemAsync('username');
      set({ token: null, username: null });
    } catch (e) {
      console.error('Error deleting auth token:', e);
    }
  },

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('jwt_token');
      const username = await SecureStore.getItemAsync('username');
      set({ token, username, isLoading: false });
    } catch (e) {
      console.error('Error initializing auth store:', e);
      set({ isLoading: false });
    }
  },
}));
