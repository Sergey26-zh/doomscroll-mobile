import { create } from 'zustand';
import {
  fetchUserProfile,
  updateAirOutStatus,
  fetchFriendsList,
  fetchIncomingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
  fetchMyRewards,
  UserProfileDto,
  FriendProfileDto,
  RewardResponseDto,
  ActivityDayDto,
  fetchUserActivity,
} from '../api/users';

interface UserState {
  profile: UserProfileDto | null;
  friends: FriendProfileDto[];
  incomingRequests: FriendProfileDto[];
  rewards: RewardResponseDto[];
  activity: ActivityDayDto[];
  isLoadingProfile: boolean;
  isLoadingFriends: boolean;
  isLoadingRewards: boolean;
  isLoadingActivity: boolean;
  error: string | null;

  loadProfile: () => Promise<void>;
  toggleWalkReady: (status: string) => Promise<void>;
  loadFriends: () => Promise<void>;
  sendRequest: (username: string) => Promise<string>;
  acceptRequest: (username: string) => Promise<string>;
  removeFriendship: (username: string) => Promise<string>;
  loadRewards: () => Promise<void>;
  loadActivity: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  friends: [],
  incomingRequests: [],
  rewards: [],
  activity: [],
  isLoadingProfile: false,
  isLoadingFriends: false,
  isLoadingRewards: false,
  isLoadingActivity: false,
  error: null,

  loadProfile: async () => {
    set({ isLoadingProfile: true, error: null });
    try {
      const profile = await fetchUserProfile();
      set({ profile, isLoadingProfile: false });
      // Trigger background load of user activity stats
      get().loadActivity().catch(err => console.error(err));
    } catch (e: any) {
      console.error('Error loading user profile:', e);
      set({ error: e.message || 'Ошибка загрузки профиля', isLoadingProfile: false });
    }
  },

  toggleWalkReady: async (status: string) => {
    try {
      await updateAirOutStatus(status);
      const currentProfile = get().profile;
      if (currentProfile) {
        set({ profile: { ...currentProfile, status, readyToAirOut: status !== 'busy' } });
      }
    } catch (e: any) {
      console.error('Error updating walk ready status:', e);
    }
  },

  loadFriends: async () => {
    set({ isLoadingFriends: true });
    try {
      const friends = await fetchFriendsList();
      const incomingRequests = await fetchIncomingRequests();
      set({ friends, incomingRequests, isLoadingFriends: false });
    } catch (e: any) {
      console.error('Error loading friends list:', e);
      set({ isLoadingFriends: false });
    }
  },

  sendRequest: async (username: string) => {
    try {
      const result = await sendFriendRequest(username);
      return result;
    } catch (e: any) {
      const errMsg = e.response?.data || e.message || 'Ошибка отправки заявки';
      throw new Error(errMsg);
    }
  },

  acceptRequest: async (username: string) => {
    try {
      const result = await acceptFriendRequest(username);
      await get().loadFriends();
      return result;
    } catch (e: any) {
      const errMsg = e.response?.data || e.message || 'Ошибка принятия заявки';
      throw new Error(errMsg);
    }
  },

  removeFriendship: async (username: string) => {
    try {
      const result = await removeFriend(username);
      await get().loadFriends();
      return result;
    } catch (e: any) {
      const errMsg = e.response?.data || e.message || 'Ошибка удаления связи';
      throw new Error(errMsg);
    }
  },

  loadRewards: async () => {
    set({ isLoadingRewards: true });
    try {
      const rewards = await fetchMyRewards();
      set({ rewards, isLoadingRewards: false });
    } catch (e: any) {
      console.error('Error loading rewards:', e);
      set({ isLoadingRewards: false });
    }
  },

  loadActivity: async () => {
    set({ isLoadingActivity: true });
    try {
      const activity = await fetchUserActivity();
      set({ activity, isLoadingActivity: false });
    } catch (e: any) {
      console.error('Error loading activity:', e);
      set({ isLoadingActivity: false });
    }
  },
}));
