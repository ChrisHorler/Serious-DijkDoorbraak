'use client';

import { useGameStore } from "@/lib/store";

export default function InjectModal() {
    const { activeInject, setActiveInject } = useGameStore();

    if (!activeInject) return null;

    return (
        <div className="absolute inset-0 z-30 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    <p className="text-red-400 text-xs uppercase tracking-widest font-medium">
                        Incident melding
                    </p>
                </div>
                <h2 className="text-white text-xl font-bold mb-3">{activeInject.title}</h2>
                <p className="text-zinc-300 text-sm leading-relaxed">{activeInject.content}</p>

                <button
                    onClick={() => setActiveInject(null)}
                    className="mt-6 w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-3 text-sm font-medium transition"
                >
                    Sluiten
                </button>
            </div>
        </div>
    );
}