import { useEffect, useState } from 'react';
import { centralApi } from '../../api/axios';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const Onglet = ({ label, icone, actif, onClick }) => (
    <button onClick={onClick} style={{
        borderRadius: 8, padding: '7px 16px', fontWeight: actif ? 600 : 400,
        backgroundColor: actif ? '#1e3a8a' : 'transparent',
        color: actif ? 'white' : '#6c757d',
        border: actif ? 'none' : '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        transition: 'all .2s', fontSize: 13,
    }}>
        <i className={icone} style={{ fontSize: 12 }} />{label}
    </button>
);

const statutBadge = (statut) => {
    const map = { CDI: 'primary', CDD: 'info', Stagiaire: 'warning', Vacataire: 'secondary' };
    return <span className={`badge bg-${map[statut] || 'secondary'}`} style={{ fontSize: 10 }}>{statut || '—'}</span>;
};

const statutProgColor = { fait: '#198754', en_cours: '#f59e0b', reporte: '#dc3545', null: '#adb5bd' };
const statutProgLabel = { fait: 'Fait', en_cours: 'En cours', reporte: 'Reporté', null: 'Non commencé' };

// ── Onglet A : Pédagogie ────────────────────────────────────────────────────
const TabPedagogie = ({ pedagogie, labelPeriode }) => (
    <div>
        {pedagogie.length === 0 ? (
            <div className="text-center text-muted py-5">
                <i className="fas fa-file-alt fs-3 d-block mb-2 opacity-25" />
                Aucun devoir enregistré pour cette période
            </div>
        ) : pedagogie.map(cl => (
            <div key={cl.classe_id} className="card border-0 shadow-sm mb-3" style={{ borderRadius: 12 }}>
                <div className="card-header bg-white border-0 px-3 pt-3 pb-2 d-flex justify-content-between align-items-center">
                    <div>
                        <span className="fw-bold" style={{ fontSize: 14 }}>{cl.abbr_classe}</span>
                        <span className="text-muted ms-2" style={{ fontSize: 12 }}>{cl.nom_classe}</span>
                        <div className="d-flex flex-wrap gap-1 mt-1">
                            {cl.matieres.map(m => (
                                <span key={m} className="badge bg-light text-dark border" style={{ fontSize: 10 }}>{m}</span>
                            ))}
                        </div>
                    </div>
                    <div className="text-end">
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#8b5cf6' }}>{cl.nb_devoirs}</div>
                        <div style={{ fontSize: 10, color: '#6c757d' }}>devoirs</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: cl.taux_saisie >= 80 ? '#198754' : cl.taux_saisie >= 50 ? '#f59e0b' : '#dc3545' }}>
                            {cl.taux_saisie}% notes saisies
                        </div>
                    </div>
                </div>
                {cl.par_type.length > 0 && (
                    <div className="card-body pt-0 px-3 pb-3">
                        <div className="table-responsive">
                            <table className="table table-sm mb-0" style={{ fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc' }}>
                                        <th className="border-0 text-muted fw-semibold">Type de devoir</th>
                                        <th className="border-0 text-muted fw-semibold text-center">Nb devoirs</th>
                                        <th className="border-0 text-muted fw-semibold text-center">Notes saisies</th>
                                        <th className="border-0 text-muted fw-semibold text-center">Taux saisie</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cl.par_type.map((t, i) => {
                                        const taux = t.nb > 0 ? Math.round((t.avec_notes / t.nb) * 100) : 0;
                                        return (
                                            <tr key={i}>
                                                <td className="py-1 align-middle fw-semibold">{t.type}</td>
                                                <td className="py-1 align-middle text-center">{t.nb}</td>
                                                <td className="py-1 align-middle text-center">{t.avec_notes}</td>
                                                <td className="py-1 align-middle text-center">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <div style={{ flex: 1, height: 6, background: '#e9ecef', borderRadius: 3 }}>
                                                            <div style={{ height: '100%', width: `${taux}%`, background: taux >= 80 ? '#198754' : taux >= 50 ? '#f59e0b' : '#dc3545', borderRadius: 3 }} />
                                                        </div>
                                                        <span style={{ fontSize: 11, fontWeight: 700, minWidth: 32, color: taux >= 80 ? '#198754' : taux >= 50 ? '#f59e0b' : '#dc3545' }}>{taux}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        ))}
    </div>
);

// ── Onglet B : Programme ────────────────────────────────────────────────────
const TabProgramme = ({ programme }) => {
    const [classeActive, setClasseActive] = useState(programme[0]?.classe_id ?? null);

    useEffect(() => {
        if (programme.length > 0) setClasseActive(programme[0].classe_id);
    }, [programme]);

    const cl = programme.find(c => c.classe_id === classeActive);
    const totalCl  = cl ? cl.total_fait + cl.total_en_cours + cl.total_reporte : 0;
    const tauxCl   = totalCl > 0 ? Math.round((cl.total_fait / totalCl) * 100) : 0;

    return (
        <div>
            {/* Onglets classes */}
            <div className="d-flex gap-2 flex-wrap mb-4">
                {programme.map(c => {
                    const tot  = c.total_fait + c.total_en_cours + c.total_reporte;
                    const taux = tot > 0 ? Math.round((c.total_fait / tot) * 100) : 0;
                    const actif = classeActive === c.classe_id;
                    return (
                        <button key={c.classe_id} onClick={() => setClasseActive(c.classe_id)} style={{
                            borderRadius: 8, padding: '6px 16px',
                            fontWeight: actif ? 600 : 400,
                            backgroundColor: actif ? '#1e3a8a' : 'transparent',
                            color: actif ? 'white' : '#4a5568',
                            border: actif ? 'none' : '1px solid #e5e7eb',
                            cursor: 'pointer',
                        }}>
                            {c.abbr_classe}
                            <span className="ms-2" style={{ fontSize: '0.78em', opacity: .8 }}>{taux}%</span>
                        </button>
                    );
                })}
            </div>

            {cl && (
                cl.par_matiere.length === 0 ? (
                    <div className="text-center text-muted py-5">
                        <i className="fas fa-book-open fs-3 d-block mb-2 opacity-25" />
                        Aucune progression enregistrée pour cette classe
                    </div>
                ) : (
                    <>
                        {/* KPIs classe */}
                        <div className="row g-3 mb-4">
                            {[
                                { l: 'Chapitres faits',    v: cl.total_fait,     c: '#198754', i: 'fas fa-check-circle' },
                                { l: 'En cours',           v: cl.total_en_cours, c: '#f59e0b', i: 'fas fa-spinner' },
                                { l: 'Reportés',           v: cl.total_reporte,  c: '#dc3545', i: 'fas fa-times-circle' },
                                { l: 'Avancement global',  v: `${tauxCl}%`,      c: '#3b82f6', i: 'fas fa-chart-line' },
                            ].map(x => (
                                <div key={x.l} className="col-6 col-md-3">
                                    <div className="card border-0 shadow-sm" style={{ borderRadius: 10, borderLeft: `4px solid ${x.c}` }}>
                                        <div className="card-body py-2 d-flex align-items-center gap-3">
                                            <i className={x.i} style={{ color: x.c, fontSize: 20, flexShrink: 0 }} />
                                            <div>
                                                <div style={{ fontSize: 22, fontWeight: 800, color: x.c }}>{x.v}</div>
                                                <div style={{ fontSize: 11, color: '#4a5568' }}>{x.l}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Grille 2 colonnes : 1 card par matière avec tableau des chapitres */}
                        <div className="row g-3">
                            {cl.par_matiere.map((mat, i) => {
                                const tot  = mat.fait + mat.en_cours + mat.reporte;
                                const taux = tot > 0 ? Math.round((mat.fait / tot) * 100) : 0;
                                const barColor = taux >= 80 ? '#198754' : taux >= 50 ? '#f59e0b' : '#3b82f6';
                                return (
                                    <div key={i} className="col-12 col-xl-6">
                                        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                                            <div className="card-header bg-white border-0 px-3 pt-3 pb-2">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="fw-bold">{mat.matiere}</span>
                                                    <div className="d-flex gap-1">
                                                        {[['fait', '#198754'], ['en_cours', '#f59e0b'], ['reporte', '#dc3545']].map(([s, c]) => mat[s] > 0 && (
                                                            <span key={s} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: c + '18', color: c, fontWeight: 600, border: `1px solid ${c}40`, whiteSpace: 'nowrap' }}>
                                                                {mat[s]} {statutProgLabel[s]}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div style={{ height: 6, background: '#e9ecef', borderRadius: 3 }}>
                                                    <div style={{ height: '100%', width: `${taux}%`, background: barColor, borderRadius: 3, transition: 'width .4s' }} />
                                                </div>
                                                <div className="d-flex justify-content-between mt-1" style={{ fontSize: 11, color: '#4a5568' }}>
                                                    <span>{tot} chapitre{tot > 1 ? 's' : ''}</span>
                                                    <span>{taux}% complété</span>
                                                </div>
                                            </div>
                                            <div className="card-body p-0">
                                                <table className="table table-sm table-hover mb-0" style={{ fontSize: '0.85rem' }}>
                                                    <thead style={{ backgroundColor: '#f8fafc' }}>
                                                        <tr>
                                                            <th className="border-0 fw-semibold text-muted ps-3">Chapitre</th>
                                                            <th className="border-0 fw-semibold text-muted" style={{ width: 120 }}>Statut</th>
                                                            <th className="border-0 fw-semibold text-muted text-end pe-3" style={{ width: 90 }}>Date</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {mat.chapitres.map((ch, j) => {
                                                            const s   = ch.statut ?? 'null';
                                                            const col = statutProgColor[s] || '#adb5bd';
                                                            return (
                                                                <tr key={j}>
                                                                    <td className="py-2 align-middle ps-3 fw-semibold">{ch.titre}</td>
                                                                    <td className="py-2 align-middle">
                                                                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: col + '18', color: col, fontWeight: 600, border: `1px solid ${col}40`, whiteSpace: 'nowrap' }}>
                                                                            {s === 'fait'     && <i className="fas fa-check me-1" />}
                                                                            {s === 'en_cours' && <i className="fas fa-spinner me-1" />}
                                                                            {s === 'reporte'  && <i className="fas fa-times me-1" />}
                                                                            {s === 'null'     && <i className="fas fa-minus me-1" />}
                                                                            {statutProgLabel[s]}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-2 align-middle text-end pe-3 text-muted" style={{ fontSize: 11 }}>
                                                                        {ch.date ? new Date(ch.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )
            )}
        </div>
    );
};

// ── Onglet C : Emploi du temps ───────────────────────────────────────────────
const TabEmploiDuTemps = ({ emploiDuTemps }) => {
    const aCreneaux = JOURS.some(j => emploiDuTemps[j]?.length > 0);
    if (!aCreneaux) return (
        <div className="text-center text-muted py-5">
            <i className="fas fa-calendar-alt fs-3 d-block mb-2 opacity-25" />
            Aucun créneau dans l'emploi du temps
        </div>
    );

    return (
        <div className="row g-3">
            {JOURS.map(jour => {
                const creneaux = emploiDuTemps[jour] ?? [];
                if (creneaux.length === 0) return null;
                return (
                    <div key={jour} className="col-12 col-md-6 col-lg-4">
                        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                            <div className="card-header bg-white border-0 px-3 pt-3 pb-2">
                                <span className="fw-semibold text-capitalize" style={{ fontSize: 13, color: '#1e3a8a' }}>
                                    <i className="fas fa-calendar-day me-2" />{jour}
                                </span>
                            </div>
                            <div className="card-body px-3 pt-0 pb-3 d-flex flex-column gap-2">
                                {creneaux.map((c, i) => (
                                    <div key={i} style={{
                                        padding: '8px 12px', borderRadius: 8,
                                        background: '#ede9fe', borderLeft: '3px solid #8b5cf6',
                                    }}>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="fw-semibold" style={{ fontSize: 12, color: '#4c1d95' }}>{c.libelle_matiere}</span>
                                            <span className="badge" style={{ background: '#dbeafe', color: '#1e40af', fontSize: 10 }}>{c.abbr_classe}</span>
                                        </div>
                                        <div className="text-muted mt-1" style={{ fontSize: 11 }}>
                                            <i className="fas fa-clock me-1" />{c.heure_debut?.slice(0,5)} – {c.heure_fin?.slice(0,5)}
                                            {c.nom_salle && <span className="ms-2"><i className="fas fa-map-marker-alt me-1" />{c.nom_salle}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ── Composant principal ──────────────────────────────────────────────────────
const ActivitesEnseignants = () => {
    const [ecoles, setEcoles]               = useState([]);
    const [ecoleId, setEcoleId]             = useState('');
    const [listeProfs, setListeProfs]       = useState([]);
    const [listeMatieres, setListeMatieres] = useState([]);
    const [listePeriodes, setListePeriodes] = useState([]);
    const [matiereId, setMatiereId]         = useState('');
    const [enseignantId, setEnseignantId]   = useState('');
    const [periodeId, setPeriodeId]         = useState('');
    const [data, setData]                   = useState(null);
    const [loading, setLoading]             = useState(false);
    const [erreur, setErreur]               = useState('');
    const [onglet, setOnglet]               = useState('pedagogie');

    // Charger les écoles
    useEffect(() => {
        centralApi.get('/group/ecoles')
            .then(r => {
                const actives = r.data.filter(e => e.actif);
                setEcoles(actives);
                if (actives.length > 0) setEcoleId(String(actives[0].id));
            })
            .catch(() => setErreur('Impossible de charger les établissements.'));
    }, []);

    // Quand l'école change → charger liste profs + matières
    useEffect(() => {
        if (!ecoleId) return;
        setListeProfs([]);
        setListeMatieres([]);
        setMatiereId('');
        setEnseignantId('');
        setData(null);

        centralApi.get(`/group/ecoles/${ecoleId}/enseignants/liste`)
            .then(r => {
                setListeProfs(r.data.enseignants ?? []);
                setListeMatieres(r.data.matieres ?? []);
                setListePeriodes(r.data.periodes ?? []);
            })
            .catch(() => {});
    }, [ecoleId]);

    // Filtrer les profs selon la matière sélectionnée
    const profsFiltres = matiereId
        ? listeProfs.filter(p => p.matieres?.includes(parseInt(matiereId)))
        : listeProfs;

    // Quand la matière change → recalculer les profs disponibles
    const handleMatiereChange = (mid) => {
        setMatiereId(mid);
        setEnseignantId('');
        setData(null);
    };

    const handleEnseignantChange = (eid) => {
        setEnseignantId(eid);
        setData(null);
    };

    const charger = () => {
        if (!ecoleId || !enseignantId) return;
        setLoading(true);
        setErreur('');
        setData(null);
        const params = periodeId ? `?periode_id=${periodeId}` : '';
        centralApi.get(`/group/ecoles/${ecoleId}/enseignants/${enseignantId}/detail${params}`)
            .then(r => { setData(r.data); setOnglet('pedagogie'); })
            .catch(() => setErreur('Impossible de charger les données.'))
            .finally(() => setLoading(false));
    };

    const labelPeriode = periodeId
        ? (listePeriodes.find(p => String(p.id) === periodeId)?.libelle_periode ?? 'Période sélectionnée')
        : 'Toutes périodes';

    return (
        <div className="container-fluid py-4">

            <div className="mb-4">
                <h4 className="fw-bold mb-1">
                    <i className="fas fa-chalkboard-teacher me-2 text-primary" />
                    Activités des enseignants
                </h4>
                <p className="text-muted small mb-0">Pédagogie, suivi de programme et emploi du temps par enseignant</p>
            </div>

            {/* Filtres en cascade */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
                <div className="card-body d-flex flex-wrap gap-3 align-items-end">
                    <div>
                        <label className="form-label small fw-semibold text-muted mb-1">
                            <i className="fas fa-school me-1" />Établissement
                        </label>
                        <select className="form-select form-select-sm" style={{ minWidth: 200 }}
                            value={ecoleId} onChange={e => { setEcoleId(e.target.value); setData(null); }}>
                            {ecoles.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label small fw-semibold text-muted mb-1">
                            <i className="fas fa-book me-1" />Matière
                        </label>
                        <select className="form-select form-select-sm" style={{ minWidth: 180 }}
                            value={matiereId} onChange={e => handleMatiereChange(e.target.value)}
                            disabled={listeProfs.length === 0}>
                            <option value="">Toutes les matières</option>
                            {listeMatieres.map(m => <option key={m.id} value={m.id}>{m.libelle_matiere}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label small fw-semibold text-muted mb-1">
                            <i className="fas fa-user me-1" />Enseignant <span className="text-danger">*</span>
                        </label>
                        <select className="form-select form-select-sm" style={{ minWidth: 200 }}
                            value={enseignantId} onChange={e => handleEnseignantChange(e.target.value)}
                            disabled={listeProfs.length === 0}>
                            <option value="">Sélectionner…</option>
                            {profsFiltres.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label small fw-semibold text-muted mb-1">
                            <i className="fas fa-calendar-alt me-1" />Trimestre / Période
                        </label>
                        <select className="form-select form-select-sm" style={{ minWidth: 200 }}
                            value={periodeId} onChange={e => { setPeriodeId(e.target.value); setData(null); }}
                            disabled={listePeriodes.length === 0}>
                            <option value="">Toutes périodes</option>
                            {listePeriodes.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.libelle_periode} {p.annee ? `(${p.annee})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button className="btn btn-primary btn-sm d-flex align-items-center gap-2"
                        onClick={charger} disabled={!enseignantId || loading}>
                        {loading
                            ? <><span className="spinner-border spinner-border-sm" />Chargement…</>
                            : <><i className="fas fa-search" />Voir les activités</>}
                    </button>
                </div>
            </div>

            {erreur && <div className="alert alert-danger">{erreur}</div>}

            {!data && !loading && (
                <div className="text-center text-muted py-5">
                    <i className="fas fa-chalkboard-teacher fs-1 d-block mb-3 opacity-25" />
                    <p className="mb-0">Sélectionnez un établissement, une matière et un enseignant</p>
                </div>
            )}

            {data && (
                <>
                    {/* En-tête enseignant */}
                    <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 12, borderLeft: '4px solid #3b82f6' }}>
                        <div className="card-body d-flex align-items-center gap-3">
                            <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className="fas fa-chalkboard-teacher text-primary" style={{ fontSize: 22 }} />
                            </div>
                            <div className="flex-grow-1">
                                <h5 className="fw-bold mb-1">{data.enseignant.nom}</h5>
                                <div className="d-flex flex-wrap gap-3 text-muted" style={{ fontSize: 12 }}>
                                    {statutBadge(data.enseignant.statut)}
                                    {data.enseignant.email && <span><i className="fas fa-envelope me-1" />{data.enseignant.email}</span>}
                                    {data.enseignant.tel && <span><i className="fas fa-phone me-1" />{data.enseignant.tel}</span>}
                                    <span className="text-muted">Période : {labelPeriode}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Onglets */}
                    <div className="d-flex gap-2 mb-4">
                        <Onglet label="Pédagogie"       icone="fas fa-graduation-cap"   actif={onglet === 'pedagogie'}   onClick={() => setOnglet('pedagogie')} />
                        <Onglet label="Suivi programme"  icone="fas fa-tasks"            actif={onglet === 'programme'}   onClick={() => setOnglet('programme')} />
                        <Onglet label="Emploi du temps"  icone="fas fa-calendar-alt"     actif={onglet === 'edt'}         onClick={() => setOnglet('edt')} />
                    </div>

                    {onglet === 'pedagogie' && <TabPedagogie pedagogie={data.pedagogie} labelPeriode={labelPeriode} />}
                    {onglet === 'programme' && <TabProgramme programme={data.programme} />}
                    {onglet === 'edt'       && <TabEmploiDuTemps emploiDuTemps={data.emploi_du_temps} />}
                </>
            )}
        </div>
    );
};

export default ActivitesEnseignants;
