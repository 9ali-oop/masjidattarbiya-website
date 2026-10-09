/* ==========================================================================
   Attarbiya Masjid - site script. Plain JavaScript, no dependencies.

   Every page is complete and readable before this runs. The script only adds
   live data (prayer times, events, talks, the story) and small behaviours, and
   anything that fails leaves an honest message and a link, never a guess.
   ========================================================================== */

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function getJSON(url) {
  return fetch(url, { cache: "no-cache" }).then(function (r) {
    if (!r.ok) throw new Error(url + " " + r.status);
    return r.json();
  });
}

/* Notices: short, dated announcements kept in assets/notices.json and shown
   on the homepage and the prayer times page while they are current. Each has
   a "from" and "until" date (inclusive, Europe/London), so an Eid prayer time
   or a changed iqamah disappears by itself the day after. */
(function () {
  var boxes = document.querySelectorAll(".notices");
  if (!boxes.length) return;
  var today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  getJSON("assets/notices.json").then(function (d) {
    var live = ((d && d.notices) || []).filter(function (n) {
      return n.title && (!n.from || n.from <= today) && (!n.until || n.until >= today);
    }).slice(0, 3);
    if (!live.length) return;
    var html = live.map(function (n) {
      return '<div class="notice" role="note"><span class="notice-kind">' + esc(n.kind || "Notice") + "</span>" +
        "<h3>" + esc(n.title) + "</h3>" +
        (n.text || n.link ? "<p>" + esc(n.text || "") +
          (n.link ? (n.text ? " " : "") + '<a href="' + esc(n.link) + '">' + esc(n.link_text || "More") + "</a>" : "") + "</p>" : "") +
      "</div>";
    }).join("");
    boxes.forEach(function (b) { b.innerHTML = html; });
  }).catch(function () { /* no notices file, or a broken one: show nothing */ });
})();

/* Print buttons: anything with data-print prints the page. */
document.querySelectorAll("[data-print]").forEach(function (b) {
  b.addEventListener("click", function () { window.print(); });
});

/* Brown or navy: the madrasah's two colour options, previewable side by side.
   Add ?furqan=navy or ?furqan=brown to any address; the choice is kept for the
   visit and a small switch appears. Without the parameter nothing happens and
   the default (brown) shows. Remove this once the trustees have chosen. */
(function () {
  var KEY = "furqan-colour";
  var choice = new URLSearchParams(window.location.search).get("furqan");
  try {
    if (choice) window.sessionStorage.setItem(KEY, choice);
    else choice = window.sessionStorage.getItem(KEY);
  } catch (e) { /* private window: preview just this page */ }
  if (choice !== "navy" && choice !== "brown") return;

  var root = document.documentElement;
  function apply(c) {
    if (c === "navy") root.setAttribute("data-furqan", "navy");
    else root.removeAttribute("data-furqan");
  }
  apply(choice);

  document.addEventListener("DOMContentLoaded", function () {
    var bar = document.createElement("div");
    bar.className = "colour-preview";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Preview the madrasah colour");
    bar.innerHTML = "<span>Preview</span>" +
      '<button type="button" data-c="brown"><span style="background:#52322e"></span>Brown</button>' +
      '<button type="button" data-c="navy"><span style="background:#003060"></span>Navy</button>';
    var buttons = bar.querySelectorAll("button");
    function mark() {
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-c") === choice)); });
    }
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        choice = b.getAttribute("data-c");
        try { window.sessionStorage.setItem(KEY, choice); } catch (e) { /* fine */ }
        apply(choice);
        mark();
      });
    });
    mark();
    document.body.appendChild(bar);
  });
})();

var MONTHS = ["January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"];

document.addEventListener("DOMContentLoaded", function () {

  // Footer year.
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Years since the charity was founded, so the homepage never goes stale.
  var since = document.getElementById("years-since");
  if (since) {
    var d = since.getAttribute("data-since").split("-").map(Number);
    var now = new Date();
    var years = now.getFullYear() - d[0];
    if (now.getMonth() + 1 < d[1] || (now.getMonth() + 1 === d[1] && now.getDate() < d[2])) years -= 1;
    since.textContent = years;
  }

  // Mobile menu.
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  if (header && toggle) {
    var setOpen = function (open) {
      header.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };
    toggle.addEventListener("click", function () {
      var open = !header.classList.contains("is-open");
      setOpen(open);
      // Put keyboard and screen-reader users straight into the menu.
      if (open) {
        var first = header.querySelector(".main-nav a");
        if (first) first.focus();
      }
    });
    // A tap anywhere outside the header closes the menu.
    document.addEventListener("click", function (e) {
      if (header.classList.contains("is-open") && !header.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    header.querySelectorAll(".main-nav a").forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
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

});

/* --------------------------------------------------------------------------
   Prayer times.

   Rendered from assets/prayer-times.json, refreshed daily by a GitHub Action
   from the masjid's own Masjidbox timetable. Feeds four places: today's card
   (#prayer-times), the week grid (#prayer-week), the line in the top bar
   (#topbar-next) and the Jumu'ah note on the homepage (#visit-jumuah).

   Everything here works in Europe/London rather than the visitor's timezone:
   someone opening the site from abroad must still see Birmingham's times and
   Birmingham's idea of "today".

   "Next" is measured against the iqamah where there is one, because that is
   when the congregation stands and when people need to be here. A prayer
   whose start time has passed but whose jama'ah has not is still next.

   If the data is missing, or holds no entry for today, each place says so and
   links to the live Masjidbox page. It never shows guessed or stale times.
   -------------------------------------------------------------------------- */
(function () {
  var todayEl = document.getElementById("prayer-times");
  var weekEl = document.getElementById("prayer-week");
  var barEl = document.getElementById("topbar-next");
  var jumEl = document.getElementById("visit-jumuah");
  if (!todayEl && !weekEl && !barEl && !jumEl) return;

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
  var DASH = "&mdash;";

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
      minutes: Number(hour) * 60 + Number(parts.minute),
      seconds: Number(hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second)
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

  function applies(day, k) {
    var friday = isFriday(day.date);
    if (friday && k === "dhuhr") return false;
    if (!friday && k === "jumuah") return false;
    return true;
  }

  /** When the congregation stands: the iqamah if there is one, else the start. */
  function standsAt(day, k) {
    return (day.iqamah && day.iqamah[k]) || day.times[k] || null;
  }

  /** Which prayer is next on this day, or null once the day's prayers are done. */
  function nextPrayer(day, minutes) {
    for (var i = 0; i < ORDER.length; i++) {
      var k = ORDER[i];
      if (CONGREGATIONAL.indexOf(k) === -1 || !applies(day, k)) continue;
      var at = standsAt(day, k);
      if (at && toMinutes(at) > minutes) return k;
    }
    return null;
  }

  function iqamahFor(day, k) {
    // Sunrise is not prayed in congregation, and on Fridays Jumu'ah carries the
    // congregational time, so Dhuhr must not advertise an iqamah of its own.
    if (k === "sunrise" || (isFriday(day.date) && k === "dhuhr")) return null;
    return day.iqamah && day.iqamah[k] ? day.iqamah[k] : null;
  }

  function rowsFor(day, nextKey, minutes) {
    var friday = isFriday(day.date);
    var html = "";
    ORDER.forEach(function (k) {
      if (!day.times[k] && !(day.iqamah && day.iqamah[k])) return;
      if (!friday && k === "jumuah") return;
      var iq = iqamahFor(day, k);
      var cls = [];
      if (k === nextKey) cls.push("is-next");
      if (k === "jumuah") cls.push("is-jumuah");
      var at = standsAt(day, k);
      if (minutes != null && k !== nextKey && at && toMinutes(at) <= minutes) cls.push("is-passed");
      html += "<tr" + (cls.length ? ' class="' + cls.join(" ") + '"' : "") + ">" +
        '<th scope="row">' + LABELS[k] +
          (k === nextKey ? ' <span class="next-tag">Next</span>' : "") + "</th>" +
        "<td>" + (day.times[k] || DASH) + "</td><td>" + (iq || DASH) + "</td></tr>";
    });
    return html;
  }

  /** Tomorrow's first prayer, for the hours between Isha and midnight. */
  function tomorrowFajr(days, todayDate) {
    for (var i = 0; i < days.length; i++) {
      if (days[i].date > todayDate && standsAt(days[i], "fajr")) return days[i];
    }
    return null;
  }

  function nextJumuah(days, fromDate) {
    for (var i = 0; i < days.length; i++) {
      if (days[i].date >= fromDate && days[i].times.jumuah) return days[i];
    }
    return null;
  }

  function jumuahLine(d, todayDate) {
    var when = d.date === todayDate ? "today" : "this " + prettyDate(d.date, { weekday: "long" });
    return "<strong>Jumu&rsquo;ah</strong> " + when + ": khutbah " + d.times.jumuah +
      (d.iqamah && d.iqamah.jumuah ? ", iqamah " + d.iqamah.jumuah : "");
  }

  // "in 2 hr 14 min" when there is over an hour to go; under an hour the
  // seconds show too, and the callers repaint every second, so the line is
  // visibly alive rather than looking stuck between minute changes.
  function countdown(fromSeconds, hm, plusDay) {
    var target = toMinutes(hm) * 60 + (plusDay ? 86400 : 0);
    var left = Math.max(0, target - fromSeconds);
    if (left < 1) return "now";
    var h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), sec = left % 60, out = [];
    if (h) {
      out.push(h + " hr");
      if (Math.round((left % 3600) / 60)) out.push(Math.round((left % 3600) / 60) + " min");
      return "in " + out.join(" ");
    }
    if (m) out.push(m + " min");
    out.push(sec + " s");
    return "in " + out.join(" ");
  }

  /** What is next, as data: today's next prayer, or Fajr tomorrow. */
  function whatsNext(data, day, now) {
    var k = nextPrayer(day, now.minutes);
    if (k) return { key: k, day: day, tomorrow: false };
    var t = tomorrowFajr(data.days, day.date);
    return t ? { key: "fajr", day: t, tomorrow: true } : null;
  }

  function nextBlock(data, day, now) {
    var n = whatsNext(data, day, now);
    if (!n) return "";
    var iq = iqamahFor(n.day, n.key);
    var start = n.day.times[n.key];
    var at = standsAt(n.day, n.key);
    return '<div class="prayer-next" aria-live="polite">' +
      '<span class="prayer-next-label">Next prayer' + (n.tomorrow ? ", tomorrow" : "") + "</span>" +
      '<span class="prayer-next-name">' + LABELS[n.key] + "</span>" +
      '<span class="prayer-next-when">' + (iq ? "Iqamah" : "Begins") + " <b>" + at + "</b>" +
        (iq && start ? "Begins " + start : "") + "</span>" +
      '<span class="prayer-next-count">' + countdown(now.seconds, at, n.tomorrow) + "</span>" +
    "</div>";
  }

  function findToday(data, now) {
    for (var i = 0; i < data.days.length; i++) {
      if (data.days[i].date === now.date) return data.days[i];
    }
    return null;
  }

  function renderToday(data) {
    var now = londonNow();
    var day = findToday(data, now);
    if (!day) {
      fallback(todayEl, "Today&rsquo;s prayer times are not available right now.");
      return;
    }

    function paint(t) {
      var jum = isFriday(day.date) ? null : nextJumuah(data.days, t.date);
      var n = nextPrayer(day, t.minutes);
      todayEl.innerHTML =
        '<div class="prayer-dates">' +
          '<span class="prayer-greg">' + prettyDate(day.date) + "</span>" +
          '<span class="prayer-now">Now <b id="prayer-clock">' + t.clock.slice(0, 5) + "</b></span>" +
        "</div>" +
        (day.hijri ? '<p class="prayer-hijri" lang="ar" dir="rtl">' + esc(day.hijri) + "</p>" : "") +
        nextBlock(data, day, t) +
        '<table class="prayer-table"><caption class="visually-hidden">Prayer times for ' +
          prettyDate(day.date) + '</caption><thead><tr>' +
          '<th scope="col">Prayer</th><th scope="col">Begins</th><th scope="col">Iqamah</th>' +
        "</tr></thead><tbody>" + rowsFor(day, n, t.minutes) + "</tbody></table>" +
        (jum ? '<p class="prayer-jumuah">' + jumuahLine(jum, t.date) + "</p>" : "") +
        '<p class="prayer-source"><a href="' + LIVE + '" target="_blank" rel="noopener">' +
        "Live timetable on Masjidbox</a></p>";
    }

    paint(now);
    // Repaint once a minute so "next", the countdown and the passed rows move
    // along, and reload once the date rolls over so the page never sits on
    // yesterday. The clock itself ticks every second.
    var lastMinute = now.minutes;
    setInterval(function () {
      var t = londonNow();
      if (t.date !== day.date) { window.location.reload(); return; }
      if (t.minutes !== lastMinute) { lastMinute = t.minutes; paint(t); return; }
      var clock = document.getElementById("prayer-clock");
      if (clock) clock.textContent = t.clock.slice(0, 5);
      var count = todayEl.querySelector(".prayer-next-count");
      var n = whatsNext(data, day, t);
      if (count && n) count.textContent = countdown(t.seconds, standsAt(n.day, n.key), n.tomorrow);
    }, 1000);
  }

  function renderWeek(data) {
    var now = londonNow();
    var days = data.days.filter(function (d) { return d.date >= now.date; }).slice(0, 7);
    if (!days.length) {
      fallback(weekEl, "The weekly timetable is not available right now.");
      return;
    }
    var hasJumuah = days.some(function (d) { return d.times.jumuah; });
    var head = "<tr><th scope=\"col\"><span class=\"visually-hidden\">Prayer</span></th>" + days.map(function (d) {
      return '<th scope="col"' + (d.date === now.date ? ' class="is-today"' : "") + ">" +
        prettyDate(d.date, { weekday: "short" }) +
        "<span>" + prettyDate(d.date, { day: "numeric" }) + "</span>" +
        prettyDate(d.date, { month: "short" }) + "</th>";
    }).join("") + "</tr>";

    var body = ORDER.filter(function (k) { return k !== "jumuah" || hasJumuah; }).map(function (k) {
      return '<tr><th scope="row">' + LABELS[k] + "</th>" + days.map(function (d) {
        var cls = d.date === now.date ? ' class="is-today"' : "";
        if (!applies(d, k)) {
          return "<td" + cls + '><span class="visually-hidden">' +
            (k === "dhuhr" ? "Jumu'ah instead" : "None") + "</span>" + '<span aria-hidden="true">' + DASH + "</span></td>";
        }
        var start = d.times[k], iq = iqamahFor(d, k);
        if (!start && !iq) return "<td" + cls + ">" + DASH + "</td>";
        return "<td" + cls + ">" +
          (iq ? "<small>" + (start || DASH) + "</small><b>" + iq + "</b>" : "<b>" + start + "</b>") + "</td>";
      }).join("") + "</tr>";
    }).join("");

    weekEl.innerHTML = '<div class="week-wrap" tabindex="0" role="region" aria-label="Prayer times for the week ahead">' +
      '<table class="week-table"><caption class="visually-hidden">Prayer times for the week ahead. ' +
      "In each cell the start time is above and the iqamah below.</caption>" +
      "<thead>" + head + "</thead><tbody>" + body + "</tbody></table></div>" +
      '<p class="week-key">In each cell, the small figure is when the prayer begins and the bold figure is the iqamah, when the congregation stands. Updated every night from the masjid’s own timetable.</p>';
  }

  function renderBar(data) {
    function paint() {
      var now = londonNow();
      var day = findToday(data, now);
      if (!day) return;
      var n = whatsNext(data, day, now);
      if (!n) return;
      var at = standsAt(n.day, n.key);
      barEl.innerHTML = '<a href="prayer-times"><span class="gold">Next</span> <b>' + LABELS[n.key] +
        "</b>" + (n.tomorrow ? " tomorrow" : "") + ' <b class="tabular">' + at + "</b> &middot; " +
        countdown(now.seconds, at, n.tomorrow) + "</a>";
    }
    paint();
    setInterval(paint, 1000);
  }

  function renderJumuah(data) {
    var now = londonNow();
    var d = nextJumuah(data.days, now.date);
    if (d) jumEl.innerHTML = "<p>" + jumuahLine(d, now.date) + ".</p>";
  }

  getJSON("assets/prayer-times.json")
    .then(function (data) {
      if (!data || !data.days || !data.days.length) throw new Error("empty timetable");
      if (todayEl) renderToday(data);
      if (weekEl) renderWeek(data);
      if (barEl) renderBar(data);
      if (jumEl) renderJumuah(data);
    })
    .catch(function () {
      fallback(todayEl, "Prayer times could not be loaded.");
      fallback(weekEl, "The weekly timetable could not be loaded.");
    });
})();

/* ---------------------------------------------------------------------------
   Events, and the recorded talks.

   Both render from plain JSON files in assets/. events.json is written by hand
   and reviewed before publishing; youtube.json is refreshed nightly from the
   channel's public feed. Neither contacts a third party: posters and
   thumbnails are served from this site.
   --------------------------------------------------------------------------- */
(function () {
  var listEl = document.getElementById("events-list");
  var videoEl = document.getElementById("video-list");
  var homeEvents = document.getElementById("home-events");
  var homeTalks = document.getElementById("home-talks");
  if (!listEl && !videoEl && !homeEvents && !homeTalks) return;

  function parts(iso) {
    var b = String(iso).split("-");
    return { y: +b[0], m: +b[1], d: b.length > 2 ? +b[2] : null };
  }

  function monthName(p) { return MONTHS[p.m - 1] || ""; }

  /* "11 April 2026", "March 2026", "21 July to 24 August 2025", "29 to 31 December 2023" */
  function formatWhen(ev) {
    var s = parts(ev.start);
    if (ev.precision === "month" || s.d === null) return monthName(s) + " " + s.y;

    var from = s.d + " " + monthName(s);
    if (!ev.end) return from + " " + s.y;

    var e = parts(ev.end);
    if (e.y === s.y && e.m === s.m) return s.d + " to " + e.d + " " + monthName(e) + " " + e.y;
    if (e.y === s.y) return from + " to " + e.d + " " + monthName(e) + " " + e.y;
    return from + " " + s.y + " to " + e.d + " " + monthName(e) + " " + e.y;
  }

  /* Split into upcoming (soonest first) and past (newest first). Compares at the
     entry's own precision, so a month-only "2026-03" is weighed against
     "2026-09" rather than against a full date it cannot match. A day either
     side does not matter here, so UTC rather than London is fine. */
  function split(events) {
    var today = new Date().toISOString().slice(0, 10);
    var upcoming = [], past = [];
    events.forEach(function (e) {
      var start = String(e.end || e.start);
      (start >= today.slice(0, start.length) ? upcoming : past).push(e);
    });
    upcoming.sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    past.sort(function (a, b) { return a.start > b.start ? -1 : 1; });
    return { upcoming: upcoming, past: past };
  }

  function eventHtml(ev) {
    return '<li class="event">' +
      '<div class="event-when">' +
        '<span class="event-date">' + esc(formatWhen(ev)) + "</span>" +
        (ev.time ? '<span class="event-time">' + esc(ev.time) + "</span>" : "") +
      "</div>" +
      '<div class="event-body">' +
        (ev.kind ? '<span class="event-kind">' + esc(ev.kind) + "</span>" : "") +
        "<h3>" + esc(ev.title) + "</h3>" +
        "<p>" + esc(ev.summary) + "</p>" +
        (ev.credit ? '<span class="event-with">' + esc(ev.credit) + "</span>" : "") +
      "</div>" +
      (ev.image
        ? '<a class="event-poster" href="' + esc(ev.image) + '" title="Open the poster full size">' +
          '<img src="' + esc(ev.image) + '" alt="' + esc(ev.image_alt || "") + '" loading="lazy" width="560" height="700" /></a>'
        : "") +
    "</li>";
  }

  function renderEvents(events) {
    if (!events.length) {
      listEl.innerHTML = '<p class="events-empty">No events are listed yet.</p>';
      return;
    }
    var s = split(events);
    var html = "";
    if (s.upcoming.length) {
      html += '<h2 class="event-year event-year--next">Coming up</h2><ul class="event-list">' +
              s.upcoming.map(eventHtml).join("") + "</ul>";
    }
    var year = null;
    s.past.forEach(function (ev) {
      var y = String(ev.start).slice(0, 4);
      if (y !== year) {
        if (year !== null) html += "</ul>";
        html += '<h2 class="event-year">' + esc(y) + '</h2><ul class="event-list">';
        year = y;
      }
      html += eventHtml(ev);
    });
    if (year !== null) html += "</ul>";
    listEl.innerHTML = html;
  }

  function renderHomeEvents(events) {
    var s = split(events);
    var pick = s.upcoming.concat(s.past).slice(0, 3);
    if (!pick.length) {
      homeEvents.innerHTML = '<p class="feed-empty">No events are listed yet.</p>';
      return;
    }
    homeEvents.innerHTML = '<ul class="feed-list">' + pick.map(function (ev) {
      var upcoming = s.upcoming.indexOf(ev) !== -1;
      return '<li class="feed-item">' +
        (ev.image
          ? '<img class="feed-thumb" src="' + esc(ev.image) + '" alt="" loading="lazy" width="72" height="90" />'
          : '<span class="feed-thumb feed-thumb--none" aria-hidden="true"></span>') +
        "<div><h4>" + esc(ev.title) + "</h4>" +
        '<p class="feed-meta"><b>' + (upcoming ? "Coming up" : esc(ev.kind)) + "</b> &middot; " +
        esc(formatWhen(ev)) + "</p></div></li>";
    }).join("") + "</ul>";
  }

  function when(v) {
    var p = parts(v.published);
    return p.d + " " + monthName(p) + " " + p.y;
  }

  function thumb(v) {
    return v.thumb
      ? '<div class="video-thumb"><img src="' + esc(v.thumb) + '" alt="" loading="lazy" width="480" height="270" /></div>'
      : "";
  }

  function renderVideos(videos) {
    if (!videos.length) {
      videoEl.innerHTML = '<p class="video-empty">No recordings are listed yet.</p>';
      return;
    }
    videoEl.innerHTML = videos.map(function (v) {
      return '<a class="video-card" href="' + esc(v.url) + '" target="_blank" rel="noopener">' + thumb(v) +
        '<div class="video-meta"><h3>' + esc(v.title) + "</h3>" +
        '<span class="video-date">' + esc(when(v)) + "</span></div></a>";
    }).join("");
  }

  function renderHomeTalks(videos) {
    if (!videos.length) {
      homeTalks.innerHTML = '<p class="feed-empty">No recordings are listed yet.</p>';
      return;
    }
    // Lead with the newest full talk rather than a short clip.
    var lead = videos.filter(function (v) { return !v.short; })[0] || videos[0];
    var rest = videos.filter(function (v) { return v !== lead; }).slice(0, 3);
    homeTalks.innerHTML =
      '<a class="talk-feature" href="' + esc(lead.url) + '" target="_blank" rel="noopener">' + thumb(lead) +
        "<h4>" + esc(lead.title) + '</h4><span class="video-date">' + esc(when(lead)) + "</span></a>" +
      '<ul class="talk-list">' + rest.map(function (v) {
        return '<li><a href="' + esc(v.url) + '" target="_blank" rel="noopener">' + esc(v.title) +
          "<span>" + esc(when(v)) + "</span></a></li>";
      }).join("") + "</ul>";
  }

  if (listEl || homeEvents) {
    getJSON("assets/events.json")
      .then(function (d) {
        var events = (d && d.events) || [];
        if (listEl) renderEvents(events);
        if (homeEvents) renderHomeEvents(events);
      })
      .catch(function () {
        var msg = '<p class="events-empty">The list of events could not be loaded. ' +
          'Please try again, or see the masjid’s ' +
          '<a href="https://www.instagram.com/masjid.attarbiya/" target="_blank" rel="noopener">Instagram</a>.</p>';
        if (listEl) listEl.innerHTML = msg;
        if (homeEvents) homeEvents.innerHTML = msg;
      });
  }

  if (videoEl || homeTalks) {
    getJSON("assets/youtube.json")
      .then(function (d) {
        var videos = (d && d.videos) || [];
        if (videoEl) renderVideos(videos);
        if (homeTalks) renderHomeTalks(videos);
      })
      .catch(function () {
        var msg = '<p class="video-empty">The recordings could not be loaded. ' +
          'They are all on the masjid’s ' +
          '<a href="https://www.youtube.com/@MasjidAttarbiyaBirmingham" target="_blank" rel="noopener">YouTube channel</a>.</p>';
        if (videoEl) videoEl.innerHTML = msg;
        if (homeTalks) homeTalks.innerHTML = msg;
      });
  }
})();

/* ---------------------------------------------------------------------------
   Our Story timeline.

   Renders assets/history.json. Entries marked "unknown" are deliberate gaps:
   they render as open questions rather than being quietly left out, because the
   point of the page is partly to get them answered. Each carries a button that
   opens WhatsApp with a message already started.

   The spine fills with gold as the reader scrolls. The card animation is opt-in
   and fails visible: see CLAUDE.md for the history of that decision.
   --------------------------------------------------------------------------- */
(function () {
  var el = document.getElementById("timeline");
  if (!el) return;

  var STRANDS = { charity: "The charity", building: "The building", learning: "Learning", community: "Community" };
  var WHATSAPP = "https://wa.me/447908854187?text=";

  function card(m) {
    var unknown = m.status === "unknown";
    var asks = (m.asks || []).map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("");
    var msg = "Salaam, about “" + m.title + "” on the masjid's Our Story page: ";
    return '<li class="tl-item' + (unknown ? " is-unknown" : "") + '" data-strand="' + esc(m.strand || "") + '">' +
      '<span class="tl-year">' + (unknown ? '<span aria-hidden="true">?</span><span class="visually-hidden">Year not yet known</span>' : esc(m.year)) + "</span>" +
      '<div class="tl-card">' +
        (STRANDS[m.strand] ? '<span class="tl-strand">' + STRANDS[m.strand] + "</span>" : "") +
        "<h3>" + esc(m.title) + "</h3>" +
        "<p>" + esc(m.body) + "</p>" +
        (asks ? '<span class="tl-askhead">Can you fill this in?</span><ul class="tl-asks">' + asks + "</ul>" +
          '<a class="btn btn-line tl-remember" href="' + WHATSAPP + encodeURIComponent(msg) +
          '" target="_blank" rel="noopener">I remember this</a>' : "") +
        (m.source ? '<span class="tl-source">' + esc(m.source) + "</span>" : "") +
      "</div>" +
    "</li>";
  }

  function stats(ms) {
    var box = document.getElementById("story-stats");
    if (!box) return;
    var known = ms.filter(function (m) { return m.status !== "unknown"; }).length;
    box.insertAdjacentHTML("beforeend",
      "<li><b>" + known + "</b>Milestones on record</li>" +
      "<li><b>" + (ms.length - known) + "</b>Still to be remembered</li>");
  }

  /** Alternate sides among the items that are showing. */
  function arrange() {
    var shown = el.querySelectorAll(".tl-item:not([hidden])");
    Array.prototype.forEach.call(shown, function (item, i) { item.classList.toggle("is-right", i % 2 === 1); });
  }

  function filters() {
    var buttons = document.querySelectorAll(".tl-filter");
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        var strand = b.getAttribute("data-strand");
        buttons.forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
        el.querySelectorAll(".tl-item").forEach(function (item) {
          var match = strand === "all" ||
            (strand === "unknown" ? item.classList.contains("is-unknown") : item.getAttribute("data-strand") === strand);
          item.hidden = !match;
          // Filtering must never leave a card waiting for an animation.
          if (match) item.classList.add("is-visible");
        });
        arrange();
        progress();
      });
    });
  }

  /** Fill the spine to the reading line, and light each marker as it passes. */
  var ticking = false;
  function progress() {
    ticking = false;
    var line = window.innerHeight * 0.6;
    var r = el.getBoundingClientRect();
    var p = r.height ? Math.min(1, Math.max(0, (line - r.top) / r.height)) : 0;
    el.style.setProperty("--progress", p.toFixed(4));
    el.querySelectorAll(".tl-item:not([hidden])").forEach(function (item) {
      item.classList.toggle("is-reached", item.getBoundingClientRect().top + 18 < line);
    });
  }
  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(progress); }
  }

  function reveal(items) {
    // The cards are already readable at this point: the animation only starts
    // once we know we can finish it. Anything that stops us - no observer,
    // reduced motion - simply leaves the timeline as it is, fully visible.
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) return;

    el.classList.add("is-animated");

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.15 });
    items.forEach(function (i) { io.observe(i); });

    // Printing, or saving the page, shows everything settled.
    window.addEventListener("beforeprint", function () { el.classList.add("is-settled"); });

    // Belt and braces. If the observer has revealed nothing after a few seconds
    // - a background tab, a browser quirk - show everything rather than leaving
    // a reader looking at an empty page.
    setTimeout(function () {
      if (!el.querySelector(".tl-item.is-visible")) {
        // Snap, do not fade: a background tab pauses transitions, so fading back
        // would leave the cards stuck at invisible.
        el.classList.add("is-settled");
        el.classList.remove("is-animated");
      }
    }, 3000);
  }

  getJSON("assets/history.json")
    .then(function (d) {
      var ms = (d && d.milestones) || [];
      if (!ms.length) throw new Error("empty");
      el.innerHTML = ms.map(card).join("");
      arrange();
      stats(ms);
      filters();
      reveal(Array.prototype.slice.call(el.querySelectorAll(".tl-item")));
      progress();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
    })
    .catch(function () {
      el.innerHTML = '<li class="tl-item"><div class="tl-card">' +
        "<p>The timeline could not be loaded. Please try again.</p></div></li>";
    });
})();

/* ---------------------------------------------------------------------------
   Madrasah Al Furqan: groups, timetable, term dates and resources.

   All from assets/madrasah.json, written by hand. Anything still marked
   "placeholder" carries a visible "To be confirmed" label, and while the file
   says "provisional" the page keeps its draft notice. With no JavaScript, or if
   the file fails to load, the page's own plain message stands.
   --------------------------------------------------------------------------- */
(function () {
  var classEl = document.getElementById("madrasah-classes");
  var termsEl = document.getElementById("madrasah-terms");
  var resEl = document.getElementById("madrasah-resources");
  var draftEl = document.getElementById("madrasah-draft");
  if (!classEl && !termsEl && !resEl) return;

  var TBC = '<span class="tbc">To be confirmed</span>';

  function tbc(item) { return item && item.placeholder ? TBC : ""; }

  function longDate(iso) {
    var p = iso.split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2])).toLocaleDateString("en-GB",
      { timeZone: "UTC", weekday: "short", day: "numeric", month: "long", year: "numeric" });
  }

  /** Today's weekday in Birmingham, so the timetable can mark it. */
  function londonWeekday() {
    return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long" }).format(new Date());
  }

  function renderClasses(d) {
    var groups = d.groups || [];
    var rows = d.timetable || [];
    if (!groups.length || !rows.length) return;
    var today = londonWeekday();

    var facts =
      '<ul class="furqan-facts">' +
        "<li><b>Six days a week</b>No classes on Friday</li>" +
        "<li><b>Two groups</b>" + groups.map(function (g) { return esc(g.ages); }).join(", ") + "</li>" +
        (d.places ? "<li><b>Places</b>" + esc(d.places.text) + " " + tbc(d.places) + "</li>" : "") +
        (d.fees ? "<li><b>Fees</b>" + esc(d.fees.text) + " " + tbc(d.fees) + "</li>" : "") +
      "</ul>";

    var cards = '<div class="groups">' + groups.map(function (g) {
      return '<article class="group-card">' +
        '<h3>' + esc(g.name) + "</h3>" +
        '<p class="group-ages">' + esc(g.ages) + "</p>" +
        "<p>" + esc(g.summary) + "</p>" + tbc(g) +
      "</article>";
    }).join("") + "</div>";

    var anyPlaceholder = rows.some(function (r) { return r.placeholder; });
    var table =
      '<div class="timetable-wrap" tabindex="0" role="region" aria-label="Madrasah timetable">' +
      '<table class="timetable"><caption>Weekly timetable' + (anyPlaceholder ? " " + TBC : "") + "</caption>" +
      '<thead><tr><th scope="col">Day</th>' + groups.map(function (g) {
        return '<th scope="col">' + esc(g.name) + "<small>" + esc(g.ages) + "</small></th>";
      }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) {
        var cls = [];
        if (r.day === today) cls.push("is-today");
        if (r.closed) cls.push("is-closed");
        var head = '<th scope="row">' + esc(r.day) +
          (r.day === today ? ' <span class="next-tag">Today</span>' : "") + "</th>";
        var cells = r.closed
          ? '<td colspan="' + groups.length + '">' + esc(r.closed) + "</td>"
          : groups.map(function (g) { return "<td>" + (r[g.id] ? esc(r[g.id]) : "&mdash;") + "</td>"; }).join("");
        return "<tr" + (cls.length ? ' class="' + cls.join(" ") + '"' : "") + ">" + head + cells + "</tr>";
      }).join("") +
      "</tbody></table></div>";

    classEl.innerHTML = facts + cards + table;
  }

  function renderTerms(t) {
    if (!t || !t.list || !t.list.length) return;
    termsEl.innerHTML =
      '<p class="terms-year">' + esc(t.year) + " " + tbc(t) + "</p>" +
      '<ol class="terms">' + t.list.map(function (term) {
        return "<li><b>" + esc(term.name) + "</b>" +
          "<span>" + esc(longDate(term.start)) + " to " + esc(longDate(term.end)) + "</span>" +
          (term["break"] ? "<small>" + esc(term["break"]) + "</small>" : "") + "</li>";
      }).join("") + "</ol>" +
      (t.footnote ? '<p class="muted">' + esc(t.footnote) + "</p>" : "");
  }

  function renderResources(list) {
    if (!list.length) return;
    resEl.innerHTML = '<ul class="resource-list">' + list.map(function (r) {
      var inner = "<b>" + esc(r.title) + "</b>" + (r.description ? "<span>" + esc(r.description) + "</span>" : "");
      // A placeholder has nothing to open yet, so it is not a link.
      if (!r.url) return '<li class="is-soon"><div>' + inner + '</div><span class="tbc">Coming soon</span></li>';
      return '<li><a href="' + esc(r.url) + '"' + (/^https?:/.test(r.url) ? ' target="_blank" rel="noopener"' : "") +
        ">" + inner + "</a></li>";
    }).join("") + "</ul>";
  }

  getJSON("assets/madrasah.json").then(function (d) {
    d = d || {};
    if (draftEl) draftEl.hidden = d.provisional === false;
    if (classEl) renderClasses(d);
    if (termsEl) renderTerms(d.terms);
    if (resEl) renderResources(d.resources || []);
  }).catch(function () { /* the page's own message stands */ });
})();

/* ---------------------------------------------------------------------------
   The contact form posts to Formspree. With script it sends in the background
   and shows the result in place; without, the browser posts the form and
   Formspree shows its own thank-you page. Nothing is sent until the visitor
   presses Send. See CLAUDE.md, "Contact form".
   -------------------------------------------------------------------------- */
(function () {
  var form = document.getElementById("contact-form");
  if (!form || !window.fetch || !window.FormData) return;
  var status = document.getElementById("contact-status");
  var button = document.getElementById("contact-send");

  function say(text, kind) {
    status.textContent = text;
    status.className = "form-status" + (kind ? " is-" + kind : "");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    button.disabled = true;
    say("Sending\u2026");
    fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          if (r.ok) {
            form.reset();
            form.hidden = true;
            say("Thank you, your message has been sent. We will reply by email.", "ok");
            status.focus();
            return;
          }
          var detail = data && data.errors && data.errors.length
            ? data.errors.map(function (x) { return x.message; }).join(" ") : "";
          say("Sorry, the message could not be sent" + (detail ? " (" + detail + ")" : "") +
              ". Please try again, or email info@masjidatarbiya.org.", "error");
          button.disabled = false;
        });
      })
      .catch(function () {
        // No network, or the request was blocked: let the browser post the
        // form itself, which lands on Formspree's own thank-you page.
        button.disabled = false;
        form.submit();
      });
  });
})();
