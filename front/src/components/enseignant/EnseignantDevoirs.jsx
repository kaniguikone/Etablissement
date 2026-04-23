import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const PALETTE = ['#1565C0', '#2E7D32', '#C62828', '#F57F17', '#00838F', '#6A1B9A'];

const formatDateCode = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}${m}${y.slice(2)}`;
};

const EnseignantDevoirs = () => {
    const { toast } = useToast();

    const [devoirs, setDevoirs]     = useState([]);
    const [periodes, setPeriodes]   = useState([]);
    const [classes, setClasses]     = useState([]);
    const [typeDevoirs, setTypeDevoirs] = useState([]);
    const [periodeId, setPeriodeId] = useState('');
    const [chargement, setChargement] = useState(true);

    // Modal
    const [modal, setModal]         = useState(false);
    const [edition, setEdition]     = useState(null);
    const [sauvegarde, setSauvegarde] = useState(false);
    const vide = { code_devoir: '', date_devoir: '', coeff_devoir: 1, type_devoir_id: '', matiere_id: '', classe_id: '', niveau_id: '' };
    const [form, setForm]           = useState(vide);
    const [modalPeriodeInfo, setModalPeriodeInfo]     = useState(null);
    const [modalPeriodeErreur, setModalPeriodeErreur] = useState('');

    // Saisie notes
    const [devoirNotes, setDevoirNotes] = useState(null);
    const [notes, setNotes]         = useState([]);
    const [classeNotesId, setClasseNotesId] = useState('');
    const [classesNiveau, setClassesNiveau] = useState([]);
    const [sauvegardeNotes, setSauvegardeNotes] = useState(false);

    const matieresUniques = [...new Map(classes.map(c => [c.matiere_id, { id: c.matiere_id, label: c.libelle_matiere }])).values()];
    const classesUniques  = [...new Map(classes.map(c => [c.classe_id, { id: c.classe_id, label: c.nom_classe }])).values()];

    // Auto-résolution de la période dans le modal
    useEffect(() => {
        if (!form.date_devoir) { setModalPeriodeInfo(null); setModalPeriodeErreur(''); return; }
        api.get('/enseignant/periodes/parDate', { params: { date: form.date_devoir } })
            .then(({ data }) => {
                if (data) { setModalPeriodeInfo(data); setModalPeriodeErreur(''); }
                else { setModalPeriodeInfo(null); setModalPeriodeErreur("Cette date n'appartient à aucune période scolaire."); }
            })
            .catch(() => setModalPeriodeErreur('Impossible de vérifier la période.'));
    }, [form.date_devoir]);

    // Auto-génération du code (type + matière + classe + date JJMMAA)
    useEffect(() => {
        const type    = typeDevoirs.find(t => String(t.id) === String(form.type_devoir_id));
        const matiere = classes.find(c => String(c.matiere_id) === String(form.matiere_id));
        const classe  = classes.find(c => String(c.classe_id) === String(form.classe_id));

        if (!type || !matiere || !classe) return;

        const parts = [type.code_type_devoir, matiere.abbr_matiere, classe.abbr_classe];
        const dateCode = formatDateCode(form.date_devoir);
        if (dateCode) parts.push(dateCode);
        const base = parts.join('-');

        api.get(`/enseignant/devoirs/prochainCode?base=${encodeURIComponent(base)}`)
            .then(({ data }) => setForm(f => ({ ...f, code_devoir: data.code })))
            .catch(() => {});
    }, [form.type_devoir_id, form.matiere_id, form.classe_id, form.date_devoir]);

    useEffect(() => {
        Promise.all([
            api.get('/enseignant/periodes'),
            api.get('/enseignant/classes'),
            api.get('/enseignant/typeDevoirs'),
        ]).then(([{ data: p }, { data: c }, { data: t }]) => {
            setPeriodes(p);
            setClasses(c);
            setTypeDevoirs(t);
        });
    }, []);

    useEffect(() => { charger(); }, [periodeId]);

    const charger = () => {
        setChargement(true);
        api.get('/enseignant/devoirs', { params: { periode_id: periodeId || undefined } })
            .then(({ data }) => setDevoirs(data))
            .catch(() => toast.error('Erreur chargement devoirs.'))
            .finally(() => setChargement(false));
    };

    const ouvrirModal = (devoir = null) => {
        setEdition(devoir);
        setForm(devoir ? {
            code_devoir:    devoir.code_devoir,
            date_devoir:    devoir.date_devoir,
            coeff_devoir:   devoir.coeff_devoir,
            type_devoir_id: devoir.type_devoir_id,
            matiere_id:     devoir.matiere_id,
            classe_id:      devoir.classe_id ?? '',
            niveau_id:      devoir.niveau_id ?? '',
        } : vide);
        setModalPeriodeInfo(null);
        setModalPeriodeErreur('');
        setModal(true);
    };

    const fermerModal = () => {
        setModal(false);
        charger();
    };

    const sauvegarder = async (e) => {
        e.preventDefault();
        if (!modalPeriodeInfo) {
            toast.error(modalPeriodeErreur || "Veuillez choisir une date dans une période scolaire.");
            return;
        }
        setSauvegarde(true);
        try {
            if (edition) {
                await api.put(`/enseignant/devoirs/${edition.id}`, form);
                toast.success('Devoir modifié.');
            } else {
                await api.post('/enseignant/devoirs', form);
                toast.success('Devoir créé.');
            }
            setModal(false);
            charger();
        } catch (err) {
            const data = err.response?.data;
            const msg = data?.message
                ?? (data?.errors ? Object.values(data.errors).flat().join(' ') : null)
                ?? 'Erreur lors de la sauvegarde.';
            toast.error(msg);
        } finally {
            setSauvegarde(false);
        }
    };

    const ouvrirNotes = async (devoir) => {
        setDevoirNotes(devoir);
        setClasseNotesId('');
        setClassesNiveau([]);
        setNotes([]);
        await chargerNotes(devoir, '');
    };

    const chargerNotes = async (devoir, classeId) => {
        try {
            const params = classeId ? { classe_id: classeId } : {};
            const { data } = await api.get(`/enseignant/devoir/${devoir.id}/notes`, { params });
            setNotes(data.notes ?? []);
            setClassesNiveau(data.classes_niveau ?? []);
            if (classeId) setClasseNotesId(classeId);
        } catch {
            toast.error('Erreur chargement notes.');
        }
    };

    const enregistrerNotes = async () => {
        setSauvegardeNotes(true);
        try {
            const payload = notes.map(n => ({ eleve_id: n.eleve_id, note: n._note !== undefined ? n._note : n.note }));
            await api.post(`/enseignant/devoir/${devoirNotes.id}/notes`, { notes: payload });
            toast.success('Notes enregistrées.');
            setDevoirNotes(null);
        } catch {
            toast.error('Erreur sauvegarde notes.');
        } finally {
            setSauvegardeNotes(false);
        }
    };

    const setNote = (eleveId, val) => {
        setNotes(prev => prev.map(n => n.eleve_id === eleveId ? { ...n, _note: val } : n));
    };

    const couleur = (matiereId) => PALETTE[(matiereId ?? 0) % PALETTE.length];

    // ── Vue saisie notes ──
    if (devoirNotes) return (
        <div className="container-fluid py-4">
            <div className="d-flex align-items-center gap-3 mb-4">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setDevoirNotes(null)}>
                    <i className="fas fa-arrow-left me-1" />Retour
                </button>
                <h5 className="mb-0 fw-bold">Saisie notes — {devoirNotes.code_devoir}</h5>
            </div>

            {classesNiveau.length > 0 && (
                <div className="mb-3">
                    <select className="form-select form-select-sm w-auto"
                        value={classeNotesId}
                        onChange={e => chargerNotes(devoirNotes, e.target.value)}>
                        <option value="">Sélectionner une classe</option>
                        {classesNiveau.map(c => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                    </select>
                </div>
            )}

            {notes.length === 0 ? (
                <p className="text-muted text-center py-5">
                    {classesNiveau.length > 0 ? 'Sélectionnez une classe' : 'Aucun élève'}
                </p>
            ) : (
                <div className="card border-0 shadow-sm">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>#</th>
                                    <th>Nom</th>
                                    <th>Prénom(s)</th>
                                    <th>Matricule</th>
                                    <th style={{ width: 120 }}>Note /20</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notes.map((n, i) => (
                                    <tr key={n.eleve_id}>
                                        <td className="text-muted small">{i + 1}</td>
                                        <td className="fw-semibold small">{n.nom_eleve}</td>
                                        <td className="small">{n.prenoms_eleve}</td>
                                        <td className="text-muted small">{n.matricule_eleve}</td>
                                        <td>
                                            <input
                                                type="number" min="0" max="20" step="0.25"
                                                className="form-control form-control-sm"
                                                defaultValue={n.note ?? ''}
                                                onChange={e => setNote(n.eleve_id, e.target.value === '' ? null : parseFloat(e.target.value))}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="card-footer bg-white d-flex justify-content-end">
                        <button className="btn btn-primary" onClick={enregistrerNotes} disabled={sauvegardeNotes}>
                            {sauvegardeNotes ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="fas fa-save me-2" />}
                            Enregistrer les notes
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    // ── Vue liste devoirs ──
    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="mb-0 fw-bold"><i className="fas fa-tasks me-2 text-primary" />Devoirs & Notes</h4>
                <button className="btn btn-primary btn-sm" onClick={() => ouvrirModal()}>
                    <i className="fas fa-plus me-1" />Nouveau devoir
                </button>
            </div>

            {/* Filtre période (pour la liste) */}
            <div className="mb-3">
                <select className="form-select form-select-sm w-auto"
                    value={periodeId} onChange={e => setPeriodeId(e.target.value)}>
                    <option value="">Toutes les périodes</option>
                    {periodes.map(p => <option key={p.id} value={p.id}>{p.libelle_periode}</option>)}
                </select>
            </div>

            {chargement ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : devoirs.length === 0 ? (
                <div className="text-center text-muted py-5">
                    <i className="fas fa-tasks fa-3x mb-3 opacity-25 d-block" />
                    Aucun devoir trouvé
                </div>
            ) : (
                <div className="row g-3">
                    {devoirs.map(d => {
                        const c = couleur(d.matiere_id);
                        return (
                            <div key={d.id} className="col-md-6 col-xl-4">
                                <div className="card border-0 shadow-sm h-100" style={{ borderLeft: `4px solid ${c}` }}>
                                    <div className="card-body">
                                        <div className="d-flex align-items-start justify-content-between mb-2">
                                            <span className="badge fw-bold" style={{ background: c + '22', color: c }}>
                                                {d.type_devoir?.code_type ?? '?'}
                                            </span>
                                            <span className="text-muted small">{d.date_devoir}</span>
                                        </div>
                                        <div className="fw-bold mb-1">{d.code_devoir}</div>
                                        <div className="small text-muted mb-1">{d.matiere?.libelle_matiere}</div>
                                        <div className="small text-muted">
                                            {d.classe?.nom_classe ?? d.niveau?.nom_niveau ?? '—'} · coeff {d.coeff_devoir}
                                        </div>
                                        {d.periode && (
                                            <div className="small mt-1" style={{ color: c }}>
                                                {d.periode.libelle_periode}
                                            </div>
                                        )}
                                    </div>
                                    <div className="card-footer bg-white border-top d-flex gap-2 justify-content-end">
                                        <button className="btn btn-sm btn-outline-secondary" onClick={() => ouvrirModal(d)}>
                                            <i className="fas fa-edit me-1" />Modifier
                                        </button>
                                        <button className="btn btn-sm btn-primary" onClick={() => ouvrirNotes(d)}>
                                            <i className="fas fa-graduation-cap me-1" />Notes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal création / édition */}
            {modal && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <div className="modal-dialog modal-lg">
                        <form className="modal-content" onSubmit={sauvegarder}>
                            <div className="modal-header">
                                <h5 className="modal-title">{edition ? 'Modifier le devoir' : 'Nouveau devoir'}</h5>
                                <button type="button" className="btn-close" onClick={fermerModal} />
                            </div>
                            <div className="modal-body row g-3">
                                <div className="col-md-6">
                                    <label className="form-label small fw-semibold">Code devoir *</label>
                                    <input className="form-control form-control-sm" required
                                        value={form.code_devoir} onChange={e => setForm(f => ({ ...f, code_devoir: e.target.value }))} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-semibold">Date *</label>
                                    <input type="date" className="form-control form-control-sm" required
                                        value={form.date_devoir} onChange={e => setForm(f => ({ ...f, date_devoir: e.target.value }))} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-semibold">Type de devoir *</label>
                                    <select className="form-select form-select-sm" required
                                        value={form.type_devoir_id} onChange={e => setForm(f => ({ ...f, type_devoir_id: e.target.value }))}>
                                        <option value="">— Choisir —</option>
                                        {typeDevoirs.map(t => <option key={t.id} value={t.id}>{t.code_type_devoir}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-semibold">Matière *</label>
                                    <select className="form-select form-select-sm" required
                                        value={form.matiere_id} onChange={e => setForm(f => ({ ...f, matiere_id: e.target.value }))}>
                                        <option value="">— Choisir —</option>
                                        {matieresUniques.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label small fw-semibold">Coefficient *</label>
                                    <input type="number" min="0" step="0.5" className="form-control form-control-sm" required
                                        value={form.coeff_devoir} onChange={e => setForm(f => ({ ...f, coeff_devoir: e.target.value }))} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label small fw-semibold">Classe</label>
                                    <select className="form-select form-select-sm"
                                        value={form.classe_id} onChange={e => setForm(f => ({ ...f, classe_id: e.target.value, niveau_id: '' }))}>
                                        <option value="">— Toute une classe —</option>
                                        {classesUniques.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label small fw-semibold">Période</label>
                                    <div className="form-control form-control-sm bg-white d-flex align-items-center" style={{ minHeight: 31 }}>
                                        {modalPeriodeInfo ? (
                                            <span className="badge bg-primary">{modalPeriodeInfo.libelle_periode}</span>
                                        ) : modalPeriodeErreur ? (
                                            <span className="text-danger" style={{ fontSize: 12 }}>{modalPeriodeErreur}</span>
                                        ) : (
                                            <span className="text-muted" style={{ fontSize: 12 }}>Automatique selon la date</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={fermerModal}>Annuler</button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={sauvegarde || !!modalPeriodeErreur}>
                                    {sauvegarde && <span className="spinner-border spinner-border-sm me-1" />}
                                    {edition ? 'Enregistrer' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnseignantDevoirs;
