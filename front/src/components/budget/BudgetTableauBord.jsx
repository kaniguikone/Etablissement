import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const fmt = (n) => Number(n ?? 0).toLocaleString('fr-FR');
const COULEURS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#6b7280'];

export default function BudgetTableauBord() {
    const { toast } = useToast();

    const [annees, setAnnees]   = useState([]);
    const [anneeId, setAnneeId] = useState('');
    const [solde, setSolde]     = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [chargement, setChargement] = useState(true);
    const [exporting, setExporting] = useState('');

    useEffect(() => {
        api.get('/annees-scolaires').then(r => {
            setAnnees(r.data);
            const enCours = r.data.find(a => a.statut === 'en_cours');
            setAnneeId(String((enCours ?? r.data[0])?.id ?? ''));
        }).catch(() => toast.error('Erreur lors du chargement.'));
    }, []);

    useEffect(() => {
        if (!anneeId) return;
        setChargement(true);
        Promise.all([
            api.get(`/budget/solde?annee_scolaire_id=${anneeId}`),
            api.get(`/budget/dashboard?annee_scolaire_id=${anneeId}`),
        ]).then(([rs, rd]) => { setSolde(rs.data); setDashboard(rd.data); })
          .catch(() => toast.error('Erreur lors du chargement du tableau de bord.'))
          .finally(() => setChargement(false));
    }, [anneeId]);

    const totalCategories = (dashboard?.par_categorie ?? []).reduce((s, c) => s + c.total, 0);
    const totalMois = (dashboard?.par_mois ?? []).reduce((max, m) => Math.max(max, m.total), 0);
    const anneeLibelle = annees.find(a => String(a.id) === anneeId)?.libelle ?? 'annee';

    const exporter = async (format) => {
        if (!anneeId) return;
        setExporting(format);
        try {
            const endpoint = format === 'excel' ? '/budget/export-excel' : '/budget/rapport-pdf';
            const ext      = format === 'excel' ? '.xlsx' : '.pdf';
            const mime     = format === 'excel'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'application/pdf';

            const response = await api.get(`${endpoint}?annee_scolaire_id=${anneeId}`, { responseType: 'blob', timeout: 60000 });

            const url  = URL.createObjectURL(new Blob([response.data], { type: mime }));
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `budget_${format === 'excel' ? 'depenses' : 'rapport'}_${anneeLibelle}${ext}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("Erreur lors de l'export.");
        } finally {
            setExporting('');
        }
    };

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="mb-0">Tableau de bord budget</h4>
                    <small className="text-muted">Suivi de l&apos;enveloppe budgétaire de l&apos;établissement</small>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <select className="form-select form-select-sm" style={{ width: 200 }} value={anneeId} onChange={e => setAnneeId(e.target.value)}>
                        {annees.map(a => <option key={a.id} value={a.id}>{a.libelle}</option>)}
                    </select>
                    <button className="btn btn-outline-success btn-sm" disabled={!anneeId || exporting} onClick={() => exporter('excel')} title="Exporter le registre des dépenses (Excel)">
                        {exporting === 'excel' ? <span className="spinner-border spinner-border-sm" /> : <><i className="fas fa-file-excel me-1" />Excel</>}
                    </button>
                    <button className="btn btn-outline-danger btn-sm" disabled={!anneeId || exporting} onClick={() => exporter('pdf')} title="Exporter le rapport budgétaire (PDF)">
                        {exporting === 'pdf' ? <span className="spinner-border spinner-border-sm" /> : <><i className="fas fa-file-pdf me-1" />PDF</>}
                    </button>
                </div>
            </div>

            {chargement ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : (
                <>
                    <div className="row g-3 mb-4">
                        {[
                            { l: 'Octroyé',           v: solde?.octroye, c: '#10b981', i: 'bi-cash-stack' },
                            { l: 'Dépensé',           v: solde?.depense, c: '#ef4444', i: 'bi-cart-dash' },
                            { l: 'Solde disponible',  v: solde?.solde,   c: solde?.solde > 0 ? '#3b82f6' : '#dc3545', i: 'bi-wallet2' },
                        ].map(x => (
                            <div key={x.l} className="col-12 col-md-4">
                                <div className="card border-0 shadow-sm" style={{ borderRadius: 10, borderLeft: `4px solid ${x.c}` }}>
                                    <div className="card-body py-3 d-flex align-items-center gap-3">
                                        <div style={{ width: 44, height: 44, borderRadius: 8, background: x.c + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <i className={`bi ${x.i}`} style={{ color: x.c, fontSize: 20 }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: x.c }}>{fmt(x.v)} F</div>
                                            <div style={{ fontSize: 12, color: '#6c757d' }}>{x.l}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="row g-3">
                        <div className="col-12 col-lg-6">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-header bg-white border-0 pt-3 pb-2">
                                    <span className="fw-semibold text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                                        Répartition par catégorie
                                    </span>
                                </div>
                                <div className="card-body">
                                    {(dashboard?.par_categorie ?? []).length === 0 ? (
                                        <div className="text-muted text-center py-4">Aucune dépense enregistrée.</div>
                                    ) : dashboard.par_categorie.map((c, i) => (
                                        <div key={c.categorie} className="mb-3">
                                            <div className="d-flex justify-content-between small mb-1">
                                                <span className="fw-semibold">{c.categorie} <span className="text-muted">({c.nb})</span></span>
                                                <span>{fmt(c.total)} F</span>
                                            </div>
                                            <div className="progress" style={{ height: 8 }}>
                                                <div className="progress-bar" style={{
                                                    width: `${totalCategories > 0 ? (c.total / totalCategories) * 100 : 0}%`,
                                                    backgroundColor: COULEURS[i % COULEURS.length],
                                                }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="col-12 col-lg-6">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-header bg-white border-0 pt-3 pb-2">
                                    <span className="fw-semibold text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                                        Historique mensuel des dépenses
                                    </span>
                                </div>
                                <div className="card-body">
                                    {(dashboard?.par_mois ?? []).length === 0 ? (
                                        <div className="text-muted text-center py-4">Aucune dépense enregistrée.</div>
                                    ) : (
                                        <div className="d-flex align-items-end gap-2" style={{ height: 160 }}>
                                            {dashboard.par_mois.map(m => (
                                                <div key={m.mois} className="d-flex flex-column align-items-center flex-fill">
                                                    <div className="small text-muted mb-1">{fmt(m.total)}</div>
                                                    <div style={{
                                                        width: '100%',
                                                        maxWidth: 32,
                                                        height: totalMois > 0 ? Math.max(4, (m.total / totalMois) * 120) : 4,
                                                        backgroundColor: '#3b82f6',
                                                        borderRadius: 4,
                                                    }} />
                                                    <div className="small text-muted mt-1">{m.mois.slice(5)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
