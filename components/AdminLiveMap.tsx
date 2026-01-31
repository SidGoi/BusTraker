import React from 'react';
import OSMMap from './OSMMap';

export default function AdminLiveMap({ buses, mapRef, onBusPress }: any) {
  const getStatusColor = (lastUpdate?: string) => {
    if (!lastUpdate) return '#64748b'; // Inactive - Grey
    const diff = (new Date().getTime() - new Date(lastUpdate).getTime()) / 60000;
    return diff <= 3 ? '#10b981' : '#64748b'; // Emerald if Active, Grey if Inactive
  };

  const markers = buses
    .filter((b: any) => b.location && b.location.length === 2)
    .map((b: any) => ({
      id: b.busId,
      latitude: b.location[0],
      longitude: b.location[1],
      title: b.busId.toString(),
      color: getStatusColor(b.lastUpdate)
    }));

  return <OSMMap ref={mapRef} markers={markers} onMarkerPress={(id: any) => {
    const bus = buses.find((b: any) => b.busId === id);
    if (bus) onBusPress(bus);
  }} />;
}