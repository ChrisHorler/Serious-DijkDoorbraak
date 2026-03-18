'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore, EscalationPhase } from '@/lib/adminStore';
import { connectAdminSocket, getSocket } from '@/lib/socket';
import { Role } from '@/lib/store';
import { QRCodeSVG } from 'qrcode.react';
import { STATIC_OVERLAYS, FLOOD_SIZES } from '@/lib/overlayPresets';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

function generateId(): string {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    arr[6] = (arr[6] & 0x0f) | 0x40;
    arr[8] = (arr[8] & 0x3f) | 0x80;
    return [...arr].map((b, i) =>
        ([4, 6, 8, 10].includes(i) ? '-' : '') + b.toString(16).padStart(2, '0')
    ).join('');
}

function newPhase(index: number): EscalationPhase {
    return {
        id: generateId(),
        name: `Fase ${index + 1}`,
        floodZoneScale: null,
        activeOverlayIds: [],
        injectId: null,
    };
}

export default function AdminLobbyPage() {
    const router = useRouter();
    const {
        authenticated, token, session, setSession,
        players, setPlayers, updatePlayer,
        roles, setRoles,
        injects, setInjects,
        phases, setPhases, setCurrentPhaseIndex,
        setIncidentLocation, setScenarioCustomOverlays,
    } = useAdminStore();

    function abandonSession() {
        setSession(null);
        setPlayers([]);
    }

    const [scenarios, setScenarios] = useState<any[]>([]);
    const [selectedScenario, setSelectedScenario] = useState('');
    const [creating, setCreating] = useState(false);
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        if (!authenticated) {
            router.replace('/admin');
            return;
        }

        fetch(`${BACKEND_URL}/roles`).then(r => r.json()).then(setRoles);
        fetch(`${BACKEND_URL}/sessions/scenarios/all`).then(r => r.json()).then(setScenarios);

        const socket = connectAdminSocket(token!);

        socket.on('lobby_updated', (data: { players: any[] }) => {
            setPlayers(data.players);
        });

        socket.on('scenario_started', () => {
            router.push('/admin/session');
        });

        if (session) {
            fetch(`${BACKEND_URL}/sessions/${session.id}`)
                .then(r => {
                    if (!r.ok) throw new Error('not found');
                    return r.json();
                })
                .then((s) => {
                    if (s.status === 'ENDED') {
                        setSession(null);
                        setPlayers([]);
                    } else {
                        fetch(`${BACKEND_URL}/players/session/${session.id}`)
                            .then(r => r.json()).then(setPlayers);
                        fetch(`${BACKEND_URL}/injects/scenario/${session.scenarioId}`)
                            .then(r => r.json()).then(setInjects);
                        socket.emit('admin_join', { sessionId: session.id });
                    }
                })
                .catch(() => {
                    setSession(null);
                    setPlayers([]);
                });
        }

        return () => {
            socket.off('lobby_updated');
            socket.off('scenario_started');
        };
    }, [authenticated, session]);

    async function createSession() {
        if (!selectedScenario) return;
        setCreating(true);
        const res = await fetch(`${BACKEND_URL}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenarioId: selectedScenario }),
        });
        const newSession = await res.json();

        // Load scenario phases and incident location into store
        const scenarioRes = await fetch(`${BACKEND_URL}/sessions/scenarios/${selectedScenario}`);
        const scenario = await scenarioRes.json();
        setPhases(Array.isArray(scenario.phases) ? scenario.phases : []);
        setScenarioCustomOverlays(Array.isArray(scenario.customOverlays) ? scenario.customOverlays : []);
        if (scenario.incidentLat != null && scenario.incidentLng != null) {
            setIncidentLocation([scenario.incidentLat, scenario.incidentLng]);
        } else {
            setIncidentLocation(null);
        }

        setSession(newSession);
        setCurrentPhaseIndex(-1);
        setCreating(false);
        const socket = getSocket();
        socket.emit('admin_join', { sessionId: newSession.id });
    }

    function assignRole(playerId: string, roleId: string) {
        const socket = getSocket();
        socket.emit('assign_role', { playerId, roleId }, (ack: any) => {
            if (ack.success) updatePlayer(ack.player);
        });
    }

    function startScenario() {
        if (!session) return;
        setStarting(true);
        const socket = getSocket();
        socket.emit('start_scenario', { sessionId: session.id }, (ack: any) => {
            if (!ack.success) setStarting(false);
        });
    }

    // Phase editing helpers
    function addPhase() {
        setPhases([...phases, newPhase(phases.length)]);
    }

    function removePhase(id: string) {
        setPhases(phases.filter(p => p.id !== id));
    }

    function updatePhase(id: string, patch: Partial<EscalationPhase>) {
        setPhases(phases.map(p => p.id === id ? { ...p, ...patch } : p));
    }

    function toggleOverlayInPhase(phaseId: string, overlayId: string) {
        const phase = phases.find(p => p.id === phaseId);
        if (!phase) return;
        const has = phase.activeOverlayIds.includes(overlayId);
        updatePhase(phaseId, {
            activeOverlayIds: has
                ? phase.activeOverlayIds.filter(id => id !== overlayId)
                : [...phase.activeOverlayIds, overlayId],
        });
    }

    return (
        <main className="min-h-screen bg-zinc-950 text-white p-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Spelleider Dashboard</h1>
                        <p className="text-zinc-400 text-sm">Lobby beheer</p>
                    </div>
                    <button
                        onClick={() => router.push('/admin/editor')}
                        className="ml-4 text-zinc-400 hover:text-white text-sm border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-1.5 transition"
                    >
                        ✏ Editor
                    </button>
                    {session && (
                        <div className="flex items-center gap-6">
                            <button
                                onClick={abandonSession}
                                className="text-zinc-500 hover:text-red-400 text-sm transition"
                            >
                                Verlaat sessie
                            </button>
                            <div className="text-right">
                                <p className="text-zinc-400 text-xs uppercase tracking-widest">Sessiecode</p>
                                <p className="text-4xl font-mono font-bold tracking-widest">{session.joinCode}</p>
                                <p className="text-zinc-500 text-xs mt-1">/player/join?code={session.joinCode}</p>
                            </div>
                            <div className="bg-white p-2 rounded-xl">
                                <QRCodeSVG
                                    value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002'}/player/join?code=${session.joinCode}`}
                                    size={96}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Create session */}
                {!session && (
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-4">
                        <h2 className="font-semibold text-lg">Nieuwe sessie</h2>
                        <select
                            value={selectedScenario}
                            onChange={(e) => setSelectedScenario(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Selecteer een scenario</option>
                            {scenarios.map((s) => (
                                <option key={s.id} value={s.id}>{s.title}</option>
                            ))}
                        </select>
                        <button
                            onClick={createSession}
                            disabled={!selectedScenario || creating}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-xl px-6 py-3 transition"
                        >
                            {creating ? 'Aanmaken...' : 'Sessie aanmaken'}
                        </button>
                    </div>
                )}

                {/* Player roster */}
                {session && (
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                            <h2 className="font-semibold text-lg">Deelnemers ({players.length})</h2>
                            <button
                                onClick={startScenario}
                                disabled={starting || players.length === 0}
                                className="bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-xl px-6 py-2 transition"
                            >
                                {starting ? 'Starten...' : '▶ Start scenario'}
                            </button>
                        </div>
                        {players.length === 0 ? (
                            <div className="px-6 py-12 text-center text-zinc-500">Wachten op deelnemers...</div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-widest">
                                        <th className="text-left px-6 py-3">Naam</th>
                                        <th className="text-left px-6 py-3">Rol</th>
                                        <th className="text-left px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {players.map((player) => (
                                        <tr key={player.id} className="border-b border-zinc-800/50 last:border-0">
                                            <td className="px-6 py-4 font-medium">{player.nickname}</td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={player.roleId ?? ''}
                                                    onChange={(e) => assignRole(player.id, e.target.value)}
                                                    className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                                >
                                                    <option value="">Geen rol</option>
                                                    {roles.map((role: Role) => (
                                                        <option key={role.id} value={role.id}>
                                                            {role.shortName} — {role.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-400" />
                                                    <span className="text-zinc-400 text-sm">Online</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Escalation phase setup */}
                {session && (
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold text-lg">Escalatiefasen</h2>
                                <p className="text-zinc-500 text-xs mt-0.5">Stel de kaartlagen en injects per fase in. Gebruik &quot;Volgende fase&quot; tijdens het scenario om door te schakelen.</p>
                            </div>
                            <button
                                onClick={addPhase}
                                className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white text-sm font-semibold rounded-xl px-4 py-2 transition"
                            >
                                + Fase toevoegen
                            </button>
                        </div>

                        {phases.length === 0 ? (
                            <div className="px-6 py-10 text-center text-zinc-600 text-sm">
                                Nog geen fasen ingesteld. Voeg een fase toe om te beginnen.
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-800">
                                {phases.map((phase, index) => (
                                    <div key={phase.id} className="px-6 py-5 space-y-4">
                                        {/* Phase header */}
                                        <div className="flex items-center gap-3">
                                            <span className="text-zinc-500 text-xs font-mono w-6">{index + 1}</span>
                                            <input
                                                value={phase.name}
                                                onChange={(e) => updatePhase(phase.id, { name: e.target.value })}
                                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                                                placeholder="Naam fase"
                                            />
                                            <button
                                                onClick={() => removePhase(phase.id)}
                                                className="text-zinc-600 hover:text-red-400 text-sm transition px-2"
                                            >
                                                Verwijder
                                            </button>
                                        </div>

                                        {/* Flood zone size */}
                                        <div className="flex items-center gap-3 pl-9">
                                            <span className="text-zinc-400 text-xs w-32 shrink-0">Overstromingsgebied</span>
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => updatePhase(phase.id, { floodZoneScale: null })}
                                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition border ${
                                                        phase.floodZoneScale === null
                                                            ? 'bg-zinc-700 border-zinc-500 text-white'
                                                            : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-white'
                                                    }`}
                                                >
                                                    Geen
                                                </button>
                                                {FLOOD_SIZES.map(({ label, value }) => (
                                                    <button
                                                        key={value}
                                                        onClick={() => updatePhase(phase.id, { floodZoneScale: value })}
                                                        className={`px-3 py-1 rounded-lg text-xs font-medium transition border ${
                                                            phase.floodZoneScale === value
                                                                ? 'bg-blue-700 border-blue-500 text-white'
                                                                : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-white'
                                                        }`}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Other overlays */}
                                        <div className="flex items-center gap-3 pl-9">
                                            <span className="text-zinc-400 text-xs w-32 shrink-0">Kaartlagen</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {STATIC_OVERLAYS.map((overlay) => {
                                                    const active = phase.activeOverlayIds.includes(overlay.id);
                                                    return (
                                                        <button
                                                            key={overlay.id}
                                                            onClick={() => toggleOverlayInPhase(phase.id, overlay.id)}
                                                            className={`px-3 py-1 rounded-lg text-xs font-medium transition border flex items-center gap-1.5 ${
                                                                active
                                                                    ? 'bg-zinc-700 border-zinc-500 text-white'
                                                                    : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-white'
                                                            }`}
                                                        >
                                                            <span
                                                                className="inline-block w-1.5 h-1.5 rounded-full"
                                                                style={{ backgroundColor: overlay.color }}
                                                            />
                                                            {overlay.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Inject */}
                                        <div className="flex items-center gap-3 pl-9">
                                            <span className="text-zinc-400 text-xs w-32 shrink-0">Inject sturen</span>
                                            <select
                                                value={phase.injectId ?? ''}
                                                onChange={(e) => updatePhase(phase.id, { injectId: e.target.value || null })}
                                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="">Geen inject</option>
                                                {injects.map((inject) => (
                                                    <option key={inject.id} value={inject.id}>
                                                        {inject.title}{inject.targetRole ? ` (${inject.targetRole})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </main>
    );
}
