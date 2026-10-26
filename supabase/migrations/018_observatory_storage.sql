-- Observatoire FAME : vues publiées par le serveur de la pipeline (publish_snapshots.py
-- du dépôt fame_observatory) dans un bucket privé, lues par le dashboard hébergé.
-- L'écriture passe par la clé service-role du serveur ; la lecture est réservée aux
-- membres activés.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('observatory', 'observatory', false, 10485760, array['application/gzip'])
on conflict (id) do nothing;

-- members a la RLS sans policy de lecture : la vérification passe par une fonction définie
-- par le propriétaire, limitée à la ligne de l'utilisateur connecté.
create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where id = auth.uid() and activated_at is not null
  )
$$;

revoke execute on function public.is_active_member() from public, anon;
grant execute on function public.is_active_member() to authenticated;

create policy "observatory_read_active_members"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'observatory' and public.is_active_member());
