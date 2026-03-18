'use client';

import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, CircleMarker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { EscalationPhase } from '@/lib/adminStore';
import type { MapOverlay } from '@/lib/store';
import { makeFloodZone, STATIC_OVERLAYS } from '@/lib/overlayPresets';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export type DrawMode = 'none' | 'polygon' | 'marker';

interface ClickHandlerProps {
    drawMode: DrawMode;
    onLocationChange: (lat: number, lng: number) => void;
    onAddDrawPoint: (pt: [number, number]) => void;
    onMarkerPlaced: (pt: [number, number]) => void;
}

function ClickHandler({ drawMode, onLocationChange, onAddDrawPoint, onMarkerPlaced }: ClickHandlerProps) {
    useMapEvents({
        click(e) {
            const pt: [number, number] = [e.latlng.lat, e.latlng.lng];
            if (drawMode === 'none') {
                onLocationChange(pt[0], pt[1]);
            } else if (drawMode === 'polygon') {
                onAddDrawPoint(pt);
            } else if (drawMode === 'marker') {
                onMarkerPlaced(pt);
            }
        },
    });
    return null;
}

interface EditorMapProps {
    lat: number;
    lng: number;
    onLocationChange: (lat: number, lng: number) => void;
    previewPhase?: EscalationPhase | null;
    customOverlays: MapOverlay[];
    drawMode: DrawMode;
    drawPoints: [number, number][];
    onAddDrawPoint: (pt: [number, number]) => void;
    onMarkerPlaced: (pt: [number, number]) => void;
}

function emojiIcon(emoji: string) {
    return L.divIcon({
        html: `<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">${emoji}</div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    });
}

function renderOverlay(overlay: MapOverlay, fillOpacity: number, strokeOpacity: number) {
    if (overlay.kind === 'polygon') {
        return (
            <Polygon
                key={overlay.id}
                positions={overlay.coordinates as [number, number][]}
                pathOptions={{ color: overlay.color, fillOpacity, opacity: strokeOpacity, weight: 2 }}
            >
                <Popup>{overlay.label}</Popup>
            </Polygon>
        );
    }
    if (overlay.kind === 'marker') {
        return (
            <Marker
                key={overlay.id}
                position={overlay.coordinates as [number, number]}
                {...(overlay.icon ? { icon: emojiIcon(overlay.icon) } : {})}
            >
                <Popup>{overlay.label}</Popup>
            </Marker>
        );
    }
    return null;
}

export default function EditorMap({
    lat, lng, onLocationChange,
    previewPhase, customOverlays,
    drawMode, drawPoints,
    onAddDrawPoint, onMarkerPlaced,
}: EditorMapProps) {
    const center: [number, number] = [lat, lng];

    const floodZone = previewPhase?.floodZoneScale != null
        ? makeFloodZone(previewPhase.floodZoneScale, center)
        : null;

    // All available static + custom overlays
    const allOverlays: MapOverlay[] = [...STATIC_OVERLAYS, ...customOverlays];

    return (
        <div className={`w-full h-full rounded-xl overflow-hidden ${drawMode !== 'none' ? '[&_.leaflet-container]:!cursor-crosshair' : ''}`}>
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
                <ClickHandler
                    drawMode={drawMode}
                    onLocationChange={onLocationChange}
                    onAddDrawPoint={onAddDrawPoint}
                    onMarkerPlaced={onMarkerPlaced}
                />

                {/* Incident marker — draggable, hidden while drawing */}
                {drawMode === 'none' && (
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
                )}

                {/* Phase preview: flood zone */}
                {floodZone && (
                    <Polygon
                        positions={floodZone.coordinates as [number, number][]}
                        pathOptions={{ color: floodZone.color, fillOpacity: 0.35, weight: 2 }}
                    >
                        <Popup>{floodZone.label}</Popup>
                    </Polygon>
                )}

                {/* All overlays — dim inactive when phase is being previewed */}
                {allOverlays.map(overlay => {
                    const inPhase = previewPhase?.activeOverlayIds.includes(overlay.id) ?? false;
                    const fill = previewPhase ? (inPhase ? 0.5 : 0.1) : 0.35;
                    const stroke = previewPhase ? (inPhase ? 1 : 0.3) : 0.8;
                    return renderOverlay(overlay, fill, stroke);
                })}

                {/* Drawing state: points + polyline preview */}
                {drawPoints.map((pt, i) => (
                    <CircleMarker
                        key={i}
                        center={pt}
                        radius={5}
                        pathOptions={{ color: '#fff', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}
                    />
                ))}
                {drawPoints.length >= 2 && (
                    <Polyline
                        positions={drawMode === 'polygon' ? [...drawPoints, drawPoints[0]] : drawPoints}
                        pathOptions={{ color: '#3b82f6', dashArray: '6 4', weight: 2 }}
                    />
                )}
                {drawMode === 'polygon' && drawPoints.length >= 3 && (
                    <Polygon
                        positions={drawPoints}
                        pathOptions={{ color: '#3b82f6', fillOpacity: 0.1, dashArray: '6 4', weight: 2 }}
                    />
                )}
            </MapContainer>
        </div>
    );
}
