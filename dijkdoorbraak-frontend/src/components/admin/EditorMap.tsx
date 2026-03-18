'use client';

import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { EscalationPhase } from '@/lib/adminStore';
import { makeFloodZone, STATIC_OVERLAYS } from '@/lib/overlayPresets';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapClickHandler({ onLocationChange }: { onLocationChange: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onLocationChange(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

interface EditorMapProps {
    lat: number;
    lng: number;
    onLocationChange: (lat: number, lng: number) => void;
    previewPhase?: EscalationPhase | null;
}

export default function EditorMap({ lat, lng, onLocationChange, previewPhase }: EditorMapProps) {
    const center: [number, number] = [lat, lng];

    const floodZone = previewPhase?.floodZoneScale != null
        ? makeFloodZone(previewPhase.floodZoneScale, center)
        : null;

    const staticOverlays = previewPhase
        ? STATIC_OVERLAYS.filter(o => previewPhase.activeOverlayIds.includes(o.id))
        : [];

    return (
        <div className="w-full h-full rounded-xl overflow-hidden">
            <MapContainer
                center={center}
                zoom={13}
                className="w-full h-full z-0"
                zoomControl={true}
                style={{ minHeight: '200px' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onLocationChange={onLocationChange} />

                {/* Incident marker — draggable */}
                <Marker
                    position={center}
                    draggable={true}
                    eventHandlers={{
                        dragend: (e) => {
                            const pos = (e.target as L.Marker).getLatLng();
                            onLocationChange(pos.lat, pos.lng);
                        },
                    }}
                >
                    <Popup><strong>Dijkdoorbraak</strong><br />Sleep of klik op de kaart om te verplaatsen</Popup>
                </Marker>

                {/* Phase preview: flood zone */}
                {floodZone && (
                    <Polygon
                        positions={floodZone.coordinates as [number, number][]}
                        pathOptions={{ color: floodZone.color, fillOpacity: 0.3 }}
                    >
                        <Popup>{floodZone.label}</Popup>
                    </Polygon>
                )}

                {/* Phase preview: static overlays */}
                {staticOverlays.map(overlay => {
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
    );
}
