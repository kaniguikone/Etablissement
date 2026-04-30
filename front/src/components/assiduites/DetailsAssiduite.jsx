import React, { useEffect, useState } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const STATUTS = ['present', 'absent', 'retard'];

const DetailsAssiduite = () => {
    const { toast } = useToast();
    const { id } = useParams();
    const navigate = useNavigate();
    const [eleves, setEleves]   = useState([]);
    const [matieres, setMatieres] = useState([]);
    const [periodeInfo, setPeriodeInfo]     = useState(null);
    const [periodeErreur, setPeriodeErreur] = useState('');
    const [form, setForm] = useState({
        date_assiduite: '',
        heure_debut:    '',
        heure_fin:      '',
        statut:         'present',
        remarque:       '',
        eleve_id:       '',
        matiere_id:     '',
    });

    useEffect(() => {
        api.get('/elevesTout').then((r) => setEleves(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
        api.get('/matieres').then((r) => setMatieres(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
        api.get(`/assiduites/${id}`)
            .then((r) => {
                const a = r.data;
                setForm({
                    date_assiduite: a.date_assiduite || '',
                    heure_debut:    a.heure_debut    || '',
                    heure_fin:      a.heure_fin      || '',
                    statut:         a.statut         || 'present',
                    remarque:       a.remarque       || '',
                    eleve_id:       a.eleve_id       || '',
                    matiere_id:     a.matiere_id     || '',
                });
            })
            .catch(() => toast.error('Impossible de charger les données.'));
    }, [id]);

    // Auto-résolution de la période depuis la date
    useEffect(() => {
        if (!form.date_assiduite) { setPeriodeInfo(null); setPeriodeErreur(''); return; }
        api.get('/periodes/parDate', { params: { date: form.date_assiduite } })
            .then(({ data }) => {
                if (data) { setPeriodeInfo(data); setPeriodeErreur(''); }
                else { setPeriodeInfo(null); setPeriodeErreur("Cette date n'appartient à aucune période scolaire."); }
            })
            .catch(() => setPeriodeErreur('Impossible de vérifier la période.'));
    }, [form.date_assiduite]);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const calculerDuree = (debut, fin) => {
        if (!debut || !fin) return null;
        const [hD, mD] = debut.split(':').map(Number);
        const [hF, mF] = fin.split(':').map(Number);
        const minutes = (hF * 60 + mF) - (hD * 60 + mD);
        if (minutes <= 0) return null;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!periodeInfo) {
            toast.error(periodeErreur || "Veuillez choisir une date dans une période scolaire.");
            return;
        }
        api.put(`/assiduites/${id}`, form)
            .then(() => { toast.success('Modifications enregistrées.'); navigate('/Assiduites'); })
            .catch((err) => {
                if (err.response?.data?.errors) {
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                } else {
                    toast.error("Une erreur est survenue lors de la mise à jour.");
                }
            });
    };

    return (
        <section className="page-wrapper">
            <div className="container bg-light mb-2 border">
                <div className="d-flex justify-content-between mb-2 border">
                    <h2 className="mt-2 container mb-1">Modifier l'assiduité</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3 justify-content-center">
                        <div className="mb-3 col-md-3">
                            <label className="form-label">Date</label>
                            <input type="date" className="form-control" name="date_assiduite" value={form.date_assiduite} onChange={handleChange} required />
                        </div>
                        <div className="mb-3 col-md-2">
                            <label className="form-label">Heure début</label>
                            <input type="time" className="form-control" name="heure_debut" value={form.heure_debut} onChange={handleChange} />
                        </div>
                        <div className="mb-3 col-md-2">
                            <label className="form-label">Heure fin</label>
                            <input type="time" className="form-control" name="heure_fin" value={form.heure_fin} onChange={handleChange} />
                        </div>
                        <div className="mb-3 col-md-2">
                            <label className="form-label">Durée</label>
                            <div className="form-control bg-light text-center fw-bold">
                                {calculerDuree(form.heure_debut, form.heure_fin) ?? '—'}
                            </div>
                        </div>
                        <div className="mb-3 col-md-3">
                            <label className="form-label">Statut</label>
                            <select className="form-select" name="statut" value={form.statut} onChange={handleChange} required>
                                {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="mb-3 col-md-12">
                            <label className="form-label">Remarque</label>
                            <input type="text" className="form-control" name="remarque" value={form.remarque} onChange={handleChange} />
                        </div>
                        <div className="mb-3 col-md-6">
                            <label className="form-label">Élève</label>
                            <select className="form-select" name="eleve_id" value={form.eleve_id} onChange={handleChange} required>
                                <option value="">Sélectionner</option>
                                {eleves.map((e) => <option key={e.id} value={e.id}>{e.nom_eleve} {e.prenoms_eleve}</option>)}
                            </select>
                        </div>
                        <div className="mb-3 col-md-6">
                            <label className="form-label">Matière</label>
                            <select className="form-select" name="matiere_id" value={form.matiere_id} onChange={handleChange} required>
                                <option value="">Sélectionner</option>
                                {matieres.map((m) => <option key={m.id} value={m.id}>{m.libelle_matiere}</option>)}
                            </select>
                        </div>
                        <div className="mb-3 col-md-6">
                            <label className="form-label">Période</label>
                            <div className="form-control bg-white d-flex align-items-center" style={{ minHeight: 38 }}>
                                {periodeInfo ? (
                                    <span className="badge bg-primary fs-6">{periodeInfo.libelle_periode} — {periodeInfo.annee}</span>
                                ) : periodeErreur ? (
                                    <span className="text-danger small">{periodeErreur}</span>
                                ) : (
                                    <span className="text-muted small">Automatique selon la date</span>
                                )}
                            </div>
                        </div>
                    </fieldset>
                    <div className="d-flex justify-content-end mb-3 gap-2">
                        <NavLink to="/Assiduites" className="btn btn-secondary">Retour</NavLink>
                        <button type="submit" className="btn btn-primary" disabled={!!periodeErreur}>Enregistrer</button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default DetailsAssiduite;
