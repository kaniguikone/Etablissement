import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const VolumeHoraire = () => {
    const { toast }     = useToast();
    const { confirmer } = useConfirm();

    const [niveaux,  setNiveaux]  = useState([]);
    const [matieres, setMatieres] = useState([]);
    const [niveauId, setNiveauId] = useState('');
    const [volumes,  setVolumes]  = useState([]);
    const [chargement, setChargement] = useState(false);

    const [form, setForm]         = useState({ matiere_id: '', heures_semaine: '', semaines_annee: 36 });
    const [editId, setEditId]     = useState(null);
    const [saving, setSaving]     = useState(false);

    useEffect(() => {
        api.get('/niveaux').then((r) => setNiveaux(r.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get('/matieres').then((r) => setMatieres(r.data)).catch((err) => console.error('Erreur chargement:', err));
    }, []);

    useEffect(() => {
        if (!niveauId) { setVolumes([]); return; }
        setChargement(true);
        api.get(`/volumesHoraires/${niveauId}`)
            .then((r) => { setVolumes(r.data.volumes); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger les volumes.'); setChargement(false); });
    }, [niveauId]);

    // Matières non encore définies pour ce niveau
    const matieresRestantes = matieres.filter(
        (m) => !volumes.some((v) => v.matiere_id === m.id)
    );

    const sauvegarder = () => {
        if (!form.matiere_id || !form.heures_semaine) return;
        setSaving(true);
        const payload = { ...form, niveau_id: niveauId };
        const req = editId
            ? api.put(`/volumesHoraires/${editId}`, payload)
            : api.post('/volumesHoraires', payload);

        req.then((r) => {
                if (editId) {
                    setVolumes((prev) => prev.map((v) => v.id === editId ? r.data : v));
                } else {
                    setVolumes((prev) => [...prev, r.data]);
                }
                toast.success(editId ? 'Volume modifié.' : 'Volume ajouté.');
                setForm({ matiere_id: '', heures_semaine: '', semaines_annee: 36 });
                setEditId(null);
            })
            .catch(() => toast.error('Erreur lors de l\'enregistrement.'))
            .finally(() => setSaving(false));
    };

    const commencerEdition = (v) => {
        setEditId(v.id);
        setForm({ matiere_id: v.matiere_id, heures_semaine: v.heures_semaine, semaines_annee: v.semaines_annee });
    };

    const supprimer = async (v) => {
        if (!await confirmer(`Supprimer le volume pour ${v.matiere?.libelle_matiere} ?`)) return;
        api.delete(`/volumesHoraires/${v.id}`)
            .then(() => { setVolumes((prev) => prev.filter((x) => x.id !== v.id)); toast.success('Supprimé.'); })
            .catch(() => toast.error('Erreur lors de la suppression.'));
    };

    const niveauSelectionne = niveaux.find((n) => String(n.id) === String(niveauId));
    const totalHeures = volumes.reduce((s, v) => s + parseFloat(v.heures_semaine), 0);

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Volumes horaires par niveau</h4>
                </div>

                {/* Sélecteur niveau */}
                <div className="mb-3">
                    <label className="form-label">Niveau</label>
                    <select
                        className="form-select form-select-sm"
                        style={{ maxWidth: 260 }}
                        value={niveauId}
                        onChange={(e) => { setNiveauId(e.target.value); setEditId(null); setForm({ matiere_id: '', heures_semaine: '', semaines_annee: 36 }); }}
                    >
                        <option value="">Sélectionner un niveau</option>
                        {niveaux.map((n) => <option key={n.id} value={n.id}>{n.nom_niveau}</option>)}
                    </select>
                </div>

                {chargement && <div className="text-center py-3"><div className="spinner-border spinner-border-sm" /></div>}

                {!chargement && niveauId && (
                    <>
                        <div className="d-flex align-items-center gap-3 mb-2">
                            <h6 className="text-muted mb-0">
                                {niveauSelectionne?.nom_niveau} — {volumes.length} matière{volumes.length !== 1 ? 's' : ''} définies
                            </h6>
                            <span className="badge bg-primary">{totalHeures.toFixed(1)} h/semaine au total</span>
                        </div>

                        {/* Tableau */}
                        {volumes.length > 0 && (
                            <table className="table table-sm table-bordered mb-3" style={{ fontSize: '0.88rem' }}>
                                <thead className="table-light">
                                    <tr>
                                        <th>Matière</th>
                                        <th style={{ width: 120 }} className="text-center">H/semaine</th>
                                        <th style={{ width: 100 }} className="text-center">Semaines</th>
                                        <th style={{ width: 120 }} className="text-center">H/an</th>
                                        <th style={{ width: 90 }} className="text-center"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {volumes.map((v) => (
                                        <tr key={v.id} className={editId === v.id ? 'table-warning' : ''}>
                                            <td className="fw-bold">{v.matiere?.libelle_matiere}</td>
                                            <td className="text-center">{v.heures_semaine}h</td>
                                            <td className="text-center text-muted">{v.semaines_annee}</td>
                                            <td className="text-center">
                                                <span className="badge bg-secondary">{v.heures_annuelles}h</span>
                                            </td>
                                            <td className="text-center">
                                                <button className="btn btn-warning btn-sm py-0 me-1" onClick={() => commencerEdition(v)}>✏</button>
                                                <button className="btn btn-danger btn-sm py-0" onClick={() => supprimer(v)}>✕</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* Formulaire ajout/édition */}
                        <div className="border rounded p-3 bg-light mb-3">
                            <h6 className="mb-3">{editId ? 'Modifier le volume' : 'Ajouter une matière'}</h6>
                            <div className="row g-2 align-items-end">
                                <div className="col-md-4">
                                    <label className="form-label small">Matière *</label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={form.matiere_id}
                                        onChange={(e) => setForm((p) => ({ ...p, matiere_id: e.target.value }))}
                                        disabled={!!editId}
                                    >
                                        <option value="">Sélectionner</option>
                                        {editId
                                            ? matieres.filter((m) => m.id === form.matiere_id || String(m.id) === String(form.matiere_id))
                                                .map((m) => <option key={m.id} value={m.id}>{m.libelle_matiere}</option>)
                                            : matieresRestantes.map((m) => <option key={m.id} value={m.id}>{m.libelle_matiere}</option>)
                                        }
                                    </select>
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label small">H/semaine *</label>
                                    <input
                                        type="number" min="0.5" max="40" step="0.5"
                                        className="form-control form-control-sm"
                                        value={form.heures_semaine}
                                        onChange={(e) => setForm((p) => ({ ...p, heures_semaine: e.target.value }))}
                                    />
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label small">Semaines/an</label>
                                    <input
                                        type="number" min="1" max="52"
                                        className="form-control form-control-sm"
                                        value={form.semaines_annee}
                                        onChange={(e) => setForm((p) => ({ ...p, semaines_annee: e.target.value }))}
                                    />
                                </div>
                                {form.heures_semaine && form.semaines_annee && (
                                    <div className="col-md-2 d-flex align-items-end">
                                        <span className="text-muted small">
                                            = <strong>{(parseFloat(form.heures_semaine || 0) * parseInt(form.semaines_annee || 0)).toFixed(0)}h/an</strong>
                                        </span>
                                    </div>
                                )}
                                <div className="col-md-2 d-flex align-items-end gap-1">
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={sauvegarder}
                                        disabled={!form.matiere_id || !form.heures_semaine || saving}
                                    >
                                        {saving ? <span className="spinner-border spinner-border-sm" /> : editId ? '✓ Modifier' : '+ Ajouter'}
                                    </button>
                                    {editId && (
                                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditId(null); setForm({ matiere_id: '', heures_semaine: '', semaines_annee: 36 }); }}>✕</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
};

export default VolumeHoraire;
