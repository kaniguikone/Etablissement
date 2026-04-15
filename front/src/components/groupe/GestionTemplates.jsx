import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { centralApi } from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const ANNEE_COURANTE = (() => {
    const m = new Date().getMonth(); // 0-11
    const y = new Date().getFullYear();
    return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
})();

const GestionTemplates = () => {
    const { toast } = useToast();
    const navigate = useNavigate();

    const [ecoles,     setEcoles]     = useState([]);
    const [templates,  setTemplates]  = useState([]);
    const [chargement, setChargement] = useState(true);
    const [envoi,      setEnvoi]      = useState(false);

    const [ecoleId,      setEcoleId]      = useState('');
    const [templateType, setTemplateType] = useState('');
    const [annee,        setAnnee]        = useState(ANNEE_COURANTE);
    const [periodesType, setPeriodesType] = useState('trimestre');

    const [resultat, setResultat] = useState(null);

    useEffect(() => {
        Promise.all([
            centralApi.get('/group/ecoles'),
            centralApi.get('/group/templates'),
        ]).then(([r1, r2]) => {
            setEcoles(r1.data);
            setTemplates(r2.data);
        }).catch(() => toast.error('Impossible de charger les données.'))
          .finally(() => setChargement(false));
    }, []);

    const handleAppliquer = async (e) => {
        e.preventDefault();
        if (!ecoleId || !templateType || !annee) return;
        setEnvoi(true);
        setResultat(null);
        try {
            const r = await centralApi.post(`/group/ecoles/${ecoleId}/apply-template`, {
                type: templateType,
                annee,
                periodes_type: periodesType,
            });
            setResultat(r.data);
            toast.success('Template appliqué avec succès !');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erreur lors de l\'application du template.');
        } finally {
            setEnvoi(false);
        }
    };

    if (chargement) return <div className="p-4 text-center text-muted">Chargement…</div>;

    const ecoleSel = ecoles.find(e => e.id === ecoleId);

    return (
        <div className="container-fluid py-4" style={{ maxWidth: 800 }}>
            <h4 className="mb-1 fw-bold">Modèles de données scolaires</h4>
            <p className="text-muted mb-4">
                Pré-remplissez une école avec les niveaux, matières, séries, coefficients et périodes
                standards du système éducatif ivoirien.
            </p>

            <div className="card shadow-sm">
                <div className="card-body p-4">
                    <form onSubmit={handleAppliquer}>

                        {/* École */}
                        <div className="mb-3">
                            <label className="form-label fw-semibold">École</label>
                            <select
                                className="form-select"
                                value={ecoleId}
                                onChange={e => setEcoleId(e.target.value)}
                                required
                            >
                                <option value="">— Sélectionner une école —</option>
                                {ecoles.map(ec => (
                                    <option key={ec.id} value={ec.id}>{ec.name || ec.id}</option>
                                ))}
                            </select>
                        </div>

                        {/* Template */}
                        <div className="mb-3">
                            <label className="form-label fw-semibold">Modèle</label>
                            <div className="row g-2">
                                {templates.map(t => (
                                    <div key={t.type} className="col-md-6">
                                        <div
                                            className={`border rounded p-3 ${templateType === t.type ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setTemplateType(t.type)}
                                        >
                                            <div className="d-flex align-items-center gap-2">
                                                <input
                                                    type="radio"
                                                    checked={templateType === t.type}
                                                    onChange={() => setTemplateType(t.type)}
                                                    className="form-check-input mt-0"
                                                />
                                                <div className="flex-grow-1">
                                                    <div className="fw-semibold">{t.nom}</div>
                                                    <div className="text-muted small">{t.description}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-secondary"
                                                    onClick={e => { e.stopPropagation(); navigate(`/groupe/templates/${t.type}`); }}
                                                    title="Modifier le modèle"
                                                >
                                                    <i className="fas fa-edit" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Année + Périodes */}
                        <div className="row g-3 mb-4">
                            <div className="col-md-6">
                                <label className="form-label fw-semibold">Année scolaire</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={annee}
                                    onChange={e => setAnnee(e.target.value)}
                                    placeholder="2024-2025"
                                    pattern="\d{4}-\d{4}"
                                    required
                                />
                                <div className="form-text">Format : AAAA-AAAA</div>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-semibold">Type de périodes</label>
                                <select
                                    className="form-select"
                                    value={periodesType}
                                    onChange={e => setPeriodesType(e.target.value)}
                                >
                                    <option value="trimestre">Trimestriel (T1 / T2 / T3)</option>
                                    <option value="semestre">Semestriel (S1 / S2)</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!ecoleId || !templateType || !annee || envoi}
                        >
                            {envoi
                                ? <><span className="spinner-border spinner-border-sm me-2" />Application en cours…</>
                                : <><i className="fas fa-magic me-2" />Appliquer le modèle</>
                            }
                        </button>
                    </form>
                </div>
            </div>

            {/* Résultat */}
            {resultat && (
                <div className="card mt-4 border-success shadow-sm">
                    <div className="card-header bg-success text-white fw-semibold">
                        <i className="fas fa-check-circle me-2" />
                        Modèle appliqué — {ecoleSel?.name || ecoleId}
                    </div>
                    <div className="card-body p-0">
                        <table className="table table-sm mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Élément</th>
                                    <th className="text-center">Créés</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(resultat.stats).map(([k, v]) => (
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
                        Les éléments déjà existants n'ont pas été modifiés (pas de doublon).
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionTemplates;
