'use client';

import { useGameStore } from "@/lib/store";

export default function InjectModal() {
    const { activeInject, setActiveInject } = useGameStore();

    if (!activeInject) return null;

    return (
        <div className="absolute inset-0 z-30 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <p className="text-red-600 text-xs uppercase tracking-widest font-medium">
                        Incident melding
                    </p>
                </div>
                <h2 className="text-gray-900 text-xl font-bold mb-3">{activeInject.title}</h2>
                <p className="text-gray-600 text-sm leading-relaxed">{activeInject.content}</p>

                <button
                    onClick={() => setActiveInject(null)}
                    className="mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-3 text-sm font-medium transition"
                >
                    Sluiten
                </button>
            </div>
        </div>
    );
}
