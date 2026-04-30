import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const formatDateCode = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}${m}${y.slice(2)}`;
};

const NouveauDevoir = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [classes, setClasses]         = useState([]);
    const [niveaux, setNiveaux]         = useState([]);
    const [matieres, setMatieres]       = useState([]);
    const [typeDevoirs, setTypeDevoirs] = useState([]);
    const [portee, setPortee]           = useState('classe');
    const [periodeInfo, setPeriodeInfo]     = useState(null);
    const [periodeErreur, setPeriodeErreur] = useState('');

    const [form, setForm] = useState({
        code_devoir: '', date_devoir: '', coeff_devoir: '',
        type_devoir_id: '', matiere_id: '',
        classe_id: '', niveau_id: '',
    });

    useEffect(() => {
        api.get('/classesTout').then((res) => setClasses(res.data)).catch(() => toast.error('Erreur de chargement des données.'));
        api.get('/niveaux').then((res) => setNiveaux(res.data)).catch(() => toast.error('Erreur de chargement des données.'));
        api.get('/matieres').then((res) => setMatieres(res.data)).catch(() => toast.error('Erreur de chargement des données.'));
        api.get('/typeDevoirs').then((res) => setTypeDevoirs(res.data)).catch(() => toast.error('Erreur de chargement des données.'));
    }, []);

    // Auto-résolution de la période depuis la date
    useEffect(() => {
        if (!form.date_devoir) { setPeriodeInfo(null); setPeriodeErreur(''); return; }
        api.get('/periodes/parDate', { params: { date: form.date_devoir } })
            .then(({ data }) => {
                if (data) { setPeriodeInfo(data); setPeriodeErreur(''); }
                else { setPeriodeInfo(null); setPeriodeErreur("Cette date n'appartient à aucune période scolaire."); }
            })
            .catch(() => setPeriodeErreur('Impossible de vérifier la période.'));
    }, [form.date_devoir]);

    // Génération automatique du code (type + matière + cible + date JJMMAA)
    useEffect(() => {
        const type    = typeDevoirs.find((t) => String(t.id) === String(form.type_devoir_id));
        const matiere = matieres.find((m) => String(m.id) === String(form.matiere_id));

        let cibleAbbr = '';
        if (portee === 'classe' && form.classe_id) {
            const classe = classes.find((c) => String(c.id) === String(form.classe_id));
            cibleAbbr = classe?.abbr_classe || '';
        } else if (portee === 'niveau' && form.niveau_id) {
            const niveau = niveaux.find((n) => String(n.id) === String(form.niveau_id));
            cibleAbbr = niveau?.abbr_niveau || '';
        }

        if (!type || !matiere || !cibleAbbr) return;

        const parts = [type.code_type_devoir, matiere.abbr_matiere, cibleAbbr];
        const dateCode = formatDateCode(form.date_devoir);
        if (dateCode) parts.push(dateCode);
        const base = parts.join('-');

        api.get(`/devoirs/prochainCode?base=${encodeURIComponent(base)}`)
            .then((res) => setForm((prev) => ({ ...prev, code_devoir: res.data.code })))
            .catch(() => toast.error('Erreur de chargement des données.'));
    }, [form.type_devoir_id, form.matiere_id, form.classe_id, form.niveau_id, form.date_devoir, portee]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handlePorteeChange = (val) => {
        setPortee(val);
        setForm((prev) => ({ ...prev, classe_id: '', niveau_id: '' }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!periodeInfo) {
            toast.error(periodeErreur || "Veuillez choisir une date dans une période scolaire.");
            return;
        }
        const payload = {
            ...form,
            classe_id: portee === 'classe' ? form.classe_id : '',
            niveau_id: portee === 'niveau' ? form.niveau_id : '',
        };
        api.post('/devoirs', payload)
            .then(() => { toast.success('Devoir enregistré avec succès.'); navigate('/Devoirs'); })
            .catch((err) => {
                if (err.response?.data?.errors) {
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                } else {
                    toast.error("Une erreur est survenue lors de l'enregistrement.");
                }
            });
    };

    return (
        <section className="page-wrapper">
            <div className="container bg-light mb-2 border">
                <div className="d-flex justify-content-between mb-2 border">
                    <h2 className="mt-2 container mb-1">Nouveau devoir</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3 justify-content-center">
                        <div className="mb-3 col-md-4">
                            <label className="form-label">Type de devoir</label>
                            <select className="form-select" name="type_devoir_id" value={form.type_devoir_id} onChange={handleChange} required>
                                <option value="">Sélectionner</option>
                                {typeDevoirs.map((t) => (
                                    <option key={t.id} value={t.id}>{t.code_type_devoir} — {t.description_type_devoir}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-3 col-md-4">
                            <label className="form-label">Matière</label>
                            <select className="form-select" name="matiere_id" value={form.matiere_id} onChange={handleChange} required>
                                <option value="">Sélectionner</option>
                                {matieres.map((m) => (
                                    <option key={m.id} value={m.id}>{m.libelle_matiere}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-3 col-md-4">
                            <label className="form-label">Période</label>
                            <div className="form-control bg-white d-flex align-items-center" style={{ minHeight: 38 }}>
                                {periodeInfo ? (
                                    <span className="badge bg-primary fs-6">{periodeInfo.libelle_periode} — {periodeInfo.annee}</span>
                                ) : periodeErreur ? (
                                    <span className="text-danger small">{periodeErreur}</span>
                                ) : (
                                    <span className="text-muted small">Automatique selon la date</span>
                                )}
                            </div>
                        </div>

                        <div className="mb-3 col-md-12">
                            <label className="form-label">Ce devoir concerne</label>
                            <div className="d-flex gap-3">
                                <div className="form-check">
                                    <input className="form-check-input" type="radio" id="portee_classe" checked={portee === 'classe'} onChange={() => handlePorteeChange('classe')} />
                                    <label className="form-check-label" htmlFor="portee_classe">Une classe</label>
                                </div>
                                <div className="form-check">
                                    <input className="form-check-input" type="radio" id="portee_niveau" checked={portee === 'niveau'} onChange={() => handlePorteeChange('niveau')} />
                                    <label className="form-check-label" htmlFor="portee_niveau">Tout un niveau</label>
                                </div>
                            </div>
                        </div>

                        {portee === 'classe' ? (
                            <div className="mb-3 col-md-6">
                                <label className="form-label">Classe</label>
                                <select className="form-select" name="classe_id" value={form.classe_id} onChange={handleChange} required>
                                    <option value="">Sélectionner</option>
                                    {classes.map((c) => (
                                        <option key={c.id} value={c.id}>{c.nom_classe}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="mb-3 col-md-6">
                                <label className="form-label">Niveau</label>
                                <select className="form-select" name="niveau_id" value={form.niveau_id} onChange={handleChange} required>
                                    <option value="">Sélectionner</option>
                                    {niveaux.map((n) => (
                                        <option key={n.id} value={n.id}>{n.nom_niveau}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="mb-3 col-md-6">
                            <label className="form-label">Code du devoir</label>
                            <input type="text" className="form-control" name="code_devoir" value={form.code_devoir} onChange={handleChange} required placeholder="Généré automatiquement" />
                            <div className="form-text text-muted">Généré selon le type, la matière, la cible et la date. Modifiable.</div>
                        </div>

                        <div className="mb-3 col-md-6">
                            <label className="form-label">Date</label>
                            <input type="date" className="form-control" name="date_devoir" value={form.date_devoir} onChange={handleChange} required />
                        </div>
                        <div className="mb-3 col-md-6">
                            <label className="form-label">Coefficient</label>
                            <input type="number" step="0.5" min="0" className="form-control" name="coeff_devoir" value={form.coeff_devoir} onChange={handleChange} required />
                        </div>
                    </fieldset>
                    <div className="d-flex justify-content-end mb-3 gap-2">
                        <NavLink to="/Devoirs" className="btn btn-secondary">Annuler</NavLink>
                        <button type="submit" className="btn btn-primary" disabled={!!periodeErreur}>Enregistrer</button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default NouveauDevoir;
