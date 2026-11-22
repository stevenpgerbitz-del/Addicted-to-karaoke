/*
 A2K PROFILE V67 — logged-in profile restructured to the approved V64 preview
 page (A2K_Profile_Redesign_Interactive.html, Overview tab), 2026-11-22.

 V65/V66 only restyled the existing profile; the preview is a different page
 STRUCTURE. This script performs that structure change at runtime, using only
 existing live elements, IDs, handlers and dialogs:

   - A tab bar (Overview / About Me / My Karaoke / KJ / Host / Venue Staff)
     that filters which of the existing section cards are shown.
   - The existing hero becomes the preview's wide identity header: portrait +
     stage name + member number/since + founder badge on the left, "My Roles"
     chips (rendered from the existing #member-karaoke-interests text) in the
     center, "Account Tools" (Account Settings + the existing Management
     button) on the right.
   - New wrapper cards filled ONLY from live data already on the page:
       * Profile Information — mirrors of #auth-display-name and
         #member-karaoke-interests (no location exists live, so none shown).
       * My Activity — counts read from the existing song-tab labels
         ("My Songs (n)", "Favorites (n)") and, once loaded, the reviews
         list. No count is ever invented; unavailable stats are omitted.
       * Profile Setup & Preferences — rows that trigger the SAME live
         flows as the existing entries: the setup wizard
         (window.atkWelcomeStart, the live "Run Setup Wizard" action), the
         About Me section (singer preferences/genres), the KJ entry
         (atkKjStart), the My Venues section and the Settings section
         (privacy).
   - All existing section cards are kept and re-ordered; nothing is removed.

 Fail-safe: everything runs inside try/catch; on any error the profile is
 left exactly as V66 delivered it.
*/
(function () {
  'use strict';
  if (window.__a2kProfileV67) return;
  window.__a2kProfileV67 = true;

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
          els.roleChips.appendChild(el('span', 'v67-role-note', text || ''));
        } else {
          parts.forEach(function (p) { els.roleChips.appendChild(el('span', 'v67-role-chip', p)); });
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
        var tile = el('div', 'v67-stat');
        tile.appendChild(el('span', 'v67-stat-n', t.icon + ' ' + t.n));
        tile.appendChild(el('span', 'v67-stat-label', t.label));
        els.activityTiles.appendChild(tile);
      });
      els.activityCard.style.display = tiles.length ? '' : 'none';
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
      var cards = [els.infoCard, els.activityCard, els.setupCard, els.about, els.songs, els.awards, els.kj, els.favorites, els.owner, els.reviews, els.settings, els.account];
      if (!cards.every(function (c) { return !c || profile.contains(c); })) return false;
      // When the desktop grid columns exist, V67's grouping must hold even
      // after that module rebalances its own cards.
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
      profile.setAttribute('data-v67-view', view);
      var tabs = profile.querySelectorAll('.v67-tab');
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-v67-tab') === view;
        t.classList.toggle('v67-tab-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
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

    /* --- 1. identity header --- */
    hero.classList.add('v67-hero');
    var avatarWrap = hero.querySelector('.member-avatar-wrap');
    var nameBlock = null;
    Array.prototype.forEach.call(hero.children, function (ch) {
      if (ch.querySelector && ch.querySelector('.member-name-line')) nameBlock = ch;
    });
    var actionGrid = hero.querySelector('.profile-action-grid');
    var buildStamp = hero.querySelector('[data-build-version]');
    if (buildStamp) {
      var stampDiv = buildStamp.closest('div');
      if (stampDiv && stampDiv.parentNode === hero) stampDiv.classList.add('v67-build-stamp');
    }

    var idZone = el('div', 'v67-hero-id');
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
    }

    var rolesZone = el('div', 'v67-hero-roles');
    rolesZone.appendChild(el('div', 'v67-hero-zone-title', 'My Roles'));
    els.roleChips = el('div', 'v67-role-chips');
    rolesZone.appendChild(els.roleChips);

    var toolsZone = el('div', 'v67-hero-tools');
    toolsZone.appendChild(el('div', 'v67-hero-zone-title', 'Account Tools'));
    var settingsBtn = el('button', 'v67-tool-btn', '⚙ Account Settings');
    settingsBtn.type = 'button';
    settingsBtn.addEventListener('click', function () { setView('about'); openCard(els.settings); });
    toolsZone.appendChild(settingsBtn);
    if (actionGrid) toolsZone.appendChild(actionGrid);

    hero.appendChild(idZone);
    hero.appendChild(rolesZone);
    hero.appendChild(toolsZone);

    /* --- 2. tab bar --- */
    var tabs = el('nav', 'v67-tabs');
    tabs.setAttribute('aria-label', 'Profile sections');
    [['overview', '▦ Overview'], ['about', 'ⓘ About Me'], ['karaoke', '♫ My Karaoke'], ['kj', '🎧 KJ / Host'], ['venue', '🏛 Venue Staff']].forEach(function (pair) {
      var b = el('button', 'v67-tab', pair[1]);
      b.type = 'button';
      b.setAttribute('data-v67-tab', pair[0]);
      b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { setView(pair[0]); });
      tabs.appendChild(b);
    });
    profile.insertBefore(tabs, hero);

    /* --- 3a. Profile Information card (left column) --- */
    var info = el('section', 'profile-nav-card v67-card v67-info-card');
    var infoHead = el('div', 'v67-card-head');
    infoHead.appendChild(el('h3', 'v67-card-title', '▦ Profile Information'));
    info.appendChild(infoHead);
    var rows = el('div', 'v67-info-rows');
    function infoRow(label) {
      var r = el('div', 'v67-info-row');
      r.appendChild(el('span', 'v67-info-label', label));
      var v = el('strong', 'v67-info-value', '—');
      r.appendChild(v);
      rows.appendChild(r);
      return v;
    }
    els.infoName = infoRow('Display Name:');
    els.infoInterests = infoRow('Karaoke Interests:');
    info.appendChild(rows);
    els.infoCard = info;

    /* --- 3b. My Activity card (right column) --- */
    var activity = el('section', 'profile-nav-card v67-card v67-activity-card');
    var actHead = el('div', 'v67-card-head');
    actHead.appendChild(el('h3', 'v67-card-title', '▤ My Activity'));
    activity.appendChild(actHead);
    els.activityTiles = el('div', 'v67-stats');
    activity.appendChild(els.activityTiles);
    els.activityCard = activity;

    /* --- 3c. Profile Setup & Preferences card (right column) --- */
    var setup = el('section', 'profile-nav-card v67-card v67-setup-card');
    var setupHead = el('div', 'v67-card-head');
    setupHead.appendChild(el('h3', 'v67-card-title', '⚙ Profile Setup & Preferences'));
    setupHead.appendChild(el('p', 'v67-card-sub', 'Personalize your karaoke experience, roles, and account preferences.'));
    setup.appendChild(setupHead);
    var list = el('div', 'v67-setup-list');
    function setupRow(icon, title, desc, pill, fn) {
      var b = el('button', 'v67-setup-row');
      b.type = 'button';
      var ic = el('span', 'v67-setup-icon', icon);
      var tx = el('span', 'v67-setup-text');
      tx.appendChild(el('strong', 'v67-setup-name', title));
      tx.appendChild(el('small', 'v67-setup-desc', desc));
      var pl = el('span', 'v67-setup-pill', pill);
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

    /* --- tab groups on every card --- */
    function tag(card, groups) {
      if (!card) return;
      groups.forEach(function (g) { card.classList.add('v67-g-' + g); });
    }
    tag(els.infoCard, ['about']);
    tag(els.activityCard, []);
    tag(els.setupCard, ['kj', 'venue']);
    tag(els.about, ['about']);
    tag(els.awards, ['about']);
    tag(els.settings, ['about']);
    tag(els.songs, ['karaoke']);
    tag(els.favorites, ['karaoke']);
    tag(els.kj, ['kj']);
    tag(els.owner, ['venue']);
    tag(els.reviews, []);
    tag(els.account, []);

    /* --- order + columns --- */
    ORDER = [els.infoCard, els.activityCard, els.about, els.setupCard, els.songs, els.awards, els.kj, els.favorites, els.owner, els.reviews, els.settings, els.account];
    LEFT = [els.infoCard, els.about, els.songs, els.favorites, els.settings];
    RIGHT = [els.activityCard, els.setupCard, els.awards, els.kj, els.owner, els.reviews, els.account];
    // New cards enter the profile as direct children (the desktop grid
    // module then adopts them like any other profile card).
    profile.appendChild(els.infoCard);
    profile.appendChild(els.activityCard);
    profile.appendChild(els.setupCard);
    placeCards();
    setView('overview');
    built = true;

    /* --- live sync: mirrors, roles, stats --- */
    syncRolesAndInfo();
    syncStats();
    var mo = new MutationObserver(function () {
      if (!allPlaced()) { placeCards(); return; }
      syncRolesAndInfo();
      syncStats();
    });
    mo.observe(profile, { childList: true, subtree: true, characterData: true });
    var mq = window.matchMedia('(min-width: 1024px)');
    var onMq = function () { window.requestAnimationFrame(placeCards); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }

  function start() {
    try { build(); } catch (e) { /* fail-safe: leave the V66 profile untouched */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
