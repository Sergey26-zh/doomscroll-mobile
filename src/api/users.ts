import { API } from './locations';

export interface UserProfileDto {
  username: string;
  email: string;
  socialRating: number;
  readyToAirOut: boolean;
  personalPlantXp: number;
  personalPlantStatus: string;
  status: string;
}

export interface FriendProfileDto {
  username: string;
  socialRating: number;
  personalPlantStatus: string;
  readyToAirOut: boolean;
  status: string;
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
