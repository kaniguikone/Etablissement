import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../../api/axios';
import Pagination from '../shared/Pagination';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ListeDevoirs = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const [devoirs, setDevoirs] = useState([]);
    const [classes, setClasses] = useState([]);
    const [periodes, setPeriodes] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [filtreClasse, setFiltreClasse] = useState('');
    const [filtrePeriode, setFiltrePeriode] = useState('');
    const [chargement, setChargement] = useState(true);

    useEffect(() => {
        listerDevoirs(1);
        api.get('/classesTout').then((res) => setClasses(res.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get('/periodes').then((res) => setPeriodes(res.data)).catch((err) => console.error('Erreur chargement:', err));
    }, []);

    const listerDevoirs = (page = 1) => {
        setChargement(true);
        api.get(`/devoirs?page=${page}`)
            .then((res) => {
                setDevoirs(res.data.data);
                setLastPage(res.data.last_page);
                setCurrentPage(res.data.current_page);
                setChargement(false);
            })
            .catch(() => {
                toast.error('Impossible de charger les devoirs.');
                setChargement(false);
            });
    };

    const handleFiltreClasse = (e) => {
        const val = e.target.value;
        setFiltreClasse(val);
        setFiltrePeriode('');
        if (val === '') {
            listerDevoirs(1);
        } else {
            setChargement(true);
            api.get(`/devoirsClasse/${val}`)
                .then((res) => {
                    setDevoirs(res.data);
                    setLastPage(1);
                    setCurrentPage(1);
                    setChargement(false);
                })
                .catch(() => { toast.error('Impossible de filtrer.'); setChargement(false); });
        }
    };

    const handleFiltrePeriode = (e) => {
        const val = e.target.value;
        setFiltrePeriode(val);
        setFiltreClasse('');
        if (val === '') {
            listerDevoirs(1);
        } else {
            setChargement(true);
            api.get(`/devoirsPeriode/${val}`)
                .then((res) => {
                    setDevoirs(res.data.data);
                    setLastPage(res.data.last_page);
                    setCurrentPage(res.data.current_page);
                    setChargement(false);
                })
                .catch(() => { toast.error('Impossible de filtrer.'); setChargement(false); });
        }
    };

    const supprimerDevoir = async (id) => {
        if (!await confirmer('Confirmer la suppression ? Les notes associées seront également supprimées.')) return;
        api.delete(`/devoirs/${id}`)
            .then(() => listerDevoirs(currentPage))
            .catch(() => toast.error('Impossible de supprimer ce devoir.'));
    };

    return (
        <section className="content content-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-file-alt me-2 text-primary" />
                        Devoirs / Notes
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{devoirs.length > 0 ? (currentPage - 1) * 15 + devoirs.length : 0}</span>
                    </h4>
                    <NavLink to="/NouveauDevoir" className="btn btn-primary btn-sm">
                        <i className="fas fa-plus me-1" />Nouveau devoir
                    </NavLink>
                </div>
                <div className="row mb-2">
                    <div className="col-md-4">
                        <select className="form-select form-select-sm" value={filtreClasse} onChange={handleFiltreClasse}>
                            <option value="">Toutes les classes</option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>{c.nom_classe}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <select className="form-select form-select-sm" value={filtrePeriode} onChange={handleFiltrePeriode}>
                            <option value="">Toutes les périodes</option>
                            {periodes.map((p) => (
                                <option key={p.id} value={p.id}>{p.libelle_periode} — {p.annee}</option>
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
                                <th>Code</th>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Matière</th>
                                <th>Classe / Niveau</th>
                                <th>Coeff</th>
                                <th>Période</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {devoirs.map((devoir, i) => (
                                <tr key={devoir.id}>
                                    <td>{(currentPage - 1) * 15 + i + 1}</td>
                                    <td>{devoir.code_devoir}</td>
                                    <td>{devoir.date_devoir}</td>
                                    <td>{devoir.type_devoir?.code_type_devoir}</td>
                                    <td>{devoir.matiere?.abbr_matiere}</td>
                                    <td>{devoir.classe?.abbr_classe || devoir.niveau?.abbr_niveau}</td>
                                    <td>{devoir.coeff_devoir}</td>
                                    <td>{devoir.periode?.abbr_libelle_periode}</td>
                                    <td>
                                        <NavLink to={`/DetailsDevoir/${devoir.id}`} className="btn btn-primary btn-sm me-1">Modifier</NavLink>
                                        <NavLink to={`/SaisieNotes/${devoir.id}`} className="btn btn-success btn-sm me-1">Notes</NavLink>
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => supprimerDevoir(devoir.id)}>Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {!chargement && lastPage > 1 && (
                    <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={listerDevoirs} />
                )}
            </div>
        </section>
    );
};

export default ListeDevoirs;
