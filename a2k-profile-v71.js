/*
 A2K PROFILE V71 — logged-in profile, FULL V64 PREVIEW MATCH, 2026-11-22.
 Supersedes the V70 layer (a2k-profile-v70.js/css, which stay in the
 repo unused). Companion: a2k-profile-v71.css.

 V70 fixed the cascade war (tab bar and hero placed as full-width rows
 1/2 of the profile grid; hero template at 1-3-1, zone rules at 1-4-1,
 founder badge at 2-3-0, stage-name type at 1-3-1) — all of that is
 carried forward unchanged. V71 adds the rest of the approved V64
 preview design, tab by tab:

 HERO FINISH — the member facts are STACKED as in the preview:
 "Member #000001" / founder badge as a wide gold bar / "Member Since:
 November 2026". The site's facts are one text element
 (#auth-display-membership, "Member #000001 · Member since November
 2026"); syncFacts() splits that text at the separator into two spans
 (same data, reflowed) and CSS orders number / badge / since in a
 column. The hero background becomes the preview's radial burgundy
 glow. My Roles chips are real buttons with the preview's caption
 ("Select a role to preview its section") — clicking one switches to
 the matching tab (Singer → My Karaoke, KJ / Host → KJ/Host,
 Venue Staff → Venue Staff).

 EDIT-BUTTON RULE (Steven's explicit requirement) — every card
 carries its own edit/action control in its header, wired to the
 site's EXISTING editors: the About bundle's real Edit buttons move
 with their sections into the split My Story / My Karaoke Interests
 cards; Profile Information's pencil click-forwards to the real
 stage-name Edit control; the genres card keeps the genres module's
 own Edit; songs/venues keep their native add/edit UI. Nothing is
 cloned, no handler is duplicated, no section is display-only.

 PER-TAB SETS (tab filtering supports a card on multiple tabs, and
 column placement is per-view):
   Overview — Profile Information (compact) · About Me · Favorite
     Music & Eras | My Activity · Profile Setup & Preferences (all rows)
   About Me — Profile Information EXPANDED (Member Number + Member
     Since rows from the real hero facts) · My Story | My Karaoke
     Interests · Awards & Achievements (Settings + Account cards also
     live here, as in V70 — they are the Account Settings button's home)
   My Karaoke — Favorite Music & Eras · Favorite Venues | My Karaoke
     Songs · Singer Setup (setup card, Singer row only)
   KJ / Host — KJ entry card | KJ Setup (setup card, KJ row only)
   Venue Staff — My Venues card | Venue Setup (setup card, Venue row only)
 The preview's "My Karaoke Experience" card and its KJ/Venue
 sub-cards (Hosting Team, Schedule, Venue Details, Posting
 Preferences…) have NO live elements on the real profile — the live
 KJ/Venue data lives behind the KJ entry flow and the My Venues card —
 so they are honestly omitted rather than fabricated. The preview
 has no Reviews card, but the live My Reviews card keeps its V69
 home on the My Karaoke tab — functionality never changes, and its
 count also shows in My Activity. Location row and Photos stat
 remain omitted: the live profile stores neither.

 Everything still works exactly as before: only existing live
 elements, IDs, handlers and dialogs are moved — never cloned, never
 removed — and the whole script is fail-safe: on any error the
 profile is left as the site delivered it.
*/
(function () {
  'use strict';
  if (window.__a2kProfileV71) return;
  window.__a2kProfileV71 = true;

  var profile = null;
  var built = false;
  var currentView = 'overview';
  var els = {}; // live element refs, filled by build()

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = String(text);
    return n;
  }
  function cardByTitle(title) {
    if (!profile) return null;
    var cards = profile.querySelectorAll('details.profile-nav-card');
    for (var i = 0; i < cards.length; i++) {
      var t = cards[i].querySelector(':scope > summary .profile-nav-title');
      if (t && t.textContent.trim() === title) return cards[i];
    }
    return null;
  }
  function isMobile() { return window.matchMedia('(max-width: 799px)').matches; }

  /* Open an existing details card the same way a user tap would. */
  function openCard(card, scrollTarget) {
    if (!card) return;
    if (isMobile()) {
      var s = card.querySelector(':scope > summary');
      if (s && !card.open) { s.click(); return; }
    }
    card.open = true;
    var target = scrollTarget || card;
    try { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
  }

  function runSetupWizard() {
    if (typeof window.atkWelcomeStart === 'function') { window.atkWelcomeStart(true); return; }
    var b = $('a2k-setup-reopen');
    if (b) b.click();
  }

  /* ---------------- per-view card sets + columns ---------------- */
  var VIEWS = null; // filled in build()
  function viewCards(view) {
    var v = (VIEWS && (VIEWS[view] || VIEWS.overview)) || { left: [], right: [] };
    return v.left.concat(v.right);
  }
  function placeCards() {
    try {
      if (!VIEWS) return;
      var v = VIEWS[currentView] || VIEWS.overview;
      var layout = profile.querySelector(':scope > .a2k-profile-independent-columns');
      if (layout) {
        var left = layout.querySelector('.a2k-profile-column-left');
        var right = layout.querySelector('.a2k-profile-column-right');
        if (left && right) {
          v.left.forEach(function (c) { if (c) left.appendChild(c); });
          v.right.forEach(function (c) { if (c) right.appendChild(c); });
          return;
        }
      }
      // Stacked layout: the active view's cards in order, before dialogs.
      var firstDialog = profile.querySelector(':scope > dialog');
      v.left.concat(v.right).forEach(function (c) {
        if (!c) return;
        if (firstDialog) profile.insertBefore(c, firstDialog);
        else profile.appendChild(c);
      });
    } catch (e) {}
  }
  function allPlaced() {
    try {
      if (!VIEWS) return true;
      var v = VIEWS[currentView] || VIEWS.overview;
      var cards = v.left.concat(v.right);
      if (!cards.every(function (c) { return !c || profile.contains(c); })) return false;
      var layout = profile.querySelector(':scope > .a2k-profile-independent-columns');
      if (layout) {
        var left = layout.querySelector('.a2k-profile-column-left');
        var right = layout.querySelector('.a2k-profile-column-right');
        if (left && right) {
          // Membership AND relative order: the grid module rebalances
          // columns by alternating its own slot list whenever a hidden
          // attribute flips, which can leave the right cards in a
          // column in the wrong sequence — that must count as "not
          // placed" so placeCards() re-asserts the view's order.
          var seqOk = function (list, col) {
            var idx = -1;
            for (var i = 0; i < list.length; i++) {
              var c = list[i];
              if (!c) continue;
              if (!col.contains(c)) return false;
              var pos = Array.prototype.indexOf.call(col.children, c);
              if (pos < idx) return false;
              idx = pos;
            }
            return true;
          };
          return seqOk(v.left, left) && seqOk(v.right, right);
        }
      }
      return true;
    } catch (e) { return true; }
  }

  /* ---------------- tabs ---------------- */
  function setView(view) {
    try {
      currentView = view;
      profile.setAttribute('data-v71-view', view);
      var tabs = profile.querySelectorAll('.v71-tab');
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-v71-tab') === view;
        t.classList.toggle('v71-tab-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      // The Profile Setup card is multi-tab: Overview shows every
      // wizard row; each role tab shows only its own row, under the
      // preview's per-tab card title (Singer Setup / KJ Setup /
      // Venue Setup).
      if (els.setupRows) {
        var only = { karaoke: 'singer', kj: 'kj', venue: 'venue' }[view] || null;
        Object.keys(els.setupRows).forEach(function (k) {
          var row = els.setupRows[k];
          if (row) row.hidden = !(!only || only === k);
        });
      }
      if (els.setupTitle) {
        els.setupTitle.textContent =
          view === 'karaoke' ? '🎧 Singer Setup' :
          view === 'kj' ? '🎧 KJ Setup' :
          view === 'venue' ? '🏛 Venue Setup' :
          '⚙ Profile Setup & Preferences';
      }
      if (els.setupSub) els.setupSub.style.display = (view === 'overview') ? '' : 'none';
      // Tab views present their cards EXPANDED, as the preview shows
      // content rather than collapsed bars (desktop only — mobile
      // keeps the site's own summary-tap behavior).
      if (window.matchMedia('(min-width: 900px)').matches) {
        viewCards(view).forEach(function (c) {
          if (c && c.tagName === 'DETAILS' && !c.open) c.open = true;
        });
      }
      placeCards();
    } catch (e) {}
  }
  /* If the bar still measures wider than the profile (a long label, a
     narrow window), step the type/padding down until it fits. */
  function fitTabs() {
    try {
      var bar = els.tabsBar;
      if (!bar || !profile) return;
      bar.classList.remove('v71-tabs-tight', 'v71-tabs-tight2');
      if (bar.scrollWidth <= bar.clientWidth + 1) return;
      bar.classList.add('v71-tabs-tight');
      if (bar.scrollWidth <= bar.clientWidth + 1) return;
      bar.classList.add('v71-tabs-tight2');
    } catch (e) {}
  }

  /* ---------------- hero facts: stacked, split at the separator ----------------
     #auth-display-membership holds "Member #000001 · Member since
     November 2026" as one text node. The preview stacks it: number,
     founder badge bar, since. syncFacts() splits the text into two
     spans (the same data, reflowed) so CSS can order them around the
     badge; if the site rewrites the element's text, the spans vanish
     and the next sync re-splits. A facts value without the separator
     is left completely untouched. */
  var lastFactsSig = null;
  function syncFacts() {
    try {
      var membership = $('auth-display-membership');
      if (!membership) return;
      var numSpan = membership.querySelector('.v71-fact-num');
      var sinceSpan = membership.querySelector('.v71-fact-since');
      if (numSpan && sinceSpan) {
        var sig = numSpan.textContent + ' · ' + sinceSpan.textContent;
        if (sig === lastFactsSig) return;
        lastFactsSig = sig;
      } else {
        var raw = membership.textContent.replace(/\s+/g, ' ').trim();
        if (!raw || raw.indexOf('·') < 0) { lastFactsSig = raw; return; }
        var parts = raw.split('·');
        var numPart = parts[0].trim();
        var sincePart = parts.slice(1).join('·').trim()
          .replace(/^Member since\s*/i, 'Member Since: ');
        if (!numPart || !sincePart) { lastFactsSig = raw; return; }
        membership.textContent = '';
        numSpan = el('span', 'v71-fact-num', numPart);
        sinceSpan = el('span', 'v71-fact-since', sincePart);
        membership.appendChild(numSpan);
        membership.appendChild(sinceSpan);
        lastFactsSig = numPart + ' · ' + sincePart;
      }
      // Mirror the same real facts into the Profile Information
      // card's expanded (About tab) rows.
      var numVal = (numSpan.textContent || '').replace(/^Member\s*/, '');
      var sinceVal = (sinceSpan.textContent || '').replace(/^Member Since:\s*/i, '');
      if (els.infoNum && els.infoNum.textContent !== numVal) els.infoNum.textContent = numVal || '—';
      if (els.infoSince && els.infoSince.textContent !== sinceVal) els.infoSince.textContent = sinceVal || '—';
    } catch (e) {}
  }

  /* ---------------- header: role chips + info mirrors ----------------
     Chips mirror the account's real interests line (the same source
     V69/V70 used — never fabricated). Each known role becomes a real
     button that switches to its tab, as the preview's caption
     promises; unknown text stays a plain chip. */
  var ROLE_TABS = [
    { re: /kj|host/i, tab: 'kj', icon: '🎧' },
    { re: /venue/i, tab: 'venue', icon: '🏛' },
    { re: /sing/i, tab: 'karaoke', icon: '♫' }
  ];
  var lastRolesText = null, lastInfoName = null;
  function syncRolesAndInfo() {
    try {
      var src = $('member-karaoke-interests');
      var text = src ? src.textContent.trim() : '';
      var name = $('auth-display-name');
      var nameText = name ? name.textContent.trim() : '';
      if (text === lastRolesText && nameText === lastInfoName) return;
      lastRolesText = text; lastInfoName = nameText;
      if (els.roleChips) {
        els.roleChips.textContent = '';
        var parts = text.split(/[·•|,]/).map(function (s) { return s.trim(); }).filter(Boolean);
        var isPlaceholder = !text || text === 'Your karaoke stage';
        var clickable = 0;
        if (isPlaceholder) {
          els.roleChips.appendChild(el('span', 'v71-role-note', text || ''));
        } else {
          parts.forEach(function (p) {
            var match = null;
            for (var i = 0; i < ROLE_TABS.length; i++) {
              if (ROLE_TABS[i].re.test(p)) { match = ROLE_TABS[i]; break; }
            }
            if (match) {
              clickable++;
              var chip = el('button', 'v71-role-chip');
              chip.type = 'button';
              chip.appendChild(el('span', 'v71-role-chip-icon', match.icon));
              chip.appendChild(document.createTextNode(p));
              (function (tab) {
                chip.addEventListener('click', function () { setView(tab); });
              })(match.tab);
              els.roleChips.appendChild(chip);
            } else {
              els.roleChips.appendChild(el('span', 'v71-role-chip v71-role-chip-static', p));
            }
          });
        }
        if (els.rolesCaption) els.rolesCaption.style.display = clickable ? '' : 'none';
      }
      if (els.infoInterests) els.infoInterests.textContent = text || '—';
      if (els.infoName) els.infoName.textContent = nameText || '—';
    } catch (e) {}
  }

  /* ---------------- My Activity stats ---------------- */
  function statCount(btn) {
    if (!btn) return null;
    var m = btn.textContent.match(/\((\d+)\)/);
    return m ? parseInt(m[1], 10) : null;
  }
  function syncStats() {
    try {
      if (!els.activityTiles) return;
      var tiles = [];
      var songs = $('atk-singer-songs-entry');
      if (songs) {
        var all = songs.querySelector('[data-song-tab="all"]');
        var fav = songs.querySelector('[data-song-tab="favorites"]');
        var nAll = statCount(all), nFav = statCount(fav);
        if (nAll !== null) tiles.push({ icon: '♫', n: nAll, label: 'My Songs' });
        if (nFav !== null) tiles.push({ icon: '♥', n: nFav, label: 'Favorites' });
      }
      var rv = $('atk-my-reviews');
      if (rv && !/Open this section/.test(rv.textContent)) {
        var count = rv.querySelectorAll(':scope > *').length;
        if (count > 0) tiles.push({ icon: '★', n: count, label: 'Reviews' });
      }
      var key = tiles.map(function (t) { return t.label + t.n; }).join('|');
      if (els.activityTiles.dataset.key === key) return;
      els.activityTiles.dataset.key = key;
      els.activityTiles.textContent = '';
      tiles.forEach(function (t) {
        var tile = el('div', 'v71-stat');
        tile.appendChild(el('span', 'v71-stat-n', t.icon + ' ' + t.n));
        tile.appendChild(el('span', 'v71-stat-label', t.label));
        els.activityTiles.appendChild(tile);
      });
      els.activityCard.style.display = tiles.length ? '' : 'none';
    } catch (e) {}
  }

  /* ---------------- header upkeep (carried from V70) ----------------
     Other modules keep touching the hero after build: V66's script
     leaves a hero-level .member-identity-facts shell behind and moves
     the membership line into it, and the auth code fills/unhides the
     membership line and founder badge asynchronously. syncHero()
     restores the intended end state whenever anything drifts — zone
     CONTENTS, not just zone order. It only writes to the DOM when
     something is actually out of place, so it cannot loop with the
     MutationObserver calling it. */
  var FOUNDER_ID = '491e4116-52cc-4b4a-837f-cb5a28e74e53'; // the id the site's own badge code checks
  function syncHero() {
    try {
      var hero = els.hero;
      if (!hero) return;
      var idZ = els.idZone, rZ = els.rolesZone, tZ = els.toolsZone;

      var avatarWrap = hero.querySelector('.member-avatar-wrap');
      if (avatarWrap && idZ && avatarWrap.parentNode !== idZ) idZ.insertBefore(avatarWrap, idZ.firstChild);
      var nameBlock = els.nameBlock;
      if (nameBlock && idZ && nameBlock.parentNode !== idZ) idZ.appendChild(nameBlock);
      var actionGrid = hero.querySelector('.profile-action-grid');
      if (actionGrid && tZ && actionGrid.parentNode !== tZ) tZ.appendChild(actionGrid);

      // Facts: membership line, then founder badge, inside the name block.
      var facts = els.facts;
      if (facts && nameBlock && facts.parentNode !== nameBlock) nameBlock.appendChild(facts);
      if (facts) {
        var membership = $('auth-display-membership');
        if (membership && membership.parentNode !== facts) facts.appendChild(membership);
        var founder = $('auth-founder-badge');
        if (founder) {
          // Mirror the site's own founder verdict if its render has not
          // landed yet: the badge is unhidden only for the founder id
          // the site itself checks (or when the founder-only Management
          // button is visible). Never unhide it for anyone else.
          try {
            if (founder.hidden) {
              var mgmt = $('management-open');
              var isFounder = (typeof authUser !== 'undefined' && authUser && authUser.id === FOUNDER_ID) ||
                              (mgmt && !mgmt.hidden);
              if (isFounder) founder.hidden = false;
            }
          } catch (e) {}
          if (founder.parentNode !== facts) facts.appendChild(founder);
          if (membership && facts.contains(membership) && facts.contains(founder) &&
              (founder.compareDocumentPosition(membership) & Node.DOCUMENT_POSITION_FOLLOWING)) {
            facts.appendChild(membership);
            facts.appendChild(founder);
          }
        }
      }
      // Any other .member-identity-facts shell (V66 leaves one as a
      // direct hero child): harvest anything left in it, then remove
      // it once empty — as a stray hero child it displaces the zones.
      var strays = hero.querySelectorAll(':scope > .member-identity-facts');
      Array.prototype.forEach.call(strays, function (s) {
        if (s === facts) return;
        if (facts) { while (s.firstChild) facts.appendChild(s.firstChild); }
        if (!s.firstChild && s.parentNode === hero) hero.removeChild(s);
      });
      // Zone order inside the hero: identity, roles, tools.
      if (idZ && rZ && tZ && hero.contains(idZ) && hero.contains(rZ) && hero.contains(tZ)) {
        var kids = Array.prototype.slice.call(hero.children);
        var i1 = kids.indexOf(idZ), i2 = kids.indexOf(rZ), i3 = kids.indexOf(tZ);
        if (!(i1 < i2 && i2 < i3)) {
          hero.appendChild(idZ);
          hero.appendChild(rZ);
          hero.appendChild(tZ);
        }
      }
      // The build stamp never shows inside the profile hero (it stays
      // in the DOM and everywhere else on the site; hero only).
      var stamp = hero.querySelector('[data-build-version]');
      if (stamp) {
        var stampDiv = stamp.closest('div');
        if (stampDiv && stampDiv.parentNode === hero && !stampDiv.classList.contains('v71-build-stamp')) {
          stampDiv.classList.add('v71-build-stamp');
        }
      }
      // The "Management Tools" label never shows inside Account Tools.
      var label = hero.querySelector('.profile-management-label');
      if (label && label.style.display !== 'none') label.style.display = 'none';
      // The interests line is not repeated inside the hero — the My
      // Roles chips beside it already say it. The element stays in the
      // DOM, untouched, for the code that reads and updates it.
      var interests = $('member-karaoke-interests');
      if (interests && hero.contains(interests) && interests.style.display !== 'none') {
        interests.style.display = 'none';
      }
    } catch (e) {}
  }

  /* ---------------- Favorite Music & Eras split (carried from V70) ----------------
     a2k-profile-genres.js (re)appends #a2k-member-favorite-genres
     inside the About interests section whenever it renders. V71 keeps
     the real block — heading, Edit button, chips, editor, handlers —
     inside its own standalone card, and re-applies the move whenever
     the block lands back in the interests section. */
  function syncGenres() {
    try {
      if (!els.genresBody) return;
      var block = $('a2k-member-favorite-genres');
      if (block && block.parentNode !== els.genresBody) {
        els.genresBody.appendChild(block);
      }
      if (els.genresCard) {
        els.genresCard.style.display = block ? '' : 'none';
      }
    } catch (e) {}
  }

  /* ---------------- About split upkeep ----------------
     The story and interests sections were moved into their own cards
     at build. Nothing else moves them, but if a future render ever
     lands them back inside the About bundle, put them home again. */
  function syncSplits() {
    try {
      if (els.storySection && els.storyBody && els.storySection.parentNode !== els.storyBody) {
        els.storyBody.appendChild(els.storySection);
      }
      if (els.interestsSection && els.interestsBody && els.interestsSection.parentNode !== els.interestsBody) {
        els.interestsBody.appendChild(els.interestsSection);
      }
    } catch (e) {}
  }

  /* ---------------- build ---------------- */
  function build() {
    if (built) return;
    profile = $('auth-profile');
    if (!profile) return;
    var hero = profile.querySelector(':scope > .member-hero');
    if (!hero) return;

    /* --- collect live cards --- */
    els.kj = $('atk-kj-profile-entry');
    els.owner = $('atk-owner-profile-entry');
    els.about = $('atk-about-profile-entry');
    els.awards = $('a2k-profile-awards');
    els.settings = $('a2k-profile-settings');
    els.songs = $('atk-singer-songs-entry');
    els.favorites = cardByTitle('Favorite Venues');
    els.reviews = $('atk-my-reviews-entry');
    els.account = cardByTitle('Account');
    if (!els.account) {
      var emailLine = $('auth-display-email');
      if (emailLine && emailLine.closest) els.account = emailLine.closest('details.profile-nav-card');
    }

    /* --- 1. identity header: three zones, as in the preview --- */
    var avatarWrap = hero.querySelector('.member-avatar-wrap');
    var nameBlock = null;
    Array.prototype.forEach.call(hero.children, function (ch) {
      if (ch.querySelector && ch.querySelector('.member-name-line')) nameBlock = ch;
    });
    els.nameBlock = nameBlock;
    var actionGrid = hero.querySelector('.profile-action-grid');

    var idZone = el('div', 'v71-hero-id');
    if (avatarWrap) idZone.appendChild(avatarWrap);
    if (nameBlock) idZone.appendChild(nameBlock);

    // Member number/since + founder badge under the name (existing
    // elements; syncFacts stacks the text, CSS bars the badge).
    var membership = $('auth-display-membership');
    if (membership && nameBlock) {
      var facts = nameBlock.querySelector('.member-identity-facts') || el('div', 'member-identity-facts');
      facts.appendChild(membership);
      var founder = $('auth-founder-badge');
      if (founder) facts.appendChild(founder);
      nameBlock.appendChild(facts);
      els.facts = facts;
    }

    var rolesZone = el('div', 'v71-hero-roles');
    rolesZone.appendChild(el('div', 'v71-hero-zone-title', 'My Roles'));
    els.roleChips = el('div', 'v71-role-chips');
    rolesZone.appendChild(els.roleChips);
    els.rolesCaption = el('div', 'v71-roles-caption', 'Select a role to preview its section');
    els.rolesCaption.style.display = 'none';
    rolesZone.appendChild(els.rolesCaption);

    var toolsZone = el('div', 'v71-hero-tools');
    toolsZone.appendChild(el('div', 'v71-hero-zone-title', 'Account Tools'));
    var settingsBtn = el('button', 'v71-tool-btn', '⚙ Account Settings');
    settingsBtn.type = 'button';
    settingsBtn.addEventListener('click', function () { setView('about'); openCard(els.settings); });
    toolsZone.appendChild(settingsBtn);
    if (actionGrid) toolsZone.appendChild(actionGrid);

    hero.classList.add('v71-hero');
    hero.appendChild(idZone);
    hero.appendChild(rolesZone);
    hero.appendChild(toolsZone);
    els.hero = hero;
    els.idZone = idZone;
    els.rolesZone = rolesZone;
    els.toolsZone = toolsZone;
    syncHero();

    /* --- 2. tab bar --- */
    var tabs = el('nav', 'v71-tabs');
    tabs.setAttribute('aria-label', 'Profile sections');
    [['overview', '▦ Overview'], ['about', 'ⓘ About Me'], ['karaoke', '♫ My Karaoke'], ['kj', '🎧 KJ / Host'], ['venue', '🏛 Venue Staff']].forEach(function (pair) {
      var b = el('button', 'v71-tab', pair[1]);
      b.type = 'button';
      b.setAttribute('data-v71-tab', pair[0]);
      b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { setView(pair[0]); });
      tabs.appendChild(b);
    });
    profile.insertBefore(tabs, hero);
    els.tabsBar = tabs;

    /* --- 3a. Profile Information card (left) ---
       Compact on Overview (Display Name + Karaoke Interests);
       expanded on the About tab with Member Number + Member Since
       rows (CSS switches on data-v71-view; values mirrored from the
       real hero facts by syncFacts). The pencil click-forwards to
       the real stage-name Edit control inside the About bundle. */
    var info = el('section', 'profile-nav-card v71-card v71-info-card');
    var infoHead = el('div', 'v71-card-head');
    infoHead.appendChild(el('h3', 'v71-card-title', 'Profile Information'));
    var infoEdit = el('button', 'v71-card-edit', '✎');
    infoEdit.type = 'button';
    infoEdit.setAttribute('aria-label', 'Edit profile information');
    infoEdit.addEventListener('click', function () {
      var real = els.about ? els.about.querySelector('.profile-identity .profile-section-edit') : null;
      if (real) real.click(); else runSetupWizard();
    });
    infoHead.appendChild(infoEdit);
    info.appendChild(infoHead);
    var rows = el('div', 'v71-info-rows');
    function infoRow(label, extra) {
      var r = el('div', 'v71-info-row' + (extra ? ' v71-info-row-extra' : ''));
      r.appendChild(el('span', 'v71-info-label', label));
      var v = el('strong', 'v71-info-value', '—');
      r.appendChild(v);
      rows.appendChild(r);
      return v;
    }
    els.infoName = infoRow('Display Name:');
    // The interests row is tagged so the expanded About view can
    // swap it for the member-facts rows, as in the preview.
    els.infoInterests = infoRow('Karaoke Interests:');
    rows.lastChild.classList.add('v71-info-interests-row');
    els.infoNum = infoRow('Member Number:', true);
    els.infoSince = infoRow('Member Since:', true);
    info.appendChild(rows);
    els.infoCard = info;

    /* --- 3b. About bundle split: My Story + My Karaoke Interests ---
       The bundled About card keeps the identity section (My Profile)
       and serves as the Overview's About Me card. Its story and
       interests sections move — real nodes, real Edit buttons — into
       their own cards for the About tab. Each split card's header
       carries the section's REAL Edit button (moved out of the
       section's own header row, which is then hidden as a duplicate
       title). */
    function splitCard(section, title, cardClass) {
      if (!section) return null;
      var card = el('section', 'profile-nav-card v71-card ' + cardClass);
      var head = el('div', 'v71-card-head');
      head.appendChild(el('h3', 'v71-card-title', title));
      var top = section.querySelector(':scope > .profile-section-top');
      var editBtn = top ? top.querySelector('.profile-section-edit') : null;
      if (editBtn) head.appendChild(editBtn);
      if (top) top.classList.add('v71-split-top');
      card.appendChild(head);
      var body = el('div', 'v71-subcard-body');
      body.appendChild(section);
      card.appendChild(body);
      return { card: card, body: body };
    }
    var storySection = els.about ? els.about.querySelector('.profile-story') : null;
    var interestsSection = els.about ? els.about.querySelector('.profile-about-interests') : null;
    var storySplit = splitCard(storySection, 'My Story', 'v71-story-card');
    if (storySplit) { els.storyCard = storySplit.card; els.storyBody = storySplit.body; els.storySection = storySection; }
    var interestsSplit = splitCard(interestsSection, 'My Karaoke Interests', 'v71-interests-card');
    if (interestsSplit) { els.interestsCard = interestsSplit.card; els.interestsBody = interestsSplit.body; els.interestsSection = interestsSection; }

    /* --- 3c. Favorite Music & Eras card (left) ---
       A standalone card whose body receives the real genres block
       (see syncGenres). The block keeps its own heading and Edit
       button, which read as the card's title row. */
    var genres = el('section', 'profile-nav-card v71-card v71-genres-card');
    els.genresBody = el('div', 'v71-genres-body');
    genres.appendChild(els.genresBody);
    els.genresCard = genres;

    /* --- 3d. My Activity card (right) --- */
    var activity = el('section', 'profile-nav-card v71-card v71-activity-card');
    var actHead = el('div', 'v71-card-head');
    actHead.appendChild(el('h3', 'v71-card-title', 'My Activity'));
    activity.appendChild(actHead);
    els.activityTiles = el('div', 'v71-stats');
    activity.appendChild(els.activityTiles);
    els.activityCard = activity;

    /* --- 3e. Profile Setup & Preferences card (right, multi-tab) --- */
    var setup = el('section', 'profile-nav-card v71-card v71-setup-card');
    var setupHead = el('div', 'v71-card-head v71-setup-head');
    els.setupTitle = el('h3', 'v71-card-title', '⚙ Profile Setup & Preferences');
    setupHead.appendChild(els.setupTitle);
    els.setupSub = el('p', 'v71-card-sub', 'Personalize your karaoke experience, roles, and account preferences.');
    setupHead.appendChild(els.setupSub);
    setup.appendChild(setupHead);
    var list = el('div', 'v71-setup-list');
    function setupRow(icon, title, desc, pill, fn) {
      var b = el('button', 'v71-setup-row');
      b.type = 'button';
      var ic = el('span', 'v71-setup-icon', icon);
      var tx = el('span', 'v71-setup-text');
      tx.appendChild(el('strong', 'v71-setup-name', title));
      tx.appendChild(el('small', 'v71-setup-desc', desc));
      var pl = el('span', 'v71-setup-pill', pill);
      b.appendChild(ic); b.appendChild(tx); b.appendChild(pl);
      b.addEventListener('click', fn);
      list.appendChild(b);
      return b;
    }
    els.setupRows = {};
    els.setupRows.general = setupRow('⚙', 'General Setup Wizard', 'Set up your basic profile, account details, and preferences.', 'Run Wizard ›', runSetupWizard);
    els.setupRows.singer = setupRow('♫', 'Singer Preferences Wizard', 'Set up your karaoke experience, favorite genres, songs, and performance preferences.', 'Open ›', function () {
      setView('karaoke');
      var ge = $('a2k-member-genres-edit');
      if (ge && !ge.hidden) { ge.click(); return; }
      try { els.genresCard.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
    });
    els.setupRows.kj = setupRow('🎧', 'KJ / Host Wizard', 'Add your hosting details, venues, and karaoke schedule.', 'Open ›', function () {
      if (els.kj && !els.kj.hidden) { setView('kj'); els.kj.click(); }
      else runSetupWizard();
    });
    els.setupRows.venue = setupRow('🏛', 'Venue Staff Wizard', 'Claim or manage a venue, amenities, and karaoke settings.', 'Open ›', function () {
      if (els.owner && !els.owner.hidden) { setView('venue'); openCard(els.owner); }
      else runSetupWizard();
    });
    els.setupRows.privacy = setupRow('🛡', 'Privacy Wizard', 'Control what information is visible on your public profile and in the member directory.', 'Open ›', function () {
      setView('about');
      openCard(els.settings);
    });
    setup.appendChild(list);
    els.setupCard = setup;

    /* --- 3f. Favorite Venues: the preview's Add Venue action ---
       The live card has no add control of its own; the site's real
       venue-finding route is the Find Karaoke screen (the same one
       the My Venues card's "Find Karaoke Venues" button leads to),
       so the pill navigates there via the site's own navigate(). */
    if (els.favorites) {
      var favPanel = els.favorites.querySelector('.member-panel');
      if (favPanel) {
        var favActions = el('div', 'v71-fav-actions');
        var favAdd = el('button', 'v71-card-edit', 'Add Venue');
        favAdd.type = 'button';
        favAdd.addEventListener('click', function () {
          if (typeof window.navigate === 'function') { window.navigate('find'); return; }
          if (typeof window.profileOwnerFindVenues === 'function') { window.profileOwnerFindVenues(); }
        });
        favActions.appendChild(favAdd);
        favPanel.insertBefore(favActions, favPanel.firstChild);
      }
    }

    /* --- tab groups (a card may belong to several tabs) --- */
    function tag(card, groups) {
      if (!card) return;
      groups.forEach(function (g) { card.classList.add('v71-g-' + g); });
    }
    tag(els.infoCard, ['overview', 'about']);
    tag(els.about, ['overview']);
    tag(els.storyCard, ['about']);
    tag(els.interestsCard, ['about']);
    tag(els.genresCard, ['overview', 'karaoke']);
    tag(els.activityCard, ['overview']);
    tag(els.setupCard, ['overview', 'karaoke', 'kj', 'venue']);
    tag(els.awards, ['about']);
    tag(els.settings, ['about']);
    tag(els.account, ['about']);
    tag(els.songs, ['karaoke']);
    tag(els.favorites, ['karaoke']);
    // The preview has no Reviews card, but the live My Reviews card
    // keeps the tab home it had in V69 — My Karaoke — so no live
    // section becomes unreachable (functionality never changes).
    tag(els.reviews, ['karaoke']);
    tag(els.kj, ['kj']);
    tag(els.owner, ['venue']);

    /* --- per-view columns --- */
    VIEWS = {
      overview: { left: [els.infoCard, els.about, els.genresCard], right: [els.activityCard, els.setupCard] },
      about: { left: [els.infoCard, els.storyCard, els.settings], right: [els.interestsCard, els.awards, els.account] },
      karaoke: { left: [els.genresCard, els.favorites], right: [els.songs, els.setupCard, els.reviews] },
      kj: { left: [els.kj], right: [els.setupCard] },
      venue: { left: [els.owner], right: [els.setupCard] }
    };

    // New cards enter the profile as direct children (the desktop
    // grid module then adopts them like any other profile card).
    [els.infoCard, els.storyCard, els.interestsCard, els.genresCard, els.activityCard, els.setupCard].forEach(function (c) {
      if (c) profile.appendChild(c);
    });
    setView('overview');
    built = true;

    /* --- live sync --- */
    syncHero();
    syncFacts();
    syncGenres();
    syncSplits();
    syncRolesAndInfo();
    syncStats();
    fitTabs();
    /* Lifetime upkeep: the site's auth render lands asynchronously
       after this script runs, and runtime modules keep moving nodes
       afterwards. The syncs are write-guarded (they only touch the
       DOM when something is actually out of place), and the observer
       is rAF-debounced, so this stays cheap and cannot loop. It never
       disconnects. */
    var syncQueued = false;
    function queueSync() {
      if (syncQueued) return;
      syncQueued = true;
      window.requestAnimationFrame(function () {
        syncQueued = false;
        syncHero();
        syncFacts();
        syncGenres();
        syncSplits();
        if (!allPlaced()) { placeCards(); return; }
        syncRolesAndInfo();
        syncStats();
      });
    }
    var mo = new MutationObserver(queueSync);
    mo.observe(profile, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden'] });
    var mq = window.matchMedia('(min-width: 1024px)');
    var onMq = function () { window.requestAnimationFrame(function () { placeCards(); fitTabs(); }); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
    var rto = null;
    window.addEventListener('resize', function () {
      if (rto) return;
      rto = setTimeout(function () { rto = null; fitTabs(); }, 180);
    });
  }

  function start() {
    try { build(); } catch (e) { /* fail-safe: leave the profile untouched */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
