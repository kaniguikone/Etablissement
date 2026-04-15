import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const COULEURS = ['bg-danger', 'bg-primary', 'bg-success', 'bg-info text-dark', 'bg-warning text-dark', 'bg-secondary'];

const ListeRoles = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();
    const location = useLocation();
    const [roles, setRoles]         = useState([]);
    const [chargement, setChargement] = useState(true);

    useEffect(() => { charger(); }, [location.key]);

    const charger = () => {
        setChargement(true);
        api.get('/roles')
            .then(res => { setRoles(res.data); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger les rôles.'); setChargement(false); });
    };

    const supprimer = async (role) => {
        if (role.users_count > 0) {
            toast.error(`Impossible de supprimer "${role.label}" : ${role.users_count} utilisateur(s) y sont associés.`);
            return;
        }
        if (!await confirmer(`Supprimer le rôle "${role.label}" ?`)) return;
        api.delete(`/roles/${role.id}`)
            .then(() => charger())
            .catch(err => toast.error(err.response?.data?.message || 'Erreur lors de la suppression.'));
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Rôles et permissions</h4>
                    <NavLink to="/Roles/nouveau" className="btn btn-primary btn-sm">
                        <i className="fas fa-plus me-1" /> Nouveau rôle
                    </NavLink>
                </div>

                {chargement ? (
                    <div className="text-center my-4"><div className="spinner-border text-primary" /></div>
                ) : (
                    <div className="row g-3">
                        {roles.map((role, i) => (
                            <div key={role.id} className="col-md-6 col-lg-4">
                                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <h6 className="fw-bold mb-1">{role.label}</h6>
                                                <code className="text-muted small">{role.nom}</code>
                                            </div>
                                            <div className="d-flex gap-1 align-items-center">
                                                {role.super && (
                                                    <span className="badge bg-danger">Super</span>
                                                )}
                                                {!role.actif && (
                                                    <span className="badge bg-secondary">Inactif</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            {role.super ? (
                                                <span className="badge bg-dark">Toutes les permissions</span>
                                            ) : (role.permissions?.length === 0 ? (
                                                <span className="text-muted small">Aucune permission</span>
                                            ) : (
                                                <div className="d-flex flex-wrap gap-1">
                                                    {role.permissions?.map((p, j) => (
                                                        <span key={p} className={`badge ${COULEURS[j % COULEURS.length]}`} style={{ fontSize: '0.75rem' }}>
                                                            {p}
                                                        </span>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="text-muted small">
                                                <i className="fas fa-users me-1" />{role.users_count} utilisateur{role.users_count !== 1 ? 's' : ''}
                                            </span>
                                            <div className="d-flex gap-1">
                                                <NavLink to={`/Roles/${role.id}`} className="btn btn-primary btn-sm">
                                                    Modifier
                                                </NavLink>
                                                <button className="btn btn-danger btn-sm" onClick={() => supprimer(role)}
                                                    disabled={role.users_count > 0}>
                                                    Supprimer
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default ListeRoles;
