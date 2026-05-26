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
11. [Journal d'audit](#11-journal-daudit)
12. [Documentation in-app](#12-documentation-in-app)
13. [Questions fréquentes](#13-questions-fréquentes)

---

## 1. Premiers pas

### Accès au back-office
Ouvrez votre navigateur et accédez à l'adresse fournie par votre prestataire :
```
https://votre-ecole.tondomaine.ci
```
Connectez-vous avec les identifiants communiqués lors de l'installation.

### Ordre de configuration recommandé
Respectez cet ordre lors de la mise en place initiale :
1. **Paramétrer l'établissement** (nom, logo, coordonnées)
2. **Créer l'année scolaire** et ses périodes
3. **Créer les niveaux** (ex : 6ème, 5ème, Terminale…)
4. **Créer les classes** et les rattacher aux niveaux
5. **Créer les matières** et les types de devoirs
6. **Ajouter les enseignants** et les affecter aux classes
7. **Ajouter les élèves**
8. **Rattacher les parents** aux élèves
9. **Distribuer l'application mobile**

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
*Menu : Paramètres → Établissement*

Renseignez :
- Nom officiel de l'établissement
- Logo (format PNG ou JPG, recommandé : 512×512 px)
- Adresse, téléphone, email
- Directeur / Responsable

Ces informations apparaissent sur les bulletins et attestations PDF.

### Années scolaires
*Menu : Paramètres → Années scolaires*

Créez l'année scolaire en cours (ex : **2024-2025**) et définissez les périodes (trimestres ou semestres).

> **Important :** Avant de saisir des notes ou des absences, une année scolaire et ses périodes doivent être créées et actives.

### Niveaux et classes
Créez d'abord les niveaux (6ème, 5ème, 2nde…) puis les classes rattachées à chaque niveau (6ème A, 6ème B…).

### Types de devoirs
Configurez vos types d'évaluations : Devoir Surveillé, Interrogation, Examen, etc., avec leur coefficient.

### Salles
Ajoutez les salles de classe pour la gestion des emplois du temps et éviter les conflits de planning.

### Passage de classe (fin d'année)
*Menu : Paramètres → Années scolaires → Initier la clôture*

L'assistant vous guide étape par étape : validation des passages de classe, archivage des données de l'année.

---

## 3. Gestion des enseignants

### Ajouter un enseignant
*Menu : Enseignants → Nouvel enseignant*

Un **compte mobile** est automatiquement créé. Le mot de passe provisoire est affiché une seule fois — communiquez-le à l'enseignant.

### Affecter un enseignant à une matière / classe
Sur la fiche de l'enseignant → onglet **Affectations** → sélectionnez la classe et la matière.

Un enseignant peut enseigner plusieurs matières dans plusieurs classes.

### Remplacements
*Menu : Pédagogie → Remplacements*

Planifiez un remplacement en indiquant l'enseignant absent, le remplaçant, la date et la classe concernée. L'enseignant remplaçant est notifié sur son application mobile.

---

## 4. Gestion des élèves

### Ajouter un élève
*Menu : Élèves → Nouvel élève*

Champs obligatoires :
- Nom, prénoms, date de naissance
- Classe d'affectation
- Matricule (généré automatiquement si laissé vide)

Champs optionnels :
- Photo
- Parent (peut être rattaché à un parent existant ou créé à la volée)

### Inscription en ligne
Les parents peuvent soumettre une demande d'inscription depuis l'application mobile. Vous recevez une notification et pouvez **valider** ou **rejeter** depuis :
*Menu : Inscriptions → Demandes en attente*

### Sanctions et comportement
*Menu : Élèves → Sanctions*

Enregistrez avertissements, exclusions, etc. Le parent est notifié automatiquement sur son mobile et par email.

### Exporter la liste des élèves
Bouton **Exporter CSV** en haut de la liste. Le fichier s'ouvre dans Excel.

### Attestation de scolarité
Sur la fiche d'un élève → bouton **Attestation PDF**. Le document est généré instantanément.

---

## 5. Gestion des parents

### Ajouter un parent
*Menu : Parents → Nouveau parent*

Un **compte mobile** est créé automatiquement. Communiquez le numéro de téléphone et le mot de passe provisoire au parent.

### Rattacher un élève à un parent
Sur la fiche de l'élève → champ **Parent** → sélectionnez dans la liste.

Un parent peut avoir plusieurs enfants dans l'établissement.

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
*Menu : Pédagogie → Devoirs*

1. Créez un devoir (type, classe, matière, date, coefficient)
2. Cliquez sur le devoir → **Saisir les notes**
3. Entrez les notes pour chaque élève
4. Cliquez **Enregistrer**

### Bulletins
*Menu : Pédagogie → Bulletins*

Sélectionnez un élève et une période → **Voir le bulletin**. Le bulletin PDF peut être :
- Téléchargé directement
- **Envoyé au parent** via notification push + email (bouton « Notifier »)

### Progression du programme
Suivez l'avancement de chaque chapitre par matière et par classe.

### Calendrier scolaire
*Menu : Communication → Calendrier*

Planifiez les événements (conseils de classe, vacances, examens, portes ouvertes…). Visible sur l'application mobile des parents et enseignants.

---

## 7. Finances

### Scolarités
*Menu : Finances → Scolarités*

Définissez les montants de scolarité par niveau. Vous pouvez configurer jusqu'à 3 échéances (mensuel, trimestriel, annuel).

### Enregistrer un paiement de scolarité
*Menu : Finances → Paiements → Nouveau paiement*

Sélectionnez l'élève, le montant et le mode de paiement. Un **reçu PDF** est généré automatiquement.

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
Les parents peuvent payer depuis l'application mobile via Mobile Money (Orange Money, MTN MoMo, Wave). Le paiement est enregistré automatiquement.

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
- **Mot de passe :** fourni lors de la création du compte

Il peut : saisir notes et absences, voir son emploi du temps, gérer ses RDV, envoyer des messages.

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
*Menu : Statistiques → Rapport Ministère*

Génère un document PDF au format réglementaire (A4 paysage) incluant :
- Effectifs par genre et par niveau
- Taux de passage et de redoublement
- Résultats aux examens nationaux
- Statistiques d'assiduité
- Bilan financier de l'année

Ce document peut être remis directement à l'inspection académique.

---

## 11. Journal d'audit

*Menu : Administration → Journal d'audit*

L'application enregistre automatiquement toutes les opérations sensibles :
- Modifications de notes
- Enregistrements et suppressions de paiements
- Applications de sanctions
- Modifications de comptes utilisateurs

Chaque entrée indique : **qui** a fait **quoi**, **quand**, et la valeur **avant/après** la modification.

> Ce journal est en **lecture seule** — il ne peut pas être modifié ou supprimé, garantissant son intégrité pour tout audit.

---

## 12. Documentation in-app

Un panneau d'aide est accessible depuis n'importe quelle page en cliquant sur le bouton **?** en bas à droite de l'écran.

- **Aide contextuelle** : les articles affichés sont filtrés automatiquement selon le module en cours
- **Recherche** : tapez un mot-clé pour trouver un article dans toute la documentation
- **Gestion admin** (*Menu : Administration → Documentation*) : créez, modifiez ou désactivez des articles

L'application est livrée avec **26 articles pré-rédigés** couvrant tous les modules.

---

## 13. Questions fréquentes

**Q : Un parent a oublié son mot de passe. Que faire ?**  
R : Dans la fiche du parent (*Menu : Parents → [nom du parent]*), cliquez **Réinitialiser le mot de passe**. Un nouveau mot de passe provisoire est généré.

**Q : Comment passer à l'année scolaire suivante ?**  
R : *Menu : Paramètres → Années scolaires → Initier la clôture*. L'assistant vous guide étape par étape : validation des passages de classe, archivage des données.

**Q : Les notes d'une période précédente sont-elles accessibles après clôture ?**  
R : Oui. Toutes les données des années archivées restent consultables en lecture seule.

**Q : Un élève a changé de classe en cours d'année. Comment faire ?**  
R : Sur la fiche de l'élève, modifiez la **classe d'affectation**. Les notes déjà saisies sont conservées.

**Q : L'application mobile ne se connecte pas.**  
R : Vérifiez que l'utilisateur a bien téléchargé **l'application de votre établissement**. Vérifiez également que les identifiants (numéro de téléphone + mot de passe) sont corrects.

**Q : Comment exporter toutes les notes pour les transmettre à l'inspection ?**  
R : *Menu : Pédagogie → Notes → Exporter CSV* — sélectionnez la période souhaitée.

**Q : Un frais annexe apparaît dans les impayés alors que l'élève est exempté. Comment corriger ?**  
R : Les frais annexes marqués **Obligatoire** apparaissent automatiquement pour tous les élèves du niveau concerné. Si un élève est exempté, décochez l'option obligatoire pour ce frais ou enregistrez un paiement à 0 pour solder son compte.

**Q : Le comptable demande un fichier pour SAGE. Quoi lui donner ?**  
R : *Menu : Finances → Export comptable → FEC CSV*. Ce fichier au format FEC (Fichier des Écritures Comptables) s'importe directement dans SAGE et la plupart des logiciels de comptabilité.

**Q : Les parents ne reçoivent pas les emails. Que vérifier ?**  
R : La configuration SMTP est définie par votre prestataire. Vérifiez avec lui que le service d'envoi est actif et que les adresses email des parents sont bien renseignées dans leurs fiches.

---

*Pour toute assistance technique, contactez votre prestataire.*
