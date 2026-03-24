# EEN CVL — Plateforme CRM interne

> Outil de gestion des activités et des entreprises pour les conseillers **Enterprise Europe Network** de la CCIR Centre-Val de Loire.

---

## Présentation

EEN CVL est une application web interne développée pour les conseillers EEN de la CCIR Centre. Elle permet de :

- **Gérer les entreprises** suivies (fiche complète, recherche, import CSV/Excel)
- **Enregistrer les activités** réalisées avec chaque entreprise (type, sous-type, suivi)
- **Visualiser les statistiques** via un tableau de bord filtrable par période, conseiller et type d'activité
- **Suivre les KPI EEN** (9 indicateurs par conseiller et pour l'équipe CCIR)
- **Administrer les utilisateurs** et les types d'activités (profils admin)

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 19 + TypeScript 5.9 + Vite 8 |
| Style | Tailwind CSS v3 + Inter (Google Fonts) |
| Routing | React Router v7 |
| Data fetching | @tanstack/react-query v5 |
| Backend / Auth | Supabase (PostgreSQL + Auth + Edge Functions) |
| i18n | i18next (FR par défaut, EN disponible) |
| Runtime | Node.js 22.12 (LTS) |
| Hébergement | Serveur Hetzner (Docker + nginx, auto-hébergé) |

---

## Démarrage local

### Prérequis

- Node.js 22.12 (voir `.nvmrc`)
- Un projet Supabase configuré (voir section Base de données)

### Installation

```bash
git clone https://github.com/mlgs45/een-cvl.git
cd een-cvl
npm install
```

### Variables d'environnement

Créer un fichier `.env.local` à la racine :

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Lancer en développement

```bash
npm run dev
```

L'application est accessible sur `http://localhost:5173`.

### Build de production

```bash
npm run build
```

---

## Déploiement (Hetzner)

L'application est containerisée via Docker et servie par nginx.

```bash
# Build de l'image
docker build -t een-cvl .

# Lancement
docker run -p 80:80 een-cvl
```

Le `Dockerfile` effectue un build multi-stage :
1. **Builder** — Node.js 22.12 compile le frontend (`npm run build`)
2. **Runtime** — nginx:alpine sert les fichiers statiques du dossier `dist/`

> **Évolution prévue** : migration de Supabase vers un serveur Hetzner dédié données (PostgreSQL auto-hébergé).

---

## Branches et déploiement

| Branche | Rôle |
|---|---|
| `main` | Production (déployée sur Hetzner) |
| `staging` | Développement et tests |

**Workflow recommandé :**

```bash
# Travailler sur staging
git checkout staging
# ... modifications ...
git add . && git commit -m "description"
git push origin staging

# Mettre en production après validation
git checkout main && git merge staging && git push origin main
git checkout staging
```

---

## Base de données (Supabase)

### Migrations

Les migrations SQL sont dans `supabase/migrations/` et doivent être appliquées dans l'ordre :

| Fichier | Description |
|---|---|
| `001_initial_schema.sql` | Schéma complet, RLS, triggers, données de référence |
| `002_fix_rls_user_role.sql` | Sécurité : empêche l'auto-promotion de rôle |
| `003_network.sql` | Module réseau (partenaires EEN) |
| `004_*.sql` | … |
| `006_kpi.sql` | Module KPI (objectifs, logs manuels, vue auto) |

Pour appliquer une migration, copier le contenu dans **Supabase → SQL Editor** et exécuter.

### Tables principales

| Table | Description |
|---|---|
| `users` | Profils utilisateurs (extension de `auth.users`) |
| `companies` | Entreprises suivies |
| `activities` | Activités réalisées avec les entreprises |
| `activity_types` | Types d'activités (Basic Network Service, Advisory…) |
| `activity_subtypes` | Sous-types associés à chaque type |
| `kpi_objectives` | Objectifs KPI par conseiller × année |
| `kpi_team_objectives` | Objectifs KPI équipe CCIR |
| `kpi_manual_logs` | Saisies manuelles KPI5s, KPI5t, KPI7 |
| `kpi_auto_actuals` | Vue agrégée des KPI calculés depuis les activités |

### Sécurité (RLS)

- **Conseiller** : lit toutes les entreprises et activités, modifie uniquement les siennes
- **Admin** : accès complet à toutes les données et à la gestion des utilisateurs
- La colonne `role` est protégée — un conseiller ne peut pas se promouvoir admin

---

## Gestion des utilisateurs

La création de nouveaux comptes se fait via la **page Admin → Utilisateurs** (rôle admin requis). Elle appelle une Edge Function Supabase qui crée le compte avec un mot de passe temporaire.

Les nouveaux utilisateurs sont automatiquement invités à changer leur mot de passe dès la première connexion (flag `must_change_password` dans `user_metadata`).

### Déployer la Edge Function

```bash
cd /chemin/vers/een-cvl
npx supabase functions deploy invite-user --no-verify-jwt --project-ref <project-ref>
```

> Le flag `--no-verify-jwt` est requis : la vérification JWT ES256 est gérée dans la fonction elle-même via la service role key.

La fonction nécessite la variable `SUPABASE_SERVICE_ROLE_KEY` dans les secrets Supabase.

---

## Import CSV / Excel

La page **Entreprises → Importer** permet d'importer des entreprises depuis un fichier `.csv`, `.xls` ou `.xlsx` en 4 étapes :

1. **Fichier** — glisser-déposer ou sélection
2. **Colonnes** — association automatique des colonnes (avec correction manuelle possible)
3. **Aperçu** — visualisation avec détection des doublons
4. **Import** — traitement par lots de 50 avec barre de progression

Les doublons sont détectés par nom ou numéro de TVA. Une option permet de mettre à jour les entreprises existantes au lieu de les ignorer.

---

## Structure du projet

```
een-cvl/
├── .nvmrc                            # Node.js 22.12
├── Dockerfile                        # Build multi-stage (Node → nginx)
├── public/
│   └── een-logo.png                  # Logo officiel EEN (version négative)
├── src/
│   ├── components/
│   │   ├── import/                   # Composants wizard d'import CSV/Excel
│   │   ├── layout/                   # AppLayout, Sidebar, Topbar
│   │   ├── ForcePasswordChangeModal.tsx
│   │   ├── AdminRoute.tsx
│   │   ├── CompanyForm.tsx
│   │   └── ProtectedRoute.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx           # Session, profil, isAdmin
│   ├── hooks/
│   │   └── useSpeechRecognition.ts
│   ├── i18n/
│   │   └── locales/
│   │       ├── fr.json               # Traductions françaises (défaut)
│   │       └── en.json               # Traductions anglaises
│   ├── lib/
│   │   ├── importUtils.ts            # Logique parsing/mapping/validation
│   │   └── supabase.ts               # Client Supabase typé
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── AdminActivityTypesPage.tsx
│   │   │   └── AdminUsersPage.tsx
│   │   ├── ActivityFormPage.tsx
│   │   ├── CompaniesPage.tsx
│   │   ├── CompanyDetailPage.tsx
│   │   ├── CompanyEditPage.tsx
│   │   ├── CompanyImportPage.tsx
│   │   ├── CompanyNewPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── KpiLogFormPage.tsx
│   │   ├── KpiObjectifsPage.tsx
│   │   ├── KpiPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── ProfilePage.tsx
│   ├── types/
│   │   └── database.ts               # Types TypeScript du schéma Supabase
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── supabase/
│   ├── config.toml                   # Config Edge Functions (verify_jwt)
│   ├── functions/
│   │   └── invite-user/              # Edge Function création de comptes
│   └── migrations/                   # Migrations SQL versionnées
├── tailwind.config.js
└── vite.config.ts
```

---

## Charte graphique

Les couleurs suivent la **Visual Identity Guidelines EEN 2023** :

| Couleur | Hex | Usage |
|---|---|---|
| Dark Blue | `#00587C` | Sidebar, éléments forts |
| Mid Blue | `#006BA6` | Boutons, liens actifs |
| Light Blue | `#64B4E6` | Gradient "Curve", accents |
| Yellow | `#FFCC00` | Accent disponible |

Le gradient iconique EEN (`#00587C → #64B4E6`) est utilisé sur le logo et les avatars.

---

*EEN CVL — CCIR Centre-Val de Loire · Enterprise Europe Network*
