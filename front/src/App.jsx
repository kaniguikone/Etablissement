import { useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { EtablissementProvider } from './context/EtablissementContext';
import { NotificationProvider } from './context/NotificationContext';
import Menu from './components/Menu';
import MenuGroupe from './components/groupe/MenuGroupe';
import MenuEnseignant from './components/enseignant/MenuEnseignant';
import MenuSuperAdmin from './components/superadmin/MenuSuperAdmin';
import Topbar, { TOPBAR_HEIGHT } from './components/Topbar';
import NotificationsPanel from './components/notifications/NotificationsPanel';
import AideContextuelle from './components/aide/AideContextuelle';
import RoutesMenu from './route/RoutesMenu';

const SIDEBAR_WIDTH = 310;

const AppInterne = () => {
    const { user, estGroupe, estEnseignant, estSuperAdmin } = useAuth();
    const location = useLocation();
    const PAGES_PUBLIQUES = ['/login', '/backoffice', '/', '/inscription-etablissement', '/inscription-parent', '/reinitialiser-mot-de-passe'];
    const surPagePublique = PAGES_PUBLIQUES.includes(location.pathname);

    const connecte = user && !surPagePublique;
    const avecSidebar = connecte && !estSuperAdmin;

    const renderMenu = () => {
        if (!connecte) return null;
        if (estSuperAdmin) return <MenuSuperAdmin />;
        if (estGroupe)     return <MenuGroupe />;
        if (estEnseignant) return <MenuEnseignant />;
        return <Menu />;
    };

    return (
        <div>
            {renderMenu()}
            {avecSidebar && !estGroupe && (
                <>
                    <Topbar sidebarWidth={SIDEBAR_WIDTH} />
                    <NotificationsPanel />
                </>
            )}
            <div style={connecte ? { marginLeft: SIDEBAR_WIDTH, marginTop: estSuperAdmin ? 0 : TOPBAR_HEIGHT, minHeight: '100vh' } : {}}>
                <RoutesMenu />
            </div>
            {avecSidebar && !estGroupe && !estEnseignant && <AideContextuelle />}
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
