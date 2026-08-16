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
const DemandesAcces = lazy(() => import('../components/superadmin/DemandesAcces'));
const ConfigTarifs = lazy(() => import('../components/superadmin/ConfigTarifs'));
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
            <Route path="/Archivage" element={<PrivateRoute permissions={R_PARAM}><ArchivageWizard /></PrivateRoute>} />

            {/* Seed (dev) */}
            <Route path="/superadmin/seeder" element={<PrivateRoute superOnly><SeederInterface /></PrivateRoute>} />

            {/* Statistiques */}
            <Route path="/Statistiques"     element={<PrivateRoute permissions={R_STATS}><Statistiques /></PrivateRoute>} />
            <Route path="/StatsGenerales"   element={<PrivateRoute permissions={['pedagogie_pilotage','parametrage']}><StatsGenerales /></PrivateRoute>} />

            {/* Paramétrage */}
            <Route path="/Etablissement"  element={<PrivateRoute permissions={R_PARAM}><ParametresEtablissement /></PrivateRoute>} />
            <Route path="/VolumeHoraire"  element={<PrivateRoute permissions={R_PARAM}><VolumeHoraire /></PrivateRoute>} />
            <Route path="/Niveaux"           element={<PrivateRoute permissions={R_PARAM}><ListeNiveaux /></PrivateRoute>} />
            <Route path="/NouveauNiveau"     element={<PrivateRoute permissions={R_PARAM}><NouveauNiveau /></PrivateRoute>} />
            <Route path="/DetailsNiveau/:id" element={<PrivateRoute permissions={R_PARAM}><DetailsNiveau /></PrivateRoute>} />

            <Route path="/Classes"           element={<PrivateRoute permissions={R_PARAM}><ListeClasses /></PrivateRoute>} />
            <Route path="/NouvelleClasse"    element={<PrivateRoute permissions={R_PARAM}><NouvelleClasse /></PrivateRoute>} />
            <Route path="/DetailsClasse/:id" element={<PrivateRoute permissions={R_PARAM}><DetailsClasse /></PrivateRoute>} />

            <Route path="/Matieres"           element={<PrivateRoute permissions={R_PARAM}><ListeMatieres /></PrivateRoute>} />
            <Route path="/NouvelleMatiere"    element={<PrivateRoute permissions={R_PARAM}><NouvelleMatiere /></PrivateRoute>} />
            <Route path="/DetailsMatiere/:id" element={<PrivateRoute permissions={R_PARAM}><DetailsMatiere /></PrivateRoute>} />
            <Route path="/ConfigMatieres"     element={<PrivateRoute permissions={R_PARAM}><ConfigurationMatieres /></PrivateRoute>} />

            <Route path="/Series"                element={<PrivateRoute permissions={R_PARAM}><ListeSeries /></PrivateRoute>} />
            <Route path="/TypeDevoirs"           element={<PrivateRoute permissions={R_PARAM}><ListeTypeDevoirs /></PrivateRoute>} />
            <Route path="/NouveauTypeDevoir"     element={<PrivateRoute permissions={R_PARAM}><NouveauTypeDevoir /></PrivateRoute>} />
            <Route path="/DetailsTypeDevoir/:id" element={<PrivateRoute permissions={R_PARAM}><DetailsTypeDevoir /></PrivateRoute>} />

            <Route path="/Periodes"           element={<PrivateRoute permissions={R_PARAM}><ListePeriodes /></PrivateRoute>} />
            <Route path="/NouvellePeriode"    element={<PrivateRoute permissions={R_PARAM}><NouvellePeriode /></PrivateRoute>} />
            <Route path="/DetailsPeriode/:id" element={<PrivateRoute permissions={R_PARAM}><DetailsPeriode /></PrivateRoute>} />

            {/* Inscriptions */}
            <Route path="/Inscriptions"          element={<PrivateRoute permissions={R_INSCRIP}><ListeInscriptions /></PrivateRoute>} />
            <Route path="/Inscriptions/:id"      element={<PrivateRoute permissions={R_INSCRIP}><DetailsInscription /></PrivateRoute>} />

            {/* Personnes */}
            <Route path="/Eleves"              element={<PrivateRoute permissions={R_ELEVES}><ListeEleves /></PrivateRoute>} />
            <Route path="/NouvelEleve"         element={<PrivateRoute permissions={R_ELEVES}><NouvelEleve /></PrivateRoute>} />
            <Route path="/DetailsEleve/:id"    element={<PrivateRoute permissions={R_ELEVES}><DetailsEleve /></PrivateRoute>} />
            <Route path="/Attestations"        element={<PrivateRoute permissions={R_ELEVES}><Attestation /></PrivateRoute>} />
            <Route path="/Sanctions"           element={<PrivateRoute permissions={R_ELEVES}><ListeSanctions /></PrivateRoute>} />
            <Route path="/NouvelleSanction"    element={<PrivateRoute permissions={R_ELEVES}><FormSanction /></PrivateRoute>} />
            <Route path="/DetailsSanction/:id" element={<PrivateRoute permissions={R_ELEVES}><FormSanction /></PrivateRoute>} />
            <Route path="/SanctionsEleve/:id"  element={<PrivateRoute permissions={R_ELEVES}><SanctionsEleve /></PrivateRoute>} />

            <Route path="/ConseilClasse" element={<PrivateRoute permissions={R_PEDAGO_PILOTAGE}><ConseilClasse /></PrivateRoute>} />

            <Route path="/Enseignants"            element={<PrivateRoute permissions={R_ENSEIGNANTS}><ListeEnseignants /></PrivateRoute>} />
            <Route path="/NouvelEnseignant"       element={<PrivateRoute permissions={R_ENSEIGNANTS}><NouvelEnseignant /></PrivateRoute>} />
            <Route path="/DetailsEnseignant/:id"  element={<PrivateRoute permissions={R_ENSEIGNANTS}><DetailsEnseignant /></PrivateRoute>} />
            <Route path="/ProfsParMatiere"        element={<PrivateRoute permissions={R_ENSEIGNANTS}><ListeProfsParMatiere /></PrivateRoute>} />

            <Route path="/Parents"               element={<PrivateRoute permissions={R_PARENTS}><ListeParents /></PrivateRoute>} />
            <Route path="/NouveauParent"         element={<PrivateRoute permissions={R_PARENTS}><NouveauParent /></PrivateRoute>} />
            <Route path="/DetailsParent/:id"     element={<PrivateRoute permissions={R_PARENTS}><DetailsParent /></PrivateRoute>} />
            <Route path="/DemandesParents"       element={<PrivateRoute permissions={R_PARENTS}><DemandesParents /></PrivateRoute>} />

            {/* Salles */}
            <Route path="/Salles"            element={<PrivateRoute permissions={R_PARAM}><ListeSalles /></PrivateRoute>} />
            <Route path="/NouvelleSalle"     element={<PrivateRoute permissions={R_PARAM}><FormSalle /></PrivateRoute>} />
            <Route path="/DetailsSalle/:id"  element={<PrivateRoute permissions={R_PARAM}><FormSalle /></PrivateRoute>} />
            <Route path="/PlanningSalle/:id" element={<PrivateRoute permissions={R_PARAM}><PlanningSalle /></PrivateRoute>} />

            {/* Remplacements */}
            <Route path="/Remplacements"           element={<PrivateRoute permissions={R_PEDAGO_SAISIE}><ListeRemplacements /></PrivateRoute>} />
            <Route path="/NouveauRemplacement"     element={<PrivateRoute permissions={R_PEDAGO_SAISIE}><FormRemplacement /></PrivateRoute>} />
            <Route path="/DetailsRemplacement/:id" element={<PrivateRoute permissions={R_PEDAGO_SAISIE}><FormRemplacement /></PrivateRoute>} />

            {/* Messagerie */}
            <Route path="/Messagerie" element={<PrivateRoute permissions={R_COMM}><Messagerie /></PrivateRoute>} />

            {/* RDV parents-profs */}
            <Route path="/RDV" element={<PrivateRoute permissions={R_PEDAGO_SAISIE}><GestionCreneauxRdv /></PrivateRoute>} />

            {/* Pédagogie — saisie */}
            <Route path="/EmploiDuTemps"            element={<PrivateRoute permissions={R_PEDAGO_SAISIE}><ListeEmploiDuTemps /></PrivateRoute>} />
            <Route path="/NouvelEmploiDuTemps"      element={<PrivateRoute permissions={R_PEDAGO_SAISIE}><NouvelEmploiDuTemps /></PrivateRoute>} />
            <Route path="/DetailsEmploiDuTemps/:id" element={<PrivateRoute permissions={R_PEDAGO_SAISIE}><DetailsEmploiDuTemps /></PrivateRoute>} />

            <Route path="/Assiduites"           element={<PrivateRoute permissions={R_PEDAGO_SAISIE}><ListeAssiduites /></PrivateRoute>} />
            <Route path="/FeuillePresence"      element={<PrivateRoute permissions={R_PEDAGO_SAISIE}><FeuillePresence /></PrivateRoute>} />
            <Route path="/DetailsAssiduite/:id" element={<PrivateRoute permissions={R_PEDAGO_SAISIE}><DetailsAssiduite /></PrivateRoute>} />

            <Route path="/Devoirs"           element={<PrivateRoute permissions={R_PEDAGO_SAISIE}><ListeDevoirs /></PrivateRoute>} />
            <Route path="/NouveauDevoir"     element={<PrivateRoute permissions={R_PEDAGO_SAISIE}><NouveauDevoir /></PrivateRoute>} />
            <Route path="/DetailsDevoir/:id" element={<PrivateRoute permissions={R_PEDAGO_SAISIE}><DetailsDevoir /></PrivateRoute>} />
            <Route path="/SaisieNotes/:id"   element={<PrivateRoute permissions={R_PEDAGO_SAISIE}><SaisieNotes /></PrivateRoute>} />

            <Route path="/GestionChapitres" element={<PrivateRoute permissions={R_PEDAGO_SAISIE}><GestionChapitres /></PrivateRoute>} />
            <Route path="/Calendrier"       element={<PrivateRoute permissions={R_PEDAGO_SAISIE}><CalendrierScolaire /></PrivateRoute>} />

            {/* Pédagogie — pilotage */}
            <Route path="/Bulletins"        element={<PrivateRoute permissions={R_PEDAGO_PILOTAGE}><Bulletin /></PrivateRoute>} />
            <Route path="/RapportMinistere" element={<PrivateRoute permissions={R_STATS}><RapportMinistere /></PrivateRoute>} />
            <Route path="/SuiviProgressions" element={<PrivateRoute permissions={R_PEDAGO_PILOTAGE}><SuiviProgressions /></PrivateRoute>} />
            <Route path="/ConformiteEdt"     element={<PrivateRoute permissions={R_PEDAGO_PILOTAGE}><ConformiteEdt /></PrivateRoute>} />
            <Route path="/ChargeEnseignants" element={<PrivateRoute permissions={R_PEDAGO_PILOTAGE}><ChargeEnseignants /></PrivateRoute>} />

            {/* Finances — gestion */}
            <Route path="/Scolarites"           element={<PrivateRoute permissions={R_FINANCES_GESTION}><ListeScolarites /></PrivateRoute>} />
            <Route path="/NouvelleScolarite"    element={<PrivateRoute permissions={R_FINANCES_GESTION}><NouvelleScolarite /></PrivateRoute>} />
            <Route path="/DetailsScolarite/:id" element={<PrivateRoute permissions={R_FINANCES_GESTION}><DetailsScolarite /></PrivateRoute>} />
            <Route path="/Impayes"              element={<PrivateRoute permissions={R_FINANCES_GESTION}><TableauImpayes /></PrivateRoute>} />
            <Route path="/FraisAnnexes"         element={<PrivateRoute permissions={R_FINANCES_GESTION}><FraisAnnexesConfig /></PrivateRoute>} />
            <Route path="/ImpayesFraisAnnexes"  element={<PrivateRoute permissions={R_FINANCES_GESTION}><ImpayesFraisAnnexes /></PrivateRoute>} />
            <Route path="/FraisAnnexeEleve/:eleveId" element={<PrivateRoute permissions={R_FINANCES_CAISSE}><FraisAnnexeEleve /></PrivateRoute>} />
            <Route path="/ExportComptable"       element={<PrivateRoute permissions={R_FINANCES_GESTION}><ExportComptable /></PrivateRoute>} />

            {/* Finances — caisse */}
            <Route path="/Paiements"           element={<PrivateRoute permissions={R_FINANCES_CAISSE}><ListePaiements /></PrivateRoute>} />
            <Route path="/NouveauPaiement"     element={<PrivateRoute permissions={R_FINANCES_CAISSE}><NouveauPaiement /></PrivateRoute>} />
            <Route path="/DetailsPaiement/:id" element={<PrivateRoute permissions={R_FINANCES_CAISSE}><DetailsPaiement /></PrivateRoute>} />
            <Route path="/RecapPaiements"      element={<PrivateRoute permissions={R_FINANCES_CAISSE}><RecapPaiements /></PrivateRoute>} />
            <Route path="/PaiementsEleve/:id"  element={<PrivateRoute permissions={R_FINANCES_CAISSE}><PaiementsEleve /></PrivateRoute>} />
            <Route path="/PaiementRetour"      element={<PrivateRoute permissions={R_FINANCES_CAISSE}><PaiementRetour /></PrivateRoute>} />
            <Route path="/Echeancier"          element={<PrivateRoute permissions={R_FINANCES_CAISSE}><Echeancier /></PrivateRoute>} />

            {/* Communication */}
            <Route path="/Informations"            element={<PrivateRoute permissions={R_COMM}><ListeInformations /></PrivateRoute>} />
            <Route path="/NouvelleInformation"     element={<PrivateRoute permissions={R_COMM}><NouvelleInformation /></PrivateRoute>} />
            <Route path="/DetailsInformation/:id"  element={<PrivateRoute permissions={R_COMM}><DetailsInformation /></PrivateRoute>} />

            {/* Administration */}
            <Route path="/Utilisateurs"          element={<PrivateRoute permissions={['utilisateurs']}><ListeUtilisateurs /></PrivateRoute>} />
            <Route path="/NouvelUtilisateur"     element={<PrivateRoute permissions={['utilisateurs']}><NouvelUtilisateur /></PrivateRoute>} />
            <Route path="/Utilisateurs/:id"      element={<PrivateRoute permissions={['utilisateurs']}><NouvelUtilisateur /></PrivateRoute>} />
            <Route path="/Roles"                 element={<PrivateRoute permissions={['utilisateurs']}><ListeRoles /></PrivateRoute>} />
            <Route path="/Roles/nouveau"         element={<PrivateRoute permissions={['utilisateurs']}><NouveauRole /></PrivateRoute>} />
            <Route path="/Roles/:id"             element={<PrivateRoute permissions={['utilisateurs']}><NouveauRole /></PrivateRoute>} />
            <Route path="/Documentation"  element={<PrivateRoute permissions={R_ADMIN}><GestionDocumentation /></PrivateRoute>} />
            <Route path="/AuditLogs"             element={<PrivateRoute permissions={['utilisateurs']}><AuditLogs /></PrivateRoute>} />

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
