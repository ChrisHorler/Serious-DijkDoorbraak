'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getSocket } from '@/lib/socket';
import { useSpectatorStore, SpectatorDecision } from '@/lib/spectatorStore';
import { MapOverlay, Inject } from '@/lib/store';

const GameMap = dynamic(() => import('@/components/player/GameMap'), { ssr: false });

export default function SpectatorGamePage() {
    const router = useRouter();
    const {
        session, players, overlays, injects, decisions,
        addInject, addDecision, updateDecision, addOverlay, setOverlays,
        currentPhase, setCurrentPhase,
    } = useSpectatorStore();

    const [activeInject, setActiveInject] = useState<Inject | null>(null);
    const [feedTab, setFeedTab] = useState<'injects' | 'actions'>('injects');

    useEffect(() => {
        if (!session) {
            router.replace('/spectator/join');
            return;
        }

        const socket = getSocket();

        socket.on('inject_received', (data: { inject: Inject }) => {
            addInject(data.inject);
        });

        socket.on('map_update', (data: { overlay: MapOverlay }) => {
            addOverlay(data.overlay);
        });

        socket.on('overlays_set', (data: { overlays: MapOverlay[] }) => {
            setOverlays(data.overlays);
        });

        socket.on('action_submitted', (data: { decision: SpectatorDecision }) => {
            addDecision(data.decision);
        });

        socket.on('action_response', (data: { decision: SpectatorDecision }) => {
            updateDecision(data.decision);
        });

        socket.on('lobby_updated', (data: { players: any[] }) => {
            useSpectatorStore.getState().setPlayers(data.players);
        });

        socket.on('scenario_stopped', () => {
            router.push('/spectator/join');
        });

        return () => {
            socket.off('inject_received');
            socket.off('map_update');
            socket.off('overlays_set');
            socket.off('action_submitted');
            socket.off('action_response');
            socket.off('lobby_updated');
            socket.off('scenario_stopped');
        };
    }, [session]);

    const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

    function roleLabel(playerId: string) {
        const p = playerMap[playerId];
        if (!p) return 'Onbekend';
        return p.role ? `${p.nickname} (${p.role.shortName})` : p.nickname;
    }

    return (
        <main className="h-dvh w-full flex flex-col overflow-hidden bg-gray-50">
            {/* Top bar */}
            <div className="bg-blue-700 text-white px-6 py-3 shrink-0 flex items-center justify-between shadow-sm">
                <div>
                    <h1 className="font-bold text-base">Toeschouwer — Dijkdoorbraak</h1>
                    <p className="text-blue-200 text-xs">
                        Code: <span className="font-mono font-bold text-white">{session?.joinCode}</span>
                        &nbsp;·&nbsp;{players.length} deelnemers
                        {currentPhase && <>&nbsp;·&nbsp;{currentPhase}</>}
                    </p>
                </div>
                <div className="bg-blue-600 rounded-lg px-3 py-1.5">
                    <p className="text-blue-200 text-xs uppercase tracking-widest">Live</p>
                </div>
            </div>

            {/* Body: map + sidebar */}
            <div className="flex flex-1 min-h-0">
                {/* Map */}
                <div className="flex-1 relative min-h-0">
                    <GameMap overlays={overlays} />

                    {/* Inject detail overlay */}
                    {activeInject && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <p className="text-red-600 text-xs uppercase tracking-widest font-medium">Incident melding</p>
                                </div>
                                <h2 className="text-gray-900 text-xl font-bold mb-3">{activeInject.title}</h2>
                                <p className="text-gray-600 text-sm leading-relaxed">{activeInject.content}</p>
                                {activeInject.targetRole && (
                                    <p className="mt-3 text-blue-600 text-xs font-medium">
                                        Gericht aan: {activeInject.targetRole}
                                    </p>
                                )}
                                <button
                                    onClick={() => setActiveInject(null)}
                                    className="mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-3 text-sm font-medium transition"
                                >
                                    Sluiten
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="w-80 shrink-0 flex flex-col border-l border-gray-200 bg-white">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-100 shrink-0">
                        <button
                            onClick={() => setFeedTab('injects')}
                            className={`flex-1 py-3 text-sm font-medium transition border-b-2 ${
                                feedTab === 'injects'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Injects
                            {injects.length > 0 && (
                                <span className="ml-1.5 bg-blue-100 text-blue-700 text-xs rounded-full px-1.5 py-0.5">
                                    {injects.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setFeedTab('actions')}
                            className={`flex-1 py-3 text-sm font-medium transition border-b-2 ${
                                feedTab === 'actions'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Acties
                            {decisions.length > 0 && (
                                <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs rounded-full px-1.5 py-0.5">
                                    {decisions.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Feed content */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {feedTab === 'injects' && (
                            <>
                                {injects.length === 0 && (
                                    <p className="text-gray-400 text-sm text-center pt-8">Nog geen injects verstuurd...</p>
                                )}
                                {[...injects].reverse().map((inject) => (
                                    <button
                                        key={inject.id}
                                        onClick={() => setActiveInject(inject)}
                                        className="w-full text-left bg-red-50 border border-red-200 rounded-xl p-3 hover:bg-red-100 transition"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                            <p className="text-red-600 text-xs font-medium uppercase tracking-widest">Incident</p>
                                        </div>
                                        <p className="text-gray-900 font-semibold text-sm">{inject.title}</p>
                                        {inject.targetRole && (
                                            <p className="text-gray-500 text-xs mt-0.5">→ {inject.targetRole}</p>
                                        )}
                                        <p className="text-gray-400 text-xs mt-1">Tik voor details</p>
                                    </button>
                                ))}
                            </>
                        )}

                        {feedTab === 'actions' && (
                            <>
                                {decisions.length === 0 && (
                                    <p className="text-gray-400 text-sm text-center pt-8">Nog geen acties ingediend...</p>
                                )}
                                {[...decisions].reverse().map((d) => (
                                    <div
                                        key={d.id}
                                        className={`rounded-xl p-3 text-sm border ${
                                            d.customAction && d.adminApproved === null
                                                ? 'border-amber-200 bg-amber-50'
                                                : 'border-gray-100 bg-gray-50'
                                        }`}
                                    >
                                        <p className="font-medium text-gray-800 mb-1">{roleLabel(d.playerId)}</p>
                                        {d.customAction ? (
                                            <p className="text-gray-600 italic text-xs">"{d.customAction}"</p>
                                        ) : (
                                            <p className="text-gray-500 text-xs">{d.ability?.name ?? 'Vaardigheid ingezet'}</p>
                                        )}
                                        {d.adminApproved !== null && (
                                            <p className={`text-xs mt-1 font-medium ${d.adminApproved ? 'text-green-600' : 'text-red-500'}`}>
                                                {d.adminApproved ? '✓ Goedgekeurd' : '✗ Afgewezen'}
                                                {d.score !== null ? ` · Score: ${d.score}` : ''}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>

                    {/* Player list at bottom */}
                    <div className="border-t border-gray-100 shrink-0">
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                            <p className="text-gray-500 text-xs uppercase tracking-widest">Deelnemers ({players.length})</p>
                        </div>
                        <div className="max-h-40 overflow-y-auto divide-y divide-gray-50">
                            {players.map((p) => (
                                <div key={p.id} className="px-4 py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        <span className="text-gray-800 text-xs font-medium">{p.nickname}</span>
                                    </div>
                                    {p.role && (
                                        <span className="text-blue-600 text-xs font-mono">{p.role.shortName}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
