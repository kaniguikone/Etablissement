/**
 * Extrait un message lisible depuis une erreur Axios.
 * Priorité : validation → message serveur → erreur réseau/timeout → fallback.
 */
export const extractErrorMessage = (err, fallback = 'Une erreur est survenue.') => {
    if (err?.response?.data?.errors) {
        return Object.values(err.response.data.errors).flat().join(' ');
    }
    if (err?.response?.data?.message) {
        return err.response.data.message;
    }
    if (err?._userMessage) {
        return err._userMessage;
    }
    if (!err?.response) {
        return 'Impossible de contacter le serveur. Vérifiez votre connexion.';
    }
    return fallback;
};
