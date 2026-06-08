import { API, API_BASE_URL } from './locations';

export interface UserProfileDto {
  id: string;
  displayName: string;
  username: string;
  email: string;
  friendCode: string;
  avatarSeed: string;
  avatarUrl: string | null;
  socialRating: number;
  readyToAirOut: boolean;
  personalPlantXp: number;
  personalPlantStatus: string;
  status: string;
  geoEnabled: boolean;
  friendsCount: number;
  offlineMinutesWeek: number;
  lastWalkAt: string | null;
  streakDays: number;
  recentMeetings: ProfilePlaceDto[];
  favoritePlaces: ProfilePlaceDto[];
  frequentPlaces: ProfilePlaceDto[];
}

export interface ProfilePlaceDto {
  id: string;
  name: string;
  subtitle: string;
  imageUrl: string | null;
  category: string | null;
  visits: number;
}

export interface FriendProfileDto {
  displayName: string;
  username: string;
  avatarSeed: string;
  socialRating: number;
  personalPlantStatus: string;
  readyToAirOut: boolean;
  status: string;
  avatarUrl: string | null;
}

export interface UpdateUserProfileDto {
  displayName?: string;
  avatarSeed?: string;
  geoEnabled?: boolean;
}

export interface FriendSearchResultDto {
  id: string;
  displayName: string;
  username: string;
  avatarSeed: string;
  avatarUrl: string | null;
}

export interface RewardResponseDto {
  rewardId: string;
  locationName: string;
  code: string;
  rewardText: string;
  expiresAt: string;
}

export async function fetchUserProfile(): Promise<UserProfileDto> {
  const response = await API.get('/users/me');
  return response.data;
}

export async function updateUserProfile(payload: UpdateUserProfileDto): Promise<UserProfileDto> {
  const response = await API.patch('/users/me', payload);
  return response.data;
}

export function resolveAvatarUrl(avatarUrl?: string | null) {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  if (avatarUrl.startsWith('/api/')) {
    return `${API_BASE_URL.replace(/\/api$/, '')}${avatarUrl}`;
  }
  return `${API_BASE_URL}${avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`}`;
}

export async function uploadProfileAvatar(uri: string, mimeType = 'image/jpeg', fileName = 'avatar.jpg'): Promise<UserProfileDto> {
  const form = new FormData();
  form.append('file', { uri, type: mimeType, name: fileName } as any);
  const response = await API.post('/users/me/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function removeProfileAvatar(): Promise<UserProfileDto> {
  const response = await API.delete('/users/me/avatar');
  return response.data;
}

export async function searchUserByFriendCode(friendCode: string): Promise<FriendSearchResultDto> {
  const response = await API.get('/users/search', {
    params: { friendCode: friendCode.trim().toUpperCase() },
  });
  return response.data;
}

export async function updateAirOutStatus(status: string): Promise<string> {
  const response = await API.post('/users/me/status', null, {
    params: { status },
  });
  return response.data;
}

export async function fetchFriendsList(): Promise<FriendProfileDto[]> {
  const response = await API.get('/friends/list');
  return response.data;
}

export async function fetchFriendSuggestions(query?: string): Promise<FriendSearchResultDto[]> {
  const response = await API.get('/friends/suggestions', {
    params: query ? { query } : undefined,
  });
  return response.data;
}

export async function fetchIncomingRequests(): Promise<FriendProfileDto[]> {
  const response = await API.get('/friends/requests/incoming');
  return response.data;
}

export async function sendFriendRequest(targetUsername: string): Promise<string> {
  const response = await API.post('/friends/request', null, {
    params: { targetUsername },
  });
  return response.data;
}

export async function acceptFriendRequest(targetUsername: string): Promise<string> {
  const response = await API.post('/friends/accept', null, {
    params: { targetUsername },
  });
  return response.data;
}

export async function removeFriend(targetUsername: string): Promise<string> {
  const response = await API.delete('/friends/remove', {
    params: { targetUsername },
  });
  return response.data;
}

export async function fetchMyRewards(): Promise<RewardResponseDto[]> {
  const response = await API.get('/rewards/my');
  return response.data;
}

export interface FriendLocationDto {
  username: string;
  latitude: number;
  longitude: number;
  lastUpdated: string;
  status: string;
}

export async function fetchFriendsLocations(): Promise<FriendLocationDto[]> {
  const response = await API.get('/friends/map');
  return response.data;
}

export interface ActivityDayDto {
  date: string;
  points: number;
}

export async function fetchUserActivity(): Promise<ActivityDayDto[]> {
  const response = await API.get('/users/me/activity');
  return response.data;
}
