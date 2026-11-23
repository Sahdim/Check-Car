-- Check & Car : base de données Supabase
-- Fichier COMPLET (version 1 + migration-002) : pour un projet neuf, coller tout ce fichier dans
-- Supabase > SQL Editor > New query, puis « Run ». Pour un projet déjà en place : exécuter seulement migration-002.sql.

create extension if not exists pgcrypto;

-- Table des véhicules : chaque véhicule appartient à un garagiste (garage_id = son compte)
create table if not exists public.vehicles (
  id              uuid primary key default gen_random_uuid(),
  garage_id       uuid not null references auth.users (id) on delete cascade default auth.uid(),
  owner           text not null default '',
  phone           text not null default '',
  brand           text not null default '',
  model           text not null default '',
  engine          text not null default '',
  hp              integer,
  body            text not null default '',
  plate           text not null default '',
  vin             text not null default '',
  year            integer,
  km              integer not null default 0,
  interval_km     integer not null default 15000,  -- km entre deux vidanges
  interval_months integer not null default 12,     -- mois entre deux vidanges
  ct              date,                            -- prochain contrôle technique
  code            text not null unique,            -- code client XXXX-XXXX
  dept            text not null default '',        -- département affiché sur la plaque
  items           jsonb not null default '[]'::jsonb, -- historique des interventions
  docs            jsonb not null default '[]'::jsonb, -- documents (rapports de diagnostic)
  dtc             jsonb not null default '[]'::jsonb, -- codes défaut relevés
  photo_cg        text,                            -- photo de la carte grise (base64)
  example         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint code_format check (code ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}$')
);

create index if not exists vehicles_garage_idx on public.vehicles (garage_id);

-- Met à jour updated_at à chaque modification
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists vehicles_touch on public.vehicles;
create trigger vehicles_touch before update on public.vehicles
for each row execute function public.touch_updated_at();

-- Sécurité : chaque garagiste ne voit et ne modifie QUE ses véhicules
alter table public.vehicles enable row level security;

drop policy if exists "garage lit ses vehicules" on public.vehicles;
create policy "garage lit ses vehicules" on public.vehicles
  for select to authenticated using (garage_id = auth.uid());

drop policy if exists "garage ajoute ses vehicules" on public.vehicles;
create policy "garage ajoute ses vehicules" on public.vehicles
  for insert to authenticated with check (garage_id = auth.uid());

drop policy if exists "garage modifie ses vehicules" on public.vehicles;
create policy "garage modifie ses vehicules" on public.vehicles
  for update to authenticated using (garage_id = auth.uid()) with check (garage_id = auth.uid());

drop policy if exists "garage supprime ses vehicules" on public.vehicles;
create policy "garage supprime ses vehicules" on public.vehicles
  for delete to authenticated using (garage_id = auth.uid());

-- Projet créé avec une ancienne version du fichier : ajoute les colonnes manquantes
alter table public.vehicles add column if not exists docs jsonb not null default '[]'::jsonb;
alter table public.vehicles add column if not exists dtc  jsonb not null default '[]'::jsonb;
alter table public.vehicles add column if not exists dept text  not null default '';

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
