import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const FormRemplacement = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const estModification = Boolean(id);

    const [creneaux, setCreneaux]     = useState([]);
    const [enseignants, setEnseignants] = useState([]);
    const [niveaux, setNiveaux]       = useState([]);
    const [matieres, setMatieres]     = useState([]);
    const [filtreNiveau, setFiltreNiveau]   = useState('');
    const [filtreMatiere, setFiltreMatiere] = useState('');
    const [form, setForm] = useState({
        creneau_id: '', date_remplacement: '', enseignant_absent_id: '',
        remplacant_id: '', statut: 'a_couvrir', motif_absence: '', note: '',
    });
    const [erreurs, setErreurs] = useState({});
    const [chargement, setChargement] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const reqs = [
            api.get('/emploiDuTemps').then(r => setCreneaux(r.data)),
            api.get('/enseignantsTout').then(r => setEnseignants(r.data)),
            api.get('/niveaux').then(r => setNiveaux(r.data)),
            api.get('/matieres').then(r => setMatieres(r.data)),
        ];
        if (estModification) {
            reqs.push(
                api.get(`/remplacements/${id}`).then(({ data }) => setForm({
                    creneau_id:           data.creneau_id,
                    date_remplacement:    data.date_remplacement,
                    enseignant_absent_id: data.enseignant_absent_id,
                    remplacant_id:        data.remplacant_id ?? '',
                    statut:               data.statut,
                    motif_absence:        data.motif_absence ?? '',
                    note:                 data.note ?? '',
                }))
            );
        }
        Promise.all(reqs).finally(() => setLoading(false));
    }, [id]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const soumettre = async (e) => {
        e.preventDefault();
        setErreurs({});
        setChargement(true);
        const payload = { ...form, remplacant_id: form.remplacant_id || null };
        try {
            if (estModification) {
                await api.put(`/remplacements/${id}`, payload);
                toast('Remplacement modifié.', 'success');
            } else {
                await api.post('/remplacements', payload);
                toast('Remplacement créé.', 'success');
            }
            navigate('/Remplacements');
        } catch (e) {
            if (e.response?.status === 422) setErreurs(e.response.data.errors ?? {});
            else toast(e.response?.data?.message || 'Erreur.', 'danger');
        } finally {
            setChargement(false);
        }
    };

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;

    const creneauLabel = (c) => `${c.classe?.nom_classe ?? '?'} · ${c.matiere?.libelle_matiere ?? '?'} · ${c.jour} ${c.heure_debut?.substring(0,5)}–${c.heure_fin?.substring(0,5)}`;

    const creneauxFiltres = creneaux.filter(c => {
        if (filtreNiveau  && String(c.classe?.niveau_id) !== String(filtreNiveau))  return false;
        if (filtreMatiere && String(c.matiere_id)        !== String(filtreMatiere)) return false;
        return true;
    });
    const enseignantLabel = (e) => `${e.nom_enseignant} ${e.prenoms_enseignant}`;

    return (
        <div className="container py-4" style={{ maxWidth: 700 }}>
            <div className="d-flex align-items-center mb-4 gap-3">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/Remplacements')}>
                    <i className="fas fa-arrow-left" />
                </button>
                <h4 className="mb-0">
                    <i className="fas fa-exchange-alt me-2 text-primary" />
                    {estModification ? 'Modifier le remplacement' : 'Nouveau remplacement'}
                </h4>
            </div>

            <div className="card">
                <div className="card-body">
                    <form onSubmit={soumettre}>
                        {/* Filtres pour réduire la liste des créneaux */}
                        {!estModification && (
                            <div className="row g-2 mb-2">
                                <div className="col-md-4">
                                    <label className="form-label small mb-1">Filtrer par niveau</label>
                                    <select className="form-select form-select-sm"
                                        value={filtreNiveau}
                                        onChange={e => { setFiltreNiveau(e.target.value); setFiltreMatiere(''); set('creneau_id', ''); }}>
                                        <option value="">Tous les niveaux</option>
                                        {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom_niveau}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label small mb-1">Filtrer par matière</label>
                                    <select className="form-select form-select-sm"
                                        value={filtreMatiere}
                                        onChange={e => { setFiltreMatiere(e.target.value); set('creneau_id', ''); }}>
                                        <option value="">Toutes les matières</option>
                                        {matieres.map(m => <option key={m.id} value={m.id}>{m.libelle_matiere}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                        <div className="row g-3 mb-3">
                            <div className="col-md-8">
                                <label className="form-label">Créneau <span className="text-danger">*</span></label>
                                <select className={`form-select ${erreurs.creneau_id ? 'is-invalid' : ''}`}
                                    value={form.creneau_id} onChange={e => set('creneau_id', e.target.value)} disabled={estModification}>
                                    <option value="">— Choisir un créneau —</option>
                                    {creneauxFiltres.map(c => <option key={c.id} value={c.id}>{creneauLabel(c)}</option>)}
                                </select>
                                {erreurs.creneau_id && <div className="invalid-feedback">{erreurs.creneau_id[0]}</div>}
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Date <span className="text-danger">*</span></label>
                                <input type="date" className={`form-control ${erreurs.date_remplacement ? 'is-invalid' : ''}`}
                                    value={form.date_remplacement} onChange={e => set('date_remplacement', e.target.value)} />
                                {erreurs.date_remplacement && <div className="invalid-feedback">{erreurs.date_remplacement[0]}</div>}
                            </div>
                        </div>

                        <div className="row g-3 mb-3">
                            <div className="col-md-6">
                                <label className="form-label">Enseignant absent <span className="text-danger">*</span></label>
                                <select className={`form-select ${erreurs.enseignant_absent_id ? 'is-invalid' : ''}`}
                                    value={form.enseignant_absent_id} onChange={e => set('enseignant_absent_id', e.target.value)}>
                                    <option value="">— Choisir —</option>
                                    {enseignants.map(e => <option key={e.id} value={e.id}>{enseignantLabel(e)}</option>)}
                                </select>
                                {erreurs.enseignant_absent_id && <div className="invalid-feedback">{erreurs.enseignant_absent_id[0]}</div>}
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Remplaçant</label>
                                <select className="form-select" value={form.remplacant_id} onChange={e => set('remplacant_id', e.target.value)}>
                                    <option value="">— Aucun remplaçant —</option>
                                    {enseignants
                                        .filter(e => String(e.id) !== String(form.enseignant_absent_id))
                                        .map(e => <option key={e.id} value={e.id}>{enseignantLabel(e)}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="row g-3 mb-3">
                            <div className="col-md-6">
                                <label className="form-label">Statut</label>
                                <select className="form-select" value={form.statut} onChange={e => set('statut', e.target.value)}>
                                    <option value="a_couvrir">À couvrir</option>
                                    <option value="couvert">Couvert</option>
                                    <option value="non_couvert">Non couvert</option>
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Motif d'absence</label>
                                <input className="form-control" value={form.motif_absence}
                                    onChange={e => set('motif_absence', e.target.value)} placeholder="Maladie, formation…" />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label">Note</label>
                            <textarea className="form-control" rows={3} value={form.note}
                                onChange={e => set('note', e.target.value)} />
                        </div>

                        <div className="d-flex gap-2">
                            <button type="submit" className="btn btn-primary" disabled={chargement}>
                                {chargement && <span className="spinner-border spinner-border-sm me-2" />}
                                {estModification ? 'Enregistrer' : 'Créer'}
                            </button>
                            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/Remplacements')}>
                                Annuler
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default FormRemplacement;
