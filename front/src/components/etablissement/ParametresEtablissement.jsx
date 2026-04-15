import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useEtablissement } from '../../context/EtablissementContext';

const ParametresEtablissement = () => {
    const { toast } = useToast();
    const { rafraichir } = useEtablissement();

    const vide = {
        nom: '', slogan: '', adresse: '', ville: '', bp: '',
        telephone: '', telephone2: '', email: '', site_web: '', pays: '',
    };

    const [form, setForm]               = useState(vide);
    const [logoUrl, setLogoUrl]         = useState(null);
    const [chargement, setChargement]   = useState(true);
    const [enregistrement, setEnregistrement] = useState(false);
    const [uploadLogo, setUploadLogo]   = useState(false);
    const fileRef = useRef();

    useEffect(() => {
        api.get('/etablissement')
            .then((r) => {
                const d = r.data;
                setForm({
                    nom:        d.nom        || '',
                    slogan:     d.slogan     || '',
                    adresse:    d.adresse    || '',
                    ville:      d.ville      || '',
                    bp:         d.bp         || '',
                    telephone:  d.telephone  || '',
                    telephone2: d.telephone2 || '',
                    email:      d.email      || '',
                    site_web:   d.site_web   || '',
                    pays:       d.pays       || '',
                });
                setLogoUrl(d.logo_url || null);
                setChargement(false);
            })
            .catch(() => { toast.error('Impossible de charger les paramètres.'); setChargement(false); });
    }, []);

    const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const sauvegarder = () => {
        if (!form.nom.trim()) return;
        setEnregistrement(true);
        api.put('/etablissement', form)
            .then((r) => {
                setLogoUrl(r.data.logo_url || null);
                rafraichir(r.data);
                toast.success('Paramètres enregistrés.');
            })
            .catch(() => toast.error('Erreur lors de l\'enregistrement.'))
            .finally(() => setEnregistrement(false));
    };

    const changerLogo = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadLogo(true);
        const fd = new FormData();
        fd.append('logo', file);
        api.post('/etablissement/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then((r) => { setLogoUrl(r.data.logo_url || null); rafraichir(r.data); toast.success('Logo mis à jour.'); })
            .catch(() => toast.error('Erreur lors de l\'upload du logo.'))
            .finally(() => setUploadLogo(false));
    };

    if (chargement) {
        return (
            <section className="page-wrapper">
                <div className="container-fluid text-center py-5">
                    <div className="spinner-border text-primary" />
                </div>
            </section>
        );
    }

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Paramètres de l'établissement</h4>
                </div>

                <div className="row g-4">
                    {/* Logo */}
                    <div className="col-md-3 text-center">
                        <div
                            className="border rounded d-flex align-items-center justify-content-center bg-light mb-2"
                            style={{ height: 160, overflow: 'hidden', cursor: 'pointer' }}
                            onClick={() => fileRef.current?.click()}
                            title="Cliquer pour changer le logo"
                        >
                            {logoUrl
                                ? <img src={logoUrl} alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                : <div className="text-muted text-center small">
                                    <i className="fas fa-image fa-2x mb-2 d-block" />
                                    Cliquer pour<br />ajouter un logo
                                  </div>
                            }
                        </div>
                        <input ref={fileRef} type="file" accept="image/*" className="d-none" onChange={changerLogo} />
                        <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploadLogo}
                        >
                            {uploadLogo
                                ? <><span className="spinner-border spinner-border-sm me-1" />Upload…</>
                                : <><i className="fas fa-upload me-1" />Changer le logo</>
                            }
                        </button>
                        <div className="text-muted small mt-1">JPG, PNG, SVG — max 2 Mo</div>
                    </div>

                    {/* Formulaire */}
                    <div className="col-md-9">
                        <div className="row g-3">
                            <div className="col-md-8">
                                <label className="form-label small fw-bold">Nom de l'établissement *</label>
                                <input
                                    type="text" name="nom"
                                    className="form-control form-control-sm"
                                    value={form.nom} onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-bold">Pays</label>
                                <input
                                    type="text" name="pays"
                                    className="form-control form-control-sm"
                                    value={form.pays} onChange={handleChange}
                                />
                            </div>
                            <div className="col-12">
                                <label className="form-label small fw-bold">Slogan</label>
                                <input
                                    type="text" name="slogan"
                                    className="form-control form-control-sm"
                                    placeholder="Ex : L'excellence au service de la jeunesse"
                                    value={form.slogan} onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold">Adresse</label>
                                <input
                                    type="text" name="adresse"
                                    className="form-control form-control-sm"
                                    value={form.adresse} onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-bold">Ville</label>
                                <input
                                    type="text" name="ville"
                                    className="form-control form-control-sm"
                                    value={form.ville} onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-2">
                                <label className="form-label small fw-bold">Boîte postale</label>
                                <input
                                    type="text" name="bp"
                                    className="form-control form-control-sm"
                                    placeholder="BP 0000"
                                    value={form.bp} onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-bold">Téléphone 1</label>
                                <input
                                    type="text" name="telephone"
                                    className="form-control form-control-sm"
                                    value={form.telephone} onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-bold">Téléphone 2</label>
                                <input
                                    type="text" name="telephone2"
                                    className="form-control form-control-sm"
                                    value={form.telephone2} onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-bold">Email</label>
                                <input
                                    type="email" name="email"
                                    className="form-control form-control-sm"
                                    value={form.email} onChange={handleChange}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold">Site web</label>
                                <input
                                    type="text" name="site_web"
                                    className="form-control form-control-sm"
                                    placeholder="www.exemple.ci"
                                    value={form.site_web} onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="mt-3">
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={sauvegarder}
                                disabled={!form.nom.trim() || enregistrement}
                            >
                                {enregistrement
                                    ? <><span className="spinner-border spinner-border-sm me-1" />Enregistrement…</>
                                    : <><i className="fas fa-save me-1" />Enregistrer</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ParametresEtablissement;
