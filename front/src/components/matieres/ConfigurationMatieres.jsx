import { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';

const COULEURS_GROUPES = ['#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#ec4899'];

/* ── Ligne matière cliquable (réutilisée dans les deux étapes) ─────────────── */
const LigneMatiere = ({ matiere, actif, onClick, children }) => (
    <div onClick={onClick}
        style={{
            borderBottom: '1px solid #f1f5f9',
            background: actif ? '#f0f7ff' : 'white',
            cursor: 'pointer', transition: 'background .15s',
        }}>
        <div className="d-flex align-items-center px-3 py-2" style={{ gap: 12 }}>
            <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                border: `2px solid ${actif ? '#1e3a8a' : '#cbd5e1'}`,
                background: actif ? '#1e3a8a' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {actif && <i className="fas fa-check" style={{ color: 'white', fontSize: 11 }} />}
            </div>
            <span className="badge bg-light text-dark border" style={{ fontSize: 10, flexShrink: 0 }}>
                {matiere.abbr_matiere}
            </span>
            <span style={{ fontWeight: actif ? 600 : 400, color: actif ? '#1a2535' : '#94a3b8', flex: 1 }}>
                {matiere.libelle_matiere}
            </span>
            {children}
        </div>
    </div>
);

/* ── Étape 1 : Matières de l'établissement ─────────────────────────────────── */
const EtapeEtablissement = ({ config, onSave }) => {
    const [selection, setSelection] = useState(
        new Set(config.etablissementMatieres.map(Number))
    );
    const [saving, setSaving] = useState(false);

    const toggle = (id) => setSelection(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const toutCocher   = () => setSelection(new Set(config.matieres.map(m => m.id)));
    const toutDecocher = () => setSelection(new Set());

    const [erreurSave, setErreurSave] = useState('');

    const sauvegarder = () => {
        setSaving(true);
        setErreurSave('');
        api.post('/config-matieres/etablissement', { matiere_ids: [...selection] })
            .then(() => onSave())
            .catch(() => setErreurSave('Erreur lors de la sauvegarde.'))
            .finally(() => setSaving(false));
    };

    return (
        <div>
        {erreurSave && <div className="alert alert-danger alert-dismissible mb-3">
            {erreurSave}<button className="btn-close" onClick={() => setErreurSave('')} />
        </div>}
        <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
            <div className="card-header bg-white border-0 px-3 pt-3 pb-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                    <div>
                        <span className="fw-bold">Matières enseignées dans cet établissement</span>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                            Cochez toutes les matières que cet établissement propose, quel que soit le niveau.
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-secondary" onClick={toutCocher}>
                            Tout cocher
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={toutDecocher}>
                            Tout décocher
                        </button>
                        <button className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                            onClick={sauvegarder} disabled={saving}>
                            {saving
                                ? <span className="spinner-border spinner-border-sm" />
                                : <i className="fas fa-save" />}
                            Enregistrer
                        </button>
                    </div>
                </div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                    <i className="fas fa-info-circle me-1 text-primary" />
                    {selection.size} / {config.matieres.length} matière(s) sélectionnée(s)
                </div>
            </div>
            <div className="card-body p-0">
                <div className="row g-0">
                    {/* Divise en 2 colonnes */}
                    {[0, 1].map(col => (
                        <div key={col} className="col-12 col-md-6" style={{ borderRight: col === 0 ? '1px solid #f1f5f9' : 'none' }}>
                            {config.matieres
                                .filter((_, i) => i % 2 === col)
                                .map(m => (
                                    <LigneMatiere key={m.id} matiere={m}
                                        actif={selection.has(m.id)}
                                        onClick={() => toggle(m.id)} />
                                ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
        </div>
    );
};

/* ── Étape 2 : Config par niveau / série ────────────────────────────────────── */
const EtapeNiveaux = ({ config }) => {
    // Sélection : niveauId + serieId (null = tout le niveau, sans distinction de série)
    const [niveauId, setNiveauId]   = useState(null);
    const [serieId,  setSerieId]    = useState(null); // null = config commune au niveau

    const [niveauEdit, setNiveauEdit]     = useState({});
    const [classeEdit, setClasseEdit]     = useState({});
    const [savingNiveau, setSavingNiveau] = useState(false);
    const [savingClasse, setSavingClasse] = useState({});
    const [modalGroupe, setModalGroupe]   = useState(null);
    const [succes, setSucces]             = useState('');
    const [erreur, setErreur]             = useState('');

    // Copies locales mises à jour après chaque save
    const [niveauMatieresLocal, setNiveauMatieresLocal] = useState(config.niveauMatieres);
    const [classeMatieresLocal, setClasseMatieresLocal] = useState(config.classeMatieres);
    // Séries locales (CRUD sans reload)
    const [seriesLocal, setSeriesLocal] = useState(config.series);

    // Clé composite utilisée dans niveauMatieresLocal
    const cleNiveau = niveauId != null ? `${niveauId}_${serieId ?? 'null'}` : null;

    // Matières de l'établissement seulement
    const matieres = config.matieres.filter(m =>
        config.etablissementMatieres.map(Number).includes(m.id)
    );

    // Séries présentes dans les classes du niveau sélectionné
    const seriesDuNiveau = niveauId
        ? [...new Map(
            config.classes
                .filter(c => c.niveau_id === niveauId && c.serie_id != null)
                .map(c => [c.serie_id, seriesLocal.find(s => s.id === c.serie_id)])
                .filter(([, s]) => s)
          ).values()]
        : [];
    const niveauASeries = seriesDuNiveau.length > 0;

    useEffect(() => {
        if (!cleNiveau) return;
        const configNiveau = niveauMatieresLocal[cleNiveau] ?? [];
        const map = {};
        matieres.forEach(m => {
            const existing = configNiveau.find(c => c.matiere_id === m.id);
            map[m.id] = {
                actif:                !!existing,
                obligatoire:          existing ? existing.obligatoire : true,
                coefficient:          existing ? (existing.coefficient ?? 1) : 1,
                groupe_alternatif_id: existing ? existing.groupe_alternatif_id : null,
            };
        });
        setNiveauEdit(map);

        // Classes concernées : si une série est sélectionnée → classes de cette série
        //                       sinon → toutes les classes du niveau sans série
        const classesScope = config.classes.filter(c =>
            c.niveau_id === niveauId &&
            (serieId != null ? c.serie_id === serieId : c.serie_id == null)
        );
        const ce = {};
        classesScope.forEach(cl => {
            const resolutions = classeMatieresLocal[cl.id] ?? [];
            const resMap = {};
            resolutions.forEach(r => {
                if (r.groupe_alternatif_id) resMap[r.groupe_alternatif_id] = r.matiere_id;
            });
            ce[cl.id] = resMap;
        });
        setClasseEdit(ce);
    }, [cleNiveau]);

    const selectNiveau = (id) => {
        setNiveauId(id);
        setSerieId(null); // reset la série à chaque changement de niveau
    };

    const setCoefficient = (matiereId, val) => setNiveauEdit(prev => ({
        ...prev,
        [matiereId]: { ...prev[matiereId], coefficient: val },
    }));

    const toggleActif = (matiereId) => setNiveauEdit(prev => ({
        ...prev,
        [matiereId]: {
            ...prev[matiereId],
            actif: !prev[matiereId].actif,
            groupe_alternatif_id: prev[matiereId].actif ? null : prev[matiereId].groupe_alternatif_id,
        }
    }));

    const toggleObligatoire = (matiereId) => setNiveauEdit(prev => ({
        ...prev,
        [matiereId]: {
            ...prev[matiereId],
            obligatoire: !prev[matiereId].obligatoire,
            groupe_alternatif_id: prev[matiereId].obligatoire ? prev[matiereId].groupe_alternatif_id : null,
        }
    }));

    const setGroupe = (matiereId, groupeId) => setNiveauEdit(prev => ({
        ...prev,
        [matiereId]: { ...prev[matiereId], groupe_alternatif_id: groupeId ? parseInt(groupeId) : null }
    }));

    const saveNiveau = () => {
        setSavingNiveau(true);
        const matieresList = Object.entries(niveauEdit)
            .filter(([, v]) => v.actif)
            .map(([matiereId, v]) => ({
                matiere_id:           parseInt(matiereId),
                obligatoire:          v.obligatoire,
                coefficient:          parseFloat(v.coefficient) || 1,
                groupe_alternatif_id: v.groupe_alternatif_id,
            }));
        api.post(`/config-matieres/niveaux/${niveauId}`, { serie_id: serieId, matieres: matieresList })
            .then(() => {
                setSucces('Configuration sauvegardée.');
                setNiveauMatieresLocal(prev => ({ ...prev, [cleNiveau]: matieresList }));
            })
            .catch((err) => {
                const msg = err.response?.data?.message
                    || Object.values(err.response?.data?.errors ?? {}).flat().join(' ')
                    || 'Erreur lors de la sauvegarde.';
                setErreur(msg);
            })
            .finally(() => setSavingNiveau(false));
    };

    const saveClasse = (classeId) => {
        setSavingClasse(prev => ({ ...prev, [classeId]: true }));
        const resolutions = Object.entries(classeEdit[classeId] ?? {})
            .filter(([, mId]) => !!mId)
            .map(([groupeId, matiereId]) => ({
                groupe_alternatif_id: parseInt(groupeId),
                matiere_id:           parseInt(matiereId),
            }));
        api.post(`/config-matieres/classes/${classeId}`, { resolutions })
            .then(() => {
                setSucces('Résolution de la classe sauvegardée.');
                setClasseMatieresLocal(prev => ({ ...prev, [classeId]: resolutions }));
            })
            .catch(() => setErreur('Erreur lors de la sauvegarde.'))
            .finally(() => setSavingClasse(prev => ({ ...prev, [classeId]: false })));
    };

    const saveGroupe = () => {
        const { id, nom, description } = modalGroupe;
        const req = id
            ? api.put(`/config-matieres/groupes/${id}`, { nom, description })
            : api.post('/config-matieres/groupes', { nom, description });
        req.then(() => { setModalGroupe(null); window.location.reload(); })
           .catch(() => setErreur('Erreur lors de la sauvegarde du groupe.'));
    };

    const deleteGroupe = (id) => {
        if (!window.confirm('Supprimer ce groupe ?')) return;
        api.delete(`/config-matieres/groupes/${id}`)
            .then(() => window.location.reload())
            .catch(() => setErreur('Erreur lors de la suppression.'));
    };

    const niveauSelectionne = config.niveaux.find(n => n.id === niveauId);
    const serieSelectionnee = seriesLocal.find(s => s.id === serieId);

    // Classes affichées dans le panneau 3 (résolution alternatives)
    const classesScope = niveauId
        ? config.classes.filter(c =>
            c.niveau_id === niveauId &&
            (serieId != null ? c.serie_id === serieId : c.serie_id == null)
          )
        : [];

    const groupesUtilises = cleNiveau
        ? [...new Set(
            Object.values(niveauEdit)
                .filter(v => v.actif && !v.obligatoire && v.groupe_alternatif_id)
                .map(v => v.groupe_alternatif_id)
          )].map(gid => config.groupes.find(g => g.id === gid)).filter(Boolean)
        : [];

    const matieresDuGroupe = (groupeId) =>
        matieres.filter(m => niveauEdit[m.id]?.actif &&
            niveauEdit[m.id]?.groupe_alternatif_id === groupeId);

    const nbActifs = Object.values(niveauEdit).filter(v => v.actif).length;

    // Titre du panneau central
    const titreConfig = niveauSelectionne
        ? serieSelectionnee
            ? `${niveauSelectionne.nom_niveau} — Série ${serieSelectionnee.nom}`
            : niveauASeries
                ? `${niveauSelectionne.nom_niveau} — Tronc commun`
                : niveauSelectionne.nom_niveau
        : '';

    if (matieres.length === 0) return (
        <div className="alert alert-warning">
            <i className="fas fa-exclamation-triangle me-2" />
            Aucune matière configurée pour cet établissement. Revenez à l'étape 1.
        </div>
    );

    return (
        <div>
            {erreur && <div className="alert alert-danger alert-dismissible mb-3">
                {erreur}<button className="btn-close" onClick={() => setErreur('')} />
            </div>}
            {succes && <div className="alert alert-success alert-dismissible mb-3">
                {succes}<button className="btn-close" onClick={() => setSucces('')} />
            </div>}

            {/* Barre d'outils : groupes alternatifs */}
            <div className="row g-3 mb-4">
                {/* Groupes alternatifs */}
                <div className="col-12">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                        <div className="card-header bg-white border-0 px-3 pt-3 pb-2 d-flex justify-content-between align-items-center">
                            <span className="fw-semibold" style={{ fontSize: 13 }}>
                                <i className="fas fa-random me-2 text-warning" />
                                Groupes d'options alternatives
                                <span className="text-muted ms-2" style={{ fontSize: 11, fontWeight: 400 }}>
                                    — ex: "LV2" pour regrouper ESP / ALL
                                </span>
                            </span>
                            <button className="btn btn-sm btn-outline-primary"
                                onClick={() => setModalGroupe({ nom: '', description: '' })}>
                                <i className="fas fa-plus me-1" />Nouveau groupe
                            </button>
                        </div>
                        <div className="card-body py-2 d-flex flex-wrap gap-2 align-items-center">
                            {config.groupes.length === 0 && (
                                <span className="text-muted small">Aucun groupe défini</span>
                            )}
                            {config.groupes.map((g, i) => {
                                const col = COULEURS_GROUPES[i % COULEURS_GROUPES.length];
                                return (
                                    <div key={g.id} style={{
                                        padding: '4px 12px', borderRadius: 20,
                                        background: col + '18', border: `1px solid ${col}40`,
                                        display: 'flex', alignItems: 'center', gap: 8,
                                    }}>
                                        <span style={{ fontWeight: 700, color: col }}>{g.nom}</span>
                                        {g.description && <span className="text-muted" style={{ fontSize: 11 }}>{g.description}</span>}
                                        <button className="btn btn-sm p-0 ms-1" style={{ color: col }}
                                            onClick={() => setModalGroupe({ id: g.id, nom: g.nom, description: g.description ?? '' })}>
                                            <i className="fas fa-pen" style={{ fontSize: 11 }} />
                                        </button>
                                        <button className="btn btn-sm p-0" style={{ color: '#dc3545' }}
                                            onClick={() => deleteGroupe(g.id)}>
                                            <i className="fas fa-times" style={{ fontSize: 11 }} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-3">
                {/* Colonne 1 : Niveaux + sous-niveaux séries */}
                <div className="col-12 col-md-3 col-xl-2">
                    <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                        <div className="card-header bg-white border-0 px-3 pt-3 pb-2">
                            <span className="fw-semibold text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                                Niveaux
                            </span>
                        </div>
                        <div className="card-body p-0">
                            {config.niveaux.map(n => {
                                const seriesDuN = [...new Map(
                                    config.classes
                                        .filter(c => c.niveau_id === n.id && c.serie_id != null)
                                        .map(c => [c.serie_id, seriesLocal.find(s => s.id === c.serie_id)])
                                        .filter(([, s]) => s)
                                ).values()];
                                const aSeries  = seriesDuN.length > 0;
                                const actifN   = niveauId === n.id;

                                // Nb total de configs pour ce niveau (toutes clés commençant par n.id_)
                                const nbConfig = Object.keys(niveauMatieresLocal)
                                    .filter(k => k.startsWith(`${n.id}_`) && (niveauMatieresLocal[k] ?? []).length > 0)
                                    .length;

                                return (
                                    <div key={n.id}>
                                        <button onClick={() => selectNiveau(n.id)}
                                            className="w-100 text-start px-3 py-2 border-0"
                                            style={{
                                                background: actifN && !aSeries ? '#1e3a8a' : actifN ? '#f0f4ff' : 'transparent',
                                                color: actifN && !aSeries ? 'white' : '#1a2535',
                                                borderBottom: '1px solid #f1f5f9',
                                            }}>
                                            <div className="fw-semibold d-flex justify-content-between align-items-center">
                                                {n.nom_niveau}
                                                {aSeries && <i className="fas fa-chevron-down" style={{ fontSize: 10, opacity: .5 }} />}
                                            </div>
                                            <div style={{ fontSize: 11, opacity: .7 }}>
                                                {nbConfig > 0
                                                    ? <><i className="fas fa-check-circle me-1" />{nbConfig} config(s)</>
                                                    : 'Non configuré'}
                                            </div>
                                        </button>

                                        {/* Sous-entrées séries si le niveau est sélectionné */}
                                        {actifN && aSeries && (
                                            <>
                                                {/* Tronc commun (serie_id = null) */}
                                                <button onClick={() => setSerieId(null)}
                                                    className="w-100 text-start border-0"
                                                    style={{
                                                        paddingLeft: 24, paddingTop: 6, paddingBottom: 6, paddingRight: 12,
                                                        background: serieId == null ? '#1e3a8a' : '#f8fafc',
                                                        color: serieId == null ? 'white' : '#4a5568',
                                                        borderBottom: '1px solid #f1f5f9',
                                                        fontSize: 12,
                                                    }}>
                                                    <i className="fas fa-layer-group me-2" style={{ opacity: .6 }} />
                                                    Tronc commun
                                                </button>
                                                {seriesDuN.map(s => (
                                                    <button key={s.id} onClick={() => setSerieId(s.id)}
                                                        className="w-100 text-start border-0"
                                                        style={{
                                                            paddingLeft: 24, paddingTop: 6, paddingBottom: 6, paddingRight: 12,
                                                            background: serieId === s.id ? '#1e3a8a' : '#f8fafc',
                                                            color: serieId === s.id ? 'white' : '#4a5568',
                                                            borderBottom: '1px solid #f1f5f9',
                                                            fontSize: 12,
                                                        }}>
                                                        <i className="fas fa-graduation-cap me-2" style={{ opacity: .6 }} />
                                                        Série {s.nom}
                                                        {s.description && <span style={{ opacity: .6, marginLeft: 4 }}>({s.description})</span>}
                                                    </button>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Colonne 2 : Matières */}
                <div className="col-12 col-md-5 col-xl-5">
                    {!niveauId ? (
                        <div className="card border-0 shadow-sm d-flex align-items-center justify-content-center" style={{ borderRadius: 12, minHeight: 300 }}>
                            <div className="text-center text-muted py-5">
                                <i className="fas fa-layer-group fs-2 d-block mb-2 opacity-25" />
                                Sélectionnez un niveau
                            </div>
                        </div>
                    ) : (
                        <div className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                            <div className="card-header bg-white border-0 px-3 pt-3 pb-2 d-flex justify-content-between align-items-center">
                                <div>
                                    <span className="fw-bold">{titreConfig}</span>
                                    <div className="text-muted" style={{ fontSize: 12 }}>
                                        {nbActifs} / {matieres.length} matière(s) enseignée(s)
                                    </div>
                                </div>
                                <button className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                                    onClick={saveNiveau} disabled={savingNiveau}>
                                    {savingNiveau
                                        ? <span className="spinner-border spinner-border-sm" />
                                        : <i className="fas fa-save" />}
                                    Enregistrer
                                </button>
                            </div>
                            <div className="card-body p-0">
                                {matieres.map(m => {
                                    const e = niveauEdit[m.id] ?? { actif: false, obligatoire: true, groupe_alternatif_id: null };
                                    return (
                                        <div key={m.id} style={{ borderBottom: '1px solid #f1f5f9', background: e.actif ? '#f0f7ff' : 'white' }}>
                                            <div className="d-flex align-items-center px-3 py-2"
                                                style={{ cursor: 'pointer', gap: 12 }}
                                                onClick={() => toggleActif(m.id)}>
                                                <div style={{
                                                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                                                    border: `2px solid ${e.actif ? '#1e3a8a' : '#cbd5e1'}`,
                                                    background: e.actif ? '#1e3a8a' : 'white',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    {e.actif && <i className="fas fa-check" style={{ color: 'white', fontSize: 11 }} />}
                                                </div>
                                                <span className="badge bg-light text-dark border" style={{ fontSize: 10, flexShrink: 0 }}>
                                                    {m.abbr_matiere}
                                                </span>
                                                <span style={{ fontWeight: e.actif ? 600 : 400, color: e.actif ? '#1a2535' : '#94a3b8', flex: 1 }}>
                                                    {m.libelle_matiere}
                                                </span>
                                            </div>
                                            {e.actif && (
                                                <div className="d-flex align-items-center gap-3 px-3 pb-2" style={{ marginLeft: 34 }}>
                                                    <label className="d-flex align-items-center gap-2"
                                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                                        onClick={ev => { ev.stopPropagation(); toggleObligatoire(m.id); }}>
                                                        <div style={{
                                                            width: 36, height: 20, borderRadius: 10,
                                                            background: e.obligatoire ? '#198754' : '#e2e8f0',
                                                            position: 'relative', transition: 'background .2s', flexShrink: 0,
                                                        }}>
                                                            <div style={{
                                                                width: 16, height: 16, borderRadius: '50%', background: 'white',
                                                                position: 'absolute', top: 2,
                                                                left: e.obligatoire ? 18 : 2,
                                                                transition: 'left .2s',
                                                                boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                                                            }} />
                                                        </div>
                                                        <span className="text-muted" style={{ fontSize: 12 }}>
                                                            {e.obligatoire ? 'Obligatoire' : 'Option'}
                                                        </span>
                                                    </label>
                                                    <label className="d-flex align-items-center gap-1" style={{ fontSize: 12, color: '#64748b' }}
                                                        onClick={ev => ev.stopPropagation()}>
                                                        <span>Coeff</span>
                                                        <input
                                                            type="number"
                                                            min="0.5" max="20" step="0.5"
                                                            value={e.coefficient ?? 1}
                                                            onChange={ev => setCoefficient(m.id, ev.target.value)}
                                                            style={{ width: 58, fontSize: 12, padding: '1px 4px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                                                        />
                                                    </label>
                                                    {!e.obligatoire && (
                                                        <select className="form-select form-select-sm" style={{ maxWidth: 150 }}
                                                            value={e.groupe_alternatif_id ?? ''}
                                                            onClick={ev => ev.stopPropagation()}
                                                            onChange={ev => setGroupe(m.id, ev.target.value)}>
                                                            <option value="">— Groupe —</option>
                                                            {config.groupes.map(g => (
                                                                <option key={g.id} value={g.id}>{g.nom}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                    {!e.obligatoire && !e.groupe_alternatif_id && (
                                                        <span className="text-warning" style={{ fontSize: 11 }}>
                                                            <i className="fas fa-exclamation-triangle me-1" />Assigner un groupe
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Colonne 3 : Résolution par classe */}
                <div className="col-12 col-md-4 col-xl-5">
                    {!niveauId ? null
                    : nbActifs === 0 ? (
                        <div className="card border-0 shadow-sm" style={{ borderRadius: 12, minHeight: 200 }}>
                            <div className="text-center text-muted py-5">
                                <i className="fas fa-arrow-left fs-2 d-block mb-2 opacity-25" />
                                <div style={{ fontSize: 13 }}>Cochez des matières dans le panneau central</div>
                            </div>
                        </div>
                    ) : groupesUtilises.length === 0 ? (
                        <div className="card border-0 shadow-sm" style={{ borderRadius: 12, minHeight: 200 }}>
                            <div className="text-center text-muted py-5">
                                <i className="fas fa-check-circle text-success fs-2 d-block mb-2 opacity-50" />
                                <div style={{ fontSize: 13 }}>Toutes les matières actives sont obligatoires</div>
                                <div style={{ fontSize: 11 }}>Passez une matière en "Option" pour définir des alternatives par classe</div>
                            </div>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            <div className="text-muted fw-semibold px-1" style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>
                                <i className="fas fa-random me-1 text-warning" />
                                Résolution des options par classe
                            </div>
                            {classesScope.map(cl => (
                                <div key={cl.id} className="card border-0 shadow-sm" style={{ borderRadius: 12 }}>
                                    <div className="card-header bg-white border-0 px-3 pt-3 pb-2 d-flex justify-content-between align-items-center">
                                        <span className="fw-bold">{cl.abbr_classe}</span>
                                        <button className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
                                            onClick={() => saveClasse(cl.id)} disabled={savingClasse[cl.id]}>
                                            {savingClasse[cl.id]
                                                ? <span className="spinner-border spinner-border-sm" />
                                                : <i className="fas fa-save" />}
                                            Enregistrer
                                        </button>
                                    </div>
                                    <div className="card-body pt-0 pb-3 px-3 d-flex flex-column gap-3">
                                        {groupesUtilises.map((g, gi) => {
                                            const col     = COULEURS_GROUPES[gi % COULEURS_GROUPES.length];
                                            const options = matieresDuGroupe(g.id);
                                            const choix   = classeEdit[cl.id]?.[g.id] ?? '';
                                            return (
                                                <div key={g.id}>
                                                    <label className="form-label small fw-semibold mb-1" style={{ color: col }}>
                                                        <i className="fas fa-random me-1" />
                                                        Option {g.nom}
                                                        {g.description && <span className="text-muted ms-1" style={{ fontWeight: 400 }}>({g.description})</span>}
                                                    </label>
                                                    <div className="d-flex gap-2 flex-wrap">
                                                        {options.map(m => (
                                                            <label key={m.id}
                                                                className="d-flex align-items-center gap-2"
                                                                style={{
                                                                    padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
                                                                    border: `1px solid ${parseInt(choix) === m.id ? col : '#dee2e6'}`,
                                                                    background: parseInt(choix) === m.id ? col + '18' : 'white',
                                                                    fontWeight: parseInt(choix) === m.id ? 600 : 400,
                                                                    color: parseInt(choix) === m.id ? col : '#4a5568',
                                                                    userSelect: 'none',
                                                                }}>
                                                                <input type="radio" style={{ display: 'none' }}
                                                                    checked={parseInt(choix) === m.id}
                                                                    onChange={() => setClasseEdit(prev => ({
                                                                        ...prev,
                                                                        [cl.id]: { ...(prev[cl.id] ?? {}), [g.id]: m.id }
                                                                    }))} />
                                                                {m.libelle_matiere}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal groupe */}
            {modalGroupe && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <div className="modal-dialog modal-sm">
                        <div className="modal-content border-0 shadow" style={{ borderRadius: 12 }}>
                            <div className="modal-header border-0 pb-0">
                                <h6 className="modal-title fw-bold">
                                    {modalGroupe.id ? 'Modifier le groupe' : 'Nouveau groupe alternatif'}
                                </h6>
                                <button className="btn-close" onClick={() => setModalGroupe(null)} />
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label small fw-semibold text-muted">Nom *</label>
                                    <input className="form-control form-control-sm" placeholder="ex: LV2"
                                        value={modalGroupe.nom}
                                        onChange={e => setModalGroupe(p => ({ ...p, nom: e.target.value }))} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-semibold text-muted">Description</label>
                                    <input className="form-control form-control-sm" placeholder="ex: Langue vivante 2"
                                        value={modalGroupe.description ?? ''}
                                        onChange={e => setModalGroupe(p => ({ ...p, description: e.target.value }))} />
                                </div>
                            </div>
                            <div className="modal-footer border-0 pt-0">
                                <button className="btn btn-sm btn-secondary" onClick={() => setModalGroupe(null)}>Annuler</button>
                                <button className="btn btn-sm btn-primary" onClick={saveGroupe}
                                    disabled={!modalGroupe.nom.trim()}>
                                    <i className="fas fa-save me-1" />Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ── Composant principal ────────────────────────────────────────────────────── */
export default function ConfigurationMatieres() {
    const [config, setConfig]   = useState(null);
    const [loading, setLoading] = useState(true);
    const [erreur, setErreur]   = useState('');
    const [etape, setEtape]     = useState(1); // 1 = établissement, 2 = niveaux

    const charger = useCallback(() => {
        setLoading(true);
        return api.get('/config-matieres')
            .then(r => { setConfig(r.data); setLoading(false); })
            .catch(() => { setErreur('Impossible de charger la configuration.'); setLoading(false); });
    }, []);

    useEffect(() => { charger(); }, [charger]);

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center py-5">
            <span className="spinner-border text-primary me-2" />Chargement…
        </div>
    );

    const nbEtablissement = config?.etablissementMatieres?.length ?? 0;

    return (
        <div className="container-fluid py-4">
            <div className="mb-4">
                <h4 className="fw-bold mb-1">
                    <i className="fas fa-sliders-h me-2 text-primary" />
                    Configuration des matières
                </h4>
                <p className="text-muted small mb-0">
                    Étape 1 : matières de l'établissement · Étape 2 : programme par niveau et options par classe
                </p>
            </div>

            {erreur && <div className="alert alert-danger alert-dismissible">
                {erreur}<button className="btn-close" onClick={() => setErreur('')} />
            </div>}

            {/* Onglets étapes */}
            <div className="d-flex gap-2 mb-4">
                <button onClick={() => setEtape(1)} style={{
                    borderRadius: 8, padding: '8px 20px', fontWeight: etape === 1 ? 600 : 400,
                    backgroundColor: etape === 1 ? '#1e3a8a' : 'white',
                    color: etape === 1 ? 'white' : '#4a5568',
                    border: etape === 1 ? 'none' : '1px solid #e5e7eb', cursor: 'pointer',
                }}>
                    <i className="fas fa-school me-2" />
                    Étape 1 — Matières de l'établissement
                    {nbEtablissement > 0 && (
                        <span className="ms-2 badge" style={{ background: etape === 1 ? 'rgba(255,255,255,.3)' : '#dbeafe', color: etape === 1 ? 'white' : '#1e40af', fontSize: 11 }}>
                            {nbEtablissement}
                        </span>
                    )}
                </button>
                <button onClick={() => setEtape(2)} style={{
                    borderRadius: 8, padding: '8px 20px', fontWeight: etape === 2 ? 600 : 400,
                    backgroundColor: etape === 2 ? '#1e3a8a' : 'white',
                    color: etape === 2 ? 'white' : '#4a5568',
                    border: etape === 2 ? 'none' : '1px solid #e5e7eb', cursor: 'pointer',
                    opacity: nbEtablissement === 0 ? .5 : 1,
                }}
                    disabled={nbEtablissement === 0}
                    title={nbEtablissement === 0 ? 'Complétez d\'abord l\'étape 1' : ''}>
                    <i className="fas fa-layer-group me-2" />
                    Étape 2 — Config. par niveau et classe
                </button>
            </div>

            {config && etape === 1 && (
                <EtapeEtablissement config={config} onSave={() => charger().then(() => setEtape(2))} />
            )}
            {config && etape === 2 && (
                <EtapeNiveaux config={config} />
            )}
        </div>
    );
}
