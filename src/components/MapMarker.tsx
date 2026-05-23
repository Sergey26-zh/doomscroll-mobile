import React from 'react';

import {
  Marker,
} from 'react-native-maps';

import {
  LocationDto,
} from '../types/location';

interface Props {

  location: LocationDto;

  onPress: () => void;
}

export default function MapMarker({
  location,
  onPress,
}: Props) {

  return (

    <Marker
      coordinate={{
        latitude: location.latitude,
        longitude: location.longitude,
      }}

      pinColor={
        location.type === 'COMMERCIAL'
          ? 'gold'
          : 'green'
      }

      title={location.name}

      description={location.description}

      onPress={onPress}
    />

  );
}