import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

export default function BudgetCategories() {
    const { toast }   = useToast();
    const { confirmer } = useConfirm();

    const [categories, setCategories] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [modal, setModal]   = useState(false);
    const [editId, setEditId] = useState(null);
    const [nom, setNom]       = useState('');
    const [erreur, setErreur] = useState('');
    const [sauvegarde, setSauvegarde] = useState(false);

    const charger = () => {
        setChargement(true);
        api.get('/budget/categories-depense')
            .then(r => setCategories(r.data))
            .catch(() => toast.error('Erreur lors du chargement.'))
            .finally(() => setChargement(false));
    };

    useEffect(() => { charger(); }, []);

    const ouvrirCreation = () => { setEditId(null); setNom(''); setErreur(''); setModal(true); };
    const ouvrirEdition  = (c) => { setEditId(c.id); setNom(c.nom); setErreur(''); setModal(true); };

    const enregistrer = async (e) => {
        e.preventDefault();
        if (!nom.trim()) { setErreur('Nom requis'); return; }
        setSauvegarde(true);
        try {
            if (editId) {
                await api.put(`/budget/categories-depense/${editId}`, { nom });
                toast.success('Catégorie mise à jour.');
            } else {
                await api.post('/budget/categories-depense', { nom });
                toast.success('Catégorie créée.');
            }
            setModal(false);
            charger();
        } catch (err) {
            setErreur(err.response?.data?.errors?.nom?.[0] || err.response?.data?.message || 'Erreur lors de l\'enregistrement.');
        } finally { setSauvegarde(false); }
    };

    const toggleActif = async (c) => {
        try {
            await api.put(`/budget/categories-depense/${c.id}`, { nom: c.nom, actif: !c.actif });
            charger();
        } catch { toast.error('Erreur lors de la mise à jour.'); }
    };

    const supprimer = async (c) => {
        const ok = await confirmer(`Supprimer la catégorie « ${c.nom} » ? Cette action est irréversible.`);
        if (!ok) return;
        try {
            await api.delete(`/budget/categories-depense/${c.id}`);
            toast.success('Catégorie supprimée.');
            charger();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Impossible de supprimer cette catégorie.');
        }
    };

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="mb-0">Catégories de dépenses</h4>
                    <small className="text-muted">Référentiel utilisé pour catégoriser les dépenses du budget</small>
                </div>
                <button className="btn btn-primary" onClick={ouvrirCreation}>
                    <i className="fas fa-plus me-1" /> Nouvelle catégorie
                </button>
            </div>

            {chargement ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : categories.length === 0 ? (
                <div className="alert alert-info text-center">Aucune catégorie configurée.</div>
            ) : (
                <div className="card border-0 shadow-sm">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr><th>Nom</th><th className="text-center">Actif</th><th /></tr>
                            </thead>
                            <tbody>
                                {categories.map(c => (
                                    <tr key={c.id}>
                                        <td className="fw-semibold">{c.nom}</td>
                                        <td className="text-center">
                                            <div className="form-check form-switch d-inline-block">
                                                <input className="form-check-input" type="checkbox" checked={c.actif}
                                                    onChange={() => toggleActif(c)} />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="d-flex gap-1 justify-content-end">
                                                <button className="btn btn-sm btn-outline-secondary" onClick={() => ouvrirEdition(c)} title="Modifier">
                                                    <i className="fas fa-pencil-alt" />
                                                </button>
                                                <button className="btn btn-sm btn-outline-danger" onClick={() => supprimer(c)} title="Supprimer">
                                                    <i className="fas fa-trash" />
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

            {modal && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <div className="modal-dialog modal-sm">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{editId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h5>
                                <button className="btn-close" onClick={() => setModal(false)} />
                            </div>
                            <form onSubmit={enregistrer}>
                                <div className="modal-body">
                                    <label className="form-label">Nom <span className="text-danger">*</span></label>
                                    <input className={`form-control ${erreur ? 'is-invalid' : ''}`}
                                        value={nom} onChange={e => setNom(e.target.value)} autoFocus />
                                    {erreur && <div className="invalid-feedback">{erreur}</div>}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-outline-secondary" onClick={() => setModal(false)}>Annuler</button>
                                    <button type="submit" className="btn btn-primary" disabled={sauvegarde}>
                                        {sauvegarde ? <span className="spinner-border spinner-border-sm" /> : (editId ? 'Enregistrer' : 'Créer')}
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
