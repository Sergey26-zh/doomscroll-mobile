import { create } from 'zustand';
import {
  startDetoxSession,
  pauseDetoxSession,
  resumeDetoxSession,
  stopDetoxSession,
  EndSessionResponseDto,
} from '../api/sessions';
import {
  createLobby,
  joinLobby,
  getLobbyStatus,
  leaveLobby as apiLeaveLobby,
  getMyLobby,
  LobbyStatusResponseDto,
  fetchPendingInvitations,
  respondToInvitation,
  inviteFriendsToLobby,
  LobbyInvitationDto,
} from '../api/lobbies';
import { useUserStore } from './userStore';

interface DetoxSessionState {
  activeSessionId: string | null;
  sessionStatus: 'IDLE' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  locationName: string | null;
  durationSeconds: number;
  earnedPoints: number;
  message: string | null;
  activeLobby: LobbyStatusResponseDto | null;
  isLoading: boolean;
  error: string | null;
  pendingInvitations: LobbyInvitationDto[];
  activeTab: 'map' | 'social' | 'profile';

  startSession: (locationId: string, latitude: number, longitude: number, name: string, bssids: string[]) => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  stopSession: () => Promise<EndSessionResponseDto>;
  createNewLobby: (accumulateToShared: boolean) => Promise<void>;
  joinExistingLobby: (code: string) => Promise<void>;
  refreshLobbyStatus: () => Promise<void>;
  loadActiveLobby: () => Promise<void>;
  leaveLobby: () => Promise<void>;
  incrementTimer: () => void;
  resetSessionState: () => void;
  loadPendingInvitations: () => Promise<void>;
  acceptInvitation: (invitationId: string) => Promise<void>;
  declineInvitation: (invitationId: string) => Promise<void>;
  inviteFriends: (usernames: string[]) => Promise<void>;
  setActiveTab: (tab: 'map' | 'social' | 'profile') => void;
}

let timerInterval: any = null;

export const useDetoxStore = create<DetoxSessionState>((set, get) => ({
  activeSessionId: null,
  sessionStatus: 'IDLE',
  locationName: null,
  durationSeconds: 0,
  earnedPoints: 0,
  message: null,
  activeLobby: null,
  isLoading: false,
  error: null,
  activeTab: 'map',

  setActiveTab: (tab) => set({ activeTab: tab }),

  startSession: async (locationId: string, latitude: number, longitude: number, name: string, bssids: string[]) => {
    set({ isLoading: true, error: null, message: null });
    try {
      const res = await startDetoxSession(locationId, latitude, longitude, bssids);
      set({
        activeSessionId: res.sessionId,
        sessionStatus: 'ACTIVE',
        locationName: name,
        durationSeconds: 0,
        isLoading: false,
        activeTab: 'social',
      });

      // Start timer interval on client side for responsive rendering
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        get().incrementTimer();
      }, 1000);
    } catch (e: any) {
      console.error('Error starting session:', e);
      const errMsg = e.response?.data || e.message || 'Ошибка запуска сессии';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg);
    }
  },

  pauseSession: async () => {
    set({ isLoading: true, error: null });
    try {
      await pauseDetoxSession();
      set({ sessionStatus: 'PAUSED', isLoading: false });
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    } catch (e: any) {
      console.error('Error pausing session:', e);
      const errMsg = e.response?.data || e.message || 'Ошибка приостановки сессии';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg);
    }
  },

  resumeSession: async () => {
    set({ isLoading: true, error: null });
    try {
      const msg = await resumeDetoxSession();
      if (msg.includes('провалена')) {
        set({ sessionStatus: 'FAILED', message: msg, activeSessionId: null, isLoading: false });
        if (timerInterval) clearInterval(timerInterval);
      } else {
        set({ sessionStatus: 'ACTIVE', isLoading: false });
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
          get().incrementTimer();
        }, 1000);
      }
    } catch (e: any) {
      console.error('Error resuming session:', e);
      const errMsg = e.response?.data || e.message || 'Ошибка возобновления сессии';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg);
    }
  },

  stopSession: async () => {
    set({ isLoading: true, error: null });
    try {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      const res = await stopDetoxSession();
      set({
        sessionStatus: 'COMPLETED',
        earnedPoints: res.earnedPoints,
        message: res.message,
        activeSessionId: null,
        isLoading: false,
      });

      // Reload user profile to fetch updated scores/plants
      useUserStore.getState().loadProfile();
      if (get().activeLobby) {
        get().refreshLobbyStatus();
      }

      return res;
    } catch (e: any) {
      console.error('Error stopping session:', e);
      const errMsg = e.response?.data || e.message || 'Ошибка завершения сессии';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg);
    }
  },

  createNewLobby: async (accumulateToShared: boolean) => {
    set({ isLoading: true, error: null });
    try {
      const lobby = await createLobby(accumulateToShared);
      set({ activeLobby: lobby, isLoading: false });
    } catch (e: any) {
      console.error('Error creating lobby:', e);
      set({ error: e.message || 'Ошибка создания лобби', isLoading: false });
      throw e;
    }
  },

  joinExistingLobby: async (code: string) => {
    set({ isLoading: true, error: null });
    try {
      const lobby = await joinLobby(code);
      set({ activeLobby: lobby, isLoading: false });
    } catch (e: any) {
      console.error('Error joining lobby:', e);
      const errMsg = e.response?.data || e.message || 'Ошибка входа в лобби';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg);
    }
  },

  refreshLobbyStatus: async () => {
    const lobby = get().activeLobby;
    if (!lobby) return;
    try {
      const updated = await getLobbyStatus(lobby.lobbyId);
      set({ activeLobby: updated });
    } catch (e) {
      console.error('Error refreshing lobby status:', e);
    }
  },

  loadActiveLobby: async () => {
    set({ isLoading: true, error: null });
    try {
      const lobby = await getMyLobby();
      set({ activeLobby: lobby, isLoading: false });
    } catch (e: any) {
      console.error('Error loading active lobby:', e);
      set({ isLoading: false });
    }
  },

  leaveLobby: async () => {
    set({ isLoading: true, error: null });
    try {
      await apiLeaveLobby();
      set({ activeLobby: null, isLoading: false });
    } catch (e: any) {
      console.error('Error leaving lobby:', e);
      set({ error: e.message || 'Ошибка выхода из лобби', isLoading: false });
      throw e;
    }
  },

  incrementTimer: () => {
    set((state) => ({ durationSeconds: state.durationSeconds + 1 }));
  },

  resetSessionState: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    set({
      activeSessionId: null,
      sessionStatus: 'IDLE',
      locationName: null,
      durationSeconds: 0,
      earnedPoints: 0,
      message: null,
      error: null,
    });
  },

  pendingInvitations: [],

  loadPendingInvitations: async () => {
    try {
      const data = await fetchPendingInvitations();
      set({ pendingInvitations: data });
    } catch (e) {
      console.error('Error loading pending invitations:', e);
    }
  },

  acceptInvitation: async (invitationId: string) => {
    set({ isLoading: true, error: null });
    try {
      const lobby = await respondToInvitation(invitationId, true);
      set({ activeLobby: lobby, isLoading: false });
      get().loadPendingInvitations();
    } catch (e: any) {
      set({ error: e.message || 'Ошибка принятия приглашения', isLoading: false });
      throw e;
    }
  },

  declineInvitation: async (invitationId: string) => {
    set({ isLoading: true, error: null });
    try {
      await respondToInvitation(invitationId, false);
      set({ isLoading: false });
      get().loadPendingInvitations();
    } catch (e: any) {
      set({ error: e.message || 'Ошибка отклонения приглашения', isLoading: false });
      throw e;
    }
  },

  inviteFriends: async (usernames: string[]) => {
    const lobby = get().activeLobby;
    if (!lobby) throw new Error('Нет активной встречи (создайте лобби сначала)');
    set({ isLoading: true, error: null });
    try {
      await inviteFriendsToLobby(lobby.lobbyId, usernames);
      set({ isLoading: false });
    } catch (e: any) {
      set({ error: e.message || 'Ошибка отправки приглашения', isLoading: false });
      throw e;
    }
  },
}));
