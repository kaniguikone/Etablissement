import { useEffect, useState } from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';
import api from '../../api/axios';

const PaiementRetour = () => {
    const [params]      = useSearchParams();
    const transactionId = params.get('transaction_id');
    const [statut, setStatut]     = useState(null); // 'paid' | 'failed' | 'pending'
    const [chargement, setChargement] = useState(true);
    const [erreur, setErreur]     = useState('');

    useEffect(() => {
        if (!transactionId) { setChargement(false); return; }
        api.get(`/paiements/statut/${transactionId}`)
            .then((r) => { setStatut(r.data.statut_cinetpay); setChargement(false); })
            .catch(() => { setErreur('Impossible de vérifier le statut.'); setChargement(false); });
    }, [transactionId]);

    if (!transactionId) return (
        <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
            <p className="text-muted">Aucune transaction à vérifier.</p>
            <NavLink to="/Paiements" className="btn btn-primary mt-2">Retour aux paiements</NavLink>
        </div>
    );

    if (chargement) return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
            <div className="spinner-border text-primary" />
        </div>
    );

    return (
        <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '70vh' }}>
            <div className="card shadow-sm text-center p-4" style={{ maxWidth: 420, width: '100%' }}>

                {statut === 'paid' && <>
                    <div className="display-1 mb-3">✅</div>
                    <h4 className="text-success">Paiement accepté !</h4>
                    <p className="text-muted">Votre paiement a été traité avec succès.</p>
                    <div className="badge bg-success mb-3">Référence : {transactionId}</div>
                </>}

                {statut === 'failed' && <>
                    <div className="display-1 mb-3">❌</div>
                    <h4 className="text-danger">Paiement échoué</h4>
                    <p className="text-muted">Le paiement a été refusé ou annulé.</p>
                    <div className="badge bg-danger mb-3">Référence : {transactionId}</div>
                </>}

                {statut === 'pending' && <>
                    <div className="display-1 mb-3">⏳</div>
                    <h4 className="text-warning">Paiement en attente</h4>
                    <p className="text-muted">Le paiement est en cours de traitement. Actualisez dans quelques instants.</p>
                    <button className="btn btn-warning mb-3"
                        onClick={() => { setChargement(true); setStatut(null);
                            api.get(`/paiements/statut/${transactionId}`)
                                .then((r) => setStatut(r.data.statut_cinetpay))
                                .finally(() => setChargement(false));
                        }}>
                        Actualiser le statut
                    </button>
                </>}

                {erreur && <div className="alert alert-danger">{erreur}</div>}

                <NavLink to="/Paiements" className="btn btn-outline-secondary mt-2">
                    Retour aux paiements
                </NavLink>
            </div>
        </div>
    );
};

export default PaiementRetour;
