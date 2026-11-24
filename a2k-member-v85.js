/* Addicted to Karaoke — member layer V85.
   Builds on V84. Location wiring + Report Member + badge opt-in.
   Part 1 — LOCATION (Sophie deployed member_setup_details.location_text
     in migration member_location_and_member_reports_v84):
     - The wizard bridge (a2k-member-setup-live.js, edited alongside this
       layer) now upserts location_text for ALL roles on every save, and
       member-setup-preview.html prefills it on re-open so a re-run never
       wipes it. See the build report for the exact edits.
     - Public profile: the Location row is added ONLY from the
       a2k_public_member_location RPC, which respects show_location and
       profile visibility server-side. Nothing is rendered from local
       data for other members, and no row appears when the RPC returns
       nothing — a private location is never disclosed.
     - Own logged-in profile: a Location row is added to the Profile
       Information card from the member's own setup-details row, with
       a "(private)" suffix when show_location is off (Sophie's design).
   Part 2 — REPORT A MEMBER (Sophie deployed public.member_reports):
     - A discreet "Report" link sits beside Share in the hero actions.
       Hidden on your own profile; signed-out visitors get a sign-in
       prompt instead of a guest flow. Reasons are Sophie's five:
       spam / harassment / impersonation / inappropriate_content / other.
     - Founder moderation: pending member reports appear in the
       Approval Center as a "Member Reports" group (same card + Dismiss /
       Mark Resolved pattern as venue reports) and count in the badge.
   Part 3 — BADGE VISIBILITY, per-member opt-in (Steven's decision):
     - A "Show My Badges" Shown/Hidden switch in the logged-in profile's
       Privacy & Visibility settings reads/saves
       member_public_preferences.show_badges (default false = private
       until the member opts in). Public badge display itself uses the
       normal profile_badge_awards query — the policy Sophie deployed
       decides what it returns; this layer invents no visibility.
   Part 4 — EMAIL VERIFICATION (V84 built the prompt/resend; this layer
     only fixes where it appears): V84's wizard prompt targeted the
     legacy full-page wizard, which the live iframe wizard never
     renders. V85 injects the same prompt into the live iframe
     wizard's KJ steps (same-origin iframe, fail-soft).
   Host-review activation is VERIFY-ONLY: the Rate button appears
   exactly when the kj_review_hosts.enabled row exists (server-side
   a2k_sync_kj_review_host). This layer never inserts into
   kj_review_hosts. V84's "New host" copy and honest empty state
   stay intact. */
(function () {
  'use strict';

  function text(el) { return el ? (el.textContent || '').trim() : ''; }
  function client() { return typeof authClient !== 'undefined' ? authClient : null; }
  function hasAuth() { return typeof authUser !== 'undefined' && !!authUser; }
  function signedInId() { return hasAuth() ? String(authUser.id) : null; }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = txt;
    return e;
  }
  function nowIso() { try { return new Date().toISOString(); } catch (e) { return ''; } }

  /* ================= 1. LOCATION — public profile ================= */

  function locationFromRpc(data) {
    if (typeof data === 'string') return data.trim();
    if (Array.isArray(data) && data.length) return locationFromRpc(data[0]);
    if (data && typeof data === 'object') {
      var v = data.location_text || data.location || data.value || null;
      return typeof v === 'string' ? v.trim() : '';
    }
    return '';
  }

  function addLocationFact(profile, userId) {
    if (!profile || profile.dataset.v85Location) return;
    if (!client() || typeof client().rpc !== 'function') return;
    var facts = null;
    var allFacts = profile.querySelectorAll('.a2k-d-public-profile-sidebar .a2k-d-profile-facts');
    for (var i = 0; i < allFacts.length; i++) {
      if (!allFacts[i].querySelector(':scope > h2')) { facts = allFacts[i]; break; }
    }
    if (!facts) return; /* renderer has not built facts yet; retried on next mutation */
    profile.dataset.v85Location = '1';
    client().rpc('a2k_public_member_location', { p_user_id: userId }).then(function (res) {
      if (!profile.isConnected) return;
      if (!res || res.error) return; /* RPC missing or denied: no row, fail silent */
      var loc = locationFromRpc(res.data);
      if (!loc) return; /* private / unset: never render an empty row */
      var row = el('div', 'a2k-d-profile-fact v85-location-fact');
      row.appendChild(el('span', 'a2k-d-profile-fact-icon'));
      row.appendChild(el('span', 'a2k-d-profile-fact-value', loc));
      /* Location is the lead fact: before "Member since", so V84's
         separator logic (hide the stray "·" only when nothing precedes
         it) now sees a real preceding fact. */
      var joined = facts.querySelector('.a2k-d-profile-joined');
      if (joined) facts.insertBefore(row, joined);
      else facts.appendChild(row);
    }).catch(function () {});
  }

  /* ================= 1b. LOCATION — own logged-in profile ================= */

  function addOwnLocationRow() {
    var card = document.querySelector('#auth-profile .v71-info-row');
    if (!card || !card.parentNode) return;
    var rows = card.parentNode;
    if (rows.querySelector('.v85-own-location-row') || rows.dataset.v85LocFetch) return;
    rows.dataset.v85LocFetch = '1';
    if (!hasAuth() || !client()) return;
    var uid = String(authUser.id);
    var done = function (loc, isPrivate) {
      if (!loc || rows.querySelector('.v85-own-location-row')) return;
      var r = el('div', 'v71-info-row v85-own-location-row');
      r.appendChild(el('span', 'v71-info-label', 'Location:'));
      r.appendChild(el('strong', 'v71-info-value', loc + (isPrivate ? ' (private)' : '')));
      var interests = rows.querySelector('.v71-info-interests-row');
      if (interests && interests.nextSibling) rows.insertBefore(r, interests.nextSibling);
      else rows.appendChild(r);
    };
    client().from('member_setup_details').select('location_text').eq('user_id', uid).maybeSingle()
      .then(function (res) {
        var loc = res && res.data && typeof res.data.location_text === 'string'
          ? res.data.location_text.trim() : '';
        if (!loc) return;
        return client().from('member_public_preferences').select('show_location').eq('user_id', uid).maybeSingle()
          .then(function (p) {
            var priv = !(p && p.data && p.data.show_location !== false);
            done(loc, priv);
          });
      }).catch(function () {});
  }

  /* ================= 2. REPORT A MEMBER ================= */

  var REPORT_REASONS = [
    ['spam', 'Spam / advertising'],
    ['harassment', 'Harassment'],
    ['impersonation', 'Impersonation'],
    ['inappropriate_content', 'Inappropriate content'],
    ['other', 'Something else']
  ];
  var reportDialog = null, reportTarget = null, reportSaving = false;

  function siteMessage(msg) {
    try { if (typeof message === 'function') { message(msg); return; } } catch (e) {}
    try { if (typeof authStatus === 'function') { authStatus(msg); return; } } catch (e) {}
  }

  function buildReportDialog() {
    if (reportDialog) return reportDialog;
    var dlg = document.createElement('dialog');
    dlg.className = 'v85-report-dialog';
    dlg.setAttribute('aria-labelledby', 'v85-report-heading');
    var form = el('form', 'v85-report-form');
    form.addEventListener('submit', function (e) { e.preventDefault(); submitReport(); });
    var head = el('div', 'v85-report-heading');
    head.appendChild(el('h2', '', 'Report Member'));
    head.querySelector('h2').id = 'v85-report-heading';
    head.appendChild(el('p', '', 'Report a problem with this member.'));
    form.appendChild(head);
    form.appendChild(el('p', 'v85-report-caption', 'What seems wrong?'));
    var opts = el('div', 'v85-report-options');
    REPORT_REASONS.forEach(function (pair) {
      var b = el('button', 'v85-report-option', pair[1]);
      b.type = 'button';
      b.dataset.reason = pair[0];
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        opts.querySelectorAll('.v85-report-option').forEach(function (o) {
          o.setAttribute('aria-pressed', String(o === b));
        });
        setReportFeedback('');
      });
      opts.appendChild(b);
    });
    form.appendChild(opts);
    var label = el('label', 'v85-report-label', 'Additional information (optional)');
    label.htmlFor = 'v85-report-detail';
    form.appendChild(label);
    var detail = document.createElement('textarea');
    detail.id = 'v85-report-detail';
    detail.rows = 3;
    detail.maxLength = 800;
    detail.placeholder = 'Describe what you noticed. Required for Something else.';
    form.appendChild(detail);
    var feedback = el('p', 'v85-report-feedback');
    feedback.id = 'v85-report-feedback';
    feedback.setAttribute('role', 'status');
    form.appendChild(feedback);
    var footer = el('footer', 'v85-report-footer');
    var cancel = el('button', 'v85-report-cancel', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', function () { if (!reportSaving) dlg.close(); });
    var submit = el('button', 'v85-report-submit', 'Submit Report');
    submit.type = 'submit';
    footer.appendChild(cancel);
    footer.appendChild(submit);
    form.appendChild(footer);
    dlg.appendChild(form);
    dlg.addEventListener('cancel', function (e) { if (reportSaving) e.preventDefault(); });
    document.body.appendChild(dlg);
    reportDialog = dlg;
    return dlg;
  }

  function setReportFeedback(msg) {
    var f = document.getElementById('v85-report-feedback');
    if (f) f.textContent = msg || '';
  }

  function openReport(memberId, memberName) {
    if (!client() || !hasAuth()) {
      siteMessage('Sign in to report a member.');
      try { if (typeof navigate === 'function') navigate('signin'); } catch (e) {}
      return;
    }
    if (String(authUser.id) === String(memberId)) return; /* own profile: never offered */
    reportTarget = { id: String(memberId), name: memberName || 'this member' };
    var dlg = buildReportDialog();
    dlg.querySelectorAll('.v85-report-option').forEach(function (o) {
      o.setAttribute('aria-pressed', 'false');
    });
    var detail = document.getElementById('v85-report-detail');
    if (detail) detail.value = '';
    setReportFeedback('');
    if (!dlg.open) dlg.showModal();
  }

  function submitReport() {
    if (reportSaving || !reportTarget || !client()) return;
    var chosen = null;
    var opts = reportDialog.querySelectorAll('.v85-report-option');
    opts.forEach(function (o) { if (o.getAttribute('aria-pressed') === 'true') chosen = o.dataset.reason; });
    if (!chosen) { setReportFeedback('Choose what seems wrong.'); return; }
    var detail = document.getElementById('v85-report-detail');
    var note = detail ? detail.value.trim() : '';
    if (chosen === 'other' && note.length < 10) {
      setReportFeedback('Please add at least ten characters describing the problem.');
      return;
    }
    reportSaving = true;
    setReportFeedback('Submitting report…');
    var btn = reportDialog.querySelector('.v85-report-submit');
    if (btn) btn.disabled = true;
    client().from('member_reports').insert({
      member_id: reportTarget.id,
      reporter_id: String(authUser.id),
      reason: chosen,
      note: note || null
    }).then(function (res) {
      reportSaving = false;
      if (btn) btn.disabled = false;
      if (res && res.error) {
        var code = String(res.error.code || '');
        if (code === '23505') setReportFeedback('You already have a pending report for this member.');
        else setReportFeedback('Could not submit this report: ' + (res.error.message || 'Please try again.'));
        return;
      }
      reportDialog.close();
      siteMessage('Member report submitted. Thank you for helping keep our community safe.');
    }).catch(function (e) {
      reportSaving = false;
      if (btn) btn.disabled = false;
      setReportFeedback('Could not submit this report: ' + (e && e.message ? e.message : 'Please try again.'));
    });
  }

  /* The renderer keeps the profile user id in a closure with no data-*
     hook on the DOM, so resolve slug -> id the same way it does. */
  var slugIdCache = {};
  function resolveProfileId(profile, memberRef) {
    if (profile.dataset.v85MemberId) return Promise.resolve(profile.dataset.v85MemberId);
    if (memberRef && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberRef)) {
      profile.dataset.v85MemberId = memberRef;
      return Promise.resolve(memberRef);
    }
    var slug = memberRef || (function () {
      var m = /^#member\/([a-z0-9-]{1,70})$/i.exec(location.hash || '');
      return m ? m[1] : null;
    })();
    if (!slug || !client()) return Promise.resolve(null);
    if (slugIdCache[slug]) return slugIdCache[slug];
    var p = client().from('member_profiles').select('user_id').eq('profile_slug', slug).maybeSingle()
      .then(function (res) {
        var id = res && res.data && res.data.user_id ? String(res.data.user_id) : null;
        if (id) profile.dataset.v85MemberId = id;
        return id;
      }).catch(function () { return null; });
    slugIdCache[slug] = p;
    return p;
  }

  function addReportAction(profile, memberRef) {
    if (!profile || profile.dataset.v85Report) return;
    var actions = profile.querySelector('.v74-hero-actions');
    if (!actions) return; /* V83 builds this after the renderer; retried on next mutation */
    profile.dataset.v85Report = '1';
    resolveProfileId(profile, memberRef).then(function (memberId) {
      if (!memberId || !profile.isConnected) return;
      if (signedInId() && signedInId() === String(memberId)) return; /* own profile: never offer */
      var link = el('button', 'v85-report-link', 'Report');
      link.type = 'button';
      link.setAttribute('aria-label', 'Report this member');
      link.addEventListener('click', function () {
        var nameEl = profile.querySelector('.a2k-d-public-profile-sidebar h1');
        openReport(memberId, nameEl ? text(nameEl) : null);
      });
      actions.appendChild(link);
    }).catch(function () {});
  }

  /* ================= 3. FOUNDER MODERATION — member reports ================= */

  var MEMBER_REPORT_LABELS = {
    spam: 'Spam / advertising',
    harassment: 'Harassment',
    impersonation: 'Impersonation',
    inappropriate_content: 'Inappropriate content',
    other: 'Something else'
  };
  var memberReportsCache = null, memberReportsFetching = false;

  function fetchMemberReports() {
    if (!client() || !hasAuth()) return Promise.resolve([]);
    if (memberReportsCache) return Promise.resolve(memberReportsCache);
    if (memberReportsFetching) return Promise.resolve([]);
    memberReportsFetching = true;
    return client().from('member_reports')
      .select('id,member_id,reporter_id,reason,note,status,created_at')
      .eq('status', 'pending').order('created_at', { ascending: true }).limit(150)
      .then(function (res) {
        memberReportsFetching = false;
        if (!res || res.error) return [];
        var rows = res.data || [];
        var ids = rows.map(function (r) { return r.member_id; }).filter(Boolean);
        if (!ids.length) { memberReportsCache = rows; return rows; }
        return client().from('member_profiles').select('user_id,stage_name').in('user_id', ids)
          .then(function (pr) {
            var names = {};
            (pr && pr.data || []).forEach(function (m) { names[String(m.user_id)] = m.stage_name; });
            rows.forEach(function (r) { r._name = names[String(r.member_id)] || 'Member'; });
            memberReportsCache = rows;
            return rows;
          }).catch(function () { memberReportsCache = rows; return rows; });
      }).catch(function () { memberReportsFetching = false; return []; });
  }

  function memberReportCard(report) {
    var card = approvalCenterDetails(
      report._name || 'Reported Member',
      (MEMBER_REPORT_LABELS[report.reason] || 'Reported member') + ' · ' + approvalCenterDate(report.created_at));
    var inside = card.inside;
    if (report.note) {
      var note = approvalCenterEl('p', 'Member report: ' + report.note);
      note.style.whiteSpace = 'pre-wrap';
      inside.append(note);
    }
    var actions = approvalCenterEl('div', undefined, 'atk-approval-actions');
    actions.append(
      approvalCenterButton('Dismiss Report', function () { memberReportAction(report, 'dismissed', card.card); }),
      approvalCenterButton('Mark Resolved', function () { memberReportAction(report, 'resolved', card.card); }));
    inside.append(actions);
    return card.card;
  }

  var memberReportSaving = false;
  function memberReportAction(report, status, cardEl) {
    if (memberReportSaving) return;
    memberReportSaving = true;
    var buttons = Array.prototype.slice.call(cardEl.querySelectorAll('button'));
    buttons.forEach(function (b) { b.disabled = true; });
    approvalCenterMessage('Updating member report…');
    client().from('member_reports')
      .update({ status: status, reviewed_at: nowIso(), reviewed_by: authUser.id })
      .eq('id', report.id).eq('status', 'pending').select('id,status').single()
      .then(function (res) {
        memberReportSaving = false;
        if (!res || res.error || !res.data || res.data.status !== status) {
          throw new Error('Report update could not be confirmed.');
        }
        memberReportsCache = null;
        return approvalCenterRefresh(status === 'resolved' ? 'Member report marked resolved.' : 'Member report dismissed.');
      }).catch(function (e) {
        memberReportSaving = false;
        buttons.forEach(function (b) { b.disabled = false; });
        approvalCenterMessage('Unable to update member report: ' + (e && e.message ? e.message : 'Please try again.'));
      });
  }

  function appendMemberReportsGroup() {
    var root = document.getElementById('atk-approval-results');
    if (!root) return;
    /* The render wrapper fires while the member-reports fetch is still
       in flight; do not paint a stale "0 reports" group — the refresh
       wrapper re-appends once the fetch lands. */
    if (memberReportsFetching) return;
    var filterEl = document.getElementById('atk-approval-filter');
    var filter = filterEl ? filterEl.value : 'all';
    if (filter !== 'all' && filter !== 'reports') return;
    var rows = memberReportsCache || [];
    /* Mirror the venue-reports rule: at filter 'all' the group appears
       only when there is something to show; at filter 'reports' it
       always shows (even empty), like "Venue Reports · 0". */
    if (filter === 'all' && !rows.length) return;
    var existing = root.querySelector('.v85-member-reports-group');
    if (existing) existing.remove();
    var group = document.createElement('div');
    group.className = 'v85-member-reports-group';
    group.appendChild(approvalCenterEl('h3', 'Member Reports · ' + rows.length, 'atk-approval-group-label'));
    if (!rows.length) {
      group.appendChild(approvalCenterEl('p', 'No pending member reports.', 'atk-approval-muted'));
    } else {
      rows.forEach(function (r) { group.appendChild(memberReportCard(r)); });
    }
    root.appendChild(group);
    var summary = document.getElementById('atk-approval-summary');
    if (summary && rows.length && summary.textContent.indexOf('member report') === -1) {
      summary.textContent += ' · ' + rows.length + ' member report' + (rows.length === 1 ? '' : 's');
    }
    /* The badge text is (re)set by approvalCenterSetBadge on every
       refresh, so the suffix is re-applied here, where the data is
       already in hand — the approvalCenterBadge wrapper below covers
       the paths that refresh the badge without re-rendering. */
    var badge = document.getElementById('management-approval-count');
    if (badge && rows.length && badge.textContent.indexOf('member report') === -1) {
      badge.textContent += ' · ' + rows.length + ' member report' + (rows.length === 1 ? '' : 's');
    }
  }

  function wrapModeration() {
    if (window.__v85MgmtWrapped) return;
    if (typeof approvalCenterRefresh !== 'function' || typeof approvalCenterRender !== 'function') return;
    window.__v85MgmtWrapped = true;
    var origRefresh = approvalCenterRefresh;
    approvalCenterRefresh = function () {
      var out = origRefresh.apply(this, arguments);
      fetchMemberReports().then(function () { appendMemberReportsGroup(); });
      return out;
    };
    var origRender = approvalCenterRender;
    approvalCenterRender = function () {
      var out = origRender.apply(this, arguments);
      try { appendMemberReportsGroup(); } catch (e) {}
      return out;
    };
    if (typeof approvalCenterBadge === 'function') {
      var origBadge = approvalCenterBadge;
      approvalCenterBadge = function () {
        var out = origBadge.apply(this, arguments);
        fetchMemberReports().then(function (rows) {
          var badge = document.getElementById('management-approval-count');
          if (badge && rows.length && badge.textContent.indexOf('member report') === -1) {
            badge.textContent += ' · ' + rows.length + ' member report' + (rows.length === 1 ? '' : 's');
          }
        });
        return out;
      };
    }
  }

  /* ================= 4. BADGES SWITCH — profile privacy settings ================= */

  var badgesSwitchState = 'unknown'; /* 'on' | 'off' | 'unknown' */
  function badgesSwitchSave(value, tiles, feedback) {
    if (!client() || !hasAuth()) return;
    var uid = String(authUser.id);
    tiles.forEach(function (t) { t.disabled = true; });
    if (feedback) feedback.textContent = 'Saving your badge preference…';
    client().from('member_public_preferences')
      .upsert({ user_id: uid, show_badges: value, updated_at: nowIso() }, { onConflict: 'user_id' })
      .select('show_badges').single()
      .then(function (res) {
        tiles.forEach(function (t) { t.disabled = false; });
        if (!res || res.error || !res.data || res.data.show_badges !== value) {
          throw new Error('The saved setting could not be verified.');
        }
        badgesSwitchState = value ? 'on' : 'off';
        renderBadgesSwitch();
        if (feedback) feedback.textContent = 'My Badges: ' + (value ? 'Shown' : 'Hidden') + ' — saved.';
      }).catch(function (e) {
        tiles.forEach(function (t) { t.disabled = false; });
        renderBadgesSwitch();
        if (feedback) feedback.textContent = 'Could not save this setting: ' + (e && e.message ? e.message : 'Please try again.');
      });
  }

  function renderBadgesSwitch() {
    var fieldset = document.querySelector('.v85-badges-fieldset');
    if (!fieldset) return;
    fieldset.querySelectorAll('[data-badges-value]').forEach(function (tile) {
      tile.setAttribute('aria-pressed', String(
        (tile.dataset.badgesValue === 'shown' && badgesSwitchState === 'on') ||
        (tile.dataset.badgesValue === 'hidden' && badgesSwitchState === 'off')));
    });
  }

  function addBadgesSwitch() {
    var summary = document.getElementById('member-privacy-summary');
    if (!summary || summary.querySelector('.v85-badges-fieldset')) return;
    if (!hasAuth() || !client()) return;
    var fieldset = document.createElement('fieldset');
    fieldset.className = 'profile-privacy-fieldset v85-badges-fieldset';
    fieldset.appendChild(el('legend', '', 'My Badges'));
    var grid = el('div', 'a2k-privacy-tile-grid');
    var shown = el('button', 'a2k-privacy-tile', null);
    shown.type = 'button';
    shown.dataset.badgesValue = 'shown';
    shown.setAttribute('aria-pressed', 'false');
    shown.appendChild(el('strong', '', 'Shown'));
    var hidden = el('button', 'a2k-privacy-tile', null);
    hidden.type = 'button';
    hidden.dataset.badgesValue = 'hidden';
    hidden.setAttribute('aria-pressed', 'false');
    hidden.appendChild(el('strong', '', 'Hidden'));
    grid.appendChild(shown);
    grid.appendChild(hidden);
    fieldset.appendChild(grid);
    fieldset.appendChild(el('p', 'profile-privacy-note v85-badges-note',
      'Show your earned badges to signed-out visitors on your public profile. Off means badges stay members-only. You can always see your own badges.'));
    summary.appendChild(fieldset);
    var feedback = document.getElementById('member-privacy-feedback');
    var tiles = [shown, hidden];
    shown.addEventListener('click', function () { badgesSwitchSave(true, tiles, feedback); });
    hidden.addEventListener('click', function () { badgesSwitchSave(false, tiles, feedback); });
    client().from('member_public_preferences').select('show_badges').eq('user_id', String(authUser.id)).maybeSingle()
      .then(function (res) {
        badgesSwitchState = res && res.data && res.data.show_badges === true ? 'on' : 'off';
        renderBadgesSwitch();
      }).catch(function () { badgesSwitchState = 'off'; renderBadgesSwitch(); });
  }

  /* ================= 5. EMAIL PROMPT INSIDE THE LIVE IFRAME WIZARD ================= */

  function emailConfirmed() {
    if (!hasAuth()) return null;
    if (!('email_confirmed_at' in authUser)) return null;
    return !!authUser.email_confirmed_at;
  }

  function iframeVerifyStyles(doc) {
    if (!doc || doc.getElementById('v85-iframe-verify-style')) return;
    var st = doc.createElement('style');
    st.id = 'v85-iframe-verify-style';
    st.textContent = '.v85-iframe-verify{background:linear-gradient(#fff1d9,#fce0ae);border:1.5px solid #b98338;border-radius:13px;padding:12px 15px;margin:12px 0;font:15px/1.45 Georgia,serif;color:#52000b;}' +
      '.v85-iframe-verify p{margin:0 0 8px;}' +
      '.v85-iframe-verify button{background:linear-gradient(#b4162b,#65000f);color:#fff7e1;border:2px solid #e0b052;border-radius:8px;padding:8px 14px;font:bold 15px Georgia,serif;cursor:pointer;}' +
      '.v85-iframe-verify .v85-iframe-verify-status{font:13px Arial,sans-serif;color:#644947;margin:8px 0 0;}';
    doc.head.appendChild(st);
  }

  function iframeIsKjStep(doc) {
    var main = doc.querySelector('.main-inner') || doc.body;
    if (!main) return false;
    var t = main.textContent || '';
    return /KJ \/ Host Setup|Where Do You Host\?|Set Up Your First KJ Night|Your KJ \/ Hosting Details/.test(t);
  }

  function maybePromptInIframe() {
    if (emailConfirmed() !== false) return;
    var frame = document.querySelector('#a2k-member-setup-live-overlay iframe');
    if (!frame) return;
    var doc;
    try { doc = frame.contentDocument; } catch (e) { return; }
    if (!doc || !iframeIsKjStep(doc)) return;
    if (doc.querySelector('.v85-iframe-verify')) return;
    var main = doc.querySelector('.main-inner');
    if (!main) return;
    iframeVerifyStyles(doc);
    var box = doc.createElement('div');
    box.className = 'v85-iframe-verify';
    var lead = doc.createElement('p');
    lead.textContent = 'Verify your email to finish setting up as a host. We sent a confirmation link to ' +
      (authUser.email || 'your email address') + ' — check your inbox (and spam) and click the link.';
    box.appendChild(lead);
    var status = doc.createElement('p');
    status.className = 'v85-iframe-verify-status';
    status.setAttribute('role', 'status');
    var canResend = !!(client() && client().auth && typeof client().auth.resend === 'function');
    if (canResend) {
      var btn = doc.createElement('button');
      btn.type = 'button';
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
              if (r && r.error) done('We couldn’t resend that email right now. Check your inbox for the one we already sent.');
              else done('Verification email sent — check your inbox.');
            }).catch(function () { done('We couldn’t resend that email right now. Check your inbox for the one we already sent.'); });
          } else done('Verification email sent — check your inbox.');
        } catch (e) { done('We couldn’t resend that email right now. Check your inbox for the one we already sent.'); }
      });
      box.appendChild(btn);
    }
    box.appendChild(status);
    main.insertBefore(box, main.firstChild);
  }

  function watchSetupIframe() {
    if (window.__v85IframeWatched) return;
    window.__v85IframeWatched = true;
    var check = function () { try { maybePromptInIframe(); } catch (e) {} };
    var frameObserver = null;
    var attach = function () {
      var frame = document.querySelector('#a2k-member-setup-live-overlay iframe');
      if (!frame) return;
      var hook = function () {
        check();
        try {
          var doc = frame.contentDocument;
          if (doc) {
            /* The iframe document is REPLACED when the real wizard
               loads (the first hook sees the blank about:blank doc),
               so re-observe the CURRENT document every time instead
               of keeping an observer on a dead document. */
            if (frameObserver) frameObserver.disconnect();
            frameObserver = new MutationObserver(check);
            frameObserver.observe(doc.documentElement, { childList: true, subtree: true });
          }
        } catch (e) {}
      };
      if (!frame.dataset.v85Hooked) {
        frame.dataset.v85Hooked = '1';
        frame.addEventListener('load', hook);
      }
      hook();
    };
    new MutationObserver(function () { attach(); check(); })
      .observe(document.documentElement, { childList: true, subtree: true });
    attach();
  }

  /* ================= wiring ================= */

  var currentMemberRef = null;
  function enhanceProfile(sel) {
    try {
      if (!sel) return;
      addLocationFact(sel, sel.dataset.v85MemberId || currentMemberRef);
      addReportAction(sel, sel.dataset.v85MemberId || currentMemberRef);
      if (!sel.dataset.v85Watched) {
        sel.dataset.v85Watched = '1';
        new MutationObserver(function () { enhanceProfile(sel); })
          .observe(sel, { childList: true, subtree: true });
      }
    } catch (e) {}
  }

  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.classList && node.classList.contains('a2k-d-selected-member')) enhanceProfile(node);
    if (node.querySelector) {
      enhanceProfile(node.querySelector('.a2k-d-selected-member'));
    }
    if (node.id === 'member-privacy-summary' || (node.querySelector && node.querySelector('#member-privacy-summary'))) {
      addBadgesSwitch();
    }
    if (node.id === 'auth-profile' || (node.querySelector && node.querySelector('#auth-profile'))) {
      addOwnLocationRow();
    }
  }

  /* Capture the profile ref so the Report action can resolve slug -> id. */
  if (typeof window.a2kOpenMemberProfile === 'function' && !window.__v85ProfileWrapped) {
    window.__v85ProfileWrapped = true;
    var origOpen = window.a2kOpenMemberProfile;
    window.a2kOpenMemberProfile = function (ref, source) {
      currentMemberRef = ref || null;
      return origOpen.apply(this, arguments);
    };
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      Array.prototype.forEach.call(m.addedNodes, scan);
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan(document.documentElement);
  addOwnLocationRow();
  addBadgesSwitch();
  watchSetupIframe();
  wrapModeration();
  new MutationObserver(function () {
    addOwnLocationRow();
    addBadgesSwitch();
    wrapModeration();
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
