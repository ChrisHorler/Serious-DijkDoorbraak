'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAdminStore, Decision, MapOverlay } from '@/lib/adminStore';
import { connectAdminSocket, getSocket } from '@/lib/socket';
import { Inject } from '@/lib/store';
import { getPhaseOverlays } from '@/lib/overlayPresets';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const AdminMap = dynamic(() => import('@/components/admin/AdminMap'), { ssr: false });

export default function AdminSessionPage() {
    const router = useRouter();
    const {
        authenticated, token, session, players, decisions, overlays, injects,
        addDecision, updateDecision, clearDecisions, setInjects, addOverlay,
        phases, currentPhaseIndex, setCurrentPhaseIndex, setOverlays,
        incidentLocation,
    } = useAdminStore();

    const [respondingTo, setRespondingTo] = useState<Decision | null>(null);
    const [responseText, setResponseText] = useState('');
    const [responseScore, setResponseScore] = useState('');
    const [selectedInject, setSelectedInject] = useState('');
    const [stopping, setStopping] = useState(false);

    useEffect(() => {
        if (!authenticated || !session) {
            router.replace('/admin');
            return;
        }

        clearDecisions();

        const socket = connectAdminSocket(token!);
        socket.emit('admin_join', { sessionId: session.id });

        socket.on('action_submitted', (data: { decision: Decision }) => {
            addDecision(data.decision);
        });

        socket.on('action_response', (data: { decision: Decision }) => {
            updateDecision(data.decision);
        });

        socket.on('scenario_stopped', () => {
            router.push('/admin/lobby');
        });

        // Fetch injects for manual triggering
        fetch(`${BACKEND_URL}/injects/scenario/${session.scenarioId}`)
            .then((r) => r.json())
            .then(setInjects);

        return () => {
            socket.off('action_submitted');
            socket.off('action_response');
            socket.off('scenario_stopped');
        };
    }, [authenticated, session]);

    function stopScenario() {
        if (!session) return;
        setStopping(true);
        const socket = getSocket();
        socket.emit('stop_scenario', { sessionId: session.id }, (ack: any) => {
            if (!ack?.success) setStopping(false);
        });
    }

    function fireInject() {
        if (!session || !selectedInject) return;
        const socket = getSocket();
        socket.emit('fire_inject', { sessionId: session.id, injectId: selectedInject }, () => {
            setSelectedInject('');
        });
    }

    function handleNextPhase() {
        if (!session || currentPhaseIndex >= phases.length - 1) return;
        const nextIndex = currentPhaseIndex + 1;
        const phase = phases[nextIndex];
        const socket = getSocket();
        const phaseOverlays = getPhaseOverlays(phase, incidentLocation ?? undefined);

        // Replace all overlays for all players
        socket.emit('set_overlays', { sessionId: session.id, overlays: phaseOverlays }, () => {});
        // Also update admin's own overlay view
        setOverlays(phaseOverlays);

        // Fire inject if phase has one
        if (phase.injectId) {
            socket.emit('fire_inject', { sessionId: session.id, injectId: phase.injectId }, () => {});
        }

        setCurrentPhaseIndex(nextIndex);
    }

    function submitResponse(approved: boolean) {
        if (!respondingTo || !session) return;
        const socket = getSocket();
        socket.emit('admin_respond', {
            decisionId: respondingTo.id,
            sessionId: session.id,
            adminResponse: responseText,
            adminApproved: approved,
            score: responseScore ? Number(responseScore) : null,
        }, (ack: any) => {
            if (ack?.success) {
                setRespondingTo(null);
                setResponseText('');
                setResponseScore('');
            }
        });
    }

    const pendingCustomActions = decisions.filter(
        (d) => d.customAction !== null && d.adminApproved === null
    );

    const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

    function roleLabel(playerId: string) {
        const p = playerMap[playerId];
        if (!p) return 'Onbekend';
        return p.role ? `${p.nickname} (${p.role.shortName})` : p.nickname;
    }

    return (
        <main className="min-h-screen bg-zinc-950 text-white flex flex-col overflow-hidden" style={{ height: '100vh' }}>
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 shrink-0">
                <div>
                    <h1 className="font-bold text-lg">Spelleider — Sessie actief</h1>
                    <p className="text-zinc-400 text-xs">
                        Code: <span className="font-mono font-bold text-white">{session?.joinCode}</span>
                        &nbsp;·&nbsp;{players.length} deelnemers
                    </p>
                </div>

                {/* Phase controls */}
                {phases.length > 0 && (
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-zinc-500 text-xs uppercase tracking-widest">Fase</p>
                            <p className="text-white text-sm font-semibold">
                                {currentPhaseIndex < 0 ? '—' : `${currentPhaseIndex + 1}/${phases.length}: ${phases[currentPhaseIndex].name}`}
                            </p>
                        </div>
                        <button
                            onClick={handleNextPhase}
                            disabled={currentPhaseIndex >= phases.length - 1}
                            className="bg-blue-700 hover:bg-blue-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-xl px-4 py-2 text-sm transition"
                        >
                            {currentPhaseIndex < 0
                                ? `▶ ${phases[0].name}`
                                : currentPhaseIndex < phases.length - 1
                                    ? `▶ ${phases[currentPhaseIndex + 1].name}`
                                    : 'Laatste fase'}
                        </button>
                    </div>
                )}

                <button
                    onClick={stopScenario}
                    disabled={stopping}
                    className="bg-red-700 hover:bg-red-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-xl px-5 py-2 transition text-sm"
                >
                    {stopping ? 'Stoppen...' : '⏹ Stop scenario'}
                </button>
            </div>

            {/* Three-panel body */}
            <div className="flex flex-1 min-h-0 divide-x divide-zinc-800">

                {/* LEFT — Action feed */}
                <div className="w-80 shrink-0 flex flex-col min-h-0">
                    <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
                        <h2 className="font-semibold text-sm uppercase tracking-widest text-zinc-400">Actiefeed</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {decisions.length === 0 && (
                            <p className="text-zinc-600 text-sm text-center pt-8">Nog geen acties...</p>
                        )}
                        {decisions.map((d) => (
                            <div
                                key={d.id}
                                className={`rounded-xl p-3 text-sm border ${
                                    d.customAction && d.adminApproved === null
                                        ? 'border-amber-600/50 bg-amber-950/30'
                                        : 'border-zinc-800 bg-zinc-900'
                                }`}
                            >
                                <p className="font-medium text-zinc-200 mb-1">{roleLabel(d.playerId)}</p>
                                {d.customAction ? (
                                    <p className="text-zinc-400 italic">"{d.customAction}"</p>
                                ) : (
                                    <p className="text-zinc-400">{d.ability?.name ?? 'Vaardigheid ingezet'}</p>
                                )}
                                {d.adminApproved !== null && (
                                    <p className={`text-xs mt-1 font-medium ${d.adminApproved ? 'text-green-400' : 'text-red-400'}`}>
                                        {d.adminApproved ? '✓ Goedgekeurd' : '✗ Afgewezen'}
                                        {d.score !== null ? ` · Score: ${d.score}` : ''}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* CENTER — Map + inject trigger */}
                <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
                    <div className="flex-1 min-h-0">
                        {session && (
                            <AdminMap
                                sessionId={session.id}
                                overlays={overlays}
                                onToggleOverlay={addOverlay}
                                center={incidentLocation ?? undefined}
                            />
                        )}
                    </div>

                    {/* Manual inject trigger */}
                    <div className="shrink-0 bg-zinc-900 border border-zinc-700 rounded-xl p-4 flex gap-3 items-end">
                        <div className="flex-1">
                            <label className="text-zinc-400 text-xs uppercase tracking-widest block mb-1">
                                Inject handmatig sturen
                            </label>
                            <select
                                value={selectedInject}
                                onChange={(e) => setSelectedInject(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Selecteer inject...</option>
                                {injects.map((inject: Inject) => (
                                    <option key={inject.id} value={inject.id}>
                                        T+{inject.triggerTime}s — {inject.title}
                                        {inject.targetRole ? ` (${inject.targetRole})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={fireInject}
                            disabled={!selectedInject}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-lg px-4 py-2 text-sm transition shrink-0"
                        >
                            Verstuur
                        </button>
                    </div>
                </div>

                {/* RIGHT — Custom action responses */}
                <div className="w-80 shrink-0 flex flex-col min-h-0">
                    <div className="px-4 py-3 border-b border-zinc-800 shrink-0 flex items-center justify-between">
                        <h2 className="font-semibold text-sm uppercase tracking-widest text-zinc-400">Reacties vereist</h2>
                        {pendingCustomActions.length > 0 && (
                            <span className="bg-amber-500 text-black text-xs font-bold rounded-full px-2 py-0.5">
                                {pendingCustomActions.length}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {pendingCustomActions.length === 0 && (
                            <p className="text-zinc-600 text-sm text-center pt-8">Geen openstaande acties...</p>
                        )}
                        {pendingCustomActions.map((d) => (
                            <div key={d.id} className="bg-zinc-900 border border-amber-600/40 rounded-xl p-3 space-y-2">
                                <p className="font-medium text-sm text-zinc-200">{roleLabel(d.playerId)}</p>
                                <p className="text-amber-300 text-sm italic">"{d.customAction}"</p>
                                {respondingTo?.id === d.id ? (
                                    <div className="space-y-2">
                                        <textarea
                                            value={responseText}
                                            onChange={(e) => setResponseText(e.target.value)}
                                            placeholder="Reactie (optioneel)..."
                                            rows={2}
                                            className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 resize-none"
                                        />
                                        <input
                                            type="number"
                                            value={responseScore}
                                            onChange={(e) => setResponseScore(e.target.value)}
                                            placeholder="Score (optioneel)"
                                            className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => submitResponse(true)}
                                                className="flex-1 bg-green-700 hover:bg-green-600 text-white text-sm font-semibold rounded-lg py-1.5 transition"
                                            >
                                                ✓ Goed
                                            </button>
                                            <button
                                                onClick={() => submitResponse(false)}
                                                className="flex-1 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded-lg py-1.5 transition"
                                            >
                                                ✗ Afwijzen
                                            </button>
                                            <button
                                                onClick={() => setRespondingTo(null)}
                                                className="bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg px-3 py-1.5 transition"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setRespondingTo(d)}
                                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg py-1.5 transition border border-zinc-700"
                                    >
                                        Reageer
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </main>
    );
}
