# Vérification de la fonctionnalité RGPD (roadmap 3.4)

> Document pratique, à suivre pas à pas — pour vérifier que la conformité RGPD livrée le 2026-08-16 fonctionne réellement, avant de la considérer opérationnelle en production.

---

## Sommaire

- [1. Prérequis](#1-prérequis)
- [2. Page publique de politique de confidentialité](#2-page-publique-de-politique-de-confidentialité)
- [3. Écran super-admin RGPD](#3-écran-super-admin-rgpd)
- [4. Durée de rétention configurable](#4-durée-de-rétention-configurable)
- [5. Anonymisation d'un élève ou d'un parent](#5-anonymisation-dun-élève-ou-dun-parent)
- [6. Suppression d'établissement renforcée](#6-suppression-détablissement-renforcée)
- [7. Chiffrement au repos en base de données](#7-chiffrement-au-repos-en-base-de-données)
- [8. Limites connues (volontaires)](#8-limites-connues-volontaires)

---

## 1. Prérequis

- Backend lancé (`php artisan serve`, port 8000 par défaut)
- Frontend lancé (`npm run dev`, port 5173 par défaut)
- Un compte super-admin valide
- Au moins un tenant de développement **jetable** (à ne pas confondre avec un établissement réel) pour les tests d'anonymisation et de suppression, irréversibles

---

## 2. Page publique de politique de confidentialité

- [ ] Ouvrir `http://localhost:5173/politique-confidentialite` **sans être connecté**
- [ ] La page s'affiche (pas d'erreur, pas de redirection vers le login)
- [ ] La section "Durée de conservation" affiche un nombre d'années (10 par défaut)
- [ ] Le lien "Confidentialité" dans le footer de la page d'accueil (`/`) pointe bien vers cette page

---

## 3. Écran super-admin RGPD

- [ ] Se connecter en super-admin (`/superadmin/login` ou `/backoffice`)
- [ ] Dans le menu latéral, l'entrée **RGPD & Conformité** est visible
- [ ] Elle mène à `/superadmin/rgpd` avec 3 blocs : durée de rétention, recherche + anonymisation, zone dangereuse (suppression)

---

## 4. Durée de rétention configurable

- [ ] Sur `/superadmin/rgpd`, changer la valeur (ex. 15 ans) et cliquer **Enregistrer**
- [ ] Message de succès affiché
- [ ] Recharger `/politique-confidentialite` dans un nouvel onglet → la nouvelle valeur (15 ans) doit apparaître
- [ ] Remettre la valeur d'origine (10 ans) une fois le test terminé

Si la valeur circule bien entre les deux écrans, la config passe correctement par `ConfigSaas` (DB centrale).

---

## 5. Anonymisation d'un élève ou d'un parent

⚠️ **Irréversible — à tester uniquement sur un élève/parent de données de test, jamais sur une vraie personne.**

- [ ] Dans le bloc "Droit à l'effacement", choisir un établissement de dev dans la liste
- [ ] Choisir le type ("Élève" ou "Parent")
- [ ] Taper un nom/matricule/numéro existant et cliquer **Rechercher**
- [ ] Les résultats s'affichent dans une liste
- [ ] Cliquer **Anonymiser** sur une fiche de test → confirmation demandée
- [ ] Confirmer → message de succès, la fiche disparaît des résultats
- [ ] Vérifier dans l'app normale (connecté en tant qu'admin de cet établissement) : ouvrir `/DetailsEleve/:id` de l'élève anonymisé → le nom doit être remplacé par "Anonymisé", l'adresse et la photo doivent être vides. Pour un parent, tenter une connexion avec son ancien numéro doit échouer (le numéro a été changé).

---

## 6. Suppression d'établissement renforcée

⚠️ **Irréversible — supprime toute la base de données du tenant. À ne tester que sur un tenant sacrifiable, recréable.**

- [ ] Dans la "Zone dangereuse", choisir un établissement de test
- [ ] Le bouton **Supprimer définitivement** reste désactivé tant que le code saisi ne correspond pas exactement au code affiché
- [ ] Taper le bon code → le bouton s'active → confirmation supplémentaire demandée avant l'action réelle

Ne pas aller plus loin dans ce test sauf besoin réel de vérifier la suppression effective — la base du tenant est détruite sans retour possible.

---

## 7. Chiffrement au repos en base de données

Ce point n'est pas visible depuis l'interface — il faut comparer la valeur affichée dans l'app à la valeur brute stockée en base. Deux façons de vérifier :

**Option A — demander une vérification assistée**
Demander à Claude de vérifier, via `php artisan tinker`, qu'une colonne comme `users.telephone` ou `etablissement.telephone` contient bien un blob chiffré illisible en base, alors que l'application continue d'afficher le numéro en clair normalement.

**Option B — vérification manuelle**
```bash
php artisan tinker --execute="
tenancy()->initialize(\App\Models\Tenant::find('<id-du-tenant>'));
echo \Illuminate\Support\Facades\DB::table('users')->whereNotNull('telephone')->first()->telephone;
"
```
Le résultat doit ressembler à un long texte encodé en base64 (illisible), **pas** à un numéro de téléphone classique. Si un numéro de téléphone est encore lisible en clair dans une colonne censée être chiffrée, il faut relancer `php artisan rgpd:chiffrer-donnees-existantes` (voir `docs/guide-deploiement.md` §9).

- [ ] `users.telephone` : blob chiffré en base, numéro lisible via l'app
- [ ] `etablissement.telephone` / `telephone2` : idem
- [ ] Une fiche santé élève remplie (`sante_eleves`) : tous les champs (allergies, groupe sanguin, etc.) illisibles en base brute

---

## 8. Limites connues (volontaires)

Ne pas s'étonner de ce qui suit — ce sont des choix de périmètre documentés, pas des oublis :

- `numero_parent` et `telephone_enseignant` restent **en clair** en base : ce sont des identifiants de connexion (recherche exacte + contrainte `UNIQUE`), les chiffrer casserait l'authentification sans un chantier séparé (index de recherche dédié)
- L'anonymisation d'un parent ne touche que sa fiche locale au tenant ; son profil `CentralUser` (identité partagée entre plusieurs établissements) n'est pas déprovisionné
