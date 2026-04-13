import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const FormSalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const estModification = Boolean(id);

    const [form, setForm] = useState({
        nom: '', capacite: '', type: 'classe', batiment: '', actif: true,
    });
    const [erreurs, setErreurs] = useState({});
    const [chargement, setChargement] = useState(false);
    const [loading, setLoading] = useState(estModification);

    useEffect(() => {
        if (!estModification) return;
        api.get(`/salles/${id}`)
            .then(({ data }) => setForm({
                nom: data.nom,
                capacite: data.capacite ?? '',
                type: data.type,
                batiment: data.batiment ?? '',
                actif: data.actif,
            }))
            .catch(() => toast('Salle introuvable.', 'danger'))
            .finally(() => setLoading(false));
    }, [id]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const soumettre = async (e) => {
        e.preventDefault();
        setErreurs({});
        setChargement(true);
        const payload = { ...form, capacite: form.capacite || null };
        try {
            if (estModification) {
                await api.put(`/salles/${id}`, payload);
                toast('Salle modifiée avec succès.', 'success');
            } else {
                await api.post('/salles', payload);
                toast('Salle créée avec succès.', 'success');
            }
            navigate('/Salles');
        } catch (e) {
            if (e.response?.status === 422) {
                setErreurs(e.response.data.errors ?? {});
            } else {
                toast(e.response?.data?.message || 'Erreur.', 'danger');
            }
        } finally {
            setChargement(false);
        }
    };

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;

    return (
        <div className="container py-4" style={{ maxWidth: 600 }}>
            <div className="d-flex align-items-center mb-4 gap-3">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/Salles')}>
                    <i className="fas fa-arrow-left" />
                </button>
                <h4 className="mb-0">
                    <i className="fas fa-door-open me-2 text-primary" />
                    {estModification ? 'Modifier la salle' : 'Nouvelle salle'}
                </h4>
            </div>

            <div className="card">
                <div className="card-body">
                    <form onSubmit={soumettre}>
                        <div className="mb-3">
                            <label className="form-label">Nom de la salle <span className="text-danger">*</span></label>
                            <input className={`form-control ${erreurs.nom ? 'is-invalid' : ''}`}
                                value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex : Salle A12" />
                            {erreurs.nom && <div className="invalid-feedback">{erreurs.nom[0]}</div>}
                        </div>

                        <div className="row g-3 mb-3">
                            <div className="col-md-6">
                                <label className="form-label">Type <span className="text-danger">*</span></label>
                                <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                                    <option value="classe">Salle de classe</option>
                                    <option value="labo">Laboratoire</option>
                                    <option value="salle_info">Salle informatique</option>
                                    <option value="gymnase">Gymnase</option>
                                    <option value="autre">Autre</option>
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Capacité (places)</label>
                                <input type="number" min="1" className={`form-control ${erreurs.capacite ? 'is-invalid' : ''}`}
                                    value={form.capacite} onChange={e => set('capacite', e.target.value)} placeholder="Ex : 35" />
                                {erreurs.capacite && <div className="invalid-feedback">{erreurs.capacite[0]}</div>}
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Bâtiment</label>
                            <input className="form-control" value={form.batiment} onChange={e => set('batiment', e.target.value)} placeholder="Ex : Bâtiment B" />
                        </div>

                        <div className="mb-4">
                            <div className="form-check form-switch">
                                <input className="form-check-input" type="checkbox" checked={form.actif}
                                    onChange={e => set('actif', e.target.checked)} id="actifSwitch" />
                                <label className="form-check-label" htmlFor="actifSwitch">Salle active</label>
                            </div>
                        </div>

                        <div className="d-flex gap-2">
                            <button type="submit" className="btn btn-primary" disabled={chargement}>
                                {chargement ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                                {estModification ? 'Enregistrer' : 'Créer la salle'}
                            </button>
                            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/Salles')}>
                                Annuler
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default FormSalle;
