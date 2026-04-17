'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 8);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, points]);

  return null;
}

function markerIcon(previewUrl) {
  return L.divIcon({
    className: 'thumb-marker-wrap',
    html: `<div class="thumb-marker"><img src="${previewUrl}" alt=""/></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -20],
  });
}

const clusterIcon = (cluster) =>
  L.divIcon({
    html: `<span>${cluster.getChildCount()}</span>`,
    className: 'cluster-count-marker',
    iconSize: L.point(44, 44, true),
  });

export default function PhotoMap({ points, apiBase, maxMarkers = 1200 }) {
  const visiblePoints = useMemo(() => points.slice(0, maxMarkers), [points, maxMarkers]);
  const center = useMemo(() => {
    if (!visiblePoints.length) return [20, 0];
    const lat = visiblePoints.reduce((sum, p) => sum + p.latitude, 0) / visiblePoints.length;
    const lng = visiblePoints.reduce((sum, p) => sum + p.longitude, 0) / visiblePoints.length;
    return [lat, lng];
  }, [visiblePoints]);

  if (!points.length) {
    return <p className="empty">这些照片里没有 GPS 信息，无法在地图上展示。</p>;
  }

  return (
    <section className="map-panel map-real">
      <p className="map-note">
        地图标记：已显示 {visiblePoints.length} / 共 {points.length}。聚合圆点上的数字表示该区域照片数量。
      </p>
      <div className="leaflet-wrapper">
        <MapContainer center={center} zoom={2} minZoom={2} scrollWheelZoom className="leaflet-canvas">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <FitBounds points={visiblePoints} />
          <MarkerClusterGroup chunkedLoading iconCreateFunction={clusterIcon}>
            {visiblePoints.map((p) => {
              const previewUrl = `${apiBase}/api/preview?path=${encodeURIComponent(p.path)}`;
              return (
                <Marker key={`${p.path}-${p.latitude}-${p.longitude}`} position={[p.latitude, p.longitude]} icon={markerIcon(previewUrl)}>
                  <Popup>
                    <div className="map-popup">
                      <img src={previewUrl} alt={p.filename} />
                      <strong>{p.filename}</strong>
                      <span>{p.capturedDate || 'Unknown date'}</span>
                      <span>{p.cameraModel || 'Unknown camera'}</span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </section>
  );
}
