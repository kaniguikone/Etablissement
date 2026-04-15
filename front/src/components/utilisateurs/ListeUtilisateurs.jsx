import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const BADGE_ROLE = {
    super_admin: 'bg-danger',
    directeur:   'bg-primary',
    censeur:     'bg-info text-dark',
    secretaire:  'bg-secondary',
    comptable:   'bg-success',
};

const ListeUtilisateurs = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const location = useLocation();
    const [utilisateurs, setUtilisateurs] = useState([]);
    const [chargement, setChargement]     = useState(true);

    useEffect(() => { charger(); }, [location.key]);

    const charger = () => {
        setChargement(true);
        api.get('/utilisateurs')
            .then(res => { setUtilisateurs(res.data); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger les utilisateurs.'); setChargement(false); });
    };

    const basculerActif = async (u) => {
        const msg = u.actif
            ? `Désactiver le compte de ${u.name} ?`
            : `Réactiver le compte de ${u.name} ?`;
        if (!await confirmer(msg)) return;
        api.put(`/utilisateurs/${u.id}`, { actif: !u.actif })
            .then(() => charger())
            .catch(() => toast.error('Erreur lors de la mise à jour.'));
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">
                        <i className="fas fa-users-cog me-2 text-primary" />
                        Utilisateurs
                        <span className="badge bg-secondary ms-2" style={{ fontSize: 13 }}>{utilisateurs.length}</span>
                    </h4>
                    <NavLink to="/NouvelUtilisateur" className="btn btn-primary btn-sm">
                        <i className="fas fa-user-plus me-1" /> Nouvel utilisateur
                    </NavLink>
                </div>

                {chargement ? (
                    <div className="text-center my-4">
                        <div className="spinner-border text-primary" />
                    </div>
                ) : (
                    <table className="table table-striped table-sm">
                        <thead className="table-light">
                            <tr>
                                <th>#</th>
                                <th>Utilisateur</th>
                                <th>Téléphone</th>
                                <th>E-mail</th>
                                <th>Rôle</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {utilisateurs.length === 0 && (
                                <tr><td colSpan={7} className="text-center text-muted py-3">Aucun utilisateur.</td></tr>
                            )}
                            {utilisateurs.map((u, i) => (
                                <tr key={u.id} className={!u.actif ? 'opacity-50' : ''}>
                                    <td>{i + 1}</td>
                                    <td>
                                        <div className="d-flex align-items-center gap-2">
                                            <div style={{
                                                width: 32, height: 32, borderRadius: '50%',
                                                overflow: 'hidden', flexShrink: 0,
                                                backgroundColor: '#1a56a0',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {u.photo_url
                                                    ? <img src={u.photo_url} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    : <i className="fas fa-user text-white" style={{ fontSize: 14 }} />
                                                }
                                            </div>
                                            <span className="fw-semibold">{u.name}</span>
                                        </div>
                                    </td>
                                    <td>{u.telephone || '—'}</td>
                                    <td>{u.email}</td>
                                    <td>
                                        <span className={`badge ${BADGE_ROLE[u.role] || 'bg-secondary'}`}>
                                            {u.role_label}
                                        </span>
                                    </td>
                                    <td>
                                        {u.actif
                                            ? <span className="badge bg-success">Actif</span>
                                            : <span className="badge bg-danger">Désactivé</span>
                                        }
                                    </td>
                                    <td>
                                        <NavLink to={`/Utilisateurs/${u.id}`} className="btn btn-primary btn-sm me-1">
                                            Modifier
                                        </NavLink>
                                        <button
                                            className={`btn btn-sm ${u.actif ? 'btn-warning' : 'btn-success'}`}
                                            onClick={() => basculerActif(u)}
                                        >
                                            {u.actif ? 'Désactiver' : 'Réactiver'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    );
};

export default ListeUtilisateurs;
