# A2K Member Profile — Approved Visual Reference
Status: **APPROVED DESIGN. DO NOT REDESIGN OR REBRAND WITHOUT EXPLICIT REQUEST.**

User-selected visual reference (November 16, 2026): compact, two-column member profile image shared in ChatGPT, showing MrSteve. This is the canonical target for **all member profiles**, including KJs and venue owners. Match its appearance, not merely its colors. Build 246 introduces `a2k-profile-reference.css` as the final CSS layer.

## Geometry
- Content centered and narrower than the full desktop width. Left identity card occupies approximately one-third of the profile; the right column occupies two-thirds. Both columns align at the top; ~14–16px gap.
- Deep wine/burgundy gradient panels, thin antique gold borders, ~12px radii, shadowed edges, near-black vintage lounge background. The palette stays **red / black / cream / muted gold**, absolutely no neon.
- Profile identity: large round portrait with thin gold border, prominent italic cream stage name, smaller role, thin gold flourish divider. Display verified membership number and member-since facts with small gold icons. Under another divider, label “Badges” and tidy equal-size badges, three per row where space permits.
- Profile right: small, equally styled stacked cards, tight vertical gaps. The head text uses italic cream serif at consistent size; each heading has a fine gold-brown divider.
- **About Me:** natural-length bio, no unnecessary padding or repeated explanatory wording.
- **Karaoke Interests:** user-selected music genres/eras as compact, gold-outlined round pills. Keep role selection (Singer/KJ/Venue Owner) distinct from musical preferences.
- **My Karaoke Songs (Singer only, subject to privacy):** compact rows with music/heart icons; song title, artist, small special-list tag when relevant. A small “View All Songs →” text action aligned to the heading, not a giant button.
- **Favorite Venues:** personal saved venues only with card-like row and venue icon; respect privacy. Small “View All Venues →” header action.
- **KJ/Host:** use the same member profile visual layout, not a second KJ popup. KJ Reviews is a compact native card. The “Profile” / “Karaoke Schedule” tabs live **inside the right column** and switch only that column; the identity card remains visible. Approved schedules show each venue and each weekly day/time. Never invent locations or schedules.
- No giant action buttons inside content cards; use small text/link actions where appropriate. Keep phone and desktop visual language coherent.
- Match the reference's **proportions, spacing, card treatments, typographic hierarchy and icon sizing**, not only the colors.

## Safety and data rules
- Never fabricate song, genre, badge, venue, rating or KJ schedule data just to resemble the screenshot.
- Respect member directory opt-in, profile visibility, song privacy and unpublished schedule restrictions.
- Non-singer roles should not show Singer song-list panels; KJs can use the schedule tab without being Singers.
- The sample screenshot's contents and exact member number are illustrative; actual user data and real member numbers must come from the database.
- When verifying a new build, compare an actual desktop screenshot side-by-side with the approved MrSteve screenshot **before declaring it an exact match**.

## Existing source
- `desktop-members.js`: profile markup and tab content.
- `a2k-profile-reference.css`: final, highly scoped desktop reference styles, loaded after the existing CSS.
- `a2k-member-profile-vintage.css`: older base styling; keep behavior but don't let it supersede the approved reference.
