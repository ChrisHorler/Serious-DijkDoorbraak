'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useGameStore, MapOverlay } from '@/lib/store';
import dynamic from 'next/dynamic';
import AbilityMenu from '@/components/player/AbilityMenu';
import InjectToast from '@/components/player/InjectToast';
import InjectModal from '@/components/player/InjectModal';

const GameMap = dynamic(() => import('@/components/player/GameMap'), { ssr: false });

export default function GamePage() {
    const router = useRouter();
    const { player, session, addInject, addToast, setActiveInject, addOverlay, setOverlays, overlays } = useGameStore();

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

        socket.on('action_response', (data: any) => {
            console.log('action_response:', data);
        });

        socket.on('map_update', (data: { overlay: MapOverlay }) => {
            addOverlay(data.overlay);
        });

        socket.on('overlays_set', (data: { overlays: MapOverlay[] }) => {
            setOverlays(data.overlays);
        });

        socket.on('scenario_stopped', () => {
            router.push('/player/join');
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

            {/* Role badge top left */}
            {player?.role && (
                <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur border border-gray-200 rounded-xl px-4 py-2 shadow-md">
                    <p className="text-gray-500 text-xs uppercase tracking-widest">Jouw rol</p>
                    <p className="text-gray-900 font-bold text-sm">{player.role.name}</p>
                </div>
            )}

            {/* Toast notifications */}
            <InjectToast />

            {/* Ability menu */}
            <AbilityMenu />

            {/* Inject modal */}
            <InjectModal />
        </main>
    );
}
