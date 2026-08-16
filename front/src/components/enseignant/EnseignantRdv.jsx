import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

const STATUTS = {
    en_attente: { label: 'En attente', cls: 'bg-warning text-dark' },
    confirme:   { label: 'Confirmé',   cls: 'bg-success' },
    annule:     { label: 'Annulé',     cls: 'bg-secondary' },
};

const fmt = (str) => str ? new Date(str).toLocaleDateString('fr-FR') : '—';
const heure = (str) => str?.slice(0, 5) ?? '—';

const EnseignantRdv = () => {
    const { toast } = useToast();
    const { confirmer } = useConfirm();

    const [onglet, setOnglet]             = useState('reservations');
    const [reservations, setReservations] = useState([]);
    const [creneaux, setCreneaux]         = useState([]);
    const [filtreStatut, setFiltreStatut] = useState('');
    const [chargement, setChargement]     = useState(true);
    const [modalCreneau, setModalCreneau] = useState(false);
    const [formCreneau, setFormCreneau]   = useState({ date_creneau: '', heure_debut: '', heure_fin: '' });
    const [saving, setSaving]             = useState(false);
    const [confirmSuppr, setConfirmSuppr] = useState(null); // id du créneau à supprimer
    const [suppression, setSuppression]   = useState(false);

    const charger = async () => {
        setChargement(true);
        try {
            const [resR, resC] = await Promise.allSettled([
                api.get('/enseignant/rdv/reservations'),
                api.get('/enseignant/rdv/creneaux'),
            ]);
            if (resR.status === 'fulfilled') setReservations(resR.value.data);
            if (resC.status === 'fulfilled') setCreneaux(resC.value.data);
        } finally {
            setChargement(false);
        }
    };

    useEffect(() => { charger(); }, []);

    const confirmerRdv = async (id) => {
        try {
            await api.post(`/enseignant/rdv/reservations/${id}/confirmer`);
            toast('RDV confirmé.', 'success');
            charger();
        } catch { toast('Erreur.', 'danger'); }
    };

    const annulerRdv = async (id) => {
        const ok = await confirmer('Annuler ce rendez-vous ?');
        if (!ok) return;
        try {
            await api.post(`/enseignant/rdv/reservations/${id}/annuler`);
            toast('RDV annulé.', 'success');
            charger();
        } catch { toast('Erreur.', 'danger'); }
    };

    const creerCreneau = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data: nouveau } = await api.post('/enseignant/rdv/creneaux', formCreneau);
            setCreneaux(prev => [...prev, { ...nouveau, reserve: false }]
                .sort((a, b) => a.date_creneau > b.date_creneau ? 1 : a.date_creneau < b.date_creneau ? -1 : (a.heure_debut > b.heure_debut ? 1 : -1)));
            setModalCreneau(false);
            setFormCreneau({ date_creneau: '', heure_debut: '', heure_fin: '' });
            setOnglet('creneaux');
            toast('Créneau créé.', 'success');
        } catch (err) {
            const errors = err.response?.data?.errors;
            const msg = errors
                ? Object.values(errors).flat().join(' ')
                : (err.response?.data?.message ?? 'Erreur lors de la création.');
            toast(msg, 'danger');
        } finally {
            setSaving(false);
        }
    };

    const supprimerCreneau = async () => {
        if (!confirmSuppr) return;
        setSuppression(true);
        try {
            await api.delete(`/enseignant/rdv/creneaux/${confirmSuppr}`);
            setCreneaux(prev => prev.filter(c => c.id !== confirmSuppr));
            setConfirmSuppr(null);
            toast('Créneau supprimé.', 'success');
        } catch (err) {
            toast(err.response?.data?.message ?? 'Erreur lors de la suppression.', 'danger');
        } finally {
            setSuppression(false);
        }
    };

    const resFiltrees = filtreStatut ? reservations.filter(r => r.statut === filtreStatut) : reservations;

    return (
        <div className="container-fluid py-4">
            <h4 className="mb-4 fw-bold"><i className="fas fa-calendar-check me-2 text-primary" />RDV Parents-Profs</h4>

            <ul className="nav nav-tabs mb-4">
                {[
                    { key: 'reservations', label: 'Réservations', count: reservations.length },
                    { key: 'creneaux',     label: 'Mes créneaux',  count: creneaux.length },
                ].map(({ key, label, count }) => (
                    <li key={key} className="nav-item">
                        <button className={`nav-link ${onglet === key ? 'active' : ''}`} onClick={() => setOnglet(key)}>
                            {label} <span className="badge bg-secondary ms-1">{count}</span>
                        </button>
                    </li>
                ))}
            </ul>

            {chargement ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
            ) : onglet === 'reservations' ? (
                <>
                    <div className="d-flex gap-2 mb-3 flex-wrap">
                        {[{ v: '', l: 'Tous' }, ...Object.entries(STATUTS).map(([v, { label: l }]) => ({ v, l }))].map(s => (
                            <button key={s.v}
                                className={`btn btn-sm ${filtreStatut === s.v ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => setFiltreStatut(s.v)}>
                                {s.l}
                            </button>
                        ))}
                    </div>

                    {resFiltrees.length === 0 ? (
                        <div className="text-center text-muted py-5">Aucune réservation</div>
                    ) : (
                        <div className="row g-3">
                            {resFiltrees.map(r => {
                                const st = STATUTS[r.statut] ?? STATUTS.en_attente;
                                const cr = r.creneau;
                                return (
                                    <div key={r.id} className="col-md-6">
                                        <div className="card border-0 shadow-sm h-100">
                                            <div className="card-body">
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div>
                                                        <div className="fw-bold">
                                                            {r.parent?.prenom ?? r.parent?.nom_parent ?? '—'} {r.parent?.nom ?? r.parent?.prenom_parent ?? ''}
                                                        </div>
                                                        {r.eleve && (
                                                            <div className="text-muted small">
                                                                {r.eleve.nom_eleve} {r.eleve.prenoms_eleve}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className={`badge ${st.cls}`}>{st.label}</span>
                                                </div>
                                                <div className="small d-flex gap-3 mb-2">
                                                    <span><i className="fas fa-calendar me-1 text-muted" />{fmt(cr?.date_creneau)}</span>
                                                    <span><i className="fas fa-clock me-1 text-muted" />{heure(cr?.heure_debut)}–{heure(cr?.heure_fin)}</span>
                                                </div>
                                                {r.motif && <div className="small text-muted fst-italic">{r.motif}</div>}
                                            </div>
                                            {r.statut === 'en_attente' && (
                                                <div className="card-footer bg-white border-top d-flex gap-2 justify-content-end">
                                                    <button className="btn btn-sm btn-outline-danger" onClick={() => annulerRdv(r.id)}>
                                                        Annuler
                                                    </button>
                                                    <button className="btn btn-sm btn-success" onClick={() => confirmerRdv(r.id)}>
                                                        <i className="fas fa-check me-1" />Confirmer
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div className="d-flex justify-content-end mb-3">
                        <button className="btn btn-primary btn-sm" onClick={() => setModalCreneau(true)}>
                            <i className="fas fa-plus me-1" />Nouveau créneau
                        </button>
                    </div>

                    {creneaux.length === 0 ? (
                        <div className="text-center text-muted py-5">
                            <i className="fas fa-calendar-plus fa-3x mb-3 opacity-25 d-block" />
                            Aucun créneau publié
                        </div>
                    ) : (
                        <div className="row g-3">
                            {creneaux.map(c => (
                                <div key={c.id} className="col-md-6 col-xl-4">
                                    <div className="card border-0 shadow-sm h-100">
                                        <div className="card-body d-flex align-items-center gap-3">
                                            <div style={{
                                                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                                                background: c.reserve ? '#ffebee' : '#e8f5e9',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <i className={`fas fa-calendar ${c.reserve ? 'text-danger' : 'text-success'}`} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div className="fw-semibold small">{fmt(c.date_creneau)}</div>
                                                <div className="text-muted small">{heure(c.heure_debut)} – {heure(c.heure_fin)}</div>
                                                <span className={`badge mt-1 ${c.reserve ? 'bg-danger' : 'bg-success'}`} style={{ fontSize: 10 }}>
                                                    {c.reserve ? 'Réservé' : 'Disponible'}
                                                </span>
                                                {c.reserve && c.reservation?.parent && (
                                                    <div className="text-muted mt-1" style={{ fontSize: 11 }}>
                                                        {c.reservation.parent.nom_parent} {c.reservation.parent.prenom_parent}
                                                    </div>
                                                )}
                                            </div>
                                            {!c.reserve && (
                                                <button className="btn btn-sm btn-outline-danger py-1 px-2"
                                                    onClick={() => setConfirmSuppr(c.id)}>
                                                    <i className="fas fa-trash" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Modal confirmation suppression */}
            {confirmSuppr && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <div className="modal-dialog modal-sm">
                        <div className="modal-content">
                            <div className="modal-body text-center py-4">
                                <i className="fas fa-trash fa-2x text-danger mb-3 d-block" />
                                <p className="mb-0">Supprimer ce créneau ?</p>
                            </div>
                            <div className="modal-footer justify-content-center border-0 pt-0">
                                <button className="btn btn-outline-secondary btn-sm"
                                    onClick={() => setConfirmSuppr(null)} disabled={suppression}>
                                    Annuler
                                </button>
                                <button className="btn btn-danger btn-sm"
                                    onClick={supprimerCreneau} disabled={suppression}>
                                    {suppression && <span className="spinner-border spinner-border-sm me-1" />}
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal nouveau créneau */}
            {modalCreneau && (
                <div className="modal show d-block" style={{ background: 'rgba(0,0,0,.4)' }}>
                    <div className="modal-dialog">
                        <form className="modal-content" onSubmit={creerCreneau}>
                            <div className="modal-header">
                                <h6 className="modal-title fw-bold">Nouveau créneau RDV</h6>
                                <button type="button" className="btn-close" onClick={() => setModalCreneau(false)} />
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">Date *</label>
                                    <input type="date" className="form-control form-control-sm" required
                                        min={new Date().toISOString().slice(0, 10)}
                                        value={formCreneau.date_creneau}
                                        onChange={e => setFormCreneau(f => ({ ...f, date_creneau: e.target.value }))} />
                                </div>
                                <div className="row g-3">
                                    <div className="col-6">
                                        <label className="form-label small fw-semibold">Heure début *</label>
                                        <input type="time" className="form-control form-control-sm" required
                                            value={formCreneau.heure_debut}
                                            onChange={e => setFormCreneau(f => ({ ...f, heure_debut: e.target.value }))} />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label small fw-semibold">Heure fin *</label>
                                        <input type="time" className="form-control form-control-sm" required
                                            value={formCreneau.heure_fin}
                                            onChange={e => setFormCreneau(f => ({ ...f, heure_fin: e.target.value }))} />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setModalCreneau(false)}>Annuler</button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                                    {saving && <span className="spinner-border spinner-border-sm me-1" />}Créer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnseignantRdv;
