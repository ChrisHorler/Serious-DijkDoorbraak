import { create } from "zustand";
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Ability {
    id: string;
    name: string;
    description: string | null;
}

export interface Role {
    id: string;
    name: string;
    shortName: string;
    description: string;
    abilities: Ability[];
}

export interface Player {
    id: string;
    nickname: string;
    sessionId: string;
    roleId: string | null;
    role: Role | null;
    joinedAt: string;
}

export interface Inject {
    id: string;
    title: string;
    content: string;
    targetRole: string | null;
    triggerTime: number;
}

export interface Session {
    id: string;
    scenarioId: string;
    status: "LOBBY" | "RUNNING" | "ENDED";
    joinCode: string;
}

interface GameStore {
    // Session
    session: Session | null;
    setSession: (session: Session) => void;

    // Player
    player: Player | null;
    setPlayer: (player: Player) => void;

    // Lobby
    lobbyPlayers: Player[];
    setLobbyPlayers: (players: Player[]) => void;

    // Injects
    injects: Inject[];
    addInject: (inject: Inject) => void;
    activeInject: Inject | null;
    setActiveInject: (inject: Inject | null) => void;

    // Notifications
    toasts: Inject[];
    addToast: (inject: Inject) => void;
    removeToast: (id: string) => void;

    // Map overlays pushed by admin
    overlays: MapOverlay[];
    addOverlay: (overlay: MapOverlay) => void;
    removeOverlay: (id: string) => void;
    setOverlays: (overlays: MapOverlay[]) => void;

    // Reset
    reset: () => void;
}

export interface MapOverlay {
    id: string;
    type: 'flood_zone' | 'breach_marker' | 'evacuation_zone' | 'road_blocked';
    label: string;
    color: string;
    kind: 'polygon' | 'marker';
    coordinates: [number, number][] | [number, number];
}

export const useGameStore = create<GameStore>() (
    persist(
        (set) => ({
            session: null,
            setSession: (session) => set({ session }),

            player: null,
            setPlayer: (player) => set({ player }),

            lobbyPlayers: [],
            setLobbyPlayers: (players) => set({ lobbyPlayers: players }),

            injects: [],
            addInject: (inject) =>
                set((state) => ({ injects: [...state.injects, inject] })),
            activeInject: null,
            setActiveInject: (inject) => set({ activeInject: inject }),

            toasts: [],
            addToast: (inject) => set((state) => ({ toasts: [...state.toasts, inject] })),
            removeToast: (id) =>
                set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

            overlays: [],
            addOverlay: (overlay) =>
                set((state) => ({
                    overlays: state.overlays.some((o) => o.id === overlay.id)
                        ? state.overlays.filter((o) => o.id !== overlay.id)
                        : [...state.overlays, overlay],
                })),
            removeOverlay: (id) =>
                set((state) => ({ overlays: state.overlays.filter((o) => o.id !== id) })),
            setOverlays: (overlays) => set({ overlays }),

            reset: () => set({
                session: null,
                player: null,
                lobbyPlayers: [],
                injects: [],
                activeInject: null,
                toasts: [],
                overlays: [],
            }),
        }),
        {
            name: 'dijkdoorbraak-player',
            storage: createJSONStorage(() => sessionStorage,)
        }
    )
);