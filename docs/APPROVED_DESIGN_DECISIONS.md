# Addicted to Karaoke — Approved UX & Product Decisions

Last updated: 2026-11-09. This is the agreed design reference. Do not silently replace approved behavior with a different pattern.

## Design and implementation process
- Preview a design first; obtain approval before implementing a substantial visual or interaction change.
- Work on one section at a time; test on the actual phone and review screenshots before moving on.
- Preserve existing data, security, roles, and working functionality during UI changes.
- If implementation differs from the approved design, acknowledge and correct it; do not redefine the agreement after the fact.
- Current priority: **finish the Profile page**, then return to **permissions / User Management**.

## Mobile website and future Android app
- Mobile-first, compact **Android Settings-style** cards with about 10–12px spacing, consistent icons, clear titles, short descriptions, right chevrons, and large tap targets.
- **Tap anywhere on a card to open a separate focused popup/window**. Cards must NOT expand inline into long accordion sections.
- Popups can be near-full-screen, scroll their own content, and have a clearly labeled **Close button at the bottom**. No X close buttons.
- The main Profile page should remain compact and easy to navigate.
- Profile header: avatar/name/verification/role, then two **exactly matching** Edit Profile and Management buttons (same dimensions, border, background, padding and alignment) in a separate full-width row beneath profile details.
- Profile cards: About Me, Privacy & Visibility, My Karaoke Songs, Favorite Venues, My Reviews, Account.
- My Karaoke Songs mobile popup initially shows only **four category tiles** (My Songs, Favorites, Want to Sing, Duets) and a full-width Add Song button. No song list on opening. Tapping a category opens its song list; a Categories back button returns to the tiles. Preserve existing song editing, favorites, notes and data. Desktop may retain tabs and expanded list.
- Keep dark red, black, and cream branding; avoid crowded, inconsistent buttons or excessive empty vertical space.

## Desktop website
- More spacious, multi-column traditional layout; content can remain visible directly on the page rather than requiring mobile popups.
- Responsive presentation of the **same features and data**, ideally one maintained codebase.
- Do not force the mobile popup layout on desktop.

## Identity, permissions and profile labels
- Platform roles are **Founder, Super Admin, Admin, Moderator, Member**; role determines actual authorization.
- Verification is separate from staff permissions. Verified KJ and Verified Venue Owner are distinct statuses and should require proper approval.
- Beside the member's name, use **simple text labels** for roles and verification. **Only Founder has a star icon**; no other decorative icons in labels.
- Multiple labels should wrap neatly on mobile. Do not grant conflicting real privileges merely to demonstrate several labels.
- User suggested storing additional display badges as manageable database records, not hardcoded test labels. Design this carefully before implementing and preserve actual role security.
- Founder-specific permissions and audit safeguards must remain intact.

## Future gamified achievements — design direction, NOT current implementation
- Members earn milestones for legitimate published reviews, approved venue submissions, and useful community contributions.
- Separate **earned achievements** from administrative roles and identity verification.
- Earned achievements become visual **karaoke-themed service medals** in a **Medal Showcase further down the public profile**, not cluttering the name/header.
- The showcase may show earned dates, descriptions, and progress toward locked medals; achievement tiers could include bronze/silver/gold/platinum.
- Recognition should reflect genuine participation, not payment or staff privileges. Exact medal artwork, thresholds, rules, and database design still need approval.
- Do not build medals or change permissions until the Profile UI is finished and approved.

## Implementation status (2026-11-09)
- Mobile Profile cards now open focused modal dialogs rather than expanding inline; desktop sections remain expanded. Phone verification still pending.
- Supabase display-badge catalog and per-member badge assignments created separately from real platform roles and verification decisions.
- Founder test account assigned 14 display badges (role labels, verification labels, review and venue achievements) for visual testing. These are test awards, not verified accomplishments.
- Profile includes database-backed labels, an Awards & Achievements text-preview card, and owner-controlled Remove buttons for badges. Future service-medal artwork remains unimplemented.

## Earlier correction (implemented; phone verification pending)
- Existing mobile Profile cards were implemented as HTML `<details>` accordions. **This was a mistake** and contradicts the approved popup navigation.
- Replace inline expansion with actual focused popup windows on mobile, retaining desktop's expanded presentation.
- Verify layout and close/back behavior on phone before considering Profile complete.
