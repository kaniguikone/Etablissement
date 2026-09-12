# Guide de tests de bout en bout et de démonstration client

> Document pratique, à suivre pas à pas — pour vérifier que tout fonctionne avant une démonstration, et pour dérouler une démo cohérente devant un client sans mauvaise surprise.

---

## Sommaire

- [1. Checklist rapide avant une démo (10 min)](#1-checklist-rapide-avant-une-démo-10-min)
- [2. Points de vigilance connus](#2-points-de-vigilance-connus)
- [3. Parcours back-office administrateur (web)](#3-parcours-back-office-administrateur-web)
- [4. Parcours portail parent (mobile)](#4-parcours-portail-parent-mobile)
- [5. Parcours portail enseignant (mobile)](#5-parcours-portail-enseignant-mobile)
- [6. Parcours super-admin / commercial (web)](#6-parcours-super-admin--commercial-web)
- [7. Si quelque chose casse pendant la démo](#7-si-quelque-chose-casse-pendant-la-démo)

---

## 1. Checklist rapide avant une démo (10 min)

À faire **la veille** et **30 minutes avant** le rendez-vous.

### La veille
- [ ] Le serveur backend répond (`https://votre-instance.../api/etablissement` renvoie du JSON, pas une erreur 500)
- [ ] Le front est à jour (dernier `npm run build` déployé, pas une version cassée en cours de dev)
- [ ] L'établissement de démo a des données **cohérentes et présentables** : élèves avec photo (pas d'icône cassée), notes saisies sur la période en cours, au moins un bulletin publié, quelques paiements enregistrés avec reçus
- [ ] Sur le téléphone qui servira à la démo mobile : ouvrir un bulletin PDF et un reçu de paiement **au moins une fois** pour vérifier qu'une visionneuse PDF réagit correctement (voir [point de vigilance Android](#21-ouverture-des-pdf-sur-mobile-android))
- [ ] Le compte de démonstration (admin + parent + enseignant) a un mot de passe que vous connaissez par cœur — ne pas chercher un mot de passe en direct devant le client

### 30 minutes avant
- [ ] Connexion internet stable (éviter le partage de connexion 4G si possible pour la partie mobile — CinetPay et les téléchargements PDF ont besoin d'une connexion correcte)
- [ ] Fermer les onglets/apps qui pourraient afficher des données d'un autre établissement ou des écrans de debug
- [ ] Avoir ce document ouvert sur un second écran ou imprimé, pour suivre l'ordre du script sans redémarrer à chaque hésitation

---

## 2. Points de vigilance connus

Issus des audits techniques successifs — à connaître pour ne pas être surpris en direct.

### 2.1 Ouverture des PDF sur mobile (Android)
Le correctif d'ouverture de PDF (bulletins, reçus) a été testé et confirmé sur un émulateur Android 11+. **Testez quand même sur le téléphone physique qui servira à la démo** avant le rendez-vous (section 1) : le comportement dépend des applications de visionnage PDF installées sur cet appareil précis (Chrome, Google Drive, Adobe Acrobat...). Si aucune app ne propose d'ouvrir le PDF, installez Google Drive ou Adobe Acrobat au préalable.

### 2.2 Premier chargement d'une page (web)
Le frontend charge désormais chaque page à la demande (code-splitting, ajouté pour réduire le temps de chargement initial). **Conséquence en démo** : la toute première fois que vous ouvrez un écran donné dans la session, un très bref indicateur de chargement (spinner) peut apparaître avant l'affichage — normal, pas un bug. Naviguer une fois vers chaque écran que vous comptez montrer, juste avant le rendez-vous, "réchauffe" le cache du navigateur et évite ce petit délai devant le client.

### 2.3 Module "Inscriptions" masqué
Le menu **Inscriptions** (demande d'inscription en ligne par un parent) existe dans le code mais n'est pas affiché dans la navigation actuelle — ne pas essayer de le montrer, il n'est pas accessible depuis l'interface. Pour un scénario d'inscription, utilisez l'ajout manuel d'élève ou l'import Excel.

### 2.4 Emails et paiement CinetPay
Le SMTP et les clés CinetPay sont configurés dans cet environnement. Avant la démo, envoyez-vous un email de test (ex. déclencher une "relance impayés" ou publier un bulletin) et faites un paiement CinetPay en mode sandbox si possible, pour confirmer que rien n'a expiré côté fournisseur (clé API, quota).

### 2.5 Export Stats Générales sur un gros établissement
Cet export a été identifié comme lent sur un établissement de grande taille (timeout augmenté à 120s, mais reste le plus lourd de l'application). Si vous devez le montrer, testez-le au préalable avec les données réelles de démo pour connaître le temps d'attente exact et pouvoir meubler ("le rapport MENET calcule 14 sections sur tout l'établissement, ça prend quelques secondes").

### 2.6 Élève sans photo
Un élève sans photo uploadée affiche une icône cassée dans certains écrans (bug mineur connu, sans impact fonctionnel). Uploadez une photo (même générique) pour chaque élève que vous comptez montrer en démo.

---

## 3. Parcours back-office administrateur (web)

*Connexion : `https://[votre-etablissement].[domaine]` avec le compte administrateur.*

### 3.1 Connexion et tableau de bord
1. Se connecter → vérifier que le tableau de bord (`/accueil`) affiche des chiffres cohérents (effectifs, taux de paiement, absences récentes)
2. ✅ Attendu : chargement en moins de 2 secondes, pas d'erreur réseau

### 3.2 Paramétrage établissement
1. *Menu : Paramétrage → Établissement*
2. Vérifier logo, nom, type d'établissement affichés correctement
3. ✅ Bon exemple de discours : "le type d'établissement détermine automatiquement le pré-remplissage pédagogique à la création"

### 3.3 Ajouter un élève (manuel)
1. *Menu : Élèves → Ajouter un élève*
2. Remplir nom, prénoms, date de naissance, classe → Enregistrer
3. ✅ Attendu : redirection vers la liste, le nouvel élève apparaît immédiatement

### 3.4 Import Excel en masse (argument de vente fort)
1. *Menu : Élèves → Liste des élèves → bouton Import*
2. Télécharger le modèle, montrer les colonnes pré-formatées et les listes déroulantes
3. Importer un petit fichier de test (2-3 lignes préparées à l'avance, **pas improvisé en direct** — un import raté devant un client casse la démo)
4. ✅ Attendu : message "X élève(s) importé(s)", nouveaux élèves visibles dans la liste

### 3.5 Saisir des notes et générer un bulletin
1. *Menu : Pédagogie → Devoirs / Notes* → créer un devoir ou ouvrir un devoir existant → **Saisir les notes**
2. *Menu : Pilotage pédagogique → Bulletins* → sélectionner l'élève noté → **Voir le bulletin**
3. Télécharger le PDF, montrer les appréciations par matière
4. ✅ Attendu : PDF généré en quelques secondes, mise en page propre avec logo de l'établissement

### 3.6 Encaisser un paiement et éditer le reçu
1. *Menu : Caisse → Nouveau paiement* → sélectionner un élève, saisir un montant → Enregistrer
2. Télécharger le reçu PDF généré automatiquement
3. ✅ Attendu : reçu PDF avec montant, mode de paiement, numéro de reçu

### 3.7 Export comptable (pour un profil comptable/financier)
1. *Menu : Finances → Export comptable*
2. Montrer l'aperçu, puis générer l'Excel OHADA (3 feuilles) ou le FEC CSV
3. ✅ Bon argument : "zéro ressaisie, le fichier s'importe directement dans SAGE"

---

## 4. Parcours portail parent (mobile)

*Connexion : ouvrir l'app → écran de connexion unique (numéro de téléphone + mot de passe du compte de démo). Aucune sélection d'établissement préalable n'est demandée — la reconnaissance se fait automatiquement à la connexion.*

### 4.1 Connexion et sélection de l'enfant
1. Se connecter → écran "Mes enfants"
2. Sélectionner un enfant avec des données complètes (photo, notes, paiements)

> **Argument de vente** : si le parent a des enfants dans plusieurs établissements de la plateforme, ils apparaissent tous dans "Mes enfants" en une seule connexion, sans manipulation supplémentaire — le choix d'établissement lui est totalement transparent.

### 4.2 Notes et bulletin
1. **Notes & Bulletin** → montrer les notes par matière
2. Télécharger le bulletin PDF → vérifier qu'une visionneuse s'ouvre (voir [point de vigilance 2.1](#21-ouverture-des-pdf-sur-mobile-android))

### 4.3 Scolarités, frais annexes et reçu de paiement
1. Ouvrir la tuile **Scolarités & Frais** → onglet **Scolarités** (sous-onglets **Échéances** — versements à venir, bouton **Payer en ligne** qui ouvre CinetPay — et **Paiements**, historique)
2. Onglet **Frais annexes** : même principe pour les frais complémentaires (tenue, manuels, examens…), avec ses propres sous-onglets Frais/Paiements
3. Télécharger un reçu PDF → même vérification que ci-dessus
4. Si vous démontrez un paiement en direct : utiliser le mode sandbox CinetPay (voir [2.4](#24-emails-et-paiement-cinetpay)) pour ne pas engager de fonds réels, et prévoir de revenir dans l'app taper **Vérifier** après le paiement (pas de retour automatique dans l'app, le navigateur externe affiche la page de confirmation web).

### 4.4 Autres écrans utiles selon le profil du client
- **Assiduité** : historique des absences/retards avec notification automatique
- **Emploi du temps** : vue personnelle de l'enfant

> Les tuiles Messages et Rendez-vous ont été retirées du tableau de bord élève (portail parent) — ne pas les chercher en démo mobile côté parent. Sans impact côté enseignant, qui garde ses propres onglets Messages et RDV.

---

## 5. Parcours portail enseignant (mobile)

*Connexion : ouvrir l'app → écran de connexion unique (même écran que le parent) → numéro de téléphone + mot de passe.*

1. Si l'enseignant enseigne dans **plusieurs établissements** de la plateforme, un écran "Choisissez votre établissement" s'affiche juste après la connexion — il sélectionne celui qu'il veut consulter. *Argument de vente* : une seule identité, un seul mot de passe, quel que soit le nombre d'écoles. Il peut changer d'établissement à tout moment via l'icône ⇄ dans la barre du haut (les données de l'onglet actif se rechargent automatiquement).
2. **Tableau de bord** : classes du jour, devoirs à venir
3. **Devoirs** → saisir des notes pour une classe → *argument fort* : mentionner que la saisie fonctionne aussi **hors connexion**, avec synchronisation automatique au retour du réseau (pertinent pour les zones à connectivité instable)
4. **Présence** → faire l'appel pour une séance
5. **Emploi du temps** : vue personnelle

---

## 6. Parcours super-admin / commercial (web)

*Pertinent si le client est un groupe scolaire ou si vous démontrez le processus commercial.*

1. Page d'accueil publique (`/`) : présentation, tarifs indicatifs, bouton "Demander un accès"
2. Soumettre une demande d'accès test (`/inscription-etablissement`)
3. Se connecter en super-admin (`/backoffice`) → *Menu superadmin → Demandes d'accès* → traiter la demande
4. *Menu superadmin → Tarifs & Licences* : montrer le simulateur de coût

---

## 7. Si quelque chose casse pendant la démo

- **Ne cherchez pas à déboguer en direct devant le client.** Passez à l'écran suivant du script, revenez-y plus tard si le temps le permet.
- Ayez toujours un **deuxième scénario de repli** prêt (ex. si l'import Excel échoue, montrez un élève déjà présent dans les données au lieu d'en importer un nouveau en direct).
- Si le mobile refuse d'ouvrir un PDF : proposez de le montrer depuis le web (même document, bouton téléchargement classique) — le contenu compte plus que le support à ce moment-là.
- Notez l'incident après coup (quel écran, quelle action, quel message d'erreur) pour investigation — ne perdez pas cette information une fois le stress de la démo retombé.

---

*Ce document est un complément pratique à `guide-administrateur.md` (référence fonctionnelle complète) et `audit-tests-2026-08-14.md` (détail technique des correctifs). À mettre à jour au fil des démos si de nouveaux points de vigilance apparaissent.*
