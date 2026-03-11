import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Player, Session, Role } from './store';

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

interface AdminStore {
    authenticated: boolean;
    setAuthenticated: (val: boolean) => void;

    session: Session | null;
    setSession: (session: Session) => void;

    players: Player[];
    setPlayers: (players: Player[]) => void;
    updatePlayer: (player: Player) => void;

    roles: Role[];
    setRoles: (roles: Role[]) => void;

    decisions: Decision[];
    addDecision: (decision: Decision) => void;

    reset: () => void;
}

export const useAdminStore = create<AdminStore>()(
    persist(
        (set) => ({
            authenticated: false,
            setAuthenticated: (val) => set({ authenticated: val }),

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
                set((state) => ({decisions: [decision, ...state.decisions] })),

            reset: () => set({
                session: null,
                players: [],
                decisions: [],
            }),
        }),
        {
            name: 'dijkdoorbraak-admin',
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);