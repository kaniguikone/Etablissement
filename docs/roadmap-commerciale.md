# Roadmap commerciale — Application de gestion scolaire

> Document de référence — Mis à jour le 2026-08-30
> Synthèse de l'analyse experte (2026-04-30) et de l'état réel du code

---

## État des lieux

### Ce qui est livré et opérationnel ✅

| Fonctionnalité                                                      | Note                                                                              |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Gestion élèves, enseignants, classes, niveaux, matières             | Complet                                                                           |
| Notes, devoirs, bulletins PDF avec appréciations enseignants        | Complet incl. commentaires par matière + appréciation prof principal              |
| Relevé de notes annuel PDF                                          | Complet                                                                           |
| Décisions du conseil de classe (Admis, Redoublement, etc.)          | Complet                                                                           |
| Assiduités, paiements de scolarité, reçus PDF                       | Complet                                                                           |
| Tableau des impayés + export CSV                                    | Complet                                                                           |
| Échéancier de paiement (tranches)                                   | Complet                                                                           |
| Archivage fin d'année + rollback                                    | Complet                                                                           |
| Emploi du temps avec détection des conflits                         | Complet                                                                           |
| Gestion des salles                                                  | Complet                                                                           |
| Calendrier scolaire (vacances, événements)                          | Complet                                                                           |
| Sanctions / comportement élèves                                     | Complet                                                                           |
| Notifications in-app (cloche + badge, 6 déclencheurs)               | Complet                                                                           |
| Notifications push mobile FCM (Android)                             | Complet                                                                           |
| **Notifications email (bulletin, absence, sanction, relance)**      | **Complet** — Mailables + Queue, SMTP configurable                                |
| **Journal d'audit**                                                 | **Complet** — trait `Auditable`, interface admin lecture seule                    |
| **Rapport statistique annuel Ministère PDF**                        | **Complet** — 6 sections, A4 paysage, DomPDF                                      |
| **Statistiques générales MENET (formulaire officiel)**              | **Complet** — 14 sections (effectifs, langues, nationalités, âges, résultats examens BEPC/BAC/CEPE), exports Excel + PDF |
| **Inscription parent autonome depuis l'app mobile**                 | **Complet** — flow 3 étapes via matricule élève, validation admin, slots/abonnements |
| **Frais annexes** (tenues, manuels, examens, transport…)            | **Complet** — config par niveau, suivi paiements, impayés, reçus PDF              |
| **Paiement mobile en ligne (CinetPay)**                              | **Complet** — scolarité et frais annexes, portail parent et back-office, webhook + réconciliation automatique |
| **Export comptable structuré**                                      | **Complet** — Excel 3 feuilles (OHADA) + FEC/CSV SAGE                             |
| **Module SaaS billing**                                             | **Complet** — dashboard super-admin, abonnements, factures PDF                    |
| **Modules activables par établissement/groupe**                     | **Complet** — backoffice opérateur, catalogue calqué sur le menu, résolution en cascade établissement > groupe > défaut, appliqué au menu et à l'API |
| **Documentation in-app et aide contextuelle**                       | **Complet** — panneau "?" contextuel, gestion BDD, 27 articles pré-rédigés        |
| Statistiques avancées (KPIs, classements, évolution inter-périodes) | Complet                                                                           |
| Gestion des remplacements d'enseignants                             | Complet                                                                           |
| Progression du programme par matière/classe                         | Complet                                                                           |
| Messagerie parents ↔ enseignants                                    | Complet                                                                           |
| Réunions parents-profs (prise de RDV)                               | Complet                                                                           |
| Photos élèves                                                       | Complet                                                                           |
| Export CSV (élèves, notes, paiements)                               | Complet                                                                           |
| Réinitialisation de mot de passe autonome                           | Complet                                                                           |
| Architecture multi-tenant isolée                                    | Complet                                                                           |
| Portail enseignant mobile (Flutter/Android)                         | Complet                                                                           |
| Portail parent mobile (Flutter/Android)                             | Complet                                                                           |
| Templates de démarrage rapide (lycée, collège, primaire)            | Complet (4 templates JSON)                                                        |
| Instance démo (code + commande `php artisan demo:creer`)            | Code complet — déploiement public manquant                                        |
| **Page d'accueil publique** (landing)                                | **Complet** — formulaire de demande d'accès, tarifs publics, badge démo 30 jours  |
| **Demandes d'accès & tarification** (super-admin)                   | **Complet** — traitement des demandes entrantes, tranches tarifaires indicatives, simulateur |
| **Compte central unifié parent/enseignant**                         | **Complet** — identité unique par téléphone, accès à plusieurs établissements sans recréer de compte |
| **Mot de passe initial obligatoire** (1ère connexion)                | **Complet** — changement forcé avant tout accès                                   |
| **Isolation des sessions par espace** (école/groupe/superadmin/enseignant) | **Complet** — sessions simultanées dans le même navigateur + middleware anti-confusion de tokens |
| **Import Excel en masse** (élèves, enseignants, affectations, scolarités, notes) | **Complet** — 5 flux avec gestion d'erreurs ligne par ligne                |
| **Type d'établissement obligatoire**                                 | **Complet** — condition la génération du bulletin/relevé et le pré-remplissage pédagogique |
| Mode hors-ligne mobile (présences **et notes**)                     | Complet (sync auto)                                                               |
| **122 tests automatisés**                                           | **Complet** — couverture frais annexes, export, documentation, stats MENET, portail parent, imports Excel, paiement mobile CinetPay |

---

## Ce qui reste à faire — Plan priorisé

---

### PHASE 0 — Débloquants commerciaux immédiats
> **Objectif :** Pouvoir présenter et vendre le produit à distance, à n'importe quel directeur, dès maintenant.

---

#### 0.1 — Déploiement public de l'instance démo
**Priorité :** ★★★★★ | **Effort :** ~0,5 jour restant | **Criticité :** Bloquant vente

Le code de démo est complet (`DemoSeeder.php`, `CreerDemo.php`, 4 templates), et la **page d'accueil publique existe déjà** (`front/src/components/landing/LandingPage.jsx`, route `/`) avec formulaire de demande d'accès, tarifs publics et badge « accès démo gratuit 30 jours ». Ce qui reste : le déploiement infrastructure (VPS + DNS wildcard) — non vérifiable depuis le dépôt de code.

**Ce qu'il reste à faire :**
- Déployer sur un VPS avec `demo.votreapp.ci` (wildcard DNS `*.demo.votreapp.ci`)
- Lancer `php artisan demo:creer` pour créer `lycee.demo.votreapp.ci` prépeuplé
- Vérifier que la landing page pointe vers la bonne instance de démo une fois en ligne

**Impact :** Un directeur peut tester seul depuis son bureau, à n'importe quelle heure. C'est l'argument de vente numéro un.

---

### PHASE 1 — Complétude métier
> **Objectif :** Couvrir les besoins que les établissements découvrent en post-déploiement (mois 1-3).

---

#### 1.2 — Gestion santé élève ✅ Livré (2026-08-16)
**Priorité :** ★★★☆☆ | **Effort :** ~1 jour | **Criticité :** Systématiquement demandé

Demandé par les infirmières scolaires et les directeurs prudents dès la démonstration.

**Champs disponibles sur la fiche santé :**
- Groupe sanguin
- Allergies connues (champ texte libre)
- Médecin traitant (nom + téléphone)
- Contact urgence distinct des parents (nom, lien de parenté, téléphone)
- Assurance scolaire (compagnie + numéro de police)

**Implémentation livrée :** table `sante_eleves` dédiée (1-1 avec `eleves`, `SanteEleveController`), nouvelle page `/SanteEleve/:id` accessible depuis un bouton sur la fiche élève. Accès gated par une nouvelle permission `sante` (accordée par défaut à `super_admin`/`directeur` ; à activer manuellement pour un rôle "infirmier" si l'établissement le crée, via l'écran de gestion des rôles existant). Aucune modification du module élève existant (table `eleves`, contrôleur, routes CRUD) — implémentation entièrement additive.

---

#### 1.3 — Authentification 2FA pour admin et comptable
**Priorité :** ★★★☆☆ | **Effort :** ~2 jours | **Criticité :** Attendu sur les données financières

Pour les comptes ayant accès aux paiements, aux notes et aux données sensibles.

**Implémentation :** TOTP (Google Authenticator / Authy) via `pragmarx/google2fa-laravel`. Activation optionnelle par rôle, QR code à scanner, code de secours à conserver. Pas obligatoire pour les enseignants.

---

### PHASE 2 — Croissance et différenciation
> **Objectif :** Élargir le marché adressable et fidéliser les établissements déjà clients.

---

#### 2.1 — Portail élève dans l'app mobile (rôle distinct)
**Priorité :** ★★★☆☆ | **Effort :** ~3 jours | **Criticité :** Pertinent lycée/collège

Le portail parent est sur mobile, c'est cohérent. Un rôle "Élève" dans la même app permettrait aux lycéens d'accéder à leurs données sans passer par leurs parents.

**Vue élève (lecture seule) :**
- Mes notes par matière et par période
- Mon emploi du temps personnel
- Mes devoirs à venir
- Mes absences
- Mes bulletins (une fois publiés)

**Ce qu'il ne voit pas :** données financières, informations des autres élèves.

**Implémentation :** Nouveau rôle `eleve` dans l'API Sanctum, écrans dédiés dans Flutter (réutilisant les composants existants), login avec identifiants fournis par l'admin.

---

#### 2.4 — Notifications SMS
**Priorité :** ★★☆☆☆ | **Effort :** ~2 jours | **Criticité :** Parents sans smartphone

À mettre en place après les emails (même logique, provider différent).

**Providers adaptés au marché UEMOA :** OrangeSMS CI, Infobip, Vonage, AfricasTalking (recommandé : API simple, couvre toute l'Afrique de l'Ouest, prix compétitifs).

**Déclencheurs SMS (subset des emails) :** absence signalée, sanction, bulletin publié.

---

### PHASE 3 — Maturité produit
> **Objectif :** Passer de "outil qui fonctionne" à "produit SaaS professionnel".

---

#### 3.1 — Bibliothèque de ressources pédagogiques
**Priorité :** ★★☆☆☆ | **Effort :** ~4-5 jours

Upload de documents par les enseignants (fiches de cours, exercices, annales). Organisé par classe et matière. Accessible aux élèves (et parents) depuis l'app mobile.

---

#### 3.3 — Application iOS
**Priorité :** ★★☆☆☆ | **Effort :** ~3-5 jours (Flutter facilite l'extension)

Flutter permet de compiler pour iOS avec peu d'effort supplémentaire. Ce qui prend du temps : le certificat Apple Developer (99$/an), la configuration Xcode, les tests sur simulateur/device, la soumission App Store (délai de revue : 1-3 jours).

**Stratégie recommandée :** Compiler en TestFlight d'abord (distribution bêta sans App Store), puis soumettre quand la base d'utilisateurs iOS est identifiée.

---

#### 3.4 — RGPD / politique de protection des données ✅ Livré (2026-08-16)
**Priorité :** ★★☆☆☆ | **Effort :** ~2 jours (réévalué en cours de route, périmètre plus large que prévu) | **Criticité :** Partenaires internationaux

Les données d'enfants mineurs sont ultra-sensibles. Même si la réglementation ivoirienne est moins mature que le RGPD européen, les établissements avec des partenaires ONG ou internationaux le demanderont.

**Livré :**
- Politique de confidentialité publique : `/politique-confidentialite`, liée depuis le footer public
- Durée de rétention configurable par le super-admin (écran `/superadmin/rgpd`), affichée dynamiquement sur la page publique
- Droit à l'effacement — deux mécanismes :
  - Suppression d'établissement renforcée (confirmation par saisie du code + trace conservée dans la DB centrale avant suppression)
  - Anonymisation ciblée d'un élève ou d'un parent (recherche + action depuis l'écran RGPD super-admin) — anonymise plutôt que supprime physiquement, pour préserver l'intégrité des notes/paiements déjà liés
- Chiffrement au repos (cast Eloquent `encrypted`) : fiche santé élève (tous champs), téléphone `User`, `Etablissement`, `DemandeAcces`

**Limites connues, documentées volontairement plutôt que livrées à moitié :**
- `numero_parent` et `telephone_enseignant` restent en clair : ce sont des identifiants de connexion (recherche exacte + `UNIQUE`), les chiffrer casserait l'authentification sans un chantier séparé (index de recherche dédié)
- L'anonymisation d'un parent ne touche que sa fiche locale au tenant ; le profil `CentralUser` (identité cross-établissements) n'est pas déprovisionné — limite acceptée pour rester dans un périmètre raisonnable

---

## Récapitulatif général

| Phase | #   | Fonctionnalité                                             | Effort | Priorité | Statut    |
| ----- | --- | ---------------------------------------------------------- | ------ | -------- | --------- |
| **0** | 0.1 | Déploiement instance démo publique (landing déjà livrée, reste l'infra) | ~0,5 j | ★★★★★    | 🟡 Partiel |
| **0** | 0.2 | Notifications email (bulletin, absence, sanction, relance) | ~2 j   | ★★★★★    | ✅ Livré   |
| **0** | 0.3 | Journal d'audit (notes, paiements, sanctions)              | ~2 j   | ★★★★☆    | ✅ Livré   |
| **1** | 1.1 | Rapport statistique Ministère PDF                          | ~3-4 j | ★★★★★    | ✅ Livré   |
| **1** | 1.1b | Statistiques générales MENET (formulaire 14 sections)     | ~2 j   | ★★★★★    | ✅ Livré   |
| **1** | 1.1c | Inscription parent autonome (flow matricule + validation)  | ~2 j   | ★★★★☆    | ✅ Livré   |
| **1** | 1.2 | Gestion santé élève                                        | ~1 j   | ★★★☆☆    | ✅ Livré   |
| **1** | 1.3 | Authentification 2FA admin/comptable                       | ~2 j   | ★★★☆☆    | ⬜ À faire |
| **1** | 1.4 | Monitoring infrastructure (Sentry + UptimeRobot)           | ~1 j   | ★★★★☆    | 🟡 Partiel |
| **2** | 2.1 | Portail élève dans l'app mobile (rôle distinct)            | ~3 j   | ★★★☆☆    | ⬜ À faire |
| **2** | 2.2 | Frais annexes (fournitures, tenues, examens)               | ~3-4 j | ★★★☆☆    | ✅ Livré   |
| **2** | 2.3 | Export comptable structuré (SAGE/Excel + FEC)              | ~2 j   | ★★☆☆☆    | ✅ Livré   |
| **2** | 2.4 | Notifications SMS (AfricasTalking)                         | ~2 j   | ★★☆☆☆    | ⬜ À faire |
| **3** | 3.1 | Bibliothèque de ressources pédagogiques                    | ~4-5 j | ★★☆☆☆    | ⬜ À faire |
| **3** | 3.2 | Module SaaS billing (abonnements tenants)                  | ~5-7 j | ★★★☆☆    | ✅ Livré   |
| **3** | 3.3 | Application iOS (App Store)                                | ~3-5 j | ★★☆☆☆    | ⬜ À faire |
| **3** | 3.4 | RGPD / politique de données                                | ~2 j   | ★★☆☆☆    | ✅ Livré   |
| **3** | 3.5 | Documentation in-app et aide contextuelle                  | ~3 j   | ★★☆☆☆    | ✅ Livré   |

**Livré :** 11 fonctionnalités sur 17 (hors démo et monitoring, désormais partiels plutôt qu'à faire) — **Restant :** ~14-20 jours de développement

*Hors ce tableau de priorités initial, plusieurs chantiers non prévus à l'origine ont également été livrés depuis : page d'accueil publique, gestion des demandes d'accès et de la tarification, compte central unifié parent/enseignant, mot de passe initial obligatoire, isolation des sessions par espace, import Excel en masse (5 flux), type d'établissement obligatoire, modules activables par établissement/groupe — voir le tableau « Ce qui est livré et opérationnel » ci-dessus.*

**1.4 Monitoring — détail du partiel (2026-08-16) :** le code est livré (`sentry/sentry-laravel` + `@sentry/react` intégrés, route `/up` de Laravel exposée pour le health check). Reste à faire, hors périmètre code — voir `docs/guide-deploiement.md` §8 : créer les projets Sentry (backend + frontend) et renseigner les DSN en production, créer un compte UptimeRobot et pointer un moniteur sur `/up`.

---

## Ce qui est déjà un avantage concurrentiel

À titre de rappel, ces éléments vous différencient **déjà** de la quasi-totalité des solutions locales :

- Architecture multi-tenant isolée (rare)
- Triple portail : web admin + enseignant mobile + parent mobile
- Intégration CinetPay (paiement mobile money natif, scolarité et frais annexes, depuis l'app parent ou le back-office)
- Bulletins PDF avec appréciations et décisions du conseil
- Archivage fin d'année avec rollback
- Emploi du temps avec détection de conflits
- **Notifications email automatiques** (bulletin, absence, sanction, relance)
- **Journal d'audit complet** (traçabilité de toutes les modifications sensibles)
- **Rapport statistique Ministère PDF** (auto-génération — argument de vente unique)
- **Formulaire MENET officiel** (14 sections, BEPC/BAC/CEPE, exports Excel/PDF — zéro ressaisie annuelle)
- **Inscription parent autonome depuis l'app** (flow matricule élève, validation admin, slots par école)
- **Frais annexes** (tenues, manuels, examens — facturation complémentaire intégrée)
- **Export comptable OHADA** (Excel 3 feuilles + FEC SAGE — zéro ressaisie)
- **Module SaaS billing** (abonnements, factures, dashboard super-admin)
- **Documentation in-app contextuelle** (aide par module, 27 articles pré-rédigés)
- 122 tests automatisés
- Templates de démarrage rapide (mise en service en moins d'une heure)
- **Page d'accueil publique avec entonnoir commercial** (demande d'accès → validation → tarification, sans intervention manuelle par email)
- **Compte central unifié parent/enseignant** (une seule identité pour accéder à plusieurs établissements, y compris dans un groupe scolaire)
- **Isolation des sessions par espace** (un directeur peut être connecté simultanément en admin et en super-admin dans le même navigateur, sans conflit)
- **Import Excel en masse** (élèves, enseignants, affectations, scolarités, notes — onboarding rapide pour les gros effectifs)
