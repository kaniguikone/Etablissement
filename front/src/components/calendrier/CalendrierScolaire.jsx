import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

// ── Configuration des types d'événements ─────────────────────────────────────
const TYPES = [
    { value: 'conge',   label: 'Congé / Vacances', couleur: '#e67e22', icon: 'fas fa-umbrella-beach' },
    { value: 'examen',  label: 'Examen / Devoir',  couleur: '#e74c3c', icon: 'fas fa-pen-nib' },
    { value: 'reunion', label: 'Réunion',           couleur: '#3498db', icon: 'fas fa-users' },
    { value: 'sortie',  label: 'Sortie scolaire',   couleur: '#27ae60', icon: 'fas fa-bus' },
    { value: 'autre',   label: 'Autre',             couleur: '#8e44ad', icon: 'fas fa-calendar-day' },
];

const TYPE_MAP = Object.fromEntries(TYPES.map(t => [t.value, t]));

const JOURS    = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS_FR  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

// ── Formulaire d'événement (modal) ────────────────────────────────────────────
const VIDE = { titre: '', description: '', date_debut: '', date_fin: '', type: 'autre', couleur: '', classe_id: '' };

const ModalEvenement = ({ evenement, classes, onSauvegarder, onFermer }) => {
    const [form, setForm] = useState({ ...VIDE, ...evenement });
    const [envoi, setEnvoi] = useState(false);
    const { toast } = useToast();

    const changer = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const typeInfo = TYPE_MAP[form.type];

    const soumettre = async (e) => {
        e.preventDefault();
        if (!form.titre.trim() || !form.date_debut || !form.type) {
            toast.error('Titre, date de début et type sont requis.');
            return;
        }
        setEnvoi(true);
        try {
            const payload = {
                titre:       form.titre,
                description: form.description || null,
                date_debut:  form.date_debut,
                date_fin:    form.date_fin || null,
                type:        form.type,
                couleur:     form.couleur || typeInfo?.couleur || null,
                classe_id:   form.classe_id || null,
            };
            if (form.id) {
                const r = await api.put(`/calendrier/${form.id}`, payload);
                onSauvegarder(r.data, false);
            } else {
                const r = await api.post('/calendrier', payload);
                onSauvegarder(r.data, true);
            }
        } catch {
            toast.error('Erreur lors de l\'enregistrement.');
        } finally {
            setEnvoi(false);
        }
    };

    return (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <form onSubmit={soumettre}>
                        <div className="modal-header">
                            <h5 className="modal-title">
                                {form.id ? 'Modifier l\'événement' : 'Nouvel événement'}
                            </h5>
                            <button type="button" className="btn-close" onClick={onFermer} />
                        </div>
                        <div className="modal-body">
                            <div className="row g-3">
                                <div className="col-12">
                                    <label className="form-label fw-semibold">Titre *</label>
                                    <input
                                        className="form-control"
                                        value={form.titre}
                                        onChange={e => changer('titre', e.target.value)}
                                        placeholder="Titre de l'événement"
                                        required
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Type *</label>
                                    <select
                                        className="form-select"
                                        value={form.type}
                                        onChange={e => changer('type', e.target.value)}
                                    >
                                        {TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Couleur</label>
                                    <div className="d-flex gap-2 align-items-center">
                                        <input
                                            type="color"
                                            className="form-control form-control-color"
                                            style={{ width: 50 }}
                                            value={form.couleur || typeInfo?.couleur || '#8e44ad'}
                                            onChange={e => changer('couleur', e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-secondary"
                                            onClick={() => changer('couleur', typeInfo?.couleur || '')}
                                        >
                                            Défaut
                                        </button>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Date de début *</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={form.date_debut}
                                        onChange={e => changer('date_debut', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Date de fin</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={form.date_fin}
                                        min={form.date_debut}
                                        onChange={e => changer('date_fin', e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold">Classe concernée</label>
                                    <select
                                        className="form-select"
                                        value={form.classe_id}
                                        onChange={e => changer('classe_id', e.target.value)}
                                    >
                                        <option value="">Tout l'établissement</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                                    </select>
                                </div>
                                <div className="col-12">
                                    <label className="form-label fw-semibold">Description</label>
                                    <textarea
                                        className="form-control"
                                        rows={3}
                                        value={form.description}
                                        onChange={e => changer('description', e.target.value)}
                                        placeholder="Description optionnelle..."
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onFermer}>Annuler</button>
                            <button type="submit" className="btn btn-primary" disabled={envoi}>
                                {envoi ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                                {form.id ? 'Enregistrer' : 'Créer'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// ── Vue calendrier mensuel ────────────────────────────────────────────────────
const VueCalendrier = ({ annee, mois, evenements, onAjouter, onModifier }) => {
    const premierJour  = new Date(annee, mois, 1);
    const dernierJour  = new Date(annee, mois + 1, 0);
    const debutSemaine = (premierJour.getDay() + 6) % 7; // 0 = lundi
    const nbJours      = dernierJour.getDate();

    // Construire la grille
    const cellules = [];
    for (let i = 0; i < debutSemaine; i++) cellules.push(null);
    for (let d = 1; d <= nbJours; d++) cellules.push(d);
    while (cellules.length % 7 !== 0) cellules.push(null);

    const semaines = [];
    for (let i = 0; i < cellules.length; i += 7) {
        semaines.push(cellules.slice(i, i + 7));
    }

    const aujourdhui = new Date();

    const evenementsDuJour = (jour) => {
        if (!jour) return [];
        const date = `${annee}-${String(mois + 1).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
        return evenements.filter(ev => {
            return ev.date_debut <= date && (ev.date_fin == null || ev.date_fin >= date);
        });
    };

    return (
        <table className="table table-bordered mb-0" style={{ tableLayout: 'fixed' }}>
            <thead>
                <tr>
                    {JOURS.map(j => (
                        <th key={j} className="text-center text-muted py-1" style={{ fontSize: 11, fontWeight: 600 }}>{j}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {semaines.map((sem, si) => (
                    <tr key={si}>
                        {sem.map((jour, ji) => {
                            const evs = evenementsDuJour(jour);
                            const estAujourdHui = jour &&
                                aujourdhui.getFullYear() === annee &&
                                aujourdhui.getMonth() === mois &&
                                aujourdhui.getDate() === jour;

                            return (
                                <td
                                    key={ji}
                                    style={{ verticalAlign: 'top', minHeight: 80, cursor: jour ? 'pointer' : 'default', padding: '4px 6px' }}
                                    onClick={() => jour && onAjouter(annee, mois + 1, jour)}
                                    className={!jour ? 'bg-light' : ''}
                                >
                                    {jour && (
                                        <>
                                            <div style={{
                                                fontWeight: estAujourdHui ? 700 : 400,
                                                color: estAujourdHui ? 'white' : '#333',
                                                background: estAujourdHui ? '#2c3e50' : 'transparent',
                                                borderRadius: '50%',
                                                width: 24, height: 24,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 12, marginBottom: 2,
                                            }}>
                                                {jour}
                                            </div>
                                            {evs.map(ev => {
                                                const t  = TYPE_MAP[ev.type];
                                                const bg = ev.couleur || t?.couleur || '#8e44ad';
                                                return (
                                                    <div
                                                        key={ev.id}
                                                        title={ev.titre + (ev.description ? '\n' + ev.description : '')}
                                                        onClick={e => { e.stopPropagation(); onModifier(ev); }}
                                                        style={{
                                                            background: bg, color: 'white',
                                                            borderRadius: 3, padding: '1px 4px',
                                                            fontSize: 10, marginBottom: 2,
                                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        {ev.titre}
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                </td>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

// ── Composant principal ────────────────────────────────────────────────────────
const CalendrierScolaire = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();

    const now           = new Date();
    const [annee, setAnnee]   = useState(now.getFullYear());
    const [mois, setMois]     = useState(now.getMonth());
    const [evenements, setEv] = useState([]);
    const [classes, setClasses] = useState([]);
    const [modal, setModal]   = useState(null); // null | objet événement
    const [chargement, setChargement] = useState(false);

    const charger = useCallback(() => {
        setChargement(true);
        api.get(`/calendrier?annee=${annee}&mois=${mois + 1}`)
            .then(r => { setEv(r.data); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger le calendrier.'); setChargement(false); });
    }, [annee, mois]);

    useEffect(() => { charger(); }, [charger]);

    useEffect(() => {
        api.get('/classesTout').then(r => setClasses(r.data)).catch((err) => console.error('Erreur chargement:', err));
    }, []);

    const naviguer = (delta) => {
        let m = mois + delta;
        let a = annee;
        if (m < 0)  { m = 11; a--; }
        if (m > 11) { m = 0;  a++; }
        setMois(m); setAnnee(a);
    };

    const ouvrirAjout = (a, m, j) => {
        const date = `${a}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
        setModal({ date_debut: date, date_fin: '', titre: '', description: '', type: 'autre', couleur: '', classe_id: '' });
    };

    const ouvrirModif = (ev) => {
        setModal({ ...ev, date_debut: ev.date_debut?.split('T')[0] || ev.date_debut, date_fin: ev.date_fin?.split('T')[0] || ev.date_fin || '' });
    };

    const apresEnregistrement = (ev, estNouveau) => {
        if (estNouveau) {
            setEv(prev => [...prev, ev].sort((a, b) => a.date_debut.localeCompare(b.date_debut)));
            toast.success('Événement créé.');
        } else {
            setEv(prev => prev.map(e => e.id === ev.id ? ev : e));
            toast.success('Événement mis à jour.');
        }
        setModal(null);
    };

    const supprimer = async (ev) => {
        if (!await confirmer(`Supprimer « ${ev.titre} » ?`)) return;
        try {
            await api.delete(`/calendrier/${ev.id}`);
            setEv(prev => prev.filter(e => e.id !== ev.id));
            toast.success('Événement supprimé.');
            setModal(null);
        } catch {
            toast.error('Impossible de supprimer cet événement.');
        }
    };

    // Événements du mois en liste
    const evMois = evenements
        .filter(ev => {
            const d = ev.date_debut?.slice(0, 7);
            const f = ev.date_fin?.slice(0, 7) || d;
            const cur = `${annee}-${String(mois + 1).padStart(2, '0')}`;
            return d <= cur && f >= cur;
        })
        .sort((a, b) => a.date_debut.localeCompare(b.date_debut));

    const formatDate = (d) => {
        if (!d) return '';
        const [a, m, j] = d.split('-');
        return `${j}/${m}/${a}`;
    };

    return (
        <section className="content content-wrapper">
            <div className="container-fluid mb-2 border">

                {/* En-tête */}
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">
                        <i className="fas fa-calendar-alt me-2 text-primary" />
                        Calendrier scolaire
                    </h4>
                    <button className="btn btn-primary btn-sm" onClick={() => setModal({ ...VIDE })}>
                        <i className="fas fa-plus me-1" />Ajouter un événement
                    </button>
                </div>

                {/* Navigation mois */}
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => naviguer(-1)}>
                        <i className="fas fa-chevron-left" />
                    </button>
                    <h5 className="mb-0 fw-bold">
                        {MOIS_FR[mois]} {annee}
                    </h5>
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => naviguer(1)}>
                        <i className="fas fa-chevron-right" />
                    </button>
                </div>

                {/* Légende */}
                <div className="d-flex gap-3 flex-wrap mb-3">
                    {TYPES.map(t => (
                        <span key={t.value} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 12, height: 12, borderRadius: 3, background: t.couleur, display: 'inline-block' }} />
                            {t.label}
                        </span>
                    ))}
                </div>

                {/* Calendrier */}
                {chargement ? (
                    <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
                ) : (
                    <VueCalendrier
                        annee={annee}
                        mois={mois}
                        evenements={evenements}
                        onAjouter={ouvrirAjout}
                        onModifier={ouvrirModif}
                    />
                )}

                {/* Liste des événements du mois */}
                {evMois.length > 0 && (
                    <div className="mt-4">
                        <h6 className="fw-bold mb-2">
                            Événements — {MOIS_FR[mois]} {annee}
                        </h6>
                        <div className="list-group">
                            {evMois.map(ev => {
                                const t  = TYPE_MAP[ev.type];
                                const bg = ev.couleur || t?.couleur || '#8e44ad';
                                return (
                                    <div key={ev.id} className="list-group-item list-group-item-action d-flex align-items-start gap-3">
                                        <div style={{
                                            width: 4, borderRadius: 4, background: bg,
                                            alignSelf: 'stretch', flexShrink: 0,
                                        }} />
                                        <div style={{ flex: 1 }}>
                                            <div className="d-flex justify-content-between">
                                                <strong>{ev.titre}</strong>
                                                <div className="d-flex gap-1">
                                                    <button className="btn btn-sm btn-outline-primary py-0" onClick={() => ouvrirModif(ev)}>
                                                        <i className="fas fa-pen" />
                                                    </button>
                                                    <button className="btn btn-sm btn-outline-danger py-0" onClick={() => supprimer(ev)}>
                                                        <i className="fas fa-trash" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="text-muted small">
                                                <i className={`${t?.icon} me-1`} />
                                                {t?.label}
                                                {ev.classe && <span className="ms-2">· {ev.classe.nom_classe}</span>}
                                                <span className="ms-2">
                                                    {formatDate(ev.date_debut)}
                                                    {ev.date_fin && ev.date_fin !== ev.date_debut && ` → ${formatDate(ev.date_fin)}`}
                                                </span>
                                            </div>
                                            {ev.description && (
                                                <div className="text-muted small mt-1">{ev.description}</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {!chargement && evMois.length === 0 && (
                    <p className="text-muted text-center py-3 mt-3">
                        Aucun événement ce mois-ci. Cliquez sur une date pour en ajouter un.
                    </p>
                )}
            </div>

            {/* Modal */}
            {modal && (
                <ModalEvenement
                    evenement={modal}
                    classes={classes}
                    onSauvegarder={apresEnregistrement}
                    onFermer={() => setModal(null)}
                />
            )}
        </section>
    );
};

export default CalendrierScolaire;
