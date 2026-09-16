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
const COULEUR_BADGE_TYPE = { cours: 'bg-light text-dark', recreation: 'bg-warning text-dark', pause_midi: 'bg-secondary' };

const formInitial = { libelle: '', jour: '', ordre: 0, heure_debut: '', heure_fin: '', type: 'cours' };
const blocInitial = { type: 'cours', nbPlages: 2, dureeMinutes: 55 };

/** Additionne des minutes à une heure "HH:MM" (mêmes règles que le backend). */
const ajouterMinutes = (hhmm, minutes) => {
    const [h, m] = hhmm.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}`;
};

/** Calcule la séquence de plages résultant d'une liste de blocs (aperçu, même logique que PlageHoraireController::construire). */
const calculerSequence = (heureDebut, blocs) => {
    if (!heureDebut || blocs.length === 0) return [];
    let curseur = heureDebut;
    let compteurM = 0;
    let compteurS = 0;
    let compteurRecre = 0;
    let apresMidi = false;
    const out = [];
    blocs.forEach((b) => {
        const duree = Number(b.dureeMinutes) || 0;
        if (b.type === 'cours') {
            const nb = Number(b.nbPlages) || 0;
            for (let i = 0; i < nb; i++) {
                const fin = ajouterMinutes(curseur, duree);
                const libelle = apresMidi ? `S${++compteurS}` : `M${++compteurM}`;
                out.push({ libelle, debut: curseur, fin, type: 'cours' });
                curseur = fin;
            }

            return;
        }
        const fin = ajouterMinutes(curseur, duree);
        let libelle;
        if (b.type === 'pause_midi') {
            libelle = 'Pause méridienne';
            apresMidi = true;
        } else {
            compteurRecre++;
            libelle = compteurRecre > 1 ? `Récréation ${compteurRecre}` : 'Récréation';
        }
        out.push({ libelle, debut: curseur, fin, type: b.type });
        curseur = fin;
    });

    return out;
};

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
    const [viderJour, setViderJour] = useState('');
    const [videEnCours, setVideEnCours] = useState(false);

    // Construction guidée (séquence de blocs)
    const [construireHeureDebut, setConstruireHeureDebut] = useState('07:30');
    const [construireJours, setConstruireJours] = useState([]);
    const [construireRemplacer, setConstruireRemplacer] = useState(false);
    const [blocs, setBlocs] = useState([{ ...blocInitial, nbPlages: 4 }]);
    const [construireEnCours, setConstruireEnCours] = useState(false);
    const apercu = useMemo(() => calculerSequence(construireHeureDebut, blocs), [construireHeureDebut, blocs]);

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

    const nbPlagesJour = (jour) => plages
        .filter((p) => p.jour === jour || p.jour === null).length;

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

    const vider = async () => {
        const cible = viderJour ? `la journée de ${viderJour}` : 'TOUTE la grille horaire (tous les jours)';
        if (!await confirmer(`Vider ${cible} ? Les plages déjà utilisées par un créneau d'emploi du temps existant seront conservées.`)) return;
        setVideEnCours(true);
        api.delete('/plages-horaires/vider', { data: viderJour ? { jour: viderJour } : {} })
            .then((r) => {
                const { supprimees, protegees } = r.data;
                if (protegees.length > 0) {
                    toast.error(`${supprimees} plage(s) supprimée(s). ${protegees.length} conservée(s), déjà utilisée(s) par un créneau : ${protegees.join(', ')}.`);
                } else {
                    toast.success(`${supprimees} plage(s) supprimée(s).`);
                }
                charger();
            })
            .catch(() => toast.error('Erreur lors du vidage.'))
            .finally(() => setVideEnCours(false));
    };

    const ajouterBloc = () => setBlocs((b) => [...b, { ...blocInitial }]);
    const retirerBloc = (i) => setBlocs((b) => b.filter((_, idx) => idx !== i));
    const modifierBloc = (i, patch) => setBlocs((b) => b.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
    const deplacerBloc = (i, delta) => setBlocs((b) => {
        const j = i + delta;
        if (j < 0 || j >= b.length) return b;
        const copie = [...b];
        [copie[i], copie[j]] = [copie[j], copie[i]];

        return copie;
    });
    const toggleConstruireJour = (j) => setConstruireJours((js) => (js.includes(j) ? js.filter((x) => x !== j) : [...js, j]));

    const construire = async () => {
        if (construireJours.length === 0) { toast.error('Choisissez au moins un jour.'); return; }
        if (blocs.length === 0) { toast.error('Ajoutez au moins un bloc.'); return; }
        const cible = construireJours.length === JOURS.length ? 'tous les jours' : construireJours.join(', ');
        const avertissement = construireRemplacer
            ? ' Les plages déjà présentes sur ce(s) jour(s) seront supprimées avant.'
            : ' Les plages déjà présentes qui chevaucheraient seront conservées (pas de doublon créé).';
        if (!await confirmer(`Construire la journée pour : ${cible} ?${avertissement}`)) return;

        setConstruireEnCours(true);
        api.post('/plages-horaires/construire', {
            jours: construireJours,
            heure_debut: construireHeureDebut,
            remplacer: construireRemplacer,
            blocs: blocs.map((b) => ({
                type: b.type,
                duree_minutes: Number(b.dureeMinutes) || 0,
                ...(b.type === 'cours' ? { nb_plages: Number(b.nbPlages) || 0 } : {}),
            })),
        })
            .then((r) => { toast.success(r.data.message); charger(); })
            .catch((err) => toast.error(err.response?.data?.message || 'Construction impossible.'))
            .finally(() => setConstruireEnCours(false));
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
                        {/* Construction guidée */}
                        <div className="border rounded p-3 bg-light mt-3">
                            <h6>Construire une journée (ou plusieurs) d&apos;un coup</h6>
                            <p className="text-muted small mb-2">
                                Décrivez la journée comme une suite de blocs — les heures sont calculées automatiquement.
                            </p>
                            <div className="row g-2 mb-2">
                                <div className="col-md-2">
                                    <label className="form-label small">Heure de début</label>
                                    <input type="time" className="form-control form-control-sm" value={construireHeureDebut}
                                        onChange={(e) => setConstruireHeureDebut(e.target.value)} />
                                </div>
                                <div className="col-md-7">
                                    <label className="form-label small d-block">Jours cibles</label>
                                    {JOURS.map((j) => (
                                        <div className="form-check form-check-inline" key={j}>
                                            <input className="form-check-input" type="checkbox" id={`cons-${j}`}
                                                checked={construireJours.includes(j)} onChange={() => toggleConstruireJour(j)} />
                                            <label className="form-check-label text-capitalize small" htmlFor={`cons-${j}`}>{j}</label>
                                        </div>
                                    ))}
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label small d-block">&nbsp;</label>
                                    <div className="form-check">
                                        <input className="form-check-input" type="checkbox" id="cons-remplacer"
                                            checked={construireRemplacer} onChange={(e) => setConstruireRemplacer(e.target.checked)} />
                                        <label className="form-check-label small" htmlFor="cons-remplacer">
                                            Vider le(s) jour(s) avant de construire
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-2">
                                <label className="form-label small d-block">Blocs, dans l&apos;ordre</label>
                                {blocs.map((b, i) => (
                                    <div className="d-flex align-items-end gap-2 mb-1" key={i}>
                                        <div style={{ width: 150 }}>
                                            <select className="form-select form-select-sm" value={b.type}
                                                onChange={(e) => modifierBloc(i, { type: e.target.value })}>
                                                {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                                            </select>
                                        </div>
                                        {b.type === 'cours' && (
                                            <div style={{ width: 130 }}>
                                                <div className="input-group input-group-sm">
                                                    <input type="number" min="1" max="20" className="form-control" style={{ minWidth: 50 }}
                                                        value={b.nbPlages} onChange={(e) => modifierBloc(i, { nbPlages: e.target.value })} />
                                                    <span className="input-group-text">plage(s)</span>
                                                </div>
                                            </div>
                                        )}
                                        <div style={{ width: 150 }}>
                                            <div className="input-group input-group-sm">
                                                <input type="number" min="1" max="300" className="form-control" style={{ minWidth: 50 }}
                                                    value={b.dureeMinutes} onChange={(e) => modifierBloc(i, { dureeMinutes: e.target.value })} />
                                                <span className="input-group-text">min{b.type === 'cours' ? '/plage' : ''}</span>
                                            </div>
                                        </div>
                                        <button type="button" className="btn btn-outline-secondary btn-sm" disabled={i === 0}
                                            onClick={() => deplacerBloc(i, -1)} title="Monter">↑</button>
                                        <button type="button" className="btn btn-outline-secondary btn-sm" disabled={i === blocs.length - 1}
                                            onClick={() => deplacerBloc(i, 1)} title="Descendre">↓</button>
                                        <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => retirerBloc(i)} title="Retirer">✕</button>
                                    </div>
                                ))}
                                <button type="button" className="btn btn-outline-primary btn-sm mt-1" onClick={ajouterBloc}>
                                    + Ajouter un bloc
                                </button>
                            </div>

                            {apercu.length > 0 && (
                                <div className="mb-2">
                                    <label className="form-label small d-block">
                                        Aperçu calculé —{' '}
                                        <span className="text-muted fw-normal">
                                            {apercu.length} plage(s) au total, dont {apercu.filter((p) => p.type === 'cours').length} de cours
                                        </span>
                                    </label>
                                    <div className="d-flex flex-wrap gap-1">
                                        {apercu.map((p, i) => (
                                            <span key={i} className={`badge border ${COULEUR_BADGE_TYPE[p.type] || 'bg-light text-dark'}`}>
                                                {p.libelle} · {p.debut}–{p.fin}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button type="button" className="btn btn-primary btn-sm" onClick={construire}
                                disabled={construireEnCours || construireJours.length === 0 || blocs.length === 0}>
                                {construireEnCours && <span className="spinner-border spinner-border-sm me-1" />}
                                Construire pour les jours cochés
                            </button>
                        </div>

                        <div className="row g-3 mt-1">
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

                            {/* Vidage */}
                            <div className="col-lg-5">
                                <div className="border rounded p-3">
                                    <h6>Vider</h6>
                                    <div className="mb-2">
                                        <label className="form-label small">Portée</label>
                                        <select className="form-select form-select-sm" value={viderJour}
                                            onChange={(e) => setViderJour(e.target.value)}>
                                            <option value="">Toute la grille (tous les jours)</option>
                                            {JOURS.map((j) => <option key={j} value={j} className="text-capitalize">{j} uniquement</option>)}
                                        </select>
                                    </div>
                                    <p className="text-muted small mb-2">
                                        Les plages déjà utilisées par un créneau existant sont conservées et signalées.
                                    </p>
                                    <button type="button" className="btn btn-outline-danger btn-sm"
                                        onClick={vider} disabled={videEnCours}>
                                        {videEnCours && <span className="spinner-border spinner-border-sm me-1" />}
                                        Vider {viderJour ? `le ${viderJour}` : 'toute la grille'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Grille récapitulative */}
                        <div className="table-responsive mt-3">
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
                                        <td className="fw-bold">Nb. de plages</td>
                                        {JOURS.map((j) => <td key={j}>{nbPlagesJour(j)}</td>)}
                                    </tr>
                                    <tr className="table-light">
                                        <td className="fw-bold">Heures de cours</td>
                                        {JOURS.map((j) => <td key={j}>{totalHeuresJour(j).toFixed(1)} h</td>)}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
};

export default GrilleHoraire;
