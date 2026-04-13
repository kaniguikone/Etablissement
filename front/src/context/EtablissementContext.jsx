import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const EtablissementContext = createContext(null);

export const EtablissementProvider = ({ children }) => {
    const [etablissement, setEtablissement] = useState(null);

    useEffect(() => {
        api.get('/etablissement')
            .then((r) => setEtablissement(r.data))
            .catch(() => {});
    }, []);

    // Appelé depuis ParametresEtablissement après une mise à jour
    const rafraichir = (data) => setEtablissement(data);

    return (
        <EtablissementContext.Provider value={{ etablissement, rafraichir }}>
            {children}
        </EtablissementContext.Provider>
    );
};

export const useEtablissement = () => useContext(EtablissementContext);
