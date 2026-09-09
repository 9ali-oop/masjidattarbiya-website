document.addEventListener("DOMContentLoaded", function () {

  // Mobile nav toggle
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
    banner.innerHTML = "<strong>JazakAllahu Khayran!</strong><span></span>";
    banner.querySelector("span").textContent =
      messages[thanks] || "Thank you for your donation. May Allah accept it and reward you abundantly.";
    document.body.insertBefore(banner, document.body.firstChild);
    // Clear the parameter so a refresh does not show the banner again.
    if (window.history.replaceState) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  // Donate page: Monthly / One-off tabs, and pick-an-amount then confirm.
  //
  // The amounts are real links to GoCardless, so with JavaScript disabled they
  // still work by tapping one directly. With JavaScript on we intercept the tap
  // to select it instead, and the confirm button below carries the donor through.
  // That extra step is deliberate: setting up a monthly Direct Debit is a real
  // commitment and the donor should see exactly what they are agreeing to.
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
          panel.hidden = panel.getAttribute("data-panel") !== target;
        });
      });
    });
  }

  document.querySelectorAll(".donate-tab-panel").forEach(function (panel) {
    var kind = panel.getAttribute("data-panel");
    var cta = panel.querySelector(".donate-cta");
    var amounts = panel.querySelectorAll(".amount-btn");
    if (!cta || !amounts.length) return;

    var placeholder = cta.textContent;

    amounts.forEach(function (link) {
      link.setAttribute("role", "radio");
      link.setAttribute("aria-checked", "false");
      link.addEventListener("click", function (e) {
        e.preventDefault();
        amounts.forEach(function (a) {
          var on = a === link;
          a.classList.toggle("selected", on);
          a.setAttribute("aria-checked", on ? "true" : "false");
        });
        cta.href = link.getAttribute("href");
        cta.classList.remove("is-empty");
        cta.textContent = kind === "monthly"
          ? "Donate " + link.textContent.trim() + " every month"
          : "Donate " + link.textContent.trim() + " now";
      });
    });

    cta.addEventListener("click", function (e) {
      if (cta.classList.contains("is-empty")) {
        e.preventDefault();
        cta.textContent = placeholder;
      }
    });
  });

});

/* --------------------------------------------------------------------------
   Prayer times.

   Rendered from assets/prayer-times.json, refreshed daily by a GitHub Action
   from the masjid's own Masjidbox timetable.

   Everything here works in Europe/London rather than the visitor's timezone:
   someone opening the site from abroad must still see Birmingham's times and
   Birmingham's idea of "today".

   If the data is missing, or holds no entry for today, the page says so and
   links to the live Masjidbox page. It never shows guessed or stale times.
   -------------------------------------------------------------------------- */
(function () {
  var todayEl = document.getElementById("prayer-times");
  var weekEl = document.getElementById("prayer-week");
  if (!todayEl && !weekEl) return;

  var LIVE = "https://masjidbox.com/prayer-times/masjid-attarbiya";
  var TZ = "Europe/London";
  var LABELS = {
    fajr: "Fajr", sunrise: "Sunrise", dhuhr: "Dhuhr", jumuah: "Jumu'ah",
    asr: "Asr", maghrib: "Maghrib", isha: "Isha"
  };
  var ORDER = ["fajr", "sunrise", "dhuhr", "jumuah", "asr", "maghrib", "isha"];
  // Prayers that can be "next". Sunrise is not a prayer, and Dhuhr is skipped on
  // Fridays because the congregation prays Jumu'ah instead.
  var CONGREGATIONAL = ["fajr", "dhuhr", "jumuah", "asr", "maghrib", "isha"];

  /** Date and time in Birmingham, wherever the visitor happens to be. */
  function londonNow() {
    var parts = {};
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var hour = parts.hour === "24" ? "00" : parts.hour;
    return {
      date: parts.year + "-" + parts.month + "-" + parts.day,
      clock: hour + ":" + parts.minute + ":" + parts.second,
      minutes: Number(hour) * 60 + Number(parts.minute)
    };
  }

  function asDate(iso) {
    var p = iso.split("-");
    return new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  }

  function prettyDate(iso, opts) {
    return asDate(iso).toLocaleDateString("en-GB", Object.assign(
      { timeZone: "UTC" },
      opts || { weekday: "long", day: "numeric", month: "long", year: "numeric" }
    ));
  }

  function isFriday(iso) { return asDate(iso).getUTCDay() === 5; }

  function toMinutes(hm) {
    var p = hm.split(":");
    return Number(p[0]) * 60 + Number(p[1]);
  }

  function fallback(el, message) {
    if (!el) return;
    el.innerHTML = '<p class="prayer-fallback">' + message +
      ' <a href="' + LIVE + '" target="_blank" rel="noopener">View live prayer times</a>.</p>';
  }

  /** Which prayer is next on this day, or null once the day's prayers are done. */
  function nextPrayer(day, minutes) {
    var friday = isFriday(day.date);
    for (var i = 0; i < ORDER.length; i++) {
      var k = ORDER[i];
      if (CONGREGATIONAL.indexOf(k) === -1) continue;
      if (friday && k === "dhuhr") continue;
      if (!friday && k === "jumuah") continue;
      if (day.times[k] && toMinutes(day.times[k]) > minutes) return k;
    }
    return null;
  }

  function rowsFor(day, nextKey) {
    var friday = isFriday(day.date);
    var html = "";
    ORDER.forEach(function (k) {
      if (!day.times[k]) return;
      if (!friday && k === "jumuah") return;
      var iqamah = day.iqamah && day.iqamah[k] ? day.iqamah[k] : "&mdash;";
      // Sunrise is not prayed in congregation, and on Fridays Jumu'ah carries the
      // congregational time, so Dhuhr must not advertise an iqamah of its own.
      if (k === "sunrise" || (friday && k === "dhuhr")) iqamah = "&mdash;";
      var cls = [];
      if (k === nextKey) cls.push("is-next");
      if (k === "jumuah") cls.push("is-jumuah");
      html += "<tr" + (cls.length ? ' class="' + cls.join(" ") + '"' : "") + ">" +
        '<th scope="row">' + LABELS[k] +
          (k === nextKey ? ' <span class="next-tag">Next</span>' : "") + "</th>" +
        "<td>" + day.times[k] + "</td><td>" + iqamah + "</td></tr>";
    });
    return html;
  }

  function tableFor(day, nextKey, bodyId) {
    return '<table class="prayer-table"><thead><tr>' +
      '<th scope="col">Prayer</th><th scope="col">Begins</th><th scope="col">Iqamah</th>' +
      "</tr></thead><tbody" + (bodyId ? ' id="' + bodyId + '"' : "") + ">" +
      rowsFor(day, nextKey) + "</tbody></table>";
  }

  /** Tomorrow's first prayer, for the hours between Isha and midnight. */
  function tomorrowFajr(days, todayDate) {
    for (var i = 0; i < days.length; i++) {
      if (days[i].date > todayDate && days[i].times.fajr) return days[i];
    }
    return null;
  }

  function standingJumuah(days, fromDate) {
    for (var i = 0; i < days.length; i++) {
      var d = days[i];
      if (d.date >= fromDate && d.times.jumuah) {
        return '<p class="prayer-jumuah"><strong>Jumu&rsquo;ah</strong> this ' +
          prettyDate(d.date, { weekday: "long" }) + ": khutbah " + d.times.jumuah +
          (d.iqamah.jumuah ? ", iqamah " + d.iqamah.jumuah : "") + "</p>";
      }
    }
    return "";
  }

  /** A line for after the day's prayers are done, so "next" is never blank. */
  function upNext(data, day, minutes) {
    if (nextPrayer(day, minutes)) return "";
    var t = tomorrowFajr(data.days, day.date);
    if (!t) return "";
    return '<p class="prayer-upnext"><span class="next-tag">Next</span> Fajr tomorrow at ' +
      t.times.fajr + (t.iqamah.fajr ? ", iqamah " + t.iqamah.fajr : "") + "</p>";
  }

  function renderToday(data) {
    var now = londonNow();
    var day = null;
    for (var i = 0; i < data.days.length; i++) {
      if (data.days[i].date === now.date) { day = data.days[i]; break; }
    }
    if (!day) {
      fallback(todayEl, "Today&rsquo;s prayer times are not available right now.");
      return;
    }

    todayEl.innerHTML =
      '<div class="prayer-dates">' +
        '<span class="prayer-greg">' + prettyDate(day.date) + "</span>" +
        '<span class="prayer-now">Now <b id="prayer-clock">' + now.clock + "</b></span>" +
      "</div>" +
      (day.hijri ? '<p class="prayer-hijri" lang="ar" dir="rtl">' + day.hijri + "</p>" : "") +
      tableFor(day, nextPrayer(day, now.minutes), "prayer-rows") +
      '<div id="prayer-upnext">' + upNext(data, day, now.minutes) + "</div>" +
      (isFriday(day.date) ? "" : standingJumuah(data.days, now.date)) +
      '<p class="prayer-source"><a href="' + LIVE + '" target="_blank" rel="noopener">' +
      'View on Masjidbox</a></p>';

    // Keep the clock ticking, move the "Next" tag along with it, and reload once
    // the date rolls over so the page never sits on yesterday.
    var shownNext = nextPrayer(day, now.minutes);
    setInterval(function () {
      var t = londonNow();
      var clock = document.getElementById("prayer-clock");
      if (clock) clock.textContent = t.clock;
      if (t.date !== day.date) { window.location.reload(); return; }
      var n = nextPrayer(day, t.minutes);
      if (n !== shownNext) {
        shownNext = n;
        var body = document.getElementById("prayer-rows");
        if (body) body.innerHTML = rowsFor(day, n);
        var up = document.getElementById("prayer-upnext");
        if (up) up.innerHTML = upNext(data, day, t.minutes);
      }
    }, 1000);
  }

  function renderWeek(data) {
    var now = londonNow();
    var upcoming = data.days.filter(function (d) { return d.date >= now.date; });
    if (!upcoming.length) {
      fallback(weekEl, "The weekly timetable is not available right now.");
      return;
    }
    weekEl.innerHTML = upcoming.map(function (day) {
      return '<div class="week-day' + (day.date === now.date ? " is-today" : "") + '">' +
        "<h3>" + prettyDate(day.date, { weekday: "long", day: "numeric", month: "long" }) +
          (day.date === now.date ? ' <span class="next-tag">Today</span>' : "") + "</h3>" +
        tableFor(day, null, null) +
      "</div>";
    }).join("");
  }

  fetch("assets/prayer-times.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("not found"); return r.json(); })
    .then(function (data) {
      if (!data || !data.days || !data.days.length) throw new Error("empty timetable");
      if (todayEl) renderToday(data);
      if (weekEl) renderWeek(data);
    })
    .catch(function () {
      fallback(todayEl, "Prayer times could not be loaded.");
      fallback(weekEl, "The weekly timetable could not be loaded.");
    });
})();
