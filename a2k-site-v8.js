/* Addicted to Karaoke — site layer V8: empty-state polish (Milo, Nov 24, 2026).
   Directories with only 1-2 cards get a note tile that fills the rest of
   the grid row, plus a small closing ornament under the grid — so a
   directory with one host/member reads as finished, not abandoned.
   Presentation only: the note states how the directory is populated
   (member choice + directory opt-in), which is exactly what the
   renderers filter on; it adds no data, links, or buttons, and it never
   touches a count (it is deliberately NOT an .a2k-d-directory-card, so
   V84's host count and the Members draw() count ignore it).
   Desktop only: below 1024px the note is removed, so mobile is untouched. */
(function () {
  'use strict';

  var COPY = {
    hosts: {
      heading: 'About this directory',
      body: 'Hosts appear here when a member chooses KJ / Host in their profile and opts in to the directory.'
    },
    members: {
      heading: 'About this directory',
      body: 'Members appear here as they join and choose to be listed in the directory.'
    }
  };

  function isDesktop() {
    return typeof window.matchMedia === 'function' &&
      window.matchMedia('(min-width: 1024px)').matches;
  }
  function text(el) { return el ? (el.textContent || '').trim() : ''; }

  function modeOf(shell) {
    var h1 = shell.querySelector(':scope > h1');
    if (!h1) {
      /* Members directory: heading lives inside .a2k-d-members-main. */
      h1 = shell.querySelector('.a2k-d-members-main > h1');
    }
    if (text(h1) === 'KJ Hosts' && shell.querySelector(':scope > .a2k-d-directory-grid')) return 'hosts';
    if (text(h1) === 'Members' && shell.querySelector('.a2k-d-members-grid')) return 'members';
    return null;
  }

  function buildNote(mode) {
    var note = document.createElement('article');
    note.className = 'v8-dir-note';
    note.setAttribute('role', 'note');
    var star = document.createElement('span');
    star.className = 'v8-dir-note-star';
    star.setAttribute('aria-hidden', 'true');
    star.textContent = '\u2605';
    var heading = document.createElement('h3');
    heading.textContent = COPY[mode].heading;
    var body = document.createElement('p');
    body.textContent = COPY[mode].body;
    note.append(star, heading, body);
    return note;
  }

  function buildClose() {
    var close = document.createElement('div');
    close.className = 'v8-dir-close';
    close.setAttribute('aria-hidden', 'true');
    var star = document.createElement('span');
    star.textContent = '\u2605';
    close.append(star);
    return close;
  }

  function sync(shell) {
    try {
      var mode = modeOf(shell);
      if (!mode) return;
      var grid = shell.querySelector(mode === 'hosts' ? ':scope > .a2k-d-directory-grid' : '.a2k-d-members-grid');
      /* Members directory: the grid lives inside .a2k-d-members-main;
         the ornament belongs there, right after the grid. Hosts: the
         grid is a direct child of the shell. */
      var closeParent = mode === 'members'
        ? shell.querySelector('.a2k-d-members-main') : shell;
      if (!grid || !closeParent) return;
      var note = grid.querySelector(':scope > .v8-dir-note');
      var close = closeParent.querySelector(':scope > .v8-dir-close');
      if (!isDesktop()) {
        if (note) note.remove();
        if (close) close.remove();
        return;
      }
      var cards = Array.prototype.filter.call(
        grid.querySelectorAll(':scope > article'), function (el) {
          return !el.classList.contains('v8-dir-note') && !el.hidden;
        });
      var visible = cards.length;
      if (visible < 1 || visible > 2) {
        if (note) note.remove();
        if (close) close.remove();
        return;
      }
      if (!note) {
        note = buildNote(mode);
        grid.appendChild(note);
      }
      /* Fill the row: the note spans whatever columns the cards leave. */
      var cols = 1;
      try {
        cols = window.getComputedStyle(grid).gridTemplateColumns.split(' ').length || 1;
      } catch (e) {}
      var span = Math.max(1, cols - visible);
      note.style.gridColumn = 'span ' + span;
      if (!close) {
        close = buildClose();
        if (grid.nextSibling) closeParent.insertBefore(close, grid.nextSibling);
        else closeParent.appendChild(close);
      }
    } catch (e) {}
  }

  function watch() {
    var shell = document.getElementById('a2k-d-directory');
    if (!shell || shell.dataset.v8Watched) return;
    shell.dataset.v8Watched = '1';
    var run = function () { sync(shell); };
    new MutationObserver(run).observe(shell, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['hidden']
    });
    if (window.matchMedia) {
      var mq = window.matchMedia('(min-width: 1024px)');
      if (mq.addEventListener) mq.addEventListener('change', run);
      else if (mq.addListener) mq.addListener(run);
    }
    run();
    /* The renderers build async; re-check shortly after load. */
    window.setTimeout(run, 600);
    window.setTimeout(run, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch, { once: true });
  } else {
    watch();
  }
})();
