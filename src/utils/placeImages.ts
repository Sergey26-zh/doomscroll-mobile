import { ImageSourcePropType } from 'react-native';

const PLACE_IMAGES: Record<string, ImageSourcePropType> = {
  cafe: require('../../image/cafe.png'),
  dostoprimechatelnoct: require('../../image/dostoprimechatelnoct.png'),
  dvor: require('../../image/dvor.png'),
  most: require('../../image/most.png'),
  naberezhnya: require('../../image/naberezhnya.png'),
  park: require('../../image/park.png'),
  ploshad: require('../../image/ploshad.png'),
  prostranstvo: require('../../image/prostranstvo.png'),
  street: require('../../image/street.png'),
};

const FALLBACK_IMAGE = PLACE_IMAGES.prostranstvo;

function normalizePlaceName(name?: string | null) {
  return (name || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getPlaceImage(placeName?: string | null): ImageSourcePropType {
  const name = normalizePlaceName(placeName);

  if (name.includes('cafe') || name.includes('coffee') || name.includes('каф') || name.includes('кофе')) {
    return PLACE_IMAGES.cafe;
  }
  if (name.includes('парк') || name.includes('сад') || name.includes('park')) {
    return PLACE_IMAGES.park;
  }
  if (name.includes('набереж') || name.includes('озер') || name.includes('река') || name.includes('water')) {
    return PLACE_IMAGES.naberezhnya;
  }
  if (name.includes('двор') || name.includes('courtyard')) {
    return PLACE_IMAGES.dvor;
  }
  if (name.includes('мост') || name.includes('bridge')) {
    return PLACE_IMAGES.most;
  }
  if (name.includes('площад') || name.includes('square')) {
    return PLACE_IMAGES.ploshad;
  }
  if (name.includes('улиц') || name.includes('street')) {
    return PLACE_IMAGES.street;
  }
  if (name.includes('достопр') || name.includes('памят') || name.includes('sight')) {
    return PLACE_IMAGES.dostoprimechatelnoct;
  }

  return FALLBACK_IMAGE;
}
