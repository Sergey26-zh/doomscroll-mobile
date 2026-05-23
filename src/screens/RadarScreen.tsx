import React, {
  useEffect,
  useState,
} from 'react';

import {
  View,
  StyleSheet,
} from 'react-native';

import * as Location from 'expo-location';

import { WebView } from 'react-native-webview';

import {
  fetchNearbyLocations,
} from '../api/locations';

export default function RadarScreen() {

  const [html, setHtml] =
    useState('');

  useEffect(() => {
    loadMap();
  }, []);

  async function loadMap() {

    try {

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        return;
      }

      const current =
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.Highest,
        });

      const latitude =
        current.coords.latitude;

      const longitude =
        current.coords.longitude;

      console.log(
        'USER:',
        latitude,
        longitude
      );

      const locations =
        await fetchNearbyLocations(
          latitude,
          longitude
        );

      console.log(
        'LOCATIONS:',
        locations
      );

      const locationsJson =
        JSON.stringify(locations);

      const mapHtml = `
        <!DOCTYPE html>

        <html>

        <head>

          <meta
            name="viewport"
            content="
              width=device-width,
              initial-scale=1.0,
              maximum-scale=1.0,
              user-scalable=no
            "
          />

          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet/dist/leaflet.css"
          />

          <style>

            html,
            body,
            #map {
              height: 100%;
              margin: 0;
              padding: 0;
              background: #111827;
            }

            .leaflet-popup-content-wrapper {

              background: #1f2937;

              color: white;

              border-radius: 16px;

              padding: 4px;
            }

            .leaflet-popup-tip {
              background: #1f2937;
            }

            .popup-title {

              font-size: 18px;

              font-weight: bold;

              margin-bottom: 8px;
            }

            .popup-description {

              font-size: 14px;

              opacity: 0.8;

              margin-bottom: 12px;
            }

            .popup-button {

              width: 100%;

              border: none;

              padding: 12px;

              border-radius: 12px;

              background: #22c55e;

              color: white;

              font-size: 16px;

              font-weight: bold;
            }

          </style>

        </head>

        <body>

          <div id="map"></div>

          <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

          <script>

            const map =
              L.map('map')
              .setView(
                [${latitude}, ${longitude}],
                11
              );

            L.tileLayer(
              'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
              {
                attribution:
                  'OpenStreetMap'
              }
            ).addTo(map);

            // USER

            L.circleMarker(
              [${latitude}, ${longitude}],
              {
                radius: 18,

                color: '#60a5fa',

                fillColor: '#3b82f6',

                fillOpacity: 1,

                weight: 5
              }
            ).addTo(map);

            // LOCATIONS

            const locations =
              ${locationsJson};

            locations.forEach(location => {

              const lat =
                Number(location.latitude);

              const lon =
                Number(location.longitude);

              const isCommercial =
                location.type === 'COMMERCIAL';

              const color =
                isCommercial
                  ? '#facc15'
                  : '#22c55e';

              const marker =
                L.circleMarker(
                  [lat, lon],
                  {
                    radius: 20,

                    color: color,

                    fillColor: color,

                    fillOpacity: 1,

                    weight: 5
                  }
                )
                .addTo(map);

              const averageCheck =
                location.averageCheck
                  ? 'Средний чек: ₽' +
                    location.averageCheck
                  : 'Бесплатная локация';

              marker.bindPopup(
                \`
                  <div>

                    <div class="popup-title">
                      \${location.name}
                    </div>

                    <div class="popup-description">
                      \${location.description}
                    </div>

                    <div
                      style="
                        margin-bottom: 14px;
                        font-size: 14px;
                        opacity: 0.7;
                      "
                    >
                      \${averageCheck}
                    </div>

                    <button
                      class="popup-button"
                    >
                      Начать детокс
                    </button>

                  </div>
                \`
              );

            });

          </script>

        </body>

        </html>
      `;

      setHtml(mapHtml);

    } catch (e) {

      console.log(
        'MAP ERROR:',
        e
      );
    }
  }

  return (

    <View style={styles.container}>

      <WebView

        originWhitelist={['*']}

        source={{
          html,
        }}

        javaScriptEnabled={true}

        domStorageEnabled={true}

        style={styles.map}

      />

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#111827',
  },

  map: {
    flex: 1,
  },

});