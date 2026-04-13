import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../../api/axios';
import Pagination from '../shared/Pagination';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const MODES = { especes: 'Espèces', cheque: 'Chèque', virement: 'Virement', autre: 'Autre' };

const telechargerFichier = async (apiUrl, nomFichier, type = 'application/octet-stream') => {
    const r = await api.get(apiUrl, { responseType: 'blob' });
    const url  = URL.createObjectURL(new Blob([r.data], { type }));
    const lien = document.createElement('a');
    lien.href = url; lien.download = nomFichier; lien.click();
    URL.revokeObjectURL(url);
};

const ListePaiements = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const [paiements, setPaiements]     = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage]       = useState(1);
    const [recherche, setRecherche]     = useState('');
    const [chargement, setChargement]   = useState(true);

    useEffect(() => { charger(1, ''); }, []);

    const charger = (page, search) => {
        setChargement(true);
        const params = `page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
        api.get(`/paiements?${params}`)
            .then((res) => {
                setPaiements(res.data.data);
                setLastPage(res.data.last_page);
                setCurrentPage(res.data.current_page);
                setChargement(false);
            })
            .catch(() => { toast.error('Impossible de charger les paiements.'); setChargement(false); });
    };

    const handleRecherche = (e) => {
        const val = e.target.value;
        setRecherche(val);
        charger(1, val);
    };

    const supprimer = async (id) => {
        if (!await confirmer('Confirmer la suppression de ce paiement ?')) return;
        api.delete(`/paiements/${id}`)
            .then(() => charger(currentPage, recherche))
            .catch(() => toast.error('Impossible de supprimer ce paiement.'));
    };

    const recuPdf = async (id) => {
        try {
            await telechargerFichier(`/paiements/${id}/recu`, `recu_${String(id).padStart(6, '0')}.pdf`, 'application/pdf');
        } catch {
            toast.error('Impossible de télécharger le reçu.');
        }
    };

    const exportCsv = async () => {
        try {
            const params = recherche ? `?search=${encodeURIComponent(recherche)}` : '';
            await telechargerFichier(`/paiements/export${params}`, `paiements_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
        } catch {
            toast.error('Impossible d\'exporter les paiements.');
        }
    };

    return (
        <section className="content content-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-hand-holding-usd me-2 text-primary" />
                        Paiements
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{paiements.length > 0 ? (currentPage - 1) * 20 + paiements.length : 0}</span>
                    </h4>
                    <div className="d-flex gap-2 flex-wrap">
                        <button className="btn btn-outline-success btn-sm" onClick={exportCsv}>
                            <i className="fas fa-file-csv me-1" />Export CSV
                        </button>
                        <NavLink to="/Impayes" className="btn btn-outline-danger btn-sm">
                            <i className="fas fa-exclamation-circle me-1" />Impayés
                        </NavLink>
                        <NavLink to="/RecapPaiements" className="btn btn-outline-secondary btn-sm">Récap par niveau</NavLink>
                        <NavLink to="/NouveauPaiement" className="btn btn-primary btn-sm">Enregistrer un paiement</NavLink>
                    </div>
                </div>

                <div className="row g-2 mb-3">
                    <div className="col-md-5">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Rechercher par nom ou matricule de l'élève…"
                            value={recherche}
                            onChange={handleRecherche}
                        />
                    </div>
                </div>

                {chargement ? (
                    <div className="text-center my-4">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Chargement…</span>
                        </div>
                    </div>
                ) : (
                    <table className="table table-striped table-sm">
                        <thead className="table-light">
                            <tr>
                                <th>#</th>
                                <th>Date</th>
                                <th>Élève</th>
                                <th>Échéance</th>
                                <th>Montant payé</th>
                                <th>Mode</th>
                                <th>Référence</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paiements.length === 0 && (
                                <tr><td colSpan={8} className="text-center text-muted py-3">Aucun paiement trouvé.</td></tr>
                            )}
                            {paiements.map((p, i) => (
                                <tr key={p.id}>
                                    <td>{(currentPage - 1) * 20 + i + 1}</td>
                                    <td>{p.date_paiement}</td>
                                    <td>{p.eleve?.nom_eleve} {p.eleve?.prenoms_eleve}</td>
                                    <td>{p.scolarite?.libelle_echeance}</td>
                                    <td className="fw-bold">{Number(p.montant_paye).toLocaleString('fr-FR')}</td>
                                    <td>{MODES[p.mode_paiement]}</td>
                                    <td className="text-muted small">{p.reference_paiement}</td>
                                    <td>
                                        <button className="btn btn-outline-secondary btn-sm me-1" onClick={() => recuPdf(p.id)} title="Télécharger le reçu PDF">
                                            <i className="fas fa-file-pdf" />
                                        </button>
                                        <NavLink to={`/DetailsPaiement/${p.id}`} className="btn btn-primary btn-sm me-1">Modifier</NavLink>
                                        <button className="btn btn-danger btn-sm" onClick={() => supprimer(p.id)}>Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={(page) => charger(page, recherche)} />
            </div>
        </section>
    );
};

export default ListePaiements;
