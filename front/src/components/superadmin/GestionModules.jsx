import { useState, useEffect, useCallback, useMemo } from 'react';
import { centralApi } from '../../api/axios';

const CIBLES = [
    { value: 'tenant', label: 'Établissement' },
    { value: 'groupe', label: 'Groupe' },
];

export default function GestionModules() {
    const [cible, setCible]         = useState('tenant');
    const [tenants, setTenants]     = useState([]);
    const [groupes, setGroupes]     = useState([]);
    const [cibleId, setCibleId]     = useState('');
    const [modules, setModules]     = useState(null); // liste résolue (id, slug, label, parent_id, actif, source)
    const [etats, setEtats]         = useState({});   // slug -> bool (état local, éditable)
    const [chargement, setChargement] = useState(false);
    const [sauvegarde, setSauvegarde] = useState(false);
    const [erreur, setErreur]       = useState('');
    const [succes, setSucces]       = useState('');

    useEffect(() => {
        centralApi.get('/superadmin/tenants').then(r => setTenants(r.data)).catch(() => {});
        centralApi.get('/superadmin/groupes').then(r => setGroupes(r.data)).catch(() => {});
    }, []);

    const charger = useCallback((id, type) => {
        if (!id) return;
        setChargement(true);
        setErreur(''); setSucces('');
        const url = type === 'tenant' ? `/superadmin/tenants/${id}/modules` : `/superadmin/groupes/${id}/modules`;
        centralApi.get(url)
            .then(r => {
                setModules(r.data);
                setEtats(Object.fromEntries(r.data.map(m => [m.slug, m.actif])));
            })
            .catch(() => setErreur('Impossible de charger les modules.'))
            .finally(() => setChargement(false));
    }, []);

    useEffect(() => {
        setModules(null);
        setEtats({});
        if (cibleId) charger(cibleId, cible);
    }, [cibleId, cible, charger]);

    const arbre = useMemo(() => {
        if (!modules) return [];
        return modules
            .filter(m => !m.parent_id)
            .map(p => ({ ...p, enfants: modules.filter(m => m.parent_id === p.id) }));
    }, [modules]);

    const toggleModule = (slug) => setEtats(e => ({ ...e, [slug]: !e[slug] }));

    const toggleParent = (parent) => {
        const tousActifs = parent.enfants.length === 0
            ? !!etats[parent.slug]
            : parent.enfants.every(e => etats[e.slug]);
        const nouvelEtat = !tousActifs;

        setEtats(e => {
            const next = { ...e, [parent.slug]: nouvelEtat };
            parent.enfants.forEach(enfant => { next[enfant.slug] = nouvelEtat; });
            return next;
        });
    };

    const enregistrer = async () => {
        setSauvegarde(true); setErreur(''); setSucces('');
        const url = cible === 'tenant' ? `/superadmin/tenants/${cibleId}/modules` : `/superadmin/groupes/${cibleId}/modules`;
        try {
            await centralApi.put(url, { modules: etats });
            setSucces('Modules mis à jour.');
            charger(cibleId, cible);
        } catch {
            setErreur('Erreur lors de l\'enregistrement.');
        } finally {
            setSauvegarde(false);
        }
    };

    // "Hérité du groupe" / "valeur par défaut" n'a de sens que côté établissement
    // (un override groupe n'a, par définition, pas de source à afficher).
    const badgeSource = (m) => {
        if (cible !== 'tenant' || m.source === 'tenant') return null;
        return m.source === 'groupe' ? 'Hérité du groupe' : 'Valeur par défaut';
    };

    return (
        <div className="container-fluid py-4">
            <div className="mb-4">
                <h4 className="mb-0">Modules activables</h4>
                <small className="text-muted">Choisissez les modules et sous-modules inclus dans l'abonnement d'un établissement ou d'un groupe entier.</small>
            </div>

            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-3">
                    <div className="row g-2 align-items-center">
                        <div className="col-auto">
                            <div className="btn-group btn-group-sm">
                                {CIBLES.map(c => (
                                    <button key={c.value} type="button"
                                        className={`btn ${cible === c.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => { setCible(c.value); setCibleId(''); }}>
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="col-md-5">
                            <select className="form-select form-select-sm" value={cibleId} onChange={e => setCibleId(e.target.value)}>
                                <option value="">— Sélectionner {cible === 'tenant' ? 'un établissement' : 'un groupe'} —</option>
                                {(cible === 'tenant' ? tenants : groupes).map(o => (
                                    <option key={o.id} value={o.id}>{o.nom}{o.code ? ` (${o.code})` : ''}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {!cibleId && (
                <div className="alert alert-info">
                    Sélectionnez un établissement ou un groupe pour gérer ses modules.
                </div>
            )}

            {cibleId && chargement && (
                <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" /></div>
            )}

            {cibleId && !chargement && modules && (
                <div className="card border-0 shadow-sm">
                    <div className="card-body">
                        {erreur && <div className="alert alert-danger py-2 small">{erreur}</div>}
                        {succes && <div className="alert alert-success py-2 small">{succes}</div>}

                        {arbre.map(parent => {
                            const tousActifs = parent.enfants.length === 0
                                ? !!etats[parent.slug]
                                : parent.enfants.every(e => etats[e.slug]);
                            const aucunActif = parent.enfants.length === 0
                                ? !etats[parent.slug]
                                : parent.enfants.every(e => !etats[e.slug]);

                            return (
                                <div key={parent.id} className="mb-3 pb-3 border-bottom">
                                    <div className="form-check">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={tousActifs}
                                            ref={el => { if (el) el.indeterminate = !tousActifs && !aucunActif; }}
                                            onChange={() => toggleParent(parent)}
                                            id={`m-${parent.slug}`}
                                        />
                                        <label className="form-check-label fw-semibold" htmlFor={`m-${parent.slug}`}>
                                            {parent.label}
                                        </label>
                                        {badgeSource(parent) && (
                                            <span className="badge bg-light text-muted border ms-2" style={{ fontSize: 10 }}>
                                                {badgeSource(parent)}
                                            </span>
                                        )}
                                    </div>

                                    {parent.enfants.length > 0 && (
                                        <div className="ms-4 mt-2 row g-2">
                                            {parent.enfants.map(enfant => (
                                                <div key={enfant.id} className="col-md-4">
                                                    <div className="form-check">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={!!etats[enfant.slug]}
                                                            onChange={() => toggleModule(enfant.slug)}
                                                            id={`m-${enfant.slug}`}
                                                        />
                                                        <label className="form-check-label small" htmlFor={`m-${enfant.slug}`}>
                                                            {enfant.label}
                                                        </label>
                                                        {badgeSource(enfant) && (
                                                            <span className="badge bg-light text-muted border ms-1" style={{ fontSize: 10 }}>
                                                                {badgeSource(enfant)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <div className="d-flex justify-content-end mt-3">
                            <button className="btn btn-primary" onClick={enregistrer} disabled={sauvegarde}>
                                {sauvegarde
                                    ? <><span className="spinner-border spinner-border-sm me-2" />Enregistrement…</>
                                    : 'Enregistrer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
