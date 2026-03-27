'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';

export default function AbilityMenu() {
    const [open, setOpen] = useState(false);
    const [submitted, setSubmitted] = useState<string | null>(null);
    const { player, session } = useGameStore();

    const abilities = player?.role?.abilities ?? [];

    async function submitAbility(abilityId: string, abilityName: string) {
        const socket = getSocket();
        socket.emit('submit_action', {
            playerId: player?.id,
            sessionId: session?.id,
            abilityId,
        }, (res: any) => {
            if (res.success) {
                setSubmitted(abilityName);
                setTimeout(() => setSubmitted(null), 3000);
                setOpen(false);
            }
        });
    }

    return (
        <>
            {/* Submitted feedback */}
            {submitted && (
                <div className="absolute bottom-24 left-0 right-0 z-20 flex justify-center px-4">
                    <div className="bg-green-50 border border-green-300 rounded-xl px-4 py-3 text-green-700 text-sm shadow-md">
                        Actie ingediend: {submitted}
                    </div>
                </div>
            )}

            {/* Ability list */}
            {open && (
                <div className="absolute right-4 z-20 w-72 bg-white/95 backdrop-blur border border-gray-200 rounded-2xl shadow-xl overflow-hidden" style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                        <p className="text-gray-500 text-xs uppercase tracking-widest">Acties</p>
                        <p className="text-gray-900 font-bold text-sm">{player?.role?.name}</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {abilities.map((ability) => (
                            <button
                                key={ability.id}
                                onClick={() => submitAbility(ability.id, ability.name)}
                                className="w-full text-left px-4 py-3 text-gray-800 text-sm hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 last:border-0 transition"
                            >
                                {ability.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* FAB button */}
            <button
                onClick={() => setOpen(!open)}
                className="absolute right-4 z-20 w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full shadow-xl flex items-center justify-center transition"
                style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
            >
                <span className="text-white text-2xl">{open ? '✕' : '⚡'}</span>
            </button>
        </>
    );
}
