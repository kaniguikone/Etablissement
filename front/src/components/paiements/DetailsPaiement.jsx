import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, NavLink } from 'react-router-dom';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const DetailsPaiement = () => {
    const { toast } = useToast();
    const { id } = useParams();
    const navigate = useNavigate();

    const [eleves, setEleves]         = useState([]);
    const [echeances, setEcheances]   = useState([]);
    const [chargement, setChargement] = useState(false);

    const [form, setForm] = useState({
        eleve_id: '', scolarite_id: '', montant_paye: '',
        date_paiement: '', mode_paiement: 'especes',
        reference_paiement: '', remarque: '',
    });

    useEffect(() => {
        api.get('/elevesTout').then((r) => setEleves(r.data)).catch((err) => console.error('Erreur chargement:', err));
        api.get(`/paiements/${id}`).then((res) => {
            const p = res.data;
            setForm({
                eleve_id:            String(p.eleve_id),
                scolarite_id:        String(p.scolarite_id),
                montant_paye:        p.montant_paye,
                date_paiement:       p.date_paiement,
                mode_paiement:       p.mode_paiement,
                reference_paiement:  p.reference_paiement || '',
                remarque:            p.remarque || '',
            });
            // Charger les échéances du niveau de l'élève
            if (p.eleve?.classe?.niveau_id) {
                api.get(`/scolaritesNiveau/${p.eleve.classe.niveau_id}`)
                    .then((r) => setEcheances(r.data)).catch((err) => console.error('Erreur chargement:', err));
            }
        }).catch(() => toast.error('Impossible de charger ce paiement.'));
    }, [id]);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        setChargement(true);
        api.put(`/paiements/${id}`, form)
            .then(() => navigate('/Paiements'))
            .catch((err) => {
                const errors = err.response?.data?.errors;
                toast.error(errors ? Object.values(errors).flat().join(' ') : 'Erreur lors de la mise à jour.');
                setChargement(false);
            });
    };

    return (
        <section className="page-wrapper">
            <div className="container-fluid mb-2 border">
                <div className="d-flex justify-content-between align-items-center mt-2 mb-3">
                    <h4 className="mb-0">Modifier le paiement</h4>
                    <NavLink to="/Paiements" className="btn btn-secondary btn-sm">Retour</NavLink>
                </div>
                <form onSubmit={handleSubmit} className="row g-3">
                    <div className="col-md-6">
                        <label className="form-label">Élève *</label>
                        <select className="form-select form-select-sm" name="eleve_id" value={form.eleve_id} onChange={handleChange} required>
                            <option value="">Sélectionner un élève</option>
                            {eleves.map((e) => (
                                <option key={e.id} value={e.id}>{e.nom_eleve} {e.prenoms_eleve} — {e.matricule_eleve}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Échéance *</label>
                        <select className="form-select form-select-sm" name="scolarite_id" value={form.scolarite_id} onChange={handleChange} required>
                            <option value="">Sélectionner une échéance</option>
                            {echeances.map((ec) => (
                                <option key={ec.id} value={ec.id}>{ec.libelle_echeance} — {Number(ec.montant_echeance).toLocaleString('fr-FR')} FCFA</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">Montant payé *</label>
                        <input type="number" className="form-control form-control-sm" name="montant_paye" value={form.montant_paye} onChange={handleChange} min="1" required />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">Date du paiement *</label>
                        <input type="date" className="form-control form-control-sm" name="date_paiement" value={form.date_paiement} onChange={handleChange} required />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">Mode de paiement *</label>
                        <select className="form-select form-select-sm" name="mode_paiement" value={form.mode_paiement} onChange={handleChange} required>
                            <option value="especes">Espèces</option>
                            <option value="cheque">Chèque</option>
                            <option value="virement">Virement</option>
                            <option value="autre">Autre</option>
                        </select>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Référence / N° de reçu</label>
                        <input type="text" className="form-control form-control-sm" name="reference_paiement" value={form.reference_paiement} onChange={handleChange} />
                    </div>
                    <div className="col-md-6">
                        <label className="form-label">Remarque</label>
                        <input type="text" className="form-control form-control-sm" name="remarque" value={form.remarque} onChange={handleChange} />
                    </div>
                    <div className="col-12 mb-3">
                        <button type="submit" className="btn btn-primary btn-sm" disabled={chargement}>
                            {chargement && <span className="spinner-border spinner-border-sm me-2" />}
                            Enregistrer
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default DetailsPaiement;
