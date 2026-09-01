/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const DUREES = [
    { v: 55, l: '1 plage (~55 min)' },
    { v: 110, l: '2 plages consécutives (~1h50)' },
    { v: 90, l: '1 h 30' },
];
const seanceInit = { duree_minutes: 55, nb_seances: 1, frequence: 'hebdomadaire', tandem_code: '' };

const badgeEcart = (ecart) => {
    if (Math.abs(ecart) < 0.3) return 'bg-success';
    return ecart < 0 ? 'bg-primary' : 'bg-danger';
};

/**
 * Découpage du volume horaire en séances concrètes, par niveau (et série).
 * Chantier EDT — Lot 0.4. Rendu sous le tableau des volumes horaires.
 */
const SeancesTypes = ({ niveauId, series = [] }) => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();

    const [serieId, setSerieId] = useState('');
    const [data, setData] = useState(null);
    const [chargement, setChargement] = useState(false);
    const [ajouts, setAjouts] = useState({}); // niveau_matiere_id -> form

    const charger = () => {
        if (!niveauId) { setData(null); return; }
        setChargement(true);
        api.get(`/seances-types/${niveauId}`, { params: serieId ? { serie_id: serieId } : {} })
            .then((r) => setData(r.data))
            .catch(() => toast.error('Impossible de charger le découpage en séances.'))
            .finally(() => setChargement(false));
    };

    useEffect(charger, [niveauId, serieId]);

    const ajouterSeance = (nmId) => {
        const form = ajouts[nmId] || seanceInit;
        api.post('/seances-types', { niveau_matiere_id: nmId, ...form })
            .then(() => { toast.success('Séance ajoutée.'); setAjouts((a) => ({ ...a, [nmId]: seanceInit })); charger(); })
            .catch((err) => toast.error(err.response?.data?.message || "Erreur lors de l'ajout."));
    };

    const supprimerSeance = async (id) => {
        if (!await confirmer('Supprimer cette séance ?')) return;
        api.delete(`/seances-types/${id}`)
            .then(() => { toast.success('Séance supprimée.'); charger(); })
            .catch(() => toast.error('Suppression impossible.'));
    };

    const genererTout = () => {
        api.post(`/seances-types/generer/${niveauId}`, {}, { params: serieId ? { serie_id: serieId } : {} })
            .then((r) => { toast.success(r.data.message); charger(); })
            .catch(() => toast.error('Génération impossible.'));
    };

    if (!niveauId) return null;

    return (
        <div className="mt-4">
            <div className="d-flex align-items-center gap-3 mb-2 flex-wrap">
                <h6 className="mb-0">Découpage en séances</h6>
                {series.length > 0 && (
                    <select className="form-select form-select-sm" style={{ width: 200 }}
                        value={serieId} onChange={(e) => setSerieId(e.target.value)}>
                        <option value="">Tronc commun (sans série)</option>
                        {series.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                    </select>
                )}
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={genererTout}>
                    Pré-remplir depuis les volumes
                </button>
            </div>

            {chargement && <div className="text-center py-3"><div className="spinner-border spinner-border-sm" /></div>}

            {!chargement && data && data.matieres.length === 0 && (
                <p className="text-muted small">Aucune matière au programme pour ce niveau/série.</p>
            )}

            {!chargement && data && data.matieres.map((m) => {
                const form = ajouts[m.niveau_matiere_id] || seanceInit;
                return (
                    <div key={m.niveau_matiere_id} className="border rounded p-2 mb-2">
                        <div className="d-flex justify-content-between align-items-center">
                            <strong>{m.matiere}</strong>
                            <span className={`badge ${badgeEcart(m.ecart)}`}>
                                {m.heures_seances} h placées / {m.heures_prevues} h prévues
                            </span>
                        </div>
                        <div className="d-flex flex-wrap gap-2 my-2">
                            {m.seances.map((s) => (
                                <span key={s.id} className="badge bg-light text-dark border">
                                    {s.nb_seances} × {s.duree_minutes} min
                                    {s.frequence === 'quinzaine' && ' (quinzaine)'}
                                    {s.tandem_code && ` · ${s.tandem_code}`}
                                    <button type="button" className="btn btn-sm text-danger p-0 ms-1"
                                        onClick={() => supprimerSeance(s.id)}>✕</button>
                                </span>
                            ))}
                            {m.seances.length === 0 && <span className="text-muted small">Aucune séance définie</span>}
                        </div>
                        <div className="row g-1 align-items-end">
                            <div className="col-auto">
                                <select className="form-select form-select-sm"
                                    value={form.duree_minutes}
                                    onChange={(e) => setAjouts((a) => ({ ...a, [m.niveau_matiere_id]: { ...form, duree_minutes: Number(e.target.value) } }))}>
                                    {DUREES.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
                                </select>
                            </div>
                            <div className="col-auto">
                                <input type="number" min="1" max="12" className="form-control form-control-sm" style={{ width: 70 }}
                                    value={form.nb_seances}
                                    onChange={(e) => setAjouts((a) => ({ ...a, [m.niveau_matiere_id]: { ...form, nb_seances: Number(e.target.value) } }))} />
                            </div>
                            <div className="col-auto">
                                <select className="form-select form-select-sm"
                                    value={form.frequence}
                                    onChange={(e) => setAjouts((a) => ({ ...a, [m.niveau_matiere_id]: { ...form, frequence: e.target.value } }))}>
                                    <option value="hebdomadaire">Chaque semaine</option>
                                    <option value="quinzaine">Une semaine sur deux</option>
                                </select>
                            </div>
                            <div className="col-auto">
                                <input className="form-control form-control-sm" style={{ width: 110 }} placeholder="Tandem"
                                    value={form.tandem_code}
                                    onChange={(e) => setAjouts((a) => ({ ...a, [m.niveau_matiere_id]: { ...form, tandem_code: e.target.value } }))} />
                            </div>
                            <div className="col-auto">
                                <button type="button" className="btn btn-primary btn-sm"
                                    onClick={() => ajouterSeance(m.niveau_matiere_id)}>+ Séance</button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default SeancesTypes;
