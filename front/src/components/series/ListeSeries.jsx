import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const ListeSeries = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const location = useLocation();
    const [series, setSeries]       = useState([]);
    const [chargement, setChargement] = useState(true);
    const [modal, setModal]         = useState(null); // null | { id?, nom, description }
    const [saving, setSaving]       = useState(false);

    useEffect(() => { charger(); }, [location.key]);

    const charger = () => {
        setChargement(true);
        api.get('/config-matieres')
            .then(r => { setSeries(r.data.series ?? []); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger les séries.'); setChargement(false); });
    };

    const sauvegarder = () => {
        setSaving(true);
        const { id, nom, description } = modal;
        const req = id
            ? api.put(`/config-matieres/series/${id}`, { nom, description })
            : api.post('/config-matieres/series', { nom, description });
        req.then(r => {
                setSeries(prev => id
                    ? prev.map(s => s.id === id ? r.data : s)
                    : [...prev, r.data]
                );
                setModal(null);
            })
            .catch(() => toast.error('Erreur lors de la sauvegarde.'))
            .finally(() => setSaving(false));
    };

    const supprimer = async (id) => {
        if (!await confirmer('Supprimer cette série ? Les classes associées perdront leur série.')) return;
        api.delete(`/config-matieres/series/${id}`)
            .then(() => setSeries(prev => prev.filter(s => s.id !== id)))
            .catch(() => toast.error('Impossible de supprimer cette série.'));
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-2">
                    <h4 className="mb-0">
                        <i className="fas fa-graduation-cap me-2 text-primary" />
                        Séries
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{series.length}</span>
                    </h4>
                    <button className="btn btn-primary btn-sm" onClick={() => setModal({ nom: '', description: '' })}>
                        <i className="fas fa-plus me-1" />Nouvelle série
                    </button>
                </div>

                <p className="text-muted small mb-3">
                    Définissez ici les séries de votre établissement (ex : S, L, ES, C, A…).
                    Elles pourront ensuite être assignées aux classes.
                </p>

                {chargement ? (
                    <div className="text-center my-4">
                        <div className="spinner-border text-primary" />
                    </div>
                ) : (
                    <table className="table table-striped table-sm">
                        <thead className="table-light">
                            <tr>
                                <th>#</th>
                                <th>Nom</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {series.length === 0 && (
                                <tr><td colSpan={4} className="text-center text-muted py-3">Aucune série définie.</td></tr>
                            )}
                            {series.map((s, i) => (
                                <tr key={s.id}>
                                    <td>{i + 1}</td>
                                    <td><span className="badge bg-primary">{s.nom}</span></td>
                                    <td>{s.description || <span className="text-muted">—</span>}</td>
                                    <td>
                                        <button className="btn btn-primary btn-sm me-1"
                                            onClick={() => setModal({ id: s.id, nom: s.nom, description: s.description ?? '' })}>
                                            Modifier
                                        </button>
                                        <button className="btn btn-danger btn-sm"
                                            onClick={() => supprimer(s.id)}>
                                            Supprimer
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {modal && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <div className="modal-dialog modal-sm">
                        <div className="modal-content border-0 shadow" style={{ borderRadius: 12 }}>
                            <div className="modal-header border-0 pb-0">
                                <h6 className="modal-title fw-bold">
                                    {modal.id ? 'Modifier la série' : 'Nouvelle série'}
                                </h6>
                                <button className="btn-close" onClick={() => setModal(null)} />
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">Nom *</label>
                                    <input className="form-control form-control-sm" placeholder="ex: S, L, ES, C"
                                        value={modal.nom}
                                        onChange={e => setModal(p => ({ ...p, nom: e.target.value }))} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">Description</label>
                                    <input className="form-control form-control-sm" placeholder="ex: Scientifique"
                                        value={modal.description ?? ''}
                                        onChange={e => setModal(p => ({ ...p, description: e.target.value }))} />
                                </div>
                            </div>
                            <div className="modal-footer border-0 pt-0">
                                <button className="btn btn-sm btn-secondary" onClick={() => setModal(null)}>Annuler</button>
                                <button className="btn btn-sm btn-primary" onClick={sauvegarder}
                                    disabled={!modal.nom.trim() || saving}>
                                    {saving && <span className="spinner-border spinner-border-sm me-1" />}
                                    <i className="fas fa-save me-1" />Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default ListeSeries;
