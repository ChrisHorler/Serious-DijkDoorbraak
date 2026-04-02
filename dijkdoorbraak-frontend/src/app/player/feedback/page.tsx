'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/lib/store';

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    const [hovered, setHovered] = useState(0);
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    onClick={() => onChange(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    className="text-3xl transition-transform hover:scale-110 focus:outline-none"
                >
                    <span className={star <= (hovered || value) ? 'text-amber-400' : 'text-gray-200'}>★</span>
                </button>
            ))}
        </div>
    );
}

export default function FeedbackPage() {
    const router = useRouter();
    const { player, session, feedbackQuestions, reset } = useGameStore();
    const [questionRatings, setQuestionRatings] = useState<Record<string, number>>({});
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    if (!session && !submitted) {
        if (typeof window !== 'undefined') router.replace('/player/join');
        return null;
    }

    const allAnswered =
        feedbackQuestions.length === 0 ||
        feedbackQuestions.every((q) => (questionRatings[q.id] ?? 0) > 0);

    function submitFeedback() {
        if (!session || !allAnswered || submitting) return;
        setSubmitting(true);
        const socket = getSocket();
        const builtRatings = feedbackQuestions.map((q) => ({
            questionId: q.id,
            question: q.question,
            rating: questionRatings[q.id] ?? 0,
        }));
        socket.emit(
            'submit_feedback',
            {
                sessionId: session.id,
                nickname: player?.nickname ?? 'Anoniem',
                questionRatings: builtRatings,
                comment: comment.trim() || null,
            },
            () => {
                setSubmitted(true);
                setSubmitting(false);
                setTimeout(() => {
                    reset();
                    router.replace('/player/join');
                }, 3000);
            },
        );
    }

    function skip() {
        reset();
        router.replace('/player/join');
    }

    return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
            <div className="w-full max-w-md space-y-6">

                {/* Header */}
                <div className="text-center space-y-1">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 mb-3">
                        <span className="text-2xl">🏁</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Scenario afgelopen</h1>
                    <p className="text-gray-500 text-sm">
                        {player?.nickname ? `Goed gespeeld, ${player.nickname}!` : 'Goed gespeeld!'} Laat ons weten hoe het ging.
                    </p>
                </div>

                {submitted ? (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-2">
                        <div className="text-3xl">✓</div>
                        <p className="font-semibold text-green-800">Bedankt voor je feedback!</p>
                        <p className="text-green-600 text-sm">Je wordt zo doorgestuurd...</p>
                    </div>
                ) : (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">

                        {/* Per-question ratings */}
                        {feedbackQuestions.length > 0 && (
                            <div className="space-y-5">
                                {feedbackQuestions.map((q, i) => (
                                    <div key={q.id} className="space-y-2">
                                        <p className="text-sm font-semibold text-gray-800">
                                            <span className="text-gray-400 font-normal mr-1">{i + 1}.</span>
                                            {q.question}
                                        </p>
                                        <StarPicker
                                            value={questionRatings[q.id] ?? 0}
                                            onChange={(v) =>
                                                setQuestionRatings((prev) => ({ ...prev, [q.id]: v }))
                                            }
                                        />
                                    </div>
                                ))}
                                <div className="border-t border-gray-100" />
                            </div>
                        )}

                        {/* General comment */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Algemene feedback{' '}
                                <span className="text-gray-400 font-normal">(optioneel)</span>
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Wat ging goed? Wat kan beter?"
                                rows={4}
                                maxLength={500}
                                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={submitFeedback}
                                disabled={!allAnswered || submitting}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-xl py-3 text-sm transition"
                            >
                                {submitting ? 'Versturen...' : 'Feedback versturen'}
                            </button>
                            <button
                                onClick={skip}
                                className="text-gray-400 hover:text-gray-600 text-sm px-4 transition"
                            >
                                Overslaan
                            </button>
                        </div>

                        {feedbackQuestions.length > 0 && !allAnswered && (
                            <p className="text-center text-xs text-amber-600">
                                Beantwoord alle vragen om door te gaan.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
