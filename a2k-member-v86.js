/* Addicted to Karaoke — member layer V86: profile-editing dedup cleanup.
   Builds on V85. Implements Steven's Nov 24, 2026 decisions from
   A2K_Edit_Duplication_Map.md (all 7 decided; experience level PARKED).
   READ the map before changing this file. Summary of what this layer does:

   1. ONE NAME EDITOR (decision 1): "Display Name" wins everywhere. The
      My Profile card's pencil is removed (it opened the same dialog as
      the Profile Information pencil — one shared memberEdit() dialog);
      the Profile Information pencil now calls memberEdit() directly;
      "Stage Name" is relabelled "Display Name" in the My Profile row
      and in the dialog itself.
   2. LOCATION EDIT (map #4): the Edit My Profile dialog gains a
      Location field writing member_setup_details.location_text (the
      same column the V85 wizard bridge writes). The V85 own-profile
      Location row is updated in place after a save.
   3. ACCOUNT SETTINGS PAGE (map §3): Privacy & Visibility (+ V85 Show
      My Badges switch), the live per-field public toggles, Contact
      Visibility, Notifications, the Account card and Account & Data
      move from the About tab's Settings card to a new #account-settings
      page. Setup & Preferences is NOT moved — it is removed (it
      duplicates the Overview's Profile Setup & Preferences card). The
      old Settings <details> card stays in the DOM (V71's placer keeps
      re-asserting it) but is hidden once this layer has built the page.
      The Account card gets the same treatment — V71 owns its placement
      too, so it stays hidden in place while the page mirrors its live
      values (email, provider, Sign Out). Hero "Account Settings" opens
      the page; the Privacy wizard row retargets to it. Contact save
      writes BOTH stores (see the edited a2k-profile-settings.js — this
      layer only triggers its load).
   4. WIZARD ROWS (map §4): Singer Preferences / KJ / Host Setup /
      Venue Staff Setup renamed (their jumps are untouched); General
      Setup's pill becomes "Review setup" once onboarding is complete.
   5. KJ CARD HOMES (map #16-17): KJ business name/contact gets an
      editor on the KJ Profile card; the Hosting Team card's Manage
      button opens a real team editor (co-host names, same string
      format the wizard bridge writes). This also fixes the V77 team
      display, which only rendered object-shaped hosts while the
      wizard stores plain strings.
   6. AVATAR (map #3): NO code — the hero camera control already
      offers the wizard's presets (Microphone / Male figure / Female
      figure) plus upload and reset-to-default via a2k-avatar-choices.js.
   7. SONGS GATE / DEAD TOGGLES / CAPS / VENUE STEP (decisions 2,3,5,6):
      NOT in this layer — they are edits to the live files staged
      alongside it (desktop-members.js, a2k-member-setup-live.js,
      member-setup-preview.html). The Experience step is untouched.

   Conventions: fail-soft everywhere (a failed sub-feature never breaks
   the profile); moves, never clones (handlers travel with their nodes);
   no new Supabase tables, no new columns, no schema changes. */
(function () {
  'use strict';
  if (window.__a2kMemberV86) return;
  window.__a2kMemberV86 = true;
  window.__a2kMemberV86Version = 86;

  var initialHash = '';
  try { initialHash = (location.hash || '').slice(1); } catch (e) {}

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt !== undefined && txt !== null) n.textContent = txt;
    return n;
  }
  function txt(node) { return node ? (node.textContent || '').trim() : ''; }
  function client() { return (typeof authClient !== 'undefined' && authClient) ? authClient : null; }
  function signedIn() {
    try {
      return !!(typeof authUser !== 'undefined' && authUser && authUser.id &&
        typeof memberProfile !== 'undefined' && memberProfile &&
        memberProfile.user_id === authUser.id);
    } catch (e) { return false; }
  }
  function uid() { try { return String(authUser.id); } catch (e) { return ''; } }
  function nowIso() { try { return new Date().toISOString(); } catch (e) { return ''; } }
  function fail(res) { if (res && res.error) throw res.error; return res && res.data; }

  /* ================= shared cached reads ================= */
  var detailsPromise = null, detailsData = null;
  function getSetupDetails() {
    if (detailsData) return Promise.resolve(detailsData);
    if (detailsPromise) return detailsPromise;
    if (!client() || !signedIn()) return Promise.resolve(null);
    detailsPromise = client().from('member_setup_details').select('*').eq('user_id', uid()).maybeSingle()
      .then(function (res) {
        detailsData = (res && res.data) || {};
        return detailsData;
      })
      .catch(function () { detailsPromise = null; return null; });
    return detailsPromise;
  }
  var prefsPromise = null, prefsData = null;
  function getPublicPrefs() {
    if (prefsData) return Promise.resolve(prefsData);
    if (prefsPromise) return prefsPromise;
    if (!client() || !signedIn()) return Promise.resolve(null);
    prefsPromise = client().from('member_public_preferences').select('*').eq('user_id', uid()).maybeSingle()
      .then(function (res) {
        prefsData = (res && res.data) || {};
        return prefsData;
      })
      .catch(function () { prefsPromise = null; return null; });
    return prefsPromise;
  }
  function invalidateCaches() { detailsPromise = null; detailsData = null; prefsPromise = null; prefsData = null; }

  /* ================= 1. ONE NAME EDITOR + 2. LOCATION FIELD ================= */

  var cachedLocation = null, cachedLocationLoaded = false;
  function loadCachedLocation() {
    if (cachedLocationLoaded) return Promise.resolve(cachedLocation);
    return getSetupDetails().then(function (d) {
      cachedLocation = (d && typeof d.location_text === 'string') ? d.location_text.trim() : '';
      cachedLocationLoaded = true;
      return cachedLocation;
    });
  }

  function syncName() {
    try {
      /* Rewire the Profile Information pencil FIRST (it forwards to the
         My Profile pencil, which we are about to remove). */
      var infoEdit = document.querySelector('.v71-info-card .v71-card-edit');
      if (infoEdit && !infoEdit.dataset.v86Wired) {
        var repl = infoEdit.cloneNode(true);
        repl.dataset.v86Wired = '1';
        repl.setAttribute('aria-label', 'Edit display name');
        infoEdit.parentNode.replaceChild(repl, infoEdit);
        repl.addEventListener('click', function () {
          try {
            if (typeof window.memberEdit === 'function') { window.memberEdit(); return; }
          } catch (e) {}
          try { if (typeof window.atkWelcomeStart === 'function') window.atkWelcomeStart(true); } catch (e) {}
        });
      }
      /* Remove the My Profile card's pencil: same dialog, second button. */
      var myProfileEdit = document.querySelector('.profile-identity .profile-section-edit');
      if (myProfileEdit) myProfileEdit.remove();
      /* "Stage Name" -> "Display Name" in the My Profile summary row. */
      var label = document.querySelector('.profile-identity-summary span');
      if (label && txt(label) === 'Stage Name') label.textContent = 'Display Name';
    } catch (e) {}
  }

  function afterEditDialogOpen() {
    try {
      var fields = $('member-dialog-fields');
      if (!fields) return;
      /* Relabel the dialog's Stage Name field (the dialog is rebuilt by
         memberDialog() on every open, so this runs on every open). */
      Array.prototype.forEach.call(fields.querySelectorAll('label'), function (lab) {
        if (lab.firstChild && lab.firstChild.nodeType === 3 &&
            lab.firstChild.textContent.trim() === 'Stage Name') {
          lab.firstChild.textContent = 'Display Name';
        }
      });
      if (fields.querySelector('[name="location_text"]')) return;
      var locLabel = document.createElement('label');
      locLabel.textContent = 'Location';
      var input = document.createElement('input');
      input.name = 'location_text';
      input.maxLength = 120;
      input.placeholder = 'City, state or ZIP';
      input.autocomplete = 'off';
      input.value = cachedLocation || '';
      locLabel.appendChild(input);
      fields.appendChild(locLabel);
      /* Prefill from the member's own setup-details row (async; the
         V85 own-profile row is a synchronous seed when present). */
      var v85row = document.querySelector('.v85-own-location-row .v71-info-value');
      if (v85row && !input.value) {
        input.value = txt(v85row).replace(/\s*\(private\)\s*$/, '');
      }
      loadCachedLocation().then(function (loc) {
        if (loc && fields.isConnected && input.isConnected && !input.value) input.value = loc;
        else if (cachedLocationLoaded && input.isConnected && document.activeElement !== input) {
          /* Keep the field honest if the member cleared it elsewhere. */
          if (!input.value && loc) input.value = loc;
        }
      }).catch(function () {});
      /* The show_location flag decides the "(private)" suffix on the
         own-profile row after a save; warm the prefs cache now. */
      getPublicPrefs().catch(function () {});
    } catch (e) {}
  }

  function updateOwnLocationRow(loc) {
    try {
      var rows = document.querySelector('.v71-info-rows');
      if (!rows) return;
      var row = rows.querySelector('.v85-own-location-row');
      var isPrivate = !(prefsData && prefsData.show_location !== false);
      if (!loc) { if (row) row.remove(); return; }
      var val = loc + (isPrivate ? ' (private)' : '');
      if (row) {
        var v = row.querySelector('.v71-info-value');
        if (v) v.textContent = val;
        return;
      }
      var r = el('div', 'v71-info-row v85-own-location-row');
      r.appendChild(el('span', 'v71-info-label', 'Location:'));
      r.appendChild(el('strong', 'v71-info-value', val));
      var interests = rows.querySelector('.v71-info-interests-row');
      if (interests && interests.nextSibling) rows.insertBefore(r, interests.nextSibling);
      else rows.appendChild(r);
    } catch (e) {}
  }

  function wrapMemberEdit() {
    if (window.__v86MemberEditWrapped || typeof window.memberEdit !== 'function') return;
    window.__v86MemberEditWrapped = true;
    var orig = window.memberEdit;
    window.memberEdit = function () {
      var out = orig.apply(this, arguments);
      try { afterEditDialogOpen(); } catch (e) {}
      return out;
    };
  }

  function wrapMemberSubmit() {
    if (window.__v86MemberSubmitWrapped || typeof window.memberSubmit !== 'function') return;
    window.__v86MemberSubmitWrapped = true;
    var orig = window.memberSubmit;
    window.memberSubmit = async function (e) {
      var isProfile = false, loc = null;
      try {
        var editing = (typeof memberEditing !== 'undefined') ? memberEditing : null;
        if (editing && editing.type === 'profile' && e && e.target && typeof FormData !== 'undefined') {
          isProfile = true;
          var fd = new FormData(e.target);
          loc = String(fd.get('location_text') || '').trim().slice(0, 120);
        }
      } catch (err) { isProfile = false; }
      var dlg = $('member-dialog');
      await orig.apply(this, arguments);
      /* memberSubmit swallows its own errors and leaves the dialog open
         on failure; only save location when the name save closed it. */
      if (!isProfile || (dlg && dlg.open)) return;
      try {
        if (loc === cachedLocation) { updateOwnLocationRow(loc); return; }
        if (!client() || !signedIn()) return;
        fail(await client().from('member_setup_details').upsert(
          { user_id: uid(), location_text: loc || null, updated_at: nowIso() },
          { onConflict: 'user_id' }));
        cachedLocation = loc;
        detailsData = Object.assign({}, detailsData || {}, { location_text: loc || null });
        updateOwnLocationRow(loc);
      } catch (err) {
        try { if (typeof authStatus === 'function') authStatus('Display name saved, but location could not be saved: ' + (err.message || 'Please try again.')); } catch (e2) {}
      }
    };
  }

  /* ================= 3. ACCOUNT SETTINGS PAGE ================= */

  var FIELD_TOGGLES = [
    ['show_display_name', 'Display Name', 'Show your display name on your public profile.'],
    ['show_photo', 'Profile Photo', 'Show your profile photo on your public profile.'],
    ['show_location', 'City / Area', 'Show your city or area on your public profile.'],
    ['show_member_since', 'Member Since', 'Show when you joined on your public profile.'],
    ['show_genres', 'Favorite Genres', 'Show your favorite music and eras on your public profile.'],
    ['show_kj_schedule', 'KJ Schedule', 'Show your KJ hosting schedule on your public profile.']
  ];
  var returnView = 'overview';
  var prefsLoadedOnce = false;

  function accountPage() { return $('v86-account-page'); }

  function buildTogglesSection() {
    var sec = el('section', 'member-panel member-about v86-acct-section v86-toggles-section');
    sec.appendChild(el('h3', 'v86-acct-title', 'Public Details'));
    sec.appendChild(el('p', 'v86-acct-note',
      'Choose which details appear on your public profile. These are the same choices the setup wizard asks for — now changeable any time.'));
    var list = el('div', 'v86-toggle-list');
    FIELD_TOGGLES.forEach(function (def) {
      var key = def[0], label = def[1], note = def[2];
      var row = el('div', 'v86-toggle-row');
      row.dataset.toggleKey = key;
      var tx = el('div', 'v86-toggle-text');
      tx.appendChild(el('strong', '', label));
      tx.appendChild(el('small', '', note));
      row.appendChild(tx);
      var grid = el('div', 'a2k-privacy-tile-grid v86-toggle-grid');
      [['shown', 'Shown', true], ['hidden', 'Hidden', false]].forEach(function (opt) {
        var b = el('button', 'a2k-privacy-tile', null);
        b.type = 'button';
        b.dataset.toggleValue = opt[0];
        b.setAttribute('aria-pressed', 'false');
        b.appendChild(el('strong', '', opt[1]));
        b.addEventListener('click', function () { saveFieldToggle(key, opt[2], row); });
        grid.appendChild(b);
      });
      row.appendChild(grid);
      list.appendChild(row);
    });
    sec.appendChild(list);
    var fb = el('p', 'v86-toggle-feedback');
    fb.id = 'v86-toggle-feedback';
    fb.setAttribute('role', 'status');
    sec.appendChild(fb);
    return sec;
  }

  function renderFieldToggles() {
    var page = accountPage();
    if (!page) return;
    FIELD_TOGGLES.forEach(function (def) {
      var key = def[0];
      var row = page.querySelector('[data-toggle-key="' + key + '"]');
      if (!row) return;
      var on = !prefsData || prefsData[key] !== false; /* wizard/bridge default: shown */
      row.querySelectorAll('[data-toggle-value]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(
          (b.dataset.toggleValue === 'shown' && on) ||
          (b.dataset.toggleValue === 'hidden' && !on)));
      });
    });
  }

  function saveFieldToggle(key, value, row) {
    if (!client() || !signedIn()) return;
    var fb = $('v86-toggle-feedback');
    var tiles = row ? row.querySelectorAll('[data-toggle-value]') : [];
    tiles.forEach(function (t) { t.disabled = true; });
    if (fb) fb.textContent = 'Saving…';
    var payload = { user_id: uid(), updated_at: nowIso() };
    payload[key] = value;
    client().from('member_public_preferences').upsert(payload, { onConflict: 'user_id' })
      .select(key).single()
      .then(function (res) {
        tiles.forEach(function (t) { t.disabled = false; });
        if (!res || res.error || !res.data || res.data[key] !== value) throw new Error('The saved setting could not be verified.');
        prefsData = Object.assign({}, prefsData || {}, res.data);
        renderFieldToggles();
        if (fb) fb.textContent = 'Saved.';
      })
      .catch(function (err) {
        tiles.forEach(function (t) { t.disabled = false; });
        renderFieldToggles();
        if (fb) fb.textContent = 'Could not save this setting: ' + (err && err.message ? err.message : 'Please try again.');
      });
  }

  function buildSetupEntry() {
    var sec = el('section', 'a2k-setup-settings-entry');
    sec.id = 'v86-setup-entry';
    var top = el('div', 'profile-section-top');
    top.appendChild(el('strong', '', 'Setup & Preferences'));
    sec.appendChild(top);
    sec.appendChild(el('p', 'a2k-setup-settings-description', 'Review your karaoke interests and profile setup.'));
    var b = el('button', 'a2k-setup-reopen', 'Run Setup Wizard');
    b.type = 'button';
    b.id = 'v86-setup-reopen';
    b.addEventListener('click', function () {
      try {
        var dlg = document.getElementById('profile-section-dialog');
        if (dlg && dlg.open && typeof profileCloseSection === 'function') profileCloseSection();
      } catch (e) {}
      try {
        if (typeof window.atkWelcomeStart === 'function') { window.atkWelcomeStart(true); return; }
      } catch (e) {}
      try {
        var old = document.getElementById('a2k-setup-reopen');
        if (old) old.click();
      } catch (e) {}
    });
    sec.appendChild(b);
    return sec;
  }

  function buildAccountMirror() {
    var sec = el('section', 'member-panel member-about v86-acct-section v86-account-mirror');
    sec.appendChild(el('h3', 'v86-acct-title', 'Account'));
    var email = el('p', 'member-muted v86-account-email');
    email.id = 'v86-account-email';
    sec.appendChild(email);
    var provider = el('p', 'member-muted v86-account-provider');
    provider.id = 'v86-account-provider';
    sec.appendChild(provider);
    var wrap = el('div', 'v86-account-signout');
    var out = el('button', 'member-button', 'Sign Out');
    out.type = 'button';
    out.addEventListener('click', function () {
      try { if (typeof authLogout === 'function') authLogout(); } catch (e) {}
    });
    wrap.appendChild(out);
    sec.appendChild(wrap);
    return sec;
  }

  function refreshAccountMirror() {
    try {
      var email = $('v86-account-email');
      var provider = $('v86-account-provider');
      if (email) {
        var src = $('auth-display-email');
        email.textContent = (src && txt(src)) || (typeof authUser !== 'undefined' && authUser && authUser.email) || '';
      }
      if (provider) {
        var psrc = $('auth-display-provider');
        provider.textContent = (psrc && txt(psrc)) || '';
      }
    } catch (e) {}
  }

  function buildAccountPage() {
    if (accountPage()) return true;
    var wrap = document.querySelector('#signin-screen .auth-wrap');
    var profile = $('auth-profile');
    if (!wrap || !profile) return false;
    var privacy = profile.querySelector('.profile-about-privacy');
    var contact = $('a2k-contact-settings');
    var notices = profile.querySelector('.a2k-notification-settings');
    var del = $('a2k-self-delete-entry');
    var accountCard = null;
    var emailLine = $('auth-display-email');
    if (emailLine && emailLine.closest) accountCard = emailLine.closest('details.profile-nav-card');
    if (!privacy || !contact || !notices) return false; /* not built yet; retried by observer */

    var page = el('section', '');
    page.id = 'v86-account-page';
    page.setAttribute('aria-label', 'Account Settings');
    var head = el('div', 'v86-acct-head');
    var back = el('button', 'v86-acct-back', '← Back to My Profile');
    back.type = 'button';
    back.addEventListener('click', function () { closeAccount(); });
    head.appendChild(back);
    head.appendChild(el('h2', 'v86-acct-heading', 'Account Settings'));
    head.appendChild(el('p', 'v86-acct-sub', 'Privacy, contact details, notifications and your account.'));
    page.appendChild(head);

    /* 0. Setup & Preferences (Run Setup Wizard). push110 (Steven Nov 24,
       2026): the Settings and Account sections belong in settings, not
       on About Me — and the wizard button was the one control with no
       home here (V86 removed it from the About card as duplicating the
       Overview's Profile Setup & Preferences card; the wizard layer no
       longer creates it in the About panel). This is now its home on
       the settings page. The button opens the same wizard the old
       entry opened (setup-live's atkWelcomeStart, resolved at click
       time, with the same dialog-close preamble). */
    page.appendChild(buildSetupEntry());
    /* 1. Privacy & Visibility (tiles + V85 Show My Badges switch travel
       inside #member-privacy-summary). */
    privacy.classList.add('v86-acct-section');
    page.appendChild(privacy);
    /* 2. Public Details — the live per-field toggles (new home). */
    page.appendChild(buildTogglesSection());
    /* 3. Contact Visibility (its own save writes both stores). */
    contact.classList.add('v86-acct-section');
    page.appendChild(contact);
    /* 4. Notifications (placeholder text moves as-is). */
    notices.classList.add('v86-acct-section');
    page.appendChild(notices);
    /* 5. Account card (email display, Connected via Google, Sign Out).
       The card itself is NOT moved: V71 owns its placement (it is in
       the About view's card list and its placer re-asserts it on every
       tab switch — moving it would ping-pong). It stays in the DOM,
       hidden (see .v86-account-card-hidden), and this page mirrors its
       live values, refreshed on every open. */
    if (accountCard) accountCard.classList.add('v86-account-card-hidden');
    page.appendChild(buildAccountMirror());
    /* 6. Account & Data (Delete My Account + Founder protection note). */
    if (del) { del.classList.add('v86-acct-section'); page.appendChild(del); }

    wrap.appendChild(page);
    /* Setup & Preferences is NOT moved: it duplicates the Overview's
       Profile Setup & Preferences card. Remove it from the Settings
       block entirely (the legacy file that renders it is untouched;
       only its rendered output is removed). */
    removeSetupPrefsSection();
    document.documentElement.classList.add('v86-account-ready');
    return true;
  }

  function removeSetupPrefsSection() {
    try {
      var s = $('a2k-setup-settings-entry');
      /* Only the stale entry inside the About tab's Settings card — the
         Account page's own entry (v86-setup-entry) must never be removed. */
      if (s && s.closest && s.closest('#a2k-profile-settings')) s.remove();
    } catch (e) {}
  }

  function showAccountPage() {
    var page = accountPage();
    if (!page) return false;
    try {
      var prof = $('auth-profile');
      returnView = (prof && prof.getAttribute('data-v71-view')) || 'overview';
    } catch (e) { returnView = 'overview'; }
    document.documentElement.classList.add('v86-account-open');
    /* Safety net: V71's mobile section flow opens #profile-section-dialog
       modally (profileSectionTap). If it is open when the Account page
       opens, the page is visible but inert behind it — on mobile the
       dialog covers the whole viewport. Close it (profileCloseSection
       restores the moved content to its card). */
    try {
      var secDlg = document.getElementById('profile-section-dialog');
      if (secDlg && secDlg.open) {
        if (typeof window.profileCloseSection === 'function') window.profileCloseSection();
        else secDlg.close();
      }
    } catch (e) {}
    try {
      var sc = $('signin-screen');
      if (sc) sc.scrollTop = 0;
      window.scrollTo(0, 0);
    } catch (e) {}
    refreshAccountMirror();
    /* Fresh values every time the page opens. */
    getPublicPrefs().then(function () { renderFieldToggles(); }).catch(function () {});
    try { if (typeof window.a2kContactSettingsLoad === 'function') window.a2kContactSettingsLoad(); } catch (e) {}
    return true;
  }

  function hideAccountPage() {
    document.documentElement.classList.remove('v86-account-open');
    /* Return to the tab the member was on (the hero/privacy handlers
       switch the hidden profile to About first — restore the view). */
    try {
      var tab = document.querySelector('.v71-tab[data-v71-tab="' + returnView + '"]');
      if (tab) tab.click();
    } catch (e) {}
  }

  function openAccount() {
    if (!signedIn()) {
      try { if (typeof navigate === 'function') navigate('signin'); } catch (e) {}
      return;
    }
    if (!accountPage() && !buildAccountPage()) return;
    try { if (typeof navigate === 'function') navigate('signin'); } catch (e) {}
    try { history.replaceState(null, '', '#account-settings'); }
    catch (e) { try { location.hash = 'account-settings'; } catch (e2) {} }
    showAccountPage();
  }

  function closeAccount() {
    try { history.replaceState(null, '', '#signin'); }
    catch (e) { try { location.hash = 'signin'; } catch (e2) {} }
    hideAccountPage();
  }

  function syncRoute() {
    var hash = '';
    try { hash = (location.hash || '').slice(1); } catch (e) {}
    if (hash === 'account-settings') {
      if (!signedIn()) return;
      if (!accountPage()) { if (!buildAccountPage()) return; }
      var screen = $('signin-screen');
      if (screen && screen.hidden) {
        try { if (typeof navigate === 'function') navigate('signin'); } catch (e) {}
        try { history.replaceState(null, '', '#account-settings'); } catch (e) {}
      }
      showAccountPage();
    } else if (document.documentElement.classList.contains('v86-account-open')) {
      hideAccountPage();
    }
  }

  function wrapNavigate() {
    if (window.__v86NavigateWrapped || typeof window.navigate !== 'function') return;
    window.__v86NavigateWrapped = true;
    var orig = window.navigate;
    window.navigate = function () {
      var out = orig.apply(this, arguments);
      try {
        var hash = (location.hash || '').slice(1);
        if (hash !== 'account-settings' && document.documentElement.classList.contains('v86-account-open')) {
          hideAccountPage();
        }
      } catch (e) {}
      return out;
    };
  }

  /* Capture-phase interception for the two Account entry points (hero
     "Account Settings" button + "Privacy & Visibility" setup row).
     V71's own handlers are registered on those same elements and run
     first in the bubble phase: on mobile they call openCard(settings),
     which taps the settings summary and opens #profile-section-dialog
     modally (profileSectionTap) — a full-viewport modal that leaves the
     Account page visible but entirely unclickable. A bubble listener
     added later cannot preempt them; a document-level capture listener
     runs before any target listener, so stop the event here and open
     the page instead. The bubble listeners below stay as fallback for
     any click that somehow bypasses capture. */
  function interceptAccountEntry() {
    if (interceptAccountEntry.done) return;
    interceptAccountEntry.done = true;
    document.addEventListener('click', function (ev) {
      try {
        var t = ev.target && ev.target.closest
          ? ev.target.closest('.v71-hero-tools .v71-tool-btn, .v71-setup-row') : null;
        if (!t) return;
        var isHero = t.classList.contains('v71-tool-btn')
          && txt(t).indexOf('Account Settings') !== -1;
        var nm = t.classList.contains('v71-setup-row') ? txt(t.querySelector('.v71-setup-name')) : '';
        var isPrivacyRow = nm === 'Privacy & Visibility' || nm === 'Privacy Wizard';
        if (!isHero && !isPrivacyRow) return;
        ev.stopPropagation();
        ev.preventDefault();
        openAccount();
      } catch (e) {}
    }, true);
  }

  function rewireHeroButton() {
    try {
      var btns = document.querySelectorAll('.v71-hero-tools .v71-tool-btn');
      btns.forEach(function (b) {
        if (txt(b).indexOf('Account Settings') !== -1 && !b.dataset.v86Wired) {
          b.dataset.v86Wired = '1';
          /* Fallback only: interceptAccountEntry (capture) normally
             preempts V71's handler and opens the page. */
          b.addEventListener('click', function () { openAccount(); });
        }
      });
    } catch (e) {}
  }

  /* ================= 4. WIZARD ROWS ================= */

  function syncSetupRows() {
    try {
      var rows = document.querySelectorAll('.v71-setup-row');
      if (!rows.length) return;
      var onboarded = false;
      try { onboarded = !!(typeof memberProfile !== 'undefined' && memberProfile && memberProfile.onboarding_completed_at); } catch (e) {}
      rows.forEach(function (row) {
        var nameEl = row.querySelector('.v71-setup-name');
        var pillEl = row.querySelector('.v71-setup-pill');
        if (!nameEl) return;
        var name = txt(nameEl);
        if (name === 'Singer Preferences Wizard') nameEl.textContent = 'Singer Preferences';
        else if (name === 'KJ / Host Wizard') nameEl.textContent = 'KJ / Host Setup';
        else if (name === 'Venue Staff Wizard') nameEl.textContent = 'Venue Staff Setup';
        else if (name === 'Privacy Wizard') {
          nameEl.textContent = 'Privacy & Visibility';
          if (!row.dataset.v86Privacy) {
            row.dataset.v86Privacy = '1';
            /* Fallback only: interceptAccountEntry (capture) normally
               preempts V71's handler and opens the Account page. */
            row.addEventListener('click', function () { openAccount(); });
          }
        } else if (name === 'General Setup Wizard') {
          if (onboarded && pillEl && txt(pillEl).indexOf('Run Wizard') === 0) {
            pillEl.textContent = 'Review setup ›';
          }
        }
      });
    } catch (e) {}
  }

  /* ================= 5. KJ CARD HOMES: business + hosting team ================= */

  function cardByHeading(text) {
    var profile = $('auth-profile');
    if (!profile) return null;
    var heads = profile.querySelectorAll('.v71-card-title');
    for (var i = 0; i < heads.length; i++) {
      if (txt(heads[i]).indexOf(text) !== -1) {
        var card = heads[i].closest('section');
        if (card) return card;
      }
    }
    return null;
  }
  function cardBody(card) { return card ? card.querySelector('.v75-card-body') : null; }

  function v75Row(label, value) {
    var r = el('div', 'v75-row');
    r.appendChild(el('span', 'v75-row-label', label));
    var v = el('span', 'v75-row-value', value);
    r.appendChild(v);
    return { row: r, value: v };
  }

  function openV86Dialog(title) {
    var dlg = document.createElement('dialog');
    dlg.className = 'member-dialog v86-dialog';
    dlg.setAttribute('aria-label', title);
    var h = el('h3', '', title);
    dlg.appendChild(h);
    var body = el('div', 'v86-dialog-body');
    dlg.appendChild(body);
    var err = el('p', 'v86-dialog-error');
    err.id = 'v86-dialog-error-' + Math.floor(Math.random() * 1e9);
    err.setAttribute('role', 'alert');
    dlg.appendChild(err);
    var actions = el('div', 'member-dialog-actions');
    var cancel = el('button', '', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', function () { dlg.close(); });
    var save = el('button', 'member-button', 'Save');
    save.type = 'button';
    actions.appendChild(cancel);
    actions.appendChild(save);
    dlg.appendChild(actions);
    dlg.addEventListener('close', function () { dlg.remove(); });
    document.body.appendChild(dlg);
    return { dlg: dlg, body: body, err: err, save: save };
  }

  function dialogField(label, name, value, opts) {
    opts = opts || {};
    var lab = document.createElement('label');
    lab.textContent = label;
    var input = document.createElement('input');
    input.name = name;
    input.type = opts.type || 'text';
    if (opts.maxLength) input.maxLength = opts.maxLength;
    if (opts.placeholder) input.placeholder = opts.placeholder;
    if (opts.inputMode) input.inputMode = opts.inputMode;
    input.autocomplete = 'off';
    input.value = value || '';
    lab.appendChild(input);
    return { label: lab, input: input };
  }

  function ensureKjContactRows(details) {
    try {
      var card = cardByHeading('KJ / Host Profile');
      var body = cardBody(card);
      if (!body || !details) return;
      [['KJ Email', 'kj_email', 'v86-kj-email-row'], ['KJ Phone', 'kj_phone', 'v86-kj-phone-row']].forEach(function (def) {
        var value = (details[def[1]] || '').trim ? String(details[def[1]] || '').trim() : '';
        var existing = body.querySelector('.' + def[2]);
        if (!value) { if (existing) existing.remove(); return; }
        if (existing) {
          var v = existing.querySelector('.v75-row-value');
          if (v) v.textContent = value;
          return;
        }
        var made = v75Row(def[0], value);
        made.row.classList.add(def[2]);
        body.appendChild(made.row);
      });
    } catch (e) {}
  }

  function openKjBizDialog() {
    if (!signedIn()) return;
    getSetupDetails().then(function (details) {
      details = details || {};
      var d = openV86Dialog('Edit KJ Business');
      var biz = dialogField('KJ / Business Name', 'kj_business_name', details.kj_business_name || '', { maxLength: 120, placeholder: 'Enter KJ name or business name' });
      var em = dialogField('Email Address', 'kj_email', details.kj_email || '', { type: 'email', maxLength: 254, placeholder: 'Contact email' });
      var ph = dialogField('Phone Number', 'kj_phone', details.kj_phone || '', { type: 'tel', maxLength: 40, placeholder: '(555) 555-0123', inputMode: 'tel' });
      d.body.appendChild(biz.label);
      d.body.appendChild(em.label);
      d.body.appendChild(ph.label);
      d.body.appendChild(el('p', 'v86-dialog-note', 'Your business name appears on your KJ / Host profile. Contact details stay private unless you choose to show them in Account Settings.'));
      d.save.addEventListener('click', function () {
        var business = biz.input.value.trim().slice(0, 120);
        var email = em.input.value.trim().slice(0, 254);
        var phone = ph.input.value.trim().slice(0, 40);
        if (business && !email && !phone) { d.err.textContent = 'KJ business requires an email or phone number.'; return; }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { d.err.textContent = 'Please enter a valid contact email.'; return; }
        d.save.disabled = true;
        d.err.textContent = 'Saving…';
        client().from('member_setup_details').upsert(
          { user_id: uid(), kj_business_name: business, kj_email: email, kj_phone: phone, updated_at: nowIso() },
          { onConflict: 'user_id' })
          .then(function (res) {
            if (res && res.error) throw res.error;
            detailsData = Object.assign({}, detailsData || {}, { kj_business_name: business, kj_email: email, kj_phone: phone });
            var card = cardByHeading('KJ / Host Profile');
            var body = cardBody(card);
            if (body) {
              var bizValue = body.querySelector('.v75-row-value');
              /* First value row on the card is the business name. */
              if (bizValue) bizValue.textContent = business || 'Not yet provided';
            }
            ensureKjContactRows(detailsData);
            d.dlg.close();
            try { if (typeof authStatus === 'function') authStatus('KJ business details saved.'); } catch (e) {}
          })
          .catch(function (err) {
            d.save.disabled = false;
            d.err.textContent = 'Could not save: ' + (err && err.message ? err.message : 'Please try again.');
          });
      });
      d.dlg.showModal();
    }).catch(function () {});
  }

  function teamListFromDetails(details) {
    var hosts = (details && Array.isArray(details.kj_hosts)) ? details.kj_hosts : [];
    /* The wizard stores plain strings [primary, ...co-hosts]; tolerate
       object-shaped rows too (defensive — nothing live writes those). */
    return hosts.map(function (h) {
      if (typeof h === 'string') return h;
      if (h && typeof h.name === 'string') return h.name;
      return '';
    }).filter(Boolean);
  }

  var teamRenderGuard = false;
  function renderTeamBody() {
    if (teamRenderGuard) return;
    try {
      var card = cardByHeading('Hosting Team');
      var body = cardBody(card);
      if (!body || !detailsData) return;
      var all = teamListFromDetails(detailsData);
      var primary = '';
      try { primary = (typeof memberProfile !== 'undefined' && memberProfile && memberProfile.stage_name) || ''; } catch (e) {}
      var cohosts = all.filter(function (n) { return n !== primary; });
      if (all.length && all[0] && !primary) primary = all[0];
      else if (!all.length && primary) cohosts = [];
      var sig = JSON.stringify([primary, cohosts]);
      /* The sig alone is not proof: V77's async render replaces the
         body's children but the sig attribute on the body survives, so
         a sig-only check would skip re-rendering after V77 overwrote
         us. Verify the visible content actually matches. */
      var text = body.textContent || '';
      var contentOk = body.dataset.v86TeamSig === sig
        && text.indexOf(primary || 'You') !== -1
        && cohosts.every(function (n) { return text.indexOf(n) !== -1; })
        && text.indexOf('guided host setup') === -1;
      if (contentOk) return;
      teamRenderGuard = true;
      body.textContent = '';
      body.appendChild(v75Row('Primary Host', primary || 'You').row);
      if (cohosts.length) {
        cohosts.forEach(function (n) { body.appendChild(v75Row('Co-Host', n).row); });
      } else {
        body.appendChild(el('p', 'v75-note', 'Add co-hosts with Manage.'));
      }
      body.dataset.v86TeamSig = sig;
      teamRenderGuard = false;
    } catch (e) { teamRenderGuard = false; }
  }

  function openTeamDialog() {
    if (!signedIn()) return;
    getSetupDetails().then(function (details) {
      details = details || {};
      var all = teamListFromDetails(details);
      var primary = '';
      try { primary = (typeof memberProfile !== 'undefined' && memberProfile && memberProfile.stage_name) || ''; } catch (e) {}
      if (!primary && all.length) primary = all[0];
      var cohosts = all.filter(function (n) { return n !== primary; }).slice(0, 11);
      var d = openV86Dialog('Edit Hosting Team');
      d.body.appendChild(el('p', 'v86-dialog-note', 'Primary host: ' + (primary || 'You') + '. Add up to 11 co-hosts.'));
      var listEl = el('div', 'v86-team-list');
      d.body.appendChild(listEl);
      function addRow(value) {
        var wrap = el('div', 'v86-team-row');
        var input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 120;
        input.placeholder = 'Co-host name';
        input.autocomplete = 'off';
        input.value = value || '';
        var rm = el('button', 'v86-team-remove', 'Remove');
        rm.type = 'button';
        rm.addEventListener('click', function () { wrap.remove(); });
        wrap.appendChild(input);
        wrap.appendChild(rm);
        listEl.appendChild(wrap);
      }
      cohosts.forEach(addRow);
      if (!cohosts.length) addRow('');
      var addBtn = el('button', 'v86-team-add', '+ Add Co-Host');
      addBtn.type = 'button';
      addBtn.addEventListener('click', function () {
        if (listEl.querySelectorAll('input').length >= 11) { d.err.textContent = 'Up to 11 co-hosts.'; return; }
        d.err.textContent = '';
        addRow('');
      });
      d.body.appendChild(addBtn);
      d.save.addEventListener('click', function () {
        var names = [];
        listEl.querySelectorAll('input').forEach(function (inp) {
          var v = inp.value.trim().slice(0, 120);
          if (v && names.indexOf(v) === -1) names.push(v);
        });
        if (names.length > 11) names = names.slice(0, 11);
        var hosts = [primary].concat(names).filter(Boolean).slice(0, 12);
        d.save.disabled = true;
        d.err.textContent = 'Saving…';
        client().from('member_setup_details').upsert(
          { user_id: uid(), kj_hosts: hosts, updated_at: nowIso() },
          { onConflict: 'user_id' })
          .then(function (res) {
            if (res && res.error) throw res.error;
            detailsData = Object.assign({}, detailsData || {}, { kj_hosts: hosts });
            renderTeamBody();
            d.dlg.close();
            try { if (typeof authStatus === 'function') authStatus('Hosting team saved.'); } catch (e) {}
          })
          .catch(function (err) {
            d.save.disabled = false;
            d.err.textContent = 'Could not save: ' + (err && err.message ? err.message : 'Please try again.');
          });
      });
      d.dlg.showModal();
    }).catch(function () {});
  }

  function ensureKjEditors() {
    try {
      var profile = $('auth-profile');
      if (!profile) return;
      var bizCard = cardByHeading('KJ / Host Profile');
      if (bizCard) {
        var head = bizCard.querySelector('.v71-card-head');
        if (head && !head.querySelector('.v86-kj-biz-edit')) {
          var b = el('button', 'v71-card-edit v86-kj-biz-edit', 'Edit Business');
          b.type = 'button';
          b.addEventListener('click', function () { openKjBizDialog(); });
          head.appendChild(b);
        }
      }
      var teamCard = cardByHeading('Hosting Team');
      if (teamCard) {
        var teamHead = teamCard.querySelector('.v71-card-head');
        if (teamHead) {
          var manage = teamHead.querySelector('.v71-card-edit');
          if (manage && !manage.dataset.v86Wired) {
            /* V77's Manage runs the setup wizard; replace the button
               (V77 holds no reference to it) with the team editor. */
            var repl = manage.cloneNode(true);
            repl.dataset.v86Wired = '1';
            teamHead.replaceChild(repl, manage);
            repl.addEventListener('click', function () { openTeamDialog(); });
          }
        }
      }
    } catch (e) {}
  }

  /* ================= init + upkeep ================= */

  var teamObserved = false;
  function observeTeamBody() {
    if (teamObserved) return;
    var card = cardByHeading('Hosting Team');
    var body = cardBody(card);
    if (!body) return;
    teamObserved = true;
    var queued = false;
    new MutationObserver(function () {
      /* V77's async role-data render can overwrite this body after we
         render it (it only understands object-shaped hosts). Re-assert
         our string-aware render when the content no longer matches. */
      if (queued || teamRenderGuard) return;
      queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        renderTeamBody();
      });
    }).observe(body, { childList: true, subtree: true });
  }

  var syncQueued = false;
  function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(function () {
      syncQueued = false;
      try {
        syncName();
        syncSetupRows();
        rewireHeroButton();
        ensureKjEditors();
        observeTeamBody();
        if (accountPage()) removeSetupPrefsSection();
        else buildAccountPage();
        wrapMemberEdit();
        wrapMemberSubmit();
        wrapNavigate();
      } catch (e) {}
    });
  }

  function init() {
    try {
      interceptAccountEntry();
      wrapMemberEdit();
      wrapMemberSubmit();
      wrapNavigate();
      syncName();
      syncSetupRows();
      rewireHeroButton();
      ensureKjEditors();
      buildAccountPage();
      renderFieldToggles();
      if (signedIn()) {
        getSetupDetails().then(function (d) {
          ensureKjContactRows(d || {});
          renderTeamBody();
        }).catch(function () {});
        getPublicPrefs().then(function () { renderFieldToggles(); }).catch(function () {});
      }
      window.addEventListener('hashchange', syncRoute);
      var profile = $('auth-profile');
      if (profile) {
        new MutationObserver(queueSync).observe(profile, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden'] });
      }
      new MutationObserver(queueSync).observe(document.documentElement, { childList: true, subtree: true });
      if (initialHash === 'account-settings') {
        /* The site's entry router navigates unknown hashes home; land
           on the deep-linked page instead, once sign-in has resolved
           (auth is async — poll briefly rather than guessing a delay). */
        var tries = 0;
        var deepLinkTimer = setInterval(function () {
          tries++;
          try {
            if (signedIn()) { clearInterval(deepLinkTimer); openAccount(); }
            else if (tries > 40) { clearInterval(deepLinkTimer); }
          } catch (e) { clearInterval(deepLinkTimer); }
        }, 200);
      } else {
        syncRoute();
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
