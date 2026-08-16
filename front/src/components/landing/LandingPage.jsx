import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
const fmt = (n) => Number(n).toLocaleString('fr-FR');

const FEATURES = [
    { icon: 'fa-user-graduate', titre: 'Gestion des élèves', texte: 'Inscriptions, dossiers complets, photos, sanctions, suivi par classe et par niveau.' },
    { icon: 'fa-clipboard-list', titre: 'Notes & Bulletins', texte: 'Saisie des notes par période, calcul automatique des moyennes, bulletins PDF en un clic.' },
    { icon: 'fa-wallet', titre: 'Scolarités & Paiements', texte: 'Suivi des paiements, reçus PDF, tableau des impayés, export comptable OHADA.' },
    { icon: 'fa-mobile-alt', titre: 'Application Mobile', texte: 'Portail enseignant et portail parent sur Android. Présences, devoirs, bulletins, messagerie.' },
    { icon: 'fa-calendar-alt', titre: 'Emploi du Temps', texte: 'Grille hebdomadaire, détection de conflits, gestion des salles et des remplacements.' },
    { icon: 'fa-chart-bar', titre: 'Statistiques & Rapports', texte: 'Tableaux de bord par rôle, classements, formulaire officiel MENET, exports Excel & PDF.' },
];

const estSousDomaineTenant = () => {
    const h = window.location.hostname;
    return h !== 'localhost' && h !== '127.0.0.1' && !h.match(/^\d+\.\d+\.\d+\.\d+$/);
};

const LandingPage = () => {
    const { user, estGroupe, estEnseignant, estSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const [tranches, setTranches] = useState([]);
    const [plancher, setPlancher] = useState(500000);

    useEffect(() => {
        // Sur un sous-domaine tenant, rediriger vers /login (pas de landing page)
        if (estSousDomaineTenant()) {
            navigate('/login', { replace: true });
            return;
        }
        if (!user) return;
        if (estSuperAdmin) navigate('/superadmin/demandes', { replace: true });
        else if (estGroupe) navigate('/groupe', { replace: true });
        else if (estEnseignant) navigate('/enseignant', { replace: true });
        else navigate('/accueil', { replace: true });
    }, [user, estGroupe, estEnseignant, estSuperAdmin, navigate]);

    useEffect(() => {
        axios.get(`${API_BASE}/tarifs`).then(r => {
            setTranches(r.data.tranches ?? []);
            setPlancher(parseInt(r.data.config?.plancher_minimum ?? 500000));
        }).catch(() => {});
    }, []);

    if (user || estSousDomaineTenant()) return null;

    return (
        <div style={{ fontFamily: 'inherit' }}>
            {/* ── Navbar ──────────────────────────────────────────────── */}
            <nav className="navbar navbar-expand-lg navbar-dark sticky-top" style={{ background: '#0d3b73', boxShadow: '0 2px 8px rgba(0,0,0,.25)' }}>
                <div className="container">
                    <a className="navbar-brand d-flex align-items-center gap-2 fw-bold fs-5" href="#">
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-school" style={{ color: '#0d3b73', fontSize: 16 }} />
                        </div>
                        Suivi Scolaire
                    </a>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
                        <span className="navbar-toggler-icon" />
                    </button>
                    <div className="collapse navbar-collapse" id="navMenu">
                        <ul className="navbar-nav me-auto ms-4 gap-1">
                            <li className="nav-item"><a className="nav-link" href="#fonctionnalites">Fonctionnalités</a></li>
                            <li className="nav-item"><a className="nav-link" href="#tarifs">Tarifs</a></li>
                            <li className="nav-item"><a className="nav-link" href="#parents">Espace Parents</a></li>
                            <li className="nav-item"><a className="nav-link" href="#contact">Contact</a></li>
                        </ul>
                        <div className="d-flex gap-2">
                            <Link to="/login" className="btn btn-outline-light btn-sm px-3">Se connecter</Link>
                            <Link to="/inscription-etablissement" className="btn btn-warning btn-sm px-3 fw-semibold">Demander un accès</Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ── Hero ────────────────────────────────────────────────── */}
            <section style={{ background: 'linear-gradient(135deg, #1a56a0 0%, #0d3b73 100%)', padding: '80px 0 70px' }}>
                <div className="container text-center text-white">
                    <span className="badge bg-warning text-dark mb-3 px-3 py-2" style={{ fontSize: 13 }}>
                        <i className="fas fa-star me-1" />Logiciel de gestion scolaire N°1 en Côte d'Ivoire
                    </span>
                    <h1 className="display-5 fw-bold mb-4" style={{ maxWidth: 720, margin: '0 auto 1.5rem' }}>
                        Gérez votre établissement scolaire<br />
                        <span style={{ color: '#fbbf24' }}>simplement et efficacement</span>
                    </h1>
                    <p className="lead mb-5 text-white-50" style={{ maxWidth: 580, margin: '0 auto 2rem' }}>
                        Notes, bulletins, paiements, emplois du temps, portail parents… Tout en un, accessible depuis n'importe quel appareil.
                    </p>
                    <div className="d-flex gap-3 justify-content-center flex-wrap">
                        <Link to="/inscription-etablissement" className="btn btn-warning btn-lg px-4 fw-bold">
                            <i className="fas fa-rocket me-2" />Demander un accès
                        </Link>
                        <a href="#fonctionnalites" className="btn btn-outline-light btn-lg px-4">
                            <i className="fas fa-play-circle me-2" />Voir les fonctionnalités
                        </a>
                    </div>
                    <p className="mt-3 small text-white-50">Aucune carte bancaire · Réponse sous 24h</p>
                </div>
            </section>

            {/* ── Stats rapides ───────────────────────────────────────── */}
            <section style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '32px 0' }}>
                <div className="container">
                    <div className="row text-center g-4">
                        {[
                            { val: '50+', label: 'Établissements', icon: 'fa-school' },
                            { val: '20 000+', label: 'Élèves gérés', icon: 'fa-user-graduate' },
                            { val: '99.9%', label: 'Disponibilité', icon: 'fa-server' },
                            { val: '30 min', label: 'Pour démarrer', icon: 'fa-bolt' },
                        ].map(({ val, label, icon }) => (
                            <div key={label} className="col-6 col-md-3">
                                <i className={`fas ${icon} mb-2`} style={{ fontSize: 24, color: '#1a56a0' }} />
                                <div className="fw-bold fs-4" style={{ color: '#0d3b73' }}>{val}</div>
                                <div className="text-muted small">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Fonctionnalités ─────────────────────────────────────── */}
            <section id="fonctionnalites" style={{ padding: '72px 0', background: '#fff' }}>
                <div className="container">
                    <div className="text-center mb-5">
                        <h2 className="fw-bold" style={{ color: '#0d3b73' }}>Tout ce dont votre établissement a besoin</h2>
                        <p className="text-muted mt-2">Une solution complète, pensée pour le contexte ivoirien et UEMOA.</p>
                    </div>
                    <div className="row g-4">
                        {FEATURES.map(({ icon, titre, texte }) => (
                            <div key={titre} className="col-md-6 col-lg-4">
                                <div className="d-flex gap-3 p-4 rounded-3 h-100" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <div style={{ width: 44, height: 44, minWidth: 44, borderRadius: 10, background: '#1a56a0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className={`fas ${icon} text-white`} style={{ fontSize: 18 }} />
                                    </div>
                                    <div>
                                        <div className="fw-semibold mb-1" style={{ color: '#0d3b73' }}>{titre}</div>
                                        <div className="text-muted small">{texte}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Tarifs ──────────────────────────────────────────────── */}
            <section id="tarifs" style={{ padding: '72px 0', background: '#f8fafc' }}>
                <div className="container">
                    <div className="text-center mb-5">
                        <h2 className="fw-bold" style={{ color: '#0d3b73' }}>Une licence annuelle par élève</h2>
                        <p className="text-muted mt-2">Plus votre école est grande, moins vous payez par élève.</p>
                    </div>

                    {tranches.length > 0 ? (
                        <>
                            <div className="row g-3 justify-content-center mb-4">
                                {tranches.map((t, i) => {
                                    const estDernier = i === tranches.length - 1;
                                    const highlight  = i === 1;
                                    const labelMax   = t.tranche_max ? fmt(t.tranche_max) : '∞';
                                    const exempleEffectif = t.tranche_max
                                        ? Math.round((t.tranche_min + t.tranche_max) / 2)
                                        : t.tranche_min + 200;
                                    const exempleTotal = exempleEffectif * t.prix_par_eleve;

                                    return (
                                        <div key={t.id} className="col-sm-6 col-lg-3">
                                            <div className="card h-100 shadow-sm text-center" style={{
                                                border: highlight ? '2px solid #1a56a0' : '1px solid #e2e8f0',
                                                borderRadius: 14,
                                                position: 'relative',
                                                overflow: 'visible',
                                            }}>
                                                {highlight && (
                                                    <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#1a56a0', color: '#fff', borderRadius: 20, padding: '2px 14px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                        Le plus courant
                                                    </div>
                                                )}
                                                <div className="card-body p-4">
                                                    <div className="text-muted small mb-2">
                                                        {fmt(t.tranche_min)} – {labelMax} élèves
                                                    </div>
                                                    <div className="fw-bold mb-0" style={{ fontSize: 30, color: '#0d3b73' }}>
                                                        {fmt(t.prix_par_eleve)}
                                                    </div>
                                                    <div className="text-muted small mb-3">FCFA / élève / an</div>
                                                    <div className="rounded-3 py-2 px-3 small mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                                        Ex. {fmt(exempleEffectif)} élèves<br />
                                                        <strong>{fmt(exempleTotal)} FCFA/an</strong>
                                                    </div>
                                                    <Link to="/inscription-etablissement"
                                                        className={`btn btn-sm w-100 fw-semibold ${highlight ? 'btn-primary' : 'btn-outline-primary'}`}
                                                        style={{ borderRadius: 8 }}>
                                                        Demander un accès
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="text-center text-muted small">
                                <i className="fas fa-shield-alt me-1 text-success" />
                                Montant minimum : <strong>{fmt(plancher)} FCFA/an</strong> · Facturé une fois par an à la rentrée
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-muted">Contactez-nous pour obtenir un devis personnalisé.</p>
                            <Link to="/inscription-etablissement" className="btn btn-primary">Demander un accès</Link>
                        </div>
                    )}

                </div>
            </section>

            {/* ── Espace Parents ──────────────────────────────────────── */}
            <section id="parents" style={{ padding: '72px 0', background: '#fff' }}>
                <div className="container">
                    <div className="row align-items-center g-5">
                        <div className="col-lg-6">
                            <span className="badge bg-success mb-3 px-3 py-2" style={{ fontSize: 13 }}>
                                <i className="fas fa-mobile-alt me-2" />Application Mobile
                            </span>
                            <h2 className="fw-bold mb-3" style={{ color: '#0d3b73' }}>
                                Parents : suivez la scolarité<br />de votre enfant
                            </h2>
                            <p className="text-muted mb-4" style={{ lineHeight: 1.7 }}>
                                Accédez aux notes, bulletins, absences et paiements de votre enfant directement depuis votre téléphone, 24h/24.
                            </p>
                            <div className="d-flex flex-column gap-3 mb-4">
                                {[
                                    { icon: 'fa-chart-line', titre: 'Notes & moyennes en temps réel', texte: 'Consultez les résultats dès leur saisie par les enseignants.' },
                                    { icon: 'fa-calendar-check', titre: 'Suivi des absences', texte: 'Soyez alerté immédiatement en cas d\'absence de votre enfant.' },
                                    { icon: 'fa-file-pdf', titre: 'Bulletins PDF', texte: 'Téléchargez les bulletins de chaque période directement sur votre téléphone.' },
                                    { icon: 'fa-wallet', titre: 'État des paiements', texte: 'Consultez les frais de scolarité réglés et les éventuels impayés.' },
                                ].map(({ icon, titre, texte }) => (
                                    <div key={titre} className="d-flex gap-3">
                                        <div style={{ width: 38, height: 38, minWidth: 38, borderRadius: 8, background: '#f0fff4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <i className={`fas ${icon}`} style={{ color: '#16a34a', fontSize: 15 }} />
                                        </div>
                                        <div>
                                            <div className="fw-semibold small" style={{ color: '#0d3b73' }}>{titre}</div>
                                            <div className="text-muted small">{texte}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="col-lg-6">
                            <div className="card shadow" style={{ borderRadius: 20, border: 'none', overflow: 'hidden' }}>
                                <div style={{ background: 'linear-gradient(135deg, #16a34a 0%, #065f46 100%)', padding: '36px 40px 28px' }}>
                                    <div className="text-white text-center mb-4">
                                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                            <i className="fas fa-user-friends text-white" style={{ fontSize: 26 }} />
                                        </div>
                                        <h5 className="fw-bold mb-1">Créez votre compte parent</h5>
                                        <p className="small mb-0" style={{ opacity: 0.8 }}>
                                            Accès annuel — une seule fois
                                        </p>
                                    </div>
                                    <div className="d-flex flex-column gap-3">
                                        <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ background: 'rgba(255,255,255,.12)' }}>
                                            <i className="fas fa-school text-white" style={{ fontSize: 18, minWidth: 24 }} />
                                            <div className="text-white small">Code MENET de l'établissement</div>
                                        </div>
                                        <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ background: 'rgba(255,255,255,.12)' }}>
                                            <i className="fas fa-id-card text-white" style={{ fontSize: 18, minWidth: 24 }} />
                                            <div className="text-white small">Matricule de votre enfant</div>
                                        </div>
                                        <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ background: 'rgba(255,255,255,.12)' }}>
                                            <i className="fas fa-user text-white" style={{ fontSize: 18, minWidth: 24 }} />
                                            <div className="text-white small">Vos informations personnelles</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-body p-4 text-center" style={{ background: '#fff' }}>
                                    <Link to="/inscription-parent" className="btn btn-success btn-lg w-100 fw-semibold mb-3" style={{ borderRadius: 10 }}>
                                        <i className="fas fa-user-plus me-2" />Créer mon compte parent
                                    </Link>
                                    <p className="text-muted small mb-0">
                                        <i className="fas fa-shield-alt me-1 text-success" />
                                        Vos données sont protégées et confidentielles
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Contact / Démo ──────────────────────────────────────── */}
            <section id="contact" style={{ padding: '72px 0', background: '#f8fafc' }}>
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-6 text-center mb-5">
                            <h2 className="fw-bold" style={{ color: '#0d3b73' }}>Une question ? Parlons-en.</h2>
                            <p className="text-muted mt-2">Notre équipe vous répond sous 24h.</p>
                        </div>
                    </div>
                    <div className="row justify-content-center">
                        <div className="col-md-8 col-lg-6">
                            <div className="card shadow-sm" style={{ borderRadius: 16, border: '1px solid #e2e8f0' }}>
                                <div className="card-body p-4 p-md-5">
                                    <div className="d-flex flex-column gap-3">
                                        <a href="tel:+22507070707" className="d-flex align-items-center gap-3 text-decoration-none p-3 rounded-3" style={{ background: '#f0f7ff', color: '#0d3b73' }}>
                                            <i className="fas fa-phone fs-4" style={{ color: '#1a56a0' }} />
                                            <div>
                                                <div className="fw-semibold">Appeler</div>
                                                <div className="small text-muted">+225 07 07 07 07 07</div>
                                            </div>
                                        </a>
                                        <a href="mailto:contact@suiviscolaire.ci" className="d-flex align-items-center gap-3 text-decoration-none p-3 rounded-3" style={{ background: '#f0f7ff', color: '#0d3b73' }}>
                                            <i className="fas fa-envelope fs-4" style={{ color: '#1a56a0' }} />
                                            <div>
                                                <div className="fw-semibold">Email</div>
                                                <div className="small text-muted">contact@suiviscolaire.ci</div>
                                            </div>
                                        </a>
                                        <a href="https://wa.me/2250707070707" target="_blank" rel="noreferrer" className="d-flex align-items-center gap-3 text-decoration-none p-3 rounded-3" style={{ background: '#f0fff4', color: '#166534' }}>
                                            <i className="fab fa-whatsapp fs-4" style={{ color: '#16a34a' }} />
                                            <div>
                                                <div className="fw-semibold">WhatsApp</div>
                                                <div className="small text-muted">Message rapide</div>
                                            </div>
                                        </a>
                                    </div>
                                    <div className="text-center mt-4">
                                        <Link to="/inscription-etablissement" className="btn btn-primary btn-lg w-100 fw-semibold" style={{ borderRadius: 10 }}>
                                            <i className="fas fa-rocket me-2" />Demander un accès
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <footer style={{ background: '#0d3b73', color: '#94a3b8', padding: '32px 0' }}>
                <div className="container">
                    <div className="row align-items-center">
                        <div className="col-md-6 mb-3 mb-md-0">
                            <div className="d-flex align-items-center gap-2 text-white fw-semibold mb-1">
                                <i className="fas fa-school" />
                                Suivi Scolaire
                            </div>
                            <div className="small">© {new Date().getFullYear()} — Tous droits réservés</div>
                        </div>
                        <div className="col-md-6 text-md-end">
                            <Link to="/login" className="text-white-50 text-decoration-none small me-3">Connexion</Link>
                            <Link to="/inscription-etablissement" className="text-white-50 text-decoration-none small me-3">Inscription</Link>
                            <Link to="/politique-confidentialite" className="text-white-50 text-decoration-none small">Confidentialité</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
