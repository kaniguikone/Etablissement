import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PrivateRoute = ({ children, permissions }) => {
    const { user, peutAcceder, estGroupe } = useAuth();
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Un admin groupe qui tente d'accéder aux pages école → redirige vers son dashboard
    const surPageEcole = !location.pathname.startsWith('/groupe');
    if (estGroupe && surPageEcole) {
        return <Navigate to="/groupe" replace />;
    }

    if (permissions && !peutAcceder(permissions)) {
        return (
            <div className="content content-wrapper d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                <div className="text-center">
                    <i className="fas fa-ban text-danger" style={{ fontSize: 64 }} />
                    <h4 className="mt-3">Accès refusé</h4>
                    <p className="text-muted">Vous n'avez pas les droits pour accéder à cette page.</p>
                </div>
            </div>
        );
    }

    return children;
};

export default PrivateRoute;
