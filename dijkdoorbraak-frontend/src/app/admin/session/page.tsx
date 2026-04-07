'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAdminStore, Decision, FeedbackItem } from '@/lib/adminStore';
import type { PendingActionPin } from '@/components/admin/AdminMap';
import { connectAdminSocket, getSocket } from '@/lib/socket';
import { Inject } from '@/lib/store';
import { getPhaseFloodOverlay } from '@/lib/overlayPresets';
import { INJECT_VARIANT_STYLES, type InjectVariant } from '@/lib/store';

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
    const [injectTab, setInjectTab] = useState<'preset' | 'custom'>('preset');
    const [customInjectTitle, setCustomInjectTitle] = useState('');
    const [customInjectContent, setCustomInjectContent] = useState('');
    const [customInjectRole, setCustomInjectRole] = useState('');
    const [customInjectVariant, setCustomInjectVariant] = useState<InjectVariant>('alert');
    const [sessionEnded, setSessionEnded] = useState(false);
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
    const [pendingPins, setPendingPins] = useState<PendingActionPin[]>([]);
    const [publishingPin, setPublishingPin] = useState<PendingActionPin | null>(null);
    const [publishIcon, setPublishIcon] = useState('📍');

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
            const d = data.decision;
            if (d.actionLat != null && d.actionLng != null) {
                const currentPlayers = useAdminStore.getState().players;
                const p = currentPlayers.find((pl) => pl.id === d.playerId);
                const playerLabel = p ? (p.role ? `${p.nickname} (${p.role.shortName})` : p.nickname) : 'Onbekend';
                const actionLabel = d.customAction ?? d.ability?.name ?? 'Actie';
                setPendingPins((prev) => [...prev, {
                    id: d.id,
                    lat: d.actionLat!,
                    lng: d.actionLng!,
                    playerLabel,
                    actionLabel,
                    urgency: d.actionUrgency ?? null,
                    detail: d.actionDetail ?? null,
                }]);
            }
        });

        socket.on('action_response', (data: { decision: Decision }) => {
            updateDecision(data.decision);
        });

        socket.on('scenario_stopped', () => {
            setSessionEnded(true);
            setFeedbackOpen(true);
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

    function fireCustomInject() {
        if (!session || !customInjectTitle.trim() || !customInjectContent.trim()) return;
        if (customInjectRole) {
            const hasMatchingPlayer = players.some((p) => p.role?.shortName === customInjectRole);
            if (!hasMatchingPlayer && !window.confirm(`Waarschuwing: geen deelnemer heeft de rol "${customInjectRole}". De inject wordt aan niemand verstuurd. Toch versturen?`)) {
                return;
            }
        }
        const socket = getSocket();
        socket.emit('fire_custom_inject', {
            sessionId: session.id,
            title: customInjectTitle.trim(),
            content: customInjectContent.trim(),
            targetRole: customInjectRole || null,
            variant: customInjectVariant,
        }, () => {
            setCustomInjectTitle('');
            setCustomInjectContent('');
            setCustomInjectRole('');
            setCustomInjectVariant('alert');
        });
    }

    function handleNextPhase() {
        if (!session || currentPhaseIndex >= phases.length - 1) return;
        const nextIndex = currentPhaseIndex + 1;
        const socket = getSocket();

        // Only the flood zone is phase-driven. Preserve all live admin-placed overlays.
        const newFlood = getPhaseFloodOverlay(phases, nextIndex, incidentLocation ?? undefined);
        const merged = [
            ...overlays.filter(o => o.id !== 'flood_zone'),
            ...(newFlood ? [newFlood] : []),
        ];

        socket.emit('set_overlays', { sessionId: session.id, overlays: merged }, () => {});
        setOverlays(merged);

        if (phases[nextIndex].injectId) {
            socket.emit('fire_inject', { sessionId: session.id, injectId: phases[nextIndex].injectId }, () => {});
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

    function publishPin(pin: PendingActionPin) {
        setPublishingPin(pin);
        setPublishIcon('📍');
    }

    function confirmPublishPin() {
        if (!session || !publishingPin) return;
        const overlay = {
            id: `action_pin_${publishingPin.id}`,
            type: 'custom' as const,
            label: `${publishingPin.playerLabel}: ${publishingPin.actionLabel}`,
            color: '#f97316',
            kind: 'marker' as const,
            coordinates: [publishingPin.lat, publishingPin.lng] as [number, number],
            icon: publishIcon,
        };
        const socket = getSocket();
        const updated = [...overlays, overlay];
        socket.emit('set_overlays', { sessionId: session.id, overlays: updated }, () => {});
        setOverlays(updated);
        setPendingPins((prev) => prev.filter((p) => p.id !== publishingPin.id));
        setPublishingPin(null);
    }

    function dismissPin(pinId: string) {
        setPendingPins((prev) => prev.filter((p) => p.id !== pinId));
    }

    function handleRemoveOverlay(id: string) {
        if (!session) return;
        const updated = overlays.filter((o) => o.id !== id);
        const socket = getSocket();
        socket.emit('set_overlays', { sessionId: session.id, overlays: updated }, () => {});
        setOverlays(updated);
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

    const ratedFeedbacks = feedbacks.filter((f) => f.rating != null);
    const avgRating = ratedFeedbacks.length > 0
        ? (ratedFeedbacks.reduce((s, f) => s + f.rating!, 0) / ratedFeedbacks.length).toFixed(1)
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

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFeedbackOpen(true)}
                        className="relative bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl px-4 py-2 transition text-sm"
                    >
                        Feedback
                        {feedbacks.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {feedbacks.length}
                            </span>
                        )}
                    </button>
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
                                onRemoveOverlay={handleRemoveOverlay}
                                center={incidentLocation ?? undefined}
                                customOverlays={scenarioCustomOverlays}
                                pendingPins={pendingPins}
                                onPublishPin={publishPin}
                                onDismissPin={dismissPin}
                            />
                        )}
                    </div>

                    {/* Inject trigger panel — hidden after session ends */}
                    {!sessionEnded && (
                        <div className="shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            {/* Tabs */}
                            <div className="flex border-b border-gray-200">
                                <button
                                    onClick={() => setInjectTab('preset')}
                                    className={`flex-1 py-2 text-xs font-semibold transition ${injectTab === 'preset' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-gray-50 text-gray-500 hover:text-gray-700'}`}
                                >
                                    Inject versturen
                                </button>
                                <button
                                    onClick={() => setInjectTab('custom')}
                                    className={`flex-1 py-2 text-xs font-semibold transition ${injectTab === 'custom' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-gray-50 text-gray-500 hover:text-gray-700'}`}
                                >
                                    Vrije inject
                                </button>
                            </div>

                            {/* Preset inject */}
                            {injectTab === 'preset' && (
                                <div className="p-4 flex gap-3 items-end">
                                    <div className="flex-1">
                                        <label className="text-gray-500 text-xs uppercase tracking-widest block mb-1">Inject handmatig sturen</label>
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

                            {/* Custom / ad-hoc inject */}
                            {injectTab === 'custom' && (
                                <div className="p-4 space-y-2">
                                    {/* Variant picker */}
                                    <div className="flex gap-1 flex-wrap">
                                        {(Object.entries(INJECT_VARIANT_STYLES) as [InjectVariant, typeof INJECT_VARIANT_STYLES[InjectVariant]][]).map(([key, s]) => (
                                            <button
                                                key={key}
                                                onClick={() => setCustomInjectVariant(key)}
                                                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition ${customInjectVariant === key ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800'}`}
                                            >
                                                <span>{s.icon}</span>{s.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            value={customInjectTitle}
                                            onChange={(e) => setCustomInjectTitle(e.target.value)}
                                            placeholder="Titel"
                                            className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                        <select
                                            value={customInjectRole}
                                            onChange={(e) => setCustomInjectRole(e.target.value)}
                                            className="w-36 bg-gray-50 border border-gray-300 rounded-lg px-2 py-2 text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="">Iedereen</option>
                                            {players
                                                .filter((p) => p.role)
                                                .map((p) => p.role!.shortName)
                                                .filter((v, i, arr) => arr.indexOf(v) === i)
                                                .map((shortName) => (
                                                    <option key={shortName} value={shortName}>{shortName}</option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <textarea
                                            value={customInjectContent}
                                            onChange={(e) => setCustomInjectContent(e.target.value)}
                                            placeholder="Bericht..."
                                            rows={2}
                                            className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                                        />
                                        <button
                                            onClick={fireCustomInject}
                                            disabled={!customInjectTitle.trim() || !customInjectContent.trim()}
                                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-lg px-4 py-2 text-sm transition shrink-0 self-end"
                                        >
                                            Verstuur
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT — Reacties */}
                <div className="w-80 shrink-0 flex flex-col min-h-0 bg-white">
                    <div className="px-4 py-3 border-b border-gray-100 shrink-0 bg-gray-50">
                        <h2 className="font-semibold text-sm uppercase tracking-widest text-gray-500">
                            Reacties
                            {pendingCustomActions.length > 0 && (
                                <span className="ml-1.5 bg-amber-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                                    {pendingCustomActions.length}
                                </span>
                            )}
                        </h2>
                    </div>
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
                </div>

            </div>

        {/* Feedback slide-out drawer */}
        {feedbackOpen && (
            <>
                {/* Backdrop */}
                <div
                    className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                    onClick={() => setFeedbackOpen(false)}
                />
                {/* Drawer */}
                <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col">
                    {/* Drawer header */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-blue-700 text-white flex items-center justify-between shrink-0">
                        <div>
                            <h2 className="font-bold text-lg">Feedback overzicht</h2>
                            <p className="text-blue-200 text-xs">
                                {feedbacks.length} reactie{feedbacks.length !== 1 ? 's' : ''}
                                {avgRating ? ` · Gemiddeld ${avgRating} / 5 ★` : ''}
                            </p>
                        </div>
                        <button
                            onClick={() => setFeedbackOpen(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition text-white text-sm"
                        >
                            ✕
                        </button>
                    </div>

                    {feedbacks.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
                            <span className="text-5xl opacity-20">💬</span>
                            <p className="text-gray-400 text-sm">
                                {sessionEnded
                                    ? 'Wachten op feedback van deelnemers...'
                                    : 'Feedback verschijnt hier zodra het scenario stopt.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Per-question averages summary */}
                            {(() => {
                                const allQuestions = Array.from(
                                    new Map(
                                        feedbacks.flatMap((f) => (f.questionRatings ?? []).map((q) => [q.questionId, q.question]))
                                    ).entries()
                                );
                                if (allQuestions.length === 0) return null;
                                return (
                                    <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 shrink-0 space-y-3">
                                        <p className="text-blue-700 text-xs font-semibold uppercase tracking-widest">Gemiddelden per vraag</p>
                                        <div className="grid grid-cols-1 gap-2">
                                            {allQuestions.map(([qId, qText]) => {
                                                const ratings = feedbacks
                                                    .flatMap((f) => f.questionRatings ?? [])
                                                    .filter((q) => q.questionId === qId)
                                                    .map((q) => q.rating);
                                                const avg = ratings.length > 0
                                                    ? ratings.reduce((s, r) => s + r, 0) / ratings.length
                                                    : 0;
                                                const pct = (avg / 5) * 100;
                                                return (
                                                    <div key={qId} className="space-y-1">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <p className="text-blue-800 text-sm flex-1">{qText}</p>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <span className="text-amber-400">★</span>
                                                                <span className="text-blue-900 font-bold text-sm">{avg.toFixed(1)}</span>
                                                                <span className="text-blue-400 text-xs">/ 5</span>
                                                            </div>
                                                        </div>
                                                        <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-amber-400 rounded-full transition-all"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Individual responses */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                                {feedbacks.map((f) => (
                                    <div key={f.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                                        {/* Name + overall stars */}
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-gray-900">{f.nickname}</p>
                                            {f.rating != null && (
                                                <div className="flex gap-0.5">
                                                    {[1,2,3,4,5].map((s) => (
                                                        <span key={s} className={`text-lg ${s <= f.rating! ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {/* Per-question breakdown */}
                                        {(f.questionRatings ?? []).length > 0 && (
                                            <div className="space-y-2 border-t border-gray-100 pt-3">
                                                {(f.questionRatings ?? []).map((q) => (
                                                    <div key={q.questionId} className="flex items-center gap-3">
                                                        <p className="text-gray-600 text-sm flex-1">{q.question}</p>
                                                        <div className="flex gap-0.5 shrink-0">
                                                            {[1,2,3,4,5].map((s) => (
                                                                <span key={s} className={`text-sm ${s <= q.rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {/* General comment */}
                                        {f.comment && (
                                            <div className="bg-white border border-gray-100 rounded-xl px-4 py-3">
                                                <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Opmerkingen</p>
                                                <p className="text-gray-700 text-sm italic">"{f.comment}"</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </>
        )}

        {/* Publish pin emoji picker modal */}
        {publishingPin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5 space-y-4">
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-0.5">Pin publiceren</p>
                        <p className="font-semibold text-gray-900">{publishingPin.playerLabel}</p>
                        <p className="text-gray-500 text-sm">{publishingPin.actionLabel}</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Icoon</p>
                        <div className="grid grid-cols-9 gap-1">
                            {['📍','📌','🚒','🚑','🚓','🚁','⛵','🚧','🏥','🏚️','⚠️','🔥','💧','🌊','⛽','🔴','🟡','🟢'].map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => setPublishIcon(emoji)}
                                    className={`text-xl p-1 rounded-lg transition ${publishIcon === emoji ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-gray-100'}`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={confirmPublishPin}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-2.5 text-sm transition"
                        >
                            {publishIcon} Publiceer
                        </button>
                        <button
                            onClick={() => setPublishingPin(null)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl px-4 py-2.5 text-sm transition"
                        >
                            Annuleer
                        </button>
                    </div>
                </div>
            </div>
        )}
        </main>
    );
}
