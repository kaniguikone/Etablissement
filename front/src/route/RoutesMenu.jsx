import { Routes, Route } from 'react-router-dom';
import PrivateRoute from '../components/auth/PrivateRoute';
import LoginPage from '../components/auth/LoginPage';
import DashboardGroupe from '../components/groupe/DashboardGroupe';
import ListeEcoles from '../components/groupe/ListeEcoles';
import DetailsEcole from '../components/groupe/DetailsEcole';
import ActivitesEnseignants from '../components/groupe/ActivitesEnseignants';
import FinancesGroupe from '../components/groupe/FinancesGroupe';
import ActivitesEleves from '../components/groupe/ActivitesEleves';
import GestionTemplates from '../components/groupe/GestionTemplates';
import EditionTemplate from '../components/groupe/EditionTemplate';
import MonProfil from '../components/auth/MonProfil';

import Accueil from '../components/Accueil';
import Statistiques from '../components/stats/Statistiques';

import ListeEleves from '../components/eleves/ListeEleves';
import ListeEnseignants from '../components/enseignants/ListeEnseignants';
import ListeClasses from '../components/classes/ListeClasses';
import ListeNiveaux from '../components/niveaux/ListeNiveaux';
import ListeMatieres from '../components/matieres/ListeMatieres';
import ListePeriodes from '../components/periodes/ListePeriodes';
import ListeParents from '../components/parents/ListeParents';
import ListeScolarites from '../components/scolarites/ListeScolarites';
import ListeInformations from '../components/informations/ListeInformations';

import NouvelEleve from '../components/eleves/NouvelEleve';
import NouvelEnseignant from '../components/enseignants/NouvelEnseignant';
import NouvelleClasse from '../components/classes/NouvelleClasse';
import NouveauNiveau from '../components/niveaux/NouveauNiveau';
import NouvelleMatiere from '../components/matieres/NouvelleMatiere';
import NouvellePeriode from '../components/periodes/NouvellePeriode';
import NouveauParent from '../components/parents/NouveauParent';
import NouvelleScolarite from '../components/scolarites/NouvelleScolarite';
import NouvelleInformation from '../components/informations/NouvelleInformation';

import DetailsEleve from '../components/eleves/DetailsEleve';
import DetailsEnseignant from '../components/enseignants/DetailsEnseignant';
import DetailsClasse from '../components/classes/DetailsClasse';
import DetailsNiveau from '../components/niveaux/DetailsNiveau';
import DetailsMatiere from '../components/matieres/DetailsMatiere';
import ConfigurationMatieres from '../components/matieres/ConfigurationMatieres';
import DetailsPeriode from '../components/periodes/DetailsPeriode';
import DetailsParent from '../components/parents/DetailsParent';
import DetailsScolarite from '../components/scolarites/DetailsScolarite';
import DetailsInformation from '../components/informations/DetailsInformation';

import ListeEmploiDuTemps from '../components/emploidutemps/ListeEmploiDuTemps';
import NouvelEmploiDuTemps from '../components/emploidutemps/NouvelEmploiDuTemps';
import DetailsEmploiDuTemps from '../components/emploidutemps/DetailsEmploiDuTemps';

import ListeAssiduites from '../components/assiduites/ListeAssiduites';
import FeuillePresence from '../components/assiduites/FeuillePresence';
import DetailsAssiduite from '../components/assiduites/DetailsAssiduite';

import ListeSeries from '../components/series/ListeSeries';
import ListeTypeDevoirs from '../components/typedevoirs/ListeTypeDevoirs';
import NouveauTypeDevoir from '../components/typedevoirs/NouveauTypeDevoir';
import DetailsTypeDevoir from '../components/typedevoirs/DetailsTypeDevoir';

import ListeDevoirs from '../components/devoirs/ListeDevoirs';
import NouveauDevoir from '../components/devoirs/NouveauDevoir';
import DetailsDevoir from '../components/devoirs/DetailsDevoir';
import SaisieNotes from '../components/devoirs/SaisieNotes';

import Bulletin from '../components/bulletins/Bulletin';
import Attestation from '../components/attestations/Attestation';

import ListePaiements from '../components/paiements/ListePaiements';
import NouveauPaiement from '../components/paiements/NouveauPaiement';
import DetailsPaiement from '../components/paiements/DetailsPaiement';
import RecapPaiements from '../components/paiements/RecapPaiements';
import PaiementsEleve from '../components/paiements/PaiementsEleve';
import PaiementRetour from '../components/paiements/PaiementRetour';
import TableauImpayes from '../components/paiements/TableauImpayes';
import Echeancier from '../components/paiements/Echeancier';
import ListeSalles from '../components/salles/ListeSalles';
import FormSalle from '../components/salles/FormSalle';
import PlanningSalle from '../components/salles/PlanningSalle';
import ListeRemplacements from '../components/remplacements/ListeRemplacements';
import FormRemplacement from '../components/remplacements/FormRemplacement';
import Messagerie from '../components/messagerie/Messagerie';
import GestionCreneauxRdv from '../components/rdv/GestionCreneauxRdv';
import CalendrierScolaire from '../components/calendrier/CalendrierScolaire';
import ListeSanctions from '../components/sanctions/ListeSanctions';
import FormSanction from '../components/sanctions/FormSanction';
import SanctionsEleve from '../components/sanctions/SanctionsEleve';

import ListeInscriptions from '../components/inscriptions/ListeInscriptions';
import DetailsInscription from '../components/inscriptions/DetailsInscription';

import GestionChapitres from '../components/programme/GestionChapitres';
import SuiviProgressions from '../components/programme/SuiviProgressions';
import ParametresEtablissement from '../components/etablissement/ParametresEtablissement';
import VolumeHoraire from '../components/volumes/VolumeHoraire';
import ConformiteEdt from '../components/volumes/ConformiteEdt';
import ChargeEnseignants from '../components/volumes/ChargeEnseignants';

import ListeUtilisateurs from '../components/utilisateurs/ListeUtilisateurs';
import NouvelUtilisateur from '../components/utilisateurs/NouvelUtilisateur';
import ListeRoles from '../components/roles/ListeRoles';
import NouveauRole from '../components/roles/NouveauRole';
import Notifications from '../components/notifications/Notifications';
import ArchivageWizard from '../components/archivage/ArchivageWizard';

import SeederInterface from '../components/developpement/SeederInterface';

import EnseignantDashboard    from '../components/enseignant/EnseignantDashboard';
import EnseignantDevoirs      from '../components/enseignant/EnseignantDevoirs';
import EnseignantPresence     from '../components/enseignant/EnseignantPresence';
import EnseignantProgramme    from '../components/enseignant/EnseignantProgramme';
import EnseignantEmploi       from '../components/enseignant/EnseignantEmploi';
import EnseignantRemplacements from '../components/enseignant/EnseignantRemplacements';
import EnseignantMessagerie   from '../components/enseignant/EnseignantMessagerie';
import EnseignantRdv          from '../components/enseignant/EnseignantRdv';
import EnseignantInformations from '../components/enseignant/EnseignantInformations';

// Rôles constants pour éviter les répétitions
const R_STATS     = ['pedagogie', 'finances'];
const R_PARAM     = ['parametrage'];
const R_INSCRIP   = ['inscriptions'];
const R_ELEVES    = ['eleves'];
const R_ENSEIGNANTS = ['enseignants'];
const R_PARENTS   = ['parents'];
const R_PEDAGO    = ['pedagogie'];
const R_FINANCES  = ['finances'];
const R_COMM      = ['communication'];
const R_ADMIN     = ['utilisateurs'];

const RoutesMenu = () => (
    <div>
        <Routes>
            {/* Page de connexion — publique */}
            <Route path="/login" element={<LoginPage />} />

            {/* ── Espace Enseignant ─────────────────────────────────────── */}
            <Route path="/enseignant"               element={<PrivateRoute><EnseignantDashboard /></PrivateRoute>} />
            <Route path="/enseignant/devoirs"       element={<PrivateRoute><EnseignantDevoirs /></PrivateRoute>} />
            <Route path="/enseignant/presence"      element={<PrivateRoute><EnseignantPresence /></PrivateRoute>} />
            <Route path="/enseignant/programme"     element={<PrivateRoute><EnseignantProgramme /></PrivateRoute>} />
            <Route path="/enseignant/emploi"        element={<PrivateRoute><EnseignantEmploi /></PrivateRoute>} />
            <Route path="/enseignant/remplacements" element={<PrivateRoute><EnseignantRemplacements /></PrivateRoute>} />
            <Route path="/enseignant/messagerie"    element={<PrivateRoute><EnseignantMessagerie /></PrivateRoute>} />
            <Route path="/enseignant/rdv"           element={<PrivateRoute><EnseignantRdv /></PrivateRoute>} />
            <Route path="/enseignant/informations"  element={<PrivateRoute><EnseignantInformations /></PrivateRoute>} />

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
            <Route path="/" element={<PrivateRoute><Accueil /></PrivateRoute>} />

            {/* Mon profil */}
            <Route path="/MonProfil" element={<PrivateRoute><MonProfil /></PrivateRoute>} />

            {/* Notifications */}
            <Route path="/Notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />

            {/* Archivage */}
            <Route path="/Archivage" element={<PrivateRoute permissions={R_PARAM}><ArchivageWizard /></PrivateRoute>} />

            {/* Seed (dev) */}
            <Route path="/Seeder" element={<PrivateRoute superOnly><SeederInterface /></PrivateRoute>} />

            {/* Statistiques */}
            <Route path="/Statistiques" element={<PrivateRoute permissions={R_STATS}><Statistiques /></PrivateRoute>} />

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

            <Route path="/Enseignants"            element={<PrivateRoute permissions={R_ENSEIGNANTS}><ListeEnseignants /></PrivateRoute>} />
            <Route path="/NouvelEnseignant"       element={<PrivateRoute permissions={R_ENSEIGNANTS}><NouvelEnseignant /></PrivateRoute>} />
            <Route path="/DetailsEnseignant/:id"  element={<PrivateRoute permissions={R_ENSEIGNANTS}><DetailsEnseignant /></PrivateRoute>} />

            <Route path="/Parents"           element={<PrivateRoute permissions={R_PARENTS}><ListeParents /></PrivateRoute>} />
            <Route path="/NouveauParent"     element={<PrivateRoute permissions={R_PARENTS}><NouveauParent /></PrivateRoute>} />
            <Route path="/DetailsParent/:id" element={<PrivateRoute permissions={R_PARENTS}><DetailsParent /></PrivateRoute>} />

            {/* Salles */}
            <Route path="/Salles"            element={<PrivateRoute permissions={R_PARAM}><ListeSalles /></PrivateRoute>} />
            <Route path="/NouvelleSalle"     element={<PrivateRoute permissions={R_PARAM}><FormSalle /></PrivateRoute>} />
            <Route path="/DetailsSalle/:id"  element={<PrivateRoute permissions={R_PARAM}><FormSalle /></PrivateRoute>} />
            <Route path="/PlanningSalle/:id" element={<PrivateRoute permissions={R_PARAM}><PlanningSalle /></PrivateRoute>} />

            {/* Remplacements */}
            <Route path="/Remplacements"           element={<PrivateRoute permissions={R_PEDAGO}><ListeRemplacements /></PrivateRoute>} />
            <Route path="/NouveauRemplacement"     element={<PrivateRoute permissions={R_PEDAGO}><FormRemplacement /></PrivateRoute>} />
            <Route path="/DetailsRemplacement/:id" element={<PrivateRoute permissions={R_PEDAGO}><FormRemplacement /></PrivateRoute>} />

            {/* Messagerie */}
            <Route path="/Messagerie" element={<PrivateRoute permissions={R_COMM}><Messagerie /></PrivateRoute>} />

            {/* RDV parents-profs */}
            <Route path="/RDV" element={<PrivateRoute permissions={R_PEDAGO}><GestionCreneauxRdv /></PrivateRoute>} />

            {/* Pédagogie */}
            <Route path="/EmploiDuTemps"            element={<PrivateRoute permissions={R_PEDAGO}><ListeEmploiDuTemps /></PrivateRoute>} />
            <Route path="/NouvelEmploiDuTemps"      element={<PrivateRoute permissions={R_PEDAGO}><NouvelEmploiDuTemps /></PrivateRoute>} />
            <Route path="/DetailsEmploiDuTemps/:id" element={<PrivateRoute permissions={R_PEDAGO}><DetailsEmploiDuTemps /></PrivateRoute>} />

            <Route path="/Assiduites"          element={<PrivateRoute permissions={R_PEDAGO}><ListeAssiduites /></PrivateRoute>} />
            <Route path="/FeuillePresence"     element={<PrivateRoute permissions={R_PEDAGO}><FeuillePresence /></PrivateRoute>} />
            <Route path="/DetailsAssiduite/:id" element={<PrivateRoute permissions={R_PEDAGO}><DetailsAssiduite /></PrivateRoute>} />

            <Route path="/Devoirs"           element={<PrivateRoute permissions={R_PEDAGO}><ListeDevoirs /></PrivateRoute>} />
            <Route path="/NouveauDevoir"     element={<PrivateRoute permissions={R_PEDAGO}><NouveauDevoir /></PrivateRoute>} />
            <Route path="/DetailsDevoir/:id" element={<PrivateRoute permissions={R_PEDAGO}><DetailsDevoir /></PrivateRoute>} />
            <Route path="/SaisieNotes/:id"   element={<PrivateRoute permissions={R_PEDAGO}><SaisieNotes /></PrivateRoute>} />

            <Route path="/Bulletins" element={<PrivateRoute permissions={R_PEDAGO}><Bulletin /></PrivateRoute>} />

            <Route path="/GestionChapitres"  element={<PrivateRoute permissions={R_PEDAGO}><GestionChapitres /></PrivateRoute>} />
            <Route path="/SuiviProgressions" element={<PrivateRoute permissions={R_PEDAGO}><SuiviProgressions /></PrivateRoute>} />
            <Route path="/ConformiteEdt"     element={<PrivateRoute permissions={R_PEDAGO}><ConformiteEdt /></PrivateRoute>} />
            <Route path="/ChargeEnseignants" element={<PrivateRoute permissions={R_PEDAGO}><ChargeEnseignants /></PrivateRoute>} />

            {/* Calendrier scolaire */}
            <Route path="/Calendrier" element={<PrivateRoute permissions={R_PEDAGO}><CalendrierScolaire /></PrivateRoute>} />

            {/* Finances */}
            <Route path="/Scolarites"            element={<PrivateRoute permissions={R_FINANCES}><ListeScolarites /></PrivateRoute>} />
            <Route path="/NouvelleScolarite"     element={<PrivateRoute permissions={R_FINANCES}><NouvelleScolarite /></PrivateRoute>} />
            <Route path="/DetailsScolarite/:id"  element={<PrivateRoute permissions={R_FINANCES}><DetailsScolarite /></PrivateRoute>} />

            <Route path="/Paiements"          element={<PrivateRoute permissions={R_FINANCES}><ListePaiements /></PrivateRoute>} />
            <Route path="/NouveauPaiement"    element={<PrivateRoute permissions={R_FINANCES}><NouveauPaiement /></PrivateRoute>} />
            <Route path="/DetailsPaiement/:id"element={<PrivateRoute permissions={R_FINANCES}><DetailsPaiement /></PrivateRoute>} />
            <Route path="/RecapPaiements"     element={<PrivateRoute permissions={R_FINANCES}><RecapPaiements /></PrivateRoute>} />
            <Route path="/PaiementsEleve/:id" element={<PrivateRoute permissions={R_FINANCES}><PaiementsEleve /></PrivateRoute>} />
            <Route path="/PaiementRetour"     element={<PrivateRoute permissions={R_FINANCES}><PaiementRetour /></PrivateRoute>} />
            <Route path="/Impayes"            element={<PrivateRoute permissions={R_FINANCES}><TableauImpayes /></PrivateRoute>} />
            <Route path="/Echeancier"         element={<PrivateRoute permissions={R_FINANCES}><Echeancier /></PrivateRoute>} />

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

            {/* 404 — page non trouvée */}
            <Route path="*" element={
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <h2>Page introuvable</h2>
                    <p>La page demandée n&apos;existe pas.</p>
                </div>
            } />
        </Routes>
    </div>
);

export default RoutesMenu;
