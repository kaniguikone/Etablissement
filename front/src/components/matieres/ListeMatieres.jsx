import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from 'react-router-dom';
import api from "../../api/axios";
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ListeMatieres = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const location = useLocation();
    const [matieres, setMatieres] = useState([]);
    const [recherche, setRecherche] = useState('');
    const [chargement, setChargement] = useState(true);

    // Référentiel des familles (libellé + couleur + suggestions par abréviation)
    // — sert à la colonne Famille et à l'assistant d'affectation en masse.
    const [referentiel, setReferentiel] = useState({ familles: [], suggestions: {} });
    const famillesParCode = useMemo(
        () => Object.fromEntries(referentiel.familles.map((f) => [f.code, f])),
        [referentiel.familles],
    );

    const [assistantOuvert, setAssistantOuvert] = useState(false);
    const [brouillon, setBrouillon] = useState({}); // matiere_id -> code famille choisi
    const [enregistrement, setEnregistrement] = useState(false);

    useEffect(() => {
        listerMatieres();
        api.get('/matieres/familles').then((r) => setReferentiel(r.data)).catch(() => {});
    }, [location.key]);

    const listerMatieres = () => {
        setChargement(true);
        api.get('/matieres')
            .then((res) => { setMatieres(res.data); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger les matières.'); setChargement(false); });
    };

    const supprimerMatiere = async (id) => {
        if (!await confirmer('Confirmer la suppression ?')) return;
        api.delete(`/matieres/${id}`)
            .then(() => listerMatieres())
            .catch(() => toast.error('Impossible de supprimer cette matière.'));
    };

    const matieresFiltrees = matieres.filter(m =>
        m.libelle_matiere.toLowerCase().includes(recherche.toLowerCase()) ||
        m.abbr_matiere.toLowerCase().includes(recherche.toLowerCase()) ||
        (m.description_matiere || '').toLowerCase().includes(recherche.toLowerCase())
    );

    const sansFamille = matieres.filter((m) => !m.famille);

    // Ouvre l'assistant et pré-remplit un brouillon à partir des suggestions
    // par abréviation (celles qui ne matchent rien restent vides).
    const ouvrirAssistant = () => {
        const initial = {};
        sansFamille.forEach((m) => {
            initial[m.id] = referentiel.suggestions[m.abbr_matiere] || '';
        });
        setBrouillon(initial);
        setAssistantOuvert(true);
    };

    const reappliquerSuggestions = () => {
        const suggere = {};
        sansFamille.forEach((m) => {
            suggere[m.id] = referentiel.suggestions[m.abbr_matiere] || '';
        });
        setBrouillon(suggere);
    };

    const enregistrerAssistant = async () => {
        const aEnregistrer = sansFamille.filter((m) => brouillon[m.id]);
        if (aEnregistrer.length === 0) {
            toast.error('Choisissez au moins une famille à enregistrer.');
            return;
        }
        setEnregistrement(true);
        try {
            await Promise.all(aEnregistrer.map((m) => {
                const famille = brouillon[m.id];
                return api.put(`/matieres/${m.id}`, {
                    abbr_matiere: m.abbr_matiere,
                    libelle_matiere: m.libelle_matiere,
                    description_matiere: m.description_matiere,
                    famille,
                    // pré-remplit la couleur de la famille si la matière n'en a pas déjà une
                    couleur: m.couleur || famillesParCode[famille]?.couleur || null,
                    salle_type_requis: m.salle_type_requis,
                    effort_soutenu: m.effort_soutenu,
                });
            }));
            toast.success(`${aEnregistrer.length} matière(s) mise(s) à jour.`);
            listerMatieres();
            if (aEnregistrer.length === sansFamille.length) setAssistantOuvert(false);
        } catch {
            toast.error("Erreur lors de l'enregistrement.");
        } finally {
            setEnregistrement(false);
        }
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-book me-2 text-primary" />
                        Matières
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{matieres.length}</span>
                    </h4>
                    <div className="d-flex gap-2">
                        {sansFamille.length > 0 && (
                            <button type="button" className="btn btn-outline-warning btn-sm" onClick={ouvrirAssistant}>
                                <i className="fas fa-magic me-1" />
                                Affectation rapide des familles
                                <span className="badge bg-warning text-dark ms-1">{sansFamille.length}</span>
                            </button>
                        )}
                        <NavLink to="/NouvelleMatiere" className="btn btn-primary btn-sm">
                            <i className="fas fa-plus me-1" />Nouvelle matière
                        </NavLink>
                    </div>
                </div>

                {assistantOuvert && (
                    <div className="border rounded p-3 mb-3 bg-light">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <h6 className="mb-1">Affectation rapide des familles</h6>
                                <p className="text-muted small mb-0">
                                    La famille porte les règles MENET (EPS hors heures chaudes, Histoire-Géo jamais
                                    2 h consécutives, tandem PC/SVT…) et la couleur des grilles. Une suggestion est
                                    proposée à partir de l&apos;abréviation ; corrigez-la si besoin, laissez vide
                                    pour ignorer une matière.
                                </p>
                            </div>
                            <button type="button" className="btn-close" onClick={() => setAssistantOuvert(false)} />
                        </div>

                        <div className="table-responsive">
                            <table className="table table-sm table-bordered align-middle mb-2" style={{ fontSize: '0.88rem' }}>
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: 100 }}>Abréviation</th>
                                        <th>Libellé</th>
                                        <th style={{ width: 260 }}>Famille</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sansFamille.map((m) => (
                                        <tr key={m.id}>
                                            <td><span className="badge bg-light text-dark border">{m.abbr_matiere}</span></td>
                                            <td>{m.libelle_matiere}</td>
                                            <td>
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={brouillon[m.id] || ''}
                                                    onChange={(e) => setBrouillon((b) => ({ ...b, [m.id]: e.target.value }))}
                                                >
                                                    <option value="">— Ignorer pour l&apos;instant —</option>
                                                    {referentiel.familles.map((f) => (
                                                        <option key={f.code} value={f.code}>{f.libelle}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="d-flex gap-2">
                            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={reappliquerSuggestions}>
                                Réappliquer les suggestions
                            </button>
                            <button type="button" className="btn btn-primary btn-sm" onClick={enregistrerAssistant} disabled={enregistrement}>
                                {enregistrement && <span className="spinner-border spinner-border-sm me-2" />}
                                Enregistrer
                            </button>
                        </div>
                    </div>
                )}

                <div className="row g-2 mb-3">
                    <div className="col-md-5">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Rechercher par libellé, abréviation ou description…"
                            value={recherche}
                            onChange={e => setRecherche(e.target.value)}
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
                                <th>Abréviation</th>
                                <th>Libellé</th>
                                <th>Famille</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {matieresFiltrees.length === 0 && (
                                <tr><td colSpan={6} className="text-center text-muted py-3">Aucune matière trouvée.</td></tr>
                            )}
                            {matieresFiltrees.map((matiere, i) => {
                                const famille = famillesParCode[matiere.famille];
                                return (
                                    <tr key={matiere.id}>
                                        <td>{i + 1}</td>
                                        <td><span className="badge bg-light text-dark border">{matiere.abbr_matiere}</span></td>
                                        <td>{matiere.libelle_matiere}</td>
                                        <td>
                                            {famille ? (
                                                <span className="badge border text-dark" style={{ backgroundColor: famille.couleur }}>
                                                    {famille.libelle}
                                                </span>
                                            ) : (
                                                <span className="badge bg-light text-muted border">— non définie —</span>
                                            )}
                                        </td>
                                        <td className="text-muted">{matiere.description_matiere}</td>
                                        <td>
                                            <NavLink to={`/DetailsMatiere/${matiere.id}`} className="btn btn-primary btn-sm me-1">Voir</NavLink>
                                            <button type="button" className="btn btn-danger btn-sm" onClick={() => supprimerMatiere(matiere.id)}>Supprimer</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    );
};

export default ListeMatieres;
