import { create } from 'zustand';

import {
  LocationDto,
} from '../types/location';

interface LocationState {

  locations: LocationDto[];

  selectedLocation:
    LocationDto | null;

  setLocations: (
    locations: LocationDto[]
  ) => void;

  setSelectedLocation: (
    location: LocationDto | null
  ) => void;
}

export const useLocationStore =
  create<LocationState>((set) => ({

    locations: [],

    selectedLocation: null,

    setLocations: (locations) =>
      set({ locations }),

    setSelectedLocation: (location) =>
      set({
        selectedLocation: location,
      }),

}));