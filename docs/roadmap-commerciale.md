# Roadmap commerciale — Application de gestion scolaire

> Document de référence — Mis à jour le 2026-05-26
> Synthèse de l'analyse experte (2026-04-30) et de l'état réel du code

---

## État des lieux

### Ce qui est livré et opérationnel ✅

| Fonctionnalité | Note |
|---|---|
| Gestion élèves, enseignants, classes, niveaux, matières | Complet |
| Notes, devoirs, bulletins PDF avec appréciations enseignants | Complet incl. commentaires par matière + appréciation prof principal |
| Relevé de notes annuel PDF | Complet |
| Décisions du conseil de classe (Admis, Redoublement, etc.) | Complet |
| Assiduités, paiements de scolarité, reçus PDF | Complet |
| Tableau des impayés + export CSV | Complet |
| Échéancier de paiement (tranches) | Complet |
| Archivage fin d'année + rollback | Complet |
| Emploi du temps avec détection des conflits | Complet |
| Gestion des salles | Complet |
| Calendrier scolaire (vacances, événements) | Complet |
| Sanctions / comportement élèves | Complet |
| Notifications in-app (cloche + badge, 6 déclencheurs) | Complet |
| Notifications push mobile FCM (Android) | Complet |
| **Notifications email (bulletin, absence, sanction, relance)** | **Complet** — Mailables + Queue, SMTP configurable |
| **Journal d'audit** | **Complet** — trait `Auditable`, interface admin lecture seule |
| **Rapport statistique annuel Ministère PDF** | **Complet** — 6 sections, A4 paysage, DomPDF |
| **Monitoring infrastructure** | **Complet** — Sentry (PHP + JS), UptimeRobot, Telescope |
| **Frais annexes** (tenues, manuels, examens, transport…) | **Complet** — config par niveau, suivi paiements, impayés, reçus PDF |
| **Export comptable structuré** | **Complet** — Excel 3 feuilles (OHADA) + FEC/CSV SAGE |
| **Module SaaS billing** | **Complet** — dashboard super-admin, abonnements, factures PDF |
| **Documentation in-app et aide contextuelle** | **Complet** — panneau "?" contextuel, gestion BDD, 26 articles pré-rédigés |
| Statistiques avancées (KPIs, classements, évolution inter-périodes) | Complet |
| Gestion des remplacements d'enseignants | Complet |
| Progression du programme par matière/classe | Complet |
| Messagerie parents ↔ enseignants | Complet |
| Réunions parents-profs (prise de RDV) | Complet |
| Photos élèves | Complet |
| Export CSV (élèves, notes, paiements) | Complet |
| Réinitialisation de mot de passe autonome | Complet |
| Architecture multi-tenant isolée | Complet |
| Portail enseignant mobile (Flutter/Android) | Complet |
| Portail parent mobile (Flutter/Android) | Complet |
| Mode hors-ligne mobile pour les présences | Complet (SharedPreferences + sync auto) |
| Templates de démarrage rapide (lycée, collège, primaire) | Complet (4 templates JSON) |
| Instance démo (code + commande `php artisan demo:creer`) | Code complet — déploiement public manquant |
| **86 tests automatisés** | **Complet** — couverture frais annexes, export, documentation, + tous les anciens |

---

## Ce qui reste à faire — Plan priorisé

---

### PHASE 0 — Débloquants commerciaux immédiats
> **Objectif :** Pouvoir présenter et vendre le produit à distance, à n'importe quel directeur, dès maintenant.

---

#### 0.1 — Déploiement public de l'instance démo
**Priorité :** ★★★★★ | **Effort :** ~1 jour | **Criticité :** Bloquant vente

Le code de démo est complet (`DemoSeeder.php`, `CreerDemo.php`, 4 templates). Ce qui manque c'est uniquement le déploiement sur un serveur public avec un sous-domaine wildcard.

**Ce qu'il faut faire :**
- Déployer sur un VPS avec `demo.votreapp.ci` (wildcard DNS `*.demo.votreapp.ci`)
- Lancer `php artisan demo:creer` pour créer `lycee.demo.votreapp.ci` prépeuplé
- Ajouter une page d'accueil publique avec les credentials de démo (en clair pour les prospects)
- Données fictives réalistes : un établissement complet (élèves, notes, bulletins, paiements)

**Impact :** Un directeur peut tester seul depuis son bureau, à n'importe quelle heure. C'est l'argument de vente numéro un.

---

### PHASE 1 — Complétude métier
> **Objectif :** Couvrir les besoins que les établissements découvrent en post-déploiement (mois 1-3).

---

#### 1.2 — Gestion santé élève
**Priorité :** ★★★☆☆ | **Effort :** ~1 jour | **Criticité :** Systématiquement demandé

Demandé par les infirmières scolaires et les directeurs prudents dès la démonstration.

**Champs à ajouter sur la fiche élève :**
- Groupe sanguin
- Allergies connues (champ texte libre)
- Médecin traitant (nom + téléphone)
- Contact urgence distinct des parents (nom, lien de parenté, téléphone)
- Assurance scolaire (compagnie + numéro de police)

**Implémentation :** Table `sante_eleves` (1-1 avec `eleves`) ou colonnes JSON sur `eleves`. Onglet "Santé" dans la fiche élève, visible uniquement par admin et infirmier.

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

#### 3.4 — RGPD / politique de protection des données
**Priorité :** ★★☆☆☆ | **Effort :** ~2 jours | **Criticité :** Partenaires internationaux

Les données d'enfants mineurs sont ultra-sensibles. Même si la réglementation ivoirienne est moins mature que le RGPD européen, les établissements avec des partenaires ONG ou internationaux le demanderont.

**À mettre en place :**
- Politique de confidentialité publique (page légale)
- Durée de rétention des données (ex. : données archivées conservées 10 ans)
- Procédure de droit à l'effacement (via super-admin)
- Chiffrement au repos des données sensibles (numéros de téléphone, données médicales)

---

## Récapitulatif général

| Phase | # | Fonctionnalité | Effort | Priorité | Statut |
|---|---|---|---|---|---|
| **0** | 0.1 | Déploiement instance démo publique | ~1 j | ★★★★★ | ⬜ À faire |
| **0** | 0.2 | Notifications email (bulletin, absence, sanction, relance) | ~2 j | ★★★★★ | ✅ Livré |
| **0** | 0.3 | Journal d'audit (notes, paiements, sanctions) | ~2 j | ★★★★☆ | ✅ Livré |
| **1** | 1.1 | Rapport statistique Ministère PDF | ~3-4 j | ★★★★★ | ✅ Livré |
| **1** | 1.2 | Gestion santé élève | ~1 j | ★★★☆☆ | ⬜ À faire |
| **1** | 1.3 | Authentification 2FA admin/comptable | ~2 j | ★★★☆☆ | ⬜ À faire |
| **1** | 1.4 | Monitoring infrastructure (Sentry + UptimeRobot) | ~1 j | ★★★★☆ | ✅ Livré |
| **2** | 2.1 | Portail élève dans l'app mobile (rôle distinct) | ~3 j | ★★★☆☆ | ⬜ À faire |
| **2** | 2.2 | Frais annexes (fournitures, tenues, examens) | ~3-4 j | ★★★☆☆ | ✅ Livré |
| **2** | 2.3 | Export comptable structuré (SAGE/Excel + FEC) | ~2 j | ★★☆☆☆ | ✅ Livré |
| **2** | 2.4 | Notifications SMS (AfricasTalking) | ~2 j | ★★☆☆☆ | ⬜ À faire |
| **3** | 3.1 | Bibliothèque de ressources pédagogiques | ~4-5 j | ★★☆☆☆ | ⬜ À faire |
| **3** | 3.2 | Module SaaS billing (abonnements tenants) | ~5-7 j | ★★★☆☆ | ✅ Livré |
| **3** | 3.3 | Application iOS (App Store) | ~3-5 j | ★★☆☆☆ | ⬜ À faire |
| **3** | 3.4 | RGPD / politique de données | ~2 j | ★★☆☆☆ | ⬜ À faire |
| **3** | 3.5 | Documentation in-app et aide contextuelle | ~3 j | ★★☆☆☆ | ✅ Livré |

**Livré :** 8 fonctionnalités sur 15 (hors démo) — **Restant :** ~21-27 jours de développement

---

## Ce qui est déjà un avantage concurrentiel

À titre de rappel, ces éléments vous différencient **déjà** de la quasi-totalité des solutions locales :

- Architecture multi-tenant isolée (rare)
- Triple portail : web admin + enseignant mobile + parent mobile
- Intégration CinetPay (paiement mobile money natif)
- Bulletins PDF avec appréciations et décisions du conseil
- Archivage fin d'année avec rollback
- Emploi du temps avec détection de conflits
- **Notifications email automatiques** (bulletin, absence, sanction, relance)
- **Journal d'audit complet** (traçabilité de toutes les modifications sensibles)
- **Rapport statistique Ministère PDF** (auto-génération — argument de vente unique)
- **Frais annexes** (tenues, manuels, examens — facturation complémentaire intégrée)
- **Export comptable OHADA** (Excel 3 feuilles + FEC SAGE — zéro ressaisie)
- **Module SaaS billing** (abonnements, factures, dashboard super-admin)
- **Documentation in-app contextuelle** (aide par module, 26 articles pré-rédigés)
- 86 tests automatisés
- Templates de démarrage rapide (mise en service en moins d'une heure)
