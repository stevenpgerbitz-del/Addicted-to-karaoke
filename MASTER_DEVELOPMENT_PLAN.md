# Addicted to Karaoke — Master Development Plan
Updated: 2026-11-11
Status: Working plan; implement and test one step at a time.

## Non-negotiable UI design standards — apply to EVERY feature
- All action buttons use the established ATK **red** styling, including Cancel, Save Changes, Confirm, Restore, and Close. Keep buttons visually consistent in size, spacing, and alignment; do not introduce gray secondary buttons.
- Whenever users choose from multiple options, use the existing **Amenities-style selectable square tiles**. Tap the square itself to select or deselect. No checkboxes, radio buttons, separate Select buttons, or Select All button.
- Arrange selectable squares in tidy, compact responsive rows/grids; adapt column count and spacing for phone, app-like mobile use and desktop. Avoid oversized dialogs and controls.
- Maintain the established modal conventions: Close button at bottom, no X icons, no Go Back buttons, and use in-app themed confirmations rather than native browser dialogs.
- Reuse existing shared visual patterns rather than independently restyling each new feature. Check this section before implementing or reviewing ANY screen.

## Priority 1 — System Maintenance and Founder-controlled Go Live
1. Full-system backup: cover venues, KJs, schedules, venue photo metadata AND actual storage objects, reviews and ratings, songs, profiles, roles, verification, claims, and protected administrative history. Address authentication accounts/credentials separately with a realistic secure recovery plan; never imply a partial content JSON is a full backup.
2. Selective restore: preview counts (missing, existing, intentionally deleted, conflicts), restore selected categories and dependencies, avoid overwriting live records, prevent duplicate reviews/ratings, preserve referential integrity.
3. Disaster recovery: test actual missing records, related records, images, and access/permissions; provide verified recovery steps and audit trail. Restore intentionally deleted spam only through an explicit controlled exception, not by default.
4. Pre-launch cleanup lives **inside Go Live**, not as a separate System Wipe entry. Nothing is selected by default. Only venue content is eligible for cleanup; accounts, permissions, song lists, image bytes and audit history are never wiped by the launch flow. A local backup must be downloaded and acknowledged; an additional database-side snapshot is stored transactionally before cleanup. Launch requires an exact Founder-only confirmation, and cleanup cannot be repeated after Production Mode is active. End-to-end recovery testing must still precede real-world destructive use.
5. System Maintenance UI: one admin entry with Backup, Restore, Activity History and Prepare to Go Live. No standalone System Wipe option. Keep established red controls, compact mobile dialogs, Close at bottom, no native browser confirmation and no X icons.
6. Review moderation roadmap: soft-delete/tombstones, suspicious-review review queue, audit logging, bulk moderation.
Current milestone: Build **2026.11.11-91** integrates Founder-only member access backup and atomic role/verification recovery keyed by account UUID, while preserving the approved venue + review restore flow. The Go Live wizard supports an optional venue-content cleanup, pre-launch JSON download, Founder confirmation and atomic server-side snapshot/production phase transition. **No actual launch/cleanup has been triggered.**

Test status: backend role-backup/read-only-diff checks passed for 3 accounts (0 live changes, 1 detected in a simulated altered backup); all 9 inline JavaScript blocks parse. Browser/mobile end-to-end testing and a controlled backup → cleanup → restore test are still required. Downloaded JSON does **not** recreate deleted Supabase Auth accounts/passwords or include uploaded image bytes, full song libraries or protected audit history; do not represent it as a catastrophic full-system backup. This wider disaster-recovery scope remains a separate security milestone.

Backup scope choices (Build 91): The mobile Backup wizard now exposes exactly three dropdown selections: **Full Backup**, **Single Venue**, and **Members & Roles Only**. Full preserves supported venue/review/KJ/schedule/photo metadata plus the minimal role roster; single venue preserves just that venue and its linked records; Members & Roles Only exports a separate `addicted-to-karaoke-member-role-backup` JSON containing account UUIDs, email fingerprints, roles, verification flags and member numbers **without a `tables` key or venue/review content**. Restore accepts this format and compares only account roles/rejoin matches; existing full/venue/legacy restores remain unchanged. Isolated functional tests passed all three download flows plus a role-only import, and nine inline JavaScript blocks passed syntax checks. Android/Chrome user acceptance is still pending. "Full" means all *currently supported* backup data, not deleted Auth accounts, credentials, stored file bytes, complete song libraries or audit history.

Role roster and rejoining accounts (Build 90.2): Full content backup now stores original account UUID, saved platform role, verification flag, member number, and SHA-256-normalized email fingerprint; it does NOT store the member's stage name, email address, or password. Previously downloaded Build 89.2 backups with plaintext email/stage name still import. For original existing account IDs, Founder-only role restore can reapply saved role/verification. For a deleted and re-registered account with a **different UUID**, the Restore wizard can preview eligible candidates by a confirmed-email match and let the Founder explicitly approve a single former Moderator, Admin, or Super Admin role. Former Member automatically remains Member; Founder access cannot be reassigned by this flow. Rejoined accounts do not automatically regain verification badges, login credentials, avatars, membership numbers or other profile data. SHA-256 email fingerprints are pseudonymous and may be vulnerable to guessing; downloaded snapshots must still be stored securely. Dry-run tests matched a simulated rejoin without changing data. Browser/mobile end-to-end approval tests remain pending.

Existing member permissions as inspected 2026-11-11: Mr Steve = Founder, Steven Gerbitz = Member, Aqua Liz = Moderator (not Super Admin). Do not silently elevate access; backups capture actual roles at the time they are created.

## Backup Inspector — Build 92.1 (implemented, pending phone acceptance)
- Add a **read-only** "Inspect Backup" option in System Maintenance: choose a locally downloaded ATK JSON backup and analyze it without uploading, restoring, or mutating database records.
- Use the established compact Amenities-style selectable tiles to show categories and counts (e.g., 5 venues, 4 reviews, 3 members and roles); tapping a category reveals the actual records saved in that file.
- For venues show venue names; for reviews show related venue and the review summary where available; for member-role snapshots show **member numbers/IDs and assigned roles only** (no stage names, plaintext emails, or passwords in current role roster).
- Surface filename, creation date, build number, declared backup scope and format; compare declared counts to actual records; validate IDs, duplicates, relationships and required fields, showing actionable warnings for incomplete or unsupported files.
- Distinguish structural consistency from independently verifiable integrity. Future generated backups may include a checksum, but don't claim existing backups are tamper-proof or a complete disaster recovery package.
- Support Full Backup, Single Venue, Members & Roles Only, and older supported snapshot formats. No automatic restore or changes.
- **Implemented in Build 92.1:** Admin → System Maintenance → Inspect Backup opens a read-only local JSON picker. The mobile-friendly Amenities-style tiles show counts for included venues, reviews, ratings, schedules, photo metadata, KJs, and members/roles. Selecting a tile expands a record-level list. Summary includes filename, snapshot date, scope and build number; validation compares declared counts, duplicate IDs and parent relationships, reporting warnings without changing the database.
- Supports Full Backup, Single Venue, Members & Roles Only, and older version-1 content backups. Member-role detail is shown by member number and saved role, not email or stage name. No restore or upload path in inspector.
- **Verification performed:** all 9 script blocks parse; standalone analyzer samples cover supported formats, invalid files, mismatched counts and orphan reviews; isolated DOM-like interaction test confirmed Members & Roles tile expansion. **Phone/Chrome visual acceptance is still pending.**
- Structural validation does not prove authenticity, tamper resistance or excluded data recovery.

## Priority 2 — Signup and first-run wizard
- Ask “How do you enjoy karaoke?” Singer / KJ / Venue Owner during onboarding.
- Assign basic self-declared role badges immediately; verified/certified badges remain separate and require admin approval.
- Permit multiple roles and later changes; choosing Venue Owner never grants venue ownership or management privileges.
- Guide KJs to create profiles and add hosting locations/schedules; guide owners to venue claim workflow.

## Priority 3 — KJ profiles and hosting schedules
- KJs can search for a venue, attach their KJ profile, and submit their own karaoke days and start/end times.
- If venue is missing, KJ may create a basic venue listing, starting in Submitted status for review; listing creator is NOT venue owner.
- Multiple KJs may host at the same venue on different days/times.
- Distinguish KJ-submitted schedule from verified/confirmed schedule; review unverified submissions for accuracy.
- KJ edits must be scoped to their own hosting schedules, not ownership or general venue administration.

## Priority 4 — Venue owner scheduling permissions
- An approved/verified venue owner may toggle “Allow KJs to post schedules” on or off for their specific claimed venue.
- No verified owner: KJs may submit schedules (subject to moderation).
- Verified owner + enabled: KJs may submit schedules (subject to moderation).
- Verified owner + disabled: only owner or explicitly authorized venue managers can publish/change karaoke schedules; KJs may still identify the venue on their profile but cannot publish schedule changes.
- Toggle must not erase existing schedules; controls future submissions and edits. Enforce in backend authorization, not merely hidden buttons.
- Ownership must be approved through the existing venue claim process before these controls are granted.

## Execution principle
Implement one milestone at a time, preview/test, then proceed. Prioritize verified recoverability over adding features. Keep build/version visible and maintain consistent ATK UI.
