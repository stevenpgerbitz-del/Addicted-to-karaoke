/*
 A2K PROFILE V66 — companion to a2k-profile-v66.css, 2026-11-22
 Moves two EXISTING elements into the profile identity card so the logged-in
 profile matches the approved V64 preview layout, where the member number /
 member-since line and the FOUNDER badge sit under the stage name:
   #auth-display-membership  (existing element, populated by existing code)
   #auth-founder-badge       (existing element, shown/hidden by existing code)
 Elements keep their IDs, so all existing code that finds them by ID and
 updates their text or visibility keeps working exactly as before.
 If anything is missing, this script does nothing and the elements simply
 stay in the Account card, as they were before V66.
*/
(function () {
  function moveFacts() {
    try {
      var hero = document.querySelector('#auth-profile .member-hero');
      var membership = document.getElementById('auth-display-membership');
      if (!hero || !membership || hero.contains(membership)) return;
      var facts = hero.querySelector('.member-identity-facts');
      if (!facts) {
        facts = document.createElement('div');
        facts.className = 'member-identity-facts';
        var anchor = hero.querySelector('.profile-badge-labels') || hero.querySelector('.member-name-line');
        if (anchor && anchor.parentNode === hero) anchor.insertAdjacentElement('afterend', facts);
        else hero.appendChild(facts);
      }
      facts.appendChild(membership);
      var founder = document.getElementById('auth-founder-badge');
      if (founder) facts.appendChild(founder);
    } catch (e) { /* layout enhancement only — never break the profile */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', moveFacts);
  else moveFacts();
})();
