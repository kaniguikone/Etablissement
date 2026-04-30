import React, { useEffect, useState } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const normaliserNiveau = (abbr) => {
    if (!abbr) return '';
    return abbr
        .toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace('IEME', 'EME');
};

const genererNoms = (niveaux, series, { niveau_id, serie_id, num_classe }) => {
    const niveau = niveaux.find(n => String(n.id) === String(niveau_id));
    const serie  = series.find(s => String(s.id) === String(serie_id));
    if (!niveau || !num_classe) return null;

    const nomNiv  = niveau.nom_niveau;
    const codeNiv = normaliserNiveau(niveau.abbr_niveau ?? niveau.nom_niveau);

    if (serie) {
        return {
            nom_classe:  `${nomNiv} ${serie.nom}${num_classe}`,
            abbr_classe: `${codeNiv} ${serie.nom}${num_classe}`,
        };
    }
    return {
        nom_classe:  `${nomNiv} ${num_classe}`,
        abbr_classe: `${codeNiv}-${num_classe}`,
    };
};

const DetailsClasse = () => {
    const { toast }    = useToast();
    const { confirmer }= useConfirm();
    const { id }       = useParams();
    const navigate     = useNavigate();
    const [niveaux, setNiveaux]                         = useState([]);
    const [enseignants, setEnseignants]                 = useState([]);
    const [enseignantsFiltres, setEnseignantsFiltres]   = useState([]);
    const [matieres, setMatieres]                       = useState([]);
    const [series, setSeries]                           = useState([]);
    const [affectations, setAffectations]               = useState([]);
    const [ajout, setAjout]                             = useState({ matiere_id: '', enseignant_id: '' });
    const [ajoutEnCours, setAjoutEnCours]               = useState(false);
    const [saving, setSaving]                           = useState(false);
    const [nomModifie, setNomModifie]                   = useState(false);
    const [form, setForm]                   = useState({
        num_classe: '', nom_classe: '', abbr_classe: '', niveau_id: '', serie_id: '',
        salle_classe: '', effectif_max_classe: '', professeur_principal_id: '',
    });

    const chargerAffectations = () =>
        api.get(`/classeMatieresEnseignants/${id}`).then((r) => setAffectations(r.data)).catch(() => toast.error('Erreur de chargement des données.'));

    const appliquerClasse = (c) => {
        setNomModifie(false);
        setForm({
            num_classe:               String(c.num_classe               ?? ''),
            nom_classe:               c.nom_classe               || '',
            abbr_classe:              c.abbr_classe              || '',
            niveau_id:                String(c.niveau_id         ?? ''),
            serie_id:                 String(c.serie_id          ?? ''),
            salle_classe:             c.salle_classe             || '',
            effectif_max_classe:      String(c.effectif_max_classe ?? ''),
            professeur_principal_id:  String(c.professeur_principal_id ?? ''),
        });
    };

    const chargerClasse = () =>
        api.get(`/classes/${id}`)
            .then((res) => appliquerClasse(res.data))
            .catch(() => toast.error('Impossible de charger les données de cette classe.'));

    useEffect(() => {
        chargerClasse();
        api.get('/niveaux').then((r) => setNiveaux(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
        api.get('/enseignantsTout').then((r) => setEnseignants(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
        api.get('/matieres').then((r) => setMatieres(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
        api.get('/config-matieres').then((r) => setSeries(r.data.series ?? [])).catch(() => {});
        chargerAffectations();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const next = { ...form, [name]: value };

        if (name === 'nom_classe' || name === 'abbr_classe') {
            setNomModifie(true);
            setForm(next);
            return;
        }

        if (!nomModifie && (name === 'niveau_id' || name === 'serie_id' || name === 'num_classe')) {
            const gen = genererNoms(niveaux, series, next);
            if (gen) {
                next.nom_classe  = gen.nom_classe;
                next.abbr_classe = gen.abbr_classe;
            }
        }

        setForm(next);
    };

    const autoLabel = (champ) => !nomModifie && form[champ] && (
        <span className="text-muted ms-1" style={{ fontSize: 11 }}>
            <i className="fas fa-magic me-1" />auto
        </span>
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        setSaving(true);
        api.put(`/classes/${id}`, form)
            .then(() => {
                toast.success('Modifications enregistrées.');
                navigate('/Classes');
            })
            .catch((err) => {
                if (err.response?.data?.errors)
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                else toast.error("Une erreur est survenue lors de la mise à jour.");
                setSaving(false);
            });
    };

    const handleMatiereAjout = (matiereId) => {
        setAjout({ matiere_id: matiereId, enseignant_id: '' });
        if (!matiereId) { setEnseignantsFiltres([]); return; }
        api.get(`/matiereEnseignants/${matiereId}`)
            .then((r) => setEnseignantsFiltres(r.data.length ? r.data : enseignants))
            .catch(() => setEnseignantsFiltres(enseignants));
    };

    const ajouterAffectation = () => {
        if (!ajout.matiere_id || !ajout.enseignant_id) return;
        setAjoutEnCours(true);
        api.post(`/classes/${id}/affectations`, ajout)
            .then((r) => {
                setAffectations((prev) => [...prev, r.data]);
                setAjout({ matiere_id: '', enseignant_id: '' });
                toast.success('Affectation ajoutée.');
            })
            .catch((err) => toast.error(err.response?.data?.message || 'Erreur lors de l\'ajout.'))
            .finally(() => setAjoutEnCours(false));
    };

    const supprimerAffectation = async (aff) => {
        if (!await confirmer(`Retirer ${aff.libelle_matiere} — ${aff.nom_enseignant} ${aff.prenoms_enseignant} ?`)) return;
        api.delete(`/classes/${id}/affectations/${aff.id}`)
            .then(() => {
                setAffectations((prev) => prev.filter((a) => a.id !== aff.id));
                toast.success('Affectation retirée.');
            })
            .catch(() => toast.error('Erreur lors de la suppression.'));
    };

    return (
        <section className="page-wrapper">
            <div className="container bg-light mb-2 border">
                <div className="d-flex justify-content-between mb-2 border">
                    <h2 className="mt-2 container mb-1">Détails de la classe</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3">

                        <div className="col-md-4">
                            <label className="form-label">Niveau *</label>
                            <select className="form-select form-select-sm" name="niveau_id" value={form.niveau_id} onChange={handleChange} required>
                                <option value="">Sélectionner un niveau</option>
                                {niveaux.map((n) => <option key={n.id} value={n.id}>{n.nom_niveau}</option>)}
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Série <span className="text-muted">(optionnelle)</span></label>
                            <select className="form-select form-select-sm" name="serie_id" value={form.serie_id} onChange={handleChange}>
                                <option value="">— Aucune série —</option>
                                {series.map((s) => <option key={s.id} value={s.id}>{s.nom}{s.description ? ` — ${s.description}` : ''}</option>)}
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Numéro de classe *</label>
                            <input type="text" className="form-control form-control-sm" name="num_classe" value={form.num_classe} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Nom de la classe * {autoLabel('nom_classe')}</label>
                            <input type="text" className="form-control form-control-sm" name="nom_classe" value={form.nom_classe} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Abréviation * {autoLabel('abbr_classe')}</label>
                            <input type="text" className="form-control form-control-sm" name="abbr_classe" value={form.abbr_classe} onChange={handleChange} required />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Salle</label>
                            <input type="text" className="form-control form-control-sm" name="salle_classe" value={form.salle_classe} onChange={handleChange} placeholder="Ex: Salle A1" />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Effectif maximum</label>
                            <input type="number" className="form-control form-control-sm" name="effectif_max_classe" value={form.effectif_max_classe} onChange={handleChange} min="1" />
                        </div>
                        <div className="col-md-8">
                            <label className="form-label">Professeur principal</label>
                            <select className="form-select form-select-sm" name="professeur_principal_id" value={form.professeur_principal_id} onChange={handleChange}>
                                <option value="">Aucun</option>
                                {enseignants.map((e) => (
                                    <option key={e.id} value={e.id}>{e.nom_enseignant} {e.prenoms_enseignant}</option>
                                ))}
                            </select>
                        </div>

                    </fieldset>
                    <div className="d-flex justify-content-end mb-3 gap-2 mt-3">
                        <NavLink to="/Classes" className="btn btn-secondary">Retour</NavLink>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving && <span className="spinner-border spinner-border-sm me-1" />}
                            Enregistrer
                        </button>
                    </div>
                </form>

                {/* ── Section affectations enseignant/matière ── */}
                <hr />
                <h5 className="mt-3 mb-3">Enseignants affectés à cette classe</h5>

                {affectations.length === 0 ? (
                    <p className="text-muted small">Aucun enseignant affecté pour l'instant.</p>
                ) : (
                    <table className="table table-sm table-bordered mb-3" style={{ fontSize: '0.88rem' }}>
                        <thead className="table-light">
                            <tr>
                                <th>Matière</th>
                                <th>Enseignant</th>
                                <th style={{ width: '60px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {affectations.map((a) => (
                                <tr key={a.id}>
                                    <td>{a.libelle_matiere}</td>
                                    <td>{a.nom_enseignant} {a.prenoms_enseignant}</td>
                                    <td className="text-center">
                                        <button
                                            className="btn btn-danger btn-sm py-0"
                                            onClick={() => supprimerAffectation(a)}
                                        >
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Formulaire d'ajout */}
                <div className="d-flex align-items-end gap-2 flex-wrap mb-4">
                    <div>
                        <label className="form-label mb-1 small">Matière</label>
                        <select
                            className="form-select form-select-sm"
                            style={{ width: '200px' }}
                            value={ajout.matiere_id}
                            onChange={(e) => handleMatiereAjout(e.target.value)}
                        >
                            <option value="">Sélectionner</option>
                            {matieres.map((m) => <option key={m.id} value={m.id}>{m.libelle_matiere}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label mb-1 small">Enseignant</label>
                        <select
                            className="form-select form-select-sm"
                            style={{ width: '220px' }}
                            value={ajout.enseignant_id}
                            onChange={(e) => setAjout((prev) => ({ ...prev, enseignant_id: e.target.value }))}
                            disabled={!ajout.matiere_id}
                        >
                            <option value="">
                                {ajout.matiere_id ? 'Sélectionner' : '— Choisir d\'abord une matière —'}
                            </option>
                            {(enseignantsFiltres.length ? enseignantsFiltres : enseignants).map((e) => (
                                <option key={e.id} value={e.id}>{e.nom_enseignant} {e.prenoms_enseignant}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        className="btn btn-success btn-sm"
                        onClick={ajouterAffectation}
                        disabled={!ajout.matiere_id || !ajout.enseignant_id || ajoutEnCours}
                    >
                        {ajoutEnCours && <span className="spinner-border spinner-border-sm me-1" />}
                        + Ajouter
                    </button>
                </div>
            </div>
        </section>
    );
};

export default DetailsClasse;
