import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const lireErreurBlob = async (err) => {
    if (err.code === 'ECONNABORTED' || !err.response) {
        return 'La génération a pris trop de temps. Réessayez, ou contactez l\'administrateur si le problème persiste.';
    }
    if (err.response?.data instanceof Blob) {
        try {
            const texte = await err.response.data.text();
            const json  = JSON.parse(texte);
            return json.message || 'Erreur lors de la génération du PDF.';
        } catch {
            return 'Erreur lors de la génération du PDF.';
        }
    }
    return err.response?.data?.message || 'Erreur lors de la génération du PDF.';
};

const BADGE_MOY = (moy) => {
    if (moy === null) return 'bg-secondary';
    if (moy >= 16) return 'bg-success';
    if (moy >= 14) return 'bg-primary';
    if (moy >= 12) return 'bg-info text-dark';
    if (moy >= 10) return 'bg-warning text-dark';
    return 'bg-danger';
};


const mention = (moy) => {
    if (moy === null) return '—';
    if (moy >= 16) return 'Très bien';
    if (moy >= 14) return 'Bien';
    if (moy >= 12) return 'Assez bien';
    if (moy >= 10) return 'Passable';
    return 'Insuffisant';
};

/* ── Section téléchargement bulletins d'une classe ─────────────────────────── */
const ExportBulletinsClasse = ({ niveaux, periodes }) => {
    const { toast } = useToast();
    const [niveauId,  setNiveauId]  = useState('');
    const [classeId,  setClasseId]  = useState('');
    const [periodeId, setPeriodeId] = useState('');
    const [classes,   setClasses]   = useState([]);
    const [enCours,   setEnCours]   = useState(false);

    const handleNiveau = (e) => {
        const val = e.target.value;
        setNiveauId(val);
        setClasseId('');
        setClasses([]);
        if (val) {
            api.get(`/classesNiveaux/${val}`)
                .then(r => setClasses(r.data))
                .catch(() => toast.error('Impossible de charger les classes.'));
        }
    };

    const telecharger = async () => {
        if (!classeId || !periodeId) return;
        setEnCours(true);
        try {
            const r = await api.get(`/bulletins/classe/${classeId}/${periodeId}/pdf`, { responseType: 'blob', timeout: 120000 });
            const classe  = classes.find(c => String(c.id) === String(classeId));
            const periode = periodes.find(p => String(p.id) === String(periodeId));
            const label   = periode?.code_periode ?? periode?.abbr_libelle_periode ?? periodeId;
            const nom     = `bulletins_${(classe?.nom_classe ?? classeId).replace(/\s+/g, '_')}_${label}_${periode?.annee ?? ''}.pdf`;
            const url  = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
            const lien = document.createElement('a');
            lien.href = url; lien.download = nom; lien.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast.error(await lireErreurBlob(err));
        } finally {
            setEnCours(false);
        }
    };

    return (
        <div className="card border-0 shadow-sm mt-4" style={{ borderRadius: 12 }}>
            <div className="card-header bg-white border-0 px-4 pt-3 pb-2">
                <span className="fw-bold">
                    <i className="fas fa-file-pdf me-2 text-danger" />
                    Bulletins d'une classe — PDF groupé
                </span>
                <div className="text-muted small mt-1">
                    Génère un seul fichier PDF contenant tous les bulletins des élèves d'une classe, par ordre alphabétique.
                </div>
            </div>
            <div className="card-body">
                <div className="row g-3 align-items-end">
                    <div className="col-md-3">
                        <label className="form-label small fw-semibold">Niveau</label>
                        <select className="form-select form-select-sm" value={niveauId} onChange={handleNiveau}>
                            <option value="">— Sélectionner —</option>
                            {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom_niveau}</option>)}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label small fw-semibold">Classe</label>
                        <select className="form-select form-select-sm" value={classeId} onChange={e => setClasseId(e.target.value)} disabled={!niveauId}>
                            <option value="">— Sélectionner —</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label small fw-semibold">Période</label>
                        <select className="form-select form-select-sm" value={periodeId} onChange={e => setPeriodeId(e.target.value)}>
                            <option value="">— Sélectionner —</option>
                            {periodes.map(p => <option key={p.id} value={p.id}>{p.libelle_periode} — {p.annee}</option>)}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <button
                            className="btn btn-danger btn-sm d-flex align-items-center gap-2"
                            onClick={telecharger}
                            disabled={!classeId || !periodeId || enCours}>
                            {enCours
                                ? <span className="spinner-border spinner-border-sm" />
                                : <i className="fas fa-file-pdf" />}
                            Télécharger les bulletins
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Section export Excel par niveau ───────────────────────────────────────── */
const ExportMoyennes = ({ niveaux, periodes }) => {
    const { toast } = useToast();
    const [exportNiveauId,  setExportNiveauId]  = useState('');
    const [exportPeriodeId, setExportPeriodeId] = useState('');
    const [exportEnCours,   setExportEnCours]   = useState(false);

    const normaliserNiveau = (abbr) => {
        if (!abbr) return '';
        return abbr
            .toUpperCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // supprimer accents
            .replace('IEME', 'EME');
    };

    const ordinalTrimestre = (code) => {
        if (!code) return '';
        const map = { T1: '1er', T2: '2e', T3: '3e' };
        return map[code.toUpperCase()] ?? code;
    };

    const telechargerExcel = async () => {
        if (!exportNiveauId || !exportPeriodeId) return;
        setExportEnCours(true);
        try {
            const r = await api.get(
                `/export/moyennes/${exportNiveauId}/${exportPeriodeId}`,
                { responseType: 'blob' }
            );
            const niveau  = niveaux.find(n => String(n.id) === String(exportNiveauId));
            const periode = periodes.find(p => String(p.id) === String(exportPeriodeId));
            const abbrNiv = normaliserNiveau(niveau?.abbr_niveau ?? niveau?.nom_niveau ?? '');
            const ordinal = ordinalTrimestre(periode?.code_periode ?? '');
            const nomFichier = `ACTU_MOYENNE ${ordinal} Trimestre ${abbrNiv}.xlsx`;

            const url  = URL.createObjectURL(new Blob([r.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }));
            const lien = document.createElement('a');
            lien.href     = url;
            lien.download = nomFichier;
            lien.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            const msg = await lireErreurBlob(err);
            toast.error(msg);
        } finally {
            setExportEnCours(false);
        }
    };

    return (
        <div className="card border-0 shadow-sm mt-4" style={{ borderRadius: 12 }}>
            <div className="card-header bg-white border-0 px-4 pt-3 pb-2">
                <span className="fw-bold">
                    <i className="fas fa-file-excel me-2 text-success" />
                    Export Excel — Moyennes par niveau
                </span>
                <div className="text-muted small mt-1">
                    Génère un fichier Excel avec toutes les moyennes des élèves d'un niveau pour une période donnée.
                    <br />
                    <span className="text-warning"><i className="fas fa-info-circle me-1" /></span>
                    <strong>21</strong> = élève sans note · <strong>22</strong> = matière non enseignée à ce niveau/série
                </div>
            </div>
            <div className="card-body">
                <div className="row g-3 align-items-end">
                    <div className="col-md-4">
                        <label className="form-label small fw-semibold">Niveau</label>
                        <select className="form-select form-select-sm"
                            value={exportNiveauId}
                            onChange={e => setExportNiveauId(e.target.value)}>
                            <option value="">— Sélectionner un niveau —</option>
                            {niveaux.map(n => (
                                <option key={n.id} value={n.id}>{n.nom_niveau}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <label className="form-label small fw-semibold">Période</label>
                        <select className="form-select form-select-sm"
                            value={exportPeriodeId}
                            onChange={e => setExportPeriodeId(e.target.value)}>
                            <option value="">— Sélectionner une période —</option>
                            {periodes.map(p => (
                                <option key={p.id} value={p.id}>{p.libelle_periode} — {p.annee}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <button
                            className="btn btn-success btn-sm d-flex align-items-center gap-2"
                            onClick={telechargerExcel}
                            disabled={!exportNiveauId || !exportPeriodeId || exportEnCours}>
                            {exportEnCours
                                ? <span className="spinner-border spinner-border-sm" />
                                : <i className="fas fa-file-excel" />}
                            Télécharger Excel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Bulletin = () => {
    const { toast } = useToast();
    const [niveaux, setNiveaux]   = useState([]);
    const [classes, setClasses]   = useState([]);
    const [eleves, setEleves]     = useState([]);
    const [periodes, setPeriodes] = useState([]);

    const [niveauId, setNiveauId]   = useState('');
    const [classeId, setClasseId]   = useState('');
    const [eleveId, setEleveId]     = useState('');
    const [periodeId, setPeriodeId] = useState('');

    const [bulletin, setBulletin]     = useState(null);
    const [chargement, setChargement] = useState(false);

    useEffect(() => {
        api.get('/niveaux').then((r) => setNiveaux(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
        api.get('/periodes').then((r) => setPeriodes(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
    }, []);

    const handleNiveauChange = (e) => {
        const val = e.target.value;
        setNiveauId(val);
        setClasseId('');
        setEleveId('');
        setClasses([]);
        setEleves([]);
        setBulletin(null);
        if (val) {
            api.get(`/classesNiveaux/${val}`).then((r) => setClasses(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
        }
    };

    const handleClasseChange = (e) => {
        const val = e.target.value;
        setClasseId(val);
        setEleveId('');
        setEleves([]);
        setBulletin(null);
        if (val) {
            api.get(`/elevesClasse/${val}`).then((r) => setEleves(r.data.data ?? r.data)).catch(() => toast.error('Erreur de chargement des données.'));
        }
    };

    const handleEleveChange = (e) => {
        setEleveId(e.target.value);
        setBulletin(null);
    };

    const chargerBulletin = () => {
        if (!eleveId || !periodeId) return;
        setChargement(true);
        setBulletin(null);
        api.get(`/bulletin/${eleveId}/${periodeId}`)
            .then((r) => { setBulletin(r.data); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger le bulletin.'); setChargement(false); });
    };

    const telechargerPdf = async () => {
        try {
            const r = await api.get(`/bulletin/${eleveId}/${periodeId}/pdf`, { responseType: 'blob', timeout: 60000 });
            const periode = periodes.find((p) => String(p.id) === String(periodeId));
            const labelPeriode = periode?.code_periode ?? periode?.abbr_libelle_periode ?? periodeId;
            const nomFichier = `bulletin_${bulletin.eleve.nom_eleve.toLowerCase()}_${bulletin.eleve.prenoms_eleve.toLowerCase()}_${labelPeriode}_${periode?.annee ?? ''}.pdf`
                .replace(/\s+/g, '_');
            const url  = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
            const lien = document.createElement('a');
            lien.href  = url;
            lien.download = nomFichier;
            lien.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast.error(await lireErreurBlob(err));
        }
    };

    // Utilise la moyenne pondérée retournée par l'API (Σ moy×coeff / Σ coeff)
    const moy = bulletin?.moyenneGenerale != null
        ? parseFloat(bulletin.moyenneGenerale).toFixed(2)
        : null;

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Bulletins de notes</h4>
                </div>

                {/* Sélection en cascade */}
                <div className="row g-3 mb-3 align-items-end">
                    <div className="col-md-3">
                        <label className="form-label">Niveau</label>
                        <select className="form-select form-select-sm" value={niveauId} onChange={handleNiveauChange}>
                            <option value="">— Niveau —</option>
                            {niveaux.map((n) => (
                                <option key={n.id} value={n.id}>{n.nom_niveau}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Classe</label>
                        <select className="form-select form-select-sm" value={classeId} onChange={handleClasseChange} disabled={!niveauId}>
                            <option value="">— Classe —</option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>{c.nom_classe}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Élève</label>
                        <select className="form-select form-select-sm" value={eleveId} onChange={handleEleveChange} disabled={!classeId}>
                            <option value="">— Élève —</option>
                            {eleves.map((e) => (
                                <option key={e.id} value={e.id}>{e.nom_eleve} {e.prenoms_eleve} — {e.matricule_eleve}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Période</label>
                        <select className="form-select form-select-sm" value={periodeId} onChange={(e) => { setPeriodeId(e.target.value); setBulletin(null); }}>
                            <option value="">— Période —</option>
                            {periodes.map((p) => (
                                <option key={p.id} value={p.id}>{p.libelle_periode} — {p.annee}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-12 d-flex gap-2">
                        <button className="btn btn-primary btn-sm" onClick={chargerBulletin} disabled={!eleveId || !periodeId || chargement}>
                            {chargement && <span className="spinner-border spinner-border-sm me-1" />}
                            Afficher
                        </button>
                        {bulletin && (
                            <button className="btn btn-danger btn-sm" onClick={telechargerPdf}>
                                <i className="fas fa-file-pdf me-1"></i> Bulletin PDF
                            </button>
                        )}
                        {eleveId && periodeId && (() => {
                            const annee = periodes.find(p => String(p.id) === String(periodeId))?.annee;
                            return annee ? (
                                <button className="btn btn-outline-secondary btn-sm" onClick={async () => {
                                    try {
                                        const r = await api.get(`/releve-annuel/${eleveId}/${encodeURIComponent(annee)}`, { responseType: 'blob', timeout: 90000 });
                                        const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
                                        const a = document.createElement('a');
                                        a.href = url; a.download = `releve_annuel_${annee.replace('/', '-')}.pdf`; a.click();
                                        URL.revokeObjectURL(url);
                                    } catch (err) { toast.error(await lireErreurBlob(err)); }
                                }}>
                                    <i className="fas fa-list-alt me-1"></i> Relevé annuel
                                </button>
                            ) : null;
                        })()}
                    </div>
                </div>

                {/* Affichage du bulletin */}
                {bulletin && (
                    <div>
                        <div className="bg-light p-3 rounded mb-3 border">
                            <div className="row">
                                <div className="col-md-6">
                                    <strong>{bulletin.eleve.nom_eleve} {bulletin.eleve.prenoms_eleve}</strong>
                                    <span className="text-muted ms-2">({bulletin.eleve.matricule_eleve})</span>
                                </div>
                                <div className="col-md-6 text-end">
                                    Classe : <strong>{bulletin.eleve.classe?.nom_classe}</strong>
                                </div>
                            </div>
                        </div>

                        {Object.keys(bulletin.parMatiere).length === 0 ? (
                            <div className="alert alert-info">Aucune note disponible pour cette période.</div>
                        ) : (
                            <table className="table table-bordered table-sm">
                                <thead className="table-dark">
                                    <tr>
                                        <th>Matière</th>
                                        <th style={{ width: 60 }} className="text-center">Coeff</th>
                                        <th>Notes</th>
                                        <th style={{ width: 100 }}>Moyenne</th>
                                        <th style={{ width: 130 }}>Appréciation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(bulletin.parMatiere).map(([matiere, info]) => (
                                        <tr key={matiere}>
                                            <td className="fw-bold">{matiere}</td>
                                            <td className="text-center text-muted">{info.coeff_matiere ?? 1}</td>
                                            <td>
                                                {info.notes.map((n, i) => (
                                                    <span key={i} className="me-2">
                                                        <small className="text-muted">{n.type}(×{n.coeff})</small> : <strong>{n.note ?? '—'}</strong>
                                                    </span>
                                                ))}
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge ${BADGE_MOY(info.moyenne)}`}>
                                                    {info.moyenne !== null ? `${info.moyenne}/20` : '—'}
                                                </span>
                                            </td>
                                            <td>{mention(info.moyenne)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="table-secondary">
                                    <tr>
                                        <td colSpan={3} className="text-end fw-bold">Moyenne générale pondérée</td>
                                        <td className="text-center">
                                            <span className={`badge ${BADGE_MOY(parseFloat(moy))} fs-6`}>{moy}/20</span>
                                        </td>
                                        <td className="fw-bold">{mention(parseFloat(moy))}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        )}
                    </div>
                )}

                <hr className="my-4" />
                <ExportBulletinsClasse niveaux={niveaux} periodes={periodes} />
                <ExportMoyennes niveaux={niveaux} periodes={periodes} />
            </div>
        </section>
    );
};

export default Bulletin;
