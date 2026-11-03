/* Display copy: there is no server, so the site's flows run in the browser and nothing is sent anywhere. */
(function () {
  "use strict";

  var ar = document.documentElement.lang === "ar";
  var T = ar
    ? {
        title: "هذه نسخة للعرض",
        ok: "حسنًا",
        fixTitle: "أكمل البيانات",
        pickDate: "اختر موعد الرحلة.",
        contact: "أكمل بيانات التواصل.",
        consent: "وافق على سياسة الخصوصية للمتابعة.",
        required: "أكمل الحقول المطلوبة للمتابعة.",
        payFailed: "هذه محاكاة لفشل الدفع: لم يُخصم أي مبلغ، ويمكن للعميل إعادة المحاولة من صفحة حجزه.",
        plan: "تمت محاكاة إرسال طلب الرحلة. في الموقع الكامل يصل الطلب إلى الفريق في لوحة التحكم ويُرد على العميل بعرض سعر. لم تُرسل أي بيانات.",
        contactSent: "تمت محاكاة إرسال رسالتك. في الموقع الكامل تصل الرسالة إلى لوحة التحكم. لم تُرسل أي بيانات.",
        newsletter: "تمت محاكاة الاشتراك. لم تُرسل أي بيانات.",
        staff: "لا تُحفظ التغييرات في نسخة العرض. في الموقع الكامل تُحفظ فورًا.",
        search: "البحث في لوحة التحكم يعمل في الموقع الكامل.",
        general: "هذا الإجراء يعمل في الموقع الكامل فقط. لم تُرسل أي بيانات.",
        adults: "بالغ",
        children: "طفل",
        count: function (n) { return n + " رحلة"; },
        none: "لا توجد رحلات تطابق بحثك. جرّب تغيير الفلاتر.",
      }
    : {
        title: "This is a display copy",
        ok: "OK",
        fixTitle: "Complete your details",
        pickDate: "Choose a trip date.",
        contact: "Complete your contact details.",
        consent: "Accept the privacy policy to continue.",
        required: "Complete the required fields to continue.",
        payFailed: "This simulates a failed payment: no money was taken, and the customer can try again from their booking page.",
        plan: "Sending the trip request was simulated. On the full site it reaches the team's dashboard and the customer gets a quote. No data was sent.",
        contactSent: "Sending your message was simulated. On the full site it reaches the dashboard. No data was sent.",
        newsletter: "Subscribing was simulated. No data was sent.",
        staff: "Changes aren't saved in this display copy. On the full site they save right away.",
        search: "Dashboard search works on the full site.",
        general: "This action works on the full site only. No data was sent.",
        adults: "adult(s)",
        children: "child(ren)",
        count: function (n) { return n + (n === 1 ? " trip found" : " trips found"); },
        none: "No trips match your search. Try changing the filters.",
      };

  var KEY = "taui-display-booking";
  var page = (document.querySelector('meta[name="display-page"]') || {}).content || "page";

  function meta(name) {
    var tag = document.querySelector('meta[name="' + name + '"]');
    return tag ? tag.content : "";
  }

  /* --- Dialog ----------------------------------------------------------- */
  var dialog, heading, body;
  function show(title, message) {
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "display-dialog";
      heading = document.createElement("h2");
      body = document.createElement("p");
      var actions = document.createElement("div");
      actions.className = "display-dialog__actions";
      var close = document.createElement("button");
      close.type = "button";
      close.className = "btn btn--accent btn--sm";
      close.textContent = T.ok;
      close.addEventListener("click", function () { dialog.close(); });
      actions.append(close);
      dialog.append(heading, body, actions);
      document.body.append(dialog);
    }
    heading.textContent = title;
    body.textContent = message;
    dialog.showModal();
  }

  /* --- Booking: the form, then the example payment and result pages ------ */
  function isEmpty(form, name) {
    var field = form.querySelector('[name="' + name + '"]');
    return !!field && !field.disabled && !field.value.trim();
  }

  function submitBooking(form) {
    var chosen = form.querySelector('input[name="departure"]:checked');
    var consent = form.querySelector('[name="privacy_consent"]');
    var problems = [];
    if (!chosen) problems.push(T.pickDate);
    if (isEmpty(form, "contact_name") || isEmpty(form, "contact_email") || isEmpty(form, "contact_phone")) problems.push(T.contact);
    if (consent && !consent.checked) problems.push(T.consent);
    if (problems.length) {
      show(T.fixTitle, problems.join(" "));
      return;
    }
    var chip = chosen.closest(".date-chip");
    var part = function (cls) { var n = chip && chip.querySelector(cls); return n ? n.textContent.trim() : ""; };
    var number = function (name) { var f = form.querySelector('[name="' + name + '"]'); return f ? Number(f.value) || 0 : 0; };
    var travelers = number("adults") + " " + T.adults;
    if (number("children")) travelers += (ar ? "، " : ", ") + number("children") + " " + T.children;
    var total = form.querySelector("[data-estimate-total]");
    var booking = {
      reference: "TAUI-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
      trip: form.querySelector(".book-summary__trip").textContent.trim(),
      dates: part(".date-chip__day") + " " + part(".date-chip__month"),
      travelers: travelers,
      total: total ? total.textContent.trim() : "",
    };
    try { sessionStorage.setItem(KEY, JSON.stringify(booking)); } catch (e) { /* the example pages keep their sample values */ }
    window.location.href = meta("display-checkout");
  }

  function fillBookingPages() {
    if (page !== "checkout" && page !== "result") return;
    var booking = null;
    try { booking = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { booking = null; }
    if (!booking) return;
    var cells = Array.prototype.slice.call(document.querySelectorAll(".summary-list dd"));
    var set = function (cell, value) { if (cell && value) cell.textContent = value; };
    if (page === "checkout") {
      [booking.reference, booking.trip, booking.dates, booking.travelers].forEach(function (v, i) { set(cells[i], v); });
      set(document.querySelector(".total-row strong"), booking.total);
    } else {
      set(document.querySelector(".reference strong"), booking.reference);
      [booking.trip, booking.dates, booking.travelers, booking.total].forEach(function (v, i) { set(cells[i], v); });
    }
  }

  /* --- Trips page: search, filters and sorting --------------------------- */
  var applyTrips = null;
  function initTrips() {
    var source = document.getElementById("display-trips");
    var form = document.getElementById("filter-form");
    if (!source || !form) return;
    var data = JSON.parse(source.textContent);
    var cards = document.querySelectorAll(".package-card[data-slug]");
    if (!cards.length) return;
    var grid = cards[0].closest(".grid") || cards[0].parentElement;
    var items = {};
    cards.forEach(function (card) {
      var item = card;
      while (item.parentElement !== grid) item = item.parentElement;
      items[card.getAttribute("data-slug")] = item;
    });
    var count = document.querySelector(".results-bar__count");
    var empty = document.createElement("div");
    empty.className = "empty-state";
    empty.hidden = true;
    empty.textContent = T.none;
    grid.after(empty);
    var value = function (name) { var f = form.elements[name]; return f ? String(f.value) : ""; };

    applyTrips = function () {
      var q = value("q").trim().toLowerCase();
      var people = Number(value("travelers"));
      var date = value("date");
      var shown = 0;
      (data.sort[value("sort")] || data.sort.popular || Object.keys(items)).forEach(function (slug) {
        var item = items[slug];
        var info = data.cards[slug];
        if (!item || !info) return;
        var ok = !q || info.text.indexOf(q) !== -1;
        ["destination", "category", "duration", "budget", "style"].forEach(function (name) {
          var chosen = value(name);
          if (chosen && (data.options[name][chosen] || []).indexOf(slug) === -1) ok = false;
        });
        if (people && (people < info.min || people > info.max)) ok = false;
        if (date && !info.dates.some(function (d) { return d >= date; })) ok = false;
        item.hidden = !ok;
        if (ok) shown += 1;
        grid.append(item);
      });
      if (count) count.textContent = T.count(shown);
      empty.hidden = shown > 0;
    };

    var params = new URLSearchParams(window.location.search);
    var preset = false;
    params.forEach(function (v, name) {
      var field = form.elements[name];
      if (field) { field.value = v; preset = true; }
    });
    if (preset) applyTrips();
  }

  /* --- Every other form -------------------------------------------------- */
  function missingRequired(form) {
    return Array.prototype.slice.call(form.querySelectorAll("[required]")).filter(function (field) {
      if (field.disabled) return false;
      if (field.type === "checkbox") return !field.checked;
      if (field.type === "radio") return !form.querySelector('[name="' + field.name + '"]:checked');
      return !field.value.trim();
    });
  }

  document.addEventListener("submit", function (e) {
    var form = e.target;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (form.id === "filter-form" && applyTrips) { applyTrips(); return; }
    if (form.hasAttribute("data-booking-form")) { submitBooking(form); return; }
    if (page === "staff") { show(T.title, form.method === "get" ? T.search : T.staff); return; }
    var gaps = missingRequired(form);
    if (gaps.length) {
      show(T.fixTitle, T.required);
      return;
    }
    if (form.closest(".newsletter, .newsletter-band")) show(T.title, T.newsletter);
    else if (page === "plan") show(T.title, T.plan);
    else if (page === "contact") show(T.title, T.contactSent);
    else show(T.title, T.general);
  }, true);

  document.addEventListener("click", function (e) {
    var go = e.target.closest("[data-goto]");
    if (go) {
      e.preventDefault();
      window.location.href = go.getAttribute("data-goto");
    } else if (e.target.closest("[data-display-fail]")) {
      e.preventDefault();
      show(T.title, T.payFailed);
    } else if (e.target.closest("[data-display-only]")) {
      e.preventDefault();
      show(T.title, T.general);
    }
  }, true);

  document.addEventListener("DOMContentLoaded", function () {
    initTrips();
    fillBookingPages();
  });
})();
