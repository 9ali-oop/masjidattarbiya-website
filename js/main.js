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

/* --------------------------------------------------------------------------
   Prayer times.
   Rendered from assets/prayer-times.json, refreshed daily by a GitHub Action
   from the masjid's own Masjidbox timetable. If the data is missing or has no
   entry for today we say so and link to the live Masjidbox page, rather than
   showing times that might be wrong.
   -------------------------------------------------------------------------- */
(function () {
  var mount = document.getElementById("prayer-times");
  if (!mount) return;

  var LIVE = "https://masjidbox.com/prayer-times/masjid-attarbiya";
  var LABELS = {
    fajr: "Fajr", sunrise: "Sunrise", dhuhr: "Dhuhr", jumuah: "Jumu'ah",
    asr: "Asr", maghrib: "Maghrib", isha: "Isha"
  };
  var ORDER = ["fajr", "sunrise", "dhuhr", "jumuah", "asr", "maghrib", "isha"];

  function pad(n) { return String(n).padStart(2, "0"); }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function prettyDate(iso) {
    var p = iso.split("-");
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
  }

  function toMinutes(hm) {
    var p = hm.split(":");
    return Number(p[0]) * 60 + Number(p[1]);
  }

  function fallback(message) {
    mount.innerHTML = '<p class="prayer-fallback">' + message +
      ' <a href="' + LIVE + '" target="_blank" rel="noopener">View live prayer times</a>.</p>';
  }

  function startClock(el) {
    function tick() {
      var d = new Date();
      el.textContent = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    }
    tick();
    setInterval(tick, 1000);
  }

  function nextFriday(days, todayIso) {
    for (var i = 0; i < days.length; i++) {
      if (days[i].date >= todayIso && days[i].times.jumuah) return days[i];
    }
    return null;
  }

  function render(data) {
    var today = todayISO();
    var day = null;
    for (var i = 0; i < data.days.length; i++) {
      if (data.days[i].date === today) { day = data.days[i]; break; }
    }
    if (!day) {
      fallback("Today&rsquo;s prayer times are not available right now.");
      return;
    }

    // Highlight whichever prayer is next today.
    var now = new Date();
    var mins = now.getHours() * 60 + now.getMinutes();
    var next = null;
    for (var j = 0; j < ORDER.length; j++) {
      var k = ORDER[j];
      if (k === "sunrise" || k === "jumuah" || !day.times[k]) continue;
      if (toMinutes(day.times[k]) > mins) { next = k; break; }
    }

    var rows = "";
    ORDER.forEach(function (k) {
      if (!day.times[k]) return;
      var iq = day.iqamah && day.iqamah[k] ? day.iqamah[k] : "&mdash;";
      rows +=
        '<tr' + (k === next ? ' class="is-next"' : '') + (k === "jumuah" ? ' class="is-jumuah"' : '') + '>' +
        '<th scope="row">' + LABELS[k] +
          (k === next ? ' <span class="next-tag">Next</span>' : '') + '</th>' +
        '<td>' + day.times[k] + '</td>' +
        '<td>' + (k === "sunrise" ? "&mdash;" : iq) + '</td>' +
        '</tr>';
    });

    // A standing Jumu'ah line, so people can plan ahead on any day of the week.
    var jum = nextFriday(data.days, today);
    var jumLine = "";
    if (jum && !day.times.jumuah) {
      jumLine = '<p class="prayer-jumuah">Jumu’ah: khutbah ' + jum.times.jumuah +
        (jum.iqamah.jumuah ? ', iqamah ' + jum.iqamah.jumuah : '') + '</p>';
    }

    mount.innerHTML =
      '<div class="prayer-dates">' +
        '<span class="prayer-greg">' + prettyDate(day.date) + '</span>' +
        '<span class="prayer-now">Now <b id="prayer-clock">--:--:--</b></span>' +
      '</div>' +
      (day.hijri ? '<p class="prayer-hijri">' + day.hijri + '</p>' : '') +
      '<table class="prayer-table">' +
        '<thead><tr><th scope="col">Prayer</th><th scope="col">Begins</th><th scope="col">Iqamah</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
      jumLine +
      '<p class="prayer-source">Updated daily from the masjid&rsquo;s own ' +
      '<a href="' + LIVE + '" target="_blank" rel="noopener">Masjidbox timetable</a>.</p>';

    var clock = document.getElementById("prayer-clock");
    if (clock) startClock(clock);
  }

  fetch("assets/prayer-times.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("not found"); return r.json(); })
    .then(render)
    .catch(function () { fallback("Prayer times could not be loaded."); });
})();
