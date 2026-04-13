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
    briefing: string | null;
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

export interface FeedbackQuestion {
    id: string;
    question: string;
    order: number;
}

export type InjectVariant = 'alert' | 'warning' | 'info' | 'nl-alert';

export interface InjectVariantStyle {
    label: string;
    icon: string;
    // Toast (dark overlay notification)
    toastBg: string;
    toastBorder: string;
    toastLabelColor: string;
    toastSubColor: string;
    toastDot: string;
    // Modal + history dot
    accentDot: string;
    accentLabel: string;
}

export const INJECT_VARIANT_STYLES: Record<InjectVariant, InjectVariantStyle> = {
    alert: {
        label: 'Incident melding',
        icon: '🚨',
        toastBg: 'bg-red-900/95',
        toastBorder: 'border-red-600',
        toastLabelColor: 'text-red-300',
        toastSubColor: 'text-red-200',
        toastDot: 'bg-red-400',
        accentDot: 'bg-red-500',
        accentLabel: 'text-red-600',
    },
    warning: {
        label: 'Waarschuwing',
        icon: '⚠️',
        toastBg: 'bg-amber-900/95',
        toastBorder: 'border-amber-600',
        toastLabelColor: 'text-amber-300',
        toastSubColor: 'text-amber-200',
        toastDot: 'bg-amber-400',
        accentDot: 'bg-amber-500',
        accentLabel: 'text-amber-600',
    },
    info: {
        label: 'Informatie',
        icon: 'ℹ️',
        toastBg: 'bg-blue-900/95',
        toastBorder: 'border-blue-500',
        toastLabelColor: 'text-blue-300',
        toastSubColor: 'text-blue-200',
        toastDot: 'bg-blue-400',
        accentDot: 'bg-blue-500',
        accentLabel: 'text-blue-600',
    },
    'nl-alert': {
        label: 'NL-Alert',
        icon: '📱',
        toastBg: 'bg-orange-500',
        toastBorder: 'border-orange-300',
        toastLabelColor: 'text-orange-100',
        toastSubColor: 'text-orange-100',
        toastDot: 'bg-white',
        accentDot: 'bg-orange-500',
        accentLabel: 'text-orange-600',
    },
};

export interface Inject {
    id: string;
    title: string;
    content: string;
    targetRole: string | null;
    triggerTime: number;
    variant?: InjectVariant;
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

    // Pending pin (submitted by player, awaiting admin publish)
    pendingPin: { decisionId: string; lat: number; lng: number } | null;
    setPendingPin: (pin: { decisionId: string; lat: number; lng: number } | null) => void;

    // Incident location (set when scenario starts)
    incidentLocation: [number, number] | null;
    setIncidentLocation: (loc: [number, number] | null) => void;

    // Feedback questions (set when scenario starts)
    feedbackQuestions: FeedbackQuestion[];
    setFeedbackQuestions: (questions: FeedbackQuestion[]) => void;

    // Scenario time label (e.g. "14:30") — the fictional clock in the scenario
    scenarioTime: string | null;
    setScenarioTime: (t: string | null) => void;

    // Game timer — driven by admin, synced via socket
    timerMs: number | null;
    timerRunning: boolean;
    timerUpdatedAt: number | null; // local timestamp when timerMs was last set
    setTimer: (remainingMs: number, running: boolean) => void;

    // Reset
    reset: () => void;
}

export interface MapOverlay {
    id: string;
    type: 'flood_zone' | 'breach_marker' | 'evacuation_zone' | 'road_blocked' | 'custom';
    label: string;
    color: string;
    kind: 'polygon' | 'marker';
    coordinates: [number, number][] | [number, number];
    icon?: string; // emoji or single character for marker icon
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

            incidentLocation: null,
            setIncidentLocation: (loc) => set({ incidentLocation: loc }),

            feedbackQuestions: [],
            setFeedbackQuestions: (questions) => set({ feedbackQuestions: questions }),

            pendingPin: null,
            setPendingPin: (pin) => set({ pendingPin: pin }),

            scenarioTime: null,
            setScenarioTime: (t) => set({ scenarioTime: t }),

            timerMs: null,
            timerRunning: false,
            timerUpdatedAt: null,
            setTimer: (remainingMs, running) => set({ timerMs: remainingMs, timerRunning: running, timerUpdatedAt: Date.now() }),

            reset: () => set({
                session: null,
                player: null,
                lobbyPlayers: [],
                injects: [],
                activeInject: null,
                toasts: [],
                overlays: [],
                incidentLocation: null,
                feedbackQuestions: [],
                pendingPin: null,
                scenarioTime: null,
                timerMs: null,
                timerRunning: false,
                timerUpdatedAt: null,
            }),
        }),
        {
            name: 'dijkdoorbraak-player',
            storage: createJSONStorage(() => sessionStorage,)
        }
    )
);