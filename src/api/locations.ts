import axios from 'axios';

import {
  LocationDto,
} from '../types/location';

const API = axios.create({

  baseURL:
    'http://192.168.0.30:8080/api',
});

export async function fetchNearbyLocations(
  lat: number,
  lon: number
): Promise<LocationDto[]> {

  const response =
    await API.get(
      '/locations/nearby',
      {
        params: {
          lat,
          lon,
          radius: 300000,
        },
      }
    );

  return response.data;
}