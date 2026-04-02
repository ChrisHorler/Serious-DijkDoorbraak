'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/lib/store';

const MiniMap = dynamic(() => import('./MiniMap'), { ssr: false });

type Urgency = 'low' | 'medium' | 'high';

export interface ActionDetails {
    urgency: Urgency;
    location: [number, number] | null;
    detail: string;
}

interface Props {
    abilityName: string;
    onSubmit: (details: ActionDetails) => void;
    onCancel: () => void;
}

const URGENCY_OPTIONS: { value: Urgency; label: string; color: string; active: string }[] = [
    { value: 'low',    label: 'Laag',   color: 'border-gray-200 text-gray-600',   active: 'border-green-500 bg-green-50 text-green-700 font-semibold' },
    { value: 'medium', label: 'Middel', color: 'border-gray-200 text-gray-600',   active: 'border-amber-500 bg-amber-50 text-amber-700 font-semibold' },
    { value: 'high',   label: 'Hoog',   color: 'border-gray-200 text-gray-600',   active: 'border-red-500 bg-red-50 text-red-700 font-semibold' },
];

export default function ActionDetailModal({ abilityName, onSubmit, onCancel }: Props) {
    const { overlays, incidentLocation } = useGameStore();
    const [urgency, setUrgency] = useState<Urgency>('medium');
    const [location, setLocation] = useState<[number, number] | null>(null);
    const [detail, setDetail] = useState('');
    const [showMap, setShowMap] = useState(false);

    return (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4">
            <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col">

                {/* Header */}
                <div className="px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-xs uppercase tracking-widest">Actie indienen</p>
                            <h2 className="text-gray-900 font-bold text-base mt-0.5">{abilityName}</h2>
                        </div>
                        <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition text-sm">✕</button>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                    {/* Urgency */}
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-700">Urgentie</p>
                        <div className="flex gap-2">
                            {URGENCY_OPTIONS.map((o) => (
                                <button
                                    key={o.value}
                                    onClick={() => setUrgency(o.value)}
                                    className={`flex-1 py-2 rounded-xl border text-sm transition ${urgency === o.value ? o.active : o.color + ' hover:bg-gray-50'}`}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-700">
                                Locatie <span className="text-gray-400 font-normal">(optioneel)</span>
                            </p>
                            <button
                                onClick={() => setShowMap(!showMap)}
                                className="text-blue-600 text-xs font-medium hover:text-blue-700 transition"
                            >
                                {showMap ? 'Verberg kaart' : 'Tik op kaart'}
                            </button>
                        </div>

                        {showMap && (
                            <div className="h-48 rounded-xl overflow-hidden border border-gray-200">
                                <MiniMap
                                    overlays={overlays}
                                    selectedLocation={location}
                                    onLocationSelect={(lat, lng) => setLocation([lat, lng])}
                                    defaultCenter={incidentLocation ?? undefined}
                                />
                            </div>
                        )}

                        {location ? (
                            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                                <span className="text-blue-600 text-sm">📍</span>
                                <span className="text-blue-700 text-xs font-mono flex-1">
                                    {location[0].toFixed(4)}, {location[1].toFixed(4)}
                                </span>
                                <button
                                    onClick={() => setLocation(null)}
                                    className="text-blue-400 hover:text-blue-600 text-xs transition"
                                >
                                    Wissen
                                </button>
                            </div>
                        ) : (
                            <p className="text-gray-400 text-xs">Geen locatie geselecteerd</p>
                        )}
                    </div>

                    {/* Detail */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">
                            Details <span className="text-gray-400 font-normal">(optioneel)</span>
                        </label>
                        <textarea
                            value={detail}
                            onChange={(e) => setDetail(e.target.value)}
                            placeholder="Beschrijf de situatie of maatregel nader..."
                            rows={3}
                            maxLength={200}
                            className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-gray-100 shrink-0">
                    <button
                        onClick={() => onSubmit({ urgency, location, detail: detail.trim() })}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 text-sm transition"
                    >
                        Actie indienen
                    </button>
                </div>
            </div>
        </div>
    );
}
