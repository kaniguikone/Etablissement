import { useEffect, useState } from 'react';
import axios from '../../api/axios';

const DECISIONS = [
    { value: 'promu',      label: 'Promu',       color: '#198754' },
    { value: 'redoublant', label: 'Redoublant',  color: '#fd7e14' },
    { value: 'diplome',    label: 'Diplômé',     color: '#0d6efd' },
    { value: 'sorti',      label: 'Sorti',       color: '#6c757d' },
];

const PassageTable = ({ anneeId, toast, onConfirmer, onRollback }) => {
    const [data, setData]         = useState(null);
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    // Décisions locales : { eleveId: { decision, classe_suivante_id, remarque } }
    const [decisions, setDecisions] = useState({});
    const [filtreClasse, setFiltreClasse] = useState('');
    const [filtreDecision, setFiltreDecision] = useState('');

    useEffect(() => {
        fetchPassage();
    }, [anneeId]);

    const fetchPassage = async () => {
        setLoading(true);
        try {
            const { data: d } = await axios.get(`/annees-scolaires/${anneeId}/passage`);
            setData(d);
            // Initialiser l'état local depuis les données existantes
            const init = {};
            Object.values(d.eleves_par_classe).flat().forEach(eleve => {
                init[eleve.eleve_id] = {
                    decision:          eleve.decision,
                    classe_suivante_id: eleve.classe_suivante_id ?? '',
                    remarque:          eleve.remarque ?? '',
                };
            });
            setDecisions(init);
        } catch {
            toast.error('Erreur lors du chargement du tableau de passage.');
        } finally {
            setLoading(false);
        }
    };

    const setDecision = (eleveId, key, value) => {
        setDecisions(prev => ({ ...prev, [eleveId]: { ...prev[eleveId], [key]: value } }));
    };

    const sauvegarder = async () => {
        setSaving(true);
        try {
            const passages = Object.entries(decisions).map(([eleveId, d]) => ({
                eleve_id:           parseInt(eleveId),
                decision:           d.decision,
                classe_suivante_id: d.classe_suivante_id || null,
                remarque:           d.remarque || null,
            }));
            await axios.put(`/annees-scolaires/${anneeId}/passage`, { passages });
            toast.success('Décisions enregistrées.');
        } catch (e) {
            toast.error(e.response?.data?.message ?? 'Erreur lors de la sauvegarde.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center py-4"><i className="fas fa-spinner fa-spin me-2" />Chargement...</div>;
    if (!data)   return null;

    // Aplatir tous les élèves pour les filtres
    const tousEleves = Object.values(data.eleves_par_classe).flat();

    // Filtres
    const classeIds  = [...new Set(tousEleves.map(e => e.classe_actuelle_id))];
    const elevesAffiches = tousEleves.filter(e => {
        const decLocale = decisions[e.eleve_id]?.decision ?? e.decision;
        if (filtreClasse && e.classe_actuelle_id !== parseInt(filtreClasse)) return false;
        if (filtreDecision && decLocale !== filtreDecision) return false;
        return true;
    });

    // Stats locales
    const stats = DECISIONS.map(d => ({
        ...d,
        count: tousEleves.filter(e => (decisions[e.eleve_id]?.decision ?? e.decision) === d.value).length,
    }));

    return (
        <div>
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="mb-0">Passage de classe — {data.annee.libelle}</h5>
                <div className="d-flex gap-2">
                    <button className="btn btn-outline-danger btn-sm" onClick={onRollback}>
                        <i className="fas fa-undo me-1" />Annuler clôture
                    </button>
                    <button className="btn btn-outline-primary btn-sm" onClick={sauvegarder} disabled={saving}>
                        <i className="fas fa-save me-1" />{saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => { sauvegarder(); onConfirmer(); }}>
                        Confirmation <i className="fas fa-arrow-right ms-1" />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="d-flex gap-3 mb-3 flex-wrap">
                {stats.map(s => (
                    <div key={s.value} className="d-flex align-items-center gap-2 px-3 py-1 rounded"
                        style={{ background: s.color + '15', cursor: 'pointer', border: `1px solid ${s.color}30` }}
                        onClick={() => setFiltreDecision(filtreDecision === s.value ? '' : s.value)}>
                        <span style={{ color: s.color, fontWeight: 700, fontSize: 18 }}>{s.count}</span>
                        <span style={{ fontSize: 12, color: s.color }}>{s.label}</span>
                    </div>
                ))}
                <div className="d-flex align-items-center gap-2 px-3 py-1 rounded" style={{ background: '#f8f9fa' }}>
                    <span style={{ fontWeight: 700, fontSize: 18 }}>{tousEleves.length}</span>
                    <span style={{ fontSize: 12, color: '#666' }}>Total</span>
                </div>
            </div>

            {/* Filtres */}
            <div className="d-flex gap-2 mb-3">
                <select className="form-select form-select-sm" style={{ maxWidth: 220 }}
                    value={filtreClasse} onChange={e => setFiltreClasse(e.target.value)}>
                    <option value="">Toutes les classes</option>
                    {classeIds.map(cid => {
                        const ex = tousEleves.find(e => e.classe_actuelle_id === cid);
                        return <option key={cid} value={cid}>{ex?.classe_actuelle ?? cid}</option>;
                    })}
                </select>
                <select className="form-select form-select-sm" style={{ maxWidth: 160 }}
                    value={filtreDecision} onChange={e => setFiltreDecision(e.target.value)}>
                    <option value="">Toutes décisions</option>
                    {DECISIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                {(filtreClasse || filtreDecision) && (
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => { setFiltreClasse(''); setFiltreDecision(''); }}>
                        <i className="fas fa-times me-1" />Effacer
                    </button>
                )}
            </div>

            {/* Tableau */}
            <div className="table-responsive">
                <table className="table table-hover table-sm align-middle">
                    <thead className="table-light">
                        <tr>
                            <th>Matricule</th>
                            <th>Élève</th>
                            <th>Classe actuelle</th>
                            <th style={{ width: 150 }}>Décision</th>
                            <th style={{ width: 220 }}>Classe suivante</th>
                            <th>Remarque</th>
                        </tr>
                    </thead>
                    <tbody>
                        {elevesAffiches.length === 0 && (
                            <tr><td colSpan={6} className="text-center text-muted py-3">Aucun élève</td></tr>
                        )}
                        {elevesAffiches.map(eleve => {
                            const dec  = decisions[eleve.eleve_id] ?? {};
                            const decVal = dec.decision ?? eleve.decision;
                            const decConfig = DECISIONS.find(d => d.value === decVal);
                            const noClasse = ['diplome', 'sorti'].includes(decVal);

                            return (
                                <tr key={eleve.eleve_id}
                                    style={{ background: decConfig ? decConfig.color + '08' : 'transparent' }}>
                                    <td style={{ fontSize: 12, color: '#666' }}>{eleve.matricule}</td>
                                    <td><strong>{eleve.nom} {eleve.prenoms}</strong></td>
                                    <td>
                                        <span className="badge" style={{ background: '#e9ecef', color: '#333', fontWeight: 500 }}>
                                            {eleve.classe_actuelle}
                                        </span>
                                    </td>
                                    <td>
                                        <select
                                            className="form-select form-select-sm"
                                            value={decVal}
                                            onChange={e => setDecision(eleve.eleve_id, 'decision', e.target.value)}
                                            style={{ borderColor: decConfig?.color, fontSize: 12 }}
                                        >
                                            {DECISIONS.map(d => (
                                                <option key={d.value} value={d.value}>{d.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        {noClasse ? (
                                            <span className="text-muted" style={{ fontSize: 12 }}>—</span>
                                        ) : (
                                            <select
                                                className="form-select form-select-sm"
                                                value={dec.classe_suivante_id ?? eleve.classe_suivante_id ?? ''}
                                                onChange={e => setDecision(eleve.eleve_id, 'classe_suivante_id', e.target.value)}
                                                style={{ fontSize: 12 }}
                                            >
                                                <option value="">— Choisir —</option>
                                                {data.classes.map(c => (
                                                    <option key={c.id} value={c.id}>{c.libelle}</option>
                                                ))}
                                            </select>
                                        )}
                                    </td>
                                    <td>
                                        <input
                                            className="form-control form-control-sm"
                                            style={{ fontSize: 12 }}
                                            placeholder="Remarque optionnelle"
                                            value={dec.remarque ?? eleve.remarque ?? ''}
                                            onChange={e => setDecision(eleve.eleve_id, 'remarque', e.target.value)}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PassageTable;
