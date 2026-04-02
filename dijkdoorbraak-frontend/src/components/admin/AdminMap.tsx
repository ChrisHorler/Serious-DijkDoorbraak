'use client';

import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapOverlay } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import { INCIDENT_LOCATION, STATIC_OVERLAYS } from '@/lib/overlayPresets';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface PendingActionPin {
    id: string;
    lat: number;
    lng: number;
    playerLabel: string;
    actionLabel: string;
    urgency: string | null;
    detail: string | null;
}

interface AdminMapProps {
    sessionId: string;
    overlays: MapOverlay[];
    onToggleOverlay: (overlay: MapOverlay) => void;
    center?: [number, number];
    customOverlays?: MapOverlay[];
    pendingPins?: PendingActionPin[];
    onPublishPin?: (pin: PendingActionPin) => void;
    onDismissPin?: (pinId: string) => void;
}

export default function AdminMap({ sessionId, overlays, onToggleOverlay, center, customOverlays = [], pendingPins = [], onPublishPin, onDismissPin }: AdminMapProps) {
    const mapCenter = center ?? INCIDENT_LOCATION;
    const OVERLAY_PRESETS: MapOverlay[] = [...STATIC_OVERLAYS, ...customOverlays];
    const activeIds = new Set(overlays.map((o) => o.id));

    function handleToggle(preset: MapOverlay) {
        const socket = getSocket();
        onToggleOverlay(preset);
        socket.emit('map_update', { sessionId, overlay: preset });
    }

    return (
        <div className="flex flex-col h-full gap-3">
            {/* Map */}
            <div className="flex-1 rounded-xl overflow-hidden min-h-0">
                <MapContainer
                    center={mapCenter}
                    zoom={13}
                    className="w-full h-full z-0"
                    zoomControl={true}
                    style={{ minHeight: '300px' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={mapCenter}>
                        <Popup><strong>Incident locatie</strong><br />Dijkdoorbraak gedetecteerd</Popup>
                    </Marker>

                    {pendingPins.map((pin) => {
                        const orangeIcon = L.divIcon({
                            className: '',
                            html: `<div style="width:20px;height:20px;background:#f97316;border:3px solid white;border-radius:50%;box-shadow:0 0 0 3px rgba(249,115,22,0.4),0 2px 6px rgba(0,0,0,0.4);animation:pulse 1.5s infinite"></div>`,
                            iconAnchor: [10, 10],
                        });
                        return (
                            <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={orangeIcon}>
                                <Popup>
                                    <div style={{ minWidth: 180 }}>
                                        <p style={{ fontWeight: 700, marginBottom: 2 }}>{pin.playerLabel}</p>
                                        <p style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>{pin.actionLabel}</p>
                                        {pin.urgency && <p style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>Urgentie: {pin.urgency}</p>}
                                        {pin.detail && <p style={{ fontSize: 12, color: '#888', fontStyle: 'italic', marginBottom: 6 }}>"{pin.detail}"</p>}
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button
                                                onClick={() => onPublishPin?.(pin)}
                                                style={{ flex: 1, background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                Publiceer
                                            </button>
                                            <button
                                                onClick={() => onDismissPin?.(pin.id)}
                                                style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
                                            >
                                                Negeer
                                            </button>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {overlays.map((overlay) => {
                        if (overlay.kind === 'polygon') {
                            return (
                                <Polygon
                                    key={overlay.id}
                                    positions={overlay.coordinates as [number, number][]}
                                    pathOptions={{ color: overlay.color, fillOpacity: 0.3 }}
                                >
                                    <Popup>{overlay.label}</Popup>
                                </Polygon>
                            );
                        }
                        if (overlay.kind === 'marker') {
                            const icon = overlay.icon
                                ? L.divIcon({
                                    html: `<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">${overlay.icon}</div>`,
                                    className: '',
                                    iconSize: [28, 28],
                                    iconAnchor: [14, 14],
                                })
                                : undefined;
                            return (
                                <Marker key={overlay.id} position={overlay.coordinates as [number, number]} {...(icon ? { icon } : {})}>
                                    <Popup>{overlay.label}</Popup>
                                </Marker>
                            );
                        }
                        return null;
                    })}
                </MapContainer>
            </div>

            {/* Overlay preset buttons */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
                {OVERLAY_PRESETS.map((preset) => {
                    const active = activeIds.has(preset.id);
                    return (
                        <button
                            key={preset.id}
                            onClick={() => handleToggle(preset)}
                            className={`px-3 py-2 rounded-xl text-sm font-medium transition border ${
                                active
                                    ? 'bg-gray-200 border-gray-400 text-gray-900'
                                    : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-400'
                            }`}
                        >
                            <span
                                className="inline-block w-2 h-2 rounded-full mr-2"
                                style={{ backgroundColor: preset.color }}
                            />
                            {active ? '✓ ' : ''}{preset.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
