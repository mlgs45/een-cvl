-- ============================================================
-- 006_kpi.sql  –  Module Suivi KPI EEN
-- ============================================================

-- 1. Nouveau type d'activité : een_contribution
INSERT INTO public.activity_types (code, label_fr, label_en, is_active, sort_order)
SELECT
  'een_contribution',
  'Contribution auprès d''autres EEN',
  'Contribution to other EEN partners',
  true,
  COALESCE((SELECT MAX(sort_order) FROM public.activity_types), 0) + 1
WHERE NOT EXISTS (
  SELECT 1 FROM public.activity_types WHERE code = 'een_contribution'
);

-- 2. Table kpi_objectives (objectifs par conseiller × KPI × année)
CREATE TABLE IF NOT EXISTS public.kpi_objectives (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kpi_code      text        NOT NULL,
  year          int         NOT NULL,
  target_count  numeric     NOT NULL DEFAULT 0,
  etp           numeric     NOT NULL DEFAULT 1.0,
  is_nc         boolean     NOT NULL DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (advisor_id, kpi_code, year)
);

-- 3. Table kpi_manual_logs (entrées manuelles KPI5s, KPI5t, KPI7)
CREATE TABLE IF NOT EXISTS public.kpi_manual_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id  uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kpi_code    text        NOT NULL CHECK (kpi_code IN ('KPI5s', 'KPI5t', 'KPI7')),
  date        date        NOT NULL,
  year        int         GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)::int) STORED,
  title       text        NOT NULL,
  company_id  uuid        REFERENCES public.companies(id) ON DELETE SET NULL,
  comment     text,
  created_by  uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 4. Table kpi_team_objectives (objectifs équipe CCI CVDL)
--    year = 0 → période complète 2025–2028
--    year = 2025..2028 → objectif annuel
CREATE TABLE IF NOT EXISTS public.kpi_team_objectives (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_code     text        NOT NULL,
  year         int         NOT NULL DEFAULT 0,
  target_count numeric     NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (kpi_code, year)
);

-- 5. Vue kpi_auto_actuals (réalisés calculés depuis activities)
CREATE OR REPLACE VIEW public.kpi_auto_actuals AS
SELECT
  a.created_by AS advisor_id,
  EXTRACT(YEAR FROM a.date)::int AS year,
  CASE at.code
    WHEN 'basic_network_service'  THEN 'KPI1'
    WHEN 'parcours_client'        THEN 'KPI2'
    WHEN 'advisory_achievement'   THEN 'KPI3A'
    WHEN 'partnering_achievement' THEN 'KPI3B'
    WHEN 'impact_assessment'      THEN 'KPI4'
    WHEN 'een_contribution'       THEN 'KPI6'
  END AS kpi_code,
  COUNT(*) AS actual
FROM public.activities a
JOIN public.activity_types at ON a.activity_type_id = at.id
WHERE at.code IN (
  'basic_network_service', 'parcours_client', 'advisory_achievement',
  'partnering_achievement', 'impact_assessment', 'een_contribution'
)
GROUP BY a.created_by, EXTRACT(YEAR FROM a.date)::int, kpi_code;

GRANT SELECT ON public.kpi_auto_actuals TO authenticated;

-- 6. Triggers updated_at
CREATE OR REPLACE TRIGGER kpi_objectives_updated_at
  BEFORE UPDATE ON public.kpi_objectives
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER kpi_manual_logs_updated_at
  BEFORE UPDATE ON public.kpi_manual_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER kpi_team_objectives_updated_at
  BEFORE UPDATE ON public.kpi_team_objectives
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. RLS
ALTER TABLE public.kpi_objectives       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_manual_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_team_objectives  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kpi_objectives' AND policyname='kpi_obj_select') THEN
    CREATE POLICY kpi_obj_select ON public.kpi_objectives FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kpi_objectives' AND policyname='kpi_obj_insert') THEN
    CREATE POLICY kpi_obj_insert ON public.kpi_objectives FOR INSERT TO authenticated WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kpi_objectives' AND policyname='kpi_obj_update') THEN
    CREATE POLICY kpi_obj_update ON public.kpi_objectives FOR UPDATE TO authenticated USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kpi_objectives' AND policyname='kpi_obj_delete') THEN
    CREATE POLICY kpi_obj_delete ON public.kpi_objectives FOR DELETE TO authenticated USING (public.is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kpi_team_objectives' AND policyname='kpi_team_select') THEN
    CREATE POLICY kpi_team_select ON public.kpi_team_objectives FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kpi_team_objectives' AND policyname='kpi_team_insert') THEN
    CREATE POLICY kpi_team_insert ON public.kpi_team_objectives FOR INSERT TO authenticated WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kpi_team_objectives' AND policyname='kpi_team_update') THEN
    CREATE POLICY kpi_team_update ON public.kpi_team_objectives FOR UPDATE TO authenticated USING (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kpi_team_objectives' AND policyname='kpi_team_delete') THEN
    CREATE POLICY kpi_team_delete ON public.kpi_team_objectives FOR DELETE TO authenticated USING (public.is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kpi_manual_logs' AND policyname='kpi_logs_select') THEN
    CREATE POLICY kpi_logs_select ON public.kpi_manual_logs FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kpi_manual_logs' AND policyname='kpi_logs_insert') THEN
    CREATE POLICY kpi_logs_insert ON public.kpi_manual_logs FOR INSERT TO authenticated WITH CHECK (advisor_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kpi_manual_logs' AND policyname='kpi_logs_update') THEN
    CREATE POLICY kpi_logs_update ON public.kpi_manual_logs FOR UPDATE TO authenticated USING (advisor_id = auth.uid() OR public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kpi_manual_logs' AND policyname='kpi_logs_delete') THEN
    CREATE POLICY kpi_logs_delete ON public.kpi_manual_logs FOR DELETE TO authenticated USING (advisor_id = auth.uid() OR public.is_admin());
  END IF;
END $$;

-- 8. Seed kpi_team_objectives
INSERT INTO public.kpi_team_objectives (kpi_code, year, target_count) VALUES
  -- Période complète (year = 0)
  ('KPI1',  0, 250), ('KPI2',  0,  45), ('KPI3A', 0, 20), ('KPI3B', 0,  8),
  ('KPI4',  0,  32), ('KPI5s', 0,   4), ('KPI5t', 0, 56), ('KPI6',  0, 14),
  ('KPI7',  0,  18),
  -- 2026
  ('KPI1',  2026, 59), ('KPI2',  2026,  9), ('KPI3A', 2026, 5), ('KPI3B', 2026, 3),
  ('KPI4',  2026,  9), ('KPI5s', 2026,  2), ('KPI5t', 2026,17), ('KPI6',  2026, 4),
  ('KPI7',  2026,  4)
ON CONFLICT (kpi_code, year) DO NOTHING;

-- 9. Seed kpi_objectives par conseiller pour 2026
DO $$
DECLARE
  v_nadia     uuid;
  v_estelle   uuid;
  v_coralie   uuid;
  v_mathieu   uuid;
  v_total_etp numeric := 1.0 + 0.32 + 0.475 + 0.475;
BEGIN
  SELECT id INTO v_nadia   FROM public.users WHERE full_name ILIKE 'Nadia%'   LIMIT 1;
  SELECT id INTO v_estelle FROM public.users WHERE full_name ILIKE 'Estelle%' LIMIT 1;
  SELECT id INTO v_coralie FROM public.users WHERE full_name ILIKE 'Coralie%' LIMIT 1;
  SELECT id INTO v_mathieu FROM public.users WHERE full_name ILIKE 'Mathieu%' LIMIT 1;

  IF v_nadia IS NOT NULL THEN
    INSERT INTO public.kpi_objectives (advisor_id, kpi_code, year, target_count, etp, is_nc) VALUES
      (v_nadia, 'KPI1',  2026, 59, 1.0, false),
      (v_nadia, 'KPI2',  2026,  3, 1.0, false),
      (v_nadia, 'KPI3A', 2026,  2, 1.0, false),
      (v_nadia, 'KPI3B', 2026,  0, 1.0, true),
      (v_nadia, 'KPI4',  2026,  3, 1.0, false),
      (v_nadia, 'KPI5s', 2026,  0, 1.0, false),
      (v_nadia, 'KPI5t', 2026,  5, 1.0, false),
      (v_nadia, 'KPI6',  2026,  1, 1.0, false),
      (v_nadia, 'KPI7',  2026,  1, 1.0, false)
    ON CONFLICT (advisor_id, kpi_code, year) DO NOTHING;
  END IF;

  IF v_estelle IS NOT NULL THEN
    INSERT INTO public.kpi_objectives (advisor_id, kpi_code, year, target_count, etp, is_nc) VALUES
      (v_estelle, 'KPI1',  2026, ROUND(59 * 0.32  / v_total_etp), 0.32,  false),
      (v_estelle, 'KPI2',  2026,  2, 0.32,  false),
      (v_estelle, 'KPI3A', 2026,  1, 0.32,  false),
      (v_estelle, 'KPI3B', 2026,  1, 0.32,  false),
      (v_estelle, 'KPI4',  2026,  2, 0.32,  false),
      (v_estelle, 'KPI5s', 2026,  0, 0.32,  false),
      (v_estelle, 'KPI5t', 2026,  4, 0.32,  false),
      (v_estelle, 'KPI6',  2026,  1, 0.32,  false),
      (v_estelle, 'KPI7',  2026,  1, 0.32,  false)
    ON CONFLICT (advisor_id, kpi_code, year) DO NOTHING;
  END IF;

  IF v_coralie IS NOT NULL THEN
    INSERT INTO public.kpi_objectives (advisor_id, kpi_code, year, target_count, etp, is_nc) VALUES
      (v_coralie, 'KPI1',  2026, ROUND(59 * 0.475 / v_total_etp), 0.475, false),
      (v_coralie, 'KPI2',  2026,  2, 0.475, false),
      (v_coralie, 'KPI3A', 2026,  1, 0.475, false),
      (v_coralie, 'KPI3B', 2026,  1, 0.475, false),
      (v_coralie, 'KPI4',  2026,  2, 0.475, false),
      (v_coralie, 'KPI5s', 2026,  0, 0.475, false),
      (v_coralie, 'KPI5t', 2026,  4, 0.475, false),
      (v_coralie, 'KPI6',  2026,  1, 0.475, false),
      (v_coralie, 'KPI7',  2026,  1, 0.475, false)
    ON CONFLICT (advisor_id, kpi_code, year) DO NOTHING;
  END IF;

  IF v_mathieu IS NOT NULL THEN
    INSERT INTO public.kpi_objectives (advisor_id, kpi_code, year, target_count, etp, is_nc) VALUES
      (v_mathieu, 'KPI1',  2026, ROUND(59 * 0.475 / v_total_etp), 0.475, false),
      (v_mathieu, 'KPI2',  2026,  2, 0.475, false),
      (v_mathieu, 'KPI3A', 2026,  1, 0.475, false),
      (v_mathieu, 'KPI3B', 2026,  1, 0.475, false),
      (v_mathieu, 'KPI4',  2026,  2, 0.475, false),
      (v_mathieu, 'KPI5s', 2026,  0, 0.475, false),
      (v_mathieu, 'KPI5t', 2026,  4, 0.475, false),
      (v_mathieu, 'KPI6',  2026,  1, 0.475, false),
      (v_mathieu, 'KPI7',  2026,  1, 0.475, false)
    ON CONFLICT (advisor_id, kpi_code, year) DO NOTHING;
  END IF;
END $$;
