'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAdminStore, EscalationPhase } from '@/lib/adminStore';
import { INCIDENT_LOCATION, FLOOD_SIZES } from '@/lib/overlayPresets';
import { INJECT_VARIANT_STYLES, type InjectVariant } from '@/lib/store';
import type { MapOverlay } from '@/lib/store';
import type { DrawMode } from '@/components/admin/EditorMap';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const EditorMap = dynamic(() => import('@/components/admin/EditorMap'), { ssr: false });

// ── Types ──────────────────────────────────────────────────────────

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
    briefing: string | null;
    abilities: Ability[];
}

interface Inject {
    id: string;
    scenarioId: string;
    title: string;
    content: string;
    triggerTime: number;
    targetRole: string | null;
    variant: string;
}

interface Scenario {
    id: string;
    title: string;
    description: string | null;
    phases: EscalationPhase[] | null;
    customOverlays: MapOverlay[] | null;
    incidentLat: number | null;
    incidentLng: number | null;
    Injects: Inject[];
}

interface FeedbackQuestion {
    id: string;
    question: string;
    order: number;
}

interface DrawDraft {
    kind: 'polygon' | 'marker';
    coordinates: [number, number][] | [number, number];
}

type Tab = 'scenarios' | 'roles';

// ── Constants ──────────────────────────────────────────────────────

const DRAW_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#3b82f6', '#a855f7', '#ec4899', '#ffffff',
];

const MARKER_ICONS = [
    '🚒', '🚑', '🚓', '🚁', '⛵', '🚧',
    '🏥', '🏚️', '⚠️', '🔥', '💧', '🌊',
    '⛽', '🔴', '🟡', '🟢', '📍', '📌',
];

function generateId(): string {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    arr[6] = (arr[6] & 0x0f) | 0x40;
    arr[8] = (arr[8] & 0x3f) | 0x80;
    return [...arr].map((b, i) =>
        ([4, 6, 8, 10].includes(i) ? '-' : '') + b.toString(16).padStart(2, '0')
    ).join('');
}

function newPhase(index: number): EscalationPhase {
    return { id: generateId(), name: `Fase ${index + 1}`, floodZoneScale: null, floodZoneCoordinates: null, activeOverlayIds: [], injectId: null };
}

// ── Component ──────────────────────────────────────────────────────

export default function EditorPage() {
    const router = useRouter();
    const { authenticated } = useAdminStore();
    const [tab, setTab] = useState<Tab>('scenarios');

    // ── Scenario ───────────────────────────────────────────────────
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
    const [scenarioForm, setScenarioForm] = useState({ title: '', description: '' });
    const [editingScenario, setEditingScenario] = useState<string | null>(null);
    const [savingScenario, setSavingScenario] = useState(false);

    // ── Injects ────────────────────────────────────────────────────
    const [injectForm, setInjectForm] = useState({ title: '', content: '', triggerTime: '', targetRole: '', variant: 'alert' });
    const [editingInject, setEditingInject] = useState<Inject | null>(null);
    const [savingInject, setSavingInject] = useState(false);

    // ── Phases ─────────────────────────────────────────────────────
    const [phases, setPhases] = useState<EscalationPhase[]>([]);
    const [previewPhaseIndex, setPreviewPhaseIndex] = useState(-1);
    const [savingPhases, setSavingPhases] = useState(false);
    const [phasesSaved, setPhasesSaved] = useState(false);

    // ── Feedback questions ─────────────────────────────────────────
    const [feedbackQuestions, setFeedbackQuestions] = useState<FeedbackQuestion[]>([]);
    const [feedbackQuestionInput, setFeedbackQuestionInput] = useState('');
    const [savingFeedbackQuestion, setSavingFeedbackQuestion] = useState(false);

    // ── Incident location ──────────────────────────────────────────
    const [incidentLat, setIncidentLat] = useState(INCIDENT_LOCATION[0]);
    const [incidentLng, setIncidentLng] = useState(INCIDENT_LOCATION[1]);
    const [locationDirty, setLocationDirty] = useState(false);
    const [savingLocation, setSavingLocation] = useState(false);
    const [locationSaved, setLocationSaved] = useState(false);

    // ── Custom overlays ────────────────────────────────────────────
    const [customOverlays, setCustomOverlays] = useState<MapOverlay[]>([]);
    const [savingOverlays, setSavingOverlays] = useState(false);

    // ── Drawing ────────────────────────────────────────────────────
    const [drawMode, setDrawMode] = useState<DrawMode>('none');
    const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
    const [pendingDraft, setPendingDraft] = useState<DrawDraft | null>(null);
    const [draftLabel, setDraftLabel] = useState('');
    const [draftColor, setDraftColor] = useState('#3b82f6');
    const [draftIcon, setDraftIcon] = useState<string | null>(null);
    // When set, polygon drawing is for a phase flood zone instead of a custom overlay
    const [drawingFloodForPhaseId, setDrawingFloodForPhaseId] = useState<string | null>(null);

    // ── Roles ──────────────────────────────────────────────────────
    const [roles, setRoles] = useState<Role[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [roleForm, setRoleForm] = useState({ name: '', shortName: '', description: '', briefing: '' });
    const [editingRole, setEditingRole] = useState<string | null>(null);
    const [savingRole, setSavingRole] = useState(false);

    // ── Abilities ──────────────────────────────────────────────────
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
        setScenarios(await res.json());
    }

    async function loadScenario(id: string) {
        const res = await fetch(`${BACKEND_URL}/sessions/scenarios/${id}`);
        const s: Scenario = await res.json();
        setSelectedScenario(s);
        setPhases(Array.isArray(s.phases) ? s.phases : []);
        setCustomOverlays(Array.isArray(s.customOverlays) ? s.customOverlays : []);
        setIncidentLat(s.incidentLat ?? INCIDENT_LOCATION[0]);
        setIncidentLng(s.incidentLng ?? INCIDENT_LOCATION[1]);
        setPreviewPhaseIndex(-1);
        setLocationDirty(false);
        setDrawMode('none');
        setDrawPoints([]);
        setPendingDraft(null);
        // Load feedback questions for this scenario
        const fqRes = await fetch(`${BACKEND_URL}/scenarios/${id}/feedback-questions`);
        setFeedbackQuestions(await fqRes.json());
        return s;
    }

    async function saveScenario() {
        setSavingScenario(true);
        if (editingScenario && editingScenario !== 'new') {
            await fetch(`${BACKEND_URL}/sessions/scenarios/${editingScenario}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scenarioForm),
            });
        } else {
            const res = await fetch(`${BACKEND_URL}/sessions/scenarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scenarioForm),
            });
            const created: Scenario = await res.json();
            await loadScenario(created.id);
        }
        setEditingScenario(null);
        setScenarioForm({ title: '', description: '' });
        await loadScenarios();
        setSavingScenario(false);
    }

    async function deleteScenario(id: string) {
        if (!confirm('Scenario verwijderen? Alle injects worden ook verwijderd.')) return;
        await fetch(`${BACKEND_URL}/sessions/scenarios/${id}`, { method: 'DELETE' });
        if (selectedScenario?.id === id) { setSelectedScenario(null); setPhases([]); setCustomOverlays([]); }
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
        if (editingInject && editingInject.id !== 'new') {
            await fetch(`${BACKEND_URL}/injects/${editingInject.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: injectForm.title, content: injectForm.content, triggerTime: Number(injectForm.triggerTime), targetRole: injectForm.targetRole || null, variant: injectForm.variant }),
            });
        } else {
            await fetch(`${BACKEND_URL}/injects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenarioId: selectedScenario.id, title: injectForm.title, content: injectForm.content, triggerTime: Number(injectForm.triggerTime), targetRole: injectForm.targetRole || null, variant: injectForm.variant }),
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
        setInjectForm({ title: inject.title, content: inject.content, triggerTime: String(inject.triggerTime), targetRole: inject.targetRole ?? '', variant: inject.variant ?? 'alert' });
    }

    function cancelInjectEdit() {
        setEditingInject(null);
        setInjectForm({ title: '', content: '', triggerTime: '', targetRole: '', variant: 'alert' });
    }

    // ── Phase helpers ──────────────────────────────────────────────

    function addPhase() { setPhases(p => [...p, newPhase(p.length)]); setPhasesSaved(false); }
    function removePhase(id: string) { setPhases(p => p.filter(x => x.id !== id)); setPreviewPhaseIndex(-1); setPhasesSaved(false); }
    function updatePhase(id: string, patch: Partial<EscalationPhase>) { setPhases(p => p.map(x => x.id === id ? { ...x, ...patch } : x)); setPhasesSaved(false); }


    async function savePhases() {
        if (!selectedScenario) return;
        setSavingPhases(true);
        await fetch(`${BACKEND_URL}/sessions/scenarios/${selectedScenario.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phases }),
        });
        setSavingPhases(false);
        setPhasesSaved(true);
        setTimeout(() => setPhasesSaved(false), 2000);
    }

    // ── Feedback question helpers ──────────────────────────────────

    async function addFeedbackQuestion() {
        if (!selectedScenario || !feedbackQuestionInput.trim()) return;
        setSavingFeedbackQuestion(true);
        const res = await fetch(`${BACKEND_URL}/scenarios/${selectedScenario.id}/feedback-questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: feedbackQuestionInput.trim(), order: feedbackQuestions.length }),
        });
        const created: FeedbackQuestion = await res.json();
        setFeedbackQuestions((prev) => [...prev, created]);
        setFeedbackQuestionInput('');
        setSavingFeedbackQuestion(false);
    }

    async function deleteFeedbackQuestion(id: string) {
        if (!selectedScenario) return;
        await fetch(`${BACKEND_URL}/scenarios/${selectedScenario.id}/feedback-questions/${id}`, { method: 'DELETE' });
        setFeedbackQuestions((prev) => prev.filter((q) => q.id !== id));
    }

    // ── Location helpers ───────────────────────────────────────────

    function handleLocationChange(lat: number, lng: number) {
        setIncidentLat(lat);
        setIncidentLng(lng);
        setLocationDirty(true);
        setLocationSaved(false);
    }

    async function saveLocation() {
        if (!selectedScenario) return;
        setSavingLocation(true);
        await fetch(`${BACKEND_URL}/sessions/scenarios/${selectedScenario.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ incidentLat, incidentLng }),
        });
        setSavingLocation(false);
        setLocationDirty(false);
        setLocationSaved(true);
        setTimeout(() => setLocationSaved(false), 2000);
    }

    // ── Custom overlay helpers ─────────────────────────────────────

    async function persistCustomOverlays(next: MapOverlay[]) {
        if (!selectedScenario) return;
        setSavingOverlays(true);
        await fetch(`${BACKEND_URL}/sessions/scenarios/${selectedScenario.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customOverlays: next }),
        });
        setSavingOverlays(false);
    }

    // Drawing flow
    function handleAddDrawPoint(pt: [number, number]) {
        setDrawPoints(prev => [...prev, pt]);
    }

    function handleMarkerPlaced(pt: [number, number]) {
        setDrawMode('none');
        setPendingDraft({ kind: 'marker', coordinates: pt });
        setDraftLabel('');
        setDraftColor('#ef4444');
    }

    function handleFinishPolygon() {
        if (drawPoints.length < 3) return;
        const coords = [...drawPoints] as [number, number][];
        setDrawMode('none');
        setDrawPoints([]);
        if (drawingFloodForPhaseId) {
            // Save directly as flood zone for that phase
            updatePhase(drawingFloodForPhaseId, { floodZoneCoordinates: coords, floodZoneScale: null });
            setDrawingFloodForPhaseId(null);
            setPhasesSaved(false);
        } else {
            setPendingDraft({ kind: 'polygon', coordinates: coords });
            setDraftLabel('');
            setDraftColor('#3b82f6');
        }
    }

    function handleCancelDraw() {
        setDrawMode('none');
        setDrawPoints([]);
        setPendingDraft(null);
        setDrawingFloodForPhaseId(null);
    }

    async function saveCustomOverlay() {
        if (!pendingDraft || !draftLabel.trim()) return;
        const overlay: MapOverlay = {
            id: generateId(),
            type: 'custom',
            label: draftLabel.trim(),
            color: draftColor,
            kind: pendingDraft.kind,
            coordinates: pendingDraft.coordinates,
            ...(pendingDraft.kind === 'marker' && draftIcon ? { icon: draftIcon } : {}),
        };
        const next = [...customOverlays, overlay];
        setCustomOverlays(next);
        setPendingDraft(null);
        setDraftLabel('');
        setDraftIcon(null);
        await persistCustomOverlays(next);
    }

    async function deleteCustomOverlay(id: string) {
        const next = customOverlays.filter(o => o.id !== id);
        setCustomOverlays(next);
        // Remove from all phases too
        const updatedPhases = phases.map(p => ({ ...p, activeOverlayIds: p.activeOverlayIds.filter(x => x !== id) }));
        setPhases(updatedPhases);
        if (!selectedScenario) return;
        await fetch(`${BACKEND_URL}/sessions/scenarios/${selectedScenario.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customOverlays: next, phases: updatedPhases }),
        });
    }

    // ── Role helpers ───────────────────────────────────────────────

    async function loadRoles() {
        const res = await fetch(`${BACKEND_URL}/roles`);
        setRoles(await res.json());
    }

    async function saveRole() {
        setSavingRole(true);
        if (editingRole && editingRole !== 'new') {
            const res = await fetch(`${BACKEND_URL}/roles/${editingRole}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(roleForm) });
            const updated: Role = await res.json();
            setRoles(r => r.map(x => x.id === updated.id ? updated : x));
            if (selectedRole?.id === updated.id) setSelectedRole(updated);
        } else {
            const res = await fetch(`${BACKEND_URL}/roles`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(roleForm) });
            const created: Role = await res.json();
            setRoles(r => [...r, created]);
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

    function startEditRole(r: Role) { setEditingRole(r.id); setRoleForm({ name: r.name, shortName: r.shortName, description: r.description, briefing: r.briefing ?? '' }); }
    function cancelRoleEdit() { setEditingRole(null); setRoleForm({ name: '', shortName: '', description: '', briefing: '' }); }

    // ── Ability helpers ────────────────────────────────────────────

    async function saveAbility() {
        if (!selectedRole) return;
        setSavingAbility(true);
        if (editingAbility && editingAbility.id !== 'new') {
            const res = await fetch(`${BACKEND_URL}/roles/abilities/${editingAbility.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(abilityForm) });
            const updated: Ability = await res.json();
            const updatedRole = { ...selectedRole, abilities: selectedRole.abilities.map(a => a.id === updated.id ? updated : a) };
            setSelectedRole(updatedRole);
            setRoles(r => r.map(x => x.id === selectedRole.id ? updatedRole : x));
        } else {
            const res = await fetch(`${BACKEND_URL}/roles/${selectedRole.id}/abilities`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(abilityForm) });
            const created: Ability = await res.json();
            const updatedRole = { ...selectedRole, abilities: [...selectedRole.abilities, created] };
            setSelectedRole(updatedRole);
            setRoles(r => r.map(x => x.id === selectedRole.id ? updatedRole : x));
        }
        cancelAbilityEdit();
        setSavingAbility(false);
    }

    async function deleteAbility(id: string) {
        if (!selectedRole) return;
        await fetch(`${BACKEND_URL}/roles/abilities/${id}`, { method: 'DELETE' });
        const updatedRole = { ...selectedRole, abilities: selectedRole.abilities.filter(a => a.id !== id) };
        setSelectedRole(updatedRole);
        setRoles(r => r.map(x => x.id === selectedRole.id ? updatedRole : x));
    }

    function startEditAbility(a: Ability) { setEditingAbility(a); setAbilityForm({ name: a.name, description: a.description ?? '' }); }
    function cancelAbilityEdit() { setEditingAbility(null); setAbilityForm({ name: '', description: '' }); }

    // ── Derived ────────────────────────────────────────────────────
    const showMapPanel = selectedScenario !== null && editingScenario !== selectedScenario.id;

    // Cumulative preview phase: merge all phases 0..previewPhaseIndex so the map
    // preview reflects what's actually visible at that point in the scenario.
    const previewPhaseMerged = previewPhaseIndex >= 0 ? (() => {
        let floodZoneScale: number | null = null;
        let floodZoneCoordinates: [number, number][] | null = null;
        for (let i = 0; i <= previewPhaseIndex; i++) {
            if (phases[i].floodZoneCoordinates != null && phases[i].floodZoneCoordinates!.length >= 3) {
                floodZoneCoordinates = phases[i].floodZoneCoordinates!;
                floodZoneScale = null;
            } else if (phases[i].floodZoneScale !== null) {
                floodZoneScale = phases[i].floodZoneScale;
                floodZoneCoordinates = null;
            }
        }
        const activeOverlayIds = [...new Set(
            phases.slice(0, previewPhaseIndex + 1).flatMap(p => p.activeOverlayIds)
        )];
        return { ...phases[previewPhaseIndex], floodZoneScale, floodZoneCoordinates, activeOverlayIds };
    })() : null;

    // ── Render ─────────────────────────────────────────────────────

    return (
        <main className="min-h-screen bg-gray-50 text-gray-900">
            {/* Top nav */}
            <div className="bg-blue-700 text-white px-8 py-4 flex items-center gap-6">
                <button onClick={() => router.push('/admin/lobby')} className="text-blue-200 hover:text-white text-sm transition">← Lobby</button>
                <h1 className="font-bold text-lg">Scenario Editor</h1>
                <div className="flex gap-1 ml-4">
                    {(['scenarios', 'roles'] as Tab[]).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-white/20 text-white' : 'text-blue-200 hover:text-white'}`}>
                            {t === 'scenarios' ? "Scenario's" : 'Rollen'}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── SCENARIOS TAB ── */}
            {tab === 'scenarios' && (
                <div className="flex h-[calc(100vh-61px)]">

                    {/* Scenario list */}
                    <div className="w-44 shrink-0 border-r border-gray-200 flex flex-col bg-white">
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <span className="text-xs uppercase tracking-widest text-gray-500">Scenario's</span>
                            <button
                                onClick={() => { setEditingScenario('new'); setScenarioForm({ title: '', description: '' }); setSelectedScenario(null); setPhases([]); setCustomOverlays([]); }}
                                className="text-blue-600 hover:text-blue-700 text-xs font-medium transition"
                            >+ Nieuw</button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {scenarios.map(s => (
                                <button key={s.id}
                                    onClick={() => { loadScenario(s.id); setEditingScenario(null); cancelInjectEdit(); }}
                                    className={`w-full text-left px-4 py-3 border-b border-gray-100 transition ${selectedScenario?.id === s.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                                    <p className="font-medium text-sm truncate">{s.title}</p>
                                </button>
                            ))}
                            {scenarios.length === 0 && <p className="text-gray-400 text-sm text-center py-10 px-4">Nog geen scenario's.</p>}
                        </div>
                    </div>

                    {/* Content + map */}
                    <div className="flex flex-1 min-h-0">

                        {/* ── Left content panel ── */}
                        <div className="w-[380px] shrink-0 overflow-y-auto p-5 space-y-5 border-r border-gray-200 bg-white">

                            {/* Create / edit scenario form */}
                            {editingScenario !== null && (
                                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3">
                                    <h2 className="font-semibold text-gray-900">{editingScenario === 'new' ? 'Nieuw scenario' : 'Scenario bewerken'}</h2>
                                    <input value={scenarioForm.title} onChange={e => setScenarioForm({ ...scenarioForm, title: e.target.value })} placeholder="Titel"
                                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm" />
                                    <textarea value={scenarioForm.description} onChange={e => setScenarioForm({ ...scenarioForm, description: e.target.value })} placeholder="Beschrijving (optioneel)" rows={3}
                                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none text-sm" />
                                    <div className="flex gap-3">
                                        <button onClick={saveScenario} disabled={!scenarioForm.title.trim() || savingScenario}
                                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-xl px-5 py-2 text-sm transition">
                                            {savingScenario ? 'Opslaan...' : 'Opslaan'}
                                        </button>
                                        <button onClick={cancelScenarioEdit} className="text-gray-500 hover:text-gray-900 text-sm transition px-3">Annuleer</button>
                                    </div>
                                </div>
                            )}

                            {/* Scenario detail */}
                            {selectedScenario && editingScenario !== selectedScenario.id && (
                                <>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h2 className="text-lg font-bold leading-tight text-gray-900">{selectedScenario.title}</h2>
                                            {selectedScenario.description && <p className="text-gray-500 text-sm mt-0.5">{selectedScenario.description}</p>}
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={() => startEditScenario(selectedScenario)} className="text-gray-500 hover:text-gray-900 text-xs transition">Bewerken</button>
                                            <button onClick={() => deleteScenario(selectedScenario.id)} className="text-red-500 hover:text-red-600 text-xs transition">Verwijderen</button>
                                        </div>
                                    </div>

                                    {/* ── Injects ── */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Injects ({selectedScenario.Injects.length})</h3>
                                            <button onClick={() => { cancelInjectEdit(); setEditingInject({ id: 'new', scenarioId: selectedScenario.id, title: '', content: '', triggerTime: 0, targetRole: null }); setInjectForm({ title: '', content: '', triggerTime: '', targetRole: '' }); }}
                                                className="text-blue-600 hover:text-blue-700 text-xs font-medium transition">+ Inject</button>
                                        </div>

                                        {editingInject && (
                                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2.5">
                                                <p className="text-xs font-semibold text-gray-700">{editingInject.id === 'new' ? 'Nieuwe inject' : 'Inject bewerken'}</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input value={injectForm.title} onChange={e => setInjectForm({ ...injectForm, title: e.target.value })} placeholder="Titel"
                                                        className="col-span-2 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                                    <input type="number" value={injectForm.triggerTime} onChange={e => setInjectForm({ ...injectForm, triggerTime: e.target.value })} placeholder="T+ sec"
                                                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                                    <select value={injectForm.targetRole} onChange={e => setInjectForm({ ...injectForm, targetRole: e.target.value })}
                                                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                                        <option value="">Iedereen</option>
                                                        {roles.map(r => <option key={r.id} value={r.shortName}>{r.shortName} — {r.name}</option>)}
                                                    </select>
                                                </div>
                                                {/* Variant picker */}
                                                <div className="flex gap-1 flex-wrap">
                                                    {(Object.entries(INJECT_VARIANT_STYLES) as [InjectVariant, typeof INJECT_VARIANT_STYLES[InjectVariant]][]).map(([key, s]) => (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            onClick={() => setInjectForm({ ...injectForm, variant: key })}
                                                            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition ${injectForm.variant === key ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-800'}`}
                                                        >
                                                            <span>{s.icon}</span>{s.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <textarea value={injectForm.content} onChange={e => setInjectForm({ ...injectForm, content: e.target.value })} placeholder="Inhoud..." rows={2}
                                                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none" />
                                                <div className="flex gap-3">
                                                    <button onClick={saveInject} disabled={!injectForm.title.trim() || !injectForm.triggerTime || savingInject}
                                                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-lg px-4 py-1.5 text-xs transition">
                                                        {savingInject ? 'Opslaan...' : 'Opslaan'}
                                                    </button>
                                                    <button onClick={cancelInjectEdit} className="text-gray-500 hover:text-gray-900 text-xs transition">Annuleer</button>
                                                </div>
                                            </div>
                                        )}

                                        {selectedScenario.Injects.length === 0 && !editingInject && (
                                            <p className="text-gray-400 text-xs py-3 text-center border border-dashed border-gray-200 rounded-xl">Nog geen injects.</p>
                                        )}
                                        <div className="space-y-1.5">
                                            {selectedScenario.Injects.map(inject => (
                                                <div key={inject.id} className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 flex items-start gap-3">
                                                    <div className="shrink-0 text-center">
                                                        <span className="text-base leading-none">{INJECT_VARIANT_STYLES[(inject.variant as InjectVariant) ?? 'alert']?.icon ?? '🚨'}</span>
                                                        <p className="text-gray-400 text-xs font-mono">T+{inject.triggerTime}s</p>
                                                        {inject.targetRole && <p className="text-blue-600 text-xs font-mono">{inject.targetRole}</p>}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm text-gray-900 truncate">{inject.title}</p>
                                                        <p className="text-gray-400 text-xs mt-0.5 truncate">{inject.content}</p>
                                                    </div>
                                                    <div className="flex gap-2 shrink-0">
                                                        <button onClick={() => startEditInject(inject)} className="text-gray-400 hover:text-gray-900 text-xs transition">✎</button>
                                                        <button onClick={() => deleteInject(inject.id)} className="text-red-500 hover:text-red-600 text-xs transition">✕</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ── Phases ── */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Fasen ({phases.length})</h3>
                                            <div className="flex items-center gap-3">
                                                {phasesSaved && <span className="text-green-600 text-xs">✓ Opgeslagen</span>}
                                                <button onClick={addPhase} className="text-blue-600 hover:text-blue-700 text-xs font-medium transition">+ Fase</button>
                                            </div>
                                        </div>

                                        {phases.length === 0 && (
                                            <p className="text-gray-400 text-xs py-3 text-center border border-dashed border-gray-200 rounded-xl">Nog geen fasen.</p>
                                        )}

                                        <div className="space-y-2">
                                            {phases.map((phase, index) => (
                                                <div key={phase.id}
                                                    className={`bg-gray-50 border rounded-xl p-3 space-y-2 transition ${previewPhaseIndex === index ? 'border-blue-400' : 'border-gray-200'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-400 text-xs font-mono w-4 shrink-0">{index + 1}</span>
                                                        <input value={phase.name} onChange={e => updatePhase(phase.id, { name: e.target.value })}
                                                            className="flex-1 bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                                        <button onClick={() => setPreviewPhaseIndex(previewPhaseIndex === index ? -1 : index)}
                                                            className={`text-xs px-2 py-1 rounded border transition shrink-0 ${previewPhaseIndex === index ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400'}`}>
                                                            {previewPhaseIndex === index ? '● Op kaart' : 'Preview'}
                                                        </button>
                                                        <button onClick={() => removePhase(phase.id)} className="text-gray-400 hover:text-red-500 text-xs px-1 transition">✕</button>
                                                    </div>
                                                    {/* Flood zone */}
                                                    <div className="flex items-center gap-1.5 pl-6 flex-wrap">
                                                        <button onClick={() => updatePhase(phase.id, { floodZoneScale: null, floodZoneCoordinates: null })}
                                                            className={`px-2 py-0.5 rounded text-xs font-semibold border transition ${phase.floodZoneScale === null && !phase.floodZoneCoordinates ? 'bg-gray-200 border-gray-400 text-gray-700' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-700'}`}>
                                                            Geen overstroming
                                                        </button>
                                                        {FLOOD_SIZES.map(({ label, value }) => {
                                                            const active = phase.floodZoneScale === value && !phase.floodZoneCoordinates;
                                                            const activeClass = value === 0.5 ? 'bg-blue-400 border-blue-400 text-white' : value === 1.0 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-blue-800 border-blue-800 text-white';
                                                            return (
                                                                <button key={value} onClick={() => updatePhase(phase.id, { floodZoneScale: value, floodZoneCoordinates: null })}
                                                                    className={`px-2 py-0.5 rounded text-xs font-semibold border transition flex items-center gap-1 ${active ? activeClass : 'bg-white border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-600'}`}>
                                                                    🌊 {label}
                                                                </button>
                                                            );
                                                        })}
                                                        {/* Custom drawn flood zone */}
                                                        {phase.floodZoneCoordinates && phase.floodZoneCoordinates.length >= 3 ? (
                                                            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border bg-blue-600 border-blue-600 text-white">
                                                                🌊 Getekende zone
                                                                <button
                                                                    onClick={() => updatePhase(phase.id, { floodZoneCoordinates: null })}
                                                                    className="ml-0.5 opacity-70 hover:opacity-100 transition"
                                                                    title="Zone verwijderen"
                                                                >✕</button>
                                                                <button
                                                                    onClick={() => { setDrawMode('polygon'); setDrawPoints([]); setDrawingFloodForPhaseId(phase.id); setPendingDraft(null); }}
                                                                    className="ml-0.5 opacity-70 hover:opacity-100 transition"
                                                                    title="Opnieuw tekenen"
                                                                >↺</button>
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => { setDrawMode('polygon'); setDrawPoints([]); setDrawingFloodForPhaseId(phase.id); setPendingDraft(null); }}
                                                                className="px-2 py-0.5 rounded text-xs font-semibold border transition bg-white border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-600"
                                                            >
                                                                ✏ Teken zone
                                                            </button>
                                                        )}
                                                    </div>
                                                    {/* Inject */}
                                                    <div className="flex items-center gap-2 pl-6">
                                                        <span className="text-gray-500 text-xs w-16 shrink-0">Inject</span>
                                                        <select value={phase.injectId ?? ''} onChange={e => updatePhase(phase.id, { injectId: e.target.value || null })}
                                                            className="flex-1 bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                                            <option value="">Geen inject</option>
                                                            {selectedScenario.Injects.map(inject => (
                                                                <option key={inject.id} value={inject.id}>T+{inject.triggerTime}s — {inject.title}{inject.targetRole ? ` (${inject.targetRole})` : ''}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {phases.length > 0 && (
                                            <button onClick={savePhases} disabled={savingPhases}
                                                className="bg-blue-600 hover:bg-blue-700 border border-blue-600 text-white font-semibold rounded-xl px-4 py-1.5 text-xs transition disabled:opacity-50">
                                                {savingPhases ? 'Opslaan...' : 'Fasen opslaan'}
                                            </button>
                                        )}
                                    </div>

                                    {/* ── Feedback Questions ── */}
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                                            Feedbackvragen ({feedbackQuestions.length})
                                        </h3>
                                        <p className="text-gray-400 text-xs">Spelers beoordelen elke vraag met sterren aan het einde van het scenario.</p>

                                        {feedbackQuestions.length === 0 && (
                                            <p className="text-gray-400 text-xs py-3 text-center border border-dashed border-gray-200 rounded-xl">Nog geen vragen — spelers zien alleen het commentaarveld.</p>
                                        )}

                                        <div className="space-y-1.5">
                                            {feedbackQuestions.map((q, i) => (
                                                <div key={q.id} className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 flex items-center gap-3">
                                                    <span className="text-gray-400 text-xs font-mono shrink-0">{i + 1}</span>
                                                    <p className="flex-1 text-sm text-gray-800">{q.question}</p>
                                                    <button onClick={() => deleteFeedbackQuestion(q.id)} className="text-red-400 hover:text-red-600 text-xs transition shrink-0">✕</button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex gap-2">
                                            <input
                                                value={feedbackQuestionInput}
                                                onChange={(e) => setFeedbackQuestionInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && addFeedbackQuestion()}
                                                placeholder="Nieuwe vraag..."
                                                className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                            />
                                            <button
                                                onClick={addFeedbackQuestion}
                                                disabled={!feedbackQuestionInput.trim() || savingFeedbackQuestion}
                                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-lg px-3 py-2 text-xs transition"
                                            >
                                                + Vraag
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {!selectedScenario && editingScenario === null && (
                                <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Selecteer een scenario of maak een nieuw aan</div>
                            )}
                        </div>

                        {/* ── Map panel ── */}
                        {showMapPanel ? (
                            <div className="flex-1 min-w-0 flex flex-col bg-gray-50">

                                {/* Map toolbar */}
                                <div className="shrink-0 px-4 py-2 border-b border-gray-200 bg-white flex items-center gap-3 flex-wrap">
                                    <span className="text-xs uppercase tracking-widest text-gray-400 mr-1">Kaart</span>

                                    {drawMode === 'none' && !pendingDraft && (
                                        <>
                                            <button onClick={() => { setDrawMode('marker'); setDrawPoints([]); }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 transition">
                                                📍 Markering plaatsen
                                            </button>
                                            <button onClick={() => { setDrawMode('polygon'); setDrawPoints([]); }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 transition">
                                                ⬡ Zone tekenen
                                            </button>
                                        </>
                                    )}

                                    {drawMode === 'polygon' && (
                                        <>
                                            <span className="text-blue-600 text-xs">
                                                {drawingFloodForPhaseId
                                                    ? `🌊 Overstromingszone voor "${phases.find(p => p.id === drawingFloodForPhaseId)?.name}" — klik punten op de kaart (${drawPoints.length} punt${drawPoints.length !== 1 ? 'en' : ''})`
                                                    : `Klik op de kaart om punten te plaatsen (${drawPoints.length} punt${drawPoints.length !== 1 ? 'en' : ''})`
                                                }
                                            </span>
                                            <button onClick={handleFinishPolygon} disabled={drawPoints.length < 3}
                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-lg text-xs font-semibold transition">
                                                ✓ Voltooien
                                            </button>
                                            <button onClick={handleCancelDraw} className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-600 rounded-lg text-xs transition">
                                                Annuleer
                                            </button>
                                        </>
                                    )}

                                    {drawMode === 'marker' && (
                                        <>
                                            <span className="text-blue-600 text-xs">Klik op de kaart om een markering te plaatsen</span>
                                            <button onClick={handleCancelDraw} className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-600 rounded-lg text-xs transition">
                                                Annuleer
                                            </button>
                                        </>
                                    )}

                                    <div className="ml-auto flex items-center gap-2 text-xs text-gray-400 font-mono">
                                        {locationSaved && <span className="text-green-600 mr-1">✓ Locatie opgeslagen</span>}
                                        {previewPhaseIndex >= 0 && <span className="text-blue-600">Preview: {phases[previewPhaseIndex]?.name}</span>}
                                        <span>Lat {incidentLat.toFixed(4)}</span>
                                        <span>Lng {incidentLng.toFixed(4)}</span>
                                        {locationDirty && (
                                            <button onClick={saveLocation} disabled={savingLocation}
                                                className="ml-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 text-white rounded-lg font-semibold transition">
                                                {savingLocation ? '...' : 'Opslaan'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Map */}
                                <div className="flex-1 min-h-0 p-3">
                                    <EditorMap
                                        key={selectedScenario?.id}
                                        lat={incidentLat}
                                        lng={incidentLng}
                                        onLocationChange={handleLocationChange}
                                        previewPhase={previewPhaseMerged}
                                        customOverlays={customOverlays}
                                        drawMode={drawMode}
                                        drawPoints={drawPoints}
                                        onAddDrawPoint={handleAddDrawPoint}
                                        onMarkerPlaced={handleMarkerPlaced}
                                    />
                                </div>

                                {/* Draft form */}
                                {pendingDraft && (
                                    <div className="shrink-0 border-t border-gray-200 p-4 bg-white space-y-3">
                                        <p className="text-xs font-semibold text-gray-700">
                                            Nieuwe {pendingDraft.kind === 'polygon' ? 'zone' : 'markering'} — geef een naam{pendingDraft.kind === 'marker' ? ', icoon' : ''} en kleur
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <input
                                                value={draftLabel}
                                                onChange={e => setDraftLabel(e.target.value)}
                                                placeholder="Label (bijv. Evacuatieroute A)"
                                                autoFocus
                                                className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                            />
                                            <div className="flex gap-1 shrink-0">
                                                {DRAW_COLORS.map(c => (
                                                    <button key={c} onClick={() => setDraftColor(c)}
                                                        style={{ backgroundColor: c }}
                                                        className={`w-6 h-6 rounded-full border-2 transition ${draftColor === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'}`}
                                                    />
                                                ))}
                                            </div>
                                            <button onClick={saveCustomOverlay} disabled={!draftLabel.trim() || savingOverlays}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-lg text-sm transition shrink-0">
                                                {savingOverlays ? 'Opslaan...' : 'Toevoegen'}
                                            </button>
                                            <button onClick={() => { setPendingDraft(null); setDraftIcon(null); }} className="text-gray-400 hover:text-gray-900 text-sm transition">✕</button>
                                        </div>
                                        {pendingDraft.kind === 'marker' && (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1.5">Icoon (optioneel)</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {MARKER_ICONS.map(emoji => (
                                                        <button key={emoji} onClick={() => setDraftIcon(draftIcon === emoji ? null : emoji)}
                                                            className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition border ${draftIcon === emoji ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400 bg-white'}`}>
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Custom overlays list */}
                                {customOverlays.length > 0 && (
                                    <div className="shrink-0 border-t border-gray-200 px-4 py-2 max-h-36 overflow-y-auto bg-white">
                                        <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Aangepaste lagen ({customOverlays.length})</p>
                                        <div className="grid grid-cols-2 gap-1">
                                            {customOverlays.map(overlay => (
                                                <div key={overlay.id} className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: overlay.color }} />
                                                    <span className="flex-1 truncate text-gray-700">{overlay.label}</span>
                                                    <span className="text-gray-400 shrink-0">{overlay.kind === 'polygon' ? '⬡' : (overlay.icon ?? '📍')}</span>
                                                    <button onClick={() => deleteCustomOverlay(overlay.id)} className="text-gray-400 hover:text-red-500 transition shrink-0">✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Placeholder when no scenario selected */
                            !selectedScenario && editingScenario === null && (
                                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                                    Selecteer een scenario om de kaart te bewerken
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* ── ROLES TAB ── */}
            {tab === 'roles' && (
                <div className="flex h-[calc(100vh-61px)]">
                    <div className="w-56 shrink-0 border-r border-gray-200 flex flex-col bg-white">
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <span className="text-xs uppercase tracking-widest text-gray-500">Rollen</span>
                            <button onClick={() => { setEditingRole('new'); setRoleForm({ name: '', shortName: '', description: '', briefing: '' }); setSelectedRole(null); }}
                                className="text-blue-600 hover:text-blue-700 text-xs font-medium transition">+ Nieuw</button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {roles.map(r => (
                                <button key={r.id} onClick={() => { setSelectedRole(r); setEditingRole(null); cancelAbilityEdit(); }}
                                    className={`w-full text-left px-4 py-3 border-b border-gray-100 transition ${selectedRole?.id === r.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                                    <p className="font-mono text-xs text-gray-400">{r.shortName}</p>
                                    <p className="font-medium text-sm truncate">{r.name}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50">
                        {editingRole !== null && (
                            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 max-w-2xl shadow-sm">
                                <h2 className="font-semibold text-lg text-gray-900">{editingRole === 'new' ? 'Nieuwe rol' : 'Rol bewerken'}</h2>
                                <div className="grid grid-cols-3 gap-3">
                                    <input value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="Naam (bijv. Leider CoPI)"
                                        className="col-span-2 bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                    <input value={roleForm.shortName} onChange={e => setRoleForm({ ...roleForm, shortName: e.target.value.toUpperCase() })} placeholder="Afkorting"
                                        className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 font-mono placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <textarea value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} placeholder="Korte beschrijving van de rol..." rows={2}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none" />
                                <div>
                                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">Roltoelichting <span className="text-gray-400 font-normal">(uitgebreide instructies voor de speler)</span></label>
                                    <textarea value={roleForm.briefing} onChange={e => setRoleForm({ ...roleForm, briefing: e.target.value })} placeholder={"Beschrijf de verantwoordelijkheden, bevoegdheden en context van deze rol.\n\nDit zien spelers in hun rolkaart tijdens het scenario."} rows={7}
                                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none text-sm" />
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={saveRole} disabled={!roleForm.name.trim() || !roleForm.shortName.trim() || savingRole}
                                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-xl px-5 py-2 text-sm transition">
                                        {savingRole ? 'Opslaan...' : 'Opslaan'}
                                    </button>
                                    <button onClick={cancelRoleEdit} className="text-gray-500 hover:text-gray-900 text-sm transition px-3">Annuleer</button>
                                    {editingRole !== 'new' && (
                                        <button onClick={() => deleteRole(editingRole)} className="ml-auto text-red-500 hover:text-red-600 text-sm transition">Rol verwijderen</button>
                                    )}
                                </div>
                            </div>
                        )}

                        {selectedRole && editingRole !== selectedRole.id && (
                            <>
                                <div className="max-w-2xl space-y-2">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{selectedRole.shortName}</span>
                                                <h2 className="text-xl font-bold text-gray-900">{selectedRole.name}</h2>
                                            </div>
                                            {selectedRole.description && <p className="text-gray-500 text-sm">{selectedRole.description}</p>}
                                        </div>
                                        <button onClick={() => startEditRole(selectedRole)} className="text-gray-500 hover:text-gray-900 text-sm transition shrink-0">Bewerken</button>
                                    </div>
                                    {selectedRole.briefing ? (
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-3">
                                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">Roltoelichting</p>
                                            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{selectedRole.briefing}</p>
                                        </div>
                                    ) : (
                                        <div className="border border-dashed border-gray-200 rounded-xl p-4 mt-3 flex items-center justify-between gap-4">
                                            <p className="text-gray-400 text-sm">Geen roltoelichting — spelers zien "geen informatie" in hun rolkaart.</p>
                                            <button onClick={() => startEditRole(selectedRole)} className="text-blue-600 hover:text-blue-700 text-xs font-semibold transition shrink-0">+ Toevoegen</button>
                                        </div>
                                    )}
                                </div>

                                <div className="max-w-2xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-500 text-sm uppercase tracking-widest">Vaardigheden ({selectedRole.abilities.length})</h3>
                                        <button onClick={() => { cancelAbilityEdit(); setEditingAbility({ id: 'new', name: '', description: null }); setAbilityForm({ name: '', description: '' }); }}
                                            className="text-blue-600 hover:text-blue-700 text-xs font-medium transition">+ Vaardigheid</button>
                                    </div>
                                    {editingAbility && (
                                        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
                                            <p className="text-sm font-semibold text-gray-700">{editingAbility.id === 'new' ? 'Nieuwe vaardigheid' : 'Vaardigheid bewerken'}</p>
                                            <input value={abilityForm.name} onChange={e => setAbilityForm({ ...abilityForm, name: e.target.value })} placeholder="Naam van de actie"
                                                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                            <input value={abilityForm.description} onChange={e => setAbilityForm({ ...abilityForm, description: e.target.value })} placeholder="Beschrijving (optioneel)"
                                                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                            <div className="flex gap-3">
                                                <button onClick={saveAbility} disabled={!abilityForm.name.trim() || savingAbility}
                                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-lg px-4 py-1.5 text-sm transition">
                                                    {savingAbility ? 'Opslaan...' : 'Opslaan'}
                                                </button>
                                                <button onClick={cancelAbilityEdit} className="text-gray-500 hover:text-gray-900 text-sm transition">Annuleer</button>
                                            </div>
                                        </div>
                                    )}
                                    {selectedRole.abilities.length === 0 && !editingAbility && (
                                        <p className="text-gray-400 text-sm py-4 text-center border border-dashed border-gray-200 rounded-xl">Geen vaardigheden.</p>
                                    )}
                                    <div className="space-y-1.5">
                                        {selectedRole.abilities.map((a, idx) => (
                                            <div key={a.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                                                <span className="text-gray-400 text-xs font-mono w-5">{idx + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-gray-900 text-sm font-medium">{a.name}</p>
                                                    {a.description && <p className="text-gray-400 text-xs mt-0.5">{a.description}</p>}
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <button onClick={() => startEditAbility(a)} className="text-gray-400 hover:text-gray-900 text-xs transition">Bewerken</button>
                                                    <button onClick={() => deleteAbility(a.id)} className="text-red-500 hover:text-red-600 text-xs transition">✕</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {!selectedRole && editingRole === null && (
                            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Selecteer een rol of maak een nieuwe aan</div>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}
