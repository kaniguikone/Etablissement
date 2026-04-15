import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const NouveauRole = () => {
    const { toast } = useToast();
    const { id }     = useParams();
    const navigate   = useNavigate();
    const estEdition = !!id;

    const [form, setForm] = useState({ nom: '', label: '', super: false, actif: true, permissions: [] });
    const [permissionsDisponibles, setPermissionsDisponibles] = useState([]);
    const [sauvegarde, setSauvegarde] = useState(false);

    useEffect(() => {
        api.get('/roles-permissions').then(res => setPermissionsDisponibles(res.data));

        if (estEdition) {
            api.get(`/roles/${id}`).then(res => {
                const r = res.data;
                setForm({
                    nom:         r.nom,
                    label:       r.label,
                    super:       r.super,
                    actif:       r.actif,
                    permissions: r.permissions ?? [],
                });
            });
        }
    }, [id]);

    const togglePermission = (cle) => {
        setForm(f => ({
            ...f,
            permissions: f.permissions.includes(cle)
                ? f.permissions.filter(p => p !== cle)
                : [...f.permissions, cle],
        }));
    };

    const toutCocher = () => {
        setForm(f => ({ ...f, permissions: permissionsDisponibles.map(p => p.key) }));
    };

    const toutDecocher = () => {
        setForm(f => ({ ...f, permissions: [] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSauvegarde(true);
        try {
            if (estEdition) {
                await api.put(`/roles/${id}`, form);
            } else {
                await api.post('/roles', form);
            }
            toast.success(estEdition ? 'Rôle modifié avec succès.' : 'Rôle créé avec succès.');
            navigate('/Roles');
        } catch (err) {
            const errors = err.response?.data?.errors;
            const msg    = errors
                ? Object.values(errors).flat().join(' — ')
                : err.response?.data?.message || 'Erreur lors de la sauvegarde.';
            toast.error(msg);
        } finally {
            setSauvegarde(false);
        }
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2">
                <div className="row justify-content-center">
                    <div className="col-md-7">
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white border-bottom">
                                <h5 className="mb-0">
                                    {estEdition ? 'Modifier le rôle' : 'Nouveau rôle'}
                                </h5>
                            </div>
                            <div className="card-body p-4">
                                <form onSubmit={handleSubmit}>
                                    <div className="row g-3 mb-4">
                                        <div className="col-md-6">
                                            <label className="form-label">Identifiant technique *</label>
                                            <input
                                                className="form-control"
                                                value={form.nom}
                                                onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                                                placeholder="ex: chef_dept"
                                                pattern="[a-z0-9_]+"
                                                title="Minuscules, chiffres et underscore uniquement"
                                                required
                                                disabled={estEdition}
                                            />
                                            <div className="form-text">Minuscules, chiffres, underscore. Non modifiable après création.</div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Nom affiché *</label>
                                            <input
                                                className="form-control"
                                                value={form.label}
                                                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                                                placeholder="ex: Chef de département"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <div className="form-check form-switch">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="super"
                                                checked={form.super}
                                                onChange={e => setForm(f => ({ ...f, super: e.target.checked }))}
                                            />
                                            <label className="form-check-label fw-semibold" htmlFor="super">
                                                Rôle super-administrateur
                                                <span className="text-muted fw-normal ms-2 small">(contourne toutes les restrictions)</span>
                                            </label>
                                        </div>
                                    </div>

                                    {!form.super && (
                                        <div className="mb-4">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <label className="form-label mb-0 fw-semibold">Permissions</label>
                                                <div className="d-flex gap-2">
                                                    <button type="button" className="btn btn-outline-primary btn-sm" onClick={toutCocher}>Tout cocher</button>
                                                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={toutDecocher}>Tout décocher</button>
                                                </div>
                                            </div>
                                            <div className="border rounded p-3" style={{ backgroundColor: '#f8f9fa' }}>
                                                {permissionsDisponibles.map(p => (
                                                    <div key={p.key} className="form-check mb-2">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id={`perm_${p.key}`}
                                                            checked={form.permissions.includes(p.key)}
                                                            onChange={() => togglePermission(p.key)}
                                                        />
                                                        <label className="form-check-label" htmlFor={`perm_${p.key}`}>
                                                            <span className="fw-semibold">{p.key}</span>
                                                            <span className="text-muted ms-2 small">— {p.label}</span>
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {estEdition && (
                                        <div className="mb-4">
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="actif"
                                                    checked={form.actif}
                                                    onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))}
                                                />
                                                <label className="form-check-label" htmlFor="actif">Rôle actif</label>
                                            </div>
                                        </div>
                                    )}

                                    <div className="d-flex gap-2">
                                        <button type="submit" className="btn btn-primary" disabled={sauvegarde}>
                                            {sauvegarde && <span className="spinner-border spinner-border-sm me-1" />}
                                            {estEdition ? 'Enregistrer' : 'Créer le rôle'}
                                        </button>
                                        <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/Roles')}>
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

export default NouveauRole;
