/*
 A2K PROFILE V69 — logged-in profile matched card-by-card to the approved
 V64 preview page (A2K_Profile_Redesign_Interactive.html, Overview tab),
 2026-11-22. Supersedes the V67/V68 layer (a2k-profile-v67.js/css, which
 stay in the repo unused). Companion: a2k-profile-v69.css.

 V67/V68 built the preview's frame (tab bar, three-zone identity header,
 two columns, wizard rows) but Steven's desktop QA showed the cards inside
 the frame were still the old profile's cards, and three defects survived
 both passes. V69 fixes exactly those, at the card level:

   1. FOUNDER BADGE. Root cause found: the badge element starts life inside
      the Account card and the site's own auth code unhides it only for the
      founder (authUser.id === the founder id the site itself checks). But
      a2k-profile-grid.css hides it with
      "#auth-profile #auth-founder-badge{display:none!important}" — a
      TWO-ID selector (specificity 2-0-0). V68's hero override used ONE id
      plus classes (1-4-0), so with both rules !important the grid rule
      still won and the badge stayed display:none even after the site
      unhid it. V69's CSS uses both IDs plus hero scoping (2-3-0) so the
      badge renders in the hero when — and only when — the site's own
      code has unhidden it. syncHero() below also mirrors the site's own
      founder check as a fallback and keeps the badge placed in the hero
      facts, after the membership line.
   2. HEADER ZONES. syncHero() now verifies the CONTENTS of each zone on
      every pass (portrait + name block in the identity zone, the action
      grid in the tools zone, membership + founder badge inside the name
      block's facts, in that order) instead of only checking zone order,
      and the build stamp inside the hero is hidden outright.
   3. TAB BAR. Tabs are hard-capped to the profile's content width and a
      fit pass shrinks type/padding if the bar still measures too wide —
      the fifth tab can no longer run off the right edge.
   4. CARD-LEVEL MATCH. "Favorite Music & Eras" (the genres block that
      a2k-profile-genres.js appends inside the About Me card) is split out
      into its own standalone card after About Me, and tab filtering now
      enforces the preview's sets on EVERY tab: Overview shows only
      Profile Information, About Me, Favorite Music & Eras (left) and
      My Activity, Profile Setup & Preferences (right). The split and the
      filtering re-apply whenever runtime modules move or inject cards.

 Everything still works exactly as in V67: only existing live elements,
 IDs, handlers and dialogs are moved — never cloned, never removed — and
 the whole script is fail-safe: on any error the profile is left as the
 site delivered it.
*/
(function () {
  'use strict';
  if (window.__a2kProfileV69) return;
  window.__a2kProfileV69 = true;

  var profile = null;
  var built = false;
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

  /* ---------------- header: roles chips + mirrors ---------------- */
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
        var parts = text.split(/[·•|,\/]/).map(function (s) { return s.trim(); }).filter(Boolean);
        var isPlaceholder = !text || text === 'Your karaoke stage';
        if (isPlaceholder) {
          els.roleChips.appendChild(el('span', 'v69-role-note', text || ''));
        } else {
          parts.forEach(function (p) { els.roleChips.appendChild(el('span', 'v69-role-chip', p)); });
        }
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
        var tile = el('div', 'v69-stat');
        tile.appendChild(el('span', 'v69-stat-n', t.icon + ' ' + t.n));
        tile.appendChild(el('span', 'v69-stat-label', t.label));
        els.activityTiles.appendChild(tile);
      });
      els.activityCard.style.display = tiles.length ? '' : 'none';
    } catch (e) {}
  }

  /* ---------------- header upkeep ----------------
     Other modules keep touching the hero after build: V66's script leaves
     a hero-level .member-identity-facts shell behind and moves the
     membership line into it, and the auth code fills/unhides the
     membership line and founder badge asynchronously. syncHero() restores
     the intended end state whenever anything drifts — zone CONTENTS, not
     just zone order. It only writes to the DOM when something is actually
     out of place, so it cannot loop with the MutationObserver calling it. */
  var FOUNDER_ID = '491e4116-52cc-4b4a-837f-cb5a28e74e53'; // the id the site's own badge code checks
  function syncHero() {
    try {
      var hero = els.hero;
      if (!hero) return;
      var idZ = els.idZone, rZ = els.rolesZone, tZ = els.toolsZone;

      // Zone membership: portrait and name block belong to the identity
      // zone; the existing action grid (Account Settings' sibling buttons,
      // incl. the founder-only Management button) belongs to tools.
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
          // landed yet: the badge is unhidden only for the founder id the
          // site itself checks (or when the founder-only Management
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
      // Any other .member-identity-facts shell (V66 leaves one as a direct
      // hero child): harvest anything left in it, then remove it once
      // empty — as a stray hero child it displaces the real zones.
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
      // The build stamp never shows inside the profile hero (it stays in
      // the DOM and everywhere else on the site; this is hero-only).
      var stamp = hero.querySelector('[data-build-version]');
      if (stamp) {
        var stampDiv = stamp.closest('div');
        if (stampDiv && stampDiv.parentNode === hero && !stampDiv.classList.contains('v69-build-stamp')) {
          stampDiv.classList.add('v69-build-stamp');
        }
      }
      // The "Management Tools" label never shows inside Account Tools
      // (profile-management-layout.css re-displays it for founders via a
      // :has() rule; the V69 CSS hides it too — this is belt and braces).
      var label = hero.querySelector('.profile-management-label');
      if (label && label.style.display !== 'none') label.style.display = 'none';
      // The interests line ("Singer") is not repeated inside the hero —
      // the My Roles chips beside it already say it. The element stays in
      // the DOM, untouched, for the code that reads and updates it.
      var interests = $('member-karaoke-interests');
      if (interests && hero.contains(interests) && interests.style.display !== 'none') {
        interests.style.display = 'none';
      }
    } catch (e) {}
  }

  /* ---------------- Favorite Music & Eras split ----------------
     a2k-profile-genres.js (re)appends #a2k-member-favorite-genres inside
     the About card's interests section whenever it renders. V69 keeps the
     real block — heading, Edit button, chips, editor and all handlers —
     inside its own standalone card after About Me, and re-applies the
     move whenever the block lands back in About. */
  function syncGenres() {
    try {
      if (!els.genresBody) return;
      var block = $('a2k-member-favorite-genres');
      if (block && block.parentNode !== els.genresBody) {
        els.genresBody.appendChild(block);
      }
      if (els.genresCard) {
        // The card is only meaningful once the genres module has built
        // its block; until then it stays out of the way entirely.
        els.genresCard.style.display = block ? '' : 'none';
      }
    } catch (e) {}
  }

  /* ---------------- card placement ----------------
     Desktop uses the existing a2k-profile-grid.js columns when present;
     otherwise (mobile) cards stack in DOM order. This only ever moves the
     original nodes; it never copies or removes them. */
  var ORDER = null; // filled in build(): desired card sequence
  var LEFT = null, RIGHT = null; // desired desktop column groupings
  function placeCards() {
    try {
      if (!ORDER) return;
      var layout = profile.querySelector(':scope > .a2k-profile-independent-columns');
      if (layout) {
        var left = layout.querySelector('.a2k-profile-column-left');
        var right = layout.querySelector('.a2k-profile-column-right');
        if (left && right) {
          LEFT.forEach(function (c) { if (c) left.appendChild(c); });
          RIGHT.forEach(function (c) { if (c) right.appendChild(c); });
          return;
        }
      }
      // Stacked layout: keep cards as direct children, in order, before dialogs.
      var firstDialog = profile.querySelector(':scope > dialog');
      ORDER.forEach(function (c) {
        if (!c) return;
        if (firstDialog) profile.insertBefore(c, firstDialog);
        else profile.appendChild(c);
      });
    } catch (e) {}
  }
  function allPlaced() {
    try {
      var cards = [els.infoCard, els.activityCard, els.setupCard, els.about, els.genresCard, els.songs, els.awards, els.kj, els.favorites, els.owner, els.reviews, els.settings, els.account];
      if (!cards.every(function (c) { return !c || profile.contains(c); })) return false;
      var layout = profile.querySelector(':scope > .a2k-profile-independent-columns');
      if (layout && LEFT && RIGHT) {
        var left = layout.querySelector('.a2k-profile-column-left');
        var right = layout.querySelector('.a2k-profile-column-right');
        if (left && right) {
          var inCol = function (c, col) { return !c || col.contains(c); };
          return LEFT.every(function (c) { return inCol(c, left); }) &&
                 RIGHT.every(function (c) { return inCol(c, right); });
        }
      }
      return true;
    } catch (e) { return true; }
  }

  /* ---------------- tabs ---------------- */
  function setView(view) {
    try {
      profile.setAttribute('data-v69-view', view);
      var tabs = profile.querySelectorAll('.v69-tab');
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-v69-tab') === view;
        t.classList.toggle('v69-tab-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    } catch (e) {}
  }
  /* If the bar still measures wider than the profile (a long label, a
     narrow window), step the type/padding down until it fits. */
  function fitTabs() {
    try {
      var bar = els.tabsBar;
      if (!bar || !profile) return;
      bar.classList.remove('v69-tabs-tight', 'v69-tabs-tight2');
      if (bar.scrollWidth <= bar.clientWidth + 1) return;
      bar.classList.add('v69-tabs-tight');
      if (bar.scrollWidth <= bar.clientWidth + 1) return;
      bar.classList.add('v69-tabs-tight2');
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

    var idZone = el('div', 'v69-hero-id');
    if (avatarWrap) idZone.appendChild(avatarWrap);
    if (nameBlock) idZone.appendChild(nameBlock);

    // Member number/since + founder badge under the name (existing elements).
    var membership = $('auth-display-membership');
    if (membership && nameBlock) {
      var facts = nameBlock.querySelector('.member-identity-facts') || el('div', 'member-identity-facts');
      facts.appendChild(membership);
      var founder = $('auth-founder-badge');
      if (founder) facts.appendChild(founder);
      nameBlock.appendChild(facts);
      els.facts = facts;
    }

    var rolesZone = el('div', 'v69-hero-roles');
    rolesZone.appendChild(el('div', 'v69-hero-zone-title', 'My Roles'));
    els.roleChips = el('div', 'v69-role-chips');
    rolesZone.appendChild(els.roleChips);

    var toolsZone = el('div', 'v69-hero-tools');
    toolsZone.appendChild(el('div', 'v69-hero-zone-title', 'Account Tools'));
    var settingsBtn = el('button', 'v69-tool-btn', '⚙ Account Settings');
    settingsBtn.type = 'button';
    settingsBtn.addEventListener('click', function () { setView('about'); openCard(els.settings); });
    toolsZone.appendChild(settingsBtn);
    if (actionGrid) toolsZone.appendChild(actionGrid);

    // The v69-hero class activates the V69 hero CSS (including the rule
    // that parks non-zone hero children); add it only now that the zones
    // are assembled and ready to take their places.
    hero.classList.add('v69-hero');
    hero.appendChild(idZone);
    hero.appendChild(rolesZone);
    hero.appendChild(toolsZone);
    els.hero = hero;
    els.idZone = idZone;
    els.rolesZone = rolesZone;
    els.toolsZone = toolsZone;
    syncHero();

    /* --- 2. tab bar --- */
    var tabs = el('nav', 'v69-tabs');
    tabs.setAttribute('aria-label', 'Profile sections');
    [['overview', '▦ Overview'], ['about', 'ⓘ About Me'], ['karaoke', '♫ My Karaoke'], ['kj', '🎧 KJ / Host'], ['venue', '🏛 Venue Staff']].forEach(function (pair) {
      var b = el('button', 'v69-tab', pair[1]);
      b.type = 'button';
      b.setAttribute('data-v69-tab', pair[0]);
      b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { setView(pair[0]); });
      tabs.appendChild(b);
    });
    profile.insertBefore(tabs, hero);
    els.tabsBar = tabs;

    /* --- 3a. Profile Information card (left column) --- */
    var info = el('section', 'profile-nav-card v69-card v69-info-card');
    var infoHead = el('div', 'v69-card-head');
    infoHead.appendChild(el('h3', 'v69-card-title', 'Profile Information'));
    info.appendChild(infoHead);
    var rows = el('div', 'v69-info-rows');
    function infoRow(label) {
      var r = el('div', 'v69-info-row');
      r.appendChild(el('span', 'v69-info-label', label));
      var v = el('strong', 'v69-info-value', '—');
      r.appendChild(v);
      rows.appendChild(r);
      return v;
    }
    els.infoName = infoRow('Display Name:');
    els.infoInterests = infoRow('Karaoke Interests:');
    info.appendChild(rows);
    els.infoCard = info;

    /* --- 3b. Favorite Music & Eras card (left column) ---
       A standalone card whose body receives the real genres block (see
       syncGenres). The block keeps its own heading and Edit button, which
       read as the card's title row — no duplicate heading is added. */
    var genres = el('section', 'profile-nav-card v69-card v69-genres-card');
    els.genresBody = el('div', 'v69-genres-body');
    genres.appendChild(els.genresBody);
    els.genresCard = genres;

    /* --- 3c. My Activity card (right column) --- */
    var activity = el('section', 'profile-nav-card v69-card v69-activity-card');
    var actHead = el('div', 'v69-card-head');
    actHead.appendChild(el('h3', 'v69-card-title', 'My Activity'));
    activity.appendChild(actHead);
    els.activityTiles = el('div', 'v69-stats');
    activity.appendChild(els.activityTiles);
    els.activityCard = activity;

    /* --- 3d. Profile Setup & Preferences card (right column) --- */
    var setup = el('section', 'profile-nav-card v69-card v69-setup-card');
    var setupHead = el('div', 'v69-card-head');
    setupHead.appendChild(el('h3', 'v69-card-title', '⚙ Profile Setup & Preferences'));
    setupHead.appendChild(el('p', 'v69-card-sub', 'Personalize your karaoke experience, roles, and account preferences.'));
    setup.appendChild(setupHead);
    var list = el('div', 'v69-setup-list');
    function setupRow(icon, title, desc, pill, fn) {
      var b = el('button', 'v69-setup-row');
      b.type = 'button';
      var ic = el('span', 'v69-setup-icon', icon);
      var tx = el('span', 'v69-setup-text');
      tx.appendChild(el('strong', 'v69-setup-name', title));
      tx.appendChild(el('small', 'v69-setup-desc', desc));
      var pl = el('span', 'v69-setup-pill', pill);
      b.appendChild(ic); b.appendChild(tx); b.appendChild(pl);
      b.addEventListener('click', fn);
      list.appendChild(b);
      return b;
    }
    setupRow('⚙', 'General Setup Wizard', 'Set up your basic profile, account details, and preferences.', 'Run Wizard ›', runSetupWizard);
    setupRow('♫', 'Singer Preferences Wizard', 'Set up your karaoke experience, favorite genres, songs, and performance preferences.', 'Open ›', function () {
      setView('about');
      var target = els.about ? els.about.querySelector('.profile-about-interests') : null;
      openCard(els.about, target || els.about);
    });
    setupRow('🎧', 'KJ / Host Wizard', 'Add your hosting details, venues, and karaoke schedule.', 'Open ›', function () {
      if (els.kj && !els.kj.hidden) { setView('kj'); els.kj.click(); }
      else runSetupWizard();
    });
    setupRow('🏛', 'Venue Staff Wizard', 'Claim or manage a venue, amenities, and karaoke settings.', 'Open ›', function () {
      if (els.owner && !els.owner.hidden) { setView('venue'); openCard(els.owner); }
      else runSetupWizard();
    });
    setupRow('🛡', 'Privacy Wizard', 'Control what information is visible on your public profile and in the member directory.', 'Open ›', function () {
      setView('about');
      openCard(els.settings);
    });
    setup.appendChild(list);
    els.setupCard = setup;

    /* --- tab groups on every card (the preview's sets) ---
       Overview is a strict set now, not "everything": only Profile
       Information, About Me and Favorite Music & Eras on the left, My
       Activity and Profile Setup & Preferences on the right. Cards not
       named in the V69 mapping keep a single home: My Reviews travels
       with the member's karaoke life (My Karaoke tab) and the Account
       card with Settings (About Me tab). */
    function tag(card, groups) {
      if (!card) return;
      groups.forEach(function (g) { card.classList.add('v69-g-' + g); });
    }
    tag(els.infoCard, ['overview', 'about']);
    tag(els.about, ['overview', 'about']);
    tag(els.genresCard, ['overview']);
    tag(els.activityCard, ['overview']);
    tag(els.setupCard, ['overview', 'kj', 'venue']);
    tag(els.awards, ['about']);
    tag(els.settings, ['about']);
    tag(els.account, ['about']);
    tag(els.songs, ['karaoke']);
    tag(els.favorites, ['karaoke']);
    tag(els.reviews, ['karaoke']);
    tag(els.kj, ['kj']);
    tag(els.owner, ['venue']);

    /* --- order + columns --- */
    ORDER = [els.infoCard, els.activityCard, els.about, els.genresCard, els.setupCard, els.songs, els.awards, els.kj, els.favorites, els.owner, els.reviews, els.settings, els.account];
    LEFT = [els.infoCard, els.about, els.genresCard, els.songs, els.favorites, els.settings];
    RIGHT = [els.activityCard, els.setupCard, els.awards, els.kj, els.owner, els.reviews, els.account];
    // New cards enter the profile as direct children (the desktop grid
    // module then adopts them like any other profile card).
    profile.appendChild(els.infoCard);
    profile.appendChild(els.genresCard);
    profile.appendChild(els.activityCard);
    profile.appendChild(els.setupCard);
    placeCards();
    setView('overview');
    built = true;

    /* --- live sync: hero, genres split, mirrors, stats, tab fit --- */
    syncHero();
    syncGenres();
    syncRolesAndInfo();
    syncStats();
    fitTabs();
    var mo = new MutationObserver(function () {
      syncHero();
      syncGenres();
      if (!allPlaced()) { placeCards(); return; }
      syncRolesAndInfo();
      syncStats();
    });
    mo.observe(profile, { childList: true, subtree: true, characterData: true });
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
