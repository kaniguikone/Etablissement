import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const RapportMinistere = () => {
    const { toast } = useToast();

    const [periodes,  setPeriodes]  = useState([]);
    const [annee,     setAnnee]     = useState('');
    const [enCours,   setEnCours]   = useState(false);
    const [examens,   setExamens]   = useState({
        bepc_inscrits: '', bepc_admis: '',
        bac_inscrits: '',  bac_admis: '',
    });

    useEffect(() => {
        api.get('/periodes').then(r => {
            setPeriodes(r.data ?? []);
            const annees = [...new Set((r.data ?? []).map(p => p.annee).filter(Boolean))].sort().reverse();
            if (annees.length > 0) setAnnee(annees[0]);
        }).catch(() => toast.error('Impossible de charger les périodes.'));
    }, []);

    const annees = [...new Set(periodes.map(p => p.annee).filter(Boolean))].sort().reverse();

    const generer = async () => {
        if (!annee) { toast.error('Sélectionnez une année scolaire.'); return; }
        setEnCours(true);
        try {
            const body = {
                annee,
                bepc_inscrits: parseInt(examens.bepc_inscrits) || 0,
                bepc_admis:    parseInt(examens.bepc_admis)    || 0,
                bac_inscrits:  parseInt(examens.bac_inscrits)  || 0,
                bac_admis:     parseInt(examens.bac_admis)     || 0,
            };
            const r = await api.post('/rapport-ministere', body, { responseType: 'blob', timeout: 120000 });
            const url  = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
            const lien = document.createElement('a');
            lien.href     = url;
            lien.download = `rapport_statistique_${annee.replace('/', '-')}.pdf`;
            lien.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            let msg = 'Erreur lors de la génération du rapport.';
            if (err.response?.data instanceof Blob) {
                try { const t = await err.response.data.text(); msg = JSON.parse(t).message || msg; } catch {}
            }
            toast.error(msg);
        } finally {
            setEnCours(false);
        }
    };

    const changerExamen = (key, val) => setExamens(prev => ({ ...prev, [key]: val }));

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">
                        <i className="fas fa-chart-bar me-2 text-primary" />
                        Rapport statistique — Ministère
                    </h4>
                    <NavLink to="/Bulletins" className="btn btn-secondary btn-sm">Retour</NavLink>
                </div>

                <p className="text-muted small mb-4">
                    Génère le rapport statistique annuel officiel (effectifs, personnel, résultats, assiduité,
                    infrastructure). Ce document est destiné aux déclarations auprès du Ministère de l&apos;Éducation Nationale.
                </p>

                {/* ── Sélection année ─────────────────────────────────────────── */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-white border-0 fw-bold">
                        <i className="fas fa-calendar me-2 text-primary" />Année scolaire
                    </div>
                    <div className="card-body">
                        <div className="col-md-4">
                            <select className="form-select" value={annee} onChange={e => setAnnee(e.target.value)}>
                                <option value="">— Sélectionner une année —</option>
                                {annees.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* ── Examens officiels (saisie manuelle) ────────────────────── */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-white border-0 fw-bold">
                        <i className="fas fa-graduation-cap me-2 text-success" />
                        Examens officiels
                        <span className="text-muted fw-normal small ms-2">— Saisie manuelle (optionnelle)</span>
                    </div>
                    <div className="card-body">
                        <div className="row g-3">
                            <div className="col-md-6">
                                <div className="p-3 border rounded">
                                    <div className="fw-semibold mb-2 text-primary">B.E.P.C. (3ème)</div>
                                    <div className="row g-2">
                                        <div className="col-6">
                                            <label className="form-label small">Candidats inscrits</label>
                                            <input type="number" min="0" className="form-control form-control-sm"
                                                value={examens.bepc_inscrits}
                                                onChange={e => changerExamen('bepc_inscrits', e.target.value)}
                                                placeholder="0" />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small">Admis</label>
                                            <input type="number" min="0" className="form-control form-control-sm"
                                                value={examens.bepc_admis}
                                                onChange={e => changerExamen('bepc_admis', e.target.value)}
                                                placeholder="0" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="p-3 border rounded">
                                    <div className="fw-semibold mb-2 text-success">BAC (Terminale)</div>
                                    <div className="row g-2">
                                        <div className="col-6">
                                            <label className="form-label small">Candidats inscrits</label>
                                            <input type="number" min="0" className="form-control form-control-sm"
                                                value={examens.bac_inscrits}
                                                onChange={e => changerExamen('bac_inscrits', e.target.value)}
                                                placeholder="0" />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small">Admis</label>
                                            <input type="number" min="0" className="form-control form-control-sm"
                                                value={examens.bac_admis}
                                                onChange={e => changerExamen('bac_admis', e.target.value)}
                                                placeholder="0" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Contenu du rapport (info) ───────────────────────────────── */}
                <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-white border-0 fw-bold">
                        <i className="fas fa-file-pdf me-2 text-danger" />Contenu du rapport généré
                    </div>
                    <div className="card-body">
                        <div className="row g-2">
                            {[
                                { icon: 'fa-users', label: 'Section 1', desc: 'Effectifs par niveau, répartition H/F, tranches d\'âge' },
                                { icon: 'fa-chalkboard-teacher', label: 'Section 2', desc: 'Personnel enseignant, taux d\'encadrement, répartition par matière' },
                                { icon: 'fa-chart-line', label: 'Section 3', desc: 'Résultats scolaires — moyennes, taux de réussite, décisions conseil' },
                                { icon: 'fa-calendar-check', label: 'Section 4', desc: 'Assiduité — absences par classe et par niveau' },
                                { icon: 'fa-graduation-cap', label: 'Section 5', desc: 'Examens officiels BEPC et BAC (données saisies ci-dessus)' },
                                { icon: 'fa-building', label: 'Section 6', desc: 'Infrastructure — salles, capacité, taux d\'occupation' },
                            ].map(s => (
                                <div key={s.label} className="col-md-4">
                                    <div className="d-flex align-items-start gap-2 p-2 bg-light rounded">
                                        <i className={`fas ${s.icon} text-primary mt-1`} />
                                        <div>
                                            <div className="fw-semibold small">{s.label}</div>
                                            <div className="text-muted" style={{ fontSize: '0.78rem' }}>{s.desc}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Bouton génération ───────────────────────────────────────── */}
                <div className="text-center py-3">
                    <button
                        className="btn btn-primary btn-lg px-5 d-inline-flex align-items-center gap-2"
                        onClick={generer}
                        disabled={!annee || enCours}>
                        {enCours
                            ? <><span className="spinner-border spinner-border-sm" />Génération en cours…</>
                            : <><i className="fas fa-file-pdf" />Générer le rapport PDF</>}
                    </button>
                    {annee && (
                        <div className="text-muted small mt-2">
                            Rapport pour l&apos;année scolaire <strong>{annee}</strong>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default RapportMinistere;
