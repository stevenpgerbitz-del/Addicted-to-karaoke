/* Addicted to Karaoke - site layer V2 (Milo, Nov 23, 2026).
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

/* Suggest-a-Venue wizard (Steven, Nov 23, 2026): the guest venue
   form becomes three steps - The Venue / Where It Is / Karaoke
   Details. Presentation and step gating only: the same fields,
   the same validation rules, and the site's own submit handler
   still does the submitting. If any expected element is missing,
   the original one-page form is left completely untouched. */
(function () {
  'use strict';
  var STEPS = [
    { title: 'The Venue', ids: ['atk-suggest-name', 'atk-suggest-city', 'atk-suggest-state'] },
    { title: 'Where It Is', ids: ['atk-suggest-address', 'atk-suggest-zip'] },
    { title: 'Karaoke Details', ids: ['atk-suggest-details'] }
  ];
  function setup() {
    var form = document.getElementById('atk-suggest-venue-form');
    var fields = form && form.querySelector('.atk-suggest-venue-fields');
    var dialog = document.getElementById('atk-suggest-venue-dialog');
    var submitBtn = document.getElementById('atk-suggest-venue-submit');
    var status = document.getElementById('atk-suggest-venue-status');
    if (!form || !fields || !dialog || !submitBtn || !status) return;
    var labels = {};
    var missing = false;
    STEPS.forEach(function (step) {
      step.ids.forEach(function (id) {
        var input = document.getElementById(id);
        var label = input && input.closest('label');
        if (!label) missing = true; else labels[id] = label;
      });
    });
    if (missing) return;

    /* Header: progress pill + step title, in the song wizard's voice. */
    var head = document.createElement('div');
    head.className = 'a2k-wiz-head';
    var pill = document.createElement('span');
    pill.className = 'a2k-wiz-pill';
    var title = document.createElement('h3');
    title.className = 'a2k-wiz-title';
    head.append(pill, title);
    fields.parentNode.insertBefore(head, fields);

    /* Move the real labels into step sections (nodes are moved,
       never cloned - ids, values and listeners are preserved). */
    var sections = STEPS.map(function (step, i) {
      var section = document.createElement('section');
      section.className = 'a2k-wiz-step';
      section.dataset.wizStep = String(i + 1);
      step.ids.forEach(function (id) { section.appendChild(labels[id]); });
      fields.appendChild(section);
      return section;
    });

    /* Navigation buttons join the form's own action row. */
    var actions = form.querySelector('.atk-suggest-venue-actions');
    var back = document.createElement('button');
    back.type = 'button'; back.className = 'a2k-wiz-back'; back.textContent = 'Back';
    var next = document.createElement('button');
    next.type = 'button'; next.className = 'a2k-wiz-next'; next.textContent = 'Continue';
    actions.insertBefore(back, submitBtn);
    actions.insertBefore(next, submitBtn);

    var current = 1;
    function say(message, isError) {
      status.textContent = message || '';
      status.dataset.error = String(!!isError);
    }
    function go(n, focus) {
      current = n;
      sections.forEach(function (section, i) { section.hidden = i !== n - 1; });
      pill.textContent = 'Step ' + n + ' of ' + STEPS.length;
      title.textContent = STEPS[n - 1].title;
      back.hidden = n === 1;
      next.hidden = n === STEPS.length;
      submitBtn.hidden = n !== STEPS.length;
      if (focus) {
        var first = sections[n - 1].querySelector('input, textarea');
        if (first) first.focus();
      }
    }
    function value(id) {
      var el = document.getElementById(id);
      return el ? String(el.value || '').trim() : '';
    }
    function validStep(n) {
      if (n === 1) {
        var name = value('atk-suggest-name'), city = value('atk-suggest-city'),
            state = value('atk-suggest-state').toUpperCase();
        if (name.length < 3 || name.length > 120) { say('Please check the venue name (3\u2013120 characters).', true); return false; }
        if (city.length < 2 || city.length > 90) { say('Please check the city.', true); return false; }
        if (!/^[A-Z]{2}$/.test(state)) { say('Please enter the two-letter state.', true); return false; }
      }
      if (n === 2) {
        var zip = value('atk-suggest-zip');
        if (zip && !/^\d{5}(?:-\d{4})?$/.test(zip)) { say('Please check the ZIP code.', true); return false; }
        if (value('atk-suggest-address').length > 180) { say('Please shorten the street address.', true); return false; }
      }
      say('', false);
      return true;
    }
    next.addEventListener('click', function () { if (validStep(current)) go(current + 1, true); });
    back.addEventListener('click', function () { say('', false); go(current - 1, true); });
    /* Enter inside a text field means Continue, not an early submit. */
    form.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;
      var t = event.target;
      if (!t || t.tagName !== 'INPUT' || current >= STEPS.length) return;
      event.preventDefault();
      if (validStep(current)) go(current + 1, true);
    });
    /* Every fresh open starts back at step 1 (the site's own open()
       resets the form first). */
    new MutationObserver(function () { if (dialog.open) go(1, false); })
      .observe(dialog, { attributes: true, attributeFilter: ['open'] });
    /* Follow the submit button's state: while a submission is in
       flight (or completed), the wizard nav locks too. */
    new MutationObserver(function () {
      var locked = submitBtn.disabled;
      back.disabled = locked; next.disabled = locked;
    }).observe(submitBtn, { attributes: true, attributeFilter: ['disabled'] });
    go(1, false);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();
