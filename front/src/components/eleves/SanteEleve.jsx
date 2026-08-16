import React, { useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const CHAMPS_VIDES = {
    groupe_sanguin: '', allergies: '', medecin_nom: '', medecin_telephone: '',
    contact_urgence_nom: '', contact_urgence_lien: '', contact_urgence_telephone: '',
    assurance_compagnie: '', assurance_numero_police: '',
};

const SanteEleve = () => {
    const { id } = useParams();
    const { toast } = useToast();

    const [eleve, setEleve]           = useState(null);
    const [form, setForm]             = useState(CHAMPS_VIDES);
    const [chargement, setChargement] = useState(true);
    const [enregistrement, setEnregistrement] = useState(false);

    useEffect(() => {
        api.get(`/sante-eleves/${id}`)
            .then(r => {
                setEleve(r.data.eleve);
                setForm(r.data.sante ? { ...CHAMPS_VIDES, ...r.data.sante } : CHAMPS_VIDES);
                setChargement(false);
            })
            .catch(() => { toast.error('Impossible de charger la fiche santé.'); setChargement(false); });
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setEnregistrement(true);
        api.put(`/sante-eleves/${id}`, form)
            .then(() => toast.success('Fiche santé enregistrée.'))
            .catch((err) => {
                if (err.response?.data?.errors)
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                else toast.error("Une erreur est survenue lors de l'enregistrement.");
            })
            .finally(() => setEnregistrement(false));
    };

    if (chargement) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
    if (!eleve) return null;

    return (
        <div className="page-wrapper">
            <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <h4 className="mb-0 fw-bold">
                    <i className="fas fa-heartbeat me-2 text-info" />
                    Santé — {eleve.nom_eleve} {eleve.prenoms_eleve}
                    <small className="text-muted ms-2 fs-6">{eleve.matricule_eleve}</small>
                </h4>
                <NavLink to={`/DetailsEleve/${id}`} className="btn btn-sm btn-secondary">Retour</NavLink>
            </div>

            <div className="mb-3 text-muted small">
                <i className="fas fa-school me-1" />
                {eleve.classe?.nom_classe}
                {eleve.classe?.niveau && <span className="ms-2">· {eleve.classe.niveau.libelle_niveau}</span>}
            </div>

            <form onSubmit={handleSubmit}>
                <div className="row g-3">
                    <div className="col-xl-6">
                        <div className="card h-100 border-0 shadow-sm">
                            <div className="card-header py-2 px-3 d-flex align-items-center gap-2"
                                style={{ background: '#e8f0fe', borderBottom: '2px solid #c2d3fb' }}>
                                <i className="fas fa-notes-medical text-primary" />
                                <span className="fw-semibold text-primary">Informations médicales</span>
                            </div>
                            <div className="card-body p-3">
                                <div className="row g-2">
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium mb-1">Groupe sanguin</label>
                                        <input type="text" className="form-control form-control-sm" name="groupe_sanguin" value={form.groupe_sanguin ?? ''} onChange={handleChange} placeholder="ex : O+" />
                                    </div>
                                    <div className="col-md-8">
                                        <label className="form-label fw-medium mb-1">Médecin traitant</label>
                                        <input type="text" className="form-control form-control-sm" name="medecin_nom" value={form.medecin_nom ?? ''} onChange={handleChange} />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-medium mb-1">Téléphone médecin</label>
                                        <input type="text" className="form-control form-control-sm" name="medecin_telephone" value={form.medecin_telephone ?? ''} onChange={handleChange} />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label fw-medium mb-1">Allergies connues</label>
                                        <textarea className="form-control form-control-sm" rows="3" name="allergies" value={form.allergies ?? ''} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-xl-6">
                        <div className="card h-100 border-0 shadow-sm">
                            <div className="card-header py-2 px-3 d-flex align-items-center gap-2"
                                style={{ background: '#e8f0fe', borderBottom: '2px solid #c2d3fb' }}>
                                <i className="fas fa-phone-alt text-primary" />
                                <span className="fw-semibold text-primary">Contact d&apos;urgence &amp; assurance</span>
                            </div>
                            <div className="card-body p-3">
                                <div className="row g-2">
                                    <div className="col-md-5">
                                        <label className="form-label fw-medium mb-1">Nom du contact</label>
                                        <input type="text" className="form-control form-control-sm" name="contact_urgence_nom" value={form.contact_urgence_nom ?? ''} onChange={handleChange} />
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label fw-medium mb-1">Lien</label>
                                        <input type="text" className="form-control form-control-sm" name="contact_urgence_lien" value={form.contact_urgence_lien ?? ''} onChange={handleChange} placeholder="ex : Tante" />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium mb-1">Téléphone</label>
                                        <input type="text" className="form-control form-control-sm" name="contact_urgence_telephone" value={form.contact_urgence_telephone ?? ''} onChange={handleChange} />
                                    </div>

                                    <div className="col-md-7 mt-3">
                                        <label className="form-label fw-medium mb-1">Compagnie d&apos;assurance</label>
                                        <input type="text" className="form-control form-control-sm" name="assurance_compagnie" value={form.assurance_compagnie ?? ''} onChange={handleChange} />
                                    </div>
                                    <div className="col-md-5 mt-3">
                                        <label className="form-label fw-medium mb-1">N° de police</label>
                                        <input type="text" className="form-control form-control-sm" name="assurance_numero_police" value={form.assurance_numero_police ?? ''} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-3">
                    <button type="submit" className="btn btn-primary btn-sm" disabled={enregistrement}>
                        {enregistrement && <span className="spinner-border spinner-border-sm me-1" />}
                        <i className="fas fa-save me-1" />Enregistrer
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SanteEleve;
