'use client';

import { Role } from '@/lib/store';

interface Props {
    role: Role;
    onClose: () => void;
}

export default function RoleDetailPanel({ role, onClose }: Props) {
    return (
        <div className="absolute inset-0 z-30 flex flex-col bg-white">
            {/* Header */}
            <div className="bg-blue-700 text-white px-5 py-5 shrink-0">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <span className="inline-block bg-white/20 text-white text-xs font-mono px-2.5 py-1 rounded-lg mb-2">
                            {role.shortName}
                        </span>
                        <h1 className="text-xl font-bold">{role.name}</h1>
                        {role.description && (
                            <p className="text-blue-200 text-sm mt-1">{role.description}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-lg transition shrink-0"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">

                {/* Briefing */}
                {role.briefing ? (
                    <div className="space-y-2">
                        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Roltoelichting</h2>
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                            {role.briefing.split('\n').map((line, i) => (
                                line.trim()
                                    ? <p key={i} className="text-gray-800 text-sm leading-relaxed mb-2 last:mb-0">{line}</p>
                                    : <div key={i} className="h-2" />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4 text-center">
                        <p className="text-gray-400 text-sm">Geen roltoelichting beschikbaar</p>
                    </div>
                )}

                {/* Abilities */}
                <div className="space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                        Beschikbare acties ({role.abilities.length})
                    </h2>
                    {role.abilities.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">Geen acties beschikbaar</p>
                    ) : (
                        <div className="space-y-2">
                            {role.abilities.map((ability, idx) => (
                                <div key={ability.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">{ability.name}</p>
                                            {ability.description && (
                                                <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{ability.description}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-5 py-4 border-t border-gray-100 bg-gray-50">
                <button
                    onClick={onClose}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 text-sm transition"
                >
                    Terug naar kaart
                </button>
            </div>
        </div>
    );
}
