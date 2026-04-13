import { useEffect, useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';

const ICONES = {
    absence:         { icon: 'fas fa-user-times',        couleur: '#dc3545', label: 'Absence'       },
    bulletin:        { icon: 'fas fa-file-alt',           couleur: '#0d6efd', label: 'Bulletin'      },
    paiement_retard: { icon: 'fas fa-exclamation-circle', couleur: '#fd7e14', label: 'Paiement'      },
    information:     { icon: 'fas fa-info-circle',        couleur: '#0dcaf0', label: 'Information'   },
    devoir:          { icon: 'fas fa-pencil-alt',         couleur: '#6f42c1', label: 'Devoir'        },
    inscription:     { icon: 'fas fa-user-check',         couleur: '#198754', label: 'Inscription'   },
};

const FILTRES = ['tous', 'non_lues', 'absence', 'bulletin', 'paiement_retard', 'information', 'devoir', 'inscription'];

const Notifications = () => {
    const { notifications, loading, fetchNotifications, marquerLue, marquerToutesLues, supprimer, nonLues } = useNotifications();
    const [filtre, setFiltre] = useState('tous');

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const notifsFiltrees = notifications.filter(n => {
        if (filtre === 'tous')     return true;
        if (filtre === 'non_lues') return !n.est_lu;
        return n.type === filtre;
    });

    return (
        <div className="container-fluid py-4" style={{ maxWidth: 800 }}>
            {/* En-tête */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                    <h4 className="mb-0">
                        <i className="fas fa-bell me-2 text-primary" />
                        Notifications
                        {nonLues > 0 && (
                            <span className="badge bg-danger ms-2" style={{ fontSize: 13 }}>
                                {nonLues}
                            </span>
                        )}
                    </h4>
                </div>
                {nonLues > 0 && (
                    <button className="btn btn-sm btn-outline-primary" onClick={marquerToutesLues}>
                        <i className="fas fa-check-double me-1" />
                        Tout marquer comme lu
                    </button>
                )}
            </div>

            {/* Filtres */}
            <div className="d-flex gap-2 flex-wrap mb-3">
                {FILTRES.map(f => (
                    <button
                        key={f}
                        onClick={() => setFiltre(f)}
                        className={`btn btn-sm ${filtre === f ? 'btn-primary' : 'btn-outline-secondary'}`}
                        style={{ borderRadius: 20 }}
                    >
                        {f === 'tous'     && 'Toutes'}
                        {f === 'non_lues' && `Non lues${nonLues > 0 ? ` (${nonLues})` : ''}`}
                        {ICONES[f] && (
                            <>
                                <i className={ICONES[f].icon + ' me-1'} />
                                {ICONES[f].label}
                            </>
                        )}
                    </button>
                ))}
            </div>

            {/* Liste */}
            {loading ? (
                <div className="text-center py-5 text-muted">
                    <i className="fas fa-spinner fa-spin fa-2x mb-2 d-block" />
                    Chargement…
                </div>
            ) : notifsFiltrees.length === 0 ? (
                <div className="text-center py-5 text-muted">
                    <i className="fas fa-bell-slash fa-3x mb-3 d-block" />
                    {filtre === 'tous' ? 'Aucune notification' : 'Aucune notification dans cette catégorie'}
                </div>
            ) : (
                <div className="card shadow-sm">
                    {notifsFiltrees.map((n, idx) => {
                        const cfg = ICONES[n.type] ?? { icon: 'fas fa-bell', couleur: '#6c757d', label: n.type };
                        const date = new Date(n.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'long', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                        });

                        return (
                            <div
                                key={n.id}
                                className={`d-flex gap-3 p-3 ${idx < notifsFiltrees.length - 1 ? 'border-bottom' : ''}`}
                                style={{
                                    background: n.est_lu ? 'transparent' : 'rgba(13, 110, 253, .04)',
                                    cursor: n.est_lu ? 'default' : 'pointer',
                                    transition: 'background .15s',
                                }}
                                onClick={() => !n.est_lu && marquerLue(n.id)}
                            >
                                <div style={{
                                    width: 40, height: 40, borderRadius: '50%',
                                    background: cfg.couleur + '20', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <i className={cfg.icon} style={{ color: cfg.couleur, fontSize: 16 }} />
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <span style={{ fontWeight: n.est_lu ? 500 : 700, fontSize: 14 }}>
                                            {n.titre}
                                        </span>
                                        {!n.est_lu && (
                                            <span className="badge rounded-pill bg-primary" style={{ fontSize: 10 }}>
                                                Nouveau
                                            </span>
                                        )}
                                        <span className="badge rounded-pill" style={{ fontSize: 10, background: cfg.couleur + '20', color: cfg.couleur }}>
                                            {cfg.label}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
                                        {n.corps}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#999' }}>
                                        <i className="fas fa-clock me-1" />
                                        {date}
                                    </div>
                                </div>

                                <div className="d-flex gap-2 align-items-start">
                                    {!n.est_lu && (
                                        <button
                                            className="btn btn-sm btn-outline-primary"
                                            style={{ fontSize: 11, padding: '2px 8px' }}
                                            onClick={(e) => { e.stopPropagation(); marquerLue(n.id); }}
                                            title="Marquer comme lu"
                                        >
                                            <i className="fas fa-check" />
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-sm btn-outline-danger"
                                        style={{ fontSize: 11, padding: '2px 8px' }}
                                        onClick={(e) => { e.stopPropagation(); supprimer(n.id); }}
                                        title="Supprimer"
                                    >
                                        <i className="fas fa-trash" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Notifications;
