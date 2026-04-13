'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useGameStore, MapOverlay } from '@/lib/store';
import dynamic from 'next/dynamic';
import AbilityMenu from '@/components/player/AbilityMenu';
import InjectToast from '@/components/player/InjectToast';
import InjectModal from '@/components/player/InjectModal';
import InjectHistoryPanel from '@/components/player/InjectHistoryPanel';
import RoleDetailPanel from '@/components/player/RoleDetailPanel';

const GameMap = dynamic(() => import('@/components/player/GameMap'), { ssr: false });

function formatTimer(ms: number): string {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function GamePage() {
    const router = useRouter();
    const { player, session, addInject, addToast, setActiveInject, addOverlay, setOverlays, overlays, pendingPin, setPendingPin, incidentLocation, scenarioTime, timerMs, timerRunning, timerUpdatedAt, setTimer } = useGameStore();
    const [displayMs, setDisplayMs] = useState<number | null>(null);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState<number | null>(null);
    const [actionFeedback, setActionFeedback] = useState<{ approved: boolean; response: string | null } | null>(null);
    const [pinPublished, setPinPublished] = useState(false);
    const [showRoleDetail, setShowRoleDetail] = useState(false);

    useEffect(() => {
        if (!player || !session) {
            router.replace('/player/join');
            return;
        }

        const socket = getSocket();

        // Re-register with the server on every (re)connect so the DB socketId and
        // socket room stay up-to-date even after a network drop or page refresh.
        function registerWithServer() {
            socket.emit('rejoin_lobby', { sessionId: session!.id, playerId: player!.id });
        }
        socket.on('connect', registerWithServer);
        if (socket.connected) registerWithServer();

        socket.on('inject_received', (data: { inject: any; playerId?: string }) => {
            addInject(data.inject);
            addToast(data.inject);
            setActiveInject(data.inject);
        });

        socket.on('action_response', (data: { decision: { playerId: string; adminApproved: boolean; adminResponse: string | null } }) => {
            if (data.decision.playerId === player.id) {
                setActionFeedback({ approved: data.decision.adminApproved, response: data.decision.adminResponse });
                setTimeout(() => setActionFeedback(null), 5000);
            }
        });

        socket.on('map_update', (data: { overlay: MapOverlay }) => {
            addOverlay(data.overlay);
        });

        socket.on('overlays_set', (data: { overlays: MapOverlay[] }) => {
            setOverlays(data.overlays);
            // Check if admin published the player's pending pin
            const current = useGameStore.getState().pendingPin;
            if (current && data.overlays.some((o) => o.id === `action_pin_${current.decisionId}`)) {
                setPendingPin(null);
                setPinPublished(true);
                setTimeout(() => setPinPublished(false), 4000);
            }
        });

        socket.on('timer_update', (data: { remainingMs: number; running: boolean }) => {
            setTimer(data.remainingMs, data.running);
        });

        socket.on('phase_changed', (data: { phaseIndex: number; phaseName?: string | null }) => {
            setCurrentPhaseIndex(data.phaseIndex);
        });

        socket.on('scenario_stopped', () => {
            router.push('/player/feedback');
        });

        return () => {
            socket.off('connect', registerWithServer);
            socket.off('inject_received');
            socket.off('action_response');
            socket.off('map_update');
            socket.off('overlays_set');
            socket.off('timer_update');
            socket.off('phase_changed');
            socket.off('scenario_stopped');
        };
    }, [player, session]);

    // Local countdown: tick every 500 ms when timerRunning, sync from store
    useEffect(() => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (timerMs === null) { setDisplayMs(null); return; }
        if (!timerRunning) { setDisplayMs(timerMs); return; }
        // Compute how much time has elapsed since the store was last updated
        const elapsed = timerUpdatedAt ? Date.now() - timerUpdatedAt : 0;
        const initial = Math.max(0, timerMs - elapsed);
        setDisplayMs(initial);
        if (initial === 0) return;
        timerIntervalRef.current = setInterval(() => {
            setDisplayMs((prev) => {
                if (prev === null || prev <= 0) {
                    clearInterval(timerIntervalRef.current!);
                    return 0;
                }
                return prev - 500;
            });
        }, 500);
        return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
    }, [timerMs, timerRunning, timerUpdatedAt]);

    return (
        <main className="relative w-full h-dvh overflow-hidden bg-gray-100">
            {/* Map fills the screen */}
            <GameMap overlays={overlays} pendingPin={pendingPin} incidentLocation={incidentLocation} />

            {/* Top-right cluster: timer + scenario time + phase */}
            <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1.5">
                {/* Game timer */}
                {displayMs !== null && (
                    <div className={`px-4 py-2 rounded-xl shadow-lg font-mono font-bold text-xl tracking-widest transition ${
                        displayMs <= 60000
                            ? 'bg-red-600 text-white animate-pulse'
                            : displayMs <= 180000
                            ? 'bg-amber-500 text-white'
                            : 'bg-white/90 backdrop-blur text-gray-900 border border-gray-200'
                    }`}>
                        {formatTimer(displayMs)}
                    </div>
                )}
                {/* Scenario time badge */}
                {scenarioTime && (
                    <div className="bg-black/60 backdrop-blur rounded-lg px-3 py-1 text-white font-mono text-xs font-semibold shadow">
                        🕐 {scenarioTime}
                    </div>
                )}
                {/* Phase badge */}
                {currentPhaseIndex !== null && (
                    <div className="bg-blue-600/80 backdrop-blur rounded-lg px-3 py-1 text-white text-xs font-semibold shadow">
                        Fase {currentPhaseIndex + 1}
                    </div>
                )}
            </div>

            {/* Role badge top left — tappable to open detail */}
            {player?.role && (
                <button
                    onClick={() => setShowRoleDetail(true)}
                    className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur border border-gray-200 rounded-xl px-4 py-2 shadow-md text-left hover:bg-white transition"
                >
                    <p className="text-gray-500 text-xs uppercase tracking-widest">Jouw rol</p>
                    <div className="flex items-center gap-1.5">
                        <p className="text-gray-900 font-bold text-sm">{player.role.name}</p>
                        <span className="text-gray-400 text-xs">›</span>
                    </div>
                </button>
            )}

            {/* Role detail panel */}
            {showRoleDetail && player?.role && (
                <RoleDetailPanel role={player.role} onClose={() => setShowRoleDetail(false)} />
            )}

            {/* Pending pin banner */}
            {pendingPin && !pinPublished && (
                <div className="absolute bottom-24 left-0 right-0 z-20 flex justify-center px-4">
                    <div className="bg-orange-50 border border-orange-300 rounded-xl px-4 py-3 text-orange-700 text-sm shadow-md flex items-center gap-3">
                        <span className="animate-pulse">📍</span>
                        <span>Locatie ingediend — wachten op goedkeuring</span>
                        <button
                            onClick={() => setPendingPin(null)}
                            className="text-orange-400 hover:text-orange-600 text-xs ml-1 transition"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Pin published confirmation */}
            {pinPublished && (
                <div className="absolute bottom-24 left-0 right-0 z-20 flex justify-center px-4">
                    <div className="bg-green-50 border border-green-300 rounded-xl px-4 py-3 text-green-700 text-sm shadow-md flex items-center gap-2">
                        <span>✓</span>
                        <span>Jouw locatie is gepubliceerd op de kaart</span>
                    </div>
                </div>
            )}

            {/* Admin response feedback */}
            {actionFeedback && (
                <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium transition ${
                    actionFeedback.approved
                        ? 'bg-green-50 border-green-300 text-green-800'
                        : 'bg-red-50 border-red-300 text-red-800'
                }`}>
                    {actionFeedback.approved ? '✓ Actie goedgekeurd' : '✗ Actie afgewezen'}
                    {actionFeedback.response && <span className="ml-2 font-normal">— {actionFeedback.response}</span>}
                </div>
            )}


            {/* Toast notifications */}
            <InjectToast />

            {/* Inject history panel */}
            <InjectHistoryPanel />

            {/* Ability menu */}
            <AbilityMenu />

            {/* Inject modal */}
            <InjectModal />
        </main>
    );
}
