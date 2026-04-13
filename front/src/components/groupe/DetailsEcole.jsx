import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { centralApi } from '../../api/axios';

const fmt  = (n) => Number(n ?? 0).toLocaleString('fr-FR');
const fmtK = (n) => {
    if (n == null) return '—';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + ' M';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' K';
    return String(n);
};

const derniersMois = () => {
    const mois = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        mois.push({ val, label });
    }
    return mois;
};

// Bandeau KPI — même style que la page Statistiques de l'école
const KpiBandeau = ({ icone, valeur, label, sous, couleur }) => {
    const COLORS = {
        success: { bg: '#d1fae5', text: '#065f46', border: '#10b981', icon: '#10b981' },
        warning: { bg: '#fef3c7', text: '#78350f', border: '#f59e0b', icon: '#f59e0b' },
        danger:  { bg: '#fee2e2', text: '#7f1d1d', border: '#ef4444', icon: '#ef4444' },
        info:    { bg: '#dbeafe', text: '#1e3a8a', border: '#3b82f6', icon: '#3b82f6' },
        primary: { bg: '#ede9fe', text: '#4c1d95', border: '#8b5cf6', icon: '#8b5cf6' },
    };
    const p = COLORS[couleur] || COLORS.info;
    return (
        <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12, borderLeft: `4px solid ${p.border}` }}>
            <div className="card-body py-3 px-3">
                <div className="d-flex align-items-center gap-3">
                    <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 44, height: 44, backgroundColor: p.bg }}>
                        <i className={icone} style={{ fontSize: 20, color: p.icon }} />
                    </div>
                    <div className="flex-grow-1">
                        <div className="fw-bold lh-1 mb-1" style={{ fontSize: 26, color: p.text }}>{valeur ?? '—'}</div>
                        <div className="text-muted small">{label}</div>
                        {sous && <div style={{ fontSize: '0.78rem', color: p.border, marginTop: 2 }}>{sous}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Section = ({ titre, icone, couleur = 'info', children }) => {
    const COLORS = { success: '#10b981', warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6', primary: '#8b5cf6' };
    const border = COLORS[couleur];
    return (
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 14 }}>
            <div className="card-header border-0 bg-white px-3 pt-3 pb-2"
                style={{ borderBottom: `2px solid ${border}20` }}>
                <span className="fw-semibold d-flex align-items-center gap-2" style={{ color: border }}>
                    <i className={icone} />
                    <span className="text-dark">{titre}</span>
                </span>
            </div>
            <div className="card-body px-3 pt-3 pb-3">{children}</div>
        </div>
    );
};

const DetailsEcole = () => {
    const { id }   = useParams();
    const navigate = useNavigate();
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [erreur, setErreur]   = useState('');
    const [mois, setMois]       = useState('');

    const moisOptions = derniersMois();

    useEffect(() => {
        setLoading(true);
        setErreur('');
        const params = mois ? `?mois=${mois}` : '';
        centralApi.get(`/group/ecoles/${id}/stats${params}`)
            .then(r => setData(r.data))
            .catch(() => setErreur('Impossible de charger les données de cet établissement.'))
            .finally(() => setLoading(false));
    }, [id, mois]);

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
            <span className="spinner-border text-primary" />
        </div>
    );
    if (erreur) return <div className="alert alert-danger m-4">{erreur}</div>;

    const { tenant, stats } = data;
    const labelPeriode = mois ? moisOptions.find(m => m.val === mois)?.label : 'Toutes périodes';
    const couleurTaux  = stats.tauxRecouvrement >= 80 ? 'success' : stats.tauxRecouvrement >= 50 ? 'warning' : 'danger';
    const couleurPres  = (stats.tauxPresence ?? 0) >= 85 ? 'success' : (stats.tauxPresence ?? 0) >= 70 ? 'warning' : 'danger';

    return (
        <div className="container-fluid py-4" style={{ maxWidth: 1000 }}>

            {/* Retour */}
            <button className="btn btn-sm btn-outline-secondary mb-3" onClick={() => navigate('/groupe')}>
                <i className="fas fa-arrow-left me-2" />Retour au tableau de bord
            </button>

            {/* En-tête + filtre */}
            <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
                <div className="card shadow-sm flex-fill" style={{ borderRadius: 12 }}>
                    <div className="card-body d-flex align-items-center gap-3">
                        <div style={{
                            width: 56, height: 56, borderRadius: '50%',
                            background: '#1a56a020', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            <i className="fas fa-school text-primary" style={{ fontSize: 24 }} />
                        </div>
                        <div>
                            <h5 className="fw-bold mb-1">{tenant.nom}</h5>
                            <div className="d-flex gap-3 text-muted small flex-wrap">
                                {tenant.ville && <span><i className="fas fa-map-marker-alt me-1" />{tenant.ville}</span>}
                                <span>
                                    Plan : <span className={`badge bg-${tenant.plan === 'pro' ? 'primary' : tenant.plan === 'basic' ? 'success' : 'secondary'}`}>{tenant.plan}</span>
                                </span>
                                <span>
                                    <i className={`fas fa-circle me-1 ${tenant.actif ? 'text-success' : 'text-danger'}`} style={{ fontSize: 9 }} />
                                    {tenant.actif ? 'Actif' : 'Inactif'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <i className="fas fa-calendar-alt text-muted" />
                    <select
                        className="form-select form-select-sm"
                        style={{ minWidth: 180 }}
                        value={mois}
                        onChange={e => setMois(e.target.value)}
                    >
                        <option value="">Toutes périodes</option>
                        {moisOptions.map(m => (
                            <option key={m.val} value={m.val}>{m.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Bandeau KPI principal (style Statistiques) ── */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-md-3">
                    <KpiBandeau
                        icone="fas fa-clipboard-check"
                        valeur={stats.tauxPresence != null ? `${stats.tauxPresence}%` : '—'}
                        label="Taux de présence"
                        sous={`${fmt(stats.totalAbsences)} absences enregistrées`}
                        couleur={couleurPres}
                    />
                </div>
                <div className="col-6 col-md-3">
                    <KpiBandeau
                        icone="fas fa-graduation-cap"
                        valeur={stats.moyenneGenerale != null ? `${stats.moyenneGenerale}/20` : '—'}
                        label="Moyenne générale"
                        sous={`${fmt(stats.nbNotes)} notes saisies`}
                        couleur="primary"
                    />
                </div>
                <div className="col-6 col-md-3">
                    <KpiBandeau
                        icone="fas fa-exclamation-triangle"
                        valeur={fmt(stats.nbElevesDifficulte)}
                        label="Élèves en difficulté"
                        sous="Moyenne < 8 dans une matière"
                        couleur="danger"
                    />
                </div>
                <div className="col-6 col-md-3">
                    <KpiBandeau
                        icone="fas fa-wallet"
                        valeur={`${stats.tauxRecouvrement}%`}
                        label="Taux de recouvrement"
                        sous={`${fmtK(stats.impayes)} FCFA restants`}
                        couleur={couleurTaux}
                    />
                </div>
            </div>

            {/* ── Effectifs ── */}
            <Section titre="Effectifs" icone="fas fa-users" couleur="info">
                <div className="row row-cols-2 row-cols-md-4 g-3">
                    {[
                        { l: 'Élèves inscrits',  v: stats.eleves,      c: '#198754', i: 'fas fa-user-graduate' },
                        { l: 'Enseignants',       v: stats.enseignants, c: '#6f42c1', i: 'fas fa-chalkboard-teacher' },
                        { l: 'Classes',           v: stats.classes,     c: '#0dcaf0', i: 'fas fa-door-open' },
                        { l: 'Parents',           v: stats.parents,     c: '#fd7e14', i: 'fas fa-user-friends' },
                    ].map(x => (
                        <div key={x.l} className="col">
                            <div style={{ background: x.c + '18', borderRadius: 10, padding: '12px 14px', borderLeft: `4px solid ${x.c}` }}>
                                <div className="d-flex align-items-center gap-2 mb-1">
                                    <i className={x.i} style={{ color: x.c, fontSize: 14 }} />
                                    <span style={{ fontSize: 11, color: x.c, fontWeight: 600 }}>{x.l}</span>
                                </div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: x.c }}>{fmt(x.v)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── Finances ── */}
            <Section titre={`Finances — ${labelPeriode}`} icone="fas fa-wallet" couleur="warning">
                <div className="row g-3">
                    <div className="col-6 col-md-3">
                        <div className="text-center p-3 rounded" style={{ background: '#fef3c7' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#78350f' }}>{fmtK(stats.totalDu)} F</div>
                            <div style={{ fontSize: 11, color: '#92400e' }}>Total dû</div>
                        </div>
                    </div>
                    <div className="col-6 col-md-3">
                        <div className="text-center p-3 rounded" style={{ background: '#d1fae5' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#065f46' }}>{fmtK(stats.totalEncaisse)} F</div>
                            <div style={{ fontSize: 11, color: '#047857' }}>Encaissé</div>
                        </div>
                    </div>
                    <div className="col-6 col-md-3">
                        <div className="text-center p-3 rounded" style={{ background: '#fee2e2' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#7f1d1d' }}>{fmtK(stats.impayes)} F</div>
                            <div style={{ fontSize: 11, color: '#991b1b' }}>Impayés</div>
                        </div>
                    </div>
                    <div className="col-6 col-md-3">
                        <div className="text-center p-3 rounded" style={{ background: '#dbeafe' }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: '#1e3a8a' }}>
                                {fmt(stats.elevesAJour)} / {fmt(stats.elevesEnRetard)}
                            </div>
                            <div style={{ fontSize: 11, color: '#1e40af' }}>À jour / En retard</div>
                        </div>
                    </div>
                </div>
                {/* Barre de recouvrement */}
                <div className="mt-3">
                    <div className="d-flex justify-content-between small text-muted mb-1">
                        <span>Recouvrement global</span>
                        <strong style={{ color: stats.tauxRecouvrement >= 80 ? '#198754' : stats.tauxRecouvrement >= 50 ? '#f59e0b' : '#dc3545' }}>
                            {stats.tauxRecouvrement}%
                        </strong>
                    </div>
                    <div style={{ height: 8, background: '#e9ecef', borderRadius: 4 }}>
                        <div style={{
                            height: '100%',
                            width: `${Math.min(stats.tauxRecouvrement, 100)}%`,
                            background: stats.tauxRecouvrement >= 80 ? '#198754' : stats.tauxRecouvrement >= 50 ? '#f59e0b' : '#dc3545',
                            borderRadius: 4, transition: 'width .6s ease',
                        }} />
                    </div>
                </div>
            </Section>

            {/* ── Assiduité ── */}
            <Section titre={`Assiduité — ${labelPeriode}`} icone="fas fa-clipboard-check" couleur="success">
                <div className="row g-3">
                    {[
                        { l: 'Taux de présence', v: stats.tauxPresence != null ? `${stats.tauxPresence}%` : '—', c: '#198754', i: 'fas fa-user-check' },
                        { l: 'Absences',         v: fmt(stats.totalAbsences), c: '#dc3545', i: 'fas fa-user-times' },
                        { l: 'Retards',          v: fmt(stats.totalRetards),  c: '#f59e0b', i: 'fas fa-clock' },
                    ].map(x => (
                        <div key={x.l} className="col-4">
                            <div className="text-center p-3 rounded" style={{ background: x.c + '15', borderTop: `3px solid ${x.c}` }}>
                                <i className={x.i} style={{ color: x.c, fontSize: 22, marginBottom: 6, display: 'block' }} />
                                <div style={{ fontSize: 22, fontWeight: 700, color: x.c }}>{x.v}</div>
                                <div style={{ fontSize: 11, color: '#6c757d' }}>{x.l}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── Pédagogie ── */}
            <Section titre="Pédagogie" icone="fas fa-graduation-cap" couleur="primary">
                <div className="row g-3">
                    {[
                        { l: 'Moyenne générale',    v: stats.moyenneGenerale != null ? `${stats.moyenneGenerale}/20` : '—', c: '#8b5cf6', i: 'fas fa-chart-line' },
                        { l: 'Élèves en difficulté',v: fmt(stats.nbElevesDifficulte), c: '#ef4444', i: 'fas fa-exclamation-triangle' },
                        { l: 'Devoirs saisis',      v: fmt(stats.totalDevoirs),        c: '#3b82f6', i: 'fas fa-file-alt' },
                        { l: 'Taux saisie notes',   v: `${stats.tauxSaisieNotes}%`,    c: '#10b981', i: 'fas fa-pen' },
                    ].map(x => (
                        <div key={x.l} className="col-6 col-md-3">
                            <div className="text-center p-3 rounded" style={{ background: x.c + '15', borderTop: `3px solid ${x.c}` }}>
                                <i className={x.i} style={{ color: x.c, fontSize: 22, marginBottom: 6, display: 'block' }} />
                                <div style={{ fontSize: 20, fontWeight: 700, color: x.c }}>{x.v}</div>
                                <div style={{ fontSize: 11, color: '#6c757d' }}>{x.l}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

        </div>
    );
};

export default DetailsEcole;
