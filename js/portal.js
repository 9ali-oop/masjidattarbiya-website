/* ==========================================================================
   Al Furqan parent portal.

   A parent signs in with a one-time code emailed to them (no password),
   gives their own details once, then registers and manages their children.
   Madrasah staff, listed in the database's staff table, also see every
   registration and can set its status or download them all as a spreadsheet.

   The backend is Supabase, spoken to directly over its REST API, so there is
   no library to load and nothing from a third party runs on this page. Every
   permission is enforced by the database itself (row-level security in
   supabase/schema.sql), never by this script: a parent who edits the
   JavaScript still cannot see anyone else's child.

   With no settings in js/portal-config.js the page says the portal is not
   open yet and collects nothing.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("portal");
  if (!root) return;

  var cfg = window.PORTAL_CONFIG || {};
  var BASE = String(cfg.supabaseUrl || "").replace(/\/+$/, "");
  var KEY = String(cfg.supabaseAnonKey || "");
  var STORE = "alfurqan-portal-session";
  var WHATSAPP = "https://wa.me/447908854187";
  var PHONE = "tel:+447908854187";

  var STATUS = {
    pending: "Pending review",
    accepted: "Accepted",
    waiting: "Waiting list",
    withdrawn: "Withdrawn"
  };
  var YEARS = ["Not at school yet", "Nursery", "Reception", "Year 1", "Year 2", "Year 3", "Year 4",
               "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"];
  var LEVELS = ["Just starting (Qaidah)", "Reading the Qur'an with help", "Reading the Qur'an fluently",
                "Memorising (hifdh)", "Not sure"];
  var RELATIONS = ["Mother", "Father", "Guardian", "Other"];

  var session = null;
  var state = { guardian: null, students: [], resources: [], staff: false, all: [], filter: "all" };

  /* ---------- small helpers ---------- */

  function h(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function $(sel) { return root.querySelector(sel); }

  function options(list, selected, placeholder) {
    return (placeholder ? '<option value="">' + h(placeholder) + "</option>" : "") +
      list.map(function (v) {
        return "<option" + (v === selected ? " selected" : "") + ">" + h(v) + "</option>";
      }).join("");
  }

  function show(html) {
    root.innerHTML = html;
    // Move focus to the new heading, so a screen reader hears what changed.
    var head = root.querySelector("h2");
    if (head) { head.setAttribute("tabindex", "-1"); head.focus({ preventScroll: true }); }
  }

  function status(el, message, ok) {
    if (!el) return;
    el.textContent = message || "";
    el.className = "form-status" + (message ? (ok ? " is-ok" : " is-error") : "");
  }

  function busy(form, on) {
    form.querySelectorAll("button, input, select, textarea").forEach(function (c) { c.disabled = on; });
  }

  function prettyDate(iso) {
    var p = String(iso).slice(0, 10).split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2])).toLocaleDateString("en-GB",
      { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  }

  function ageOn(iso, when) {
    var p = String(iso).split("-").map(Number);
    var d = when || new Date();
    var age = d.getFullYear() - p[0];
    if (d.getMonth() + 1 < p[1] || (d.getMonth() + 1 === p[1] && d.getDate() < p[2])) age -= 1;
    return age;
  }

  function phoneOk(v) { return String(v).replace(/[^\d]/g, "").length >= 10; }

  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }

  /* ---------- session ---------- */

  function loadSession() {
    try { return JSON.parse(window.localStorage.getItem(STORE)); } catch (e) { return null; }
  }
  function saveSession(s) {
    session = s;
    try { window.localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) { /* private window */ }
  }
  function clearSession() {
    session = null;
    try { window.localStorage.removeItem(STORE); } catch (e) { /* nothing to clear */ }
  }
  function fromTokens(d) {
    return {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: Number(d.expires_at) || Math.floor(Date.now() / 1000) + Number(d.expires_in || 3600),
      user: d.user ? { id: d.user.id, email: d.user.email } : null
    };
  }

  /* ---------- talking to Supabase ---------- */

  function explain(data, code) {
    if (code === 429) return "Too many attempts in a short time. Please wait a minute and try again.";
    var m = data && (data.msg || data.error_description || data.message || data.error);
    if (code >= 500) return "The portal is having trouble right now. Please try again in a few minutes.";
    return m ? String(m) : "Something went wrong (error " + code + "). Please try again.";
  }

  function api(path, opts) {
    opts = opts || {};
    var headers = { apikey: KEY, "Content-Type": "application/json" };
    if (opts.auth !== false && session) headers.Authorization = "Bearer " + session.access_token;
    if (opts.prefer) headers.Prefer = opts.prefer;
    return fetch(BASE + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.text().then(function (t) {
        var data = null;
        try { data = t ? JSON.parse(t) : null; } catch (e) { data = t; }
        if (!r.ok) {
          var err = new Error(explain(data, r.status));
          err.status = r.status;
          throw err;
        }
        return data;
      });
    }, function () {
      var err = new Error("Could not reach the portal. Check your connection and try again.");
      err.status = 0;
      throw err;
    });
  }

  function ended() {
    var e = new Error("For your security you have been signed out. Please sign in again.");
    e.ended = true;
    return e;
  }

  function refresh() {
    if (!session || !session.refresh_token) return Promise.reject(ended());
    return api("/auth/v1/token?grant_type=refresh_token", {
      method: "POST", auth: false, body: { refresh_token: session.refresh_token }
    }).then(function (d) {
      var s = fromTokens(d);
      if (!s.user) s.user = session.user;
      saveSession(s);
    }, function () {
      clearSession();
      throw ended();
    });
  }

  /** A request as the signed-in parent, refreshing the session when it runs out. */
  function authed(path, opts) {
    opts = opts || {};
    var ready = session && session.expires_at - 60 < Date.now() / 1000 ? refresh() : Promise.resolve();
    return ready.then(function () { return api(path, opts); }).catch(function (e) {
      if (e.status === 401 && session && !opts.retried) {
        return refresh().then(function () { return api(path, Object.assign({}, opts, { retried: true })); });
      }
      throw e;
    });
  }

  /* ---------- views: closed, sign in, code ---------- */

  function viewClosed() {
    show(
      "<h2>The parent portal opens soon</h2>" +
      "<p>Online registration for Madrasah Al Furqan is being set up. Until it opens, you can register " +
      "your child, or ask about places, by message or phone.</p>" +
      '<div class="btn-row">' +
        '<a class="btn btn-teal" href="' + WHATSAPP + '" target="_blank" rel="noopener">WhatsApp the masjid</a>' +
        '<a class="btn btn-line" href="' + PHONE + '">Call 07908 854187</a>' +
      "</div>"
    );
  }

  function viewEmail(notice, email) {
    show(
      "<h2>Sign in</h2>" +
      "<p>Whether you are new or returning, enter your email and we will send you a code to sign in. " +
      "There is no password.</p>" +
      '<form class="form" id="f-email" novalidate>' +
        '<div class="field"><label for="p-email">Email address</label>' +
          '<input id="p-email" name="email" type="email" autocomplete="email" inputmode="email" required value="' + h(email || "") + '" /></div>' +
        '<p class="form-status" id="s-email" role="status"></p>' +
        '<div><button class="btn btn-teal" type="submit">Email me a code</button></div>' +
      "</form>"
    );
    status($("#s-email"), notice, false);
    var form = $("#f-email");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var addr = val("p-email");
      var input = document.getElementById("p-email");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
        input.setAttribute("aria-invalid", "true");
        status($("#s-email"), "Enter your email address, for example name@example.com.");
        input.focus();
        return;
      }
      input.removeAttribute("aria-invalid");
      busy(form, true);
      status($("#s-email"), "Sending your code…", true);
      sendCode(addr).then(function () { viewCode(addr); }, function (err) {
        busy(form, false);
        status($("#s-email"), err.message);
      });
    });
  }

  function sendCode(email) {
    var back = window.location.origin + window.location.pathname;
    return api("/auth/v1/otp?redirect_to=" + encodeURIComponent(back), {
      method: "POST", auth: false, body: { email: email, create_user: true }
    });
  }

  function viewCode(email) {
    show(
      "<h2>Check your email</h2>" +
      "<p>We have sent a sign-in code to <b>" + h(email) + "</b>. It can take a minute to arrive, so check " +
      "your spam folder too. Enter the code below, or tap the sign-in link in the email.</p>" +
      '<form class="form" id="f-code" novalidate>' +
        '<div class="field field-code"><label for="p-code">Sign-in code</label>' +
          '<input id="p-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" ' +
          'pattern="[0-9]*" maxlength="10" required /></div>' +
        '<p class="form-status" id="s-code" role="status"></p>' +
        '<div class="btn-row"><button class="btn btn-teal" type="submit">Sign in</button></div>' +
      "</form>" +
      '<p style="margin-top:18px;"><button type="button" class="linklike" id="p-resend">Send a new code</button>' +
      ' &nbsp;&middot;&nbsp; <button type="button" class="linklike" id="p-change">Use a different email</button></p>'
    );
    var form = $("#f-code");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var code = val("p-code").replace(/\s+/g, "");
      if (!/^\d{6,10}$/.test(code)) {
        status($("#s-code"), "Enter the code from the email: it is a number, usually six digits.");
        return;
      }
      busy(form, true);
      status($("#s-code"), "Signing you in…", true);
      api("/auth/v1/verify", { method: "POST", auth: false, body: { type: "email", email: email, token: code } })
        .then(function (d) { saveSession(fromTokens(d)); return dashboard(); })
        .catch(function (err) {
          busy(form, false);
          status($("#s-code"), err.status === 400 || err.status === 401 || err.status === 403
            ? "That code is not right, or it has expired. Check the latest email, or send a new code."
            : err.message);
        });
    });
    $("#p-resend").addEventListener("click", function () {
      status($("#s-code"), "Sending a new code…", true);
      sendCode(email).then(function () {
        status($("#s-code"), "A new code is on its way. Use the newest email.", true);
      }, function (err) { status($("#s-code"), err.message); });
    });
    $("#p-change").addEventListener("click", function () { viewEmail("", email); });
  }

  /* ---------- the dashboard ---------- */

  function load() {
    var uid = session.user.id;
    return Promise.all([
      authed("/rest/v1/guardians?select=*&id=eq." + encodeURIComponent(uid)),
      authed("/rest/v1/students?select=*&guardian_id=eq." + encodeURIComponent(uid) + "&order=created_at.asc"),
      authed("/rest/v1/resources?select=*&order=created_at.desc").catch(function () { return []; }),
      authed("/rest/v1/rpc/is_staff", { method: "POST", body: {} }).catch(function () { return false; })
    ]).then(function (r) {
      state.guardian = (r[0] && r[0][0]) || null;
      state.students = r[1] || [];
      state.resources = r[2] || [];
      state.staff = r[3] === true;
      if (!state.staff) return;
      return authed("/rest/v1/students?select=*,guardians(full_name,email,phone,relationship,emergency_name,emergency_phone)" +
                    "&order=created_at.desc").then(function (all) { state.all = all || []; });
    });
  }

  function dashboard(focusRegister) {
    show('<h2>Loading your family&rsquo;s details&hellip;</h2>');
    var ready = session.user && session.user.id
      ? Promise.resolve()
      : authed("/auth/v1/user").then(function (u) { session.user = { id: u.id, email: u.email }; saveSession(session); });
    return ready.then(load).then(function () {
      render(focusRegister);
    }).catch(function (err) {
      if (err.ended) { viewEmail(err.message); return; }
      show("<h2>Your details could not be loaded</h2><p>" + h(err.message) + "</p>" +
        '<div class="btn-row"><button type="button" class="btn btn-teal" id="p-retry">Try again</button></div>');
      $("#p-retry").addEventListener("click", function () { dashboard(); });
    });
  }

  function toolbar() {
    return '<div class="portal-toolbar"><p>Signed in as <b>' + h(session.user.email) + "</b></p>" +
      '<button type="button" class="linklike" id="p-signout">Sign out</button></div>';
  }

  function bindToolbar() {
    $("#p-signout").addEventListener("click", function () {
      api("/auth/v1/logout", { method: "POST" }).catch(function () { /* signing out locally is enough */ });
      clearSession();
      // Forget everything that was loaded, so nothing lingers for the next person.
      state = { guardian: null, students: [], resources: [], staff: false, all: [], filter: "all" };
      var layout = root.closest(".portal-layout");
      if (layout) layout.classList.remove("is-wide");
      viewEmail("You have signed out.");
      status($("#s-email"), "You have signed out.", true);
    });
  }

  function render(focusRegister) {
    var layout = root.closest(".portal-layout");
    if (layout) layout.classList.toggle("is-wide", state.staff);
    // Staff who have no children at the madrasah go straight to the registrations.
    if (!state.guardian && state.staff) {
      show(toolbar() + "<h2>Madrasah staff</h2>" +
        '<p class="muted">If you also have children at the madrasah, sign in with a separate email to register them.</p>' +
        staffSection());
      bindToolbar();
      bindStaff();
      return;
    }
    if (!state.guardian) {
      show(toolbar() + "<h2>First, tell us about you</h2>" +
        "<p>We need a way to reach you before you register a child. You only do this once.</p>" +
        guardianForm(null));
      bindToolbar();
      bindGuardianForm(true);
      return;
    }

    var g = state.guardian;
    show(
      toolbar() +
      "<h2>Assalamu alaykum, " + h(g.full_name.split(" ")[0]) + "</h2>" +
      '<div class="portal-section" id="children">' +
        "<h3>Your children</h3>" + childList() +
        '<div class="btn-row"><button type="button" class="btn btn-gold" id="p-add">Register a child</button></div>' +
        '<div id="child-form-slot"></div>' +
      "</div>" +
      '<div class="portal-section">' +
        "<h3>Your details</h3>" +
        '<div id="guardian-slot"><p>' + h(g.full_name) + " (" + h(g.relationship) + ")<br />" + h(g.phone) +
          "<br />Emergency contact: " + h(g.emergency_name) + ", " + h(g.emergency_phone) + "</p>" +
          '<button type="button" class="btn btn-line" id="p-edit-me">Change your details</button></div>' +
      "</div>" +
      '<div class="portal-section">' +
        "<h3>Resources</h3>" + resourceList() +
      "</div>" +
      (state.staff ? staffSection() : "")
    );
    bindToolbar();
    $("#p-add").addEventListener("click", function () { openChildForm(null); });
    $("#p-edit-me").addEventListener("click", function () {
      $("#guardian-slot").innerHTML = guardianForm(state.guardian);
      bindGuardianForm(false);
    });
    root.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () {
        openChildForm(state.students.filter(function (s) { return s.id === b.getAttribute("data-edit"); })[0]);
      });
    });
    root.querySelectorAll("[data-remove]").forEach(function (b) {
      b.addEventListener("click", function () { confirmRemove(b); });
    });
    if (state.staff) bindStaff();
    if (focusRegister || window.location.hash === "#register") openChildForm(null);
  }

  /* ---------- the parent's own details ---------- */

  function guardianForm(g) {
    g = g || {};
    return '<form class="form" id="f-guardian" novalidate>' +
      '<div class="form-row">' +
        field("g-name", "Your full name", '<input id="g-name" autocomplete="name" required value="' + h(g.full_name) + '" />') +
        field("g-rel", "Your relationship to the child", '<select id="g-rel" required>' + options(RELATIONS, g.relationship, "Choose one") + "</select>") +
      "</div>" +
      field("g-phone", "Your phone number", '<input id="g-phone" type="tel" autocomplete="tel" required value="' + h(g.phone) + '" />',
            "The madrasah will use this to reach you about your child.") +
      '<div class="form-row">' +
        field("g-ename", "Emergency contact name", '<input id="g-ename" required value="' + h(g.emergency_name) + '" />',
              "Someone other than you, in case we cannot reach you.") +
        field("g-ephone", "Emergency contact phone", '<input id="g-ephone" type="tel" required value="' + h(g.emergency_phone) + '" />') +
      "</div>" +
      '<p class="form-status" id="s-guardian" role="status"></p>' +
      '<div class="btn-row"><button class="btn btn-teal" type="submit">Save your details</button></div>' +
    "</form>";
  }

  function field(id, label, control, hint) {
    return '<div class="field"><label for="' + id + '">' + h(label) + "</label>" +
      (hint ? '<p class="hint" id="' + id + '-hint">' + h(hint) + "</p>" : "") + control + "</div>";
  }

  function bindGuardianForm(first) {
    var form = $("#f-guardian");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var row = {
        full_name: val("g-name"), relationship: val("g-rel"), phone: val("g-phone"),
        emergency_name: val("g-ename"), emergency_phone: val("g-ephone")
      };
      var problem = !row.full_name ? ["g-name", "Enter your full name."]
        : !row.relationship ? ["g-rel", "Choose your relationship to the child."]
        : !phoneOk(row.phone) ? ["g-phone", "Enter a phone number we can reach you on, including the area code."]
        : !row.emergency_name ? ["g-ename", "Enter the name of an emergency contact."]
        : !phoneOk(row.emergency_phone) ? ["g-ephone", "Enter a phone number for your emergency contact."]
        : null;
      if (problem) { status($("#s-guardian"), problem[1]); document.getElementById(problem[0]).focus(); return; }

      busy(form, true);
      var req = first
        ? authed("/rest/v1/guardians", { method: "POST", prefer: "return=representation",
            body: Object.assign({ id: session.user.id }, row) })
        : authed("/rest/v1/guardians?id=eq." + encodeURIComponent(session.user.id),
            { method: "PATCH", prefer: "return=representation", body: row });
      req.then(function (d) {
        state.guardian = (d && d[0]) || Object.assign({}, state.guardian, row);
        render(first);
      }, function (err) {
        busy(form, false);
        status($("#s-guardian"), err.message);
      });
    });
  }

  /* ---------- children ---------- */

  function childList() {
    if (!state.students.length) return "<p>You have not registered a child yet.</p>";
    return '<ul class="child-list">' + state.students.map(function (s) {
      var st = s.status || "pending";
      return '<li class="child"><div><b>' + h(s.first_name + " " + s.last_name) + "</b><br />" +
        "<span>Born " + h(prettyDate(s.date_of_birth)) + (s.school_year ? " &middot; " + h(s.school_year) : "") +
        (s.quran_level ? " &middot; " + h(s.quran_level) : "") + "</span></div>" +
        '<span class="chip chip--' + h(st) + '">' + h(STATUS[st] || st) + "</span>" +
        '<div class="btn-row" style="grid-column:1/-1;">' +
          '<button type="button" class="linklike" data-edit="' + h(s.id) + '">Update details</button>' +
          (st === "pending" ? '<button type="button" class="linklike" data-remove="' + h(s.id) + '">Remove this registration</button>' : "") +
        "</div></li>";
    }).join("") + "</ul>";
  }

  function openChildForm(s) {
    var slot = $("#child-form-slot");
    if (!slot) return;
    s = s || {};
    var today = new Date();
    var max = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate()).toISOString().slice(0, 10);
    var min = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().slice(0, 10);
    slot.innerHTML =
      '<form class="form" id="f-child" novalidate style="margin-top:24px;" aria-labelledby="child-form-title">' +
        '<h3 id="child-form-title" tabindex="-1">' + (s.id ? "Update " + h(s.first_name) + "&rsquo;s details" : "Register a child") + "</h3>" +
        '<div class="form-row">' +
          field("c-first", "First name", '<input id="c-first" required value="' + h(s.first_name) + '" />') +
          field("c-last", "Last name", '<input id="c-last" required value="' + h(s.last_name) + '" />') +
        "</div>" +
        '<div class="form-row">' +
          field("c-dob", "Date of birth", '<input id="c-dob" type="date" min="' + min + '" max="' + max + '" required value="' + h(s.date_of_birth) + '" />') +
          field("c-year", "School year", '<select id="c-year" required>' + options(YEARS, s.school_year, "Choose one") + "</select>") +
        "</div>" +
        field("c-level", "Qur'an reading", '<select id="c-level" required>' + options(LEVELS, s.quran_level, "Choose one") + "</select>",
              "So the madrasah can place your child in the right class. If you are not sure, say so.") +
        field("c-medical", "Anything we need to know to keep your child safe",
              '<textarea id="c-medical" maxlength="1000" aria-describedby="c-medical-hint">' + h(s.medical_notes) + "</textarea>",
              "For example allergies, medical needs, or who may collect them. Leave blank if there is nothing.") +
        '<label class="check" for="c-photo"><input type="checkbox" id="c-photo"' + (s.photo_consent ? " checked" : "") + " />" +
          "<span>The madrasah may photograph my child for its own records and announcements. You can change this at any time.</span></label>" +
        (s.id ? "" : '<label class="check" for="c-confirm"><input type="checkbox" id="c-confirm" required />' +
          "<span>I am this child&rsquo;s parent or legal guardian, and these details are correct.</span></label>") +
        '<p class="form-status" id="s-child" role="status"></p>' +
        '<div class="btn-row"><button class="btn btn-teal" type="submit">' + (s.id ? "Save changes" : "Register") + "</button>" +
          '<button class="btn btn-line" type="button" id="c-cancel">Cancel</button></div>' +
      "</form>";
    $("#child-form-title").focus();
    $("#c-cancel").addEventListener("click", function () { slot.innerHTML = ""; });
    var form = $("#f-child");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var row = {
        first_name: val("c-first"), last_name: val("c-last"), date_of_birth: val("c-dob"),
        school_year: val("c-year"), quran_level: val("c-level"),
        medical_notes: val("c-medical") || null,
        photo_consent: document.getElementById("c-photo").checked
      };
      var age = row.date_of_birth ? ageOn(row.date_of_birth) : null;
      var problem = !row.first_name ? ["c-first", "Enter your child's first name."]
        : !row.last_name ? ["c-last", "Enter your child's last name."]
        : !row.date_of_birth ? ["c-dob", "Enter your child's date of birth."]
        : (age < 3 || age > 18) ? ["c-dob", "Check the date of birth: the madrasah is for children aged 3 to 18."]
        : !row.school_year ? ["c-year", "Choose your child's school year."]
        : !row.quran_level ? ["c-level", "Choose how your child reads the Qur'an now, or 'Not sure'."]
        : (!s.id && !document.getElementById("c-confirm").checked) ? ["c-confirm", "Please confirm you are the child's parent or guardian."]
        : null;
      if (problem) { status($("#s-child"), problem[1]); document.getElementById(problem[0]).focus(); return; }

      busy(form, true);
      var req = s.id
        ? authed("/rest/v1/students?id=eq." + encodeURIComponent(s.id), { method: "PATCH", prefer: "return=representation", body: row })
        : authed("/rest/v1/students", { method: "POST", prefer: "return=representation", body: row });
      req.then(function () {
        return load();
      }).then(function () {
        render();
        var list = $("#children");
        if (list) {
          list.insertAdjacentHTML("afterbegin", '<p class="form-status is-ok portal-note" role="status">' +
            (s.id ? "Saved." : "Registered. The madrasah will be in touch, and you can check the status here.") + "</p>");
        }
      }, function (err) {
        busy(form, false);
        status($("#s-child"), err.message);
      });
    });
  }

  function confirmRemove(button) {
    var id = button.getAttribute("data-remove");
    var s = state.students.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    var holder = button.parentNode;
    holder.innerHTML = "<span>Remove " + h(s.first_name) + "&rsquo;s registration?</span>" +
      '<button type="button" class="btn btn-line" data-yes>Yes, remove it</button>' +
      '<button type="button" class="linklike" data-no>Keep it</button>';
    holder.querySelector("[data-no]").addEventListener("click", function () { render(); });
    holder.querySelector("[data-yes]").addEventListener("click", function () {
      authed("/rest/v1/students?id=eq." + encodeURIComponent(id), { method: "DELETE" })
        .then(load).then(function () { render(); }, function (err) {
          holder.innerHTML = '<p class="form-status is-error">' + h(err.message) + "</p>";
        });
    });
  }

  /* ---------- resources ---------- */

  function resourceList() {
    if (!state.resources.length) {
      return '<p class="muted">Resources from the madrasah will appear here for registered families.</p>';
    }
    return '<ul class="resource-list">' + state.resources.map(function (r) {
      var external = /^https?:/.test(r.url);
      return '<li><a href="' + h(r.url) + '"' + (external ? ' target="_blank" rel="noopener"' : "") + "><b>" +
        h(r.title) + "</b>" + (r.description ? "<span>" + h(r.description) + "</span>" : "") + "</a></li>";
    }).join("") + "</ul>";
  }

  /* ---------- staff ---------- */

  function staffRows() {
    return state.all.filter(function (s) { return state.filter === "all" || s.status === state.filter; });
  }

  function staffSection() {
    var counts = {};
    state.all.forEach(function (s) { counts[s.status] = (counts[s.status] || 0) + 1; });
    return '<div class="portal-section" id="staff">' +
      "<h3>All registrations</h3>" +
      '<p class="muted">You can see this because you are on the madrasah&rsquo;s staff list. Parents cannot.</p>' +
      '<div class="btn-row" style="align-items:center; margin-bottom:16px;">' +
        '<label for="st-filter" class="visually-hidden">Show</label>' +
        '<select id="st-filter" class="btn btn-line">' +
          '<option value="all">All (' + state.all.length + ")</option>" +
          Object.keys(STATUS).map(function (k) {
            return '<option value="' + k + '"' + (state.filter === k ? " selected" : "") + ">" +
              STATUS[k] + " (" + (counts[k] || 0) + ")</option>";
          }).join("") +
        "</select>" +
        '<button type="button" class="btn btn-teal" id="st-csv">Download as a spreadsheet</button>' +
      "</div>" +
      '<div class="staff-table-wrap" tabindex="0" role="region" aria-label="All registrations"><table class="staff-table"><thead><tr>' +
        "<th>Child</th><th>Born</th><th>School year</th><th>Qur'an</th><th>Parent or guardian</th>" +
        "<th>Emergency contact</th><th>Keep safe</th><th>Photos</th><th>Registered</th><th>Status</th>" +
      "</tr></thead><tbody>" +
      (staffRows().map(function (s) {
        var g = s.guardians || {};
        return "<tr><td><b>" + h(s.first_name + " " + s.last_name) + "</b></td>" +
          "<td>" + h(prettyDate(s.date_of_birth)) + "<br />(" + ageOn(s.date_of_birth) + ")</td>" +
          "<td>" + h(s.school_year) + "</td><td>" + h(s.quran_level) + "</td>" +
          "<td>" + h(g.full_name) + " (" + h(g.relationship) + ")<br />" + h(g.phone) + "<br />" + h(g.email) + "</td>" +
          "<td>" + h(g.emergency_name) + "<br />" + h(g.emergency_phone) + "</td>" +
          "<td>" + h(s.medical_notes || "") + "</td>" +
          "<td>" + (s.photo_consent ? "Yes" : "No") + "</td>" +
          "<td>" + h(prettyDate(s.created_at)) + "</td>" +
          '<td><label class="visually-hidden" for="st-' + h(s.id) + '">Status for ' + h(s.first_name) + "</label>" +
            '<select id="st-' + h(s.id) + '" data-status="' + h(s.id) + '">' +
            Object.keys(STATUS).map(function (k) {
              return '<option value="' + k + '"' + (s.status === k ? " selected" : "") + ">" + STATUS[k] + "</option>";
            }).join("") + "</select></td></tr>";
      }).join("") || '<tr><td colspan="10">No registrations to show.</td></tr>') +
      "</tbody></table></div>" +
      '<p class="form-status" id="s-staff" role="status"></p>' +
    "</div>";
  }

  function bindStaff() {
    $("#st-filter").addEventListener("change", function (e) {
      state.filter = e.target.value;
      render();
      var f = $("#st-filter");
      if (f) f.focus();
    });
    $("#st-csv").addEventListener("click", downloadCsv);
    root.querySelectorAll("[data-status]").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var id = sel.getAttribute("data-status");
        sel.disabled = true;
        authed("/rest/v1/students?id=eq." + encodeURIComponent(id), { method: "PATCH", body: { status: sel.value } })
          .then(function () {
            state.all.forEach(function (s) { if (s.id === id) s.status = sel.value; });
            sel.disabled = false;
            status($("#s-staff"), "Status saved.", true);
          }, function (err) {
            sel.disabled = false;
            status($("#s-staff"), err.message);
          });
      });
    });
  }

  function downloadCsv() {
    var cols = [
      ["Child first name", function (s) { return s.first_name; }],
      ["Child last name", function (s) { return s.last_name; }],
      ["Date of birth", function (s) { return s.date_of_birth; }],
      ["Age", function (s) { return ageOn(s.date_of_birth); }],
      ["School year", function (s) { return s.school_year; }],
      ["Qur'an reading", function (s) { return s.quran_level; }],
      ["Keep safe notes", function (s) { return s.medical_notes; }],
      ["Photo consent", function (s) { return s.photo_consent ? "Yes" : "No"; }],
      ["Status", function (s) { return STATUS[s.status] || s.status; }],
      ["Parent or guardian", function (s) { return (s.guardians || {}).full_name; }],
      ["Relationship", function (s) { return (s.guardians || {}).relationship; }],
      ["Phone", function (s) { return (s.guardians || {}).phone; }],
      ["Email", function (s) { return (s.guardians || {}).email; }],
      ["Emergency contact", function (s) { return (s.guardians || {}).emergency_name; }],
      ["Emergency phone", function (s) { return (s.guardians || {}).emergency_phone; }],
      ["Registered", function (s) { return String(s.created_at).slice(0, 10); }]
    ];
    function cell(v) {
      var t = String(v == null ? "" : v);
      // Stop a spreadsheet treating a value as a formula.
      if (/^[=+\-@]/.test(t)) t = "'" + t;
      return '"' + t.replace(/"/g, '""') + '"';
    }
    var lines = [cols.map(function (c) { return cell(c[0]); }).join(",")].concat(staffRows().map(function (s) {
      return cols.map(function (c) { return cell(c[1](s)); }).join(",");
    }));
    var blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "al-furqan-registrations-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------- start ---------- */

  function start() {
    if (!BASE || !KEY) { viewClosed(); return; }

    // Arriving from the link in the sign-in email: the session is in the URL
    // fragment. Take it, then remove it from the address bar and history.
    var hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("access_token")) {
      saveSession(fromTokens({
        access_token: hash.get("access_token"),
        refresh_token: hash.get("refresh_token"),
        expires_at: hash.get("expires_at"),
        expires_in: hash.get("expires_in")
      }));
      window.history.replaceState({}, "", window.location.pathname);
      dashboard();
      return;
    }
    if (hash.get("error_description")) {
      window.history.replaceState({}, "", window.location.pathname);
      viewEmail("That sign-in link has expired or was already used. Enter your email for a new code.");
      return;
    }

    session = loadSession();
    if (session && session.access_token) dashboard();
    else viewEmail();
  }

  start();
})();
