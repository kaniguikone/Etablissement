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
11. [Questions fréquentes](#11-questions-fréquentes)

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
| Scolarité | Élèves, inscriptions, classes |
| Pédagogie | Notes, devoirs, emplois du temps, assiduités |
| Finances | Paiements, scolarités, reçus |
| Communication | Informations, messagerie |



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

Enregistrez avertissements, exclusions, etc. Le parent est notifié automatiquement sur son mobile.

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

Renseignez les absences par classe et par séance. Les parents reçoivent une notification automatique à chaque absence enregistrée.

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
- **Envoyé au parent** via notification push (bouton « Notifier »)

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

### Enregistrer un paiement
*Menu : Finances → Paiements → Nouveau paiement*

Sélectionnez l'élève, le montant et le mode de paiement. Un **reçu PDF** est généré automatiquement.

### Paiement mobile (CinetPay)
Les parents peuvent payer depuis l'application mobile via Mobile Money (Orange Money, MTN MoMo, Wave). Le paiement est enregistré automatiquement.

### Tableau des impayés
*Menu : Finances → Impayés*

Vue synthétique de tous les élèves ayant des montants en retard, avec possibilité d'export CSV.

---

## 8. Communication

### Informations / Annonces
*Menu : Communication → Informations*

Publiez une annonce → tous les parents et enseignants reçoivent une **notification push** instantanément sur leur mobile.

### Messagerie
Communication directe entre :
- Un enseignant et les parents d'un élève
- L'administration et les parents

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

---

## 11. Questions fréquentes

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

---

*Pour toute assistance technique, contactez votre prestataire.*
