import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axios';

// Correspondance route → module d'aide
const ROUTE_MODULE = {
    '/':                      'dashboard',
    '/Eleves':                'eleves',
    '/NouvelEleve':           'eleves',
    '/DetailsEleve':          'eleves',
    '/Enseignants':           'enseignants',
    '/NouvelEnseignant':      'enseignants',
    '/Classes':               'classes',
    '/NouvelleClasse':        'classes',
    '/Niveaux':               'classes',
    '/Paiements':             'paiements',
    '/NouveauPaiement':       'paiements',
    '/Impayes':               'paiements',
    '/Echeancier':            'paiements',
    '/RecapPaiements':        'paiements',
    '/FraisAnnexes':          'frais_annexes',
    '/ImpayesFraisAnnexes':   'frais_annexes',
    '/FraisAnnexeEleve':      'frais_annexes',
    '/Bulletins':             'bulletins',
    '/Bulletin':              'bulletins',
    '/Devoirs':               'bulletins',
    '/NouveauDevoir':         'bulletins',
    '/Assiduites':            'assiduites',
    '/FeuillePresence':       'assiduites',
    '/EmploiDuTemps':         'emploi_du_temps',
    '/Sanctions':             'sanctions',
    '/FormSanction':          'sanctions',
    '/ConseilClasse':         'conseil',
    '/Informations':          'communication',
    '/Statistiques':          'statistiques',
    '/ExportComptable':       'export',
    '/RapportMinistere':      'export',
    '/Etablissement':         'parametrage',
    '/Archivage':             'parametrage',
    '/VolumeHoraire':         'parametrage',
    '/Utilisateurs':          'utilisateurs',
    '/Roles':                 'utilisateurs',
    '/AuditLogs':             'utilisateurs',
    '/Inscriptions':          'inscriptions',
};

const CAT_ICONS = {
    prise_en_main: 'bi-rocket-takeoff',
    tutoriel:      'bi-book',
    faq:           'bi-question-circle',
    astuce:        'bi-lightbulb',
};

const CAT_COLORS = {
    prise_en_main: 'text-success',
    tutoriel:      'text-primary',
    faq:           'text-warning',
    astuce:        'text-info',
};

/** Convertit le Markdown basique en HTML sans dépendance externe. */
const mdToHtml = (text) => {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        // Titres
        .replace(/^### (.+)$/gm, '<h6 class="mt-3 mb-1 fw-bold">$1</h6>')
        .replace(/^## (.+)$/gm,  '<h5 class="mt-3 mb-1 fw-bold">$1</h5>')
        .replace(/^# (.+)$/gm,   '<h4 class="mt-3 mb-1 fw-bold">$1</h4>')
        // Gras
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Listes non ordonnées
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul class="mb-2">$1</ul>')
        // Listes numérotées
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        // Sauts de ligne
        .replace(/\n\n/g, '</p><p class="mb-2">')
        .replace(/\n/g, '<br>');
};

export default function AideContextuelle() {
    const location               = useLocation();
    const [ouvert, setOuvert]    = useState(false);
    const [articles, setArticles] = useState([]);
    const [tous, setTous]        = useState([]);
    const [recherche, setRecherche] = useState('');
    const [articleActif, setArticleActif] = useState(null);
    const [chargement, setChargement] = useState(false);

    // Détecter le module courant selon la route
    const moduleActuel = useCallback(() => {
        const path = location.pathname;
        // Exact match
        if (ROUTE_MODULE[path]) return ROUTE_MODULE[path];
        // Préfixe match (ex: /DetailsEleve/123 → eleves)
        for (const [route, module] of Object.entries(ROUTE_MODULE)) {
            if (path.startsWith(route + '/')) return module;
        }
        return null;
    }, [location.pathname]);

    useEffect(() => {
        if (!ouvert) return;
        setChargement(true);
        const module = moduleActuel();
        const params = module ? `?module=${module}` : '';
        api.get(`/help${params}`)
            .then(r => { setArticles(r.data); setTous(r.data); })
            .catch(() => {})
            .finally(() => setChargement(false));
    }, [ouvert, moduleActuel]);

    // Recherche globale (tous modules)
    useEffect(() => {
        if (!recherche) {
            setArticles(tous);
            return;
        }
        const q = recherche.toLowerCase();
        setArticles(tous.filter(a =>
            a.titre.toLowerCase().includes(q) || a.contenu.toLowerCase().includes(q)
        ));
    }, [recherche, tous]);

    // Ouvrir avec tous les articles si recherche globale
    const lancerRechercheGlobale = async () => {
        if (tous.length === 0 || moduleActuel()) {
            setChargement(true);
            const r = await api.get('/help').catch(() => ({ data: [] }));
            setTous(r.data);
            setArticles(r.data);
            setChargement(false);
        }
    };

    const module = moduleActuel();

    if (!ouvert) {
        return (
            <button
                onClick={() => setOuvert(true)}
                title="Centre d'aide"
                style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 1040,
                    height: 48, borderRadius: 24,
                    background: '#1a5276', color: '#fff', border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,.3)',
                    display: 'flex', alignItems: 'center',
                    paddingLeft: 13, paddingRight: 13,
                    gap: 0, overflow: 'hidden',
                    width: 48,
                    transition: 'width .25s ease, box-shadow .15s',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.width = '160px';
                    e.currentTarget.style.gap = '8px';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,.35)';
                    e.currentTarget.querySelector('.aide-label').style.opacity = '1';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.width = '48px';
                    e.currentTarget.style.gap = '0';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.3)';
                    e.currentTarget.querySelector('.aide-label').style.opacity = '0';
                }}
            >
                <i className="fas fa-question" style={{ fontSize: 18, flexShrink: 0 }} />
                <span className="aide-label" style={{
                    fontSize: 14, fontWeight: 600, opacity: 0,
                    transition: 'opacity .2s ease .05s',
                }}>
                    Centre d'aide
                </span>
            </button>
        );
    }

    return (
        <>
            {/* Overlay léger */}
            <div
                style={{ position: 'fixed', inset: 0, zIndex: 1040, background: 'transparent' }}
                onClick={() => { setOuvert(false); setArticleActif(null); }}
            />

            {/* Panneau latéral */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
                zIndex: 1050, background: '#fff',
                boxShadow: '-4px 0 20px rgba(0,0,0,.15)',
                display: 'flex', flexDirection: 'column',
            }}>
                {/* En-tête */}
                <div style={{ background: '#1a5276', color: '#fff', padding: '14px 18px' }}>
                    <div className="d-flex align-items-center justify-content-between">
                        <div>
                            <div className="fw-bold fs-6">
                                <i className="bi bi-question-circle me-2" />
                                Centre d'aide
                            </div>
                            {module && (
                                <small style={{ opacity: .8 }}>
                                    Articles pour cette page
                                </small>
                            )}
                        </div>
                        <button
                            className="btn-close btn-close-white"
                            onClick={() => { setOuvert(false); setArticleActif(null); }}
                        />
                    </div>
                    <div className="mt-2">
                        <input
                            className="form-control form-control-sm"
                            placeholder="Rechercher dans toute la documentation…"
                            value={recherche}
                            onChange={e => setRecherche(e.target.value)}
                            onFocus={lancerRechercheGlobale}
                            style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '1px solid rgba(255,255,255,.3)' }}
                        />
                    </div>
                </div>

                {/* Corps */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                    {articleActif ? (
                        // Vue article
                        <div>
                            <button
                                className="btn btn-sm btn-link text-decoration-none ps-0 mb-3"
                                onClick={() => setArticleActif(null)}
                            >
                                <i className="bi bi-arrow-left me-1" />Retour
                            </button>
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <span className={`badge bg-light border small ${CAT_COLORS[articleActif.categorie]}`}>
                                    <i className={`bi ${CAT_ICONS[articleActif.categorie] ?? 'bi-book'} me-1`} />
                                    {articleActif.categorie?.replace('_', ' ')}
                                </span>
                            </div>
                            <h5 className="fw-bold mb-3">{articleActif.titre}</h5>
                            <div
                                className="small lh-lg"
                                style={{ color: '#333' }}
                                dangerouslySetInnerHTML={{ __html: `<p class="mb-2">${mdToHtml(articleActif.contenu)}</p>` }}
                            />
                        </div>
                    ) : chargement ? (
                        <div className="text-center py-5">
                            <div className="spinner-border spinner-border-sm text-primary" />
                        </div>
                    ) : articles.length === 0 ? (
                        <div className="text-center text-muted py-5">
                            <i className="bi bi-search fs-2 d-block mb-2" />
                            {recherche
                                ? `Aucun résultat pour « ${recherche} »`
                                : 'Aucun article disponible pour cette page.'}
                        </div>
                    ) : (
                        // Liste d'articles
                        <div>
                            {!recherche && module && (
                                <div className="text-muted small mb-3">
                                    {articles.length} article{articles.length > 1 ? 's' : ''} — {
                                        Object.entries({ prise_en_main: 'Prise en main', tutoriel: 'Tutoriels', faq: 'FAQ', astuce: 'Astuces' })
                                            .find(([k]) => articles[0]?.categorie === k)?.[1] ?? ''
                                    }
                                </div>
                            )}
                            {articles.map(a => (
                                <div
                                    key={a.id}
                                    className="p-3 mb-2 rounded border"
                                    style={{ cursor: 'pointer', transition: 'background .1s' }}
                                    onClick={() => setArticleActif(a)}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}
                                >
                                    <div className="d-flex align-items-start gap-2">
                                        <i className={`bi ${CAT_ICONS[a.categorie] ?? 'bi-book'} mt-1 ${CAT_COLORS[a.categorie]}`} />
                                        <div>
                                            <div className="fw-semibold small">{a.titre}</div>
                                            <div className="text-muted" style={{ fontSize: 11 }}>
                                                {a.contenu.substring(0, 80).replace(/[*#\n]/g, ' ')}…
                                            </div>
                                        </div>
                                        <i className="bi bi-chevron-right ms-auto text-muted" style={{ fontSize: 11 }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pied */}
                <div style={{ borderTop: '1px solid #eee', padding: '10px 16px', background: '#f8f9fa' }}>
                    <small className="text-muted">
                        <i className="bi bi-info-circle me-1" />
                        Vous pouvez enrichir cette documentation dans{' '}
                        <strong>Paramétrage → Documentation</strong>
                    </small>
                </div>
            </div>
        </>
    );
}
