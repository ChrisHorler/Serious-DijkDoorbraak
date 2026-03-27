'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/adminStore';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function AdminLoginPage() {
    const router = useRouter();
    const { setToken } = useAdminStore();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        if (!password.trim()) return;
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${BACKEND_URL}/auth/admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (!res.ok) {
                setError('Incorrect wachtwoord');
                return;
            }

            const { token } = await res.json();
            setToken(token);
            router.push('/admin/lobby');
        } catch {
            setError('Verbinding mislukt. Controleer de server.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
            <div className="w-full max-w-sm space-y-8">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-2">
                        <span className="text-white text-2xl">🛡</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Spelleider</h1>
                    <p className="text-gray-500 text-sm">Toegang tot het dashboard</p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        placeholder="Wachtwoord"
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                    {error && <p className="text-red-600 text-sm text-center">{error}</p>}
                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-xl py-3 transition"
                    >
                        {loading ? 'Inloggen...' : 'Inloggen'}
                    </button>
                </div>
            </div>
        </main>
    );
}
