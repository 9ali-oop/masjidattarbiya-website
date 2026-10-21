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
  // An empty cell: a plain hyphen to the eye, "none" to a screen reader.
  var DASH = '<span aria-hidden="true">-</span><span class="visually-hidden">none</span>';

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

  /* An event with no poster shows its date, as a leaf torn off a calendar. */
  function dateLeaf(ev) {
    var p = parts(ev.start);
    var month = (MONTHS[p.m - 1] || "").slice(0, 3);
    return '<span class="feed-thumb feed-leaf" aria-hidden="true">' +
      (p.d !== null && ev.precision !== "month"
        ? "<b>" + p.d + "</b><span>" + month + "</span>"
        : "<b>" + month + "</b><span>" + p.y + "</span>") +
      "</span>";
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
          : dateLeaf(ev)) +
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
   Our Story.

   Renders assets/history.json as chapters ("chapters" in the file; each
   milestone names its "chapter"), in the order the file keeps them, which is
   the order things happened: the page reads in one direction. Milestones that
   share an "aside" and follow one another are set together under that line:
   the building's own story, before it was ours, sits at its place in time.

   Entries marked "unknown" are deliberate gaps: they render as open questions
   rather than being quietly left out, because the point of the page is partly
   to get them answered. Each carries a button that opens WhatsApp with a
   message already started. Nothing on the page moves: see CLAUDE.md.
   --------------------------------------------------------------------------- */
(function () {
  var el = document.getElementById("timeline");
  if (!el) return;

  var WHATSAPP = "https://wa.me/447908854187?text=";

  function img(src, alt, w, h) {
    return '<img src="' + esc(src) + '" alt="' + esc(alt || "") + '"' +
      (w && h ? ' width="' + w + '" height="' + h + '"' : "") + ' loading="lazy" decoding="async">';
  }

  /** A photograph at its own proportions (or, with image_fit "contain", a logo shown whole), with its caption. */
  function figure(x, cls) {
    if (!x.image) return "";
    var logo = x.image_fit === "contain";
    var tag = img(x.image, x.image_alt, x.image_width, x.image_height);
    // A milestone's picture is no taller than a wide one would be (360px; a
    // logo 130px) and no wider than 500px. Setting that width here lets the
    // width and height attributes reserve its space before it loads, so the
    // chapter links land where they should.
    if (cls === "entry-photo" && x.image_width && x.image_height) {
      var w = Math.min(500, Math.round((logo ? 130 : 360) * x.image_width / x.image_height));
      tag = tag.replace("<img ", '<img style="width:' + w + 'px" ');
    }
    return '<figure class="' + cls + (logo ? " is-logo" : "") + '">' +
      (logo ? '<span class="media-frame">' : "") +
      tag +
      (logo ? "</span>" : "") +
      (x.image_caption ? "<figcaption>" + esc(x.image_caption) + "</figcaption>" : "") +
    "</figure>";
  }

  function entry(m) {
    var unknown = m.status === "unknown";
    var asks = (m.asks || []).map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("");
    var msg = "Salaam, about “" + m.title + "” on the masjid's Our Story page: ";
    return '<li class="entry' + (unknown ? " is-unknown" : "") + '" id="m-' + esc(m.id) + '" data-strand="' + esc(m.strand || "") + '">' +
      '<p class="entry-year">' + (unknown ? '<span aria-hidden="true">?</span><span class="visually-hidden">Year not yet known</span>' : esc(m.year)) + "</p>" +
      '<div class="entry-body">' +
        "<h3>" + esc(m.title) + "</h3>" +
        '<p class="entry-text">' + esc(m.body) + "</p>" +
        figure(m, "entry-photo") +
        (asks ? '<p class="entry-askhead">Can you fill this in?</p><ul class="entry-asks">' + asks + "</ul>" +
          '<a class="btn btn-line entry-remember" href="' + WHATSAPP + encodeURIComponent(msg) +
          '" target="_blank" rel="noopener">I remember this</a>' : "") +
        (m.source ? '<p class="entry-source"><b>Source:</b> ' + esc(m.source) + "</p>" : "") +
      "</div>" +
    "</li>";
  }

  /** Milestones in order; a run that shares an "aside" goes together under its line. */
  function entries(items) {
    var out = "", i = 0;
    while (i < items.length) {
      var aside = items[i].aside;
      if (!aside) { out += entry(items[i]); i++; continue; }
      var run = [];
      while (i < items.length && items[i].aside === aside) run.push(items[i++]);
      out += '<li class="entry-aside"><p class="aside-label">' + esc(aside) + "</p>" +
        '<ol class="entries">' + run.map(entry).join("") + "</ol></li>";
    }
    return out;
  }

  function chapter(c, items) {
    return '<section class="chapter" id="' + esc(c.id) + '"' +
        (c.title ? ' aria-labelledby="ch-' + esc(c.id) + '"' : "") + ">" +
      (c.title ?
        '<header class="chapter-head' + (c.image ? "" : " no-photo") + '">' +
          '<div class="chapter-text">' +
            (c.ar ? '<p class="chapter-ar ar" lang="ar">' + esc(c.ar) + "</p>" : "") +
            '<h2 id="ch-' + esc(c.id) + '">' + esc(c.title) + "</h2>" +
            (c.years ? '<p class="chapter-years">' + esc(c.years) + "</p>" : "") +
            (c.intro ? '<p class="chapter-intro">' + esc(c.intro) + "</p>" : "") +
          "</div>" +
          figure(c, "chapter-figure") +
        "</header>" : "") +
      '<ol class="entries">' + entries(items) + "</ol>" +
    "</section>";
  }

  /** Chapters in the file's order; anything without a known chapter still shows, at the end. */
  function group(d) {
    var chapters = (d.chapters || []).filter(function (c) { return c && c.id; });
    var byId = {}, out = [], loose = [];
    chapters.forEach(function (c) { byId[c.id] = { c: c, items: [] }; out.push(byId[c.id]); });
    d.milestones.forEach(function (m) { (byId[m.chapter] ? byId[m.chapter].items : loose).push(m); });
    if (loose.length) out.push({ c: { id: "more" }, items: loose });
    return out.filter(function (g) { return g.items.length; });
  }

  /** The chapters as a line of links under the heading band. */
  function contents(groups) {
    var box = document.getElementById("story-contents");
    if (!box) return;
    box.innerHTML = "<ol>" + groups.filter(function (g) { return g.c.title; }).map(function (g) {
      return '<li data-chapter="' + esc(g.c.id) + '"><a href="#' + esc(g.c.id) + '">' + esc(g.c.title) +
        (g.c.years ? " <span>" + esc(g.c.years) + "</span>" : "") + "</a></li>";
    }).join("") + "</ol>";
  }

  function all(sel, root) { return Array.prototype.slice.call((root || el).querySelectorAll(sel)); }

  function stats(ms) {
    var box = document.getElementById("story-stats");
    if (!box) return;
    var known = ms.filter(function (m) { return m.status !== "unknown"; }).length;
    box.insertAdjacentHTML("beforeend",
      "<li><b>" + known + "</b>Milestones on record</li>" +
      "<li><b>" + (ms.length - known) + "</b>Still to be remembered</li>");
  }

  function filters() {
    var buttons = document.querySelectorAll(".tl-filter");
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        var strand = b.getAttribute("data-strand");
        buttons.forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
        all(".entry").forEach(function (item) {
          item.hidden = !(strand === "all" ||
            (strand === "unknown" ? item.classList.contains("is-unknown") : item.getAttribute("data-strand") === strand));
        });
        all(".entry-aside").forEach(function (a) { a.hidden = !a.querySelector(".entry:not([hidden])"); });
        all(".chapter").forEach(function (ch) {
          var empty = !ch.querySelector(".entry:not([hidden])");
          ch.hidden = empty;
          var li = document.querySelector('#story-contents li[data-chapter="' + ch.id + '"]');
          if (li) li.hidden = empty;
        });
      });
    });
  }

  getJSON("assets/history.json")
    .then(function (d) {
      var ms = (d && d.milestones) || [];
      if (!ms.length) throw new Error("empty");
      var groups = group(d);
      el.innerHTML = groups.map(function (g) { return chapter(g.c, g.items); }).join("");
      contents(groups);
      stats(ms);
      filters();
      // The chapter links and the filters only mean something once the story is here.
      var tools = document.querySelector(".story-tools");
      if (tools) tools.hidden = false;
      // A link to a milestone or chapter (history#m-madrasah) lands on it once it exists.
      if (location.hash.length > 1) {
        var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target) target.scrollIntoView({ behavior: "instant" });
      }
    })
    .catch(function () {
      el.innerHTML = '<p class="story-error">The story could not be loaded. Please try again in a moment.</p>';
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
    var whos = groups.map(function (g) { return g.who; }).filter(function (w, i, a) { return w && a.indexOf(w) === i; })
      .map(function (w, i) { return i ? w.charAt(0).toLowerCase() + w.slice(1) : w; });

    var facts =
      '<ul class="furqan-facts">' +
        "<li><b>Six days a week</b>No classes on Friday</li>" +
        "<li><b>" + groups.length + " groups</b>" + esc(whos.join(", ")) + "</li>" +
        (d.places ? "<li><b>Places</b>" + esc(d.places.text) + " " + tbc(d.places) + "</li>" : "") +
        (d.fees ? "<li><b>Fees</b>" + esc(d.fees.text) + " " + tbc(d.fees) + "</li>" : "") +
      "</ul>";

    var curriculum = d.curriculum ? '<p class="curriculum">' + esc(d.curriculum) + "</p>" : "";

    var cards = '<div class="groups">' + groups.map(function (g) {
      return '<article class="group-card">' +
        "<h3>" + esc(g.name) + "</h3>" +
        '<p class="group-ages">' + esc(g.who) + (g.who_placeholder ? " " + TBC : "") + "</p>" +
        '<ul class="group-sessions">' + (g.sessions || []).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>" +
        tbc(g) +
      "</article>";
    }).join("") + "</div>";

    var anyPlaceholder = rows.some(function (r) { return r.placeholder; });
    var table =
      '<div class="timetable-wrap" tabindex="0" role="region" aria-label="Madrasah timetable">' +
      '<table class="timetable"><caption>Weekly timetable' + (anyPlaceholder ? " " + TBC : "") + "</caption>" +
      '<thead><tr><th scope="col">Day</th>' + groups.map(function (g) {
        return '<th scope="col">' + esc(g.name) + "<small>" + esc(g.who) + "</small></th>";
      }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) {
        var cls = [];
        if (r.day === today) cls.push("is-today");
        if (r.closed) cls.push("is-closed");
        var head = '<th scope="row">' + esc(r.day) +
          (r.day === today ? ' <span class="next-tag">Today</span>' : "") + "</th>";
        var cells = r.closed
          ? '<td colspan="' + groups.length + '">' + esc(r.closed) + "</td>"
          : groups.map(function (g) { return "<td>" + (r[g.id] ? esc(r[g.id]) : '<span aria-hidden="true">-</span><span class="visually-hidden">No class</span>') + "</td>"; }).join("");
        return "<tr" + (cls.length ? ' class="' + cls.join(" ") + '"' : "") + ">" + head + cells + "</tr>";
      }).join("") +
      "</tbody></table></div>";

    classEl.innerHTML = facts + curriculum + cards + table;
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


/* ---------------------------------------------------------------------------
   Silent loops.

   A clip (video.loop-clip) is a few seconds, muted, with a poster. It loads
   only when it comes near the screen, plays only while on it, and pauses when
   it leaves or the tab is hidden. A reader who asks for reduced motion, or for
   less data, never downloads one: the poster stays, which is the same picture
   standing still. Without script the poster is all anyone sees.
   --------------------------------------------------------------------------- */
var QUIET = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) ||
  !!(navigator.connection && navigator.connection.saveData);

function playQuietly(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }

(function () {
  var clips = Array.prototype.slice.call(document.querySelectorAll("video.loop-clip[data-src]"));
  if (!clips.length || QUIET || !("IntersectionObserver" in window)) return;
  var showing = [];
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target, i = showing.indexOf(v);
      if (e.isIntersecting) {
        if (!v.getAttribute("src")) { v.src = v.getAttribute("data-src"); }
        if (i < 0) showing.push(v);
        if (!document.hidden) playQuietly(v);
      } else {
        if (i >= 0) showing.splice(i, 1);
        v.pause();
      }
    });
  }, { rootMargin: "120px 0px", threshold: 0.15 });
  clips.forEach(function (v) { io.observe(v); });
  document.addEventListener("visibilitychange", function () {
    showing.forEach(function (v) { if (document.hidden) v.pause(); else playQuietly(v); });
  });
})();

/* ---------------------------------------------------------------------------
   The viewer: a picture full screen.

   Any link marked data-lightbox="<set>" opens its picture here instead of on
   its own. The picture grows out of the one that was pressed (and shrinks
   back into it on closing); the arrow buttons, the arrow keys or a swipe move
   through the rest of its set. A link with data-video plays that clip, silent,
   in place of the still. Without script each link simply opens the image.
   --------------------------------------------------------------------------- */
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll("a[data-lightbox]"));
  if (!links.length || typeof HTMLDialogElement !== "function") return;
  var still = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  var dlg = document.createElement("dialog");
  dlg.className = "lightbox";
  dlg.setAttribute("aria-label", "Photographs");
  dlg.innerHTML =
    '<div class="lb-stage"></div>' +
    '<div class="lb-bar"><p class="lb-caption"></p><p class="lb-count"></p></div>' +
    '<button type="button" class="lb-btn lb-close" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
    '<button type="button" class="lb-btn lb-prev" aria-label="Previous picture"><span aria-hidden="true">&larr;</span></button>' +
    '<button type="button" class="lb-btn lb-next" aria-label="Next picture"><span aria-hidden="true">&rarr;</span></button>';
  document.body.appendChild(dlg);
  var stage = dlg.querySelector(".lb-stage");
  var caption = dlg.querySelector(".lb-caption");
  var count = dlg.querySelector(".lb-count");
  var set = [], index = 0, opener = null, closing = false;

  function thumbOf(a) { return a.querySelector("img, video"); }

  function media(a) {
    var el, clip = a.getAttribute("data-video");
    if (clip && !QUIET) {
      el = document.createElement("video");
      el.muted = true; el.loop = true; el.playsInline = true;
      el.setAttribute("muted", ""); el.setAttribute("playsinline", "");
      el.poster = a.getAttribute("href");
      el.src = clip;
      // Silent and looping, it stands in for a picture, so it says what it shows.
      var sr = a.querySelector(".visually-hidden"), th = thumbOf(a);
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", (sr && sr.textContent) || (th && th.getAttribute("alt")) || "");
    } else {
      el = document.createElement("img");
      el.src = a.getAttribute("href");
      var t = thumbOf(a), label = a.querySelector(".visually-hidden");
      el.alt = (t && t.getAttribute("alt")) || (label && label.textContent) || "";
    }
    el.className = "lb-media";
    return el;
  }

  /* From the thumbnail's box to the picture's own, as one transform: scaled
     until it covers the thumbnail, centred on it, and clipped to its shape. */
  function flip(el, from) {
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    var s = Math.max(from.width / r.width, from.height / r.height);
    var tx = from.left + from.width / 2 - r.left - s * r.width / 2;
    var ty = from.top + from.height / 2 - r.top - s * r.height / 2;
    var ix = Math.max(0, (r.width - from.width / s) / 2), iy = Math.max(0, (r.height - from.height / s) / 2);
    return [
      { transform: "translate(" + tx + "px," + ty + "px) scale(" + s + ")", clipPath: "inset(" + iy + "px " + ix + "px)" },
      { transform: "translate(0,0) scale(1)", clipPath: "inset(0px 0px)" }
    ];
  }

  function whenSized(el, fn) {
    var ready = el.tagName === "IMG" ? el.complete && el.naturalWidth : el.readyState >= 1;
    if (ready) fn();
    else el.addEventListener(el.tagName === "IMG" ? "load" : "loadedmetadata", fn, { once: true });
  }

  function show(i, from) {
    index = (i + set.length) % set.length;
    var a = set[index];
    var el = media(a);
    stage.innerHTML = "";
    stage.appendChild(el);
    if (el.tagName === "VIDEO") playQuietly(el);
    // A caption only where one was written on purpose (a date, a credit): the
    // alt text describes the picture for those who cannot see it, and is not
    // repeated under it for those who can.
    caption.textContent = a.getAttribute("data-caption") || "";
    count.textContent = set.length > 1 ? (index + 1) + " of " + set.length : "";
    [index - 1, index + 1].forEach(function (n) {
      var b = set[(n + set.length) % set.length];
      if (b && b !== a) { var im = new Image(); im.src = b.getAttribute("href"); }
    });
    if (from && !still && el.animate) {
      whenSized(el, function () {
        var k = flip(el, from);
        if (k) el.animate(k, { duration: 460, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" });
      });
    } else if (!still && el.animate) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
    }
  }

  function open(a) {
    set = links.filter(function (l) { return l.getAttribute("data-lightbox") === a.getAttribute("data-lightbox"); });
    opener = a;
    var t = thumbOf(a);
    document.documentElement.classList.add("lb-open");
    dlg.showModal();
    show(set.indexOf(a), t ? t.getBoundingClientRect() : null);
  }

  function finish() {
    closing = false;
    dlg.getAnimations().forEach(function (an) { an.cancel(); });
    stage.innerHTML = "";
    if (dlg.open) dlg.close();
    document.documentElement.classList.remove("lb-open");
    if (opener) opener.focus({ preventScroll: true });
  }

  function close() {
    if (closing) return;
    closing = true;
    var el = stage.querySelector(".lb-media");
    var a = set[index];
    var t = a && thumbOf(a);
    var box = t && t.getBoundingClientRect();
    var onScreen = box && box.bottom > 0 && box.top < window.innerHeight;
    var k = el && !still && el.animate && onScreen ? flip(el, box) : null;
    if (k) {
      opener = a;
      el.animate(k.slice().reverse(), { duration: 360, easing: "cubic-bezier(0.4, 0, 0.6, 1)", fill: "forwards" }).onfinish = finish;
      dlg.animate([{ backgroundColor: "rgba(11,17,16,1)" }, { backgroundColor: "rgba(11,17,16,0)" }], { duration: 360, fill: "forwards" });
    } else {
      finish();
    }
  }

  links.forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
      e.preventDefault();
      open(a);
    });
  });
  dlg.querySelector(".lb-close").addEventListener("click", close);
  dlg.querySelector(".lb-prev").addEventListener("click", function () { show(index - 1); });
  dlg.querySelector(".lb-next").addEventListener("click", function () { show(index + 1); });
  dlg.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
  dlg.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1); }
  });

  // A swipe sideways moves through the set; a tap beside the picture closes.
  var x0 = null, y0 = 0;
  stage.addEventListener("pointerdown", function (e) { x0 = e.clientX; y0 = e.clientY; });
  stage.addEventListener("pointerup", function (e) {
    if (x0 === null) return;
    var dx = e.clientX - x0, dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
    else if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && e.target === stage) close();
  });
})();

/* ---------------------------------------------------------------------------
   Inside the masjid (homepage): the strip of photographs.

   It scrolls sideways by itself (a trackpad, a swipe, the arrow keys once it
   has focus); the two buttons move it most of a screen at a time, for a
   mouse. They appear only when there is more to see, and each one greys out
   at its end.
   --------------------------------------------------------------------------- */
(function () {
  var strip = document.querySelector(".strip");
  var nav = document.querySelector(".strip-nav");
  if (!strip || !nav) return;
  var buttons = nav.querySelectorAll(".strip-btn");
  var smooth = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // aria-disabled rather than disabled: a disabled button loses the keyboard
  // focus it has, and a reader at the end of the strip would be dropped.
  function update() {
    var max = strip.scrollWidth - strip.clientWidth;
    nav.hidden = max < 8;
    buttons[0].setAttribute("aria-disabled", String(strip.scrollLeft < 8));
    buttons[1].setAttribute("aria-disabled", String(strip.scrollLeft > max - 8));
  }
  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.getAttribute("aria-disabled") === "true") return;
      strip.scrollBy({ left: Number(b.getAttribute("data-dir")) * strip.clientWidth * 0.8, behavior: smooth ? "smooth" : "auto" });
    });
  });
  // Tabbing to a picture brings all of it into view.
  strip.addEventListener("focusin", function (e) {
    var li = e.target.closest && e.target.closest("li");
    if (li) li.scrollIntoView({ inline: "nearest", block: "nearest", behavior: smooth ? "smooth" : "auto" });
  });
  strip.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
})();

/* ---------------------------------------------------------------------------
   The tour (tour.html): a walk round the masjid, stop by stop.

   The list of stops marks the one being read (aria-current, shown in weight
   and colour), so a reader always knows where they are in the building. That
   is all this does: the page is complete without it.
   --------------------------------------------------------------------------- */
(function () {
  var stops = Array.prototype.slice.call(document.querySelectorAll(".stop[id]"));
  var links = Array.prototype.slice.call(document.querySelectorAll(".route a[href^='#']"));
  if (!stops.length || !links.length || !("IntersectionObserver" in window)) return;
  var current = null;

  function mark(id) {
    if (id === current) return;
    current = id;
    links.forEach(function (a) {
      if (a.getAttribute("href") === "#" + id) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
  }

  // A stop counts as being read once it reaches the upper part of the screen.
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); });
  }, { rootMargin: "-30% 0px -60% 0px" });
  stops.forEach(function (s) { io.observe(s); });
})();

/* At the prayer hall: standing, bowing and prostrating, one at a time, by
   pressing the position's name. Without script the three sit side by side. */
(function () {
  Array.prototype.slice.call(document.querySelectorAll(".positions")).forEach(function (box) {
    var pick = box.querySelector(".positions-pick");
    var figs = Array.prototype.slice.call(box.querySelectorAll(".frames--tri > figure"));
    var btns = Array.prototype.slice.call(box.querySelectorAll(".positions-btn"));
    if (!pick || !figs.length || figs.length !== btns.length) return;
    function show(i) {
      figs.forEach(function (f, j) { f.hidden = j !== i; });
      btns.forEach(function (b, j) { b.setAttribute("aria-pressed", String(j === i)); });
    }
    btns.forEach(function (b, i) { b.addEventListener("click", function () { show(i); }); });
    box.classList.add("is-picking");
    pick.hidden = false;
    show(0);
  });
})();
