import { Platform } from 'react-native';
import * as Location from 'expo-location';

// Dynamically require react-native-wifi-reborn to prevent crash in Expo Go / iOS / Web
let WifiManager: any = null;
if (Platform.OS === 'android') {
  try {
    const wifiModule = require('react-native-wifi-reborn');
    const actualWifi = wifiModule.default || wifiModule;
    if (actualWifi && typeof actualWifi.reScanAndLoadWifiList === 'function') {
      WifiManager = actualWifi;
    } else {
      console.warn('react-native-wifi-reborn native module is not linked or unavailable');
    }
  } catch (e) {
    console.warn('react-native-wifi-reborn is not available in this environment', e);
  }
}

/**
 * Scan for visible BSSIDs (Wi-Fi MAC addresses).
 * If scanning is not supported or fails, it returns an empty list.
 */
export async function getRealVisibleBssids(fallbackBssids: string[] = []): Promise<string[]> {
  try {
    // 1. Check/request location permissions (required for Wi-Fi scanning on Android)
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const req = await Location.requestForegroundPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') {
      console.warn('Location permission is required for Wi-Fi scanning.');
      return fallbackBssids;
    }

    // 2. Perform actual scanning if WifiManager is available
    if (Platform.OS === 'android' && WifiManager) {
      console.log('Starting Wi-Fi scan using react-native-wifi-reborn...');
      let list: any[] = [];
      try {
        list = await WifiManager.reScanAndLoadWifiList();
      } catch (scanErr) {
        console.warn('reScanAndLoadWifiList failed (throttled?), trying cached loadWifiList...', scanErr);
        list = await WifiManager.loadWifiList();
      }

      if (list && list.length > 0) {
        // Extract BSSID from each wifi network object (SSID, BSSID, level, capabilities)
        const scannedBssids = list
          .map((net: any) => net.BSSID)
          .filter(Boolean)
          .map((bssid: string) => bssid.toLowerCase());
        
        console.log('Successfully scanned real BSSIDs:', scannedBssids);
        if (scannedBssids.length > 0) {
          return scannedBssids;
        }
      }
    }
  } catch (error) {
    console.error('Error scanning visible Wi-Fi networks:', error);
  }

  // Fallback if scanning returned nothing or is unsupported
  console.log('No real BSSIDs scanned. Returning fallback:', fallbackBssids);
  return fallbackBssids;
}
