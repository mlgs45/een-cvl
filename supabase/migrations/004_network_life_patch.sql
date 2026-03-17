-- ============================================================
-- EEN CRM — Migration 004 : Patch complet module "Vie du réseau"
-- Idempotente : peut être rejouée même si 003 a été partiellement appliquée
-- ============================================================

-- 1. Colonne is_active sur users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- ============================================================
-- 2. TABLES (IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.network_activity_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  label_fr    text NOT NULL,
  label_en    text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.network_objectives (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id   uuid NOT NULL REFERENCES public.network_activity_categories(id) ON DELETE CASCADE,
  target_count  int NOT NULL DEFAULT 0,
  is_na         boolean NOT NULL DEFAULT false,
  period_start  date NOT NULL DEFAULT '2025-07-01',
  period_end    date NOT NULL DEFAULT '2028-12-31',
  UNIQUE (advisor_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.network_activity_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.network_activity_categories(id) ON DELETE RESTRICT,
  date        date NOT NULL,
  name        text NOT NULL,
  year        int GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)::int) STORED,
  comment     text,
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. TRIGGER updated_at (drop + recreate)
-- ============================================================

DROP TRIGGER IF EXISTS network_activity_logs_updated_at ON public.network_activity_logs;
CREATE TRIGGER network_activity_logs_updated_at
  BEFORE UPDATE ON public.network_activity_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.network_activity_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_objectives          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_activity_logs       ENABLE ROW LEVEL SECURITY;

-- Supprime les policies existantes avant de les recréer
DROP POLICY IF EXISTS "network_cats_select"       ON public.network_activity_categories;
DROP POLICY IF EXISTS "network_cats_insert_admin" ON public.network_activity_categories;
DROP POLICY IF EXISTS "network_cats_update_admin" ON public.network_activity_categories;
DROP POLICY IF EXISTS "network_cats_delete_admin" ON public.network_activity_categories;

DROP POLICY IF EXISTS "network_obj_select"        ON public.network_objectives;
DROP POLICY IF EXISTS "network_obj_insert_admin"  ON public.network_objectives;
DROP POLICY IF EXISTS "network_obj_update_admin"  ON public.network_objectives;
DROP POLICY IF EXISTS "network_obj_delete_admin"  ON public.network_objectives;

DROP POLICY IF EXISTS "network_logs_select"       ON public.network_activity_logs;
DROP POLICY IF EXISTS "network_logs_insert_own"   ON public.network_activity_logs;
DROP POLICY IF EXISTS "network_logs_update"       ON public.network_activity_logs;
DROP POLICY IF EXISTS "network_logs_delete"       ON public.network_activity_logs;

-- Recrée les policies
CREATE POLICY "network_cats_select"       ON public.network_activity_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "network_cats_insert_admin" ON public.network_activity_categories FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "network_cats_update_admin" ON public.network_activity_categories FOR UPDATE USING (public.is_admin());
CREATE POLICY "network_cats_delete_admin" ON public.network_activity_categories FOR DELETE USING (public.is_admin());

CREATE POLICY "network_obj_select"        ON public.network_objectives FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "network_obj_insert_admin"  ON public.network_objectives FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "network_obj_update_admin"  ON public.network_objectives FOR UPDATE USING (public.is_admin());
CREATE POLICY "network_obj_delete_admin"  ON public.network_objectives FOR DELETE USING (public.is_admin());

CREATE POLICY "network_logs_select"       ON public.network_activity_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "network_logs_insert_own"   ON public.network_activity_logs FOR INSERT WITH CHECK (auth.uid() = advisor_id OR public.is_admin());
CREATE POLICY "network_logs_update"       ON public.network_activity_logs FOR UPDATE USING (auth.uid() = created_by OR public.is_admin());
CREATE POLICY "network_logs_delete"       ON public.network_activity_logs FOR DELETE USING (auth.uid() = created_by OR public.is_admin());

-- ============================================================
-- 5. SEED : catégories (ON CONFLICT DO NOTHING)
-- ============================================================

INSERT INTO public.network_activity_categories (code, label_fr, label_en, sort_order) VALUES
  ('events',            'Évènements (webinaires, ateliers, workshops...)', 'Events (webinars, workshops...)',  1),
  ('b2b',               'Participation B2B',                               'B2B participation',                2),
  ('een_training',      'Formations EEN',                                  'EEN Training',                     3),
  ('thematic_group_eu', 'Thematic Group EU',                               'EU Thematic Group',                4),
  ('gt_tonic',          'Groupe de travail TONIC',                         'TONIC Working Group',              5),
  ('cluster_meeting',   'RDV de suivi cluster',                            'Cluster follow-up meeting',        6),
  ('web_content',       'Rédaction actualité site internet',               'Web content writing',              7)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 6. SEED : objectifs (ON CONFLICT DO NOTHING)
-- ============================================================

DO $$
DECLARE
  v_nadia    uuid; v_estelle uuid; v_mathieu uuid; v_coralie uuid;
  v_events   uuid; v_b2b     uuid; v_training uuid; v_thematic uuid;
  v_gt_tonic uuid; v_cluster uuid; v_web      uuid;
BEGIN
  SELECT id INTO v_nadia    FROM public.users WHERE full_name ILIKE 'Nadia%'   ORDER BY created_at LIMIT 1;
  SELECT id INTO v_estelle  FROM public.users WHERE full_name ILIKE 'Estelle%' ORDER BY created_at LIMIT 1;
  SELECT id INTO v_mathieu  FROM public.users WHERE full_name ILIKE 'Mathieu%' ORDER BY created_at LIMIT 1;
  SELECT id INTO v_coralie  FROM public.users WHERE full_name ILIKE 'Coralie%' ORDER BY created_at LIMIT 1;

  SELECT id INTO v_events    FROM public.network_activity_categories WHERE code = 'events';
  SELECT id INTO v_b2b       FROM public.network_activity_categories WHERE code = 'b2b';
  SELECT id INTO v_training  FROM public.network_activity_categories WHERE code = 'een_training';
  SELECT id INTO v_thematic  FROM public.network_activity_categories WHERE code = 'thematic_group_eu';
  SELECT id INTO v_gt_tonic  FROM public.network_activity_categories WHERE code = 'gt_tonic';
  SELECT id INTO v_cluster   FROM public.network_activity_categories WHERE code = 'cluster_meeting';
  SELECT id INTO v_web       FROM public.network_activity_categories WHERE code = 'web_content';

  IF v_nadia IS NOT NULL THEN
    INSERT INTO public.network_objectives (advisor_id, category_id, target_count, is_na) VALUES
      (v_nadia, v_events,   4,  false),
      (v_nadia, v_b2b,      0,  true),
      (v_nadia, v_training, 4,  false),
      (v_nadia, v_thematic, 8,  false),
      (v_nadia, v_gt_tonic, 9,  false),
      (v_nadia, v_cluster,  3,  false),
      (v_nadia, v_web,      24, false)
    ON CONFLICT (advisor_id, category_id) DO NOTHING;
  END IF;

  IF v_estelle IS NOT NULL THEN
    INSERT INTO public.network_objectives (advisor_id, category_id, target_count, is_na) VALUES
      (v_estelle, v_events,   4,  false),
      (v_estelle, v_b2b,      4,  false),
      (v_estelle, v_training, 4,  false),
      (v_estelle, v_thematic, 8,  false),
      (v_estelle, v_gt_tonic, 9,  false),
      (v_estelle, v_cluster,  12, false),
      (v_estelle, v_web,      24, false)
    ON CONFLICT (advisor_id, category_id) DO NOTHING;
  END IF;

  IF v_mathieu IS NOT NULL THEN
    INSERT INTO public.network_objectives (advisor_id, category_id, target_count, is_na) VALUES
      (v_mathieu, v_events,   4,  false),
      (v_mathieu, v_b2b,      4,  false),
      (v_mathieu, v_training, 4,  false),
      (v_mathieu, v_thematic, 8,  false),
      (v_mathieu, v_gt_tonic, 9,  false),
      (v_mathieu, v_cluster,  12, false),
      (v_mathieu, v_web,      24, false)
    ON CONFLICT (advisor_id, category_id) DO NOTHING;
  END IF;

  IF v_coralie IS NOT NULL THEN
    INSERT INTO public.network_objectives (advisor_id, category_id, target_count, is_na) VALUES
      (v_coralie, v_events,   4,  false),
      (v_coralie, v_b2b,      4,  false),
      (v_coralie, v_training, 4,  false),
      (v_coralie, v_thematic, 8,  false),
      (v_coralie, v_gt_tonic, 9,  false),
      (v_coralie, v_cluster,  12, false),
      (v_coralie, v_web,      24, false)
    ON CONFLICT (advisor_id, category_id) DO NOTHING;
  END IF;
END $$;
