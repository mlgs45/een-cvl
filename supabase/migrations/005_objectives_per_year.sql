-- ============================================================
-- EEN CRM — Migration 005 : Objectifs par année
-- Ajoute une colonne year à network_objectives et change la contrainte UNIQUE
-- ============================================================

-- 1. Ajoute la colonne year (DEFAULT 2025 pour les lignes existantes)
ALTER TABLE public.network_objectives
  ADD COLUMN IF NOT EXISTS year int NOT NULL DEFAULT 2025;

-- 2. Supprime l'ancienne contrainte UNIQUE (advisor_id, category_id)
ALTER TABLE public.network_objectives
  DROP CONSTRAINT IF EXISTS network_objectives_advisor_id_category_id_key;

-- 3. Nouvelle contrainte UNIQUE sur (advisor_id, category_id, year)
ALTER TABLE public.network_objectives
  ADD CONSTRAINT network_objectives_advisor_id_category_id_year_key
  UNIQUE (advisor_id, category_id, year);

-- 4. Supprime le DEFAULT maintenant que les données sont migrées
ALTER TABLE public.network_objectives
  ALTER COLUMN year DROP DEFAULT;
