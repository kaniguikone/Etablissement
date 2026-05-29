import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const DemandesParents = () => {
    const { toast } = useToast();
    const [demandes, setDemandes]     = useState([]);
    const [slots, setSlots]           = useState(null);
    const [chargement, setChargement] = useState(true);
    const [action, setAction]         = useState(null); // id en cours

    const charger = async () => {
        setChargement(true);
        try {
            const [resDemandes, resSlots] = await Promise.all([
                api.get('/parents/demandes'),
                api.get('/parents/slots'),
            ]);
            setDemandes(resDemandes.data);
            setSlots(resSlots.data);
        } catch {
            toast('Erreur lors du chargement.', 'danger');
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => { charger(); }, []);

    const approuver = async (id) => {
        setAction(id);
        try {
            await api.post(`/parents/demandes/${id}/approuver`);
            toast('Accès accordé.', 'success');
            charger();
        } catch (err) {
            toast(err.response?.data?.message || 'Erreur.', 'danger');
        } finally {
            setAction(null);
        }
    };

    const rejeter = async (id) => {
        if (!window.confirm('Rejeter cette demande ?')) return;
        setAction(id);
        try {
            await api.post(`/parents/demandes/${id}/rejeter`);
            toast('Demande rejetée.', 'info');
            charger();
        } catch {
            toast('Erreur.', 'danger');
        } finally {
            setAction(null);
        }
    };

    return (
        <div className="container-fluid py-4">
            <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
                <div>
                    <h4 className="fw-bold mb-0">Demandes d'accès parents</h4>
                    <p className="text-muted small mb-0">Parents en attente de validation pour le portail</p>
                </div>
                {slots && (
                    <div className="ms-auto">
                        <span className="badge bg-light text-dark border px-3 py-2" style={{ fontSize: 13 }}>
                            <i className="fas fa-users me-2 text-primary" />
                            Slots : {slots.slots_utilises} / {slots.slots_achetes}
                            {slots.slots_disponibles > 0
                                ? <span className="text-success ms-2">({slots.slots_disponibles} disponibles)</span>
                                : <span className="text-danger ms-2">(épuisés)</span>
                            }
                        </span>
                    </div>
                )}
            </div>

            {chargement ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" />
                </div>
            ) : demandes.length === 0 ? (
                <div className="text-center py-5 text-muted">
                    <i className="fas fa-check-circle fa-2x mb-3 text-success" />
                    <p>Aucune demande en attente.</p>
                </div>
            ) : (
                <div className="card shadow-sm">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Élève</th>
                                    <th>Classe</th>
                                    <th>Parent(s)</th>
                                    <th>Date</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {demandes.map(d => (
                                    <tr key={d.subscription_id}>
                                        <td>
                                            <div className="fw-semibold">{d.eleve.nom} {d.eleve.prenoms}</div>
                                            <div className="text-muted small">{d.eleve.matricule}</div>
                                        </td>
                                        <td className="small">{d.eleve.classe ?? '—'}</td>
                                        <td>
                                            {d.parents.map(p => (
                                                <div key={p.id} className="small">
                                                    {p.nom} {p.prenom}
                                                    <span className="text-muted ms-1">· {p.numero}</span>
                                                </div>
                                            ))}
                                        </td>
                                        <td className="small text-muted">
                                            {new Date(d.created_at).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="text-end">
                                            <div className="d-flex justify-content-end gap-2">
                                                <button
                                                    className="btn btn-sm btn-success"
                                                    onClick={() => approuver(d.subscription_id)}
                                                    disabled={action === d.subscription_id}
                                                >
                                                    {action === d.subscription_id
                                                        ? <span className="spinner-border spinner-border-sm" />
                                                        : <><i className="fas fa-check me-1" />Approuver</>
                                                    }
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => rejeter(d.subscription_id)}
                                                    disabled={action === d.subscription_id}
                                                >
                                                    <i className="fas fa-times me-1" />Rejeter
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
        </div>
    );
};

export default DemandesParents;
