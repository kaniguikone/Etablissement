import React, { useRef, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import Pagination from '../shared/Pagination';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ListeScolarites = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const location = useLocation();
    const [scolarites, setScolarites] = useState([]);
    const [niveaux, setNiveaux] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [filtreNiveau, setFiltreNiveau] = useState('');
    const [chargement, setChargement] = useState(true);
    const [importEnCours, setImportEnCours] = useState(false);
    const [rapportImport, setRapportImport] = useState(null);
    const inputFichier = useRef(null);

    useEffect(() => {
        listerScolarites(1);
        api.get('/niveaux').then((res) => setNiveaux(res.data)).catch(() => toast.error('Erreur de chargement des données.'));
    }, [location.key]);

    const listerScolarites = (page = 1) => {
        setChargement(true);
        api.get(`/scolarites?page=${page}`)
            .then((res) => {
                setScolarites(res.data.data);
                setLastPage(res.data.last_page);
                setCurrentPage(res.data.current_page);
                setChargement(false);
            })
            .catch(() => {
                toast.error('Impossible de charger les scolarités.');
                setChargement(false);
            });
    };

    const handleNiveauChange = (e) => {
        const val = e.target.value;
        setFiltreNiveau(val);
        if (val === '') {
            listerScolarites(1);
        } else {
            setChargement(true);
            api.get(`/scolaritesNiveau/${val}`)
                .then((res) => {
                    setScolarites(res.data);
                    setLastPage(1);
                    setCurrentPage(1);
                    setChargement(false);
                })
                .catch(() => {
                    toast.error('Impossible de filtrer les scolarités.');
                    setChargement(false);
                });
        }
    };

    const supprimerScolarite = async (id) => {
        if (!await confirmer('Confirmer la suppression ?')) return;
        api.delete(`/scolarites/${id}`)
            .then(() => listerScolarites(currentPage))
            .catch(() => toast.error('Impossible de supprimer cette scolarité.'));
    };

    const telechargerModele = () => {
        api.get('/scolarites/import/template', { responseType: 'blob' })
            .then((res) => {
                const url = URL.createObjectURL(res.data);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'modele_scolarites.xlsx';
                a.click();
                URL.revokeObjectURL(url);
            })
            .catch(() => toast.error('Impossible de télécharger le modèle.'));
    };

    const handleFichierChange = (e) => {
        const fichier = e.target.files[0];
        if (!fichier) return;
        setImportEnCours(true);
        setRapportImport(null);
        const formData = new FormData();
        formData.append('fichier', fichier);
        api.post('/scolarites/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then((res) => {
                setRapportImport(res.data);
                if (res.data.inseres > 0) listerScolarites(1);
                if (res.data.erreurs?.length === 0) toast.success(res.data.message);
                else toast.warning(res.data.message);
            })
            .catch((err) => {
                toast.error(err.response?.data?.message || 'Erreur lors de l\'import.');
            })
            .finally(() => {
                setImportEnCours(false);
                e.target.value = '';
            });
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-money-bill-wave me-2 text-primary" />
                        Scolarités
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{scolarites.length > 0 ? (currentPage - 1) * 15 + scolarites.length : 0}</span>
                    </h4>
                    <div className="d-flex gap-2">
                        <button className="btn btn-outline-success btn-sm" onClick={telechargerModele} title="Télécharger le modèle Excel">
                            <i className="fas fa-file-excel me-1" />Modèle Excel
                        </button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => inputFichier.current?.click()} disabled={importEnCours}>
                            {importEnCours
                                ? <><span className="spinner-border spinner-border-sm me-1" />Import…</>
                                : <><i className="fas fa-file-upload me-1" />Importer Excel</>}
                        </button>
                        <input ref={inputFichier} type="file" accept=".xlsx,.xls,.csv" className="d-none" onChange={handleFichierChange} />
                        <NavLink to="/NouvelleScolarite" className="btn btn-primary btn-sm">
                            <i className="fas fa-plus me-1" />Nouvelle scolarité
                        </NavLink>
                    </div>
                </div>

                {rapportImport && (
                    <div className={`alert ${rapportImport.erreurs?.length > 0 ? 'alert-warning' : 'alert-success'} alert-dismissible py-2`}>
                        <strong>{rapportImport.message}</strong>
                        {rapportImport.erreurs?.length > 0 && (
                            <ul className="mb-0 mt-1 small">
                                {rapportImport.erreurs.map((e, i) => (
                                    <li key={i}>Ligne {e.ligne} : {e.erreurs.join(', ')}</li>
                                ))}
                            </ul>
                        )}
                        <button type="button" className="btn-close" onClick={() => setRapportImport(null)} />
                    </div>
                )}
                <div className="row mb-2">
                    <div className="col-md-4">
                        <select className="form-select form-select-sm" value={filtreNiveau} onChange={handleNiveauChange}>
                            <option value="">Tous les niveaux</option>
                            {niveaux.map((n) => (
                                <option key={n.id} value={n.id}>{n.nom_niveau}</option>
                            ))}
                        </select>
                    </div>
                </div>
                {chargement ? (
                    <div className="text-center my-4">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Chargement...</span>
                        </div>
                    </div>
                ) : (
                    <table className="table table-striped table-sm">
                        <thead className="table-light">
                            <tr>
                                <th>#</th>
                                <th>Libellé échéance</th>
                                <th>Date échéance</th>
                                <th>Montant</th>
                                <th>Niveau</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scolarites.map((scolarite, i) => (
                                <tr key={scolarite.id}>
                                    <td>{(currentPage - 1) * 15 + i + 1}</td>
                                    <td>{scolarite.libelle_echeance}</td>
                                    <td>{scolarite.date_echeance}</td>
                                    <td>{scolarite.montant_echeance}</td>
                                    <td>{scolarite.niveau?.nom_niveau}</td>
                                    <td>
                                        <NavLink to={`/DetailsScolarite/${scolarite.id}`} className="btn btn-primary btn-sm me-1">Voir</NavLink>
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => supprimerScolarite(scolarite.id)}>Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {lastPage > 1 && (
                    <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={listerScolarites} />
                )}
            </div>
        </section>
    );
};

export default ListeScolarites;
