import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from '../api/axios';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const POLL_INTERVAL = 30_000; // 30 secondes

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [nonLues, setNonLues]       = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading]       = useState(false);
    const [panelOuvert, setPanelOuvert] = useState(false);
    const intervalRef = useRef(null);

    // ── Polling du badge ─────────────────────────────────────────────────────

    const fetchBadge = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await axios.get('/notifications/non-lues');
            setNonLues(data.count ?? 0);
        } catch {
            // silencieux
        }
    }, [user]);

    useEffect(() => {
        if (!user) {
            setNonLues(0);
            return;
        }
        fetchBadge();
        intervalRef.current = setInterval(fetchBadge, POLL_INTERVAL);
        return () => clearInterval(intervalRef.current);
    }, [user, fetchBadge]);

    // ── Chargement complet ────────────────────────────────────────────────────

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/notifications');
            setNotifications(data.data ?? []);
            setNonLues(data.data?.filter(n => !n.est_lu).length ?? 0);
        } catch {
            // silencieux
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Actions ───────────────────────────────────────────────────────────────

    const marquerLue = useCallback(async (id) => {
        try {
            await axios.post(`/notifications/${id}/lire`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, lu_le: new Date().toISOString(), est_lu: true } : n)
            );
            setNonLues(prev => Math.max(0, prev - 1));
        } catch {
            // silencieux
        }
    }, []);

    const marquerToutesLues = useCallback(async () => {
        try {
            await axios.post('/notifications/lire-tout');
            setNotifications(prev => prev.map(n => ({ ...n, lu_le: new Date().toISOString(), est_lu: true })));
            setNonLues(0);
        } catch {
            // silencieux
        }
    }, []);

    const supprimer = useCallback(async (id) => {
        try {
            await axios.delete(`/notifications/${id}`);
            setNotifications(prev => {
                const removed = prev.find(n => n.id === id);
                if (removed && !removed.est_lu) setNonLues(c => Math.max(0, c - 1));
                return prev.filter(n => n.id !== id);
            });
        } catch {
            // silencieux
        }
    }, []);

    const ouvrirPanel = useCallback(() => {
        setPanelOuvert(true);
        fetchNotifications();
    }, [fetchNotifications]);

    const fermerPanel = useCallback(() => setPanelOuvert(false), []);

    return (
        <NotificationContext.Provider value={{
            nonLues,
            notifications,
            loading,
            panelOuvert,
            fetchNotifications,
            marquerLue,
            marquerToutesLues,
            supprimer,
            ouvrirPanel,
            fermerPanel,
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
