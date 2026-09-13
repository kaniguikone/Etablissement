# Emploi du temps — Guide complet

> Pour le directeur des études, le censeur, le responsable de la vie scolaire.
> **Aucune connaissance technique nécessaire.**
> Mis à jour le 2026-09-10.

Ce document a trois parties, à lire dans l'ordre la première fois :

1. **[Le vocabulaire](#partie-1--le-vocabulaire)** — tous les mots employés dans
   les écrans, définis simplement, avec un exemple.
2. **[Le parcours complet](#partie-2--le-parcours-complet)** — étape par étape,
   d'un établissement vide jusqu'à l'emploi du temps affiché aux enseignants.
3. **[Les situations concrètes](#partie-3--les-situations-concrètes)** — « et si… »
   les cas que vous rencontrerez vraiment, et quoi faire pour chacun.

Un [aide-mémoire](#partie-4--aide-mémoire) d'une page termine le document.

> Il existe deux autres documents : le [guide pas-à-pas](guide-generation-edt.md)
> (la même chose en plus court, à imprimer) et
> [« Comprendre la génération »](comprendre-generation-edt.md) (pour ceux qui
> veulent savoir comment l'outil calcule). **Celui-ci est le document de
> référence.**

---

## Partie 1 — Le vocabulaire

### Les briques de base

**Emploi du temps**
: L'ensemble des cours de la semaine, pour toutes les classes. Une fois
  *publié*, c'est lui que voient les enseignants, les parents et les élèves.

**Grille horaire**
: La description de la **semaine type** : à quelles heures il y a cours, à
  quelles heures il y a récréation, quand est la pause de midi. On la définit
  une fois par an. *Exemple : lundi — 7 h 30-8 h 25, 8 h 25-9 h 20, récréation
  9 h 20-9 h 35, 9 h 35-10 h 30…*

**Plage horaire**
: **Une case** de la grille. Chaque plage a un jour (ou « tous les jours »), une
  heure de début, une heure de fin, et un type : *cours*, *récréation* ou
  *pause de midi*. Seules les plages de type *cours* peuvent recevoir un cours.

**Créneau**
: **Un cours posé** dans l'emploi du temps : telle classe, telle matière, tel
  enseignant, telle salle, tel jour, telle heure. *Exemple : 6e A — Français —
  M. Koffi — Salle 12 — mardi 8 h 25.*

**Séance**
: Une occurrence de cours à placer. Une matière à 4 h par semaine, ce peut être
  4 séances d'1 h, ou 2 séances de 2 h. *Chaque séance deviendra un créneau.*

**Volume horaire**
: Le nombre d'heures par semaine qu'une matière doit avoir dans un niveau. C'est
  le volume **réglementaire** (fixé par le MENET). *Exemple : Mathématiques en
  3e = 4 h.*

**Découpage en séances**
: La façon de couper le volume horaire en morceaux. *Exemple : 4 h de Français =
  1 séance de 2 h + 2 séances d'1 h.* C'est vous qui décidez du découpage.

### Les matières

**Famille de matière**
: Le grand groupe auquel appartient une matière : *Français, Mathématiques,
  Histoire-Géographie, Physique-Chimie, SVT, EPS, Anglais, LV2, Philosophie…*
  La famille sert à appliquer les règles (l'EPS pas en milieu de journée,
  l'Histoire-Géo jamais deux heures de suite…) et à donner **une couleur** à la
  matière sur les grilles imprimées. **Chaque matière doit avoir une famille.**

**Type de salle requis**
: Certaines matières ont besoin d'une salle particulière : Physique-Chimie et
  SVT → **laboratoire**, EPS → **gymnase**, Informatique → **salle
  informatique**. Les autres matières se font dans la salle de la classe.

**Salle spécialisée**
: Une salle d'un type particulier : laboratoire, gymnase, salle informatique.
  Par opposition à une **salle banalisée** (salle de classe ordinaire).

**Effort soutenu**
: Une case à cocher sur les matières exigeantes (Maths, Français, sciences…).
  Sert en 6e et 5e à éviter de mettre trop d'heures « difficiles » à la suite
  dans une même journée.

**Tandem Physique-Chimie / SVT**
: Ces deux matières sont traditionnellement placées **le même jour** (souvent en
  alternance une semaine sur deux). L'outil essaie de respecter cette habitude.

### Les classes et les salles

**Salle attitrée**
: La salle **où une classe reste par défaut**. Le principe : ce sont les
  enseignants qui se déplacent, pas les élèves — sauf pour aller au labo, au
  gymnase ou en salle informatique. *Exemple : la 6e A est en salle 12 ; tous
  ses cours ont lieu en salle 12, sauf la SVT (labo) et l'EPS (gymnase).*
  **Chaque classe doit avoir une salle attitrée.**

**Effectif**
: Le nombre d'élèves de la classe. Comparé à la **capacité** (nombre de places)
  de la salle : une classe de 45 élèves ne peut pas aller dans une salle de 30.

### Les enseignants

**Affectation**
: Le lien **« cet enseignant enseigne cette matière à cette classe »**. Sans
  affectation, la matière ne sera pas placée : l'outil ne saurait pas qui la
  fait. *Exemple : Mme Diallo — Anglais — 4e B.*

**Indisponibilité bloquante**
: Un moment où un enseignant **ne peut absolument pas** faire cours (il est dans
  un autre établissement, temps partiel, etc.). L'outil n'y placera **jamais**
  un de ses cours.

**Indisponibilité « préférence »**
: Un moment que l'enseignant **préférerait éviter**, sans que ce soit
  impossible. L'outil essaiera de l'éviter, mais pourra passer outre si
  nécessaire.

### Les cas particuliers

**Groupe pédagogique**
: Quand une classe **se divise** pour une matière. *Exemple : en 4e, une moitié
  fait Allemand en LV2, l'autre fait Espagnol — deux groupes, deux salles, deux
  professeurs, au même moment.*

**Code parallèle**
: L'étiquette qui dit **quels groupes se déroulent en même temps**. Les groupes
  qui portent le même code parallèle sont placés sur le **même créneau** (la
  classe se sépare et se retrouve à la même heure). *Exemple : les groupes
  « Allemand » et « Espagnol » portent tous deux le code « LV2 ».*

**Quinzaine (semaine A / semaine B)**
: Une matière faite **une semaine sur deux**. *Exemple : Physique-Chimie la
  semaine A, SVT la semaine B, sur le même créneau.* Les deux ne se gênent pas
  puisqu'elles n'ont jamais lieu la même semaine.

### La génération automatique

**Générer**
: Demander à l'outil de **proposer** un emploi du temps complet à partir de tout
  ce que vous avez saisi.

**Scénario (ou proposition)**
: Le résultat d'une génération. **Un scénario n'est pas l'emploi du temps
  officiel** : c'est un brouillon rangé à part. Vous pouvez en produire
  plusieurs, les comparer, les jeter. Rien ne change pour les enseignants tant
  que vous n'avez pas **publié**.

**Contrainte dure (ou bloquante)**
: Une règle qu'il est **interdit** d'enfreindre : deux cours pour le même
  enseignant à la même heure, une classe à deux endroits, l'EPS en pleine
  chaleur… Un scénario qui viole une contrainte dure doit être corrigé avant
  publication.

**Contrainte souple**
: Une règle de **confort** : limiter les heures creuses des profs, équilibrer
  les journées, étaler une matière sur la semaine. On peut l'enfreindre un peu ;
  chaque écart « coûte des points ».

**Score**
: Une note qui mesure la **qualité** d'un scénario. **Plus le score est bas,
  mieux c'est.** Un score **inférieur à 1000** signifie : toutes les séances
  sont placées et il n'y a aucun conflit bloquant. Le score sert surtout à
  **comparer** plusieurs scénarios entre eux.

**Diagnostic**
: Un écran qui vérifie, **avant de générer**, que rien ne manque dans votre
  paramétrage (une classe sans salle, une matière sans famille, un cours sans
  enseignant…). Tant qu'il n'est pas « tout vert », inutile de générer.

**Verrouiller** 🔒
: Marquer un cours d'un scénario comme **« celui-ci me convient, n'y touche
  plus »**. Utile avant de régénérer.

**Régénérer**
: Relancer une proposition **en gardant les cours verrouillés** et en
  recalculant tout le reste.

**Publier**
: **Rendre officiel** un scénario. À ce moment : l'ancien emploi du temps est
  archivé, le nouveau prend sa place, et **tous les enseignants concernés
  reçoivent une notification**.

**Archive**
: Un ancien emploi du temps mis de côté. On peut le republier pour revenir en
  arrière.

---

## Partie 2 — Le parcours complet

> **Point de départ.** L'établissement est créé. Les niveaux, les classes, les
> matières, les élèves et les enseignants sont déjà saisis. Il reste à préparer
> et générer l'emploi du temps. Faites les étapes **dans l'ordre**.
>
> Tout se trouve dans le menu latéral, principalement dans le groupe
> **« Emploi du temps »** (plus quelques écrans dans **« Paramétrage »** et
> **« Enseignants »**).

### Étape 1 — Décrire la semaine

**Où :** Emploi du temps → **Grille horaire**

**Ce que vous faites :** vous saisissez, pour chaque jour ouvré, la succession
des plages : les heures de cours, les récréations, la pause de midi.

**Comment :** ajoutez les plages dans l'ordre. Pour chacune : un libellé
(« M1 », « 8 h »), le type (*cours*, *récréation*, *pause de midi*), l'heure de
début et l'heure de fin. Le bouton **« Recopier un jour »** duplique une journée
type vers les autres jours — ensuite vous ajustez (mercredi plus court, samedi
matin seulement…).

**Conseils :**
- des plages de cours de **durée régulière** (environ 55 min) : l'outil comprend
  alors qu'un cours de 2 h occupe deux plages ;
- prévoyez des plages **tôt le matin et en fin d'après-midi** si vous avez de
  l'EPS (elle ne peut pas se placer entre 10 h et 16 h) ;
- les récréations et la pause de midi créent les coupures qui empêchent
  d'enchaîner deux heures « collées ».

**C'est bon quand :** vous avez au moins une journée complète décrite, recopiée
et ajustée sur tous les jours.

### Étape 2 — Déclarer les salles

**Où :** Paramétrage → **Salles**

**Ce que vous faites :** vous créez **toutes** les salles réellement
disponibles.

**Comment :** pour chaque salle : un nom (« Salle 12 », « Labo SVT »), un
**type** (*classe*, *laboratoire*, *salle informatique*, *gymnase*, *autre*) et
une **capacité** (nombre de places).

**Attention :** le type est déterminant. S'il n'y a **qu'un seul laboratoire**
et six classes qui ont Physique-Chimie et SVT, l'outil ne pourra pas tout mettre
aux mêmes heures.

**C'est bon quand :** toutes vos salles sont là, avec le bon type et la bonne
capacité.

### Étape 3 — Donner une salle à chaque classe

**Où :** Paramétrage → **Classes** → fiche de chaque classe

**Ce que vous faites :** vous indiquez la **salle attitrée** de la classe et son
**effectif**.

**Pourquoi :** l'outil y placera tous les cours de la classe, sauf ceux qui
demandent un labo, le gymnase ou la salle informatique. Sans salle attitrée, les
cours ordinaires ressortent **sans salle**.

**C'est bon quand :** aucune classe n'est sans salle attitrée.

### Étape 4 — Ranger les matières par famille

**Où :** Paramétrage → **Matières** → ouvrez la fiche de chaque matière
(champ **Famille**, tout en bas du formulaire)

**Ce que vous faites :** vous attribuez une **famille** à chaque matière
(Français, Maths, Histoire-Géographie, Physique-Chimie, SVT, EPS, Anglais,
LV2…), **une matière à la fois** — il n'existe pas d'écran pour le faire en
une seule fois pour toutes les matières.

**Pourquoi :** c'est la famille qui porte les règles (EPS hors heures chaudes,
Histoire-Géo jamais deux heures de suite, tandem PC/SVT) et la couleur sur les
grilles imprimées.

**C'est bon quand :** aucune matière n'est « sans famille ».

### Étape 5 — Préciser les matières particulières

**Où :** Paramétrage → **Matières** → fiche de la matière

**Ce que vous faites :** sur les matières concernées, vous indiquez le **type de
salle requis** (labo pour PC et SVT, gymnase pour l'EPS, salle informatique pour
les TIC) et cochez **« effort soutenu »** pour les matières exigeantes.

**C'est bon quand :** les sciences, l'EPS et l'informatique pointent vers le bon
type de salle.

### Étape 6 — Définir le poids des matières et les découper en séances

**Où :** Paramétrage → **Volumes & séances**

**Ce que vous faites, niveau par niveau :**
1. vous saisissez le **volume horaire** de chaque matière (heures par semaine) ;
2. vous **découpez** ce volume en séances : le bouton **« Pré-remplir depuis les
   volumes »** crée des séances d'1 h, que vous ajustez ensuite (séances de 2 h
   pour le Français ou les Maths, quinzaine pour PC/SVT au collège…).

**Repère :** un badge affiche *« 4 h 50 placées / 4 h prévues »*. Visez
l'égalité.

**Important :** c'est cet écran qui dit à l'outil **combien de cours il doit
placer**. Une matière sans volume et sans séance ne génère rien.

**C'est bon quand :** chaque matière du programme a un volume et un découpage
cohérent.

### Étape 7 — Dire qui enseigne quoi

**Où :** Enseignants → fiche de l'enseignant → **Affectations** (ou la fiche de
la classe)

**Ce que vous faites :** pour **chaque couple (classe, matière)**, vous
désignez l'enseignant.

**Pourquoi :** une matière sans enseignant affecté **ne sera pas placée** et
apparaîtra dans les anomalies.

**C'est bon quand :** le diagnostic (étape 10) ne signale « aucune matière sans
enseignant ».

### Étape 8 — Déclarer les groupes *(seulement si nécessaire)*

**Où :** Emploi du temps → **Groupes pédagogiques**

**Quand :** dès qu'une classe **se divise** pour une matière — LV2 Allemand /
Espagnol, dédoublement de langue ou de sciences, options.

**Ce que vous faites :** vous choisissez le niveau et la classe, puis vous
déclarez chaque groupe : un **code parallèle** commun aux groupes simultanés
(ex. « LV2 »), un libellé (« Allemand »), la matière, l'enseignant, l'effectif,
le nombre de séances par semaine, la fréquence (chaque semaine, ou semaine A / B).

**À retenir :** les groupes de **même code parallèle** sont placés **au même
créneau**. Si vous mettez des codes différents, ils ne seront pas synchronisés.

**C'est bon quand :** chaque groupe a un enseignant et le bon code parallèle.

### Étape 9 — Noter les indisponibilités

**Où :** Emploi du temps → **Indisponibilités profs**

**Ce que vous faites :** pour les vacataires et les temps partiels, vous ajoutez
les créneaux où ils ne peuvent pas : jour + intervalle horaire, type
**« bloquant »** (impossible) ou **« préférence »** (à éviter), et un motif.

**Conseil :** restez sobre. Trop d'indisponibilités « bloquantes » rendent le
problème insoluble. Réservez « bloquant » aux vraies impossibilités.

**C'est bon quand :** les contraintes de service connues sont saisies.

### Étape 10 — Vérifier que tout est prêt

**Où :** Emploi du temps → **Diagnostic**

**Ce que vous faites :** vous ouvrez l'écran et vous regardez les 8 points :
grille horaire, familles de matières, salles attitrées, capacité des salles,
affectations, découpage en séances, groupes, indisponibilités.

Chaque point **rouge** dit précisément ce qui manque et renvoie vers l'écran à
corriger. Corrigez, puis rechargez.

**C'est bon quand :** **tout est vert.** Ne générez pas avant.

### Étape 11 — Lancer une première proposition

**Où :** Emploi du temps → **Générer les EDT**

**Ce que vous faites :** vous donnez un nom au scénario (« Scénario 1 »), vous
cochez les jours ouvrés (lundi à vendredi par défaut, ajoutez samedi si besoin),
et vous cliquez **« Générer »**. Quelques secondes plus tard, la proposition
s'affiche.

### Étape 12 — Lire la proposition

Regardez, dans l'encadré du résultat :

- le **score** (plus bas = mieux) ;
- **« X / Y séances placées »** : si X < Y, certaines n'ont pas pu être posées ;
- le bandeau **vert** (« 0 conflit bloquant ») ou **rouge** ;
- les bandeaux jaunes : *séances non placées*, *matières sans enseignant* —
  dépliez « Détail des anomalies » pour la liste exacte ;
- **« N remarques du contrôle »** : chaque point à revoir, en rouge (bloquant)
  ou jaune (confort) ;
- l'**aperçu d'une classe** : choisissez une classe pour voir sa grille en
  couleur.

### Étape 13 — Retoucher et relancer

**Trois outils, dans l'aperçu :**

- **Déplacer un cours** : cliquez dessus → changez le jour ou le créneau. Si le
  déplacement crée un conflit, l'outil vous prévient.
- **Verrouiller** 🔒 les parties qui vous conviennent, puis
  **« Régénérer (garder les verrouillés) »** : l'outil recalcule le reste
  autour.
- **Comparer** : générez 2 ou 3 scénarios (chaque génération donne un résultat
  un peu différent) ; le tableau du bas affiche leurs scores. Gardez le
  meilleur, supprimez les autres.

Répétez jusqu'à un scénario satisfaisant : **0 séance non placée, 0 conflit
bloquant.**

### Étape 14 — Vérifier la conformité aux règles

**Où :** Emploi du temps → **Contrôle (règles MENET)**

**Ce que vous faites :** vous lisez « X conflits bloquants, Y points
d'amélioration ». Dépliez la liste : chaque ligne dit quelle classe, quel prof,
quel jour. Corrigez les bloquants (en déplaçant un cours ou en régénérant).

Vous pouvez aussi, dans **« Régler les contraintes »**, activer/désactiver les
règles de confort et ajuster leur importance selon les habitudes de
l'établissement.

### Étape 15 — Publier

**Où :** Emploi du temps → **Générer les EDT** → **« Publier ce scénario »**

**Ce qui se passe :** l'ancien emploi du temps est archivé, le scénario devient
l'**emploi du temps officiel** (visible des enseignants, parents, élèves), et
**tous les enseignants concernés reçoivent une notification**.

### Étape 16 — Imprimer et diffuser

**Où :** dans le même écran, boutons **PDF**.

- **PDF — toutes les classes** : une page par classe, en couleur.
- **PDF — <classe>** : la classe affichée.
- Des exports par enseignant et par salle existent également.

---

## Partie 3 — Les situations concrètes

### A. Le tout premier emploi du temps de l'année

Suivez les 16 étapes de la Partie 2 dans l'ordre. Comptez une demi-journée de
saisie la première année (grille, salles, volumes, affectations), puis quelques
minutes pour générer et ajuster. Les années suivantes, l'essentiel est déjà là :
il suffit de revoir les affectations et les indisponibilités, puis de générer.

### B. Un enseignant vacataire qui ne vient que le mardi et le jeudi

1. Emploi du temps → **Indisponibilités profs** → sélectionnez l'enseignant.
2. Ajoutez une indisponibilité **bloquante** pour **lundi**, une pour
   **mercredi**, une pour **vendredi** (journée entière).
3. Générez : l'outil ne placera ses cours que le mardi et le jeudi.

> S'il enseigne aussi dans un autre établissement du groupe, saisissez de la
> même façon les demi-journées où il y est.

### C. Une 4e qui se partage en LV2 Allemand / Espagnol

1. Emploi du temps → **Groupes pédagogiques** → niveau 4e → la classe.
2. Créez le groupe **« Allemand »** : code parallèle `LV2`, matière Allemand,
   l'enseignant, l'effectif, 2 séances/semaine.
3. Créez le groupe **« Espagnol »** : **même code parallèle `LV2`**, matière
   Espagnol, l'autre enseignant.
4. Générez : les deux groupes seront placés **à la même heure**, dans deux
   salles différentes, et la classe n'aura aucun autre cours à ce moment-là.

### D. Physique-Chimie et SVT en quinzaine en 5e

1. Paramétrage → **Volumes & séances** → niveau 5e.
2. Sur la Physique-Chimie : une séance d'1 h, fréquence **quinzaine**.
3. Sur la SVT : une séance d'1 h, fréquence **quinzaine**.
4. Générez : l'outil met PC en semaine A et SVT en semaine B, **sur le même
   créneau**. Vérifiez ensuite au **Contrôle** que le tandem PC/SVT tombe bien
   le même jour.

### E. « Le système n'a pas réussi à tout placer »

Le scénario affiche « 210 / 218 séances placées » et une liste de séances non
placées. Causes possibles, de la plus fréquente à la plus rare :

| Cause | Vérification | Correction |
| --- | --- | --- |
| Pas assez de plages dans la grille | La grille couvre-t-elle assez d'heures ? | Ajoutez des plages de cours (matin tôt, fin d'après-midi) |
| Trop peu de salles de labo | Combien de labos pour combien de classes de sciences ? | Créez une salle, ou étalez les sciences sur plus de jours |
| Trop d'indisponibilités bloquantes | Un prof a-t-il presque toute sa semaine bloquée ? | Passez certaines en « préférence » |
| EPS impossible à caser | Y a-t-il des plages avant 10 h ou après 16 h ? | Ajoutez des plages en dehors des heures chaudes |
| Volume horaire trop lourd | Le badge « X h placées / Y h prévues » dépasse la capacité de la semaine | Revoyez les volumes, ou ajoutez des jours |

Corrigez, puis **régénérez**.

### F. Comparer plusieurs propositions et choisir

1. Générez **« Scénario 1 »**. Notez son score et ses anomalies.
2. Générez **« Scénario 2 »**, puis **« Scénario 3 »** (bouton « Générer » à
   nouveau — le résultat change à chaque fois).
3. Dans le tableau **« Scénarios »** en bas, comparez les scores.
4. Cliquez **« Voir »** sur le meilleur, examinez l'aperçu classe par classe.
5. Supprimez (✕) les scénarios que vous ne gardez pas.
6. Retouchez le scénario retenu, puis publiez-le.

### G. Après la rentrée : un enseignant s'en va, il faut décaler ses cours

L'emploi du temps est déjà publié. Deux options :

- **Correction ciblée** (recommandé pour quelques cours) : Emploi du temps →
  **Emplois du temps** → ouvrez le créneau concerné → changez l'enseignant ou
  déplacez-le. Les conflits sont vérifiés à l'enregistrement.
- **Refonte** (si beaucoup de cours sont touchés) : mettez à jour les
  **affectations** et les **indisponibilités**, générez un nouveau scénario,
  **verrouillez** tout ce qui ne doit pas bouger, régénérez, puis publiez.

### H. Après la rentrée : changer une salle

Emploi du temps → **Emplois du temps** → ouvrez le créneau → changez la salle →
enregistrez. Si la salle est déjà occupée à ce moment, l'outil vous le signale.

### I. Un groupe scolaire : primaire + collège + lycée

Dans l'application, **le primaire, le collège et le lycée sont trois
établissements séparés** (chacun sa propre base). Vous faites **la démarche
complète dans chacun**, avec ses salles, sa grille, ses enseignants.

Points d'attention :
- **Enseignant partagé collège/lycée** : dans l'établissement où vous générez,
  saisissez en **indisponibilité bloquante** les demi-journées où il est dans
  l'autre. Répétez dans l'autre sens.
- **Gymnase ou salle unique pour tout le groupe** : répartissez des plages
  horaires distinctes entre cycles, ou bloquez par indisponibilité les moments
  où la salle sert ailleurs.

### J. Le primaire : je préfère saisir à la main

Le primaire a souvent un emploi du temps simple (un maître par classe). Dans ce
cas, la génération automatique n'apporte pas grand-chose.

Emploi du temps → **Emplois du temps** → **+ Ajouter un créneau** : choisissez
classe, matière, enseignant, créneau (la salle attitrée est pré-remplie). Vous
construisez l'emploi du temps case par case. Le **Contrôle** et la **Conformité
volume horaire** restent utiles pour vérifier.

### K. Un lycée avec séries (A, C, D…)

Une matière peut avoir un volume différent selon la série (Maths plus lourdes en
C qu'en A). Cela se règle dans Paramétrage → **Config. matières/niveaux** en
associant les volumes aux **séries**. L'outil applique alors le bon programme à
chaque classe selon sa série, sans réglage supplémentaire au moment de générer.

### L. Adapter les règles aux habitudes de l'établissement

Emploi du temps → **Contrôle (règles MENET)** → **« Régler les contraintes »**.

- Vous acceptez les heures creuses des vacataires ? Baissez l'importance de
  « Limiter les heures creuses des enseignants », ou désactivez-la.
- Vous tenez à ce qu'une matière soit étalée sur la semaine ? Montez
  l'importance de « Répartir les heures d'une matière ».
- Vos créneaux d'EPS vont de 6 h 30 à 11 h ? Ajustez les heures chaudes de la
  règle EPS.

Les règles **bloquantes** (conflits de salle, d'enseignant, de classe…) ne se
désactivent pas. Vos réglages sont **conservés** d'une année sur l'autre.

### M. Refonte complète en cours d'année

Vous changez la grille horaire, ou plusieurs enseignants arrivent. Reprenez le
parcours à partir de l'étape concernée (grille, affectations…), relancez un
**Diagnostic**, générez un nouveau scénario, comparez-le à l'existant, puis
publiez. L'ancien emploi du temps est automatiquement archivé — vous pouvez y
revenir si besoin.

---

## Partie 4 — Aide-mémoire

### L'ordre des opérations

```
PRÉPARER (une fois par an, par établissement)
 1. Grille horaire           Emploi du temps → Grille horaire
 2. Salles                   Paramétrage → Salles
 3. Salle attitrée + effectif Paramétrage → Classes
 4. Familles de matières     Paramétrage → Matières → fiche de chaque matière
 5. Matières particulières   Paramétrage → Matières → fiche de chaque matière
 6. Volumes & séances        Paramétrage → Volumes & séances
 7. Affectations             Enseignants → Affectations
 8. Groupes (si LV2/dédoubl.) Emploi du temps → Groupes pédagogiques
 9. Indisponibilités         Emploi du temps → Indisponibilités profs

VÉRIFIER
10. Diagnostic               → tout doit être vert

GÉNÉRER
11. Générer 2-3 scénarios    Emploi du temps → Générer les EDT
12. Lire (score, anomalies, aperçu)
13. Ajuster (déplacer / verrouiller / régénérer)

CONTRÔLER ET PUBLIER
14. Contrôle (règles MENET)  → 0 conflit bloquant
15. Publier                  → notification des enseignants
16. PDF                      → diffusion
```

### En cas de problème

| Ce que vous voyez | Ce que ça veut dire | Ce que vous faites |
| --- | --- | --- |
| « X matière(s) sans enseignant » | Une affectation manque | Enseignants → Affectations |
| « X séance(s) non placée(s) » | Pas assez de place (créneaux, salles) | Ajoutez des plages / des salles ; allégez les indisponibilités (voir situation E) |
| Score élevé (> 1000) | Séances non placées ou conflits bloquants | Regardez les anomalies et le contrôle du scénario |
| EPS non placée | Pas de plage avant 10 h ni après 16 h | Ajoutez des plages tôt le matin ou en fin de journée |
| Groupes LV2 pas ensemble | Codes parallèles différents | Mettez le **même** code parallèle |
| Cours sans salle | Pas de salle attitrée, ou trop peu de salles | Renseignez la salle attitrée des classes |
| Un déplacement « crée un conflit » | Le créneau visé est déjà pris | Choisissez un autre créneau, ou acceptez et corrigez l'autre cours |

### Les trois documents

| Document | Pour quoi | Pour qui |
| --- | --- | --- |
| **Ce guide** | Comprendre et appliquer, avec le vocabulaire | Directeur des études, censeur |
| [Guide pas-à-pas](guide-generation-edt.md) | La checklist courte, à imprimer | Sur le bureau pendant la saisie |
| [Comprendre la génération](comprendre-generation-edt.md) | Comment l'outil calcule, ce qui est paramétrable | Curieux, informaticien de l'établissement |
