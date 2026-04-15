import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const TOPBAR_HEIGHT = 52;

const Topbar = ({ sidebarWidth = 260 }) => {
    const { user, deconnexion } = useAuth();
    const { nonLues, ouvrirPanel } = useNotifications();
    const navigate = useNavigate();

    const handleDeconnexion = async () => {
        await deconnexion();
        navigate('/login');
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: sidebarWidth,
            right: 0,
            height: TOPBAR_HEIGHT,
            background: '#fff',
            borderBottom: '1px solid #e5e7eb',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 20px',
            gap: 8,
            zIndex: 900,
        }}>
            {/* Cloche notifications */}
            <button
                onClick={ouvrirPanel}
                title="Notifications"
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#64748b', position: 'relative', padding: '6px 8px',
                    borderRadius: 8,
                }}
            >
                <i className="fas fa-bell" style={{ fontSize: 17 }} />
                {nonLues > 0 && (
                    <span style={{
                        position: 'absolute', top: 2, right: 2,
                        background: '#dc3545', color: '#fff',
                        borderRadius: '50%', width: 16, height: 16,
                        fontSize: 9, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontWeight: 700,
                    }}>
                        {nonLues > 99 ? '99+' : nonLues}
                    </span>
                )}
            </button>

            {/* Séparateur */}
            <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />

            {/* Avatar + nom */}
            <NavLink
                to="/MonProfil"
                style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    textDecoration: 'none', color: 'inherit', padding: '4px 8px',
                    borderRadius: 8,
                }}
            >
                <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#1a56a0', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', flexShrink: 0,
                }}>
                    {user?.photo_url
                        ? <img src={user.photo_url} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <i className="fas fa-user text-white" style={{ fontSize: 14 }} />
                    }
                </div>
                <div style={{ lineHeight: 1.2 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                        {user?.name || '—'}
                    </div>
                    {user?.role_label && (
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                            {user.role_label}
                        </div>
                    )}
                </div>
            </NavLink>

            {/* Séparateur */}
            <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />

            {/* Déconnexion */}
            <button
                onClick={handleDeconnexion}
                title="Se déconnecter"
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#64748b', padding: '6px 8px', borderRadius: 8,
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
                }}
            >
                <i className="fas fa-sign-out-alt" />
                <span>Déconnexion</span>
            </button>
        </div>
    );
};

export { TOPBAR_HEIGHT };
export default Topbar;
