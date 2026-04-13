import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const lireErreurBlob = async (err) => {
    if (err.response?.data instanceof Blob) {
        try {
            const texte = await err.response.data.text();
            const json  = JSON.parse(texte);
            return json.message || 'Erreur lors de la génération du PDF.';
        } catch {
            return 'Erreur lors de la génération du PDF.';
        }
    }
    return err.response?.data?.message || 'Erreur inconnue.';
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
        api.get('/niveaux').then((r) => setNiveaux(r.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get('/periodes').then((r) => setPeriodes(r.data)).catch((err) => console.error('Erreur chargement:', err));
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
            api.get(`/classesNiveaux/${val}`).then((r) => setClasses(r.data)).catch((err) => console.error('Erreur chargement:', err));
        }
    };

    const handleClasseChange = (e) => {
        const val = e.target.value;
        setClasseId(val);
        setEleveId('');
        setEleves([]);
        setBulletin(null);
        if (val) {
            api.get(`/elevesClasse/${val}`).then((r) => setEleves(r.data.data ?? r.data)).catch((err) => console.error('Erreur chargement:', err));
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
            const r = await api.get(`/bulletin/${eleveId}/${periodeId}/pdf`, { responseType: 'blob' });
            const url  = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
            const lien = document.createElement('a');
            lien.href  = url;
            lien.download = `bulletin_${bulletin.eleve.nom_eleve}_${bulletin.eleve.prenoms_eleve}.pdf`.toLowerCase().replace(/\s+/g, '_');
            lien.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast.error(await lireErreurBlob(err));
        }
    };

    const moyenneGenerale = () => {
        if (!bulletin) return null;
        const moyennes = Object.values(bulletin.parMatiere)
            .map((m) => m.moyenne)
            .filter((m) => m !== null);
        if (!moyennes.length) return null;
        return (moyennes.reduce((s, m) => s + m, 0) / moyennes.length).toFixed(2);
    };

    const moy = moyenneGenerale();

    return (
        <section className="content content-wrapper">
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
                                <i className="fas fa-file-pdf me-1"></i> Télécharger PDF
                            </button>
                        )}
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
                                        <th>Notes</th>
                                        <th style={{ width: 100 }}>Moyenne</th>
                                        <th style={{ width: 130 }}>Appréciation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(bulletin.parMatiere).map(([matiere, info]) => (
                                        <tr key={matiere}>
                                            <td className="fw-bold">{matiere}</td>
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
                                        <td colSpan={2} className="text-end fw-bold">Moyenne générale</td>
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
            </div>
        </section>
    );
};

export default Bulletin;
