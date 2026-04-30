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

const Attestation = () => {
    const { toast } = useToast();
    const [niveaux, setNiveaux] = useState([]);
    const [classes, setClasses] = useState([]);
    const [eleves,  setEleves]  = useState([]);

    const [niveauId, setNiveauId] = useState('');
    const [classeId, setClasseId] = useState('');
    const [eleveId,  setEleveId]  = useState('');
    const [eleve,    setEleve]    = useState(null);

    const [chargement,     setChargement]     = useState(false);
    const [telechargement, setTelechargement] = useState(false);

    useEffect(() => {
        api.get('/niveaux').then((r) => setNiveaux(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
    }, []);

    const handleNiveauChange = (e) => {
        const val = e.target.value;
        setNiveauId(val);
        setClasseId('');
        setEleveId('');
        setClasses([]);
        setEleves([]);
        setEleve(null);
        if (val) {
            api.get(`/classesNiveaux/${val}`).then((r) => setClasses(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
        }
    };

    const handleClasseChange = (e) => {
        const val = e.target.value;
        setClasseId(val);
        setEleveId('');
        setEleves([]);
        setEleve(null);
        if (val) {
            api.get(`/elevesClasse/${val}`).then((r) => setEleves(r.data.data ?? r.data)).catch(() => toast.error('Erreur de chargement des données.'));
        }
    };

    const handleEleveChange = (e) => {
        const val = e.target.value;
        setEleveId(val);
        setEleve(null);
        if (val) {
            setChargement(true);
            api.get(`/eleves/${val}`)
                .then((r) => { setEleve(r.data); setChargement(false); })
                .catch(() => { toast.error('Impossible de charger les données de l\'élève.'); setChargement(false); });
        }
    };

    const telechargerPdf = async () => {
        setTelechargement(true);
        try {
            const r = await api.get(`/attestation/${eleveId}/scolarite/pdf`, { responseType: 'blob' });
            const url  = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
            const lien = document.createElement('a');
            lien.href  = url;
            lien.download = `attestation_scolarite_${eleve.nom_eleve}_${eleve.prenoms_eleve}.pdf`.toLowerCase().replace(/\s+/g, '_');
            lien.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast.error(await lireErreurBlob(err));
        } finally {
            setTelechargement(false);
        }
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Attestation de scolarité</h4>
                </div>

                {/* Sélection en cascade */}
                <div className="row g-3 mb-4 align-items-end">
                    <div className="col-md-4">
                        <label className="form-label">Niveau</label>
                        <select className="form-select form-select-sm" value={niveauId} onChange={handleNiveauChange}>
                            <option value="">— Niveau —</option>
                            {niveaux.map((n) => (
                                <option key={n.id} value={n.id}>{n.nom_niveau}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">Classe</label>
                        <select className="form-select form-select-sm" value={classeId} onChange={handleClasseChange} disabled={!niveauId}>
                            <option value="">— Classe —</option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>{c.nom_classe}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">Élève</label>
                        <select className="form-select form-select-sm" value={eleveId} onChange={handleEleveChange} disabled={!classeId}>
                            <option value="">— Élève —</option>
                            {eleves.map((e) => (
                                <option key={e.id} value={e.id}>{e.nom_eleve} {e.prenoms_eleve} — {e.matricule_eleve}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {chargement && (
                    <div className="text-center py-3">
                        <span className="spinner-border spinner-border-sm me-2" />
                        Chargement…
                    </div>
                )}

                {/* Aperçu et téléchargement */}
                {eleve && (
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                            <span>
                                <i className="fas fa-user-graduate me-2" />
                                {eleve.nom_eleve} {eleve.prenoms_eleve}
                            </span>
                            <span className="badge bg-secondary">{eleve.matricule_eleve}</span>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-6">
                                    <table className="table table-sm table-borderless mb-0">
                                        <tbody>
                                            <tr>
                                                <td className="fw-bold text-muted" style={{ width: 160 }}>Classe</td>
                                                <td>{eleve.classe?.nom_classe ?? '—'}</td>
                                            </tr>
                                            <tr>
                                                <td className="fw-bold text-muted">Niveau</td>
                                                <td>{eleve.classe?.niveau?.nom_niveau ?? '—'}</td>
                                            </tr>
                                            {eleve.date_naissance_eleve && (
                                                <tr>
                                                    <td className="fw-bold text-muted">Date de naissance</td>
                                                    <td>{eleve.date_naissance_eleve}</td>
                                                </tr>
                                            )}
                                            {eleve.lieu_naissance_eleve && (
                                                <tr>
                                                    <td className="fw-bold text-muted">Lieu de naissance</td>
                                                    <td>{eleve.lieu_naissance_eleve}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div className="card-footer bg-light d-flex gap-2">
                            <button className="btn btn-danger btn-sm" onClick={telechargerPdf} disabled={telechargement}>
                                {telechargement
                                    ? <><span className="spinner-border spinner-border-sm me-1" /> Génération…</>
                                    : <><i className="fas fa-file-pdf me-1" /> Télécharger l'attestation PDF</>
                                }
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default Attestation;
