// Mobile nav toggle
document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
      var expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
    });
  }

  // Donate page: Monthly / One-off tab switcher
  var donateTabs = document.querySelectorAll(".donate-clone-tab");
  if (donateTabs.length) {
    donateTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.getAttribute("data-tab");

        donateTabs.forEach(function (t) {
          t.classList.toggle("active", t === tab);
        });

        document.querySelectorAll(".donate-tab-panel").forEach(function (panel) {
          var isMatch = panel.getAttribute("data-panel") === target;
          panel.hidden = !isMatch;
        });
      });
    });
  }

  // Homepage hero slideshow: auto-rotates, plus arrow/dot controls
  var slideshow = document.getElementById("hero-slideshow");
  if (slideshow) {
    var slides = slideshow.querySelectorAll(".hero-slide");
    var dots = slideshow.querySelectorAll(".hero-slideshow-dots button");
    var current = 0;
    var autoTimer;

    function showSlide(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        slide.classList.toggle("is-active", i === current);
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle("is-active", i === current);
      });
    }

    function nextSlide() { showSlide(current + 1); }
    function prevSlide() { showSlide(current - 1); }

    function startAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(nextSlide, 6000);
    }

    var nextBtn = slideshow.querySelector(".hero-slideshow-nav.next");
    var prevBtn = slideshow.querySelector(".hero-slideshow-nav.prev");
    if (nextBtn) nextBtn.addEventListener("click", function () { nextSlide(); startAuto(); });
    if (prevBtn) prevBtn.addEventListener("click", function () { prevSlide(); startAuto(); });
    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () { showSlide(i); startAuto(); });
    });

    startAuto();
  }

  // Contact form: submits to Formspree (https://formspree.io/f/xqpzjjee) via
  // fetch so the visitor gets an inline success/error message instead of
  // being redirected away. If JS fails to load or fetch is blocked, the
  // form's own action/method attributes still submit it as a normal POST,
  // Formspree just shows its own hosted "thank you" page in that case.
  var form = document.querySelector(".contact-form");
  if (form) {
    var statusEl = form.querySelector(".form-status");
    var submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (statusEl) {
        statusEl.textContent = "Sending...";
        statusEl.className = "form-status form-status-pending";
      }
      if (submitBtn) submitBtn.disabled = true;

      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      })
        .then(function (response) {
          if (response.ok) {
            form.reset();
            if (statusEl) {
              statusEl.textContent =
                "Message sent — JazakAllahu Khayran, we'll be in touch soon.";
              statusEl.className = "form-status form-status-success";
            }
          } else {
            return response.json().then(function (data) {
              var message =
                data && data.errors && data.errors.length
                  ? data.errors.map(function (err) { return err.message; }).join(", ")
                  : "Something went wrong. Please try again or email info@masjidatarbiya.org directly.";
              throw new Error(message);
            });
          }
        })
        .catch(function (err) {
          if (statusEl) {
            statusEl.textContent =
              err && err.message
                ? err.message
                : "Something went wrong. Please try again or email info@masjidatarbiya.org directly.";
            statusEl.className = "form-status form-status-error";
          }
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }
});
