# Comprendre et piloter la génération automatique des emplois du temps

> Document de fond, pour le directeur des études / l'administrateur qui doit
> **expliquer** et **appliquer** la démarche.
> Complète le [guide pas-à-pas](guide-generation-edt.md) (qui, lui, donne la
> checklist courte) et la [référence d'architecture](chantier-emploi-du-temps.md)
> (qui vise les développeurs).
> Mis à jour le 2026-09-10.

---

## Sommaire

1. [Le principe en une page](#1-le-principe-en-une-page)
2. [Le mécanisme, étape par étape](#2-le-mécanisme-étape-par-étape)
3. [Les règles : bloquantes et souples](#3-les-règles--bloquantes-et-souples)
4. [Scénarios, publication, régénération](#4-scénarios-publication-régénération)
5. [Procédure détaillée, sous-menu par sous-menu](#5-procédure-détaillée-sous-menu-par-sous-menu)
6. [Ordre d'exécution recommandé](#6-ordre-dexécution-recommandé)
7. [Cas concrets — groupe scolaire multi-cycles](#7-cas-concrets--groupe-scolaire-multi-cycles)

---

## 1. Le principe en une page

### 1.1 Ce que l'ordinateur doit résoudre

Un emploi du temps, c'est **poser chaque séance de l'année dans une case
jour × heure**, en respectant trois familles de contraintes :

- **les ressources ne se dédoublent pas** : un enseignant, une classe, une salle
  ne peuvent être qu'à un seul endroit à un instant donné ;
- **certaines séances exigent une salle particulière** : labo pour la
  Physique-Chimie et la SVT, gymnase pour l'EPS, salle informatique pour les TIC ;
- **les règles pédagogiques MENET** : EPS hors des heures chaudes (10 h–16 h),
  jamais deux heures d'Histoire-Géo à la suite, volume horaire réglementaire
  respecté, tandem PC/SVT le même jour, etc.

### 1.2 Pourquoi c'est difficile

C'est un problème **combinatoire**. Pour un petit collège de 12 classes, on a
déjà plusieurs centaines de séances à poser sur ~40 cases par semaine, avec des
enseignants partagés entre classes. Le nombre de combinaisons possibles dépasse
tout ce qu'on peut énumérer. Mathématiquement, la confection d'emploi du temps
fait partie des problèmes dits **NP-difficiles** : il n'existe pas de méthode
qui donne *à coup sûr* la solution parfaite en un temps raisonnable.

On ne cherche donc pas « la » solution optimale : on cherche **une bonne
solution, rapidement**, quitte à l'ajuster ensuite à la main.

### 1.3 La méthode retenue : « le plus contraint d'abord », puis retouches

Le moteur applique une **heuristique** en deux temps — la même logique qu'un
responsable d'emploi du temps expérimenté qui travaillerait au crayon :

1. **Construction gloutonne.** On classe les séances **de la plus contrainte à
   la plus libre** (les blocs de groupes, l'EPS, les cours en labo, les séances
   de 2 h…), puis on place chacune dans **la meilleure case encore disponible**.
   « Meilleure » = celle qui ne crée aucun conflit physique et qui coûte le
   moins de points de pénalité (voir §3).
2. **Amélioration locale.** Une fois tout posé, le moteur repasse **8 fois** sur
   l'ensemble, dans un ordre aléatoire, et pour chaque séance se demande :
   *« existe-t-il une case libre qui ferait baisser le score ? »*. Si oui, il
   déplace. Il s'arrête dès qu'une passe complète n'améliore plus rien.

Le résultat n'est pas garanti parfait, mais il est **cohérent, sans conflit
physique, et proche du meilleur atteignable** en quelques secondes.

### 1.4 Un moteur isolé et remplaçable

Toute cette logique vit dans une seule classe PHP
(`app/Services/Edt/Generateur.php`). Elle ne dépend d'aucun serveur externe,
d'aucune installation particulière : elle tourne **dans l'application, en
quelques secondes** pour un collège.

Elle est **délibérément isolée** : le jour où l'on voudra un moteur plus
puissant (un solveur de contraintes type OR-Tools), on remplacera cette seule
classe sans toucher au reste (écrans, enregistrement, publication).

---

## 2. Le mécanisme, étape par étape

> Ce qui suit décrit exactement ce que fait le bouton **« Générer »**. Rien
> n'est écrit dans l'emploi du temps officiel : le moteur **renvoie une
> proposition**, enregistrée à part comme *scénario* (voir §4).

### 2.1 Les trois ingrédients

| Ingrédient | D'où il vient | Rôle |
| --- | --- | --- |
| **La grille** | *Grille horaire* | Les cases disponibles : plages de cours par jour, avec leurs horaires |
| **Les besoins** | *Volumes & séances* + *Groupes* + *Affectations* | La liste des séances à poser (matière, classe, enseignant, durée, salle requise) |
| **Les ressources** | *Salles* + *Indisponibilités* | Les salles disponibles par type ; les moments où un enseignant ne peut pas |

### 2.2 Étape 1 — lire la grille

Le moteur charge les **plages de type « cours »** actives, les trie par heure,
et les répartit par jour (une plage sans jour vaut pour tous les jours ouvrés).

Il calcule au passage la **durée médiane d'une plage** (≈ 55 min). C'est cette
durée qui sert à savoir combien de plages contiguës occupe une séance :
une séance de 55 min = 1 plage, une séance de 110 min = 2 plages contiguës, etc.

> Conséquence pratique : **des plages de durée régulière** donnent de bien
> meilleurs résultats qu'une grille avec des plages de 45, 55 et 70 min mélangées.

### 2.3 Étape 2 — lister les salles

Les salles actives sont triées en deux paquets :

- **salles spécialisées** : `labo`, `salle_info`, `gymnase` — comptées par type ;
- **salles banalisées** : toutes les autres (salles de classe ordinaires).

Le moteur sait ainsi, pour chaque instant, s'il reste un labo libre.

### 2.4 Étape 3 — charger les indisponibilités

Seules les indisponibilités de type **« bloquant »** sont chargées ici : elles
interdisent physiquement de poser un cours de cet enseignant sur ce créneau.
Les indisponibilités de type **« préférence »** ne bloquent pas — elles sont
seulement pénalisées (§3.2).

### 2.5 Étape 4 — construire la liste des « besoins »

Un **besoin** = une séance à placer. Le moteur les construit classe par classe :

1. **D'abord les blocs de groupes parallèles** (LV2, dédoublements). Quand une
   classe se scinde — Allemand / Espagnol, groupe A / groupe B de sciences — les
   groupes qui partagent le même **code parallèle** forment **un seul besoin
   avec plusieurs « sous-cours »**. Ils seront tous posés **au même
   jour/heure**, avec des salles et des enseignants différents. Les matières
   ainsi prises en charge sont retirées du programme normal.
2. **Ensuite le programme normal.** Pour chaque couple (classe, matière) du
   programme du niveau (en tenant compte de la série) :
   - **pas d'enseignant affecté ?** → la matière part dans les **anomalies**
     (« sans enseignant ») et n'est pas placée ;
   - **pas de découpage en séances ?** → le moteur crée par défaut des séances
     d'1 h à partir du volume horaire (et le signale) ;
   - sinon, il crée **une séance par occurrence** définie dans *Volumes &
     séances* (par ex. « 2 séances de 2 h » = 2 besoins de 2 plages).
   - **Fréquence quinzaine** : chaque occurrence est affectée alternativement à
     la **semaine A** ou **B**, au niveau de la classe. Ainsi PC (semaine A) et
     SVT (semaine B) peuvent partager le même créneau sans se gêner.

### 2.6 Étape 5 — trier du plus contraint au plus libre

Les besoins sont triés par **priorité** (plus le chiffre est bas, plus c'est
placé tôt) :

| Priorité | Type de besoin | Pourquoi en premier |
| --- | --- | --- |
| 0 | Blocs de groupes parallèles | Doivent trouver un créneau libre **pour toute la classe** + plusieurs salles + plusieurs profs |
| 1 | EPS | N'a le droit qu'aux créneaux **avant 10 h ou après 16 h** |
| 2 | Séances à salle spécialisée (labo, info, gymnase) | Nombre de salles limité |
| 3 | Séances de 2 h ou plus | Ont besoin de deux plages **contiguës** |
| 4 | Tout le reste (séances d'1 h) | Se casent presque partout |

Un léger aléa est ajouté à l'intérieur de chaque niveau de priorité : c'est ce
qui fait que **deux générations successives donnent des scénarios différents** —
on peut donc en produire plusieurs et garder le meilleur.

### 2.7 Étape 6 — placement glouton

Pour chaque besoin, dans l'ordre du tri :

1. Le moteur énumère **toutes les tranches possibles** = (jour, suite de plages
   contiguës de la bonne longueur) sur les jours ouvrés retenus.
2. Il **écarte** les tranches qui créent un **conflit bloquant physique** :
   - la classe a déjà cours sur ce créneau ;
   - un des enseignants a déjà cours, ou est en indisponibilité bloquante ;
   - aucune salle du type requis n'est libre ;
   - c'est de l'EPS et le créneau tombe entre 10 h et 16 h.
3. Parmi les tranches restantes, il calcule un **score de placement** (somme de
   pénalités souples, voir §3.2) et **garde la moins pénalisée**.
4. Il **pose** la séance : les cases sont marquées occupées (classe, profs,
   salles), et une salle est attribuée à chaque sous-cours (salle attitrée de la
   classe pour le cours principal, salle spécialisée ou salle banalisée libre
   pour les groupes).

Si **aucune** tranche ne convient, la séance part dans les anomalies
(« non placée — aucun créneau libre compatible »).

### 2.8 Étape 7 — amélioration locale

8 passes maximum. À chaque passe, dans un ordre mélangé, pour chaque séance
**non verrouillée** :

- on note son score actuel ;
- on la retire ;
- on cherche la meilleure case (comme à l'étape 6) ;
- on la repose là si c'est **strictement mieux**, sinon on la remet où elle
  était.

Dès qu'une passe entière ne déplace plus rien, le moteur s'arrête : on a atteint
un **optimum local**.

### 2.9 Étape 8 — score final

```
score = (somme des pénalités souples sur tous les créneaux)
      + 1000 × (nombre de séances non placées)
```

- **score < 1000** → **toutes les séances sont placées** et il n'y a **aucun
  conflit physique bloquant**. Les points restants sont des imperfections
  d'organisation (heures creuses, journées un peu déséquilibrées…).
- **score ≥ 1000** → il reste au moins une séance non placée, ou (après le
  contrôle MENET) un conflit bloquant. À corriger avant publication.

> Le score sert surtout à **comparer plusieurs scénarios entre eux** : générez-en
> 2 ou 3, gardez celui au score le plus bas, puis retouchez-le.

---

## 3. Les règles : bloquantes et souples

Deux natures de règles, toutes stockées dans un **catalogue modifiable**
(*Contrôle → Régler les contraintes*) :

- **dure (bloquante)** : une violation = un défaut à corriger obligatoirement.
  Compte pour **1000 points** dans le contrôle. Non désactivable.
- **souple** : une violation est **tolérée mais pénalisée** selon un **poids**
  réglable. Peut être désactivée si elle ne correspond pas aux habitudes de
  l'établissement.

### 3.1 Contraintes dures (14)

| Code | Ce qu'elle vérifie | Poids catalogue |
| --- | --- | --- |
| `ENSEIGNANT_DOUBLE` | Un enseignant, deux cours en même temps | 100 |
| `CLASSE_DOUBLE` | Une classe, deux cours en même temps | 100 |
| `SALLE_DOUBLE` | Une salle, deux classes en même temps | 100 |
| `SALLE_SPECIALISEE` | PC/SVT en labo, EPS au gymnase, TIC en salle info | 80 |
| `NIVEAU_LABO_SIMULTANE` | Pas deux classes du même niveau en salle spécialisée au même moment (partage du matériel) | 60 |
| `EPS_HEURES_CHAUDES` | EPS jamais entre 10 h et 16 h (paramétrable) | 70 |
| `HG_PAS_CONSECUTIF` | Histoire-Géo jamais sur deux heures consécutives | 50 |
| `MATIERE_CONSECUTIVE` | Pas deux heures de suite dans la même discipline — sauf Français, Maths, Philo, PC (paramétrable) et sauf séance déjà « longue » ≥ 1 h 30 | 30 |
| `INDISPO_BLOQUANTE` | Aucun cours sur une indisponibilité bloquante d'un enseignant | 90 |
| `CAPACITE_SALLE` | La salle accueille l'effectif de la classe | 40 |
| `SALLE_ATTITREE` | Les élèves ne se déplacent pas : cours dans la salle attitrée (hors salle spécialisée) | 20 |
| `VOLUME_HORAIRE` | Volume réglementaire respecté, à ± 0,5 h près (paramétrable) | 30 |
| `TANDEM_MEME_JOUR` | PC et SVT tombent le même jour dans la semaine | 25 |
| `GROUPES_PARALLELES` | Les groupes d'une même classe (même code parallèle) sont enseignés en même temps | 40 |

> **Important — la division du travail entre le moteur et le contrôle :**
> pendant la génération, le moteur **empêche en dur** seulement les conflits
> *physiques* : classe double, enseignant double, indispo bloquante, salle
> spécialisée absente, EPS en heures chaudes. Les autres règles dures
> (HG consécutif, tandem, volume, capacité, salle attitrée…) sont **fortement
> pénalisées** (l'Histoire-Géo consécutive coûte 100 points à elle seule) mais
> pas interdites — le moteur peut être obligé de les enfreindre s'il n'a pas le
> choix. C'est le **Contrôle (règles MENET)** qui fait ensuite l'audit complet
> et signale ce qu'il reste à corriger.

### 3.2 Contraintes souples (5)

| Code | Ce qu'elle favorise | Poids | Réglage |
| --- | --- | --- | --- |
| `REPARTITION_SEMAINE` | Étaler les heures d'une matière sur plusieurs jours plutôt que les grouper | 5 | — |
| `PAS_5H_EFFORT` | En 6e/5e, éviter ≥ 4 h d'affilée de matières « à effort soutenu » | 8 | `max_consecutif` |
| `TROUS_ENSEIGNANT` | Limiter les heures creuses des enseignants dans une journée | 4 | — |
| `EQUILIBRE_JOURNEE` | Éviter qu'une classe ait une journée à 7 h et une autre à 2 h | 3 | `ecart_max_heures` |
| `INDISPO_PREFERENCE` | Respecter au mieux les préférences horaires (indispo « préférence ») | 4 | — |

Pendant la génération, le moteur ajoute d'autres micro-pénalités qui ne
correspondent pas à une règle du catalogue mais qui affinent le placement :
même matière deux fois le même jour (+4), long bloc l'après-midi après 13 h (+3).

### 3.3 Lire le score du contrôle

Le **Contrôle (règles MENET)** et l'encadré d'un scénario affichent :

```
X conflit(s) bloquant(s), Y point(s) d'amélioration
```

- **X = 0** → l'emploi du temps est **conforme** ; on peut publier.
- **X > 0** → dépliez la liste : chaque ligne dit *quelle* classe / *quel*
  enseignant / *quel* jour. On corrige à la main (§5.6) ou on régénère.
- **Y** n'est jamais bloquant : c'est le confort. On le réduit en ajustant les
  poids ou en retouchant quelques créneaux.

### 3.4 Codé en dur vs paramétrable

La réponse tient en **trois niveaux** :

| Niveau | Codé en dur | Paramétrable par l'établissement |
| --- | --- | --- |
| **La logique de détection** (les 19 règles : *comment* on repère une violation) | ✅ méthodes PHP dans `Validateur` et `Generateur`. Ajouter une règle = écrire du code. | ❌ |
| **L'application des règles par le Contrôle** | La liste des règles et leur nature (dure / souple). | ✅ via *Contrôle → « Régler les contraintes »* : **activer/désactiver** (souples seulement), **poids**, et **paramètres** (`parametres` JSON) — voir table ci-dessous. Réglages **persistés par établissement** ; le re-seed ne réécrit que `libelle` et `nature`. |
| **La donnée qui nourrit les règles** | — | ✅ indisponibilités, volumes horaires, types de salle, familles, effectifs, salles attitrées : 100 % données utilisateur. |

Paramètres réglables aujourd'hui : `EPS_HEURES_CHAUDES` → `{debut, fin}` ·
`VOLUME_HORAIRE` → `{tolerance_heures}` · `MATIERE_CONSECUTIVE` →
`{familles_exemptees}` · `PAS_5H_EFFORT` → `{max_consecutif}` ·
`EQUILIBRE_JOURNEE` → `{ecart_max_heures}`.

**Limite actuelle (lots 0-4).** Le `Generateur` — le moteur qui *place* les
cours — n'est **pas branché** sur la table `edt_contraintes` : ses seuils et
pénalités internes (10 h / 16 h pour l'EPS, 100 points pour l'Histoire-Géo
consécutive…) sont écrits en dur dans la classe. Concrètement : changer un poids
dans l'écran modifie la façon dont le **Contrôle note et audite** un scénario,
mais **pas** la façon dont le moteur le **construit**. Les deux utilisent
aujourd'hui des valeurs cohérentes mais indépendantes. Brancher le générateur
sur le catalogue (pour qu'un poids influence réellement la génération) est une
évolution possible, non réalisée dans les lots 0-4.

---

## 4. Scénarios, publication, régénération

### 4.1 Un scénario n'affecte rien tant qu'il n'est pas publié

Chaque génération crée un **scénario** : un jeu de créneaux **rangé à part**,
rattaché à un identifiant de génération. Techniquement, l'emploi du temps
« officiel » est celui dont la génération est vide ; tous les écrans (portail
enseignant, parent, élève, PDF officiels) ne voient **que l'officiel**. Les
scénarios sont **invisibles** partout ailleurs que dans l'écran *Générer les
EDT*.

**Conséquence : générer autant de scénarios qu'on veut ne présente aucun risque**
pour l'emploi du temps en cours. C'est la garantie de non-régression du chantier.

### 4.2 Publier

Le bouton **« Publier ce scénario »** :

1. **archive** l'emploi du temps officiel actuel (il devient un scénario
   « archive », récupérable) ;
2. **promeut** les créneaux du scénario en emploi du temps officiel ;
3. repasse l'ancien scénario publié (s'il y en avait un) en « archive » ;
4. **notifie chaque enseignant concerné** (notification in-app + push mobile
   « Emploi du temps mis à jour »).

Un scénario publié ne peut plus être supprimé.

### 4.3 Régénérer en gardant les verrous

Dans l'aperçu d'un scénario, on peut **verrouiller 🔒** les créneaux qui
conviennent (cliquer sur un cours → cocher « Verrouiller »). Le bouton
**« Régénérer (garder les verrouillés) »** crée **un nouveau scénario** :

- les créneaux verrouillés sont **repositionnés à l'identique** ;
- tout le reste est **recalculé** autour.

On itère ainsi : générer → verrouiller ce qui va → régénérer → … jusqu'à un
scénario satisfaisant. (La régénération ne traite que les cours à sous-cours
unique ; les blocs de groupes sont toujours recalculés.)

### 4.4 Retoucher un créneau à la main (dans un scénario)

Cliquer sur un cours de l'aperçu ouvre un panneau : changer le **jour**, le
**créneau**, **verrouiller**, ou **retirer** le cours. Si le déplacement crée un
nouveau conflit bloquant, l'application **le signale** (le déplacement est quand
même appliqué — le message liste les conflits introduits).

---

## 5. Procédure détaillée, sous-menu par sous-menu

### Pré-requis — écrans hors du menu « Emploi du temps »

Ces réglages ne sont pas dans le menu « Emploi du temps » mais **conditionnent**
la génération.

#### 5.0.1 Salles — *Paramétrage → Salles*

Créer **toutes** les salles réellement disponibles.

| Champ | Ce qu'il faut saisir | Effet sur la génération |
| --- | --- | --- |
| Nom | Libellé lisible (« Labo SVT », « Salle 12 ») | Affiché sur les fiches et PDF |
| Type | `classe` / `labo` / `salle_info` / `gymnase` / `autre` | **Détermine** quelles séances peuvent y aller. PC/SVT cherchent un `labo`, EPS un `gymnase`, TIC une `salle_info` |
| Capacité | Nombre de places assises | Comparée à l'effectif de la classe (règle `CAPACITE_SALLE`) |
| Actif | Coché | Une salle inactive est ignorée par le moteur |

**Piège** : s'il n'y a **qu'un seul labo** et 6 classes de 3e avec PC + SVT en
quinzaine, le moteur ne pourra pas tout caser aux mêmes heures → séances non
placées. Prévoir assez de salles spécialisées, ou étaler.

#### 5.0.2 Classes — salle attitrée + effectif — *Paramétrage → Classes → fiche*

Pour **chaque classe** :

- **Salle attitrée** : la salle où la classe reste par défaut. Le moteur y place
  tous les cours **sauf** ceux qui exigent une salle spécialisée. Sans salle
  attitrée, les cours ordinaires de la classe sortent **sans salle** (et la
  règle `SALLE_ATTITREE` se déclenche).
- **Effectif** (`effectif_max_classe`) : contrôlé contre la capacité de la salle.

> Commande utile pour rapprocher salles et classes existantes :
> `php artisan edt:reconcilier-salles` (simulation) puis `--apply`.

#### 5.0.3 Familles de matières — *Paramétrage → Config. matières/niveaux*

Bloc **« Affectation rapide des familles »**. Chaque matière **doit** avoir une
famille parmi : Français, Mathématiques, Histoire-Géographie, Anglais, LV2,
Philosophie, Physique-Chimie, SVT, EPS, EDHC, Arts / Éduc. musicale, TIC…

La **famille** porte :

- les règles MENET (`HG_PAS_CONSECUTIF` sur la famille *hist_geo*,
  `TANDEM_MEME_JOUR` sur *pc* + *svt*, `EPS_HEURES_CHAUDES` sur *eps*,
  `MATIERE_CONSECUTIVE` avec ses exemptions par famille) ;
- le **code couleur** des grilles et PDF.

> Raccourci : `php artisan tenants:seed MatiereFamilleSeeder` déduit la famille
> à partir des abréviations usuelles (FR, MATH, HG, SVT, PC, EPS…).

#### 5.0.4 Matières — champs EDT — *Paramétrage → Matières → fiche*

Sur chaque matière :

- **Type de salle requis** : `labo` (PC, SVT), `salle_info` (TIC), `gymnase`
  (EPS), ou vide. Vide = salle attitrée de la classe.
- **Effort soutenu** : coché pour les disciplines exigeantes (règle
  `PAS_5H_EFFORT` en 6e/5e).

#### 5.0.5 Volumes & séances — *Paramétrage → Volumes & séances*

Écran en deux temps, **par niveau** :

1. **Volume horaire** de chaque matière (heures/semaine) — c'est le volume
   réglementaire MENET.
2. **Découpage en séances** : déplier une matière →
   **« Pré-remplir depuis les volumes »** crée des séances d'1 h. Puis ajuster :

| Réglage d'une séance-type | Quand l'utiliser |
| --- | --- |
| Durée 110 / 120 min | Français, Maths, Philo — un bloc de 2 h |
| Durée 90 min | Séance d'1 h 30 |
| Nombre de séances | Ex. « 2 » séances de 2 h pour 4 h de Français |
| Fréquence « quinzaine » | PC / SVT au 1er cycle (1 h une semaine sur deux) |
| Code tandem | Lier PC et SVT pour qu'elles tombent le même jour |
| Ordre | Ordre d'affichage / de traitement |

Un badge de cohérence indique *« 4 h 50 placées / 4 h prévues »*. Viser
l'égalité (à ± 0,5 h, tolérance de la règle `VOLUME_HORAIRE`).

**C'est cet écran qui définit combien de besoins le moteur va construire.**
Une matière sans séance-type et sans volume ne génère **rien**.

#### 5.0.6 Affectations enseignant / matière / classe — *Enseignants → fiche → Affectations* (ou fiche de la classe)

Chaque couple **(classe, matière)** du programme doit avoir **au moins un
enseignant**. Sinon : anomalie « sans enseignant », séance non placée.

Si plusieurs enseignants sont affectés au même couple, le moteur les répartit
sur les différentes séances (utile pour un cours co-animé ou réparti).

---

### Menu « Emploi du temps »

#### 5.1 Grille horaire — `/GrilleHoraire`

**But** : décrire la semaine type (les cases où poser des cours).

**Procédure :**

1. Pour **chaque jour ouvré**, ajouter les plages dans l'ordre chronologique.
2. Pour chaque plage : **libellé** (« M1 », « 07 h 30 »), **type**
   (`cours` / `recreation` / `pause_midi`), **heure de début**, **heure de fin**.
3. Utiliser **« Recopier un jour »** pour dupliquer une journée type vers
   d'autres jours, puis ajuster (mercredi court, pas de cours le samedi
   après-midi…).

**Règles de saisie :**

- Les plages ne doivent **pas se chevaucher** (l'application le refuse).
- Une plage **sans jour** s'applique à tous les jours ouvrés — pratique pour une
  grille homogène.
- Seules les plages **`cours`** reçoivent des séances. `recreation` et
  `pause_midi` créent les coupures qui empêchent le moteur d'enchaîner deux
  heures « consécutives » de part et d'autre.
- **Durées régulières** (≈ 55 min) recommandées : le moteur en déduit qu'une
  séance de 110 min = 2 plages. Des plages irrégulières compliquent le calcul.
- Prévoir des plages **avant 10 h et après 16 h** si on a de l'EPS (sinon elle
  ne peut jamais se placer).

**Utilisé par :** le moteur (cases disponibles + durée médiane), le contrôle
(`TROUS_ENSEIGNANT`), l'aperçu et les PDF.

Diagnostic associé : **vert dès 4 plages de cours**.

#### 5.2 Groupes pédagogiques — `/GroupesPedagogiques`

**But** : déclarer les cas où une classe **se scinde** pour une matière (LV2
Allemand / Espagnol, dédoublement de langue vivante, groupes de sciences,
options…).

**Procédure :**

1. Choisir le **niveau** puis la **classe**.
2. Ajouter un groupe pour chaque sous-effectif :

| Champ | Rôle |
| --- | --- |
| **Code parallèle** | Étiquette commune aux groupes simultanés (ex. `LV2`, `SCIENCES-A`). **Les groupes de même code sont posés au même créneau.** |
| Libellé | Nom lisible (« Allemand », « Groupe 1 ») |
| Matière | La matière enseignée à ce groupe |
| Enseignant | Le prof du groupe (obligatoire pour la génération) |
| Effectif | Pour le contrôle de capacité de salle |
| Nb séances / semaine | Vide = déduit du volume horaire de la matière |
| Durée (min) | Durée d'une séance du groupe |
| Fréquence / semaine | `toutes`, `A` ou `B` (quinzaine) |

**Comment le moteur s'en sert :** il crée **un besoin unique** regroupant tous
les groupes d'un même code parallèle. Il cherche **un créneau où la classe
entière est libre**, puis attribue à chaque groupe **sa propre salle et son
propre enseignant**. Le premier groupe prend la salle attitrée de la classe, les
suivants une salle banalisée (ou spécialisée) libre.

**Pièges :**

- Codes parallèles **différents** sur des groupes censés être simultanés → ils
  ne se synchronisent pas (règle `GROUPES_PARALLELES`).
- Pas assez de salles banalisées libres → un groupe sort **sans salle**.
- Une matière gérée en groupe **ne doit plus** être placée par le programme
  normal : le moteur la retire automatiquement du programme de la classe.

Diagnostic associé : **rouge si un groupe n'a pas d'enseignant**.

#### 5.3 Indisponibilités profs — `/Indisponibilites`

**But** : renseigner les moments où un enseignant **ne peut pas** (vacataires,
temps partiels, service partagé avec un autre établissement, contraintes
personnelles validées).

**Procédure :**

1. Sélectionner l'enseignant.
2. Ajouter chaque indisponibilité :

| Champ | Rôle |
| --- | --- |
| Jour | Jour concerné |
| Plage horaire **ou** intervalle heure début / heure fin | Le créneau bloqué |
| Type | **`bloquant`** (interdit) ou **`preference`** (à éviter si possible) |
| Motif | Trace pour l'administration |

**Comment le moteur s'en sert :**

- `bloquant` → le moteur **n'y placera jamais** un cours de cet enseignant
  (conflit dur, écarté d'office).
- `preference` → le moteur **peut** y placer un cours, mais chaque violation est
  **pénalisée** (règle souple `INDISPO_PREFERENCE`, poids 4).

**Conseil :** rester sobre. Trop d'indisponibilités bloquantes rendent le
problème insoluble (« séances non placées »). Réserver le `bloquant` aux vraies
impossibilités ; utiliser `preference` pour les souhaits.

Diagnostic associé : **toujours vert** (facultatif) — c'est un simple compteur.

#### 5.4 Diagnostic — `/DiagnosticEdt`

**But** : vérifier **avant de générer** que tout le paramétrage est complet.
Aucune action, aucune écriture — juste un contrôle.

**Les 8 blocs vérifiés :**

| Bloc | Vert quand… | Rouge = aller corriger… |
| --- | --- | --- |
| Grille horaire | ≥ 4 plages de cours | *Grille horaire* |
| Familles de matières | Toutes les matières ont une famille | *Config. matières/niveaux* |
| Salles attitrées | Toutes les classes ont une `salle_id` | *Classes → fiche* |
| Capacité des salles | Salle ≥ effectif pour chaque classe | *Salles* ou *Classes* |
| Affectations enseignants | Aucune matière **obligatoire** sans prof | *Enseignants → Affectations* |
| Découpage en séances | Tout le programme (niveau × matière) a des séances-types | *Volumes & séances* |
| Groupes pédagogiques | Aucun groupe sans enseignant (ou aucun groupe) | *Groupes pédagogiques* |
| Indisponibilités | Toujours vert (indicatif) | — |

**Procédure :** ouvrir l'écran, corriger chaque bloc rouge (chaque ligne pointe
vers l'écran concerné), recharger. **Ne générer que quand `pret = true`**
(tous les blocs verts).

#### 5.5 Générer les EDT — `/GenererEdt`

**But** : produire un ou plusieurs scénarios, les examiner, les ajuster, publier.

**Procédure complète :**

1. **Nom du scénario** (ex. « Scénario 1 — priorité profs »). Facultatif ;
   par défaut « Scénario du JJ/MM/AAAA HH:MM ».
2. **Jours ouvrés** : lundi → vendredi cochés par défaut ; ajouter samedi si
   l'établissement fait cours le samedi matin.
3. **Générer** → quelques secondes. Le scénario s'affiche.
4. **Lire l'encadré du résultat :**
   - `statut` (`termine`), `score`, `X / Y séances placées`, durée ;
   - bandeau **vert** si `0 conflit bloquant`, **rouge** sinon ;
   - bandeaux jaunes : *séances non placées*, *matières sans enseignant* ;
   - **« Détail des anomalies »** : la liste exacte ;
   - **« N remarque(s) du contrôle »** : chaque violation, badge rouge (dure) ou
     jaune (souple), avec le message précis.
5. **Aperçu d'une classe** : sélectionner une classe → grille au code couleur.
   Les cases violet clair = deux groupes en parallèle. 🔒 = verrouillé.
   Badge « A » / « B » = quinzaine.
6. **Comparer** : générer 2-3 scénarios (le bouton relance à chaque fois avec un
   aléa différent) ; le tableau **« Scénarios »** en bas liste score et nombre
   de créneaux. Garder le meilleur, supprimer les autres (✕).
7. **Ajuster** (voir §4.3-4.4) : cliquer un cours → déplacer / verrouiller /
   retirer ; puis **« Régénérer (garder les verrouillés) »**.
8. **Publier** quand `0 conflit bloquant` et `0 séance non placée` :
   **« Publier ce scénario »** → confirmation → l'ancien EDT est archivé, le
   nouveau devient officiel, les profs sont notifiés.
9. **Exporter** : **« PDF — toutes les classes »** (une page par classe) et
   **« PDF — <classe> »** (classe affichée). Des exports par enseignant et par
   salle existent aussi.

**À retenir :** tant qu'on n'a pas cliqué « Publier », **l'emploi du temps réel
ne bouge pas**.

#### 5.6 Emplois du temps — `/EmploiDuTemps`

**But** : consulter et **modifier à la main l'emploi du temps officiel**
(celui que voient enseignants, parents, élèves). C'est aussi la voie de la
**saisie 100 % manuelle** si on ne veut pas du générateur.

**Procédure (ajout / correction d'un créneau) :**

1. **+ Ajouter un créneau**.
2. Choisir **classe**, **matière**, **enseignant**.
3. Choisir le **créneau de la grille** (jour + plage). La **salle** est
   pré-remplie avec la salle attitrée de la classe ; on peut la changer.
4. Enregistrer. Les **conflits** de salle, d'enseignant et de classe sont
   détectés immédiatement.

**Quand l'utiliser :**

- corriger un détail après publication (un prof déplacé, une salle changée) ;
- gérer un établissement (souvent le primaire) où l'emploi du temps est simple
  et se fait plus vite à la main ;
- repartir de zéro sans passer par un scénario.

#### 5.7 Contrôle (règles MENET) — `/ControleEdt`

**But** : auditer l'emploi du temps **officiel** (ou un scénario) contre les
19 règles, et **régler le catalogue de contraintes**.

**Procédure :**

1. Ouvrir l'écran : filtrer par niveau ou par classe si besoin.
2. Lire le résumé : **`X conflit(s) bloquant(s), Y point(s) d'amélioration`**.
3. Déplier la liste : chaque violation indique la règle, la classe / le prof /
   le jour, et un message explicite.
4. **Corriger** : les bloquants via *Emplois du temps* (§5.6) ou en régénérant ;
   les points d'amélioration selon le temps disponible.
5. **« Régler les contraintes »** : pour chaque règle **souple**, activer /
   désactiver et **ajuster le poids**. Exemple : si l'établissement accepte les
   heures creuses des vacataires, baisser le poids de `TROUS_ENSEIGNANT` ; si on
   tient beaucoup à l'étalement, monter `REPARTITION_SEMAINE`.
   Les règles **dures** ne sont pas désactivables ; on peut seulement ajuster
   leurs **paramètres** (heures chaudes EPS, tolérance volume horaire,
   familles exemptées de « matière consécutive »…).

**Quand l'utiliser :** après chaque publication, et à chaque fois qu'on veut
adapter le moteur aux habitudes de l'établissement (les réglages sont
**conservés** — le re-seed ne les écrase pas).

#### 5.8 Conformité volume horaire — `/ConformiteEdt`

**But** : vue dédiée au **respect des volumes réglementaires** — pour chaque
classe et chaque matière, comparer *heures inscrites à l'emploi du temps* vs
*volume horaire prévu au niveau*.

**Procédure :** ouvrir l'écran, repérer les lignes en écart, corriger soit le
**volume** (*Volumes & séances*), soit l'**emploi du temps** (ajouter / retirer
une séance). C'est la version « tableau de bord » de la règle `VOLUME_HORAIRE`.

---

## 6. Ordre d'exécution recommandé

**Une fois par an, par établissement :**

```
1. Grille horaire            (semaine type : plages cours / récré / pause)
2. Salles                    (+ type + capacité)
3. Classes                   (salle attitrée + effectif)
4. Familles de matières      (Config. matières/niveaux)
5. Matières                  (type de salle requis + effort soutenu)
6. Volumes & séances         (volume → découpage en séances-types)
7. Affectations              (chaque (classe, matière) → un prof)
8. Groupes pédagogiques      (si LV2 / dédoublements)
9. Indisponibilités profs    (vacataires, temps partiels)
        │
10. Diagnostic               ── tout doit être vert ──
        │
11. Générer  → 2-3 scénarios → comparer les scores
12. Ajuster  → déplacer / verrouiller / régénérer
13. Contrôle (règles MENET)  → 0 conflit bloquant
14. Publier  → notification des enseignants
15. PDF      → diffusion
```

**En cours d'année :** corrections ponctuelles via *Emplois du temps* (§5.6) ;
re-contrôle via *Contrôle* (§5.7). Une régénération complète n'est utile qu'en
cas de refonte (changement de grille, arrivée de plusieurs enseignants…).

---

## 7. Cas concrets — groupe scolaire multi-cycles

**Le groupe primaire + collège + lycée = trois (ou quatre) établissements
distincts dans l'application** (bases séparées). La démarche des §5-6 se répète
**dans chacun**, avec ses propres salles, sa propre grille, ses propres profs.

| Situation | Réponse |
| --- | --- |
| Un prof enseigne au collège **et** au lycée (deux établissements) | Chaque établissement génère son EDT de son côté. Reporter le service de l'autre établissement en **indisponibilités bloquantes** dans celui où on génère, pour que le moteur laisse ces créneaux libres. |
| Le primaire n'a pas de contraintes complexes | Saisie manuelle via *Emplois du temps* — plus rapide que le générateur. Le *Contrôle* reste utile pour vérifier volumes et capacités. |
| Salles partagées entre cycles (un seul gymnase pour tout le groupe) | Idem : dans chaque établissement, bloquer par indisponibilité / retrait les créneaux où le gymnase sert à un autre cycle, ou se répartir des plages horaires distinctes. |
| Lycée avec séries (A, C, D…) | Le programme est filtré par `serie_id` : une matière peut avoir un volume différent selon la série. Le moteur en tient compte automatiquement via *Config. matières/niveaux → Séries*. |
| 6e / 5e avec beaucoup de matières « à effort soutenu » | Cocher « effort soutenu » sur ces matières ; la règle `PAS_5H_EFFORT` évite les journées épuisantes. |
| PC + SVT en quinzaine au collège | Fréquence « quinzaine » sur les séances-types ; le moteur alterne semaine A / B et peut les poser sur le **même créneau**. Vérifier ensuite `TANDEM_MEME_JOUR` au contrôle. |

---

## Voir aussi

- [Emploi du temps — Guide complet](emploi-du-temps-guide-complet.md) — le
  document de référence non technique (vocabulaire + parcours + situations).
- [Guide pas-à-pas](guide-generation-edt.md) — la checklist courte à imprimer.
- [Architecture du chantier EDT](chantier-emploi-du-temps.md) — pour les
  développeurs (modèles, services, routes, tests).
- [Plan détaillé Lot 0](chantier-edt-lot0.md) — paramétrage + matrice de
  non-régression.
