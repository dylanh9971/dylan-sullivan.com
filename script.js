// ---- footer year ----
document.getElementById("year").textContent = new Date().getFullYear();

// ---- dark / light theme toggle ----
// (the page always loads light — see the inline <head> script; the toggle
//  only changes the theme for the current page view, it isn't remembered)
(function () {
  const toggle = document.querySelector(".theme-toggle");
  if (!toggle) return;

  const root = document.documentElement;
  const sync = () => toggle.setAttribute("aria-pressed", root.dataset.theme === "dark");
  sync();

  toggle.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    const apply = () => {
      root.dataset.theme = next;
      sync();
    };
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (document.startViewTransition && !reduce) {
      document.startViewTransition(apply);
    } else {
      apply();
    }
  });
})();

// ---- word rotator ----
// The mask is resized to whatever phrase is showing, so the line stays centred
// instead of the short phrases rattling around inside the longest one's width.
(function () {
  const list = document.querySelector(".rotator__list");
  if (!list) return;

  const mask = list.parentElement;
  const band = mask.closest(".rotator");
  const words = Array.from(list.querySelectorAll(".rotator__word"));
  const last = words.length - 1;        // the final word repeats the first
  if (last < 1) return;

  let index = 0;
  let paused = false;

  function show(i, animate) {
    const line = words[0].getBoundingClientRect().height;
    list.style.transition = animate ? "" : "none";
    mask.style.transition = animate ? "" : "none";
    list.style.transform = `translateY(${-i * line}px)`;
    mask.style.width = `${Math.ceil(words[i].getBoundingClientRect().width)}px`;
    if (!animate) void list.offsetWidth;  // flush, so the next change animates
  }

  show(0, false);

  band.addEventListener("mouseenter", () => (paused = true));
  band.addEventListener("mouseleave", () => (paused = false));
  window.addEventListener("resize", () => show(index, false));

  setInterval(() => {
    if (paused) return;
    index += 1;
    show(index, true);
    // landed on the duplicate: once it settles, jump silently back to the top
    if (index === last) {
      setTimeout(() => {
        index = 0;
        show(0, false);
      }, 500);
    }
  }, 3000);
})();

// ---- scroll reveal ----
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && revealEls.length) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => revealObserver.observe(el));
}

// ---- project modal + slideshow ----
(function () {
  let openTrigger = null;

  function setupSlider(slider) {
    const track = slider.querySelector(".slider__track");
    const slides = Array.from(slider.querySelectorAll(".slider__slide"));
    const dotsWrap = slider.querySelector(".slider__dots");
    const prev = slider.querySelector(".slider__nav--prev");
    const next = slider.querySelector(".slider__nav--next");
    let index = 0;

    const dots = slides.map((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "slider__dot";
      dot.setAttribute("aria-label", `Go to photo ${i + 1}`);
      dot.addEventListener("click", () => go(i));
      dotsWrap.appendChild(dot);
      return dot;
    });

    function go(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(${-index * 100}%)`;
      dots.forEach((d, di) => d.classList.toggle("is-active", di === index));
    }

    prev.addEventListener("click", () => go(index - 1));
    next.addEventListener("click", () => go(index + 1));
    go(0);
    return { go, reset: () => go(0) };
  }

  document.querySelectorAll(".modal").forEach((modal) => {
    const sliderEl = modal.querySelector("[data-slider]");
    const slider = sliderEl ? setupSlider(sliderEl) : null;

    function close() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      // preventScroll matters for the pricing modal: its CTAs are links to
      // #contact, and yanking focus back to the hero button would scroll the
      // page up and fight the jump the user just asked for
      if (openTrigger) openTrigger.focus({ preventScroll: true });
    }

    function open() {
      if (slider) slider.reset();
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
      const closeBtn = modal.querySelector(".modal__close");
      if (closeBtn) closeBtn.focus();
    }

    modal.__open = open;

    modal.querySelectorAll("[data-close]").forEach((el) =>
      el.addEventListener("click", close)
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) close();
    });
  });

  document.querySelectorAll("[data-modal]").forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      const modal = document.getElementById(trigger.dataset.modal);
      if (!modal || !modal.__open) return;
      e.preventDefault();
      openTrigger = trigger;
      modal.__open();
    });
  });
})();

// ---- back to top ----
// Only appears at the very bottom of the page — it's a way back from the
// footer, not a permanent floating control.
(function () {
  const btn = document.querySelector(".to-top");
  if (!btn) return;

  const doc = document.documentElement;
  // 40px of slack: browser rounding and mobile URL bars mean the numbers
  // rarely land exactly on scrollHeight
  const atBottom = () =>
    window.innerHeight + window.scrollY >= doc.scrollHeight - 40;

  let queued = false;
  function update() {
    queued = false;
    btn.classList.toggle("is-visible", atBottom());
  }
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();

  // The native smooth scroll snaps back in ~400ms no matter how far it has to
  // travel, which reads as a jump cut from the footer. This drives the scroll
  // frame by frame instead, so the whole page visibly runs past on the way up.
  function glideToTop(reduced) {
    const start = window.scrollY;
    if (start <= 0) return;

    // paced off the distance, floored and capped so a short page still glides
    // and a long one never turns into a slog. Under prefers-reduced-motion the
    // trip still animates — enough to keep the page from teleporting — but at a
    // fixed, much shorter duration whatever the distance.
    const duration = reduced ? 450 : Math.min(1600, Math.max(700, start * 0.3));
    const startedAt = performance.now();
    // CSS scroll-behavior: smooth would try to animate every frame's scrollTo
    // and fight this loop, so it's off for the duration
    const prevBehavior = doc.style.scrollBehavior;
    doc.style.scrollBehavior = "auto";
    let frame = 0;

    // easeInOutCubic: leaves the footer gently, glides, settles at the top.
    // The reduced version eases out only — no build-up, it just decelerates in,
    // which reads as a short move rather than a swoop.
    const ease = reduced
      ? (t) => 1 - Math.pow(1 - t, 3)
      : (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    function stop() {
      cancelAnimationFrame(frame);
      doc.style.scrollBehavior = prevBehavior;
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    }

    function step(now) {
      const t = Math.min(1, (now - startedAt) / duration);
      window.scrollTo(0, Math.round(start * (1 - ease(t))));
      if (t < 1) frame = requestAnimationFrame(step);
      else stop();
    }

    // any deliberate scroll input hands control straight back to the user
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    frame = requestAnimationFrame(step);
  }

  btn.addEventListener("click", () => {
    glideToTop(matchMedia("(prefers-reduced-motion: reduce)").matches);
  });
})();
