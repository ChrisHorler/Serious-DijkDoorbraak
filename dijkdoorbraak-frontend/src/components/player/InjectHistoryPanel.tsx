'use client';

import { useState } from 'react';
import { useGameStore, Inject, INJECT_VARIANT_STYLES } from '@/lib/store';

export default function InjectHistoryPanel() {
    const { injects, setActiveInject } = useGameStore();
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);

    const sorted = [...injects].reverse();

    return (
        <>
            {/* FAB — bottom left */}
            <button
                onClick={() => setOpen(true)}
                className="absolute left-4 z-20 w-14 h-14 bg-white border border-gray-200 hover:bg-gray-50 rounded-full shadow-xl flex items-center justify-center transition"
                style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
            >
                <span className="text-xl">📋</span>
                {injects.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {injects.length > 9 ? '9+' : injects.length}
                    </span>
                )}
            </button>

            {/* Panel */}
            {open && (
                <div className="absolute inset-0 z-30 flex flex-col bg-white">
                    {/* Header */}
                    <div className="bg-blue-700 text-white px-5 py-4 flex items-center justify-between shrink-0">
                        <div>
                            <h2 className="font-bold text-base">Incidentmeldingen</h2>
                            <p className="text-blue-200 text-xs">{injects.length} meld{injects.length !== 1 ? 'ingen' : 'ing'} ontvangen</p>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-lg transition"
                        >
                            ✕
                        </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {sorted.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
                                <span className="text-4xl">📭</span>
                                <p className="text-sm">Nog geen meldingen ontvangen</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {sorted.map((inject: Inject, idx) => {
                                    const v = INJECT_VARIANT_STYLES[inject.variant ?? 'alert'];
                                    return (
                                    <div key={inject.id} className="px-5 py-4">
                                        {/* Collapsed header */}
                                        <button
                                            className="w-full text-left"
                                            onClick={() => setExpanded(expanded === inject.id ? null : inject.id)}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-2 h-2 rounded-full ${v.accentDot} mt-1.5 shrink-0`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm leading-none">{v.icon}</span>
                                                        <p className="font-semibold text-gray-900 text-sm">{inject.title}</p>
                                                        {inject.targetRole && (
                                                            <span className="bg-blue-100 text-blue-700 text-xs font-mono px-2 py-0.5 rounded-full">
                                                                {inject.targetRole}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {expanded !== inject.id && (
                                                        <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{inject.content}</p>
                                                    )}
                                                </div>
                                                <span className="text-gray-300 text-xs shrink-0">{sorted.length - idx}</span>
                                            </div>
                                        </button>

                                        {/* Expanded content */}
                                        {expanded === inject.id && (
                                            <div className="mt-3 ml-5 space-y-3">
                                                <p className="text-gray-700 text-sm leading-relaxed">{inject.content}</p>
                                                <button
                                                    onClick={() => { setActiveInject(inject); setOpen(false); }}
                                                    className="text-blue-600 text-xs font-medium hover:text-blue-700 transition"
                                                >
                                                    Toon als melding →
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
