import axios from 'axios';

/**
 * En développement (localhost) → utilise VITE_API_URL du .env
 * En production (sous-domaine école) → utilise le hostname courant
 * Ex: lycee-moderne.tondomaine.ci → https://lycee-moderne.tondomaine.ci
 */
const getBase = () => {
    const hostname = window.location.hostname;

    // Sous-domaine .localhost (ex: lycee-test.localhost, ecole-independante.localhost)
    // → l'API tourne sur le même hostname, port 8000 (php artisan serve)
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname.endsWith('.localhost')) {
        return `http://${hostname}:8000`;
    }

    // localhost pur → utilise VITE_API_URL
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/api$/, '');
    }

    // Production → même domaine
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${protocol}//${hostname}${port}`;
};

const BASE = getBase();

/**
 * Détermine quel "espace" est actif d'après l'URL courante, pour permettre
 * plusieurs sessions simultanées dans le même navigateur (ex : /groupe dans
 * un onglet, /backoffice dans un autre) sans qu'elles s'écrasent l'une l'autre.
 */
export const getSessionType = () => {
    const p = window.location.pathname;
    if (p.startsWith('/groupe')) return 'group';
    if (p.startsWith('/superadmin') || p === '/backoffice') return 'superadmin';
    if (p.startsWith('/enseignant')) return 'enseignant';
    return 'school';
};

export const sessionKey = (type) => `session_${type}`;

const lireToken = (type) => {
    const raw = localStorage.getItem(sessionKey(type));
    return raw ? JSON.parse(raw).token : null;
};

const gererNonAutorise = (type) => {
    const onAuthPage = window.location.pathname === '/login' || window.location.pathname === '/backoffice';
    if (onAuthPage) return;
    localStorage.removeItem(sessionKey(type));
    window.location.href = type === 'superadmin' ? '/backoffice' : '/login';
};

const api = axios.create({
    baseURL: BASE + '/api',
    timeout: 10000,
});

// Injecte automatiquement le token Bearer de la session active (école ou enseignant)
api.interceptors.request.use((config) => {
    const token = lireToken(getSessionType());
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Gestion globale des erreurs réseau et serveur
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            gererNonAutorise(getSessionType());
        } else if (error.code === 'ECONNABORTED') {
            // Timeout — signalé via le rejet, les composants affichent leur propre message
            error._userMessage = 'La requête a pris trop de temps. Vérifiez votre connexion.';
        } else if (!error.response) {
            // Pas de réponse du serveur (réseau coupé, CORS, serveur éteint)
            error._userMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
        }
        return Promise.reject(error);
    }
);

/** Construit l'URL absolue d'une ressource backend (photo, fichier…) */
export const backendUrl = (path) => (path ? BASE + path : null);

/**
 * Instance axios pour le domaine central (API groupe, super-admin).
 * Toujours pointe vers le serveur central, quel que soit le sous-domaine.
 */
const CENTRAL_BASE = (import.meta.env.VITE_CENTRAL_API_URL || 'http://localhost:8000/api').replace(/\/api$/, '');

export const centralApi = axios.create({
    baseURL: CENTRAL_BASE + '/api',
    timeout: 10000,
});

// Injecte automatiquement le token Bearer de la session active (groupe ou opérateur)
centralApi.interceptors.request.use((config) => {
    const token = lireToken(getSessionType());
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

centralApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            gererNonAutorise(getSessionType());
        }
        return Promise.reject(error);
    }
);

export default api;
