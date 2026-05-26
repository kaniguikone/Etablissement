import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const CATEGORIES = {
    tenue:     'Tenue scolaire',
    manuel:    'Manuels scolaires',
    apes:      'Cotisation APES',
    examen:    "Frais d'examen",
    transport: 'Transport scolaire',
    cantine:   'Cantine / Restauration',
    activite:  'Activité parascolaire',
    autre:     'Autre',
};

const CAT_COLORS = {
    tenue:     'bg-info bg-opacity-10 text-info',
    manuel:    'bg-primary bg-opacity-10 text-primary',
    apes:      'bg-success bg-opacity-10 text-success',
    examen:    'bg-warning bg-opacity-10 text-warning',
    transport: 'bg-secondary bg-opacity-10 text-secondary',
    cantine:   'bg-danger bg-opacity-10 text-danger',
    activite:  'bg-purple bg-opacity-10 text-purple',
    autre:     'bg-dark bg-opacity-10 text-dark',
};

const VIDE = { nom: '', categorie: 'autre', montant: '', annee: '', niveau_id: '', obligatoire: true, description: '' };

export default function FraisAnnexesConfig() {
    const { toast }         = useToast();
    const { confirm }       = useConfirm();
    const [frais, setFrais] = useState([]);
    const [niveaux, setNiveaux] = useState([]);
    const [annees, setAnnees]   = useState([]);
    const [filtreAnnee, setFiltreAnnee] = useState('');
    const [chargement, setChargement]   = useState(true);
    const [modal, setModal]     = useState(false);
    const [form, setForm]       = useState(VIDE);
    const [editId, setEditId]   = useState(null);
    const [sauvegarde, setSauvegarde] = useState(false);
    const [erreurs, setErreurs] = useState({});

    const charger = async (annee = filtreAnnee) => {
        setChargement(true);
        try {
            const params = annee ? `?annee=${annee}` : '';
            const r = await api.get(`/frais-annexes${params}`);
            setFrais(r.data);
        } catch { toast.error('Erreur lors du chargement.'); }
        finally { setChargement(false); }
    };

    useEffect(() => {
        Promise.all([
            api.get('/niveaux'),
            api.get('/frais-annexes'),
        ]).then(([rn, rf]) => {
            setNiveaux(rn.data);
            setFrais(rf.data);
            // extraire les années existantes pour le filtre
            const ans = [...new Set(rf.data.map(f => f.annee))].sort().reverse();
            setAnnees(ans);
            if (ans[0]) setFiltreAnnee(ans[0]);
        }).catch(() => toast.error('Erreur lors du chargement.'))
          .finally(() => setChargement(false));
    }, []);

    const ouvrirCreation = () => {
        setForm({ ...VIDE, annee: filtreAnnee });
        setEditId(null);
        setErreurs({});
        setModal(true);
    };

    const ouvrirEdition = (f) => {
        setForm({
            nom: f.nom, categorie: f.categorie, montant: f.montant,
            annee: f.annee, niveau_id: f.niveau_id ?? '', obligatoire: f.obligatoire,
            description: f.description ?? '',
        });
        setEditId(f.id);
        setErreurs({});
        setModal(true);
    };

    const valider = () => {
        const e = {};
        if (!form.nom.trim())    e.nom     = 'Nom requis';
        if (!form.categorie)     e.categorie = 'Catégorie requise';
        if (!form.montant || isNaN(form.montant) || Number(form.montant) < 1)
                                 e.montant = 'Montant invalide';
        if (!form.annee.trim())  e.annee   = 'Année scolaire requise';
        setErreurs(e);
        return Object.keys(e).length === 0;
    };

    const sauvegarder = async (e) => {
        e.preventDefault();
        if (!valider()) return;
        setSauvegarde(true);
        try {
            const payload = { ...form, niveau_id: form.niveau_id || null };
            if (editId) {
                await api.put(`/frais-annexes/${editId}`, payload);
                toast.success('Frais mis à jour.');
            } else {
                await api.post('/frais-annexes', payload);
                toast.success('Frais créé.');
            }
            setModal(false);
            charger(filtreAnnee);
        } catch (err) {
            if (err.response?.data?.errors) setErreurs(err.response.data.errors);
            else toast.error('Erreur lors de l\'enregistrement.');
        } finally { setSauvegarde(false); }
    };

    const supprimer = async (f) => {
        const ok = await confirm(`Supprimer « ${f.nom} » ?`, 'Cette action est irréversible.');
        if (!ok) return;
        try {
            await api.delete(`/frais-annexes/${f.id}`);
            toast.success('Frais supprimé.');
            charger(filtreAnnee);
        } catch { toast.error('Impossible de supprimer ce frais.'); }
    };

    const fraisFiltres = filtreAnnee ? frais.filter(f => f.annee === filtreAnnee) : frais;

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="mb-0">Frais annexes</h4>
                    <small className="text-muted">Configuration des frais complémentaires (tenues, manuels, APES…)</small>
                </div>
                <button className="btn btn-primary" onClick={ouvrirCreation}>
                    <i className="bi bi-plus-lg me-1" /> Nouveau frais
                </button>
            </div>

            {/* Filtres */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-2">
                    <div className="row g-2 align-items-center">
                        <div className="col-auto">
                            <label className="form-label small mb-0 me-2">Année scolaire :</label>
                        </div>
                        <div className="col-auto">
                            <select className="form-select form-select-sm" value={filtreAnnee}
                                onChange={e => { setFiltreAnnee(e.target.value); charger(e.target.value); }}>
                                <option value="">Toutes les années</option>
                                {annees.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <div className="col">
                            <span className="text-muted small">
                                {fraisFiltres.length} frais configuré{fraisFiltres.length > 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tableau */}
            {chargement ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : fraisFiltres.length === 0 ? (
                <div className="alert alert-info text-center">Aucun frais configuré pour cette période.</div>
            ) : (
                <div className="card border-0 shadow-sm">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Désignation</th>
                                    <th>Catégorie</th>
                                    <th>Niveau</th>
                                    <th>Année</th>
                                    <th className="text-end">Montant</th>
                                    <th className="text-center">Obligatoire</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {fraisFiltres.map(f => (
                                    <tr key={f.id}>
                                        <td>
                                            <strong>{f.nom}</strong>
                                            {f.description && <div className="text-muted small">{f.description}</div>}
                                        </td>
                                        <td>
                                            <span className={`badge rounded-pill ${CAT_COLORS[f.categorie] ?? CAT_COLORS.autre}`}>
                                                {CATEGORIES[f.categorie] ?? f.categorie}
                                            </span>
                                        </td>
                                        <td>{f.niveau?.nom_niveau ?? <span className="text-muted">Tous les niveaux</span>}</td>
                                        <td>{f.annee}</td>
                                        <td className="text-end fw-semibold">
                                            {Number(f.montant).toLocaleString('fr-FR')} FCFA
                                        </td>
                                        <td className="text-center">
                                            {f.obligatoire
                                                ? <span className="badge bg-danger">Obligatoire</span>
                                                : <span className="badge bg-secondary">Facultatif</span>}
                                        </td>
                                        <td>
                                            <div className="d-flex gap-1 justify-content-end">
                                                <button className="btn btn-sm btn-outline-secondary"
                                                    onClick={() => ouvrirEdition(f)} title="Modifier">
                                                    <i className="bi bi-pencil" />
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger"
                                                    onClick={() => supprimer(f)} title="Supprimer">
                                                    <i className="bi bi-trash" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal création / édition */}
            {modal && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <div className="modal-dialog modal-md">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {editId ? 'Modifier le frais' : 'Nouveau frais annexe'}
                                </h5>
                                <button className="btn-close" onClick={() => setModal(false)} />
                            </div>
                            <form onSubmit={sauvegarder}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Désignation <span className="text-danger">*</span></label>
                                        <input className={`form-control ${erreurs.nom ? 'is-invalid' : ''}`}
                                            value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
                                        {erreurs.nom && <div className="invalid-feedback">{erreurs.nom}</div>}
                                    </div>

                                    <div className="row g-3 mb-3">
                                        <div className="col-6">
                                            <label className="form-label">Catégorie <span className="text-danger">*</span></label>
                                            <select className={`form-select ${erreurs.categorie ? 'is-invalid' : ''}`}
                                                value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                                                {Object.entries(CATEGORIES).map(([k, v]) => (
                                                    <option key={k} value={k}>{v}</option>
                                                ))}
                                            </select>
                                            {erreurs.categorie && <div className="invalid-feedback">{erreurs.categorie}</div>}
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label">Montant (FCFA) <span className="text-danger">*</span></label>
                                            <input type="number" min="1" className={`form-control ${erreurs.montant ? 'is-invalid' : ''}`}
                                                value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} />
                                            {erreurs.montant && <div className="invalid-feedback">{erreurs.montant}</div>}
                                        </div>
                                    </div>

                                    <div className="row g-3 mb-3">
                                        <div className="col-6">
                                            <label className="form-label">Année scolaire <span className="text-danger">*</span></label>
                                            <input className={`form-control ${erreurs.annee ? 'is-invalid' : ''}`}
                                                placeholder="ex : 2025-2026"
                                                value={form.annee} onChange={e => setForm(f => ({ ...f, annee: e.target.value }))} />
                                            {erreurs.annee && <div className="invalid-feedback">{erreurs.annee}</div>}
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label">Niveau concerné</label>
                                            <select className="form-select"
                                                value={form.niveau_id} onChange={e => setForm(f => ({ ...f, niveau_id: e.target.value }))}>
                                                <option value="">Tous les niveaux</option>
                                                {niveaux.map(n => (
                                                    <option key={n.id} value={n.id}>{n.nom_niveau}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Description (optionnelle)</label>
                                        <input className="form-control" value={form.description}
                                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                                    </div>

                                    <div className="form-check form-switch mb-1">
                                        <input className="form-check-input" type="checkbox" id="obligatoire"
                                            checked={form.obligatoire}
                                            onChange={e => setForm(f => ({ ...f, obligatoire: e.target.checked }))} />
                                        <label className="form-check-label" htmlFor="obligatoire">
                                            Frais obligatoire
                                            <small className="text-muted ms-1">(apparaît dans les relances impayés)</small>
                                        </label>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-outline-secondary"
                                        onClick={() => setModal(false)}>Annuler</button>
                                    <button type="submit" className="btn btn-primary" disabled={sauvegarde}>
                                        {sauvegarde
                                            ? <><span className="spinner-border spinner-border-sm me-2" />Enregistrement…</>
                                            : editId ? 'Enregistrer' : 'Créer le frais'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
