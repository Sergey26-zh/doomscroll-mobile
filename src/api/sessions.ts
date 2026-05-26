import { API } from './locations';

export interface StartSessionResponseDto {
  sessionId: string;
  status: string;
  message: string;
}

export interface EndSessionResponseDto {
  sessionId: string;
  durationMinutes: number;
  earnedPoints: number;
  message: string;
}

export async function startDetoxSession(
  locationId: string,
  latitude: number,
  longitude: number,
  visibleBssids: string[]
): Promise<StartSessionResponseDto> {
  const response = await API.post('/sessions/start', {
    locationId,
    latitude,
    longitude,
    visibleBssids,
  });
  return response.data;
}

export async function pauseDetoxSession(): Promise<string> {
  const response = await API.post('/sessions/pause');
  return response.data;
}

export async function resumeDetoxSession(): Promise<string> {
  const response = await API.post('/sessions/resume');
  return response.data;
}

export async function stopDetoxSession(): Promise<EndSessionResponseDto> {
  const response = await API.post('/sessions/stop');
  return response.data;
}
