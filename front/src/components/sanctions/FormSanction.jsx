import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { TYPES } from './ListeSanctions';

const VIDE = {
    eleve_id: '', type: 'avertissement', motif: '',
    description: '', date_sanction: new Date().toISOString().slice(0, 10),
    date_fin: '', prononcee_par: '', parent_notifie: false,
};

const FormSanction = () => {
    const { id } = useParams();           // présent en mode édition
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [form, setForm]       = useState({ ...VIDE, eleve_id: searchParams.get('eleve_id') || '' });
    const [eleves, setEleves]   = useState([]);
    const [eleve, setEleve]     = useState(null);  // infos de l'élève sélectionné
    const [envoi, setEnvoi]     = useState(false);

    useEffect(() => {
        api.get('/elevesTout').then(r => setEleves(r.data)).catch(() => toast.error('Erreur de chargement des données.'));

        if (id) {
            api.get(`/sanctions/${id}`).then(r => {
                const s = r.data;
                setForm({
                    eleve_id:       s.eleve_id,
                    type:           s.type,
                    motif:          s.motif,
                    description:    s.description || '',
                    date_sanction:  s.date_sanction?.slice(0, 10) || '',
                    date_fin:       s.date_fin?.slice(0, 10) || '',
                    prononcee_par:  s.prononcee_par || '',
                    parent_notifie: s.parent_notifie,
                });
                setEleve(s.eleve);
            }).catch(() => toast.error('Impossible de charger la sanction.'));
        }
    }, [id]);

    // Charger les infos de l'élève quand eleve_id change
    useEffect(() => {
        if (!form.eleve_id) { setEleve(null); return; }
        const found = eleves.find(e => String(e.id) === String(form.eleve_id));
        if (found) setEleve(found);
    }, [form.eleve_id, eleves]);

    const changer = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const aDateFin = ['exclusion_temp'].includes(form.type);

    const soumettre = async (e) => {
        e.preventDefault();
        if (!form.eleve_id || !form.motif || !form.date_sanction) {
            toast.error('Élève, motif et date sont requis.');
            return;
        }
        setEnvoi(true);
        try {
            const payload = {
                ...form,
                date_fin: aDateFin ? (form.date_fin || null) : null,
            };
            if (id) {
                await api.put(`/sanctions/${id}`, payload);
                toast.success('Sanction mise à jour.');
            } else {
                const r = await api.post('/sanctions', payload);
                toast.success('Sanction enregistrée.');
                navigate(`/SanctionsEleve/${r.data.eleve_id}`);
                return;
            }
            navigate('/Sanctions');
        } catch (err) {
            const msgs = err.response?.data?.errors;
            toast.error(msgs ? Object.values(msgs).flat().join(' ') : 'Erreur lors de l\'enregistrement.');
        } finally {
            setEnvoi(false);
        }
    };

    const typeInfo = TYPES[form.type];

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">
                        <i className="fas fa-gavel me-2 text-danger" />
                        {id ? 'Modifier la sanction' : 'Nouvelle sanction'}
                    </h4>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>Retour</button>
                </div>

                <form onSubmit={soumettre}>
                    <div className="row g-3">

                        {/* Élève */}
                        <div className="col-md-6">
                            <label className="form-label fw-semibold">Élève *</label>
                            <select
                                className="form-select"
                                value={form.eleve_id}
                                onChange={e => changer('eleve_id', e.target.value)}
                                required
                                disabled={!!id}
                            >
                                <option value="">Sélectionner un élève</option>
                                {eleves.map(e => (
                                    <option key={e.id} value={e.id}>
                                        {e.nom_eleve} {e.prenoms_eleve} — {e.matricule_eleve}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Infos élève */}
                        {eleve && (
                            <div className="col-md-6 d-flex align-items-end">
                                <div className="alert alert-light border py-2 px-3 mb-0 w-100" style={{ fontSize: 13 }}>
                                    <i className="fas fa-user-graduate me-1 text-primary" />
                                    <strong>{eleve.nom_eleve} {eleve.prenoms_eleve}</strong>
                                    {eleve.classe && <span className="ms-2 text-muted">· {eleve.classe.nom_classe}</span>}
                                </div>
                            </div>
                        )}

                        {/* Type */}
                        <div className="col-md-4">
                            <label className="form-label fw-semibold">Type de sanction *</label>
                            <select
                                className="form-select"
                                value={form.type}
                                onChange={e => changer('type', e.target.value)}
                            >
                                {Object.entries(TYPES).map(([v, t]) => (
                                    <option key={v} value={v}>{t.label}</option>
                                ))}
                            </select>
                            {typeInfo && (
                                <div className="mt-1">
                                    <span className={`badge ${typeInfo.cls}`}>
                                        <i className={`${typeInfo.icon} me-1`} />{typeInfo.label}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Date sanction */}
                        <div className="col-md-4">
                            <label className="form-label fw-semibold">Date *</label>
                            <input
                                type="date"
                                className="form-control"
                                value={form.date_sanction}
                                onChange={e => changer('date_sanction', e.target.value)}
                                required
                            />
                        </div>

                        {/* Date fin (exclusion temp seulement) */}
                        {aDateFin && (
                            <div className="col-md-4">
                                <label className="form-label fw-semibold">Date de fin</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={form.date_fin}
                                    min={form.date_sanction}
                                    onChange={e => changer('date_fin', e.target.value)}
                                />
                            </div>
                        )}

                        {/* Prononcée par */}
                        <div className="col-md-4">
                            <label className="form-label fw-semibold">Prononcée par</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Nom du responsable"
                                value={form.prononcee_par}
                                onChange={e => changer('prononcee_par', e.target.value)}
                            />
                        </div>

                        {/* Motif */}
                        <div className="col-12">
                            <label className="form-label fw-semibold">Motif *</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Motif de la sanction"
                                value={form.motif}
                                onChange={e => changer('motif', e.target.value)}
                                maxLength={300}
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="col-12">
                            <label className="form-label fw-semibold">Description / Observations</label>
                            <textarea
                                className="form-control"
                                rows={3}
                                placeholder="Détails supplémentaires (facultatif)…"
                                value={form.description}
                                onChange={e => changer('description', e.target.value)}
                            />
                        </div>

                        {/* Notifier parent */}
                        <div className="col-12">
                            <div className="form-check form-switch">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="chkNotif"
                                    checked={form.parent_notifie}
                                    onChange={e => changer('parent_notifie', e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="chkNotif">
                                    Notifier le parent / tuteur
                                    <span className="text-muted ms-1" style={{ fontSize: 12 }}>
                                        (envoie une notification dans l'application mobile)
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex gap-2 mt-4">
                        <button type="submit" className="btn btn-primary" disabled={envoi}>
                            {envoi && <span className="spinner-border spinner-border-sm me-1" />}
                            {id ? 'Enregistrer les modifications' : 'Enregistrer la sanction'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
                            Annuler
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default FormSanction;
