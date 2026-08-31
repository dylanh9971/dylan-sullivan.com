/* ==========================================================================
   Dylan Sullivan — portfolio
   Behaviour for index.html — a single document with two views (Work / About)

   The layout is CSS-only now (fluid grid + clamp), so there is no canvas
   scaling step here any more — nothing to recalculate on resize.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. Dark mode toggle (moon button)
     ---------------------------------------------------------------------- */
  var moonBtn = document.querySelector('.moon-btn');
  var THEME_KEY = 'ds-theme';

  if (moonBtn) {
    /* The class itself is set by the inline script in <head> — before the body
       paints — so all this has to do is keep the button in step with it. */
    var syncButton = function (isDark) {
      moonBtn.setAttribute('aria-pressed', String(isDark));
      moonBtn.setAttribute('aria-label', isDark ? 'Switch to light mode'
                                                : 'Switch to dark mode');
    };

    syncButton(document.documentElement.classList.contains('dark'));

    moonBtn.addEventListener('click', function () {
      var isDark = document.documentElement.classList.toggle('dark');
      syncButton(isDark);
      try {
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
      } catch (err) { /* storage blocked: the choice just won't outlive the page */ }
    });
  }

  /* ------------------------------------------------------------------------
     1c. View switching + avatar flip

     Work and About live in one document, so switching is just a class on
     <html> — and the flip is a single continuous animation instead of two
     halves stitched across a page load. The photo swaps at the midpoint,
     while the circle is edge-on and the change can't be seen.
     ---------------------------------------------------------------------- */
  var VIEWS = {
    work:  { title: 'Dylan Sullivan — Portfolio', img: 'images/Headshot.webp' },
    about: { title: 'Dylan Sullivan — About', img: 'images/aboutme.webp'  }
  };
  var HALF_FLIP_MS = 260;   // matches the CSS out-duration
  var FLIP_IN_MS   = 340;   // matches the CSS in-duration

  var docEl    = document.documentElement;
  var avatarEl = document.querySelector('.avatar');
  var avatarImg = avatarEl && avatarEl.querySelector('img');
  var viewLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__link[data-view]'));

  function currentView() {
    return docEl.classList.contains('view-about') ? 'about' : 'work';
  }

  function applyView(name) {
    docEl.classList.toggle('view-about', name === 'about');
    document.title = VIEWS[name].title;

    if (avatarImg && avatarImg.getAttribute('src') !== VIEWS[name].img) {
      avatarImg.setAttribute('src', VIEWS[name].img);
    }

    viewLinks.forEach(function (link) {
      if (link.getAttribute('data-view') === name) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function clearFlip() {
    if (!avatarEl) return;
    avatarEl.classList.remove('is-flip-out-fwd', 'is-flip-out-back',
                              'is-flip-in-fwd',  'is-flip-in-back');
  }

  var flipping = false;

  function goToView(name, animate) {
    if (name === currentView() || flipping) return;

    if (!animate || !avatarEl) {
      applyView(name);
      return;
    }

    var fwd = (name === 'about');
    flipping = true;
    clearFlip();
    avatarEl.classList.add(fwd ? 'is-flip-out-fwd' : 'is-flip-out-back');

    setTimeout(function () {
      applyView(name);                       // swap while edge-on
      clearFlip();
      avatarEl.classList.add(fwd ? 'is-flip-in-fwd' : 'is-flip-in-back');

      /* Timed rather than waiting on animationend: that event never arrives if
         the animation is suppressed (hidden element, reduced motion, a
         background tab), and `flipping` would latch on and block every later
         switch. */
      setTimeout(function () {
        clearFlip();
        flipping = false;
      }, FLIP_IN_MS);
    }, HALF_FLIP_MS);
  }

  viewLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();

      var name = link.getAttribute('data-view');
      if (name === currentView()) return;

      // Keep the hash in step so Back/Forward and shared links both work.
      if (location.hash !== '#' + name) {
        location.hash = name;                // fires hashchange -> goToView
      } else {
        goToView(name, true);
      }
    });
  });

  window.addEventListener('hashchange', function () {
    goToView(location.hash === '#about' ? 'about' : 'work', true);
  });

  // The head script already picked the starting view; sync the rest of the UI
  // (title, avatar photo, nav state) to match it without animating.
  if (avatarEl) applyView(currentView());

  /* ------------------------------------------------------------------------
     1c-b. Greeting wave

     Splits the greeting into per-letter spans so CSS can run a staggered bob
     across them. Only .greeting__text is split — the "wave:" label stays put.
     ---------------------------------------------------------------------- */
  var greeting = document.querySelector('.greeting');
  var greetingText = greeting && greeting.querySelector('.greeting__text');

  if (greetingText && !greetingText.querySelector('.greeting__char')) {
    var text = greetingText.textContent.replace(/\s+/g, ' ').trim();

    // A letter-per-span heading gets spelled out by screen readers, so the
    // whole phrase goes on the <h1> and the pieces are hidden from them.
    greeting.setAttribute('aria-label',
      greeting.textContent.replace(/\s+/g, ' ').trim());
    greetingText.textContent = '';

    var n = 0;
    text.split(' ').forEach(function (word, w, words) {
      var wordEl = document.createElement('span');
      wordEl.className = 'greeting__word';
      wordEl.setAttribute('aria-hidden', 'true');

      word.split('').forEach(function (ch) {
        var charEl = document.createElement('span');
        charEl.className = 'greeting__char';
        charEl.style.setProperty('--i', n++);
        charEl.textContent = ch;
        wordEl.appendChild(charEl);
      });

      greetingText.appendChild(wordEl);
      if (w < words.length - 1) {
        greetingText.appendChild(document.createTextNode(' '));
      }
    });
  }

  /* ------------------------------------------------------------------------
     1d. Scroll reveal (About view)

     Each tagged element fades and rises as it scrolls into view; the polaroids
     get a longer travel and an overshoot so they pop. One-shot: once something
     has arrived it is unobserved and stays put.
     ---------------------------------------------------------------------- */
  var revealTargets = Array.prototype.slice.call(document.querySelectorAll(
    '.view--about .intro-line, .view--about .bio, ' +
    '.view--about .photo-row__captions, .view--about .frame, ' +
    '.view--about .essay__title, .view--about .essay p, ' +
    '.view--about .stack__item'));

  if (revealTargets.length) {
    revealTargets.forEach(function (el) {
      var pop = el.classList.contains('frame');
      el.classList.add('reveal');
      if (pop) el.classList.add('reveal--pop');

      /* Stagger runs across each row of polaroids (and each icon cluster)
         rather than the whole page, so every group starts its cascade fresh. */
      if (pop || el.classList.contains('stack__item')) {
        var sibs = Array.prototype.slice.call(el.parentNode.children);
        el.style.setProperty('--r', sibs.indexOf(el));
      }
    });

    /* Longest of a comma-separated time list, in ms. */
    function longestMs(list) {
      return Math.max.apply(null, String(list).split(',').map(function (v) {
        return parseFloat(v) || 0;
      })) * 1000;
    }

    var show = function (el) {
      el.classList.add('is-visible');

      /* Once the entrance has run, strip the reveal classes entirely. They
         carry a staggered transition-delay, and leaving it in place makes it
         apply to every LATER transition on the element too — the polaroid
         hover tilt was inheriting up to 210ms of lag from its position in the
         row. Removing the classes lands on the same visual state (opacity 1,
         no transform) with no timing left behind. */
      var cs = getComputedStyle(el);
      var done = longestMs(cs.transitionDelay) + longestMs(cs.transitionDuration) + 80;

      setTimeout(function () {
        el.classList.remove('reveal', 'reveal--pop', 'is-visible');
        el.style.removeProperty('--r');
      }, done);
    };

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          show(entry.target);
          io.unobserve(entry.target);      // one-shot
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

      revealTargets.forEach(function (el) { io.observe(el); });
    } else {
      // No observer: show everything rather than hide it forever.
      revealTargets.forEach(show);
    }
  }

  /* ------------------------------------------------------------------------
     2. Headline bounce-in

     Splits the two headline lines into per-letter spans and lets CSS stagger
     them in. Plays on every load of the home page, so a refresh always
     replays it.
     ---------------------------------------------------------------------- */
  var headline = document.querySelector('.headline');

  function splitHeadline(root) {
    var lines = root.querySelectorAll('.headline__1, .headline__2');
    var index = 0;

    /* Screen readers would spell out a letter-per-span headline, so the whole
       sentence goes on the h1 as a label and the pieces are hidden from them. */
    root.setAttribute('aria-label', root.textContent.replace(/\s+/g, ' ').trim());

    Array.prototype.forEach.call(lines, function (line) {
      var words = line.textContent.trim().split(/\s+/);

      line.setAttribute('aria-hidden', 'true');
      line.textContent = '';

      words.forEach(function (word, w) {
        var wordEl = document.createElement('span');
        wordEl.className = 'headline__word';

        word.split('').forEach(function (ch) {
          var charEl = document.createElement('span');
          charEl.className = 'headline__char' +
            (ch === '.' ? ' headline__char--stop' : '');
          charEl.style.setProperty('--i', index++);
          charEl.textContent = ch;
          wordEl.appendChild(charEl);
        });

        line.appendChild(wordEl);
        if (w < words.length - 1) line.appendChild(document.createTextNode(' '));
      });
    });
  }

  if (headline) {
    splitHeadline(headline);

    var started = false;

    function play() {
      if (started) return;
      started = true;
      headline.classList.add('headline--animate');
    }

    /* Waiting for the webfont stops the swap reflowing the letters mid-bounce,
       but it must never be the ONLY trigger: if fonts.googleapis.com is slow,
       blocked, or offline, document.fonts.ready stays pending for as long as
       the request takes, and the animation would fire minutes later — or, to
       anyone actually looking at the page, never. So it is a race. */
    setTimeout(play, 600);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(play, play);
    } else {
      play();
    }
  }

  /* ------------------------------------------------------------------------
     2b. Staged reveal of everything below the headline

     CSS hides the sub-lines, the work section and the footer while
     <html> has .js-stage; adding .is-revealed fades them up. The wait is
     measured off the letters themselves rather than hard-coded, so changing
     the stagger or duration in the CSS keeps this in step automatically.
     ---------------------------------------------------------------------- */
  var root = document.documentElement;

  // Pause between the last letter landing and the content below fading up.
  var REVEAL_BEAT = 150;

  function reveal() { root.classList.add('is-revealed'); }

  if (root.className.indexOf('js-stage') > -1) {
    // Whatever happens, never leave the page hidden.
    var safety = setTimeout(reveal, 6000);

    var scheduleReveal = function () {
      var chars = headline ? headline.querySelectorAll('.headline__char') : [];
      var endsAt = 0;

      Array.prototype.forEach.call(chars, function (charEl) {
        var s = getComputedStyle(charEl);
        var done = (parseFloat(s.animationDelay) || 0) +
                   (parseFloat(s.animationDuration) || 0);
        if (done > endsAt) endsAt = done;
      });

      clearTimeout(safety);
      setTimeout(reveal, endsAt * 1000 + REVEAL_BEAT);
    };

    if (headline) {
      // Measure once the animation is actually on the letters.
      var waitForPlay = setInterval(function () {
        if (headline.className.indexOf('headline--animate') > -1) {
          clearInterval(waitForPlay);
          scheduleReveal();
        }
      }, 50);
    } else {
      reveal();
    }
  }

  /* ------------------------------------------------------------------------
     3. Project filters (Work view)
     Pills toggle on and off. With nothing selected, every project shows.
     ---------------------------------------------------------------------- */
  var filters  = Array.prototype.slice.call(document.querySelectorAll('.filter'));
  var projects = Array.prototype.slice.call(document.querySelectorAll('.project'));

  function applyFilters() {
    var active = filters
      .filter(function (btn) { return btn.getAttribute('aria-pressed') === 'true'; })
      .map(function (btn) { return btn.dataset.filter; });

    projects.forEach(function (project) {
      var tags = (project.dataset.tags || '').split(/\s+/);
      var show = active.length === 0 || active.every(function (tag) {
        return tags.indexOf(tag) !== -1;
      });
      project.hidden = !show;
    });
  }

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pressed = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!pressed));
      applyFilters();
    });
  });

  /* ------------------------------------------------------------------------
     4. Quick menu — the plus button spins into an X and drops the panel
     ---------------------------------------------------------------------- */
  var menu    = document.querySelector('.menu');
  var plusBtn = menu && menu.querySelector('.plus-btn');

  if (menu && plusBtn) {
    var setMenu = function (open) {
      menu.classList.toggle('is-open', open);
      plusBtn.setAttribute('aria-expanded', String(open));
      plusBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };

    var isOpen = function () { return menu.classList.contains('is-open'); };

    plusBtn.addEventListener('click', function (e) {
      e.stopPropagation();          // don't immediately hit the outside-click close
      setMenu(!isOpen());
    });

    // Clicking anywhere else dismisses it — but not clicks inside the panel,
    // or a link would be cancelled before it navigated.
    document.addEventListener('click', function (e) {
      if (isOpen() && !menu.contains(e.target)) setMenu(false);
    });

    // Picking something from the menu should dismiss it — a download or a new
    // tab leaves the panel hanging open otherwise.
    menu.addEventListener('click', function (e) {
      if (e.target.closest('.menu__item')) setMenu(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) {
        setMenu(false);
        plusBtn.focus();            // don't strand focus inside a hidden panel
      }
    });
  }

  /* ------------------------------------------------------------------------
     4b. Project tiles that point at a live site

     The card navigates on click; the View button beside it stays the real
     link. Making the card a second <a> to the same URL would list every
     project twice in a screen reader's link menu, so the tile is wired here
     instead and the one link carries the accessible name.
     ---------------------------------------------------------------------- */
  Array.prototype.forEach.call(
    document.querySelectorAll('.project[data-href]'), function (project) {
      var card = project.querySelector('.project__card');
      var href = project.getAttribute('data-href');
      if (!card || !href) return;

      card.addEventListener('click', function () {
        window.open(href, '_blank', 'noopener');
      });
    });

  /* ------------------------------------------------------------------------
     5. Concept viewer

     Opens a full-screen reader when a concept tile is clicked. Everything it
     shows is read off the tiles themselves — title, tags, description and
     thumbnail from the markup, slides from the tile's data-slides list. Adding
     a concept means adding a project tagged "concepts"; adding a slide means
     adding a path to that attribute. Neither needs a change here.
     ---------------------------------------------------------------------- */
  var viewer = document.getElementById('concept-viewer');

  if (viewer) {
    var concepts = Array.prototype.slice.call(
      document.querySelectorAll('.project[data-tags~="concepts"]'));

    var railEl  = viewer.querySelector('.viewer__rail');
    var titleEl = viewer.querySelector('.viewer__title');
    var tagsEl  = viewer.querySelector('.viewer__tags');
    var descEl  = viewer.querySelector('.viewer__desc');
    var slideEl = viewer.querySelector('.viewer__slide');
    var dotsEl  = viewer.querySelector('.viewer__dots');
    var closeEl = viewer.querySelector('.viewer__close');
    var prevEl  = viewer.querySelector('.viewer__arrow--prev');
    var nextEl  = viewer.querySelector('.viewer__arrow--next');

    var current = 0;      // which concept
    var slideAt = 0;      // which slide within it
    var lastFocus = null;

    function read(project) {
      var img = project.querySelector('.project__card img');
      var slides = (project.getAttribute('data-slides') || '')
        .split(',').map(function (p) { return p.trim(); }).filter(Boolean);

      /* The heading holds the project name as loose text and the year in its
         own span, with the middot between them generated in CSS. Reading the
         heading whole would therefore run the two together — "Dara2026" — so
         the name is collected from the text nodes only and the year is taken
         separately. They are rejoined at the point of display. */
      var head = project.querySelector('.project__title');
      var yearEl = head.querySelector('.project__year');

      return {
        title: Array.prototype.filter.call(head.childNodes, function (n) {
                 return n.nodeType === 3;               /* text nodes only */
               }).map(function (n) { return n.textContent; }).join('').trim(),
        year:  yearEl ? yearEl.textContent.trim() : '',
        desc:  project.querySelector('.project__desc').textContent.trim(),
        tags:  Array.prototype.map.call(
                 project.querySelectorAll('.project__tag'),
                 function (t) { return t.textContent.trim(); }),
        thumb: img ? img.getAttribute('src') : '',
        alt:   img ? img.getAttribute('alt') : '',
        slides: slides
      };
    }

    /* The rail never changes, so build it once. */
    concepts.forEach(function (project, i) {
      var data = read(project);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'viewer__railitem';
      btn.setAttribute('aria-label', data.title);
      if (data.thumb) {
        var im = document.createElement('img');
        im.src = data.thumb;
        im.alt = '';
        btn.appendChild(im);
      }
      btn.addEventListener('click', function () { show(i, 0); });
      railEl.appendChild(btn);
    });

    function show(index, slide) {
      current = index;
      slideAt = slide || 0;

      var data = read(concepts[current]);

      titleEl.textContent = data.year
        ? data.title + ' · ' + data.year
        : data.title;
      descEl.textContent = data.desc;

      tagsEl.textContent = '';
      data.tags.forEach(function (t) {
        var el = document.createElement('span');
        el.className = 'viewer__tag';
        el.textContent = t;
        tagsEl.appendChild(el);
      });

      viewer.classList.toggle('is-empty', data.slides.length === 0);

      if (data.slides.length) {
        slideEl.src = data.slides[slideAt];
        slideEl.alt = data.alt || data.title;
      }

      dotsEl.textContent = '';
      if (data.slides.length > 1) {
        data.slides.forEach(function (_, i) {
          var d = document.createElement('button');
          d.type = 'button';
          d.className = 'viewer__dot';
          d.setAttribute('aria-label', 'Slide ' + (i + 1));
          d.setAttribute('aria-current', String(i === slideAt));
          d.addEventListener('click', function () { show(current, i); });
          dotsEl.appendChild(d);
        });
      }

      // a single slide needs no arrows
      var many = data.slides.length > 1;
      prevEl.hidden = nextEl.hidden = !many;

      Array.prototype.forEach.call(railEl.children, function (b, i) {
        b.setAttribute('aria-current', String(i === current));
      });
    }

    function step(by) {
      var slides = read(concepts[current]).slides;
      if (slides.length < 2) return;
      show(current, (slideAt + by + slides.length) % slides.length);
    }

    function open(index) {
      lastFocus = document.activeElement;
      show(index, 0);
      viewer.hidden = false;
      document.body.style.overflow = 'hidden';     // don't scroll the page behind
      // one frame later, so the fade has a state to start from
      requestAnimationFrame(function () { viewer.classList.add('is-open'); });
      closeEl.focus();
    }

    function close() {
      viewer.classList.remove('is-open');
      viewer.hidden = true;
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    concepts.forEach(function (project, i) {
      var card = project.querySelector('.project__card');
      if (card) card.addEventListener('click', function () { open(i); });
    });

    closeEl.addEventListener('click', close);
    prevEl.addEventListener('click', function () { step(-1); });
    nextEl.addEventListener('click', function () { step(1); });

    document.addEventListener('keydown', function (e) {
      if (viewer.hidden) return;
      if (e.key === 'Escape')     { close(); }
      if (e.key === 'ArrowLeft')  { step(-1); }
      if (e.key === 'ArrowRight') { step(1); }
    });
  }

  /* ------------------------------------------------------------------------
     6. Copy the email address

     The address is only ever in the markup's data-copy, so it is written in
     one place and never drifts between the button and the clipboard.
     ---------------------------------------------------------------------- */
  var copyBtn = document.querySelector('.copy-btn');

  if (copyBtn) {
    var copyLabel  = copyBtn.querySelector('.copy-btn__label');
    var copyStatus = document.querySelector('.copy-btn__status');
    var restText   = copyLabel ? copyLabel.textContent : 'Email';
    var restore;

    /* navigator.clipboard exists only in a secure context, so a page opened
       straight off the filesystem has to fall back to the old selection-based
       copy. Returns whether the address actually made it across. */
    function toClipboard(text) {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text).then(function () { return true; },
                                                        function () { return false; });
      }

      var field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      /* Off-screen rather than hidden: display:none and visibility:hidden are
         both unselectable, and a selection is what execCommand copies. */
      field.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(field);
      field.select();

      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(field);
      return Promise.resolve(ok);
    }

    copyBtn.addEventListener('click', function () {
      var address = copyBtn.getAttribute('data-copy') || '';

      toClipboard(address).then(function (ok) {
        clearTimeout(restore);

        /* If the copy failed there is nothing on the clipboard to talk about,
           so the address itself is shown for the reader to take manually. */
        if (copyLabel) copyLabel.textContent = ok ? 'Copied' : address;
        copyBtn.classList.toggle('is-copied', ok);
        if (copyStatus) {
          copyStatus.textContent = ok
            ? address + ' copied to your clipboard'
            : 'Copy failed. My address is ' + address;
        }

        restore = setTimeout(function () {
          if (copyLabel) copyLabel.textContent = restText;
          copyBtn.classList.remove('is-copied');
          if (copyStatus) copyStatus.textContent = '';
        }, ok ? 2000 : 6000);
      });
    });
  }

})();
