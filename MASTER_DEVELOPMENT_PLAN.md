# Addicted to Karaoke — Master Development Plan
Updated: 2026-11-10
Status: Working plan; implement and test one step at a time.

## Non-negotiable UI design standards — apply to EVERY feature
- All action buttons use the established ATK **red** styling, including Cancel, Save Changes, Confirm, Restore, and Close. Keep buttons visually consistent in size, spacing, and alignment; do not introduce gray secondary buttons.
- Whenever users choose from multiple options, use the existing **Amenities-style selectable square tiles**. Tap the square itself to select or deselect. No checkboxes, radio buttons, separate Select buttons, or Select All button.
- Arrange selectable squares in tidy, compact responsive rows/grids; adapt column count and spacing for phone, app-like mobile use and desktop. Avoid oversized dialogs and controls.
- Maintain the established modal conventions: Close button at bottom, no X icons, no Go Back buttons, and use in-app themed confirmations rather than native browser dialogs.
- Reuse existing shared visual patterns rather than independently restyling each new feature. Check this section before implementing or reviewing ANY screen.

## Priority 1 — System Maintenance: complete recovery BEFORE new role features
1. Full-system backup: cover venues, KJs, schedules, venue photo metadata AND actual storage objects, reviews and ratings, songs, profiles, roles, verification, claims, and protected administrative history. Address authentication accounts/credentials separately with a realistic secure recovery plan; never imply a partial content JSON is a full backup.
2. Selective restore: preview counts (missing, existing, intentionally deleted, conflicts), restore selected categories and dependencies, avoid overwriting live records, prevent duplicate reviews/ratings, preserve referential integrity.
3. Disaster recovery: test actual missing records, related records, images, and access/permissions; provide verified recovery steps and audit trail. Restore intentionally deleted spam only through an explicit controlled exception, not by default.
4. System wipe: category selection using the established compact tile UI, no Select All button; automatically create and verify a recoverable backup before any destructive wipe; explicit confirmation, protected audit history, least-privilege permissions. Keep wipe disabled until safeguards and full restore are tested.
5. System Maintenance UI: one entry for Backup, Restore, Wipe; consistent red Cancel/confirm buttons, compact mobile dialogs, Close at bottom, no browser-native confirm, no Go Back or X buttons.
6. Review moderation roadmap: soft-delete/tombstones, suspicious-review review queue, audit logging, bulk moderation.
Current milestone: Build 2026.11.10-50 supports founder-only missing-venue restore, not full-system recovery. Venue deletion cascades to reviews and ratings; restore of those related records is not yet supported. Do not enable system wipe prematurely.

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
