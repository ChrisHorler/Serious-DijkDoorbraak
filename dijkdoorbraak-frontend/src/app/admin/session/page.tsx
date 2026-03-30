'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAdminStore, Decision, FeedbackItem } from '@/lib/adminStore';
import { connectAdminSocket, getSocket } from '@/lib/socket';
import { Inject } from '@/lib/store';
import { getPhaseOverlays } from '@/lib/overlayPresets';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const AdminMap = dynamic(() => import('@/components/admin/AdminMap'), { ssr: false });

const URGENCY_LABEL: Record<string, { label: string; className: string }> = {
    low:    { label: 'Laag',   className: 'bg-green-100 text-green-700' },
    medium: { label: 'Middel', className: 'bg-amber-100 text-amber-700' },
    high:   { label: 'Hoog',   className: 'bg-red-100 text-red-700' },
};

export default function AdminSessionPage() {
    const router = useRouter();
    const {
        authenticated, token, session, players, decisions, overlays, injects,
        addDecision, updateDecision, clearDecisions, setInjects, addOverlay,
        phases, currentPhaseIndex, setCurrentPhaseIndex, setOverlays,
        incidentLocation, scenarioCustomOverlays,
    } = useAdminStore();

    const [respondingTo, setRespondingTo] = useState<Decision | null>(null);
    const [responseText, setResponseText] = useState('');
    const [responseScore, setResponseScore] = useState('');
    const [selectedInject, setSelectedInject] = useState('');
    const [stopping, setStopping] = useState(false);
    const [sessionEnded, setSessionEnded] = useState(false);
    const [rightTab, setRightTab] = useState<'actions' | 'feedback'>('actions');
    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);

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
            setSessionEnded(true);
            setRightTab('feedback');
        });

        socket.on('feedback_received', (data: { feedback: FeedbackItem }) => {
            setFeedbacks((prev) => [...prev, data.feedback]);
        });

        // Fetch injects for manual triggering
        fetch(`${BACKEND_URL}/injects/scenario/${session.scenarioId}`)
            .then((r) => r.json())
            .then(setInjects);

        return () => {
            socket.off('action_submitted');
            socket.off('action_response');
            socket.off('scenario_stopped');
            socket.off('feedback_received');
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
        const inject = injects.find((i: Inject) => i.id === selectedInject);
        if (inject?.targetRole) {
            const hasMatchingPlayer = players.some((p) => p.role?.shortName === inject.targetRole);
            if (!hasMatchingPlayer && !window.confirm(`Waarschuwing: geen deelnemer heeft de rol "${inject.targetRole}". De inject wordt aan niemand verstuurd. Toch versturen?`)) {
                return;
            }
        }
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
        const phaseOverlays = getPhaseOverlays(phase, incidentLocation ?? undefined, scenarioCustomOverlays);

        socket.emit('set_overlays', { sessionId: session.id, overlays: phaseOverlays }, () => {});
        setOverlays(phaseOverlays);

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

    const avgRating = feedbacks.length > 0
        ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
        : null;

    return (
        <main className="min-h-screen bg-gray-50 text-gray-900 flex flex-col overflow-hidden" style={{ height: '100vh' }}>
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-blue-700 text-white shadow-sm shrink-0">
                <div>
                    <h1 className="font-bold text-lg">
                        Spelleider — {sessionEnded ? 'Sessie beëindigd' : 'Sessie actief'}
                    </h1>
                    <p className="text-blue-200 text-xs">
                        Code: <span className="font-mono font-bold text-white">{session?.joinCode}</span>
                        &nbsp;·&nbsp;{players.length} deelnemers
                    </p>
                </div>

                {/* Phase controls */}
                {!sessionEnded && phases.length > 0 && (
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-blue-200 text-xs uppercase tracking-widest">Fase</p>
                            <p className="text-white text-sm font-semibold">
                                {currentPhaseIndex < 0 ? '—' : `${currentPhaseIndex + 1}/${phases.length}: ${phases[currentPhaseIndex].name}`}
                            </p>
                        </div>
                        <button
                            onClick={handleNextPhase}
                            disabled={currentPhaseIndex >= phases.length - 1}
                            className="bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:text-white/40 text-white font-semibold rounded-xl px-4 py-2 text-sm transition"
                        >
                            {currentPhaseIndex < 0
                                ? `▶ ${phases[0].name}`
                                : currentPhaseIndex < phases.length - 1
                                    ? `▶ ${phases[currentPhaseIndex + 1].name}`
                                    : 'Laatste fase'}
                        </button>
                    </div>
                )}

                {sessionEnded ? (
                    <button
                        onClick={() => router.push('/admin/lobby')}
                        className="bg-white text-blue-700 font-semibold rounded-xl px-5 py-2 transition text-sm hover:bg-blue-50"
                    >
                        ← Terug naar lobby
                    </button>
                ) : (
                    <button
                        onClick={stopScenario}
                        disabled={stopping}
                        className="bg-red-500 hover:bg-red-400 disabled:bg-white/10 disabled:text-white/40 text-white font-semibold rounded-xl px-5 py-2 transition text-sm"
                    >
                        {stopping ? 'Stoppen...' : '⏹ Stop scenario'}
                    </button>
                )}
            </div>

            {/* Three-panel body */}
            <div className="flex flex-1 min-h-0 divide-x divide-gray-200">

                {/* LEFT — Action feed */}
                <div className="w-80 shrink-0 flex flex-col min-h-0 bg-white">
                    <div className="px-4 py-3 border-b border-gray-100 shrink-0 bg-gray-50">
                        <h2 className="font-semibold text-sm uppercase tracking-widest text-gray-500">Actiefeed</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {decisions.length === 0 && (
                            <p className="text-gray-400 text-sm text-center pt-8">Nog geen acties...</p>
                        )}
                        {decisions.map((d) => (
                            <div
                                key={d.id}
                                className={`rounded-xl p-3 text-sm border ${
                                    d.customAction && d.adminApproved === null
                                        ? 'border-amber-300 bg-amber-50'
                                        : 'border-gray-100 bg-gray-50'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className="font-medium text-gray-800">{roleLabel(d.playerId)}</p>
                                    {d.actionUrgency && URGENCY_LABEL[d.actionUrgency] && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${URGENCY_LABEL[d.actionUrgency].className}`}>
                                            {URGENCY_LABEL[d.actionUrgency].label}
                                        </span>
                                    )}
                                </div>
                                {d.customAction ? (
                                    <p className="text-gray-600 italic">"{d.customAction}"</p>
                                ) : (
                                    <p className="text-gray-500">{d.ability?.name ?? 'Vaardigheid ingezet'}</p>
                                )}
                                {d.actionDetail && (
                                    <p className="text-gray-500 text-xs mt-1 italic">"{d.actionDetail}"</p>
                                )}
                                {d.actionLat != null && d.actionLng != null && (
                                    <p className="text-blue-600 text-xs mt-1 font-mono">
                                        📍 {d.actionLat.toFixed(4)}, {d.actionLng.toFixed(4)}
                                    </p>
                                )}
                                {d.adminApproved !== null && (
                                    <p className={`text-xs mt-1 font-medium ${d.adminApproved ? 'text-green-600' : 'text-red-500'}`}>
                                        {d.adminApproved ? '✓ Goedgekeurd' : '✗ Afgewezen'}
                                        {d.score !== null ? ` · Score: ${d.score}` : ''}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* CENTER — Map + inject trigger */}
                <div className="flex-1 flex flex-col min-h-0 p-4 gap-4 bg-gray-50">
                    <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                        {session && (
                            <AdminMap
                                sessionId={session.id}
                                overlays={overlays}
                                onToggleOverlay={addOverlay}
                                center={incidentLocation ?? undefined}
                                customOverlays={scenarioCustomOverlays}
                            />
                        )}
                    </div>

                    {/* Manual inject trigger — hidden after session ends */}
                    {!sessionEnded && (
                        <div className="shrink-0 bg-white border border-gray-200 rounded-xl p-4 flex gap-3 items-end shadow-sm">
                            <div className="flex-1">
                                <label className="text-gray-500 text-xs uppercase tracking-widest block mb-1">
                                    Inject handmatig sturen
                                </label>
                                <select
                                    value={selectedInject}
                                    onChange={(e) => setSelectedInject(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-lg px-4 py-2 text-sm transition shrink-0"
                            >
                                Verstuur
                            </button>
                        </div>
                    )}
                </div>

                {/* RIGHT — Tabbed: Reacties / Feedback */}
                <div className="w-80 shrink-0 flex flex-col min-h-0 bg-white">
                    {/* Tab bar */}
                    <div className="flex border-b border-gray-100 shrink-0">
                        <button
                            onClick={() => setRightTab('actions')}
                            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-widest transition border-b-2 ${
                                rightTab === 'actions'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            Reacties
                            {pendingCustomActions.length > 0 && (
                                <span className="ml-1.5 bg-amber-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                                    {pendingCustomActions.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setRightTab('feedback')}
                            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-widest transition border-b-2 ${
                                rightTab === 'feedback'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            Feedback
                            {feedbacks.length > 0 && (
                                <span className="ml-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full px-1.5 py-0.5">
                                    {feedbacks.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Reacties tab */}
                    {rightTab === 'actions' && (
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {pendingCustomActions.length === 0 && (
                                <p className="text-gray-400 text-sm text-center pt-8">Geen openstaande acties...</p>
                            )}
                            {pendingCustomActions.map((d) => (
                                <div key={d.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                                    <p className="font-medium text-sm text-gray-800">{roleLabel(d.playerId)}</p>
                                    <p className="text-amber-700 text-sm italic">"{d.customAction}"</p>
                                    {d.actionDetail && (
                                        <p className="text-gray-500 text-xs italic">"{d.actionDetail}"</p>
                                    )}
                                    {d.actionLat != null && d.actionLng != null && (
                                        <p className="text-blue-600 text-xs font-mono">
                                            📍 {d.actionLat.toFixed(4)}, {d.actionLng.toFixed(4)}
                                        </p>
                                    )}
                                    {respondingTo?.id === d.id ? (
                                        <div className="space-y-2">
                                            <textarea
                                                value={responseText}
                                                onChange={(e) => setResponseText(e.target.value)}
                                                placeholder="Reactie (optioneel)..."
                                                rows={2}
                                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                                            />
                                            <input
                                                type="number"
                                                value={responseScore}
                                                onChange={(e) => setResponseScore(e.target.value)}
                                                placeholder="Score (optioneel)"
                                                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={() => submitResponse(true)} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg py-1.5 transition">✓ Goed</button>
                                                <button onClick={() => submitResponse(false)} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg py-1.5 transition">✗ Afwijzen</button>
                                                <button onClick={() => setRespondingTo(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-lg px-3 py-1.5 transition">✕</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => setRespondingTo(d)} className="w-full bg-white hover:bg-gray-50 text-gray-700 text-sm rounded-lg py-1.5 transition border border-gray-200">
                                            Reageer
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Feedback tab */}
                    {rightTab === 'feedback' && (
                        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
                            {feedbacks.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-8 gap-2">
                                    <p className="text-gray-400 text-sm">
                                        {sessionEnded
                                            ? 'Wachten op feedback van deelnemers...'
                                            : 'Feedback verschijnt hier als het scenario stopt.'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Summary */}
                                    <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 shrink-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-blue-700 text-xs font-semibold uppercase tracking-widest">Gemiddelde score</p>
                                            <div className="flex items-center gap-1">
                                                <span className="text-amber-400 text-lg">★</span>
                                                <span className="text-blue-900 font-bold">{avgRating}</span>
                                                <span className="text-blue-400 text-xs">/ 5</span>
                                            </div>
                                        </div>
                                        <p className="text-blue-500 text-xs mt-0.5">{feedbacks.length} reactie{feedbacks.length !== 1 ? 's' : ''}</p>
                                    </div>

                                    {/* Individual items */}
                                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                        {feedbacks.map((f) => (
                                            <div key={f.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-gray-700 text-sm font-medium">{f.nickname}</p>
                                                    <div className="flex">
                                                        {[1,2,3,4,5].map((s) => (
                                                            <span key={s} className={`text-sm ${s <= f.rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                {f.comment && (
                                                    <p className="text-gray-500 text-xs italic">"{f.comment}"</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </main>
    );
}
