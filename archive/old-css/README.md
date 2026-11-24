# Archived stylesheets — replaced by the CSS consolidation (Nov 24, 2026)

These 53 stylesheets were folded into four grouped files on Nov 24, 2026 and are
kept here only as a safety net. **Nothing in the live site references them** —
the live `index.html` loads only the four grouped files plus the newer layers
(`a2k-management-v2/v3.css`, `a2k-site-v8.css`, `a2k-member-v86/v87.css`).

## What replaced them

Pure concatenation, in load order, zero rules edited — 17/17 pages verified
pixel-identical before the consolidation shipped (Nov 24, 2026, main head
`037e490b`):

- `a2k-public.css` — 10 files (Find, Home, sign-in, venue/event/review styles)
- `a2k-management.css` — 12 files (Approvals, venues, members, reviews, portal)
- `a2k-core.css` — 7 files (global template, header, site layers)
- `a2k-members.css` — 24 files (profile, directory, setup wizards, member layers)

The grouped files carry a `SOURCE:` banner comment naming each original file
and its load position, so any rule can be traced back to where it came from.

## One file was NOT archived

`a2k-member-deletion.css` still lives at the repo root. Sophie's interactive
design file `A2K_Profile_Redesign_Interactive.html` (served live) links it
directly (`a2k-member-deletion.css?v=311`), so moving it would break that page.
If it is ever archived too, that link has to be updated first.

## How to restore a file

Copy it back to the repo root (its original path) — e.g.:

```
cp archive/old-css/desktop-vintage.css ./desktop-vintage.css
```

Git history also preserves every version: any of these files can be recovered
with `git checkout <commit> -- <filename>` (they were last live at main head
`2a5d10a3`, Nov 24, 2026).

## Do not edit these copies

If a rule in one of these files needs changing, change it in the grouped file
that now contains it (`a2k-core.css`, `a2k-public.css`, `a2k-members.css`, or
`a2k-management.css`). Edits here have no effect on the live site.
