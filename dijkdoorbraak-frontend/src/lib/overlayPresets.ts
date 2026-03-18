import type { EscalationPhase } from './adminStore';
import type { MapOverlay } from './store';

export const INCIDENT_LOCATION: [number, number] = [51.8836, 4.6317];

export const FLOOD_SIZES: { label: string; value: number }[] = [
    { label: 'Klein', value: 0.5 },
    { label: 'Middel', value: 1.0 },
    { label: 'Groot', value: 1.8 },
];

export function makeFloodZone(scale: number = 1, center?: [number, number]): MapOverlay {
    const [clat, clng] = center ?? INCIDENT_LOCATION;
    const latR = 0.012 * scale;
    const lngR = 0.020 * scale;
    return {
        id: 'flood_zone',
        type: 'flood_zone',
        label: 'Overstromingsgebied',
        color: '#3b82f6',
        kind: 'polygon',
        coordinates: [
            [clat - latR, clng - lngR],
            [clat - latR, clng + lngR],
            [clat + latR, clng + lngR],
            [clat + latR, clng - lngR],
        ],
    };
}

export const STATIC_OVERLAYS: MapOverlay[] = [
    {
        id: 'breach_marker',
        type: 'breach_marker',
        label: 'Dijkdoorbraak',
        color: '#ef4444',
        kind: 'marker',
        coordinates: INCIDENT_LOCATION,
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

export function getPhaseOverlays(phase: EscalationPhase, center?: [number, number]): MapOverlay[] {
    const overlays: MapOverlay[] = [];
    if (phase.floodZoneScale !== null) {
        overlays.push(makeFloodZone(phase.floodZoneScale, center));
    }
    for (const id of phase.activeOverlayIds) {
        const overlay = STATIC_OVERLAYS.find(o => o.id === id);
        if (overlay) overlays.push(overlay);
    }
    return overlays;
}
