import React, { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const Messagerie = () => {
    const { toast } = useToast();
    const [conversations, setConversations] = useState([]);
    const [selectee, setSelectee] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chargement, setChargement] = useState(true);
    const endRef = useRef(null);

    useEffect(() => {
        api.get('/messages')
            .then(({ data }) => setConversations(data))
            .catch(() => toast('Erreur lors du chargement.', 'danger'))
            .finally(() => setChargement(false));
    }, []);

    const ouvrirConversation = async (conv) => {
        setSelectee(conv);
        try {
            const { data } = await api.get(`/messages/conversation/${conv.exp}/${conv.dest}`, {
                params: { eleve_id: conv.eleve_id },
            });
            setMessages(data);
            setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch {
            toast('Erreur.', 'danger');
        }
    };

    const formatDate = (str) => {
        if (!str) return '';
        const d = new Date(str);
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
             + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="container-fluid py-4">
            <h4 className="mb-4"><i className="fas fa-comments me-2 text-primary" />Messagerie</h4>

            {chargement ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : (
                <div className="card" style={{ height: '70vh', display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
                    {/* Liste conversations */}
                    <div style={{ width: 320, borderRight: '1px solid #dee2e6', overflowY: 'auto', flexShrink: 0 }}>
                        <div className="p-3 border-bottom bg-light">
                            <strong>Conversations</strong>
                            <span className="badge bg-secondary ms-2">{conversations.length}</span>
                        </div>
                        {conversations.length === 0 ? (
                            <div className="text-center text-muted py-5 small">Aucune conversation</div>
                        ) : conversations.map((c, i) => (
                            <div key={i}
                                className={`p-3 border-bottom d-flex gap-2 align-items-start ${selectee === c ? 'bg-primary bg-opacity-10' : ''}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => ouvrirConversation(c)}>
                                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0"
                                    style={{ width: 36, height: 36, fontSize: 14 }}>
                                    {c.autre_nom?.[0]?.toUpperCase() ?? '?'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="d-flex justify-content-between">
                                        <span className="fw-semibold small text-truncate">{c.autre_nom}</span>
                                        <span className="text-muted" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                                            {formatDate(c.dernier_at)}
                                        </span>
                                    </div>
                                    {c.eleve_nom && <div className="text-muted" style={{ fontSize: 11 }}>{c.eleve_nom}</div>}
                                    <div className="text-truncate" style={{ fontSize: 12, color: '#555' }}>
                                        {c.dernier_msg}
                                    </div>
                                </div>
                                {c.non_lus > 0 && (
                                    <span className="badge bg-danger rounded-pill align-self-center">{c.non_lus}</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Fil de discussion */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {!selectee ? (
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                                <div className="text-center">
                                    <i className="fas fa-comments fa-3x mb-3 opacity-25" />
                                    <p>Sélectionnez une conversation</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="p-3 border-bottom bg-light d-flex align-items-center gap-2">
                                    <i className="fas fa-user-circle fa-lg text-primary" />
                                    <div>
                                        <div className="fw-semibold">{selectee.autre_nom}</div>
                                        {selectee.eleve_nom && <div className="text-muted small">{selectee.eleve_nom}</div>}
                                    </div>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                                    {messages.map(m => {
                                        const estAdmin = true; // vue admin = lecture seule
                                        return (
                                            <div key={m.id} className="mb-3 d-flex"
                                                style={{ justifyContent: m.expediteur_type === selectee.autre_type ? 'flex-start' : 'flex-end' }}>
                                                <div style={{
                                                    maxWidth: '70%', padding: '8px 12px', borderRadius: 12,
                                                    background: m.expediteur_type === selectee.autre_type ? '#f0f0f0' : '#0d6efd',
                                                    color: m.expediteur_type === selectee.autre_type ? '#000' : '#fff',
                                                    fontSize: 14,
                                                }}>
                                                    <div>{m.contenu}</div>
                                                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
                                                        {formatDate(m.created_at)}
                                                        {m.lu_at && <i className="fas fa-check-double ms-1" />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={endRef} />
                                </div>

                                <div className="p-3 border-top bg-light">
                                    <div className="text-muted small fst-italic text-center">
                                        <i className="fas fa-info-circle me-1" />
                                        Vue lecture seule — les réponses se font depuis l'application mobile.
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Messagerie;
