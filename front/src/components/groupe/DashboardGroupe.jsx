import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { centralApi } from '../../api/axios';

const fmt = (n) => Number(n ?? 0).toLocaleString('fr-FR');

const KpiCard = ({ icone, couleur, valeur, label, suffix = '' }) => {
    const palette = {
        success: { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
        info:    { bg: '#dbeafe', text: '#1e3a8a', border: '#3b82f6' },
        warning: { bg: '#fef3c7', text: '#78350f', border: '#f59e0b' },
        primary: { bg: '#ede9fe', text: '#4c1d95', border: '#8b5cf6' },
        danger:  { bg: '#fee2e2', text: '#7f1d1d', border: '#ef4444' },
        purple:  { bg: '#f3e8ff', text: '#581c87', border: '#a855f7' },
    };
    const p = palette[couleur] || palette.primary;
    return (
        <div className="col">
            <div style={{
                background: p.bg, borderLeft: `4px solid ${p.border}`,
                borderRadius: 10, padding: '14px 16px',
            }}>
                <div className="d-flex align-items-center gap-2 mb-1">
                    <i className={icone} style={{ color: p.border, fontSize: 16 }} />
                    <span style={{ fontSize: 12, color: p.text, fontWeight: 600 }}>{label}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: p.text }}>
                    {fmt(valeur)}{suffix}
                </div>
            </div>
        </div>
    );
};

const Jauge = ({ taux, couleur }) => {
    const r = 36, c = 2 * Math.PI * r;
    const fill = c - (c * Math.min(taux, 100)) / 100;
    const colors = { success: '#198754', warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6' };
    const color = colors[couleur] || colors.info;
    return (
        <svg width="88" height="88" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} fill="none" stroke="#e9ecef" strokeWidth="10" />
            <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
                strokeDasharray={c} strokeDashoffset={fill} strokeLinecap="round"
                transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
            <text x="50" y="55" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>{taux}%</text>
        </svg>
    );
};

const Section = ({ titre, icone, children }) => (
    <div className="mb-4">
        <h6 className="fw-semibold text-muted text-uppercase mb-3" style={{ fontSize: 11, letterSpacing: 1 }}>
            <i className={`${icone} me-2`} />{titre}
        </h6>
        {children}
    </div>
);

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

const DashboardGroupe = () => {
    const navigate    = useNavigate();
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [erreur, setErreur]   = useState('');
    const [mois, setMois]       = useState('');

    const moisOptions = derniersMois();

    useEffect(() => {
        setLoading(true);
        setErreur('');
        const params = mois ? `?mois=${mois}` : '';
        centralApi.get(`/group/dashboard${params}`)
            .then(r => setData(r.data))
            .catch(() => setErreur('Impossible de charger les données.'))
            .finally(() => setLoading(false));
    }, [mois]);

    const labelPeriode = mois
        ? moisOptions.find(m => m.val === mois)?.label
        : 'Toutes périodes';

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
            <span className="spinner-border text-primary" />
        </div>
    );
    if (erreur) return <div className="alert alert-danger m-4">{erreur}</div>;

    const { totaux, ecoles } = data;
    const couleurTaux = totaux.taux_recouvrement >= 80 ? 'success' : totaux.taux_recouvrement >= 50 ? 'warning' : 'danger';

    return (
        <div className="container-fluid py-4" style={{ maxWidth: 1100 }}>

            {/* En-tête + filtre */}
            <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
                <div>
                    <h4 className="fw-bold mb-1">
                        <i className="fas fa-layer-group me-2 text-primary" />
                        {data.groupe.nom}
                    </h4>
                    <p className="text-muted small mb-0">
                        Tableau de bord consolidé — {totaux.ecoles} établissement(s)
                    </p>
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

            {/* ── Effectifs ────────────────────────────────────────────────── */}
            <Section titre="Effectifs" icone="fas fa-users">
                <div className="row row-cols-2 row-cols-md-3 row-cols-lg-5 g-3">
                    <KpiCard icone="fas fa-school"             couleur="info"    valeur={totaux.ecoles}      label="Établissements" />
                    <KpiCard icone="fas fa-user-graduate"      couleur="success" valeur={totaux.eleves}      label="Élèves" />
                    <KpiCard icone="fas fa-chalkboard-teacher" couleur="primary" valeur={totaux.enseignants} label="Enseignants" />
                    <KpiCard icone="fas fa-door-open"          couleur="info"    valeur={totaux.classes}     label="Classes" />
                    <KpiCard icone="fas fa-user-friends"       couleur="warning" valeur={totaux.parents}     label="Parents" />
                </div>
            </Section>

            {/* ── Finances ─────────────────────────────────────────────────── */}
            <Section titre="Finances (global)" icone="fas fa-wallet">
                <div className="row g-3 align-items-stretch">
                    <div className="col-12 col-md-6 col-lg-3">
                        <div className="card shadow-sm h-100 text-center" style={{ borderRadius: 12 }}>
                            <div className="card-body d-flex flex-column align-items-center justify-content-center">
                                <Jauge taux={totaux.taux_recouvrement} couleur={couleurTaux} />
                                <div className="fw-semibold mt-2" style={{ fontSize: 13 }}>Taux de recouvrement</div>
                            </div>
                        </div>
                    </div>
                    <div className="col-12 col-md-6 col-lg-9">
                        <div className="row row-cols-2 row-cols-md-2 g-3 h-100">
                            <KpiCard icone="fas fa-file-invoice"       couleur="warning" valeur={totaux.total_du}         label="Total dû"           suffix=" F" />
                            <KpiCard icone="fas fa-money-bill-wave"    couleur="success" valeur={totaux.total_encaisse}   label={`Encaissé (${labelPeriode})`} suffix=" F" />
                            <KpiCard icone="fas fa-exclamation-circle" couleur="danger"  valeur={totaux.impayes}          label="Impayés (global)"   suffix=" F" />
                            <div className="col">
                                <div className="card shadow-sm h-100" style={{ borderRadius: 10 }}>
                                    <div className="card-body d-flex gap-3 align-items-center">
                                        <div className="text-center flex-fill">
                                            <div style={{ fontSize: 20, fontWeight: 700, color: '#198754' }}>{fmt(totaux.eleves_a_jour)}</div>
                                            <div style={{ fontSize: 11, color: '#6c757d' }}>À jour</div>
                                        </div>
                                        <div style={{ width: 1, background: '#e9ecef', height: 40 }} />
                                        <div className="text-center flex-fill">
                                            <div style={{ fontSize: 20, fontWeight: 700, color: '#dc3545' }}>{fmt(totaux.eleves_en_retard)}</div>
                                            <div style={{ fontSize: 11, color: '#6c757d' }}>En retard</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* ── Pédagogie ────────────────────────────────────────────────── */}
            <Section titre="Pédagogie (global)" icone="fas fa-graduation-cap">
                <div className="row row-cols-2 g-3">
                    <KpiCard icone="fas fa-file-alt"    couleur="primary" valeur={totaux.devoirs}  label="Devoirs au total" />
                    <KpiCard icone="fas fa-pen"         couleur="success" valeur={totaux.taux_saisie_notes ?? 0} label="Taux saisie notes" suffix="%" />
                </div>
            </Section>

            {/* ── Détail par école ─────────────────────────────────────────── */}
            <Section titre="Détail par établissement" icone="fas fa-list">
                <div className="row g-3">
                    {ecoles.map(ecole => {
                        const s = ecole.stats;
                        const taux = s.totalDu > 0 ? Math.round((s.totalEncaisse / s.totalDu) * 100) : 0;
                        const couleur = taux >= 80 ? '#198754' : taux >= 50 ? '#f59e0b' : '#dc3545';
                        const planCouleur = ecole.plan === 'pro' ? '#0d6efd' : ecole.plan === 'basic' ? '#198754' : '#6c757d';

                        return (
                            <div key={ecole.id} className="col-12 col-md-6 col-lg-4">
                                <div
                                    className="card shadow-sm h-100"
                                    style={{ borderRadius: 12, borderTop: `4px solid ${planCouleur}`, cursor: 'pointer', transition: 'transform .15s' }}
                                    onClick={() => navigate(`/groupe/ecoles/${ecole.id}`)}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div>
                                                <h6 className="fw-bold mb-0">{ecole.nom}</h6>
                                                <span className="text-muted small"><i className="fas fa-map-marker-alt me-1" />{ecole.ville || '—'}</span>
                                            </div>
                                            <span className="badge" style={{ background: planCouleur }}>{ecole.plan}</span>
                                        </div>

                                        {/* Effectifs */}
                                        <div className="row g-2 text-center mb-3">
                                            {[
                                                { l: 'Élèves',      v: s.totalEleves,      c: '#198754' },
                                                { l: 'Enseignants', v: s.totalEnseignants,  c: '#6f42c1' },
                                                { l: 'Classes',     v: s.totalClasses,      c: '#0dcaf0' },
                                            ].map(x => (
                                                <div key={x.l} className="col-4">
                                                    <div style={{ background: x.c + '15', borderRadius: 8, padding: '6px 4px' }}>
                                                        <div style={{ fontSize: 16, fontWeight: 700, color: x.c }}>{x.v}</div>
                                                        <div style={{ fontSize: 10, color: '#6c757d' }}>{x.l}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Finances */}
                                        <div className="border-top pt-2">
                                            <div className="d-flex justify-content-between small mb-1">
                                                <span className="text-muted">Encaissé</span>
                                                <span className="fw-semibold text-success">{fmt(s.totalEncaisse)} F</span>
                                            </div>
                                            <div className="d-flex justify-content-between small mb-2">
                                                <span className="text-muted">Impayés</span>
                                                <span className={`fw-semibold ${s.impayes > 0 ? 'text-danger' : 'text-muted'}`}>{fmt(s.impayes)} F</span>
                                            </div>
                                            {/* Barre de recouvrement */}
                                            <div style={{ height: 6, background: '#e9ecef', borderRadius: 3 }}>
                                                <div style={{ height: '100%', width: `${Math.min(taux, 100)}%`, background: couleur, borderRadius: 3, transition: 'width .6s ease' }} />
                                            </div>
                                            <div className="d-flex justify-content-between mt-1">
                                                <span style={{ fontSize: 10, color: '#6c757d' }}>Recouvrement</span>
                                                <span style={{ fontSize: 10, fontWeight: 700, color: couleur }}>{taux}%</span>
                                            </div>
                                        </div>

                                        {/* Absences */}
                                        <div className="border-top pt-2 mt-2 d-flex justify-content-between small text-muted">
                                            <span><i className="fas fa-user-times me-1 text-danger" />{s.totalAbsences} absences</span>
                                            <span><i className="fas fa-clock me-1 text-warning" />{s.totalRetards} retards</span>
                                        </div>

                                        <div className="text-end mt-2">
                                            <span className="text-primary small fw-semibold">
                                                Voir le détail <i className="fas fa-arrow-right ms-1" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Section>
        </div>
    );
};

export default DashboardGroupe;
