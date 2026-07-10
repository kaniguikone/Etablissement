import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const HANDICAPS = [
    ['moteur','Moteur'], ['malvoyant','Malvoyant'], ['malentendant','Malentendant'],
    ['albinisme','Albinisme'], ['nanisme','Nanisme'], ['begayement','Bégaiement'], ['autiste','Autiste'],
];

const NouvelEleve = () => {
    const { toast }  = useToast();
    const navigate   = useNavigate();
    const [classes, setClasses] = useState([]);
    const [preview, setPreview] = useState(null);
    const [photo, setPhoto]     = useState(null);
    const [form, setForm] = useState({
        matricule_eleve: '', nom_eleve: '', prenoms_eleve: '',
        date_naissance_eleve: '', genre_eleve: '',
        lieu_naissance_eleve: '', nationalite_eleve: '', adresse_eleve: '',
        classe_id: '',
        langue2: '', statut_bourse: 'non_boursier', est_affecte: false,
        types_handicap: [], statut_orphelin: '',
    });

    useEffect(() => {
        api.get('/classesTout').then((r) => setClasses(r.data)).catch(() => toast.error('Erreur de chargement des données.'));
    }, []);

    const handleChange = (e) => {
        const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        if (e.target.name === 'est_affecte' && !val) {
            setForm({ ...form, est_affecte: false, statut_bourse: 'non_boursier' });
            return;
        }
        setForm({ ...form, [e.target.name]: val });
    };

    const handleHandicap = (value, checked) => {
        setForm(f => ({
            ...f,
            types_handicap: checked
                ? [...f.types_handicap, value]
                : f.types_handicap.filter(h => h !== value),
        }));
    };

    const handlePhoto = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPhoto(file);
        setPreview(URL.createObjectURL(file));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = new FormData();
        Object.entries(form).forEach(([k, v]) => data.append(k, v));
        if (photo) data.append('photo_eleve', photo);
        api.post('/eleves', data, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then(() => { toast.success('Élève enregistré avec succès.'); navigate('/Eleves'); })
            .catch((err) => {
                if (err.response?.data?.errors)
                    toast.error(Object.values(err.response.data.errors).flat().join(' '));
                else toast.error("Une erreur est survenue lors de l'enregistrement.");
            });
    };

    return (
        <div className="page-wrapper">

            {/* En-tête */}
            <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <h4 className="mb-0 fw-bold">
                    <i className="fas fa-user-plus me-2 text-primary" />Nouvel élève
                </h4>
                <NavLink to="/Eleves" className="btn btn-sm btn-outline-secondary">
                    <i className="fas fa-arrow-left me-1" />Retour à la liste
                </NavLink>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="row g-3 align-items-stretch mb-3">

                    {/* ── Colonne gauche : Identité ── */}
                    <div className="col-xl-6">
                        <div className="card h-100 border-0 shadow-sm">
                            <div className="card-header py-2 px-3 d-flex align-items-center gap-2"
                                style={{ background: '#e8f0fe', borderBottom: '2px solid #c2d3fb' }}>
                                <i className="fas fa-id-card text-primary" />
                                <span className="fw-semibold text-primary">Identité &amp; Coordonnées</span>
                            </div>
                            <div className="card-body p-3">

                                {/* Photo */}
                                <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
                                    <div className="rounded-circle border border-2 d-flex align-items-center justify-content-center overflow-hidden bg-light flex-shrink-0"
                                        style={{ width: 68, height: 68 }}>
                                        {preview
                                            ? <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : <i className="fas fa-user-circle fa-2x text-secondary" />}
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="small fw-medium mb-1">Photo <span className="text-muted fw-normal">(optionnel)</span></div>
                                        <input type="file" className="form-control form-control-sm" accept="image/*" onChange={handlePhoto} />
                                        <div className="form-text">JPG, PNG — max 2 Mo</div>
                                    </div>
                                </div>

                                <div className="row g-2">
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium mb-1">Matricule <span className="text-danger">*</span></label>
                                        <input type="text" className="form-control form-control-sm" name="matricule_eleve" value={form.matricule_eleve} onChange={handleChange} required />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium mb-1">Nom <span className="text-danger">*</span></label>
                                        <input type="text" className="form-control form-control-sm" name="nom_eleve" value={form.nom_eleve} onChange={handleChange} required />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium mb-1">Prénoms <span className="text-danger">*</span></label>
                                        <input type="text" className="form-control form-control-sm" name="prenoms_eleve" value={form.prenoms_eleve} onChange={handleChange} required />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium mb-1">Date de naissance <span className="text-danger">*</span></label>
                                        <input type="date" className="form-control form-control-sm" name="date_naissance_eleve" value={form.date_naissance_eleve} onChange={handleChange} required />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium mb-1">Genre</label>
                                        <select className="form-select form-select-sm" name="genre_eleve" value={form.genre_eleve} onChange={handleChange}>
                                            <option value="">— Sélectionner</option>
                                            <option value="M">Masculin</option>
                                            <option value="F">Féminin</option>
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium mb-1">Lieu de naissance</label>
                                        <input type="text" className="form-control form-control-sm" name="lieu_naissance_eleve" value={form.lieu_naissance_eleve} onChange={handleChange} />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-medium mb-1">Nationalité</label>
                                        <input type="text" className="form-control form-control-sm" name="nationalite_eleve" value={form.nationalite_eleve} onChange={handleChange} />
                                    </div>
                                    <div className="col-md-8">
                                        <label className="form-label fw-medium mb-1">Adresse</label>
                                        <input type="text" className="form-control form-control-sm" name="adresse_eleve" value={form.adresse_eleve} onChange={handleChange} />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label fw-medium mb-1">Classe <span className="text-danger">*</span></label>
                                        <select className="form-select form-select-sm" name="classe_id" value={form.classe_id} onChange={handleChange} required>
                                            <option value="">— Sélectionner une classe</option>
                                            {classes.map((c) => <option key={c.id} value={c.id}>{c.nom_classe}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Colonne droite : Profil ── */}
                    <div className="col-xl-6">
                        <div className="card h-100 border-0 shadow-sm">
                            <div className="card-header py-2 px-3 d-flex align-items-center gap-2"
                                style={{ background: '#e8f5e9', borderBottom: '2px solid #a5d6a7' }}>
                                <i className="fas fa-graduation-cap text-success" />
                                <span className="fw-semibold text-success">Profil scolaire &amp; Situation personnelle</span>
                            </div>
                            <div className="card-body p-3 d-flex flex-column gap-3">

                                <div className="row g-2">
                                    <div className="col-md-6">
                                        <label className="form-label fw-medium mb-1">Langue 2</label>
                                        <select className="form-select form-select-sm" name="langue2" value={form.langue2} onChange={handleChange}>
                                            <option value="">— Non renseigné</option>
                                            <option value="espagnol">Espagnol</option>
                                            <option value="allemand">Allemand</option>
                                            <option value="autre">Autre</option>
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-medium mb-1">Statut orphelin</label>
                                        <select className="form-select form-select-sm" name="statut_orphelin" value={form.statut_orphelin} onChange={handleChange}>
                                            <option value="">— Non concerné</option>
                                            <option value="pere">Orphelin de père</option>
                                            <option value="mere">Orphelin de mère</option>
                                            <option value="les_deux">Orphelin des deux parents</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Handicaps */}
                                <div>
                                    <div className="fw-medium mb-2 small text-uppercase text-muted" style={{ letterSpacing: '.05em' }}>Handicap(s)</div>
                                    <div className="rounded border p-2 bg-light d-flex flex-wrap gap-2">
                                        {HANDICAPS.map(([v, l]) => (
                                            <div key={v} className="form-check form-check-inline mb-0">
                                                <input className="form-check-input" type="checkbox" id={`h_${v}`}
                                                    checked={form.types_handicap.includes(v)}
                                                    onChange={e => handleHandicap(v, e.target.checked)} />
                                                <label className="form-check-label" htmlFor={`h_${v}`}>{l}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Situations spéciales */}
                                <div>
                                    <div className="fw-medium mb-2 small text-uppercase text-muted" style={{ letterSpacing: '.05em' }}>Situations spéciales</div>
                                    <div className="rounded border p-2 bg-light d-flex gap-4">
                                        <div className="form-check mb-0">
                                            <input className="form-check-input" type="checkbox" id="est_affecte" name="est_affecte" checked={form.est_affecte} onChange={handleChange} />
                                            <label className="form-check-label" htmlFor="est_affecte">Affecté de l'État</label>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <label className="form-label mb-0 small" htmlFor="statut_bourse">Statut bourse</label>
                                            <select className="form-select form-select-sm" style={{ width: 'auto' }} id="statut_bourse" name="statut_bourse"
                                                value={form.statut_bourse} onChange={handleChange} disabled={!form.est_affecte}>
                                                <option value="non_boursier">Non boursier</option>
                                                <option value="demi_boursier">Demi-boursier</option>
                                                <option value="boursier">Boursier</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

                <div className="d-flex justify-content-end gap-2">
                    <NavLink to="/Eleves" className="btn btn-secondary">Annuler</NavLink>
                    <button type="submit" className="btn btn-primary px-4">
                        <i className="fas fa-save me-1" />Enregistrer
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NouvelEleve;
