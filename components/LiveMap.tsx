import React, { useEffect, useState } from 'react';
import OSMMap from './OSMMap';
import * as Location from 'expo-location';

export default function LiveMap() {
  const [location, setLocation] = useState<any>(null);

  useEffect(() => {
    const sub = Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10 },
      (loc) => setLocation(loc.coords)
    );
    return () => sub.then(s => s.remove());
  }, []);

  const markers = location ? [{
    id: 'driver',
    latitude: location.latitude,
    longitude: location.longitude,
    title: 'ME',
    color: '#3b82f6'
  }] : [];

  return <OSMMap markers={markers} />;
}