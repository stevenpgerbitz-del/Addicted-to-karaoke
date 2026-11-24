/* Addicted to Karaoke - mobile bottom-nav fix, layer V89 (Milo, Nov 24, 2026).
   The site footer is built by a2k-site-v7.js as the last child of .app,
   AFTER the bottom nav — so on mobile it dangles below the bar in empty
   space instead of scrolling with the page. This layer moves it into the
   currently visible scroll container (home screen / venue screen /
   unified pages) so it slides behind the fixed bar like any other
   content, and keeps it there as screens change. Desktop is untouched:
   the layer only runs while the bottom nav is the mobile one, and moves
   the footer back to .app if the page ever leaves mobile layout. */
(function () {
  'use strict';
  function isMobileNav() {
    return !document.documentElement.classList.contains('a2k-desktop-live')
      && window.matchMedia('(max-width: 1023px)').matches;
  }
  function visibleContainer() {
    var venue = document.getElementById('venue-screen');
    if (venue && !venue.hidden) return venue;
    var home = document.getElementById('home-screen');
    if (home && !home.hidden) return home;
    return document.getElementById('unified-pages');
  }
  function placeFooter() {
    var footer = document.querySelector('.a2k-site-footer');
    if (!footer) return;
    if (!isMobileNav()) {
      var app = document.querySelector('.app');
      if (app && footer.parentElement !== app) app.appendChild(footer);
      return;
    }
    var dest = visibleContainer();
    if (!dest) return;
    if (footer.parentElement !== dest) dest.appendChild(footer);
  }
  function init() {
    placeFooter();
    setTimeout(placeFooter, 1000);
    /* Re-place when screens change (navigate() toggles [hidden]) and
       when the footer itself is created by the V7 layer. */
    new MutationObserver(function () { placeFooter(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['hidden'], subtree: true });
    var app = document.querySelector('.app');
    if (app) {
      new MutationObserver(function () { placeFooter(); })
        .observe(app, { childList: true });
    }
    if (window.matchMedia) {
      window.matchMedia('(max-width: 1023px)').addEventListener('change', placeFooter);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
