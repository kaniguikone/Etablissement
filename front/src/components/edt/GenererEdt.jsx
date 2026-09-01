import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/**
 * Génération automatique des emplois du temps (chantier EDT — Lot 2).
 */
const GenererEdt = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();

    const [scenarios, setScenarios] = useState([]);
    const [libelle, setLibelle] = useState('');
    const [jours, setJours] = useState(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']);
    const [enCours, setEnCours] = useState(false);
    const [detail, setDetail] = useState(null);
    const [classeAffichee, setClasseAffichee] = useState('');

    const charger = () => api.get('/edt/generations').then((r) => setScenarios(r.data)).catch(() => {});
    useEffect(() => { charger(); }, []);

    const lancer = () => {
        if (jours.length === 0) { toast.error('Choisissez au moins un jour.'); return; }
        setEnCours(true);
        setDetail(null);
        api.post('/edt/generations', { libelle: libelle || undefined, jours })
            .then((r) => {
                toast.success('Scénario généré.');
                setDetail(r.data);
                setLibelle('');
                charger();
            })
            .catch((err) => toast.error(err.response?.data?.message || 'La génération a échoué.'))
            .finally(() => setEnCours(false));
    };

    const voir = (id) => api.get(`/edt/generations/${id}`).then((r) => { setDetail(r.data); setClasseAffichee(''); }).catch(() => toast.error('Chargement impossible.'));

    const publier = async (id) => {
        if (!await confirmer("Publier ce scénario ? L'emploi du temps actuel sera archivé et remplacé.")) return;
        api.post(`/edt/generations/${id}/publier`)
            .then(() => { toast.success('Emploi du temps publié.'); charger(); if (detail) voir(id); })
            .catch((err) => toast.error(err.response?.data?.message || 'Publication impossible.'));
    };

    const supprimer = async (id) => {
        if (!await confirmer('Supprimer ce scénario ?')) return;
        api.delete(`/edt/generations/${id}`)
            .then(() => { toast.success('Scénario supprimé.'); charger(); if (detail?.generation?.id === id) setDetail(null); })
            .catch((err) => toast.error(err.response?.data?.message || 'Suppression impossible.'));
    };

    const toggleJour = (j) => setJours((js) => (js.includes(j) ? js.filter((x) => x !== j) : [...js, j]));

    const diag = detail?.generation?.diagnostic || {};
    const classes = detail ? Object.keys(detail.par_classe) : [];
    const grilleClasse = classeAffichee && detail?.par_classe[classeAffichee] ? detail.par_classe[classeAffichee] : [];
    const horaires = [...new Set(grilleClasse.map((c) => `${c.heure_debut.slice(0, 5)}|${c.heure_fin.slice(0, 5)}`))].sort();

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Génération automatique des emplois du temps</h4>
                </div>

                <div className="border rounded p-3 bg-light mb-3">
                    <div className="row g-2 align-items-end">
                        <div className="col-md-4">
                            <label className="form-label small">Nom du scénario</label>
                            <input className="form-control form-control-sm" value={libelle}
                                onChange={(e) => setLibelle(e.target.value)} placeholder="ex. Scénario 1 — priorité profs" />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label small d-block">Jours ouvrés</label>
                            {JOURS.map((j) => (
                                <div className="form-check form-check-inline" key={j}>
                                    <input className="form-check-input" type="checkbox" id={`j-${j}`}
                                        checked={jours.includes(j)} onChange={() => toggleJour(j)} />
                                    <label className="form-check-label text-capitalize small" htmlFor={`j-${j}`}>{j}</label>
                                </div>
                            ))}
                        </div>
                        <div className="col-md-2">
                            <button className="btn btn-primary btn-sm w-100" onClick={lancer} disabled={enCours}>
                                {enCours && <span className="spinner-border spinner-border-sm me-2" />}
                                {enCours ? 'Génération…' : 'Générer'}
                            </button>
                        </div>
                    </div>
                    <p className="text-muted small mb-0 mt-2">
                        Utilise la grille horaire, les volumes horaires découpés en séances, les affectations
                        d&apos;enseignants et leurs indisponibilités. Vérifiez d&apos;abord le
                        {' '}<a href="/DiagnosticEdt">diagnostic de préparation</a>.
                    </p>
                </div>

                {/* Résultat courant */}
                {detail && (
                    <div className="border rounded p-3 mb-3">
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                            <div>
                                <h6 className="mb-1">{detail.generation.libelle}</h6>
                                <span className="badge bg-secondary me-1">{detail.generation.statut}</span>
                                <span className="badge bg-light text-dark me-1">score {detail.generation.score}</span>
                                <span className="badge bg-light text-dark me-1">{diag.nb_placees ?? 0} / {diag.nb_besoins ?? 0} séances placées</span>
                                {detail.generation.duree_ms != null && <span className="badge bg-light text-dark">{Math.round(detail.generation.duree_ms / 100) / 10}s</span>}
                            </div>
                            {detail.generation.statut !== 'publie' && (
                                <button className="btn btn-success btn-sm" onClick={() => publier(detail.generation.id)}>
                                    Publier ce scénario
                                </button>
                            )}
                        </div>

                        <div className="row g-2 mt-1">
                            <div className="col-md-4">
                                <div className={`alert py-2 mb-0 ${detail.controle.nb_dures ? 'alert-danger' : 'alert-success'}`}>
                                    {detail.controle.nb_dures} conflit(s) bloquant(s), {detail.controle.nb_souples} point(s) d&apos;amélioration
                                </div>
                            </div>
                            {(diag.non_placees?.length > 0) && (
                                <div className="col-md-4">
                                    <div className="alert alert-warning py-2 mb-0">
                                        {diag.non_placees.length} séance(s) non placée(s)
                                    </div>
                                </div>
                            )}
                            {(diag.non_affectees?.length > 0) && (
                                <div className="col-md-4">
                                    <div className="alert alert-warning py-2 mb-0">
                                        {diag.non_affectees.length} matière(s) sans enseignant
                                    </div>
                                </div>
                            )}
                        </div>

                        {(diag.non_placees?.length > 0 || diag.non_affectees?.length > 0) && (
                            <details className="mt-2">
                                <summary className="small text-muted">Détail des anomalies</summary>
                                <ul className="small mb-0">
                                    {(diag.non_affectees || []).map((x, i) => <li key={`a${i}`}>Sans enseignant : {x}</li>)}
                                    {(diag.non_placees || []).map((x, i) => <li key={`p${i}`}>Non placée : {x}</li>)}
                                </ul>
                            </details>
                        )}

                        {detail.controle.violations?.length > 0 && (
                            <details className="mt-2">
                                <summary className="small text-muted">{detail.controle.violations.length} remarque(s) du contrôle</summary>
                                <ul className="small mb-0">
                                    {detail.controle.violations.map((v, i) => (
                                        <li key={i}>
                                            <span className={`badge me-1 ${v.nature === 'dure' ? 'bg-danger' : 'bg-warning text-dark'}`}>{v.libelle}</span>
                                            {v.message}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )}

                        {/* Aperçu par classe */}
                        <div className="mt-3">
                            <select className="form-select form-select-sm" style={{ maxWidth: 260 }}
                                value={classeAffichee} onChange={(e) => setClasseAffichee(e.target.value)}>
                                <option value="">Aperçu d&apos;une classe…</option>
                                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>

                            {horaires.length > 0 && (
                                <div className="table-responsive mt-2">
                                    <table className="table table-bordered text-center" style={{ fontSize: '0.8rem' }}>
                                        <thead className="table-dark">
                                            <tr>
                                                <th style={{ width: 80 }}>Horaire</th>
                                                {JOURS.filter((j) => jours.includes(j) || grilleClasse.some((c) => c.jour === j)).map((j) => (
                                                    <th key={j} className="text-capitalize">{j}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {horaires.map((h) => {
                                                const [debut, fin] = h.split('|');
                                                return (
                                                    <tr key={h}>
                                                        <td className="bg-light fw-bold">{debut}<br /><small>{fin}</small></td>
                                                        {JOURS.filter((j) => jours.includes(j) || grilleClasse.some((c) => c.jour === j)).map((j) => {
                                                            const c = grilleClasse.find((x) => x.jour === j && x.heure_debut.slice(0, 5) === debut);
                                                            if (!c) return <td key={j} />;
                                                            return (
                                                                <td key={j} style={{ background: c.matiere?.couleur || '#eee' }}>
                                                                    <strong>{c.matiere?.abbr_matiere}</strong><br />
                                                                    <small>{c.enseignant?.nom_enseignant}</small>
                                                                    {c.salle && <><br /><small className="text-muted">{c.salle.nom}</small></>}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Historique des scénarios */}
                <h6>Scénarios</h6>
                {scenarios.length === 0 ? (
                    <p className="text-muted small">Aucun scénario généré.</p>
                ) : (
                    <table className="table table-sm table-bordered" style={{ fontSize: '0.88rem' }}>
                        <thead className="table-light">
                            <tr><th>Nom</th><th style={{ width: 90 }}>Statut</th><th style={{ width: 70 }}>Score</th><th style={{ width: 90 }}>Créneaux</th><th style={{ width: 160 }}>Créé</th><th style={{ width: 180 }}></th></tr>
                        </thead>
                        <tbody>
                            {scenarios.map((s) => (
                                <tr key={s.id} className={s.statut === 'publie' ? 'table-success' : (s.statut === 'archive' ? 'text-muted' : '')}>
                                    <td>{s.libelle}</td>
                                    <td><span className="badge bg-secondary">{s.statut}</span></td>
                                    <td>{s.score ?? '—'}</td>
                                    <td>{s.creneaux_count}</td>
                                    <td>{new Date(s.created_at).toLocaleString('fr-FR')}</td>
                                    <td className="text-end">
                                        <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => voir(s.id)}>Voir</button>
                                        {s.statut !== 'publie' && s.statut !== 'archive' && (
                                            <button className="btn btn-outline-success btn-sm me-1" onClick={() => publier(s.id)}>Publier</button>
                                        )}
                                        {s.statut !== 'publie' && (
                                            <button className="btn btn-outline-danger btn-sm" onClick={() => supprimer(s.id)}>✕</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    );
};

export default GenererEdt;
