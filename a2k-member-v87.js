/* A2K MEMBER V87 — Founder pill removal (Steven, Nov 24, 2026).
   The gold "★ Founder ★" pill is gone everywhere, including the Founder's
   own profile. The renders were removed from a2k-profile-v77.js (hero bar),
   a2k-management-v1.js (portal pill), user-management-v2.js (member-card
   pill) and review-experience.js (review-author pill); a2k-member-v87.css
   hides the elements as a safety net. The "Super Administrator" database
   badge (profile_badge_awards) is untouched and still shows for Super Admins.
   This script only marks the layer present and re-hides any pill element
   that appears (for example from a stale cached module). */
(function () {
  'use strict';
  window.__a2kMemberV87 = true;
  var SEL = '#auth-founder-badge,#member-founder,#mgmt-founder-pill,.atk-review-founder,.mg2-badge-founder';
  function sweep() {
    try {
      var els = document.querySelectorAll(SEL);
      for (var i = 0; i < els.length; i++) {
        els[i].style.setProperty('display', 'none', 'important');
      }
    } catch (e) {}
  }
  function init() {
    sweep();
    try {
      var obs = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          if (muts[i].addedNodes && muts[i].addedNodes.length) { sweep(); return; }
        }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
