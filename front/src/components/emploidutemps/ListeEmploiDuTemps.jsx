import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const COULEURS = [
    'bg-primary', 'bg-success', 'bg-danger', 'bg-warning text-dark',
    'bg-info text-dark', 'bg-secondary', 'bg-dark',
];

const ListeEmploiDuTemps = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const navigate = useNavigate();
    const [niveaux, setNiveaux]         = useState([]);
    const [niveauId, setNiveauId]       = useState('');
    const [classes, setClasses]         = useState([]);
    const [classeId, setClasseId]       = useState('');
    const [creneaux, setCreneaux]       = useState({});
    const [chargement, setChargement]   = useState(false);
    const [selection, setSelection]     = useState(null);

    useEffect(() => {
        api.get('/niveaux').then((r) => setNiveaux(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
    }, []);

    useEffect(() => {
        setClasses([]);
        setClasseId('');
        if (!niveauId) return;
        api.get(`/classesNiveaux/${niveauId}`).then((r) => setClasses(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
    }, [niveauId]);

    useEffect(() => {
        if (!classeId) { setCreneaux({}); setSelection(null); return; }
        setChargement(true);
        setSelection(null);
        api.get(`/emploiDuTempsClasse/${classeId}`)
            .then((r) => { setCreneaux(r.data); setChargement(false); })
            .catch(() => { toast.error("Impossible de charger l'emploi du temps."); setChargement(false); });
    }, [classeId]);

    const supprimer = async () => {
        if (!selection) return;
        if (!await confirmer(`Supprimer le créneau "${selection.matiere?.libelle_matiere}" ?`)) return;
        api.delete(`/emploiDuTemps/${selection.id}`)
            .then(() => {
                toast.success('Créneau supprimé.');
                setSelection(null);
                setCreneaux((prev) => {
                    const updated = {};
                    Object.entries(prev).forEach(([jour, liste]) => {
                        const filtre = liste.filter((c) => c.id !== selection.id);
                        if (filtre.length) updated[jour] = filtre;
                    });
                    return updated;
                });
            })
            .catch(() => toast.error('Erreur lors de la suppression.'));
    };

    const horaires = [...new Set(
        Object.values(creneaux).flat().map((c) => `${c.heure_debut.slice(0, 5)}|${c.heure_fin.slice(0, 5)}`)
    )].sort();

    const palette = {};
    let colorIdx = 0;
    Object.values(creneaux).flat().forEach((c) => {
        const key = c.matiere?.abbr_matiere;
        if (key && !palette[key]) palette[key] = COULEURS[colorIdx++ % COULEURS.length];
    });

    const classeSelectionnee = classes.find((c) => String(c.id) === String(classeId));

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Emploi du temps</h4>
                    {classeId && (
                        <Link to={`/NouvelEmploiDuTemps?classe_id=${classeId}`} className="btn btn-primary btn-sm">
                            + Ajouter un créneau
                        </Link>
                    )}
                </div>

                {/* Filtres niveau + classe + barre d'actions */}
                <div className="d-flex align-items-end gap-3 mb-3 flex-wrap">
                    <div>
                        <label className="form-label mb-1">Niveau</label>
                        <select
                            className="form-select form-select-sm"
                            style={{ width: '160px' }}
                            value={niveauId}
                            onChange={(e) => setNiveauId(e.target.value)}
                        >
                            <option value="">Tous les niveaux</option>
                            {niveaux.map((n) => (
                                <option key={n.id} value={n.id}>{n.nom_niveau}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="form-label mb-1">Classe</label>
                        <select
                            className="form-select form-select-sm"
                            style={{ width: '180px' }}
                            value={classeId}
                            onChange={(e) => setClasseId(e.target.value)}
                            disabled={!niveauId}
                        >
                            <option value="">
                                {niveauId ? 'Sélectionner une classe' : '— Choisir un niveau —'}
                            </option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>{c.nom_classe}</option>
                            ))}
                        </select>
                    </div>

                    {selection && (
                        <div className="d-flex align-items-center gap-2 border rounded px-3 py-2 bg-light">
                            <span className="text-muted small me-2">
                                Sélectionné : <strong>{selection.matiere?.libelle_matiere}</strong>
                                {' '}({selection.heure_debut.slice(0,5)}–{selection.heure_fin.slice(0,5)})
                            </span>
                            <button
                                className="btn btn-warning btn-sm"
                                onClick={() => navigate(`/DetailsEmploiDuTemps/${selection.id}`)}
                            >
                                Modifier
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={supprimer}>
                                Supprimer
                            </button>
                            <button className="btn btn-outline-secondary btn-sm" onClick={() => setSelection(null)}>
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                {chargement && (
                    <div className="text-center py-4">
                        <div className="spinner-border text-primary" />
                    </div>
                )}

                {!chargement && classeId && Object.keys(creneaux).length === 0 && (
                    <div className="text-center py-5 border rounded bg-light">
                        <p className="text-muted mb-3">Aucun créneau pour cette classe.</p>
                        <Link to={`/NouvelEmploiDuTemps?classe_id=${classeId}`} className="btn btn-primary">
                            + Créer le premier créneau
                        </Link>
                    </div>
                )}

                {!chargement && horaires.length > 0 && (
                    <>
                        <h6 className="text-muted mb-2">{classeSelectionnee?.nom_classe} — Semaine type</h6>
                        <p className="text-muted small mb-2">Cliquez sur un créneau pour le sélectionner.</p>
                        <div className="table-responsive">
                            <table className="table table-bordered text-center mb-2" style={{ fontSize: '0.88rem' }}>
                                <thead>
                                    <tr className="table-dark">
                                        <th style={{ width: '90px' }}>Horaire</th>
                                        {JOURS.map((j) => (
                                            <th key={j} className="text-capitalize">{j}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {horaires.map((h) => {
                                        const [debut, fin] = h.split('|');
                                        return (
                                            <tr key={h}>
                                                <td className="fw-bold text-muted align-middle bg-light">
                                                    {debut}<br /><small>{fin}</small>
                                                </td>
                                                {JOURS.map((jour) => {
                                                    const creneau = creneaux[jour]?.find(
                                                        (c) => c.heure_debut.slice(0, 5) === debut && c.heure_fin.slice(0, 5) === fin
                                                    );
                                                    if (!creneau) return <td key={jour} className="bg-light" style={{ height: '60px' }} />;
                                                    const couleur = palette[creneau.matiere?.abbr_matiere] || 'bg-secondary';
                                                    const estSelectionne = selection?.id === creneau.id;
                                                    return (
                                                        <td
                                                            key={jour}
                                                            className={`align-middle p-2 ${estSelectionne ? 'table-active border border-2 border-warning' : ''}`}
                                                            style={{ cursor: 'pointer', height: '60px' }}
                                                            onClick={() => setSelection(estSelectionne ? null : creneau)}
                                                        >
                                                            <span className={`badge ${couleur} d-block mb-1`} style={{ whiteSpace: 'normal', fontSize: '0.8rem' }}>
                                                                {creneau.matiere?.abbr_matiere}
                                                            </span>
                                                            <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                                                                {creneau.enseignant?.nom_enseignant}
                                                            </small>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
};

export default ListeEmploiDuTemps;
