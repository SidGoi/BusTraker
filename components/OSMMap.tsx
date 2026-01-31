import React, { useImperativeHandle, forwardRef, useRef } from "react";
import { WebView } from "react-native-webview";
import { View, StyleSheet } from "react-native";
import { Asset } from "expo-asset";

// Central Destination
const DESTINATION = { lat: 22.33704803781658, lng: 73.24857675582182 };

const OSMMap = forwardRef(({ markers, onMarkerPress }: any, ref) => {
  const webviewRef = useRef<WebView>(null);

  // Resolve the local flag image
  const flagImage = Asset.fromModule(require("../assets/flag.png")).uri;

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: any) => {
      const script = `map.flyTo([${region.latitude}, ${region.longitude}], 16, { animate: true, duration: 1.5 });`;
      webviewRef.current?.injectJavaScript(script);
    },
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
        .custom-pin {
          width: 30px; height: 30px; border-radius: 50% 50% 50% 0;
          position: absolute; transform: rotate(-45deg);
          left: 50%; top: 50%; margin: -15px 0 0 -15px;
          border: 2px solid white; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .pin-text { transform: rotate(45deg); color: white; font-weight: bold; font-size: 10px; font-family: sans-serif; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${DESTINATION.lat}, ${DESTINATION.lng}], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        var markerGroup = L.featureGroup().addTo(map);
        var destCoords = [${DESTINATION.lat}, ${DESTINATION.lng}];

        // Add Final Destination Flag
        var flagIcon = L.icon({
          iconUrl: '${flagImage}',
          iconSize: [45, 45],
          iconAnchor: [22, 45]
        });
        L.marker(destCoords, { icon: flagIcon }).addTo(map).bindPopup("Final Destination");

        function updateMarkers(data) {
          markerGroup.clearLayers();
          if (data.length === 0) return;

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

          // Auto Zoom logic
          var bounds = markerGroup.getBounds();
          bounds.extend(destCoords); // Ensure the flag is always in view
          map.fitBounds(bounds, { padding: [70, 70], animate: true, duration: 1 });
        }

        // Listen for data updates
        window.addEventListener('message', (e) => {
          const payload = JSON.parse(e.data);
          if (payload.type === 'update') updateMarkers(payload.markers);
        });

        // Initial load
        updateMarkers(${JSON.stringify(markers)});
      </script>
    </body>
    </html>
  `;

  // Helper to send data into WebView when props change
  React.useEffect(() => {
    webviewRef.current?.postMessage(
      JSON.stringify({ type: "update", markers }),
    );
  }, [markers]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html: mapHTML }}
        scrollEnabled={false}
        onMessage={(event) => {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === "markerPress") onMarkerPress?.(data.id);
        }}
      />
    </View>
  );
});

export default OSMMap;
