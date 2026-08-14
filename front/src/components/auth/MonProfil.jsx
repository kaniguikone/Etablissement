import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { backendUrl, getSessionType, sessionKey } from '../../api/axios';
import { useToast } from '../../context/ToastContext';

// Met à jour l'utilisateur stocké pour la session active, sans toucher au token
const mettreAJourUtilisateurStocke = (patch) => {
    const type = getSessionType();
    const raw = localStorage.getItem(sessionKey(type));
    const session = raw ? JSON.parse(raw) : { token: null, user: {} };
    session.user = { ...session.user, ...patch };
    localStorage.setItem(sessionKey(type), JSON.stringify(session));
};

const MonProfil = () => {
    const { user, connexion } = useAuth();

    const [form, setForm] = useState({
        name: user?.name || '',
        telephone: user?.telephone || '',
        password_actuel: '',
        password: '',
        password_confirm: '',
    });
    const { toast } = useToast();
    const [photoPreview, setPhotoPreview] = useState(backendUrl(user?.photo_url) || null);
    const [uploadEnCours, setUploadEnCours] = useState(false);
    const [sauvegarde, setSauvegarde]      = useState(false);

    const fileInputRef = useRef(null);

    const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    // ── Upload de photo ──────────────────────────────────────────────────────
    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Aperçu immédiat
        setPhotoPreview(URL.createObjectURL(file));
        setUploadEnCours(true);

        const formData = new FormData();
        formData.append('photo', file);

        try {
            const res = await api.post('/mon-profil/photo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            // Mettre à jour la session stockée avec la nouvelle photo_url
            mettreAJourUtilisateurStocke({ photo_url: res.data.photo_url });
            setPhotoPreview(backendUrl(res.data.photo_url));
            toast.success('Photo mise à jour.');
        } catch {
            toast.error('Erreur lors de l\'upload de la photo.');
            setPhotoPreview(backendUrl(user?.photo_url) || null);
        } finally {
            setUploadEnCours(false);
            // Réinitialiser l'input pour permettre de re-sélectionner le même fichier
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ── Sauvegarde du profil ─────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (form.password && form.password !== form.password_confirm) {
            toast.error('Les nouveaux mots de passe ne correspondent pas.');
            return;
        }

        setSauvegarde(true);
        try {
            const payload = { name: form.name, telephone: form.telephone };
            if (form.password) {
                payload.password_actuel = form.password_actuel;
                payload.password        = form.password;
            }
            const res = await api.put('/mon-profil', payload);
            mettreAJourUtilisateurStocke(res.data);
            toast.success('Profil mis à jour avec succès.');
            setForm(f => ({ ...f, password_actuel: '', password: '', password_confirm: '' }));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour.');
        } finally {
            setSauvegarde(false);
        }
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2">
                <div className="row justify-content-center">
                    <div className="col-md-6">
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white border-bottom">
                                <h5 className="mb-0">Mon profil</h5>
                            </div>
                            <div className="card-body p-4">

                                {/* ── Avatar cliquable ── */}
                                <div className="text-center mb-4">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handlePhotoChange}
                                    />
                                    <div
                                        style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
                                        onClick={() => !uploadEnCours && fileInputRef.current?.click()}
                                        title="Changer la photo"
                                    >
                                        {/* Cercle avatar */}
                                        <div style={{
                                            width: 90, height: 90, borderRadius: '50%',
                                            overflow: 'hidden', border: '3px solid #e5e7eb',
                                            backgroundColor: '#1a56a0',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {photoPreview ? (
                                                <img
                                                    src={photoPreview}
                                                    alt="Photo de profil"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <i className="fas fa-user text-white" style={{ fontSize: 38 }} />
                                            )}
                                        </div>

                                        {/* Overlay au survol */}
                                        <div style={{
                                            position: 'absolute', inset: 0, borderRadius: '50%',
                                            backgroundColor: 'rgba(0,0,0,0.45)',
                                            display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', justifyContent: 'center',
                                            opacity: 0, transition: 'opacity 0.2s',
                                            color: 'white', fontSize: '0.7rem', fontWeight: 600,
                                        }}
                                            onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
                                            onMouseLeave={e => { e.currentTarget.style.opacity = 0; }}
                                        >
                                            {uploadEnCours
                                                ? <div className="spinner-border spinner-border-sm text-white" />
                                                : <>
                                                    <i className="fas fa-camera mb-1" style={{ fontSize: 18 }} />
                                                    Modifier
                                                </>
                                            }
                                        </div>
                                    </div>

                                    <p className="mt-2 mb-0 fw-semibold">{user?.name}</p>
                                    <span className="badge bg-primary">{user?.role_label}</span>
                                    <div className="text-muted mt-1" style={{ fontSize: '0.78rem' }}>
                                        Cliquez sur la photo pour la modifier
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label">Nom complet</label>
                                        <input name="name" className="form-control" value={form.name} onChange={handleChange} required />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Téléphone</label>
                                        <input name="telephone" className="form-control" value={form.telephone} onChange={handleChange} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-muted small">Adresse e-mail (non modifiable)</label>
                                        <input className="form-control" value={user?.email || ''} disabled />
                                    </div>

                                    <hr />
                                    <p className="text-muted small mb-2">Changer le mot de passe (optionnel)</p>

                                    <div className="mb-3">
                                        <label className="form-label">Mot de passe actuel</label>
                                        <input name="password_actuel" type="password" className="form-control" value={form.password_actuel} onChange={handleChange} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Nouveau mot de passe</label>
                                        <input name="password" type="password" className="form-control" value={form.password} onChange={handleChange} minLength={6} />
                                    </div>
                                    <div className="mb-4">
                                        <label className="form-label">Confirmer le nouveau mot de passe</label>
                                        <input name="password_confirm" type="password" className="form-control" value={form.password_confirm} onChange={handleChange} />
                                    </div>

                                    <button type="submit" className="btn btn-primary" disabled={sauvegarde}>
                                        {sauvegarde && <span className="spinner-border spinner-border-sm me-1" />}
                                        Enregistrer
                                    </button>
                                </form>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default MonProfil;
