import { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const EnseignantAppreciations = () => {
    const { toast } = useToast();

    const [classes, setClasses]       = useState([]);
    const [periodes, setPeriodes]     = useState([]);
    const [classeId, setClasseId]     = useState('');
    const [matiereId, setMatiereId]   = useState('');
    const [periodeId, setPeriodeId]   = useState('');
    const [eleves, setEleves]         = useState([]);
    const [appreciations, setAppr]    = useState({});
    const [chargement, setChargement] = useState(false);
    const [sauvegarde, setSauvegarde] = useState(false);

    useEffect(() => {
        Promise.all([
            api.get('/enseignant/classes'),
            api.get('/enseignant/periodes'),
        ]).then(([rc, rp]) => {
            setClasses(rc.data);
            setPeriodes(rp.data);
        });
    }, []);

    // Matières disponibles pour la classe sélectionnée
    const matieres = classeId
        ? [...new Map(
            classes
                .filter(c => String(c.classe_id) === String(classeId))
                .map(c => [c.matiere_id, { id: c.matiere_id, label: c.libelle_matiere }])
          ).values()]
        : [];

    const chargerEleves = useCallback(() => {
        if (!classeId || !matiereId || !periodeId) return;
        setChargement(true);

        Promise.all([
            api.get(`/enseignant/classe/${classeId}/eleves`),
            api.get(`/enseignant/appreciations-matiere/${classeId}/${periodeId}`),
        ]).then(([re, ra]) => {
            setEleves(re.data);
            const existantes = {};
            (re.data).forEach(e => {
                existantes[e.id] = ra.data?.[e.id]?.[matiereId] ?? '';
            });
            setAppr(existantes);
        }).catch(() => toast.error('Erreur lors du chargement.'))
          .finally(() => setChargement(false));
    }, [classeId, matiereId, periodeId]);

    useEffect(() => { chargerEleves(); }, [chargerEleves]);

    const sauvegarder = () => {
        if (!classeId || !matiereId || !periodeId) return;
        setSauvegarde(true);
        const payload = {
            matiere_id:   Number(matiereId),
            periode_id:   Number(periodeId),
            appreciations: eleves.map(e => ({
                eleve_id:     e.id,
                appreciation: appreciations[e.id] || null,
            })),
        };
        api.post('/enseignant/appreciations-matiere/batch', payload)
            .then(() => toast.success('Appréciations enregistrées.'))
            .catch(() => toast.error('Erreur lors de l\'enregistrement.'))
            .finally(() => setSauvegarde(false));
    };

    const classeSelectionnee = classes.find(c => String(c.classe_id) === String(classeId));

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Appréciations sur les bulletins</h4>
                </div>

                {/* Filtres */}
                <div className="card shadow-sm mb-4">
                    <div className="card-body">
                        <div className="row g-3">
                            <div className="col-md-4">
                                <label className="form-label small fw-semibold">Classe</label>
                                <select className="form-select form-select-sm"
                                    value={classeId}
                                    onChange={e => { setClasseId(e.target.value); setMatiereId(''); setEleves([]); }}>
                                    <option value="">— Choisir une classe —</option>
                                    {[...new Map(classes.map(c => [c.classe_id, c])).values()].map(c => (
                                        <option key={c.classe_id} value={c.classe_id}>{c.nom_classe}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-semibold">Matière</label>
                                <select className="form-select form-select-sm"
                                    value={matiereId}
                                    onChange={e => setMatiereId(e.target.value)}
                                    disabled={!classeId}>
                                    <option value="">— Choisir une matière —</option>
                                    {matieres.map(m => (
                                        <option key={m.id} value={m.id}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-semibold">Période</label>
                                <select className="form-select form-select-sm"
                                    value={periodeId}
                                    onChange={e => setPeriodeId(e.target.value)}>
                                    <option value="">— Choisir une période —</option>
                                    {periodes.map(p => (
                                        <option key={p.id} value={p.id}>{p.libelle_periode}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tableau des appréciations */}
                {chargement && (
                    <div className="text-center py-4">
                        <div className="spinner-border text-primary" />
                    </div>
                )}

                {!chargement && eleves.length > 0 && (
                    <>
                        <div className="alert alert-info small mb-3">
                            <i className="fas fa-info-circle me-2" />
                            Saisissez une appréciation personnalisée pour chaque élève. Si vous laissez vide, le bulletin affichera l'appréciation automatique basée sur la moyenne.
                        </div>

                        <div className="card shadow-sm">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <span className="fw-semibold small">
                                    {classeSelectionnee?.nom_classe} — {matieres.find(m => String(m.id) === String(matiereId))?.label}
                                    {' '}— {periodes.find(p => String(p.id) === String(periodeId))?.libelle_periode}
                                </span>
                                <span className="badge bg-secondary">{eleves.length} élève{eleves.length > 1 ? 's' : ''}</span>
                            </div>
                            <div className="card-body p-0">
                                <table className="table table-sm table-hover mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: 40 }}>#</th>
                                            <th>Nom et prénoms</th>
                                            <th>Appréciation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {eleves.map((e, i) => (
                                            <tr key={e.id}>
                                                <td className="text-muted small">{i + 1}</td>
                                                <td className="fw-semibold">
                                                    {e.nom_eleve} {e.prenoms_eleve}
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        maxLength={300}
                                                        placeholder="Ex : Bon travail, continuez ainsi"
                                                        value={appreciations[e.id] || ''}
                                                        onChange={ev => setAppr(prev => ({ ...prev, [e.id]: ev.target.value }))}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="card-footer d-flex justify-content-end">
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={sauvegarder}
                                    disabled={sauvegarde}>
                                    {sauvegarde
                                        ? <><span className="spinner-border spinner-border-sm me-1" />Enregistrement…</>
                                        : <><i className="fas fa-save me-1" />Enregistrer les appréciations</>}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {!chargement && classeId && matiereId && periodeId && eleves.length === 0 && (
                    <div className="alert alert-warning">Aucun élève trouvé pour cette sélection.</div>
                )}
            </div>
        </section>
    );
};

export default EnseignantAppreciations;
