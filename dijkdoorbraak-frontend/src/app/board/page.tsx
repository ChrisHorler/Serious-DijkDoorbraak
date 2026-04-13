'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

function BoardContent() {
    const searchParams = useSearchParams();
    const codeParam = searchParams.get('code')?.toUpperCase() ?? '';

    const [code, setCode] = useState(codeParam);
    const [input, setInput] = useState(codeParam);
    const [origin, setOrigin] = useState('');

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const joinUrl = code ? `${origin}/player/join?code=${code}` : '';

    if (!code) {
        return (
            <main className="min-h-screen bg-gray-900 flex items-center justify-center px-6">
                <div className="w-full max-w-sm space-y-6 text-center">
                    <h1 className="text-white text-2xl font-bold">Digibord — Sessiecode</h1>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && input.length === 6 && setCode(input)}
                        placeholder="bijv. KPF92X"
                        maxLength={6}
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-xl font-mono tracking-widest uppercase text-center placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                        onClick={() => input.length === 6 && setCode(input)}
                        disabled={input.length !== 6}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl py-3 transition"
                    >
                        Toon digibord
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-10 px-8 select-none">
            {/* Session code — large */}
            <div className="text-center space-y-2">
                <p className="text-gray-400 text-sm uppercase tracking-[0.3em]">Sessiecode</p>
                <p className="text-white font-mono font-bold tracking-[0.25em]" style={{ fontSize: 'clamp(3rem, 10vw, 7rem)' }}>
                    {code}
                </p>
            </div>

            {/* QR codes side by side */}
            <div className="flex gap-12 flex-wrap justify-center">
                {[
                    { label: 'Deelnemers', path: 'player/join', bg: 'bg-white' },
                    { label: 'Toeschouwers', path: 'spectator/join', bg: 'bg-blue-50' },
                ].map(({ label, path, bg }) => {
                    const url = `${origin}/${path}?code=${code}`;
                    return (
                        <div key={label} className="flex flex-col items-center gap-4">
                            <div className={`${bg} p-5 rounded-2xl shadow-xl`}>
                                <QRCodeSVG value={url} size={220} />
                            </div>
                            <p className="text-gray-300 text-lg font-semibold tracking-wide">{label}</p>
                        </div>
                    );
                })}
            </div>

            {/* Footer hint */}
            <p className="text-gray-600 text-xs">
                Scan de QR-code of ga naar <span className="text-gray-400 font-mono">{origin}/player/join</span>
            </p>

            {/* Change code button */}
            <button
                onClick={() => { setCode(''); setInput(''); }}
                className="text-gray-600 hover:text-gray-400 text-xs transition"
            >
                ✕ Andere code
            </button>
        </main>
    );
}

export default function BoardPage() {
    return (
        <Suspense>
            <BoardContent />
        </Suspense>
    );
}
