import React, { useEffect, useState, useRef } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const CATEGORIES = {
    tenue:     'Tenue scolaire',
    manuel:    'Manuels scolaires',
    apes:      'Cotisation APES',
    examen:    "Frais d'examen",
    transport: 'Transport scolaire',
    cantine:   'Cantine / Restauration',
    activite:  'Activité parascolaire',
    autre:     'Autre',
};

export default function ImpayesFraisAnnexes() {
    const { toast }                     = useToast();
    const [niveaux, setNiveaux]         = useState([]);
    const [fraisListe, setFraisListe]   = useState([]);
    const [niveauId, setNiveauId]       = useState('');
    const [fraisId, setFraisId]         = useState('');
    const [annee, setAnnee]             = useState('');
    const [annees, setAnnees]           = useState([]);
    const [data, setData]               = useState(null);
    const [chargement, setChargement]   = useState(false);
    const [recherche, setRecherche]     = useState('');
    const abortRef                      = useRef(null);

    useEffect(() => {
        Promise.all([
            api.get('/niveaux'),
            api.get('/frais-annexes'),
        ]).then(([rn, rf]) => {
            setNiveaux(rn.data);
            setFraisListe(rf.data);
            const ans = [...new Set(rf.data.map(f => f.annee))].sort().reverse();
            setAnnees(ans);
            if (ans[0]) {
                setAnnee(ans[0]);
                charger({ annee: ans[0] });
            }
        }).catch(() => toast.error('Erreur de chargement.'));
    }, []);

    const charger = ({ annee: a = annee, niveauId: n = niveauId, fraisId: f = fraisId } = {}) => {
        if (abortRef.current) abortRef.current.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        setChargement(true);
        const params = new URLSearchParams();
        if (a) params.append('annee', a);
        if (n) params.append('niveau_id', n);
        if (f) params.append('frais_annexe_id', f);

        api.get(`/frais-annexes/impayes?${params}`, { signal: ctrl.signal })
            .then(r => { setData(r.data); setChargement(false); })
            .catch(err => { if (err.name !== 'CanceledError') { toast.error('Impossible de charger.'); setChargement(false); } });
    };

    const changerAnnee = (v) => {
        setAnnee(v);
        setFraisId('');
        charger({ annee: v, fraisId: '' });
    };

    const changerNiveau = (v) => {
        setNiveauId(v);
        charger({ niveauId: v });
    };

    const changerFrais = (v) => {
        setFraisId(v);
        charger({ fraisId: v });
    };

    const lignes = (data?.data ?? []).filter(l => {
        if (!recherche) return true;
        const q = recherche.toLowerCase();
        return l.nom.toLowerCase().includes(q) || l.matricule?.toLowerCase().includes(q) || l.classe?.toLowerCase().includes(q);
    });

    const fraisFiltres = annee ? fraisListe.filter(f => f.annee === annee) : fraisListe;

    return (
        <div className="container-fluid py-4">
            <div className="mb-4">
                <h4 className="mb-0">Impayés — Frais annexes</h4>
                <small className="text-muted">Suivi des frais obligatoires non réglés</small>
            </div>

            {/* Filtres */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-2">
                    <div className="row g-2 align-items-end">
                        <div className="col-auto">
                            <label className="form-label small mb-1">Année</label>
                            <select className="form-select form-select-sm" value={annee} onChange={e => changerAnnee(e.target.value)}>
                                <option value="">Toutes</option>
                                {annees.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <div className="col-auto">
                            <label className="form-label small mb-1">Niveau</label>
                            <select className="form-select form-select-sm" value={niveauId} onChange={e => changerNiveau(e.target.value)}>
                                <option value="">Tous</option>
                                {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom_niveau}</option>)}
                            </select>
                        </div>
                        <div className="col-auto">
                            <label className="form-label small mb-1">Type de frais</label>
                            <select className="form-select form-select-sm" value={fraisId} onChange={e => changerFrais(e.target.value)}>
                                <option value="">Tous</option>
                                {fraisFiltres.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                            </select>
                        </div>
                        <div className="col">
                            <input className="form-control form-control-sm" placeholder="Rechercher un élève…"
                                value={recherche} onChange={e => setRecherche(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            {data && (
                <div className="row g-3 mb-4">
                    <div className="col-md-4">
                        <div className="card border-0 bg-danger bg-opacity-10 text-center py-3">
                            <div className="fs-4 fw-bold text-danger">{data.count}</div>
                            <small className="text-muted">Élèves en impayé</small>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card border-0 bg-warning bg-opacity-10 text-center py-3">
                            <div className="fs-5 fw-bold text-warning">
                                {Number(data.total_impayes).toLocaleString('fr-FR')} FCFA
                            </div>
                            <small className="text-muted">Total des soldes restants</small>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card border-0 bg-info bg-opacity-10 text-center py-3">
                            <div className="fs-4 fw-bold text-info">{lignes.length}</div>
                            <small className="text-muted">Lignes affichées</small>
                        </div>
                    </div>
                </div>
            )}

            {/* Tableau */}
            {chargement ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : !data ? null : lignes.length === 0 ? (
                <div className="alert alert-success text-center">
                    <i className="bi bi-check-circle me-2" />
                    Aucun impayé trouvé pour les critères sélectionnés.
                </div>
            ) : (
                <div className="card border-0 shadow-sm">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0 table-sm">
                            <thead className="table-light">
                                <tr>
                                    <th>Matricule</th>
                                    <th>Nom et Prénoms</th>
                                    <th>Classe</th>
                                    <th>Frais</th>
                                    <th>Catégorie</th>
                                    <th className="text-end">Montant dû</th>
                                    <th className="text-end">Payé</th>
                                    <th className="text-end">Solde</th>
                                    <th className="text-center">Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lignes.map((l, i) => (
                                    <tr key={i}>
                                        <td><code className="small">{l.matricule}</code></td>
                                        <td>{l.nom}</td>
                                        <td>{l.classe}</td>
                                        <td>
                                            <span className="small">{l.frais_nom}</span>
                                        </td>
                                        <td>
                                            <span className="badge bg-light text-dark border small">
                                                {CATEGORIES[l.categorie] ?? l.categorie}
                                            </span>
                                        </td>
                                        <td className="text-end small">{Number(l.montant_du).toLocaleString('fr-FR')}</td>
                                        <td className="text-end small text-success">{Number(l.total_paye).toLocaleString('fr-FR')}</td>
                                        <td className="text-end fw-semibold text-danger">{Number(l.solde).toLocaleString('fr-FR')}</td>
                                        <td className="text-center">
                                            {l.statut === 'partiel'
                                                ? <span className="badge bg-warning text-dark">Partiel</span>
                                                : <span className="badge bg-danger">Impayé</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="table-light fw-semibold">
                                <tr>
                                    <td colSpan={5}>Total</td>
                                    <td className="text-end">{lignes.reduce((s, l) => s + l.montant_du, 0).toLocaleString('fr-FR')}</td>
                                    <td className="text-end text-success">{lignes.reduce((s, l) => s + l.total_paye, 0).toLocaleString('fr-FR')}</td>
                                    <td className="text-end text-danger">{lignes.reduce((s, l) => s + l.solde, 0).toLocaleString('fr-FR')}</td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
