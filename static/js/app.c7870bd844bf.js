/* TAUI — progressive enhancement. Every feature here is optional: the site
   works without JavaScript, and the server re-validates everything. */
(function () {
  "use strict";

  var T = {};
  try { T = JSON.parse(document.getElementById("taui-i18n").textContent); } catch (e) { /* no strings */ }
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var fmt = function (s, vars) { return String(s || "").replace(/%\((\w+)\)s/g, function (_, k) { return vars[k]; }); };
  var money = function (n) {
    var rounded = Math.round(n * 100) / 100;
    var text = rounded.toLocaleString("en-US", { maximumFractionDigits: rounded % 1 ? 2 : 0 });
    return (T.currencyPrefix || "") + text + (T.currencySuffix || "");
  };
  var el = function (tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /* --- Dark / light theme (the saved choice is applied early, in base.html) */
  function initThemeToggle() {
    var root = document.documentElement;
    var meta = $('meta[name="theme-color"]');
    var fading = null;
    $$("[data-theme-toggle]").forEach(function (button) {
      button.addEventListener("click", function () {
        var light = root.dataset.theme !== "light";
        // Let colours ease across for a moment (the CSS skips this for reduced motion).
        root.classList.add("theme-fade");
        clearTimeout(fading);
        fading = setTimeout(function () { root.classList.remove("theme-fade"); }, 450);
        if (light) root.dataset.theme = "light"; else delete root.dataset.theme;
        if (meta) meta.content = light ? "#FAF7F0" : "#0A0A0B";
        try { localStorage.setItem("taui-theme", light ? "light" : "dark"); } catch (e) { /* lasts until reload */ }
      });
    });
  }

  /* --- Mobile menu ------------------------------------------------------ */
  function initMenu() {
    var toggle = $("[data-menu-toggle]");
    var panel = $("#mobile-nav");
    if (!toggle || !panel) return;
    var label = $(".visually-hidden", toggle);
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
      if (label) label.textContent = open ? T.openMenu : T.closeMenu;
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") { toggle.click(); toggle.focus(); }
    });
  }

  /* Close the account <details> menu when clicking elsewhere. */
  function initAccountMenu() {
    var menu = $(".account-menu");
    if (!menu) return;
    document.addEventListener("click", function (e) { if (!menu.contains(e.target)) menu.removeAttribute("open"); });
  }

  /* --- Explore filters -------------------------------------------------- */
  function initFilters() {
    var box = $("[data-filters]");
    if (box && window.matchMedia("(max-width: 1023px)").matches) box.removeAttribute("open");
    $$("form[data-autosubmit]").forEach(function (form) {
      form.addEventListener("change", function (e) {
        if (e.target.hasAttribute("data-no-autosubmit")) return;
        if (window.matchMedia("(min-width: 1024px)").matches) form.requestSubmit();
      });
    });
    $$("[data-autosubmit-field]").forEach(function (field) {
      field.addEventListener("change", function () { if (field.form) field.form.requestSubmit(); });
    });
  }

  /* --- Number steppers -------------------------------------------------- */
  function initSteppers(root) {
    $$("[data-stepper]", root).forEach(function (wrap) {
      var input = $("input", wrap);
      $$("[data-step]", wrap).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var min = input.min === "" ? -Infinity : Number(input.min);
          var max = input.max === "" ? Infinity : Number(input.max);
          var next = Math.min(max, Math.max(min, (Number(input.value) || 0) + Number(btn.dataset.step)));
          input.value = String(next);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        });
      });
    });
  }

  /* --- Booking form: traveler names + live estimate ---------------------- */
  function initBookingForm() {
    var form = $("[data-booking-form]");
    if (!form) return;
    var adults = form.querySelector("[name=adults]");
    var children = form.querySelector("[name=children]");
    var holder = $("[data-traveler-fields]", form);
    var rules = null;
    try { rules = JSON.parse($("#estimate-rules").textContent); } catch (e) { rules = null; }

    function ensureField(kind, n) {
      var name = kind + "_" + n;
      var input = form.querySelector("[name=" + name + "]");
      if (input) return input.closest(".field");
      var wrap = el("div", { "class": "field", "data-dynamic": "1" });
      var id = "id_" + name;
      var label = el("label", { "for": id }, fmt(kind === "adult" ? T.adultName : T.childName, { n: n }));
      input = el("input", { type: "text", name: name, id: id, maxlength: "120", "class": "input", autocomplete: "off" });
      wrap.appendChild(label);
      wrap.appendChild(input);
      return wrap;
    }

    function syncTravelers() {
      if (!holder) return;
      var a = Math.max(1, Number(adults.value) || 1);
      var c = children ? Math.max(0, Number(children.value) || 0) : 0;
      var wanted = [];
      for (var i = 1; i <= a; i++) wanted.push(ensureField("adult", i));
      for (var j = 1; j <= c; j++) wanted.push(ensureField("child", j));
      $$(".field", holder).forEach(function (f) { if (wanted.indexOf(f) === -1) f.remove(); });
      wanted.forEach(function (f) { holder.appendChild(f); });
    }

    function updateEstimate() {
      if (!rules) return;
      var a = Math.max(0, Number(adults.value) || 0);
      var c = children ? Math.max(0, Number(children.value) || 0) : 0;
      var adultTotal = a * Number(rules.adult);
      var childTotal = c * Number(rules.child);
      var subtotal = adultTotal + childTotal;
      var pct = 0;
      (rules.discounts || []).forEach(function (d) { if (a + c >= d.from && Number(d.percent) > pct) pct = Number(d.percent); });
      var discount = Math.round(subtotal * pct) / 100;
      var total = subtotal - discount;
      $$("[data-estimate-total]").forEach(function (out) {
        var text = money(total);
        if (out.textContent === text) return;
        out.textContent = text;
        out.classList.remove("is-updated");
        void out.offsetWidth; // restart the short "changed" pulse
        out.classList.add("is-updated");
      });
      var set = function (sel, label, value, show) {
        var row = $(sel);
        if (!row) return;
        row.hidden = !show;
        var dt = row.querySelector("dt"), dd = row.querySelector("dd");
        if (dt) dt.textContent = label;
        if (dd) dd.textContent = value;
      };
      set("[data-line-adults]", fmt(T.adultsLine, { n: a }), money(adultTotal), a > 0);
      set("[data-line-children]", fmt(T.childrenLine, { n: c }), money(childTotal), c > 0);
      set("[data-line-discount]", (T.groupDiscount || "") + " (" + pct + "%)", "− " + money(discount), pct > 0);
    }

    [adults, children].forEach(function (input) {
      if (!input) return;
      input.addEventListener("input", function () { syncTravelers(); updateEstimate(); });
    });
    syncTravelers();
    updateEstimate();
  }

  /* --- Custom trip wizard ------------------------------------------------ */
  function initWizard() {
    var form = $("[data-wizard]");
    if (!form) return;
    var steps = $$("[data-wizard-step]", form);
    var indicators = $$("[data-wizard-steps] button", form);
    var prev = $("[data-prev]", form), next = $("[data-next]", form), submit = $("[data-submit]", form);
    var current = 0;

    function stepHasServerErrors(step) { return !!step.querySelector(".errorlist, .field--error"); }

    function show(index, focus) {
      current = Math.max(0, Math.min(steps.length - 1, index));
      steps.forEach(function (s, i) { s.classList.toggle("is-active", i === current); });
      indicators.forEach(function (b, i) {
        b.classList.toggle("is-done", i < current);
        if (i === current) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      });
      prev.hidden = current === 0;
      next.hidden = current === steps.length - 1;
      submit.hidden = current !== steps.length - 1;
      if (steps[current].hasAttribute("data-review-step")) buildReview();
      if (focus) {
        var legend = $("legend", steps[current]);
        if (legend) { legend.setAttribute("tabindex", "-1"); legend.focus(); }
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    function clearStepError(step) { var a = $(".step-alert", step); if (a) a.remove(); }

    function validate(step) {
      clearStepError(step);
      var invalid = [];
      $$("input, select, textarea", step).forEach(function (f) {
        f.removeAttribute("aria-invalid");
        if (f.closest("[hidden]") || f.type === "hidden" || f.closest(".honeypot")) return;
        if (!f.checkValidity()) invalid.push(f);
      });
      if ($("[name=other_destinations]", step)) {
        var any = $$("[name=destinations]:checked", step).length || ($("[name=other_destinations]", step).value || "").trim();
        if (!any) invalid.push($("[name=destinations]", step) || $("[name=other_destinations]", step));
      }
      var start = $("[name=start_date]", step), days = $("[name=duration_days]", step);
      if (start && !start.value) invalid.push(start);
      if (days && !(Number(days.value) >= 1)) invalid.push(days);
      if ($("[name=tier]", step) && !$("[name=tier]:checked", step)) invalid.push($("[name=tier]", step));
      if (!invalid.length) return true;
      invalid.forEach(function (f) { if (f) f.setAttribute("aria-invalid", "true"); });
      var alert = el("div", { "class": "alert alert--error step-alert mb-2", role: "alert" });
      alert.appendChild(el("p", {}, T.stepIncomplete));
      step.insertBefore(alert, $("legend", step).nextSibling);
      if (invalid[0]) invalid[0].focus();
      return false;
    }

    next.addEventListener("click", function () { if (validate(steps[current])) show(current + 1, true); });
    prev.addEventListener("click", function () { show(current - 1, true); });
    indicators.forEach(function (b, i) {
      b.addEventListener("click", function () {
        if (i <= current) return show(i, true);
        for (var k = current; k < i; k++) { if (!validate(steps[k])) return show(k, true); }
        show(i, true);
      });
    });
    form.addEventListener("submit", function (e) {
      for (var k = 0; k < steps.length; k++) {
        if (!validate(steps[k])) { e.preventDefault(); show(k, true); validate(steps[k]); return; }
      }
    });

    function text(v) { return v && String(v).trim() ? String(v).trim() : T.notProvided; }
    function checkedLabels(name) {
      return $$("[name=" + name + "]:checked", form).map(function (i) {
        var name = i.parentNode.querySelector(".choice__name");
        return name ? name.firstChild.textContent.trim() : i.value;
      });
    }
    function buildReview() {
      var box = $("[data-review]", form);
      if (!box) return;
      box.textContent = "";
      var v = function (n) { var f = form.querySelector("[name=" + n + "]"); return f ? f.value : ""; };
      var dests = checkedLabels("destinations");
      if (v("other_destinations").trim()) dests.push(v("other_destinations").trim());
      var dateText = v("start_date") + " · " + v("duration_days") + " " + T.days;
      if (form.querySelector("[name=flexible_dates]:checked")) dateText += " · " + T.flexible;
      var interests = checkedLabels("interests");
      if (v("other_interests").trim()) interests.push(v("other_interests").trim());
      var rows = [
        [steps[0], dests.join(T.listSep) || T.none, 0],
        [steps[1], dateText, 1],
        [steps[2], T.adults + ": " + (v("adults") || 0) + " · " + T.children + ": " + (v("children") || 0), 2],
        [steps[3], checkedLabels("tier").join("") || T.notProvided, 3],
        [steps[4], interests.join(T.listSep) || T.none, 4],
        [steps[5], [v("contact_name"), v("contact_email"), v("contact_phone")].map(text).join(" · "), 5]
      ];
      rows.forEach(function (row) {
        var block = el("div", { "class": "review-block" });
        var body = el("div");
        body.appendChild(el("h3", {}, $("legend", row[0]).textContent));
        body.appendChild(el("p", {}, row[1]));
        var edit = el("button", { type: "button", "class": "btn btn--ghost btn--sm" }, T.edit);
        edit.setAttribute("aria-label", T.edit + ": " + $("legend", row[0]).textContent);
        edit.addEventListener("click", function () { show(row[2], true); });
        block.appendChild(body);
        block.appendChild(edit);
        box.appendChild(block);
      });
    }

    var firstError = steps.findIndex(stepHasServerErrors);
    steps.forEach(function (s, i) { if (stepHasServerErrors(s) && indicators[i]) indicators[i].classList.add("has-error"); });
    show(firstError >= 0 ? firstError : 0, firstError >= 0);
  }

  /* --- Gallery lightbox -------------------------------------------------- */
  function initLightbox() {
    var dialog = $("[data-lightbox]");
    var items = $$("[data-lightbox-src]");
    if (!dialog || !items.length || typeof dialog.showModal !== "function") return;
    var img = $("[data-lightbox-img]", dialog), cap = $("[data-lightbox-caption]", dialog);
    var index = 0;
    function render() {
      var it = items[index].dataset;
      img.src = it.lightboxSrc;
      if (it.lightboxSrcset) { img.srcset = it.lightboxSrcset; img.sizes = "90vw"; } else { img.removeAttribute("srcset"); }
      img.alt = it.lightboxAlt || "";
      cap.textContent = (it.lightboxAlt || "") + (it.lightboxCredit ? " — " + T.photo + ": " + it.lightboxCredit + " " : "");
      if (it.lightboxSource) {
        var a = el("a", { href: it.lightboxSource, target: "_blank", rel: "noopener" }, "↗");
        cap.appendChild(a);
      }
    }
    items.forEach(function (btn, i) {
      btn.addEventListener("click", function () { index = i; render(); dialog.showModal(); });
    });
    var step = function (d) { index = (index + d + items.length) % items.length; render(); };
    var rtl = document.documentElement.dir === "rtl";
    $("[data-lightbox-prev]", dialog).addEventListener("click", function () { step(-1); });
    $("[data-lightbox-next]", dialog).addEventListener("click", function () { step(1); });
    $("[data-lightbox-close]", dialog).addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") step(rtl ? -1 : 1);
      if (e.key === "ArrowLeft") step(rtl ? 1 : -1);
    });
  }

  /* --- Confirm destructive actions --------------------------------------- */
  function initConfirm() {
    document.addEventListener("submit", function (e) {
      var form = e.target;
      if (form.matches && form.matches("[data-confirm]") && !window.confirm(form.dataset.confirm || T.confirmAction)) {
        e.preventDefault();
      }
    }, true);
  }

  /* --- Send each POST form only once (double-clicks, slow connections) ----- */
  function initSubmitOnce() {
    document.addEventListener("submit", function (e) {
      var form = e.target;
      if (e.defaultPrevented || !form.matches || (form.method || "").toLowerCase() !== "post") return;
      if (form.dataset.submitting) { e.preventDefault(); return; }
      form.dataset.submitting = "1";
      var buttons = $$("button[type=submit], button:not([type])", form);
      // Disable after the browser has captured the form data (the clicked button's value is kept).
      setTimeout(function () {
        buttons.forEach(function (b) { b.disabled = true; b.setAttribute("aria-busy", "true"); });
      }, 0);
    });
    // Coming back with the browser's Back button: make the forms usable again.
    window.addEventListener("pageshow", function (e) {
      if (!e.persisted) return;
      $$("form[data-submitting]").forEach(function (form) {
        delete form.dataset.submitting;
        $$("button[aria-busy]", form).forEach(function (b) { b.disabled = false; b.removeAttribute("aria-busy"); });
      });
    });
  }

  /* --- Staff: add inline formset rows ----------------------------------- */
  function initFormsets() {
    $$("[data-formset-add]").forEach(function (btn) {
      btn.hidden = false;
      btn.addEventListener("click", function () {
        var prefix = btn.dataset.formsetAdd;
        var total = document.getElementById("id_" + prefix + "-TOTAL_FORMS");
        var tpl = document.querySelector("template[data-formset-template='" + prefix + "']");
        var list = document.querySelector("[data-formset-list='" + prefix + "']");
        if (!total || !tpl || !list) return;
        var html = tpl.innerHTML.replace(/__prefix__/g, total.value);
        var wrap = document.createElement("div");
        wrap.innerHTML = html;
        while (wrap.firstElementChild) list.appendChild(wrap.firstElementChild);
        total.value = String(Number(total.value) + 1);
        var first = list.lastElementChild && list.lastElementChild.querySelector("input, textarea, select");
        if (first) first.focus();
      });
    });
  }

  /* --- Gentle reveal-on-scroll for cards ---------------------------------- */
  // Public pages only, and only for blocks that start below the fold, so nothing on
  // screen at load ever blinks out and back in.
  var AUTO_REVEAL = ".section-head, .lux-card, .steps li, .path-card, .stat-card, .package-card, .dest-card, " +
    ".faq details, .cta-card, .trip-block, .split__media, .newsletter-band";
  function initReveal() {
    if (!document.body.classList.contains("staff-body")) {
      $$(AUTO_REVEAL).forEach(function (el) {
        if (!el.closest(".reveal") && el.getBoundingClientRect().top > window.innerHeight) el.classList.add("reveal");
      });
    }
    var items = $$(".reveal");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      var shown = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.style.transitionDelay = Math.min(shown++, 5) * 70 + "ms"; // cards arriving together come in one by one
        el.classList.add("is-visible");
        io.unobserve(el);
        // Once it has arrived, hand the element back to its own hover transitions.
        setTimeout(function () { el.classList.remove("reveal", "is-visible"); el.style.transitionDelay = ""; }, 1200);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* --- Show / hide password: one box to type instead of two -------------- */
  function initPasswordToggles() {
    $$('input[type="password"]').forEach(function (input) {
      if (input.disabled) return;
      var wrap = el("span", { "class": "password-field" });
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
      var button = el("button", { type: "button", "class": "password-toggle" }, T.showPassword);
      button.addEventListener("click", function () {
        var show = input.type === "password";
        input.type = show ? "text" : "password";
        button.textContent = show ? T.hidePassword : T.showPassword;
      });
      wrap.appendChild(button);
    });
  }

  /* --- Header: a soft shadow once the page scrolls beneath it ------------- */
  function initHeader() {
    var header = $(".site-header");
    if (!header) return;
    var update = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  /* --- Hide images that fail to load (e.g. an external photo host is down) -- */
  function initImageFallback() {
    $$("img").forEach(function (img) {
      var fail = function () { img.classList.add("img-failed"); };
      if (img.complete && img.currentSrc && img.naturalWidth === 0) fail();
      else img.addEventListener("error", fail);
    });
  }

  /* --- Trip page: hide the sticky "Book" bar once the booking form is on screen -- */
  function initMobileCta() {
    var bar = $(".mobile-cta"), target = $("#book");
    if (!bar || !target || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (entries) {
      bar.classList.toggle("is-hidden", entries[0].isIntersecting);
    }, { rootMargin: "0px 0px -20% 0px" }).observe(target);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initImageFallback();
    initMobileCta();
    initReveal();
    initHeader();
    initPasswordToggles();
    initThemeToggle();
    initMenu();
    initAccountMenu();
    initFilters();
    initSteppers(document);
    initBookingForm();
    initWizard();
    initLightbox();
    initConfirm();
    initSubmitOnce();
    initFormsets();
  });
})();
