import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const MenuGroupe = () => {
    const { user, deconnexion } = useAuth();
    const navigate = useNavigate();

    const handleDeconnexion = async () => {
        await deconnexion();
        navigate('/login');
    };

    return (
        <div className="wrapper-menu">
            <div className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>

                {/* En-tête groupe */}
                <div style={{
                    padding: '14px 16px 10px',
                    borderBottom: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex', alignItems: 'center', gap: 10,
                }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 8,
                        background: 'rgba(255,255,255,0.15)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <i className="fas fa-layer-group text-white" style={{ fontSize: 18 }} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{
                            color: 'white', fontWeight: 700, fontSize: 13,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {user?.group || 'Groupe Scolaire'}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                            Administration groupe
                        </div>
                    </div>
                </div>

                {/* Profil */}
                <div className="profile">
                    <div style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: '#1a56a0', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
                        border: '2px solid rgba(255,255,255,0.3)',
                    }}>
                        <i className="fas fa-user text-white" style={{ fontSize: 24 }} />
                    </div>
                    <h3 style={{ fontSize: 15, marginBottom: 2 }}>{user?.nom || '—'}</h3>
                    <p style={{ fontSize: 12, opacity: 0.8 }}>Admin Groupe</p>
                </div>

                {/* Navigation */}
                <nav className="text-left" style={{ flex: 1 }}>
                    <ul className="menu-flat">
                        <li>
                            <NavLink to="/groupe" end>
                                <span className="icon"><i className="fas fa-chart-bar" /></span>
                                <span className="item">Tableau de bord</span>
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/groupe/ecoles">
                                <span className="icon"><i className="fas fa-school" /></span>
                                <span className="item">Mes établissements</span>
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/groupe/enseignants">
                                <span className="icon"><i className="fas fa-chalkboard-teacher" /></span>
                                <span className="item">Activités des profs</span>
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/groupe/finances">
                                <span className="icon"><i className="fas fa-wallet" /></span>
                                <span className="item">Finances</span>
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/groupe/eleves">
                                <span className="icon"><i className="fas fa-user-graduate" /></span>
                                <span className="item">Élèves</span>
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/groupe/templates">
                                <span className="icon"><i className="fas fa-database" /></span>
                                <span className="item">Modèles de données</span>
                            </NavLink>
                        </li>
                    </ul>
                </nav>

                {/* Super-Admin — visible pour tous les admins groupe (opérateur) */}
                <div style={{ padding: '8px 16px 4px', borderTop: '1px solid rgba(255,255,255,0.12)', marginTop: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.45)' }}>
                        Super-Admin
                    </span>
                </div>
                <ul className="menu-flat">
                    <li>
                        <NavLink to="/superadmin/demandes">
                            <span className="icon"><i className="fas fa-inbox" /></span>
                            <span className="item">Demandes d'accès</span>
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/superadmin/abonnements">
                            <span className="icon"><i className="fas fa-credit-card" /></span>
                            <span className="item">Abonnements</span>
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/superadmin/tarifs">
                            <span className="icon"><i className="fas fa-tags" /></span>
                            <span className="item">Tarifs & Licences</span>
                        </NavLink>
                    </li>
                </ul>

                {/* Déconnexion */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                        onClick={handleDeconnexion}
                        style={{
                            width: '100%', background: 'rgba(255,255,255,0.1)',
                            border: 'none', color: 'white', borderRadius: 8,
                            padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}
                    >
                        <i className="fas fa-sign-out-alt" />
                        Se déconnecter
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MenuGroupe;
