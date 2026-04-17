import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const EnseignantMessagerie = () => {
    const { toast } = useToast();
    const [conversations, setConversations] = useState([]);
    const [selectee, setSelectee]           = useState(null);
    const [messages, setMessages]           = useState([]);
    const [texte, setTexte]                 = useState('');
    const [envoi, setEnvoi]                 = useState(false);
    const [chargement, setChargement]       = useState(true);
    const endRef = useRef(null);

    const chargerConversations = () => {
        api.get('/enseignant/messages/conversations')
            .then(({ data }) => setConversations(data))
            .catch(() => toast('Erreur chargement.', 'danger'))
            .finally(() => setChargement(false));
    };

    useEffect(() => { chargerConversations(); }, []);

    const ouvrirConversation = async (conv) => {
        setSelectee(conv);
        try {
            const { data } = await api.get(`/enseignant/messages/eleve/${conv.eleve_id ?? 0}`, {
                params: { autre_type: conv.autre_type, autre_id: conv.autre_id },
            });
            setMessages(data);
            setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            // Mettre à jour le badge non-lus localement
            setConversations(prev => prev.map(c =>
                c === conv ? { ...c, non_lus: 0 } : c
            ));
        } catch {
            toast('Erreur.', 'danger');
        }
    };

    const envoyer = async () => {
        if (!texte.trim() || !selectee) return;
        setEnvoi(true);
        try {
            await api.post('/enseignant/messages', {
                destinataire_type: selectee.autre_type,
                destinataire_id:   selectee.autre_id,
                eleve_id:          selectee.eleve_id ?? undefined,
                contenu:           texte.trim(),
            });
            setTexte('');
            await ouvrirConversation(selectee);
            chargerConversations();
        } catch {
            toast('Erreur envoi.', 'danger');
        } finally {
            setEnvoi(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer(); }
    };

    const formatDate = (str) => {
        if (!str) return '';
        const d = new Date(str);
        const now = new Date();
        const estAujourd = d.toDateString() === now.toDateString();
        if (estAujourd) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
             + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="container-fluid py-4">
            <h4 className="mb-4 fw-bold"><i className="fas fa-comments me-2 text-primary" />Messagerie</h4>

            {chargement ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : (
                <div className="card border-0 shadow-sm" style={{ height: '72vh', display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
                    {/* Liste conversations */}
                    <div style={{ width: 300, borderRight: '1px solid #dee2e6', overflowY: 'auto', flexShrink: 0 }}>
                        <div className="p-3 border-bottom bg-light d-flex justify-content-between align-items-center">
                            <strong style={{ fontSize: 14 }}>Conversations</strong>
                            <span className="badge bg-secondary">{conversations.length}</span>
                        </div>
                        {conversations.length === 0 ? (
                            <div className="text-center text-muted py-5 small">Aucune conversation</div>
                        ) : conversations.map((c, i) => (
                            <div key={i}
                                className={`p-3 border-bottom d-flex gap-2 align-items-start ${selectee === c ? 'bg-primary bg-opacity-10' : ''}`}
                                style={{ cursor: 'pointer' }}
                                onClick={() => ouvrirConversation(c)}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                    background: '#1a56a0', color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700,
                                }}>
                                    {c.autre_nom?.[0]?.toUpperCase() ?? '?'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="d-flex justify-content-between">
                                        <span className={`small text-truncate ${c.non_lus > 0 ? 'fw-bold' : 'fw-semibold'}`}>
                                            {c.autre_nom}
                                        </span>
                                        <span className="text-muted" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                                            {formatDate(c.dernier_at)}
                                        </span>
                                    </div>
                                    {c.eleve_nom && <div className="text-muted" style={{ fontSize: 11 }}>{c.eleve_nom}</div>}
                                    <div className="text-truncate" style={{ fontSize: 12, color: '#555' }}>{c.dernier_msg}</div>
                                </div>
                                {c.non_lus > 0 && (
                                    <span className="badge bg-primary rounded-pill align-self-center">{c.non_lus}</span>
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
                                        <div className="fw-semibold small">{selectee.autre_nom}</div>
                                        {selectee.eleve_nom && <div className="text-muted" style={{ fontSize: 11 }}>{selectee.eleve_nom}</div>}
                                    </div>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                                    {messages.map(m => {
                                        const estMoi = m.expediteur_type === 'enseignant';
                                        return (
                                            <div key={m.id} className="mb-3 d-flex"
                                                style={{ justifyContent: estMoi ? 'flex-end' : 'flex-start' }}>
                                                <div style={{
                                                    maxWidth: '70%', padding: '8px 12px', borderRadius: 12,
                                                    background: estMoi ? '#1a56a0' : '#f0f0f0',
                                                    color: estMoi ? '#fff' : '#000',
                                                    fontSize: 14,
                                                }}>
                                                    <div>{m.contenu}</div>
                                                    <div style={{ fontSize: 10, opacity: .7, marginTop: 4, textAlign: 'right' }}>
                                                        {formatDate(m.created_at)}
                                                        {m.lu_at && <i className="fas fa-check-double ms-1" />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={endRef} />
                                </div>

                                <div className="p-3 border-top bg-light d-flex gap-2 align-items-end">
                                    <textarea
                                        className="form-control form-control-sm"
                                        rows={2}
                                        placeholder="Écrire un message… (Entrée pour envoyer)"
                                        value={texte}
                                        onChange={e => setTexte(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        style={{ resize: 'none', borderRadius: 12 }}
                                    />
                                    <button className="btn btn-primary btn-sm"
                                        onClick={envoyer} disabled={envoi || !texte.trim()}
                                        style={{ borderRadius: 20, padding: '8px 14px', flexShrink: 0 }}>
                                        {envoi
                                            ? <span className="spinner-border spinner-border-sm" />
                                            : <i className="fas fa-paper-plane" />
                                        }
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnseignantMessagerie;
