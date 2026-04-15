import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const BADGE = { soldé: 'bg-success', partiel: 'bg-warning text-dark', impayé: 'bg-danger' };

const RecapPaiements = () => {
    const { toast } = useToast();
    const [niveaux, setNiveaux]     = useState([]);
    const [niveauId, setNiveauId]   = useState('');

    const exportCsv = async () => {
        try {
            const r = await api.get(`/paiements/export?niveau_id=${niveauId}`, { responseType: 'blob' });
            const url  = URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }));
            const lien = document.createElement('a');
            lien.href = url; lien.download = `paiements_niveau_${niveauId}_${new Date().toISOString().slice(0,10)}.csv`; lien.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Impossible d\'exporter les paiements.');
        }
    };
    const [recap, setRecap]         = useState([]);
    const [chargement, setChargement] = useState(false);

    useEffect(() => {
        api.get('/niveaux').then((r) => setNiveaux(r.data)).catch((err) => console.error('Erreur chargement:', err));
    }, []);

    const chargerRecap = (id) => {
        if (!id) { setRecap([]); return; }
        setChargement(true);
        api.get(`/paiementsNiveau/${id}`)
            .then((r) => { setRecap(r.data); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger le récapitulatif.'); setChargement(false); });
    };

    const totalDu    = recap.reduce((s, r) => s + r.total_du, 0);
    const totalPaye  = recap.reduce((s, r) => s + r.total_paye, 0);
    const totalSolde = recap.reduce((s, r) => s + r.solde, 0);

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Récapitulatif des paiements par niveau</h4>
                    <div className="d-flex gap-2">
                        {niveauId && (
                            <button className="btn btn-outline-success btn-sm" onClick={exportCsv}>
                                <i className="fas fa-file-csv me-1" />Export CSV
                            </button>
                        )}
                        <NavLink to="/Paiements" className="btn btn-secondary btn-sm">Retour aux paiements</NavLink>
                    </div>
                </div>

                <div className="row mb-3">
                    <div className="col-md-4">
                        <select className="form-select form-select-sm" value={niveauId} onChange={(e) => { setNiveauId(e.target.value); chargerRecap(e.target.value); }}>
                            <option value="">Sélectionner un niveau</option>
                            {niveaux.map((n) => <option key={n.id} value={n.id}>{n.nom_niveau}</option>)}
                        </select>
                    </div>
                </div>

                {chargement && (
                    <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
                )}

                {!chargement && recap.length > 0 && (
                    <>
                        {/* Résumé global */}
                        <div className="row mb-3">
                            <div className="col-md-4">
                                <div className="card border-primary text-center">
                                    <div className="card-body py-2">
                                        <div className="text-muted small">Total dû</div>
                                        <h5 className="mb-0">{totalDu.toLocaleString('fr-FR')} FCFA</h5>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card border-success text-center">
                                    <div className="card-body py-2">
                                        <div className="text-muted small">Total payé</div>
                                        <h5 className="mb-0 text-success">{totalPaye.toLocaleString('fr-FR')} FCFA</h5>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card border-danger text-center">
                                    <div className="card-body py-2">
                                        <div className="text-muted small">Solde restant</div>
                                        <h5 className="mb-0 text-danger">{totalSolde.toLocaleString('fr-FR')} FCFA</h5>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <table className="table table-striped table-sm">
                            <thead className="table-light">
                                <tr>
                                    <th>#</th>
                                    <th>Matricule</th>
                                    <th>Élève</th>
                                    <th>Classe</th>
                                    <th>Total dû</th>
                                    <th>Total payé</th>
                                    <th>Solde</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recap.map((r, i) => (
                                    <tr key={r.eleve_id}>
                                        <td>{i + 1}</td>
                                        <td>{r.matricule}</td>
                                        <td>{r.nom}</td>
                                        <td>{r.classe}</td>
                                        <td>{r.total_du.toLocaleString('fr-FR')}</td>
                                        <td>{r.total_paye.toLocaleString('fr-FR')}</td>
                                        <td className={r.solde > 0 ? 'text-danger fw-bold' : 'text-success'}>
                                            {r.solde.toLocaleString('fr-FR')}
                                        </td>
                                        <td><span className={`badge ${BADGE[r.statut]}`}>{r.statut}</span></td>
                                        <td>
                                            <NavLink to={`/PaiementsEleve/${r.eleve_id}`} className="btn btn-info btn-sm">
                                                Détail
                                            </NavLink>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}

                {!chargement && niveauId && recap.length === 0 && (
                    <p className="text-muted text-center py-3">Aucun élève trouvé pour ce niveau.</p>
                )}
            </div>
        </section>
    );
};

export default RecapPaiements;
