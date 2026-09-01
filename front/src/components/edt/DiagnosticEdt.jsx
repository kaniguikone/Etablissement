import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const LIBELLES = {
    grille:        { titre: 'Grille horaire', lien: '/GrilleHoraire', action: 'Configurer la grille' },
    familles:      { titre: 'Familles de matières', lien: '/ConfigMatieres', action: 'Configurer les matières' },
    salles_classe: { titre: 'Salles attitrées', lien: '/Classes', action: 'Attribuer les salles' },
    capacite:      { titre: 'Capacité des salles', lien: '/Salles', action: 'Vérifier les salles' },
    affectations:  { titre: 'Affectations enseignants', lien: '/ProfsParMatiere', action: 'Compléter les affectations' },
    seances:       { titre: 'Découpage en séances', lien: '/VolumeHoraire', action: 'Définir les séances' },
    indispos:      { titre: 'Indisponibilités enseignants', lien: '/Indisponibilites', action: 'Renseigner les indisponibilités' },
};

/**
 * Diagnostic de complétude du paramétrage nécessaire à la génération
 * automatique des emplois du temps (chantier EDT — Lot 0.6).
 */
const DiagnosticEdt = () => {
    const { toast } = useToast();
    const [data, setData] = useState(null);
    const [chargement, setChargement] = useState(true);

    useEffect(() => {
        api.get('/edt/diagnostic-prerequis')
            .then((r) => setData(r.data))
            .catch(() => toast.error('Impossible de charger le diagnostic.'))
            .finally(() => setChargement(false));
    }, []);

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Diagnostic — préparation des emplois du temps</h4>
                </div>

                {chargement && <div className="text-center py-4"><div className="spinner-border text-primary" /></div>}

                {!chargement && data && (
                    <>
                        <div className={`alert ${data.pret ? 'alert-success' : 'alert-warning'} d-flex align-items-center gap-2`}>
                            <span className="fs-4">{data.pret ? '✅' : '⚠️'}</span>
                            <span>
                                {data.pret
                                    ? 'Le paramétrage est complet. La génération automatique des emplois du temps pourra être lancée.'
                                    : "Certains éléments doivent être complétés avant de pouvoir générer les emplois du temps."}
                            </span>
                        </div>

                        <ul className="list-group">
                            {data.blocs.map((b) => {
                                const meta = LIBELLES[b.code] || { titre: b.code };
                                return (
                                    <li key={b.code} className="list-group-item d-flex align-items-start justify-content-between gap-3">
                                        <div>
                                            <span className={`me-2 ${b.ok ? 'text-success' : 'text-danger'}`}>
                                                {b.ok ? '✔' : '✗'}
                                            </span>
                                            <strong>{meta.titre}</strong>
                                            {b.detail && <div className="text-muted small ms-4">{b.detail}</div>}
                                        </div>
                                        {!b.ok && meta.lien && (
                                            <Link to={meta.lien} className="btn btn-sm btn-outline-primary text-nowrap">
                                                {meta.action}
                                            </Link>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}
            </div>
        </section>
    );
};

export default DiagnosticEdt;
