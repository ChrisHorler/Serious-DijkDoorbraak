import type { EscalationPhase } from './adminStore';
import type { MapOverlay } from './store';

// Real Maasdijk breach location near Blerick, Noord-Limburg
export const INCIDENT_LOCATION: [number, number] = [51.3739, 6.1105];

export const FLOOD_SIZES: { label: string; value: number }[] = [
    { label: 'Klein', value: 0.5 },
    { label: 'Middel', value: 1.0 },
    { label: 'Groot', value: 1.8 },
];

// Organic flood zone shapes — relative offsets [latOffset, lngOffset] from breach point.
// Negative lng = westward into Blerick (away from the Maas river).
// Each scale has a distinct irregular polygon simulating water spreading from the breach.
const FLOOD_SHAPES: Record<number, [number, number][]> = {
    0.5: [
        // Small — initial breach, narrow fan spreading west ~500m
        [ 0.006,  0.001],
        [ 0.008, -0.002],
        [ 0.007, -0.007],
        [ 0.004, -0.010],
        [ 0.001, -0.011],
        [-0.002, -0.009],
        [-0.005, -0.006],
        [-0.006, -0.002],
        [-0.004,  0.001],
    ],
    1.0: [
        // Medium — reaches residential areas and zorgcentrum ~1.2km
        [ 0.013,  0.002],
        [ 0.017, -0.001],
        [ 0.016, -0.009],
        [ 0.011, -0.016],
        [ 0.005, -0.020],
        [-0.001, -0.019],
        [-0.008, -0.016],
        [-0.013, -0.010],
        [-0.015, -0.002],
        [-0.011,  0.003],
    ],
    1.8: [
        // Large — covers most of Blerick including schools and winkelcentrum ~2km
        [ 0.022,  0.003],
        [ 0.030, -0.001],
        [ 0.028, -0.012],
        [ 0.022, -0.022],
        [ 0.013, -0.031],
        [ 0.003, -0.035],
        [-0.007, -0.033],
        [-0.017, -0.027],
        [-0.025, -0.016],
        [-0.027, -0.004],
        [-0.020,  0.004],
        [-0.009,  0.005],
    ],
};

export function makeFloodZone(scale: number = 1, center?: [number, number]): MapOverlay {
    const [clat, clng] = center ?? INCIDENT_LOCATION;

    // Use the closest predefined shape, falling back to scale 1.0
    const offsets = FLOOD_SHAPES[scale] ?? FLOOD_SHAPES[1.0];
    const coordinates: [number, number][] = offsets.map(
        ([latOff, lngOff]) => [clat + latOff, clng + lngOff]
    );

    return {
        id: 'flood_zone',
        type: 'flood_zone',
        label: 'Overstromingsgebied',
        color: '#3b82f6',
        kind: 'polygon',
        coordinates,
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
];

/**
 * Returns the flood zone overlay for phases 0..upToIndex (most recent non-null specification).
 * Custom coordinates take priority over scale presets when set.
 * Static/custom overlays are managed live by the admin during the session, not by phases.
 */
export function getPhaseFloodOverlay(phases: EscalationPhase[], upToIndex: number, center?: [number, number]): MapOverlay | null {
    type FloodSpec = { type: 'coords'; coords: [number, number][] } | { type: 'scale'; scale: number };
    let latest: FloodSpec | null = null;
    for (let i = 0; i <= upToIndex; i++) {
        if (phases[i].floodZoneCoordinates != null && phases[i].floodZoneCoordinates!.length >= 3) {
            latest = { type: 'coords', coords: phases[i].floodZoneCoordinates! };
        } else if (phases[i].floodZoneScale !== null) {
            latest = { type: 'scale', scale: phases[i].floodZoneScale! };
        }
    }
    if (!latest) return null;
    if (latest.type === 'coords') {
        return { id: 'flood_zone', type: 'flood_zone', label: 'Overstromingsgebied', color: '#3b82f6', kind: 'polygon', coordinates: latest.coords };
    }
    return makeFloodZone(latest.scale, center);
}
