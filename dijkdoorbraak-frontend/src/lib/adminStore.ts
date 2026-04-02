import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Player, Session, Role, Inject, MapOverlay } from './store';

export interface Decision {
    id: string;
    playerId: string;
    sessionId: string;
    injectId: string | null;
    abilityId: string | null;
    ability?: { id: string; name: string; description: string | null } | null;
    customAction: string | null;
    actionLat: number | null;
    actionLng: number | null;
    actionDetail: string | null;
    actionUrgency: string | null;
    adminResponse: string | null;
    adminApproved: boolean | null;
    score: number | null;
    timestamp: string;
    player?: Player;
}

export interface QuestionRating {
    questionId: string;
    question: string;
    rating: number;
}

export interface FeedbackItem {
    id: string;
    sessionId: string;
    nickname: string;
    rating: number | null;
    questionRatings: QuestionRating[] | null;
    comment: string | null;
    submittedAt: string;
}

export interface EscalationPhase {
    id: string;
    name: string;
    floodZoneScale: number | null; // null = no flood zone; 0.5=klein, 1.0=middel, 1.8=groot
    activeOverlayIds: string[];    // ids of STATIC_OVERLAYS to include
    injectId: string | null;
}

// Re-export MapOverlay from store for consumers that import it from here
export type { MapOverlay };

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
    clearDecisions: () => void;

    injects: Inject[];
    setInjects: (injects: Inject[]) => void;

    overlays: MapOverlay[];
    addOverlay: (overlay: MapOverlay) => void;
    removeOverlay: (id: string) => void;
    setOverlays: (overlays: MapOverlay[]) => void;

    phases: EscalationPhase[];
    setPhases: (phases: EscalationPhase[]) => void;
    currentPhaseIndex: number; // -1 = no phase started
    setCurrentPhaseIndex: (index: number) => void;

    incidentLocation: [number, number] | null;
    setIncidentLocation: (loc: [number, number] | null) => void;

    scenarioCustomOverlays: MapOverlay[];
    setScenarioCustomOverlays: (overlays: MapOverlay[]) => void;

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
                set((state) => ({
                    decisions: state.decisions.some((d) => d.id === decision.id)
                        ? state.decisions
                        : [decision, ...state.decisions],
                })),
            updateDecision: (decision) =>
                set((state) => ({
                    decisions: state.decisions.map((d) => (d.id === decision.id ? decision : d)),
                })),
            clearDecisions: () => set({ decisions: [] }),

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
            setOverlays: (overlays) => set({ overlays }),

            phases: [],
            setPhases: (phases) => set({ phases }),
            currentPhaseIndex: -1,
            setCurrentPhaseIndex: (index) => set({ currentPhaseIndex: index }),

            incidentLocation: null,
            setIncidentLocation: (loc) => set({ incidentLocation: loc }),

            scenarioCustomOverlays: [],
            setScenarioCustomOverlays: (overlays) => set({ scenarioCustomOverlays: overlays }),

            reset: () => set({
                authenticated: false,
                token: null,
                session: null,
                players: [],
                roles: [],
                decisions: [],
                injects: [],
                overlays: [],
                phases: [],
                currentPhaseIndex: -1,
                incidentLocation: null,
                scenarioCustomOverlays: [],
            }),
        }),
        {
            name: 'dijkdoorbraak-admin',
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);
