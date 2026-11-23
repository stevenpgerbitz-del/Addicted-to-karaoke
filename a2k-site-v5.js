/* Addicted to Karaoke - site layer V5 (Milo, Nov 23, 2026).
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

/* Unified submit flow (Steven, Nov 23, 2026): the Submit Karaoke
   chooser is Step 1 of one wizard. Choosing a branch there sets a
   short-lived flag; the branch wizard consumes it on open and
   counts its steps from 2 (rail shows Choose Type as done), and
   Back on its first step returns to the chooser. Opened any other
   way, each wizard runs standalone exactly as before. */
function a2kWizConsumeFlow(branch) {
  var flow = window.__a2kWizFlow;
  window.__a2kWizFlow = null;
  return !!(flow && flow.branch === branch && Date.now() - flow.ts < 10000);
}
function a2kWizToChooser(dialog) {
  if (dialog.open) dialog.close();
  var chooser = document.getElementById('a2k-submit-choice-dialog');
  if (chooser && !chooser.open) chooser.showModal();
}

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
    var offset = 0;
    function say(message, isError) {
      status.textContent = message || '';
      status.dataset.error = String(!!isError);
    }
    function go(n, focus) {
      current = n;
      sections.forEach(function (section, i) { section.hidden = i !== n - 1; });
      pill.textContent = 'Step ' + (n + offset) + ' of ' + (STEPS.length + offset);
      title.textContent = STEPS[n - 1].title;
      back.hidden = n === 1 && !offset;
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
    back.addEventListener('click', function () {
      say('', false);
      if (current === 1 && offset) { a2kWizToChooser(dialog); return; }
      go(current - 1, true);
    });
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
    new MutationObserver(function () {
      if (!dialog.open) return;
      offset = a2kWizConsumeFlow('venue') ? 1 : 0;
      if (window.__a2kShellMode) window.__a2kShellMode('atk-suggest-venue-dialog', offset);
      go(1, false);
    }).observe(dialog, { attributes: true, attributeFilter: ['open'] });
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

/* Special Karaoke Event wizard: the one-time event form (built by
   special-events.js the first time it is opened) gets the same
   four-step treatment - The Event / Where It Is / When It Happens /
   The Details. Same fields and names, same submit handler; the
   layer only groups the existing labels into steps and gates
   Continue with the handler's own rules, reported through the
   form's own feedback line. */
(function () {
  'use strict';
  var STEPS = [
    { title: 'The Event', names: ['title', 'venue_name'] },
    { title: 'Where It Is', names: ['city', 'state', 'address'] },
    { title: 'When It Happens', names: ['day', 'start', 'end'], note: true },
    { title: 'The Details', names: ['host_name', 'notes', 'source_url'] }
  ];
  function wire(dialog) {
    if (dialog.dataset.wizDone) return;
    var form = dialog.querySelector('#a2k-special-form');
    var save = dialog.querySelector('#a2k-special-save');
    var feedback = dialog.querySelector('#a2k-special-feedback');
    var actions = dialog.querySelector('.a2k-special-actions');
    if (!form || !save || !feedback || !actions) return;
    var labels = {};
    var missing = false;
    STEPS.forEach(function (step) {
      step.names.forEach(function (name) {
        var input = form.querySelector('[name="' + name + '"]');
        var label = input && input.closest('label');
        if (!label) missing = true; else labels[name] = label;
      });
    });
    if (missing) return;
    dialog.dataset.wizDone = '1';

    var head = document.createElement('div');
    head.className = 'a2k-wiz-head';
    var pill = document.createElement('span');
    pill.className = 'a2k-wiz-pill';
    var title = document.createElement('h3');
    title.className = 'a2k-wiz-title';
    head.append(pill, title);
    var intro = form.querySelector('p');
    if (intro) intro.after(head); else form.prepend(head);

    var sections = STEPS.map(function (step, i) {
      var section = document.createElement('section');
      section.className = 'a2k-wiz-step';
      section.dataset.wizStep = String(i + 1);
      step.names.forEach(function (name) { section.appendChild(labels[name]); });
      if (step.note) {
        var note = Array.prototype.find.call(form.querySelectorAll('p'), function (p) {
          return /after midnight/i.test(p.textContent || '');
        });
        if (note) section.appendChild(note);
      }
      form.insertBefore(section, feedback);
      return section;
    });

    var back = document.createElement('button');
    back.type = 'button'; back.className = 'a2k-wiz-back'; back.textContent = 'Back';
    var next = document.createElement('button');
    next.type = 'button'; next.className = 'a2k-wiz-next'; next.textContent = 'Continue';
    actions.insertBefore(back, save);
    actions.insertBefore(next, save);

    var current = 1;
    var offset = 0;
    function say(message) { feedback.textContent = message || ''; }
    function go(n, focus) {
      current = n;
      sections.forEach(function (section, i) { section.hidden = i !== n - 1; });
      pill.textContent = 'Step ' + (n + offset) + ' of ' + (STEPS.length + offset);
      title.textContent = STEPS[n - 1].title;
      back.hidden = n === 1 && !offset;
      next.hidden = n === STEPS.length;
      save.hidden = n !== STEPS.length;
      if (focus) {
        var first = sections[n - 1].querySelector('input, textarea');
        if (first) first.focus();
      }
    }
    function value(name) {
      var el = form.querySelector('[name="' + name + '"]');
      return el ? String(el.value || '').trim() : '';
    }
    function validStep(n) {
      if (n === 1) {
        if (value('title').length < 5) { say('Please give the event a title (at least 5 characters).'); return false; }
        if (value('venue_name').length < 2) { say('Please add the venue name.'); return false; }
      }
      if (n === 2) {
        if (value('city').length < 2) { say('Please add the city.'); return false; }
        if (!/^[A-Za-z]{2}$/.test(value('state'))) { say('Please enter the two-letter state code.'); return false; }
      }
      if (n === 3) {
        if (!value('day') || !value('start') || !value('end')) { say('Please choose the date and the start and end times.'); return false; }
      }
      say('');
      return true;
    }
    next.addEventListener('click', function () { if (validStep(current)) go(current + 1, true); });
    back.addEventListener('click', function () {
      say('');
      if (current === 1 && offset) { a2kWizToChooser(dialog); return; }
      go(current - 1, true);
    });
    form.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;
      var t = event.target;
      if (!t || t.tagName !== 'INPUT' || current >= STEPS.length) return;
      event.preventDefault();
      if (validStep(current)) go(current + 1, true);
    });
    new MutationObserver(function () {
      if (!dialog.open) return;
      offset = a2kWizConsumeFlow('event') ? 1 : 0;
      if (window.__a2kShellMode) window.__a2kShellMode('a2k-special-submit-dialog', offset);
      go(1, false);
    }).observe(dialog, { attributes: true, attributeFilter: ['open'] });
    new MutationObserver(function () {
      back.disabled = save.disabled; next.disabled = save.disabled;
    }).observe(save, { attributes: true, attributeFilter: ['disabled'] });
    offset = a2kWizConsumeFlow('event') ? 1 : 0;
    if (window.__a2kShellMode) window.__a2kShellMode('a2k-special-submit-dialog', offset);
    go(1, false);
  }
  function tryWire() {
    var dialog = document.getElementById('a2k-special-submit-dialog');
    if (dialog) wire(dialog);
  }
  tryWire();
  new MutationObserver(tryWire).observe(document.documentElement, { childList: true, subtree: true });
})();

/* Wizard shell (Steven, Nov 23, 2026): both submit forms get the
   profile setup wizard's chrome - a burgundy rail with the step
   list, a cream content panel, and a footer step count. Purely a
   frame around the step wizards above: it moves the form's own
   children into a content column, adds the rail, and keeps the
   rail + count in sync by watching the step pill's text. */
(function () {
  'use strict';
  var CONFIG = [
    { dialogId: 'atk-suggest-venue-dialog', steps: ['The Venue', 'Where It Is', 'Karaoke Details'], unified: ['Choose Type', 'The Venue', 'Where It Is', 'Karaoke Details'], sub: '.atk-suggest-venue-subtitle' },
    { dialogId: 'a2k-special-submit-dialog', steps: ['The Event', 'Where It Is', 'When It Happens', 'The Details'], unified: ['Choose Type', 'The Event', 'Where It Is', 'When It Happens', 'The Details'], sub: null }
  ];
  function shell(dialog, cfg) {
    if (dialog.dataset.shellDone) return;
    var form = dialog.querySelector('form');
    var pill = dialog.querySelector('.a2k-wiz-pill');
    var actions = dialog.querySelector('.a2k-wiz-next')?.closest('div');
    if (!form || !pill || !actions) return;
    dialog.dataset.shellDone = '1';

    var h2 = form.querySelector('h2');
    var sub = cfg.sub ? form.querySelector(cfg.sub) : form.querySelector('p');

    var rail = document.createElement('aside');
    rail.className = 'a2k-wiz-rail';
    var brand = document.createElement('div');
    brand.className = 'a2k-wiz-rail-brand';
    brand.textContent = 'Addicted to Karaoke';
    var railTitle = document.createElement('div');
    railTitle.className = 'a2k-wiz-rail-title';
    railTitle.textContent = h2 ? h2.textContent : '';
    rail.append(brand, railTitle);
    if (sub) {
      var railSub = document.createElement('p');
      railSub.className = 'a2k-wiz-rail-sub';
      railSub.textContent = sub.textContent;
      rail.append(railSub);
    }
    var list = document.createElement('ol');
    list.className = 'a2k-wiz-rail-steps';
    function buildSteps(names) {
      list.textContent = '';
      names.forEach(function (name) {
        var li = document.createElement('li');
        var dot = document.createElement('span');
        dot.className = 'a2k-wiz-dot';
        var lbl = document.createElement('span');
        lbl.className = 'a2k-wiz-lbl';
        lbl.textContent = name;
        li.append(dot, lbl);
        list.append(li);
      });
    }
    buildSteps(cfg.steps);
    /* If the wizard already counts itself as part of the unified
       flow (its pill total includes the Choose Type step), build
       the rail in unified mode from the start - the shell can be
       built after the wizard's first step was set. */
    var pillTotal = /of (\d+)/.exec(pill.textContent || '');
    var startUnified = pillTotal && parseInt(pillTotal[1], 10) === cfg.unified.length;
    if (startUnified) buildSteps(cfg.unified);
    rail.append(list);
    var foot = document.createElement('div');
    foot.className = 'a2k-wiz-rail-foot';
    foot.textContent = '\u2605 Reviewed before it appears \u2605';
    rail.append(foot);

    /* Move the form's own children into the content column. */
    var main = document.createElement('div');
    main.className = 'a2k-wiz-main';
    Array.prototype.slice.call(form.children).forEach(function (child) { main.append(child); });
    form.append(rail, main);
    if (h2) h2.classList.add('a2k-wiz-moved');
    if (sub) sub.classList.add('a2k-wiz-moved');

    var count = document.createElement('span');
    count.className = 'a2k-wiz-count';
    actions.insertBefore(count, actions.firstChild);

    var total = startUnified ? cfg.unified.length : cfg.steps.length;
    function sync() {
      var m = /(\d+)/.exec(pill.textContent || '');
      var n = m ? parseInt(m[1], 10) : 1;
      count.textContent = 'Step ' + n + ' of ' + total;
      Array.prototype.forEach.call(list.children, function (li, i) {
        li.classList.toggle('is-current', i === n - 1);
        li.classList.toggle('is-done', i < n - 1);
      });
    }
    new MutationObserver(sync).observe(pill, { childList: true, characterData: true, subtree: true });
    sync();
    (window.__a2kShellRegistry = window.__a2kShellRegistry || {})[cfg.dialogId] = {
      setUnified: function (unified) {
        total = unified ? cfg.unified.length : cfg.steps.length;
        buildSteps(unified ? cfg.unified : cfg.steps);
        sync();
      }
    };
  }
  window.__a2kShellMode = function (dialogId, offset) {
    var entry = (window.__a2kShellRegistry || {})[dialogId];
    if (entry) entry.setUnified(!!offset);
  };
  function tryShell() {
    CONFIG.forEach(function (cfg) {
      var dialog = document.getElementById(cfg.dialogId);
      if (dialog) shell(dialog, cfg);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryShell, { once: true });
  } else {
    tryShell();
  }
  new MutationObserver(tryShell).observe(document.documentElement, { childList: true, subtree: true });
})();

/* Chooser as wizard Step 1: the Submit Karaoke chooser dialog gets
   the same shell, its two option buttons become selectable cards,
   and a Continue button fires the chosen card's own click (which
   closes the chooser and opens that branch's wizard, flagged as
   part of the unified flow). If anything expected is missing, the
   original instant-click chooser is left alone. */
(function () {
  'use strict';
  function wire(dialog) {
    if (dialog.dataset.wizDone) return;
    var shellDiv = dialog.querySelector('.a2k-submit-choice-shell');
    var options = dialog.querySelector('.a2k-submit-choice-options');
    var cards = options ? options.querySelectorAll('.a2k-submit-choice-option') : [];
    var closeBtn = dialog.querySelector('.a2k-submit-choice-close');
    var h2 = dialog.querySelector('h2');
    var intro = dialog.querySelector('p');
    if (!shellDiv || !options || cards.length !== 2 || !closeBtn || !h2) return;
    dialog.dataset.wizDone = '1';

    var rail = document.createElement('aside');
    rail.className = 'a2k-wiz-rail';
    var brand = document.createElement('div');
    brand.className = 'a2k-wiz-rail-brand';
    brand.textContent = 'Addicted to Karaoke';
    var railTitle = document.createElement('div');
    railTitle.className = 'a2k-wiz-rail-title';
    railTitle.textContent = 'Submit Karaoke';
    rail.append(brand, railTitle);
    if (intro) {
      var railSub = document.createElement('p');
      railSub.className = 'a2k-wiz-rail-sub';
      railSub.textContent = intro.textContent;
      rail.append(railSub);
      intro.classList.add('a2k-wiz-moved');
    }
    var list = document.createElement('ol');
    list.className = 'a2k-wiz-rail-steps';
    var li = document.createElement('li');
    li.className = 'is-current';
    var dot = document.createElement('span');
    dot.className = 'a2k-wiz-dot';
    var lbl = document.createElement('span');
    lbl.className = 'a2k-wiz-lbl';
    lbl.textContent = 'Choose Type';
    li.append(dot, lbl);
    list.append(li);
    rail.append(list);
    var foot = document.createElement('div');
    foot.className = 'a2k-wiz-rail-foot';
    foot.textContent = '\u2605 Reviewed before it appears \u2605';
    rail.append(foot);
    dialog.insertBefore(rail, shellDiv);
    shellDiv.classList.add('a2k-wiz-main');
    h2.classList.add('a2k-wiz-moved');

    var title = document.createElement('h3');
    title.className = 'a2k-wiz-title';
    title.textContent = 'Choose Type';
    shellDiv.insertBefore(title, options);

    var footer = document.createElement('div');
    footer.className = 'a2k-wiz-actions';
    var count = document.createElement('span');
    count.className = 'a2k-wiz-count';
    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'a2k-wiz-next';
    next.textContent = 'Continue';
    closeBtn.textContent = 'Cancel';
    footer.append(count, closeBtn, next);
    shellDiv.append(footer);

    var choice = 'venue';
    var bypass = false;
    function refresh() {
      cards[0].classList.toggle('is-selected', choice === 'venue');
      cards[1].classList.toggle('is-selected', choice === 'event');
      count.textContent = choice === 'venue' ? 'Step 1 of 4' : 'Step 1 of 5';
    }
    options.addEventListener('click', function (event) {
      if (bypass) return;
      var card = event.target.closest('.a2k-submit-choice-option');
      if (!card) return;
      event.preventDefault();
      event.stopPropagation();
      choice = card === cards[1] ? 'event' : 'venue';
      refresh();
    }, true);
    next.addEventListener('click', function () {
      window.__a2kWizFlow = { branch: choice, ts: Date.now() };
      bypass = true;
      (choice === 'event' ? cards[1] : cards[0]).click();
      bypass = false;
    });
    new MutationObserver(function () { if (dialog.open) refresh(); })
      .observe(dialog, { attributes: true, attributeFilter: ['open'] });
    refresh();
  }
  function tryWire() {
    var dialog = document.getElementById('a2k-submit-choice-dialog');
    if (dialog) wire(dialog);
  }
  tryWire();
  new MutationObserver(tryWire).observe(document.documentElement, { childList: true, subtree: true });
})();
