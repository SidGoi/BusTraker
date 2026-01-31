import React, { useImperativeHandle, forwardRef, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';

const DESTINATION = { lat: 22.33704803781658, lng: 73.24857675582182 };

const OSMMap = forwardRef(({ markers, onMarkerPress }: any, ref) => {
  const webviewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: any) => {
      const script = `map.flyTo([${region.latitude}, ${region.longitude}], 16, { animate: true, duration: 1.5 });`;
      webviewRef.current?.injectJavaScript(script);
    }
  }));

  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; background: #0f172a; }
        
        /* Standard Marker Pins */
        .custom-pin {
          width: 30px; height: 30px; border-radius: 50% 50% 50% 0;
          position: absolute; transform: rotate(-45deg);
          left: 50%; top: 50%; margin: -15px 0 0 -15px;
          border: 2px solid white; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .pin-text { transform: rotate(45deg); color: white; font-weight: bold; font-size: 10px; font-family: sans-serif; }

        /* Red LED Glowing Destination Marker */
        .led-red {
          width: 20px; height: 20px;
          background-color: #ff0000;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 15px #ff0000;
          animation: pulse-red 2s infinite;
        }

        @keyframes pulse-red {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(255, 0, 0, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${DESTINATION.lat}, ${DESTINATION.lng}], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        var markerGroup = L.featureGroup().addTo(map);
        var destCoords = [${DESTINATION.lat}, ${DESTINATION.lng}];

        // CREATE RED LED DESTINATION MARKER (No Image)
        var ledIcon = L.divIcon({
          className: 'custom-led-icon',
          html: "<div class='led-red'></div>",
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        L.marker(destCoords, { icon: ledIcon }).addTo(map).bindPopup("Final Destination");

        function updateMarkers(data) {
          markerGroup.clearLayers();
          if (!data || data.length === 0) return;

          data.forEach(m => {
            var icon = L.divIcon({
              className: 'custom-div-icon',
              html: "<div class='custom-pin' style='background:"+ m.color +"'><span class='pin-text'>"+ (m.title || '') +"</span></div>",
              iconSize: [30, 42], iconAnchor: [15, 42]
            });
            var marker = L.marker([m.latitude, m.longitude], { icon: icon }).addTo(markerGroup);
            marker.on('click', () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: m.id }));
            });
          });

          var bounds = markerGroup.getBounds();
          bounds.extend(destCoords);
          map.fitBounds(bounds, { padding: [70, 70], animate: true, duration: 1 });
        }

        window.addEventListener('message', (e) => {
          const payload = JSON.parse(e.data);
          if (payload.type === 'update') updateMarkers(payload.markers);
        });

        updateMarkers(${JSON.stringify(markers)});
      </script>
    </body>
    </html>
  `;

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: mapHTML }}
        scrollEnabled={false}
        onMessage={(event) => {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'markerPress') onMarkerPress?.(data.id);
        }}
      />
    </View>
  );
});

export default OSMMap;