# A2K Coordination — Milo ↔ Sophie

Steven asked for one shared note so the two AIs working on Addicted to Karaoke
stop stepping on each other. This file is it. Either AI updates their own
section when something changes. Steven is the tiebreaker and approves every
publish to main.

## Who does what

- **Milo — website / frontend.** Everything in this repo: index.html, CSS/JS
  layers, the Management Portal shell, wizards, and the live site's behavior.
  He publishes straight to main after Steven's approval (one push = one
  approval card).
- **Sophie — database / backend.** Supabase: tables, migrations, RPC
  functions, RLS policies, Auth/email config. She does not change website
  files; Milo does not change the database.
- **Shared surface (coordinate here first):** the RPCs the website calls
  (`is_platform_founder`, `is_platform_admin`, `founder_*`, `management_*`),
  and the index.html inline script that gates on them. If either side changes
  one, note it below BEFORE shipping so the other side can match it.

## Rules

1. Check main's head before pushing; never push on top of a head you haven't
   read. Current head is in "Live state" below.
2. One bundle per publish; Steven approves each publish in chat.
3. Never edit the other side's section below — add your own entry instead.
4. Don't change access control (who can see or do admin things) without
   Steven's explicit say-so.
5. Desktop first, then mobile, then PWA (Steven's order). The mobile portal
   stays untouched.

## Live state (update when it changes)

- **Main head:** `8fd7f061` (Nov 24, 2026) — sample-data fix published (7 fictional sample venues removed from Find first render; skeleton/loading state only).
- **Live site:** addictedtokaraoke.com (GitHub Pages; allow ~3 min after a
  push before the new files serve).

## Milo — current work

- **Sample-data fix (PUBLISHED Nov 24, 2026, commit `8fd7f061`):** 7 fictional
  sample venues removed from Find first render; skeleton/loading state only.
  Live-verified: skeletons + "Loading published venues…" + zero fake names.
- **Permissions frontend fix (STAGED in push101/, NOT published):** Management
  button, portal open checks, venue save buttons, Special Events approval
  panel, KJ review moderation, and Badge Management open gate switched to
  `is_platform_admin()`. Founder-exclusives kept (venue delete, backup/
  restore/wipe, badge apply, role-change save). Published only after
  Steven's approval.
- **Milo's test account:** Milo AI (Super Admin, NOT founder — do not flip the
  founder flag). Member #000018, steven.g.droid@gmail.com.

## Sophie — current work

- **Done Nov 24, 2026:** new RPC `is_platform_admin()` (Founder true, Super
  Admin true, Admin/Moderator/Member false). Updated DB policies for venues,
  approvals, special events, claims, photo management. Server permission
  tests with Milo's Member #000018 passed. No website files changed.
- **Founder-only (do not widen):** appointing/removing Super Admins,
  permanent venue deletion, Activity History, System maintenance/backup/
  restore/wipe, badge threshold changes, manual Founding Tester and
  Community Supporter badge awards. Super Admins can preview badge
  threshold changes but cannot apply them.


### Sophie — Nov 24: permission confirmations and Role & Permission Management v1.0

**Live server contract (verified):** migration `allow_super_admin_management_center` is applied. `is_platform_admin()` currently means Founder OR Super Admin only; existing RPC signatures unchanged. `founder_badge_rules_preview` permits both; `founder_badge_rule_update` remains Founder-only. `management_set_member_access` permits Super Admin to manage lower roles, but only Founder can appoint/remove Super Admins (also enforced by role trigger). `founder_delete_venue` and `management_read_audit_history` remain Founder-only. Member-profile audit history is empty for Super Admin. KJ verification and review/notification RPCs already support appropriate staff roles. Database identity tests passed; browser end-to-end tests still needed. No website changes by Sophie.

**Founder-approved direction, NOT yet live:** introduce exactly one Co-Founder, expand Admin and Moderator access, and provide an in-site role guide. This is the target matrix for implementation, not the currently effective permissions. No new role assignments or authorization changes in this documentation commit.

| Capability | Founder | Co-Founder | Super Admin | Admin | Moderator |
|---|---|---|---|---|---|
| Open Management Center; see own permissions | Yes | Yes | Yes | Yes | Yes |
| View approvals, venues, events, reviews, notifications | Yes | Yes | Yes | Yes | Yes |
| View administrative member directory/profile | Yes | Yes | Yes | Yes | Limited to moderation needs |
| Create/edit venues, contact details, genres, amenities, schedules | Yes | Yes | Yes | Yes | Yes |
| Approve/decline venue submissions | Yes | Yes | Yes | Yes | Yes |
| Review venue/member reports and issue warnings | Yes | Yes | Yes | Yes | Yes |
| Approve/reject/hide/spam reviews | Yes | Yes | Yes | Yes | Yes |
| Suspend review privileges | Yes | Yes | Yes | Yes | Yes |
| Restore moderated reviews | Yes | Yes | Yes | Yes | No |
| Approve/reject/remove photos; change cover | Yes | Yes | Yes | Yes | Yes |
| Restore removed photos | Yes | Yes | Yes | Yes | No |
| Approve/reject KJ hosting schedules | Yes | Yes | Yes | Yes | Yes |
| Approve/edit/decline special events | Yes | Yes | Yes | Yes | Yes |
| Verify/unverify members and KJs | Yes | Yes | Yes | Yes | No |
| Approve venue ownership claims | Yes | Yes | Yes | Yes | No |
| Archive/restore venues | Yes | Yes | Yes | Yes | No |
| Suspend member accounts | Yes | Yes | Yes | Yes | No |
| Delete lower-ranked member accounts | Yes | Yes | Ordinary members only | No | No |
| Assign/remove Admins and Moderators | Yes | Yes | Yes | No | No |
| Assign/remove Super Admins | Yes | Yes | No | No | No |
| Permanently delete venues | Yes | Yes | No | No | No |
| Read badge requirements | Yes | Yes | Yes | Yes | Yes |
| Preview badge threshold changes | Yes | Yes | Yes | No | No |
| Apply badge thresholds; award/revoke manual badges | Yes | Yes | No | No | No |
| Read/export Activity History | Yes | Yes | No | No | No |
| System backup | Yes | Yes | No | No | No |
| Restore system/member access | Yes | Yes, protected restore only | No | No | No |
| General website settings | Yes | Yes | No | No | No |
| Appoint/remove Co-Founder | Yes | No | No | No | No |
| Ownership transfer, permission hierarchy changes, full wipe, audit wipe, Go Live finalizer | Yes | No | No | No | No |

Members and guests have no platform management access. Singer/KJ/Venue Staff interests and venue-scoped team permissions are independent of platform rank.

**Ownership invariants:** Founder #000001 is unique and protected. Only Founder appoints/removes the single Co-Founder. Co-Founder cannot delete, suspend, demote, change verification or otherwise alter Founder; cannot promote self or alter own privileges. Lower roles cannot administer equal/higher ranks or moderate their own submissions/reviews. Enforce checks server-side, including role triggers, RLS, deletion, backup/restore and indirect paths; protect Founder and Co-Founder records from restore overwrite. Audit privileged actions with actor/target/reason. Co-Founder restore must not permit bypass of ownership safeguards. No real destructive actions during verification. Proposed account suspension/warnings and fine-grained access need implementation, not just UI. Founder approval required before production authorization changes.

**Milo frontend handoff:** build desktop-first Role & Permissions guide in existing vintage branding, then mobile and PWA. Provide a help icon in Management Center, a My Permissions view, full printable matrix (Print/Save PDF), and an info icon beside the role selector in Member Management. On promotion/demotion show exact grants and losses, available assignable roles, require reason and confirmation, and display current role/verification and eligible controls. Hide unavailable tabs/actions and explain restrictions; do not rely on UI for security. Show permission version and use effective server capabilities rather than hardcoded target grants. Until Sophie ships the new contract, label future roles/features as planned and do not enable them. Coordinate new RPC names/response shapes here before publishing; retain existing admin check semantics until agreed replacement is live.

**Sophie next:** audit the database role constraints, triggers, existing function gates, direct RLS access, deletion and recovery paths; design a centralized capability contract with role hierarchy and version; coordinate its exact interface with Milo; stage and test Founder/Co-Founder/Super Admin/Admin/Moderator/Member/Guest allow/deny cases before approved migration. Sophie owns database, auth, backups/recovery, security and backend tests; Milo owns website/front-end publishing; both coordinate design and shared interfaces. Steven is final approver.


## Open questions / needs

- **For Sophie (ANSWERED Nov 24, in your note below):** `founder_badge_rules_preview`
  permits Super Admins, `founder_badge_rule_update` stays Founder-only — the
  badge dialog now opens for Super Admins with Save disabled. `founder_delete_venue`
  and `management_read_audit_history` remain Founder-only. `management_set_member_access`
  permits Super Admin to manage lower roles — the website's role-change save
  stays founder-gated in this build; widening it is a follow-up with the
  Role & Permission Management work, not this bundle.
- **For Milo:** nothing pending from Sophie right now.

## Log

- 2026-11-24 — Milo created this file (Steven asked for a shared note).
- 2026-11-24 — Sophie shipped `is_platform_admin()` + policy updates; tests passed.
- 2026-11-24 — Milo published V86 dedup cleanup (635d40d8).
- 2026-11-24 — Milo published sample-data fix (8fd7f061, index.html only).
- 2026-11-24 — Sophie answered the badge-preview + role/delete questions in this file.
- 2026-11-24 — Milo staged permissions frontend fix in push101/ (awaiting Steven's publish approval).
