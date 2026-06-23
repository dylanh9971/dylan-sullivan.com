// ---- footer year ----
document.getElementById("year").textContent = new Date().getFullYear();

// ---- show dock only after scrolling past the hero ----
const dock = document.querySelector(".dock");
const hero = document.getElementById("hero");

if (dock && hero && "IntersectionObserver" in window) {
  const heroObserver = new IntersectionObserver(
    ([entry]) => dock.classList.toggle("dock--visible", entry.intersectionRatio < 1),
    { threshold: 1 }
  );
  heroObserver.observe(hero);
}

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

// ---- scroll-spy: highlight the dock hotspot for the section in view ----
const dockHits = Array.from(document.querySelectorAll(".dock__hit"));
const sections = dockHits
  .map((hit) => document.getElementById(hit.dataset.target))
  .filter(Boolean);

function setActive(id) {
  dockHits.forEach((hit) =>
    hit.classList.toggle("is-active", hit.dataset.target === id)
  );
}

if ("IntersectionObserver" in window && sections.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );
  sections.forEach((section) => observer.observe(section));
} else {
  dockHits.forEach((hit) =>
    hit.addEventListener("click", () => setActive(hit.dataset.target))
  );
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
      if (openTrigger) openTrigger.focus();
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
