import { NavLink } from 'react-router-dom';
import { useEtablissement } from '../../context/EtablissementContext';

const items = [
    { to: '/enseignant',               icon: 'fas fa-tachometer-alt',  label: 'Tableau de bord',  exact: true },
    { to: '/enseignant/devoirs',       icon: 'fas fa-tasks',           label: 'Devoirs & Notes' },
    { to: '/enseignant/presence',      icon: 'fas fa-clipboard-check', label: 'Présences' },
    { to: '/enseignant/programme',     icon: 'fas fa-book-open',       label: 'Programme' },
    { to: '/enseignant/appreciations', icon: 'fas fa-comment-alt',     label: 'Appréciations' },
    { to: '/enseignant/emploi',        icon: 'fas fa-calendar-alt',    label: 'Emploi du temps' },
    { to: '/enseignant/remplacements', icon: 'fas fa-exchange-alt',    label: 'Remplacements' },
    { to: '/enseignant/messagerie',    icon: 'fas fa-comments',        label: 'Messagerie' },
    { to: '/enseignant/rdv',           icon: 'fas fa-calendar-check',  label: 'RDV Parents' },
    { to: '/enseignant/informations',  icon: 'fas fa-bell',            label: 'Informations' },
];

const MenuEnseignant = () => {
    const { etablissement } = useEtablissement();

    return (
        <div className="wrapper-menu">
            <div className="sidebar">
                {/* En-tête établissement */}
                <div style={{
                    padding: '0 14px',
                    height: 66,
                    borderBottom: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexShrink: 0,
                }}>
                    <div style={{
                        width: 46, height: 46, borderRadius: 10, overflow: 'hidden',
                        flexShrink: 0, background: 'rgba(255,255,255,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <img
                            src={etablissement?.logo_url || '/logo-default.svg'}
                            alt="Logo"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{
                            color: 'white', fontWeight: 700, fontSize: 13,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {etablissement?.nom || 'Mon Établissement'}
                        </div>
                        {etablissement?.ville && (
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                                {etablissement.ville}
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="text-left">
                    <ul className="menu-flat">
                        {items.map(({ to, icon, label, exact }) => (
                            <li key={to}>
                                <NavLink to={to} end={exact}>
                                    <span className="icon"><i className={icon} /></span>
                                    <span className="item">{label}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </div>
    );
};

export default MenuEnseignant;
