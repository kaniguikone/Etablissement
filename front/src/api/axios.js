import axios from 'axios';

/**
 * En développement (localhost) → utilise VITE_API_URL du .env
 * En production (sous-domaine école) → utilise le hostname courant
 * Ex: lycee-moderne.tondomaine.ci → https://lycee-moderne.tondomaine.ci
 */
const getBase = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/api$/, '');
    }
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${protocol}//${hostname}${port}`;
};

const BASE = getBase();

const api = axios.create({
    baseURL: BASE + '/api',
});

// Injecte automatiquement le token Bearer sur chaque requête
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Redirige vers /login si le serveur répond 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const onLoginPage = window.location.pathname === '/login';
            if (!onLoginPage) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

/** Construit l'URL absolue d'une ressource backend (photo, fichier…) */
export const backendUrl = (path) => (path ? BASE + path : null);

export default api;
