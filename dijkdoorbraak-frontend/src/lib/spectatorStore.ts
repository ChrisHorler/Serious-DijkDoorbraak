import { create } from "zustand";
import { persist, createJSONStorage } from 'zustand/middleware';
import { MapOverlay, Inject, Player, Session } from './store';

export interface SpectatorDecision {
    id: string;
    playerId: string;
    customAction: string | null;
    ability: { name: string } | null;
    actionLat: number | null;
    actionLng: number | null;
    actionDetail: string | null;
    actionUrgency: string | null;
    adminApproved: boolean | null;
    score: number | null;
    timestamp: string;
}

interface SpectatorStore {
    session: Session | null;
    setSession: (session: Session) => void;

    name: string;
    setName: (name: string) => void;

    players: Player[];
    setPlayers: (players: Player[]) => void;

    injects: Inject[];
    addInject: (inject: Inject) => void;

    decisions: SpectatorDecision[];
    addDecision: (decision: SpectatorDecision) => void;
    updateDecision: (decision: SpectatorDecision) => void;

    overlays: MapOverlay[];
    addOverlay: (overlay: MapOverlay) => void;
    setOverlays: (overlays: MapOverlay[]) => void;

    currentPhase: string | null;
    setCurrentPhase: (phase: string | null) => void;

    reset: () => void;
}

export const useSpectatorStore = create<SpectatorStore>()(
    persist(
        (set) => ({
            session: null,
            setSession: (session) => set({ session }),

            name: '',
            setName: (name) => set({ name }),

            players: [],
            setPlayers: (players) => set({ players }),

            injects: [],
            addInject: (inject) =>
                set((state) => ({ injects: [...state.injects, inject] })),

            decisions: [],
            addDecision: (decision) =>
                set((state) => ({ decisions: [...state.decisions, decision] })),
            updateDecision: (decision) =>
                set((state) => ({
                    decisions: state.decisions.map((d) => d.id === decision.id ? decision : d),
                })),

            overlays: [],
            addOverlay: (overlay) =>
                set((state) => ({
                    overlays: state.overlays.some((o) => o.id === overlay.id)
                        ? state.overlays.filter((o) => o.id !== overlay.id)
                        : [...state.overlays, overlay],
                })),
            setOverlays: (overlays) => set({ overlays }),

            currentPhase: null,
            setCurrentPhase: (phase) => set({ currentPhase: phase }),

            reset: () => set({
                session: null,
                name: '',
                players: [],
                injects: [],
                decisions: [],
                overlays: [],
                currentPhase: null,
            }),
        }),
        {
            name: 'dijkdoorbraak-spectator',
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);
