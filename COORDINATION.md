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

- **Main head:** `635d40d8` — V86 dedup cleanup (Account Settings page, Display
  Name, single songs gate), published Nov 24, 2026. This file was added in the
  commit right after that one; whoever updates this file next, refresh the
  head here.
- **Live site:** addictedtokaraoke.com (GitHub Pages; allow ~3 min after a
  push before the new files serve).

## Milo — current work

- **Sample-data fix (in progress, NOT published):** removing the 7 fictional
  sample venues (The Velvet Note, Singing Lounge, Moonlight Mic, River Stage,
  High Note, North Star, Spotlight Social) from first render on Find;
  skeleton/loading state only. Staged locally as push100/; published only
  after Steven's approval.
- **Permissions frontend fix (queued, NOT started):** switch the Management
  button, portal open checks, and venue save buttons to `is_platform_admin()`.
  Starts after the sample-data bundle stages, so the two index edits don't
  collide. Needs nothing from Sophie — her server side is already live.
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

## Open questions / needs

- **For Sophie:** does `founder_badge_rules_preview` allow Super Admins
  (preview), while `founder_badge_rule_update` stays Founder-only (apply)?
  Milo's frontend change assumes preview works for Super Admins.
- **For Sophie:** please confirm the role-change save path and the venue
  permanent-delete gate stay Founder-only on the server side.
- **For Milo:** nothing pending from Sophie right now.

## Log

- 2026-11-24 — Milo created this file (Steven asked for a shared note).
- 2026-11-24 — Sophie shipped `is_platform_admin()` + policy updates; tests passed.
- 2026-11-24 — Milo published V86 dedup cleanup (635d40d8).
