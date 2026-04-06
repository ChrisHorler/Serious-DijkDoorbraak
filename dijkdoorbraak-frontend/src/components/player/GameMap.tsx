'use client';

import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapOverlay } from '@/lib/store';
import { INCIDENT_LOCATION } from '@/lib/overlayPresets';

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface GameMapProps {
    overlays?: MapOverlay[];
    pendingPin?: { lat: number; lng: number } | null;
}

export default function GameMap({ overlays = [], pendingPin }: GameMapProps) {
    return (
        <MapContainer
            center={INCIDENT_LOCATION}
            zoom={13}
            className="w-full h-full z-0"
            zoomControl={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={INCIDENT_LOCATION}>
                <Popup>
                    <strong>Incident locatie</strong><br />
                    Dijkdoorbraak gedetecteerd
                </Popup>
            </Marker>

            {pendingPin && (() => {
                const pendingIcon = L.divIcon({
                    className: '',
                    html: `<div style="width:18px;height:18px;background:#f97316;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(249,115,22,0.35),0 2px 6px rgba(0,0,0,0.4);animation:pulse 1.5s infinite"></div>`,
                    iconAnchor: [9, 9],
                });
                return (
                    <Marker position={[pendingPin.lat, pendingPin.lng]} icon={pendingIcon}>
                        <Popup>Jouw locatie — wachten op goedkeuring</Popup>
                    </Marker>
                );
            })()}

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
                    const pos = overlay.coordinates as [number, number];
                    const icon = overlay.icon
                        ? L.divIcon({
                            html: `<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">${overlay.icon}</div>`,
                            className: '',
                            iconSize: [28, 28],
                            iconAnchor: [14, 14],
                        })
                        : undefined;
                    return (
                        <Marker key={overlay.id} position={pos} {...(icon ? { icon } : {})}>
                            <Popup>{overlay.label}</Popup>
                        </Marker>
                    );
                }
                return null;
            })}
        </MapContainer>
    );
}
