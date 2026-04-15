import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) => n?.toLocaleString('fr-FR') ?? '—';

const Spinner = () => (
    <div className="d-flex justify-content-center align-items-center py-4">
        <div className="spinner-border spinner-border-sm text-secondary" />
    </div>
);

const Jauge = ({ taux, couleur }) => {
    const r = 40, c = 2 * Math.PI * r;
    const fill = c - (c * Math.min(taux, 100)) / 100;
    const color = couleur === 'success' ? '#198754' : couleur === 'danger' ? '#dc3545' : '#0d6efd';
    return (
        <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} fill="none" stroke="#e9ecef" strokeWidth="10" />
            <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
                strokeDasharray={c} strokeDashoffset={fill} strokeLinecap="round"
                transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
            <text x="50" y="54" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>{taux}%</text>
        </svg>
    );
};

const KpiCard = ({ icone, couleur, valeur, label, lien, sous }) => {
    const palette = {
        success: { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
        info:    { bg: '#dbeafe', text: '#1e3a8a', border: '#3b82f6' },
        warning: { bg: '#fef3c7', text: '#78350f', border: '#f59e0b' },
        primary: { bg: '#ede9fe', text: '#4c1d95', border: '#8b5cf6' },
        danger:  { bg: '#fee2e2', text: '#7f1d1d', border: '#ef4444' },
    };
    const p = palette[couleur] || palette.primary;
    return (
        <NavLink to={lien} className="text-decoration-none col">
            <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: 14, borderLeft: `4px solid ${p.border}` }}>
                <div className="card-body d-flex align-items-center gap-3 py-3">
                    <div className="d-flex align-items-center justify-content-center rounded-3"
                        style={{ width: 50, height: 50, backgroundColor: p.bg, flexShrink: 0 }}>
                        <i className={icone} style={{ fontSize: 22, color: p.border }} />
                    </div>
                    <div className="flex-grow-1">
                        <div className="fw-bold lh-1 mb-1" style={{ fontSize: 32, color: p.text }}>
                            {valeur ?? <Spinner />}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.9rem' }}>{label}</div>
                        {sous && <div className="mt-1" style={{ fontSize: '0.78rem', color: p.border }}>{sous}</div>}
                    </div>
                    <i className="fas fa-chevron-right text-muted" style={{ fontSize: 12, opacity: 0.4 }} />
                </div>
            </div>
        </NavLink>
    );
};

const Section = ({ titre, icone, couleur, children, lien, lienLabel }) => {
    const borders = { success: '#10b981', info: '#3b82f6', warning: '#f59e0b', primary: '#8b5cf6', danger: '#ef4444', secondary: '#6c757d' };
    const border = borders[couleur] || '#3b82f6';
    return (
        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
            <div className="card-header border-0 bg-white d-flex justify-content-between align-items-center px-3 pt-3 pb-2"
                style={{ borderBottom: `2px solid ${border}20` }}>
                <span className="fw-semibold d-flex align-items-center gap-2" style={{ color: border }}>
                    <i className={icone} />
                    <span className="text-dark">{titre}</span>
                </span>
                {lien && (
                    <NavLink to={lien} className="btn btn-sm"
                        style={{ fontSize: '0.82rem', backgroundColor: `${border}15`, color: border, border: `1px solid ${border}40`, borderRadius: 8 }}>
                        {lienLabel} <i className="fas fa-arrow-right ms-1" style={{ fontSize: 10 }} />
                    </NavLink>
                )}
            </div>
            <div className="card-body px-3 pt-2 pb-3">{children}</div>
        </div>
    );
};

const StatBadge = ({ valeur, label, couleur }) => {
    const colors = { success: '#10b981', danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6', primary: '#8b5cf6' };
    const c = colors[couleur] || '#6c757d';
    return (
        <div className="text-center px-3">
            <div className="fw-bold" style={{ fontSize: 36, color: c, lineHeight: 1 }}>{valeur}</div>
            <div className="text-muted mt-1" style={{ fontSize: '0.85rem' }}>{label}</div>
        </div>
    );
};

const Barre = ({ taux, couleur }) => {
    const colors = { success: '#10b981', danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6', primary: '#8b5cf6' };
    return (
        <div style={{ height: 8, borderRadius: 4, backgroundColor: '#e9ecef', overflow: 'hidden' }}>
            <div style={{
                height: '100%', width: `${Math.min(taux, 100)}%`,
                backgroundColor: colors[couleur] || '#6c757d',
                borderRadius: 4, transition: 'width 0.8s ease',
            }} />
        </div>
    );
};

// ── Sélecteur multi-périodes ──────────────────────────────────────────────────

const MultiSelectPeriodes = ({ periodes, selected, onChange }) => {
    const [ouvert, setOuvert] = useState(false);
    const ref = useRef(null);

    // Fermer au clic extérieur
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOuvert(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toutCocher = () => {
        if (selected.length === periodes.length) onChange([periodes[0]?.id].filter(Boolean));
        else onChange(periodes.map(p => p.id));
    };

    const toggle = (id) => {
        if (selected.includes(id)) {
            // Ne pas désélectionner tout (garder au moins 1)
            if (selected.length === 1) return;
            onChange(selected.filter(i => i !== id));
        } else {
            onChange([...selected, id]);
        }
    };

    // Libellé du bouton
    const label = (() => {
        if (selected.length === periodes.length && periodes.length > 1) return 'Toutes les périodes';
        if (selected.length === 1) {
            const p = periodes.find(p => p.id === selected[0]);
            return p ? `${p.libelle_periode} ${p.annee}` : '—';
        }
        return `${selected.length} périodes`;
    })();

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={() => setOuvert(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    backgroundColor: 'rgba(255,255,255,0.18)',
                    border: '1px solid rgba(255,255,255,0.35)',
                    color: 'white', borderRadius: 10,
                    padding: '6px 12px', cursor: 'pointer',
                    fontSize: '0.88rem', fontWeight: 500,
                    transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.28)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)'; }}
            >
                <i className="fas fa-calendar-alt" style={{ fontSize: 13, opacity: 0.85 }} />
                <span>{label}</span>
                <i className={`fas fa-chevron-${ouvert ? 'up' : 'down'}`} style={{ fontSize: 11, opacity: 0.7 }} />
            </button>

            {ouvert && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                    minWidth: 260, zIndex: 1050,
                    backgroundColor: 'white', borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                }}>
                    {/* En-tête du dropdown */}
                    <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#f8fafc' }}>
                        <div className="d-flex justify-content-between align-items-center">
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
                                <i className="fas fa-filter me-1 text-primary" style={{ fontSize: 11 }} />
                                Filtrer par période
                            </span>
                            <button
                                onClick={toutCocher}
                                style={{
                                    fontSize: '0.78rem', color: '#3b82f6', background: 'none',
                                    border: 'none', cursor: 'pointer', padding: '2px 6px',
                                    borderRadius: 6, fontWeight: 500,
                                }}
                            >
                                {selected.length === periodes.length ? 'Désélectionner' : 'Tout cocher'}
                            </button>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>
                            {selected.length} / {periodes.length} sélectionnée{selected.length > 1 ? 's' : ''}
                        </div>
                    </div>

                    {/* Liste des périodes */}
                    <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                        {periodes.map(p => {
                            const actif = selected.includes(p.id);
                            return (
                                <label
                                    key={p.id}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '9px 14px', cursor: 'pointer',
                                        backgroundColor: actif ? '#eff6ff' : 'white',
                                        borderBottom: '1px solid #f9fafb',
                                        transition: 'background 0.12s',
                                    }}
                                    onMouseEnter={e => { if (!actif) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                                    onMouseLeave={e => { if (!actif) e.currentTarget.style.backgroundColor = 'white'; }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={actif}
                                        onChange={() => toggle(p.id)}
                                        style={{ accentColor: '#3b82f6', width: 15, height: 15, cursor: 'pointer' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.88rem', fontWeight: actif ? 600 : 400, color: actif ? '#1e3a8a' : '#374151' }}>
                                            {p.libelle_periode}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{p.annee}</div>
                                    </div>
                                    {actif && <i className="fas fa-check" style={{ fontSize: 11, color: '#3b82f6' }} />}
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Composant principal ───────────────────────────────────────────────────────

const Accueil = () => {
    const { user, peutAcceder } = useAuth();
    const [stats,      setStats]      = useState(null);
    const [erreur,     setErreur]     = useState('');
    const [periodes,   setPeriodes]   = useState([]);
    const [periodeIds, setPeriodeIds] = useState([]);

    // Charger la liste des périodes au montage
    useEffect(() => {
        api.get('/periodes').then(res => {
            const sorted = [...res.data].sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut));
            setPeriodes(sorted);
            // Par défaut : période la plus récente
            if (sorted.length > 0) setPeriodeIds([sorted[0].id]);
        });
    }, []);

    // Recharger les stats à chaque changement de sélection
    useEffect(() => {
        if (!periodeIds.length) return;
        setStats(null);
        setErreur('');
        api.get(`/dashboard/stats?periodes=${periodeIds.join(',')}`)
            .then((res) => setStats(res.data))
            .catch(() => setErreur('Impossible de charger les statistiques.'));
    }, [periodeIds]);

    const modeLabel    = { especes: 'Espèces', cheque: 'Chèque', virement: 'Virement', autre: 'Autre' };
    const today        = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const tauxNotes    = stats?.taux_saisie_notes ?? 0;
    const couleurNotes = tauxNotes >= 80 ? 'success' : tauxNotes >= 50 ? 'warning' : 'danger';

    const voitEffectifs  = peutAcceder(['eleves', 'enseignants', 'parents', 'inscriptions', 'pedagogie']);
    const voitFinances   = peutAcceder('finances');
    const voitPedagogie  = peutAcceder('pedagogie');
    const voitAssiduites = peutAcceder('pedagogie');
    const voitInfos      = peutAcceder('communication');
    const voitAdmin      = user?.super === true;

    const accesRapides = [
        voitEffectifs  && { to: '/NouvelEleve',         icone: 'fas fa-user-plus',          couleur: '#10b981', bg: '#d1fae5', label: 'Nouvel élève' },
        peutAcceder('enseignants') && { to: '/NouvelEnseignant', icone: 'fas fa-chalkboard-teacher', couleur: '#3b82f6', bg: '#dbeafe', label: 'Nouvel enseignant' },
        peutAcceder('parametrage') && { to: '/NouvelleClasse',   icone: 'fas fa-school',              couleur: '#f59e0b', bg: '#fef3c7', label: 'Nouvelle classe' },
        voitPedagogie  && { to: '/NouveauDevoir',       icone: 'fas fa-file-alt',            couleur: '#8b5cf6', bg: '#ede9fe', label: 'Nouveau devoir' },
        voitPedagogie  && { to: '/FeuillePresence',     icone: 'fas fa-clipboard-check',     couleur: '#ef4444', bg: '#fee2e2', label: 'Présence' },
        voitPedagogie  && { to: '/Bulletins',           icone: 'fas fa-file-pdf',            couleur: '#6c757d', bg: '#f8f9fa', label: 'Bulletins' },
        voitFinances   && { to: '/NouveauPaiement',     icone: 'fas fa-hand-holding-usd',    couleur: '#10b981', bg: '#d1fae5', label: 'Paiement' },
        voitFinances   && { to: '/RecapPaiements',      icone: 'fas fa-table',               couleur: '#f59e0b', bg: '#fef3c7', label: 'Récap finances' },
        peutAcceder('inscriptions') && { to: '/NouvelleInscription', icone: 'fas fa-user-plus', couleur: '#1e3a8a', bg: '#dbeafe', label: 'Inscription' },
        peutAcceder('inscriptions') && { to: '/Inscriptions',        icone: 'fas fa-list-check', couleur: '#6366f1', bg: '#eef2ff', label: 'Demandes' },
        voitInfos      && { to: '/NouvelleInformation', icone: 'fas fa-bullhorn',             couleur: '#0891b2', bg: '#e0f2fe', label: 'Information' },
        voitAdmin      && { to: '/Utilisateurs',        icone: 'fas fa-users-cog',            couleur: '#6c757d', bg: '#f8f9fa', label: 'Utilisateurs' },
        voitAdmin      && { to: '/Roles',               icone: 'fas fa-user-shield',          couleur: '#7c3aed', bg: '#ede9fe', label: 'Rôles' },
    ].filter(Boolean);

    const accentGradient = user?.super
        ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'
        : voitFinances && !voitPedagogie && !voitEffectifs
            ? 'linear-gradient(135deg, #065f46 0%, #34d399 100%)'
            : voitPedagogie
                ? 'linear-gradient(135deg, #065f46 0%, #10b981 100%)'
                : 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)';

    return (
        <section className="page-wrapper">
            <div className="container-fluid py-3 px-3">

                {/* ── En-tête personnalisé ── */}
                <div className="card border-0 mb-4" style={{ background: accentGradient, borderRadius: 16 }}>
                    <div className="card-body py-3 px-4">
                        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">

                            {/* Colonne gauche : salutation + sélecteur */}
                            <div>
                                <h4 className="mb-1 fw-bold text-white">
                                    Bonjour, {user?.name?.split(' ')[0]} 👋
                                </h4>
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.25)', fontSize: '0.82rem' }}>
                                        {user?.role_label}
                                    </span>
                                </div>
                                {/* Sélecteur multi-périodes */}
                                {periodes.length > 0 && (
                                    <MultiSelectPeriodes
                                        periodes={periodes}
                                        selected={periodeIds}
                                        onChange={setPeriodeIds}
                                    />
                                )}
                            </div>

                            {/* Colonne droite : date + notifications */}
                            <div className="text-end d-flex flex-column align-items-end gap-2">
                                {/* Date agrandie */}
                                <div style={{
                                    backgroundColor: 'rgba(255,255,255,0.15)',
                                    borderRadius: 10, padding: '8px 14px',
                                    backdropFilter: 'blur(4px)',
                                }}>
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', marginBottom: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                        Aujourd'hui
                                    </div>
                                    <div className="fw-bold text-white text-capitalize" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                                        {today}
                                    </div>
                                </div>

                                {stats?.inscriptions_en_attente > 0 && (
                                    <NavLink to="/Inscriptions" className="badge text-decoration-none"
                                        style={{ backgroundColor: '#f59e0b', fontSize: '0.82rem' }}>
                                        <i className="fas fa-bell me-1" />
                                        {stats.inscriptions_en_attente} demande{stats.inscriptions_en_attente > 1 ? 's' : ''} en attente
                                    </NavLink>
                                )}
                            </div>

                        </div>
                    </div>
                </div>

                {erreur && <div className="alert alert-danger">{erreur}</div>}

                {/* ── KPIs effectifs ── */}
                {voitEffectifs && (
                    <div className="row row-cols-2 row-cols-md-4 g-3 mb-4">
                        <KpiCard icone="fas fa-user-graduate"      couleur="success" valeur={stats?.total_eleves}      label="Élèves inscrits"   lien="/Eleves"      sous="Voir la liste" />
                        <KpiCard icone="fas fa-chalkboard-teacher" couleur="info"    valeur={stats?.total_enseignants}  label="Enseignants"       lien="/Enseignants" sous="Corps enseignant" />
                        <KpiCard icone="fas fa-school"             couleur="warning" valeur={stats?.total_classes}      label="Classes actives"   lien="/Classes"     sous="Voir les classes" />
                        <KpiCard icone="fas fa-book-open"          couleur="primary" valeur={stats?.total_matieres}     label="Matières"          lien="/Matieres"    sous="Programme" />
                    </div>
                )}

                {voitFinances && !voitPedagogie && !voitEffectifs && (
                    <div className="row row-cols-2 row-cols-md-3 g-3 mb-4">
                        <KpiCard icone="fas fa-user-graduate"       couleur="info"    valeur={stats?.total_eleves}     label="Élèves (effectif)"  lien="/Paiements" />
                        <KpiCard icone="fas fa-check-circle"        couleur="success" valeur={stats?.eleves_a_jour}    label="Élèves à jour"      lien="/Paiements" />
                        <KpiCard icone="fas fa-exclamation-circle"  couleur="danger"  valeur={stats?.eleves_en_retard} label="Élèves en retard"   lien="/Paiements" />
                    </div>
                )}

                {/* ── Administration (super_admin) ── */}
                {voitAdmin && (
                    <div className="row g-3 mb-4">
                        <div className="col-md-4">
                            <Section titre="Administration système" icone="fas fa-shield-alt" couleur="secondary" lien="/Utilisateurs" lienLabel="Gérer">
                                <div className="d-flex justify-content-around py-2">
                                    <StatBadge valeur={stats?.total_utilisateurs ?? '—'} label="Comptes" couleur="info" />
                                    <div style={{ width: 1, height: 50, backgroundColor: '#e9ecef' }} />
                                    <StatBadge valeur={stats?.utilisateurs_actifs ?? '—'} label="Actifs" couleur="success" />
                                </div>
                            </Section>
                        </div>
                    </div>
                )}

                {/* ── Finances ── */}
                {voitFinances && (
                    <div className="row g-3 mb-4">
                        <div className="col-md-7">
                            <Section titre="Situation financière" icone="fas fa-wallet" couleur="success" lien="/Paiements" lienLabel="Voir les paiements">
                                {!stats ? <Spinner /> : (
                                    <div className="d-flex align-items-center gap-4">
                                        <div className="flex-shrink-0">
                                            <Jauge taux={stats.taux_recouvrement} couleur="success" />
                                            <div className="text-center text-muted" style={{ fontSize: '0.82rem', marginTop: -4 }}>Taux de recouvrement</div>
                                        </div>
                                        <div className="flex-grow-1">
                                            <div className="row g-2 mb-3">
                                                <div className="col-6">
                                                    <div className="p-2 rounded-3" style={{ backgroundColor: '#d1fae5' }}>
                                                        <div className="fw-bold text-success" style={{ fontSize: 20 }}>{fmt(stats.total_encaisse)}</div>
                                                        <div className="text-muted" style={{ fontSize: '0.82rem' }}>FCFA encaissé</div>
                                                    </div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="p-2 rounded-3" style={{ backgroundColor: '#fee2e2' }}>
                                                        <div className="fw-bold text-danger" style={{ fontSize: 20 }}>{fmt(stats.total_du - stats.total_encaisse)}</div>
                                                        <div className="text-muted" style={{ fontSize: '0.82rem' }}>FCFA restant</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="d-flex gap-2 flex-wrap">
                                                <span className="rounded-pill px-2 py-1 fw-semibold" style={{ backgroundColor: '#d1fae5', color: '#065f46', fontSize: '0.85rem' }}>
                                                    <i className="fas fa-check me-1" />{stats.eleves_a_jour} à jour
                                                </span>
                                                <span className="rounded-pill px-2 py-1 fw-semibold" style={{ backgroundColor: '#fee2e2', color: '#7f1d1d', fontSize: '0.85rem' }}>
                                                    <i className="fas fa-clock me-1" />{stats.eleves_en_retard} en retard
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Section>
                        </div>
                        <div className="col-md-5">
                            <Section titre="Derniers paiements" icone="fas fa-receipt" couleur="info" lien="/Paiements" lienLabel="Tous">
                                {!stats ? <Spinner /> : (stats.derniers_paiements?.length === 0 ? (
                                    <div className="text-center text-muted py-3">
                                        <i className="fas fa-receipt fs-3 d-block mb-2 opacity-25" />Aucun paiement.
                                    </div>
                                ) : (
                                    <ul className="list-unstyled mb-0">
                                        {stats.derniers_paiements?.map((p, i) => (
                                            <li key={i} className="d-flex justify-content-between align-items-center py-2" style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                <div>
                                                    <div className="small fw-semibold">{p.eleve}</div>
                                                    <div className="text-muted" style={{ fontSize: '0.82rem' }}>{p.echeance} · {modeLabel[p.mode] ?? p.mode}</div>
                                                </div>
                                                <span className="rounded-pill px-2 py-1 fw-semibold" style={{ backgroundColor: '#d1fae5', color: '#065f46', fontSize: '0.82rem' }}>
                                                    {fmt(p.montant)} FCFA
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                ))}
                            </Section>
                        </div>
                    </div>
                )}

                {/* ── Assiduité + Pédagogie + Niveaux ── */}
                {(voitAssiduites || voitPedagogie || voitEffectifs) && (
                    <div className="row g-3 mb-4">
                        {voitAssiduites && (
                            <div className={voitPedagogie ? 'col-md-4' : 'col-md-6'}>
                                <Section titre="Assiduité cette semaine" icone="fas fa-clipboard-check" couleur="danger" lien="/Assiduites" lienLabel="Détails">
                                    {!stats ? <Spinner /> : (
                                        <>
                                            <div className="d-flex justify-content-around align-items-center py-2 mb-3 rounded-3" style={{ backgroundColor: '#fff5f5' }}>
                                                <StatBadge valeur={stats.absences_semaine} label="Absences" couleur="danger" />
                                                <div style={{ width: 1, height: 50, backgroundColor: '#fecaca' }} />
                                                <StatBadge valeur={stats.retards_semaine} label="Retards" couleur="warning" />
                                            </div>
                                            {stats.top_absents?.length > 0 && (
                                                <>
                                                    <div className="text-muted small fw-semibold mb-2">
                                                        <i className="fas fa-sort-amount-down me-1" />Top absents (périodes sélectionnées)
                                                    </div>
                                                    {stats.top_absents.map((a, i) => (
                                                        <div key={i} className="d-flex justify-content-between align-items-center mb-2">
                                                            <span className="small">{a.eleve}</span>
                                                            <div className="d-flex align-items-center gap-2" style={{ minWidth: 80 }}>
                                                                <Barre taux={Math.min((a.nb_absences / 20) * 100, 100)} couleur="danger" />
                                                                <span className="small fw-bold text-danger" style={{ minWidth: 20 }}>{a.nb_absences}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                        </>
                                    )}
                                </Section>
                            </div>
                        )}

                        {voitPedagogie && (
                            <div className={voitAssiduites ? 'col-md-4' : 'col-md-6'}>
                                <Section titre="Pédagogie" icone="fas fa-graduation-cap" couleur="primary" lien="/Devoirs" lienLabel="Devoirs">
                                    {!stats ? <Spinner /> : (
                                        <>
                                            <div className="d-flex justify-content-around align-items-center py-2 mb-3 rounded-3" style={{ backgroundColor: '#f5f3ff' }}>
                                                <StatBadge valeur={stats.total_devoirs} label="Devoirs" couleur="primary" />
                                                <div style={{ width: 1, height: 50, backgroundColor: '#ddd6fe' }} />
                                                <StatBadge valeur={`${stats.taux_saisie_notes}%`} label="Notes saisies" couleur={couleurNotes} />
                                            </div>
                                            <div className="mb-3">
                                                <div className="d-flex justify-content-between small mb-1">
                                                    <span className="text-muted">Progression saisie</span>
                                                    <span className={`text-${couleurNotes} fw-semibold`}>{stats.taux_saisie_notes}%</span>
                                                </div>
                                                <Barre taux={stats.taux_saisie_notes} couleur={couleurNotes} />
                                            </div>
                                            {stats.devoirs_recents?.slice(0, 3).map((d, i) => (
                                                <div key={i} className="d-flex justify-content-between align-items-center py-1" style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                    <span className="small">{d.matiere} <span className="text-muted">· {d.classe}</span></span>
                                                    <span className="rounded-pill px-2 py-0" style={{ backgroundColor: '#ede9fe', color: '#6d28d9', fontSize: '0.82rem' }}>{d.type}</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </Section>
                            </div>
                        )}

                        {voitEffectifs && (
                            <div className={voitAssiduites && voitPedagogie ? 'col-md-4' : 'col-md-6'}>
                                <Section titre="Élèves par niveau" icone="fas fa-layer-group" couleur="warning" lien="/Niveaux" lienLabel="Niveaux">
                                    {!stats ? <Spinner /> : (stats.eleves_par_niveau?.length === 0 ? (
                                        <div className="text-center text-muted py-3">Aucune donnée.</div>
                                    ) : (
                                        <ul className="list-unstyled mb-0">
                                            {stats.eleves_par_niveau?.map((n, i) => {
                                                const pct = stats.total_eleves > 0 ? Math.round((n.total_eleves / stats.total_eleves) * 100) : 0;
                                                return (
                                                    <li key={i} className="mb-3">
                                                        <div className="d-flex justify-content-between small mb-1">
                                                            <span className="fw-semibold">{n.niveau}</span>
                                                            <span className="text-muted">{n.total_eleves} élèves <span className="fw-bold text-warning">({pct}%)</span></span>
                                                        </div>
                                                        <Barre taux={pct} couleur="warning" />
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ))}
                                </Section>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Informations + Accès rapides ── */}
                <div className="row g-3">
                    {voitInfos && (
                        <div className={accesRapides.length > 0 ? 'col-md-5' : 'col-12'}>
                            <Section titre="Informations récentes" icone="fas fa-bullhorn" couleur="info" lien="/Informations" lienLabel="Toutes">
                                {!stats ? <Spinner /> : (stats.informations_recentes?.length === 0 ? (
                                    <div className="text-center text-muted py-3">
                                        <i className="fas fa-bullhorn fs-3 d-block mb-2 opacity-25" />Aucune information.
                                    </div>
                                ) : (
                                    <ul className="list-unstyled mb-0">
                                        {stats.informations_recentes?.map((info) => (
                                            <li key={info.id} className="d-flex align-items-start gap-2 py-2" style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                <div className="rounded-circle flex-shrink-0 mt-2" style={{ width: 8, height: 8, backgroundColor: '#3b82f6' }} />
                                                <div>
                                                    <NavLink to={`/DetailsInformation/${info.id}`} className="text-decoration-none fw-semibold small text-dark">
                                                        {info.titre}
                                                    </NavLink>
                                                    <div className="text-muted" style={{ fontSize: '0.82rem' }}>{info.date_info}</div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ))}
                            </Section>
                        </div>
                    )}

                    {accesRapides.length > 0 && (
                        <div className={voitInfos ? 'col-md-7' : 'col-12'}>
                            <Section titre="Accès rapides" icone="fas fa-bolt" couleur="primary">
                                <div className="row g-2">
                                    {accesRapides.map((item) => (
                                        <div key={item.to} className="col-6 col-md-3">
                                            <NavLink to={item.to} className="text-decoration-none d-block">
                                                <div className="d-flex flex-column align-items-center justify-content-center p-3 rounded-3 h-100"
                                                    style={{ backgroundColor: item.bg, border: `1px solid ${item.couleur}20`, cursor: 'pointer', transition: 'transform 0.15s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                                                >
                                                    <i className={item.icone} style={{ fontSize: 22, color: item.couleur, marginBottom: 6 }} />
                                                    <span style={{ fontSize: '0.9rem', color: item.couleur, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{item.label}</span>
                                                </div>
                                            </NavLink>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        </div>
                    )}
                </div>

            </div>
        </section>
    );
};

export default Accueil;
