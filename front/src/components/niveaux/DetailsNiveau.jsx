import React, { useEffect, useState } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const NIVEAUX_STANDARD = [
    { nom: 'Sixième',   abbr: '6ème',  ordre: 1 },
    { nom: 'Cinquième', abbr: '5ème',  ordre: 2 },
    { nom: 'Quatrième', abbr: '4ème',  ordre: 3 },
    { nom: 'Troisième', abbr: '3ème',  ordre: 4 },
    { nom: 'Seconde',   abbr: '2nde',  ordre: 5 },
    { nom: 'Première',  abbr: '1ère',  ordre: 6 },
    { nom: 'Terminale', abbr: 'Tle',   ordre: 7 },
];

const DetailsNiveau = () => {
    const { toast }  = useToast();
    const { id }     = useParams();
    const navigate   = useNavigate();
    const [saving, setSaving]   = useState(false);
    const [classes, setClasses] = useState([]);
    const [form, setForm] = useState({
        nom_niveau:  '',
        abbr_niveau: '',
        ordre:       '',
    });

    useEffect(() => {
        api.get(`/niveaux/${id}`)
            .then((res) => {
                const { niveau, classes: cls } = res.data;
                setForm({
                    nom_niveau:  niveau.nom_niveau  || '',
                    abbr_niveau: niveau.abbr_niveau || '',
                    ordre:       niveau.ordre != null ? String(niveau.ordre) : '',
                });
                setClasses(cls ?? []);
            })
            .catch(() => toast.error('Impossible de charger les données de ce niveau.'));
    }, [id]);

    const appliquerPreset = (preset) => {
        setForm({ nom_niveau: preset.nom, abbr_niveau: preset.abbr, ordre: String(preset.ordre) });
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSaving(true);
        api.put(`/niveaux/${id}`, { ...form, ordre: form.ordre || null })
            .then(() => { toast.success('Modifications enregistrées.'); navigate('/Niveaux'); })
            .catch((err) => {
                if (err.response?.data?.errors)
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                else
                    toast.error("Une erreur est survenue lors de la mise à jour.");
                setSaving(false);
            });
    };

    return (
        <section className="page-wrapper">
            <div className="container bg-light mb-2 border">
                <div className="d-flex justify-content-between mb-2 border">
                    <h2 className="mt-2 container mb-1">Détails du niveau</h2>
                </div>

                {/* ── Raccourcis niveaux standard ── */}
                <div className="mb-4">
                    <p className="text-muted small mb-2">
                        <i className="fas fa-bolt me-1 text-warning" />
                        Changer vers un niveau standard :
                    </p>
                    <div className="d-flex flex-wrap gap-2">
                        {NIVEAUX_STANDARD.map((p) => (
                            <button
                                key={p.nom}
                                type="button"
                                className={`btn btn-sm ${form.nom_niveau === p.nom ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => appliquerPreset(p)}
                            >
                                {p.nom}
                                <span className="ms-1" style={{ fontSize: 11, opacity: 0.75 }}>({p.abbr})</span>
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3">
                        <div className="col-md-5">
                            <label className="form-label">Nom du niveau *</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                name="nom_niveau"
                                value={form.nom_niveau}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Abréviation *</label>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                name="abbr_niveau"
                                value={form.abbr_niveau}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">
                                Ordre d'affichage
                                <span className="text-muted ms-1" style={{ fontSize: 11 }}>(optionnel)</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                className="form-control form-control-sm"
                                name="ordre"
                                value={form.ordre}
                                onChange={handleChange}
                            />
                        </div>
                    </fieldset>
                    <div className="d-flex justify-content-end mb-4 gap-2 mt-3">
                        <NavLink to="/Niveaux" className="btn btn-secondary">Retour</NavLink>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving && <span className="spinner-border spinner-border-sm me-1" />}
                            Enregistrer
                        </button>
                    </div>
                </form>

                {/* ── Classes rattachées ── */}
                <hr />
                <h5 className="mt-3 mb-3">
                    <i className="fas fa-school me-2 text-primary" />
                    Classes de ce niveau
                    <span className="badge bg-secondary ms-2">{classes.length}</span>
                </h5>
                {classes.length === 0 ? (
                    <p className="text-muted small">Aucune classe rattachée à ce niveau.</p>
                ) : (
                    <table className="table table-sm table-bordered mb-4" style={{ fontSize: '0.88rem' }}>
                        <thead className="table-light">
                            <tr>
                                <th>N°</th>
                                <th>Nom</th>
                                <th>Abréviation</th>
                                <th style={{ width: 80 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {classes.map((c) => (
                                <tr key={c.id}>
                                    <td className="text-center text-muted">{c.num_classe}</td>
                                    <td>{c.nom_classe}</td>
                                    <td>
                                        <span className="badge bg-light text-dark border">{c.abbr_classe}</span>
                                    </td>
                                    <td className="text-center">
                                        <NavLink to={`/DetailsClasse/${c.id}`} className="btn btn-outline-primary btn-sm py-0">
                                            <i className="fas fa-pen" />
                                        </NavLink>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    );
};

export default DetailsNiveau;
