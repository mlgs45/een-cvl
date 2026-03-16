-- ============================================================
-- EEN CRM — Initial Schema Migration
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('advisor', 'admin');

-- ============================================================
-- TABLES
-- ============================================================

-- Users (extends auth.users)
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  organisation text not null default 'CCIR Centre',
  role        user_role not null default 'advisor',
  created_at  timestamptz not null default now()
);

-- Companies
create table public.companies (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  vat_number      text,
  address         text,
  postcode        text,
  city            text,
  region          text,
  country         text not null default 'France',
  contact_name    text,
  phone           text,
  mobile          text,
  email           text,
  website         text,
  keywords        text,
  een_contact_id  uuid references public.users(id) on delete set null,
  created_by      uuid not null references public.users(id) on delete restrict,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Activity types
create table public.activity_types (
  id        uuid primary key default uuid_generate_v4(),
  label_fr  text not null,
  label_en  text not null,
  code      text unique not null,
  is_active boolean not null default true,
  sort_order int not null default 0
);

-- Activity subtypes
create table public.activity_subtypes (
  id               uuid primary key default uuid_generate_v4(),
  activity_type_id uuid not null references public.activity_types(id) on delete cascade,
  label_fr         text not null,
  label_en         text not null,
  code             text,
  is_active        boolean not null default true,
  sort_order       int not null default 0
);

-- Activities
create table public.activities (
  id                   uuid primary key default uuid_generate_v4(),
  company_id           uuid not null references public.companies(id) on delete cascade,
  date                 date not null,
  activity_type_id     uuid not null references public.activity_types(id) on delete restrict,
  activity_subtype_id  uuid references public.activity_subtypes(id) on delete set null,
  description          text,
  follow_up            boolean not null default false,
  follow_up_date       date,
  notes                text,
  created_by           uuid not null references public.users(id) on delete restrict,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_updated_at before update on public.companies
  for each row execute function set_updated_at();

create trigger activities_updated_at before update on public.activities
  for each row execute function set_updated_at();

-- ============================================================
-- AUTO-CREATE USER PROFILE ON SIGN-UP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, full_name, organisation, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'organisation', 'CCIR Centre'),
    'advisor'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.companies enable row level security;
alter table public.activity_types enable row level security;
alter table public.activity_subtypes enable row level security;
alter table public.activities enable row level security;

-- Helper: is current user an admin?
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---- users ----
create policy "users_select_own" on public.users
  for select using (auth.uid() = id or public.is_admin());

create policy "users_update_own" on public.users
  for update using (auth.uid() = id or public.is_admin());

create policy "users_insert_admin" on public.users
  for insert with check (public.is_admin());

create policy "users_delete_admin" on public.users
  for delete using (public.is_admin());

-- ---- companies ----
create policy "companies_select_all" on public.companies
  for select using (auth.role() = 'authenticated');

create policy "companies_insert_own" on public.companies
  for insert with check (auth.uid() = created_by);

create policy "companies_update" on public.companies
  for update using (auth.uid() = created_by or public.is_admin());

create policy "companies_delete" on public.companies
  for delete using (auth.uid() = created_by or public.is_admin());

-- ---- activity_types ----
create policy "activity_types_select" on public.activity_types
  for select using (auth.role() = 'authenticated');

create policy "activity_types_insert_admin" on public.activity_types
  for insert with check (public.is_admin());

create policy "activity_types_update_admin" on public.activity_types
  for update using (public.is_admin());

create policy "activity_types_delete_admin" on public.activity_types
  for delete using (public.is_admin());

-- ---- activity_subtypes ----
create policy "activity_subtypes_select" on public.activity_subtypes
  for select using (auth.role() = 'authenticated');

create policy "activity_subtypes_insert_admin" on public.activity_subtypes
  for insert with check (public.is_admin());

create policy "activity_subtypes_update_admin" on public.activity_subtypes
  for update using (public.is_admin());

create policy "activity_subtypes_delete_admin" on public.activity_subtypes
  for delete using (public.is_admin());

-- ---- activities ----
create policy "activities_select_all" on public.activities
  for select using (auth.role() = 'authenticated');

create policy "activities_insert_own" on public.activities
  for insert with check (auth.uid() = created_by);

create policy "activities_update" on public.activities
  for update using (auth.uid() = created_by or public.is_admin());

create policy "activities_delete" on public.activities
  for delete using (auth.uid() = created_by or public.is_admin());

-- ============================================================
-- SEED DATA — activity_types + activity_subtypes
-- ============================================================

insert into public.activity_types (id, label_fr, label_en, code, sort_order) values
  ('11111111-0000-0000-0000-000000000001', 'Basic Network Service',    'Basic Network Service',    'basic_network_service',    1),
  ('11111111-0000-0000-0000-000000000002', 'Advisory Service',         'Advisory Service',         'advisory_service',         2),
  ('11111111-0000-0000-0000-000000000003', 'Partnering Service',       'Partnering Service',       'partnering_service',       3),
  ('11111111-0000-0000-0000-000000000004', 'Advisory Achievement (AA)','Advisory Achievement (AA)','advisory_achievement',     4),
  ('11111111-0000-0000-0000-000000000005', 'Partnering Achievement (PA)','Partnering Achievement (PA)','partnering_achievement', 5),
  ('11111111-0000-0000-0000-000000000006', 'Impact Assessment',        'Impact Assessment',        'impact_assessment',        6),
  ('11111111-0000-0000-0000-000000000007', 'Parcours Client',          'Customer Journey',         'parcours_client',          7),
  ('11111111-0000-0000-0000-000000000008', 'Suivi Client',             'Customer Follow-up',       'suivi_client',             8),
  ('11111111-0000-0000-0000-000000000009', 'EEN2EIC Support (female entrepreneurs)', 'EEN2EIC Support (female entrepreneurs)', 'een2eic_support', 9);

-- Advisory Service subtypes
insert into public.activity_subtypes (activity_type_id, label_fr, label_en, code, sort_order) values
  ('11111111-0000-0000-0000-000000000002', 'Accès au financement',             'Access to finance',                    'finance',           1),
  ('11111111-0000-0000-0000-000000000002', 'Digitalisation',                   'Digitalisation',                       'digital',           2),
  ('11111111-0000-0000-0000-000000000002', 'Innovation',                       'Innovation',                           'innovation',        3),
  ('11111111-0000-0000-0000-000000000002', 'Internationalisation',             'Internationalisation',                 'international',     4),
  ('11111111-0000-0000-0000-000000000002', 'Intégration régionale',            'Regional integration',                 'regional',          5),
  ('11111111-0000-0000-0000-000000000002', 'Résilience',                       'Resilience',                           'resilience',        6),
  ('11111111-0000-0000-0000-000000000002', 'Marché unique',                    'Single Market',                        'single_market',     7),
  ('11111111-0000-0000-0000-000000000002', 'Renforcement des capacités PME',   'SME Capacity building',                'sme_capacity',      8),
  ('11111111-0000-0000-0000-000000000002', 'Services durabilité',              'Sustainability services',              'sustainability',    9);

-- Partnering Service subtypes
insert into public.activity_subtypes (activity_type_id, label_fr, label_en, code, sort_order) values
  ('11111111-0000-0000-0000-000000000003', 'Business',                         'Business',                             'ps_business',       1),
  ('11111111-0000-0000-0000-000000000003', 'Collaboration R&D',                'Collaboration fostering R&D activities','ps_rnd',           2),
  ('11111111-0000-0000-0000-000000000003', 'Transfert technologique',          'Innovation/technology transfer',       'ps_tech',           3);

-- Partnering Achievement subtypes
insert into public.activity_subtypes (activity_type_id, label_fr, label_en, code, sort_order) values
  ('11111111-0000-0000-0000-000000000005', 'Business PA',                      'Business PA',                          'pa_business',       1),
  ('11111111-0000-0000-0000-000000000005', 'Technology PA',                    'Technology PA',                        'pa_technology',     2),
  ('11111111-0000-0000-0000-000000000005', 'Research PA',                      'Research PA',                          'pa_research',       3);

-- Parcours Client subtypes
insert into public.activity_subtypes (activity_type_id, label_fr, label_en, code, sort_order) values
  ('11111111-0000-0000-0000-000000000007', 'Analyse & Plan d''actions',        'Analysis & Action plan',               'analyse_plan',      1);

-- Suivi Client subtypes
insert into public.activity_subtypes (activity_type_id, label_fr, label_en, code, sort_order) values
  ('11111111-0000-0000-0000-000000000008', 'Entretien de suivi (face-à-face ou tél)', 'Follow-up meeting',           'suivi_meeting',     1),
  ('11111111-0000-0000-0000-000000000008', 'Appel téléphonique ou échange email',     'Phone call or email',         'suivi_phone',       2),
  ('11111111-0000-0000-0000-000000000008', 'Signposting interne & externe',           'Internal & external signposting', 'suivi_signpost', 3),
  ('11111111-0000-0000-0000-000000000008', 'Autre action de suivi',                   'Other follow-up action',      'suivi_other',       4);

-- EEN2EIC subtypes
insert into public.activity_subtypes (activity_type_id, label_fr, label_en, code, sort_order) values
  ('11111111-0000-0000-0000-000000000009', 'Support EIC Accelerator short proposal', 'Support EIC Accelerator short proposal', 'eic_short', 1),
  ('11111111-0000-0000-0000-000000000009', 'Support EIC Accelerator full proposal + granted', 'Support EIC Accelerator full proposal + granted', 'eic_full', 2);
