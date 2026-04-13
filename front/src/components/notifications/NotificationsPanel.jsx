import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';

const ICONES = {
    absence:       { icon: 'fas fa-user-times',    couleur: '#dc3545' },
    bulletin:      { icon: 'fas fa-file-alt',       couleur: '#0d6efd' },
    paiement:        { icon: 'fas fa-exclamation-circle', couleur: '#fd7e14' },
    information:   { icon: 'fas fa-info-circle',   couleur: '#0dcaf0' },
    devoir:        { icon: 'fas fa-pencil-alt',    couleur: '#6f42c1' },
    inscription:   { icon: 'fas fa-user-check',    couleur: '#198754' },
};

const ItemNotification = ({ notif, onLire, onSupprimer }) => {
    const config  = ICONES[notif.type] ?? { icon: 'fas fa-bell', couleur: '#6c757d' };
    const dateStr = new Date(notif.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });

    return (
        <div
            onClick={() => !notif.est_lu && onLire(notif.id)}
            style={{
                display: 'flex', gap: 10, padding: '10px 14px',
                borderBottom: '1px solid rgba(0,0,0,.06)',
                background: notif.est_lu ? 'transparent' : 'rgba(13, 110, 253, .05)',
                cursor: notif.est_lu ? 'default' : 'pointer',
                transition: 'background .15s',
            }}
        >
            <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: config.couleur + '20', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <i className={config.icon} style={{ color: config.couleur, fontSize: 14 }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: notif.est_lu ? 400 : 600, fontSize: 13, lineHeight: 1.3 }}>
                    {notif.titre}
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2, lineHeight: 1.4 }}>
                    {notif.corps}
                </div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                    {dateStr}
                </div>
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); onSupprimer(notif.id); }}
                style={{
                    background: 'none', border: 'none', color: '#ccc',
                    cursor: 'pointer', padding: 4, alignSelf: 'flex-start', flexShrink: 0,
                    fontSize: 12,
                }}
                title="Supprimer"
            >
                <i className="fas fa-times" />
            </button>
        </div>
    );
};

const NotificationsPanel = () => {
    const navigate = useNavigate();
    const panelRef = useRef(null);
    const {
        notifications, loading, panelOuvert,
        marquerLue, marquerToutesLues, supprimer, fermerPanel,
        nonLues,
    } = useNotifications();

    // Fermer en cliquant en dehors
    useEffect(() => {
        if (!panelOuvert) return;
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) fermerPanel();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [panelOuvert, fermerPanel]);

    if (!panelOuvert) return null;

    return (
        <div
            ref={panelRef}
            style={{
                position: 'fixed', top: 0, right: 0, width: 360, height: '100vh',
                background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,.15)',
                zIndex: 10000, display: 'flex', flexDirection: 'column',
                animation: 'slideInRight .2s ease',
            }}
        >
            {/* En-tête */}
            <div style={{
                padding: '14px 16px', borderBottom: '1px solid #eee',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
            }}>
                <div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Notifications</span>
                    {nonLues > 0 && (
                        <span style={{
                            background: '#dc3545', color: '#fff', borderRadius: 10,
                            fontSize: 11, padding: '1px 7px', marginLeft: 8,
                        }}>
                            {nonLues}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {nonLues > 0 && (
                        <button
                            onClick={marquerToutesLues}
                            style={{
                                background: 'none', border: 'none', color: '#0d6efd',
                                cursor: 'pointer', fontSize: 12,
                            }}
                        >
                            Tout marquer lu
                        </button>
                    )}
                    <button
                        onClick={() => { fermerPanel(); navigate('/Notifications'); }}
                        style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 12 }}
                    >
                        Voir tout
                    </button>
                    <button
                        onClick={fermerPanel}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 16 }}
                    >
                        <i className="fas fa-times" />
                    </button>
                </div>
            </div>

            {/* Liste */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>
                        <i className="fas fa-spinner fa-spin" /> Chargement…
                    </div>
                ) : notifications.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#bbb' }}>
                        <i className="fas fa-bell-slash" style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
                        Aucune notification
                    </div>
                ) : (
                    notifications.map(n => (
                        <ItemNotification
                            key={n.id}
                            notif={n}
                            onLire={marquerLue}
                            onSupprimer={supprimer}
                        />
                    ))
                )}
            </div>

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default NotificationsPanel;
