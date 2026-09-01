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
            { to: '/accueil', icon: 'fas fa-home', label: 'Accueil' },
        ],
    },

    // ── Inscriptions (masqué — module en attente d'utilisation réelle) ────────
    // {
    //     label: 'Inscriptions',
    //     icon: 'fas fa-user-plus',
    //     permissions: ['inscriptions'],
    //     items: [
    //         { to: '/Inscriptions', icon: 'fas fa-list-check', label: 'Demandes' },
    //     ],
    // },

    // ── Élèves ───────────────────────────────────────────────────────────────
    {
        label: 'Élèves',
        icon: 'fas fa-user-graduate',
        permissions: ['eleves'],
        moduleSlug: 'eleves',
        items: [
            { to: '/Eleves',       icon: 'fas fa-list',           label: 'Liste des élèves',      moduleSlug: 'eleves.liste' },
            { to: '/NouvelEleve',  icon: 'fas fa-user-plus',      label: 'Ajouter un élève',      moduleSlug: 'eleves.nouveau' },
            { to: '/Attestations', icon: 'fas fa-file-signature', label: 'Attestations',          moduleSlug: 'eleves.attestations' },
            { to: '/Sanctions',    icon: 'fas fa-gavel',          label: 'Sanctions',             moduleSlug: 'eleves.sanctions' },
        ],
    },

    // ── Enseignants ──────────────────────────────────────────────────────────
    {
        label: 'Enseignants',
        icon: 'fas fa-chalkboard-teacher',
        permissions: ['enseignants'],
        moduleSlug: 'enseignants',
        items: [
            { to: '/Enseignants',      icon: 'fas fa-list',           label: 'Liste des enseignants', moduleSlug: 'enseignants.liste' },
            { to: '/NouvelEnseignant', icon: 'fas fa-user-plus',      label: 'Ajouter un enseignant', moduleSlug: 'enseignants.nouveau' },
            { to: '/ProfsParMatiere',  icon: 'fas fa-book-open',      label: 'Profs par matière',     moduleSlug: 'enseignants.profs_matiere' },
            { to: '/Indisponibilites', icon: 'fas fa-user-clock',     label: 'Indisponibilités',      moduleSlug: 'enseignants.indisponibilites' },
        ],
    },

    // ── Parents ──────────────────────────────────────────────────────────────
    {
        label: 'Parents',
        icon: 'fas fa-user-friends',
        permissions: ['parents'],
        moduleSlug: 'parents',
        items: [
            { to: '/Parents',         icon: 'fas fa-list',       label: 'Liste des parents',     moduleSlug: 'parents.liste' },
            { to: '/NouveauParent',   icon: 'fas fa-user-plus',  label: 'Ajouter un parent',     moduleSlug: 'parents.nouveau' },
            { to: '/DemandesParents', icon: 'fas fa-user-clock', label: 'Demandes d\'accès',     moduleSlug: 'parents.demandes' },
        ],
    },

    // ── Pédagogie — saisie ───────────────────────────────────────────────────
    {
        label: 'Pédagogie',
        icon: 'fas fa-graduation-cap',
        permissions: ['pedagogie_saisie'],
        moduleSlug: 'pedagogie_saisie',
        items: [
            { to: '/Calendrier',       icon: 'fas fa-calendar-alt',    label: 'Calendrier scolaire', moduleSlug: 'pedagogie_saisie.calendrier' },
            { to: '/EmploiDuTemps',    icon: 'fas fa-calendar-week',   label: 'Emploi du temps',     moduleSlug: 'pedagogie_saisie.emploi_du_temps' },
            { to: '/Assiduites',       icon: 'fas fa-clipboard-check', label: 'Assiduités',          moduleSlug: 'pedagogie_saisie.assiduites' },
            { to: '/Devoirs',          icon: 'fas fa-file-alt',        label: 'Devoirs / Notes',     moduleSlug: 'pedagogie_saisie.devoirs' },
            { to: '/GestionChapitres', icon: 'fas fa-book-open',       label: 'Programme',           moduleSlug: 'pedagogie_saisie.programme' },
            { to: '/Remplacements',    icon: 'fas fa-exchange-alt',    label: 'Remplacements',       moduleSlug: 'pedagogie_saisie.remplacements' },
        ],
    },

    // ── Pédagogie — pilotage ─────────────────────────────────────────────────
    {
        label: 'Pilotage pédagogique',
        icon: 'fas fa-chart-line',
        permissions: ['pedagogie_pilotage'],
        moduleSlug: 'pedagogie_pilotage',
        items: [
            { to: '/Bulletins',         icon: 'fas fa-file-pdf',      label: 'Bulletins',                moduleSlug: 'pedagogie_pilotage.bulletins' },
            { to: '/SuiviProgressions', icon: 'fas fa-tasks',         label: 'Suivi des progressions',   moduleSlug: 'pedagogie_pilotage.suivi_progressions' },
            { to: '/ConseilClasse',     icon: 'fas fa-gavel',         label: 'Conseil de classe',        moduleSlug: 'pedagogie_pilotage.conseil_classe' },
            { to: '/ConformiteEdt',     icon: 'fas fa-balance-scale', label: 'Conformité EDT',           moduleSlug: 'pedagogie_pilotage.conformite_edt' },
            { to: '/ChargeEnseignants', icon: 'fas fa-user-clock',    label: 'Charge enseignants',       moduleSlug: 'pedagogie_pilotage.charge_enseignants' },
            { to: '/DiagnosticEdt',     icon: 'fas fa-clipboard-list', label: 'Diagnostic EDT',          moduleSlug: 'pedagogie_pilotage.diagnostic_edt' },
            { to: '/GenererEdt',        icon: 'fas fa-magic',          label: 'Générer les EDT',        moduleSlug: 'pedagogie_pilotage.generer_edt' },
            { to: '/ControleEdt',       icon: 'fas fa-clipboard-check', label: 'Contrôle EDT',           moduleSlug: 'pedagogie_pilotage.controle_edt' },
        ],
    },

    // ── Finances — caisse ────────────────────────────────────────────────────
    {
        label: 'Caisse',
        icon: 'fas fa-cash-register',
        permissions: ['finances_caisse'],
        moduleSlug: 'finances_caisse',
        items: [
            { to: '/NouveauPaiement', icon: 'fas fa-plus-circle',      label: 'Nouveau paiement', moduleSlug: 'finances_caisse.nouveau_paiement' },
            { to: '/Paiements',       icon: 'fas fa-list',             label: 'Historique',       moduleSlug: 'finances_caisse.historique' },
            { to: '/RecapPaiements',  icon: 'fas fa-table',            label: 'Récap par niveau', moduleSlug: 'finances_caisse.recap' },
            { to: '/Echeancier',      icon: 'fas fa-calendar-alt',     label: 'Échéancier',       moduleSlug: 'finances_caisse.echeancier' },
        ],
    },

    // ── Finances — gestion ───────────────────────────────────────────────────
    {
        label: 'Finances',
        icon: 'fas fa-wallet',
        permissions: ['finances_gestion'],
        moduleSlug: 'finances_gestion',
        items: [
            { to: '/Scolarites',          icon: 'fas fa-money-bill-wave',    label: 'Scolarités',              moduleSlug: 'finances_gestion.scolarites' },
            { to: '/Impayes',             icon: 'fas fa-exclamation-circle', label: 'Tableau des impayés',     moduleSlug: 'finances_gestion.impayes' },
            { to: '/FraisAnnexes',        icon: 'fas fa-tags',               label: 'Frais annexes',           moduleSlug: 'finances_gestion.frais_annexes' },
            { to: '/ImpayesFraisAnnexes', icon: 'fas fa-file-invoice',       label: 'Impayés frais annexes',   moduleSlug: 'finances_gestion.impayes_frais_annexes' },
            { to: '/ExportComptable',     icon: 'fas fa-file-export',        label: 'Export comptable',        moduleSlug: 'finances_gestion.export_comptable' },
        ],
    },

    // ── Communication ────────────────────────────────────────────────────────
    {
        label: 'Communication',
        icon: 'fas fa-bullhorn',
        permissions: ['communication'],
        moduleSlug: 'communication',
        items: [
            { to: '/Informations', icon: 'fas fa-info-circle',    label: 'Informations',        moduleSlug: 'communication.informations' },
            { to: '/Messagerie',   icon: 'fas fa-comments',       label: 'Messagerie',          moduleSlug: 'communication.messagerie' },
            { to: '/RDV',          icon: 'fas fa-calendar-check', label: 'RDV Parents-Profs',   moduleSlug: 'communication.rdv' },
        ],
    },

    // ── Administration ───────────────────────────────────────────────────────
    {
        label: 'Administration',
        icon: 'fas fa-shield-alt',
        permissions: ['utilisateurs'],
        moduleSlug: 'utilisateurs',
        items: [
            { to: '/Utilisateurs',  icon: 'fas fa-users-cog',        label: 'Utilisateurs',            moduleSlug: 'utilisateurs.utilisateurs' },
            { to: '/Roles',         icon: 'fas fa-user-shield',       label: 'Rôles et permissions',   moduleSlug: 'utilisateurs.roles' },
            { to: '/AuditLogs',     icon: 'fas fa-history',           label: 'Journal d\'audit',       moduleSlug: 'utilisateurs.audit_logs' },
            { to: '/Documentation', icon: 'fas fa-question-circle',   label: 'Documentation in-app',   moduleSlug: 'utilisateurs.documentation' },
        ],
    },

    // ── Paramétrage ──────────────────────────────────────────────────────────
    {
        label: 'Paramétrage',
        icon: 'fas fa-cog',
        permissions: ['parametrage'],
        moduleSlug: 'parametrage',
        items: [
            { to: '/Etablissement', icon: 'fas fa-school',       label: 'Établissement',         moduleSlug: 'parametrage.etablissement' },
            { to: '/Niveaux',       icon: 'fas fa-layer-group',  label: 'Niveaux',               moduleSlug: 'parametrage.niveaux' },
            { to: '/Classes',       icon: 'fas fa-school',       label: 'Classes',               moduleSlug: 'parametrage.classes' },
            { to: '/Matieres',      icon: 'fas fa-book',         label: 'Matières',              moduleSlug: 'parametrage.matieres' },
            { to: '/ConfigMatieres',icon: 'fas fa-sliders-h',     label: 'Config. matières/niveaux', moduleSlug: 'parametrage.config_matieres' },
            { to: '/Series',        icon: 'fas fa-graduation-cap', label: 'Séries',              moduleSlug: 'parametrage.series' },
            { to: '/TypeDevoirs',   icon: 'fas fa-tags',           label: 'Types de devoirs',    moduleSlug: 'parametrage.type_devoirs' },
            { to: '/Periodes',      icon: 'fas fa-calendar-alt', label: 'Périodes',              moduleSlug: 'parametrage.periodes' },
            { to: '/Salles',        icon: 'fas fa-door-open',    label: 'Salles',                moduleSlug: 'parametrage.salles' },
            { to: '/VolumeHoraire', icon: 'fas fa-clock',        label: 'Volumes horaires',      moduleSlug: 'parametrage.volume_horaire' },
            { to: '/GrilleHoraire', icon: 'fas fa-table',        label: 'Grille horaire',        moduleSlug: 'parametrage.grille_horaire' },
            { to: '/Archivage',     icon: 'fas fa-archive',      label: 'Archivage fin d\'année',moduleSlug: 'parametrage.archivage' },
        ],
    },

    // ── Statistiques (pilotage — en bas) ─────────────────────────────────────
    {
        label: 'Statistiques',
        icon: 'fas fa-chart-bar',
        permissions: ['pedagogie_saisie', 'pedagogie_pilotage', 'finances_caisse', 'finances_gestion'],
        moduleSlug: 'statistiques',
        items: [
            { to: '/Statistiques',      icon: 'fas fa-chart-bar',  label: 'Tableaux de bord', moduleSlug: 'statistiques.tableaux_bord' },
            { to: '/StatsGenerales',    icon: 'fas fa-table',      label: 'Stats générales',  moduleSlug: 'statistiques.stats_generales' },
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
    const { user, peutAcceder } = useAuth();
    const { etablissement, modulesActifs } = useEtablissement();
    const location = useLocation();

    // Tant que /etablissement n'a pas répondu, modulesActifs est null : on ne filtre pas encore
    // (évite un flash "menu vide" au chargement initial).
    const moduleActif = (slug) => !slug || !modulesActifs || modulesActifs.includes(slug);

    const groupesFiltres = GROUPES
        .map(g => ({ ...g, items: g.items.filter(i => moduleActif(i.moduleSlug)) }))
        .filter(g =>
            g.items.length > 0 &&
            (!g.permissions || peutAcceder(g.permissions)) &&
            moduleActif(g.moduleSlug)
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
                    padding: '14px',
                    borderBottom: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexShrink: 0,
                }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: 14, overflow: 'hidden',
                        flexShrink: 0, background: '#ffffff',
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
                            color: 'white', fontWeight: 700, fontSize: 15,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {etablissement?.nom || 'Mon Établissement'}
                        </div>
                        {etablissement?.ville && (
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
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
