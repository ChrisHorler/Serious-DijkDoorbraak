'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store';
import { getSocket } from '@/lib/socket';
import ActionDetailModal, { ActionDetails } from './ActionDetailModal';

export default function AbilityMenu() {
    const [open, setOpen] = useState(false);
    const [submitted, setSubmitted] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [pendingAbility, setPendingAbility] = useState<{ id: string; name: string } | null>(null);
    const [pendingCustom, setPendingCustom] = useState(false);
    const { player, session, setPendingPin } = useGameStore();

    const abilities = player?.role?.abilities ?? [];

    function openDetail(abilityId: string, abilityName: string) {
        setOpen(false);
        setPendingAbility({ id: abilityId, name: abilityName });
    }

    function openCustom() {
        setOpen(false);
        setPendingCustom(true);
    }

    function submitAbility(details: ActionDetails) {
        if (!pendingAbility || submitting) return;
        setSubmitting(true);
        const socket = getSocket();
        socket.emit('submit_action', {
            playerId: player?.id,
            sessionId: session?.id,
            abilityId: pendingAbility.id,
            actionUrgency: details.urgency,
            actionLat: details.location?.[0] ?? null,
            actionLng: details.location?.[1] ?? null,
            actionDetail: details.detail || null,
        }, (res: any) => {
            setSubmitting(false);
            if (res.success) {
                if (details.location && res.decision?.id) {
                    setPendingPin({ decisionId: res.decision.id, lat: details.location[0], lng: details.location[1] });
                }
                setSubmitted(pendingAbility.name);
                setTimeout(() => setSubmitted(null), 3000);
                setPendingAbility(null);
            } else {
                setPendingAbility(null);
                alert(res.message ?? 'Actie mislukt. Probeer het opnieuw.');
            }
        });
    }

    function submitCustom(details: ActionDetails) {
        if (!details.customText || submitting) return;
        setSubmitting(true);
        const socket = getSocket();
        socket.emit('submit_action', {
            playerId: player?.id,
            sessionId: session?.id,
            customAction: details.customText,
            actionUrgency: details.urgency,
            actionLat: details.location?.[0] ?? null,
            actionLng: details.location?.[1] ?? null,
            actionDetail: details.detail || null,
        }, (res: any) => {
            setSubmitting(false);
            if (res.success) {
                if (details.location && res.decision?.id) {
                    setPendingPin({ decisionId: res.decision.id, lat: details.location[0], lng: details.location[1] });
                }
                setSubmitted(details.customText!);
                setTimeout(() => setSubmitted(null), 3000);
                setPendingCustom(false);
            } else {
                setPendingCustom(false);
                alert(res.message ?? 'Actie mislukt. Probeer het opnieuw.');
            }
        });
    }

    return (
        <>
            {/* Ability detail modal */}
            {pendingAbility && (
                <ActionDetailModal
                    abilityName={pendingAbility.name}
                    onSubmit={submitAbility}
                    onCancel={() => setPendingAbility(null)}
                />
            )}

            {/* Custom action modal */}
            {pendingCustom && (
                <ActionDetailModal
                    abilityName="Vrije actie"
                    isCustom
                    onSubmit={submitCustom}
                    onCancel={() => setPendingCustom(false)}
                />
            )}

            {/* Submitted feedback */}
            {submitted && (
                <div className="absolute bottom-24 left-0 right-0 z-20 flex justify-center px-4">
                    <div className="bg-green-50 border border-green-300 rounded-xl px-4 py-3 text-green-700 text-sm shadow-md">
                        Actie ingediend: {submitted}
                    </div>
                </div>
            )}

            {/* Ability list */}
            {open && (
                <div className="absolute right-4 z-20 w-72 bg-white/95 backdrop-blur border border-gray-200 rounded-2xl shadow-xl overflow-hidden" style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                        <p className="text-gray-500 text-xs uppercase tracking-widest">Acties</p>
                        <p className="text-gray-900 font-bold text-sm">{player?.role?.name}</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {abilities.map((ability) => (
                            <button
                                key={ability.id}
                                onClick={() => openDetail(ability.id, ability.name)}
                                disabled={submitting}
                                className="w-full text-left px-4 py-3 text-gray-800 text-sm hover:bg-blue-50 hover:text-blue-700 border-b border-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="font-medium">{ability.name}</span>
                                {ability.description && (
                                    <p className="text-gray-400 text-xs mt-0.5 truncate">{ability.description}</p>
                                )}
                            </button>
                        ))}
                        {/* Custom / free action */}
                        <button
                            onClick={openCustom}
                            disabled={submitting}
                            className="w-full text-left px-4 py-3 text-gray-500 text-sm hover:bg-gray-50 hover:text-gray-800 border-t border-dashed border-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="font-medium">✏ Vrije actie</span>
                            <p className="text-gray-400 text-xs mt-0.5">Iets wat niet op de lijst staat</p>
                        </button>
                    </div>
                </div>
            )}

            {/* FAB button */}
            <button
                onClick={() => setOpen(!open)}
                className="absolute right-4 z-20 w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full shadow-xl flex items-center justify-center transition"
                style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
            >
                <span className="text-white text-2xl">{open ? '✕' : '⚡'}</span>
            </button>
        </>
    );
}
