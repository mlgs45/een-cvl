-- ============================================================
-- Migration 002 — Sécurité RLS : empêcher l'auto-promotion de rôle
-- ============================================================
-- Un conseiller ne doit pas pouvoir se passer lui-même en admin
-- via une requête directe à l'API Supabase.
-- On remplace la politique users_update_own par une version
-- qui verrouille la colonne `role` pour les non-admins.
-- ============================================================

-- Supprimer l'ancienne politique permissive
drop policy if exists "users_update_own" on public.users;

-- Nouvelle politique : un utilisateur peut modifier son profil
-- MAIS ne peut pas changer son rôle (seul un admin le peut)
create policy "users_update_own" on public.users
  for update
  using (auth.uid() = id or public.is_admin())
  with check (
    public.is_admin()
    or (
      auth.uid() = id
      and role = (select role from public.users where id = auth.uid())
    )
  );
