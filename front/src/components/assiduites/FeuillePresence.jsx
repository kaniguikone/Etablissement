import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const STATUTS = [
    { value: 'present', label: 'Présent', badge: 'bg-success' },
    { value: 'absent',  label: 'Absent',  badge: 'bg-danger' },
    { value: 'retard',  label: 'Retard',  badge: 'bg-warning text-dark' },
];

const FeuillePresence = () => {
    const { toast } = useToast();
    const [classes, setClasses]   = useState([]);
    const [matieres, setMatieres] = useState([]);
    const [periodes, setPeriodes] = useState([]);
    const [filtre, setFiltre]     = useState({ classe_id: '', matiere_id: '', periode_id: '', date: '' });
    const [lignes, setLignes]     = useState([]);
    const [chargement, setChargement]   = useState(false);
    const [sauvegarde, setSauvegarde]   = useState(false);
    const [feuilleChargee, setFeuilleChargee] = useState(false);

    useEffect(() => {
        api.get('/classesTout').then((r) => setClasses(r.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get('/matieres').then((r) => setMatieres(r.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get('/periodes').then((r) => setPeriodes(r.data)).catch((err) => console.error('Erreur chargement:', err));
    }, []);

    const handleFiltreChange = (e) => {
        setFiltre({ ...filtre, [e.target.name]: e.target.value });
        setFeuilleChargee(false);
        setLignes([]);
    };

    const chargerFeuille = (e) => {
        e.preventDefault();
        setChargement(true);
        api.get('/assiduitesFeuille', { params: filtre })
            .then((r) => {
                setLignes(r.data);
                setFeuilleChargee(true);
                setChargement(false);
            })
            .catch(() => {
                toast.error('Impossible de charger la feuille.');
                setChargement(false);
            });
    };

    const handleStatut = (eleveId, statut) => {
        setLignes((prev) => prev.map((l) => l.eleve_id === eleveId ? { ...l, statut } : l));
    };

    const handleRemarque = (eleveId, remarque) => {
        setLignes((prev) => prev.map((l) => l.eleve_id === eleveId ? { ...l, remarque } : l));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSauvegarde(true);
        api.post('/assiduitesSauvegarder', {
            matiere_id:     filtre.matiere_id,
            periode_id:     filtre.periode_id,
            date_assiduite: filtre.date,
            assiduites:     lignes.map((l) => ({
                eleve_id: l.eleve_id,
                statut:   l.statut,
                remarque: l.remarque,
            })),
        })
            .then(() => {
                toast.success('Assiduités enregistrées avec succès.');
                setSauvegarde(false);
            })
            .catch(() => {
                toast.error("Une erreur est survenue lors de l'enregistrement.");
                setSauvegarde(false);
            });
    };

    const filtreComplet = filtre.classe_id && filtre.matiere_id && filtre.periode_id && filtre.date;

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <h4 className="mt-2 mb-3">Feuille de présence</h4>

                {/* Filtres */}
                <form onSubmit={chargerFeuille} className="row g-3 mb-3 align-items-end border-bottom pb-3">
                    <div className="col-md-3">
                        <label className="form-label">Classe</label>
                        <select className="form-select form-select-sm" name="classe_id" value={filtre.classe_id} onChange={handleFiltreChange} required>
                            <option value="">Sélectionner</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Matière</label>
                        <select className="form-select form-select-sm" name="matiere_id" value={filtre.matiere_id} onChange={handleFiltreChange} required>
                            <option value="">Sélectionner</option>
                            {matieres.map((m) => <option key={m.id} value={m.id}>{m.libelle_matiere}</option>)}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Période</label>
                        <select className="form-select form-select-sm" name="periode_id" value={filtre.periode_id} onChange={handleFiltreChange} required>
                            <option value="">Sélectionner</option>
                            {periodes.map((p) => <option key={p.id} value={p.id}>{p.libelle_periode} — {p.annee}</option>)}
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Date</label>
                        <input type="date" className="form-control form-control-sm" name="date" value={filtre.date} onChange={handleFiltreChange} required />
                    </div>
                    <div className="col-md-1">
                        <button type="submit" className="btn btn-primary btn-sm w-100" disabled={!filtreComplet || chargement}>
                            {chargement ? <span className="spinner-border spinner-border-sm" /> : 'Charger'}
                        </button>
                    </div>
                </form>

                {/* Tableau de saisie */}
                {feuilleChargee && (
                    <form onSubmit={handleSubmit}>
                        <table className="table table-bordered table-hover">
                            <thead className="table-light">
                                <tr>
                                    <th>#</th>
                                    <th>Matricule</th>
                                    <th>Nom</th>
                                    <th>Prénoms</th>
                                    <th>Statut</th>
                                    <th>Remarque</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lignes.map((ligne, i) => (
                                    <tr key={ligne.eleve_id}>
                                        <td>{i + 1}</td>
                                        <td>{ligne.matricule_eleve}</td>
                                        <td>{ligne.nom_eleve}</td>
                                        <td>{ligne.prenoms_eleve}</td>
                                        <td>
                                            <div className="d-flex gap-1">
                                                {STATUTS.map((s) => (
                                                    <button
                                                        key={s.value}
                                                        type="button"
                                                        className={`btn btn-sm ${ligne.statut === s.value ? s.badge : 'btn-outline-secondary'}`}
                                                        onClick={() => handleStatut(ligne.eleve_id, s.value)}
                                                    >
                                                        {s.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                value={ligne.remarque}
                                                placeholder="Remarque..."
                                                onChange={(e) => handleRemarque(ligne.eleve_id, e.target.value)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="d-flex justify-content-end mb-3">
                            <button type="submit" className="btn btn-primary" disabled={sauvegarde}>
                                {sauvegarde && <span className="spinner-border spinner-border-sm me-2" />}
                                Enregistrer les présences
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </section>
    );
};

export default FeuillePresence;
