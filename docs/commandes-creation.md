# Commandes de création et de maintenance

Toutes les commandes s'exécutent depuis le dossier `back/`.

---

## Super Admin (opérateur SaaS)

Pas de commande artisan dédiée — à créer via Tinker.

```bash
php artisan tinker --execute="
App\Models\SuperAdmin::create([
    'nom'      => 'Super Admin',
    'email'    => 'superadmin@etablissement.ci',
    'password' => bcrypt('superadmin123'),
]);
"
```

Login : `POST /api/superadmin/login`

---

## Groupe scolaire

Crée un groupe et y rattache optionnellement des établissements existants.

```bash
php artisan group:create "Groupe Scolaire Avenir" \
  --email=contact@avenir.ci \
  --admin-email=admin@avenir.ci \
  --admin-password=avenir123 \
  --admin-nom="Administrateur Avenir" \
  --tenants=lycee-moderne \
  --tenants=college-avenir
```

| Option | Description |
|---|---|
| `--email` | Email de contact du groupe |
| `--admin-email` | Email de l'administrateur |
| `--admin-password` | Mot de passe de l'administrateur |
| `--admin-nom` | Nom de l'administrateur |
| `--tenants` | ID d'un établissement à rattacher (répéter l'option pour en ajouter plusieurs) |

Login : `POST /api/group/login`

---

## Établissement (tenant vide)

Les 3 premiers arguments sont positionnels : `id`, `nom`, `domaine`.

### Sans groupe

```bash
php artisan school:create lycee-moderne "Lycée Moderne d'Abidjan" lycee-moderne.suiviscolaire.ci \
  --email=contact@lycee-moderne.ci \
  --ville=Abidjan \
  --admin-email=admin@lycee-moderne.ci \
  --admin-password=secret123
```

### Avec groupe

```bash
php artisan school:create lycee-moderne "Lycée Moderne d'Abidjan" lycee-moderne.suiviscolaire.ci \
  --email=contact@lycee-moderne.ci \
  --ville=Abidjan \
  --group-id=1 \
  --admin-email=admin@lycee-moderne.ci \
  --admin-password=secret123
```

Pas de notion de plan tarifaire ni de date d'expiration à la création — un établissement créé ainsi (ou via une demande d'accès acceptée) est un accès de démonstration commerciale sans limite de durée.

| Option | Défaut | Description |
|---|---|---|
| `--email` | — | Email de contact |
| `--ville` | — | Ville |
| `--group-id` | — | ID du groupe (optionnel) |
| `--admin-email` | — | Email du premier administrateur |
| `--admin-password` | — | Mot de passe du premier administrateur |

---

## Établissement de démo prépeuplé

Crée un tenant entièrement prépeuplé : structure scolaire, élèves, notes, paiements, emplois du temps, etc.
Si le tenant existe déjà, il est automatiquement supprimé et recréé.

```bash
php artisan demo:creer \
  --id=lycee-demo \
  --nom="Lycée Excellence" \
  --domaine=lycee-demo.localhost \
  --template=lycee_complet \
  --annee=2025-2026 \
  --periodes=trimestre \
  --admin-email=admin@lycee-demo.localhost \
  --admin-password=demo123
```

| Option | Défaut | Description |
|---|---|---|
| `--id` | `college-demo` | Identifiant unique (slug) |
| `--nom` | dérivé de l'id | Nom affiché |
| `--domaine` | `{id}.localhost` | Domaine complet |
| `--template` | `college` | `lycee` \| `lycee_complet` \| `college` \| `primaire` |
| `--annee` | `2025-2026` | Année scolaire |
| `--periodes` | `trimestre` | `trimestre` \| `semestre` |
| `--admin-email` | `admin@{id}.localhost` | Email de l'administrateur |
| `--admin-password` | `demo123` | Mot de passe de l'administrateur |

---

## Réinitialiser les bases tenant

`migrate:fresh` + `db:seed` sur tous les tenants ou sur un tenant ciblé.

```bash
# Tous les tenants
php artisan tenants:fresh

# Un tenant spécifique
php artisan tenants:fresh --tenants=lycee-demo
```

---

## Nettoyage de la base centrale

En cas d'incohérence (tenants supprimés mais domains/groups restants) :

```bash
php artisan tinker --execute="
DB::table('domains')->delete();
DB::table('tenants')->delete();
DB::table('group_admins')->delete();
DB::table('groups')->delete();
DB::table('super_admins')->delete();
"
```
