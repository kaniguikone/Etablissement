# Guide Administrateur — Plateforme de Gestion Scolaire

## Sommaire
1. [Premiers pas](#1-premiers-pas)
2. [Paramétrage de l'établissement](#2-paramétrage-de-létablissement)
3. [Gestion des enseignants](#3-gestion-des-enseignants)
4. [Gestion des élèves](#4-gestion-des-élèves)
5. [Gestion des parents](#5-gestion-des-parents)
6. [Pédagogie](#6-pédagogie)
7. [Finances](#7-finances)
8. [Communication](#8-communication)
9. [Application mobile](#9-application-mobile)
10. [Tableau de bord & Statistiques](#10-tableau-de-bord--statistiques)
11. [Imports Excel en masse](#11-imports-excel-en-masse)
12. [Utilisateurs, rôles et journal d'audit](#12-utilisateurs-rôles-et-journal-daudit)
13. [Documentation in-app](#13-documentation-in-app)
14. [Questions fréquentes](#14-questions-fréquentes)

---

## 1. Premiers pas

### Accès au back-office
Ouvrez votre navigateur et accédez à l'adresse fournie par votre prestataire :
```
https://votre-ecole.tondomaine.ci
```
Connectez-vous avec les identifiants communiqués lors de l'installation.

> **Première connexion :** un changement de mot de passe est **obligatoire** avant tout accès à l'application. Choisissez un mot de passe que vous seul connaissez.

### Ordre de configuration recommandé
Votre établissement est livré avec l'année scolaire en cours et un modèle pédagogique de base déjà appliqués (niveaux, matières, types de devoirs — selon le type d'établissement choisi à la création). Il reste à :
1. **Compléter la fiche établissement** (logo, coordonnées, type d'établissement)
2. **Vérifier/ajuster les niveaux et classes** générés par le modèle, ou en créer de nouveaux
3. **Vérifier les matières et types de devoirs**, ajuster si besoin
4. **Ajouter les enseignants** et les affecter aux classes (manuellement ou par import Excel)
5. **Ajouter les élèves** (manuellement ou par import Excel)
6. **Rattacher les parents** aux élèves
7. **Distribuer l'application mobile**

### Rôles disponibles
| Rôle | Accès |
|---|---|
| Super administrateur | Tout |
| Directeur / Proviseur | Tout sauf gestion des utilisateurs |
| Censeur | Élèves, enseignants, parents, pédagogie, communication |
| Secrétaire | Inscriptions, élèves, enseignants, parents, communication |
| Comptable | Paiements et configuration financière |



## 2. Paramétrage de l'établissement

### Informations générales
*Menu : Paramétrage → Établissement*

Renseignez :
- Nom officiel de l'établissement
- **Type d'établissement** (lycée, lycée complet, collège, primaire) — **obligatoire**, conditionne certains documents générés
- Logo (format PNG ou JPG, recommandé : 512×512 px)
- Adresse, téléphone, email
- Directeur / Responsable

Ces informations apparaissent sur les bulletins et attestations PDF.

### Périodes
*Menu : Paramétrage → Périodes*

L'année scolaire en cours et ses périodes (trimestres ou semestres) sont créées automatiquement à la mise en place de votre établissement. Vous pouvez ajuster leurs dates de début/fin depuis ce menu.

> **Important :** Avant de saisir des notes ou des absences, la période concernée doit être active.

### Niveaux, classes et séries
*Menu : Paramétrage → Niveaux / Classes / Séries*

Les niveaux (6ème, 5ème, 2nde…) et leurs classes (6ème A, 6ème B…) sont pré-remplis par le modèle pédagogique choisi à la création de l'établissement ; ajustez ou complétez-les depuis ces menus. Pour les lycées, la gestion des **séries** (A, C, D…) et de la **configuration matières/niveaux** (matières différentes par série) se fait depuis *Paramétrage → Séries* et *Paramétrage → Config. matières/niveaux*.

### Types de devoirs
*Menu : Paramétrage → Types de devoirs*

Configurez vos types d'évaluations : Devoir Surveillé, Interrogation, Examen, etc., avec leur coefficient.

### Salles et volumes horaires
*Menu : Paramétrage → Salles / Volumes horaires*

Ajoutez les salles de classe pour la gestion des emplois du temps et éviter les conflits de planning. Le menu **Volumes horaires** permet de définir le nombre d'heures attendu par matière et par classe, comparé ensuite à l'emploi du temps réel (voir *Conformité EDT*, section 6).

### Passage de classe (fin d'année)
*Menu : Paramétrage → Archivage fin d'année*

L'assistant vous guide étape par étape : validation des passages de classe, archivage des données de l'année. Un retour en arrière (rollback) reste possible en cas d'erreur.

---

## 3. Gestion des enseignants

### Ajouter un enseignant
*Menu : Enseignants → Ajouter un enseignant*

Le compte mobile **n'est pas créé automatiquement** : le champ mot de passe est optionnel dans le formulaire. Laissez-le vide si l'enseignant n'a pas besoin d'accès mobile pour l'instant, ou renseignez un mot de passe (avec le téléphone) pour activer son accès immédiatement.

### Import Excel (en masse)
*Menu : Enseignants → Liste des enseignants → bouton Import*

Téléchargez le modèle Excel, remplissez une ligne par enseignant, puis importez le fichier. Le modèle inclut une colonne **« Créer accès portail (O/N) »** : si `O` et qu'un téléphone est renseigné, un compte mobile est créé automatiquement avec un **mot de passe généré aléatoirement** (à communiquer séparément à l'enseignant) ; sinon aucun compte n'est créé. Les erreurs de saisie (matricule en doublon, statut invalide…) sont signalées ligne par ligne sans bloquer l'import des lignes valides.

### Affecter un enseignant à une matière / classe
Sur la fiche de l'enseignant → onglet **Affectations** → sélectionnez la classe et la matière (max. 3 matières et 7 classes par enseignant).

Un enseignant peut enseigner plusieurs matières dans plusieurs classes. Pour affecter plusieurs enseignants d'un coup, un **import Excel dédié** est disponible depuis le même écran (colonnes : matricule enseignant, abréviation classe, abréviation matière).

### Remplacements
*Menu : Pédagogie → Remplacements*

Planifiez un remplacement en indiquant l'enseignant absent, le remplaçant, la date et la classe concernée. L'enseignant remplaçant est notifié sur son application mobile.

---

## 4. Gestion des élèves

### Ajouter un élève
*Menu : Élèves → Ajouter un élève*

Champs obligatoires :
- Nom, prénoms, date de naissance
- Classe d'affectation
- Matricule (généré automatiquement si laissé vide)

Champs optionnels :
- Photo
- Parent (peut être rattaché à un parent existant ou créé à la volée)
- Handicap(s) le cas échéant (valeurs prédéfinies : moteur, malvoyant, malentendant, albinisme, nanisme, bégaiement, autiste)

### Import Excel (en masse)
*Menu : Élèves → Liste des élèves → bouton Import*

Téléchargez le modèle Excel, remplissez une ligne par élève (matricule, nom, classe, date de naissance au format JJ/MM/AAAA…), puis importez. Les handicaps se renseignent via une colonne O/N dédiée par type (Moteur, Malvoyant, Malentendant, Albinisme, Nanisme, Bégaiement, Autiste) plutôt qu'un champ texte libre. Les lignes en erreur (classe introuvable, matricule en doublon, date invalide…) sont signalées individuellement ; les autres lignes sont importées normalement.

> ℹ️ Le module **Inscriptions** (demande d'inscription en ligne par un parent, suivie d'une validation admin) existe dans l'application mais n'est actuellement pas activé dans le menu de navigation — module en attente d'utilisation réelle. Pour inscrire un élève aujourd'hui, utilisez l'ajout manuel ou l'import Excel ci-dessus.

### Sanctions et comportement
*Menu : Élèves → Sanctions*

Enregistrez avertissements, exclusions, etc. Le parent est notifié automatiquement sur son mobile et par email.

### Exporter la liste des élèves
Bouton **Exporter CSV** en haut de la liste. Le fichier s'ouvre dans Excel.

### Attestation de scolarité
Sur la fiche d'un élève → bouton **Attestation PDF**. Le document est généré instantanément.

---

## 5. Gestion des parents

### Ajouter un parent manuellement
*Menu : Parents → Ajouter un parent*

Un mot de passe par défaut est pré-rempli dans le formulaire (modifiable avant enregistrement). Communiquez le numéro de téléphone et le mot de passe choisi au parent.

### Rattacher un élève à un parent
Sur la fiche de l'élève → champ **Parent** → sélectionnez dans la liste.

Un parent peut avoir plusieurs enfants dans l'établissement (jusqu'à 2 parents par élève). Son identité (numéro de téléphone) est **unique et partagée entre établissements** : un parent déjà connu dans un autre établissement du même groupe n'a pas besoin de recréer un compte.

### Inscription autonome du parent depuis l'app mobile
Le parent peut créer son propre compte sans que vous interveniez au préalable :

1. Il ouvre l'application mobile → écran de connexion → lien **« S'inscrire »** (l'application lui demande de retrouver son établissement — par nom/adresse ou code MENET — uniquement à cette étape)
2. Il saisit le **matricule de son enfant** — l'application affiche le nom et la classe pour confirmation
3. Il renseigne ses informations (nom, prénom, téléphone, mot de passe, lien de parenté)
4. La demande vous parvient dans : *Menu : Parents → Demandes d'accès*

### Valider une demande d'accès parent
*Menu : Parents → Demandes d'accès*

Chaque demande indique : nom du parent, matricule de l'élève concerné, date de demande.
- **Approuver** : le compte est activé, le parent peut se connecter immédiatement
- **Rejeter** : la demande est supprimée, le parent reçoit une notification de refus

> **Limite :** 2 parents maximum par élève. Au-delà, les nouvelles demandes sont bloquées automatiquement.

---

## 6. Pédagogie

### Emploi du temps
*Menu : Pédagogie → Emploi du temps*

Créez les créneaux en sélectionnant : classe, matière, enseignant, salle, jour, heure de début et fin.

> Le système vérifie automatiquement les conflits de salle et d'enseignant.

### Assiduité
*Menu : Pédagogie → Assiduité*

Renseignez les absences par classe et par séance. Les parents reçoivent une notification automatique (push mobile + email) à chaque absence enregistrée.

### Saisie des notes
*Menu : Pédagogie → Devoirs / Notes*

1. Créez un devoir (type, classe, matière, date, coefficient)
2. Cliquez sur le devoir → **Saisir les notes**
3. Entrez les notes pour chaque élève, ou importez-les en masse via le modèle Excel du devoir (bouton **Import**)
4. Cliquez **Enregistrer**

Les enseignants peuvent également saisir les notes depuis l'application mobile, y compris **hors connexion** (synchronisation automatique au retour du réseau).

### Bulletins
*Menu : Pilotage pédagogique → Bulletins*

Sélectionnez un élève et une période → **Voir le bulletin**. Le bulletin PDF peut être :
- Téléchargé directement (individuellement ou en masse pour une classe entière)
- **Envoyé au parent** via notification push + email (bouton « Notifier »)

Le bulletin inclut les appréciations par matière saisies par les enseignants, l'appréciation du professeur principal, et — au dernier conseil de la période (T3/S2) — la **décision de fin d'année** (admis, redoublement, exclusion…).

### Conseil de classe
*Menu : Pilotage pédagogique → Conseil de classe*

Enregistrez les appréciations générales par classe et, au dernier conseil de l'année, la décision de passage de chaque élève.

### Conformité EDT et charge enseignants
*Menu : Pilotage pédagogique → Conformité EDT / Charge enseignants*

Comparez l'emploi du temps réellement planifié aux volumes horaires définis en paramétrage (*Conformité EDT*), et suivez la charge horaire et l'avancement du programme de chaque enseignant (*Charge enseignants*).

### Progression du programme
*Menu : Pédagogie → Programme*

Suivez l'avancement de chaque chapitre par matière et par classe (vue de suivi consolidée disponible dans *Pilotage pédagogique → Suivi des progressions*).

### Calendrier scolaire
*Menu : Pédagogie → Calendrier scolaire*

Planifiez les événements (conseils de classe, vacances, examens, portes ouvertes…). Visible sur l'application mobile des parents et enseignants.

---

## 7. Finances

### Scolarités
*Menu : Finances → Scolarités*

Définissez les montants de scolarité par niveau. Vous pouvez configurer jusqu'à 3 échéances (mensuel, trimestriel, annuel), ou importer les échéances en masse via le modèle Excel (bouton **Import**).

### Enregistrer un paiement de scolarité
*Menu : Caisse → Nouveau paiement*

Sélectionnez l'élève, le montant et le mode de paiement. Un **reçu PDF** est généré automatiquement. L'historique complet, le récapitulatif par niveau et l'échéancier sont disponibles dans les autres écrans du menu **Caisse**.

### Frais annexes
*Menu : Finances → Frais annexes*

Les frais annexes permettent de facturer des charges complémentaires à la scolarité (fournitures, tenue, examens, transport, restauration…).

**Configuration :**
1. Créez un frais annexe en précisant : nom, montant, catégorie, niveau concerné (ou tous les niveaux)
2. Cochez **Obligatoire** si le frais doit apparaître automatiquement dans les impayés

**Suivi des paiements :**
- *Menu : Finances → Frais annexes → Suivi par élève*
- Vue individuelle : total dû, total payé, solde restant
- Enregistrement d'un paiement partiel ou total depuis cette vue
- Reçu PDF généré automatiquement

**Impayés frais annexes :**
- *Menu : Finances → Frais annexes → Impayés*
- Liste de tous les élèves ayant un solde non nul sur des frais obligatoires

### Paiement mobile (CinetPay)
Les parents peuvent payer une échéance de scolarité ou un frais annexe directement depuis l'application mobile via Mobile Money (Orange Money, MTN MoMo, Wave) — bouton **Payer en ligne** sur l'écran Scolarités ou Frais annexes de l'enfant concerné. Le paiement est confirmé automatiquement (webhook CinetPay) et un reçu est disponible dès validation ; une transaction restée sans confirmation est revérifiée automatiquement en arrière-plan.

Le même bouton **Payer en ligne** est aussi disponible côté back-office (fiche paiements de l'élève, écran Frais annexes) pour initier un paiement en ligne au nom d'un parent présent au bureau, en plus de la saisie manuelle habituelle.

### Tableau des impayés scolarité
*Menu : Finances → Impayés*

Vue synthétique de tous les élèves ayant des montants de scolarité en retard, avec possibilité d'export CSV.

### Export comptable
*Menu : Finances → Export comptable*

Générez un aperçu ou un export de tous les encaissements pour votre comptable :

| Export | Format | Contenu |
|---|---|---|
| **Aperçu** | — | Total scolarité, frais annexes, détail par mode de paiement |
| **Excel OHADA** | `.xlsx` | 3 feuilles : journal, récapitulatif par mode, écritures comptables |
| **FEC SAGE** | `.csv` | Format Fichier des Écritures Comptables importable dans SAGE |

Filtres disponibles : période (date début / date fin).

> La relance automatique par email est déclenchée pour les élèves dont les impayés dépassent le seuil configuré.

---

## 8. Communication

### Informations / Annonces
*Menu : Communication → Informations*

Publiez une annonce → tous les parents et enseignants reçoivent une **notification push** instantanément sur leur mobile.

### Messagerie
Communication directe entre :
- Un enseignant et les parents d'un élève
- L'administration et les parents

### Notifications email automatiques
Les parents reçoivent un email automatique dans les situations suivantes :
- **Publication d'un bulletin** : email avec invitation à consulter le bulletin dans l'app
- **Absence signalée** : email le jour même avec détails de la séance
- **Sanction appliquée** : email détaillant le motif et les mesures
- **Relance impayés** : email de rappel lorsqu'un solde est en retard

La configuration SMTP (serveur, identifiants) est définie dans les paramètres de l'établissement.

### Rendez-vous (RDV)
Les enseignants définissent leurs créneaux de disponibilité. Les parents réservent un rendez-vous depuis l'application mobile.

*Menu : Communication → Rendez-vous* pour voir le planning global.

---

## 9. Application mobile

### Télécharger l'application
Partagez ce lien aux parents et enseignants :
```
https://votre-ecole.tondomaine.ci/app
```
Ils cliquent → téléchargent → installent.

> Pour Android : lors de la première installation, le téléphone peut demander d'autoriser les « sources inconnues ». C'est normal — il suffit d'accepter une seule fois.

### Compte parent
Le parent se connecte avec :
- **Identifiant :** son numéro de téléphone
- **Mot de passe :** fourni par l'établissement (modifiable ensuite)

Il peut consulter : notes, bulletins, assiduités, paiements, emploi du temps, messagerie, RDV.

### Compte enseignant
L'enseignant se connecte avec :
- **Identifiant :** son numéro de téléphone
- **Mot de passe :** fourni lors de la création du compte (manuelle) ou généré aléatoirement (import Excel avec accès portail activé)

Il peut : saisir notes et absences (y compris **hors connexion**, avec synchronisation automatique au retour du réseau), voir son emploi du temps, gérer ses RDV, envoyer des messages.

### Sessions multiples
Chaque espace (école, groupe, super-admin, enseignant, parent) gère sa propre session. Un même navigateur peut donc garder plusieurs sessions actives simultanément (par exemple un compte admin école et un compte super-admin dans deux onglets), sans qu'elles ne s'écrasent l'une l'autre.

---

## 10. Tableau de bord & Statistiques

### Tableau de bord
La page d'accueil affiche en temps réel :
- **Nombre d'élèves** par niveau
- **Taux de paiement** de la scolarité
- **Absences** non justifiées récentes
- **Prochains événements** du calendrier scolaire

### Statistiques avancées
*Menu : Statistiques*

Disponibles une fois l'année scolaire bien avancée :

| Rapport | Contenu |
|---|---|
| Synthèse | Vue globale de l'établissement |
| Présences | Taux d'assiduité par classe et par période |
| Moyennes | Évolution des moyennes par niveau |
| Finances | Recettes, taux de recouvrement, projection |
| Évolution | Comparaison entre périodes |
| Classement | Classement des élèves par moyenne |
| Enseignants | Charge horaire et progression du programme |

Tous les rapports sont **exportables en CSV**.

### Rapport statistique Ministère
*Accessible via l'URL `/RapportMinistere` — n'est actuellement plus proposé dans le menu Statistiques (fusionné visuellement avec « Stats générales »), mais la page reste fonctionnelle.*

Génère un document PDF au format réglementaire (A4 paysage) incluant :
- Effectifs par genre et par niveau
- Taux de passage et de redoublement
- Résultats aux examens nationaux
- Statistiques d'assiduité
- Bilan financier de l'année

Ce document peut être remis directement à l'inspection académique.

### Formulaire statistique MENET (14 sections)
*Menu : Statistiques → Stats générales*

Outil de saisie et d'export du **formulaire statistique annuel officiel** demandé par le Ministère :

| Section | Contenu |
|---|---|
| S1 | Groupes pédagogiques et salles (1er cycle) |
| S2 | Effectifs et boursiers (1er cycle) |
| S3 | Langues (1er cycle) |
| S4-S5 | Nationalités (1er et 2nd cycle) |
| S6-S7 | Affectés État (1er et 2nd cycle) |
| S8-S9 | Âges et redoublants (1er cycle) |
| S10-S11 | Âges et redoublants (2nd cycle) |
| S12 | Résultats examens : BEPC, BAC, CEPE |
| S13 | Décisions fin d'année (admis, redoublants, exclus, abandons) |
| S14 | Enfants en situation de handicap et orphelins |

Les données (effectifs, redoublants, passages) sont calculées automatiquement depuis la base. Vous saisissez uniquement les **résultats aux examens nationaux** (BEPC/BAC/CEPE) qui ne sont pas dans le système.

**Exports disponibles :**
- **Excel** : feuille structurée conforme au formulaire MENET
- **PDF** : version imprimable prête à remettre à l'inspection

---

## 11. Imports Excel en masse

Cinq flux permettent d'onboarder rapidement un établissement avec de gros effectifs, plutôt que de tout saisir manuellement. Le principe est le même partout :

1. Depuis la liste concernée, cliquez **Télécharger le modèle** — un fichier Excel pré-formaté s'ouvre, avec en-têtes, exemples et listes déroulantes pour les champs à choix.
2. Remplissez une ligne par élément (supprimez la ligne d'exemple).
3. Cliquez **Importer**, sélectionnez votre fichier rempli.
4. Le résultat indique le nombre de lignes importées avec succès, et la liste des lignes en erreur (avec le numéro de ligne et le motif) — les lignes valides sont importées même si d'autres lignes du même fichier sont en erreur.

| Flux | Menu | Colonnes clés |
|---|---|---|
| Élèves | Élèves → Liste des élèves → Import | Matricule, nom, prénoms, date de naissance (JJ/MM/AAAA), classe, handicap(s) (colonne O/N par type)… |
| Enseignants | Enseignants → Liste des enseignants → Import | Matricule, nom, prénoms, téléphone, statut, **Créer accès portail (O/N)** |
| Affectations classe/matière | Enseignants → Liste des enseignants → Import affectations | Matricule enseignant, abréviation classe, abréviation matière |
| Scolarités | Finances → Scolarités → Import | Libellé échéance, date (JJ/MM/AAAA), montant, niveau |
| Notes | Pédagogie → Devoirs → [un devoir] → Import | Généré automatiquement par devoir (matricule élève + note) |

> Pour les élèves et les enseignants, la ligne d'exemple pré-remplie dans le modèle est automatiquement ignorée si vous oubliez de la supprimer.

---

## 12. Utilisateurs, rôles et journal d'audit

### Gestion des utilisateurs
*Menu : Administration → Utilisateurs*

Créez et gérez les comptes des personnels administratifs (directeur, censeur, secrétaire, comptable…) et leur rôle associé.

### Rôles et permissions
*Menu : Administration → Rôles et permissions*

Chaque rôle définit les modules accessibles (élèves, enseignants, parents, pédagogie, finances, communication…). Voir le tableau des rôles disponibles en section 1. Les menus et routes sont automatiquement masqués pour un utilisateur qui n'a pas la permission correspondante.

### Journal d'audit

*Menu : Administration → Journal d'audit*

L'application enregistre automatiquement toutes les opérations sensibles :
- Modifications de notes
- Enregistrements et suppressions de paiements
- Applications de sanctions
- Modifications de comptes utilisateurs

Chaque entrée indique : **qui** a fait **quoi**, **quand**, et la valeur **avant/après** la modification.

> Ce journal est en **lecture seule** — il ne peut pas être modifié ou supprimé, garantissant son intégrité pour tout audit.

---

## 13. Documentation in-app

Un panneau d'aide est accessible depuis n'importe quelle page en cliquant sur le bouton **?** en bas à droite de l'écran.

- **Aide contextuelle** : les articles affichés sont filtrés automatiquement selon le module en cours
- **Recherche** : tapez un mot-clé pour trouver un article dans toute la documentation
- **Gestion admin** (*Menu : Administration → Documentation*) : créez, modifiez ou désactivez des articles

L'application est livrée avec **27 articles pré-rédigés** couvrant tous les modules.

---

## 14. Questions fréquentes

**Q : Un parent a oublié son mot de passe. Que faire ?**  
R : Dans la fiche du parent (*Menu : Parents → [nom du parent]*), cliquez **Réinitialiser le mot de passe**. Un nouveau mot de passe provisoire est généré.

**Q : Comment passer à l'année scolaire suivante ?**  
R : *Menu : Paramétrage → Archivage fin d'année*. L'assistant vous guide étape par étape : validation des passages de classe, archivage des données.

**Q : Comment importer mes élèves ou enseignants sans tout ressaisir un par un ?**  
R : Utilisez l'import Excel disponible depuis chaque liste (bouton **Import**) — voir section 11. Un modèle pré-formaté est téléchargeable, et les erreurs éventuelles sont signalées ligne par ligne sans bloquer l'import du reste du fichier.

**Q : Les notes d'une période précédente sont-elles accessibles après clôture ?**  
R : Oui. Toutes les données des années archivées restent consultables en lecture seule.

**Q : Un élève a changé de classe en cours d'année. Comment faire ?**  
R : Sur la fiche de l'élève, modifiez la **classe d'affectation**. Les notes déjà saisies sont conservées.

**Q : L'application mobile ne se connecte pas.**  
R : Vérifiez que l'utilisateur a bien téléchargé **l'application de votre établissement**. Vérifiez également que les identifiants (numéro de téléphone + mot de passe) sont corrects.

**Q : Comment exporter toutes les notes pour les transmettre à l'inspection ?**  
R : *Menu : Pédagogie → Devoirs / Notes → Exporter CSV* — sélectionnez la classe et la période souhaitées.

**Q : Un frais annexe apparaît dans les impayés alors que l'élève est exempté. Comment corriger ?**  
R : Les frais annexes marqués **Obligatoire** apparaissent automatiquement pour tous les élèves du niveau concerné. Si un élève est exempté, décochez l'option obligatoire pour ce frais ou enregistrez un paiement à 0 pour solder son compte.

**Q : Le comptable demande un fichier pour SAGE. Quoi lui donner ?**  
R : *Menu : Finances → Export comptable → FEC CSV*. Ce fichier au format FEC (Fichier des Écritures Comptables) s'importe directement dans SAGE et la plupart des logiciels de comptabilité.

**Q : Les parents ne reçoivent pas les emails. Que vérifier ?**  
R : La configuration SMTP est définie par votre prestataire. Vérifiez avec lui que le service d'envoi est actif et que les adresses email des parents sont bien renseignées dans leurs fiches.

---

*Pour toute assistance technique, contactez votre prestataire.*
