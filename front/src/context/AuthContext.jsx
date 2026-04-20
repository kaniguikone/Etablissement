import { createContext, useContext, useState, useCallback } from 'react';
import api, { centralApi } from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser]   = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const [token, setToken] = useState(() => localStorage.getItem('token') || null);

    // Connexion admin école (tenant)
    const connexion = useCallback(async (email, password) => {
        const res = await api.post('/login', { email, password });
        const { token: tok, user: u, group_id, group_nom } = res.data;
        const userAvecType = { ...u, _type: 'school', group_id: group_id ?? null, group_nom: group_nom ?? null };
        localStorage.setItem('token', tok);
        localStorage.setItem('user', JSON.stringify(userAvecType));
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
        localStorage.setItem('token', tok);
        localStorage.setItem('user', JSON.stringify(userAvecType));
        setToken(tok);
        setUser(userAvecType);
    }, []);

    // Connexion admin groupe (domaine central)
    const connexionGroupe = useCallback(async (email, password) => {
        const res = await centralApi.post('/group/login', { email, password });
        const { token: tok, admin } = res.data;
        const userAvecType = { ...admin, _type: 'group' };
        localStorage.setItem('token', tok);
        localStorage.setItem('user', JSON.stringify(userAvecType));
        setToken(tok);
        setUser(userAvecType);
    }, []);

    const deconnexion = useCallback(async () => {
        try {
            if (user?._type === 'group') {
                await centralApi.post('/group/logout');
            } else {
                await api.post('/logout');
            }
        } catch (_) {}
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    }, [user]);

    const estGroupe      = user?._type === 'group';
    const estEnseignant  = user?._type === 'enseignant';
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
        <AuthContext.Provider value={{ user, token, connexion, connexionEnseignant, connexionGroupe, deconnexion, peutAcceder, estGroupe, estEnseignant, estDansGroupe, groupeNom }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
