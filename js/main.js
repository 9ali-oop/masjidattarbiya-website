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


  // Post-payment thank-you. GoCardless returns donors to the site with
  // ?thanks=oneoff or ?thanks=monthly, so this runs on whichever page it lands on.
  var thanks = new URLSearchParams(window.location.search).get("thanks");
  if (thanks) {
    var messages = {
      oneoff: "Thank you for your donation. May Allah accept it and reward you abundantly.",
      monthly: "Your monthly donation is all set up - may Allah make it an ongoing sadaqah jariyah for you."
    };
    var banner = document.createElement("div");
    banner.className = "thanks-banner";
    banner.setAttribute("role", "status");
    banner.innerHTML = '<strong>JazakAllahu Khayran!</strong><span></span>';
    banner.querySelector("span").textContent =
      messages[thanks] || "Thank you for your donation. May Allah accept it and reward you abundantly.";
    document.body.insertBefore(banner, document.body.firstChild);
    // Clear the parameter so a refresh does not show the banner again.
    if (window.history.replaceState) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  // Donate page: Monthly / One-off tab switcher
  var donateTabs = document.querySelectorAll(".donate-clone-tab");
  if (donateTabs.length) {
    donateTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.getAttribute("data-tab");

        donateTabs.forEach(function (t) {
          var isCurrent = t === tab;
          t.classList.toggle("active", isCurrent);
          t.setAttribute("aria-selected", isCurrent ? "true" : "false");
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

    if (slides.length > 1) { startAuto(); }
  }


});
