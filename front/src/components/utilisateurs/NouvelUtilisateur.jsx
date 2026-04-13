import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const NouvelUtilisateur = () => {
    const { toast } = useToast();
    const { id }    = useParams();
    const navigate  = useNavigate();
    const estEdition = !!id;

    const [form, setForm] = useState({
        name: '', telephone: '', email: '', role_id: '', password: '', password_confirm: '',
    });
    const [roles, setRoles]           = useState([]);
    const [sauvegarde, setSauvegarde] = useState(false);

    useEffect(() => {
        api.get('/roles').then(res => {
            const actifs = res.data.filter(r => r.actif);
            setRoles(actifs);
            if (!estEdition && actifs.length > 0) {
                setForm(f => ({ ...f, role_id: actifs[0].id }));
            }
        });

        if (estEdition) {
            api.get(`/utilisateurs`).then(res => {
                const u = res.data.find(x => x.id === parseInt(id));
                if (u) setForm(f => ({ ...f, name: u.name, telephone: u.telephone || '', email: u.email, role_id: u.role_id }));
            });
        }
    }, [id]);

    const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!estEdition && form.password !== form.password_confirm) {
            toast.error('Les mots de passe ne correspondent pas.');
            return;
        }

        setSauvegarde(true);
        try {
            const payload = { name: form.name, telephone: form.telephone, email: form.email, role_id: form.role_id };
            if (form.password) payload.password = form.password;

            if (estEdition) {
                await api.put(`/utilisateurs/${id}`, payload);
            } else {
                await api.post('/utilisateurs', payload);
            }
            toast.success(estEdition ? 'Utilisateur modifié avec succès.' : 'Utilisateur créé avec succès.');
            navigate('/Utilisateurs');
        } catch (err) {
            const msg = err.response?.data?.message || JSON.stringify(err.response?.data?.errors || 'Erreur.');
            toast.error(msg);
        } finally {
            setSauvegarde(false);
        }
    };

    return (
        <section className="content content-wrapper">
            <div className="container-fluid mb-2">
                <div className="row justify-content-center">
                    <div className="col-md-6">
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white border-bottom">
                                <h5 className="mb-0">
                                    {estEdition ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                                </h5>
                            </div>
                            <div className="card-body p-4">
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label">Nom complet *</label>
                                        <input name="name" className="form-control" value={form.name} onChange={handleChange} required />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Téléphone</label>
                                        <input name="telephone" className="form-control" value={form.telephone} onChange={handleChange} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Adresse e-mail *</label>
                                        <input name="email" type="email" className="form-control" value={form.email} onChange={handleChange} required />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Rôle *</label>
                                        <select name="role_id" className="form-select" value={form.role_id} onChange={handleChange} required>
                                            <option value="">— Choisir un rôle —</option>
                                            {roles.map(r => (
                                                <option key={r.id} value={r.id}>{r.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <hr />
                                    <p className="text-muted small mb-2">
                                        {estEdition ? 'Laisser vide pour ne pas changer le mot de passe.' : 'Mot de passe *'}
                                    </p>
                                    <div className="mb-3">
                                        <label className="form-label">Mot de passe</label>
                                        <input name="password" type="password" className="form-control" value={form.password} onChange={handleChange} required={!estEdition} minLength={6} />
                                    </div>
                                    {!estEdition && (
                                        <div className="mb-4">
                                            <label className="form-label">Confirmer le mot de passe</label>
                                            <input name="password_confirm" type="password" className="form-control" value={form.password_confirm} onChange={handleChange} required />
                                        </div>
                                    )}

                                    <div className="d-flex gap-2">
                                        <button type="submit" className="btn btn-primary" disabled={sauvegarde}>
                                            {sauvegarde ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                                            {estEdition ? 'Enregistrer' : 'Créer'}
                                        </button>
                                        <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/Utilisateurs')}>
                                            Annuler
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default NouvelUtilisateur;
