# Fonctionnalités de l'application de gestion scolaire

## Vue d'ensemble

Application complète de gestion scolaire en architecture multi-tenant, permettant à plusieurs établissements d'opérer de manière totalement isolée sur une même infrastructure. L'application couvre l'ensemble des besoins administratifs, pédagogiques et financiers d'un établissement scolaire.

**Stack technique :**
- **Backend** : API REST Laravel 11 (PHP 8.2), authentification via Laravel Sanctum
- **Frontend web** : SPA React 18 (Vite), interface d'administration
- **Application mobile** : Flutter (Android/iOS), portails enseignant et parent/élève

---

## Portails d'accès

L'application propose quatre portails distincts selon le profil :

| Portail | Interface | Utilisateurs |
|---|---|---|
| **Back-office administrateur** | Web (React) | Personnels administratifs |
| **Portail enseignant** | Web + Mobile | Enseignants |
| **Portail parent** | Mobile | Parents d'élèves |
| **Portail élève** | Mobile | Élèves |

---

## 1. Organisation scolaire

### Niveaux et classes
- Création et gestion des niveaux scolaires (6ème, 5ème, Terminale, etc.)
- Gestion des classes par niveau avec affectation des enseignants
- Support des **séries** (générale, technologique, etc.) et **groupes alternatifs** (sciences, langues)
- Auto-génération des noms et abréviations de classe

### Matières
- Catalogue de matières par niveau et par classe
- Définition des **coefficients** par matière
- Gestion des **chapitres** et du programme détaillé par matière
- Configuration avancée : matières différentes par groupe au sein d'une même classe

### Salles
- Référentiel des salles de classe
- Prise en compte lors de la création des emplois du temps pour éviter les conflits

### Périodes scolaires
- Création des périodes (trimestres, semestres)
- Association aux années scolaires avec dates de début et de fin

### Calendrier scolaire
- Gestion des événements (vacances, jours fériés, journées pédagogiques)
- Visible dans tous les portails

---

## 2. Emploi du temps

- Création et modification des emplois du temps par classe
- **Détection automatique des chevauchements** (salle, enseignant, classe)
- Suivi des volumes horaires par matière et par enseignant
- Vérification de conformité entre l'EDT réel et les volumes horaires définis
- **Export PDF** des emplois du temps
- Consultation dans les portails enseignant, parent et élève

---

## 3. Pédagogie

### Devoirs et notes
- Gestion des **types de devoirs** configurables (DS, interrogation, examen, devoir maison, etc.)
- Création de devoirs par classe, matière et période
- Saisie des notes devoir par devoir
- **Import de notes en masse** via modèles Excel
- Calcul automatique des moyennes par matière et de la moyenne générale

### Bulletins scolaires
- **Génération de bulletins PDF** individuels (par élève et par période)
- **Génération PDF en masse** pour une classe entière en une seule opération
- Classement des élèves avec attribution des rangs
- Notification automatique aux parents à la publication des bulletins
- Téléchargement des bulletins depuis le portail parent

### Assiduité et présences
- Feuille de présence numérique par classe et par cours
- Enregistrement des absences et retards avec durées calculées automatiquement
- Récapitulatif des absences par élève et par période
- Consultation des assiduités depuis le portail parent

### Programme et progression pédagogique
- Découpage du programme par chapitres pour chaque matière
- Déclaration de l'avancement par les enseignants (chapitre en cours, terminé, etc.)
- Suivi global de la progression par matière et par classe

### Attestations de scolarité
- **Génération de PDF** d'attestation de scolarité pour chaque élève
- Accessible depuis le back-office et le portail parent

---

## 4. Gestion des élèves

- CRUD complet avec photo de profil
- Association à une classe, un niveau et un ou plusieurs parents
- Gestion des **sanctions disciplinaires** avec notification aux parents
- **Export CSV** de la liste des élèves
- **Formulaire d'inscription en ligne** public avec suivi du dossier par token
- Validation ou rejet des demandes d'inscription depuis le back-office
- Module d'**archivage de fin d'année** :
  - Passage automatisé des élèves dans la classe supérieure
  - Création de la nouvelle année scolaire
  - Rollback possible en cas d'erreur

---

## 5. Gestion des enseignants

- CRUD complet avec photo de profil
- **Import en masse** via modèles Excel (enseignants + affectations classes/matières)
- Affectations multiples : un enseignant peut enseigner plusieurs matières dans plusieurs classes
- Gestion des **remplacements** avec notification au remplaçant

### Portail enseignant (web et mobile)
- Tableau de bord personnel (classes, devoirs à venir, absences récentes)
- Saisie des présences et des notes directement depuis le mobile
- Import de notes via modèle Excel
- Consultation et suivi du programme
- Gestion des créneaux de rendez-vous parents-professeurs
- Messagerie avec les parents
- Consultation des informations de l'établissement et des notifications

---

## 6. Gestion des parents

- CRUD complet avec association aux élèves
- **Import en masse** via modèles Excel
- **Inscription autonome depuis l'app mobile** : le parent saisit le matricule de son enfant, vérifie ses informations, crée son compte — sans intervention préalable de l'établissement
- Validation des demandes d'accès par l'admin (2 modes : paiement autonome CinetPay ou collecte par l'école)
- Limite : 2 parents maximum par élève

### Portail parent (mobile)
- Vue consolidée de tous ses enfants
- Consultation des bulletins par période avec **téléchargement PDF**
- Suivi des assiduités par enfant
- Consultation de l'emploi du temps
- Historique des paiements avec **téléchargement des reçus PDF**
- **Paiement en ligne** via CinetPay
- Messagerie avec les enseignants
- Réservation de créneaux de rendez-vous avec les enseignants
- Notifications push (bulletins, devoirs, sanctions, messages)

---

## 7. Finances

### Scolarités
- Paramétrage des montants de scolarité par niveau
- Import en masse via modèles Excel

### Paiements de scolarité
- Enregistrement des paiements par élève
- **Génération de reçus PDF** pour chaque paiement
- Tableau de bord des **impayés** (élèves n'ayant pas réglé)
- Échéancier de paiement
- Récapitulatif financier par niveau
- **Export CSV** des listes de paiements

### Frais annexes
- Configuration de frais complémentaires par niveau et par catégorie (fournitures, transport, tenue, examen, restauration, autre)
- Frais obligatoires ou optionnels, déclenchés automatiquement pour les élèves concernés
- Suivi individuel des paiements : total dû, total payé, solde
- Tableau des **impayés frais annexes** (élèves avec solde non nul)
- **Génération de reçus PDF** pour chaque paiement de frais annexe
- Modes de paiement multiples (espèces, chèque, virement, Mobile Money)

### Export comptable OHADA
- **Aperçu financier JSON** : total scolarités, total frais annexes, détail par mode de paiement
- Filtres par période (date_debut / date_fin)
- **Export Excel** (3 feuilles) : journal des encaissements, récapitulatif par mode, écritures comptables format OHADA (plan comptable 706/521/571/512)
- **Export FEC CSV** compatible SAGE pour import direct en comptabilité
- Tous les exports respectent la nomenclature comptable UEMOA

### Paiement en ligne
- Intégration **CinetPay** pour le paiement depuis le portail parent
- Webhook de notification et vérification du statut des transactions

### Statistiques financières
- Synthèse financière globale
- Évolution des encaissements dans le temps
- Analyse par niveau

---

## 8. Communication

### Messagerie interne
- Conversations entre enseignants et parents, centrées sur un élève
- Fil de discussion avec marquage des messages lus/non lus
- Accessible depuis le back-office, le portail enseignant et le portail parent

### Informations et annonces
- Publication d'informations par l'administration
- Visibles dans tous les portails

### Notifications in-app
- Système de notifications in-app (toutes les interfaces)
- **Notifications push mobiles** via Firebase Cloud Messaging (FCM)
- Déclenchements automatiques :
  - Publication de bulletin
  - Création d'un devoir
  - Application d'une sanction
  - Confirmation d'un rendez-vous
  - Affectation d'un remplacement
  - Réception d'un message

### Notifications email
- Envoi automatique d'emails via SMTP configurable par établissement
- File d'attente (Laravel Queue) pour ne pas bloquer les requêtes
- **4 déclencheurs** :
  - Publication d'un bulletin scolaire
  - Signalement d'une absence
  - Application d'une sanction
  - Relance pour impayés de scolarité

### Rendez-vous parents-professeurs
- Les enseignants définissent leurs créneaux de disponibilité
- Les parents réservent directement depuis leur portail
- Confirmation ou annulation par chaque partie
- Notifications à chaque étape

---

## 9. Statistiques et pilotage

- **Tableau de bord général** : effectifs, enseignants, paiements du jour
- **Synthèse assiduités** : taux de présence par classe et par période
- **Synthèse des moyennes** : performances par classe et par niveau
- **Bilan financier** : encaissements, impayés, évolution mensuelle
- **Classement des élèves** par période et par classe
- **Activité des enseignants** : heures enseignées, devoirs créés
- **Export CSV des moyennes** par niveau et par période
- **Rapport statistique annuel Ministère PDF** : document A4 paysage généré automatiquement, incluant effectifs par genre/niveau, taux de passage, résultats aux examens, statistiques d'assiduité, bilan financier — format conforme aux exigences du Ministère de l'Éducation
- **Formulaire statistique MENET (14 sections)** : saisie et export du formulaire officiel annuel — groupes pédagogiques, effectifs, langues, nationalités, âges et redoublants par cycle, résultats aux examens nationaux (BEPC, BAC, CEPE), décisions de fin d'année (admis, redoublants, exclus, abandons), élèves en situation de handicap et orphelins — **export Excel** et **PDF**

---

## 10. Journal d'audit et traçabilité

- Toutes les opérations sensibles sont enregistrées automatiquement (notes, paiements, sanctions, modifications de compte)
- Chaque entrée contient : utilisateur, action, entité modifiée, valeur avant/après, horodatage
- Interface d'administration en **lecture seule** (non modifiable)
- Filtres par utilisateur, par type d'action et par date
- Permet l'investigation en cas de contestation ou d'erreur

---

## 11. Documentation in-app

- Panneau d'aide contextuel accessible depuis chaque module via le bouton **?**
- Articles classés par **module** (élèves, finances, bulletins, etc.) et **catégorie** (guide, astuce, FAQ, vidéo)
- **Recherche plein texte** dans les titres et contenus des articles
- Tri par ordre personnalisable
- Gestion admin complète (CRUD articles, activation/désactivation)
- **26 articles pré-rédigés** couvrant tous les modules livrés avec l'application

---

## 12. Imports / Exports récapitulatif

| Données | Import | Export |
|---|---|---|
| Élèves | — | CSV |
| Enseignants | Excel | — |
| Affectations | Excel | — |
| Scolarités | Excel | — |
| Notes | Excel | CSV |
| Moyennes | — | CSV |
| Paiements scolarité | — | CSV |
| Paiements frais annexes | — | CSV |
| Bulletins | — | PDF (individuel ou classe) |
| Attestations | — | PDF |
| Reçus de paiement | — | PDF |
| Export comptable OHADA | — | Excel (3 feuilles) |
| Export FEC SAGE | — | CSV |
| Rapport Ministère | — | PDF |
| Formulaire MENET (14 sections) | — | Excel + PDF |

---

## 13. Architecture multi-tenant et administration centrale

### Gestion multi-établissements (groupe scolaire)
- Dashboard consolidé : effectifs, finances et activité de chaque école
- Consultation des données de chaque établissement du groupe
- Système de **templates de données** pour initialiser rapidement un nouvel établissement (niveaux, matières, types de devoirs préconfigurés)

### Super-administration
- Création et gestion des établissements (tenants)
- Activation / désactivation d'un établissement
- Gestion des versions de l'application mobile (versionning, URL de téléchargement, mise à jour forcée)

### Module SaaS billing
- Gestion des **abonnements** par établissement (plans demo, basic, pro, premium)
- **Génération automatique de factures PDF** à chaque renouvellement
- Dashboard super-admin : revenus par plan, statut des abonnements, historique des paiements
- Base de données centrale séparée des données pédagogiques des tenants

---

## 14. Sécurité et contrôle d'accès

- Authentification par token via **Laravel Sanctum**
- Portails distincts avec tokens séparés (admin web, enseignant mobile, parent mobile)
- **Système de rôles et permissions** granulaire :

| Permission | Périmètre |
|---|---|
| `parametrage` | Niveaux, classes, matières, périodes, types de devoirs |
| `inscriptions` | Demandes et validation des inscriptions |
| `eleves` | Gestion des élèves et attestations |
| `enseignants` | Gestion des enseignants et affectations |
| `parents` | Gestion des parents |
| `pedagogie_saisie` | Saisie des assiduités, devoirs, emploi du temps, remplacements |
| `pedagogie_pilotage` | Bulletins, conseil de classe, suivi de conformité du programme |
| `finances_caisse` | Enregistrement des paiements (scolarité et frais annexes) |
| `finances_gestion` | Configuration des scolarités, impayés, échéancier, export comptable |
| `communication` | Informations, messagerie, rendez-vous |
| `utilisateurs` | Gestion des comptes utilisateurs et des rôles |

- Masquage automatique des menus et routes selon les permissions de l'utilisateur connecté
- Isolation complète des données entre établissements (multi-tenant)
- **Journal d'audit** : toutes les actions sensibles sont tracées et non modifiables
