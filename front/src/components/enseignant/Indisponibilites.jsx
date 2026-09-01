import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const formInitial = { jour: '', heure_debut: '', heure_fin: '', type: 'bloquant', motif: '' };

/**
 * Indisponibilités des enseignants (chantier EDT — Lot 0.5).
 */
const Indisponibilites = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();

    const [enseignants, setEnseignants] = useState([]);
    const [enseignantId, setEnseignantId] = useState('');
    const [items, setItems] = useState([]);
    const [form, setForm] = useState(formInitial);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get('/enseignantsTout')
            .then((r) => setEnseignants(r.data))
            .catch(() => toast.error('Impossible de charger les enseignants.'));
    }, []);

    useEffect(() => {
        if (!enseignantId) { setItems([]); return; }
        api.get(`/enseignants/${enseignantId}/indisponibilites`)
            .then((r) => setItems(r.data))
            .catch(() => toast.error('Impossible de charger les indisponibilités.'));
    }, [enseignantId]);

    const ajouter = (e) => {
        e.preventDefault();
        setSaving(true);
        api.post(`/enseignants/${enseignantId}/indisponibilites`, form)
            .then((r) => { setItems((l) => [...l, r.data]); setForm(formInitial); toast.success('Indisponibilité ajoutée.'); })
            .catch((err) => toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement."))
            .finally(() => setSaving(false));
    };

    const supprimer = async (it) => {
        if (!await confirmer('Supprimer cette indisponibilité ?')) return;
        api.delete(`/indisponibilites/${it.id}`)
            .then(() => { setItems((l) => l.filter((x) => x.id !== it.id)); toast.success('Supprimée.'); })
            .catch(() => toast.error('Suppression impossible.'));
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Indisponibilités des enseignants</h4>
                </div>
                <p className="text-muted small">
                    Créneaux où l&apos;enseignant ne peut pas assurer de cours (vacataire, temps partiel, décharge).
                    Pris en compte lors de la génération automatique des emplois du temps.
                </p>

                <div className="mb-3" style={{ maxWidth: 360 }}>
                    <label className="form-label">Enseignant</label>
                    <select className="form-select form-select-sm" value={enseignantId} onChange={(e) => setEnseignantId(e.target.value)}>
                        <option value="">Sélectionner un enseignant</option>
                        {enseignants.map((e) => (
                            <option key={e.id} value={e.id}>{e.nom_enseignant} {e.prenoms_enseignant}</option>
                        ))}
                    </select>
                </div>

                {enseignantId && (
                    <>
                        <table className="table table-sm table-bordered" style={{ fontSize: '0.88rem' }}>
                            <thead className="table-light">
                                <tr><th>Jour</th><th>Créneau</th><th>Type</th><th>Motif</th><th style={{ width: 60 }}></th></tr>
                            </thead>
                            <tbody>
                                {items.length === 0 && <tr><td colSpan={5} className="text-muted text-center py-2">Aucune indisponibilité.</td></tr>}
                                {items.map((it) => (
                                    <tr key={it.id}>
                                        <td className="text-capitalize">{it.jour}</td>
                                        <td>
                                            {it.plage_horaire
                                                ? `${it.plage_horaire.libelle} (${it.plage_horaire.heure_debut?.slice(0, 5)}–${it.plage_horaire.heure_fin?.slice(0, 5)})`
                                                : `${it.heure_debut?.slice(0, 5)}–${it.heure_fin?.slice(0, 5)}`}
                                        </td>
                                        <td>
                                            <span className={`badge ${it.type === 'bloquant' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                                                {it.type === 'bloquant' ? 'Bloquant' : 'Préférence'}
                                            </span>
                                        </td>
                                        <td>{it.motif || '—'}</td>
                                        <td><button className="btn btn-sm text-danger p-0" onClick={() => supprimer(it)}>✕</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <form onSubmit={ajouter} className="border rounded p-3 bg-light row g-2 align-items-end">
                            <div className="col-md-2">
                                <label className="form-label small">Jour *</label>
                                <select className="form-select form-select-sm" value={form.jour} required
                                    onChange={(e) => setForm((f) => ({ ...f, jour: e.target.value }))}>
                                    <option value="">—</option>
                                    {JOURS.map((j) => <option key={j} value={j} className="text-capitalize">{j}</option>)}
                                </select>
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small">Début *</label>
                                <input type="time" className="form-control form-control-sm" value={form.heure_debut} required
                                    onChange={(e) => setForm((f) => ({ ...f, heure_debut: e.target.value }))} />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small">Fin *</label>
                                <input type="time" className="form-control form-control-sm" value={form.heure_fin} required
                                    onChange={(e) => setForm((f) => ({ ...f, heure_fin: e.target.value }))} />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small">Type</label>
                                <select className="form-select form-select-sm" value={form.type}
                                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                                    <option value="bloquant">Bloquant</option>
                                    <option value="preference">Préférence</option>
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small">Motif</label>
                                <input className="form-control form-control-sm" value={form.motif}
                                    onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))} />
                            </div>
                            <div className="col-md-1">
                                <button type="submit" className="btn btn-primary btn-sm w-100" disabled={saving}>+</button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </section>
    );
};

export default Indisponibilites;
