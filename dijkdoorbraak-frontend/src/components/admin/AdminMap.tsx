'use client';

import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapOverlay } from '@/lib/adminStore';
import { getSocket } from '@/lib/socket';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const INCIDENT_LOCATION: [number, number] = [51.8836, 4.6317];

const OVERLAY_PRESETS: MapOverlay[] = [
    {
        id: 'flood_zone',
        type: 'flood_zone',
        label: 'Overstromingsgebied',
        color: '#3b82f6',
        kind: 'polygon',
        coordinates: [
            [51.870, 4.615],
            [51.870, 4.655],
            [51.895, 4.655],
            [51.895, 4.615],
        ],
    },
    {
        id: 'breach_marker',
        type: 'breach_marker',
        label: 'Dijkdoorbraak',
        color: '#ef4444',
        kind: 'marker',
        coordinates: [51.8836, 4.6317],
    },
    {
        id: 'evacuation_zone',
        type: 'evacuation_zone',
        label: 'Evacuatiezone',
        color: '#f59e0b',
        kind: 'polygon',
        coordinates: [
            [51.860, 4.600],
            [51.860, 4.670],
            [51.905, 4.670],
            [51.905, 4.600],
        ],
    },
    {
        id: 'road_blocked',
        type: 'road_blocked',
        label: 'Weg afgesloten',
        color: '#f97316',
        kind: 'marker',
        coordinates: [51.878, 4.642],
    },
];

interface AdminMapProps {
    sessionId: string;
    overlays: MapOverlay[];
    onToggleOverlay: (overlay: MapOverlay) => void;
}

export default function AdminMap({ sessionId, overlays, onToggleOverlay }: AdminMapProps) {
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
                    center={INCIDENT_LOCATION}
                    zoom={13}
                    className="w-full h-full z-0"
                    zoomControl={true}
                    style={{ minHeight: '300px' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={INCIDENT_LOCATION}>
                        <Popup><strong>Incident locatie</strong><br />Dijkdoorbraak gedetecteerd</Popup>
                    </Marker>

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
                            return (
                                <Marker key={overlay.id} position={overlay.coordinates as [number, number]}>
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
                                    ? 'bg-zinc-700 border-zinc-500 text-white'
                                    : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
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
