import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const TYPES = [
    { v: 'cours',      l: 'Cours' },
    { v: 'recreation', l: 'Récréation' },
    { v: 'pause_midi', l: 'Pause méridienne' },
];
const COULEUR_TYPE = { cours: '', recreation: 'table-warning', pause_midi: 'table-secondary' };

const formInitial = { libelle: '', jour: '', ordre: 0, heure_debut: '', heure_fin: '', type: 'cours' };

/**
 * Grille horaire de l'établissement (chantier EDT — Lot 0.2).
 */
const GrilleHoraire = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();

    const [plages, setPlages] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [form, setForm] = useState(formInitial);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [dupSource, setDupSource] = useState('');
    const [dupCibles, setDupCibles] = useState([]);

    const charger = () => {
        setChargement(true);
        api.get('/plages-horaires')
            .then((r) => setPlages(r.data))
            .catch(() => toast.error('Impossible de charger la grille horaire.'))
            .finally(() => setChargement(false));
    };

    useEffect(charger, []);

    const lignes = useMemo(() => {
        // Une ligne par (heure_debut, heure_fin) rencontrée, triée
        const cles = [...new Set(plages.map((p) => `${p.heure_debut.slice(0, 5)}|${p.heure_fin.slice(0, 5)}`))];
        cles.sort();
        return cles.map((c) => {
            const [debut, fin] = c.split('|');
            return { debut, fin };
        });
    }, [plages]);

    const plagePour = (jour, debut, fin) => plages.find(
        (p) => (p.jour === jour || p.jour === null)
            && p.heure_debut.slice(0, 5) === debut
            && p.heure_fin.slice(0, 5) === fin,
    );

    const totalHeuresJour = (jour) => plages
        .filter((p) => (p.jour === jour || p.jour === null) && p.type === 'cours')
        .reduce((s, p) => s + (new Date(`1970-01-01T${p.heure_fin}`) - new Date(`1970-01-01T${p.heure_debut}`)) / 3600000, 0);

    const soumettre = (e) => {
        e.preventDefault();
        setSaving(true);
        const payload = { ...form, jour: form.jour || null, ordre: Number(form.ordre) || 0 };
        const req = editId
            ? api.put(`/plages-horaires/${editId}`, payload)
            : api.post('/plages-horaires', payload);
        req.then(() => {
            toast.success(editId ? 'Plage modifiée.' : 'Plage ajoutée.');
            setForm(formInitial);
            setEditId(null);
            charger();
        })
            .catch((err) => toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement."))
            .finally(() => setSaving(false));
    };

    const editer = (p) => {
        setEditId(p.id);
        setForm({
            libelle: p.libelle, jour: p.jour || '', ordre: p.ordre,
            heure_debut: p.heure_debut.slice(0, 5), heure_fin: p.heure_fin.slice(0, 5), type: p.type,
        });
    };

    const supprimer = async (p) => {
        if (!await confirmer(`Supprimer la plage « ${p.libelle} » ?`)) return;
        api.delete(`/plages-horaires/${p.id}`)
            .then(() => { toast.success('Plage supprimée.'); charger(); })
            .catch((err) => toast.error(err.response?.data?.message || 'Suppression impossible.'));
    };

    const dupliquer = () => {
        if (!dupSource || dupCibles.length === 0) return;
        api.post('/plages-horaires/dupliquer-jour', { source: dupSource, cibles: dupCibles })
            .then((r) => { toast.success(r.data.message); setDupSource(''); setDupCibles([]); charger(); })
            .catch((err) => toast.error(err.response?.data?.message || 'Recopie impossible.'));
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Grille horaire de l&apos;établissement</h4>
                </div>
                <p className="text-muted small">
                    Définissez les plages de la semaine type (cours, récréations, pause méridienne).
                    Une plage sans jour s&apos;applique à tous les jours ouvrés. C&apos;est la base du montage des emplois du temps.
                </p>

                {chargement && <div className="text-center py-4"><div className="spinner-border text-primary" /></div>}

                {!chargement && (
                    <>
                        <div className="table-responsive">
                            <table className="table table-bordered text-center align-middle" style={{ fontSize: '0.85rem' }}>
                                <thead className="table-dark">
                                    <tr>
                                        <th style={{ width: 110 }}>Horaire</th>
                                        {JOURS.map((j) => <th key={j} className="text-capitalize">{j}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {lignes.length === 0 && (
                                        <tr><td colSpan={7} className="text-muted py-3">Aucune plage définie.</td></tr>
                                    )}
                                    {lignes.map(({ debut, fin }) => (
                                        <tr key={`${debut}-${fin}`}>
                                            <td className="fw-bold bg-light">{debut}<br /><small>{fin}</small></td>
                                            {JOURS.map((jour) => {
                                                const p = plagePour(jour, debut, fin);
                                                if (!p) return <td key={jour} />;
                                                return (
                                                    <td key={jour} className={COULEUR_TYPE[p.type]}>
                                                        <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={() => editer(p)}>
                                                            {p.libelle}
                                                        </button>
                                                        {p.jour === null && <span className="badge bg-info ms-1">tous</span>}
                                                        <button type="button" className="btn btn-sm text-danger p-0 ms-1" title="Supprimer" onClick={() => supprimer(p)}>✕</button>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                    <tr className="table-light">
                                        <td className="fw-bold">Heures de cours</td>
                                        {JOURS.map((j) => <td key={j}>{totalHeuresJour(j).toFixed(1)} h</td>)}
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="row g-3">
                            {/* Formulaire */}
                            <div className="col-lg-7">
                                <div className="border rounded p-3 bg-light">
                                    <h6>{editId ? 'Modifier la plage' : 'Ajouter une plage'}</h6>
                                    <form onSubmit={soumettre} className="row g-2 align-items-end">
                                        <div className="col-md-4">
                                            <label className="form-label small">Libellé *</label>
                                            <input className="form-control form-control-sm" value={form.libelle}
                                                onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} required />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label small">Jour</label>
                                            <select className="form-select form-select-sm" value={form.jour}
                                                onChange={(e) => setForm((f) => ({ ...f, jour: e.target.value }))}>
                                                <option value="">Tous les jours</option>
                                                {JOURS.map((j) => <option key={j} value={j} className="text-capitalize">{j}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-2">
                                            <label className="form-label small">Ordre</label>
                                            <input type="number" min="0" className="form-control form-control-sm" value={form.ordre}
                                                onChange={(e) => setForm((f) => ({ ...f, ordre: e.target.value }))} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label small">Type</label>
                                            <select className="form-select form-select-sm" value={form.type}
                                                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                                                {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label small">Début *</label>
                                            <input type="time" className="form-control form-control-sm" value={form.heure_debut}
                                                onChange={(e) => setForm((f) => ({ ...f, heure_debut: e.target.value }))} required />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label small">Fin *</label>
                                            <input type="time" className="form-control form-control-sm" value={form.heure_fin}
                                                onChange={(e) => setForm((f) => ({ ...f, heure_fin: e.target.value }))} required />
                                        </div>
                                        <div className="col-md-6 d-flex gap-2">
                                            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                                                {saving && <span className="spinner-border spinner-border-sm me-1" />}
                                                {editId ? 'Modifier' : 'Ajouter'}
                                            </button>
                                            {editId && (
                                                <button type="button" className="btn btn-secondary btn-sm"
                                                    onClick={() => { setEditId(null); setForm(formInitial); }}>Annuler</button>
                                            )}
                                        </div>
                                    </form>
                                </div>
                            </div>

                            {/* Duplication */}
                            <div className="col-lg-5">
                                <div className="border rounded p-3">
                                    <h6>Recopier un jour</h6>
                                    <div className="mb-2">
                                        <label className="form-label small">Copier depuis</label>
                                        <select className="form-select form-select-sm" value={dupSource}
                                            onChange={(e) => setDupSource(e.target.value)}>
                                            <option value="">—</option>
                                            {JOURS.map((j) => <option key={j} value={j} className="text-capitalize">{j}</option>)}
                                        </select>
                                    </div>
                                    <div className="mb-2">
                                        <label className="form-label small">Vers</label>
                                        <div className="d-flex flex-wrap gap-2">
                                            {JOURS.filter((j) => j !== dupSource).map((j) => (
                                                <div className="form-check" key={j}>
                                                    <input className="form-check-input" type="checkbox" id={`dup-${j}`}
                                                        checked={dupCibles.includes(j)}
                                                        onChange={(e) => setDupCibles((c) => e.target.checked ? [...c, j] : c.filter((x) => x !== j))} />
                                                    <label className="form-check-label text-capitalize small" htmlFor={`dup-${j}`}>{j}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <button type="button" className="btn btn-outline-primary btn-sm"
                                        onClick={dupliquer} disabled={!dupSource || dupCibles.length === 0}>
                                        Recopier
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
};

export default GrilleHoraire;
