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

- **Main head:** `a7f1c1e5` (Nov 24, 2026) — System/Venues tab fix published (Management System tab opens for Super Admins with Founder-only actions locked inside; Venues/Members tab switching and `#manage/...` deep links fixed).
- **Live site:** addictedtokaraoke.com (GitHub Pages; allow ~3 min after a
  push before the new files serve).

## Milo — current work

- **Sample-data fix (PUBLISHED Nov 24, 2026, commit `8fd7f061`):** 7 fictional
  sample venues removed from Find first render; skeleton/loading state only.
  Live-verified: skeletons + "Loading published venues…" + zero fake names.
- **Permissions frontend fix (PUBLISHED Nov 24, 2026, commit `ac2f6ba7`):** Management
  button, portal open checks, venue save buttons, Special Events approval
  panel, KJ review moderation, and Badge Management open gate switched to
  `is_platform_admin()`. Founder-exclusives kept (venue delete, backup/
  restore/wipe, badge apply, role-change save). Live-verified: served index
  carries all 7 `is_platform_admin` uses; end-to-end test as Milo AI (Super
  Admin) confirmed the portal opens and 5 of 6 tabs load real data.
- **System tab fix (STAGED in push102/, NOT published):** the end-to-end test
  found the System tab never opens for Super Admins (click, deep link, and
  reload only move the URL hash) and the Venues tab is flaky on first click.
  Root causes, both in the website code: (1) the System entry path runs
  `managementBackupFounder()` first, which throws for non-founders before
  the Backups section is ever shown; (2) switching to Venues/Members never
  hid the previous panel, so the tab switch derived from the visible panel
  kept reporting the old tab; (3) a fresh load with a `#manage/...` hash
  never reached the portal at all — the page's own router rewrites an
  unrecognised hash to `#home` before the portal layer's init runs. Fix:
  new layer `a2k-management-v3.js/css` opens System for Super Admins with
  Founder-only actions locked inside (backup/restore/inspect/Reset Test
  Data/Go Live buttons disabled with a Founder-only note; Activity History
  shows a Founder-only note and `management_read_audit_history` is never
  called for non-founders); `a2k-management-v1.js` now hides other panels
  on tab switch and captures the load-time hash so deep links survive the
  page router. Founder path unchanged. No RPC widened; server-side
  enforcement untouched. Harness 15/15 (4 before-state reproductions + 11
  after-state checks, Founder / Super Admin / member personas). Published
  only after Steven's approval.
- **Open-ended schedules fix (STAGED in push103/, NOT published; re-based
  Nov 24, 2026 onto head `a7f1c1e5` after the push102 publish):** a venue
  night with a start time but no end time used to vanish — the public
  schedule renderer dropped any entry whose end wasn't HH:MM and the
  management editor refused to save without both times. Live case: Dreamland
  Lounge Omaha, Wednesday 8:30 PM, end unspecified (stored as `end: ""`),
  host Jasmine Carter. Steven's spec, three formats: known end "8 PM –
  12 AM" (unchanged), unspecified end "8 PM onwards", until close "8 PM
  until close" (label only — never compute the venue's actual closing time).
  **Stored representation (agreed here so both sides use the same values):**
  `end: "HH:MM"` = fixed end; `end: null` or `""` = onwards; `end:
  "close"` = until close. Same shape in `venues.karaoke_schedule` and
  `kj_host_submissions.sessions`; for the KJ RPCs (`end_at`): null/`""` =
  onwards, `"close"` = until close. No artificial end is ever invented or
  stored — no 11:59 PM, no +4 hours. Fixed surfaces: public venue schedule
  renderer (incl. the `atk_public_kj_schedule_hosts` merge — name-only
  hosts now render as plain text, no profile link when there is no user
  id), management schedule editor (per-night three-way end choice, saves
  `null`/`"close"`/HH:MM), Find Karaoke today logic (both open-ended
  variants count as karaoke today on their day), member profile Karaoke
  Schedule pane, venue-management detail row, KJ setup-wizard weekly step
  + inline KJ dialog, setup bridge `normEnd()` helper. Dedup keys and
  sorting distinguish the variants (same day+start, different end kind =
  different nights). Already OK, no change: Home Tonight (start-only),
  venue-owner dashboard (never displays/edits schedules). Deliberately
  unchanged: one-time events (timestamped events require a real end).
  Engineering bound, display only: for "is this tonight" math, an
  open-ended session counts as running to the end of its Chicago calendar
  day — never displayed or stored. Harness 57/57 (12 before-state defect
  reproductions + 45 after-state checks, incl. all three formats, mixed
  schedules, dedup, editor saves, Find today, wizard, bridge unit test,
  replica 0 new errors / 0 new failed requests). Files: index.html,
  special-events.js (v241), desktop-members.js (v355),
  venue-management-v2.js (v321), a2k-member-setup-live.js (v355),
  member-setup-preview.html (v355). Published only after Steven's approval.
  **Re-base note:** push102 and push103 both touched index.html but on
  different lines (push102: CSS link line + management script line;
  push103: renderer/editor/KJ-dialog regions + two cache-bump mega-lines);
  the re-base carried push102's V3 tags + V1 `?v=2` into the push103 index
  with no conflicts; merged index tag balance 67/67; full harness re-run
  after the re-base.
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
- **For Sophie (open-ended schedules — please confirm, no rush):**
  (1) Is there any CHECK constraint on `venues.karaoke_schedule` or
  `kj_host_submissions.sessions` that would reject an `end` of null/"" or
  `"close"`? The frontend already accepts and saves those values (Dreamland
  already stores `end: ""` live), but please confirm nothing server-side
  will strip or reject them.
  (2) Dreamland Lounge Omaha's Wednesday host Jasmine Carter appears in no
  public read path (no host fields on the venue row;
  `atk_public_kj_schedule_hosts` returns `[]` for Dreamland) — the site
  shows "Host not confirmed for this night yet" until the host is linked or
  approved on your side.
  (3) For the KJ RPCs, please map an until-close session to `end_at:
  "close"` (text) so the website's until-close rendering works for KJ
  sessions too.

## Log

- 2026-11-24 — Milo created this file (Steven asked for a shared note).
- 2026-11-24 — Sophie shipped `is_platform_admin()` + policy updates; tests passed.
- 2026-11-24 — Milo published V86 dedup cleanup (635d40d8).
- 2026-11-24 — Milo published sample-data fix (8fd7f061, index.html only).
- 2026-11-24 — Sophie answered the badge-preview + role/delete questions in this file.
- 2026-11-24 — Milo staged permissions frontend fix in push101/ (awaiting Steven's publish approval).
- 2026-11-24 — Milo published permissions frontend fix (ac2f6ba7, 5 files).
- 2026-11-24 — Milo staged System tab fix in push102/ (awaiting Steven's publish approval).
- 2026-11-24 — Milo published System tab fix (a7f1c1e5, 5 files).
- 2026-11-24 — Milo staged open-ended schedules fix in push103/ (awaiting Steven's publish approval); re-based onto head a7f1c1e5 after the push102 publish (V3 tags + V1 ?v=2 carried over, no conflicts, harness re-run 57/57).
