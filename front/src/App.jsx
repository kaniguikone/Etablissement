import { useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { EtablissementProvider } from './context/EtablissementContext';
import { NotificationProvider } from './context/NotificationContext';
import Menu from './components/Menu';
import NotificationsPanel from './components/notifications/NotificationsPanel';
import RoutesMenu from './route/RoutesMenu';

const AppInterne = () => {
    const { user }   = useAuth();
    const location   = useLocation();
    const surLogin   = location.pathname === '/login';

    return (
        <div>
            {user && !surLogin && <Menu />}
            {user && !surLogin && <NotificationsPanel />}
            <div style={user && !surLogin ? {
                marginLeft: 310,
                minHeight: '100vh',
            } : {}}>
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
