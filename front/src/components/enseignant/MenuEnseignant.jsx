import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const SIDEBAR_WIDTH = 310;

const items = [
    { path: '/enseignant',              icon: 'fa-tachometer-alt', label: 'Tableau de bord', exact: true },
    { path: '/enseignant/devoirs',      icon: 'fa-tasks',          label: 'Devoirs & Notes' },
    { path: '/enseignant/presence',     icon: 'fa-clipboard-check',label: 'Présences' },
    { path: '/enseignant/programme',    icon: 'fa-book-open',      label: 'Programme' },
    { path: '/enseignant/emploi',       icon: 'fa-calendar-alt',   label: 'Emploi du temps' },
    { path: '/enseignant/remplacements',icon: 'fa-exchange-alt',   label: 'Remplacements' },
    { path: '/enseignant/messagerie',   icon: 'fa-comments',       label: 'Messagerie' },
    { path: '/enseignant/rdv',          icon: 'fa-calendar-check', label: 'RDV Parents' },
    { path: '/enseignant/informations', icon: 'fa-bell',           label: 'Informations' },
];

const MenuEnseignant = () => {
    const { user, deconnexion } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await deconnexion();
            navigate('/login');
        } catch {
            toast('Erreur lors de la déconnexion.', 'danger');
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0,
            width: SIDEBAR_WIDTH, height: '100vh',
            background: 'linear-gradient(180deg, #1a56a0 0%, #0d3b73 100%)',
            display: 'flex', flexDirection: 'column',
            zIndex: 1000, overflowY: 'auto',
            boxShadow: '2px 0 8px rgba(0,0,0,.15)',
        }}>
            {/* En-tête */}
            <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'rgba(255,255,255,.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}>
                        <i className="fas fa-chalkboard-teacher text-white" style={{ fontSize: 16 }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>
                            Espace Enseignant
                        </div>
                        <div style={{ color: 'rgba(255,255,255,.65)', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.name ?? ''}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '12px 0' }}>
                {items.map(({ path, icon, label, exact }) => (
                    <NavLink
                        key={path}
                        to={path}
                        end={exact}
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '11px 20px', textDecoration: 'none',
                            color: isActive ? '#fff' : 'rgba(255,255,255,.7)',
                            background: isActive ? 'rgba(255,255,255,.15)' : 'transparent',
                            borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                            fontSize: 13, fontWeight: isActive ? 600 : 400,
                            transition: 'all .15s',
                        })}
                    >
                        <i className={`fas ${icon}`} style={{ width: 18, textAlign: 'center' }} />
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* Déconnexion */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%', border: 'none', borderRadius: 8,
                        padding: '9px 0', cursor: 'pointer', fontSize: 13,
                        background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                >
                    <i className="fas fa-sign-out-alt" />
                    Déconnexion
                </button>
            </div>
        </div>
    );
};

export default MenuEnseignant;
