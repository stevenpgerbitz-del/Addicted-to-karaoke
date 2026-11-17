-- A2K build 260: require server-verified, single-use deletion proof.
-- The old deletion RPC is no longer executable from the public application.
create table if not exists public.member_deletion_proofs (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null references auth.users(id) on delete cascade,
 target_id uuid not null references auth.users(id) on delete cascade,
 snapshot_signature text not null,
 proof_sha256 text not null,
 verified_method text not null check (verified_method in ('password','google_confirmation')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 constraint member_deletion_proof_expiry check (expires_at > created_at and expires_at <= created_at + interval '10 minutes')
);
alter table public.member_deletion_proofs enable row level security;
revoke all on public.member_deletion_proofs from PUBLIC, anon, authenticated;
grant select,insert,update,delete on public.member_deletion_proofs to service_role;
create index if not exists member_deletion_proofs_expiration_idx on public.member_deletion_proofs(expires_at);

create or replace function public.a2k_member_deletion_execute_verified(
 p_target uuid,
 p_signature text,
 p_confirmation text,
 p_reason text,
 p_proof text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $func$
declare
 v_actor uuid := auth.uid();
 v_proof_id uuid;
 v_result jsonb;
begin
 if v_actor is null or p_target is null then
   raise exception 'Sign in to continue' using errcode='42501';
 end if;
 if p_proof is null or length(p_proof)<32 or length(p_proof)>256 then
   raise exception 'Verify your identity to delete this account' using errcode='42501';
 end if;
 select id into v_proof_id
 from public.member_deletion_proofs
 where actor_id=v_actor
   and target_id=p_target
   and snapshot_signature=p_signature
   and proof_sha256=encode(extensions.digest(convert_to(p_proof,'UTF8'),'sha256'),'hex')
   and expires_at > now()
 for update;
 if v_proof_id is null then
   raise exception 'Identity verification expired or was not completed. Please start again.'
     using errcode='42501';
 end if;
 delete from public.member_deletion_proofs where id=v_proof_id;
 -- Existing account-deletion routine still checks role protections,
 -- confirmation, impact snapshot, and transactional clean-up.
 v_result:=public.a2k_member_deletion_execute(p_target,p_signature,p_confirmation,p_reason);
 return v_result;
end;
$func$;

revoke all on function public.a2k_member_deletion_execute(uuid,text,text,text) from PUBLIC,anon,authenticated;
revoke all on function public.a2k_member_deletion_execute_verified(uuid,text,text,text,text) from PUBLIC,anon;
grant execute on function public.a2k_member_deletion_execute_verified(uuid,text,text,text,text) to authenticated;
