/* Addicted to Karaoke — public member profile, Sophie design layer (V76 fix).
   Presentation only: the site renderer (desktop-members.js,
   window.a2kOpenMemberProfile) still fetches every value and enforces
   every privacy gate. This layer restyles its DOM into the approved
   design — hero with Featured Badges, one cream About / Favorite
   Music card, song and venue cards, and a collapsible Badges card —
   the same restructure pattern as the logged-in profile layers.
   Desktop shell only (the markup it targets exists nowhere else). */
(function () {
  'use strict';

  function enhance(sel) {
    try {
      if (!sel || sel.dataset.v74Done) return;
      var side = sel.querySelector('.a2k-d-public-profile-sidebar');
      var main = sel.querySelector('.a2k-d-public-profile-main');
      if (!side || !main) return;
      sel.dataset.v74Done = '1';

      /* Role line -> chips (same words, pill presentation). */
      var role = side.querySelector('.a2k-d-profile-role');
      if (role && role.textContent.trim()) {
        var parts = role.textContent.split('·').map(function (s) { return s.trim(); }).filter(Boolean);
        role.textContent = '';
        parts.forEach(function (p) {
          var c = document.createElement('span');
          c.className = 'v74-role-chip';
          c.textContent = p;
          role.appendChild(c);
        });
        role.classList.add('v74-role-chips');
      }

      /* About + Interests -> one cream card, two halves. */
      var about = main.querySelector('.a2k-d-profile-about');
      var interests = main.querySelector('.a2k-d-profile-interests');
      if (about && interests) {
        var wrap = document.createElement('div');
        wrap.className = 'v74-cream-card';
        about.parentNode.insertBefore(wrap, about);
        wrap.appendChild(about);
        wrap.appendChild(interests);
        var h = interests.querySelector('h2');
        if (h) h.textContent = 'Favorite Music & Eras';
      }

      /* Songs and Favorite Venues sit side by side, as in the
         design, when both are present — and the Badges card stays
         last. The renderer appends its sections as their data
         arrives, so keep watching: pair the two cards whenever both
         exist, and move the awards card back to the end whenever
         something lands after it. The checks only mutate when the
         state is actually wrong, so the observer cannot loop. */
      var keepOrder = function () {
        var s = main.querySelector(':scope > .a2k-d-profile-songs');
        var v = main.querySelector(':scope > .a2k-d-profile-favorite-venues');
        if (s && v) {
          if (!main.classList.contains('v74-songvenue-grid')) main.classList.add('v74-songvenue-grid');
          if (s.nextElementSibling !== v) s.after(v);
        }
        var aw = main.querySelector(':scope > .a2k-d-public-profile-awards');
        if (aw && main.lastElementChild !== aw) main.appendChild(aw);
      };
      new MutationObserver(keepOrder).observe(main, { childList: true });
      keepOrder();

      /* Badges: first three are featured in the hero; the full awards
         section becomes the collapsible Badges card at the bottom.
         Badges arrive asynchronously, so watch for them. */
      var awards = side.querySelector('.a2k-d-public-profile-awards');
      var badgesBox = awards ? awards.querySelector('.a2k-d-public-badges') : null;
      if (awards && badgesBox) {
        var finishBadges = function () {
          var emblems = Array.prototype.slice.call(badgesBox.querySelectorAll('.a2k-d-illustrated-badge'));
          var h2 = awards.querySelector('h2');
          if (emblems.length) {
            if (h2) h2.textContent = 'Badges (' + emblems.length + ')';
            if (!side.querySelector('.v74-featured')) {
              var feat = document.createElement('div');
              feat.className = 'v74-featured';
              var ft = document.createElement('h3');
              ft.className = 'v74-featured-title';
              ft.textContent = 'Featured Badges';
              feat.appendChild(ft);
              var row = document.createElement('div');
              row.className = 'v74-featured-row';
              emblems.slice(0, 3).forEach(function (e) {
                var clone = e.cloneNode(true);
                var ci = clone.querySelector('img');
                if (ci) ci.loading = 'eager';
                row.appendChild(clone);
              });
              feat.appendChild(row);
              var viewAll = document.createElement('button');
              viewAll.type = 'button';
              viewAll.className = 'v74-view-all-badges';
              viewAll.textContent = 'View all ' + emblems.length + ' badges';
              viewAll.addEventListener('click', function () {
                awards.classList.add('v74-open');
                var t = awards.querySelector('.v74-badges-toggle');
                if (t) t.setAttribute('aria-expanded', 'true');
                try { awards.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
              });
              feat.appendChild(viewAll);
              side.appendChild(feat);
            }
          } else if (h2) {
            h2.textContent = 'Badges';
          }
          /* The full list rides at the bottom of the main column as a
             collapsible card, as in the design. */
          awards.classList.add('v74-badges-card');
          if (!awards.querySelector('.v74-badges-toggle')) {
            var toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'v74-badges-toggle';
            toggle.setAttribute('aria-expanded', 'false');
            toggle.textContent = '⌄';
            toggle.addEventListener('click', function () {
              var open = awards.classList.toggle('v74-open');
              toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
            awards.appendChild(toggle);
          }
          main.appendChild(awards);
        };
        if (badgesBox.querySelector('.a2k-d-illustrated-badge, .a2k-d-profile-muted')) {
          finishBadges();
        } else {
          var mo = new MutationObserver(function () {
            if (badgesBox.querySelector('.a2k-d-illustrated-badge, .a2k-d-profile-muted')) {
              mo.disconnect();
              finishBadges();
            }
          });
          mo.observe(badgesBox, { childList: true });
        }
      }
    } catch (e) {}
  }

  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.classList && node.classList.contains('a2k-d-selected-member')) { enhance(node); return; }
    if (node.querySelector) enhance(node.querySelector('.a2k-d-selected-member'));
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      Array.prototype.forEach.call(m.addedNodes, scan);
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  enhance(document.querySelector('.a2k-d-selected-member'));
})();
