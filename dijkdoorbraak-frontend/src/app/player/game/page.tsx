'use client';

import { useEffect, useRef } from 'react';
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
    const { player, session, addInject, addToast, setActiveInject, addOverlay, overlays } = useGameStore();

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

        socket.on('scenario_stopped', () => {
            router.push('/player/join');
        });

        return () => {
            socket.off('inject_received');
            socket.off('action_response');
            socket.off('map_update');
            socket.off('scenario_stopped');
        };
    }, [player, session]);

    return (
        <main className="relative w-full h-screen overflow-hidden bg-zinc-950">
            {/* Map fills the screen */}
            <GameMap overlays={overlays} />

            {/* Role badge top left */}
            {player?.role && (
                <div className="absolute top-4 left-4 z-10 bg-zinc-900/90 backdrop-blur border border-zinc-700 rounded-xl px-4 py-2">
                    <p className="text-zinc-400 text-xs uppercase tracking-widest">Jouw rol</p>
                    <p className="text-white font-bold text-sm">{player.role.name}</p>
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