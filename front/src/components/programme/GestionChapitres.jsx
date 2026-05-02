import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const GestionChapitres = () => {
    const { toast }     = useToast();
    const { confirmer } = useConfirm();

    const [niveaux, setNiveaux]           = useState([]);
    const [matieres, setMatieres]         = useState([]);
    const [seriesDuNiveau, setSeriesDuNiveau] = useState([]);
    const [niveauId, setNiveauId]         = useState('');
    const [serieId, setSerieId]           = useState('');
    const [matiereId, setMatiereId]       = useState('');
    const [chapitres, setChapitres]       = useState([]);
    const [chargement, setChargement]     = useState(false);

    const vide = { titre: '', ordre: '', note_direction: '' };
    const [form, setForm]                         = useState(vide);
    const [editId, setEditId]                     = useState(null);
    const [enregistrement, setEnregistrement]     = useState(false);

    useEffect(() => {
        api.get('/niveaux').then((r) => setNiveaux(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
        api.get('/matieres').then((r) => setMatieres(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
    }, []);

    // Charger les classes du niveau pour extraire les séries disponibles
    useEffect(() => {
        if (!niveauId) { setSeriesDuNiveau([]); setSerieId(''); return; }
        api.get(`/classesNiveaux/${niveauId}`)
            .then((r) => {
                const classes = r.data ?? [];
                const seriesMap = new Map();
                classes.forEach((c) => {
                    if (c.serie_id && c.serie) seriesMap.set(c.serie_id, c.serie);
                });
                const series = [...seriesMap.values()];
                setSeriesDuNiveau(series);
                setSerieId(series.length > 0 ? String(series[0].id) : '');
            })
            .catch(() => { setSeriesDuNiveau([]); setSerieId(''); });
        setMatiereId('');
        annuler();
    }, [niveauId]);

    useEffect(() => {
        if (!matiereId || !niveauId) { setChapitres([]); return; }
        setChargement(true);
        const params = { niveau_id: niveauId };
        if (serieId) params.serie_id = serieId;
        api.get(`/chapitresMatiere/${matiereId}`, { params })
            .then((r) => { setChapitres(r.data.chapitres); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger les chapitres.'); setChargement(false); });
    }, [matiereId, niveauId, serieId]);

    const commencerEdition = (ch) => {
        setEditId(ch.id);
        setForm({ titre: ch.titre, ordre: ch.ordre, note_direction: ch.note_direction || '' });
    };

    const annuler = () => { setEditId(null); setForm(vide); };

    const sauvegarder = () => {
        if (!form.titre.trim() || !form.ordre) return;
        setEnregistrement(true);

        const payload = {
            ...form,
            matiere_id: matiereId,
            niveau_id:  niveauId,
            serie_id:   serieId || null,
        };
        const req = editId
            ? api.put(`/chapitresMatiere/${editId}`, payload)
            : api.post('/chapitresMatiere', payload);

        req.then((r) => {
                if (editId) {
                    setChapitres((prev) => prev.map((c) => c.id === editId ? r.data : c)
                        .sort((a, b) => a.ordre - b.ordre));
                } else {
                    setChapitres((prev) => [...prev, r.data].sort((a, b) => a.ordre - b.ordre));
                }
                toast.success(editId ? 'Chapitre modifié.' : 'Chapitre ajouté.');
                annuler();
            })
            .catch(() => toast.error('Erreur lors de l\'enregistrement.'))
            .finally(() => setEnregistrement(false));
    };

    const supprimer = async (ch) => {
        if (!await confirmer(`Supprimer le chapitre "${ch.titre}" ?`)) return;
        api.delete(`/chapitresMatiere/${ch.id}`)
            .then(() => {
                setChapitres((prev) => prev.filter((c) => c.id !== ch.id));
                toast.success('Chapitre supprimé.');
            })
            .catch(() => toast.error('Erreur lors de la suppression.'));
    };

    const niveauSelectionne   = niveaux.find((n) => String(n.id) === String(niveauId));
    const matiereSelectionnee = matieres.find((m) => String(m.id) === String(matiereId));
    const serieSelectionnee   = seriesDuNiveau.find((s) => String(s.id) === String(serieId));

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Programme par niveau et matière</h4>
                </div>

                {/* Sélecteurs niveau + série + matière */}
                <div className="row g-2 mb-3">
                    <div className="col-auto">
                        <label className="form-label">Niveau</label>
                        <select
                            className="form-select form-select-sm"
                            style={{ minWidth: 160 }}
                            value={niveauId}
                            onChange={(e) => setNiveauId(e.target.value)}
                        >
                            <option value="">Sélectionner un niveau</option>
                            {niveaux.map((n) => (
                                <option key={n.id} value={n.id}>{n.nom_niveau}</option>
                            ))}
                        </select>
                    </div>

                    {seriesDuNiveau.length > 0 && (
                        <div className="col-auto">
                            <label className="form-label">Série</label>
                            <select
                                className="form-select form-select-sm"
                                style={{ minWidth: 120 }}
                                value={serieId}
                                onChange={(e) => { setSerieId(e.target.value); setMatiereId(''); annuler(); }}
                            >
                                {seriesDuNiveau.map((s) => (
                                    <option key={s.id} value={s.id}>Série {s.nom}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="col-auto">
                        <label className="form-label">Matière</label>
                        <select
                            className="form-select form-select-sm"
                            style={{ minWidth: 200 }}
                            value={matiereId}
                            onChange={(e) => { setMatiereId(e.target.value); annuler(); }}
                            disabled={!niveauId}
                        >
                            <option value="">Sélectionner une matière</option>
                            {matieres.map((m) => (
                                <option key={m.id} value={m.id}>{m.libelle_matiere}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {chargement && (
                    <div className="text-center py-4">
                        <div className="spinner-border spinner-border-sm text-secondary" />
                    </div>
                )}

                {!chargement && matiereId && niveauId && (
                    <>
                        <h6 className="text-muted mb-2">
                            {niveauSelectionne?.nom_niveau}
                            {serieSelectionnee ? ` — Série ${serieSelectionnee.nom}` : ''}
                            {' — '}{matiereSelectionnee?.libelle_matiere}
                            &nbsp;·&nbsp; {chapitres.length} chapitre{chapitres.length !== 1 ? 's' : ''}
                        </h6>

                        {chapitres.length > 0 && (
                            <table className="table table-sm table-bordered mb-3" style={{ fontSize: '0.88rem' }}>
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: 50 }}>#</th>
                                        <th>Titre</th>
                                        <th>Note direction</th>
                                        <th style={{ width: 100 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {chapitres.map((ch) => (
                                        <tr key={ch.id} className={editId === ch.id ? 'table-warning' : ''}>
                                            <td className="text-center fw-bold">{ch.ordre}</td>
                                            <td>
                                                {ch.titre}
                                                {ch.serie_id && seriesDuNiveau.length > 0 && (
                                                    <span className="badge bg-secondary ms-2 fw-normal" style={{ fontSize: '0.72rem' }}>
                                                        {seriesDuNiveau.find((s) => s.id === ch.serie_id)?.nom ?? ''}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="text-muted small">{ch.note_direction || '—'}</td>
                                            <td className="text-center">
                                                <button
                                                    className="btn btn-warning btn-sm py-0 me-1"
                                                    onClick={() => commencerEdition(ch)}
                                                >✏</button>
                                                <button
                                                    className="btn btn-danger btn-sm py-0"
                                                    onClick={() => supprimer(ch)}
                                                >✕</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {chapitres.length === 0 && (
                            <p className="text-muted small mb-3">Aucun chapitre défini pour ce niveau et cette matière.</p>
                        )}

                        {/* Formulaire ajout / édition */}
                        <div className="border rounded p-3 bg-light mb-3">
                            <h6 className="mb-3">{editId ? 'Modifier le chapitre' : 'Ajouter un chapitre'}</h6>
                            <div className="row g-2">
                                <div className="col-md-1">
                                    <label className="form-label small">N° *</label>
                                    <input
                                        type="number"
                                        className="form-control form-control-sm"
                                        min="1"
                                        value={form.ordre}
                                        onChange={(e) => setForm((p) => ({ ...p, ordre: e.target.value }))}
                                    />
                                </div>
                                <div className="col-md-5">
                                    <label className="form-label small">Titre *</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="Ex : Chapitre 1 — Les nombres entiers"
                                        value={form.titre}
                                        onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))}
                                    />
                                </div>
                                <div className="col-md-5">
                                    <label className="form-label small">Note direction (optionnel)</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="Ex : Prévoir 2 séances minimum"
                                        value={form.note_direction}
                                        onChange={(e) => setForm((p) => ({ ...p, note_direction: e.target.value }))}
                                    />
                                </div>
                                <div className="col-md-1 d-flex align-items-end gap-1">
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={sauvegarder}
                                        disabled={!form.titre.trim() || !form.ordre || enregistrement}
                                    >
                                        {enregistrement
                                            ? <span className="spinner-border spinner-border-sm" />
                                            : editId ? '✓' : '+'
                                        }
                                    </button>
                                    {editId && (
                                        <button className="btn btn-secondary btn-sm" onClick={annuler}>✕</button>
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

export default GestionChapitres;
