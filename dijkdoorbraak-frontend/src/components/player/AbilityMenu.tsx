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
                    <div className="bg-green-900/90 border border-green-600 rounded-xl px-4 py-3 text-green-300 text-sm">
                        Actie ingediend: {submitted}
                    </div>
                </div>
            )}

            {/* Ability list */}
            {open && (
                <div className="absolute bottom-20 right-4 z-20 w-72 bg-zinc-900/95 backdrop-blur border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800">
                        <p className="text-zinc-400 text-xs uppercase tracking-widest">Acties</p>
                        <p className="text-white font-bold text-sm">{player?.role?.name}</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {abilities.map((ability) => (
                            <button
                                key={ability.id}
                                onClick={() => submitAbility(ability.id, ability.name)}
                                className="w-full text-left px-4 py-3 text-white text-sm hover:bg-zinc-800 border-b border-zinc-800/50 last:border-0 transition"
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
                className="absolute bottom-6 right-4 z-20 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full shadow-xl flex items-center justify-center transition"
            >
                <span className="text-white text-2xl">{open ? 'x' : '⚡'}</span>
            </button>
        </>
    );
}