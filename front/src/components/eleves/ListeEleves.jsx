import React, { useState, useEffect, useCallback } from "react";
import { NavLink } from 'react-router-dom';
import api, { backendUrl } from "../../api/axios";
import Pagination from "../shared/Pagination";
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ListeEleves = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
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

    useEffect(() => {
        charger(1, '', '', '');
        api.get('/niveaux').then((res) => setNiveaux(res.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get('/classesTout').then((res) => setClasses(res.data)).catch((err) => console.error('Erreur chargement:', err));
    }, []);

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
            .then((res) => setClasses(res.data)).catch((err) => console.error('Erreur chargement:', err));
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
        <section className="content content-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-user-graduate me-2 text-primary" />
                        Élèves
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{total}</span>
                    </h4>
                    <div className="d-flex gap-2">
                        <button className="btn btn-outline-success btn-sm" onClick={exportCsv}>
                            <i className="fas fa-file-csv me-1" />Export CSV
                        </button>
                        <NavLink to="/NouvelEleve" className="btn btn-primary btn-sm">
                            <i className="fas fa-plus me-1" />Ajouter un élève
                        </NavLink>
                    </div>
                </div>

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
