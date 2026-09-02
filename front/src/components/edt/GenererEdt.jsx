import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const telechargerPdf = async (url, nom, toast) => {
    try {
        const r = await api.get(url, { responseType: 'blob', timeout: 120000 });
        const blobUrl = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
        const a = document.createElement('a');
        a.href = blobUrl; a.download = nom; a.click();
        URL.revokeObjectURL(blobUrl);
    } catch {
        toast.error('Export PDF impossible.');
    }
};

/**
 * Génération automatique des emplois du temps (chantier EDT — Lots 2 & 3).
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
    const [plagesRef, setPlagesRef] = useState([]);
    const [edite, setEdite] = useState(null); // créneau en cours d'édition

    const charger = () => api.get('/edt/generations').then((r) => setScenarios(r.data)).catch(() => {});
    useEffect(() => {
        charger();
        api.get('/edt/grille-reference').then((r) => setPlagesRef(r.data)).catch(() => {});
    }, []);

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

    const voir = (id) => api.get(`/edt/generations/${id}`).then((r) => { setDetail(r.data); setClasseAffichee(''); setEdite(null); }).catch(() => toast.error('Chargement impossible.'));

    const regenerer = async (id) => {
        if (!await confirmer('Régénérer un nouveau scénario en conservant les créneaux verrouillés ?')) return;
        setEnCours(true);
        api.post(`/edt/generations/${id}/regenerer`)
            .then((r) => { toast.success('Nouveau scénario généré.'); setDetail(r.data); charger(); })
            .catch((err) => toast.error(err.response?.data?.message || 'Régénération impossible.'))
            .finally(() => setEnCours(false));
    };

    const patchCreneau = (patch) => {
        if (!edite || !detail) return;
        api.patch(`/edt/generations/${detail.generation.id}/creneaux/${edite.id}`, patch)
            .then((r) => {
                if (r.data?.conflits?.length) {
                    toast.error('Conflit : ' + r.data.conflits.join(' · '));
                } else {
                    toast.success('Créneau mis à jour.');
                }
                voir(detail.generation.id);
            })
            .catch(() => toast.error('Modification impossible.'));
    };

    const supprimerCreneau = async () => {
        if (!edite || !detail) return;
        if (!await confirmer('Retirer ce cours du scénario ?')) return;
        api.delete(`/edt/generations/${detail.generation.id}/creneaux/${edite.id}`)
            .then(() => { toast.success('Cours retiré.'); voir(detail.generation.id); })
            .catch(() => toast.error('Suppression impossible.'));
    };

    const exportRef = () => (detail?.generation?.statut === 'publie' ? 'officiel' : detail?.generation?.id);

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
                            <div className="d-flex gap-2 flex-wrap">
                                {detail.generation.statut !== 'publie' && detail.generation.statut !== 'archive' && (
                                    <>
                                        <button className="btn btn-outline-secondary btn-sm" onClick={() => regenerer(detail.generation.id)} disabled={enCours}>
                                            Régénérer (garder les verrouillés)
                                        </button>
                                        <button className="btn btn-success btn-sm" onClick={() => publier(detail.generation.id)}>
                                            Publier ce scénario
                                        </button>
                                    </>
                                )}
                                <button className="btn btn-outline-primary btn-sm"
                                    onClick={() => telechargerPdf(`/edt/${exportRef()}/pdf/classes`, 'edt-toutes-classes.pdf', toast)}>
                                    PDF — toutes les classes
                                </button>
                                {classeAffichee && grilleClasse[0] && (
                                    <button className="btn btn-outline-primary btn-sm"
                                        onClick={() => telechargerPdf(`/edt/${exportRef()}/pdf/classe/${grilleClasse[0].classe_id}`, `edt-${classeAffichee}.pdf`, toast)}>
                                        PDF — {classeAffichee}
                                    </button>
                                )}
                            </div>
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
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <select className="form-select form-select-sm" style={{ maxWidth: 260 }}
                                    value={classeAffichee} onChange={(e) => { setClasseAffichee(e.target.value); setEdite(null); }}>
                                    <option value="">Aperçu d&apos;une classe…</option>
                                    {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                                {classeAffichee && detail.generation.statut !== 'archive' && (
                                    <small className="text-muted">Cliquez sur un cours pour le déplacer / verrouiller.</small>
                                )}
                            </div>

                            {edite && (
                                <div className="border rounded p-2 my-2 bg-light">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <strong>{edite.matiere?.libelle_matiere} — {edite.enseignant?.nom_enseignant}</strong>
                                        <button className="btn-close btn-sm" onClick={() => setEdite(null)} />
                                    </div>
                                    <div className="row g-2 align-items-end">
                                        <div className="col-auto">
                                            <label className="form-label small mb-0">Jour</label>
                                            <select className="form-select form-select-sm" defaultValue={edite.jour}
                                                onChange={(e) => patchCreneau({ jour: e.target.value })}>
                                                {JOURS.map((j) => <option key={j} value={j} className="text-capitalize">{j}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-auto">
                                            <label className="form-label small mb-0">Créneau</label>
                                            <select className="form-select form-select-sm" defaultValue={edite.plage_horaire_id || ''}
                                                onChange={(e) => patchCreneau({ plage_horaire_id: Number(e.target.value) })}>
                                                <option value="">—</option>
                                                {plagesRef
                                                    .filter((p) => p.jour === edite.jour || p.jour === null)
                                                    .map((p) => <option key={p.id} value={p.id}>{p.libelle} · {p.heure_debut.slice(0, 5)}–{p.heure_fin.slice(0, 5)}</option>)}
                                            </select>
                                        </div>
                                        <div className="col-auto">
                                            <div className="form-check">
                                                <input className="form-check-input" type="checkbox" id="verrou" defaultChecked={!!edite.verrouille}
                                                    onChange={(e) => patchCreneau({ verrouille: e.target.checked })} />
                                                <label className="form-check-label small" htmlFor="verrou">Verrouiller</label>
                                            </div>
                                        </div>
                                        <div className="col-auto">
                                            <button className="btn btn-outline-danger btn-sm" onClick={supprimerCreneau}>Retirer</button>
                                        </div>
                                    </div>
                                </div>
                            )}

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
                                                            const cs = grilleClasse.filter((x) => x.jour === j && x.heure_debut.slice(0, 5) === debut);
                                                            if (cs.length === 0) return <td key={j} />;
                                                            const modifiable = detail.generation.statut !== 'archive';
                                                            const c0 = cs[0];
                                                            return (
                                                                <td key={j} style={{ background: cs.length > 1 ? '#f3e8ff' : (c0.matiere?.couleur || '#eee') }}>
                                                                    {cs.map((c) => (
                                                                        <div key={c.id}
                                                                            style={{ cursor: modifiable ? 'pointer' : 'default', outline: edite?.id === c.id ? '2px solid #0d6efd' : 'none', borderTop: cs.length > 1 ? '1px dashed #aaa' : 'none' }}
                                                                            onClick={() => modifiable && setEdite(c)}>
                                                                            <strong>{c.matiere?.abbr_matiere}</strong>
                                                                            {c.verrouille && ' 🔒'}
                                                                            {c.semaine && c.semaine !== 'toutes' && <span className="badge bg-dark ms-1">{c.semaine}</span>}
                                                                            <br /><small>{c.enseignant?.nom_enseignant}</small>
                                                                            {c.salle && <> · <small className="text-muted">{c.salle.nom}</small></>}
                                                                        </div>
                                                                    ))}
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
