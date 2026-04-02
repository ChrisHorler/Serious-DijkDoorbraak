'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapOverlay } from '@/lib/store';

interface Props {
    overlays: MapOverlay[];
    selectedLocation: [number, number] | null;
    onLocationSelect: (lat: number, lng: number) => void;
    defaultCenter?: [number, number];
}

// Default center: central Netherlands (Noord-Brabant/Zeeland area)
const DEFAULT_CENTER: [number, number] = [51.6, 4.5];

export default function MiniMap({ overlays, selectedLocation, onLocationSelect, defaultCenter }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        // Priority: explicit defaultCenter (crisis zone) > overlay centroid > fallback
        let center: [number, number] = DEFAULT_CENTER;
        if (defaultCenter) {
            center = defaultCenter;
        } else {
            const allCoords: [number, number][] = [];
            for (const o of overlays) {
                if (o.kind === 'marker') {
                    allCoords.push(o.coordinates as [number, number]);
                } else {
                    for (const c of (o.coordinates as [number, number][])) {
                        allCoords.push(c);
                    }
                }
            }
            if (allCoords.length > 0) {
                const avgLat = allCoords.reduce((s, c) => s + c[0], 0) / allCoords.length;
                const avgLng = allCoords.reduce((s, c) => s + c[1], 0) / allCoords.length;
                center = [avgLat, avgLng];
            }
        }

        const map = L.map(containerRef.current, {
            center,
            zoom: 12,
            zoomControl: true,
            attributionControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        // Draw existing overlays for context
        for (const overlay of overlays) {
            if (overlay.kind === 'polygon') {
                L.polygon(overlay.coordinates as [number, number][], {
                    color: overlay.color,
                    fillColor: overlay.color,
                    fillOpacity: 0.2,
                    weight: 2,
                }).addTo(map);
            }
        }

        // Pin icon
        const pinIcon = L.divIcon({
            className: '',
            html: `<div style="width:24px;height:24px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
            iconAnchor: [12, 12],
        });

        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            onLocationSelect(lat, lng);
            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lng]);
            } else {
                markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
            }
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
    }, []);

    // Sync external selectedLocation changes (e.g. clearing)
    useEffect(() => {
        if (!mapRef.current) return;
        if (!selectedLocation && markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
        }
    }, [selectedLocation]);

    return <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden cursor-crosshair" />;
}
