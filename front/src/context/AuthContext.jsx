import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser]   = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const [token, setToken] = useState(() => localStorage.getItem('token') || null);

    const connexion = useCallback(async (email, password) => {
        const res = await api.post('/login', { email, password });
        const { token: tok, user: u } = res.data;
        localStorage.setItem('token', tok);
        localStorage.setItem('user',  JSON.stringify(u));
        setToken(tok);
        setUser(u);
    }, []);

    const deconnexion = useCallback(async () => {
        try { await api.post('/logout'); } catch (_) {}
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    }, []);

    /**
     * Vérifie si l'utilisateur a au moins une des permissions demandées.
     * @param {string|string[]} permissions - une permission ou un tableau
     */
    const peutAcceder = useCallback((permissions) => {
        if (!user) return false;
        if (user.super) return true;
        if (!permissions || permissions.length === 0) return true;

        const liste = Array.isArray(permissions) ? permissions : [permissions];
        return liste.some(p => (user.permissions ?? []).includes(p));
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, token, connexion, deconnexion, peutAcceder }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
