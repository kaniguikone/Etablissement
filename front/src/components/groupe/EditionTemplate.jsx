import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { centralApi } from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const ONGLETS = [
    { id: 'matieres',      label: 'Matières',          icon: 'fa-book'         },
    { id: 'niveau_series', label: 'Séries par niveau', icon: 'fa-sitemap'      },
    { id: 'coefficients',  label: 'Coefficients',      icon: 'fa-table'        },
    { id: 'chapitres',     label: 'Chapitres',         icon: 'fa-list-ol'      },
    { id: 'periodes',      label: 'Périodes',          icon: 'fa-calendar-alt' },
];

const EditionTemplate = () => {
    const { type } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [chargement, setChargement] = useState(true);
    const [sauvegarde, setSauvegarde] = useState(false);
    const [onglet, setOnglet] = useState('matieres');

    /* ── Données template ── */
    const [meta, setMeta] = useState({});
    const [niveaux, setNiveaux] = useState([]);
    const [series, setSeries] = useState([]);
    const [matieres, setMatieres] = useState([]);
    const [niveauSeries, setNiveauSeries] = useState([]);
    const [niveauMatieres, setNiveauMatieres] = useState([]);
    const [chapitres, setChapitres] = useState([]);
    const [periodesTrimestre, setPeriodesTrimestre] = useState([]);
    const [periodesSemestre, setPeriodesSemestre] = useState([]);

    /* ── Sélecteurs UI ── */
    const [nvmAjouts, setNvmAjouts] = useState({});
    const [nouvelleMatiere, setNouvelleMatiere] = useState({ libelle: '', abbr: '' });
    const [niveauSel, setNiveauSel] = useState(null);
    const [serieSel, setSerieSel] = useState(null);
    const [chapNiveauSel, setChapNiveauSel] = useState('');
    const [chapSerieSel, setChapSerieSel] = useState('');
    const [chapMatiereSel, setChapMatiereSel] = useState('');
    const [nouveauChapitre, setNouveauChapitre] = useState('');

    /* ── Chargement ── */
    useEffect(() => {
        centralApi.get(`/group/templates/${type}`)
            .then(r => {
                const d = r.data;
                const niveauxData = d.niveaux || [];
                setMeta(d.meta || {});
                setNiveaux(niveauxData);
                setSeries(d.series || []);
                setMatieres(d.matieres || []);
                setNiveauMatieres(d.niveau_matieres || []);
                setChapitres(d.chapitres || []);
                setPeriodesTrimestre(d.periodes_trimestre || []);
                setPeriodesSemestre(d.periodes_semestre || []);

                // niveau_series : depuis le JSON ou inferé depuis niveau_matieres
                if (d.niveau_series?.length > 0) {
                    setNiveauSeries(d.niveau_series);
                } else {
                    setNiveauSeries(niveauxData.map(niv => ({
                        niveau: niv.nom_niveau,
                        series: [...new Set(
                            (d.niveau_matieres || [])
                                .filter(nm => nm.niveau === niv.nom_niveau && nm.serie !== null)
                                .map(nm => nm.serie)
                        )].sort(),
                    })));
                }

                const firstNiv = niveauxData[0]?.nom_niveau ?? null;
                setNiveauSel(firstNiv);
                setChapNiveauSel(firstNiv || '');
            })
            .catch(() => toast.error('Impossible de charger le template.'))
            .finally(() => setChargement(false));
    }, [type]);

    /* ── Helpers ── */
    const getSeriesForNiveau = (nom) =>
        niveauSeries.find(ns => ns.niveau === nom)?.series ?? [];

    const groupes = niveaux.map(niv => ({
        nom: niv.nom_niveau,
        abbr: niv.abbr_niveau,
        series: getSeriesForNiveau(niv.nom_niveau),
    }));

    /* ══ Matières ══════════════════════════════════════════════════ */

    const modifierMatiere = (idx, champ, valeur) => {
        if (champ === 'libelle_matiere') {
            const ancien = matieres[idx].libelle_matiere;
            setNiveauMatieres(prev => prev.map(nm =>
                nm.matiere === ancien ? { ...nm, matiere: valeur } : nm));
            setChapitres(prev => prev.map(ch =>
                ch.matiere === ancien ? { ...ch, matiere: valeur } : ch));
        }
        setMatieres(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [champ]: valeur };
            return next;
        });
    };

    const supprimerMatiere = (idx) => {
        const libelle = matieres[idx].libelle_matiere;
        if (!window.confirm(`Supprimer "${libelle}" et toutes ses affectations ?`)) return;
        setMatieres(prev => prev.filter((_, i) => i !== idx));
        setNiveauMatieres(prev => prev.filter(nm => nm.matiere !== libelle));
        setChapitres(prev => prev.filter(ch => ch.matiere !== libelle));
    };

    const ajouterMatiere = () => {
        const libelle = nouvelleMatiere.libelle.trim();
        if (!libelle) return;
        const abbr = nouvelleMatiere.abbr.trim() ||
            libelle.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
        setMatieres(prev => [...prev, { libelle_matiere: libelle, abbr_matiere: abbr }]);
        setNouvelleMatiere({ libelle: '', abbr: '' });
    };

    /* ══ Séries par niveau ═════════════════════════════════════════ */

    const toggleNiveauSerie = (nomNiveau, nomSerie, ajouter) => {
        if (!ajouter) {
            const lignes = niveauMatieres.filter(
                nm => nm.niveau === nomNiveau && nm.serie === nomSerie);
            if (lignes.length > 0 &&
                !window.confirm(`Retirer ${nomSerie} du ${nomNiveau} supprimera ${lignes.length} affectation(s). Continuer ?`))
                return;
            setNiveauMatieres(prev => prev.filter(
                nm => !(nm.niveau === nomNiveau && nm.serie === nomSerie)));
            setChapitres(prev => prev.filter(
                ch => !(ch.niveau === nomNiveau && ch.serie === nomSerie)));
        }
        setNiveauSeries(prev => prev.map(ns =>
            ns.niveau !== nomNiveau ? ns : {
                ...ns,
                series: ajouter
                    ? [...ns.series, nomSerie].sort()
                    : ns.series.filter(s => s !== nomSerie),
            }
        ));
    };

    /* ══ Coefficients ══════════════════════════════════════════════ */

    const modifierNM = (niveau, serie, matiere, champ, valeur) => {
        setNiveauMatieres(prev => prev.map(nm =>
            nm.niveau === niveau && nm.serie === serie && nm.matiere === matiere
                ? { ...nm, [champ]: Number(valeur) }
                : nm
        ));
    };

    const supprimerNM = (niveau, serie, matiere) => {
        setNiveauMatieres(prev => prev.filter(nm =>
            !(nm.niveau === niveau && nm.serie === serie && nm.matiere === matiere)
        ));
    };

    const ajouterNM = (niveau, serie) => {
        const cle = `${niveau}|${serie}`;
        const matiere = nvmAjouts[cle];
        if (!matiere) return;
        setNiveauMatieres(prev => [
            ...prev, { niveau, serie, matiere, coefficient: 1, heures_semaine: 2 }]);
        setNvmAjouts(prev => ({ ...prev, [cle]: '' }));
    };

    /* ══ Chapitres ═════════════════════════════════════════════════ */

    const seriesChapNiveau = getSeriesForNiveau(chapNiveauSel);
    const serieEffectiveChap = seriesChapNiveau.length > 0
        ? (chapSerieSel || null)
        : null;

    const chapitresFiltres = chapitres.filter(ch =>
        ch.niveau === chapNiveauSel &&
        ch.serie === serieEffectiveChap &&
        ch.matiere === chapMatiereSel
    );

    const ajouterChapitre = () => {
        const titre = nouveauChapitre.trim();
        if (!titre || !chapNiveauSel || !chapMatiereSel) return;
        if (seriesChapNiveau.length > 0 && !chapSerieSel) return;
        setChapitres(prev => [...prev, {
            niveau: chapNiveauSel,
            serie: serieEffectiveChap,
            matiere: chapMatiereSel,
            titre,
            ordre: chapitresFiltres.length + 1,
        }]);
        setNouveauChapitre('');
    };

    const supprimerChapitre = (ch) => {
        setChapitres(prev => prev.filter(c => c !== ch));
    };

    /* ══ Périodes ══════════════════════════════════════════════════ */

    const modifierPeriode = (code, idx, champ, valeur) => {
        const setter = code === 'T' ? setPeriodesTrimestre : setPeriodesSemestre;
        setter(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [champ]: valeur };
            return next;
        });
    };

    const supprimerPeriode = (code, idx) => {
        const setter = code === 'T' ? setPeriodesTrimestre : setPeriodesSemestre;
        setter(prev => prev.filter((_, i) => i !== idx));
    };

    const ajouterPeriode = (code) => {
        const setter = code === 'T' ? setPeriodesTrimestre : setPeriodesSemestre;
        const data   = code === 'T' ? periodesTrimestre    : periodesSemestre;
        const n = data.length + 1;
        const prefix = code === 'T' ? 'T' : 'S';
        const label  = code === 'T' ? 'Trimestre' : 'Semestre';
        setter(prev => [...prev, {
            libelle_periode: `${n === 1 ? '1er' : `${n}ème`} ${label}`,
            abbr_libelle_periode: `${prefix}${n}`,
            code_periode: `${prefix}${n}`,
        }]);
    };

    /* ══ Sauvegarde ════════════════════════════════════════════════ */

    const handleSauvegarder = async () => {
        setSauvegarde(true);
        try {
            await centralApi.put(`/group/templates/${type}`, {
                matieres,
                niveau_series:      niveauSeries,
                niveau_matieres:    niveauMatieres,
                chapitres,
                periodes_trimestre: periodesTrimestre,
                periodes_semestre:  periodesSemestre,
            });
            toast.success('Template sauvegardé avec succès.');
        } catch {
            toast.error('Erreur lors de la sauvegarde.');
        } finally {
            setSauvegarde(false);
        }
    };

    if (chargement) return <div className="p-4 text-center text-muted">Chargement…</div>;

    const gActuel = groupes.find(g => g.nom === niveauSel);
    const seriesActuelles = gActuel?.series ?? [];
    const serieCoefSel = seriesActuelles.length > 0 ? serieSel : null;

    /* ══ Render ════════════════════════════════════════════════════ */
    return (
        <div className="container-fluid py-4" style={{ maxWidth: 960 }}>

            {/* En-tête */}
            <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-sm btn-outline-secondary"
                        onClick={() => navigate('/groupe/templates')}>
                        <i className="fas fa-arrow-left me-1" /> Retour
                    </button>
                    <div>
                        <span className="h5 fw-bold mb-0 me-2">{meta.nom}</span>
                        <span className="text-muted small">{meta.description}</span>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={handleSauvegarder} disabled={sauvegarde}>
                    {sauvegarde
                        ? <><span className="spinner-border spinner-border-sm me-2" />Sauvegarde…</>
                        : <><i className="fas fa-save me-2" />Sauvegarder</>}
                </button>
            </div>

            {/* Onglets */}
            <ul className="nav nav-tabs mb-3 flex-wrap">
                {ONGLETS.map(o => (
                    <li key={o.id} className="nav-item">
                        <button className={`nav-link ${onglet === o.id ? 'active' : ''}`}
                            onClick={() => setOnglet(o.id)}>
                            <i className={`fas ${o.icon} me-1`} />{o.label}
                        </button>
                    </li>
                ))}
            </ul>

            {/* ─── Matières ─── */}
            {onglet === 'matieres' && (
                <div className="card shadow-sm">
                    <div className="card-body p-0">
                        <table className="table table-sm table-hover mb-0 align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th style={{ width: '55%' }}>Libellé</th>
                                    <th style={{ width: '30%' }}>Abréviation</th>
                                    <th style={{ width: '15%' }} />
                                </tr>
                            </thead>
                            <tbody>
                                {matieres.map((m, idx) => (
                                    <tr key={idx}>
                                        <td>
                                            <input className="form-control form-control-sm border-0 bg-transparent"
                                                value={m.libelle_matiere}
                                                onChange={e => modifierMatiere(idx, 'libelle_matiere', e.target.value)} />
                                        </td>
                                        <td>
                                            <input className="form-control form-control-sm border-0 bg-transparent"
                                                value={m.abbr_matiere}
                                                onChange={e => modifierMatiere(idx, 'abbr_matiere', e.target.value)} />
                                        </td>
                                        <td className="text-end pe-3">
                                            <button className="btn btn-sm btn-outline-danger border-0"
                                                onClick={() => supprimerMatiere(idx)}>
                                                <i className="fas fa-trash-alt" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                <tr className="table-warning">
                                    <td>
                                        <input className="form-control form-control-sm"
                                            placeholder="Nouvelle matière…"
                                            value={nouvelleMatiere.libelle}
                                            onChange={e => setNouvelleMatiere(p => ({ ...p, libelle: e.target.value }))}
                                            onKeyDown={e => e.key === 'Enter' && ajouterMatiere()} />
                                    </td>
                                    <td>
                                        <input className="form-control form-control-sm" placeholder="ABBR"
                                            value={nouvelleMatiere.abbr}
                                            onChange={e => setNouvelleMatiere(p => ({ ...p, abbr: e.target.value }))}
                                            onKeyDown={e => e.key === 'Enter' && ajouterMatiere()} />
                                    </td>
                                    <td className="text-end pe-3">
                                        <button className="btn btn-sm btn-success" onClick={ajouterMatiere}
                                            disabled={!nouvelleMatiere.libelle.trim()}>
                                            <i className="fas fa-plus" />
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="card-footer text-muted small">
                        Modifier un libellé le répercute dans les coefficients et chapitres.
                    </div>
                </div>
            )}

            {/* ─── Séries par niveau ─── */}
            {onglet === 'niveau_series' && (
                <div className="card shadow-sm">
                    {series.length === 0 ? (
                        <div className="card-body text-center text-muted py-5">
                            <i className="fas fa-info-circle me-2" />
                            Aucune série définie pour ce modèle (collège / primaire).
                        </div>
                    ) : (
                        <div className="card-body p-0">
                            <table className="table table-sm mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: '30%' }} className="ps-3">Niveau</th>
                                        {series.map(s => (
                                            <th key={s.nom} className="text-center">
                                                <div className="fw-semibold">{s.nom}</div>
                                                <div className="text-muted" style={{ fontSize: 10, fontWeight: 400 }}>
                                                    {s.description}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {niveaux.map(niv => {
                                        const seriesNiv = getSeriesForNiveau(niv.nom_niveau);
                                        return (
                                            <tr key={niv.nom_niveau}>
                                                <td className="ps-3 fw-semibold">{niv.nom_niveau}</td>
                                                {series.map(s => (
                                                    <td key={s.nom} className="text-center">
                                                        <input type="checkbox"
                                                            className="form-check-input"
                                                            checked={seriesNiv.includes(s.nom)}
                                                            onChange={e => toggleNiveauSerie(niv.nom_niveau, s.nom, e.target.checked)}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="card-footer text-muted small">
                        Décocher une série pour un niveau supprimera ses affectations de matières et chapitres associés.
                    </div>
                </div>
            )}

            {/* ─── Coefficients ─── */}
            {onglet === 'coefficients' && (
                <div>
                    <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                        <span className="text-muted small fw-semibold" style={{ minWidth: 60 }}>Niveau :</span>
                        <div className="btn-group flex-wrap">
                            {groupes.map(g => (
                                <button key={g.nom} type="button"
                                    className={`btn btn-sm ${niveauSel === g.nom ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => { setNiveauSel(g.nom); setSerieSel(g.series[0] ?? null); }}>
                                    {g.abbr}
                                </button>
                            ))}
                        </div>
                    </div>

                    {seriesActuelles.length > 0 && (
                        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                            <span className="text-muted small fw-semibold" style={{ minWidth: 60 }}>Série :</span>
                            <div className="btn-group flex-wrap">
                                {seriesActuelles.map(s => (
                                    <button key={s} type="button"
                                        className={`btn btn-sm ${serieSel === s ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                        onClick={() => setSerieSel(s)}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {gActuel && (() => {
                        const cle = `${gActuel.nom}|${serieCoefSel}`;
                        const lignes = niveauMatieres.filter(
                            nm => nm.niveau === gActuel.nom && nm.serie === serieCoefSel);
                        const disponibles = matieres.map(m => m.libelle_matiere)
                            .filter(lib => !lignes.some(nm => nm.matiere === lib));
                        return (
                            <div className="card shadow-sm">
                                <div className="card-header fw-semibold d-flex align-items-center"
                                    style={{ background: 'rgba(13,110,253,0.08)' }}>
                                    <i className="fas fa-layer-group me-2 text-primary" />
                                    {gActuel.nom}
                                    {serieCoefSel && <span className="badge bg-secondary ms-2">{serieCoefSel}</span>}
                                    <span className="text-muted fw-normal ms-2 small">{lignes.length} matières</span>
                                </div>
                                <div className="card-body p-0">
                                    <table className="table table-sm mb-0 align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Matière</th>
                                                <th style={{ width: 90 }} className="text-center">Coeff.</th>
                                                <th style={{ width: 90 }} className="text-center">H/sem.</th>
                                                <th style={{ width: 44 }} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lignes.map(nm => (
                                                <tr key={nm.matiere}>
                                                    <td className="ps-3">{nm.matiere}</td>
                                                    <td>
                                                        <input type="number" min={0} max={20}
                                                            className="form-control form-control-sm text-center"
                                                            value={nm.coefficient}
                                                            onChange={e => modifierNM(gActuel.nom, serieCoefSel, nm.matiere, 'coefficient', e.target.value)} />
                                                    </td>
                                                    <td>
                                                        <input type="number" min={0} max={20}
                                                            className="form-control form-control-sm text-center"
                                                            value={nm.heures_semaine}
                                                            onChange={e => modifierNM(gActuel.nom, serieCoefSel, nm.matiere, 'heures_semaine', e.target.value)} />
                                                    </td>
                                                    <td className="text-center">
                                                        <button className="btn btn-sm btn-outline-danger border-0"
                                                            onClick={() => supprimerNM(gActuel.nom, serieCoefSel, nm.matiere)}>
                                                            <i className="fas fa-times" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="table-light">
                                                <td colSpan={3} className="ps-3">
                                                    <select className="form-select form-select-sm"
                                                        value={nvmAjouts[cle] || ''}
                                                        onChange={e => setNvmAjouts(p => ({ ...p, [cle]: e.target.value }))}>
                                                        <option value="">— Ajouter une matière —</option>
                                                        {disponibles.map(lib => (
                                                            <option key={lib} value={lib}>{lib}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="text-center">
                                                    <button className="btn btn-sm btn-success"
                                                        onClick={() => ajouterNM(gActuel.nom, serieCoefSel)}
                                                        disabled={!nvmAjouts[cle]}>
                                                        <i className="fas fa-plus" />
                                                    </button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* ─── Chapitres ─── */}
            {onglet === 'chapitres' && (
                <div>
                    <div className="card shadow-sm mb-3">
                        <div className="card-body">
                            <div className="row g-2">
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold small">Niveau</label>
                                    <select className="form-select form-select-sm"
                                        value={chapNiveauSel}
                                        onChange={e => { setChapNiveauSel(e.target.value); setChapSerieSel(''); setChapMatiereSel(''); }}>
                                        <option value="">— Sélectionner —</option>
                                        {niveaux.map(n => (
                                            <option key={n.nom_niveau} value={n.nom_niveau}>{n.nom_niveau}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold small">Série</label>
                                    <select className="form-select form-select-sm"
                                        value={chapSerieSel}
                                        onChange={e => setChapSerieSel(e.target.value)}
                                        disabled={!chapNiveauSel || seriesChapNiveau.length === 0}>
                                        <option value="">
                                            {seriesChapNiveau.length === 0 ? '(aucune série)' : '— Sélectionner —'}
                                        </option>
                                        {seriesChapNiveau.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-semibold small">Matière</label>
                                    <select className="form-select form-select-sm"
                                        value={chapMatiereSel}
                                        onChange={e => setChapMatiereSel(e.target.value)}
                                        disabled={!chapNiveauSel || (seriesChapNiveau.length > 0 && !chapSerieSel)}>
                                        <option value="">— Sélectionner —</option>
                                        {matieres.map(m => (
                                            <option key={m.libelle_matiere} value={m.libelle_matiere}>{m.libelle_matiere}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {chapNiveauSel && chapMatiereSel && (seriesChapNiveau.length === 0 || chapSerieSel) ? (
                        <div className="card shadow-sm">
                            <div className="card-header fw-semibold d-flex align-items-center"
                                style={{ background: 'rgba(13,110,253,0.08)' }}>
                                <i className="fas fa-list-ol me-2 text-primary" />
                                {chapNiveauSel}
                                {chapSerieSel && <span className="badge bg-secondary ms-2">{chapSerieSel}</span>}
                                <span className="ms-2">— {chapMatiereSel}</span>
                                <span className="text-muted fw-normal ms-2 small">{chapitresFiltres.length} chapitre(s)</span>
                            </div>
                            <div className="card-body p-0">
                                <table className="table table-sm mb-0 align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: 50 }} className="text-center">N°</th>
                                            <th>Titre du chapitre</th>
                                            <th style={{ width: 44 }} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {chapitresFiltres.map((ch) => (
                                            <tr key={`${ch.ordre}-${ch.titre}`}>
                                                <td className="text-center text-muted">{ch.ordre}</td>
                                                <td>
                                                    <input className="form-control form-control-sm border-0 bg-transparent"
                                                        value={ch.titre}
                                                        onChange={e => {
                                                            const idx = chapitres.indexOf(ch);
                                                            setChapitres(prev => {
                                                                const next = [...prev];
                                                                next[idx] = { ...next[idx], titre: e.target.value };
                                                                return next;
                                                            });
                                                        }}
                                                    />
                                                </td>
                                                <td className="text-center">
                                                    <button className="btn btn-sm btn-outline-danger border-0"
                                                        onClick={() => supprimerChapitre(ch)}>
                                                        <i className="fas fa-times" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="table-warning">
                                            <td className="text-center text-muted">{chapitresFiltres.length + 1}</td>
                                            <td>
                                                <input className="form-control form-control-sm"
                                                    placeholder="Titre du nouveau chapitre…"
                                                    value={nouveauChapitre}
                                                    onChange={e => setNouveauChapitre(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && ajouterChapitre()} />
                                            </td>
                                            <td className="text-center">
                                                <button className="btn btn-sm btn-success"
                                                    onClick={ajouterChapitre}
                                                    disabled={!nouveauChapitre.trim()}>
                                                    <i className="fas fa-plus" />
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted py-5">
                            <i className="fas fa-hand-point-up me-2" />
                            Sélectionnez un niveau{seriesChapNiveau.length > 0 ? ', une série' : ''} et une matière.
                        </div>
                    )}
                </div>
            )}

            {/* ─── Périodes ─── */}
            {onglet === 'periodes' && (
                <div className="row g-3">
                    {[
                        { label: 'Trimestriel', data: periodesTrimestre, setter: setPeriodesTrimestre, code: 'T' },
                        { label: 'Semestriel',  data: periodesSemestre,  setter: setPeriodesSemestre,  code: 'S' },
                    ].map(({ label, data, code }) => (
                        <div key={code} className="col-md-6">
                            <div className="card shadow-sm h-100">
                                <div className="card-header fw-semibold d-flex align-items-center"
                                    style={{ background: 'rgba(13,110,253,0.08)' }}>
                                    <i className="fas fa-calendar-alt me-2 text-primary" />
                                    {label}
                                    <span className="badge bg-secondary ms-2">{data.length} période(s)</span>
                                </div>
                                <div className="card-body p-0">
                                    <table className="table table-sm mb-0 align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Libellé</th>
                                                <th style={{ width: 65 }} className="text-center">Abbr.</th>
                                                <th style={{ width: 65 }} className="text-center">Code</th>
                                                <th style={{ width: 40 }} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.map((p, idx) => (
                                                <tr key={idx}>
                                                    <td>
                                                        <input className="form-control form-control-sm border-0 bg-transparent"
                                                            value={p.libelle_periode}
                                                            onChange={e => modifierPeriode(code, idx, 'libelle_periode', e.target.value)} />
                                                    </td>
                                                    <td>
                                                        <input className="form-control form-control-sm border-0 bg-transparent text-center"
                                                            value={p.abbr_libelle_periode}
                                                            onChange={e => modifierPeriode(code, idx, 'abbr_libelle_periode', e.target.value)} />
                                                    </td>
                                                    <td>
                                                        <input className="form-control form-control-sm border-0 bg-transparent text-center"
                                                            value={p.code_periode}
                                                            onChange={e => modifierPeriode(code, idx, 'code_periode', e.target.value)} />
                                                    </td>
                                                    <td className="text-center">
                                                        <button className="btn btn-sm btn-outline-danger border-0"
                                                            onClick={() => supprimerPeriode(code, idx)}>
                                                            <i className="fas fa-times" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="card-footer p-2">
                                    <button className="btn btn-sm btn-outline-primary w-100"
                                        onClick={() => ajouterPeriode(code)}>
                                        <i className="fas fa-plus me-1" />Ajouter une période
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="col-12">
                        <div className="alert alert-info small mb-0">
                            <i className="fas fa-info-circle me-2" />
                            Le type de période (trimestriel ou semestriel) est choisi lors de l'application du modèle à une école.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditionTemplate;
