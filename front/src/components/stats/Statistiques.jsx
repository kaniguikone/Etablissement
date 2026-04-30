import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt  = (n) => (n != null ? Number(n).toLocaleString('fr-FR') : '—');
const fmtK = (n) => {
    if (n == null) return '—';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + ' M';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' K';
    return String(n);
};

const Spinner = () => (
    <div className="d-flex justify-content-center py-4">
        <div className="spinner-border spinner-border-sm text-secondary" />
    </div>
);

const Vide = ({ texte = 'Aucune donnée disponible pour cette période.' }) => (
    <div className="text-center text-muted py-4">
        <i className="fas fa-chart-bar fs-3 d-block mb-2 opacity-25" />
        {texte}
    </div>
);

// ── Composants visuels ────────────────────────────────────────────────────────

// Jauge circulaire SVG (même pattern qu'Accueil)
const Jauge = ({ taux, couleur, size = 90, label }) => {
    const COLORS = { success: '#10b981', warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6', primary: '#8b5cf6' };
    const c = COLORS[couleur] || COLORS.info;
    const r = size * 0.4, cx = size / 2, cy = size / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (circ * Math.min(taux ?? 0, 100)) / 100;
    return (
        <div className="d-flex flex-column align-items-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e9ecef" strokeWidth={size * 0.1} />
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={c} strokeWidth={size * 0.1}
                    strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{ transition: 'stroke-dashoffset 1s ease' }} />
                <text x={cx} y={cy + 5} textAnchor="middle" fontSize={size * 0.2} fontWeight="bold" fill={c}>
                    {taux != null ? `${taux}%` : '—'}
                </text>
            </svg>
            {label && <div className="text-muted mt-1" style={{ fontSize: '0.8rem', textAlign: 'center' }}>{label}</div>}
        </div>
    );
};

// Donut SVG pour la distribution des notes
const Donut = ({ tranches }) => {
    const total = tranches.reduce((s, t) => s + t.valeur, 0);
    if (!total) return null;
    const size = 110, r = 38, cx = size / 2, cy = size / 2;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    return (
        <div className="d-flex flex-column align-items-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e9ecef" strokeWidth={14} />
                {tranches.map((t, i) => {
                    const pct  = t.valeur / total;
                    const dash = circ * pct;
                    const gap  = circ - dash;
                    const el = (
                        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                            stroke={t.couleur} strokeWidth={14}
                            strokeDasharray={`${dash} ${gap}`}
                            strokeDashoffset={-offset}
                            transform={`rotate(-90 ${cx} ${cy})`}
                            style={{ transition: 'stroke-dashoffset 1s ease' }} />
                    );
                    offset += dash;
                    return el;
                })}
                <text x={cx} y={cy - 3} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#374151">{total}</text>
                <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="#9ca3af">notes</text>
            </svg>
        </div>
    );
};

// KPI bandeau
const KpiBandeau = ({ icone, valeur, label, sous, couleur, accent }) => {
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
                    <div className="flex-grow-1 min-w-0">
                        <div className="fw-bold lh-1 mb-1" style={{ fontSize: 26, color: p.text }}>{valeur ?? '—'}</div>
                        <div className="text-muted small text-truncate">{label}</div>
                        {sous && <div style={{ fontSize: '0.78rem', color: p.border, marginTop: 2 }}>{sous}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Barre horizontale empilée (présent / retard / absent)
const BarreEmpilee = ({ presents, retards, absences, total }) => {
    if (!total) return <div className="text-muted small">—</div>;
    const pPres  = Math.round((presents  / total) * 100);
    const pRet   = Math.round((retards   / total) * 100);
    const pAbs   = Math.round((absences  / total) * 100);
    return (
        <div style={{ height: 10, borderRadius: 5, overflow: 'hidden', display: 'flex', backgroundColor: '#e9ecef' }}>
            <div style={{ width: `${pPres}%`, backgroundColor: '#10b981', transition: 'width 0.9s ease' }} />
            <div style={{ width: `${pRet}%`,  backgroundColor: '#f59e0b', transition: 'width 0.9s ease' }} />
            <div style={{ width: `${pAbs}%`,  backgroundColor: '#ef4444', transition: 'width 0.9s ease' }} />
        </div>
    );
};

// Barre simple colorée
const BarreSimple = ({ pct, couleur }) => {
    const COLORS = { success: '#10b981', warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6', primary: '#8b5cf6' };
    return (
        <div style={{ height: 8, borderRadius: 4, backgroundColor: '#e9ecef', overflow: 'hidden' }}>
            <div style={{
                height: '100%', width: `${Math.min(Math.max(pct ?? 0, 0), 100)}%`,
                backgroundColor: COLORS[couleur] || '#6c757d',
                borderRadius: 4, transition: 'width 0.9s ease',
            }} />
        </div>
    );
};

// Conteneur de section avec en-tête
const Section = ({ titre, icone, couleur, children, actions }) => {
    const COLORS = { success: '#10b981', warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6', primary: '#8b5cf6', secondary: '#6c757d' };
    const border = COLORS[couleur] || '#3b82f6';
    return (
        <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
            <div className="card-header border-0 bg-white d-flex justify-content-between align-items-center px-3 pt-3 pb-2"
                style={{ borderBottom: `2px solid ${border}20` }}>
                <span className="fw-semibold d-flex align-items-center gap-2" style={{ color: border }}>
                    <i className={icone} />
                    <span className="text-dark">{titre}</span>
                </span>
                {actions}
            </div>
            <div className="card-body px-3 pt-3 pb-3">{children}</div>
        </div>
    );
};

// Onglet
const Onglet = ({ label, icone, actif, onClick, badge }) => (
    <button
        className="btn btn-sm d-flex align-items-center gap-2"
        onClick={onClick}
        style={{
            borderRadius: 8,
            padding: '6px 14px',
            fontWeight: actif ? 600 : 400,
            backgroundColor: actif ? '#1e3a8a' : 'transparent',
            color: actif ? 'white' : '#6c757d',
            border: actif ? 'none' : '1px solid #e5e7eb',
            transition: 'all 0.2s',
        }}
    >
        <i className={icone} style={{ fontSize: 13 }} />
        {label}
        {badge != null && (
            <span className="badge rounded-pill ms-1"
                style={{ fontSize: '0.72rem', backgroundColor: actif ? 'rgba(255,255,255,0.3)' : '#e5e7eb', color: actif ? 'white' : '#374151' }}>
                {badge}
            </span>
        )}
    </button>
);

// ── Onglet Assiduité ─────────────────────────────────────────────────────────

const TabAssiduite = ({ data }) => {
    const [vue, setVue] = useState('classe');
    if (!data) return <Spinner />;
    const { par_classe, par_matiere } = data;

    return (
        <div className="row g-4">
            {/* Sous-navigation */}
            <div className="col-12">
                <div className="d-flex gap-2">
                    <button className={`btn btn-sm ${vue === 'classe' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        style={{ borderRadius: 8 }} onClick={() => setVue('classe')}>
                        <i className="fas fa-school me-1" />Par classe
                    </button>
                    <button className={`btn btn-sm ${vue === 'matiere' ? 'btn-danger' : 'btn-outline-secondary'}`}
                        style={{ borderRadius: 8 }} onClick={() => setVue('matiere')}>
                        <i className="fas fa-book me-1" />Par matière
                    </button>
                </div>
            </div>

            {vue === 'classe' && (
                <div className="col-12">
                    <Section titre="Présence par classe" icone="fas fa-clipboard-check" couleur="success">
                        {par_classe.length === 0 ? <Vide /> : (
                            <>
                                <div className="d-flex gap-3 mb-3" style={{ fontSize: '0.8rem' }}>
                                    <span><span style={{ color: '#10b981' }}>■</span> Présents</span>
                                    <span><span style={{ color: '#f59e0b' }}>■</span> Retards</span>
                                    <span><span style={{ color: '#ef4444' }}>■</span> Absents</span>
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-sm mb-0" style={{ fontSize: '0.88rem' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f8fafc' }}>
                                                <th className="border-0 fw-semibold text-muted" style={{ width: '22%' }}>Classe</th>
                                                <th className="border-0 fw-semibold text-muted text-end" style={{ width: '10%' }}>Élèves</th>
                                                <th className="border-0 fw-semibold text-success text-end" style={{ width: '10%' }}>Présents</th>
                                                <th className="border-0 fw-semibold text-warning text-end" style={{ width: '10%' }}>Retards</th>
                                                <th className="border-0 fw-semibold text-danger text-end" style={{ width: '10%' }}>Absences</th>
                                                <th className="border-0 fw-semibold text-muted" style={{ width: '38%' }}>Répartition</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {par_classe.map((c, i) => {
                                                const couleur = c.taux_presence >= 85 ? 'success' : c.taux_presence >= 70 ? 'warning' : 'danger';
                                                const COLORS = { success: '#10b981', warning: '#f59e0b', danger: '#ef4444' };
                                                return (
                                                    <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                        <td className="py-2 align-middle">
                                                            <div className="fw-semibold">{c.classe}</div>
                                                            <div className="text-muted" style={{ fontSize: '0.78rem' }}>{c.nom_classe}</div>
                                                        </td>
                                                        <td className="py-2 align-middle text-end text-muted">{c.nb_eleves}</td>
                                                        <td className="py-2 align-middle text-end fw-semibold text-success">{c.presents}</td>
                                                        <td className="py-2 align-middle text-end fw-semibold text-warning">{c.retards}</td>
                                                        <td className="py-2 align-middle text-end fw-semibold text-danger">{c.absences}</td>
                                                        <td className="py-2 align-middle">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div className="flex-grow-1">
                                                                    <BarreEmpilee presents={c.presents} retards={c.retards} absences={c.absences} total={c.total_pointages} />
                                                                </div>
                                                                <span className="fw-bold" style={{ fontSize: '0.82rem', color: COLORS[couleur], minWidth: 36 }}>
                                                                    {c.taux_presence}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </Section>
                </div>
            )}

            {vue === 'matiere' && (
                <div className="col-12">
                    <Section titre="Absences par matière" icone="fas fa-book-open" couleur="danger">
                        {par_matiere.length === 0 ? <Vide /> : (
                            <div className="row g-3">
                                {par_matiere.map((m, i) => {
                                    const taux = parseFloat(m.taux_absence);
                                    const couleur = taux <= 5 ? 'success' : taux <= 15 ? 'warning' : 'danger';
                                    const COLORS  = { success: '#10b981', warning: '#f59e0b', danger: '#ef4444' };
                                    return (
                                        <div key={i} className="col-md-4 col-sm-6">
                                            <div className="p-3 rounded-3 h-100" style={{ backgroundColor: '#fafafa', border: '1px solid #f0f0f0' }}>
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div>
                                                        <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{m.libelle}</div>
                                                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>{m.absences} absences · {m.total} pointages</div>
                                                    </div>
                                                    <span className="fw-bold" style={{ color: COLORS[couleur], fontSize: '1.2rem', lineHeight: 1 }}>
                                                        {taux}%
                                                    </span>
                                                </div>
                                                <BarreSimple pct={taux * 3} couleur={couleur} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Section>
                </div>
            )}
        </div>
    );
};

// ── Onglet Résultats ─────────────────────────────────────────────────────────

const TabResultats = ({ data, distribution }) => {
    const [vue, setVue] = useState('matiere');
    if (!data) return <Spinner />;
    const { par_matiere, par_classe } = data;

    const TRANCHE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

    return (
        <div className="row g-4">
            {/* Distribution globale */}
            {distribution && (
                <div className="col-12">
                    <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
                        <div className="card-body px-4 py-3">
                            <div className="d-flex flex-wrap align-items-center gap-4">
                                <Donut tranches={[
                                    { valeur: distribution.moins_8,    couleur: '#ef4444' },
                                    { valeur: distribution.entre_8_10, couleur: '#f59e0b' },
                                    { valeur: distribution.dix_plus,   couleur: '#10b981' },
                                ]} />
                                <div className="flex-grow-1">
                                    <div className="fw-bold mb-3 text-dark" style={{ fontSize: '0.95rem' }}>Distribution des notes</div>
                                    {[
                                        { label: 'Insuffisant (< 8)',    valeur: distribution.moins_8,    couleur: '#ef4444', bg: '#fee2e2' },
                                        { label: 'Passable (8 à 10)',    valeur: distribution.entre_8_10, couleur: '#f59e0b', bg: '#fef3c7' },
                                        { label: 'Satisfaisant (≥ 10)', valeur: distribution.dix_plus,   couleur: '#10b981', bg: '#d1fae5' },
                                    ].map((t, i) => {
                                        const total = (distribution.moins_8 ?? 0) + (distribution.entre_8_10 ?? 0) + (distribution.dix_plus ?? 0);
                                        const pct = total > 0 ? Math.round((t.valeur / total) * 100) : 0;
                                        return (
                                            <div key={i} className="d-flex align-items-center gap-3 mb-2">
                                                <div className="rounded-pill px-2 py-1 fw-semibold flex-shrink-0"
                                                    style={{ backgroundColor: t.bg, color: t.couleur, fontSize: '0.8rem', minWidth: 170 }}>
                                                    <i className="fas fa-circle me-1" style={{ fontSize: 8 }} />{t.label}
                                                </div>
                                                <div className="flex-grow-1">
                                                    <BarreSimple pct={pct} couleur={t.couleur === '#ef4444' ? 'danger' : t.couleur === '#f59e0b' ? 'warning' : 'success'} />
                                                </div>
                                                <span className="fw-bold text-end" style={{ minWidth: 60, fontSize: '0.88rem', color: t.couleur }}>
                                                    {t.valeur} ({pct}%)
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sous-navigation */}
            <div className="col-12">
                <div className="d-flex gap-2">
                    <button className={`btn btn-sm ${vue === 'matiere' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        style={{ borderRadius: 8 }} onClick={() => setVue('matiere')}>
                        <i className="fas fa-book me-1" />Par matière
                    </button>
                    <button className={`btn btn-sm ${vue === 'classe' ? 'btn-primary' : 'btn-outline-secondary'}`}
                        style={{ borderRadius: 8 }} onClick={() => setVue('classe')}>
                        <i className="fas fa-school me-1" />Par classe
                    </button>
                </div>
            </div>

            {vue === 'matiere' && (
                <div className="col-12">
                    <Section titre="Moyenne par matière" icone="fas fa-graduation-cap" couleur="primary">
                        {par_matiere.length === 0 ? <Vide /> : (
                            <div className="table-responsive">
                                <table className="table table-sm mb-0" style={{ fontSize: '0.88rem' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8fafc' }}>
                                            <th className="border-0 fw-semibold text-muted" style={{ width: '25%' }}>Matière</th>
                                            <th className="border-0 fw-semibold text-danger text-end">{'< 8'}</th>
                                            <th className="border-0 fw-semibold text-warning text-end">8–10</th>
                                            <th className="border-0 fw-semibold text-success text-end">≥ 10</th>
                                            <th className="border-0 fw-semibold text-muted text-end">Notes</th>
                                            <th className="border-0 fw-semibold text-muted" style={{ width: '35%' }}>Moyenne</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {par_matiere.map((m, i) => {
                                            const moy = parseFloat(m.moyenne);
                                            const couleur = moy >= 14 ? 'success' : moy >= 10 ? 'info' : moy >= 8 ? 'warning' : 'danger';
                                            const COLORS = { success: '#10b981', info: '#3b82f6', warning: '#f59e0b', danger: '#ef4444' };
                                            return (
                                                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                    <td className="py-2 align-middle">
                                                        <div className="fw-semibold">{m.matiere}</div>
                                                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>{m.libelle}</div>
                                                    </td>
                                                    <td className="py-2 align-middle text-end fw-semibold text-danger">{m.nb_moins_8}</td>
                                                    <td className="py-2 align-middle text-end fw-semibold text-warning">{m.nb_8_10}</td>
                                                    <td className="py-2 align-middle text-end fw-semibold text-success">{m.nb_10_plus}</td>
                                                    <td className="py-2 align-middle text-end text-muted">{m.nb_notes}</td>
                                                    <td className="py-2 align-middle">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="flex-grow-1">
                                                                <BarreSimple pct={(moy / 20) * 100} couleur={couleur} />
                                                            </div>
                                                            <span className="fw-bold" style={{ fontSize: '0.85rem', color: COLORS[couleur], minWidth: 42, textAlign: 'right' }}>
                                                                {moy}/20
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Section>
                </div>
            )}

            {vue === 'classe' && (
                <div className="col-12">
                    <Section titre="Moyenne par classe" icone="fas fa-school" couleur="info">
                        {par_classe.length === 0 ? <Vide /> : (
                            <div className="row g-3">
                                {par_classe.map((c, i) => {
                                    const moy = parseFloat(c.moyenne);
                                    const couleur = moy >= 14 ? '#10b981' : moy >= 10 ? '#3b82f6' : moy >= 8 ? '#f59e0b' : '#ef4444';
                                    const bgColor = moy >= 14 ? '#f0fdf4' : moy >= 10 ? '#eff6ff' : moy >= 8 ? '#fffbeb' : '#fff5f5';
                                    return (
                                        <div key={i} className="col-md-4 col-sm-6">
                                            <div className="p-3 rounded-3 h-100" style={{ backgroundColor: bgColor, border: `1px solid ${couleur}25` }}>
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div>
                                                        <div className="fw-bold" style={{ fontSize: '0.95rem' }}>{c.classe}</div>
                                                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>{c.nom_classe} · {c.nb_eleves} élèves</div>
                                                    </div>
                                                    <div className="fw-bold text-end" style={{ color: couleur, fontSize: '1.5rem', lineHeight: 1 }}>
                                                        {moy}
                                                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>/20</span>
                                                    </div>
                                                </div>
                                                <BarreSimple pct={(moy / 20) * 100} couleur={moy >= 14 ? 'success' : moy >= 10 ? 'info' : moy >= 8 ? 'warning' : 'danger'} />
                                                <div className="d-flex gap-3 mt-2" style={{ fontSize: '0.78rem' }}>
                                                    <span className="text-danger"><i className="fas fa-exclamation-circle me-1" />{c.nb_moins_8} en diff.</span>
                                                    <span className="text-success"><i className="fas fa-check-circle me-1" />{c.nb_10_plus} ≥ 10</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Section>
                </div>
            )}
        </div>
    );
};

// ── Onglet Finances ──────────────────────────────────────────────────────────

const TabFinances = ({ data, synthese }) => {
    const [vue, setVue] = useState('niveau');
    if (!data) return <Spinner />;
    const { par_niveau, par_echeance } = data;

    return (
        <div className="row g-4">
            {/* Récap global */}
            {synthese && (
                <div className="col-12">
                    <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
                        <div className="card-body px-4 py-3">
                            <div className="d-flex flex-wrap align-items-center gap-4">
                                <Jauge taux={synthese.taux_recouvrement_global} couleur={
                                    synthese.taux_recouvrement_global >= 80 ? 'success'
                                    : synthese.taux_recouvrement_global >= 50 ? 'warning' : 'danger'
                                } size={100} label="Taux global" />
                                <div className="flex-grow-1">
                                    <div className="fw-bold mb-3 text-dark" style={{ fontSize: '0.95rem' }}>Situation financière globale</div>
                                    <div className="row g-2">
                                        <div className="col-sm-4">
                                            <div className="p-2 rounded-3" style={{ backgroundColor: '#d1fae5' }}>
                                                <div className="fw-bold text-success" style={{ fontSize: 18 }}>{fmtK(synthese.total_encaisse_global)} FCFA</div>
                                                <div className="text-muted small">Encaissé</div>
                                            </div>
                                        </div>
                                        <div className="col-sm-4">
                                            <div className="p-2 rounded-3" style={{ backgroundColor: '#fee2e2' }}>
                                                <div className="fw-bold text-danger" style={{ fontSize: 18 }}>{fmtK(synthese.montant_restant_global)} FCFA</div>
                                                <div className="text-muted small">Restant à encaisser</div>
                                            </div>
                                        </div>
                                        <div className="col-sm-4">
                                            <div className="p-2 rounded-3" style={{ backgroundColor: '#f3f4f6' }}>
                                                <div className="fw-bold text-dark" style={{ fontSize: 18 }}>{fmtK(synthese.total_du_global)} FCFA</div>
                                                <div className="text-muted small">Total attendu</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sous-navigation */}
            <div className="col-12">
                <div className="d-flex gap-2">
                    <button className={`btn btn-sm ${vue === 'niveau' ? 'btn-success' : 'btn-outline-secondary'}`}
                        style={{ borderRadius: 8 }} onClick={() => setVue('niveau')}>
                        <i className="fas fa-layer-group me-1" />Par niveau
                    </button>
                    <button className={`btn btn-sm ${vue === 'echeance' ? 'btn-warning' : 'btn-outline-secondary'}`}
                        style={{ borderRadius: 8 }} onClick={() => setVue('echeance')}>
                        <i className="fas fa-calendar-alt me-1" />Par échéance
                    </button>
                </div>
            </div>

            {vue === 'niveau' && (
                <div className="col-12">
                    <Section titre="Recouvrement par niveau" icone="fas fa-layer-group" couleur="success">
                        {par_niveau.length === 0 ? <Vide /> : (
                            <div className="table-responsive">
                                <table className="table table-sm mb-0" style={{ fontSize: '0.88rem' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8fafc' }}>
                                            <th className="border-0 fw-semibold text-muted">Niveau</th>
                                            <th className="border-0 fw-semibold text-muted text-end">Élèves</th>
                                            <th className="border-0 fw-semibold text-success text-end">À jour</th>
                                            <th className="border-0 fw-semibold text-danger text-end">En retard</th>
                                            <th className="border-0 fw-semibold text-muted text-end">Encaissé</th>
                                            <th className="border-0 fw-semibold text-muted text-end">Dû</th>
                                            <th className="border-0 fw-semibold text-muted" style={{ width: '25%' }}>Taux</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {par_niveau.map((n, i) => {
                                            const couleur = n.taux >= 80 ? 'success' : n.taux >= 50 ? 'warning' : 'danger';
                                            const COLORS  = { success: '#10b981', warning: '#f59e0b', danger: '#ef4444' };
                                            return (
                                                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                    <td className="py-2 align-middle">
                                                        <div className="fw-semibold">{n.niveau}</div>
                                                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>{n.libelle}</div>
                                                    </td>
                                                    <td className="py-2 align-middle text-end text-muted">{n.nb_eleves}</td>
                                                    <td className="py-2 align-middle text-end fw-semibold text-success">{n.eleves_a_jour}</td>
                                                    <td className="py-2 align-middle text-end fw-semibold text-danger">{n.eleves_en_retard}</td>
                                                    <td className="py-2 align-middle text-end fw-semibold text-success" style={{ fontSize: '0.82rem' }}>
                                                        {fmtK(n.total_encaisse)}
                                                    </td>
                                                    <td className="py-2 align-middle text-end text-muted" style={{ fontSize: '0.82rem' }}>
                                                        {fmtK(n.montant_du)}
                                                    </td>
                                                    <td className="py-2 align-middle">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <div className="flex-grow-1">
                                                                <BarreSimple pct={n.taux} couleur={couleur} />
                                                            </div>
                                                            <span className="fw-bold" style={{ color: COLORS[couleur], minWidth: 38, fontSize: '0.82rem', textAlign: 'right' }}>
                                                                {n.taux}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Section>
                </div>
            )}

            {vue === 'echeance' && (
                <div className="col-12">
                    <Section titre="Recouvrement par échéance" icone="fas fa-calendar-check" couleur="warning">
                        {par_echeance.length === 0 ? <Vide /> : (
                            <div className="row g-3">
                                {par_echeance.map((e, i) => {
                                    const couleur = e.taux >= 80 ? '#10b981' : e.taux >= 50 ? '#f59e0b' : '#ef4444';
                                    const bgColor = e.taux >= 80 ? '#f0fdf4' : e.taux >= 50 ? '#fffbeb' : '#fff5f5';
                                    return (
                                        <div key={i} className="col-md-4 col-sm-6">
                                            <div className="p-3 rounded-3 h-100" style={{ backgroundColor: bgColor, border: `1px solid ${couleur}30` }}>
                                                <div className="d-flex justify-content-between align-items-start mb-1">
                                                    <div>
                                                        <div className="fw-bold" style={{ fontSize: '0.9rem' }}>{e.echeance}</div>
                                                        <div className="text-muted" style={{ fontSize: '0.78rem' }}>{e.niveau} · {e.nb_eleves} élèves</div>
                                                    </div>
                                                    <div className="fw-bold" style={{ color: couleur, fontSize: '1.4rem', lineHeight: 1 }}>{e.taux}%</div>
                                                </div>
                                                <BarreSimple pct={e.taux} couleur={e.taux >= 80 ? 'success' : e.taux >= 50 ? 'warning' : 'danger'} />
                                                <div className="d-flex justify-content-between mt-2" style={{ fontSize: '0.8rem' }}>
                                                    <span className="fw-semibold" style={{ color: '#10b981' }}>{fmtK(e.total_encaisse)}</span>
                                                    <span className="text-muted">sur {fmtK(e.total_du)} FCFA</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Section>
                </div>
            )}
        </div>
    );
};

// ── Onglet Évolution inter-périodes ──────────────────────────────────────────

const TabEvolution = ({ periodes, classes }) => {
    const [classeId, setClasseId] = useState('');
    const [data, setData]         = useState(null);
    const [chargement, setChargement] = useState(false);

    const charger = (cId) => {
        setChargement(true);
        const p = cId ? `?classe_id=${cId}` : '';
        api.get(`/stats/evolution${p}`)
            .then(r => { setData(r.data); setChargement(false); })
            .catch(() => setChargement(false));
    };

    useEffect(() => { charger(''); }, []);

    const COULEURS_PERIODES = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

    return (
        <div className="row g-4">
            <div className="col-md-4">
                <select className="form-select form-select-sm" value={classeId}
                    onChange={e => { setClasseId(e.target.value); charger(e.target.value); }}>
                    <option value="">Tout l'établissement</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                </select>
            </div>

            <div className="col-12">
                <Section titre="Évolution des moyennes par période" icone="fas fa-chart-line" couleur="primary">
                    {chargement ? <Spinner /> : !data || data.length === 0 ? <Vide /> : (
                        <div className="table-responsive">
                            <table className="table table-sm mb-0" style={{ fontSize: '0.88rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc' }}>
                                        <th className="border-0 fw-semibold text-muted">Période</th>
                                        <th className="border-0 fw-semibold text-primary text-end">Moy. générale</th>
                                        {data[0]?.par_matiere?.map((m, i) => (
                                            <th key={i} className="border-0 fw-semibold text-muted text-end" style={{ fontSize: '0.78rem' }}>
                                                {m.matiere}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((p, i) => {
                                        const moy = parseFloat(p.moyenne_gen);
                                        const couleur = moy >= 14 ? '#10b981' : moy >= 10 ? '#3b82f6' : moy >= 8 ? '#f59e0b' : '#ef4444';
                                        const prev = i > 0 ? parseFloat(data[i-1].moyenne_gen) : null;
                                        const evolution = prev !== null ? moy - prev : null;
                                        return (
                                            <tr key={p.periode_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                <td className="py-2 align-middle">
                                                    <span className="fw-semibold" style={{ color: COULEURS_PERIODES[i % COULEURS_PERIODES.length] }}>
                                                        {p.periode}
                                                    </span>
                                                </td>
                                                <td className="py-2 align-middle text-end">
                                                    <span className="fw-bold" style={{ color: couleur }}>{moy}/20</span>
                                                    {evolution !== null && (
                                                        <span className="ms-1" style={{ fontSize: '0.75rem', color: evolution >= 0 ? '#10b981' : '#ef4444' }}>
                                                            {evolution >= 0 ? '▲' : '▼'}{Math.abs(evolution).toFixed(2)}
                                                        </span>
                                                    )}
                                                </td>
                                                {p.par_matiere?.map((m, j) => {
                                                    const mm = parseFloat(m.moyenne);
                                                    const prevM = i > 0 ? parseFloat(data[i-1]?.par_matiere?.[j]?.moyenne ?? 0) : null;
                                                    const evo = prevM !== null ? mm - prevM : null;
                                                    return (
                                                        <td key={j} className="py-2 align-middle text-end" style={{ fontSize: '0.82rem' }}>
                                                            <span style={{ color: mm >= 10 ? '#10b981' : '#ef4444' }}>{mm}</span>
                                                            {evo !== null && Math.abs(evo) > 0.05 && (
                                                                <span style={{ fontSize: '0.7rem', color: evo >= 0 ? '#10b981' : '#ef4444' }}>
                                                                    {evo >= 0 ? '▲' : '▼'}
                                                                </span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Section>
            </div>
        </div>
    );
};

// ── Onglet Classement ─────────────────────────────────────────────────────────

const MENTION_COLORS = {
    'Très bien': '#10b981', 'Bien': '#3b82f6',
    'Assez bien': '#8b5cf6', 'Passable': '#f59e0b', 'Insuffisant': '#ef4444',
};

const TabClassement = ({ periodes, classes }) => {
    const [classeId,  setClasseId]  = useState('');
    const [periodeId, setPeriodeId] = useState(periodes[0]?.id ?? '');
    const [data, setData]           = useState(null);
    const [chargement, setChargement] = useState(false);

    const charger = (cId, pId) => {
        if (!cId || !pId) { setData(null); return; }
        setChargement(true);
        api.get(`/stats/classement?classe_id=${cId}&periode_id=${pId}`)
            .then(r => { setData(r.data); setChargement(false); })
            .catch(() => setChargement(false));
    };

    return (
        <div className="row g-4">
            <div className="col-md-4">
                <select className="form-select form-select-sm" value={classeId}
                    onChange={e => { setClasseId(e.target.value); charger(e.target.value, periodeId); }}>
                    <option value="">Sélectionner une classe</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                </select>
            </div>
            <div className="col-md-4">
                <select className="form-select form-select-sm" value={periodeId}
                    onChange={e => { setPeriodeId(e.target.value); charger(classeId, e.target.value); }}>
                    <option value="">Sélectionner une période</option>
                    {periodes.map(p => <option key={p.id} value={p.id}>{p.libelle_periode} {p.annee}</option>)}
                </select>
            </div>

            <div className="col-12">
                <Section titre={data ? `Classement — ${data.classe?.nom_classe} — ${data.periode?.libelle_periode}` : 'Classement'} icone="fas fa-trophy" couleur="warning">
                    {chargement ? <Spinner /> : !data ? (
                        <Vide texte="Sélectionnez une classe et une période." />
                    ) : data.classement.length === 0 ? <Vide /> : (
                        <div className="table-responsive">
                            <table className="table table-sm mb-0" style={{ fontSize: '0.88rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc' }}>
                                        <th className="border-0 fw-semibold text-muted text-center" style={{ width: 50 }}>Rang</th>
                                        <th className="border-0 fw-semibold text-muted">Élève</th>
                                        <th className="border-0 fw-semibold text-muted">Matricule</th>
                                        <th className="border-0 fw-semibold text-muted text-end">Moy. générale</th>
                                        <th className="border-0 fw-semibold text-muted text-center">Mention</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.classement.map(e => {
                                        const couleur = MENTION_COLORS[e.mention] || '#6c757d';
                                        const medaille = e.rang === 1 ? '🥇' : e.rang === 2 ? '🥈' : e.rang === 3 ? '🥉' : null;
                                        return (
                                            <tr key={e.eleve_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                <td className="py-2 align-middle text-center">
                                                    <span className="fw-bold" style={{ color: e.rang <= 3 ? couleur : '#6c757d' }}>
                                                        {medaille ?? `${e.rang}e`}
                                                    </span>
                                                </td>
                                                <td className="py-2 align-middle fw-semibold">{e.nom}</td>
                                                <td className="py-2 align-middle text-muted small">{e.matricule}</td>
                                                <td className="py-2 align-middle text-end">
                                                    <span className="fw-bold" style={{ color: couleur, fontSize: '1.05rem' }}>{e.moyenne}/20</span>
                                                </td>
                                                <td className="py-2 align-middle text-center">
                                                    <span className="badge rounded-pill px-3"
                                                        style={{ background: couleur + '20', color: couleur, fontWeight: 600, fontSize: '0.8rem' }}>
                                                        {e.mention}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Section>
            </div>
        </div>
    );
};

// ── Onglet Stats Enseignants ──────────────────────────────────────────────────

const TabEnseignants = ({ periodes }) => {
    const [periodeId, setPeriodeId] = useState('');
    const [data, setData]           = useState(null);
    const [chargement, setChargement] = useState(false);

    const charger = (pId) => {
        setChargement(true);
        const p = pId ? `?periode_id=${pId}` : '';
        api.get(`/stats/enseignants${p}`)
            .then(r => { setData(r.data); setChargement(false); })
            .catch(() => setChargement(false));
    };

    useEffect(() => { charger(''); }, []);

    return (
        <div className="row g-4">
            <div className="col-md-4">
                <select className="form-select form-select-sm" value={periodeId}
                    onChange={e => { setPeriodeId(e.target.value); charger(e.target.value); }}>
                    <option value="">Toutes les périodes</option>
                    {periodes.map(p => <option key={p.id} value={p.id}>{p.libelle_periode} {p.annee}</option>)}
                </select>
            </div>

            <div className="col-12">
                <Section titre="Activité par enseignant" icone="fas fa-chalkboard-teacher" couleur="info">
                    {chargement ? <Spinner /> : !data || data.length === 0 ? <Vide /> : (
                        <div className="table-responsive">
                            <table className="table table-sm mb-0" style={{ fontSize: '0.88rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc' }}>
                                        <th className="border-0 fw-semibold text-muted">Enseignant</th>
                                        <th className="border-0 fw-semibold text-muted text-end">Devoirs</th>
                                        <th className="border-0 fw-semibold text-muted text-end">Notes saisies</th>
                                        <th className="border-0 fw-semibold text-muted text-end">Élèves évalués</th>
                                        <th className="border-0 fw-semibold text-muted text-end">Moy. de classe</th>
                                        <th className="border-0 fw-semibold text-muted" style={{ width: '20%' }}>Activité</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((e, i) => {
                                        const maxDevoirs = Math.max(...data.map(x => x.nb_devoirs), 1);
                                        const pctActivite = Math.round((e.nb_devoirs / maxDevoirs) * 100);
                                        const moy = e.moyenne_classe;
                                        const couleur = moy >= 14 ? 'success' : moy >= 10 ? 'info' : moy >= 8 ? 'warning' : 'danger';
                                        return (
                                            <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                <td className="py-2 align-middle fw-semibold">{e.nom}</td>
                                                <td className="py-2 align-middle text-end">{e.nb_devoirs}</td>
                                                <td className="py-2 align-middle text-end">{e.nb_notes_saisies}</td>
                                                <td className="py-2 align-middle text-end">{e.nb_eleves_evalues}</td>
                                                <td className="py-2 align-middle text-end">
                                                    {moy !== null
                                                        ? <span className="fw-bold" style={{ color: { success: '#10b981', info: '#3b82f6', warning: '#f59e0b', danger: '#ef4444' }[couleur] }}>{moy}/20</span>
                                                        : <span className="text-muted">—</span>
                                                    }
                                                </td>
                                                <td className="py-2 align-middle">
                                                    <BarreSimple pct={pctActivite} couleur="info" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Section>
            </div>
        </div>
    );
};

// ── Composant principal ───────────────────────────────────────────────────────

const Statistiques = () => {
    const { peutAcceder } = useAuth();
    const { toast } = useToast();

    const voitPedagogie = peutAcceder('pedagogie');
    const voitFinances  = peutAcceder('finances');

    const onglets = [
        voitPedagogie && { id: 'assiduite',   label: 'Assiduité',    icone: 'fas fa-clipboard-check'     },
        voitPedagogie && { id: 'resultats',   label: 'Résultats',    icone: 'fas fa-graduation-cap'       },
        voitFinances  && { id: 'finances',    label: 'Finances',     icone: 'fas fa-wallet'               },
        voitPedagogie && { id: 'evolution',   label: 'Évolution',    icone: 'fas fa-chart-line'           },
        voitPedagogie && { id: 'classement',  label: 'Classement',   icone: 'fas fa-trophy'               },
        voitPedagogie && { id: 'enseignants', label: 'Enseignants',  icone: 'fas fa-chalkboard-teacher'   },
    ].filter(Boolean);

    const [ongletActif, setOngletActif] = useState(onglets[0]?.id ?? '');
    const [periodes,    setPeriodes]    = useState([]);
    const [periodeId,   setPeriodeId]   = useState('');
    const [classes,     setClasses]     = useState([]);
    const [synthese,    setSynthese]    = useState(null);
    const [presences,   setPresences]   = useState(null);
    const [moyennes,    setMoyennes]    = useState(null);
    const [finances,    setFinances]    = useState(null);

    // Charger les périodes et classes
    useEffect(() => {
        api.get('/periodes').then(res => {
            const sorted = [...res.data].sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut));
            setPeriodes(sorted);
            if (sorted.length > 0) setPeriodeId(sorted[0].id);
        });
        api.get('/classesTout').then(r => setClasses(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
    }, []);

    // Charger les données quand la période change
    useEffect(() => {
        if (!periodes.length) return;

        const params = periodeId ? `?periode_id=${periodeId}` : '';
        setSynthese(null);
        setPresences(null);
        setMoyennes(null);
        setFinances(null);

        api.get(`/stats/synthese${params}`).then(r => setSynthese(r.data)).catch(() => setSynthese({}));

        if (voitPedagogie) {
            api.get(`/stats/presences${params}`).then(r => setPresences(r.data)).catch(() => setPresences({ par_classe: [], par_matiere: [] }));
            api.get(`/stats/moyennes${params}`).then(r => setMoyennes(r.data)).catch(() => setMoyennes({ par_matiere: [], par_classe: [] }));
        }
        if (voitFinances) {
            api.get('/stats/finances').then(r => setFinances(r.data)).catch(() => setFinances({ par_niveau: [], par_echeance: [] }));
        }
    }, [periodeId, periodes.length, voitPedagogie, voitFinances]);

    // Labels de période pour l'affichage
    const periodeLabel = periodes.find(p => p.id == periodeId)
        ? `${periodes.find(p => p.id == periodeId).libelle_periode} ${periodes.find(p => p.id == periodeId).annee}`
        : 'Toutes périodes';

    return (
        <section className="page-wrapper">
            <div className="container-fluid py-3 px-3">

                {/* ── En-tête ── */}
                <div className="card border-0 mb-4"
                    style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', borderRadius: 16 }}>
                    <div className="card-body py-3 px-4">
                        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">

                            {/* Gauche : titre + sélecteur */}
                            <div>
                                <h4 className="mb-1 fw-bold text-white">
                                    <i className="fas fa-chart-bar me-2" />Statistiques
                                </h4>
                                <div className="text-white-50 small mb-3">
                                    Analyse de la performance de l'établissement
                                </div>
                                {/* Sélecteur période simple (stats = une seule période à la fois) */}
                                {periodes.length > 0 && (
                                    <button
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            backgroundColor: 'rgba(255,255,255,0.18)',
                                            border: '1px solid rgba(255,255,255,0.35)',
                                            color: 'white', borderRadius: 10,
                                            padding: '6px 12px', cursor: 'default',
                                            fontSize: '0.88rem', fontWeight: 500,
                                        }}
                                    >
                                        <i className="fas fa-calendar-alt" style={{ fontSize: 13, opacity: 0.85 }} />
                                        <select
                                            value={periodeId}
                                            onChange={e => setPeriodeId(e.target.value)}
                                            style={{
                                                background: 'none', border: 'none', color: 'white',
                                                fontSize: '0.88rem', fontWeight: 500, cursor: 'pointer',
                                                outline: 'none', padding: 0,
                                            }}
                                        >
                                            <option value="" style={{ color: '#000' }}>Toutes les périodes</option>
                                            {periodes.map(p => (
                                                <option key={p.id} value={p.id} style={{ color: '#000' }}>
                                                    {p.libelle_periode} {p.annee}
                                                </option>
                                            ))}
                                        </select>
                                        <i className="fas fa-chevron-down" style={{ fontSize: 11, opacity: 0.7 }} />
                                    </button>
                                )}
                            </div>

                            {/* Droite : date */}
                            <div style={{
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                borderRadius: 10, padding: '8px 14px',
                                backdropFilter: 'blur(4px)',
                            }}>
                                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', marginBottom: 2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    Aujourd'hui
                                </div>
                                <div className="fw-bold text-white text-capitalize" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                                    {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* ── Bandeau KPIs globaux ── */}
                <div className="row row-cols-2 row-cols-md-4 g-3 mb-4">
                    {voitPedagogie && (
                        <div className="col">
                            <KpiBandeau
                                icone="fas fa-clipboard-check" couleur="success"
                                valeur={synthese?.taux_presence_global != null ? `${synthese.taux_presence_global}%` : '—'}
                                label="Taux de présence"
                                sous={synthese ? `${synthese.total_absences ?? 0} absences enregistrées` : null}
                            />
                        </div>
                    )}
                    {voitPedagogie && (
                        <div className="col">
                            <KpiBandeau
                                icone="fas fa-graduation-cap" couleur="primary"
                                valeur={synthese?.moyenne_generale != null ? `${synthese.moyenne_generale}/20` : '—'}
                                label="Moyenne générale"
                                sous={synthese?.nb_notes_total ? `${synthese.nb_notes_total} notes saisies` : null}
                            />
                        </div>
                    )}
                    {voitPedagogie && (
                        <div className="col">
                            <KpiBandeau
                                icone="fas fa-exclamation-triangle" couleur="danger"
                                valeur={synthese?.nb_eleves_difficulte ?? '—'}
                                label="Élèves en difficulté"
                                sous="Moyenne < 8 dans une matière"
                            />
                        </div>
                    )}
                    {voitFinances && (
                        <div className="col">
                            <KpiBandeau
                                icone="fas fa-wallet" couleur="warning"
                                valeur={synthese?.taux_recouvrement_global != null ? `${synthese.taux_recouvrement_global}%` : '—'}
                                label="Taux de recouvrement"
                                sous={synthese?.montant_restant_global ? `${fmtK(synthese.montant_restant_global)} FCFA restants` : null}
                            />
                        </div>
                    )}
                </div>

                {/* ── Onglets ── */}
                <div className="d-flex gap-2 mb-4 flex-wrap">
                    {onglets.map(o => (
                        <Onglet key={o.id} label={o.label} icone={o.icone}
                            actif={ongletActif === o.id}
                            onClick={() => setOngletActif(o.id)} />
                    ))}
                </div>

                {/* ── Contenu de l'onglet actif ── */}
                {ongletActif === 'assiduite'   && <TabAssiduite data={presences} />}
                {ongletActif === 'resultats'   && <TabResultats data={moyennes} distribution={synthese?.distribution_notes} />}
                {ongletActif === 'finances'    && <TabFinances  data={finances}  synthese={synthese} />}
                {ongletActif === 'evolution'   && <TabEvolution periodes={periodes} classes={classes} />}
                {ongletActif === 'classement'  && <TabClassement periodes={periodes} classes={classes} />}
                {ongletActif === 'enseignants' && <TabEnseignants periodes={periodes} />}

            </div>
        </section>
    );
};

export default Statistiques;
