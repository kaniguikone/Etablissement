import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const formInitial = {
    matiere_id: '', enseignant_id: '', libelle: '', parallele_code: 'LV2',
    effectif: '', nb_seances: '', duree_minutes: 55, semaine: 'toutes',
};

/**
 * Groupes pédagogiques : LV2, dédoublements (chantier EDT — Lot 4).
 * Les groupes d'un même code parallèle sont enseignés en même temps.
 */
const GroupesPedagogiques = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();

    const [niveaux, setNiveaux] = useState([]);
    const [niveauId, setNiveauId] = useState('');
    const [classes, setClasses] = useState([]);
    const [classeId, setClasseId] = useState('');
    const [matieres, setMatieres] = useState([]);
    const [enseignants, setEnseignants] = useState([]);
    const [groupes, setGroupes] = useState([]);
    const [form, setForm] = useState(formInitial);
    const [editId, setEditId] = useState(null);

    useEffect(() => {
        api.get('/niveaux').then((r) => setNiveaux(r.data)).catch(() => {});
        api.get('/matieres').then((r) => setMatieres(r.data)).catch(() => {});
        api.get('/enseignantsTout').then((r) => setEnseignants(r.data)).catch(() => {});
    }, []);

    useEffect(() => {
        setClasses([]); setClasseId('');
        if (!niveauId) return;
        api.get(`/classesNiveaux/${niveauId}`).then((r) => setClasses(r.data)).catch(() => {});
    }, [niveauId]);

    const charger = () => {
        if (!classeId) { setGroupes([]); return; }
        api.get(`/groupes-pedagogiques?classe_id=${classeId}`).then((r) => setGroupes(r.data)).catch(() => {});
    };
    useEffect(charger, [classeId]);

    const soumettre = (e) => {
        e.preventDefault();
        const payload = {
            ...form, classe_id: classeId,
            matiere_id: Number(form.matiere_id),
            enseignant_id: form.enseignant_id ? Number(form.enseignant_id) : null,
            effectif: form.effectif ? Number(form.effectif) : null,
            nb_seances: form.nb_seances ? Number(form.nb_seances) : 0,
            duree_minutes: Number(form.duree_minutes) || 55,
        };
        const req = editId
            ? api.put(`/groupes-pedagogiques/${editId}`, payload)
            : api.post('/groupes-pedagogiques', payload);
        req.then(() => { toast.success(editId ? 'Groupe modifié.' : 'Groupe ajouté.'); setForm(formInitial); setEditId(null); charger(); })
            .catch(() => toast.error("Erreur lors de l'enregistrement."));
    };

    const editer = (g) => {
        setEditId(g.id);
        setForm({
            matiere_id: g.matiere_id, enseignant_id: g.enseignant_id || '', libelle: g.libelle,
            parallele_code: g.parallele_code, effectif: g.effectif || '', nb_seances: g.nb_seances || '',
            duree_minutes: g.duree_minutes || 55, semaine: g.semaine || 'toutes',
        });
    };

    const supprimer = async (g) => {
        if (!await confirmer(`Supprimer le groupe « ${g.libelle} » ?`)) return;
        api.delete(`/groupes-pedagogiques/${g.id}`).then(() => { toast.success('Supprimé.'); charger(); }).catch(() => toast.error('Suppression impossible.'));
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Groupes pédagogiques (LV2, dédoublements)</h4>
                </div>
                <p className="text-muted small">
                    Quand une classe se scinde pour une matière (LV2 Allemand / Espagnol, dédoublement de langue ou de sciences),
                    déclarez ici les groupes. Ceux qui partagent le même <strong>code parallèle</strong> sont placés sur le même créneau
                    par le générateur, dans des salles et avec des enseignants différents.
                </p>

                <div className="d-flex gap-3 mb-3 flex-wrap">
                    <div>
                        <label className="form-label mb-1 small">Niveau</label>
                        <select className="form-select form-select-sm" style={{ width: 150 }} value={niveauId} onChange={(e) => setNiveauId(e.target.value)}>
                            <option value="">—</option>
                            {niveaux.map((n) => <option key={n.id} value={n.id}>{n.nom_niveau}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label mb-1 small">Classe</label>
                        <select className="form-select form-select-sm" style={{ width: 180 }} value={classeId} onChange={(e) => setClasseId(e.target.value)} disabled={!niveauId}>
                            <option value="">—</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                        </select>
                    </div>
                </div>

                {classeId && (
                    <>
                        <table className="table table-sm table-bordered" style={{ fontSize: '0.88rem' }}>
                            <thead className="table-light">
                                <tr>
                                    <th>Code parallèle</th><th>Groupe</th><th>Matière</th><th>Enseignant</th>
                                    <th style={{ width: 70 }}>Effectif</th><th style={{ width: 70 }}>Séances</th><th style={{ width: 90 }}>Semaine</th><th style={{ width: 90 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupes.length === 0 && <tr><td colSpan={8} className="text-muted text-center py-2">Aucun groupe.</td></tr>}
                                {groupes.map((g) => (
                                    <tr key={g.id} className={editId === g.id ? 'table-warning' : ''}>
                                        <td><span className="badge bg-secondary">{g.parallele_code}</span></td>
                                        <td>{g.libelle}</td>
                                        <td>{g.matiere?.libelle_matiere}</td>
                                        <td>{g.enseignant ? `${g.enseignant.nom_enseignant} ${g.enseignant.prenoms_enseignant}` : <span className="text-danger">—</span>}</td>
                                        <td className="text-center">{g.effectif || '—'}</td>
                                        <td className="text-center">{g.nb_seances || 'auto'}</td>
                                        <td className="text-center">{g.semaine === 'toutes' ? '—' : g.semaine}</td>
                                        <td className="text-center">
                                            <button className="btn btn-warning btn-sm py-0 me-1" onClick={() => editer(g)}>✏</button>
                                            <button className="btn btn-danger btn-sm py-0" onClick={() => supprimer(g)}>✕</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <form onSubmit={soumettre} className="border rounded p-3 bg-light row g-2 align-items-end">
                            <div className="col-md-2">
                                <label className="form-label small">Code parallèle *</label>
                                <input className="form-control form-control-sm" value={form.parallele_code}
                                    onChange={(e) => setForm((f) => ({ ...f, parallele_code: e.target.value }))} required placeholder="LV2" />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small">Libellé *</label>
                                <input className="form-control form-control-sm" value={form.libelle}
                                    onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} required placeholder="Allemand" />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small">Matière *</label>
                                <select className="form-select form-select-sm" value={form.matiere_id} required
                                    onChange={(e) => setForm((f) => ({ ...f, matiere_id: e.target.value }))}>
                                    <option value="">—</option>
                                    {matieres.map((m) => <option key={m.id} value={m.id}>{m.libelle_matiere}</option>)}
                                </select>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small">Enseignant</label>
                                <select className="form-select form-select-sm" value={form.enseignant_id}
                                    onChange={(e) => setForm((f) => ({ ...f, enseignant_id: e.target.value }))}>
                                    <option value="">—</option>
                                    {enseignants.map((en) => <option key={en.id} value={en.id}>{en.nom_enseignant} {en.prenoms_enseignant}</option>)}
                                </select>
                            </div>
                            <div className="col-md-1">
                                <label className="form-label small">Effectif</label>
                                <input type="number" min="1" className="form-control form-control-sm" value={form.effectif}
                                    onChange={(e) => setForm((f) => ({ ...f, effectif: e.target.value }))} />
                            </div>
                            <div className="col-md-1">
                                <label className="form-label small">Séances/sem.</label>
                                <input type="number" min="0" className="form-control form-control-sm" value={form.nb_seances}
                                    onChange={(e) => setForm((f) => ({ ...f, nb_seances: e.target.value }))} placeholder="auto" />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small">Fréquence</label>
                                <select className="form-select form-select-sm" value={form.semaine}
                                    onChange={(e) => setForm((f) => ({ ...f, semaine: e.target.value }))}>
                                    <option value="toutes">Chaque semaine</option>
                                    <option value="A">Semaine A</option>
                                    <option value="B">Semaine B</option>
                                </select>
                            </div>
                            <div className="col-md-2 d-flex gap-1">
                                <button type="submit" className="btn btn-primary btn-sm">{editId ? 'Modifier' : 'Ajouter'}</button>
                                {editId && <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setEditId(null); setForm(formInitial); }}>Annuler</button>}
                            </div>
                        </form>
                    </>
                )}
            </div>
        </section>
    );
};

export default GroupesPedagogiques;
