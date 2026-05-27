import React, { useMemo } from 'react';
import { Image, StyleProp, View, ViewStyle } from 'react-native';

interface DiceBearAvatarProps {
  seed?: string | null;
  size: number;
  style?: StyleProp<ViewStyle>;
}

export interface AvatarConfig {
  baseSeed: string;
  top: string;
  hairColor: string;
  eyes: string;
  mouth: string;
  accessories: string;
  clothing: string;
  clothesColor: string;
  skinColor: string;
  backgroundColor: string;
}

const DEFAULT_CONFIG: AvatarConfig = {
  baseSeed: 'doomscroll-user',
  top: 'shortFlat',
  hairColor: '2c1b18',
  eyes: 'default',
  mouth: 'smile',
  accessories: 'none',
  clothing: 'hoodie',
  clothesColor: '65c9ff',
  skinColor: 'ae5d29',
  backgroundColor: 'd1f4e5',
};

const AVATAR_PREFIX = 'avataaars:';

function splitStoredConfig(seed?: string | null) {
  const fallbackSeed = seed || DEFAULT_CONFIG.baseSeed;
  if (!seed?.startsWith(AVATAR_PREFIX)) {
    return { ...DEFAULT_CONFIG, baseSeed: fallbackSeed };
  }

  const params = new URLSearchParams(seed.slice(AVATAR_PREFIX.length));
  return {
    baseSeed: params.get('seed') || DEFAULT_CONFIG.baseSeed,
    top: params.get('top') || DEFAULT_CONFIG.top,
    hairColor: params.get('hairColor') || DEFAULT_CONFIG.hairColor,
    eyes: params.get('eyes') || DEFAULT_CONFIG.eyes,
    mouth: params.get('mouth') || DEFAULT_CONFIG.mouth,
    accessories: params.get('accessories') || DEFAULT_CONFIG.accessories,
    clothing: params.get('clothing') || DEFAULT_CONFIG.clothing,
    clothesColor: params.get('clothesColor') || DEFAULT_CONFIG.clothesColor,
    skinColor: params.get('skinColor') || DEFAULT_CONFIG.skinColor,
    backgroundColor: params.get('backgroundColor') || DEFAULT_CONFIG.backgroundColor,
  };
}

export function avatarConfigToSeed(config: AvatarConfig) {
  const params = new URLSearchParams();
  params.set('seed', config.baseSeed || DEFAULT_CONFIG.baseSeed);
  params.set('top', config.top);
  params.set('hairColor', config.hairColor);
  params.set('eyes', config.eyes);
  params.set('mouth', config.mouth);
  params.set('accessories', config.accessories);
  params.set('clothing', config.clothing);
  params.set('clothesColor', config.clothesColor);
  params.set('skinColor', config.skinColor);
  params.set('backgroundColor', config.backgroundColor);
  return `${AVATAR_PREFIX}${params.toString()}`;
}

export function avatarSeedToConfig(seed?: string | null, username?: string | null): AvatarConfig {
  const parsed = splitStoredConfig(seed);
  return {
    ...parsed,
    baseSeed: parsed.baseSeed || username || DEFAULT_CONFIG.baseSeed,
  };
}

export function getDiceBearAvatarUrl(seed?: string | null, size = 256) {
  const config = splitStoredConfig(seed);
  const params = new URLSearchParams();
  params.set('seed', config.baseSeed);
  params.set('top', config.top);
  params.set('hairColor', config.hairColor);
  params.set('eyes', config.eyes);
  params.set('mouth', config.mouth);
  params.set('clothing', config.clothing);
  params.set('clothesColor', config.clothesColor);
  params.set('skinColor', config.skinColor);
  params.set('backgroundColor', config.backgroundColor);
  params.set('radius', '50');
  params.set('size', String(size));

  if (config.accessories === 'none') {
    params.set('accessoriesProbability', '0');
  } else {
    params.set('accessories', config.accessories);
    params.set('accessoriesProbability', '100');
  }

  return `https://api.dicebear.com/9.x/avataaars/png?${params.toString()}`;
}

export default function DiceBearAvatar({ seed, size, style }: DiceBearAvatarProps) {
  const uri = useMemo(() => getDiceBearAvatarUrl(seed, Math.max(160, size * 3)), [seed, size]);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: '#eef2ff',
        },
        style,
      ]}
    >
      <Image
        source={{ uri }}
        resizeMode="contain"
        style={{
          width: size,
          height: size,
        }}
      />
    </View>
  );
}
