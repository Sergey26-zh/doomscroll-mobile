export type LocationType =
  | 'COMMERCIAL'
  | 'SOCIAL'
  | 'SPACE'
  | 'EMBANKMENT'
  | 'SQUARE'
  | 'STREET'
  | 'PARK'
  | 'COURTYARD'
  | 'BRIDGE'
  | 'MONUMENT'
  | 'SIGHT'
  | 'EVENT';

export interface RewardPolicyDto {
  requiredMinutes: number;
  rewardText: string;
}

export interface LocationDto {

  id: string;

  name: string;

  type: LocationType;

  latitude: number;

  longitude: number;

  description: string;

  averageCheck?: number;

  photoUrl?: string;

  category?: string;

  bssidList?: string[];

  isPopular?: boolean;

  rewardPolicies?: RewardPolicyDto[];
}