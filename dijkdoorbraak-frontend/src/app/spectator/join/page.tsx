'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { connectSocket } from '@/lib/socket';
import { useSpectatorStore } from '@/lib/spectatorStore';

function SpectatorJoinForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setSession, setPlayers, setName } = useSpectatorStore();

    const [joinCode, setJoinCode] = useState('');
    const [name, setNameInput] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const code = searchParams.get('code');
        if (code) setJoinCode(code.toUpperCase());
    }, [searchParams]);

    async function handleJoin() {
        if (!joinCode.trim() || !name.trim()) {
            setError('Vul een code en naam in.');
            return;
        }

        setLoading(true);
        setError('');

        const socket = connectSocket();

        socket.emit('spectator_join', { joinCode: joinCode.toUpperCase(), name }, (res: any) => {
            setLoading(false);

            if (!res.success) {
                setError(res.message || 'Kan niet deelnemen. Controleer de code.');
                return;
            }

            setSession(res.session);
            setPlayers(res.players ?? []);
            setName(name);
            router.push('/spectator/game');
        });
    }

    return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-sm space-y-8">

                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-2">
                        <span className="text-white text-2xl">👁</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        Dijkdoorbraak
                    </h1>
                    <p className="text-gray-500 text-sm">
                        Toeschouwer — volg de oefening live
                    </p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-gray-700 text-sm font-medium">Sessiecode</label>
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="bijv. KPF92X"
                            maxLength={6}
                            className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-lg font-mono tracking-widest uppercase placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-gray-700 text-sm font-medium">Naam</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setNameInput(e.target.value)}
                            placeholder="Jouw naam"
                            maxLength={32}
                            className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                        />
                    </div>

                    {error && (
                        <p className="text-red-600 text-sm text-center">{error}</p>
                    )}

                    <button
                        onClick={handleJoin}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-xl py-3 transition"
                    >
                        {loading ? 'Verbinden...' : 'Als toeschouwer deelnemen'}
                    </button>
                </div>

                <p className="text-center text-gray-400 text-xs">
                    Als toeschouwer zie je de kaart en acties live mee, maar je neemt niet actief deel.
                </p>
            </div>
        </main>
    );
}

export default function SpectatorJoinPage() {
    return (
        <Suspense>
            <SpectatorJoinForm />
        </Suspense>
    );
}
