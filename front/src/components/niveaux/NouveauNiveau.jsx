import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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

const NouveauNiveau = () => {
    const { toast }  = useToast();
    const navigate   = useNavigate();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        nom_niveau:  '',
        abbr_niveau: '',
        ordre:       '',
    });

    const appliquerPreset = (preset) => {
        setForm({ nom_niveau: preset.nom, abbr_niveau: preset.abbr, ordre: String(preset.ordre) });
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSaving(true);
        api.post('/niveaux', { ...form, ordre: form.ordre || null })
            .then(() => { toast.success('Niveau enregistré avec succès.'); navigate('/Niveaux'); })
            .catch((err) => {
                if (err.response?.data?.errors)
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                else
                    toast.error("Une erreur est survenue lors de l'enregistrement.");
                setSaving(false);
            });
    };

    return (
        <section className="page-wrapper">
            <div className="container bg-light mb-2 border">
                <div className="d-flex justify-content-between mb-2 border">
                    <h2 className="mt-2 container mb-1">Nouveau niveau</h2>
                </div>

                {/* ── Raccourcis niveaux standard ── */}
                <div className="mb-4">
                    <p className="text-muted small mb-2">
                        <i className="fas fa-bolt me-1 text-warning" />
                        Niveaux standard — cliquez pour pré-remplir :
                    </p>
                    <div className="d-flex flex-wrap gap-2">
                        {NIVEAUX_STANDARD.map((p) => (
                            <button
                                key={p.nom}
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => appliquerPreset(p)}
                            >
                                {p.nom}
                                <span className="text-muted ms-1" style={{ fontSize: 11 }}>({p.abbr})</span>
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
                                placeholder="Ex : Sixième, Terminale…"
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
                                placeholder="Ex : 6ème, Tle…"
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
                                placeholder="1, 2, 3…"
                            />
                        </div>
                    </fieldset>
                    <div className="d-flex justify-content-end mb-3 gap-2 mt-3">
                        <NavLink to="/Niveaux" className="btn btn-secondary">Annuler</NavLink>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving && <span className="spinner-border spinner-border-sm me-1" />}
                            Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default NouveauNiveau;
