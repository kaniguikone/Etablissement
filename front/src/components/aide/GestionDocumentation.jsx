import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const CAT_LABELS = {
    prise_en_main: 'Prise en main',
    tutoriel:      'Tutoriel',
    faq:           'FAQ',
    astuce:        'Astuce',
};

const CAT_COLORS = {
    prise_en_main: 'bg-success',
    tutoriel:      'bg-primary',
    faq:           'bg-warning text-dark',
    astuce:        'bg-info',
};

const FORM_VIDE = {
    titre: '', contenu: '', module: 'eleves', categorie: 'tutoriel', ordre: 0, actif: true,
};

export default function GestionDocumentation() {
    const { toast }               = useToast();
    const { confirm }             = useConfirm();
    const [articles, setArticles] = useState([]);
    const [modules, setModules]   = useState({});
    const [filtreModule, setFiltreModule] = useState('');
    const [filtreCategorie, setFiltreCategorie] = useState('');
    const [chargement, setChargement] = useState(true);
    const [modal, setModal]       = useState(false);
    const [form, setForm]         = useState(FORM_VIDE);
    const [editId, setEditId]     = useState(null);
    const [sauvegarde, setSauvegarde] = useState(false);
    const [erreurs, setErreurs]   = useState({});
    const [previsualisation, setPrevisualisation] = useState(false);

    const charger = async () => {
        setChargement(true);
        try {
            const params = new URLSearchParams();
            if (filtreModule)    params.append('module', filtreModule);
            if (filtreCategorie) params.append('categorie', filtreCategorie);
            const r = await api.get(`/help/admin?${params}`);
            setArticles(r.data.articles);
            setModules(r.data.modules);
        } catch { toast.error('Erreur lors du chargement.'); }
        finally { setChargement(false); }
    };

    useEffect(() => { charger(); }, [filtreModule, filtreCategorie]);

    const ouvrirCreation = () => {
        setForm({ ...FORM_VIDE, module: filtreModule || 'eleves' });
        setEditId(null);
        setErreurs({});
        setPrevisualisation(false);
        setModal(true);
    };

    const ouvrirEdition = (a) => {
        setForm({ titre: a.titre, contenu: a.contenu, module: a.module, categorie: a.categorie, ordre: a.ordre, actif: a.actif });
        setEditId(a.id);
        setErreurs({});
        setPrevisualisation(false);
        setModal(true);
    };

    const valider = () => {
        const e = {};
        if (!form.titre.trim())   e.titre   = 'Titre requis';
        if (!form.contenu.trim()) e.contenu  = 'Contenu requis';
        if (!form.module)         e.module   = 'Module requis';
        if (!form.categorie)      e.categorie= 'Catégorie requise';
        setErreurs(e);
        return Object.keys(e).length === 0;
    };

    const sauvegarder = async (e) => {
        e.preventDefault();
        if (!valider()) return;
        setSauvegarde(true);
        try {
            if (editId) {
                await api.put(`/help/${editId}`, form);
                toast.success('Article mis à jour.');
            } else {
                await api.post('/help', form);
                toast.success('Article créé.');
            }
            setModal(false);
            charger();
        } catch (err) {
            if (err.response?.data?.errors) setErreurs(err.response.data.errors);
            else toast.error('Erreur lors de l\'enregistrement.');
        } finally { setSauvegarde(false); }
    };

    const supprimer = async (a) => {
        const ok = await confirm(`Supprimer « ${a.titre} » ?`, 'Cette action est irréversible.');
        if (!ok) return;
        try {
            await api.delete(`/help/${a.id}`);
            toast.success('Article supprimé.');
            charger();
        } catch { toast.error('Impossible de supprimer cet article.'); }
    };

    const toggleActif = async (a) => {
        try {
            await api.put(`/help/${a.id}`, { ...a, actif: !a.actif });
            charger();
        } catch { toast.error('Erreur.'); }
    };

    // Rendu markdown simplifié pour prévisualisation
    const mdToHtml = (text) => {
        if (!text) return '';
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/^### (.+)$/gm, '<h6 class="mt-3 fw-bold">$1</h6>')
            .replace(/^## (.+)$/gm,  '<h5 class="mt-3 fw-bold">$1</h5>')
            .replace(/^- (.+)$/gm,   '<li>$1</li>')
            .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
            .replace(/\n\n/g, '</p><p class="mb-2">')
            .replace(/\n/g, '<br>');
    };

    // Grouper par module pour affichage
    const parModule = articles.reduce((acc, a) => {
        acc[a.module] = acc[a.module] ?? [];
        acc[a.module].push(a);
        return acc;
    }, {});

    return (
        <div className="container-fluid py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="mb-0">Documentation in-app</h4>
                    <small className="text-muted">
                        Gérez les articles d'aide affichés dans le panneau <strong>?</strong> de chaque page
                    </small>
                </div>
                <button className="btn btn-primary" onClick={ouvrirCreation}>
                    <i className="bi bi-plus-lg me-1" />Nouvel article
                </button>
            </div>

            {/* Filtres */}
            <div className="card border-0 shadow-sm mb-4">
                <div className="card-body py-2">
                    <div className="row g-2">
                        <div className="col-md-4">
                            <select className="form-select form-select-sm" value={filtreModule}
                                onChange={e => setFiltreModule(e.target.value)}>
                                <option value="">Tous les modules ({articles.length} articles)</option>
                                {Object.entries(modules).map(([k, v]) => (
                                    <option key={k} value={k}>
                                        {v} ({parModule[k]?.length ?? 0})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <select className="form-select form-select-sm" value={filtreCategorie}
                                onChange={e => setFiltreCategorie(e.target.value)}>
                                <option value="">Toutes catégories</option>
                                {Object.entries(CAT_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Liste groupée par module */}
            {chargement ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : articles.length === 0 ? (
                <div className="alert alert-info text-center">Aucun article trouvé.</div>
            ) : (
                Object.entries(parModule).map(([mod, arts]) => (
                    <div key={mod} className="card border-0 shadow-sm mb-3">
                        <div className="card-header bg-light d-flex align-items-center gap-2">
                            <i className="bi bi-book-half text-primary" />
                            <strong>{modules[mod] ?? mod}</strong>
                            <span className="badge bg-secondary ms-1">{arts.length}</span>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0 table-sm">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: 30 }}>#</th>
                                        <th>Titre</th>
                                        <th>Catégorie</th>
                                        <th className="text-center">Statut</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {arts.sort((a, b) => a.ordre - b.ordre).map(a => (
                                        <tr key={a.id} style={{ opacity: a.actif ? 1 : .5 }}>
                                            <td className="text-muted small">{a.ordre}</td>
                                            <td>
                                                <strong className="small">{a.titre}</strong>
                                                <div className="text-muted" style={{ fontSize: 11 }}>
                                                    {a.contenu.substring(0, 70).replace(/[*#\n]/g, ' ')}…
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${CAT_COLORS[a.categorie] ?? 'bg-secondary'} small`}>
                                                    {CAT_LABELS[a.categorie] ?? a.categorie}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <div className="form-check form-switch d-flex justify-content-center mb-0">
                                                    <input className="form-check-input" type="checkbox"
                                                        checked={a.actif} onChange={() => toggleActif(a)} />
                                                </div>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-1 justify-content-end">
                                                    <button className="btn btn-sm btn-outline-secondary"
                                                        onClick={() => ouvrirEdition(a)} title="Modifier">
                                                        <i className="bi bi-pencil" />
                                                    </button>
                                                    <button className="btn btn-sm btn-outline-danger"
                                                        onClick={() => supprimer(a)} title="Supprimer">
                                                        <i className="bi bi-trash" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}

            {/* Modal édition */}
            {modal && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-xl">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {editId ? 'Modifier l\'article' : 'Nouvel article d\'aide'}
                                </h5>
                                <button className="btn-close" onClick={() => setModal(false)} />
                            </div>
                            <form onSubmit={sauvegarder}>
                                <div className="modal-body">
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-4">
                                            <label className="form-label">Module <span className="text-danger">*</span></label>
                                            <select className={`form-select ${erreurs.module ? 'is-invalid' : ''}`}
                                                value={form.module}
                                                onChange={e => setForm(f => ({ ...f, module: e.target.value }))}>
                                                {Object.entries(modules).map(([k, v]) => (
                                                    <option key={k} value={k}>{v}</option>
                                                ))}
                                            </select>
                                            {erreurs.module && <div className="invalid-feedback">{erreurs.module}</div>}
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Catégorie <span className="text-danger">*</span></label>
                                            <select className={`form-select ${erreurs.categorie ? 'is-invalid' : ''}`}
                                                value={form.categorie}
                                                onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                                                {Object.entries(CAT_LABELS).map(([k, v]) => (
                                                    <option key={k} value={k}>{v}</option>
                                                ))}
                                            </select>
                                            {erreurs.categorie && <div className="invalid-feedback">{erreurs.categorie}</div>}
                                        </div>
                                        <div className="col-md-2">
                                            <label className="form-label">Ordre</label>
                                            <input type="number" min="0" max="255" className="form-control"
                                                value={form.ordre}
                                                onChange={e => setForm(f => ({ ...f, ordre: parseInt(e.target.value) || 0 }))} />
                                        </div>
                                        <div className="col-md-3 d-flex align-items-end">
                                            <div className="form-check form-switch mb-2">
                                                <input className="form-check-input" type="checkbox" id="actifSwitch"
                                                    checked={form.actif}
                                                    onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))} />
                                                <label className="form-check-label" htmlFor="actifSwitch">Article visible</label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">Titre <span className="text-danger">*</span></label>
                                        <input className={`form-control ${erreurs.titre ? 'is-invalid' : ''}`}
                                            value={form.titre}
                                            onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} />
                                        {erreurs.titre && <div className="invalid-feedback">{erreurs.titre}</div>}
                                    </div>

                                    {/* Éditeur + prévisualisation côte à côte */}
                                    <div className="mb-2 d-flex gap-2 align-items-center">
                                        <label className="form-label mb-0">Contenu <span className="text-danger">*</span></label>
                                        <button type="button" className="btn btn-sm btn-outline-secondary ms-auto"
                                            onClick={() => setPrevisualisation(p => !p)}>
                                            <i className={`bi ${previsualisation ? 'bi-code' : 'bi-eye'} me-1`} />
                                            {previsualisation ? 'Éditer' : 'Prévisualiser'}
                                        </button>
                                    </div>

                                    {previsualisation ? (
                                        <div className="border rounded p-3 bg-light" style={{ minHeight: 200, fontSize: 13 }}>
                                            <div dangerouslySetInnerHTML={{ __html: `<p class="mb-2">${mdToHtml(form.contenu)}</p>` }} />
                                        </div>
                                    ) : (
                                        <>
                                            <textarea
                                                className={`form-control font-monospace ${erreurs.contenu ? 'is-invalid' : ''}`}
                                                rows={12} value={form.contenu}
                                                onChange={e => setForm(f => ({ ...f, contenu: e.target.value }))}
                                                style={{ fontSize: 12, resize: 'vertical' }}
                                            />
                                            {erreurs.contenu && <div className="invalid-feedback">{erreurs.contenu}</div>}
                                            <div className="text-muted mt-1" style={{ fontSize: 11 }}>
                                                Syntaxe Markdown : <code>**gras**</code>, <code>- liste</code>, <code>1. liste numérotée</code>, <code>## Titre</code>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-outline-secondary"
                                        onClick={() => setModal(false)}>Annuler</button>
                                    <button type="submit" className="btn btn-primary" disabled={sauvegarde}>
                                        {sauvegarde
                                            ? <><span className="spinner-border spinner-border-sm me-2" />Enregistrement…</>
                                            : editId ? 'Enregistrer les modifications' : 'Créer l\'article'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
