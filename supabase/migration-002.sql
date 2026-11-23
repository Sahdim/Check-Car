-- Check & Car : migration 002 (à exécuter APRÈS schema.sql de la première version).
-- Supabase > SQL Editor > New query > coller tout ce fichier > Run.
-- On peut le relancer sans risque (rien n'est effacé, rien n'est créé deux fois).
--
-- Ajoute : documents (rapports de diagnostic), codes défaut relevés, département de la plaque,
--          dossier de stockage « rapports » et ses règles de sécurité.

-- Nouvelles colonnes du véhicule
alter table public.vehicles add column if not exists docs jsonb not null default '[]'::jsonb; -- documents : titre, date, chemin, type, taille
alter table public.vehicles add column if not exists dtc  jsonb not null default '[]'::jsonb; -- codes défaut relevés : code, date, km, note
alter table public.vehicles add column if not exists dept text  not null default '';          -- département affiché sur la plaque

-- Le client (anonyme) ne lit JAMAIS la table directement : seulement la fonction ci-dessous
revoke all on public.vehicles from anon;
-- Projets Supabase récents : les tables ne sont plus ouvertes automatiquement aux comptes connectés.
-- On donne l'accès au rôle « authenticated » ; les règles RLS ci-dessus limitent toujours chaque garagiste à ses véhicules.
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.vehicles to service_role;


-- Accès client : avec son code, le client voit UNIQUEMENT son véhicule.
-- SECURITY DEFINER = la fonction passe outre la sécurité ci-dessus, mais ne renvoie
-- qu'une ligne précise, SANS garage_id, ni téléphone, ni photo de carte grise (adresse du titulaire).
create or replace function public.get_vehicle_by_code(code text)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'id', v.id, 'owner', v.owner, 'brand', v.brand, 'model', v.model, 'engine', v.engine,
    'hp', v.hp, 'body', v.body, 'plate', v.plate, 'dept', v.dept, 'vin', v.vin, 'year', v.year, 'km', v.km,
    'interval_km', v.interval_km, 'interval_months', v.interval_months, 'ct', v.ct,
    'code', v.code, 'items', v.items, 'docs', v.docs, 'dtc', v.dtc, 'example', v.example
  )
  from public.vehicles v
  where v.code = upper(trim(get_vehicle_by_code.code))
  limit 1;
$$;

revoke all on function public.get_vehicle_by_code(text) from public;
grant execute on function public.get_vehicle_by_code(text) to anon, authenticated;

-- Stockage des rapports de diagnostic : dossier (bucket) « rapports », PUBLIC en lecture.
-- Chemin d'un fichier : <garage_id>/<vehicle_id>/<uuid>.pdf  -> nom tiré au hasard, impossible à deviner.
insert into storage.buckets (id, name, public)
values ('rapports', 'rapports', true)
on conflict (id) do nothing;

-- Limites côté serveur (en plus de celles de l'appli) : 10 Mo, PDF et photos seulement
update storage.buckets
set public = true,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']
where id = 'rapports';

-- Le garagiste connecté peut envoyer / remplacer / supprimer SEULEMENT dans son dossier (<son id>/...)
drop policy if exists "rapports : garage ajoute" on storage.objects;
create policy "rapports : garage ajoute" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'rapports' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "rapports : garage modifie" on storage.objects;
create policy "rapports : garage modifie" on storage.objects
  for update to authenticated
  using (bucket_id = 'rapports' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'rapports' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "rapports : garage supprime" on storage.objects;
create policy "rapports : garage supprime" on storage.objects
  for delete to authenticated
  using (bucket_id = 'rapports' and (storage.foldername(name))[1] = auth.uid()::text);

-- Supabase demande aussi le droit de lecture pour supprimer : limité à son propre dossier.
-- (Le public lit les fichiers par leur adresse publique, sans cette règle : bucket public.)
drop policy if exists "rapports : garage lit" on storage.objects;
create policy "rapports : garage lit" on storage.objects
  for select to authenticated
  using (bucket_id = 'rapports' and (storage.foldername(name))[1] = auth.uid()::text);
