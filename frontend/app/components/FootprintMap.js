'use client';

import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

function FitBounds({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 11);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
    map.fitBounds(bounds, { padding: [36, 36] });
  }, [map, points]);

  return null;
}

function endpointIcon(label, color) {
  return L.divIcon({
    className: 'track-endpoint-wrap',
    html: `<div class="track-endpoint" style="background:${color}">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function EndpointPopup({ point, index, apiBase, titlePrefix }) {
  const previewUrl = `${apiBase}/api/preview?path=${encodeURIComponent(point.path)}`;
  return (
    <Popup>
      <div className="map-popup">
        <img src={previewUrl} alt={point.filename} />
        <strong>{titlePrefix} #{index + 1} {point.filename}</strong>
        <span>{point.capturedAt || point.capturedDate || 'Unknown time'}</span>
        <span>{point.cameraModel || 'Unknown camera'} · {point.lensModel || 'Unknown lens'}</span>
      </div>
    </Popup>
  );
}

export default function FootprintMap({ points, apiBase, maxTrackPoints = 500 }) {
  const datedPoints = useMemo(() => points.filter((p) => p.capturedDate), [points]);
  const dates = useMemo(() => Array.from(new Set(datedPoints.map((p) => p.capturedDate))).sort(), [datedPoints]);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    if (!dates.length) {
      setSelectedDate('');
      return;
    }
    if (!selectedDate || !dates.includes(selectedDate)) {
      setSelectedDate(dates[dates.length - 1]);
    }
  }, [dates, selectedDate]);

  const routePoints = useMemo(() => {
    if (!selectedDate) return [];
    return datedPoints
      .filter((p) => p.capturedDate === selectedDate)
      .sort((a, b) => {
        if (a.capturedAt && b.capturedAt) return a.capturedAt.localeCompare(b.capturedAt);
        if (a.capturedAt) return -1;
        if (b.capturedAt) return 1;
        return a.filename.localeCompare(b.filename);
      })
      .slice(0, maxTrackPoints);
  }, [datedPoints, selectedDate, maxTrackPoints]);

  const center = useMemo(() => {
    if (!routePoints.length) return [20, 0];
    const lat = routePoints.reduce((sum, p) => sum + p.latitude, 0) / routePoints.length;
    const lng = routePoints.reduce((sum, p) => sum + p.longitude, 0) / routePoints.length;
    return [lat, lng];
  }, [routePoints]);

  if (!datedPoints.length) {
    return <p className="empty">没有带拍摄日期和 GPS 的照片，无法生成足迹。</p>;
  }

  return (
    <section className="map-panel map-real">
      <div className="track-date-list">
        {dates.map((date) => (
          <button
            key={date}
            className={`option-chip ${selectedDate === date ? 'active' : ''}`}
            type="button"
            onClick={() => setSelectedDate(date)}
          >
            {date}
          </button>
        ))}
      </div>
      <p className="map-note">{selectedDate ? `${selectedDate}：轨迹点 ${routePoints.length} 个` : '请选择日期'}</p>
      {routePoints.length > 0 && (
        <div className="leaflet-wrapper">
          <MapContainer center={center} zoom={12} minZoom={2} scrollWheelZoom className="leaflet-canvas">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <FitBounds points={routePoints} />
            <Polyline positions={routePoints.map((p) => [p.latitude, p.longitude])} pathOptions={{ color: '#333333', weight: 4, opacity: 0.9 }} />

            {routePoints.map((p, idx) => {
              const previewUrl = `${apiBase}/api/preview?path=${encodeURIComponent(p.path)}`;
              return (
                <CircleMarker
                  key={`${p.path}-${idx}`}
                  center={[p.latitude, p.longitude]}
                  radius={5}
                  pathOptions={{ color: '#ffffff', weight: 1, fillColor: '#3a3a3a', fillOpacity: 0.95 }}
                >
                  <Popup>
                    <div className="map-popup">
                      <img src={previewUrl} alt={p.filename} />
                      <strong>#{idx + 1} {p.filename}</strong>
                      <span>{p.capturedAt || p.capturedDate || 'Unknown time'}</span>
                      <span>{p.cameraModel || 'Unknown camera'} · {p.lensModel || 'Unknown lens'}</span>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            <Marker position={[routePoints[0].latitude, routePoints[0].longitude]} icon={endpointIcon('起', '#424242')}>
              <EndpointPopup point={routePoints[0]} index={0} apiBase={apiBase} titlePrefix="起点" />
            </Marker>
            <Marker
              position={[routePoints[routePoints.length - 1].latitude, routePoints[routePoints.length - 1].longitude]}
              icon={endpointIcon('终', '#111111')}
            >
              <EndpointPopup
                point={routePoints[routePoints.length - 1]}
                index={routePoints.length - 1}
                apiBase={apiBase}
                titlePrefix="终点"
              />
            </Marker>
          </MapContainer>
        </div>
      )}
    </section>
  );
}
