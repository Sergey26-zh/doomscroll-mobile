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

  distanceMeters?: number;

  address?: string;

  description: string;

  shortDescription?: string;

  visualCategory?: string;

  coverImageKey?: string;

  coverImageUrl?: string;

  isPartner?: boolean;

  rewardType?: string;

  rewardDescription?: string;

  reward?: {
    type: string;
    text: string;
    requiredMinutes?: number | null;
  } | null;

  averageCheck?: number;

  photoUrl?: string;

  category?: string;

  tags?: string[];

  bssidList?: string[];

  isPopular?: boolean;

  rewardPolicies?: RewardPolicyDto[];

  favorite?: boolean;
}
