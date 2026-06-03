import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ITEMS = [
    { to: '/superadmin/demandes',    icon: 'fas fa-inbox',       label: "Demandes d'accès" },
    { to: '/superadmin/abonnements', icon: 'fas fa-credit-card', label: 'Abonnements' },
    { to: '/superadmin/tarifs',      icon: 'fas fa-tags',        label: 'Tarifs & Licences' },
    { to: '/superadmin/templates',   icon: 'fas fa-layer-group', label: 'Modèles d\'établissement' },
];

const MenuSuperAdmin = () => {
    const { user, deconnexion } = useAuth();
    const navigate = useNavigate();

    const handleDeconnexion = async () => {
        await deconnexion();
        navigate('/login');
    };

    return (
        <div className="wrapper-menu">
            <div className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>

                {/* En-tête */}
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
                        <i className="fas fa-shield-alt text-white" style={{ fontSize: 18 }} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>
                            Suivi Scolaire
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                            Espace Opérateur
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
                        <i className="fas fa-user-shield text-white" style={{ fontSize: 22 }} />
                    </div>
                    <h3 style={{ fontSize: 15, marginBottom: 2 }}>{user?.nom || '—'}</h3>
                    <p style={{ fontSize: 12, opacity: 0.7 }}>Opérateur</p>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1 }}>
                    <div style={{ padding: '6px 16px 4px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.4)' }}>
                            Administration
                        </span>
                    </div>
                    <ul className="menu-flat">
                        {ITEMS.map(({ to, icon, label }) => (
                            <li key={to}>
                                <NavLink to={to}>
                                    <span className="icon"><i className={icon} /></span>
                                    <span className="item">{label}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Déconnexion */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <button onClick={handleDeconnexion} style={{
                        width: '100%', background: 'rgba(255,255,255,0.1)',
                        border: 'none', color: 'white', borderRadius: 8,
                        padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <i className="fas fa-sign-out-alt" />
                        Se déconnecter
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MenuSuperAdmin;
