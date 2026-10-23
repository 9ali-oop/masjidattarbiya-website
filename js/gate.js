/* ---------------------------------------------------------------------------
   "Being updated" notice (maintenance mode).

   While ON is true, a visitor sees a short notice instead of the page: the
   masjid's name, the prayer times page, the monthly timetable PDFs, the
   donate page, and how to get in touch. Four things always get through:

   - the donate page, which does not load this script at all;
   - the prayer times page (today's times, the week and the monthly PDFs);
   - a donor coming back from GoCardless (any address with ?thanks=), who
     sees the page and the thank-you banner as normal;
   - the masjid's own team, after opening any page once with
     ?preview=<the token below> on their device. ?preview=off undoes it.

   This hides the site from ordinary visitors. It is not security: the pages
   are still public files, and anyone who reads this script can find the
   token. To open the site to everyone, set ON to false (or delete this
   file and its <script> tag from the pages) and push.
   --------------------------------------------------------------------------- */
(function () {
  var ON = true;
  var TOKEN = "lshsmnyTlbG2";
  var KEY = "atb-preview";
  if (!ON) return;

  var q, through = false;
  try { q = new URLSearchParams(location.search); } catch (e) { q = null; }
  try {
    if (q && q.get("preview") === TOKEN) localStorage.setItem(KEY, TOKEN);
    if (q && q.get("preview") === "off") localStorage.removeItem(KEY);
    through = localStorage.getItem(KEY) === TOKEN;
  } catch (e) { /* no storage: the link still works for this one visit */ }
  if (q && q.get("preview") === TOKEN) through = true;
  if (q && q.has("thanks")) return;
  // The prayer times page stays open to everyone, like the donate page: it is
  // what most visitors come for, and it keeps the monthly timetable PDFs.
  if (/^\/prayer-times(\.html)?$/.test(location.pathname)) return;

  var root = document.documentElement;
  var css = document.createElement("style");
  css.textContent =
    "html.is-maintenance body > :not(.maintenance){display:none!important}" +
    ".maintenance{min-height:100vh;display:grid;place-items:center;padding:40px 20px;background:var(--bg,#fbfaf7);font-family:var(--font-body,system-ui,sans-serif);color:var(--ink,#1c2321)}" +
    ".maintenance-card{max-width:560px;width:100%;text-align:center}" +
    ".maintenance-card img{width:180px;height:auto;margin:0 auto 20px;display:block}" +
    ".maintenance-ar{font:500 2rem/1.3 var(--font-arabic,sans-serif);color:var(--green-dark,#1a7078);margin:0}" +
    ".maintenance h1{font:400 clamp(2rem,6vw,2.8rem)/1.15 var(--font-head,Georgia,serif);color:var(--green-ink,#0e4a50);margin:4px 0 14px}" +
    ".maintenance p{margin:0 0 14px;line-height:1.6}" +
    ".maintenance .btn-row{justify-content:center;margin:22px 0 26px}" +
    ".maintenance .maintenance-pdfs{margin:-12px 0 26px}" +
    ".maintenance .maintenance-pdfs:empty{display:none}" +
    ".maintenance-contact{list-style:none;margin:0 0 18px;padding:18px 0 0;border-top:1px solid var(--border,#e2e0d8);font-size:.95rem}" +
    ".maintenance-contact li{margin:6px 0}" +
    ".maintenance small{color:var(--ink-soft,#4b5a55)}" +
    ".preview-pill{position:fixed;left:12px;bottom:12px;z-index:200;display:flex;gap:10px;align-items:center;padding:8px 14px;border-radius:999px;background:var(--green-ink,#0e4a50);color:#fff;font:600 .8rem/1.3 var(--font-body,system-ui,sans-serif);box-shadow:0 6px 20px rgba(0,0,0,.2)}" +
    ".preview-pill a{color:var(--gold-light,#f8f0e0);text-decoration:underline}" +
    "@media print{.preview-pill{display:none}}";
  document.head.appendChild(css);

  if (through) {
    document.addEventListener("DOMContentLoaded", function () {
      var pill = document.createElement("div");
      pill.className = "preview-pill";
      pill.innerHTML = 'Preview: the public sees "being updated" <a href="?preview=off">Leave preview</a>';
      document.body.appendChild(pill);
    });
    return;
  }

  root.classList.add("is-maintenance");
  document.addEventListener("DOMContentLoaded", function () {
    var box = document.createElement("main");
    box.className = "maintenance";
    box.id = "main";
    box.innerHTML =
      '<div class="maintenance-card">' +
        '<img src="/assets/logo.png" alt="" width="400" height="196">' +
        '<p class="maintenance-ar" lang="ar">مسجد التربية</p>' +
        "<h1>Attarbiya Masjid</h1>" +
        "<p>Our website is being updated and will be back shortly.</p>" +
        "<p>The prayer times and the monthly timetable are still here, and donations are open as usual.</p>" +
        '<div class="btn-row">' +
          '<a class="btn btn-gold" href="/prayer-times">Prayer times</a>' +
          '<a class="btn btn-teal" href="/donate">Donate</a>' +
        "</div>" +
        '<div class="btn-row maintenance-pdfs"></div>' +
        '<ul class="maintenance-contact">' +
          '<li>WhatsApp or call <a href="https://wa.me/447929242914">07929 242914</a></li>' +
          '<li>Email <a href="mailto:info@masjidatarbiya.org">info@masjidatarbiya.org</a></li>' +
          "<li>2 Revesby Walk, Nechells, Birmingham B7 4LG</li>" +
        "</ul>" +
        "<small>Attarbiya Masjid &amp; Kowneyn Community Centre. Registered charity 1142204.</small>" +
      "</div>";
    document.body.insertBefore(box, document.body.firstChild);
    // The page's own main landmark is hidden; give it up so there is one.
    var other = document.querySelectorAll("main#main");
    if (other.length > 1) other[1].removeAttribute("id");
    document.title = "Being updated | Attarbiya Masjid";

    // The monthly timetable PDFs, as on the prayer times page: each month that
    // has not ended yet (Europe/London), opened in the browser's own viewer.
    var month = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit" }).format(new Date());
    fetch("/assets/timetables.json", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var live = ((d && d.months) || []).filter(function (m) {
          return m.month >= month && /^assets\/timetables\/[\w.-]+\.pdf$/.test(m.file || "");
        }).slice(0, 2);
        box.querySelector(".maintenance-pdfs").innerHTML = live.map(function (m) {
          var name = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(m.month + "-01T12:00:00Z"));
          return '<a class="btn btn-line" href="/' + m.file + '" target="_blank" rel="noopener">' + name + " timetable (PDF)</a>";
        }).join("");
      })
      .catch(function () { /* no list: the notice stands without it */ });
  });
})();
