import React, { useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';

const DESTINATION = { lat: 22.33704803781658, lng: 73.24857675582182 };

const OSMMap = forwardRef(({ markers, onMarkerPress }: any, ref) => {
  const webviewRef = useRef<WebView>(null);
  const isLoaded = useRef(false);

  const syncMarkers = () => {
    if (markers && webviewRef.current) {
      const payload = JSON.stringify({ type: 'update', markers });
      webviewRef.current.injectJavaScript(`window.updateMarkers(${payload});`);
    }
  };

  useEffect(() => {
    if (isLoaded.current) syncMarkers();
  }, [markers]);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: any) => {
      // When animating to a specific bus, we set autoFit to false inside JS
      const script = `
        window.autoFit = false; 
        if(window.map){ 
          map.flyTo([${region.latitude}, ${region.longitude}], 17, { animate: true, duration: 1.5 }); 
        }
      `;
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
        #map { height: 100vh; width: 100vw; background: #f0f0f0; }
        .custom-pin {
          width: 24px; height: 24px; border-radius: 50% 50% 50% 0;
          position: absolute; transform: rotate(-45deg);
          left: 50%; top: 50%; margin: -12px 0 0 -12px;
          border: 2px solid white; display: flex; align-items: center; justify-content: center;
        }
        .pin-text { transform: rotate(45deg); color: white; font-weight: bold; font-size: 8px; }
        .led-red {
          width: 14px; height: 14px; background: red; border-radius: 50%;
          border: 2px solid white; box-shadow: 0 0 8px red; animation: p 2s infinite;
        }
        @keyframes p { 0% {transform:scale(0.9);} 100% {transform:scale(1.2); opacity:0.5;} }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${DESTINATION.lat}, ${DESTINATION.lng}], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        var markerGroup = L.featureGroup().addTo(map);
        
        window.autoFit = true; // Flag to control auto-zooming
        var firstLoad = true;

        // If user drags or zooms, stop auto-fitting
        map.on('movestart', function() {
           // Only disable if it's a real user interaction, not a flyTo/fitBounds
        });
        
        // Better way to detect user interaction vs programmatic move
        map.on('dragstart zoomstart', function() {
          window.autoFit = false;
        });

        L.marker([${DESTINATION.lat}, ${DESTINATION.lng}], { 
          icon: L.divIcon({ className: '', html: "<div class='led-red'></div>", iconSize: [20, 20] })
        }).addTo(map);

        window.updateMarkers = function(payload) {
          markerGroup.clearLayers();
          if (!payload.markers) return;
          
          payload.markers.forEach(function(m) {
            var icon = L.divIcon({
              className: '',
              html: "<div class='custom-pin' style='background:"+m.color+"'><span class='pin-text'>"+(m.title||'')+"</span></div>",
              iconSize: [30, 30], iconAnchor: [15, 15]
            });
            var marker = L.marker([m.latitude, m.longitude], { icon: icon }).addTo(markerGroup);
            marker.on('click', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: m.id }));
            });
          });

          // ONLY fit bounds if it's the first load OR autoFit is enabled
          if (window.autoFit && markerGroup.getLayers().length > 0) {
            var bounds = markerGroup.getBounds();
            bounds.extend([${DESTINATION.lat}, ${DESTINATION.lng}]);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
          }
        };

        window.ReactNativeWebView.postMessage("ready");
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
        onMessage={(event) => {
          try {
            const msg = event.nativeEvent.data;
            if (msg === "ready") {
              isLoaded.current = true;
              syncMarkers();
            } else {
              const data = JSON.parse(msg);
              if (data.type === 'markerPress') onMarkerPress?.(data.id);
            }
          } catch(e) {}
        }}
      />
    </View>
  );
});

export default OSMMap;