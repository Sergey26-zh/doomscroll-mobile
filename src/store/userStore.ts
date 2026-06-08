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
  updateUserProfile,
  UpdateUserProfileDto,
  searchUserByFriendCode,
  FriendSearchResultDto,
  fetchFriendSuggestions,
  uploadProfileAvatar,
  removeProfileAvatar,
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
  updateProfile: (payload: UpdateUserProfileDto) => Promise<void>;
  uploadAvatar: (uri: string, mimeType?: string, fileName?: string) => Promise<void>;
  removeAvatar: () => Promise<void>;
  searchByFriendCode: (friendCode: string) => Promise<FriendSearchResultDto>;
  searchFriendSuggestions: (query?: string) => Promise<FriendSearchResultDto[]>;
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

  updateProfile: async (payload: UpdateUserProfileDto) => {
    set({ isLoadingProfile: true, error: null });
    try {
      const profile = await updateUserProfile(payload);
      set({ profile, isLoadingProfile: false });
    } catch (e: any) {
      const errMsg = e.response?.data || e.message || 'Ошибка обновления профиля';
      set({ error: errMsg, isLoadingProfile: false });
      throw new Error(errMsg);
    }
  },

  uploadAvatar: async (uri, mimeType, fileName) => {
    set({ isLoadingProfile: true, error: null });
    try {
      const profile = await uploadProfileAvatar(uri, mimeType, fileName);
      set({ profile, isLoadingProfile: false });
    } catch (e: any) {
      set({ isLoadingProfile: false });
      throw new Error(e.response?.data || e.message || 'Не удалось загрузить фото');
    }
  },

  removeAvatar: async () => {
    const profile = await removeProfileAvatar();
    set({ profile });
  },

  searchByFriendCode: async (friendCode: string) => {
    try {
      return await searchUserByFriendCode(friendCode);
    } catch (e: any) {
      const errMsg = e.response?.data || e.message || 'Пользователь не найден';
      throw new Error(errMsg);
    }
  },

  searchFriendSuggestions: async (query?: string) => {
    try {
      return await fetchFriendSuggestions(query);
    } catch (e: any) {
      const errMsg = e.response?.data || e.message || 'Не удалось загрузить подсказки';
      throw new Error(errMsg);
    }
  },

  toggleWalkReady: async (status: string) => {
    try {
      await updateAirOutStatus(status);
      const currentProfile = get().profile;
      if (currentProfile) {
        set({ profile: { ...currentProfile, status, readyToAirOut: status === 'walking' || status === 'transit' } });
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
