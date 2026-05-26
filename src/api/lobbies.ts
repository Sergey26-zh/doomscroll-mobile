import { API } from './locations';

export interface LobbyStatusResponseDto {
  lobbyId: string;
  code: string;
  sharedPlantStatus: string;
  sharedPlantXp: number;
  membersCount: number;
  membersUsernames: string[];
  accumulateToShared: boolean;
}

export async function createLobby(accumulateToShared: boolean): Promise<LobbyStatusResponseDto> {
  const response = await API.post('/lobbies/create', { accumulateToShared });
  return response.data;
}

export async function joinLobby(code: string): Promise<LobbyStatusResponseDto> {
  const response = await API.post('/lobbies/join', null, {
    params: { code },
  });
  return response.data;
}

export async function leaveLobby(): Promise<void> {
  await API.post('/lobbies/leave');
}

export async function getMyLobby(): Promise<LobbyStatusResponseDto | null> {
  const response = await API.get('/lobbies/my');
  if (response.status === 204) {
    return null;
  }
  return response.data;
}

export async function getLobbyStatus(lobbyId: string): Promise<LobbyStatusResponseDto> {
  const response = await API.get(`/lobbies/status/${lobbyId}`);
  return response.data;
}

export interface LobbyInvitationDto {
  invitationId: string;
  lobbyId: string;
  lobbyCode: string;
  inviterUsername: string;
  status: string;
}

export async function inviteFriendsToLobby(lobbyId: string, usernames: string[]): Promise<string> {
  const response = await API.post('/lobbies/invite', usernames, {
    params: { lobbyId },
  });
  return response.data;
}

export async function fetchPendingInvitations(): Promise<LobbyInvitationDto[]> {
  const response = await API.get('/lobbies/invitations/pending');
  return response.data;
}

export async function respondToInvitation(
  invitationId: string,
  accept: boolean
): Promise<LobbyStatusResponseDto | null> {
  const response = await API.post(`/lobbies/invitations/${invitationId}/respond`, null, {
    params: { accept },
  });
  return response.data;
}
