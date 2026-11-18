-- Permanent, unique member URLs, first deployed 2026-11-18.
-- Existing members keep their assigned slug when their stage name changes.
alter table public.member_profiles add column if not exists profile_slug text;

do $seed$
declare
  person record;
  base_slug text;
  candidate text;
  seq integer;
begin
  for person in
    select user_id, stage_name
    from public.member_profiles
    where profile_slug is null
    order by created_at, user_id
  loop
    base_slug := trim(both '-' from left(lower(regexp_replace(person.stage_name, '[^a-zA-Z0-9]+', '-', 'g')), 54));
    if base_slug = '' then base_slug := 'member'; end if;
    candidate := base_slug;
    seq := 2;
    while exists(select 1 from public.member_profiles where profile_slug = candidate) loop
      candidate := base_slug || '-' || seq;
      seq := seq + 1;
    end loop;
    update public.member_profiles set profile_slug = candidate where user_id = person.user_id;
  end loop;
end
$seed$;

alter table public.member_profiles
  add constraint member_profiles_profile_slug_unique unique (profile_slug);

create or replace function public.a2k_assign_member_profile_slug()
returns trigger
language plpgsql
set search_path = ''
as $body$
declare
  base_slug text;
  candidate text;
  seq integer := 2;
begin
  if tg_op = 'UPDATE' then
    new.profile_slug := old.profile_slug;
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(148249227);
  base_slug := pg_catalog.btrim(pg_catalog.left(pg_catalog.lower(
    pg_catalog.regexp_replace(new.stage_name, '[^a-zA-Z0-9]+', '-', 'g')), 54), '-');
  if base_slug = '' then base_slug := 'member'; end if;
  candidate := base_slug;
  while exists (select 1 from public.member_profiles where profile_slug = candidate) loop
    candidate := base_slug || '-' || seq;
    seq := seq + 1;
  end loop;
  new.profile_slug := candidate;
  return new;
end
$body$;

drop trigger if exists a2k_member_profile_slug_before_write on public.member_profiles;
create trigger a2k_member_profile_slug_before_write
before insert or update of profile_slug on public.member_profiles
for each row
execute function public.a2k_assign_member_profile_slug();

alter table public.member_profiles
  alter column profile_slug set not null;