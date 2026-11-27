# A2K Coordination — Milo ↔ Sophie

Steven asked for one shared note so the two AIs working on Addicted to Karaoke
stop stepping on each other. This file is it. Either AI updates their own
section when something changes. Steven is the tiebreaker and approves every
publish of website/code changes to main. Coordination-document-only updates
may be published without separate approval (Founder clarification, Nov 25).

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
2. One bundle per publish; Steven approves website/code publishes in chat.
   Coordination-document-only updates do not require separate approval.
3. Never edit the other side's section below — add your own entry instead.
4. Don't change access control (who can see or do admin things) without
   Steven's explicit say-so.
5. Desktop first, then mobile, then PWA (Steven's order). The mobile portal
   stays untouched.
6. **Capture every worthwhile idea — Founder direction, Nov 26, 2026.**
   Both Milo and Sophie must record promising feature ideas, improvements,
   integrations, experiments and future plans discussed with Steven in this
   shared coordination file, even if they are not being built now. Include
   the project, date, concise description, key decisions/constraints, status
   (idea / approved roadmap / in progress / implemented / verified / deferred),
   and dependencies or next steps when known. Distinguish suggestions from
   Founder-approved decisions; recording an idea is not approval to build,
   deploy, change permissions or alter production. Check existing entries
   before adding duplicates; update or cross-reference status as work proceeds
   and preserve the decision history. Do not remove deferred ideas merely
   because another feature has priority. Covers A2K, Karaoke Anonymous, KJ
   Companion, and related integrations; keep unrelated projects separate
   unless Steven requests otherwise. Capture ideas during the discussion or
   before switching tasks, so neither AI needs to rely on chat history alone.
   This is an ongoing working rule for both AIs, not a claim that automated
   capture is enabled.

## Live state (update when it changes)

- **Main head:** `7f1eacd2` (Nov 24, 2026) — Founder pill removed everywhere (2a5d10a3); old stylesheets archived to `archive/old-css/` (7f1eacd2, 53 files + README, byte-identical copies; 9 of the 53 originals deleted, 44 remain — see Sophie's item below).
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
- **System tab fix (PUBLISHED Nov 24, 2026, commit `a7f1c1e5`):** the end-to-end test
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
  after-state checks, Founder / Super Admin / member personas). Live-verified:
  cache-busted live index refs V3 tags ?v=1 + V1 ?v=2, all files 200.
- **Open-ended schedules fix (PUBLISHED Nov 24, 2026, commit `e96a3e1a`; re-based
  onto head `a7f1c1e5` after the push102 publish):** a venue
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
  after the re-base. Live-verified: Dreamland's live Schedule tab shows
  "Wednesday — 8:30 PM onwards" (Steven's own screenshot, Nov 24, 2026).
  Host still "not confirmed" until Sophie links Jasmine Carter — see her
  open items below.
- **Founder pill removal (STAGED in push104/, NOT published):** Steven asked for
  the gold "★ Founder ★" pill/bar removed everywhere, including his own
  profile (it had leaked onto Super Admin profiles because the V71 layer
  unhid it whenever the Management button was visible). Display removal only
  — no data, roles, RPCs, or gates changed. Removed renders: the V71 layer
  (a2k-profile-v77.js) no longer moves/unhides/rewrites the hero badge; the
  portal pill render is gone from a2k-management-v1.js; the member-card pill
  is gone from user-management-v2.js (founder falls through to the plain
  "Founder" role chip); the review-author pill is gone from
  review-experience.js; the portal member detail/list role text reads plain
  "Founder". New layer a2k-member-v87.js/css hides the pill elements as a
  safety net on desktop AND mobile. The "Super Administrator" database badge
  (profile_badge_awards) is untouched and still shows for Super Admins. The
  Founder badge award tile and the founder medal in Featured Badges are
  badge-award displays, not pills — untouched. Published only after Steven's
  approval.
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


### Sophie — Nov 25: approved biography improvement and marketing materials backlog

- **Member biography (approved, pending):** Increase About Me from 300 to 2,000 characters for all members. Milo: update all profile editors, setup wizards, counters and validation; show a compact preview of about 300 characters with accessible Read More / Read Less controls on desktop and mobile. Preserve privacy settings, existing bios and branding. Sophie: inspect database constraints and server validation, align to 2,000 if necessary, and coordinate before release. Test saving, reopening and viewing longer bios, including boundaries. No implementation yet.
- **Venue Marketing Materials Generator (approved future feature):** Free self-service venue-specific QR marketing materials for Venue Staff and authorized venue managers. Permanent venue URL, venue name, real scannable QR, approved vintage branding, handout cards (2.5 × 2.5 inches), table tents, counter signs (5 × 7 inches), posters (8.5 × 11 inches), and custom dimensions. Provide scalable SVG, print-ready PDF, high-resolution PNG at 300 pixels per inch at chosen size; optional printer-specific bleed/crop marks and color profiles where supported. Use vector artwork and QR where possible, preserve quiet zones, warn about inadequate raster resolution, verify deep links and scan reliability. Sophie owns backend/link contract; Milo owns generator interface and print templates. Not implemented; no immediate build requested.
- **Coordination-only publishing rule (Founder clarified Nov 25):** Sophie and Milo may update this coordination document without requesting separate approval. This exception is ONLY for `COORDINATION.md`; website/code publishing and production authorization changes retain their existing approval requirements.

### Sophie — Nov 25: member photo galleries (approved future feature)

- Keep About Me biographies text-only; do not permit embedded images or external image links in bios.
- Add a dedicated **My Photos** profile gallery for members to share karaoke photos, friends, events, and (for KJs) equipment, hosting setups and promotional flyers. Optional captions. Initial proposed limit: 10 photos per member.
- Respect profile privacy and access controls for both gallery metadata and actual image files; support owner removal and inappropriate-photo reporting/moderation. Validate uploads, optimize image sizes, limit storage use, and avoid excessive mobile profile length.
- Sophie: design secure storage, metadata, permissions and moderation backend. Milo: design gallery and upload/viewing experience in existing vintage branding. Coordinate before implementation; no production changes or immediate build requested.

### Sophie — Nov 25: limited biography formatting (Founder-approved, pending)

Extend the planned 2,000-character About Me editor with a simple accessible formatting toolbar: bold, italic, underline, bulleted/numbered lists, paragraphs/line breaks, and emojis. No hyperlinks, clickable URLs, automatic linkification, or link toolbar control. No raw HTML input, custom fonts/colors, embedded images/video, scripts, CSS or arbitrary markup. Keep images in the separate future My Photos gallery. Use restricted markup or a structured rich-text format with strict allowlist validation and safe rendering; reject link markup and render URL-like text as inert plain text; avoid rendering untrusted HTML. Count visible text consistently toward the 2,000-character limit; also bound stored markup size. Preserve existing biographies as literal text when migrating, existing privacy settings and vintage branding; ensure Read More/Less does not break formatting. Sophie owns server validation/storage contract; Milo owns toolbar, counter, accessible rendering and desktop/mobile integration. Coordinate format before implementation and test malicious input, blocked links, boundaries and legacy bios. No implementation or production changes yet.

### Sophie — Nov 25: anti-spam policy for reviews (Founder-approved, pending)

Extend the biography no-hyperlink policy to member-written venue and KJ reviews: no clickable URLs, link markup, automatic URL linking, raw HTML, scripts or embedded media within review text. Render URL-like text as inert plain text at minimum; reject link markup and unsafe content server-side, and retain existing spam reporting/moderation tools. Apply consistently to review creation, editing and display on desktop/mobile, including legacy reviews. Preserve existing ratings, review content and moderation permissions. Sophie owns backend validation; Milo owns safe rendering and review editor integration. Founder approved limited review formatting: bold, italic, bulleted/numbered lists, paragraphs/line breaks and emojis. No underline in reviews (avoid confusion with hyperlinks); underline remains allowed in biographies. Reuse the same secure structured/restricted-markup system as biographies with a review-specific allowlist, server-side validation, safe rendering and accessible editor controls. Preserve existing reviews as literal text when migrating; do not change review length limits as part of this policy. Documentation only, pending implementation.


### Sophie — Nov 25: Chief Karaoke Officer advisory

> **The Chief Karaoke Officer has been brainstorming again. Proceed with caution.....**

Founder-approved humorous coordination note. Ideas discussed for future planning: official A2K Facebook Page and approved-event auto-posting; The Karaoke Fix newsletter; Karaoke Anonymous (preferred domain KaraokeAnonymous.org, availability not yet confirmed), its 10-step program of non-recovery, randomized Karaoke Intervention Generator and karaoke meme generator. These are roadmap concepts, not authorization to implement or publish code. Keep the existing A2K branding, prioritize accurate listings and minimize recurring costs. No website, database or permissions changes in this note.


### Sophie — Nov 25: Karaoke Anonymous meme generator — running song list

Founder requested a living list of songs paired with humorous karaoke performer archetypes. Add songs as Steven sends them. The generator should support selectable songs, performer habits/personas, situations, visual templates, and randomized original captions, with custom choices and copy/share options. Humor targets karaoke behavior rather than identity; keep it playful, not cruel. Use original or appropriately licensed artwork and avoid reproducing song lyrics. Browser-local generation is preferred to avoid per-meme charges. Future concept only; no implementation or publishing approval implied.

**Founder-requested additions (must include):**

| Song | Artist | Draft karaoke persona / meme hook |
|---|---|---|
| Baby Got Back | Sir Mix-a-Lot | The quiet regular who suddenly knows every word and becomes the life of the party. |
| Because I Got High | Afroman | The singer who forgot they were next but somehow remembered the entire song. |
| Achy Breaky Heart | Billy Ray Cyrus | The singer who turns the entire karaoke bar into a line-dance floor. |

**Previously suggested starter songs (draft hooks, expandable):**

| Song | Karaoke persona / meme hook |
|---|---|
| Don't Stop Believin' | The unofficial closing-time coordinator. |
| My Way | Every performance is a farewell concert. |
| Bohemian Rhapsody | The singer who thinks they are an entire band. |
| Before He Cheats | The singer delivering a suspiciously specific message. |
| Sweet Caroline | The crowd participation coordinator. |
| Picture | Two strangers who become a couple for four minutes. |
| Tequila | The singer who mastered exactly one word. |
| Friends in Low Places | The person who turns every performance into a group singalong. |
| I Will Always Love You | The ambitious high-note gambler. |
| Love Shack | The duet partner who takes the assignment very seriously. |

**Sophie’s additional draft candidates (not yet Founder-approved):**

| Song | Artist | Draft karaoke persona / meme hook |
|---|---|---|
| The Bad Touch | Bloodhound Gang | The singer who makes the room collectively blush. |
| Barbie Girl | Aqua | The duet nobody saw coming. |
| I Touch Myself | Divinyls | The performer making awkward amounts of eye contact. |
| I'm Too Sexy | Right Said Fred | The person treating the karaoke stage like a fashion runway. |
| Tubthumping | Chumbawamba | The singer who refuses to go home. |
| The Humpty Dance | Digital Underground | The person whose dance moves deserve their own warning label. |
| What's Up? | 4 Non Blondes | The singer who can be heard three blocks away. |

Add future song ideas to this section; captions remain editable and are not fixed form letters. No website or database changes.


### Sophie — Nov 25: transparent paid promotion and rotation (Founder direction)

Founder requires paid venue promotion to be clearly distinguishable from organic popularity/recommendations: every paid placement must carry a prominent plain-language label such as **Paid advertisement** (proposed section name: Sponsored Venues). Never rely on color alone; retain the disclosure on desktop/mobile and wherever a paid placement appears. Organic search, reviews, verification, schedule accuracy and community favorites must not be purchased or manipulated by advertising. Keep normal listings and singer access free. No intrusive ads, popups or forced interruptions.

**Proposed design for Milo and Sophie to refine, not yet approved for implementation:** one rotating sponsored placement per eligible surface (homepage, Find Karaoke, upcoming events, KJ directory), and separately labeled newsletter sponsorships in The Karaoke Fix. Limit ad density; prioritize the user's selected area and relevant event dates; do not show expired or unpublished listings. For equal campaign tiers, distribute eligible impressions fairly rather than random repetition or displaying every advertiser simultaneously. Consider frequency caps, placement capacity and geographic targeting; no guaranteed exposure until inventory and actual traffic are understood. Keep sponsored cards visually separate from organic results. Community Favorites, if added, use actual member activity and not payments.

**Backend planning (Sophie):** campaign eligibility, placement and date windows, approved creative, fair rotation, impression/click measurement with privacy-preserving aggregate reporting, payment and cancellation/refund records, deduplication, audit and access control. **Frontend planning (Milo):** accessible disclosure and card layout in existing vintage branding, responsive placement previews, advertiser management UI and reporting. Agree on interfaces before implementation. Founder to approve final design, rates, inventory, payment provider and publishing. Earlier proposed rates are illustrative only, not established prices. No automatic renewal unless explicitly agreed; test fixed-duration promotions first. No production code, database, payment or authorization changes in this note.


### Sophie — Nov 25: advertiser eligibility and application (Founder direction)

Founder requires advertisers to have their own A2K member profile, be active participants in the community, be verified, and complete an advertising application. Do not allow arbitrary anonymous or unverified advertising submissions. Enforce eligibility on the backend, not merely by hiding frontend controls. Define active community participation fairly and obtain Founder approval for objective criteria before implementation; do not equate it solely with frequent logins or reviews.

**Proposed workflow for review:** completed profile, active verified account in good standing, legitimate KJ/business or authorized venue relationship where applicable, and an approved public listing to promote. Application wizard selects listing, placement, duration and creative; preview with explicit Paid advertisement disclosure; staff checks eligibility, content, capacity and price before payment; activate only after confirmed payment and final approval; fair rotation, expiry and aggregate performance reporting. Recheck eligibility on activation and handle suspension, expired listings, campaign cancellation/refunds and payment failure according to approved rules. No pay-to-verify, popularity manipulation, or required subscription. Founder to approve eligibility thresholds, staff capabilities, payment provider, refund policy and campaign pricing. Sophie owns backend eligibility/payment/campaign contract; Milo owns application wizard and management UI. Documentation only; no code, database, authorization or payment changes.

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

- **For Sophie (delete the remaining old stylesheets — Steven's call, no rush):**
  The 53 stylesheets folded into the four grouped CSS files on Nov 24 are
  now archived as byte-identical copies under `archive/old-css/` (live at
  head `7f1eacd2`, verified). Milo deleted 9 of the originals; **44 originals
  remain at the repo root**. Steven asked you to delete those 44 — he does
  not want to approve 53 one-by-one delete cards, and this is approved by
  him here, no further approval needed from him. Please delete ONLY these
  44 files at the repo root:
  - `a2k-member-profile-vintage.css`
  - `a2k-member-v83.css`
  - `a2k-member-v84.css`
  - `a2k-member-v85.css`
  - `a2k-members-desktop-portrait.css`
  - `a2k-members-mobile-326.css`
  - `a2k-members-redesign.css`
  - `a2k-nearby.css`
  - `a2k-profile-genres.css`
  - `a2k-profile-grid.css`
  - `a2k-profile-reference.css`
  - `a2k-profile-settings.css`
  - `a2k-profile-v66.css`
  - `a2k-profile-v77.css`
  - `a2k-setup-wizard.css`
  - `a2k-site-v7.css`
  - `a2k-template-v65.css`
  - `a2k-vintage-global.css`
  - `approval-center.css`
  - `desktop-vintage.css`
  - `find-vintage-preview.css`
  - `founder-test-reset.css`
  - `google-direct-signin.css`
  - `guest-venue-submit.css`
  - `home-option-b.css`
  - `kj-host-profile.css`
  - `kj-host-ratings.css`
  - `member-session-notices.css`
  - `profile-achievements-about.css`
  - `profile-management-layout.css`
  - `profile-my-reviews.css`
  - `review-experience.css`
  - `review-management-v3.css`
  - `review-notification-center.css`
  - `review-privileges-management.css`
  - `review-reporting.css`
  - `special-events.css`
  - `user-management-v2.css`
  - `venue-claims.css`
  - `venue-management-v2.css`
  - `venue-owner-dashboard.css`
  - `venue-photos-v2.css`
  - `venue-review-filters.css`
  - `venue-team.css`
  Do NOT delete: anything under `archive/old-css/` (the safety-net copies),
  `a2k-member-deletion.css` (your live design file links it), the four
  grouped files (`a2k-core.css`, `a2k-public.css`, `a2k-members.css`,
  `a2k-management.css`), or any other CSS file — 20 more unreferenced
  stylesheets exist beyond these 54 and are a separate follow-up, not this
  task. Nothing on the live site references the 44 (verified repo-wide);
  deleting them changes nothing live.

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
- 2026-11-24 — System tab fix published (a7f1c1e5); open-ended schedules published (e96a3e1a, Dreamland live-confirmed by Steven). Milo staged Founder pill removal in push104/ (awaiting Steven's publish approval).
- 2026-11-24 — Milo published Founder pill removal (2a5d10a3, 8 files; live-verified). Milo published CSS archive copies (7f1eacd2, 53 files + README in archive/old-css/); deleted 9 of the 53 originals, then Steven stopped the one-by-one deletes (53 approval cards) — the remaining 44 are listed above for Sophie to delete.

- 2026-11-25 — Sophie documented the approved biography limit, future marketing materials generator, and Founder exception for coordination-only updates. Parent main head at time of update: `6f353c1d0353df0b2e3e9b4a4bb4342918273b7a`. No code or database changes.

- 2026-11-25 — Sophie documented Founder-approved future member photo galleries; biographies remain text-only. No implementation changes.

- 2026-11-25 — Sophie recorded Founder-approved limited biography formatting. Documentation only.

- 2026-11-25 — Founder clarified that biography hyperlinks are not allowed; Sophie updated the planned formatting requirements. Documentation only.

- 2026-11-25 — Sophie recorded the Founder's no-hyperlink anti-spam policy for reviews. No implementation changes.

- 2026-11-25 — Sophie recorded Founder-approved limited formatting for venue and KJ reviews, excluding underline and hyperlinks. Documentation only.


### Sophie — Nov 26: Facebook auto-publication backend (delivery paused)

Founder approved proceeding with automatic A2K Page announcements. Applied database migrations `a2k_facebook_publication_queue` and `a2k_facebook_worker_auth_hardening`; deployed Edge Function `a2k-facebook-publisher` v1. Queue triggers capture newly published venues and future special events, including backend inserts; no historical backfill. Special-event-only venues announce the event instead of a second venue announcement. One unique queue record per type and ID; drafts, repeat publication, and past events are excluded. Worker claims queued jobs and records Facebook post ID or failure; uncertain delivery is not automatically retried. Direct venue hash URL and approved slogan included. Queue RLS enabled; ordinary users cannot read or claim jobs. Vault-backed worker authentication; existing Facebook Page token stays in Edge Function secrets. No frontend changes or role changes. pg_net and pg_cron enabled, but no delivery cron scheduled yet. Rollback-only database test passed: draft not queued, published venue and future event queued once each, no synthetic venue remains. Authenticated worker health test reached Meta but returned HTTP 502 with Meta permission error 200 during Page identity check. Need correct Page access token with pages_read_engagement and pages_manage_posts; verify identity and a real post before enabling delivery cron. No Facebook post sent. Do not expose tokens in coordination notes or frontend. Queue capture remains active. 


### Sophie — Nov 26: Facebook automatic delivery ENABLED

Founder replaced FACEBOOK_PAGE_ACCESS_TOKEN in Supabase secrets after restoring Meta developer access. Token debugger reportedly shows no token expiration, data access approximately three months. Worker health request 3 returned HTTP 200 and correct A2K Page ID 1450202341514527. First live delivery: newly published Shakespeare's Pub and Grill Dec 5 karaoke event; queue ID 4, Facebook post ID 1450202341514527_122109511095552529, HTTP 200, outbox state posted, no error. J&A Tap's missing weekly schedule also saved; existing venue updates do not trigger announcements. Shakespeare's next date only was entered for the test; later five-week dates not yet entered. Cron job a2k-facebook-auto-publish ID 1 verified active on a five-minute schedule, invokes worker only if pending jobs or stale sending claims exist. One announcement per invocation, no historical backfill. Live worker succeeded; first scheduled execution not yet observed. No frontend or role changes. Review data access renewal before February 2027; do not expose credentials.


### Sophie — Nov 26: date-specific Find Karaoke and daily Facebook roundup (Founder approved direction)

**Milo frontend request:** implement date deep link using existing GitHub Pages hash router, proposed canonical https://addictedtokaraoke.com/#find/2026-11-26 (ISO YYYY-MM-DD), plus optional #find/today alias. Preserve date through initial asynchronous venue loading, hash changes, reload, shared links, desktop/mobile, and navigation. Open Find Karaoke directly with selected date visibly displayed, show both recurring listings and dated published special events starting on that local date, include approved KJ schedules, deduplicate venue cards, retain optional geographic filters without silently hiding listings via default radius. Reject invalid dates gracefully. Use actual calendar date, not today's weekday; dated post links must never advance to a different date. Confirm canonical URL and matching data semantics here before Sophie enables daily posting. Do not alter branding. Frontend publish requires normal Founder approval.

**Sophie backend:** migration a2k_daily_karaoke_summary_preview installed service-only read-only a2k_private.daily_karaoke_summary(date); counts distinct published venues, cities (city+state), states, using listed weekly schedules, approved KJ add sessions, and published special events by local event date. Nov 26 preview 7 venues/5 cities/1 state; Nov 27 preview 13 venues/9 cities/2 states. These are scheduled listings, not verified attendance or exact show counts; prose-only holiday cancellations/seasonal limits cannot yet be reliably excluded. Need structured exceptions and matching frontend behavior before production roundup. Proposed one post per date at noon America/Chicago, zero-result skip, no venue-per-show flood, link to fixed date, no historic backfill, separate idempotency by date; daily posting NOT enabled and existing new-venue/event worker untouched. No frontend changed. 


### Sophie — unofficial project-control Easter egg (Founder-approved humor)

If Steve says, “I just have a quick idea,” and mentions KaraokeOS, remind him that we already have approximately 47 projects in progress. 😂 Suggest finishing the current A2K milestone before starting another build. This is a running joke, not a restriction: the Founder remains in charge, and genuine KaraokeOS discussions are welcome.


### Milo — Nov 26: date-specific Find Karaoke links (answering Sophie's Nov 26 request)

**Canonical URL CONFIRMED:** `https://addictedtokaraoke.com/#find/YYYY-MM-DD` (ISO date,
America/Chicago calendar date). Alias: `#find/today` (always the current Chicago date).
Built in `special-events.js` (v243), `a2k-public.css` (v2) + one router line in
`index.html`; published to main Nov 26, 2026 with Steven's approval in chat, verified
against live data before publishing (22/22 harness checks). Daily posting should stay
off until the count question below is settled.

**Matching data semantics (frontend):**
- The dated page shows every published venue with a weekly session that overlaps that
  Chicago calendar date: sessions starting that day, plus a session starting the day
  before that runs past midnight into it. Session times use the same three end forms as
  everywhere else (fixed / onwards / until close).
- Published special events starting on (or running into) that date appear as event cards.
- Dedup: a venue with a special event shown for that date is represented by the event
  card only (no second venue card), so the on-page count is DISTINCT venues, matching
  your summary function's counts.
- Recurring sessions come from `venues.karaoke_schedule` — the same source the current
  "karaoke today" view uses, which already includes approved KJ nights stored there
  (e.g. Dreamland's Wednesday session).
- The selected date is displayed on the page (date bar + "Karaoke on <date>: N places"
  count line). A dated link never advances: `#find/2026-11-26` shows Nov 26 forever.
- Invalid dates (bad format, or impossible dates like 2026-02-30) fall back to the
  normal Find page. All existing filters (search, state/city/genre/reviews, the
  Venues/Events tabs) refine WITHIN the date; the nearby/location filter only applies
  after a visitor turns it on, so nothing is hidden by a default radius.
- A "Show all dates" button on the date bar exits to the full upcoming list.

**Count check (Nov 26, please confirm):** your preview's Nov 26 count of 7 matches the
frontend exactly. Nov 27 differs: the frontend shows 12 (10 Friday weekly venues + The
Slippery Pickle and Victory Lap Pub & Grub via their special events); your preview says
13. If the 13th is an approved KJ add-session that is not merged into
`venues.karaoke_schedule`, that would explain it — please confirm which venue it is, so
we can decide whether the frontend should surface those sessions too before the daily
roundup starts linking to these pages.


### Sophie — Nov 26: recurring karaoke scheduling upgrade (Founder approved direction)

Prioritize accurate recurrence before enabling daily Facebook roundups. Current venue schedule JSON stores weekday, start/end, optional hostName; special events store individual timestamps. Proposed schedule editor: one-time; weekly; every N weeks (including alternate weeks and five-week intervals, anchored to a first occurrence date); monthly by ordinal weekday (first, second, third, fourth, fifth where present, last; allow multiple selections, e.g. first and third); optional start/end dates for seasonal schedules. Support overnight/unknown closing times and venue-local time zones. Provide preview of upcoming dates and allow cancellation or rescheduling of a single occurrence without changing the series. Preserve existing weekly schedules and existing event IDs, do not silently infer missing anchors or overwrite special events. Sophie owns backend recurrence/exception model and shared date-query contract; Milo owns frontend editor and Find Karaoke integration. Coordinate schema/API before frontend implementation; one authoritative date calculation for venue schedule, Find Karaoke, KJ schedule and Facebook counts. Reconcile Nov 27 12-versus-13 venue discrepancy as part of matching approved KJ schedules. Daily roundup remains disabled; existing announcement worker stays active. No schema or frontend changes in this note.


### Sophie — Nov 26: date count discrepancy identified

Live DB read confirmed Finn's Pub (Des Moines) has empty venues.karaoke_schedule and two approved KJ add submissions (Nov 18, reviewed_at null), containing duplicate Wednesday/Thursday 20:00–00:00 and Friday 21:00–01:30 sessions. The preview includes Finn's, explaining Friday 13 versus frontend 12 (10 main venue Friday schedules + 2 special events). Verify those older submissions are genuine/current before exposing or merging; no data changed. Thursday's equal 7 counts mask a set difference: backend includes Finn's Thursday start and excludes Bradley's on 50th (Wednesday 21:00–Thursday 01:30), whereas Milo's page includes Bradley's overnight carryover but excludes Finn's. Need agreement on date semantics: recommend daily evening roundup counts shows STARTING on the selected local date, not yesterday's after-midnight tail, with a matching date landing page (or separately labeled carryovers); avoid silently changing current live behavior until coordinated. Shared canonical recurrence/exception resolver should include verified approved KJ nights, dedup same venue/session, enforce cancellation and seasonal rules. Existing date links verified live by Milo; daily posting remains OFF pending scheduling upgrade and exact venue-set match. No database or frontend edits in this step.


### Milo — Nov 26: dated pages now count shows STARTING on the date (Steven's decision)

Steven chose your recommended semantics: a show belongs to the date it starts.
Frontend updated in `special-events.js` v244 (published with this note): the dated
view, including `#find/today`, now counts a weekly session or special event only when
it STARTS on the selected Chicago date; a session that started the day before and
runs past midnight no longer carries into the next date's page. The plain Find
Karaoke "karaoke today" view is unchanged, as you advised. Verified 26/26 against
live data before publishing.

New counts vs your preview: Nov 26 — frontend 6, yours 7. Nov 27 — frontend 12,
yours 13. On both days the ONLY remaining difference is Finn's Pub, so once Finn's
submissions are verified and merged (or excluded as unverified), our venue sets
match exactly and the daily roundup can link to these pages safely. Still open:
Steven has been asked whether Finn's Nov 18 KJ submissions are genuine/current.

Side observation for the recurrence work: the old overlap rule was inflating
weekend dates badly — Sunday Nov 29 showed 15 places under overlap, only 5 of
which actually start on Sunday. Start-on-date is the honest count for the roundup.


### Sophie — Nov 26: Facebook venue milestones and state expansion announcements (Founder-approved direction)

- Celebrate the first published, active venue in each genuinely new state with a special state-welcome announcement. Existing states are baselined without retroactive posts. State expansion is independent of numeric milestones; never treat an ordinary venue edit as a new state.
- Venue milestones: 100, 125, then every 25 through 500; every 50 above 500 through 1,000; every 100 above 1,000. Give 500, 1,000, 5,000 and other major milestones special recognition. Current published inventory (Nov 26 read): 110 total, IA 68, NE 40, IN 2. The 100 milestone has already been passed; next automated milestone should be 125, with no historical backfill. A manual 100 celebration remains optional and requires Founder approval.
- Include a concise state-by-state count in every milestone and new-state welcome announcement, using real published/active venue totals from the same consistent database snapshot. Show full state names, sorted by descending count then name, total venues, number of represented states, next milestone when applicable, A2K link and approved slogan. Do not count drafts, archived or deleted venues, or individual shows as venues. For larger state lists use a readable text format; no graph required.
- Store immutable milestone/state identifiers and use the existing Facebook queue and delivery audit workflow to ensure each achievement is celebrated once, even after a venue is archived, republished, or totals drop and recover. Prevent races and duplicate announcements during bulk imports. For a venue that triggers both a new-state and numeric milestone, coordinate whether to combine or send separately before implementation; preserve both deduplication records. No false milestone counts or retroactive announcements.
- This is an approved roadmap requirement, not an enabled automation. Existing automatic new-venue/event announcements stay unchanged. Daily roundup remains separately gated on schedule accuracy. Sophie owns backend queue integration; no frontend change required for the proposed text announcements. Test trigger eligibility, state totals, rollback behavior and deduplication before enabling live milestone delivery.


### Sophie — Nov 26: Finn's Pub research and date filter alignment

Founder relayed Milo's live verification: dated Find now uses start-date-only, Nov 26 6 places, Nov 25 6 places including Bradley's Wednesday night. Finn's remains the outstanding venue-set difference. Public sources confirm Finn's karaoke at 7020 Douglas Ave Suite A, Urbandale; phone 515-270-8738; Facebook https://www.facebook.com/micfinns/. Conflicting schedules: https://findkaraoke.net/urbandale (Tue–Sat, Sunday open mic); https://karaokelist.app/karaoke/des-moines-ia/finns-pub (daily 8–midnight, directory source June 2026); https://www.exploredm.com/explore-karaoke-hot-spots-fall-2024 (typically 8 PM to close, older); https://nextdoor.com/pages/finns-pub-urbandale-ia/ venue profile says nightly but lists Monday closed. Facebook direct lookup blocked. These corroborate karaoke generally but not exact current hours or holiday dates; seek direct confirmation before merging old approved KJ submissions or publishing new dates. No venue data changed. Daily roundup remains disabled pending verified schedules and recurrence/exception work; existing announcement publishing unaffected.


### Sophie — Nov 26: Finn's Pub Thanksgiving confirmation

Founder confirms Finn's Pub has karaoke tonight (Nov 26, 2026). This supports including Finn's in today's lineup, for seven known venues based on current listings. Exact hours and ongoing weekly recurrence have not yet been independently confirmed; older approved KJ submissions list Thursday 20:00–00:00. Do not infer every Thursday or Friday from this single-date confirmation. No live schedule changes or new Facebook posts made in this step; clarify times and recurrence before updating the listing. Daily roundup remains disabled pending recurrence/exception work.


### Sophie — Nov 26: Finn's nightly schedule confirmed and published

Founder confirmed karaoke every day: Sunday–Thursday 20:00–00:00; Friday–Saturday 21:00–01:30 next day. Updated existing published Finn's Pub venue (slug finns-pub-des-moines) from empty karaoke_schedule to seven weekly sessions. Verified database readback; no host inferred, older approved KJ submissions preserved, no duplicate venue created. Backend date preview remains Nov 26 7 venues/5 cities/1 state and Nov 27 13 venues/9 cities/2 states. Milo: recheck fresh dated pages for 7 and 13 respectively. Daily roundup remains OFF pending exact frontend agreement and recurrence/cancellation work. Existing announcement worker unchanged; no new announcement for ordinary schedule edit.


### Sophie — Nov 26: Finn's Pub host

Founder identified Krazy Karaoke as the hosting company. Updated and verified hostName on all seven existing Finn's Pub weekly sessions, preserving days and hours. No member identity linked or assumed; no new Facebook post or changes to daily roundup. 


### Sophie — Nov 26: member setup wizard badge foreign-key error (open)

Founder supplied mobile screenshot of stage 5 Privacy & Visibility with profile_badge_awards_badge_code_fkey violation on Save & Finish. Constraint correctly references profile_badge_types(code). All 16 current achievement rules have matching badge definitions; checked song and favorite trigger paths, rollback-only test of one song and one venue favorite succeeded, no diagnostic records retained. Available PostgreSQL logs returned no matching error. Exact failing badge code and request not yet established. Do not remove FK or invent a badge; ask affected user to retry Save & Finish once without restarting setup, capture exact time and browser version/account context if still failing; Milo inspect which save request fails (do not expose auth headers or personal details), whether cached wizard differs from current build. No live schema, badge, account or privacy changes. Second screenshot confirms Krazy Karaoke Facebook page describes karaoke/DJ services since 2001; company host already saved on Finn's schedule. No Facebook URL visible in screenshot.


### Sophie — Nov 26: DJ Lisa Mae and Krazy Karaoke confirmation

Founder relayed confirmation directly from DJ Lisa Mae: her personal hosting nights at Finn's Pub are Wednesday, Thursday and Friday. Existing approved KJ submissions already list those days (Wednesday/Thursday 20:00–00:00, Friday 21:00–01:30); retain them and her members-only profile visibility. Venue's seven-night company schedule is separate. Krazy Karaoke company Facebook: https://www.facebook.com/KrazyKaraoke2001 ; karaoke/DJ services since 2001 per supplied page screenshot. Company contact link recorded here for the KJ company directory; no duplicate account, personal schedule changes or Facebook post. 


### Sophie — Nov 26: company + individual host display (Founder approved)

Milo frontend request: on venue Schedule / Your host, show hosting company plus the individual approved KJ when their session matches the displayed occurrence and the viewer is permitted to see their profile. For Finn's Pub, Wednesday/Thursday/Friday should read “Krazy Karaoke – DJ Lisa Mae” for authorized viewers; Sunday/Monday/Tuesday/Saturday remain “Krazy Karaoke” unless individual DJs are confirmed. Company comes from venue schedule hostName; individual comes from approved KJ session/visibility-aware atk_public_kj_schedule_hosts RPC, matched by weekday and session times; deduplicate identical submissions. Link only the individual name to their member profile using existing routing and respect profile privacy (Lisa Mae is members-only; guests see company only unless she changes visibility). Never infer personal hosting across all company nights, expose private profile data, or persist individual name into public hostName as a workaround. Apply globally; keep existing styling, company-only fallback and existing approval process. Founder approved display concept; no frontend or DB changes in this step.


### Sophie — Nov 26: KJ review placement follow-up (Founder approved)

When an approved individual KJ is matched to a confirmed schedule occurrence, display the existing rating and Rate KJ action beside that person's name in the corresponding Your host section, preserving review eligibility/privacy rules. Exclude that KJ from the bottom “Other KJs linked to this venue” fallback to prevent duplicate entries and the incorrect unconfirmed-night message. Hide the entire fallback block if no genuinely unmatched visible KJs remain; retain it only for actual unmatched KJs. Finn's example: Lisa Mae on Wed/Thu/Fri, not in the fallback; company-only nights must not offer a personal review of Lisa Mae. Apply globally without deleting any associations or reviews. Frontend request for Milo, no live code change here.


### Milo — Nov 26: Finn's recheck confirmed — frontend and backend counts now match

Rechecked the fresh dated pages live, as requested. `#find/2026-11-26` now reads
"Karaoke on Thursday, November 26, 2026: 7 places" with Finn's Pub listed
("Thu, Nov 26 · 8 PM–next day 12 AM"), and `#find/2026-11-27` reads 13 places with
Finn's Pub listed ("Fri, Nov 27 · 9 PM–next day 1:30 AM"). Both match your backend
previews (7 venues/5 cities/1 state; 13 venues/9 cities/2 states) — the venue sets
agree exactly on both days now. The count discrepancy thread is closed from the
frontend side; daily roundup stays OFF per your gating (recurrence/exception work),
no objection here. Noted the two frontend requests (company + individual host
display, KJ review placement beside the matched host) — Founder-approved concepts
logged on my side for build + Steven's publish approval. Also noted the wizard
badge foreign-key report; I will inspect the wizard save path on the frontend and
report what I find here.

### Sophie — Nov 26: KJ Companion live intermission trivia (Founder approved roadmap)

Future KJ Companion module, alongside Music Bingo; not an immediate A2K website change. Founder approved a host-driven karaoke intermission trivia game using the existing Karaoke Anonymous “Name That Tune — Without the Tune!” question bank (original song-concept/story clues, four possible song titles; currently 300 unique songs, all seven selectable editions at least 100 questions). Reuse the bank rather than creating a separate copy long-term; define a versioned integration when implementing. Keep standalone Karaoke Anonymous solo play separate and unaffected.

- Default session: 10 questions, normally one between karaoke performances. KJ manually starts each round, controls pause/resume and next question, and can return the audience display to the next singer without losing scores. Host may choose edition (including Random Mix or random themed selection), number of rounds, answer window (proposed default 20 seconds), optional venue-sponsored prize, and individual/team play. Tablet is the KJ control center; TV/projector shows join instructions, question and four options, countdown, answer reveal, standings, and final winner. Customers join from their phones by QR code or game PIN with a nickname/team name; no player account or app install required.
- Approved scoring concept: faster correct answers earn more points, not merely a speed tiebreaker. Proposed default schedule for a 20-second round: 1,000 points within 0–2 seconds; then 50 points lost per second through 20 seconds (5s=850, 10s=600, 15s=350, 20s=100); wrong, late or missing answer=0. Maximum 10,000 for 10 rounds. Scale the curve consistently if the host selects a different timer. One locked submission per player per question. Server-authoritative timing and scoring, no correct answer delivered to player/audience before lock, and duplicate submissions rejected. Account for normal network latency in future implementation/testing; exact transport and abuse controls TBD.
- Show leaderboard between singers, announce highest total at the end, and use a sudden-death trivia question for ties if needed. Prize supplied by the venue (e.g. appetizer, gift certificate, merchandise or bragging rights); no required paid entry. Host can end the session. Include reconnect/session recovery and nickname moderation in implementation planning. No subscription requirement.
- Architecture direction: separate KJ Companion tablet control, audience display and customer phone interfaces; Karaoke Anonymous supplies trivia content; A2K remains the community/venue/schedule/KJ directory. Existing singer rotation, digital requests and Music Bingo remain planned companion modules. No repository/app/backend/live feature created or changed by this roadmap entry; future implementation, design preview and publish subject to Founder approval.

### Sophie — Nov 26: KaraokeOS song-title Easter eggs (reference only)

Founder requested preserving the humorous computer-action/song-title pairings below. KaraokeOS is a joke, not a project the Founder wants to build. These are creative reference ideas only; no implementation, product rename, or audio playback is authorized. Song titles are listed as references, not lyrics or recordings.

| Computer action | Song title |
| --- | --- |
| Empty Recycle Bin | Another One Bites the Dust |
| Restart | Here I Go Again |
| Shut Down | Closing Time |
| Wi-Fi Disconnected | All by Myself |
| System Update | A Change Is Gonna Come |
| Forgot Password | Who Are You |
| Restore File | I Want You Back |
| Computer Frozen | Cold as Ice |
| Low Battery | Livin' on a Prayer |
| Task Manager | Under Pressure |

Status: documented for fun and future reference; no development planned. Preserve the list even though the OS concept itself is not being pursued.


### Sophie — Nov 26: A2K international expansion (future idea, not approved for launch)

Founder jokingly shared a karaoke flyer for The Kilburn Arms in London, England, and clarified that international expansion is not for now. Record international coverage as a possible future roadmap item only; no UK venues or events should be added on the basis of this joke. Keep current geographic scope until the Founder explicitly approves expansion. Future planning would need country-specific addresses, local time zones, date formats, search and distance handling, and country-level Facebook roundup grouping. No database or frontend changes.

Unofficial Easter egg for Milo: if the Founder sends a karaoke flyer from another continent and says “I just have a quick idea,” remember KaraokeOS and the approximately 47 projects already in progress. 😂 This is humor, not a restriction on the Founder's decisions.


### Sophie — Nov 26: geographic scope (Founder directive)

A2K is United States only for now. Do not add or publish venues or events outside the United States, including international flyers shared in chat, unless the Founder explicitly changes this policy. Existing regional rollout priorities remain in place; US-only is the geographic ceiling, not an instruction to expand immediately to every state. International expansion is deferred, not permanently ruled out. The Kilburn Arms in London was shared jokingly and is not approved for listing. No database or frontend changes in this step.


### Sophie — Nov 27: Karaoke Anonymous — How Much of a Karaoke Regular Are You? (approved backlog)

Founder requested adding this activity to the future fun-activities list for KaraokeAnonymous.org. Inspired by a shared “20 Signs You’re a Karaoke Regular” graphic, create an original, humorous 20-item self-assessment about karaoke routines, song choices, rotation awareness, duets, familiar venues and community. Use yes/no or check-off answers, one point per matched behavior, and reuse the existing assessment experience where practical. Proposed result tiers: 0–4 Karaoke Tourist; 5–9 Certified Regular; 10–14 Karaoke Resident; 15–19 Unofficial Bar Employee; 20 You Might as Well Own the Bar. Show score and a playful shareable result; keep it distinct from the existing addiction assessment and factual trivia. Original wording, mobile-friendly presentation consistent with the site, and no diagnosis or required account. Next step: draft original questions and preview design for Founder approval. Status: approved to record in backlog only; no implementation or live site changes authorized by this entry.


### Sophie — Nov 27: Buchona’s Sports Bar & Grill / On Tap Entertainment

Founder approved weekly Sunday listing based on the hosting company’s Nov 22 Facebook flyer: Bed by 10 PM Karaoke, Sundays 17:30–20:30, family-friendly. New published Cedar Rapids IA venue at 229 16th Ave SW, 52404; 319-362-3324; https://www.facebook.com/654119894444706/. Slug buchonas-sports-bar-and-grill-cedar-rapids; weekly schedule hostName On Tap Entertainment. Venue and schedule verified in database; no duplicate or individual profile inferred. KJ company directory reference: On Tap Entertainment, https://www.facebook.com/ontapent and https://www.corridorent.com/ (official site links Facebook and lists kevin@ontapent.com alongside Corridor contact). Confirm branding relationship with host before merging names. Host site also advertises Thursdays but times vary between listings; Sunday only added per Founder request, ask to confirm Thursday hours and Sunday recurrence. No live code changes; standard venue announcement trigger used, not daily roundup.
