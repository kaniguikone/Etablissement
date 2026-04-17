import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const STATUTS = {
    present: { label: 'P', bg: '#e8f5e9', border: '#43a047', text: '#2e7d32' },
    absent:  { label: 'A', bg: '#ffebee', border: '#e53935', text: '#c62828' },
    retard:  { label: 'R', bg: '#fff8e1', border: '#fb8c00', text: '#e65100' },
};

const EnseignantPresence = () => {
    const { toast } = useToast();

    const [classes, setClasses]   = useState([]); // classesMatieres
    const [periodes, setPeriodes] = useState([]);
    const [selection, setSelection] = useState(''); // "classeId:matiereId"
    const [periodeId, setPeriodeId] = useState('');
    const [date, setDate]         = useState(new Date().toISOString().slice(0, 10));
    const [eleves, setEleves]     = useState([]);
    const [statuts, setStatuts]   = useState({});
    const [chargement, setChargement] = useState(false);
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

    const chargerEleves = async (sel = selection, pid = periodeId, d = date) => {
        if (!sel || !pid) return;
        const [classeId, matiereId] = sel.split(':');
        setChargement(true);
        try {
            const { data } = await api.get('/enseignant/assiduites', {
                params: { classe_id: classeId, matiere_id: matiereId, periode_id: pid, date: d },
            });
            setEleves(data);
            const map = {};
            data.forEach(e => { map[e.eleve_id] = e.statut ?? 'present'; });
            setStatuts(map);
        } catch {
            toast('Erreur chargement élèves.', 'danger');
        } finally {
            setChargement(false);
        }
    };

    const handleChange = (field, val) => {
        if (field === 'selection') { setSelection(val); chargerEleves(val, periodeId, date); }
        if (field === 'periodeId') { setPeriodeId(val); chargerEleves(selection, val, date); }
        if (field === 'date')      { setDate(val);      chargerEleves(selection, periodeId, val); }
    };

    const setStatut = (eleveId, statut) => setStatuts(s => ({ ...s, [eleveId]: statut }));

    const enregistrer = async () => {
        if (!selection || !periodeId || eleves.length === 0) return;
        const [classeId, matiereId] = selection.split(':');
        setSauvegarde(true);
        try {
            await api.post('/enseignant/assiduites', {
                classe_id: classeId,
                matiere_id: matiereId,
                periode_id: periodeId,
                date,
                assiduites: eleves.map(e => ({
                    eleve_id: e.eleve_id,
                    statut: statuts[e.eleve_id] ?? 'present',
                    remarque: '',
                })),
            });
            toast('Présences enregistrées.', 'success');
        } catch {
            toast('Erreur lors de l\'enregistrement.', 'danger');
        } finally {
            setSauvegarde(false);
        }
    };

    // Libellé "Classe · Matière"
    const labelClasseMatiere = (cm) => `${cm.nom_classe} · ${cm.libelle_matiere}`;
    const classesMatieres = classes.map(c => ({
        key: `${c.classe_id}:${c.matiere_id}`,
        label: labelClasseMatiere(c),
    }));

    const absents = eleves.filter(e => statuts[e.eleve_id] === 'absent').length;
    const retards = eleves.filter(e => statuts[e.eleve_id] === 'retard').length;

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="mb-0 fw-bold"><i className="fas fa-clipboard-check me-2 text-primary" />Feuille de présence</h4>
                {eleves.length > 0 && (
                    <button className="btn btn-primary btn-sm" onClick={enregistrer} disabled={sauvegarde}>
                        {sauvegarde ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="fas fa-save me-1" />}
                        Enregistrer
                    </button>
                )}
            </div>

            {/* Filtres */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-5">
                            <label className="form-label small fw-semibold">Classe · Matière</label>
                            <select className="form-select form-select-sm"
                                value={selection} onChange={e => handleChange('selection', e.target.value)}>
                                <option value="">— Sélectionner —</option>
                                {classesMatieres.map(({ key, label }) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label className="form-label small fw-semibold">Période</label>
                            <select className="form-select form-select-sm"
                                value={periodeId} onChange={e => handleChange('periodeId', e.target.value)}>
                                <option value="">— Sélectionner —</option>
                                {periodes.map(p => <option key={p.id} value={p.id}>{p.libelle_periode}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label small fw-semibold">Date</label>
                            <input type="date" className="form-control form-control-sm"
                                value={date} onChange={e => handleChange('date', e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            {chargement ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : eleves.length === 0 ? (
                <div className="text-center text-muted py-5">
                    <i className="fas fa-users fa-3x mb-3 opacity-25 d-block" />
                    {!selection || !periodeId ? 'Sélectionnez une classe, une matière et une période' : 'Aucun élève trouvé'}
                </div>
            ) : (
                <>
                    {/* Légende + stats */}
                    <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
                        {Object.entries(STATUTS).map(([k, { label, bg, border, text }]) => (
                            <span key={k} className="badge" style={{ background: bg, color: text, border: `1px solid ${border}`, fontWeight: 600 }}>
                                {label} — {label === 'P' ? eleves.length - absents - retards : label === 'A' ? absents : retards}
                            </span>
                        ))}
                        <span className="text-muted small ms-auto">{eleves.length} élèves</span>
                    </div>

                    <div className="row g-2">
                        {eleves.map((e, i) => {
                            const statut = statuts[e.eleve_id] ?? 'present';
                            const st = STATUTS[statut];
                            return (
                                <div key={e.eleve_id} className="col-md-6">
                                    <div className="d-flex align-items-center gap-3 p-3 rounded-3"
                                        style={{ background: st.bg, border: `1px solid ${st.border}44`, transition: 'all .15s' }}>
                                        <span className="text-muted small" style={{ width: 24, textAlign: 'right' }}>{i + 1}</span>
                                        <div style={{
                                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                            background: st.border + '22',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 700, color: st.text, fontSize: 14,
                                        }}>
                                            {e.nom?.[0]?.toUpperCase() ?? '?'}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="fw-semibold small text-truncate">{e.nom} {e.prenoms}</div>
                                            <div className="text-muted" style={{ fontSize: 11 }}>{e.matricule}</div>
                                        </div>
                                        <div className="d-flex gap-1">
                                            {Object.entries(STATUTS).map(([k, { label, bg: b, border: bo, text: t }]) => (
                                                <button key={k}
                                                    onClick={() => setStatut(e.eleve_id, k)}
                                                    style={{
                                                        width: 32, height: 32, borderRadius: '50%', border: `2px solid ${bo}`,
                                                        background: statut === k ? bo : '#fff',
                                                        color: statut === k ? '#fff' : bo,
                                                        fontWeight: 700, fontSize: 12, cursor: 'pointer',
                                                        transition: 'all .15s',
                                                    }}>
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default EnseignantPresence;
