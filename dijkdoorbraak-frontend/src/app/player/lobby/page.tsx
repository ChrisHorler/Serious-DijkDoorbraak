'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/lib/store';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function LobbyPage() {
  const router = useRouter();
  const { player, session, lobbyPlayers, setLobbyPlayers, setPlayer, setIncidentLocation, setFeedbackQuestions, setOverlays, setScenarioTime, setTimer } = useGameStore();
  useEffect(() => {
    if (!player || !session) {
      router.replace('/player/join');
      return;
    }

    const socket = getSocket();

    function registerWithServer() {
      socket.emit('rejoin_lobby', { sessionId: session!.id, playerId: player!.id });
    }
    socket.on('connect', registerWithServer);
    if (socket.connected) {
      registerWithServer();
    } else {
      socket.connect();
    }

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

    socket.on('scenario_started', (data: { incidentLat?: number; incidentLng?: number; scenarioTime?: string; feedbackQuestions?: any[] }) => {
      setOverlays([]); // clear any overlays from a previous session
      if (data?.incidentLat != null && data?.incidentLng != null) {
        setIncidentLocation([data.incidentLat, data.incidentLng]);
      }
      if (data?.scenarioTime) {
        setScenarioTime(data.scenarioTime);
      }
      if (data?.feedbackQuestions) {
        setFeedbackQuestions(data.feedbackQuestions);
      }
      setTimer(0, false); // reset timer
      router.push('/player/game');
    });

    fetch(`${BACKEND_URL}/players/session/${session.id}`)
      .then((res) => res.json())
      .then((players) => setLobbyPlayers(players));

    return () => {
      socket.off('connect', registerWithServer);
      socket.off('lobby_updated');
      socket.off('role_assigned');
      socket.off('scenario_started');
    };
  }, [player, session]);

  const me = lobbyPlayers.find((p) => p.id === player?.id) ?? player;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header bar */}
      <div className="bg-blue-700 text-white px-6 py-4 shadow-sm">
        <h1 className="text-lg font-bold">Dijkdoorbraak</h1>
        <p className="text-blue-200 text-xs">Wachtkamer</p>
      </div>

      <div className="w-full max-w-sm mx-auto px-6 py-8 space-y-6">
        {/* Session code */}
        <div className="text-center space-y-1">
          <p className="text-gray-500 text-xs uppercase tracking-widest">Sessiecode</p>
          <h2 className="text-4xl font-mono font-bold text-gray-900 tracking-widest">
            {session?.joinCode}
          </h2>
        </div>

        {/* Role card */}
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${me?.role ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
          {me?.role ? (
            <div>
              <div className="p-5 space-y-1">
                <p className="text-blue-600 text-xs uppercase tracking-widest font-medium">Jouw rol</p>
                <p className="text-gray-900 text-xl font-bold">{me.role.name}</p>
                <p className="text-gray-600 text-sm">{me.role.description}</p>
              </div>
              {me.role.briefing && (
                <div className="border-t border-blue-200 px-5 py-4 bg-white/60 space-y-1.5">
                  <p className="text-blue-600 text-xs font-semibold uppercase tracking-widest">Roltoelichting</p>
                  <div className="text-gray-700 text-sm leading-relaxed space-y-1">
                    {me.role.briefing.split('\n').map((line, i) =>
                      line.trim()
                        ? <p key={i}>{line}</p>
                        : <div key={i} className="h-1" />
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-gray-700 text-sm">Wachten op rolinzet door de spelleider...</p>
            </div>
          )}
        </div>

        {/* Player list */}
        <div className="space-y-3">
          <p className="text-gray-500 text-xs uppercase tracking-widest">
            Deelnemers ({lobbyPlayers.length})
          </p>
          <div className="space-y-2">
            {lobbyPlayers.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-xl px-4 py-3 border shadow-sm ${p.id === player?.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-gray-900 text-sm font-medium">
                    {p.nickname}
                    {p.id === player?.id && (
                      <span className="text-gray-400 text-xs ml-2">(jij)</span>
                    )}
                  </span>
                </div>
                {p.role && (
                  <span className="text-blue-600 text-xs font-mono font-semibold">{p.role.shortName}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs">
          Het scenario start zodra de spelleider gereed is
        </p>
      </div>
    </main>
  );
}
