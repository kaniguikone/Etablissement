# Guide — Générer automatiquement les emplois du temps

> Pour le directeur des études / l'administrateur.
> Mis à jour le 2026-09-02.

L'application construit un emploi du temps complet à partir de votre paramétrage,
en respectant les règles de confection MENET (conflits, salles spécialisées, EPS
hors heures chaudes, heures consécutives, volumes horaires, indisponibilités…).

**La procédure est à faire par établissement.** Dans un groupe scolaire, le
primaire, le collège et le lycée sont des établissements distincts : on répète la
démarche dans chacun.

**Vue d'ensemble :**

```
Grille → Salles → Familles → Séances → Affectations → (Groupes) → Indispos
   └──────────────── Phase 1 : paramétrer (une fois par an) ────────────────┘
                              │
                        Diagnostic vert   ← Phase 2 : vérifier
                              │
                     Générer → Ajuster    ← Phase 3-4
                              │
                    Contrôle → Publier    ← Phase 5
```

---

## Phase 1 — Paramétrer (une fois par an)

### 1. Grille horaire

*Menu : **Emploi du temps → Grille horaire***

Définissez la semaine type : plages de **cours**, **récréations** et **pause
méridienne**, jour par jour.

- Bouton **« Recopier un jour »** : duplique une journée type vers d'autres jours.
- Une plage **sans jour** s'applique à tous les jours ouvrés.
- Prévoyez des plages de durée régulière (≈ 55 min). Une séance de 2 h occupe
  deux plages contiguës ; une séance de 1 h 30 = une plage dédiée.

### 2. Salles

*Menu : **Paramétrage → Salles***

Créez chaque salle avec :

- son **type** : classe / laboratoire / salle informatique / gymnase / autre ;
- sa **capacité** (nombre de places).

Puis, pour **chaque classe** (*Paramétrage → Classes → fiche de la classe*) :

- la **salle attitrée** (les élèves ne se déplacent pas, sauf pour le labo,
  le gymnase ou la salle info) ;
- l'**effectif** (contrôlé contre la capacité de la salle).

### 3. Familles de matières

*Menu : **Paramétrage → Config. matières/niveaux*** (bloc « Affectation rapide des familles »)

Chaque matière doit avoir une **famille** : Français, Mathématiques,
Histoire-Géographie, Anglais, LV2, Philosophie, Physique-Chimie, SVT, EPS,
EDHC, Arts/Éduc. musicale, TIC. C'est la famille qui porte les règles MENET
(2 h consécutives, tandem PC/SVT, HG jamais 2 h…) et le **code couleur** des
fiches.

Sur la fiche de chaque matière (*Paramétrage → Matières*), renseignez aussi :

- le **type de salle requis** : Physique-Chimie et SVT → laboratoire, EPS →
  gymnase, informatique → salle info ;
- la case **« effort soutenu »** (règle des 5 h en 6e/5e).

> Astuce : la commande `php artisan tenants:seed MatiereFamilleSeeder` déduit
> automatiquement les familles à partir des abréviations pour les matières
> standard.

### 4. Volumes horaires → découpage en séances

*Menu : **Paramétrage → Volumes & séances***

Pour chaque **niveau** :

1. Saisissez le **volume horaire** de chaque matière (heures/semaine).
2. Dépliez la ligne d'une matière → **« Pré-remplir depuis les volumes »** crée
   des séances d'une heure.
3. Ajustez : séances de 2 h (Français, Maths, Philo), quinzaine (PC/SVT au
   1er cycle), 1 h 30.

Un badge indique la cohérence : *« 4 h 50 placées / 4 h prévues »*.

### 5. Affectations enseignant / matière / classe

*Menu : **Enseignants → fiche enseignant → Affectations***
(ou *Paramétrage → Classes → fiche de la classe*)

Chaque couple **(classe, matière)** du programme doit avoir un enseignant
affecté. Une matière sans enseignant ne sera **pas placée** — elle apparaît
dans les anomalies de génération.

### 6. Groupes pédagogiques *(si LV2 ou dédoublements)*

*Menu : **Emploi du temps → Groupes pédagogiques***

Quand une classe se scinde pour une matière (LV2 Allemand / Espagnol,
dédoublement de langue ou de sciences) :

1. Choisissez le niveau puis la classe.
2. Déclarez chaque groupe : **code parallèle** (ex. « LV2 »), libellé
   (« Allemand »), matière, enseignant, effectif, nombre de séances par semaine
   (vide = déduit du volume horaire), fréquence (chaque semaine ou semaine A / B).

Les groupes partageant le **même code parallèle** sont placés **au même
créneau** par le générateur — salles et enseignants différents, et la classe
n'a aucun autre cours à ce moment.

### 7. Indisponibilités des enseignants

*Menu : **Emploi du temps → Indisponibilités profs***

Pour les vacataires et les temps partiels : sélectionnez l'enseignant, ajoutez
les créneaux bloqués (jour + intervalle horaire, type « bloquant » ou
« préférence », motif).

---

## Phase 2 — Vérifier

### 8. Diagnostic

*Menu : **Emploi du temps → Diagnostic***

Contrôle automatique de tout le paramétrage :

| Point contrôlé | Ce qu'il vérifie |
| --- | --- |
| Grille horaire | Plages de cours définies |
| Familles de matières | Toutes les matières ont une famille |
| Salles attitrées | Toutes les classes ont une salle |
| Capacité des salles | Salle ≥ effectif de la classe |
| Affectations enseignants | Aucune matière obligatoire sans enseignant |
| Découpage en séances | Tout le programme est découpé |
| Groupes pédagogiques | Aucun groupe sans enseignant |
| Indisponibilités | Renseignées |

**Tout doit être au vert avant de générer.** Chaque point rouge renvoie
directement vers l'écran à corriger.

---

## Phase 3 — Générer

### 9. Lancer une génération

*Menu : **Emploi du temps → Générer les EDT***

1. Donnez un **nom** au scénario (ex. « Scénario 1 »).
2. Cochez les **jours ouvrés** (lundi → vendredi par défaut ; ajoutez le samedi
   si besoin).
3. Cliquez **« Générer »** — quelques secondes.

### 10. Examiner le résultat

Le scénario affiche :

- le **score** (plus bas = mieux ; **sous 1000** = aucun conflit bloquant) ;
- le nombre de **séances placées / total** ;
- les **anomalies** : matières sans enseignant, séances impossibles à placer
  (avec le détail) ;
- le **contrôle** : nombre de conflits bloquants et de points d'amélioration ;
- un **aperçu par classe** (grille au code couleur).

> Générez **2 ou 3 scénarios** et comparez leurs scores dans la liste en bas de
> l'écran.

---

## Phase 4 — Ajuster

### 11. Retoucher un scénario

Dans l'aperçu par classe :

- **Cliquez sur un cours** → panneau d'édition : changer le **jour**, le
  **créneau**, ou **verrouiller** 🔒 / **retirer** le cours.
- Verrouillez les parties qui vous conviennent, puis cliquez
  **« Régénérer (garder les verrouillés) »** : l'outil crée un nouveau scénario
  en conservant les créneaux verrouillés et en recalculant le reste.

---

## Phase 5 — Contrôler et publier

### 12. Contrôle des règles MENET

*Menu : **Emploi du temps → Contrôle (règles MENET)***

Vérifie l'emploi du temps contre les règles de confection :

- **Violations bloquantes** : conflit d'enseignant / de salle / de classe,
  salle spécialisée manquante, EPS entre 10 h et 16 h, deux heures consécutives
  d'Histoire-Géo, capacité de salle insuffisante, cours sur une indisponibilité,
  volume horaire non respecté, groupes désynchronisés.
- **Points d'amélioration** (pondérables) : matière concentrée sur un jour,
  5 h d'affilée de matières exigeantes en 6e/5e, heures creuses des enseignants,
  journées déséquilibrées.

Dépliez **« Régler les contraintes »** pour activer/désactiver les règles
souples et ajuster leur poids selon les habitudes de l'établissement. Les règles
bloquantes ne sont pas désactivables.

### 13. Publier

Bouton **« Publier ce scénario »** :

- il devient l'**emploi du temps officiel**, visible dans les portails
  enseignant, parent et élève ;
- l'ancien emploi du temps est **archivé** (récupérable en le republiant) ;
- les **enseignants sont notifiés** (notification in-app + push mobile).

### 14. Imprimer / diffuser

Boutons d'export **PDF** (grille au code couleur MENET) :

- **PDF — toutes les classes** (une page par classe) ;
- **PDF — <classe>** (classe affichée).

Des exports par enseignant et par salle sont également disponibles.

---

## Saisie manuelle (alternative)

*Menu : **Emploi du temps → Emplois du temps → + Ajouter un créneau***

Pour créer ou corriger l'emploi du temps officiel à la main : sélectionnez
classe, matière, enseignant, **créneau de la grille** (la salle est pré-remplie
avec la salle attitrée de la classe). Les conflits de salle, d'enseignant et de
classe sont détectés automatiquement.

---

## En cas de problème

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| « X matière(s) sans enseignant » | Affectation manquante | *Enseignants → Affectations* ou fiche classe |
| « X séance(s) non placée(s) » | Pas assez de créneaux, de salles de labo, ou grille trop courte | Ajouter des plages à la grille, des salles ; réduire les indisponibilités |
| Score élevé (> 1000) | Conflits bloquants ou séances non placées | Voir le contrôle et les anomalies du scénario |
| EPS non placée | Grille sans plage avant 10 h ni après 16 h | Ajouter des plages tôt le matin ou en fin d'après-midi |
| Groupes LV2 pas en parallèle | Codes parallèles différents | Mettre le **même** code parallèle sur les groupes simultanés |
| Salle absente sur des créneaux | Aucune salle attitrée / trop peu de salles | Renseigner la salle attitrée des classes, créer des salles |

---

## Référence rapide

**Paramétrage :** Grille horaire · Salles (+ salle attitrée) · Familles de
matières · Volumes & séances · Affectations · Groupes pédagogiques ·
Indisponibilités
→ **Diagnostic** (tout vert)
→ **Générer** (1 à 3 scénarios) → **Ajuster** (déplacer / verrouiller /
régénérer) → **Contrôle MENET** → **Publier** → **PDF**
