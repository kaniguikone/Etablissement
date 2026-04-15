import { useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { EtablissementProvider } from './context/EtablissementContext';
import { NotificationProvider } from './context/NotificationContext';
import Menu from './components/Menu';
import MenuGroupe from './components/groupe/MenuGroupe';
import Topbar, { TOPBAR_HEIGHT } from './components/Topbar';
import NotificationsPanel from './components/notifications/NotificationsPanel';
import RoutesMenu from './route/RoutesMenu';

const SIDEBAR_WIDTH = 310;

const AppInterne = () => {
    const { user, estGroupe } = useAuth();
    const location = useLocation();
    const surLogin = location.pathname === '/login';

    const connecte = user && !surLogin;

    return (
        <div>
            {connecte && (estGroupe ? <MenuGroupe /> : <Menu />)}
            {connecte && !estGroupe && (
                <>
                    <Topbar sidebarWidth={SIDEBAR_WIDTH} />
                    <NotificationsPanel />
                </>
            )}
            <div style={connecte ? { marginLeft: SIDEBAR_WIDTH, marginTop: TOPBAR_HEIGHT, minHeight: '100vh' } : {}}>
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
