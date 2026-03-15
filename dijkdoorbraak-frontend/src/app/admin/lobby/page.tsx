'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/adminStore';
import { connectAdminSocket, getSocket } from '@/lib/socket';
import { Role } from '@/lib/store';
import { QRCodeSVG } from 'qrcode.react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function AdminLobbyPage() {
    const router = useRouter();
    const { authenticated, token, session, setSession, players, setPlayers, updatePlayer, roles, setRoles } = useAdminStore();

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

        // Fetch roles and scenarios
        fetch(`${BACKEND_URL}/roles`)
            .then(r => r.json())
            .then(setRoles);

        fetch(`${BACKEND_URL}/sessions/scenarios/all`)
            .then(r => r.json())
            .then(setScenarios);

        const socket = connectAdminSocket(token!);

        socket.on('lobby_updated', (data: { players: any[] }) => {
            setPlayers(data.players);
        });

        socket.on('scenario_started', () => {
            router.push('/admin/session');
        });

        // If session exists, validate it is still active in the DB
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
                            .then(r => r.json())
                            .then(setPlayers);
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
        setSession(newSession);
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

    return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Spelleider Dashboard</h1>
            <p className="text-zinc-400 text-sm">Lobby beheer</p>
          </div>
          {session && (
            <div className="flex items-center gap-6">
              <button
                onClick={abandonSession}
                className="text-zinc-500 hover:text-red-400 text-sm transition"
                title="Verlaat sessie"
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
              <div className="px-6 py-12 text-center text-zinc-500">
                Wachten op deelnemers...
              </div>
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

      </div>
    </main>
  );
}