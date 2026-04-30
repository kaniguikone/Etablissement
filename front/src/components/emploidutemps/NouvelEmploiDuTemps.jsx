import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const NouvelEmploiDuTemps = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Mémorise la classe pré-sélectionnée depuis l'URL pour la restaurer après chargement
    const classeIdInit = useRef(searchParams.get('classe_id') || '');

    const [niveaux, setNiveaux]                       = useState([]);
    const [niveauId, setNiveauId]                     = useState('');
    const [classes, setClasses]                       = useState([]);
    const [combos, setCombos]                         = useState([]);
    const [chargement, setChargement]                 = useState(false);
    const [chargementCombos, setChargementCombos]     = useState(false);
    const [restant, setRestant]                       = useState(null); // heures restantes à placer

    const [form, setForm] = useState({
        classe_id:     classeIdInit.current,
        matiere_id:    '',
        enseignant_id: '',
        jour:          '',
        heure_debut:   '',
        heure_fin:     '',
    });

    // Au montage : charger les niveaux + détecter le niveau si classe pré-remplie
    useEffect(() => {
        api.get('/niveaux').then((r) => setNiveaux(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
        if (classeIdInit.current) {
            api.get(`/niveauClasse/${classeIdInit.current}`)
                .then((r) => { if (r.data?.niveau_id) setNiveauId(String(r.data.niveau_id)); })
                .catch(() => toast.error('Erreur de chargement des données.'));
        }
    }, []);

    // Quand le niveau change, charger les classes du niveau
    useEffect(() => {
        setClasses([]);
        if (!niveauId) return;
        api.get(`/classesNiveaux/${niveauId}`).then((r) => {
            setClasses(r.data);
            if (classeIdInit.current) {
                // Restaurer la classe pré-sélectionnée si elle appartient à ce niveau
                const appartient = r.data.some((c) => String(c.id) === classeIdInit.current);
                if (!appartient) {
                    setForm((prev) => ({ ...prev, classe_id: '', matiere_id: '', enseignant_id: '' }));
                }
                classeIdInit.current = ''; // utilisé une seule fois
            } else {
                setForm((prev) => ({ ...prev, classe_id: '', matiere_id: '', enseignant_id: '' }));
            }
        }).catch(() => toast.error('Erreur de chargement des données.'));
    }, [niveauId]);

    // Quand la classe change, charger les paires matière+enseignant + heures restantes
    useEffect(() => {
        if (!form.classe_id) { setCombos([]); setRestant(null); return; }
        setChargementCombos(true);
        setForm((prev) => ({ ...prev, matiere_id: '', enseignant_id: '' }));
        api.get(`/classeMatieresEnseignants/${form.classe_id}`)
            .then((r) => { setCombos(r.data); setChargementCombos(false); })
            .catch(() => { toast.error('Impossible de charger les matières de la classe.'); setChargementCombos(false); });
        api.get(`/volumesHoraires/restant/${form.classe_id}`)
            .then((r) => setRestant(r.data))
            .catch(() => setRestant(null));
    }, [form.classe_id]);

    // Quand la matière change, réinitialiser l'enseignant
    useEffect(() => {
        setForm((prev) => ({ ...prev, enseignant_id: '' }));
    }, [form.matiere_id]);

    // Matières uniques pour la classe sélectionnée
    const matieresDisponibles = combos.reduce((acc, c) => {
        if (!acc.find((m) => m.matiere_id === c.matiere_id)) acc.push(c);
        return acc;
    }, []);

    // Enseignants filtrés par la matière choisie
    const enseignantsDisponibles = combos.filter((c) => String(c.matiere_id) === String(form.matiere_id));

    const soumettre = (continuer) => {
        setChargement(true);
        api.post('/emploiDuTemps', form)
            .then(() => {
                toast.success('Créneau ajouté.');
                if (continuer) {
                    setForm((prev) => ({
                        classe_id:     prev.classe_id,
                        matiere_id:    '',
                        enseignant_id: '',
                        jour:          '',
                        heure_debut:   '',
                        heure_fin:     '',
                    }));
                    setChargement(false);
                } else {
                    navigate(`/EmploiDuTemps?classe_id=${form.classe_id}`);
                }
            })
            .catch((err) => {
                const data = err.response?.data;
                if (data?.erreurs?.length) {
                    data.erreurs.forEach((msg) => toast.error(msg));
                } else {
                    toast.error(data?.message || 'Erreur lors de la création.');
                }
                setChargement(false);
            });
    };

    const handleSubmit = (e) => { e.preventDefault(); soumettre(false); };

    const classeSelectionnee = classes.find((c) => String(c.id) === String(form.classe_id));
    const aucuneMatiere = form.classe_id && !chargementCombos && matieresDisponibles.length === 0;

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Nouveau créneau</h4>
                    <Link
                        to={form.classe_id ? `/EmploiDuTemps?classe_id=${form.classe_id}` : '/EmploiDuTemps'}
                        className="btn btn-secondary btn-sm"
                    >
                        Retour
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="row g-3">
                    {/* Niveau */}
                    <div className="col-md-4">
                        <label className="form-label">Niveau *</label>
                        <select
                            className="form-select form-select-sm"
                            value={niveauId}
                            onChange={(e) => setNiveauId(e.target.value)}
                            required
                        >
                            <option value="">Sélectionner un niveau</option>
                            {niveaux.map((n) => <option key={n.id} value={n.id}>{n.nom_niveau}</option>)}
                        </select>
                    </div>

                    {/* Classe — filtrée par niveau */}
                    <div className="col-md-4">
                        <label className="form-label">Classe *</label>
                        <select
                            className="form-select form-select-sm"
                            name="classe_id"
                            value={form.classe_id}
                            onChange={(e) => setForm((prev) => ({ ...prev, classe_id: e.target.value }))}
                            required
                            disabled={!niveauId}
                        >
                            <option value="">
                                {niveauId ? 'Sélectionner une classe' : '— Choisir un niveau —'}
                            </option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                        </select>
                    </div>

                    {/* Aide à la saisie : heures restantes à placer */}
                    {restant && restant.length > 0 && (
                        <div className="col-12">
                            <div className="border rounded p-2 bg-light mb-0">
                                <div className="small fw-bold text-secondary mb-1">
                                    Heures restantes à placer (par matière)
                                </div>
                                <div className="d-flex flex-wrap gap-2">
                                    {restant.map((r) => {
                                        const complet = r.restant <= 0;
                                        const depasse = r.restant < 0;
                                        return (
                                            <span
                                                key={r.matiere_id}
                                                className={`badge ${depasse ? 'bg-danger' : complet ? 'bg-success' : 'bg-primary'}`}
                                                title={`${r.matiere} — prévu ${r.heures_prevues}h/sem., placé ${r.heures_placees}h/sem.`}
                                            >
                                                {r.abbr || r.matiere} :&nbsp;
                                                {depasse
                                                    ? `+${Math.abs(r.restant).toFixed(1)}h dépassé`
                                                    : complet
                                                        ? 'Complet'
                                                        : `${r.restant.toFixed(1)}h`}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Alerte si aucun enseignant affecté à la classe */}
                    {aucuneMatiere && (
                        <div className="col-12">
                            <div className="alert alert-warning d-flex align-items-center gap-3 py-2 mb-0">
                                <span>
                                    Aucun enseignant n'est encore affecté à <strong>{classeSelectionnee?.nom_classe}</strong>.
                                    Il faut d'abord affecter des enseignants à cette classe avant de créer un emploi du temps.
                                </span>
                                <Link to={`/DetailsClasse/${form.classe_id}`} className="btn btn-warning btn-sm text-nowrap">
                                    Affecter des enseignants
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Matière — filtrée par classe */}
                    {!aucuneMatiere && (
                        <div className="col-md-4">
                            <label className="form-label">Matière *</label>
                            {chargementCombos ? (
                                <div className="d-flex align-items-center gap-2 mt-1">
                                    <span className="spinner-border spinner-border-sm text-secondary" />
                                    <small className="text-muted">Chargement…</small>
                                </div>
                            ) : (
                                <select
                                    className="form-select form-select-sm"
                                    name="matiere_id"
                                    value={form.matiere_id}
                                    onChange={(e) => setForm((prev) => ({ ...prev, matiere_id: e.target.value }))}
                                    required
                                    disabled={!form.classe_id}
                                >
                                    <option value="">
                                        {form.classe_id ? 'Sélectionner une matière' : '— Choisir d\'abord une classe —'}
                                    </option>
                                    {matieresDisponibles.map((c) => (
                                        <option key={c.matiere_id} value={c.matiere_id}>{c.libelle_matiere}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Enseignant — filtré par matière */}
                    {!aucuneMatiere && (
                        <div className="col-md-4">
                            <label className="form-label">Enseignant *</label>
                            <select
                                className="form-select form-select-sm"
                                name="enseignant_id"
                                value={form.enseignant_id}
                                onChange={(e) => setForm((prev) => ({ ...prev, enseignant_id: e.target.value }))}
                                required
                                disabled={!form.matiere_id}
                            >
                                <option value="">
                                    {form.matiere_id ? 'Sélectionner un enseignant' : '— Choisir d\'abord une matière —'}
                                </option>
                                {enseignantsDisponibles.map((c) => (
                                    <option key={c.enseignant_id} value={c.enseignant_id}>
                                        {c.nom_enseignant} {c.prenoms_enseignant}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Jour */}
                    {!aucuneMatiere && (
                        <div className="col-md-4">
                            <label className="form-label">Jour *</label>
                            <select
                                className="form-select form-select-sm"
                                name="jour"
                                value={form.jour}
                                onChange={(e) => setForm((prev) => ({ ...prev, jour: e.target.value }))}
                                required
                            >
                                <option value="">Sélectionner un jour</option>
                                {JOURS.map((j) => (
                                    <option key={j} value={j} className="text-capitalize">{j}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Heure début */}
                    {!aucuneMatiere && (
                        <div className="col-md-4">
                            <label className="form-label">Heure début *</label>
                            <input
                                type="time"
                                className="form-control form-control-sm"
                                name="heure_debut"
                                value={form.heure_debut}
                                onChange={(e) => setForm((prev) => ({ ...prev, heure_debut: e.target.value }))}
                                required
                            />
                        </div>
                    )}

                    {/* Heure fin */}
                    {!aucuneMatiere && (
                        <div className="col-md-4">
                            <label className="form-label">Heure fin *</label>
                            <input
                                type="time"
                                className="form-control form-control-sm"
                                name="heure_fin"
                                value={form.heure_fin}
                                onChange={(e) => setForm((prev) => ({ ...prev, heure_fin: e.target.value }))}
                                required
                            />
                        </div>
                    )}

                    {/* Boutons */}
                    {!aucuneMatiere && (
                        <div className="col-12 mb-3 d-flex gap-2">
                            <button type="submit" className="btn btn-primary btn-sm" disabled={chargement || !form.enseignant_id}>
                                {chargement && <span className="spinner-border spinner-border-sm me-2" />}
                                Enregistrer
                            </button>
                            <button
                                type="button"
                                className="btn btn-success btn-sm"
                                disabled={chargement || !form.enseignant_id}
                                onClick={() => soumettre(true)}
                            >
                                {chargement && <span className="spinner-border spinner-border-sm me-2" />}
                                Enregistrer et ajouter un autre
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </section>
    );
};

export default NouvelEmploiDuTemps;
