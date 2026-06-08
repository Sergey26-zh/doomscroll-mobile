import axios from 'axios';
import { LocationDto } from '../types/location';
import { useAuthStore } from '../store/authStore';

export const API_BASE_URL = 'http://192.168.0.30:8080/api';

export const API = axios.create({ baseURL: API_BASE_URL });

// Interceptor to inject JWT token
API.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isLoggingOut = false;
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && useAuthStore.getState().token && !isLoggingOut) {
      isLoggingOut = true;
      try {
        await useAuthStore.getState().logout();
      } finally {
        isLoggingOut = false;
      }
    }
    return Promise.reject(error);
  }
);

export async function fetchNearbyLocations(
  lat: number,
  lon: number,
  popularOnly?: boolean
): Promise<LocationDto[]> {
  const response = await API.get('/locations/nearby', {
    params: {
      lat,
      lon,
      radius: 300000,
      popularOnly,
    },
  });

  return response.data;
}

export async function setLocationFavorite(locationId: string, favorite: boolean): Promise<boolean> {
  const response = await API.post(`/locations/${locationId}/favorite`, null, {
    params: { favorite },
  });
  return !!response.data.favorite;
}
