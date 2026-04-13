'use client';

import { useEffect, useState, useRef } from 'react';
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

const LOG_EVENT_LABEL: Record<string, { icon: string; label: string; cls: string }> = {
    scenario_started: { icon: '▶', label: 'Scenario gestart',   cls: 'text-green-600' },
    scenario_stopped: { icon: '⏹', label: 'Scenario gestopt',   cls: 'text-red-500'   },
    inject_fired:     { icon: '📢', label: 'Inject verstuurd',   cls: 'text-blue-600'  },
    phase_changed:    { icon: '→',  label: 'Fase gewijzigd',     cls: 'text-amber-600' },
    player_joined:    { icon: '👤', label: 'Speler ingelogd',    cls: 'text-gray-500'  },
};

function formatTimer(ms: number): string {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

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

    const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
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
    const [sessionLog, setSessionLog] = useState<{ id: string; event: string; details: any; timestamp: string }[]>([]);
    const [showLog, setShowLog] = useState(false);
    const [showReport, setShowReport] = useState(false);

    // Scenario clock visibility toggle
    const [clockVisible, setClockVisible] = useState(true);
    const [currentScenarioTime, setCurrentScenarioTime] = useState<string | null>(null);

    // Game timer
    const [timerMs, setTimerMs] = useState<number | null>(null);
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerUpdatedAt, setTimerUpdatedAt] = useState<number | null>(null);
    const [displayMs, setDisplayMs] = useState<number | null>(null);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [customMinutes, setCustomMinutes] = useState('');
    const [addMinutes, setAddMinutes] = useState('');

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

        socket.on('player_status_changed', (data: { playerId: string; online: boolean }) => {
            setOnlineStatus((prev) => ({ ...prev, [data.playerId]: data.online }));
        });

        // Sync from other admins in the same session
        socket.on('overlays_set', (data: { overlays: any[] }) => {
            setOverlays(data.overlays);
        });

        socket.on('phase_changed', (data: { phaseIndex: number; scenarioTime?: string | null }) => {
            setCurrentPhaseIndex(data.phaseIndex);
            if (data.scenarioTime) setCurrentScenarioTime(data.scenarioTime);
        });

        // Fetch existing session log (for rejoin)
        fetch(`${BACKEND_URL}/sessions/${session.id}/log`)
            .then((r) => r.json())
            .then((log) => Array.isArray(log) && setSessionLog(log))
            .catch(() => {});

        // Fetch injects for manual triggering
        fetch(`${BACKEND_URL}/injects/scenario/${session.scenarioId}`)
            .then((r) => r.json())
            .then(setInjects);

        return () => {
            socket.off('action_submitted');
            socket.off('action_response');
            socket.off('scenario_stopped');
            socket.off('feedback_received');
            socket.off('player_status_changed');
            socket.off('overlays_set');
            socket.off('phase_changed');
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
        // Notify other admins + players of the new phase (name + scenario time for player display)
        socket.emit('phase_changed', { sessionId: session.id, phaseIndex: nextIndex, phaseName: phases[nextIndex].name, scenarioTime: phases[nextIndex].scenarioTime ?? null });
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

    function toggleClock() {
        if (!session) return;
        const next = !clockVisible;
        setClockVisible(next);
        const socket = getSocket();
        socket.emit('scenario_time_update', { sessionId: session.id, scenarioTime: next ? currentScenarioTime : null });
    }

    function emitTimer(remainingMs: number, running: boolean) {
        if (!session) return;
        const socket = getSocket();
        socket.emit('timer_update', { sessionId: session.id, remainingMs, running });
        setTimerMs(remainingMs);
        setTimerRunning(running);
        setTimerUpdatedAt(Date.now());
    }

    function startTimer() {
        if (timerMs === null || timerMs <= 0) return;
        emitTimer(timerMs, true);
    }

    function pauseTimer() {
        // Snapshot current display so we resume from here
        const current = displayMs ?? timerMs ?? 0;
        emitTimer(current, false);
    }

    function resetTimer(presetMs?: number) {
        const ms = presetMs ?? timerMs ?? 0;
        emitTimer(ms, false);
    }

    function addTime(ms: number) {
        const base = timerRunning ? (displayMs ?? 0) : (timerMs ?? 0);
        emitTimer(base + ms, timerRunning);
    }

    // Local countdown effect — mirrors the one on the player page
    useEffect(() => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (timerMs === null) { setDisplayMs(null); return; }
        if (!timerRunning) { setDisplayMs(timerMs); return; }
        const elapsed = timerUpdatedAt ? Date.now() - timerUpdatedAt : 0;
        const initial = Math.max(0, timerMs - elapsed);
        setDisplayMs(initial);
        if (initial === 0) return;
        timerIntervalRef.current = setInterval(() => {
            setDisplayMs((prev) => {
                if (prev === null || prev <= 0) {
                    clearInterval(timerIntervalRef.current!);
                    return 0;
                }
                return prev - 500;
            });
        }, 500);
        return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
    }, [timerMs, timerRunning, timerUpdatedAt]);

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
                        onClick={() => setShowLog((v) => !v)}
                        className={`relative font-semibold rounded-xl px-4 py-2 transition text-sm ${showLog ? 'bg-white text-blue-700' : 'bg-white/20 hover:bg-white/30 text-white'}`}
                    >
                        Logboek
                        {sessionLog.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-gray-400 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                {sessionLog.length}
                            </span>
                        )}
                    </button>
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
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowReport(true)}
                                className="bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl px-4 py-2 transition text-sm"
                            >
                                Exporteer rapport
                            </button>
                            <button
                                onClick={() => router.push('/admin/lobby')}
                                className="bg-white text-blue-700 font-semibold rounded-xl px-5 py-2 transition text-sm hover:bg-blue-50"
                            >
                                ← Terug naar lobby
                            </button>
                        </div>
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
                    {/* Player connection status strip */}
                    {players.length > 0 && (
                        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
                            <div className="flex flex-wrap gap-1.5">
                                {players.map((p) => {
                                    const online = onlineStatus[p.id] !== false; // default true until disconnect event
                                    return (
                                        <div
                                            key={p.id}
                                            title={online ? `${p.nickname} — online` : `${p.nickname} — verbroken`}
                                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition ${
                                                online
                                                    ? 'bg-green-50 border-green-200 text-green-700'
                                                    : 'bg-red-50 border-red-200 text-red-600'
                                            }`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${online ? 'bg-green-500' : 'bg-red-400 animate-pulse'}`} />
                                            <span>{p.role?.shortName ?? p.nickname}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
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

                    {/* Game timer panel — hidden after session ends */}
                    {!sessionEnded && (
                        <div className="shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm p-3 space-y-2">
                            {/* Row 1: display + custom set + start/pause/reset */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className={`font-mono font-bold text-2xl tracking-widest px-4 py-1.5 rounded-xl min-w-[6.5rem] text-center ${
                                    displayMs !== null && displayMs <= 60000
                                        ? 'bg-red-100 text-red-700'
                                        : displayMs !== null && displayMs <= 180000
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-gray-100 text-gray-700'
                                }`}>
                                    {displayMs !== null ? formatTimer(displayMs) : '—:——'}
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    placeholder="min"
                                    value={customMinutes}
                                    onChange={(e) => setCustomMinutes(e.target.value)}
                                    className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center font-mono focus:outline-none focus:border-blue-400"
                                />
                                <button
                                    onClick={() => { const ms = parseFloat(customMinutes) * 60000; if (ms > 0) { resetTimer(ms); setCustomMinutes(''); } }}
                                    disabled={!customMinutes || parseFloat(customMinutes) <= 0}
                                    className="bg-gray-100 hover:bg-gray-200 disabled:text-gray-300 text-gray-700 text-sm font-semibold rounded-lg px-3 py-1.5 transition"
                                >
                                    Instellen
                                </button>
                                <div className="flex items-center gap-2 ml-auto">
                                    {!timerRunning ? (
                                        <button
                                            onClick={startTimer}
                                            disabled={timerMs === null || timerMs <= 0}
                                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-100 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg px-4 py-1.5 transition"
                                        >
                                            ▶ Start
                                        </button>
                                    ) : (
                                        <button
                                            onClick={pauseTimer}
                                            className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg px-4 py-1.5 transition"
                                        >
                                            ⏸ Pauze
                                        </button>
                                    )}
                                    <button
                                        onClick={() => resetTimer()}
                                        disabled={timerMs === null}
                                        className="bg-gray-100 hover:bg-gray-200 disabled:text-gray-300 text-gray-700 text-sm font-semibold rounded-lg px-3 py-1.5 transition"
                                    >
                                        ↺ Reset
                                    </button>
                                </div>
                            </div>
                            {/* Row 2: add time */}
                            <div className="flex items-center gap-2 border-t border-gray-100 pt-2 flex-wrap">
                                <span className="text-gray-400 text-xs shrink-0">+ Toevoegen:</span>
                                <button onClick={() => addTime(10 * 1000)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg px-3 py-1 transition">+10 sec</button>
                                <button onClick={() => addTime(15 * 1000)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg px-3 py-1 transition">+15 sec</button>
                                <button onClick={() => addTime(30 * 1000)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg px-3 py-1 transition">+30 sec</button>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    placeholder="sec"
                                    value={addMinutes}
                                    onChange={(e) => setAddMinutes(e.target.value)}
                                    className="w-14 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center font-mono focus:outline-none focus:border-blue-400"
                                />
                                <button
                                    onClick={() => { const ms = parseFloat(addMinutes) * 1000; if (ms > 0) { addTime(ms); setAddMinutes(''); } }}
                                    disabled={!addMinutes || parseFloat(addMinutes) <= 0}
                                    className="bg-blue-50 hover:bg-blue-100 disabled:text-gray-300 text-blue-700 text-xs font-semibold rounded-lg px-3 py-1 transition"
                                >
                                    + Toevoegen
                                </button>
                            </div>
                            {/* Scenario clock toggle — only shown when a time is set */}
                            {currentScenarioTime && (
                                <div className="flex items-center gap-2 border-t border-gray-100 pt-2">
                                    <span className="text-gray-400 text-xs shrink-0">Scenario klok:</span>
                                    <span className="font-mono text-xs text-gray-600">{currentScenarioTime}</span>
                                    <button
                                        onClick={toggleClock}
                                        className={`ml-auto text-xs font-semibold px-3 py-1 rounded-lg border transition ${
                                            clockVisible
                                                ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                                : 'bg-gray-100 border-gray-200 text-gray-400 hover:bg-gray-200'
                                        }`}
                                    >
                                        {clockVisible ? '👁 Zichtbaar' : '🚫 Verborgen'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

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

        {/* Session log slide-out drawer */}
        {showLog && (
            <>
                <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowLog(false)} />
                <div className="fixed top-0 right-0 bottom-0 z-50 w-96 bg-white shadow-2xl flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-900 text-white flex items-center justify-between shrink-0">
                        <div>
                            <h2 className="font-bold text-lg">Logboek</h2>
                            <p className="text-gray-400 text-xs">{sessionLog.length} evenement{sessionLog.length !== 1 ? 'en' : ''}</p>
                        </div>
                        <button onClick={() => setShowLog(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition text-white text-sm">✕</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-950">
                        {sessionLog.length === 0 && (
                            <p className="text-gray-500 text-sm text-center pt-8">Nog geen evenementen vastgelegd.</p>
                        )}
                        {sessionLog.map((entry) => {
                            const meta = LOG_EVENT_LABEL[entry.event] ?? { icon: '•', label: entry.event, cls: 'text-gray-400' };
                            const time = new Date(entry.timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            return (
                                <div key={entry.id} className="flex items-start gap-3 py-2 border-b border-gray-800 last:border-0">
                                    <span className="text-gray-500 font-mono text-xs shrink-0 mt-0.5 w-16">{time}</span>
                                    <span className={`text-xs shrink-0 mt-0.5 w-4 text-center ${meta.cls}`}>{meta.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-semibold ${meta.cls}`}>{meta.label}</p>
                                        {entry.details && Object.keys(entry.details).length > 0 && (
                                            <p className="text-gray-500 text-xs mt-0.5 truncate">
                                                {entry.event === 'inject_fired' && `"${entry.details.title}"${entry.details.targetRole ? ` → ${entry.details.targetRole}` : ''}${entry.details.custom ? ' (vrij)' : ''}`}
                                                {entry.event === 'phase_changed' && (entry.details.phaseName ?? `Fase ${entry.details.phaseIndex + 1}`)}
                                                {entry.event === 'player_joined' && entry.details.nickname}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </>
        )}

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

        {/* Debrief report modal */}
        {showReport && session && (
            <>
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowReport(false)} />
                <div className="fixed inset-4 z-50 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                    {/* Report header */}
                    <div className="px-8 py-5 bg-blue-700 text-white flex items-center justify-between shrink-0 print:bg-white print:text-gray-900 print:border-b print:border-gray-200">
                        <div>
                            <h2 className="font-bold text-xl">Debriefrapport</h2>
                            <p className="text-blue-200 text-sm print:text-gray-500">Sessie {session.joinCode} · {new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <div className="flex gap-3 print:hidden">
                            <button onClick={() => window.print()} className="bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl px-4 py-2 text-sm transition">Afdrukken / PDF</button>
                            <button onClick={() => setShowReport(false)} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition text-white">✕</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8">

                        {/* Summary row */}
                        <div className="grid grid-cols-4 gap-4">
                            {[
                                { label: 'Deelnemers', value: players.length },
                                { label: 'Acties ingediend', value: decisions.length },
                                { label: 'Goedgekeurd', value: decisions.filter(d => d.adminApproved === true).length },
                                { label: 'Gem. score', value: (() => { const scored = decisions.filter(d => d.score != null); return scored.length ? (scored.reduce((s, d) => s + d.score!, 0) / scored.length).toFixed(1) : '—'; })() },
                            ].map(({ label, value }) => (
                                <div key={label} className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                                    <p className="text-gray-500 text-xs mt-1">{label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Decisions table */}
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Acties & beoordelingen</h3>
                            {decisions.length === 0 ? (
                                <p className="text-gray-400 text-sm">Geen acties ingediend.</p>
                            ) : (
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-gray-200 text-left text-xs uppercase tracking-widest text-gray-500">
                                            <th className="pb-2 pr-4">Deelnemer</th>
                                            <th className="pb-2 pr-4">Actie</th>
                                            <th className="pb-2 pr-4">Detail</th>
                                            <th className="pb-2 pr-4">Urgentie</th>
                                            <th className="pb-2 pr-4">Beoordeling</th>
                                            <th className="pb-2 pr-4">Reactie</th>
                                            <th className="pb-2">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {decisions.map((d) => (
                                            <tr key={d.id} className="border-b border-gray-100 align-top">
                                                <td className="py-2 pr-4 font-medium text-gray-800 whitespace-nowrap">{roleLabel(d.playerId)}</td>
                                                <td className="py-2 pr-4 text-gray-700">{d.customAction ? <span className="italic">"{d.customAction}"</span> : (d.ability?.name ?? '—')}</td>
                                                <td className="py-2 pr-4 text-gray-500 italic text-xs max-w-[160px]">{d.actionDetail ?? '—'}</td>
                                                <td className="py-2 pr-4">
                                                    {d.actionUrgency && URGENCY_LABEL[d.actionUrgency] ? (
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${URGENCY_LABEL[d.actionUrgency].className}`}>{URGENCY_LABEL[d.actionUrgency].label}</span>
                                                    ) : '—'}
                                                </td>
                                                <td className="py-2 pr-4">
                                                    {d.adminApproved === null ? <span className="text-gray-400">Wacht</span>
                                                        : d.adminApproved ? <span className="text-green-600 font-semibold">✓ Goed</span>
                                                        : <span className="text-red-500 font-semibold">✗ Afgewezen</span>}
                                                </td>
                                                <td className="py-2 pr-4 text-gray-500 text-xs italic max-w-[160px]">{d.adminResponse ?? '—'}</td>
                                                <td className="py-2 font-bold text-gray-900">{d.score ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Feedback summary */}
                        {feedbacks.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Feedback van deelnemers</h3>
                                <div className="space-y-3">
                                    {feedbacks.map((f) => (
                                        <div key={f.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-semibold text-gray-900">{f.nickname}</p>
                                                {f.rating != null && (
                                                    <div className="flex gap-0.5">
                                                        {[1,2,3,4,5].map((s) => (
                                                            <span key={s} className={`text-base ${s <= f.rating! ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {f.comment && <p className="text-gray-600 text-sm italic">"{f.comment}"</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Session log */}
                        {sessionLog.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-3">Evenementenlog</h3>
                                <div className="space-y-1">
                                    {sessionLog.map((entry) => {
                                        const meta = LOG_EVENT_LABEL[entry.event] ?? { icon: '•', label: entry.event, cls: 'text-gray-500' };
                                        const time = new Date(entry.timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                        return (
                                            <div key={entry.id} className="flex items-center gap-3 py-1 border-b border-gray-100 last:border-0 text-sm">
                                                <span className="text-gray-400 font-mono text-xs w-20 shrink-0">{time}</span>
                                                <span className={`text-xs font-semibold w-36 shrink-0 ${meta.cls}`}>{meta.icon} {meta.label}</span>
                                                <span className="text-gray-500 text-xs">
                                                    {entry.event === 'inject_fired' && `"${entry.details?.title}"${entry.details?.targetRole ? ` → ${entry.details.targetRole}` : ''}`}
                                                    {entry.event === 'phase_changed' && (entry.details?.phaseName ?? `Fase ${(entry.details?.phaseIndex ?? 0) + 1}`)}
                                                    {entry.event === 'player_joined' && entry.details?.nickname}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </>
        )}
        </main>
    );
}
