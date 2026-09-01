<?php

namespace Database\Seeders;

use App\Models\HelpArticle;
use Illuminate\Database\Seeder;

class HelpArticleSeeder extends Seeder
{
    public function run(): void
    {
        HelpArticle::truncate();

        $articles = [

            // ── TABLEAU DE BORD ───────────────────────────────────────────────
            [
                'module' => 'dashboard', 'categorie' => 'prise_en_main', 'ordre' => 1,
                'titre'  => 'Comprendre le tableau de bord',
                'contenu'=> "Le tableau de bord est la première page que vous voyez après la connexion. Il affiche en temps réel les indicateurs clés de votre établissement.\n\n**Indicateurs disponibles :**\n- Nombre total d'élèves inscrits\n- Taux de présence du jour\n- Encaissements du mois\n- Bulletins publiés / en attente\n- Alertes importantes (impayés, absences…)\n\n**Astuce :** Cliquez sur chaque indicateur pour accéder directement au module concerné.",
            ],
            [
                'module' => 'dashboard', 'categorie' => 'astuce', 'ordre' => 2,
                'titre'  => 'Raccourcis rapides',
                'contenu'=> "Depuis le tableau de bord, vous pouvez accéder rapidement aux actions les plus fréquentes :\n\n- **Enregistrer un paiement** → cliquez sur le bouton vert \"Nouveau paiement\"\n- **Saisir des absences** → section Assiduités\n- **Voir les impayés** → section Finances → Tableau des impayés\n\nLe menu latéral est organisé par domaine fonctionnel. Utilisez la barre de recherche en haut pour trouver rapidement n'importe quelle page.",
            ],

            // ── ÉLÈVES ────────────────────────────────────────────────────────
            [
                'module' => 'eleves', 'categorie' => 'prise_en_main', 'ordre' => 1,
                'titre'  => 'Inscrire un nouvel élève',
                'contenu'=> "Pour inscrire un nouvel élève dans le système :\n\n1. Allez dans **Élèves → Nouvel élève**\n2. Renseignez les informations obligatoires : nom, prénoms, date de naissance, classe\n3. Associez un parent / tuteur (existant ou à créer)\n4. Ajoutez une photo si disponible\n5. Cliquez sur **Enregistrer**\n\n**Le matricule est généré automatiquement.** Vous pouvez également importer plusieurs élèves en lot via **Élèves → Importer CSV**.\n\n**Important :** Vérifiez que la classe sélectionnée correspond bien au niveau de l'élève avant de valider.",
            ],
            [
                'module' => 'eleves', 'categorie' => 'tutoriel', 'ordre' => 2,
                'titre'  => 'Rechercher et filtrer les élèves',
                'contenu'=> "La liste des élèves propose plusieurs filtres pour retrouver rapidement un élève :\n\n- **Barre de recherche** : tapez le nom, prénom ou matricule\n- **Filtre par classe** : sélectionnez une classe dans le menu déroulant\n- **Filtre par niveau** : pour voir tous les élèves d'un niveau\n\nCliquez sur un élève pour accéder à sa fiche complète, qui regroupe :\n- Informations personnelles\n- Historique des paiements\n- Bulletin de notes\n- Absences\n- Sanctions éventuelles",
            ],
            [
                'module' => 'eleves', 'categorie' => 'faq', 'ordre' => 3,
                'titre'  => 'Comment modifier la classe d\'un élève ?',
                'contenu'=> "Pour changer un élève de classe (passage, redoublement, transfert) :\n\n1. Ouvrez la fiche de l'élève\n2. Cliquez sur **Modifier**\n3. Changez la **Classe** dans le formulaire\n4. Enregistrez\n\n**Note :** Le changement de classe ne supprime pas l'historique des notes et paiements de l'ancien groupe. Toutes les données sont conservées et associées à la période concernée.",
            ],

            // ── PAIEMENTS ─────────────────────────────────────────────────────
            [
                'module' => 'paiements', 'categorie' => 'prise_en_main', 'ordre' => 1,
                'titre'  => 'Enregistrer un paiement de scolarité',
                'contenu'=> "Pour enregistrer un paiement de frais de scolarité :\n\n1. Allez dans **Finances → Paiements → Nouveau paiement**\n2. Recherchez l'élève par nom ou matricule\n3. Sélectionnez l'**échéance** concernée (1er versement, 2ème versement…)\n4. Renseignez le **montant payé**, la **date** et le **mode de paiement**\n5. Ajoutez une référence si le paiement est par chèque ou virement\n6. Cliquez sur **Enregistrer**\n\nUn **reçu PDF** est généré automatiquement après chaque paiement. Vous pouvez le télécharger et l'imprimer depuis la liste des paiements.",
            ],
            [
                'module' => 'paiements', 'categorie' => 'tutoriel', 'ordre' => 2,
                'titre'  => 'Gérer le tableau des impayés',
                'contenu'=> "Le tableau des impayés liste tous les élèves qui ont des frais de scolarité en retard.\n\n**Fonctionnalités disponibles :**\n- Filtrer par **niveau** ou **classe**\n- Voir le montant dû, le montant payé et le solde restant\n- **Envoyer des relances email** aux parents en un clic (bouton \"Envoyer relances\")\n\n**Mise à jour automatique :** Les relances peuvent aussi être envoyées automatiquement chaque matin à 08h00 si la fonctionnalité est activée par l'administrateur système.\n\n**Astuce :** Exportez le tableau en CSV pour le traitement comptable.",
            ],
            [
                'module' => 'paiements', 'categorie' => 'faq', 'ordre' => 3,
                'titre'  => 'Comment supprimer un paiement erroné ?',
                'contenu'=> "Si un paiement a été enregistré par erreur (mauvais montant, mauvais élève) :\n\n1. Allez dans **Finances → Paiements**\n2. Trouvez le paiement concerné\n3. Cliquez sur l'icône **Corbeille** (rouge)\n4. Confirmez la suppression\n\n**Important :** La suppression d'un paiement est enregistrée dans le **journal d'audit** (Paramétrage → Journal d'audit) et est traçable. Il est recommandé d'ajouter une remarque expliquant la correction avant de supprimer.",
            ],

            // ── FRAIS ANNEXES ─────────────────────────────────────────────────
            [
                'module' => 'frais_annexes', 'categorie' => 'prise_en_main', 'ordre' => 1,
                'titre'  => 'Comprendre les frais annexes',
                'contenu'=> "Les frais annexes sont des frais complémentaires à la scolarité de base. Ils peuvent être :\n\n- **Obligatoires** : tenues scolaires, manuels scolaires, cotisation APES, frais d'examen BEPC/BAC\n- **Facultatifs** : transport scolaire, cantine, activités parascolaires\n\n**Comment ça fonctionne :**\n1. L'administrateur configure les types de frais dans **Finances → Frais annexes**\n2. Chaque frais peut être limité à un niveau spécifique ou s'appliquer à tous\n3. Les paiements sont enregistrés élève par élève\n4. Un reçu spécifique \"Frais annexe\" est généré pour chaque paiement",
            ],
            [
                'module' => 'frais_annexes', 'categorie' => 'tutoriel', 'ordre' => 2,
                'titre'  => 'Configurer et enregistrer un paiement de frais annexe',
                'contenu'=> "**Étape 1 — Configurer le frais :**\n1. Allez dans **Finances → Frais annexes**\n2. Cliquez sur **Nouveau frais**\n3. Renseignez : nom, catégorie, montant, année scolaire, niveau concerné\n4. Cochez **Obligatoire** si ce frais doit apparaître dans les relances impayés\n\n**Étape 2 — Enregistrer un paiement :**\n1. Ouvrez la fiche d'un élève\n2. Dans la section **Frais annexes**, cliquez sur **Payer** en face du frais concerné\n3. Renseignez le montant et le mode de paiement\n4. Un reçu PDF est disponible immédiatement après validation",
            ],

            // ── BULLETINS & NOTES ─────────────────────────────────────────────
            [
                'module' => 'bulletins', 'categorie' => 'prise_en_main', 'ordre' => 1,
                'titre'  => 'Circuit de production du bulletin',
                'contenu'=> "La production des bulletins suit ce circuit :\n\n1. **Saisie des devoirs** → Les enseignants créent des devoirs par matière et période\n2. **Saisie des notes** → Les enseignants saisissent les notes de chaque élève\n3. **Calcul des moyennes** → Automatique dès que les notes sont saisies\n4. **Génération du bulletin** → Allez dans **Bulletins → Générer** pour un élève ou une classe\n5. **Publication** → Cliquez sur **Notifier les parents** pour envoyer une notification aux parents\n\nLes parents reçoivent une notification push sur l'application mobile et peuvent consulter le bulletin directement.",
            ],
            [
                'module' => 'bulletins', 'categorie' => 'tutoriel', 'ordre' => 2,
                'titre'  => 'Générer les bulletins d\'une classe',
                'contenu'=> "Pour générer les bulletins de toute une classe en une seule fois :\n\n1. Allez dans **Bulletins**\n2. Sélectionnez la **classe** et la **période**\n3. Cliquez sur **Générer PDF classe** pour télécharger tous les bulletins en un seul fichier\n4. Pour notifier tous les parents, cliquez sur **Notifier les parents** (icône cloche)\n\n**Moyennes et rangs** sont calculés automatiquement. Si des notes manquent pour certaines matières, elles apparaissent avec la mention \"—\" sur le bulletin.\n\n**Astuce :** Vérifiez que toutes les notes sont saisies avant de distribuer les bulletins.",
            ],
            [
                'module' => 'bulletins', 'categorie' => 'faq', 'ordre' => 3,
                'titre'  => 'Les notes des enseignants sont-elles visibles par les parents ?',
                'contenu'=> "**Non, pas automatiquement.** Les notes ne sont visibles par les parents sur l'application mobile que lorsque le bulletin est **généré et publié**.\n\nLes enseignants peuvent saisir des notes sans que les parents y aient accès immédiatement. C'est l'administrateur (ou le gestionnaire pédagogique) qui décide du moment de la publication en cliquant sur **Notifier les parents**.",
            ],

            // ── ASSIDUITÉS ────────────────────────────────────────────────────
            [
                'module' => 'assiduites', 'categorie' => 'tutoriel', 'ordre' => 1,
                'titre'  => 'Saisir la feuille de présence',
                'contenu'=> "La feuille de présence permet de noter les absences et retards des élèves :\n\n1. Allez dans **Assiduités → Feuille de présence**\n2. Sélectionnez la **classe**, la **date** et le **créneau horaire**\n3. Cochez les élèves **absents** ou **en retard**\n4. Ajoutez un motif si nécessaire (justifiée / injustifiée)\n5. Enregistrez\n\n**Les parents sont notifiés automatiquement** lorsqu'une absence est saisie pour leur enfant.\n\n**Astuce :** Les enseignants peuvent saisir les présences directement depuis l'application mobile enseignant.",
            ],
            [
                'module' => 'assiduites', 'categorie' => 'astuce', 'ordre' => 2,
                'titre'  => 'Justifier une absence a posteriori',
                'contenu'=> "Si un parent vous apporte un justificatif après coup :\n\n1. Ouvrez la fiche de l'absence dans **Assiduités**\n2. Cliquez sur **Modifier**\n3. Changez le statut de **injustifiée** à **justifiée**\n4. Ajoutez un motif dans le champ prévu\n5. Enregistrez\n\nLe changement est immédiatement visible dans le dossier de l'élève et dans le rapport d'assiduité.",
            ],

            // ── CONSEIL DE CLASSE ─────────────────────────────────────────────
            [
                'module' => 'conseil', 'categorie' => 'prise_en_main', 'ordre' => 1,
                'titre'  => 'Fonctionnement du conseil de classe',
                'contenu'=> "Le module Conseil de classe permet de :\n\n- Saisir les **appréciations** des enseignants pour chaque élève\n- Enregistrer les **décisions** du conseil (passage, redoublement, exclusion…)\n- Générer le **relevé de fin d'année** avec toutes les décisions\n\n**Règle importante :**\n- Les **appréciations** peuvent être saisies à **chaque conseil** (T1, T2, T3)\n- Les **décisions** (passage, redoublement…) ne sont saisies qu'au **dernier conseil de l'année** (T3 ou S2)\n\nAccès : **Bulletins → Conseil de classe**",
            ],

            // ── EMPLOI DU TEMPS ───────────────────────────────────────────────
            [
                'module' => 'emploi_du_temps', 'categorie' => 'tutoriel', 'ordre' => 1,
                'titre'  => 'Créer et modifier un emploi du temps',
                'contenu'=> "Pour créer l'emploi du temps d'une classe :\n\n1. Allez dans **Emploi du temps → Nouvel emploi du temps**\n2. Sélectionnez la **classe**\n3. Ajoutez les créneaux : jour, **créneau de la grille horaire**, matière, enseignant, salle\n4. Enregistrez\n\n**Grille horaire :** les créneaux proposés proviennent de la grille de l'établissement (Paramétrage → Grille horaire). La salle est pré-remplie avec la salle attitrée de la classe.\n\n**Vérification des conflits :** Le système détecte automatiquement si un enseignant ou une salle est déjà occupé sur le même créneau.\n\n**Conformité volume horaire :** Allez dans **Paramétrage → Volume horaire → Conformité** pour vérifier que chaque matière atteint le nombre d'heures réglementaire.",
            ],
            [
                'module' => 'parametrage', 'categorie' => 'prise_en_main', 'ordre' => 10,
                'titre'  => 'Définir la grille horaire de l\'établissement',
                'contenu'=> "La grille horaire décrit la semaine type : plages de cours, récréations et pause méridienne. Elle sert de base à tous les emplois du temps.\n\n**Pour la configurer :**\n1. Allez dans **Paramétrage → Grille horaire**\n2. Ajoutez chaque plage : libellé, jour, heure de début, heure de fin, type (cours / récréation / pause)\n3. Une plage sans jour s'applique à tous les jours ouvrés\n4. Utilisez **Recopier un jour** pour dupliquer rapidement une journée type\n\n**Astuce :** une séance de 2 h occupe deux plages de cours consécutives. Prévoyez des plages de durée régulière (≈ 55 min).",
            ],
            [
                'module' => 'emploi_du_temps', 'categorie' => 'tutoriel', 'ordre' => 2,
                'titre'  => 'Contrôler un emploi du temps (règles MENET)',
                'contenu'=> "Le menu **Pilotage pédagogique → Contrôle EDT** vérifie l'emploi du temps existant contre les règles de confection MENET.\n\n**Deux niveaux de résultat :**\n- **Violations bloquantes** : conflits d'enseignant / de salle / de classe, salle spécialisée manquante (Physique-Chimie et SVT en labo), EPS entre 10 h et 16 h, deux heures consécutives d'Histoire-Géo, capacité de salle insuffisante, cours sur une indisponibilité, volume horaire non respecté.\n- **Points d'amélioration** (pondérables) : matière concentrée sur un seul jour, 5 heures d'affilée de matières exigeantes en 6e/5e, heures creuses des enseignants, journées déséquilibrées.\n\n**Réglages :** dépliez « Régler les contraintes » pour activer/désactiver les règles souples et ajuster leur poids selon les habitudes de l'établissement. Les règles bloquantes ne sont pas désactivables.",
            ],
            [
                'module' => 'parametrage', 'categorie' => 'faq', 'ordre' => 11,
                'titre'  => 'Suis-je prêt pour générer les emplois du temps ?',
                'contenu'=> "Le menu **Pilotage pédagogique → Diagnostic EDT** vérifie automatiquement que tout le paramétrage nécessaire est en place :\n\n- Grille horaire définie\n- Familles renseignées pour toutes les matières (Paramétrage → Config. matières/niveaux)\n- Salle attitrée pour chaque classe\n- Capacité des salles suffisante\n- Enseignants affectés à toutes les matières du programme\n- Découpage des volumes horaires en séances (Paramétrage → Volumes horaires)\n- Indisponibilités des vacataires renseignées\n\nChaque point non satisfait renvoie un lien direct vers l'écran à corriger.",
            ],
            [
                'module' => 'enseignants', 'categorie' => 'tutoriel', 'ordre' => 4,
                'titre'  => 'Renseigner les indisponibilités d\'un enseignant',
                'contenu'=> "Les indisponibilités indiquent les créneaux où un enseignant ne peut pas (bloquant) ou préfère ne pas (préférence) assurer de cours — utile pour les vacataires et les temps partiels.\n\n**Pour les saisir :**\n1. Allez dans **Enseignants → Indisponibilités**\n2. Choisissez l'enseignant\n3. Ajoutez un créneau : jour, heure de début, heure de fin, type, motif\n\nCes contraintes seront respectées lors de la génération automatique des emplois du temps.",
            ],

            // ── SANCTIONS ─────────────────────────────────────────────────────
            [
                'module' => 'sanctions', 'categorie' => 'tutoriel', 'ordre' => 1,
                'titre'  => 'Enregistrer une sanction',
                'contenu'=> "Pour enregistrer une sanction disciplinaire :\n\n1. Allez dans **Discipline → Sanctions → Nouvelle sanction**\n2. Recherchez l'élève concerné\n3. Renseignez : type de sanction, date, description des faits, décision\n4. Enregistrez\n\n**Types de sanctions disponibles :**\n- Avertissement\n- Blâme\n- Exclusion temporaire (avec durée)\n- Exclusion définitive\n- Conseil de discipline\n\n**Traçabilité :** Toutes les modifications d'une sanction sont enregistrées dans le journal d'audit.",
            ],

            // ── COMMUNICATION ─────────────────────────────────────────────────
            [
                'module' => 'communication', 'categorie' => 'prise_en_main', 'ordre' => 1,
                'titre'  => 'Envoyer une information aux parents',
                'contenu'=> "Pour publier une information visible par tous les parents sur l'application mobile :\n\n1. Allez dans **Communication → Informations → Nouvelle information**\n2. Renseignez le **titre** et le **contenu** du message\n3. Choisissez la **date d'affichage**\n4. Enregistrez — l'information est visible immédiatement\n\n**Messagerie parent-enseignant :** Les parents et enseignants peuvent également s'échanger des messages privés depuis l'application mobile. Les messages apparaissent dans **Communication → Messagerie**.",
            ],

            // ── STATISTIQUES ─────────────────────────────────────────────────
            [
                'module' => 'statistiques', 'categorie' => 'prise_en_main', 'ordre' => 1,
                'titre'  => 'Explorer les tableaux statistiques',
                'contenu'=> "Le module Statistiques offre plusieurs tableaux de bord analytiques :\n\n- **Synthèse** : effectifs, taux de réussite global, comparaison inter-périodes\n- **Présences** : taux d'assiduité par classe, évolution dans le temps\n- **Moyennes** : distribution des moyennes par matière et par niveau\n- **Finances** : encaissements mensuels, taux de recouvrement\n- **Enseignants** : heures effectuées vs heures prévues\n\nTous les graphiques sont exportables en image. Le rapport PDF complet pour le Ministère est disponible dans **Rapports → Rapport Ministère**.",
            ],

            // ── EXPORTS ───────────────────────────────────────────────────────
            [
                'module' => 'export', 'categorie' => 'tutoriel', 'ordre' => 1,
                'titre'  => 'Générer le rapport statistique Ministère',
                'contenu'=> "Le rapport Ministère est un document PDF officiel récapitulant les statistiques annuelles de l'établissement.\n\n**Pour le générer :**\n1. Allez dans **Rapports → Rapport Ministère**\n2. Sélectionnez l'**année scolaire**\n3. Renseignez les résultats aux examens officiels (BEPC, BAC) si disponibles\n4. Cliquez sur **Générer et télécharger**\n\nLe rapport inclut : effectifs par niveau/genre, personnel enseignant, résultats scolaires, taux d'assiduité, infrastructure et examens officiels.",
            ],
            [
                'module' => 'export', 'categorie' => 'tutoriel', 'ordre' => 2,
                'titre'  => 'Exporter les données comptables pour SAGE',
                'contenu'=> "L'export comptable génère un fichier Excel ou CSV compatible avec les logiciels comptables (SAGE, EBP).\n\n**Pour exporter :**\n1. Allez dans **Finances → Export comptable**\n2. Sélectionnez l'**année scolaire** ou une **plage de dates**\n3. Choisissez le format :\n   - **Excel** : 3 feuilles (journal, récapitulatif par compte OHADA, écritures SAGE)\n   - **FEC/CSV** : format standard pour import direct dans SAGE\n4. Cliquez sur **Exporter**\n\n**Comptes OHADA utilisés :** 706100 (scolarité), 706200 (frais annexes), 571000 (caisse), 521000 (banque).",
            ],

            // ── PARAMÉTRAGE ───────────────────────────────────────────────────
            [
                'module' => 'parametrage', 'categorie' => 'prise_en_main', 'ordre' => 1,
                'titre'  => 'Configurer les informations de l\'établissement',
                'contenu'=> "Les informations de l'établissement (nom, logo, adresse, contact) sont utilisées sur tous les documents PDF (bulletins, reçus, attestations).\n\n**Pour les configurer :**\n1. Allez dans **Paramétrage → Établissement**\n2. Renseignez ou modifiez les informations\n3. **Uploadez le logo** (format PNG ou JPG recommandé, fond transparent idéal)\n4. Enregistrez\n\n**Slogan :** Le slogan apparaît sous le nom de l'établissement sur les bulletins et attestations.",
            ],
            [
                'module' => 'parametrage', 'categorie' => 'tutoriel', 'ordre' => 2,
                'titre'  => 'Archiver une année scolaire',
                'contenu'=> "L'archivage permet de clôturer une année scolaire et de préparer la suivante.\n\n**Ce que fait l'archivage :**\n- Verrouille les données de l'année (notes, paiements, bulletins)\n- Génère une archive ZIP téléchargeable avec tous les bulletins\n- Prépare les structures pour la nouvelle année\n\n**Pour archiver :**\n1. Allez dans **Paramétrage → Archivage**\n2. Sélectionnez l'année à archiver\n3. Vérifiez la liste de contrôle (toutes les cases doivent être cochées)\n4. Lancez l'archivage\n\n**Attention :** Cette opération est irréversible. Effectuez une sauvegarde de la base de données avant de procéder.",
            ],

            // ── UTILISATEURS ─────────────────────────────────────────────────
            [
                'module' => 'utilisateurs', 'categorie' => 'prise_en_main', 'ordre' => 1,
                'titre'  => 'Gérer les rôles et permissions',
                'contenu'=> "Le système de rôles permet de contrôler précisément qui peut faire quoi dans l'application.\n\n**Rôles prédéfinis :**\n- **Administrateur** : accès total\n- **Gestionnaire pédagogique** : bulletins, notes, assiduités\n- **Comptable / Caissier** : paiements et finances\n- **Secrétaire** : élèves, inscriptions, communication\n\n**Pour créer un utilisateur :**\n1. Allez dans **Paramétrage → Utilisateurs → Nouvel utilisateur**\n2. Renseignez les informations et assignez un rôle\n3. L'utilisateur reçoit ses identifiants par email\n\n**Journal d'audit :** Toutes les modifications de notes, paiements et sanctions sont enregistrées avec l'identité de l'auteur dans **Paramétrage → Journal d'audit**.",
            ],

            // ── INSCRIPTIONS ─────────────────────────────────────────────────
            [
                'module' => 'inscriptions', 'categorie' => 'tutoriel', 'ordre' => 1,
                'titre'  => 'Traiter une demande d\'inscription',
                'contenu'=> "Les parents peuvent soumettre une demande d'inscription en ligne via l'application mobile ou le portail web.\n\n**Traitement d'une demande :**\n1. Allez dans **Inscriptions → Demandes en attente**\n2. Ouvrez la demande\n3. Vérifiez les informations et documents fournis\n4. **Accepter** : l'élève est créé automatiquement dans le système\n5. **Refuser** : le parent est notifié avec le motif\n\n**Après acceptation :** L'élève apparaît dans la liste avec le statut \"En attente d'affectation\". Assignez-lui une classe via la fiche élève.",
            ],
        ];

        foreach ($articles as $data) {
            HelpArticle::create(array_merge(['actif' => true], $data));
        }
    }
}
