/* Addicted to Karaoke - site layer V1 (Milo, Nov 23, 2026).
   Adds the site footer Steven asked for: a simple closing band
   under the app on every screen - brand, the site's own tagline,
   and the copyright line. Purely presentational; it creates one
   footer element and touches nothing else. */
(function () {
  'use strict';
  function build() {
    if (document.querySelector('.a2k-site-footer')) return;
    var app = document.querySelector('.app');
    if (!app) return;
    var footer = document.createElement('footer');
    footer.className = 'a2k-site-footer';
    var brand = document.createElement('div');
    brand.className = 'a2k-footer-brand';
    brand.textContent = 'Addicted to Karaoke';
    var tag = document.createElement('p');
    tag.className = 'a2k-footer-tag';
    tag.textContent = 'Built for singers, powered by KJs.';
    var legal = document.createElement('p');
    legal.className = 'a2k-footer-legal';
    legal.textContent = '\u00a9 ' + new Date().getFullYear() + ' Addicted to Karaoke';
    footer.append(brand, tag, legal);
    app.appendChild(footer);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build, { once: true });
  } else {
    build();
  }
})();
