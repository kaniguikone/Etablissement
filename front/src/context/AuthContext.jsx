import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api, { centralApi, getSessionType, sessionKey } from '../api/axios';

const AuthContext = createContext(null);

const lireSession = (type) => {
    const raw = localStorage.getItem(sessionKey(type));
    return raw ? JSON.parse(raw) : null;
};

const ecrireSession = (type, tok, u) => {
    localStorage.setItem(sessionKey(type), JSON.stringify({ token: tok, user: u }));
};

const supprimerSession = (type) => {
    localStorage.removeItem(sessionKey(type));
};

export const AuthProvider = ({ children }) => {
    const location = useLocation();
    const [user, setUser]   = useState(() => lireSession(getSessionType())?.user ?? null);
    const [token, setToken] = useState(() => lireSession(getSessionType())?.token ?? null);

    // Chaque espace (/groupe, /superadmin·/backoffice, /enseignant, école) a sa propre
    // session en localStorage : on recharge celle qui correspond à l'URL courante à chaque
    // navigation, ce qui permet de rester connecté simultanément à plusieurs espaces
    // dans des onglets différents du même navigateur.
    useEffect(() => {
        const s = lireSession(getSessionType());
        setUser(s?.user ?? null);
        setToken(s?.token ?? null);
    }, [location.pathname]);

    // Connexion admin école (tenant)
    const connexion = useCallback(async (email, password) => {
        const res = await api.post('/login', { email, password });
        const { token: tok, user: u, group_id, group_nom, must_change_password } = res.data;
        const userAvecType = {
            ...u,
            _type: 'school',
            group_id: group_id ?? null,
            group_nom: group_nom ?? null,
            must_change_password: !!must_change_password,
        };
        ecrireSession('school', tok, userAvecType);
        setToken(tok);
        setUser(userAvecType);
    }, []);

    // Connexion enseignant via numéro de téléphone
    const connexionEnseignant = useCallback(async (numero, password) => {
        const res = await api.post('/enseignant/login', { numero_enseignant: numero, password });
        const { token: tok, enseignant } = res.data;
        const userAvecType = {
            ...enseignant,
            _type: 'enseignant',
            name: `${enseignant.prenoms ?? ''} ${enseignant.nom ?? ''}`.trim(),
            role_label: 'Enseignant',
        };
        ecrireSession('enseignant', tok, userAvecType);
        setToken(tok);
        setUser(userAvecType);
    }, []);

    // Connexion admin groupe (domaine central)
    const connexionGroupe = useCallback(async (email, password) => {
        const res = await centralApi.post('/group/login', { email, password });
        const { token: tok, admin } = res.data;
        const userAvecType = { ...admin, _type: 'group' };
        ecrireSession('group', tok, userAvecType);
        setToken(tok);
        setUser(userAvecType);
    }, []);

    // Connexion super-admin opérateur (domaine central)
    const connexionSuperAdmin = useCallback(async (email, password) => {
        const res = await centralApi.post('/superadmin/login', { email, password });
        const { token: tok, admin } = res.data;
        const userAvecType = { ...admin, _type: 'superadmin' };
        ecrireSession('superadmin', tok, userAvecType);
        setToken(tok);
        setUser(userAvecType);
    }, []);

    const deconnexion = useCallback(async () => {
        try {
            if (user?._type === 'group') {
                await centralApi.post('/group/logout');
            } else if (user?._type === 'superadmin') {
                await centralApi.post('/superadmin/logout');
            } else {
                await api.post('/logout');
            }
        } catch (_) {}
        supprimerSession(getSessionType());
        setToken(null);
        setUser(null);
    }, [user]);

    const mettreAJourSession = useCallback((tok, u) => {
        const userAvecType = { ...u, _type: 'school', group_id: u.group_id ?? null, group_nom: u.group_nom ?? null };
        ecrireSession('school', tok, userAvecType);
        setToken(tok);
        setUser(userAvecType);
    }, []);

    const estGroupe      = user?._type === 'group';
    const estEnseignant  = user?._type === 'enseignant';
    const estSuperAdmin  = user?._type === 'superadmin';
    const estDansGroupe  = user?._type === 'school' && !!user?.group_id;
    const groupeNom      = user?.group_nom ?? null;

    /**
     * Vérifie si l'utilisateur a au moins une des permissions demandées.
     * Les admins groupe ont accès à tout (lecture consolidée).
     */
    const peutAcceder = useCallback((permissions) => {
        if (!user) return false;
        if (user.super || estGroupe) return true;
        if (!permissions || permissions.length === 0) return true;
        const liste = Array.isArray(permissions) ? permissions : [permissions];
        return liste.some(p => (user.permissions ?? []).includes(p));
    }, [user, estGroupe]);

    return (
        <AuthContext.Provider value={{ user, token, connexion, connexionEnseignant, connexionGroupe, connexionSuperAdmin, deconnexion, peutAcceder, mettreAJourSession, estGroupe, estEnseignant, estSuperAdmin, estDansGroupe, groupeNom }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
