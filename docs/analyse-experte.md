# Analyse experte — Application de gestion scolaire

> Analyse réalisée le 2026-04-30

> ⚠️ **Instantané figé, désormais daté.** Ce document décrit l'état du produit au 30/04/2026 et n'a pas vocation à être mis à jour en continu — c'est une photographie, pas un tableau de suivi (voir `roadmap-commerciale.md` pour le statut courant). Statut réel au 2026-08-16 des points listés ci-dessous comme « manquants » :
> - ✅ **Livré depuis** : #1 Appréciations enseignants, #3 Décisions conseil de classe, #4 Journal d'audit, #5 Relevé de notes annuel PDF, #6 Mode hors-ligne mobile (présences et notes), #7 Rapport statistique Ministère, #8 Réinitialisation mot de passe autonome, #10 Gestion santé élève, #11 Export comptable, #12 Frais annexes, #17 RGPD, #19 Module SaaS billing, #20 Documentation in-app
> - 🟡 **Partiellement livré** : #16 Instance démo (code complet, déploiement public sur serveur toujours en attente)
> - ⬜ **Toujours vrai / à faire** : #2 Notifications SMS, #9 Authentification 2FA (mis en pause volontairement, voir roadmap), #13 Portail élève distinct (le mobile reste organisé autour du compte parent), #14 Bibliothèque de ressources pédagogiques, #15 Application iOS
> - 🟡 **Partiellement livré** (mise à jour 2026-08-16) : #18 Monitoring infrastructure — code livré (Sentry backend/frontend, health check `/up`), reste à créer les comptes Sentry/UptimeRobot et renseigner les DSN en production (voir `docs/guide-deploiement.md` §8)
>
> En cas de doute sur un point précis, se référer à `docs/roadmap-commerciale.md` (état des lieux vivant) plutôt qu'à cette analyse.

## Vue d'ensemble : est-ce vendable ?

**Oui, clairement.** Ce que vous avez construit couvre entre 70 et 80 % de ce que les établissements scolaires francophones d'Afrique de l'Ouest attendent d'un outil de ce type. C'est au-dessus de la moyenne du marché local. La combinaison multi-tenant + mobile Flutter + paiement CinetPay + bulletins PDF est déjà une proposition sérieuse et différenciante.

Mais "vendable" et "convaincant à l'évaluation" ne sont pas la même chose. Voici les points qui feront la différence.

---

## Ce qui est solide (vos atouts réels)

- **Architecture multi-tenant isolée** : rare dans les concurrents locaux. Argument fort pour les groupes scolaires.
- **Triple portail** (admin web + enseignant mobile + parent mobile) : complet, cohérent.
- **CinetPay** : intégration native du paiement mobile money, adaptée au marché ivoirien/UEMOA. Quasi unique.
- **Templates de démarrage rapide** (lycée, collège, primaire) : excellente idée qui réduit le temps d'onboarding à zéro.
- **Archivage de fin d'année avec rollback** : fonctionnalité avancée que peu de solutions proposent.
- **47 tests automatisés** : gage de fiabilité que vous pourrez mettre en avant.
- **Emploi du temps avec détection des conflits** : différenciateur réel.

---

## Ce qui manque — classé par criticité

### 🔴 Bloquants commerciaux (deal-breakers en démo)

**1. Appréciations des enseignants sur les bulletins**
C'est le point le plus critique. Dans tous les systèmes scolaires francophones africains (BEPC, BAC), chaque enseignant ajoute un commentaire par matière ("Bon trimestre, continuez ainsi") et le professeur principal ajoute une appréciation générale. Si un directeur demande la démo du bulletin et qu'il n'y a pas ce champ, la vente s'arrête là.

**2. Notifications SMS en parallèle du push mobile**
Vous avez FCM pour les smartphones, mais une grande partie des parents dans la cible n'installeront pas l'app ou ont des téléphones basiques. L'email + SMS (via Infobip, OrangeSMS, ou similaire) sur les événements critiques (bulletin publié, absence, sanction) est attendu. Sans ça, les parents non-mobiles sont exclus.

**3. Décisions du conseil de classe**
À la fin de chaque période, il faut enregistrer la décision : *Admis*, *Admis avec encouragements*, *Avertissement*, *Passage en classe supérieure*, *Redoublement*. C'est un document officiel. Son absence rend les bulletins incomplets pour les établissements sérieux.

**4. Journal d'audit (qui a changé quoi)**
Tout directeur ou comptable sérieux le demandera : "Si une note change, je sais qui l'a modifiée ?" L'absence d'historique des modifications est un frein à la confiance, surtout pour les finances.

---

### 🟠 Importants pour la fidélisation (découverts en post-déploiement)

**5. Relevé de notes officiel**
Différent du bulletin de période. Le relevé de notes annuel récapitulatif (toutes périodes confondues, avec moyennes annuelles) est un document distinct que les familles demandent régulièrement.

**6. Mode hors-ligne sur mobile**
En Afrique de l'Ouest, la connectivité est instable. Un enseignant qui fait l'appel en classe ou saisit les notes doit pouvoir le faire sans réseau, avec synchronisation ultérieure. Sans ça, l'app mobile sera abandonnée dès la première panne réseau.

**7. Rapport statistique pour le Ministère**
Les établissements privés sous contrat doivent produire des statistiques officielles (effectifs par sexe, résultats aux examens officiels, etc.) pour le Ministère. Si l'application peut générer ce rapport automatiquement, c'est un argument massif de différenciation.

**8. Réinitialisation de mot de passe autonome**
Si un utilisateur perd son accès, doit-il appeler l'admin ? C'est impraticable à l'échelle. Un simple flux "mot de passe oublié" par email est indispensable.

**9. Authentification à deux facteurs (2FA)**
Pour les comptes admin et comptable qui accèdent aux données financières. De plus en plus attendu.

**10. Gestion santé élève**
Allergies, groupe sanguin, médecin traitant, contact urgence distinct des parents. Demandé systématiquement par les infirmières scolaires et les directeurs prudents.

---

### 🟡 Lacunes qui freinent la croissance (à moyen terme)

**11. Export comptable**
Les données financières doivent pouvoir sortir dans un format qu'un comptable externe peut utiliser (CSV structuré au minimum, idéalement compatible SAGE/Excel colonné). Sinon la comptabilité sera toujours ressaisie à la main.

**12. Gestion des frais annexes**
Au-delà de la scolarité, les établissements facturent : fournitures, tenues, sorties scolaires, frais d'examen. Aujourd'hui, tout ça rentre dans "paiement" de façon informelle, mais un vrai module de facturation annexe est attendu.

**13. Portail élève distinct du portail parent**
Vous listez "portail élève" dans la documentation mais le focus réel semble être le portail parent. Un élève au lycée a des besoins différents de son parent (emploi du temps personnel, notes, devoirs à rendre). La distinction doit être réelle.

**14. Bibliothèque / ressources pédagogiques**
Upload de documents, fiches de cours, exercices. Les enseignants le demanderont dès la deuxième année d'utilisation.

**15. Application iOS**
Vous avez Flutter, donc iOS est atteignable rapidement. Mais l'absence d'une stratégie App Store explicite limitera votre crédibilité face aux établissements qui ont des parents avec des iPhones.

**16. Mode démonstration / sandbox**
Impossible d'aller voir un directeur sans lui donner un accès à une instance de démo prépeuplée avec des données fictives réalistes. C'est l'argument de vente numéro un. Une instance `demo.votreappli.ci` avec un établissement fictif complet est indispensable.

---

### 🔵 Manques structurels (risques à long terme)

**17. RGPD / protection des données**
Les données d'enfants mineurs sont ultra-sensibles. Politique de confidentialité, durée de rétention des données, droit à l'effacement — même si la réglementation africaine est moins mature, les établissements qui ont des partenaires internationaux le demanderont.

**18. Monitoring / alertes d'infrastructure**
Pas de supervision (uptime, erreurs 500, lenteurs). Si l'application tombe pendant les bulletins de fin de trimestre, ça peut ruiner la réputation du produit.

**19. SaaS billing — votre propre facturation**
Comment un établissement paie-t-il son abonnement ? À 10+ clients, la gestion manuelle devient ingérable sans module de gestion d'abonnements.

**20. Documentation utilisateur**
Le guide administrateur existe, mais une aide contextuelle in-app (tooltips, vidéos courtes de 30 secondes, FAQ) ferait baisser drastiquement les demandes de support.

---

## Plan d'action prioritaire

| Priorité | Action | Effort estimé | Impact vente |
|---|---|---|---|
| 1 | Appréciations enseignants sur bulletins | ~2-3 j | ★★★★★ |
| 2 | Instance démo prépeuplée, accessible publiquement | ~1 j | ★★★★★ |
| 3 | Notifications email (bulletin, absence, sanction) | ~2 j | ★★★★☆ |
| 4 | Mot de passe oublié autonome | ~1 j | ★★★★☆ |
| 5 | Décisions conseil de classe sur bulletins | ~2 j | ★★★★☆ |
| 6 | Relevé de notes annuel PDF | ~2 j | ★★★☆☆ |
| 7 | Mode hors-ligne mobile (au moins saisie présences) | ~5-7 j | ★★★☆☆ |

---

## Verdict final

C'est une application sérieuse, qui dépasse nettement ce que l'on trouve habituellement dans les solutions locales. Le multi-tenant, le mobile, le paiement intégré et les bulletins PDF forment déjà une proposition commerciale défendable.

Ce qui manque pour être **convaincant sans réserve** :
1. Les **appréciations sur les bulletins** — non-négociable dans le contexte francophone.
2. Une **instance de démo** — non-négociable pour la vente.
3. Les **notifications email/SMS** — non-négociable pour les établissements sérieux.

Corrigez ces trois points, et vous avez un produit que l'on peut présenter à n'importe quel directeur d'établissement avec confiance.
