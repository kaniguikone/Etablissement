import { useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { EtablissementProvider } from './context/EtablissementContext';
import { NotificationProvider } from './context/NotificationContext';
import Menu from './components/Menu';
import MenuGroupe from './components/groupe/MenuGroupe';
import NotificationsPanel from './components/notifications/NotificationsPanel';
import RoutesMenu from './route/RoutesMenu';

const AppInterne = () => {
    const { user, estGroupe } = useAuth();
    const location = useLocation();
    const surLogin = location.pathname === '/login';

    const connecte = user && !surLogin;

    return (
        <div>
            {connecte && (estGroupe ? <MenuGroupe /> : <Menu />)}
            {connecte && !estGroupe && <NotificationsPanel />}
            <div style={connecte ? { marginLeft: 310, minHeight: '100vh' } : {}}>
                <RoutesMenu />
            </div>
        </div>
    );
};

function App() {
    return (
        <ToastProvider>
            <ConfirmProvider>
                <EtablissementProvider>
                    <AuthProvider>
                        <NotificationProvider>
                            <AppInterne />
                        </NotificationProvider>
                    </AuthProvider>
                </EtablissementProvider>
            </ConfirmProvider>
        </ToastProvider>
    );
}

export default App;
