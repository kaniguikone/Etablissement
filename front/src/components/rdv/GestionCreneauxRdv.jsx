import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const STATUTS = {
    en_attente: { label: 'En attente', cls: 'bg-warning text-dark' },
    confirme:   { label: 'Confirmé',   cls: 'bg-success' },
    annule:     { label: 'Annulé',     cls: 'bg-secondary' },
};

const GestionCreneauxRdv = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();

    const [reservations, setReservations] = useState([]);
    const [creneaux, setCreneaux] = useState([]);
    const [onglet, setOnglet] = useState('reservations');
    const [chargement, setChargement] = useState(true);
    const [filtreStatut, setFiltreStatut] = useState('');

    const charger = async () => {
        setChargement(true);
        try {
            const [{ data: r }, { data: c }] = await Promise.all([
                api.get('/rdv/reservations'),
                api.get('/rdv/creneaux'),
            ]);
            setReservations(r);
            setCreneaux(c);
        } catch {
            toast('Erreur lors du chargement.', 'danger');
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => { charger(); }, []);

    const resFiltrées = filtreStatut
        ? reservations.filter(r => r.statut === filtreStatut)
        : reservations;

    const formatDate = (str) => str ? new Date(str).toLocaleDateString('fr-FR') : '—';

    return (
        <div className="container-fluid py-4">
            <h4 className="mb-4"><i className="fas fa-calendar-check me-2 text-primary" />RDV Parents-Profs</h4>

            {/* Onglets */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button className={`nav-link ${onglet === 'reservations' ? 'active' : ''}`}
                        onClick={() => setOnglet('reservations')}>
                        Réservations
                        <span className="badge bg-secondary ms-2">{reservations.length}</span>
                    </button>
                </li>
                <li className="nav-item">
                    <button className={`nav-link ${onglet === 'creneaux' ? 'active' : ''}`}
                        onClick={() => setOnglet('creneaux')}>
                        Créneaux publiés
                        <span className="badge bg-secondary ms-2">{creneaux.length}</span>
                    </button>
                </li>
            </ul>

            {chargement ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : onglet === 'reservations' ? (
                <>
                    {/* Filtre statut */}
                    <div className="mb-3 d-flex gap-2">
                        {[{ v: '', l: 'Tous' }, ...Object.entries(STATUTS).map(([v, { label: l }]) => ({ v, l }))].map(s => (
                            <button key={s.v}
                                className={`btn btn-sm ${filtreStatut === s.v ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => setFiltreStatut(s.v)}>
                                {s.l}
                            </button>
                        ))}
                    </div>

                    <div className="card">
                        <div className="card-body p-0">
                            <table className="table table-hover mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Enseignant</th>
                                        <th>Parent</th>
                                        <th>Élève</th>
                                        <th>Date & Heure</th>
                                        <th>Statut</th>
                                        <th>Motif</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resFiltrées.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-4 text-muted">Aucune réservation</td></tr>
                                    ) : resFiltrées.map(r => {
                                        const st = STATUTS[r.statut] || STATUTS.en_attente;
                                        return (
                                            <tr key={r.id}>
                                                <td className="small">
                                                    {r.creneau?.enseignant?.nom_enseignant} {r.creneau?.enseignant?.prenoms_enseignant}
                                                </td>
                                                <td className="small">
                                                    {r.parent?.nom_parent} {r.parent?.prenoms_parent}
                                                </td>
                                                <td className="small">
                                                    {r.eleve?.nom_eleve} {r.eleve?.prenoms_eleve}
                                                </td>
                                                <td className="small">
                                                    {formatDate(r.creneau?.date_creneau)}
                                                    <br />
                                                    <span className="text-muted">
                                                        {r.creneau?.heure_debut?.substring(0,5)}–{r.creneau?.heure_fin?.substring(0,5)}
                                                    </span>
                                                </td>
                                                <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                                                <td className="small text-muted">{r.motif ?? '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="card">
                    <div className="card-body p-0">
                        <table className="table table-hover mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Enseignant</th>
                                    <th>Date</th>
                                    <th>Horaire</th>
                                    <th>Statut</th>
                                    <th>Réservé par</th>
                                </tr>
                            </thead>
                            <tbody>
                                {creneaux.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-4 text-muted">Aucun créneau</td></tr>
                                ) : creneaux.map(c => (
                                    <tr key={c.id}>
                                        <td className="small">{c.enseignant?.nom_enseignant} {c.enseignant?.prenoms_enseignant}</td>
                                        <td className="small">{formatDate(c.date_creneau)}</td>
                                        <td className="small">{c.heure_debut?.substring(0,5)}–{c.heure_fin?.substring(0,5)}</td>
                                        <td>
                                            {c.reservation && c.reservation.statut !== 'annule'
                                                ? <span className="badge bg-danger">Réservé</span>
                                                : <span className="badge bg-success">Libre</span>}
                                        </td>
                                        <td className="small">
                                            {c.reservation?.parent
                                                ? `${c.reservation.parent.nom_parent} ${c.reservation.parent.prenoms_parent}`
                                                : <span className="text-muted">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionCreneauxRdv;
