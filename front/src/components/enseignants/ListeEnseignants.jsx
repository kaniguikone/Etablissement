import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import api from "../../api/axios";
import Pagination from '../shared/Pagination';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ListeEnseignants = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const location = useLocation();
    const [enseignants, setEnseignants] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [recherche, setRecherche] = useState('');
    const [chargement, setChargement] = useState(true);
    const [importEnCours, setImportEnCours] = useState(false);
    const [rapportImport, setRapportImport] = useState(null);
    const [importAffEnCours, setImportAffEnCours] = useState(false);
    const [rapportAff, setRapportAff] = useState(null);
    const inputFichier    = useRef(null);
    const inputFichierAff = useRef(null);

    useEffect(() => {
        charger(1, '');
    }, [location.key]);

    const charger = (page, search) => {
        setChargement(true);
        const params = `page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
        api.get(`/enseignants?${params}`)
            .then((res) => {
                setEnseignants(res.data.data);
                setLastPage(res.data.last_page);
                setCurrentPage(res.data.current_page);
                setChargement(false);
            })
            .catch(() => {
                toast.error('Impossible de charger les enseignants.');
                setChargement(false);
            });
    };

    const handleRecherche = (e) => {
        const val = e.target.value;
        setRecherche(val);
        charger(1, val);
    };

    const supprimerEnseignant = async (id) => {
        if (!await confirmer('Confirmer la suppression ?')) return;
        api.delete(`/enseignants/${id}`)
            .then(() => charger(currentPage, recherche))
            .catch(() => toast.error('Impossible de supprimer cet enseignant.'));
    };

    const telechargerModele = () => {
        api.get('/enseignants/import/template', { responseType: 'blob' })
            .then((res) => {
                const url = URL.createObjectURL(res.data);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'modele_enseignants.xlsx';
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
        api.post('/enseignants/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then((res) => {
                setRapportImport(res.data);
                if (res.data.inseres > 0) charger(1, recherche);
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

    const telechargerModeleAff = () => {
        api.get('/affectations/import/template', { responseType: 'blob' })
            .then((res) => {
                const url = URL.createObjectURL(res.data);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'modele_affectations.xlsx';
                a.click();
                URL.revokeObjectURL(url);
            })
            .catch(() => toast.error('Impossible de télécharger le modèle des affectations.'));
    };

    const handleFichierAffChange = (e) => {
        const fichier = e.target.files[0];
        if (!fichier) return;
        setImportAffEnCours(true);
        setRapportAff(null);
        const formData = new FormData();
        formData.append('fichier', fichier);
        api.post('/affectations/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then((res) => {
                setRapportAff(res.data);
                if (res.data.erreurs?.length === 0) toast.success(res.data.message);
                else toast.warning(res.data.message);
            })
            .catch((err) => toast.error(err.response?.data?.message || 'Erreur lors de l\'import des affectations.'))
            .finally(() => {
                setImportAffEnCours(false);
                e.target.value = '';
            });
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-chalkboard-teacher me-2 text-primary" />
                        Enseignants
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{enseignants.length > 0 ? (currentPage - 1) * 10 + enseignants.length : 0}</span>
                    </h4>
                    <div className="d-flex gap-2 flex-wrap">
                        <div className="d-flex gap-1" title="Enseignants">
                            <button className="btn btn-outline-success btn-sm" onClick={telechargerModele}>
                                <i className="fas fa-file-excel me-1" />Modèle enseignants
                            </button>
                            <button className="btn btn-outline-primary btn-sm" onClick={() => inputFichier.current?.click()} disabled={importEnCours}>
                                {importEnCours
                                    ? <><span className="spinner-border spinner-border-sm me-1" />Import…</>
                                    : <><i className="fas fa-file-upload me-1" />Importer enseignants</>}
                            </button>
                            <input ref={inputFichier} type="file" accept=".xlsx,.xls,.csv" className="d-none" onChange={handleFichierChange} />
                        </div>
                        <div className="vr" />
                        <div className="d-flex gap-1" title="Affectations">
                            <button className="btn btn-outline-success btn-sm" onClick={telechargerModeleAff}>
                                <i className="fas fa-file-excel me-1" />Modèle affectations
                            </button>
                            <button className="btn btn-outline-primary btn-sm" onClick={() => inputFichierAff.current?.click()} disabled={importAffEnCours}>
                                {importAffEnCours
                                    ? <><span className="spinner-border spinner-border-sm me-1" />Import…</>
                                    : <><i className="fas fa-file-upload me-1" />Importer affectations</>}
                            </button>
                            <input ref={inputFichierAff} type="file" accept=".xlsx,.xls,.csv" className="d-none" onChange={handleFichierAffChange} />
                        </div>
                        <NavLink to='/NouvelEnseignant' className='btn btn-primary btn-sm'>
                            <i className="fas fa-plus me-1" />Ajouter un enseignant
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

                {rapportAff && (
                    <div className={`alert ${rapportAff.erreurs?.length > 0 ? 'alert-warning' : 'alert-success'} alert-dismissible py-2`}>
                        <strong>{rapportAff.message}</strong>
                        {rapportAff.erreurs?.length > 0 && (
                            <ul className="mb-0 mt-1 small">
                                {rapportAff.erreurs.map((e, i) => (
                                    <li key={i}>Ligne {e.ligne} : {e.erreurs.join(', ')}</li>
                                ))}
                            </ul>
                        )}
                        <button type="button" className="btn-close" onClick={() => setRapportAff(null)} />
                    </div>
                )}

                <div className="row g-2 mb-3">
                    <div className="col-md-5">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Rechercher par nom, prénoms ou matricule…"
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
                    <table className="table table-striped table-sm text-left">
                        <thead className="table-light">
                            <tr>
                                <th>#</th>
                                <th>Matricule</th>
                                <th>Nom</th>
                                <th>Prénoms</th>
                                <th>Matières</th>
                                <th>Classes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enseignants.length === 0 && (
                                <tr><td colSpan={7} className="text-center text-muted py-3">Aucun enseignant trouvé.</td></tr>
                            )}
                            {enseignants.map((enseignant, i) => (
                                <tr key={enseignant.id}>
                                    <td>{(currentPage - 1) * 10 + i + 1}</td>
                                    <td>{enseignant.matricule_enseignant}</td>
                                    <td>{enseignant.nom_enseignant}</td>
                                    <td>{enseignant.prenoms_enseignant}</td>
                                    <td>
                                        {enseignant.matieres?.map((m) => (
                                            <span key={m.id} className="badge bg-secondary me-1">{m.libelle_matiere}</span>
                                        ))}
                                    </td>
                                    <td>
                                        {enseignant.classes?.map((c) => (
                                            <span key={c.id} className="badge bg-info text-dark me-1">{c.abbr_classe}</span>
                                        ))}
                                    </td>
                                    <td>
                                        <NavLink to={`/DetailsEnseignant/${enseignant.id}`} className="btn btn-primary btn-sm me-1">Voir</NavLink>
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => supprimerEnseignant(enseignant.id)}>Supprimer</button>
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

export default ListeEnseignants;
