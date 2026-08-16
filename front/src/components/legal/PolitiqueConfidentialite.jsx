import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const PolitiqueConfidentialite = () => {
    const [dureeRetention, setDureeRetention] = useState(10);

    useEffect(() => {
        axios.get(`${API_BASE}/rgpd/config`)
            .then(r => setDureeRetention(r.data.duree_retention_annees))
            .catch(() => {});
    }, []);

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
            <div className="container py-5" style={{ maxWidth: 820 }}>
                <Link to="/" className="text-decoration-none small mb-3 d-inline-block">
                    <i className="fas fa-arrow-left me-1" />Retour à l&apos;accueil
                </Link>

                <div className="bg-white rounded shadow-sm p-4 p-md-5">
                    <h1 className="h3 fw-bold mb-4">Politique de confidentialité</h1>

                    <p className="text-muted small">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

                    <h2 className="h5 fw-semibold mt-4">Données collectées</h2>
                    <p>
                        Dans le cadre de la gestion scolaire, nous collectons les données nécessaires au suivi
                        administratif et pédagogique des élèves : identité, coordonnées des parents/tuteurs,
                        résultats scolaires, assiduité, et, le cas échéant, des informations de santé
                        (allergies, contact d&apos;urgence) renseignées volontairement par l&apos;établissement.
                    </p>

                    <h2 className="h5 fw-semibold mt-4">Finalité</h2>
                    <p>
                        Ces données sont utilisées exclusivement pour la gestion administrative et pédagogique
                        de l&apos;établissement scolaire (inscriptions, notes, bulletins, facturation, communication
                        avec les familles) et ne sont ni vendues ni partagées avec des tiers à des fins commerciales.
                    </p>

                    <h2 className="h5 fw-semibold mt-4">Durée de conservation</h2>
                    <p>
                        Les données sont conservées pendant la durée de la scolarité, puis archivées pendant
                        une durée de <strong>{dureeRetention} ans</strong> à des fins de conformité administrative
                        et comptable, avant suppression ou anonymisation.
                    </p>

                    <h2 className="h5 fw-semibold mt-4">Sécurité</h2>
                    <p>
                        Les données sensibles (informations médicales, numéros de téléphone de contact) sont
                        chiffrées dans notre base de données. L&apos;accès aux données est restreint aux personnels
                        autorisés de l&apos;établissement, selon leur rôle.
                    </p>

                    <h2 className="h5 fw-semibold mt-4">Vos droits</h2>
                    <p>
                        Conformément aux principes de protection des données personnelles, vous pouvez demander
                        l&apos;accès, la rectification ou l&apos;effacement des données concernant votre enfant en vous
                        adressant directement à l&apos;administration de son établissement.
                    </p>

                    <h2 className="h5 fw-semibold mt-4">Contact</h2>
                    <p>
                        Pour toute question relative à cette politique, contactez l&apos;établissement scolaire
                        concerné, seul responsable du traitement de vos données au quotidien.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PolitiqueConfidentialite;
