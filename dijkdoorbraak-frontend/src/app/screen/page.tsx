'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { connectSocket } from '@/lib/socket';
import { QRCodeSVG } from 'qrcode.react';
import type { MapOverlay } from '@/lib/store';

const GameMap = dynamic(() => import('@/components/player/GameMap'), { ssr: false });

function formatTimer(ms: number): string {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ScreenContent() {
    const searchParams = useSearchParams();
    const [joinCode, setJoinCode] = useState('');
    const [codeInput, setCodeInput] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [overlays, setOverlays] = useState<MapOverlay[]>([]);
    const [incidentLocation, setIncidentLocation] = useState<[number, number] | null>(null);
    const [error, setError] = useState('');
    const [connecting, setConnecting] = useState(false);
    const [qrMode, setQrMode] = useState<null | 'player' | 'spectator'>(null);
    const [currentPhase, setCurrentPhase] = useState<string | null>(null);
    const [scenarioTime, setScenarioTime] = useState<string | null>(null);

    // Timer state
    const [timerMs, setTimerMs] = useState<number | null>(null);
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerUpdatedAt, setTimerUpdatedAt] = useState<number | null>(null);
    const [displayMs, setDisplayMs] = useState<number | null>(null);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Read code from URL on load
    useEffect(() => {
        const code = searchParams.get('code');
        if (code) {
            setJoinCode(code.toUpperCase());
            setCodeInput(code.toUpperCase());
        }
    }, [searchParams]);

    // Auto-connect when code comes from URL
    useEffect(() => {
        if (joinCode) return connect(joinCode);
    }, [joinCode]);

    function connect(code: string) {
        setConnecting(true);
        setError('');
        const socket = connectSocket();

        socket.emit('spectator_join', { joinCode: code }, (res: any) => {
            setConnecting(false);
            if (!res.success) {
                setError(res.message || 'Ongeldige code.');
                return;
            }
            setSessionId(res.sessionId);
            setOverlays(Array.isArray(res.currentOverlays) ? res.currentOverlays : []);
            const sc = res.session?.scenario;
            if (sc?.incidentLat != null && sc?.incidentLng != null) {
                setIncidentLocation([sc.incidentLat, sc.incidentLng]);
            }
            if (sc?.scenarioTime) setScenarioTime(sc.scenarioTime);
            if (res.currentTimer) {
                setTimerMs(res.currentTimer.remainingMs);
                setTimerRunning(res.currentTimer.running);
                setTimerUpdatedAt(Date.now());
            }
        });

        socket.on('overlays_set', (data: { overlays: MapOverlay[] }) => {
            setOverlays(data.overlays);
        });

        socket.on('map_update', (data: { overlay: MapOverlay }) => {
            setOverlays((prev) =>
                prev.some((o) => o.id === data.overlay.id)
                    ? prev.filter((o) => o.id !== data.overlay.id)
                    : [...prev, data.overlay]
            );
        });

        socket.on('timer_update', (data: { remainingMs: number; running: boolean }) => {
            setTimerMs(data.remainingMs);
            setTimerRunning(data.running);
            setTimerUpdatedAt(Date.now());
        });

        socket.on('scenario_started', (data: { incidentLat?: number; incidentLng?: number }) => {
            if (data.incidentLat != null && data.incidentLng != null) {
                setIncidentLocation([data.incidentLat, data.incidentLng]);
            }
        });

        socket.on('phase_changed', (data: { phaseIndex: number; phaseName?: string | null; scenarioTime?: string | null }) => {
            if (data.phaseName) setCurrentPhase(data.phaseName);
            if (data.scenarioTime) setScenarioTime(data.scenarioTime);
        });

        socket.on('scenario_time_update', (data: { scenarioTime: string | null }) => {
            setScenarioTime(data.scenarioTime);
        });

        socket.on('scenario_stopped', () => {
            setSessionId(null);
            setOverlays([]);
            setIncidentLocation(null);
            setTimerMs(null);
            setTimerRunning(false);
            setCurrentPhase(null);
            setScenarioTime(null);
        });

        return () => {
            socket.off('overlays_set');
            socket.off('map_update');
            socket.off('timer_update');
            socket.off('scenario_started');
            socket.off('phase_changed');
            socket.off('scenario_time_update');
            socket.off('scenario_stopped');
        };
    }

    // Local countdown
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

    // Code entry screen
    if (!sessionId) {
        return (
            <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
                <div className="w-full max-w-sm space-y-8">
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-2">
                            <span className="text-white text-2xl">🌊</span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dijkdoorbraak</h1>
                        <p className="text-gray-500 text-sm">Projectiescherm — voer sessiecode in</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <input
                            type="text"
                            value={codeInput}
                            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                            placeholder="SESSIECODE"
                            maxLength={6}
                            className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-xl font-mono tracking-widest uppercase text-center placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                            onKeyDown={(e) => e.key === 'Enter' && connect(codeInput)}
                        />

                        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

                        <button
                            onClick={() => connect(codeInput)}
                            disabled={connecting || !codeInput.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-xl py-3 transition"
                        >
                            {connecting ? 'Verbinden...' : 'Verbinden'}
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    // Fullscreen map + timer
    return (
        <main className="relative w-full h-dvh overflow-hidden bg-black">
            <GameMap overlays={overlays} incidentLocation={incidentLocation} iconScale={1.4} />

            {/* Timer overlay — center top */}
            {displayMs !== null && (
                <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-10 px-8 py-3 rounded-2xl shadow-2xl font-mono font-bold text-5xl tracking-widest transition ${
                    displayMs <= 60000
                        ? 'bg-red-600 text-white animate-pulse'
                        : displayMs <= 180000
                        ? 'bg-amber-500 text-white'
                        : 'bg-black/70 backdrop-blur text-white border border-white/20'
                }`}>
                    {formatTimer(displayMs)}
                </div>
            )}

            {/* Current phase badge — top left */}
            {currentPhase && (
                <div className="absolute top-6 left-6 z-10 bg-blue-600/90 backdrop-blur rounded-xl px-5 py-2 text-white font-semibold text-lg shadow-lg">
                    {currentPhase}
                </div>
            )}

            {/* Scenario time clock — bottom center */}
            {scenarioTime && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-black/60 backdrop-blur rounded-xl px-6 py-2 text-white font-mono text-2xl font-bold tracking-widest shadow-lg pointer-events-none">
                    {scenarioTime}
                </div>
            )}

            {/* Session code badge — bottom right, subtle */}
            <div className="absolute bottom-4 right-4 z-10 bg-black/50 backdrop-blur rounded-lg px-3 py-1.5 text-white/60 font-mono text-xs">
                {joinCode}
            </div>

            {/* QR buttons — bottom left */}
            <div className="absolute bottom-4 left-4 z-10 flex gap-2">
                <button
                    onClick={() => setQrMode('player')}
                    className="bg-black/50 backdrop-blur hover:bg-black/70 rounded-lg px-3 py-1.5 text-white/60 hover:text-white text-xs transition"
                    title="Toon QR-code voor deelnemers"
                >
                    QR Deelnemers
                </button>
                <button
                    onClick={() => setQrMode('spectator')}
                    className="bg-black/50 backdrop-blur hover:bg-black/70 rounded-lg px-3 py-1.5 text-white/60 hover:text-white text-xs transition"
                    title="Toon QR-code voor scherm"
                >
                    QR Scherm
                </button>
            </div>

            {/* QR modal */}
            {qrMode && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
                    onClick={() => setQrMode(null)}
                >
                    <div
                        className="bg-white rounded-3xl p-10 flex flex-col items-center gap-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="text-gray-500 text-sm uppercase tracking-widest">
                            {qrMode === 'player' ? 'Deelnemen aan sessie' : 'Projectiescherm openen'}
                        </p>
                        <QRCodeSVG
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}${
                                qrMode === 'player'
                                    ? `/player/join?code=${joinCode}`
                                    : `/screen?code=${joinCode}`
                            }`}
                            size={280}
                        />
                        <p className="text-gray-900 text-5xl font-mono font-bold tracking-widest">{joinCode}</p>
                        <p className="text-gray-400 text-sm text-center">
                            {qrMode === 'player'
                                ? 'Scan of voer de code in op je telefoon'
                                : 'Scan om het scherm te openen op een ander apparaat'}
                        </p>
                        <button
                            onClick={() => setQrMode(null)}
                            className="text-gray-400 hover:text-gray-700 text-sm transition"
                        >
                            ✕ Sluiten
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function ScreenPage() {
    return (
        <Suspense>
            <ScreenContent />
        </Suspense>
    );
}
