import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from 'react-router-dom';
import api, { backendUrl } from "../../api/axios";
import Pagination from "../shared/Pagination";
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ListeEleves = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const location = useLocation();
    const [eleves, setEleves] = useState([]);
    const [niveaux, setNiveaux] = useState([]);
    const [classes, setClasses] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [filtreNiveau, setFiltreNiveau] = useState('');
    const [filtreClasse, setFiltreClasse] = useState('');
    const [recherche, setRecherche] = useState('');
    const [chargement, setChargement] = useState(true);
    const [importEnCours, setImportEnCours] = useState(false);
    const [rapportImport, setRapportImport] = useState(null);
    const inputFichier = useRef(null);

    useEffect(() => {
        charger(1, '', '', '');
        api.get('/niveaux').then((res) => setNiveaux(res.data)).catch(() => toast.error('Erreur de chargement des données.'));
        api.get('/classesTout').then((res) => setClasses(res.data)).catch(() => toast.error('Erreur de chargement des données.'));
    }, [location.key]);

    const charger = (page, niveau, classe, search) => {
        setChargement(true);
        let url;
        if (classe) {
            url = `/elevesClasse/${classe}?page=${page}`;
        } else if (niveau) {
            url = `/elevesNiveau/${niveau}?page=${page}`;
        } else {
            url = `/eleves?page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
        }
        api.get(url)
            .then((res) => {
                setEleves(res.data.data ?? res.data);
                setLastPage(res.data.last_page ?? 1);
                setCurrentPage(res.data.current_page ?? 1);
                setTotal(res.data.total ?? 0);
                setChargement(false);
            })
            .catch(() => { toast.error('Impossible de charger les élèves.'); setChargement(false); });
    };

    const handleNiveauChange = (e) => {
        const val = e.target.value;
        setFiltreNiveau(val);
        setFiltreClasse('');
        setRecherche('');
        api.get(val ? `/classesNiveaux/${val}` : '/classesTout')
            .then((res) => setClasses(res.data)).catch(() => toast.error('Erreur de chargement des données.'));
        charger(1, val, '', '');
    };

    const handleClasseChange = (e) => {
        const val = e.target.value;
        setFiltreClasse(val);
        setRecherche('');
        charger(1, filtreNiveau, val, '');
    };

    const handleRecherche = (e) => {
        const val = e.target.value;
        setRecherche(val);
        setFiltreNiveau('');
        setFiltreClasse('');
        charger(1, '', '', val);
    };

    const handlePagination = (page) => {
        charger(page, filtreNiveau, filtreClasse, recherche);
    };

    const supprimerEleve = async (id) => {
        if (!await confirmer('Confirmer la suppression ?')) return;
        api.delete(`/eleves/${id}`)
            .then(() => handlePagination(currentPage))
            .catch(() => toast.error('Impossible de supprimer cet élève.'));
    };

    const telechargerModele = () => {
        api.get('/eleves/import/template', { responseType: 'blob' })
            .then((res) => {
                const url = URL.createObjectURL(res.data);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'modele_eleves.xlsx';
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
        api.post('/eleves/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then((res) => {
                setRapportImport(res.data);
                if (res.data.inseres > 0) charger(1, filtreNiveau, filtreClasse, recherche);
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

    const exportCsv = async () => {
        try {
            const params = new URLSearchParams();
            if (filtreClasse) params.append('classe_id', filtreClasse);
            else if (filtreNiveau) params.append('niveau_id', filtreNiveau);
            if (recherche) params.append('search', recherche);
            const r = await api.get(`/eleves/export?${params}`, { responseType: 'blob' });
            const url  = URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }));
            const lien = document.createElement('a');
            lien.href = url; lien.download = `eleves_${new Date().toISOString().slice(0,10)}.csv`; lien.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Impossible d\'exporter la liste des élèves.');
        }
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-user-graduate me-2 text-primary" />
                        Élèves
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{total}</span>
                    </h4>
                    <div className="d-flex gap-2 flex-wrap">
                        <button className="btn btn-outline-success btn-sm" onClick={telechargerModele}>
                            <i className="fas fa-file-excel me-1" />Modèle élèves
                        </button>
                        <button className="btn btn-outline-primary btn-sm" onClick={() => inputFichier.current?.click()} disabled={importEnCours}>
                            {importEnCours
                                ? <><span className="spinner-border spinner-border-sm me-1" />Import…</>
                                : <><i className="fas fa-file-upload me-1" />Importer élèves</>}
                        </button>
                        <input ref={inputFichier} type="file" accept=".xlsx,.xls,.csv" className="d-none" onChange={handleFichierChange} />
                        <div className="vr" />
                        <button className="btn btn-outline-secondary btn-sm" onClick={exportCsv}>
                            <i className="fas fa-file-csv me-1" />Export CSV
                        </button>
                        <NavLink to="/NouvelEleve" className="btn btn-primary btn-sm">
                            <i className="fas fa-plus me-1" />Ajouter un élève
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

                <div className="row g-2 mb-3">
                    <div className="col-md-4">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Rechercher par nom, prénoms ou matricule…"
                            value={recherche}
                            onChange={handleRecherche}
                        />
                    </div>
                    <div className="col-md-4">
                        <select className="form-select form-select-sm" value={filtreNiveau} onChange={handleNiveauChange}>
                            <option value="">Tous les niveaux</option>
                            {niveaux.map((n) => (
                                <option key={n.id} value={n.id}>{n.nom_niveau}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <select className="form-select form-select-sm" value={filtreClasse} onChange={handleClasseChange}>
                            <option value="">Toutes les classes</option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>{c.nom_classe}</option>
                            ))}
                        </select>
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
                                <th>Photo</th>
                                <th>Matricule</th>
                                <th>Nom</th>
                                <th>Prénoms</th>
                                <th>Date de naissance</th>
                                <th>Classe</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {eleves.length === 0 && (
                                <tr><td colSpan={8} className="text-center text-muted py-3">Aucun élève trouvé.</td></tr>
                            )}
                            {eleves.map((eleve, i) => (
                                <tr key={eleve.id}>
                                    <td>{(currentPage - 1) * 15 + i + 1}</td>
                                    <td>
                                        {eleve.photo_url
                                            ? <img src={backendUrl(eleve.photo_url)} alt="" className="rounded-circle" style={{ width: 32, height: 32, objectFit: 'cover' }} />
                                            : <div className="rounded-circle bg-secondary d-inline-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }}>
                                                <i className="fas fa-user text-white" style={{ fontSize: 12 }} />
                                              </div>
                                        }
                                    </td>
                                    <td>{eleve.matricule_eleve}</td>
                                    <td>{eleve.nom_eleve}</td>
                                    <td>{eleve.prenoms_eleve}</td>
                                    <td>{eleve.date_naissance_eleve}</td>
                                    <td>{eleve.classe?.abbr_classe}</td>
                                    <td>
                                        <NavLink to={`/DetailsEleve/${eleve.id}`} className="btn btn-primary btn-sm me-1">Voir</NavLink>
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => supprimerEleve(eleve.id)}>Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={handlePagination} />
            </div>
        </section>
    );
};

export default ListeEleves;
