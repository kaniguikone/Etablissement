import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const normaliserNiveau = (abbr) => {
    if (!abbr) return '';
    return abbr
        .toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace('IEME', 'EME');
};

const genererNoms = (niveaux, series, { niveau_id, serie_id, num_classe }) => {
    const niveau = niveaux.find(n => String(n.id) === String(niveau_id));
    const serie  = series.find(s => String(s.id) === String(serie_id));
    if (!niveau || !num_classe) return { nom_classe: '', abbr_classe: '' };

    const nomNiv  = niveau.nom_niveau;
    const codeNiv = normaliserNiveau(niveau.abbr_niveau ?? niveau.nom_niveau);

    if (serie) {
        return {
            nom_classe:  `${nomNiv} ${serie.nom}${num_classe}`,
            abbr_classe: `${codeNiv} ${serie.nom}${num_classe}`,
        };
    }
    return {
        nom_classe:  `${nomNiv} ${num_classe}`,
        abbr_classe: `${codeNiv}-${num_classe}`,
    };
};

const NouvelleClasse = () => {
    const { toast }   = useToast();
    const navigate    = useNavigate();
    const [niveaux, setNiveaux]         = useState([]);
    const [enseignants, setEnseignants] = useState([]);
    const [series, setSeries]           = useState([]);
    const [classesNiveau, setClassesNiveau] = useState([]); // classes existantes du niveau
    const [nomModifie, setNomModifie]   = useState(false);
    const [form, setForm] = useState({
        num_classe: '', nom_classe: '', abbr_classe: '', niveau_id: '', serie_id: '',
        salle_classe: '', effectif_max_classe: '', professeur_principal_id: '',
    });

    useEffect(() => {
        api.get('/niveaux').then(r => setNiveaux(r.data)).catch(console.error);
        api.get('/enseignantsTout').then(r => setEnseignants(r.data)).catch(console.error);
        api.get('/config-matieres').then(r => setSeries(r.data.series ?? [])).catch(() => {});
    }, []);

    // Recalcule le prochain numéro selon niveau + série
    const calcProchainNum = (classesDuNiveau, serieId) => {
        const scope = classesDuNiveau.filter(c =>
            serieId ? String(c.serie_id) === String(serieId) : !c.serie_id
        );
        const nums = scope.map(c => parseInt(c.num_classe)).filter(n => !isNaN(n));
        return nums.length > 0 ? Math.max(...nums) + 1 : 1;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let next = { ...form, [name]: value };

        if (name === 'niveau_id') {
            // Recharger les classes du niveau et recalculer le numéro
            next.serie_id  = '';
            next.num_classe = '';
            next.nom_classe = '';
            next.abbr_classe = '';
            setNomModifie(false);
            setClassesNiveau([]);
            if (value) {
                api.get(`/classesNiveaux/${value}`).then(r => {
                    const classes = r.data;
                    setClassesNiveau(classes);
                    const num = calcProchainNum(classes, '');
                    setForm(prev => {
                        const updated = { ...prev, num_classe: num };
                        const gen = genererNoms(niveaux, series, updated);
                        return { ...updated, ...gen };
                    });
                }).catch(console.error);
            }
        } else if (name === 'serie_id') {
            // Recalculer le numéro selon la nouvelle série
            const num = calcProchainNum(classesNiveau, value);
            next.num_classe = num;
            if (!nomModifie) {
                const gen = genererNoms(niveaux, series, { ...next, num_classe: num });
                next.nom_classe  = gen.nom_classe;
                next.abbr_classe = gen.abbr_classe;
            }
        } else if (name === 'num_classe') {
            if (!nomModifie) {
                const gen = genererNoms(niveaux, series, next);
                next.nom_classe  = gen.nom_classe;
                next.abbr_classe = gen.abbr_classe;
            }
        } else if (name === 'nom_classe' || name === 'abbr_classe') {
            setNomModifie(true);
        }

        setForm(next);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        api.post('/classes', form)
            .then(() => { toast.success('Classe enregistrée avec succès.'); navigate('/Classes'); })
            .catch((err) => {
                if (err.response?.data?.errors)
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                else toast.error("Une erreur est survenue lors de l'enregistrement.");
            });
    };

    const autoLabel = (champ) => !nomModifie && form[champ] && (
        <span className="text-muted ms-1" style={{ fontSize: 11 }}>
            <i className="fas fa-magic me-1" />auto
        </span>
    );

    return (
        <section className="page-wrapper">
            <div className="container bg-light mb-2 border">
                <div className="d-flex justify-content-between mb-2 border">
                    <h2 className="mt-2 container mb-1">Nouvelle classe</h2>
                </div>
                <form onSubmit={handleSubmit}>
                    <fieldset className="row g-3">

                        {/* ── 1. Niveau (en premier) ── */}
                        <div className="col-md-4">
                            <label className="form-label">Niveau *</label>
                            <select className="form-select form-select-sm" name="niveau_id" value={form.niveau_id} onChange={handleChange} required>
                                <option value="">Sélectionner un niveau</option>
                                {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom_niveau}</option>)}
                            </select>
                        </div>

                        {/* ── 2. Série (optionnelle) ── */}
                        <div className="col-md-4">
                            <label className="form-label">Série <span className="text-muted">(optionnelle)</span></label>
                            <select className="form-select form-select-sm" name="serie_id" value={form.serie_id} onChange={handleChange} disabled={!form.niveau_id}>
                                <option value="">— Aucune série —</option>
                                {series.map(s => <option key={s.id} value={s.id}>{s.nom}{s.description ? ` — ${s.description}` : ''}</option>)}
                            </select>
                        </div>

                        {/* ── 3. Numéro (auto, éditable) ── */}
                        <div className="col-md-4">
                            <label className="form-label">
                                Numéro *
                                {form.num_classe && (
                                    <span className="text-muted ms-1" style={{ fontSize: 11 }}>
                                        <i className="fas fa-magic me-1" />auto
                                    </span>
                                )}
                            </label>
                            <input type="number" min="1" className="form-control form-control-sm"
                                name="num_classe" value={form.num_classe} onChange={handleChange}
                                disabled={!form.niveau_id} required />
                        </div>

                        {/* ── 4. Nom (auto-généré) ── */}
                        <div className="col-md-4">
                            <label className="form-label">Nom de la classe * {autoLabel('nom_classe')}</label>
                            <input type="text" className="form-control form-control-sm"
                                name="nom_classe" value={form.nom_classe} onChange={handleChange} required />
                        </div>

                        {/* ── 5. Abréviation (auto-générée) ── */}
                        <div className="col-md-4">
                            <label className="form-label">Abréviation * {autoLabel('abbr_classe')}</label>
                            <input type="text" className="form-control form-control-sm"
                                name="abbr_classe" value={form.abbr_classe} onChange={handleChange} required />
                        </div>

                        {/* ── Autres champs ── */}
                        <div className="col-md-4">
                            <label className="form-label">Salle</label>
                            <input type="text" className="form-control form-control-sm" name="salle_classe"
                                value={form.salle_classe} onChange={handleChange} placeholder="Ex: Salle A1" />
                        </div>
                        <div className="col-md-4">
                            <label className="form-label">Effectif maximum</label>
                            <input type="number" className="form-control form-control-sm" name="effectif_max_classe"
                                value={form.effectif_max_classe} onChange={handleChange} min="1" />
                        </div>
                        <div className="col-md-8">
                            <label className="form-label">Professeur principal</label>
                            <select className="form-select form-select-sm" name="professeur_principal_id"
                                value={form.professeur_principal_id} onChange={handleChange}>
                                <option value="">Aucun</option>
                                {enseignants.map(e => (
                                    <option key={e.id} value={e.id}>{e.nom_enseignant} {e.prenoms_enseignant}</option>
                                ))}
                            </select>
                        </div>

                    </fieldset>
                    <div className="d-flex justify-content-end mb-3 gap-2 mt-3">
                        <NavLink to="/Classes" className="btn btn-secondary">Annuler</NavLink>
                        <button type="submit" className="btn btn-primary">Enregistrer</button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default NouvelleClasse;
