'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/lib/adminStore';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';


interface Ability {
    id: string;
    name: string;
    description: string | null;
}

interface Role {
    id: string;
    name: string;
    shortName: string;
    description: string;
    abilities: Ability[];
}

interface Inject {
    id: string;
    scenarioId: string;
    title: string;
    content: string;
    triggerTime: number;
    targetRole: string | null;
}

interface Scenario {
    id: string;
    title: string;
    description: string | null;
    Injects: Inject[];
}

type Tab = 'scenarios' | 'roles';

export default function EditorPage() {
    const router = useRouter();
    const { authenticated, token } = useAdminStore();
    const [tab, setTab] = useState<Tab>('scenarios');

    // ── Scenario state ─────────────────────────────────────────────
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
    const [scenarioForm, setScenarioForm] = useState({ title: '', description: '' });
    const [editingScenario, setEditingScenario] = useState<string | null>(null);
    const [savingScenario, setSavingScenario] = useState(false);

    // ── Inject state ───────────────────────────────────────────────
    const [injectForm, setInjectForm] = useState({
        title: '', content: '', triggerTime: '', targetRole: '',
    });
    const [editingInject, setEditingInject] = useState<Inject | null>(null);
    const [savingInject, setSavingInject] = useState(false);

    // ── Role state ─────────────────────────────────────────────────
    const [roles, setRoles] = useState<Role[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [roleForm, setRoleForm] = useState({ name: '', shortName: '', description: '' });
    const [editingRole, setEditingRole] = useState<string | null>(null);
    const [savingRole, setSavingRole] = useState(false);

    // ── Ability state ──────────────────────────────────────────────
    const [abilityForm, setAbilityForm] = useState({ name: '', description: '' });
    const [editingAbility, setEditingAbility] = useState<Ability | null>(null);
    const [savingAbility, setSavingAbility] = useState(false);

    useEffect(() => {
        if (!authenticated) { router.replace('/admin'); return; }
        loadScenarios();
        loadRoles();
    }, [authenticated]);

    // ── Scenario helpers ───────────────────────────────────────────

    async function loadScenarios() {
        const res = await fetch(`${BACKEND_URL}/sessions/scenarios/all`);
        const list: Scenario[] = await res.json();
        setScenarios(list);
    }

    async function loadScenario(id: string) {
        const res = await fetch(`${BACKEND_URL}/sessions/scenarios/${id}`);
        const s: Scenario = await res.json();
        setSelectedScenario(s);
        return s;
    }

    async function saveScenario() {
        setSavingScenario(true);
        if (editingScenario) {
            await fetch(`${BACKEND_URL}/sessions/scenarios/${editingScenario}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scenarioForm),
            });
        } else {
            await fetch(`${BACKEND_URL}/sessions/scenarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scenarioForm),
            });
        }
        setEditingScenario(null);
        setScenarioForm({ title: '', description: '' });
        await loadScenarios();
        setSavingScenario(false);
    }

    async function deleteScenario(id: string) {
        if (!confirm('Scenario verwijderen? Alle injects worden ook verwijderd.')) return;
        await fetch(`${BACKEND_URL}/sessions/scenarios/${id}`, { method: 'DELETE' });
        if (selectedScenario?.id === id) setSelectedScenario(null);
        await loadScenarios();
    }

    function startEditScenario(s: Scenario) {
        setEditingScenario(s.id);
        setScenarioForm({ title: s.title, description: s.description ?? '' });
    }

    function cancelScenarioEdit() {
        setEditingScenario(null);
        setScenarioForm({ title: '', description: '' });
    }

    // ── Inject helpers ─────────────────────────────────────────────

    async function saveInject() {
        if (!selectedScenario) return;
        setSavingInject(true);
        if (editingInject) {
            await fetch(`${BACKEND_URL}/injects/${editingInject.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: injectForm.title,
                    content: injectForm.content,
                    triggerTime: Number(injectForm.triggerTime),
                    targetRole: injectForm.targetRole || null,
                }),
            });
        } else {
            await fetch(`${BACKEND_URL}/injects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenarioId: selectedScenario.id,
                    title: injectForm.title,
                    content: injectForm.content,
                    triggerTime: Number(injectForm.triggerTime),
                    targetRole: injectForm.targetRole || null,
                }),
            });
        }
        cancelInjectEdit();
        const updated = await loadScenario(selectedScenario.id);
        setSelectedScenario(updated);
        setSavingInject(false);
    }

    async function deleteInject(id: string) {
        if (!selectedScenario) return;
        await fetch(`${BACKEND_URL}/injects/${id}`, { method: 'DELETE' });
        const updated = await loadScenario(selectedScenario.id);
        setSelectedScenario(updated);
    }

    function startEditInject(inject: Inject) {
        setEditingInject(inject);
        setInjectForm({
            title: inject.title,
            content: inject.content,
            triggerTime: String(inject.triggerTime),
            targetRole: inject.targetRole ?? '',
        });
    }

    function cancelInjectEdit() {
        setEditingInject(null);
        setInjectForm({ title: '', content: '', triggerTime: '', targetRole: '' });
    }

    // ── Role helpers ───────────────────────────────────────────────

    async function loadRoles() {
        const res = await fetch(`${BACKEND_URL}/roles`);
        const list: Role[] = await res.json();
        setRoles(list);
    }

    async function saveRole() {
        setSavingRole(true);
        if (editingRole) {
            const res = await fetch(`${BACKEND_URL}/roles/${editingRole}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roleForm),
            });
            const updated: Role = await res.json();
            setRoles((r) => r.map((x) => x.id === updated.id ? updated : x));
            if (selectedRole?.id === updated.id) setSelectedRole(updated);
        } else {
            const res = await fetch(`${BACKEND_URL}/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roleForm),
            });
            const created: Role = await res.json();
            setRoles((r) => [...r, created]);
        }
        cancelRoleEdit();
        setSavingRole(false);
    }

    async function deleteRole(id: string) {
        if (!confirm('Rol verwijderen? Dit verwijdert ook alle vaardigheden.')) return;
        await fetch(`${BACKEND_URL}/roles/${id}`, { method: 'DELETE' });
        if (selectedRole?.id === id) setSelectedRole(null);
        await loadRoles();
    }

    function startEditRole(r: Role) {
        setEditingRole(r.id);
        setRoleForm({ name: r.name, shortName: r.shortName, description: r.description });
    }

    function cancelRoleEdit() {
        setEditingRole(null);
        setRoleForm({ name: '', shortName: '', description: '' });
    }

    // ── Ability helpers ────────────────────────────────────────────

    async function saveAbility() {
        if (!selectedRole) return;
        setSavingAbility(true);
        if (editingAbility) {
            const res = await fetch(`${BACKEND_URL}/roles/abilities/${editingAbility.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(abilityForm),
            });
            const updated: Ability = await res.json();
            const updatedRole = { ...selectedRole, abilities: selectedRole.abilities.map((a) => a.id === updated.id ? updated : a) };
            setSelectedRole(updatedRole);
            setRoles((r) => r.map((x) => x.id === selectedRole.id ? updatedRole : x));
        } else {
            const res = await fetch(`${BACKEND_URL}/roles/${selectedRole.id}/abilities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(abilityForm),
            });
            const created: Ability = await res.json();
            const updatedRole = { ...selectedRole, abilities: [...selectedRole.abilities, created] };
            setSelectedRole(updatedRole);
            setRoles((r) => r.map((x) => x.id === selectedRole.id ? updatedRole : x));
        }
        cancelAbilityEdit();
        setSavingAbility(false);
    }

    async function deleteAbility(id: string) {
        if (!selectedRole) return;
        await fetch(`${BACKEND_URL}/roles/abilities/${id}`, { method: 'DELETE' });
        const updatedRole = { ...selectedRole, abilities: selectedRole.abilities.filter((a) => a.id !== id) };
        setSelectedRole(updatedRole);
        setRoles((r) => r.map((x) => x.id === selectedRole.id ? updatedRole : x));
    }

    function startEditAbility(a: Ability) {
        setEditingAbility(a);
        setAbilityForm({ name: a.name, description: a.description ?? '' });
    }

    function cancelAbilityEdit() {
        setEditingAbility(null);
        setAbilityForm({ name: '', description: '' });
    }

    // ── Render ─────────────────────────────────────────────────────

    return (
        <main className="min-h-screen bg-zinc-950 text-white">
            {/* Top nav */}
            <div className="border-b border-zinc-800 px-8 py-4 flex items-center gap-6">
                <button onClick={() => router.push('/admin/lobby')} className="text-zinc-500 hover:text-white text-sm transition">
                    ← Lobby
                </button>
                <h1 className="font-bold text-lg">Scenario Editor</h1>
                <div className="flex gap-1 ml-4">
                    {(['scenarios', 'roles'] as Tab[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
                        >
                            {t === 'scenarios' ? 'Scenario\'s' : 'Rollen'}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── SCENARIOS TAB ── */}
            {tab === 'scenarios' && (
                <div className="flex h-[calc(100vh-61px)]">
                    {/* Left: scenario list */}
                    <div className="w-72 shrink-0 border-r border-zinc-800 flex flex-col">
                        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                            <span className="text-xs uppercase tracking-widest text-zinc-400">Scenario's</span>
                            <button
                                onClick={() => { setEditingScenario('new'); setScenarioForm({ title: '', description: '' }); setSelectedScenario(null); }}
                                className="text-blue-400 hover:text-blue-300 text-xs font-medium transition"
                            >
                                + Nieuw
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {scenarios.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => { loadScenario(s.id).then(setSelectedScenario); setEditingScenario(null); cancelInjectEdit(); }}
                                    className={`w-full text-left px-4 py-3 border-b border-zinc-800/50 transition ${selectedScenario?.id === s.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                                >
                                    <p className="font-medium text-sm truncate">{s.title}</p>
                                </button>
                            ))}
                            {scenarios.length === 0 && (
                                <p className="text-zinc-600 text-sm text-center py-10 px-4">Nog geen scenario's. Maak er een aan.</p>
                            )}
                        </div>
                    </div>

                    {/* Right: scenario detail / create form */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8">

                        {/* New / edit scenario form */}
                        {editingScenario !== null && (
                            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-4 max-w-2xl">
                                <h2 className="font-semibold text-lg">{editingScenario === 'new' ? 'Nieuw scenario' : 'Scenario bewerken'}</h2>
                                <input
                                    value={scenarioForm.title}
                                    onChange={(e) => setScenarioForm({ ...scenarioForm, title: e.target.value })}
                                    placeholder="Titel"
                                    className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                                />
                                <textarea
                                    value={scenarioForm.description}
                                    onChange={(e) => setScenarioForm({ ...scenarioForm, description: e.target.value })}
                                    placeholder="Beschrijving (optioneel)"
                                    rows={3}
                                    className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 resize-none"
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={saveScenario}
                                        disabled={!scenarioForm.title.trim() || savingScenario}
                                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-xl px-5 py-2 text-sm transition"
                                    >
                                        {savingScenario ? 'Opslaan...' : 'Opslaan'}
                                    </button>
                                    <button onClick={cancelScenarioEdit} className="text-zinc-500 hover:text-white text-sm transition px-3">
                                        Annuleer
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Selected scenario detail */}
                        {selectedScenario && editingScenario !== selectedScenario.id && (
                            <>
                                <div className="max-w-2xl space-y-2">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h2 className="text-xl font-bold">{selectedScenario.title}</h2>
                                            {selectedScenario.description && (
                                                <p className="text-zinc-400 text-sm mt-1">{selectedScenario.description}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                onClick={() => startEditScenario(selectedScenario)}
                                                className="text-zinc-400 hover:text-white text-sm transition"
                                            >
                                                Bewerken
                                            </button>
                                            <button
                                                onClick={() => deleteScenario(selectedScenario.id)}
                                                className="text-red-500 hover:text-red-400 text-sm transition"
                                            >
                                                Verwijderen
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Injects */}
                                <div className="max-w-2xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-zinc-300 text-sm uppercase tracking-widest">Injects ({selectedScenario.Injects.length})</h3>
                                        <button
                                            onClick={() => { cancelInjectEdit(); setEditingInject({ id: 'new', scenarioId: selectedScenario.id, title: '', content: '', triggerTime: 0, targetRole: null }); setInjectForm({ title: '', content: '', triggerTime: '', targetRole: '' }); }}
                                            className="text-blue-400 hover:text-blue-300 text-xs font-medium transition"
                                        >
                                            + Inject toevoegen
                                        </button>
                                    </div>

                                    {/* Inject form */}
                                    {editingInject && (
                                        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-3">
                                            <p className="text-sm font-semibold text-zinc-300">
                                                {editingInject.id === 'new' ? 'Nieuwe inject' : 'Inject bewerken'}
                                            </p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    value={injectForm.title}
                                                    onChange={(e) => setInjectForm({ ...injectForm, title: e.target.value })}
                                                    placeholder="Titel"
                                                    className="col-span-2 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                                                />
                                                <input
                                                    type="number"
                                                    value={injectForm.triggerTime}
                                                    onChange={(e) => setInjectForm({ ...injectForm, triggerTime: e.target.value })}
                                                    placeholder="T+ seconden (bijv. 180)"
                                                    className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                                                />
                                                <select
                                                    value={injectForm.targetRole}
                                                    onChange={(e) => setInjectForm({ ...injectForm, targetRole: e.target.value })}
                                                    className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                                                >
                                                    <option value="">Iedereen</option>
                                                    {roles.map((r) => (
                                                        <option key={r.id} value={r.shortName}>{r.shortName} — {r.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <textarea
                                                value={injectForm.content}
                                                onChange={(e) => setInjectForm({ ...injectForm, content: e.target.value })}
                                                placeholder="Inhoud van de inject..."
                                                rows={3}
                                                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 resize-none"
                                            />
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={saveInject}
                                                    disabled={!injectForm.title.trim() || !injectForm.triggerTime || savingInject}
                                                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-lg px-4 py-1.5 text-sm transition"
                                                >
                                                    {savingInject ? 'Opslaan...' : 'Opslaan'}
                                                </button>
                                                <button onClick={cancelInjectEdit} className="text-zinc-500 hover:text-white text-sm transition">
                                                    Annuleer
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Inject list */}
                                    {selectedScenario.Injects.length === 0 && !editingInject && (
                                        <p className="text-zinc-600 text-sm py-4 text-center border border-dashed border-zinc-800 rounded-xl">
                                            Nog geen injects. Voeg er een toe.
                                        </p>
                                    )}
                                    <div className="space-y-2">
                                        {selectedScenario.Injects.map((inject) => (
                                            <div
                                                key={inject.id}
                                                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-start gap-3"
                                            >
                                                <div className="shrink-0 text-center">
                                                    <p className="text-zinc-500 text-xs font-mono">T+{inject.triggerTime}s</p>
                                                    {inject.targetRole && (
                                                        <p className="text-blue-400 text-xs font-mono mt-0.5">{inject.targetRole}</p>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm text-white">{inject.title}</p>
                                                    <p className="text-zinc-500 text-xs mt-0.5 truncate">{inject.content}</p>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <button
                                                        onClick={() => startEditInject(inject)}
                                                        className="text-zinc-500 hover:text-white text-xs transition"
                                                    >
                                                        Bewerken
                                                    </button>
                                                    <button
                                                        onClick={() => deleteInject(inject.id)}
                                                        className="text-red-600 hover:text-red-400 text-xs transition"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {!selectedScenario && editingScenario === null && (
                            <div className="flex items-center justify-center h-64 text-zinc-600 text-sm">
                                Selecteer een scenario of maak een nieuw aan
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── ROLES TAB ── */}
            {tab === 'roles' && (
                <div className="flex h-[calc(100vh-61px)]">
                    {/* Left: role list */}
                    <div className="w-72 shrink-0 border-r border-zinc-800 flex flex-col">
                        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                            <span className="text-xs uppercase tracking-widest text-zinc-400">Rollen</span>
                            <button
                                onClick={() => { setEditingRole('new'); setRoleForm({ name: '', shortName: '', description: '' }); setSelectedRole(null); }}
                                className="text-blue-400 hover:text-blue-300 text-xs font-medium transition"
                            >
                                + Nieuw
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {roles.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => { setSelectedRole(r); setEditingRole(null); cancelAbilityEdit(); }}
                                    className={`w-full text-left px-4 py-3 border-b border-zinc-800/50 transition ${selectedRole?.id === r.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                                >
                                    <p className="font-mono text-xs text-zinc-500">{r.shortName}</p>
                                    <p className="font-medium text-sm truncate">{r.name}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: role detail */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8">

                        {/* New / edit role form */}
                        {editingRole !== null && (
                            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-4 max-w-2xl">
                                <h2 className="font-semibold text-lg">{editingRole === 'new' ? 'Nieuwe rol' : 'Rol bewerken'}</h2>
                                <div className="grid grid-cols-3 gap-3">
                                    <input
                                        value={roleForm.name}
                                        onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                                        placeholder="Naam (bijv. Leider CoPI)"
                                        className="col-span-2 bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                                    />
                                    <input
                                        value={roleForm.shortName}
                                        onChange={(e) => setRoleForm({ ...roleForm, shortName: e.target.value.toUpperCase() })}
                                        placeholder="Afkorting"
                                        className="bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-2.5 text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <textarea
                                    value={roleForm.description}
                                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                                    placeholder="Beschrijving van de rol..."
                                    rows={3}
                                    className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 resize-none"
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={saveRole}
                                        disabled={!roleForm.name.trim() || !roleForm.shortName.trim() || savingRole}
                                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-xl px-5 py-2 text-sm transition"
                                    >
                                        {savingRole ? 'Opslaan...' : 'Opslaan'}
                                    </button>
                                    <button onClick={cancelRoleEdit} className="text-zinc-500 hover:text-white text-sm transition px-3">
                                        Annuleer
                                    </button>
                                    {editingRole !== 'new' && (
                                        <button
                                            onClick={() => deleteRole(editingRole)}
                                            className="ml-auto text-red-500 hover:text-red-400 text-sm transition"
                                        >
                                            Rol verwijderen
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Selected role detail */}
                        {selectedRole && editingRole !== selectedRole.id && (
                            <>
                                <div className="max-w-2xl space-y-2">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-xs font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{selectedRole.shortName}</span>
                                                <h2 className="text-xl font-bold">{selectedRole.name}</h2>
                                            </div>
                                            {selectedRole.description && (
                                                <p className="text-zinc-400 text-sm">{selectedRole.description}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => startEditRole(selectedRole)}
                                            className="text-zinc-400 hover:text-white text-sm transition shrink-0"
                                        >
                                            Bewerken
                                        </button>
                                    </div>
                                </div>

                                {/* Abilities */}
                                <div className="max-w-2xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-zinc-300 text-sm uppercase tracking-widest">Vaardigheden ({selectedRole.abilities.length})</h3>
                                        <button
                                            onClick={() => { cancelAbilityEdit(); setEditingAbility({ id: 'new', name: '', description: null }); setAbilityForm({ name: '', description: '' }); }}
                                            className="text-blue-400 hover:text-blue-300 text-xs font-medium transition"
                                        >
                                            + Vaardigheid toevoegen
                                        </button>
                                    </div>

                                    {/* Ability form */}
                                    {editingAbility && (
                                        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3">
                                            <p className="text-sm font-semibold text-zinc-300">
                                                {editingAbility.id === 'new' ? 'Nieuwe vaardigheid' : 'Vaardigheid bewerken'}
                                            </p>
                                            <input
                                                value={abilityForm.name}
                                                onChange={(e) => setAbilityForm({ ...abilityForm, name: e.target.value })}
                                                placeholder="Naam van de actie"
                                                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                                            />
                                            <input
                                                value={abilityForm.description}
                                                onChange={(e) => setAbilityForm({ ...abilityForm, description: e.target.value })}
                                                placeholder="Beschrijving (optioneel)"
                                                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                                            />
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={saveAbility}
                                                    disabled={!abilityForm.name.trim() || savingAbility}
                                                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-lg px-4 py-1.5 text-sm transition"
                                                >
                                                    {savingAbility ? 'Opslaan...' : 'Opslaan'}
                                                </button>
                                                <button onClick={cancelAbilityEdit} className="text-zinc-500 hover:text-white text-sm transition">
                                                    Annuleer
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Ability list */}
                                    {selectedRole.abilities.length === 0 && !editingAbility && (
                                        <p className="text-zinc-600 text-sm py-4 text-center border border-dashed border-zinc-800 rounded-xl">
                                            Geen vaardigheden. Voeg er een toe.
                                        </p>
                                    )}
                                    <div className="space-y-1.5">
                                        {selectedRole.abilities.map((a, idx) => (
                                            <div key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3">
                                                <span className="text-zinc-600 text-xs font-mono w-5">{idx + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm font-medium">{a.name}</p>
                                                    {a.description && <p className="text-zinc-500 text-xs mt-0.5">{a.description}</p>}
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <button
                                                        onClick={() => startEditAbility(a)}
                                                        className="text-zinc-500 hover:text-white text-xs transition"
                                                    >
                                                        Bewerken
                                                    </button>
                                                    <button
                                                        onClick={() => deleteAbility(a.id)}
                                                        className="text-red-600 hover:text-red-400 text-xs transition"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {!selectedRole && editingRole === null && (
                            <div className="flex items-center justify-center h-64 text-zinc-600 text-sm">
                                Selecteer een rol of maak een nieuwe aan
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}
