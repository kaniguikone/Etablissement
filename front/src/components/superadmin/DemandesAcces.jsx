import { useEffect, useState } from 'react';
import { centralApi as axios } from '../../api/axios';

const TYPES = {
    lycee: 'Lycée', lycee_complet: 'Lycée Complet',
    college: 'Collège', primaire: 'École Primaire',
};

const STATUT_BADGE = {
    en_attente: { cls: 'bg-warning text-dark', label: 'En attente' },
    acceptee:   { cls: 'bg-success text-white', label: 'Acceptée' },
    refusee:    { cls: 'bg-danger text-white', label: 'Refusée' },
};

const DemandesAcces = () => {
    const [demandes, setDemandes]         = useState([]);
    const [filtre, setFiltre]             = useState('en_attente');
    const [chargement, setChargement]     = useState(true);
    const [traitement, setTraitement]     = useState(null); // id en cours
    const [resultat, setResultat]         = useState(null); // résultat d'une acceptation
    const [erreur, setErreur]             = useState('');
    const [notesRefus, setNotesRefus]     = useState('');
    const [idRefus, setIdRefus]           = useState(null);
    const [credentialsVus, setCredentialsVus] = useState(null); // demande dont on affiche les credentials

    const charger = (statut = filtre) => {
        setChargement(true);
        axios.get(`/superadmin/demandes?statut=${statut}`)
            .then(r => setDemandes(r.data))
            .catch(() => setErreur('Erreur lors du chargement.'))
            .finally(() => setChargement(false));
    };

    useEffect(() => { charger(filtre); }, [filtre]);

    const accepter = async (id) => {
        setTraitement(id); setErreur(''); setResultat(null);
        try {
            const { data } = await axios.post(`/superadmin/demandes/${id}/accepter`);
            setResultat(data);
            charger(filtre);
        } catch (err) {
            setErreur(err.response?.data?.message ?? 'Erreur lors de la création.');
        } finally {
            setTraitement(null);
        }
    };

    const refuser = async () => {
        if (!idRefus) return;
        setTraitement(idRefus); setErreur('');
        try {
            await axios.post(`/superadmin/demandes/${idRefus}/refuser`, { notes: notesRefus });
            setIdRefus(null); setNotesRefus('');
            charger(filtre);
        } catch {
            setErreur('Erreur lors du refus.');
        } finally {
            setTraitement(null);
        }
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="mb-0"><i className="fas fa-inbox me-2 text-primary" />Demandes d'accès</h4>
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => charger(filtre)}>
                        <i className="fas fa-sync-alt me-1" />Actualiser
                    </button>
                </div>

                {/* Résultat acceptation */}
                {resultat && (
                    <div className="alert alert-success mb-4">
                        <div className="d-flex justify-content-between align-items-start">
                            <strong><i className="fas fa-check-circle me-2" />Établissement créé !</strong>
                            <button className="btn-close" onClick={() => setResultat(null)} />
                        </div>
                        <div className="mt-2 p-3 rounded-3" style={{ background: 'rgba(0,0,0,.05)' }}>
                            <div className="row g-2 small">
                                <div className="col-sm-6">
                                    <div className="text-muted">Domaine</div>
                                    <div className="fw-semibold">{resultat.domaine}</div>
                                </div>
                                <div className="col-sm-6">
                                    <div className="text-muted">Email admin</div>
                                    <div className="fw-semibold d-flex align-items-center gap-2">
                                        {resultat.email}
                                        <button className="btn btn-sm btn-outline-secondary py-0 px-1"
                                            onClick={() => navigator.clipboard.writeText(resultat.email)}
                                            title="Copier"><i className="fas fa-copy" style={{ fontSize: 11 }} /></button>
                                    </div>
                                </div>
                                {resultat.mot_de_passe && (
                                    <div className="col-sm-6">
                                        <div className="text-muted">Mot de passe temporaire</div>
                                        <div className="fw-semibold d-flex align-items-center gap-2">
                                            <code className="text-dark bg-white px-2 py-0 rounded">{resultat.mot_de_passe}</code>
                                            <button className="btn btn-sm btn-outline-secondary py-0 px-1"
                                                onClick={() => navigator.clipboard.writeText(resultat.mot_de_passe)}
                                                title="Copier"><i className="fas fa-copy" style={{ fontSize: 11 }} /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {erreur && (
                    <div className="alert alert-danger small mb-4">
                        <i className="fas fa-exclamation-circle me-2" />{erreur}
                        <button className="btn-close float-end" onClick={() => setErreur('')} />
                    </div>
                )}

                {/* Filtres */}
                <div className="d-flex gap-2 mb-3">
                    {[
                        { val: 'en_attente', label: 'En attente' },
                        { val: 'acceptee',   label: 'Acceptées' },
                        { val: 'refusee',    label: 'Refusées' },
                        { val: 'toutes',     label: 'Toutes' },
                    ].map(f => (
                        <button key={f.val}
                            className={`btn btn-sm ${filtre === f.val ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => setFiltre(f.val)}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {chargement ? (
                    <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
                ) : demandes.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                        <i className="fas fa-inbox fa-3x mb-3 d-block opacity-25" />
                        Aucune demande {filtre !== 'toutes' ? `"${STATUT_BADGE[filtre]?.label?.toLowerCase()}"` : ''}.
                    </div>
                ) : (
                    <div className="card shadow-sm">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Établissement</th>
                                        <th>Type</th>
                                        <th>Code MENET</th>
                                        <th>Responsable</th>
                                        <th>Date</th>
                                        <th>Statut</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {demandes.map(d => (
                                        <tr key={d.id}>
                                            <td>
                                                <div className="fw-semibold">{d.nom_etablissement}</div>
                                                {d.ville && <div className="text-muted small"><i className="fas fa-map-marker-alt me-1" />{d.ville}</div>}
                                            </td>
                                            <td><span className="badge bg-light text-dark border">{TYPES[d.type] ?? d.type}</span></td>
                                            <td><code>{d.code_ministere}</code></td>
                                            <td>
                                                <div>{d.nom_responsable}</div>
                                                <div className="text-muted small">{d.email}</div>
                                                {d.telephone && <div className="text-muted small">{d.telephone}</div>}
                                            </td>
                                            <td className="small text-muted">
                                                {new Date(d.created_at).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td>
                                                <span className={`badge ${STATUT_BADGE[d.statut]?.cls ?? 'bg-secondary'}`}>
                                                    {STATUT_BADGE[d.statut]?.label ?? d.statut}
                                                </span>
                                            </td>
                                            <td className="text-end">
                                                {d.statut === 'en_attente' && (
                                                    <div className="d-flex gap-1 justify-content-end">
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            onClick={() => accepter(d.id)}
                                                            disabled={traitement === d.id}
                                                            title="Créer l'établissement et envoyer les accès">
                                                            {traitement === d.id
                                                                ? <span className="spinner-border spinner-border-sm" />
                                                                : <><i className="fas fa-check me-1" />Accepter</>
                                                            }
                                                        </button>
                                                        <button
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => { setIdRefus(d.id); setNotesRefus(''); }}
                                                            title="Refuser la demande">
                                                            <i className="fas fa-times" />
                                                        </button>
                                                    </div>
                                                )}
                                                {d.statut === 'acceptee' && (
                                                    <div className="text-end">
                                                        {d.tenant_id && <div className="text-muted small mb-1">{d.tenant_id}</div>}
                                                        {d.mot_de_passe_initial && (
                                                            <button className="btn btn-outline-secondary btn-sm"
                                                                onClick={() => setCredentialsVus(d)}
                                                                title="Voir les credentials">
                                                                <i className="fas fa-key me-1" />Credentials
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal credentials */}
            {credentialsVus && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fas fa-key me-2 text-warning" />
                                    Credentials — {credentialsVus.nom_etablissement}
                                </h5>
                                <button className="btn-close" onClick={() => setCredentialsVus(null)} />
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-warning small py-2">
                                    <i className="fas fa-info-circle me-2" />
                                    Ces informations ont été envoyées par email à l'établissement. L'admin devra changer son mot de passe à la 1ère connexion.
                                </div>
                                {[
                                    { label: 'Email', val: credentialsVus.email },
                                    { label: 'Mot de passe temporaire', val: credentialsVus.mot_de_passe_initial },
                                    { label: 'Domaine', val: `${credentialsVus.tenant_id}.localhost` },
                                ].map(({ label, val }) => (
                                    <div key={label} className="mb-3">
                                        <div className="form-label small fw-semibold text-muted">{label}</div>
                                        <div className="input-group">
                                            <input type="text" className="form-control form-control-sm" readOnly value={val || '—'} />
                                            <button className="btn btn-outline-secondary btn-sm"
                                                onClick={() => navigator.clipboard.writeText(val || '')}
                                                title="Copier">
                                                <i className="fas fa-copy" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary btn-sm" onClick={() => setCredentialsVus(null)}>Fermer</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal refus */}
            {idRefus && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Refuser la demande</h5>
                                <button className="btn-close" onClick={() => setIdRefus(null)} />
                            </div>
                            <div className="modal-body">
                                <label className="form-label small fw-semibold">Motif (optionnel)</label>
                                <textarea className="form-control" rows={3}
                                    placeholder="Ex : Code MENET introuvable, informations incomplètes…"
                                    value={notesRefus} onChange={e => setNotesRefus(e.target.value)} />
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setIdRefus(null)}>Annuler</button>
                                <button className="btn btn-danger" onClick={refuser} disabled={traitement === idRefus}>
                                    {traitement === idRefus
                                        ? <span className="spinner-border spinner-border-sm" />
                                        : 'Confirmer le refus'
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default DemandesAcces;
