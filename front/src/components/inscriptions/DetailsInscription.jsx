import { useEffect, useState } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const BADGE = { en_attente: 'bg-warning text-dark', validee: 'bg-success', rejetee: 'bg-danger' };
const LABEL = { en_attente: 'En attente', validee: 'Validée', rejetee: 'Rejetée' };

const DetailsInscription = () => {
    const { toast } = useToast();
    const { id }     = useParams();
    const navigate   = useNavigate();
    const [demande, setDemande]     = useState(null);
    const [classes, setClasses]     = useState([]);
    const [classeId, setClasseId]   = useState('');
    const [chargement, setChargement] = useState(true);
    const [saving, setSaving]       = useState(false);

    useEffect(() => {
        Promise.all([
            api.get(`/inscriptions/${id}`),
            api.get('/classesTout'),
        ]).then(([r1, r2]) => {
            setDemande(r1.data);
            setClasses(r2.data);
            setChargement(false);
        }).catch(() => { toast.error('Chargement impossible.'); setChargement(false); });
    }, [id]);

    const valider = () => {
        if (!classeId) { toast.error('Sélectionnez une classe.'); return; }
        setSaving(true);
        api.post(`/inscriptions/${id}/valider`, { classe_id: classeId })
            .then(() => navigate('/Inscriptions'))
            .catch((e) => {
                toast.error(e.response?.data?.message ?? 'Erreur lors de la validation.');
                setSaving(false);
            });
    };

    const rejeter = () => {
        const motif = window.prompt('Motif du rejet (facultatif) :') ?? '';
        setSaving(true);
        api.post(`/inscriptions/${id}/rejeter`, { motif_rejet: motif })
            .then(() => navigate('/Inscriptions'))
            .catch(() => { toast.error('Erreur lors du rejet.'); setSaving(false); });
    };

    if (chargement) return <div className="text-center py-5"><div className="spinner-border text-primary" /></div>;
    if (!demande)   return null;

    // Classes filtrées par niveau si disponible
    const classesFiltrees = demande.niveau_id
        ? classes.filter(c => c.niveau_id === demande.niveau_id)
        : classes;

    return (
        <section className="page-wrapper">
            <div className="container mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">
                        Demande d'inscription
                        <span className={`badge ${BADGE[demande.statut]} ms-2`}>{LABEL[demande.statut]}</span>
                    </h4>
                    <NavLink to="/Inscriptions" className="btn btn-secondary btn-sm">Retour</NavLink>
                </div>

                <div className="row g-3">
                    {/* Infos élève */}
                    <div className="col-md-6">
                        <div className="card h-100">
                            <div className="card-header fw-bold">🎓 Informations de l'élève</div>
                            <div className="card-body">
                                <InfoRow label="Nom"            value={`${demande.nom_eleve} ${demande.prenoms_eleve}`} />
                                <InfoRow label="Date naissance" value={demande.date_naissance_eleve} />
                                <InfoRow label="Genre"          value={demande.genre_eleve === 'M' ? 'Masculin' : 'Féminin'} />
                                <InfoRow label="Lieu naissance" value={demande.lieu_naissance_eleve} />
                                <InfoRow label="Nationalité"    value={demande.nationalite_eleve} />
                                <InfoRow label="Adresse"        value={demande.adresse_eleve} />
                                <InfoRow label="Niveau souhaité" value={demande.niveau?.nom_niveau ?? demande.niveau_souhaite} />
                            </div>
                        </div>
                    </div>

                    {/* Infos parent */}
                    <div className="col-md-6">
                        <div className="card h-100">
                            <div className="card-header fw-bold">👨‍👩‍👧 Informations du parent</div>
                            <div className="card-body">
                                <InfoRow label="Nom"        value={`${demande.nom_parent} ${demande.prenom_parent}`} />
                                <InfoRow label="Téléphone"  value={demande.numero_parent} />
                                <InfoRow label="Email"      value={demande.email_parent} />
                                <InfoRow label="Relation"   value={demande.relation_parent} />
                                <InfoRow label="Profession" value={demande.profession_parent} />
                                <InfoRow label="Adresse"    value={demande.adresse_parent} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Validation */}
                {demande.statut === 'en_attente' && (
                    <div className="card mt-3">
                        <div className="card-header fw-bold">✅ Valider l'inscription</div>
                        <div className="card-body">
                            <div className="row g-3 align-items-end">
                                <div className="col-md-6">
                                    <label className="form-label">Affecter à la classe</label>
                                    <select
                                        className="form-select"
                                        value={classeId}
                                        onChange={e => setClasseId(e.target.value)}
                                    >
                                        <option value="">Sélectionner une classe</option>
                                        {classesFiltrees.map(c => (
                                            <option key={c.id} value={c.id}>{c.nom_classe}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-6 d-flex gap-2">
                                    <button
                                        className="btn btn-success"
                                        onClick={valider}
                                        disabled={saving}
                                    >
                                        {saving ? <span className="spinner-border spinner-border-sm" /> : '✅ Valider et créer l\'élève'}
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={rejeter}
                                        disabled={saving}
                                    >
                                        ❌ Rejeter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Élève créé */}
                {demande.statut === 'validee' && demande.eleve && (
                    <div className="alert alert-success mt-3">
                        Élève créé : <strong>{demande.eleve.nom_eleve} {demande.eleve.prenoms_eleve}</strong>
                        {' — '}
                        <NavLink to={`/DetailsEleve/${demande.eleve.id}`}>Voir la fiche</NavLink>
                    </div>
                )}

                {/* Motif rejet */}
                {demande.statut === 'rejetee' && (
                    <div className="alert alert-danger mt-3">
                        <strong>Motif du rejet :</strong> {demande.motif_rejet ?? 'Non précisé'}
                    </div>
                )}
            </div>
        </section>
    );
};

const InfoRow = ({ label, value }) => (
    <div className="d-flex mb-1">
        <span className="text-muted me-2" style={{ minWidth: 130 }}>{label} :</span>
        <span className="fw-semibold">{value ?? '—'}</span>
    </div>
);

export default DetailsInscription;
