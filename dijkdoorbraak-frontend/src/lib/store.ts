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

    // Reset
    reset: () => void;
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

            reset: () => set({
                session: null,
                player: null,
                lobbyPlayers: [],
                injects: [],
                activeInject: null,
                toasts: [],
            }),
        }),
        {
            name: 'dijkdoorbraak-player',
            storage: createJSONStorage(() => sessionStorage,)
        }
    )
);