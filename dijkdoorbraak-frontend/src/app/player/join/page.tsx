'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { connectSocket } from '@/lib/socket';
import { useGameStore } from '@/lib/store';

function JoinForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setPlayer, setSession, setLobbyPlayers } = useGameStore();

    const [joinCode, setJoinCode] = useState('');
    const [nickname, setNickname] = useState('');

    useEffect(() => {
        const code = searchParams.get('code');
        if (code) setJoinCode(code.toUpperCase());
    }, [searchParams]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleJoin() {
        if (!joinCode.trim() || !nickname.trim()) {
            setError('Vul een code en naam in.');
            return;
        }

        setLoading(true);
        setError('');

        const socket = connectSocket();

        socket.emit('join_lobby', { joinCode: joinCode.toUpperCase(), nickname }, (res: any) => {
            setLoading(false);

            if (!res.success) {
                setError(res.message || 'Kan niet deelnemen. Controleer de code.');
                return; 
            }

            setLobbyPlayers([]);
            setPlayer(res.player);
            setSession(res.player.session);
            router.push('/player/lobby');
        });
    }

    return (
        <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-sm space-y-8">

                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        Dijkdoorbraak
                    </h1>
                    <p className="text-zinc-400 text-sm">
                        Voer de sessioncode in om deel te nemen
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-zinc-300 text-sm font-medium">
                            Sessiecode
                        </label>

                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="bijv. KPF92X"
                            maxLength={6}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-lg font-mono tracking-widest uppercase placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-zinc-300 text-sm font-medium">
                            Naam
                        </label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Jouw naam"
                            maxLength={32}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition"
                            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    )}

                    <button
                        onClick={handleJoin}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-xl py-3 transition"
                    >
                        {loading ? 'Deelnemen...' : 'Deelnemen'}
                    </button>
                </div>

            </div>
        </main>
    );
}

export default function JoinPage() {
    return (
        <Suspense>
            <JoinForm />
        </Suspense>
    );
}