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

   Renders assets/history.json as chapters ("chapters" in the file; each
   milestone names its "chapter"). Entries marked "unknown" are deliberate
   gaps: they render as open questions rather than being quietly left out,
   because the point of the page is partly to get them answered. Each carries
   a button that opens WhatsApp with a message already started.

   The motion, all of it optional: a ribbon of years under the heading band, a
   rail (or a slim bar on a phone) whose year rolls over as the reader passes
   each milestone, chapter introductions that light up word by word, cards that
   settle forward, a spine that fills with gold. Everything is readable before
   any of it runs, and stays readable if it never does: see CLAUDE.md.
   --------------------------------------------------------------------------- */
(function () {
  var el = document.getElementById("timeline");
  if (!el) return;

  var STRANDS = { charity: "The charity", building: "The building", learning: "Learning", community: "Community" };
  var WHATSAPP = "https://wa.me/447908854187?text=";
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 1.6l3 4.2 5.2-.7-.7 5.2 4.2 3-4.2 3 .7 5.2-5.2-.7-3 4.2-3-4.2-5.2.7.7-5.2-4.2-3 4.2-3-.7-5.2 5.2.7z"/></svg>';
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /** The year as the rail shows it: four digits where there are some. */
  function railYear(m) {
    if (m.status === "unknown") return "?";
    var y = String(m.year).match(/\d{4}/);
    if (y) return y[0];
    return m.year === "Today" ? "Now" : String(m.year);
  }

  function img(src, alt, w, h) {
    return '<img src="' + esc(src) + '" alt="' + esc(alt || "") + '"' +
      (w && h ? ' width="' + w + '" height="' + h + '"' : "") + ' loading="lazy" decoding="async">';
  }

  /** A photograph (or, with image_fit "contain", a logo shown whole), with its caption. */
  function figure(x, cls) {
    if (!x.image) return "";
    var logo = x.image_fit === "contain";
    return '<figure class="' + cls + (logo ? " is-logo" : "") + '">' +
      (logo ? '<span class="media-frame">' : "") +
      img(x.image, x.image_alt, x.image_width, x.image_height) +
      (logo ? "</span>" : "") +
      (x.image_caption ? "<figcaption>" + esc(x.image_caption) + "</figcaption>" : "") +
    "</figure>";
  }

  function card(m) {
    var unknown = m.status === "unknown";
    var asks = (m.asks || []).map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("");
    var msg = "Salaam, about “" + m.title + "” on the masjid's Our Story page: ";
    return '<li class="tl-item' + (unknown ? " is-unknown" : "") + '" id="m-' + esc(m.id) + '" data-strand="' + esc(m.strand || "") +
        '" data-year="' + esc(railYear(m)) + '">' +
      '<span class="tl-year">' + (unknown ? '<span aria-hidden="true">?</span><span class="visually-hidden">Year not yet known</span>' : esc(m.year)) + "</span>" +
      '<div class="tl-card">' +
        figure(m, "tl-media") +
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

  function chapter(c, items) {
    return '<section class="chapter" id="' + esc(c.id) + '" data-chapter="' + esc(c.id) + '"' +
        (c.title ? ' aria-labelledby="ch-' + esc(c.id) + '"' : "") + ">" +
      (c.title ?
        '<header class="chapter-head">' +
          '<span class="chapter-star">' + STAR + "</span>" +
          (c.ar ? '<span class="chapter-watermark ar" lang="ar" aria-hidden="true">' + esc(c.ar) + "</span>" : "") +
          (c.number ? '<span class="chapter-num">' + esc(c.number) + "</span>" : "") +
          '<h2 id="ch-' + esc(c.id) + '">' + esc(c.title) + "</h2>" +
          (c.years ? '<p class="chapter-years">' + esc(c.years) + "</p>" : "") +
          (c.intro ? '<p class="chapter-intro">' + esc(c.intro) + "</p>" : "") +
          figure(c, "chapter-figure") +
        "</header>" : "") +
      '<ol class="timeline">' + items.map(card).join("") + "</ol>" +
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

  function build(groups) {
    var nav = groups.filter(function (g) { return g.c.title; }).map(function (g) {
      return '<li data-chapter="' + esc(g.c.id) + '"><a href="#' + esc(g.c.id) + '"><b>' + esc(g.c.title) + "</b>" +
        (g.c.years ? "<span>" + esc(g.c.years) + "</span>" : "") + "</a></li>";
    }).join("");
    el.innerHTML =
      '<div class="story-rail">' +
        '<div aria-hidden="true">' +
          '<span class="rail-num"></span><span class="rail-ar ar" lang="ar"></span><span class="rail-title"></span>' +
          '<span class="rail-year"></span><span class="rail-count"></span><span class="rail-bar"><i></i></span>' +
        "</div>" +
        (nav ? '<nav class="rail-nav" aria-label="Chapters of the story"><ol>' + nav + "</ol></nav>" : "") +
      "</div>" +
      '<div class="story-body">' +
        '<div class="story-bar" aria-hidden="true"><span class="bar-ar ar" lang="ar"></span><span class="bar-title"></span><span class="bar-year"></span></div>' +
        '<div class="story-chapters">' + groups.map(function (g) { return chapter(g.c, g.items); }).join("") + "</div>" +
      "</div>";
  }

  /* --- small helpers ------------------------------------------------------ */

  function all(sel, root) { return Array.prototype.slice.call((root || el).querySelectorAll(sel)); }
  function clamp(v) { return Math.min(1, Math.max(0, v)); }
  function chapterData(groups, id) {
    for (var i = 0; i < groups.length; i++) if (groups[i].c.id === id) return groups[i].c;
    return {};
  }

  /** Roll the rail's year over: the old one leaves, the new one arrives. */
  function roll(box, text, back) {
    var cur = box.querySelector("span:not(.is-out)");
    if (cur && cur.textContent === text) return;
    if (reduced || !cur) { box.innerHTML = "<span>" + esc(text) + "</span>"; return; }
    box.classList.toggle("is-back", !!back);
    var next = document.createElement("span");
    next.className = "is-in";
    next.textContent = text;
    box.appendChild(next);
    cur.classList.add("is-out");
    void next.offsetWidth; // start the new year from below before letting it rise
    next.className = "";
    setTimeout(function () { if (cur.parentNode) cur.parentNode.removeChild(cur); }, 700);
  }

  function countUp(b, to) {
    if (reduced || !window.requestAnimationFrame) { b.textContent = to; return; }
    var t0 = null;
    function step(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / 1300);
      b.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
    setTimeout(function () { b.textContent = to; }, 2000); // a background tab never runs the frames
  }

  function stats(ms) {
    var box = document.getElementById("story-stats");
    if (!box) return;
    var known = ms.filter(function (m) { return m.status !== "unknown"; }).length;
    box.insertAdjacentHTML("beforeend",
      '<li><b data-to="' + known + '">' + known + "</b>Milestones on record</li>" +
      '<li><b data-to="' + (ms.length - known) + '">' + (ms.length - known) + "</b>Still to be remembered</li>");
    all("b[data-to]", box).forEach(function (b) { countUp(b, +b.getAttribute("data-to")); });
  }

  function ribbon(groups) {
    var box = document.getElementById("story-ribbon");
    if (!box) return;
    var run = "";
    groups.forEach(function (g) {
      g.items.forEach(function (m) {
        if (m.status === "unknown") return;
        run += "<span><b>" + esc(m.year) + "</b>" + esc(m.title) + '</span><span class="sep">✦</span>';
      });
    });
    if (!run) return;
    box.innerHTML = '<div class="story-ribbon-track">' + run + run + "</div>";
    box.hidden = false;
  }

  /** Split each chapter introduction into words, so they can light up in turn. */
  function splitIntros() {
    if (reduced) return;
    all(".chapter-intro").forEach(function (p) {
      p.innerHTML = p.textContent.split(/(\s+)/).map(function (w) {
        return /^\s*$/.test(w) ? w : '<span class="w">' + esc(w) + "</span>";
      }).join("");
      p.classList.add("is-split");
    });
  }

  /* --- following the reader ---------------------------------------------- */

  var groups = [], current = null, rail = {}, ticking = false;

  function visibleItems() { return all(".tl-item:not([hidden])"); }

  function setCurrent(item, items) {
    if (!item || item === current) return;
    var back = current && items.indexOf(item) < items.indexOf(current);
    if (current) current.classList.remove("is-current");
    current = item;
    item.classList.add("is-current");
    var ch = item.closest(".chapter");
    var c = chapterData(groups, ch ? ch.getAttribute("data-chapter") : "");
    var year = item.getAttribute("data-year") || "";
    rail.num.textContent = c.number || "";
    rail.ar.textContent = c.ar || "";
    rail.title.textContent = c.title || "";
    rail.count.textContent = "Milestone " + (items.indexOf(item) + 1) + " of " + items.length;
    rail.barAr.textContent = c.ar || "";
    rail.barTitle.textContent = c.title || "";
    rail.barYear.textContent = year;
    roll(rail.year, year, back);
    all(".rail-nav a").forEach(function (a) {
      if (a.getAttribute("href") === "#" + (c.id || "")) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }

  function lightWords() {
    var vh = window.innerHeight;
    all(".chapter-intro.is-split").forEach(function (p) {
      var words = p.querySelectorAll(".w");
      var r = p.getBoundingClientRect();
      // Starts as the paragraph comes up past 90% of the screen, done by 45%.
      var t = clamp((vh * 0.9 - r.top) / (vh * 0.45 + r.height * 0.5));
      var lit = Math.round(t * words.length);
      if (+p.getAttribute("data-lit") === lit) return;
      p.setAttribute("data-lit", lit);
      for (var i = 0; i < words.length; i++) words[i].classList.toggle("is-lit", i < lit);
    });
  }

  function progress() {
    ticking = false;
    var line = window.innerHeight * 0.55;
    var body = el.querySelector(".story-chapters");
    var r = body.getBoundingClientRect();
    el.style.setProperty("--progress", (r.height ? clamp((line - r.top) / r.height) : 0).toFixed(4));
    var items = visibleItems(), last = null;
    items.forEach(function (item) {
      var reached = item.getBoundingClientRect().top + 18 < line;
      if (reached) {
        last = item;
        if (!item.classList.contains("is-reached")) {
          item.classList.add("is-reached");
          if (!reduced) {
            item.classList.add("is-pulse");
            setTimeout(function () { item.classList.remove("is-pulse"); }, 1200);
          }
        }
      } else {
        item.classList.remove("is-reached");
      }
    });
    var lastChapter = null;
    all(".chapter:not([hidden])").forEach(function (ch) {
      var reached = ch.getBoundingClientRect().top + 30 < line;
      ch.classList.toggle("is-reached", reached);
      if (reached) lastChapter = ch;
    });
    // Reading a chapter's opening, before its first milestone: the rail
    // already shows the chapter the reader is in, and the year it starts with.
    if (lastChapter && (!last || !lastChapter.contains(last))) {
      last = lastChapter.querySelector(".tl-item:not([hidden])") || last;
    }
    setCurrent(last || items[0], items);
    lightWords();
  }
  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(progress); }
  }

  /** Where the bar and rail pin: just under the part of the header that stays. */
  function stickTop() {
    var header = document.querySelector(".site-header"), bar = document.querySelector(".topbar");
    var h = header ? header.offsetHeight - (bar ? bar.offsetHeight : 0) : 0;
    el.style.setProperty("--stick-top", Math.max(0, h) + "px");
  }

  function filters() {
    var buttons = document.querySelectorAll(".tl-filter");
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        var strand = b.getAttribute("data-strand");
        buttons.forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
        all(".tl-item").forEach(function (item) {
          var match = strand === "all" ||
            (strand === "unknown" ? item.classList.contains("is-unknown") : item.getAttribute("data-strand") === strand);
          item.hidden = !match;
          // Filtering must never leave a card waiting for an animation.
          if (match) item.classList.add("is-visible");
        });
        all(".chapter").forEach(function (ch) {
          var empty = !ch.querySelector(".tl-item:not([hidden])");
          ch.hidden = empty;
          var li = el.querySelector('.rail-nav li[data-chapter="' + ch.getAttribute("data-chapter") + '"]');
          if (li) li.hidden = empty;
          if (!empty) all(".chapter-figure", ch).forEach(function (f) { f.classList.add("is-visible"); });
        });
        current = null;
        progress();
      });
    });
  }

  function reveal() {
    // The cards are already readable at this point: the animation only starts
    // once we know we can finish it. Anything that stops us - no observer,
    // reduced motion - simply leaves the timeline as it is, fully visible.
    if (reduced || !("IntersectionObserver" in window)) return;

    el.classList.add("is-animated");

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.15 });
    all(".tl-item, .chapter-figure").forEach(function (i) { io.observe(i); });

    // Belt and braces. If the observer has revealed nothing after a few seconds
    // - a background tab, a browser quirk - show everything rather than leaving
    // a reader looking at a page that is waiting for something.
    setTimeout(function () {
      if (!el.querySelector(".tl-item.is-visible")) {
        // Snap, do not fade: a background tab pauses transitions.
        el.classList.add("is-settled");
        el.classList.remove("is-animated");
      }
    }, 3000);
  }

  // Printing, or saving the page, shows everything settled.
  window.addEventListener("beforeprint", function () { el.classList.add("is-settled"); });

  getJSON("assets/history.json")
    .then(function (d) {
      var ms = (d && d.milestones) || [];
      if (!ms.length) throw new Error("empty");
      groups = group(d);
      build(groups);
      rail = {
        num: el.querySelector(".rail-num"), ar: el.querySelector(".rail-ar"), title: el.querySelector(".rail-title"),
        year: el.querySelector(".rail-year"), count: el.querySelector(".rail-count"),
        barAr: el.querySelector(".bar-ar"), barTitle: el.querySelector(".bar-title"), barYear: el.querySelector(".bar-year")
      };
      stats(ms);
      ribbon(groups);
      splitIntros();
      filters();
      reveal();
      stickTop();
      progress();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", function () { stickTop(); onScroll(); });
      // A link to a milestone or chapter (history#m-madrasah) lands on it once it exists.
      if (location.hash.length > 1) {
        var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target) target.scrollIntoView();
      }
    })
    .catch(function () {
      el.innerHTML = '<div class="tl-card"><p>The timeline could not be loaded. ' +
        'Please try again in a moment.</p></div>';
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
          : groups.map(function (g) { return "<td>" + (r[g.id] ? esc(r[g.id]) : "&mdash;") + "</td>"; }).join("");
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
   Silent loops and the photo strip.

   A clip (video.loop-clip) is a few seconds, muted, with a poster. It loads
   only when it comes near the screen, plays only while on it, and pauses when
   it leaves or the tab is hidden. A reader who asks for reduced motion, or for
   less data, never downloads one: the poster stays, which is the same picture
   standing still. Without script the poster is all anyone sees.

   The strip on the homepage (.gallery) scrolls sideways by itself (trackpad,
   touch, arrow keys once focused); the two buttons are a convenience, shown
   only when the script is running, and say when there is no further to go.
   --------------------------------------------------------------------------- */
(function () {
  var reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var saveData = !!(navigator.connection && navigator.connection.saveData);

  var clips = Array.prototype.slice.call(document.querySelectorAll("video.loop-clip[data-src]"));
  if (clips.length && !reduced && !saveData && "IntersectionObserver" in window) {
    var showing = [];
    var play = function (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target, i = showing.indexOf(v);
        if (e.isIntersecting) {
          if (!v.getAttribute("src")) { v.src = v.getAttribute("data-src"); }
          if (i < 0) showing.push(v);
          if (!document.hidden) play(v);
        } else {
          if (i >= 0) showing.splice(i, 1);
          v.pause();
        }
      });
    }, { rootMargin: "120px 0px", threshold: 0.15 });
    clips.forEach(function (v) { io.observe(v); });
    document.addEventListener("visibilitychange", function () {
      showing.forEach(function (v) { if (document.hidden) v.pause(); else play(v); });
    });
  }

  var strip = document.querySelector(".gallery");
  var nav = document.querySelector(".gallery-nav");
  if (!strip || !nav) return;
  var buttons = nav.querySelectorAll(".gallery-btn");
  nav.hidden = false;

  function step() {
    var item = strip.querySelector(".gallery-item");
    if (!item) return strip.clientWidth * 0.8;
    var w = item.getBoundingClientRect().width + 14;
    return w * Math.max(1, Math.floor(strip.clientWidth / w) - 1);
  }
  function update() {
    var max = strip.scrollWidth - strip.clientWidth;
    buttons[0].setAttribute("aria-disabled", String(strip.scrollLeft <= 2));
    buttons[1].setAttribute("aria-disabled", String(strip.scrollLeft >= max - 2));
  }
  buttons.forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.getAttribute("aria-disabled") === "true") return;
      strip.scrollBy({ left: step() * +b.getAttribute("data-dir"), behavior: reduced ? "auto" : "smooth" });
    });
  });
  var ticking = false;
  strip.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { ticking = false; update(); });
  }, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
