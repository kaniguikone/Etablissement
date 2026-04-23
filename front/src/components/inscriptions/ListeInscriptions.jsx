import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const BADGE = {
    en_attente: 'bg-warning text-dark',
    validee:    'bg-success',
    rejetee:    'bg-danger',
};
const LABEL = { en_attente: 'En attente', validee: 'Validée', rejetee: 'Rejetée' };
const ORIGINE = { parent: '📱 Parent', etablissement: '🏫 Établissement' };

const ListeInscriptions = () => {
    const { toast } = useToast();
    const location = useLocation();
    const [demandes, setDemandes]   = useState([]);
    const [filtre, setFiltre]       = useState('');
    const [chargement, setChargement] = useState(true);

    const charger = (statut = '') => {
        setChargement(true);
        const params = statut ? `?statut=${statut}` : '';
        api.get(`/inscriptions${params}`)
            .then((r) => { setDemandes(r.data.data); setChargement(false); })
            .catch(() => { toast.error('Impossible de charger les demandes.'); setChargement(false); });
    };

    useEffect(() => { charger(filtre); }, [filtre, location.key]);

    const rejeter = (id) => {
        const motif = window.prompt('Motif du rejet (facultatif) :') ?? '';
        api.post(`/inscriptions/${id}/rejeter`, { motif_rejet: motif })
            .then(() => charger(filtre))
            .catch(() => toast.error('Erreur lors du rejet.'));
    };

    const nbAttente = demandes.filter(d => d.statut === 'en_attente').length;

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">
                        <i className="fas fa-user-plus me-2 text-primary" />
                        Demandes d'inscription
                        {nbAttente > 0 && (
                            <span className="badge bg-warning text-dark ms-2">{nbAttente} en attente</span>
                        )}
                    </h4>
                </div>

                {/* Filtres */}
                <div className="d-flex gap-2 mb-3">
                    {['', 'en_attente', 'validee', 'rejetee'].map((s) => (
                        <button
                            key={s}
                            className={`btn btn-sm ${filtre === s ? 'btn-dark' : 'btn-outline-secondary'}`}
                            onClick={() => setFiltre(s)}
                        >
                            {s === '' ? 'Toutes' : LABEL[s]}
                        </button>
                    ))}
                </div>

                {chargement ? (
                    <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
                ) : demandes.length === 0 ? (
                    <p className="text-muted text-center py-4">Aucune demande.</p>
                ) : (
                    <table className="table table-sm table-striped">
                        <thead className="table-dark">
                            <tr>
                                <th>#</th>
                                <th>Élève</th>
                                <th>Niveau souhaité</th>
                                <th>Parent</th>
                                <th>Téléphone</th>
                                <th>Origine</th>
                                <th>Date</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {demandes.map((d, i) => (
                                <tr key={d.id}>
                                    <td>{i + 1}</td>
                                    <td className="fw-bold">{d.nom_eleve} {d.prenoms_eleve}</td>
                                    <td>{d.niveau?.nom_niveau ?? d.niveau_souhaite ?? '—'}</td>
                                    <td>{d.nom_parent} {d.prenom_parent}</td>
                                    <td>{d.numero_parent}</td>
                                    <td><small>{ORIGINE[d.origine]}</small></td>
                                    <td><small>{new Date(d.created_at).toLocaleDateString('fr-FR')}</small></td>
                                    <td><span className={`badge ${BADGE[d.statut]}`}>{LABEL[d.statut]}</span></td>
                                    <td>
                                        <NavLink
                                            to={`/Inscriptions/${d.id}`}
                                            className="btn btn-info btn-sm me-1"
                                        >
                                            Détail
                                        </NavLink>
                                        {d.statut === 'en_attente' && (
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => rejeter(d.id)}
                                            >
                                                Rejeter
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    );
};

export default ListeInscriptions;
