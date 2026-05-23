export type LocationType =
  | 'COMMERCIAL'
  | 'SOCIAL';

export interface LocationDto {

  id: string;

  name: string;

  type: LocationType;

  latitude: number;

  longitude: number;

  description: string;

  averageCheck?: number;

  photoUrl?: string;
}