import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const STATUTS = {
    fait:     { label: 'Fait',     bg: '#e8f5e9', color: '#2e7d32', icon: 'fa-check-circle' },
    en_cours: { label: 'En cours', bg: '#fff8e1', color: '#f57f17', icon: 'fa-spinner' },
    reporte:  { label: 'Reporté',  bg: '#ffebee', color: '#c62828', icon: 'fa-pause-circle' },
};

const EnseignantProgramme = () => {
    const { toast } = useToast();

    const [classes, setClasses]   = useState([]);
    const [periodes, setPeriodes] = useState([]);
    const [selection, setSelection] = useState('');
    const [periodeId, setPeriodeId] = useState('');
    const [chapitres, setChapitres] = useState([]);
    const [chargement, setChargement] = useState(false);
    const [modalCh, setModalCh]   = useState(null);
    const [form, setForm]         = useState({ statut: 'fait', date_seance: new Date().toISOString().slice(0, 10), observations: '' });
    const [sauvegarde, setSauvegarde] = useState(false);

    useEffect(() => {
        Promise.all([
            api.get('/enseignant/classes'),
            api.get('/enseignant/periodes'),
        ]).then(([{ data: c }, { data: p }]) => {
            setClasses(c);
            setPeriodes(p);
        });
    }, []);

    const charger = async (sel = selection, pid = periodeId) => {
        if (!sel || !pid) return;
        const [classeId, matiereId] = sel.split(':');
        setChargement(true);
        try {
            const { data } = await api.get('/enseignant/progression', {
                params: { classe_id: classeId, matiere_id: matiereId, periode_id: pid },
            });
            setChapitres(data);
        } catch {
            toast('Erreur chargement programme.', 'danger');
        } finally {
            setChargement(false);
        }
    };

    const handleChange = (field, val) => {
        if (field === 'selection') { setSelection(val); charger(val, periodeId); }
        if (field === 'periodeId') { setPeriodeId(val); charger(selection, val); }
    };

    const ouvrirModal = (ch) => {
        setModalCh(ch);
        setForm({
            statut:      ch.progression?.statut ?? 'fait',
            date_seance: ch.progression?.date_seance ?? new Date().toISOString().slice(0, 10),
            observations: ch.progression?.observations ?? '',
        });
    };

    const sauvegarder = async (e) => {
        e.preventDefault();
        const [classeId] = selection.split(':');
        setSauvegarde(true);
        try {
            await api.post('/enseignant/progression', {
                chapitre_id: modalCh.chapitre_id,
                classe_id: classeId,
                periode_id: periodeId,
                ...form,
            });
            toast('Progression enregistrée.', 'success');
            setModalCh(null);
            charger();
        } catch (err) {
            toast(err.response?.data?.message ?? 'Erreur.', 'danger');
        } finally {
            setSauvegarde(false);
        }
    };

    const supprimer = async (ch) => {
        if (!ch.progression?.id) return;
        try {
            await api.delete(`/enseignant/progression/${ch.progression.id}`);
            toast('Progression réinitialisée.', 'success');
            charger();
        } catch {
            toast('Erreur suppression.', 'danger');
        }
    };

    const classesMatieres = [...new Map(
        classes.map(c => [`${c.classe_id}:${c.matiere_id}`, { key: `${c.classe_id}:${c.matiere_id}`, label: `${c.nom_classe} · ${c.libelle_matiere}` }])
    ).values()];

    const fait    = chapitres.filter(c => c.progression?.statut === 'fait').length;
    const enCours = chapitres.filter(c => c.progression?.statut === 'en_cours').length;
    const reporte = chapitres.filter(c => c.progression?.statut === 'reporte').length;
    const nonFait = chapitres.length - fait - enCours - reporte;
    const pct = chapitres.length > 0 ? Math.round((fait / chapitres.length) * 100) : 0;

    return (
        <div className="container-fluid py-4">
            <h4 className="mb-4 fw-bold"><i className="fas fa-book-open me-2 text-primary" />Progression du programme</h4>

            {/* Filtres */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-6">
                            <label className="form-label small fw-semibold">Classe · Matière</label>
                            <select className="form-select form-select-sm"
                                value={selection} onChange={e => handleChange('selection', e.target.value)}>
                                <option value="">— Sélectionner —</option>
                                {classesMatieres.map(({ key, label }) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label small fw-semibold">Période</label>
                            <select className="form-select form-select-sm"
                                value={periodeId} onChange={e => handleChange('periodeId', e.target.value)}>
                                <option value="">— Sélectionner —</option>
                                {periodes.map(p => <option key={p.id} value={p.id}>{p.libelle_periode}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {chargement ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : chapitres.length === 0 ? (
                <div className="text-center text-muted py-5">
                    <i className="fas fa-book-open fa-3x mb-3 opacity-25 d-block" />
                    {!selection || !periodeId ? 'Sélectionnez une classe et une période' : 'Aucun chapitre trouvé'}
                </div>
            ) : (
                <>
                    {/* Barre de progression */}
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-body">
                            <div className="d-flex justify-content-between mb-2">
                                <span className="fw-semibold small">Avancement global</span>
                                <span className="fw-bold" style={{ color: '#1a56a0' }}>{pct}%</span>
                            </div>
                            <div className="progress mb-3" style={{ height: 8 }}>
                                <div className="progress-bar bg-success" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="d-flex gap-3 flex-wrap">
                                {[
                                    { label: `${fait} Fait(s)`, color: '#2e7d32' },
                                    { label: `${enCours} En cours`, color: '#f57f17' },
                                    { label: `${reporte} Reporté(s)`, color: '#c62828' },
                                    { label: `${nonFait} Non abordé(s)`, color: '#9e9e9e' },
                                ].map(({ label, color }) => (
                                    <span key={label} className="badge" style={{ background: color + '18', color, fontWeight: 600, border: `1px solid ${color}44` }}>
                                        {label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Liste chapitres */}
                    <div className="card border-0 shadow-sm">
                        <div className="card-body p-0">
                            {chapitres.map((ch, i) => {
                                const prog = ch.progression;
                                const st = prog?.statut ? STATUTS[prog.statut] : null;
                                return (
                                    <div key={ch.chapitre_id} className="d-flex align-items-start gap-3 p-3 border-bottom">
                                        <span className="text-muted small fw-semibold" style={{ width: 28, flexShrink: 0, paddingTop: 2 }}>
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="fw-semibold small">{ch.titre}</div>
                                            {ch.note_direction && (
                                                <div className="text-muted" style={{ fontSize: 12 }}>{ch.note_direction}</div>
                                            )}
                                            {prog && (
                                                <div className="d-flex align-items-center gap-2 mt-1">
                                                    <span className="badge small" style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}44` }}>
                                                        <i className={`fas ${st.icon} me-1`} />{st.label}
                                                    </span>
                                                    <span className="text-muted" style={{ fontSize: 11 }}>{prog.date_seance}</span>
                                                    {prog.observations && (
                                                        <span className="text-muted" style={{ fontSize: 11 }} title={prog.observations}>
                                                            <i className="fas fa-comment-alt ms-1" />
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="d-flex gap-1">
                                            <button className="btn btn-sm btn-outline-primary py-1 px-2" onClick={() => ouvrirModal(ch)}>
                                                <i className="fas fa-edit" />
                                            </button>
                                            {prog && (
                                                <button className="btn btn-sm btn-outline-danger py-1 px-2" onClick={() => supprimer(ch)}>
                                                    <i className="fas fa-undo" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {/* Modal progression */}
            {modalCh && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <div className="modal-dialog">
                        <form className="modal-content" onSubmit={sauvegarder}>
                            <div className="modal-header">
                                <h6 className="modal-title fw-bold">{modalCh.titre}</h6>
                                <button type="button" className="btn-close" onClick={() => setModalCh(null)} />
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">Statut</label>
                                    <div className="d-flex gap-2">
                                        {Object.entries(STATUTS).map(([k, { label, color, bg }]) => (
                                            <button key={k} type="button"
                                                className="btn btn-sm flex-fill"
                                                style={{
                                                    background: form.statut === k ? color : bg,
                                                    color: form.statut === k ? '#fff' : color,
                                                    border: `1px solid ${color}`,
                                                }}
                                                onClick={() => setForm(f => ({ ...f, statut: k }))}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">Date de séance *</label>
                                    <input type="date" className="form-control form-control-sm" required
                                        value={form.date_seance} onChange={e => setForm(f => ({ ...f, date_seance: e.target.value }))} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">
                                        Observations {['en_cours', 'reporte'].includes(form.statut) && <span className="text-danger">*</span>}
                                    </label>
                                    <textarea className="form-control form-control-sm" rows={3}
                                        value={form.observations}
                                        onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
                                        required={['en_cours', 'reporte'].includes(form.statut)}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setModalCh(null)}>Annuler</button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={sauvegarde}>
                                    {sauvegarde && <span className="spinner-border spinner-border-sm me-1" />}Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnseignantProgramme;
