'use client';

import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapOverlay } from '@/lib/store';

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Dike breach location
const INCIDENT_LOCATION: [number, number] = [51.8836, 4.6317];

interface GameMapProps {
    overlays?: MapOverlay[];
}

export default function GameMap({ overlays = [] }: GameMapProps) {
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
                    return (
                        <Marker key={overlay.id} position={pos}>
                            <Popup>{overlay.label}</Popup>
                        </Marker>
                    );
                }
                return null;
            })}
        </MapContainer>
    );
}
