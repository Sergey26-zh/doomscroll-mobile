import { create } from 'zustand';
import { LocationDto } from '../types/location';
import { FriendLocationDto } from '../api/users';

interface LocationState {
  locations: LocationDto[];
  selectedLocation: LocationDto | null;
  friendsLocations: FriendLocationDto[];
  setLocations: (locations: LocationDto[]) => void;
  setSelectedLocation: (location: LocationDto | null) => void;
  setFriendsLocations: (friendsLocations: FriendLocationDto[]) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  locations: [],
  selectedLocation: null,
  friendsLocations: [],
  setLocations: (locations) => set({ locations }),
  setSelectedLocation: (location) => set({ selectedLocation: location }),
  setFriendsLocations: (friendsLocations) => set({ friendsLocations }),
}));