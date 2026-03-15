import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Player, Session, Role, Inject } from './store';

export interface Decision {
    id: string;
    playerId: string;
    sessionId: string;
    injectId: string | null;
    abilityId: string | null;
    customAction: string | null;
    adminResponse: string | null;
    adminApproved: boolean | null;
    score: number | null;
    timestamp: string;
    player?: Player;
}

export interface MapOverlay {
    id: string;
    type: 'flood_zone' | 'breach_marker' | 'evacuation_zone' | 'road_blocked';
    label: string;
    color: string;
    kind: 'polygon' | 'marker';
    coordinates: [number, number][] | [number, number];
}

interface AdminStore {
    authenticated: boolean;
    token: string | null;
    setToken: (token: string) => void;

    session: Session | null;
    setSession: (session: Session | null) => void;

    players: Player[];
    setPlayers: (players: Player[]) => void;
    updatePlayer: (player: Player) => void;

    roles: Role[];
    setRoles: (roles: Role[]) => void;

    decisions: Decision[];
    addDecision: (decision: Decision) => void;
    updateDecision: (decision: Decision) => void;

    injects: Inject[];
    setInjects: (injects: Inject[]) => void;

    overlays: MapOverlay[];
    addOverlay: (overlay: MapOverlay) => void;
    removeOverlay: (id: string) => void;

    reset: () => void;
}

export const useAdminStore = create<AdminStore>()(
    persist(
        (set) => ({
            authenticated: false,
            token: null,
            setToken: (token) => set({ authenticated: true, token }),

            session: null,
            setSession: (session) => set({ session }),

            players: [],
            setPlayers: (players) => set({ players }),
            updatePlayer: (player) =>
                set((state) => ({
                    players: state.players.map((p) => (p.id === player.id ? player : p)),
                })),

            roles: [],
            setRoles: (roles) => set({ roles }),

            decisions: [],
            addDecision: (decision) =>
                set((state) => ({ decisions: [decision, ...state.decisions] })),
            updateDecision: (decision) =>
                set((state) => ({
                    decisions: state.decisions.map((d) => (d.id === decision.id ? decision : d)),
                })),

            injects: [],
            setInjects: (injects) => set({ injects }),

            overlays: [],
            addOverlay: (overlay) =>
                set((state) => ({
                    overlays: state.overlays.some((o) => o.id === overlay.id)
                        ? state.overlays.filter((o) => o.id !== overlay.id)
                        : [...state.overlays, overlay],
                })),
            removeOverlay: (id) =>
                set((state) => ({ overlays: state.overlays.filter((o) => o.id !== id) })),

            reset: () => set({
                authenticated: false,
                token: null,
                session: null,
                players: [],
                decisions: [],
                injects: [],
                overlays: [],
            }),
        }),
        {
            name: 'dijkdoorbraak-admin',
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);