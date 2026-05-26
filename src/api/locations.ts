import axios from 'axios';
import { LocationDto } from '../types/location';
import { useAuthStore } from '../store/authStore';

export const API = axios.create({
  baseURL: 'http://192.168.0.30:8080/api',
});

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