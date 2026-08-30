import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import PrivateRoute from '../components/auth/PrivateRoute';

// Toutes les pages sont chargées à la demande (code-splitting par route) pour
// éviter d'expédier l'intégralité de l'application dans un seul bundle initial.
const LoginPage = lazy(() => import('../components/auth/LoginPage'));
const BackofficeLogin = lazy(() => import('../components/auth/BackofficeLogin'));
const ChangerMotDePasseInitial = lazy(() => import('../components/auth/ChangerMotDePasseInitial'));
const LandingPage = lazy(() => import('../components/landing/LandingPage'));
const InscriptionEtablissement = lazy(() => import('../components/landing/InscriptionEtablissement'));
const PolitiqueConfidentialite = lazy(() => import('../components/legal/PolitiqueConfidentialite'));
const DashboardGroupe = lazy(() => import('../components/groupe/DashboardGroupe'));
const ListeEcoles = lazy(() => import('../components/groupe/ListeEcoles'));
const DetailsEcole = lazy(() => import('../components/groupe/DetailsEcole'));
const ActivitesEnseignants = lazy(() => import('../components/groupe/ActivitesEnseignants'));
const FinancesGroupe = lazy(() => import('../components/groupe/FinancesGroupe'));
const ActivitesEleves = lazy(() => import('../components/groupe/ActivitesEleves'));
const GestionTemplates = lazy(() => import('../components/groupe/GestionTemplates'));
const EditionTemplate = lazy(() => import('../components/groupe/EditionTemplate'));
const MonProfil = lazy(() => import('../components/auth/MonProfil'));

const Accueil = lazy(() => import('../components/Accueil'));
const Statistiques = lazy(() => import('../components/stats/Statistiques'));
const StatsGenerales = lazy(() => import('../components/stats/StatsGenerales'));

const ListeEleves = lazy(() => import('../components/eleves/ListeEleves'));
const ListeEnseignants = lazy(() => import('../components/enseignants/ListeEnseignants'));
const ListeProfsParMatiere = lazy(() => import('../components/enseignants/ListeProfsParMatiere'));
const ListeClasses = lazy(() => import('../components/classes/ListeClasses'));
const ListeNiveaux = lazy(() => import('../components/niveaux/ListeNiveaux'));
const ListeMatieres = lazy(() => import('../components/matieres/ListeMatieres'));
const ListePeriodes = lazy(() => import('../components/periodes/ListePeriodes'));
const ListeParents = lazy(() => import('../components/parents/ListeParents'));
const InscriptionParent = lazy(() => import('../components/parents/InscriptionParent'));
const InscriptionParentPublique = lazy(() => import('../components/parents/InscriptionParentPublique'));
const DemandesParents = lazy(() => import('../components/parents/DemandesParents'));
const ListeScolarites = lazy(() => import('../components/scolarites/ListeScolarites'));
const ListeInformations = lazy(() => import('../components/informations/ListeInformations'));

const NouvelEleve = lazy(() => import('../components/eleves/NouvelEleve'));
const NouvelEnseignant = lazy(() => import('../components/enseignants/NouvelEnseignant'));
const NouvelleClasse = lazy(() => import('../components/classes/NouvelleClasse'));
const NouveauNiveau = lazy(() => import('../components/niveaux/NouveauNiveau'));
const NouvelleMatiere = lazy(() => import('../components/matieres/NouvelleMatiere'));
const NouvellePeriode = lazy(() => import('../components/periodes/NouvellePeriode'));
const NouveauParent = lazy(() => import('../components/parents/NouveauParent'));
const NouvelleScolarite = lazy(() => import('../components/scolarites/NouvelleScolarite'));
const NouvelleInformation = lazy(() => import('../components/informations/NouvelleInformation'));

const DetailsEleve = lazy(() => import('../components/eleves/DetailsEleve'));
const DetailsEnseignant = lazy(() => import('../components/enseignants/DetailsEnseignant'));
const DetailsClasse = lazy(() => import('../components/classes/DetailsClasse'));
const DetailsNiveau = lazy(() => import('../components/niveaux/DetailsNiveau'));
const DetailsMatiere = lazy(() => import('../components/matieres/DetailsMatiere'));
const ConfigurationMatieres = lazy(() => import('../components/matieres/ConfigurationMatieres'));
const DetailsPeriode = lazy(() => import('../components/periodes/DetailsPeriode'));
const DetailsParent = lazy(() => import('../components/parents/DetailsParent'));
const DetailsScolarite = lazy(() => import('../components/scolarites/DetailsScolarite'));
const DetailsInformation = lazy(() => import('../components/informations/DetailsInformation'));

const ListeEmploiDuTemps = lazy(() => import('../components/emploidutemps/ListeEmploiDuTemps'));
const NouvelEmploiDuTemps = lazy(() => import('../components/emploidutemps/NouvelEmploiDuTemps'));
const DetailsEmploiDuTemps = lazy(() => import('../components/emploidutemps/DetailsEmploiDuTemps'));

const ListeAssiduites = lazy(() => import('../components/assiduites/ListeAssiduites'));
const FeuillePresence = lazy(() => import('../components/assiduites/FeuillePresence'));
const DetailsAssiduite = lazy(() => import('../components/assiduites/DetailsAssiduite'));

const ListeSeries = lazy(() => import('../components/series/ListeSeries'));
const ListeTypeDevoirs = lazy(() => import('../components/typedevoirs/ListeTypeDevoirs'));
const NouveauTypeDevoir = lazy(() => import('../components/typedevoirs/NouveauTypeDevoir'));
const DetailsTypeDevoir = lazy(() => import('../components/typedevoirs/DetailsTypeDevoir'));

const ListeDevoirs = lazy(() => import('../components/devoirs/ListeDevoirs'));
const NouveauDevoir = lazy(() => import('../components/devoirs/NouveauDevoir'));
const DetailsDevoir = lazy(() => import('../components/devoirs/DetailsDevoir'));
const SaisieNotes = lazy(() => import('../components/devoirs/SaisieNotes'));

const Bulletin = lazy(() => import('../components/bulletins/Bulletin'));
const Attestation = lazy(() => import('../components/attestations/Attestation'));

const ListePaiements = lazy(() => import('../components/paiements/ListePaiements'));
const NouveauPaiement = lazy(() => import('../components/paiements/NouveauPaiement'));
const DetailsPaiement = lazy(() => import('../components/paiements/DetailsPaiement'));
const RecapPaiements = lazy(() => import('../components/paiements/RecapPaiements'));
const PaiementsEleve = lazy(() => import('../components/paiements/PaiementsEleve'));
const PaiementRetour = lazy(() => import('../components/paiements/PaiementRetour'));
const TableauImpayes = lazy(() => import('../components/paiements/TableauImpayes'));
const Echeancier = lazy(() => import('../components/paiements/Echeancier'));
const ListeSalles = lazy(() => import('../components/salles/ListeSalles'));
const FormSalle = lazy(() => import('../components/salles/FormSalle'));
const PlanningSalle = lazy(() => import('../components/salles/PlanningSalle'));
const ListeRemplacements = lazy(() => import('../components/remplacements/ListeRemplacements'));
const FormRemplacement = lazy(() => import('../components/remplacements/FormRemplacement'));
const Messagerie = lazy(() => import('../components/messagerie/Messagerie'));
const GestionCreneauxRdv = lazy(() => import('../components/rdv/GestionCreneauxRdv'));
const CalendrierScolaire = lazy(() => import('../components/calendrier/CalendrierScolaire'));
const ListeSanctions = lazy(() => import('../components/sanctions/ListeSanctions'));
const FormSanction = lazy(() => import('../components/sanctions/FormSanction'));
const SanctionsEleve = lazy(() => import('../components/sanctions/SanctionsEleve'));
const SanteEleve = lazy(() => import('../components/eleves/SanteEleve'));

const ListeInscriptions = lazy(() => import('../components/inscriptions/ListeInscriptions'));
const DetailsInscription = lazy(() => import('../components/inscriptions/DetailsInscription'));

const GestionChapitres = lazy(() => import('../components/programme/GestionChapitres'));
const SuiviProgressions = lazy(() => import('../components/programme/SuiviProgressions'));
const ParametresEtablissement = lazy(() => import('../components/etablissement/ParametresEtablissement'));
const VolumeHoraire = lazy(() => import('../components/volumes/VolumeHoraire'));
const ConformiteEdt = lazy(() => import('../components/volumes/ConformiteEdt'));
const ChargeEnseignants = lazy(() => import('../components/volumes/ChargeEnseignants'));

const ListeUtilisateurs = lazy(() => import('../components/utilisateurs/ListeUtilisateurs'));
const NouvelUtilisateur = lazy(() => import('../components/utilisateurs/NouvelUtilisateur'));
const ListeRoles = lazy(() => import('../components/roles/ListeRoles'));
const NouveauRole = lazy(() => import('../components/roles/NouveauRole'));
const AuditLogs = lazy(() => import('../components/audit/AuditLogs'));
const RapportMinistere = lazy(() => import('../components/rapports/RapportMinistere'));
const FraisAnnexesConfig = lazy(() => import('../components/fraisannexes/FraisAnnexesConfig'));
const ImpayesFraisAnnexes = lazy(() => import('../components/fraisannexes/ImpayesFraisAnnexes'));
const FraisAnnexeEleve = lazy(() => import('../components/fraisannexes/FraisAnnexeEleve'));
const ExportComptable = lazy(() => import('../components/comptabilite/ExportComptable'));
const GestionAbonnements = lazy(() => import('../components/superadmin/GestionAbonnements'));
const GestionModules = lazy(() => import('../components/superadmin/GestionModules'));
const DemandesAcces = lazy(() => import('../components/superadmin/DemandesAcces'));
const ConfigTarifs = lazy(() => import('../components/superadmin/ConfigTarifs'));
const ConfigRgpd = lazy(() => import('../components/superadmin/ConfigRgpd'));
const GestionTemplatesSuperAdmin = lazy(() => import('../components/superadmin/GestionTemplatesSuperAdmin'));
const GestionDocumentation = lazy(() => import('../components/aide/GestionDocumentation'));
const Notifications = lazy(() => import('../components/notifications/Notifications'));
const ArchivageWizard = lazy(() => import('../components/archivage/ArchivageWizard'));

const SeederInterface = lazy(() => import('../components/developpement/SeederInterface'));

const EnseignantDashboard = lazy(() => import('../components/enseignant/EnseignantDashboard'));
const EnseignantDevoirs = lazy(() => import('../components/enseignant/EnseignantDevoirs'));
const EnseignantPresence = lazy(() => import('../components/enseignant/EnseignantPresence'));
const EnseignantProgramme = lazy(() => import('../components/enseignant/EnseignantProgramme'));
const EnseignantEmploi = lazy(() => import('../components/enseignant/EnseignantEmploi'));
const EnseignantRemplacements = lazy(() => import('../components/enseignant/EnseignantRemplacements'));
const EnseignantMessagerie = lazy(() => import('../components/enseignant/EnseignantMessagerie'));
const EnseignantRdv = lazy(() => import('../components/enseignant/EnseignantRdv'));
const EnseignantInformations = lazy(() => import('../components/enseignant/EnseignantInformations'));
const EnseignantAppreciations = lazy(() => import('../components/enseignant/EnseignantAppreciations'));
const ConseilClasse = lazy(() => import('../components/conseil/ConseilClasse'));
const ReinitialisationMotDePasse = lazy(() => import('../components/auth/ReinitialisationMotDePasse'));

// Rôles constants pour éviter les répétitions
const R_STATS            = ['pedagogie_saisie', 'pedagogie_pilotage', 'finances_caisse', 'finances_gestion'];
const R_PARAM            = ['parametrage'];
const R_INSCRIP          = ['inscriptions'];
const R_ELEVES           = ['eleves'];
const R_SANTE            = ['sante'];
const R_ENSEIGNANTS      = ['enseignants'];
const R_PARENTS          = ['parents'];
const R_PEDAGO_SAISIE    = ['pedagogie_saisie'];
const R_PEDAGO_PILOTAGE  = ['pedagogie_pilotage'];
const R_FINANCES_CAISSE  = ['finances_caisse', 'finances_gestion'];
const R_FINANCES_GESTION = ['finances_gestion'];
const R_COMM             = ['communication'];
const R_ADMIN            = ['utilisateurs'];

const ChargementPage = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement…</span>
        </div>
    </div>
);

const RoutesMenu = () => (
    <div>
        <Suspense fallback={<ChargementPage />}>
        <Routes>
            {/* Pages publiques */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/backoffice" element={<BackofficeLogin />} />
            <Route path="/changer-mot-de-passe" element={<PrivateRoute><ChangerMotDePasseInitial /></PrivateRoute>} />
            <Route path="/inscription-etablissement" element={<InscriptionEtablissement />} />
            <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
            <Route path="/inscription-parent" element={<InscriptionParentPublique />} />
            <Route path="/reinitialiser-mot-de-passe" element={<ReinitialisationMotDePasse />} />
            <Route path="/inscription-parent" element={<InscriptionParent />} />

            {/* ── Espace Enseignant ─────────────────────────────────────── */}
            <Route path="/enseignant"               element={<PrivateRoute><EnseignantDashboard /></PrivateRoute>} />
            <Route path="/enseignant/devoirs"       element={<PrivateRoute><EnseignantDevoirs /></PrivateRoute>} />
            <Route path="/enseignant/presence"      element={<PrivateRoute><EnseignantPresence /></PrivateRoute>} />
            <Route path="/enseignant/programme"     element={<PrivateRoute><EnseignantProgramme /></PrivateRoute>} />
            <Route path="/enseignant/emploi"        element={<PrivateRoute><EnseignantEmploi /></PrivateRoute>} />
            <Route path="/enseignant/remplacements" element={<PrivateRoute><EnseignantRemplacements /></PrivateRoute>} />
            <Route path="/enseignant/messagerie"    element={<PrivateRoute><EnseignantMessagerie /></PrivateRoute>} />
            <Route path="/enseignant/rdv"           element={<PrivateRoute><EnseignantRdv /></PrivateRoute>} />
            <Route path="/enseignant/informations"    element={<PrivateRoute><EnseignantInformations /></PrivateRoute>} />
            <Route path="/enseignant/appreciations"  element={<PrivateRoute><EnseignantAppreciations /></PrivateRoute>} />

            {/* ── SuperAdmin ────────────────────────────────────────────── */}
            <Route path="/superadmin/abonnements"       element={<PrivateRoute superOnly><GestionAbonnements /></PrivateRoute>} />
            <Route path="/superadmin/demandes"          element={<PrivateRoute superOnly><DemandesAcces /></PrivateRoute>} />
            <Route path="/superadmin/tarifs"            element={<PrivateRoute superOnly><ConfigTarifs /></PrivateRoute>} />
            <Route path="/superadmin/templates"         element={<PrivateRoute superOnly><GestionTemplatesSuperAdmin /></PrivateRoute>} />
            <Route path="/superadmin/templates/:type"   element={<PrivateRoute superOnly><EditionTemplate basePath="/superadmin" /></PrivateRoute>} />
            <Route path="/superadmin/rgpd"              element={<PrivateRoute superOnly><ConfigRgpd /></PrivateRoute>} />
            <Route path="/superadmin/modules"           element={<PrivateRoute superOnly><GestionModules /></PrivateRoute>} />

            {/* ── Espace Groupe Scolaire ─────────────────────────────────── */}
            <Route path="/groupe"                  element={<PrivateRoute><DashboardGroupe /></PrivateRoute>} />
            <Route path="/groupe/ecoles"          element={<PrivateRoute><ListeEcoles /></PrivateRoute>} />
            <Route path="/groupe/ecoles/:id"      element={<PrivateRoute><DetailsEcole /></PrivateRoute>} />
            <Route path="/groupe/enseignants"     element={<PrivateRoute><ActivitesEnseignants /></PrivateRoute>} />
            <Route path="/groupe/finances"        element={<PrivateRoute><FinancesGroupe /></PrivateRoute>} />
            <Route path="/groupe/eleves"          element={<PrivateRoute><ActivitesEleves /></PrivateRoute>} />
            <Route path="/groupe/templates"           element={<PrivateRoute><GestionTemplates /></PrivateRoute>} />
            <Route path="/groupe/templates/:type"     element={<PrivateRoute><EditionTemplate /></PrivateRoute>} />

            {/* Tableau de bord */}
            <Route path="/accueil" element={<PrivateRoute><Accueil /></PrivateRoute>} />

            {/* Mon profil */}
            <Route path="/MonProfil" element={<PrivateRoute><MonProfil /></PrivateRoute>} />

            {/* Notifications */}
            <Route path="/Notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />

            {/* Archivage */}
            <Route path="/Archivage" element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.archivage']}><ArchivageWizard /></PrivateRoute>} />

            {/* Seed (dev) */}
            <Route path="/superadmin/seeder" element={<PrivateRoute superOnly><SeederInterface /></PrivateRoute>} />

            {/* Statistiques */}
            <Route path="/Statistiques"     element={<PrivateRoute permissions={R_STATS} modules={['statistiques.tableaux_bord']}><Statistiques /></PrivateRoute>} />
            <Route path="/StatsGenerales"   element={<PrivateRoute permissions={['pedagogie_pilotage','parametrage']} modules={['statistiques.stats_generales']}><StatsGenerales /></PrivateRoute>} />

            {/* Paramétrage */}
            <Route path="/Etablissement"  element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.etablissement']}><ParametresEtablissement /></PrivateRoute>} />
            <Route path="/VolumeHoraire"  element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.volume_horaire']}><VolumeHoraire /></PrivateRoute>} />
            <Route path="/Niveaux"           element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.niveaux']}><ListeNiveaux /></PrivateRoute>} />
            <Route path="/NouveauNiveau"     element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.niveaux']}><NouveauNiveau /></PrivateRoute>} />
            <Route path="/DetailsNiveau/:id" element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.niveaux']}><DetailsNiveau /></PrivateRoute>} />

            <Route path="/Classes"           element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.classes']}><ListeClasses /></PrivateRoute>} />
            <Route path="/NouvelleClasse"    element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.classes']}><NouvelleClasse /></PrivateRoute>} />
            <Route path="/DetailsClasse/:id" element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.classes']}><DetailsClasse /></PrivateRoute>} />

            <Route path="/Matieres"           element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.matieres']}><ListeMatieres /></PrivateRoute>} />
            <Route path="/NouvelleMatiere"    element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.matieres']}><NouvelleMatiere /></PrivateRoute>} />
            <Route path="/DetailsMatiere/:id" element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.matieres']}><DetailsMatiere /></PrivateRoute>} />
            <Route path="/ConfigMatieres"     element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.config_matieres']}><ConfigurationMatieres /></PrivateRoute>} />

            <Route path="/Series"                element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.series']}><ListeSeries /></PrivateRoute>} />
            <Route path="/TypeDevoirs"           element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.type_devoirs']}><ListeTypeDevoirs /></PrivateRoute>} />
            <Route path="/NouveauTypeDevoir"     element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.type_devoirs']}><NouveauTypeDevoir /></PrivateRoute>} />
            <Route path="/DetailsTypeDevoir/:id" element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.type_devoirs']}><DetailsTypeDevoir /></PrivateRoute>} />

            <Route path="/Periodes"           element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.periodes']}><ListePeriodes /></PrivateRoute>} />
            <Route path="/NouvellePeriode"    element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.periodes']}><NouvellePeriode /></PrivateRoute>} />
            <Route path="/DetailsPeriode/:id" element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.periodes']}><DetailsPeriode /></PrivateRoute>} />

            {/* Inscriptions */}
            <Route path="/Inscriptions"          element={<PrivateRoute permissions={R_INSCRIP} modules={['inscriptions']}><ListeInscriptions /></PrivateRoute>} />
            <Route path="/Inscriptions/:id"      element={<PrivateRoute permissions={R_INSCRIP} modules={['inscriptions']}><DetailsInscription /></PrivateRoute>} />

            {/* Personnes */}
            <Route path="/Eleves"              element={<PrivateRoute permissions={R_ELEVES} modules={['eleves.liste']}><ListeEleves /></PrivateRoute>} />
            <Route path="/NouvelEleve"         element={<PrivateRoute permissions={R_ELEVES} modules={['eleves.nouveau']}><NouvelEleve /></PrivateRoute>} />
            <Route path="/DetailsEleve/:id"    element={<PrivateRoute permissions={R_ELEVES} modules={['eleves.liste']}><DetailsEleve /></PrivateRoute>} />
            <Route path="/Attestations"        element={<PrivateRoute permissions={R_ELEVES} modules={['eleves.attestations']}><Attestation /></PrivateRoute>} />
            <Route path="/Sanctions"           element={<PrivateRoute permissions={R_ELEVES} modules={['eleves.sanctions']}><ListeSanctions /></PrivateRoute>} />
            <Route path="/NouvelleSanction"    element={<PrivateRoute permissions={R_ELEVES} modules={['eleves.sanctions']}><FormSanction /></PrivateRoute>} />
            <Route path="/DetailsSanction/:id" element={<PrivateRoute permissions={R_ELEVES} modules={['eleves.sanctions']}><FormSanction /></PrivateRoute>} />
            <Route path="/SanctionsEleve/:id"  element={<PrivateRoute permissions={R_ELEVES} modules={['eleves.sanctions']}><SanctionsEleve /></PrivateRoute>} />
            <Route path="/SanteEleve/:id"      element={<PrivateRoute permissions={R_SANTE} modules={['sante']}><SanteEleve /></PrivateRoute>} />

            <Route path="/ConseilClasse" element={<PrivateRoute permissions={R_PEDAGO_PILOTAGE} modules={['pedagogie_pilotage.conseil_classe']}><ConseilClasse /></PrivateRoute>} />

            <Route path="/Enseignants"            element={<PrivateRoute permissions={R_ENSEIGNANTS} modules={['enseignants.liste']}><ListeEnseignants /></PrivateRoute>} />
            <Route path="/NouvelEnseignant"       element={<PrivateRoute permissions={R_ENSEIGNANTS} modules={['enseignants.nouveau']}><NouvelEnseignant /></PrivateRoute>} />
            <Route path="/DetailsEnseignant/:id"  element={<PrivateRoute permissions={R_ENSEIGNANTS} modules={['enseignants.liste']}><DetailsEnseignant /></PrivateRoute>} />
            <Route path="/ProfsParMatiere"        element={<PrivateRoute permissions={R_ENSEIGNANTS} modules={['enseignants.profs_matiere']}><ListeProfsParMatiere /></PrivateRoute>} />

            <Route path="/Parents"               element={<PrivateRoute permissions={R_PARENTS} modules={['parents.liste']}><ListeParents /></PrivateRoute>} />
            <Route path="/NouveauParent"         element={<PrivateRoute permissions={R_PARENTS} modules={['parents.nouveau']}><NouveauParent /></PrivateRoute>} />
            <Route path="/DetailsParent/:id"     element={<PrivateRoute permissions={R_PARENTS} modules={['parents.liste']}><DetailsParent /></PrivateRoute>} />
            <Route path="/DemandesParents"       element={<PrivateRoute permissions={R_PARENTS} modules={['parents.demandes']}><DemandesParents /></PrivateRoute>} />

            {/* Salles */}
            <Route path="/Salles"            element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.salles']}><ListeSalles /></PrivateRoute>} />
            <Route path="/NouvelleSalle"     element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.salles']}><FormSalle /></PrivateRoute>} />
            <Route path="/DetailsSalle/:id"  element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.salles']}><FormSalle /></PrivateRoute>} />
            <Route path="/PlanningSalle/:id" element={<PrivateRoute permissions={R_PARAM} modules={['parametrage.salles']}><PlanningSalle /></PrivateRoute>} />

            {/* Remplacements */}
            <Route path="/Remplacements"           element={<PrivateRoute permissions={R_PEDAGO_SAISIE} modules={['pedagogie_saisie.remplacements']}><ListeRemplacements /></PrivateRoute>} />
            <Route path="/NouveauRemplacement"     element={<PrivateRoute permissions={R_PEDAGO_SAISIE} modules={['pedagogie_saisie.remplacements']}><FormRemplacement /></PrivateRoute>} />
            <Route path="/DetailsRemplacement/:id" element={<PrivateRoute permissions={R_PEDAGO_SAISIE} modules={['pedagogie_saisie.remplacements']}><FormRemplacement /></PrivateRoute>} />

            {/* Messagerie */}
            <Route path="/Messagerie" element={<PrivateRoute permissions={R_COMM} modules={['communication.messagerie']}><Messagerie /></PrivateRoute>} />

            {/* RDV parents-profs */}
            <Route path="/RDV" element={<PrivateRoute permissions={R_PEDAGO_SAISIE} modules={['communication.rdv']}><GestionCreneauxRdv /></PrivateRoute>} />

            {/* Pédagogie — saisie */}
            <Route path="/EmploiDuTemps"            element={<PrivateRoute permissions={R_PEDAGO_SAISIE} modules={['pedagogie_saisie.emploi_du_temps']}><ListeEmploiDuTemps /></PrivateRoute>} />
            <Route path="/NouvelEmploiDuTemps"      element={<PrivateRoute permissions={R_PEDAGO_SAISIE} modules={['pedagogie_saisie.emploi_du_temps']}><NouvelEmploiDuTemps /></PrivateRoute>} />
            <Route path="/DetailsEmploiDuTemps/:id" element={<PrivateRoute permissions={R_PEDAGO_SAISIE} modules={['pedagogie_saisie.emploi_du_temps']}><DetailsEmploiDuTemps /></PrivateRoute>} />

            <Route path="/Assiduites"           element={<PrivateRoute permissions={R_PEDAGO_SAISIE} modules={['pedagogie_saisie.assiduites']}><ListeAssiduites /></PrivateRoute>} />
            <Route path="/FeuillePresence"      element={<PrivateRoute permissions={R_PEDAGO_SAISIE} modules={['pedagogie_saisie.assiduites']}><FeuillePresence /></PrivateRoute>} />
            <Route path="/DetailsAssiduite/:id" element={<PrivateRoute permissions={R_PEDAGO_SAISIE} modules={['pedagogie_saisie.assiduites']}><DetailsAssiduite /></PrivateRoute>} />

            <Route path="/Devoirs"           element={<PrivateRoute permissions={R_PEDAGO_SAISIE} modules={['pedagogie_saisie.devoirs']}><ListeDevoirs /></PrivateRoute>} />
            <Route path="/NouveauDevoir"     element={<PrivateRoute permissions={R_PEDAGO_SAISIE} modules={['pedagogie_saisie.devoirs']}><NouveauDevoir /></PrivateRoute>} />
            <Route path="/DetailsDevoir/:id" element={<PrivateRoute permissions={R_PEDAGO_SAISIE} modules={['pedagogie_saisie.devoirs']}><DetailsDevoir /></PrivateRoute>} />
            <Route path="/SaisieNotes/:id"   element={<PrivateRoute permissions={R_PEDAGO_SAISIE} modules={['pedagogie_saisie.devoirs']}><SaisieNotes /></PrivateRoute>} />

            <Route path="/GestionChapitres" element={<PrivateRoute permissions={R_PEDAGO_SAISIE} modules={['pedagogie_saisie.programme']}><GestionChapitres /></PrivateRoute>} />
            <Route path="/Calendrier"       element={<PrivateRoute permissions={R_PEDAGO_SAISIE} modules={['pedagogie_saisie.calendrier']}><CalendrierScolaire /></PrivateRoute>} />

            {/* Pédagogie — pilotage */}
            <Route path="/Bulletins"        element={<PrivateRoute permissions={R_PEDAGO_PILOTAGE} modules={['pedagogie_pilotage.bulletins']}><Bulletin /></PrivateRoute>} />
            <Route path="/RapportMinistere" element={<PrivateRoute permissions={R_STATS}><RapportMinistere /></PrivateRoute>} />
            <Route path="/SuiviProgressions" element={<PrivateRoute permissions={R_PEDAGO_PILOTAGE} modules={['pedagogie_pilotage.suivi_progressions']}><SuiviProgressions /></PrivateRoute>} />
            <Route path="/ConformiteEdt"     element={<PrivateRoute permissions={R_PEDAGO_PILOTAGE} modules={['pedagogie_pilotage.conformite_edt']}><ConformiteEdt /></PrivateRoute>} />
            <Route path="/ChargeEnseignants" element={<PrivateRoute permissions={R_PEDAGO_PILOTAGE} modules={['pedagogie_pilotage.charge_enseignants']}><ChargeEnseignants /></PrivateRoute>} />

            {/* Finances — gestion */}
            <Route path="/Scolarites"           element={<PrivateRoute permissions={R_FINANCES_GESTION} modules={['finances_gestion.scolarites']}><ListeScolarites /></PrivateRoute>} />
            <Route path="/NouvelleScolarite"    element={<PrivateRoute permissions={R_FINANCES_GESTION} modules={['finances_gestion.scolarites']}><NouvelleScolarite /></PrivateRoute>} />
            <Route path="/DetailsScolarite/:id" element={<PrivateRoute permissions={R_FINANCES_GESTION} modules={['finances_gestion.scolarites']}><DetailsScolarite /></PrivateRoute>} />
            <Route path="/Impayes"              element={<PrivateRoute permissions={R_FINANCES_GESTION} modules={['finances_gestion.impayes']}><TableauImpayes /></PrivateRoute>} />
            <Route path="/FraisAnnexes"         element={<PrivateRoute permissions={R_FINANCES_GESTION} modules={['finances_gestion.frais_annexes']}><FraisAnnexesConfig /></PrivateRoute>} />
            <Route path="/ImpayesFraisAnnexes"  element={<PrivateRoute permissions={R_FINANCES_GESTION} modules={['finances_gestion.impayes_frais_annexes']}><ImpayesFraisAnnexes /></PrivateRoute>} />
            <Route path="/FraisAnnexeEleve/:eleveId" element={<PrivateRoute permissions={R_FINANCES_CAISSE} modules={['finances_gestion.frais_annexes']}><FraisAnnexeEleve /></PrivateRoute>} />
            <Route path="/ExportComptable"       element={<PrivateRoute permissions={R_FINANCES_GESTION} modules={['finances_gestion.export_comptable']}><ExportComptable /></PrivateRoute>} />

            {/* Finances — caisse */}
            <Route path="/Paiements"           element={<PrivateRoute permissions={R_FINANCES_CAISSE} modules={['finances_caisse.historique']}><ListePaiements /></PrivateRoute>} />
            <Route path="/NouveauPaiement"     element={<PrivateRoute permissions={R_FINANCES_CAISSE} modules={['finances_caisse.nouveau_paiement']}><NouveauPaiement /></PrivateRoute>} />
            <Route path="/DetailsPaiement/:id" element={<PrivateRoute permissions={R_FINANCES_CAISSE} modules={['finances_caisse.historique']}><DetailsPaiement /></PrivateRoute>} />
            <Route path="/RecapPaiements"      element={<PrivateRoute permissions={R_FINANCES_CAISSE} modules={['finances_caisse.recap']}><RecapPaiements /></PrivateRoute>} />
            <Route path="/PaiementsEleve/:id"  element={<PrivateRoute permissions={R_FINANCES_CAISSE} modules={['finances_caisse.historique']}><PaiementsEleve /></PrivateRoute>} />
            <Route path="/PaiementRetour"      element={<PrivateRoute permissions={R_FINANCES_CAISSE}><PaiementRetour /></PrivateRoute>} />
            <Route path="/Echeancier"          element={<PrivateRoute permissions={R_FINANCES_CAISSE} modules={['finances_caisse.echeancier']}><Echeancier /></PrivateRoute>} />

            {/* Communication */}
            <Route path="/Informations"            element={<PrivateRoute permissions={R_COMM} modules={['communication.informations']}><ListeInformations /></PrivateRoute>} />
            <Route path="/NouvelleInformation"     element={<PrivateRoute permissions={R_COMM} modules={['communication.informations']}><NouvelleInformation /></PrivateRoute>} />
            <Route path="/DetailsInformation/:id"  element={<PrivateRoute permissions={R_COMM} modules={['communication.informations']}><DetailsInformation /></PrivateRoute>} />

            {/* Administration */}
            <Route path="/Utilisateurs"          element={<PrivateRoute permissions={['utilisateurs']} modules={['utilisateurs.utilisateurs']}><ListeUtilisateurs /></PrivateRoute>} />
            <Route path="/NouvelUtilisateur"     element={<PrivateRoute permissions={['utilisateurs']} modules={['utilisateurs.utilisateurs']}><NouvelUtilisateur /></PrivateRoute>} />
            <Route path="/Utilisateurs/:id"      element={<PrivateRoute permissions={['utilisateurs']} modules={['utilisateurs.utilisateurs']}><NouvelUtilisateur /></PrivateRoute>} />
            <Route path="/Roles"                 element={<PrivateRoute permissions={['utilisateurs']} modules={['utilisateurs.roles']}><ListeRoles /></PrivateRoute>} />
            <Route path="/Roles/nouveau"         element={<PrivateRoute permissions={['utilisateurs']} modules={['utilisateurs.roles']}><NouveauRole /></PrivateRoute>} />
            <Route path="/Roles/:id"             element={<PrivateRoute permissions={['utilisateurs']} modules={['utilisateurs.roles']}><NouveauRole /></PrivateRoute>} />
            <Route path="/Documentation"  element={<PrivateRoute permissions={R_ADMIN} modules={['utilisateurs.documentation']}><GestionDocumentation /></PrivateRoute>} />
            <Route path="/AuditLogs"             element={<PrivateRoute permissions={['utilisateurs']} modules={['utilisateurs.audit_logs']}><AuditLogs /></PrivateRoute>} />

            {/* 404 — page non trouvée */}
            <Route path="*" element={
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <h2>Page introuvable</h2>
                    <p>La page demandée n&apos;existe pas.</p>
                </div>
            } />
        </Routes>
        </Suspense>
    </div>
);

export default RoutesMenu;
