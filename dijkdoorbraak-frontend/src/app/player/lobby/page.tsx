'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/lib/store';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function LobbyPage() {
  const router = useRouter();
  const { player, session, lobbyPlayers, setLobbyPlayers, setPlayer } = useGameStore();
  const hasJoined = useRef(false);

  useEffect(() => {
    if (!player || !session) {
      router.replace('/player/join');
      return;
    }

    const socket = getSocket();

    socket.on('lobby_updated', (data: { players: any[] }) => {
      setLobbyPlayers(data.players);
      const me = data.players.find((p) => p.id === player.id);
      if (me?.role) {
        setPlayer({ ...player, role: me.role, roleId: me.roleId });
      }
    });

    socket.on('role_assigned', (data: { playerId: string; role: any }) => {
      if (data.playerId === player.id) {
        setPlayer({ ...player, role: data.role, roleId: data.role?.id });
      }
    });

    socket.on('scenario_started', () => {
      router.push('/player/game');
    });

    fetch(`${BACKEND_URL}/players/session/${session.id}`)
      .then((res) => res.json())
      .then((players) => setLobbyPlayers(players));

    if (!hasJoined.current) {
      hasJoined.current = true;
      if (socket.connected) {
        socket.emit('rejoin_lobby', { sessionId: session.id, playerId: player.id });
      } else {
        socket.connect();
        socket.once('connect', () => {
          socket.emit('rejoin_lobby', { sessionId: session.id, playerId: player.id });
        });
      }
    }

    return () => {
      socket.off('lobby_updated');
      socket.off('role_assigned');
      socket.off('scenario_started');
    };
  }, [player, session]);

  const me = lobbyPlayers.find((p) => p.id === player?.id) ?? player;

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col px-6 py-10">
      <div className="w-full max-w-sm mx-auto space-y-8">
        <div className="text-center space-y-1">
          <p className="text-zinc-500 text-sm uppercase tracking-widest">Sessiecode</p>
          <h1 className="text-4xl font-mono font-bold text-white tracking-widest">
            {session?.joinCode}
          </h1>
        </div>

        <div className={`rounded-2xl p-5 border ${me?.role ? 'bg-blue-950 border-blue-700' : 'bg-zinc-900 border-zinc-700'}`}>
          {me?.role ? (
            <div className="space-y-1">
              <p className="text-blue-400 text-xs uppercase tracking-widest font-medium">Jouw rol</p>
              <p className="text-white text-xl font-bold">{me.role.name}</p>
              <p className="text-zinc-400 text-sm">{me.role.description}</p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <p className="text-zinc-300 text-sm">Wachten op rolinzet door de spelleider...</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-zinc-500 text-xs uppercase tracking-widest">
            Deelnemers ({lobbyPlayers.length})
          </p>
          <div className="space-y-2">
            {lobbyPlayers.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${p.id === player?.id ? 'bg-zinc-800 border border-zinc-600' : 'bg-zinc-900'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-white text-sm font-medium">
                    {p.nickname}
                    {p.id === player?.id && (
                      <span className="text-zinc-500 text-xs ml-2">(jij)</span>
                    )}
                  </span>
                </div>
                {p.role && (
                  <span className="text-blue-400 text-xs font-mono">{p.role.shortName}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-zinc-600 text-xs">
          Het scenario start zodra de spelleider gereed is
        </p>
      </div>
    </main>
  );
}