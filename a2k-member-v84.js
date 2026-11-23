/* Addicted to Karaoke — public member profile + KJ polish layer (V84).
   Builds on V83 (same anchor, same observers-must-not-loop discipline).
   Part 1 — KJ profile layout polish, desktop only, presentation only:
     - KJ Hosts directory gets the framed full-width search panel and a
       "N hosts" count line, like the Members directory.
     - The stray "·" before "Member since" is hidden when no fact
       precedes it (V83 adds it via ::before; member numbers are hidden).
     - Share returns to a labeled text button ("Share Profile").
     - The doubled "KJ Reviews" heading is reduced to one (the ratings
       summary keeps the heading once its mount exists).
     - Schedule-tab and cream-card dead space is tightened (see CSS).
   Part 2 — verification redesign, front end only:
     - The "Awaiting verified KJ status" / "Reviews will be available
       after host verification." gate copy is replaced with neutral
       language and an honest empty state. The gold Verified KJ badge
       still means email-confirmed + founder approval; nothing here
       invents a verified state. The Rate button stays hidden for hosts
       with no kj_review_hosts row (that row is created server-side;
       see the build report) — no fake affordance.
     - Signed-in members whose email is not confirmed see a "check
       your inbox" prompt with a resend action in the KJ setup/hosting
       flows. The email itself is sent by Supabase (Sophie's side).
     - The founder's KJ verification view gains the member's submitted
       hosting nights (venue + nights + status) so the badge decision
       is based on something checkable.
   No data writes, no Supabase schema changes, no behavior changes
   beyond the approved items above. Verified hosts keep their badge
   and reviews exactly as today. */
(function () {
  'use strict';

  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function text(el) { return el ? (el.textContent || '').trim() : ''; }
  function hasAuth() { return typeof authUser !== 'undefined' && !!authUser; }
  function emailConfirmed() {
    if (!hasAuth()) return null; /* signed out: unknown, not unconfirmed */
    if (!('email_confirmed_at' in authUser)) return null; /* stale session shape: don't guess */
    return !!authUser.email_confirmed_at;
  }
  function client() { return typeof authClient !== 'undefined' ? authClient : null; }

  /* ---------------- public profile ---------------- */

  function fixFactsSeparator(profile) {
    var facts = profile.querySelector('.a2k-d-public-profile-sidebar > .a2k-d-profile-facts:not(:has(> h2))');
    if (!facts) facts = profile.querySelector('.a2k-d-public-profile-sidebar .a2k-d-profile-facts');
    if (!facts) return;
    var joined = facts.querySelector('.a2k-d-profile-joined');
    if (!joined) return;
    var before = [];
    var kids = facts.children;
    for (var i = 0; i < kids.length; i++) {
      if (kids[i] === joined) break;
      var kid = kids[i];
      var style = null;
      try { style = window.getComputedStyle(kid); } catch (e) {}
      if (!kid.hidden && !(style && style.display === 'none')) before.push(kid);
    }
    facts.classList.toggle('v84-no-lead-fact', before.length === 0);
  }

  /* V83 iconizes Share into a 36px glyph and re-applies on every text
     change (its observer fires whenever the label returns after the
     site's "Link Copied!" flash). Defeat it without touching V83: keep
     a hidden svg inside the button, so V83's condition
     (label === 'Share Profile' && no svg) is never true; then our own
     observer re-asserts the labeled button after any mutation. Both
     observers only mutate when the state is actually wrong, so the
     pair cannot loop. */
  var SHARE_GUARD = '<svg aria-hidden="true" focusable="false" style="display:none" width="1" height="1"><path d="M0 0h1v1H0z"/></svg>';
  function shareIsLabeled(btn) {
    return btn.classList.contains('v84-share-text') &&
      btn.querySelector('svg') !== null &&
      text(btn) === 'Share Profile';
  }
  function labelShare(btn) {
    if (text(btn) === 'Link Copied!') return; /* site's transient state: leave it */
    if (shareIsLabeled(btn)) return;
    btn.classList.add('v84-share-text');
    btn.innerHTML = SHARE_GUARD + 'Share Profile';
  }
  function fixShare(profile) {
    var btn = profile.querySelector('.a2k-d-profile-share');
    if (!btn || btn.dataset.v84Share) return;
    btn.dataset.v84Share = '1';
    labelShare(btn);
    new MutationObserver(function () { labelShare(btn); })
      .observe(btn, { childList: true, subtree: true, characterData: true });
  }

  /* The renderer adds an h2 "KJ Reviews" AND mountRatings adds a
     summary "🎤 KJ Reviews". Keep the summary as the one heading, but
     only once the mount actually exists (otherwise the section would
     have no heading at all). */
  function dedupeKjReviews(profile) {
    var section = profile.querySelector('.a2k-d-profile-kj-reviews');
    if (!section || section.dataset.v84Reviews) return;
    if (section.querySelector('.a2k-kj-host-rating-section, .a2k-kj-host-rating-details')) {
      section.dataset.v84Reviews = '1';
      section.classList.add('v84-reviews-mounted');
    }
  }

  /* Rewrite the verification-gate copy inside the mounted KJ ratings:
     "Awaiting verified KJ status" -> "New host"; the gate paragraph
     shown on expand -> the same honest empty state mountRatings uses
     for eligible hosts with no reviews yet. The Rate button is left
     hidden (no kj_review_hosts row = no review form can work yet). */
  function fixKjRatings(profile) {
    var mount = profile.querySelector('.a2k-d-profile-kj-ratings');
    if (!mount || mount.dataset.v84Ratings) return;
    mount.dataset.v84Ratings = '1';
    var rewrite = function () {
      var summary = mount.querySelector('.a2k-kj-host-rating-summary');
      if (summary) {
        var spans = summary.querySelectorAll('span');
        spans.forEach(function (s) {
          if (text(s) === 'Awaiting verified KJ status') s.textContent = 'New host';
        });
      }
      var list = mount.querySelector('.a2k-kj-host-review-list');
      if (list) {
        list.querySelectorAll('p').forEach(function (p) {
          if (text(p) === 'Reviews will be available after host verification.') {
            p.textContent = 'No approved reviews yet. Be the first to share your karaoke experience.';
          }
        });
      }
    };
    /* mountRatings registers its toggle handler before we see the
       mount, so ours runs after it on the same toggle. */
    mount.addEventListener('toggle', function () { setTimeout(rewrite, 0); }, true);
    new MutationObserver(rewrite).observe(mount, { childList: true, subtree: true, characterData: true });
    rewrite();
  }

  function enhanceProfile(sel) {
    try {
      if (!sel) return;
      fixFactsSeparator(sel);
      fixShare(sel);
      dedupeKjReviews(sel);
      fixKjRatings(sel);
      /* Facts can change after the async member-number lookup. */
      if (!sel.dataset.v84FactsWatched) {
        sel.dataset.v84FactsWatched = '1';
        var facts = sel.querySelector('.a2k-d-public-profile-sidebar .a2k-d-profile-facts');
        if (facts) new MutationObserver(function () { fixFactsSeparator(sel); })
          .observe(facts, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
        new MutationObserver(function () { enhanceProfile(sel); })
          .observe(sel, { childList: true, subtree: true });
      }
    } catch (e) {}
  }

  /* ---------------- KJ Hosts directory ---------------- */

  function hostsCountText(visible, total, term) {
    if (!total) return 'No hosts in the directory yet.';
    if (term) return visible + ' host' + (visible === 1 ? '' : 's') + ' matching';
    return visible + ' host' + (visible === 1 ? '' : 's') + ' in the directory';
  }
  function updateHostsCount(shell) {
    var panel = shell.querySelector('.v84-hosts-panel');
    var count = shell.querySelector('.v84-hosts-count');
    var search = shell.querySelector('.v84-hosts-panel .a2k-d-directory-search');
    if (!panel || !count || !search) return;
    var grid = shell.querySelector('.a2k-d-directory-grid');
    var cards = grid ? grid.querySelectorAll(':scope > article.a2k-d-directory-card') : [];
    var visible = 0;
    cards.forEach(function (c) { if (!c.hidden) visible++; });
    count.textContent = hostsCountText(visible, cards.length, search.value.trim());
  }
  function enhanceHostsDirectory(shell) {
    try {
      var h1 = shell.querySelector(':scope > h1');
      if (!h1 || text(h1) !== 'KJ Hosts') return; /* events directory shares this shell */
      if (shell.dataset.v84Hosts) { updateHostsCount(shell); return; }
      var search = shell.querySelector(':scope > input.a2k-d-directory-search');
      if (!search) return;
      shell.dataset.v84Hosts = '1';
      var panel = document.createElement('div');
      panel.className = 'v84-hosts-panel';
      search.parentNode.insertBefore(panel, search);
      panel.appendChild(search);
      var count = document.createElement('p');
      count.className = 'v84-hosts-count';
      count.setAttribute('role', 'status');
      panel.appendChild(count);
      var grid = shell.querySelector(':scope > .a2k-d-directory-grid');
      var update = function () { updateHostsCount(shell); };
      search.addEventListener('input', update);
      if (grid) new MutationObserver(update).observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
      update();
    } catch (e) {}
  }

  /* ---------------- email verification prompt ---------------- */

  function buildEmailPrompt() {
    var box = document.createElement('div');
    box.className = 'v84-email-verify';
    var email = hasAuth() && authUser.email ? authUser.email : '';
    var lead = document.createElement('p');
    lead.className = 'v84-email-verify-lead';
    lead.textContent = 'Verify your email to finish setting up as a host. We sent a confirmation link to ' +
      (email || 'your email address') + ' — check your inbox (and spam) and click the link.';
    box.appendChild(lead);
    var status = document.createElement('p');
    status.className = 'v84-email-verify-status';
    status.setAttribute('role', 'status');
    var canResend = !!(client() && client().auth && typeof client().auth.resend === 'function');
    if (canResend) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'v84-email-resend';
      btn.textContent = 'Resend verification email';
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        btn.disabled = true;
        status.textContent = 'Sending…';
        var done = function (msg) { status.textContent = msg; btn.disabled = false; };
        try {
          var p = client().auth.resend({ type: 'signup', email: authUser.email });
          if (p && typeof p.then === 'function') {
            p.then(function (r) {
              if (r && r.error) done('We couldn\u2019t resend that email right now. Check your inbox for the one we already sent.');
              else done('Verification email sent — check your inbox.');
            }).catch(function () { done('We couldn\u2019t resend that email right now. Check your inbox for the one we already sent.'); });
          } else done('Verification email sent — check your inbox.');
        } catch (e) { done('We couldn\u2019t resend that email right now. Check your inbox for the one we already sent.'); }
      });
      box.appendChild(btn);
    }
    box.appendChild(status);
    return box;
  }
  function maybePromptIn(node) {
    if (emailConfirmed() !== false) return; /* confirmed, signed out, or unknown: no prompt */
    if (node.querySelector(':scope > .v84-email-verify')) return;
    node.insertBefore(buildEmailPrompt(), node.firstChild);
  }
  function watchSetupWizard() {
    var contents = document.getElementById('a2k-setup-contents');
    if (!contents || contents.dataset.v84EmailWatched) return;
    contents.dataset.v84EmailWatched = '1';
    var check = function () {
      var heading = document.getElementById('a2k-setup-heading');
      var host = document.getElementById('a2k-setup-fullpage');
      if (!host || host.hidden) return;
      var h = heading ? text(heading) : '';
      if (h === 'Your KJ / Hosting Details' || h === 'Set Up Your First KJ Night') {
        maybePromptIn(contents);
      }
    };
    new MutationObserver(check).observe(contents, { childList: true, subtree: true });
    check();
  }
  function watchKjDialog() {
    var dialog = document.getElementById('atk-kj-dialog');
    if (!dialog || dialog.dataset.v84EmailWatched) return;
    dialog.dataset.v84EmailWatched = '1';
    var check = function () {
      if (!dialog.open) return;
      /* The dialog re-renders its body on every stage change; the
         prompt is re-inserted at the top when it is missing. The
         list view also gets a one-line status when email is confirmed. */
      if (emailConfirmed() === false) maybePromptIn(dialog);
      else if (emailConfirmed() === true && !dialog.querySelector('.v84-email-ok')) {
        var ok = document.createElement('p');
        ok.className = 'v84-email-ok';
        ok.textContent = 'Email verified ✓';
        dialog.insertBefore(ok, dialog.firstChild);
      }
    };
    new MutationObserver(check).observe(dialog, { childList: true, subtree: true });
    check();
  }

  /* ---------------- founder KJ verification evidence ---------------- */

  function prettyTime(value) {
    var m = /^([0-2][0-9]):([0-5][0-9])/.exec(String(value || ''));
    if (!m) return '';
    var h = Number(m[1]);
    return (h % 12 || 12) + ':' + m[2] + ' ' + (h < 12 ? 'AM' : 'PM');
  }
  function submissionLine(row) {
    var venue = [row.venue_name, [row.venue_city, row.venue_state].filter(Boolean).join(', ')]
      .filter(Boolean).join(' — ') || 'Venue not named';
    var nights = Array.isArray(row.sessions) ? row.sessions.map(function (s) {
      var day = DAY_NAMES[Number(s.day)] || '';
      var times = [prettyTime(s.start), prettyTime(s.end)].filter(Boolean).join('–');
      return [day, times].filter(Boolean).join(' ');
    }).filter(Boolean).join(' · ') : '';
    var status = String(row.status || 'pending');
    return { venue: venue, nights: nights || 'No nights listed', status: status };
  }
  function enrichKjVerification(memberId) {
    try {
      var section = document.getElementById('mg2-kj-verification');
      if (!section || !memberId || !client()) return;
      var copy = section.querySelector('.mg2-kj-verification-copy');
      if (!copy) return;
      var old = copy.querySelector('.v84-kj-evidence');
      if (old && old.dataset.member === memberId) return;
      if (old) old.remove();
      var box = document.createElement('div');
      box.className = 'v84-kj-evidence';
      box.dataset.member = memberId;
      var title = document.createElement('p');
      title.className = 'v84-kj-evidence-title';
      title.textContent = 'Hosting nights submitted';
      box.appendChild(title);
      var loading = document.createElement('p');
      loading.className = 'mg2-muted';
      loading.textContent = 'Loading hosting nights…';
      box.appendChild(loading);
      copy.appendChild(box);
      client().from('kj_host_submissions')
        .select('user_id,venue_name,venue_city,venue_state,sessions,status,created_at')
        .eq('user_id', memberId).order('created_at', { ascending: false }).limit(8)
        .then(function (res) {
          if (!box.isConnected) return;
          loading.remove();
          if (res && res.error) { box.remove(); return; } /* fail silent: founder view works as before */
          var rows = (res && res.data) || [];
          if (!rows.length) {
            var none = document.createElement('p');
            none.className = 'mg2-muted';
            none.textContent = 'No hosting nights submitted yet — nothing to check against.';
            box.appendChild(none);
            return;
          }
          rows.forEach(function (row) {
            var info = submissionLine(row);
            var line = document.createElement('p');
            line.className = 'v84-kj-evidence-row';
            var v = document.createElement('strong');
            v.textContent = info.venue;
            var n = document.createElement('span');
            n.textContent = info.nights;
            var s = document.createElement('span');
            s.className = 'v84-kj-evidence-status';
            s.textContent = info.status;
            line.append(v, document.createTextNode(' — '), n, document.createTextNode(' '), s);
            box.appendChild(line);
          });
        }).catch(function () { if (box.isConnected) box.remove(); });
    } catch (e) {}
  }
  function watchManagementOpen() {
    if (typeof managementMemberOpen !== 'function' || window.__v84MgmtWrapped) return;
    window.__v84MgmtWrapped = true;
    var original = managementMemberOpen;
    managementMemberOpen = function (member) {
      var result = original.apply(this, arguments);
      try {
        var id = member && (member.id || member.user_id);
        if (id) setTimeout(function () { enrichKjVerification(String(id)); }, 0);
      } catch (e) {}
      return result;
    };
  }

  /* ---------------- wiring ---------------- */

  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.id === 'a2k-d-directory') enhanceHostsDirectory(node);
    if (node.classList && node.classList.contains('a2k-d-selected-member')) enhanceProfile(node);
    if (node.querySelector) {
      var shell = node.querySelector('#a2k-d-directory');
      if (shell) enhanceHostsDirectory(shell);
      enhanceProfile(node.querySelector('.a2k-d-selected-member'));
    }
  }
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      Array.prototype.forEach.call(m.addedNodes, scan);
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan(document.documentElement); /* document itself is nodeType 9: scan the root element */
  watchSetupWizard();
  watchKjDialog();
  watchManagementOpen();
  /* The wizard, dialog, and management views can appear long after
     this layer loads; re-check for them on a slow interval-free
     basis via the same document observer. */
  new MutationObserver(function () {
    watchSetupWizard();
    watchKjDialog();
    watchManagementOpen();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
