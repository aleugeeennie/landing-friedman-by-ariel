(() => {
  "use strict";

  // ------------------------------------------------------------
  // Production constants
  // WhatsApp uses the real marketing contact from the onboarding.
  // Replace if the campaign must route to another commercial number.
  // Calendly URL is still pending confirmation.
  // ------------------------------------------------------------
  const WHATSAPP_NUMBER = "59894691874";
  const CALENDLY_URL = ""; // Agregar aquí la URL de agenda cuando esté disponible

  const qs = (s, ctx = document) => ctx.querySelector(s);
  const qsa = (s, ctx = document) => [...ctx.querySelectorAll(s)];

  function track(eventName, payload = {}) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...payload });
  }

  function initNav() {
    const header = qs("#siteHeader");
    const toggle = qs("#menuToggle");
    const mobile = qs("#mobileNav");
    if (!header) return;

    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 26);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (toggle && mobile) {
      toggle.addEventListener("click", () => {
        const isOpen = mobile.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
      });
      qsa("a,button", mobile).forEach(el => {
        el.addEventListener("click", () => {
          mobile.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }
  }

  function initReveal() {
    const els = qsa(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(el => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.13 });
    els.forEach(el => io.observe(el));
  }

  function duplicateMarquees() {
    qsa(".js-proof-track, .js-logo-track").forEach(trackEl => {
      const original = trackEl.innerHTML;
      trackEl.insertAdjacentHTML("beforeend", original);
      if (trackEl.classList.contains("proof-track--right")) {
        trackEl.style.transform = "translateX(-50%)";
      }
    });
  }

  function initAccordion() {
    qsa(".accordion-trigger").forEach(trigger => {
      trigger.addEventListener("click", () => {
        const item = trigger.closest(".accordion-item");
        const panel = qs(".accordion-panel", item);
        const wasOpen = item.classList.contains("is-open");

        qsa(".accordion-item").forEach(other => {
          other.classList.remove("is-open");
          const t = qs(".accordion-trigger", other);
          const p = qs(".accordion-panel", other);
          if (t) t.setAttribute("aria-expanded", "false");
          if (p) p.hidden = true;
        });

        if (!wasOpen) {
          item.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
          panel.hidden = false;
        }
      });
    });
  }

  function initLeadModal() {
    const modal = qs("#leadModal");
    const closeBtn = qs("#modalClose");
    const form = qs("#leadForm");
    if (!modal || !form) return;

    const challenge = qs("#desafio");
    const sourceField = qs("#formSource");
    let bottomArmed = true;
    let lastFocused = null;

    function openModal(service = "", source = "direct") {
      lastFocused = document.activeElement;
      if (service && challenge) challenge.value = service;
      if (sourceField) sourceField.value = source;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
      setTimeout(() => qs("input,select", form)?.focus(), 80);
      track("cta_click", { location: source, service: service || undefined });
      if (service) track("service_select", { service });
    }

    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      lastFocused?.focus?.();
    }

    qsa(".js-open-form").forEach(btn => {
      btn.addEventListener("click", () => {
        openModal(btn.dataset.service || "", btn.dataset.source || "direct");
      });
    });

    closeBtn?.addEventListener("click", closeModal);
    modal.addEventListener("mousedown", e => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });

    let formStarted = false;
    form.addEventListener("focusin", () => {
      if (!formStarted) {
        formStarted = true;
        track("form_start", { source: sourceField?.value || "direct" });
      }
    });

    form.addEventListener("submit", e => {
      e.preventDefault();

      const data = Object.fromEntries(new FormData(form).entries());
      data.timestamp = new Date().toISOString();

      try {
        sessionStorage.setItem("friedmanLead", JSON.stringify(data));
      } catch (err) {
        console.warn("sessionStorage no disponible:", err);
      }

      track("generate_lead", {
        source: data.source,
        service: data.desafio,
        company_size: data.empleados,
        urgency: data.urgencia
      });

      const params = new URLSearchParams({
        nombre: data.nombre || "",
        empresa: data.empresa || "",
        desafio: data.desafio || ""
      });

      window.location.href = `gracias.html?${params.toString()}`;
    });

    // Auto-opens whenever the user reaches the real end of the page.
    // No IntersectionObserver is used for this conversion trigger.
    window.addEventListener("scroll", () => {
      const doc = document.documentElement;
      const bottomGap = doc.scrollHeight - (window.scrollY + window.innerHeight);

      if (bottomGap > 220) bottomArmed = true;

      if (bottomGap <= 8 && bottomArmed && !modal.classList.contains("is-open")) {
        bottomArmed = false;
        openModal("", "scroll_end");
      }
    }, { passive: true });
  }

  function initThanks() {
    if (document.body.dataset.page !== "thanks") return;

    const params = new URLSearchParams(window.location.search);
    let lead = {};

    try {
      lead = JSON.parse(sessionStorage.getItem("friedmanLead") || "{}");
    } catch (err) {
      lead = {};
    }

    lead.nombre = lead.nombre || params.get("nombre") || "";
    lead.empresa = lead.empresa || params.get("empresa") || "";
    lead.desafio = lead.desafio || params.get("desafio") || "";

    const summary = qs("#thanksSummary");
    if (lead.empresa || lead.desafio) {
      summary.hidden = false;
      qs("#thanksCompany").textContent = lead.empresa || "Tu empresa";
      qs("#thanksChallenge").textContent = lead.desafio ? `Desafío: ${lead.desafio}` : "Desafío registrado.";
    }

    const firstName = (lead.nombre || "").trim().split(/\s+/)[0];
    if (firstName) {
      qs("#thanksLead").textContent =
        `${firstName}, nuestro equipo revisará la información para que la conversación sea atendida por el especialista adecuado.`;
    }

    const message = [
      "Hola Friedman, acabo de enviar el formulario de diagnóstico.",
      lead.nombre ? `Nombre: ${lead.nombre}` : "",
      lead.empresa ? `Empresa: ${lead.empresa}` : "",
      lead.desafio ? `Desafío: ${lead.desafio}` : ""
    ].filter(Boolean).join("\n");

    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    const manual = qs("#waManual");
    manual.href = waUrl;

    // Real Calendly embed once the final URL is configured.
    if (CALENDLY_URL) {
      const mount = qs("#calendlyMount");
      mount.innerHTML = `<div class="calendly-inline-widget" data-url="${CALENDLY_URL}" style="min-width:320px;height:650px;"></div>`;
      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      document.body.appendChild(script);
    }

    track("thank_you_view", { service: lead.desafio || undefined });

    // Auto-redirect to WhatsApp after ~1.8 s. The manual button remains available.
    window.setTimeout(() => {
      try {
        window.location.assign(waUrl);
      } catch (err) {
        qs("#redirectNote").textContent = "Si WhatsApp no se abrió, usá el botón de respaldo.";
      }
    }, 3000);
  }

  initNav();
  initReveal();
  duplicateMarquees();
  initAccordion();
  initLeadModal();
  initThanks();
})();
