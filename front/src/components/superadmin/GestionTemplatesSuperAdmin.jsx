import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { centralApi as axios } from '../../api/axios';

const ANNEE_COURANTE = (() => {
    const m = new Date().getMonth();
    const y = new Date().getFullYear();
    return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
})();

const GestionTemplatesSuperAdmin = () => {
    const navigate = useNavigate();

    const [tenants,    setTenants]    = useState([]);
    const [templates,  setTemplates]  = useState([]);
    const [chargement, setChargement] = useState(true);
    const [envoi,      setEnvoi]      = useState(false);
    const [succes,     setSucces]     = useState('');
    const [erreur,     setErreur]     = useState('');

    const [tenantId,     setTenantId]     = useState('');
    const [templateType, setTemplateType] = useState('');
    const [annee,        setAnnee]        = useState(ANNEE_COURANTE);
    const [periodesType, setPeriodesType] = useState('trimestre');
    const [resultat,     setResultat]     = useState(null);

    useEffect(() => {
        Promise.all([
            axios.get('/superadmin/tenants'),
            axios.get('/superadmin/templates'),
        ]).then(([r1, r2]) => {
            setTenants(r1.data);
            setTemplates(r2.data);
        }).catch(() => setErreur('Impossible de charger les données.'))
          .finally(() => setChargement(false));
    }, []);

    const appliquer = async (e) => {
        e.preventDefault();
        if (!tenantId || !templateType || !annee) return;
        setEnvoi(true); setResultat(null); setSucces(''); setErreur('');
        try {
            const r = await axios.post(`/superadmin/tenants/${tenantId}/apply-template`, {
                type: templateType, annee, periodes_type: periodesType,
            });
            setResultat(r.data);
            setSucces('Modèle appliqué avec succès !');
        } catch (err) {
            setErreur(err.response?.data?.message || 'Erreur lors de l\'application du modèle.');
        } finally {
            setEnvoi(false);
        }
    };

    if (chargement) return (
        <section className="page-wrapper">
            <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        </section>
    );

    const tenantSel = tenants.find(t => t.id === tenantId);

    return (
        <section className="page-wrapper">
            <div className="container-fluid">
                <h4 className="mb-1"><i className="fas fa-layer-group me-2 text-primary" />Modèles de type d'établissement</h4>
                <p className="text-muted mb-4">
                    Pré-remplissez un établissement avec les niveaux, matières, séries et périodes du système éducatif ivoirien.
                </p>

                {succes && <div className="alert alert-success py-2 small mb-3"><i className="fas fa-check-circle me-2" />{succes}</div>}
                {erreur && <div className="alert alert-danger py-2 small mb-3"><i className="fas fa-exclamation-circle me-2" />{erreur}</div>}

                <div className="row g-4">
                    {/* ── Formulaire ── */}
                    <div className="col-lg-7">
                        <div className="card shadow-sm">
                            <div className="card-body p-4">
                                <form onSubmit={appliquer}>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Établissement</label>
                                        <select className="form-select" value={tenantId}
                                            onChange={e => setTenantId(e.target.value)} required>
                                            <option value="">— Sélectionner un établissement —</option>
                                            {tenants.map(t => (
                                                <option key={t.id} value={t.id}>
                                                    {t.nom || t.id} {t.code ? `(${t.code})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Modèle</label>
                                        <div className="row g-2">
                                            {templates.map(t => (
                                                <div key={t.type} className="col-md-6">
                                                    <div className={`border rounded p-3 ${templateType === t.type ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => setTemplateType(t.type)}>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <input type="radio" checked={templateType === t.type}
                                                                onChange={() => setTemplateType(t.type)}
                                                                className="form-check-input mt-0" />
                                                            <div className="flex-grow-1">
                                                                <div className="fw-semibold">{t.nom}</div>
                                                                <div className="text-muted small">{t.description}</div>
                                                            </div>
                                                            <button type="button"
                                                                className="btn btn-sm btn-outline-secondary"
                                                                onClick={ev => { ev.stopPropagation(); navigate(`/superadmin/templates/${t.type}`); }}
                                                                title="Modifier le modèle">
                                                                <i className="fas fa-edit" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="row g-3 mb-4">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Année scolaire</label>
                                            <input type="text" className="form-control"
                                                value={annee} onChange={e => setAnnee(e.target.value)}
                                                placeholder="2024-2025" pattern="\d{4}-\d{4}" required />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Type de périodes</label>
                                            <select className="form-select" value={periodesType}
                                                onChange={e => setPeriodesType(e.target.value)}>
                                                <option value="trimestre">Trimestriel (T1 / T2 / T3)</option>
                                                <option value="semestre">Semestriel (S1 / S2)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <button type="submit" className="btn btn-primary"
                                        disabled={!tenantId || !templateType || !annee || envoi}>
                                        {envoi
                                            ? <><span className="spinner-border spinner-border-sm me-2" />Application en cours…</>
                                            : <><i className="fas fa-magic me-2" />Appliquer le modèle</>
                                        }
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* ── Résultat ── */}
                    <div className="col-lg-5">
                        {resultat && (
                            <div className="card border-success shadow-sm">
                                <div className="card-header bg-success text-white fw-semibold">
                                    <i className="fas fa-check-circle me-2" />
                                    Appliqué — {tenantSel?.nom || tenantId}
                                </div>
                                <div className="card-body p-0">
                                    <table className="table table-sm mb-0">
                                        <thead className="table-light">
                                            <tr><th>Élément</th><th className="text-center">Créés</th></tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(resultat.stats ?? {}).map(([k, v]) => (
                                                <tr key={k}>
                                                    <td className="text-capitalize">{k.replace(/_/g, ' ')}</td>
                                                    <td className="text-center">
                                                        <span className={`badge ${v > 0 ? 'bg-success' : 'bg-secondary'}`}>{v}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="card-footer text-muted small">
                                    Les éléments déjà existants n'ont pas été modifiés.
                                </div>
                            </div>
                        )}

                        <div className="card shadow-sm mt-3">
                            <div className="card-header fw-semibold small">
                                <i className="fas fa-info-circle me-2 text-primary" />À quoi servent les modèles ?
                            </div>
                            <div className="card-body small text-muted">
                                <ul className="mb-0 ps-3" style={{ lineHeight: 1.8 }}>
                                    <li>Pré-remplissent les niveaux (6e, 5e…, Tle)</li>
                                    <li>Créent les matières avec coefficients officiels</li>
                                    <li>Configurent les séries (A, C, D…) pour les lycées</li>
                                    <li>Génèrent les périodes de l'année scolaire</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default GestionTemplatesSuperAdmin;
