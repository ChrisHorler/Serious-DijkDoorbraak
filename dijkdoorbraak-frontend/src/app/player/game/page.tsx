'use client';

import { useEffect, useState } from 'react';
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

export default function GamePage() {
    const router = useRouter();
    const { player, session, addInject, addToast, setActiveInject, addOverlay, setOverlays, overlays } = useGameStore();
    const [actionFeedback, setActionFeedback] = useState<{ approved: boolean; response: string | null } | null>(null);
    const [showRoleDetail, setShowRoleDetail] = useState(false);

    useEffect(() => {
        if (!player || !session) {
            router.replace('/player/join');
            return;
        }

        const socket = getSocket();

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
        });

        socket.on('scenario_stopped', () => {
            router.push('/player/feedback');
        });

        return () => {
            socket.off('inject_received');
            socket.off('action_response');
            socket.off('map_update');
            socket.off('overlays_set');
            socket.off('scenario_stopped');
        };
    }, [player, session]);

    return (
        <main className="relative w-full h-dvh overflow-hidden bg-gray-100">
            {/* Map fills the screen */}
            <GameMap overlays={overlays} />

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
