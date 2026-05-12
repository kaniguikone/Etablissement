# Commandes de création

## Démo

Crée un établissement entièrement prépeuplé (élèves, notes, paiements, emplois du temps…).
Si le tenant existe déjà, il est automatiquement supprimé et recréé.

```bash
php artisan demo:creer \
  --id=college-demo \
  --nom="Collège de la Paix" \
  --domaine=college-demo.localhost \
  --template=college \
  --annee=2024-2025 \
  --periodes=trimestre \
  --admin-email=admin@college-demo.localhost \
  --admin-password=demo123
```

| Option | Défaut | Description |
|---|---|---|
| `--id` | `college-demo` | Identifiant unique (slug) |
| `--nom` | dérivé de l'id | Nom affiché |
| `--domaine` | `{id}.localhost` | Domaine complet |
| `--template` | `college` | `lycee` \| `lycee_complet` \| `college` \| `primaire` |
| `--annee` | `2024-2025` | Année scolaire |
| `--periodes` | `trimestre` | `trimestre` \| `semestre` |
| `--admin-email` | `admin@{id}.localhost` | Email de l'administrateur |
| `--admin-password` | `demo123` | Mot de passe de l'administrateur |

---

## Groupe scolaire

Crée un groupe et y rattache optionnellement des établissements existants.

```bash
php artisan group:create "Groupe Scolaire Excellence" \
  --email=contact@excellence.ci \
  --admin-email=admin@excellence.ci \
  --admin-password=secret123 \
  --admin-nom="Jean Koné" \
  --tenants=lycee-moderne college-avenir
```

| Option | Description |
|---|---|
| `--email` | Email de contact du groupe |
| `--admin-email` | Email de l'administrateur du groupe |
| `--admin-password` | Mot de passe de l'administrateur |
| `--admin-nom` | Nom de l'administrateur |
| `--tenants` | IDs des établissements à rattacher (séparés par des espaces) |

---

## Établissement

Les 3 premiers arguments sont positionnels : `id`, `nom`, `domaine`.

### Sans groupe

```bash
php artisan school:create lycee-moderne "Lycée Moderne d'Abidjan" lycee-moderne.monapp.ci \
  --plan=pro \
  --email=contact@lycee-moderne.ci \
  --ville=Abidjan \
  --admin-email=admin@lycee-moderne.ci \
  --admin-password=secret123
```

### Avec groupe

```bash
php artisan school:create lycee-moderne "Lycée Moderne d'Abidjan" lycee-moderne.monapp.ci \
  --plan=pro \
  --email=contact@lycee-moderne.ci \
  --ville=Abidjan \
  --group-id=1 \
  --admin-email=admin@lycee-moderne.ci \
  --admin-password=secret123
```

| Option | Description |
|---|---|
| `--plan` | `demo` \| `basic` \| `pro` (défaut : `demo`) |
| `--email` | Email de contact |
| `--ville` | Ville |
| `--group-id` | ID du groupe auquel rattacher l'établissement |
| `--admin-email` | Email du premier administrateur |
| `--admin-password` | Mot de passe du premier administrateur |
