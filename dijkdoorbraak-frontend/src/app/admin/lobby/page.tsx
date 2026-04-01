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
        incidentLocation, setIncidentLocation, setScenarioCustomOverlays,
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
        setPlayers([]);
        setCurrentPhaseIndex(-1);
        setCreating(false);
        const socket = getSocket();
        socket.emit('admin_join', { sessionId: newSession.id });
    }

    function assignRole(playerId: string, roleId: string) {
        if (roleId) {
            const alreadyAssigned = players.find((p) => p.id !== playerId && p.roleId === roleId);
            if (alreadyAssigned) {
                const role = roles.find((r: Role) => r.id === roleId);
                if (!window.confirm(`"${role?.shortName ?? 'Deze rol'}" is al toegewezen aan ${alreadyAssigned.nickname}. Toch ook toewijzen?`)) {
                    return;
                }
            }
        }
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

    // Overlay schedule helpers — "which phase triggers this overlay/flood size?"
    function getOverlayPhaseIndex(overlayId: string): number {
        return phases.findIndex(p => p.activeOverlayIds.includes(overlayId));
    }

    function getFloodPhaseIndex(scale: number): number {
        return phases.findIndex(p => p.floodZoneScale === scale);
    }

    function assignOverlayToPhase(overlayId: string, phaseIndex: number) {
        setPhases(phases.map((p, i) => ({
            ...p,
            activeOverlayIds: i === phaseIndex
                ? [...new Set([...p.activeOverlayIds, overlayId])]
                : p.activeOverlayIds.filter(id => id !== overlayId),
        })));
    }

    function assignFloodToPhase(scale: number, phaseIndex: number) {
        setPhases(phases.map((p, i) => ({
            ...p,
            floodZoneScale: i === phaseIndex ? scale : (p.floodZoneScale === scale ? null : p.floodZoneScale),
        })));
    }

    function clearOverlay(overlayId: string) {
        setPhases(phases.map(p => ({
            ...p,
            activeOverlayIds: p.activeOverlayIds.filter(id => id !== overlayId),
        })));
    }

    function clearFlood(scale: number) {
        setPhases(phases.map(p => ({
            ...p,
            floodZoneScale: p.floodZoneScale === scale ? null : p.floodZoneScale,
        })));
    }

    return (
        <main className="min-h-screen bg-gray-50 text-gray-900">
            {/* Header bar */}
            <div className="bg-blue-700 text-white px-8 py-4 shadow-sm">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold">Spelleider Dashboard</h1>
                        <p className="text-blue-200 text-xs">Lobby beheer</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin/editor')}
                            className="text-blue-200 hover:text-white text-sm border border-blue-500 hover:border-blue-300 rounded-lg px-3 py-1.5 transition"
                        >
                            ✏ Editor
                        </button>
                        {session && (
                            <button
                                onClick={abandonSession}
                                className="text-blue-200 hover:text-red-300 text-sm transition"
                            >
                                Verlaat sessie
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-8 space-y-6">

                {/* Session code banner */}
                {session && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center justify-between gap-6">
                        <div className="flex-1">
                            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Sessiecode</p>
                            <p className="text-5xl font-mono font-bold text-gray-900 tracking-widest">{session.joinCode}</p>
                        </div>
                        <div className="flex gap-6">
                            <div className="text-center space-y-2">
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                                    <QRCodeSVG
                                        value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002'}/player/join?code=${session.joinCode}`}
                                        size={96}
                                    />
                                </div>
                                <p className="text-gray-500 text-xs font-medium">Deelnemers</p>
                            </div>
                            <div className="text-center space-y-2">
                                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                                    <QRCodeSVG
                                        value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002'}/spectator/join?code=${session.joinCode}`}
                                        size={96}
                                    />
                                </div>
                                <p className="text-blue-600 text-xs font-medium">Toeschouwers</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create session */}
                {!session && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                        <h2 className="font-semibold text-lg text-gray-900">Nieuwe sessie</h2>
                        <select
                            value={selectedScenario}
                            onChange={(e) => setSelectedScenario(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Selecteer een scenario</option>
                            {scenarios.map((s) => (
                                <option key={s.id} value={s.id}>{s.title}</option>
                            ))}
                        </select>
                        <button
                            onClick={createSession}
                            disabled={!selectedScenario || creating}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-xl px-6 py-3 transition"
                        >
                            {creating ? 'Aanmaken...' : 'Sessie aanmaken'}
                        </button>
                    </div>
                )}

                {/* Player roster */}
                {session && (
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <h2 className="font-semibold text-lg text-gray-900">Deelnemers ({players.length})</h2>
                            <button
                                onClick={startScenario}
                                disabled={starting || players.length === 0}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-xl px-6 py-2 transition"
                            >
                                {starting ? 'Starten...' : '▶ Start scenario'}
                            </button>
                        </div>
                        {players.length === 0 ? (
                            <div className="px-6 py-12 text-center text-gray-400">Wachten op deelnemers...</div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-widest">
                                        <th className="text-left px-6 py-3">Naam</th>
                                        <th className="text-left px-6 py-3">Rol</th>
                                        <th className="text-left px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {players.map((player) => (
                                        <tr key={player.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{player.nickname}</td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={player.roleId ?? ''}
                                                    onChange={(e) => assignRole(player.id, e.target.value)}
                                                    className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                                    <span className="text-gray-500 text-sm">Online</span>
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
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold text-lg text-gray-900">Escalatiefasen</h2>
                                <p className="text-gray-500 text-xs mt-0.5">Stel de kaartlagen en injects per fase in. Gebruik &quot;Volgende fase&quot; tijdens het scenario om door te schakelen.</p>
                            </div>
                            <button
                                onClick={addPhase}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl px-4 py-2 transition"
                            >
                                + Fase toevoegen
                            </button>
                        </div>

                        {!incidentLocation && phases.some(p => p.floodZoneScale !== null) && (
                            <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-amber-700 text-xs">
                                <span>⚠️</span>
                                <span>Dit scenario heeft geen locatie ingesteld — het overstromingsgebied gebruikt een standaard vaste locatie. Stel een locatie in via de Editor.</span>
                            </div>
                        )}

                        {phases.length === 0 ? (
                            <div className="px-6 py-10 text-center text-gray-400 text-sm">
                                Nog geen fasen ingesteld. Voeg een fase toe om te beginnen.
                            </div>
                        ) : (
                            <>
                                {/* Phase list — name + inject only */}
                                <div className="divide-y divide-gray-100">
                                    {phases.map((phase, index) => (
                                        <div key={phase.id} className="px-6 py-4 flex items-center gap-3">
                                            <span className="text-gray-400 text-xs font-mono w-6 shrink-0">{index + 1}</span>
                                            <input
                                                value={phase.name}
                                                onChange={(e) => updatePhase(phase.id, { name: e.target.value })}
                                                className="w-40 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                placeholder="Naam fase"
                                            />
                                            <select
                                                value={phase.injectId ?? ''}
                                                onChange={(e) => updatePhase(phase.id, { injectId: e.target.value || null })}
                                                className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                            >
                                                <option value="">Geen inject</option>
                                                {injects.map((inject) => (
                                                    <option key={inject.id} value={inject.id}>
                                                        {inject.title}{inject.targetRole ? ` (${inject.targetRole})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => removePhase(phase.id)}
                                                className="text-gray-400 hover:text-red-500 text-sm transition px-2 shrink-0"
                                            >
                                                Verwijder
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Overlay schedule — each layer assigned to a phase */}
                                <div className="px-6 py-5 border-t border-gray-100 space-y-4">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">Kaartlagen</p>
                                        <p className="text-xs text-gray-400 mt-0.5">Kaartlagen verschijnen cumulatief — alles t/m de actieve fase is zichtbaar.</p>
                                    </div>

                                    {/* Static overlays */}
                                    <div className="space-y-2">
                                        {STATIC_OVERLAYS.map((overlay) => {
                                            const assignedIndex = getOverlayPhaseIndex(overlay.id);
                                            return (
                                                <div key={overlay.id} className="flex items-center gap-3">
                                                    <span
                                                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: overlay.color }}
                                                    />
                                                    <span className="text-sm text-gray-700 w-40 shrink-0">{overlay.label}</span>
                                                    <select
                                                        value={assignedIndex === -1 ? '' : String(assignedIndex)}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === '') clearOverlay(overlay.id);
                                                            else assignOverlayToPhase(overlay.id, Number(val));
                                                        }}
                                                        className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                    >
                                                        <option value="">Niet actief</option>
                                                        {phases.map((p, i) => (
                                                            <option key={p.id} value={String(i)}>Verschijnt in {p.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Flood zone sizes */}
                                    <div className="space-y-2 pt-2 border-t border-gray-100">
                                        <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Overstromingsgebied</p>
                                        {FLOOD_SIZES.map(({ label, value }) => {
                                            const assignedIndex = getFloodPhaseIndex(value);
                                            return (
                                                <div key={value} className="flex items-center gap-3">
                                                    <span className="text-base shrink-0">🌊</span>
                                                    <span className="text-sm text-gray-700 w-40 shrink-0">{label}</span>
                                                    <select
                                                        value={assignedIndex === -1 ? '' : String(assignedIndex)}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === '') clearFlood(value);
                                                            else assignFloodToPhase(value, Number(val));
                                                        }}
                                                        className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                    >
                                                        <option value="">Niet actief</option>
                                                        {phases.map((p, i) => (
                                                            <option key={p.id} value={String(i)}>Verschijnt in {p.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

            </div>
        </main>
    );
}
