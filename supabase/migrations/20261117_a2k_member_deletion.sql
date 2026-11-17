-- A2K account deletion: authenticated preview + guarded transactional deletion.
-- Never let a caller delete a Founder or any privileged platform account.

create table if not exists public.member_deletion_events (
  id bigint generated always as identity primary key,
  deletion_kind text not null check (deletion_kind in ('self','management')),
  deleted_venues integer not null,
  deleted_reviews integer not null,
  deleted_kj_reviews integer not null,
  deleted_photos integer not null,
  deleted_songs integer not null,
  created_at timestamptz not null default now()
);
alter table public.member_deletion_events enable row level security;
revoke all on public.member_deletion_events from public, anon, authenticated;

create or replace function public.a2k_member_deletion_preview(p_target uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
  v_target_role text;
  v_name text;
  v_member_number bigint;
  v_venues uuid[];
  v_content jsonb;
  v_files jsonb;
begin
  if v_actor is null or not exists(select 1 from auth.users where id=v_actor) then
    raise exception 'Sign in to continue' using errcode='42501';
  end if;
  if p_target is null then
    raise exception 'Choose a member account' using errcode='22023';
  end if;
  select role into v_actor_role from public.platform_roles where user_id=v_actor;
  select role into v_target_role from public.platform_roles where user_id=p_target;
  select coalesce(nullif(p.stage_name,''),'Karaoke Member'),n.member_number
  into v_name,v_member_number
  from auth.users u
  left join public.member_profiles p on p.user_id=u.id
  left join public.atk_membership_numbers n on n.user_id=u.id
  where u.id=p_target;
  if not found then
    raise exception 'This member no longer exists' using errcode='P0002';
  end if;
  if p_target<>v_actor and coalesce(v_actor_role,'') not in ('founder','super_admin','admin') then
    raise exception 'Only administrators can remove another member' using errcode='42501';
  end if;
  if v_target_role is not null and v_target_role<>'member' or v_member_number=1 then
    raise exception 'Protected platform accounts cannot be permanently deleted here' using errcode='42501';
  end if;
  -- Historical actions performed as an admin cannot be reassigned to another person.
  if exists(select 1 from public.management_audit_log a where a.actor_id=p_target) then
    raise exception 'This account has administrative history. Contact the Founder for a manual review.'
    using errcode='42501';
  end if;

  select coalesce(array_agg(id),'{}'::uuid[]) into v_venues
  from public.venues where contributed_by=p_target;

  select jsonb_build_object(
    'venues',cardinality(v_venues),
    'venue_reviews',(select count(*) from public.reviews where reviewer_id=p_target or venue_id=any(v_venues)),
    'kj_reviews',(select count(*) from public.kj_reviews where reviewer_id=p_target or host_user_id=p_target or venue_id=any(v_venues)),
    'photos',(select count(*) from public.venue_photos where uploader_user_id=p_target or venue_id=any(v_venues)),
    'songs',(select count(*) from public.karaoke_songs where user_id=p_target),
    'favorites',(select count(*) from public.venue_favorites where user_id=p_target or venue_id=any(v_venues)),
    'host_requests',(select count(*) from public.kj_host_submissions where user_id=p_target or venue_id=any(v_venues)),
    'venue_suggestions',(select count(*) from public.venue_suggestions where submitted_by=p_target),
    'venue_claims',(select count(*) from public.venue_claim_requests where claimant_user_id=p_target or venue_id=any(v_venues)),
    'owner_claims',(select count(*) from public.verified_venue_claims where owner_user_id=p_target or venue_id=any(v_venues)),
    'special_events',(select count(*) from public.karaoke_special_events e where e.created_by=p_target or e.venue_id=any(v_venues) or e.id in
        (select linked_event_id from public.karaoke_event_suggestions where submitted_by=p_target and linked_event_id is not null)),
    'special_event_suggestions',(select count(*) from public.karaoke_event_suggestions where submitted_by=p_target),
    'venue_reports',(select count(*) from public.venue_reports where reporter_id=p_target or venue_id=any(v_venues)),
    'account_reviews_by_others',(select count(*) from public.reviews where venue_id=any(v_venues) and reviewer_id is distinct from p_target),
    'kj_reviews_by_others',(select count(*) from public.kj_reviews where (host_user_id=p_target or venue_id=any(v_venues)) and reviewer_id<>p_target)
  ) into v_content;

  -- The Storage API, not SQL, must delete the physical objects. Include
  -- original member uploads and photo files attached to venues they created.
  select coalesce(jsonb_agg(jsonb_build_object('bucket',bucket_id,'path',name) order by bucket_id,name),'[]'::jsonb)
  into v_files
  from storage.objects o
  where o.owner_id=p_target::text
     or (o.bucket_id='member-avatars' and
       (o.name like p_target::text||'/%'
        or o.name=(select avatar_path from public.member_profiles where user_id=p_target)))
     or (o.bucket_id='venue-community-photos' and o.name in (
       select storage_path from public.venue_photos
       where uploader_user_id=p_target or venue_id=any(v_venues)));

  if jsonb_array_length(v_files)>500 then
    raise exception 'More than 500 uploaded files. Please contact A2K support for manual deletion.'
    using errcode='54000';
  end if;
  return jsonb_build_object(
    'user_id',p_target, 'name',v_name,'member_number',v_member_number,
    'kind',case when v_actor=p_target then 'self' else 'management' end,
    'content',v_content,'storage_files',v_files,
    'storage_count',jsonb_array_length(v_files),
    'signature',md5(p_target::text||v_content::text)
  );
end;
$func$;

create or replace function public.a2k_member_deletion_execute(
  p_target uuid,p_signature text,p_confirmation text,p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $func$
declare
 v_actor uuid := auth.uid();
 v_snapshot jsonb;
 v_content jsonb;
 v_name text;
 v_kind text;
 v_removed integer;
begin
 if v_actor is null then
   raise exception 'Sign in to continue' using errcode='42501';
 end if;
 -- Lock the selected account before rechecking all permissions.
 perform 1 from auth.users where id=p_target for update;
 if not found then
   raise exception 'Account was already removed' using errcode='P0002';
 end if;
 v_snapshot:=public.a2k_member_deletion_preview(p_target);
 v_content:=v_snapshot->'content';
 v_kind:=v_snapshot->>'kind';
 v_name:=v_snapshot->>'name';
 if p_signature is null or p_signature is distinct from v_snapshot->>'signature' then
   raise exception 'Member content changed. Review the updated deletion preview first.'
   using errcode='40001';
 end if;
 if jsonb_array_length(v_snapshot->'storage_files')>0 then
   raise exception 'Uploaded files must be removed by the secure storage service first.'
   using errcode='23503';
 end if;
 if (v_kind='self' and p_confirmation is distinct from 'DELETE MY ACCOUNT')
    or (v_kind='management' and p_confirmation is distinct from 'DELETE MEMBER') then
   raise exception 'Type the confirmation phrase exactly' using errcode='22023';
 end if;
 if v_kind='management' and length(btrim(coalesce(p_reason,'')))<5 then
   raise exception 'Please enter a reason of at least five characters' using errcode='22023';
 end if;
 if length(coalesce(p_reason,''))>400 then
   raise exception 'Deletion reason is too long' using errcode='22023';
 end if;

 -- Remove content which otherwise survives as anonymous rows or linked events.
 delete from public.reviews where reviewer_id=p_target;
 delete from public.kj_reviews where reviewer_id=p_target;
 delete from public.venue_photos where uploader_user_id=p_target;
 delete from public.venue_reports where reporter_id=p_target;
 delete from public.venue_suggestions where submitted_by=p_target;
 delete from public.karaoke_special_events
 where created_by=p_target or id in (
   select linked_event_id from public.karaoke_event_suggestions where submitted_by=p_target and linked_event_id is not null
 );
 delete from public.karaoke_event_suggestions where submitted_by=p_target;
 delete from public.verified_venue_claims where owner_user_id=p_target;
 delete from public.venues where contributed_by=p_target;

 -- Clear previous admin references without deleting the activity history.
 update public.management_audit_log
 set target_id=null,old_value=null,new_value=null,
     reason='Account subsequently deleted; record retained without member details'
 where target_id=p_target;

 -- Auth cascades remove profile, KJ hosting requests, favorites, songs and badges.
 delete from auth.users where id=p_target;
 get diagnostics v_removed=row_count;
 if v_removed<>1 then
   raise exception 'Could not delete the requested account';
 end if;

 insert into public.member_deletion_events
  (deletion_kind,deleted_venues,deleted_reviews,deleted_kj_reviews,deleted_photos,deleted_songs)
 values
  (v_kind,(v_content->>'venues')::integer,(v_content->>'venue_reviews')::integer,
   (v_content->>'kj_reviews')::integer,(v_content->>'photos')::integer,(v_content->>'songs')::integer);

 if v_kind='management' then
   insert into public.management_audit_log
    (actor_id,target_id,action,old_value,new_value,reason)
   values (v_actor,null,'member_permanently_deleted',null,
     jsonb_build_object('deleted_member_data',v_content,'member_account_deleted',true),
     btrim(p_reason));
 end if;
 return jsonb_build_object('deleted',true,'kind',v_kind,'content',v_content);
end;
$func$;

revoke all on function public.a2k_member_deletion_preview(uuid) from public, anon;
revoke all on function public.a2k_member_deletion_execute(uuid,text,text,text) from public, anon;
grant execute on function public.a2k_member_deletion_preview(uuid) to authenticated;
grant execute on function public.a2k_member_deletion_execute(uuid,text,text,text) to authenticated;
