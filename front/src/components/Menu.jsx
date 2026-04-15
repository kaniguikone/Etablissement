import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEtablissement } from '../context/EtablissementContext';

// Définition des groupes de menu avec les permissions requises
// permissions: null = tous les connectés, sinon tableau de clés de permission
const GROUPES = [
    // ── Accueil ──────────────────────────────────────────────────────────────
    {
        label: null,
        items: [
            { to: '/', icon: 'fas fa-home', label: 'Accueil' },
        ],
    },

    // ── Inscriptions ─────────────────────────────────────────────────────────
    {
        label: 'Inscriptions',
        icon: 'fas fa-user-plus',
        permissions: ['inscriptions'],
        items: [
            { to: '/Inscriptions',        icon: 'fas fa-list-check',    label: 'Demandes' },
            { to: '/NouvelleInscription', icon: 'fas fa-pen-to-square', label: 'Nouvelle inscription' },
        ],
    },

    // ── Élèves ───────────────────────────────────────────────────────────────
    {
        label: 'Élèves',
        icon: 'fas fa-user-graduate',
        permissions: ['eleves'],
        items: [
            { to: '/Eleves',       icon: 'fas fa-list',           label: 'Liste des élèves' },
            { to: '/NouvelEleve',  icon: 'fas fa-user-plus',      label: 'Ajouter un élève' },
            { to: '/Attestations', icon: 'fas fa-file-signature', label: 'Attestations' },
            { to: '/Sanctions',    icon: 'fas fa-gavel',          label: 'Sanctions' },
        ],
    },

    // ── Enseignants ──────────────────────────────────────────────────────────
    {
        label: 'Enseignants',
        icon: 'fas fa-chalkboard-teacher',
        permissions: ['enseignants'],
        items: [
            { to: '/Enseignants',      icon: 'fas fa-list',      label: 'Liste des enseignants' },
            { to: '/NouvelEnseignant', icon: 'fas fa-user-plus', label: 'Ajouter un enseignant' },
        ],
    },

    // ── Parents ──────────────────────────────────────────────────────────────
    {
        label: 'Parents',
        icon: 'fas fa-user-friends',
        permissions: ['parents'],
        items: [
            { to: '/Parents',       icon: 'fas fa-list',      label: 'Liste des parents' },
            { to: '/NouveauParent', icon: 'fas fa-user-plus', label: 'Ajouter un parent' },
        ],
    },

    // ── Pédagogie ────────────────────────────────────────────────────────────
    {
        label: 'Pédagogie',
        icon: 'fas fa-graduation-cap',
        permissions: ['pedagogie'],
        items: [
            { to: '/Calendrier',        icon: 'fas fa-calendar-alt',    label: 'Calendrier scolaire' },
            { to: '/EmploiDuTemps',     icon: 'fas fa-calendar-week',   label: 'Emploi du temps' },
            { to: '/Assiduites',        icon: 'fas fa-clipboard-check', label: 'Assiduités' },
            { to: '/Devoirs',           icon: 'fas fa-file-alt',        label: 'Devoirs / Notes' },
            { to: '/Bulletins',         icon: 'fas fa-file-pdf',        label: 'Bulletins' },
            { to: '/GestionChapitres',  icon: 'fas fa-book-open',       label: 'Programme' },
            { to: '/SuiviProgressions', icon: 'fas fa-tasks',           label: 'Suivi des progressions' },
            { to: '/Remplacements',     icon: 'fas fa-exchange-alt',    label: 'Remplacements' },
            { to: '/ConformiteEdt',     icon: 'fas fa-balance-scale',   label: 'Conformité EDT' },
            { to: '/ChargeEnseignants', icon: 'fas fa-user-clock',      label: 'Charge enseignants' },
        ],
    },

    // ── Finances ─────────────────────────────────────────────────────────────
    {
        label: 'Finances',
        icon: 'fas fa-wallet',
        permissions: ['finances'],
        items: [
            { to: '/Scolarites',     icon: 'fas fa-money-bill-wave',  label: 'Scolarités' },
            { to: '/Paiements',      icon: 'fas fa-hand-holding-usd', label: 'Paiements' },
            { to: '/RecapPaiements', icon: 'fas fa-table',            label: 'Récap par niveau' },
            { to: '/Impayes',        icon: 'fas fa-exclamation-circle', label: 'Tableau des impayés' },
            { to: '/Echeancier',     icon: 'fas fa-calendar-alt',     label: 'Échéancier' },
        ],
    },

    // ── Communication ────────────────────────────────────────────────────────
    {
        label: 'Communication',
        icon: 'fas fa-bullhorn',
        permissions: ['communication'],
        items: [
            { to: '/Informations', icon: 'fas fa-info-circle',    label: 'Informations' },
            { to: '/Messagerie',   icon: 'fas fa-comments',       label: 'Messagerie' },
            { to: '/RDV',          icon: 'fas fa-calendar-check', label: 'RDV Parents-Profs' },
        ],
    },

    // ── Administration ───────────────────────────────────────────────────────
    {
        label: 'Administration',
        icon: 'fas fa-shield-alt',
        permissions: ['utilisateurs'],
        items: [
            { to: '/Utilisateurs', icon: 'fas fa-users-cog',   label: 'Utilisateurs' },
            { to: '/Roles',        icon: 'fas fa-user-shield', label: 'Rôles et permissions' },
        ],
    },

    // ── Paramétrage ──────────────────────────────────────────────────────────
    {
        label: 'Paramétrage',
        icon: 'fas fa-cog',
        permissions: ['parametrage'],
        items: [
            { to: '/Etablissement', icon: 'fas fa-school',       label: 'Établissement' },
            { to: '/Niveaux',       icon: 'fas fa-layer-group',  label: 'Niveaux' },
            { to: '/Classes',       icon: 'fas fa-school',       label: 'Classes' },
            { to: '/Matieres',      icon: 'fas fa-book',         label: 'Matières' },
            { to: '/ConfigMatieres',icon: 'fas fa-sliders-h',     label: 'Config. matières/niveaux' },
            { to: '/Series',        icon: 'fas fa-graduation-cap', label: 'Séries' },
            { to: '/TypeDevoirs',   icon: 'fas fa-tags',           label: 'Types de devoirs' },
            { to: '/Periodes',      icon: 'fas fa-calendar-alt', label: 'Périodes' },
            { to: '/Salles',        icon: 'fas fa-door-open',    label: 'Salles' },
            { to: '/VolumeHoraire', icon: 'fas fa-clock',        label: 'Volumes horaires' },
            { to: '/Archivage',     icon: 'fas fa-archive',      label: 'Archivage fin d\'année' },
        ],
    },

    // ── Statistiques (pilotage — en bas) ─────────────────────────────────────
    {
        label: 'Statistiques',
        icon: 'fas fa-chart-bar',
        permissions: ['pedagogie', 'finances'],
        items: [
            { to: '/Statistiques', icon: 'fas fa-chart-bar', label: 'Tableaux de bord' },
        ],
    },
];

const MenuGroup = ({ group, open, onToggle }) => {
    const location = useLocation();
    const isGroupActive = group.items.some(item =>
        item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
    );

    if (!group.label) {
        return (
            <ul className="menu-flat">
                {group.items.map(item => (
                    <li key={item.to}>
                        <NavLink to={item.to} end>
                            <span className="icon"><i className={item.icon} /></span>
                            <span className="item">{item.label}</span>
                        </NavLink>
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <div className={`menu-group ${isGroupActive ? 'group-active' : ''}`}>
            <button className={`menu-group-header ${open ? 'open' : ''}`} onClick={onToggle}>
                <span className="icon"><i className={group.icon} /></span>
                <span className="item">{group.label}</span>
                <span className="chevron"><i className={`fas fa-chevron-${open ? 'down' : 'right'}`} /></span>
            </button>
            {open && (
                <ul className="menu-sub">
                    {group.items.map(item => (
                        <li key={item.to}>
                            <NavLink to={item.to}>
                                <span className="icon"><i className={item.icon} /></span>
                                <span className="item">{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const Menu = () => {
    const { peutAcceder } = useAuth();
    const { etablissement } = useEtablissement();
    const location = useLocation();

    const groupesFiltres = GROUPES.filter(g =>
        !g.permissions || peutAcceder(g.permissions)
    );

    const initialOpen = groupesFiltres.findIndex(g =>
        g.label && g.items.some(item => location.pathname.startsWith(item.to))
    );
    const [openIndex, setOpenIndex] = useState(initialOpen);

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
                    {groupesFiltres.map((group, i) => (
                        <MenuGroup
                            key={i}
                            group={group}
                            open={openIndex === i}
                            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                        />
                    ))}
                </nav>

            </div>
        </div>
    );
};

export default Menu;
