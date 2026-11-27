/**
 * ==========================================================================
 * LÓGICA PRINCIPAL — CAMPA JUVE 2027 (9.ª EDICIÓN)
 * ==========================================================================
 */

(function () {
  "use strict";

  const IS_ORGANIZER_PAGE = Boolean(document.body && document.body.dataset && document.body.dataset.role === "organizador");
  const STORAGE_KEY_CONFIRMED = IS_ORGANIZER_PAGE
    ? "campaJuve2027_organizadorConfirmado"
    : "campaJuve2027_inscripcionConfirmada";

  function getActiveScriptUrl() {
    if (IS_ORGANIZER_PAGE) {
      return CAMPA_CONFIG.ORGANIZADORES_SCRIPT_URL || "";
    }
    return CAMPA_CONFIG.GOOGLE_SCRIPT_URL || "";
  }

  function isPlaceholderScriptUrl(url) {
    return !url || url.includes("REEMPLAZAR_CON_");
  }

  const state = {
    selectedFile: null,
    selectedFileBase64: "",
    cuota2File: null,
    cuota2FileBase64: "",
    lastRegistrationCode: "",
    activateTabFn: null,
    cupoCompleto: false
  };

  /* ================= UTILIDADES ================= */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.hidden = true;
    }, 2800);
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function buildWhatsAppUrl(text) {
    const num = (CAMPA_CONFIG.WHATSAPP_NUMBER || "").replace(/\D/g, "");
    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  }

  async function copyToClipboard(text, label = "Texto") {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement("textarea");
        temp.value = text;
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      showToast(`${label} copiado: ${text}`);
    } catch {
      showToast("No se pudo copiar automáticamente. Copialo manualmente.");
    }
  }

  function generateRegistrationCode() {
    // Caracteres sin ambigüedad visual (sin O/0 ni I/1)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let suffix = "";
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const prefix = IS_ORGANIZER_PAGE ? "ORG27" : "CJ27";
    return `${prefix}-${suffix}`;
  }

  function calculateAge(birthDateStr) {
    if (!birthDateStr) return null;
    const parts = birthDateStr.split("-").map(Number);
    if (parts.length !== 3) return null;
    const [year, month, day] = parts;
    const today = new Date();
    let age = today.getFullYear() - year;
    const monthDiff = today.getMonth() + 1 - month;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
      age--;
    }
    return age >= 0 && age < 120 ? age : null;
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
      reader.readAsDataURL(file);
    });
  }

  /* ================= 1. HIDRATAR CONFIGURACIÓN ================= */
  function hydrateConfig() {
    $$("[data-config]").forEach((el) => {
      const key = el.getAttribute("data-config");
      if (key && CAMPA_CONFIG[key] !== undefined) {
        el.textContent = CAMPA_CONFIG[key];
      }
    });

    $$("[data-config-href]").forEach((el) => {
      const key = el.getAttribute("data-config-href");
      if (key && CAMPA_CONFIG[key]) {
        el.setAttribute("href", CAMPA_CONFIG[key]);
      }
    });

    $$("[data-config-whatsapp]").forEach((el) => {
      el.setAttribute("href", buildWhatsAppUrl(CAMPA_CONFIG.WHATSAPP_DEFAULT_MSG));
    });
  }

  /* ================= 2. NAVEGACIÓN Y HEADER ================= */
  function initNavigation() {
    const header = $("#siteHeader");
    const navToggle = $("#navToggle");
    const mainNav = $("#mainNav");

    if (header) {
      window.addEventListener("scroll", () => {
        header.classList.toggle("is-scrolled", window.scrollY > 12);
      }, { passive: true });
    }

    if (navToggle && mainNav) {
      const closeMenu = () => {
        navToggle.setAttribute("aria-expanded", "false");
        mainNav.classList.remove("is-open");
      };

      navToggle.addEventListener("click", () => {
        const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
        navToggle.setAttribute("aria-expanded", String(!isExpanded));
        mainNav.classList.toggle("is-open", !isExpanded);
      });

      $$("a", mainNav).forEach((link) => {
        link.addEventListener("click", closeMenu);
      });
    }
  }

  /* ================= 3. INTERACCIÓN DE LOS 5 SÍMBOLOS ================= */
  function initSymbols() {
    const cards = $$(".symbol-card");
    if (!cards.length) return;

    const activateCard = (target) => {
      cards.forEach((c) => c.classList.toggle("is-active", c === target));
    };

    cards.forEach((card) => {
      card.addEventListener("click", () => activateCard(card));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activateCard(card);
        }
      });
    });
  }

  /* ================= 4. BOTONES DE COPIADO Y ACCESO A BECA ================= */
  function initCopyButtons() {
    $$("[data-copy-target]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-copy-target");
        const value = CAMPA_CONFIG[key];
        if (!value) return;
        const label = key === "BANK_ALIAS" ? "Alias" : key === "BANK_CBU" ? "CBU" : "Dato";
        copyToClipboard(value, label);
      });
    });

    const btnSelectBeca = $("#btnSelectBeca");
    const modalidadPago = $("#modalidadPago");
    if (btnSelectBeca && modalidadPago) {
      btnSelectBeca.addEventListener("click", () => {
        modalidadPago.value = "Solicitud de Beca / Fondo Solidario";
        modalidadPago.dispatchEvent(new Event("change"));
      });
    }
  }

  /* ================= 5. LÓGICA DEL FORMULARIO ================= */
  function setFieldError(inputEl, message) {
    const group = inputEl ? inputEl.closest(".form-group") : null;
    if (!group) return;
    const errorEl = $(".field-error", group);
    if (message) {
      group.classList.add("has-error");
      if (errorEl) errorEl.textContent = message;
    } else {
      group.classList.remove("has-error");
      if (errorEl) errorEl.textContent = "";
    }
  }

  function clearAllErrors(form) {
    $$(".form-group.has-error", form).forEach((g) => g.classList.remove("has-error"));
    $$(".field-error", form).forEach((e) => (e.textContent = ""));
    const globalErr = $("#formGlobalError");
    if (globalErr) {
      globalErr.hidden = true;
      globalErr.textContent = "";
    }
  }

  function initFormLogic() {
    const form = $("#registrationForm");
    if (!form) return;

    const fechaNacimiento = $("#fechaNacimiento");
    const edadInput = $("#edad");

    const modalidadPago = $("#modalidadPago");
    const cuotasNoteBox = $("#cuotasNoteBox");
    const becaNoteBox = $("#becaNoteBox");
    const comprobanteInput = $("#comprobanteArchivo");
    const comprobanteLabelText = $("#comprobanteLabelText");
    const comprobanteReqStar = $("#comprobanteReqStar");

    fechaNacimiento.addEventListener("change", () => {
      const calculated = calculateAge(fechaNacimiento.value);
      if (calculated !== null) {
        edadInput.value = calculated;
        setFieldError(edadInput, "");
      }
    });

    // Modalidad de pago (Pago total, En 2 cuotas, o Beca / Fondo Solidario)
    function updatePaymentMode() {
      const val = modalidadPago.value;
      const isBeca = val === "Solicitud de Beca / Fondo Solidario";
      const isCuotas = val.startsWith("En 2 cuotas");

      if (cuotasNoteBox) cuotasNoteBox.hidden = !isCuotas;
      becaNoteBox.hidden = !isBeca;
      comprobanteReqStar.hidden = isBeca;

      if (comprobanteLabelText) {
        if (isCuotas) {
          comprobanteLabelText.textContent = "Comprobante de 1.ª cuota — diciembre 2026 (JPG, PNG o PDF · máx. 5 MB)";
        } else if (val === "Pago total") {
          comprobanteLabelText.textContent = "Comprobante de Pago total (JPG, PNG o PDF · máx. 5 MB)";
        } else {
          comprobanteLabelText.textContent = "Comprobante de Pago (JPG, PNG o PDF · máx. 5 MB)";
        }
      }

      if (isBeca) {
        setFieldError(comprobanteInput, "");
      }
    }

    modalidadPago.addEventListener("change", updatePaymentMode);
    updatePaymentMode();

    // Limpiar error al corregir un campo
    form.addEventListener("input", (e) => {
      if (e.target && e.target.closest(".form-group")) {
        setFieldError(e.target, "");
      }
    });
    form.addEventListener("change", (e) => {
      if (e.target && e.target.closest(".form-group")) {
        setFieldError(e.target, "");
      }
    });

    // Carga y vista previa de comprobante
    initFileUpload(comprobanteInput);

    // Envío del formulario
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAllErrors(form);

      const isValid = validateForm(form);
      if (!isValid) {
        const firstError = $(".form-group.has-error", form);
        if (firstError) {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      await handleFormSubmit(form);
    });

    // Botones de la pantalla de confirmación
    const btnCopyCode = $("#btnCopyCode");
    if (btnCopyCode) {
      btnCopyCode.addEventListener("click", () => {
        if (state.lastRegistrationCode) {
          copyToClipboard(state.lastRegistrationCode, "Código");
        }
      });
    }

    const btnGoToSegundaCuota = $("#btnGoToSegundaCuota");
    if (btnGoToSegundaCuota) {
      btnGoToSegundaCuota.addEventListener("click", () => {
        if (typeof state.activateTabFn === "function") {
          state.activateTabFn("segunda_cuota");
          const panel = $("#panelSegundaCuota");
          if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }

    // Pestañas y formulario de 2.ª cuota
    initModeTabs();
    initSecondInstallmentForm();

    // Restaurar estado si el usuario ya completó su inscripción inicial
    restoreRegistrationState();
  }

  function initModeTabs() {
    const tabInscripcion = $("#tabInscripcion");
    const tabSegundaCuota = $("#tabSegundaCuota");
    const panelInscripcion = $("#panelInscripcion");
    const panelSegundaCuota = $("#panelSegundaCuota");
    if (!tabInscripcion || !tabSegundaCuota || !panelInscripcion || !panelSegundaCuota) return;

    function activateTab(mode) {
      const isSecond = mode === "segunda_cuota";
      tabInscripcion.classList.toggle("is-active", !isSecond);
      tabInscripcion.setAttribute("aria-selected", String(!isSecond));
      panelInscripcion.hidden = isSecond;

      tabSegundaCuota.classList.toggle("is-active", isSecond);
      tabSegundaCuota.setAttribute("aria-selected", String(isSecond));
      panelSegundaCuota.hidden = !isSecond;
    }

    state.activateTabFn = activateTab;

    tabInscripcion.addEventListener("click", () => activateTab("inscripcion"));
    tabSegundaCuota.addEventListener("click", () => activateTab("segunda_cuota"));

    // Si hacen clic en "Solicitar apoyo" desde Fondo Solidario, asegurar pestaña de inscripción activa
    const btnSelectBeca = $("#btnSelectBeca");
    if (btnSelectBeca) {
      btnSelectBeca.addEventListener("click", () => activateTab("inscripcion"));
    }
  }

  function initSecondInstallmentForm() {
    const form = $("#secondInstallmentForm");
    if (!form) return;

    const fileInput = $("#cuota2Archivo");
    const uploadZone = $("#uploadZoneCuota2");
    const placeholder = $("#uploadPlaceholderCuota2");
    const preview = $("#uploadPreviewCuota2");
    const previewImg = $("#previewImgCuota2");
    const previewPdfBadge = $("#previewPdfBadgeCuota2");
    const previewFileName = $("#previewFileNameCuota2");
    const previewFileSize = $("#previewFileSizeCuota2");
    const btnRemoveFile = $("#btnRemoveFileCuota2");

    function resetCuota2File() {
      state.cuota2File = null;
      state.cuota2FileBase64 = "";
      if (fileInput) fileInput.value = "";
      if (previewImg) {
        previewImg.hidden = true;
        previewImg.removeAttribute("src");
      }
      if (preview) preview.hidden = true;
      if (placeholder) placeholder.hidden = false;
    }

    async function handleCuota2File(file) {
      if (!file) return;
      const maxBytes = (CAMPA_CONFIG.MAX_FILE_SIZE_MB || 5) * 1024 * 1024;
      const allowedTypes = CAMPA_CONFIG.ALLOWED_FILE_TYPES || ["image/jpeg", "image/png", "application/pdf"];
      const ext = file.name.split(".").pop().toLowerCase();
      const validExt = ["jpg", "jpeg", "png", "pdf"].includes(ext);

      if (!allowedTypes.includes(file.type) && !validExt) {
        setFieldError(fileInput, "Formato no válido. Subí una imagen JPG, PNG o un archivo PDF.");
        fileInput.value = "";
        return;
      }

      if (file.size > maxBytes) {
        setFieldError(fileInput, `El archivo supera el máximo permitido de ${CAMPA_CONFIG.MAX_FILE_SIZE_MB} MB.`);
        fileInput.value = "";
        return;
      }

      setFieldError(fileInput, "");
      state.cuota2File = file;

      try {
        state.cuota2FileBase64 = await readFileAsBase64(file);
      } catch {
        setFieldError(fileInput, "No se pudo procesar el archivo. Intentá nuevamente.");
        return;
      }

      previewFileName.textContent = file.name;
      previewFileSize.textContent = formatBytes(file.size);

      if (file.type === "application/pdf" || ext === "pdf") {
        previewImg.hidden = true;
        previewImg.removeAttribute("src");
        previewPdfBadge.hidden = false;
      } else {
        previewPdfBadge.hidden = true;
        previewImg.src = URL.createObjectURL(file);
        previewImg.hidden = false;
      }

      placeholder.hidden = true;
      preview.hidden = false;
    }

    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) {
        handleCuota2File(fileInput.files[0]);
      }
    });

    ["dragenter", "dragover"].forEach((evt) => {
      uploadZone.addEventListener(evt, (e) => {
        e.preventDefault();
        uploadZone.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach((evt) => {
      uploadZone.addEventListener(evt, (e) => {
        e.preventDefault();
        uploadZone.classList.remove("is-dragover");
      });
    });

    uploadZone.addEventListener("drop", (e) => {
      const droppedFile = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (droppedFile) handleCuota2File(droppedFile);
    });

    btnRemoveFile.addEventListener("click", (e) => {
      e.stopPropagation();
      resetCuota2File();
    });

    form.addEventListener("input", (e) => {
      if (e.target && e.target.closest(".form-group")) setFieldError(e.target, "");
    });
    form.addEventListener("change", (e) => {
      if (e.target && e.target.closest(".form-group")) setFieldError(e.target, "");
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      $$(".form-group.has-error", form).forEach((g) => g.classList.remove("has-error"));
      $$(".field-error", form).forEach((el) => (el.textContent = ""));
      const globalErr = $("#cuota2GlobalError");
      if (globalErr) {
        globalErr.hidden = true;
        globalErr.textContent = "";
      }

      let valid = true;
      const nombreEl = $("#cuota2Nombre", form);
      const dniEl = $("#cuota2Dni", form);
      const codigoEl = $("#cuota2Codigo", form);

      if (!nombreEl.value.trim()) {
        setFieldError(nombreEl, "Ingresá tu apellido y nombre.");
        valid = false;
      }
      if (!dniEl.value.trim() || dniEl.value.replace(/\D/g, "").length < 7) {
        setFieldError(dniEl, "Ingresá un DNI válido (al menos 7 dígitos).");
        valid = false;
      }
      if (!state.cuota2File) {
        setFieldError(fileInput, "Adjuntá el comprobante de tu 2.ª cuota (JPG, PNG o PDF).");
        valid = false;
      }

      if (!valid) {
        const firstErr = $(".form-group.has-error", form);
        if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const submitBtn = $("#submitCuota2Btn");
      const btnLabel = $(".btn-label", submitBtn);
      const btnSpinner = $(".btn-spinner", submitBtn);

      submitBtn.disabled = true;
      btnLabel.textContent = "Enviando comprobante...";
      btnSpinner.hidden = false;

      const payload = {
        tipoEnvio: "segunda_cuota",
        rol: IS_ORGANIZER_PAGE ? "organizador" : "participante",
        equipoOrganizador: IS_ORGANIZER_PAGE && $("#cuota2Equipo", form) ? $("#cuota2Equipo", form).value : "",
        fechaRegistro: new Date().toISOString(),
        codigoInscripcion: codigoEl.value.trim().toUpperCase() || "No informado",
        nombreCompleto: nombreEl.value.trim(),
        dni: dniEl.value.trim(),
        modalidadPago: "2.ª cuota (enero 2027)",
        comprobanteNombre: state.cuota2File.name,
        comprobanteTipo: state.cuota2File.type,
        comprobanteBase64: state.cuota2FileBase64
      };

      const scriptUrl = getActiveScriptUrl();
      const isPlaceholderUrl = isPlaceholderScriptUrl(scriptUrl);

      try {
        if (!isPlaceholderUrl) {
          const response = await fetch(scriptUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error(`Error del servidor (${response.status})`);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 550));
        }

        const panel = $("#secondInstallmentConfirmation");
        const demoNotice = $("#cuota2DemoNotice");
        const summary = $("#cuota2ConfirmSummary");
        const btnWa = $("#btnWhatsappCuota2");

        demoNotice.hidden = !isPlaceholderUrl;
        const items = [
          ["Participante", payload.nombreCompleto],
          ["DNI", payload.dni],
          ["Código de inscripción", payload.codigoInscripcion],
          ["Comprobante 2.ª cuota", payload.comprobanteNombre]
        ];
        summary.innerHTML = items
          .map(([label, val]) => `<div><dt>${label}</dt><dd>${escapeHtml(val)}</dd></div>`)
          .join("");

        const waMsg = `¡Hola! Acabo de cargar el comprobante de la 2.ª cuota para ${CAMPA_CONFIG.EVENT_NAME}.\n• Apellido y nombre: ${payload.nombreCompleto}\n• DNI: ${payload.dni}\n• Código: ${payload.codigoInscripcion}`;
        btnWa.setAttribute("href", buildWhatsAppUrl(waMsg));

        form.hidden = true;
        panel.hidden = false;
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (err) {
        globalErr.textContent = "No se pudo enviar el comprobante. Verificá tu conexión e intentá nuevamente.";
        globalErr.hidden = false;
        console.error("Error enviando 2.ª cuota:", err);
      } finally {
        submitBtn.disabled = false;
        btnLabel.textContent = "Enviar comprobante de 2.ª cuota";
        btnSpinner.hidden = true;
      }
    });

    const btnNewCuota2 = $("#btnNewCuota2");
    if (btnNewCuota2) {
      btnNewCuota2.addEventListener("click", () => {
        form.reset();
        resetCuota2File();
        $("#secondInstallmentConfirmation").hidden = true;
        form.hidden = false;
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function initFileUpload(fileInput) {
    const uploadZone = $("#uploadZone");
    const placeholder = $("#uploadPlaceholder");
    const preview = $("#uploadPreview");
    const previewImg = $("#previewImg");
    const previewPdfBadge = $("#previewPdfBadge");
    const previewFileName = $("#previewFileName");
    const previewFileSize = $("#previewFileSize");
    const btnRemoveFile = $("#btnRemoveFile");

    async function handleFile(file) {
      if (!file) return;

      const maxBytes = (CAMPA_CONFIG.MAX_FILE_SIZE_MB || 5) * 1024 * 1024;
      const allowedTypes = CAMPA_CONFIG.ALLOWED_FILE_TYPES || ["image/jpeg", "image/png", "application/pdf"];
      const ext = file.name.split(".").pop().toLowerCase();
      const validExt = ["jpg", "jpeg", "png", "pdf"].includes(ext);

      if (!allowedTypes.includes(file.type) && !validExt) {
        setFieldError(fileInput, "Formato no válido. Subí una imagen JPG, PNG o un archivo PDF.");
        fileInput.value = "";
        return;
      }

      if (file.size > maxBytes) {
        setFieldError(fileInput, `El archivo supera el máximo permitido de ${CAMPA_CONFIG.MAX_FILE_SIZE_MB} MB.`);
        fileInput.value = "";
        return;
      }

      setFieldError(fileInput, "");
      state.selectedFile = file;

      try {
        state.selectedFileBase64 = await readFileAsBase64(file);
      } catch {
        setFieldError(fileInput, "No se pudo procesar el archivo. Intentá nuevamente.");
        return;
      }

      previewFileName.textContent = file.name;
      previewFileSize.textContent = formatBytes(file.size);

      if (file.type === "application/pdf" || ext === "pdf") {
        previewImg.hidden = true;
        previewImg.removeAttribute("src");
        previewPdfBadge.hidden = false;
      } else {
        previewPdfBadge.hidden = true;
        previewImg.src = URL.createObjectURL(file);
        previewImg.hidden = false;
      }

      placeholder.hidden = true;
      preview.hidden = false;
    }

    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) {
        handleFile(fileInput.files[0]);
      }
    });

    ["dragenter", "dragover"].forEach((evt) => {
      uploadZone.addEventListener(evt, (e) => {
        e.preventDefault();
        uploadZone.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach((evt) => {
      uploadZone.addEventListener(evt, (e) => {
        e.preventDefault();
        uploadZone.classList.remove("is-dragover");
      });
    });

    uploadZone.addEventListener("drop", (e) => {
      const droppedFile = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    });

    btnRemoveFile.addEventListener("click", (e) => {
      e.stopPropagation();
      resetFileUpload();
    });
  }

  function resetFileUpload() {
    const fileInput = $("#comprobanteArchivo");
    const placeholder = $("#uploadPlaceholder");
    const preview = $("#uploadPreview");
    const previewImg = $("#previewImg");

    state.selectedFile = null;
    state.selectedFileBase64 = "";
    if (fileInput) fileInput.value = "";
    if (previewImg) {
      previewImg.hidden = true;
      previewImg.removeAttribute("src");
    }
    if (preview) preview.hidden = true;
    if (placeholder) placeholder.hidden = false;
  }

  function validateForm(form) {
    let valid = true;

    const requiredTextFields = [
      { id: "nombreCompleto", msg: "Ingresá tu apellido y nombre." },
      { id: "fechaNacimiento", msg: "Seleccioná tu fecha de nacimiento." },
      { id: "edad", msg: "Ingresá tu edad." },
      { id: "dni", msg: "Ingresá tu DNI." },
      { id: "telefono", msg: "Ingresá tu número de teléfono personal." },
      { id: "tutorNombre", msg: "Ingresá el apellido y nombre de padre, madre o tutor." },
      { id: "tutorTelefono", msg: "Ingresá el número de teléfono de padre, madre o tutor." },
      { id: "parroquia", msg: "Indicá la parroquia a la que pertenecés." },
      { id: "localidad", msg: "Indicá tu localidad." },
      { id: "modalidadPago", msg: "Seleccioná una modalidad de pago." }
    ];

    requiredTextFields.forEach(({ id, msg }) => {
      const el = $(`#${id}`, form);
      if (!el) return;
      const val = el.value.trim();
      if (!val) {
        setFieldError(el, msg);
        valid = false;
      }
    });

    // Validación de equipo de organización (solo en vista de organizadores)
    const equipoOrgEl = $("#equipoOrganizador", form);
    if (IS_ORGANIZER_PAGE && equipoOrgEl && !equipoOrgEl.value.trim()) {
      setFieldError(equipoOrgEl, "Seleccioná a qué área o equipo de organización pertenecés.");
      valid = false;
    }

    // Validación de DNI
    const dniEl = $("#dni", form);
    if (dniEl && dniEl.value.trim() && dniEl.value.replace(/\D/g, "").length < 7) {
      setFieldError(dniEl, "El DNI debe tener al menos 7 dígitos.");
      valid = false;
    }

    // Validación de experiencia (¿Participaste de algún CampaJuve?)
    const participoSelected = $('input[name="participoCampa"]:checked', form);
    const participoAny = $('input[name="participoCampa"]', form);
    if (!participoSelected && participoAny) {
      setFieldError(participoAny, "Seleccioná Sí o No para indicar si participaste antes.");
      valid = false;
    }

    // Comprobante obligatorio salvo en solicitud de beca
    const isBeca = $("#modalidadPago", form).value === "Solicitud de Beca / Fondo Solidario";
    const comprobanteInput = $("#comprobanteArchivo", form);
    if (!isBeca && !state.selectedFile) {
      setFieldError(comprobanteInput, "Adjuntá tu comprobante de pago (JPG, PNG o PDF) o seleccioná Beca / Fondo Solidario.");
      valid = false;
    }

    return valid;
  }

  async function handleFormSubmit(form) {
    if (!IS_ORGANIZER_PAGE && state.cupoCompleto) {
      return;
    }

    const submitBtn = $("#submitBtn");
    const btnLabel = $(".btn-label", submitBtn);
    const btnSpinner = $(".btn-spinner", submitBtn);
    const globalErr = $("#formGlobalError");

    submitBtn.disabled = true;
    btnLabel.textContent = "Enviando inscripción...";
    btnSpinner.hidden = false;

    const code = generateRegistrationCode();
    const participoSelected = $('input[name="participoCampa"]:checked', form);

    const payload = {
      tipoEnvio: "inscripcion_inicial",
      rol: IS_ORGANIZER_PAGE ? "organizador" : "participante",
      equipoOrganizador: IS_ORGANIZER_PAGE && $("#equipoOrganizador", form) ? $("#equipoOrganizador", form).value : "",
      codigoInscripcion: code,
      fechaRegistro: new Date().toISOString(),
      nombreCompleto: $("#nombreCompleto", form).value.trim(),
      fechaNacimiento: $("#fechaNacimiento", form).value,
      edad: $("#edad", form).value.trim(),
      dni: $("#dni", form).value.trim(),
      telefono: $("#telefono", form).value.trim(),
      tutorNombre: $("#tutorNombre", form).value.trim(),
      tutorTelefono: $("#tutorTelefono", form).value.trim(),
      parroquia: $("#parroquia", form).value.trim(),
      localidad: $("#localidad", form).value.trim(),
      participoCampa: participoSelected ? participoSelected.value : "",
      obraSocialAfiliado: $("#obraSocialAfiliado", form).value.trim() || "No informada",
      alergias: $("#alergias", form).value.trim() || "No",
      alimentacionEspecial: $("#alimentacionEspecial", form).value.trim() || "Ninguna",
      tratamientoMedicacion: $("#tratamientoMedicacion", form).value.trim() || "No",
      modalidadPago: $("#modalidadPago", form).value,
      becaDetalle: $("#becaDetalle", form).value.trim(),
      comprobanteNombre: state.selectedFile ? state.selectedFile.name : "Sin comprobante",
      comprobanteTipo: state.selectedFile ? state.selectedFile.type : "",
      comprobanteBase64: state.selectedFileBase64 || ""
    };

    const scriptUrl = getActiveScriptUrl();
    const isPlaceholderUrl = isPlaceholderScriptUrl(scriptUrl);

    try {
      if (!isPlaceholderUrl) {
        // Se usa text/plain para evitar preflight CORS en Google Apps Script Web Apps
        const response = await fetch(scriptUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Error del servidor (${response.status})`);
        }
      } else {
        // Breve demora simulada en modo vista previa local
        await new Promise((resolve) => setTimeout(resolve, 650));
      }

      state.lastRegistrationCode = code;
      saveRegistrationState(payload, isPlaceholderUrl);
      showConfirmation(payload, isPlaceholderUrl, { animateConfetti: true, scrollToPanel: true });
    } catch (err) {
      globalErr.textContent = "Hubo un inconveniente al enviar tu inscripción. Verificá tu conexión a internet e intentá nuevamente.";
      globalErr.hidden = false;
      console.error("Error enviando inscripción:", err);
    } finally {
      const locked = form.classList.contains("is-locked");
      submitBtn.disabled = locked;
      btnLabel.textContent = locked ? "Inscripción confirmada" : "Confirmar mi Inscripción";
      btnSpinner.hidden = true;
    }
  }

  function lockInitialForm(customButtonText) {
    const form = $("#registrationForm");
    if (!form) return;

    form.classList.add("is-locked");
    form.setAttribute("aria-disabled", "true");
    $$("input, select, textarea, button, fieldset", form).forEach((el) => {
      el.disabled = true;
    });

    const submitLabel = $("#submitBtn .btn-label");
    if (submitLabel) {
      submitLabel.textContent = customButtonText || "Inscripción confirmada";
    }
  }

  function triggerWhiteConfetti() {
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const layer = $("#confettiLayer");
    if (!layer) return;

    layer.innerHTML = "";
    const pieceCount = 28;

    for (let i = 0; i < pieceCount; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      const width = 5 + Math.random() * 5;
      const height = 8 + Math.random() * 6;
      const left = Math.random() * 100;
      const dur = (3.1 + Math.random() * 2.1).toFixed(2);
      const delay = (Math.random() * 1.1).toFixed(2);
      const drift = Math.round((Math.random() - 0.5) * 90);
      const rot = Math.round(140 + Math.random() * 260);
      const opacity = (0.65 + Math.random() * 0.3).toFixed(2);

      piece.style.width = `${width}px`;
      piece.style.height = `${height}px`;
      piece.style.left = `${left}%`;
      piece.style.setProperty("--fall-dur", `${dur}s`);
      piece.style.setProperty("--fall-delay", `${delay}s`);
      piece.style.setProperty("--fall-drift", `${drift}px`);
      piece.style.setProperty("--fall-rot", `${rot}deg`);
      piece.style.setProperty("--piece-opacity", opacity);

      layer.appendChild(piece);
    }

    clearTimeout(triggerWhiteConfetti._timer);
    triggerWhiteConfetti._timer = setTimeout(() => {
      layer.innerHTML = "";
    }, 6500);
  }

  function saveRegistrationState(data, isDemoMode) {
    try {
      const record = {
        confirmed: true,
        rol: data.rol || (IS_ORGANIZER_PAGE ? "organizador" : "participante"),
        equipoOrganizador: data.equipoOrganizador || "",
        codigoInscripcion: data.codigoInscripcion,
        nombreCompleto: data.nombreCompleto,
        dni: data.dni,
        parroquia: data.parroquia,
        localidad: data.localidad,
        participoCampa: data.participoCampa,
        tutorNombre: data.tutorNombre,
        tutorTelefono: data.tutorTelefono,
        modalidadPago: data.modalidadPago,
        comprobanteNombre: data.comprobanteNombre,
        isDemoMode: Boolean(isDemoMode),
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY_CONFIRMED, JSON.stringify(record));
    } catch {
      // Ignorar si localStorage no está disponible en navegación privada estricta
    }
  }

  function restoreRegistrationState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONFIRMED);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || !saved.confirmed) return;

      state.lastRegistrationCode = saved.codigoInscripcion || "";
      showConfirmation(saved, Boolean(saved.isDemoMode), { animateConfetti: false, scrollToPanel: false });

      // Precompletar código de inscripción en la pestaña de 2.ª cuota para mayor comodidad
      const cuota2Codigo = $("#cuota2Codigo");
      if (cuota2Codigo && !cuota2Codigo.value && saved.codigoInscripcion) {
        cuota2Codigo.value = saved.codigoInscripcion;
      }
    } catch {
      // Ignorar datos corruptos o localStorage bloqueado
    }
  }

  function showConfirmation(data, isDemoMode, options = {}) {
    const { animateConfetti = false, scrollToPanel = true } = options;
    const panel = $("#confirmationPanel");
    const confirmCode = $("#confirmCode");
    const confirmCuotasNote = $("#confirmCuotasNote");
    const confirmCodeInline = $("#confirmCodeInline");
    const demoNotice = $("#confirmDemoNotice");
    const summary = $("#confirmSummary");
    const btnWhatsapp = $("#btnWhatsappConfirm");

    confirmCode.textContent = data.codigoInscripcion;
    if (confirmCodeInline) confirmCodeInline.textContent = data.codigoInscripcion;
    if (confirmCuotasNote) {
      confirmCuotasNote.hidden = !String(data.modalidadPago || "").startsWith("En 2 cuotas");
    }
    demoNotice.hidden = !isDemoMode;

    const summaryItems = [
      ["Participante", data.nombreCompleto],
      ...(data.equipoOrganizador ? [["Equipo de organización", data.equipoOrganizador]] : []),
      ["DNI", data.dni],
      ["Parroquia y localidad", `${data.parroquia} (${data.localidad})`],
      ["¿Participó de algún CampaJuve?", data.participoCampa],
      ["Padre / Madre / Tutor", `${data.tutorNombre} (${data.tutorTelefono})`],
      ["Modalidad de pago", data.modalidadPago],
      ["Comprobante", data.comprobanteNombre]
    ];

    summary.innerHTML = summaryItems
      .map(([label, val]) => `<div><dt>${label}</dt><dd>${escapeHtml(val || "")}</dd></div>`)
      .join("");

    const waMsg = `¡Hola! Me acabo de inscribir a ${CAMPA_CONFIG.EVENT_NAME}.\n• Código: ${data.codigoInscripcion}\n• Apellido y nombre: ${data.nombreCompleto}\n• Parroquia: ${data.parroquia}\n• Modalidad: ${data.modalidadPago}`;
    btnWhatsapp.setAttribute("href", buildWhatsAppUrl(waMsg));

    // Precompletar código en 2.ª cuota si está vacío
    const cuota2Codigo = $("#cuota2Codigo");
    if (cuota2Codigo && !cuota2Codigo.value && data.codigoInscripcion) {
      cuota2Codigo.value = data.codigoInscripcion;
    }

    lockInitialForm();
    panel.hidden = false;

    if (animateConfetti) {
      triggerWhiteConfetti();
    }

    if (scrollToPanel) {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ================= ANIMACIÓN SUTIL DE TÍTULOS AL HACER SCROLL ================= */
  function initEutrapeliaReveal() {
    const titles = $$("#eutrapeliaTitle, .title-reveal");
    if (!titles.length) return;

    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || !("IntersectionObserver" in window)) {
      return;
    }

    titles.forEach((title) => {
      title.classList.add("reveal-ready");

      const observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              title.classList.add("is-visible");
              obs.disconnect();
            }
          });
        },
        { threshold: 0.25 }
      );

      observer.observe(title.closest(".eutrapelia-card") || title);
    });
  }

  /* ================= MODAL DE PAGO (MERCADO PAGO / ALIAS) ================= */
  function initPaymentModal() {
    const triggers = $$("[data-open-pay-modal]");
    if (!triggers.length) return;

    const modalHtml = `
      <div id="paymentModal" class="pay-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="payModalTitle" hidden>
        <div class="pay-modal">
          <button type="button" class="pay-modal-close" id="payModalClose" aria-label="Cerrar ventana de pago">&times;</button>
          <h3 id="payModalTitle">¿Cómo querés abonar?</h3>
          <p class="pay-modal-sub">Elegí Mercado Pago o transferí con el alias desde cualquier banco o billetera virtual.</p>

          <div class="pay-option-box">
            <h4 class="pay-option-title">1. Abrir Mercado Pago</h4>
            <p class="pay-option-desc">Abre la app de Mercado Pago en tu celular (o la web si estás en computadora).</p>
            <button type="button" class="btn btn-secondary btn-block" id="btnOpenMercadoPago">
              Abrir Mercado Pago
            </button>
          </div>

          <div class="pay-option-box">
            <h4 class="pay-option-title">2. Pagar con otra billetera o banco</h4>
            <div class="pay-modal-alias-row">
              <div>
                <span class="copy-label">Alias</span>
                <div class="pay-modal-alias-val" id="payModalAlias">${escapeHtml(CAMPA_CONFIG.BANK_ALIAS || "jovenes.belen")}</div>
              </div>
              <button type="button" class="btn-copy" id="btnCopyModalAlias">Copiar alias</button>
            </div>
            <div class="pay-modal-meta">
              <div>Titular: <strong>${escapeHtml(CAMPA_CONFIG.BANK_HOLDER || "Parroquia Nuestra Señora de Belén")}</strong></div>
              <div>Banco: <strong>${escapeHtml(CAMPA_CONFIG.BANK_NAME || "Santander")}</strong> · CUIT: <strong>${escapeHtml(CAMPA_CONFIG.BANK_CUIT || "30-53838876-5")}</strong></div>
            </div>
          </div>

          <p class="pay-modal-foot">Después de transferir, volvé a esta página para adjuntar tu comprobante en el formulario.</p>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    const modal = $("#paymentModal");
    const closeBtn = $("#payModalClose");
    const mpBtn = $("#btnOpenMercadoPago");
    const copyAliasBtn = $("#btnCopyModalAlias");

    const openModal = () => {
      modal.hidden = false;
      closeBtn.focus();
    };

    const closeModal = () => {
      modal.hidden = true;
    };

    triggers.forEach((btn) => btn.addEventListener("click", openModal));
    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });

    mpBtn.addEventListener("click", () => {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
      const mpWebUrl = "https://www.mercadopago.com.ar";

      if (!isMobile) {
        window.open(mpWebUrl, "_blank", "noopener,noreferrer");
        return;
      }

      let fallbackTimer = null;
      const onVisibilityChange = () => {
        if (document.hidden && fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
          document.removeEventListener("visibilitychange", onVisibilityChange);
        }
      };

      document.addEventListener("visibilitychange", onVisibilityChange);
      window.location.href = "mercadopago://home";

      fallbackTimer = setTimeout(() => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        if (!document.hidden) {
          window.open(mpWebUrl, "_blank", "noopener,noreferrer");
        }
      }, 900);
    });

    copyAliasBtn.addEventListener("click", async () => {
      const alias = CAMPA_CONFIG.BANK_ALIAS || "jovenes.belen";
      await copyToClipboard(alias, "Alias");
      copyAliasBtn.textContent = "¡Copiado!";
      clearTimeout(copyAliasBtn._timer);
      copyAliasBtn._timer = setTimeout(() => {
        copyAliasBtn.textContent = "Copiar alias";
      }, 2000);
    });
  }

  /* ================= CONTADOR DE CUPOS (MAX 70) Y TEMPORIZADOR ================= */
  function initCuposAndCountdown() {
    const section = $("#cupos-cuenta-regresiva");
    if (!section) return;

    const MAX_PARTICIPANTES = 70;
    const countInscriptosEl = $("#countInscriptos");
    const countDisponiblesEl = $("#countDisponibles");
    const progressBarEl = $("#cuposProgressBar");
    const fullNoticeEl = $("#cuposFullNotice");

    function renderCupos(rawCount) {
      const inscriptos = Math.max(0, Number.isFinite(rawCount) ? Math.floor(rawCount) : 0);
      const disponibles = Math.max(0, MAX_PARTICIPANTES - inscriptos);
      const pct = Math.min(100, Math.round((inscriptos / MAX_PARTICIPANTES) * 100));

      if (countInscriptosEl) countInscriptosEl.textContent = String(inscriptos);
      if (countDisponiblesEl) countDisponiblesEl.textContent = String(disponibles);
      if (progressBarEl) progressBarEl.style.width = `${pct}%`;
      if (fullNoticeEl) fullNoticeEl.hidden = disponibles > 0;

      // Bloquear formulario de participantes cuando se completan los 70 cupos (nunca afecta a organizadores)
      if (!IS_ORGANIZER_PAGE && inscriptos >= MAX_PARTICIPANTES) {
        state.cupoCompleto = true;
        const banner = $("#cupoCompletoBanner");
        if (banner) banner.hidden = false;
        const confirmPanel = $("#confirmationPanel");
        const alreadyConfirmed = confirmPanel && !confirmPanel.hidden;
        if (!alreadyConfirmed) {
          lockInitialForm("Cupo completo (70/70)");
        }
      }
    }

    // Consultar únicamente la Web App de participantes vía GET (nunca organizadores)
    const participantesUrl = CAMPA_CONFIG.GOOGLE_SCRIPT_URL || "";
    if (participantesUrl && !isPlaceholderScriptUrl(participantesUrl)) {
      fetch(participantesUrl, { method: "GET" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data || typeof data !== "object") {
            renderCupos(0);
            return;
          }
          const raw =
            data.inscriptos ??
            data.participantes ??
            data.count ??
            data.total ??
            0;
          const parsed = Number(raw);
          renderCupos(Number.isFinite(parsed) ? parsed : 0);
        })
        .catch(() => {
          renderCupos(0);
        });
    } else {
      renderCupos(0);
    }

    // Temporizador hasta el 15/01/2027 23:59:59 (hora Argentina -03:00)
    const deadlineMs = new Date("2027-01-15T23:59:59-03:00").getTime();
    const cdDays = $("#cdDays");
    const cdHours = $("#cdHours");
    const cdMinutes = $("#cdMinutes");
    const cdSeconds = $("#cdSeconds");
    const closedNotice = $("#countdownClosedNotice");

    function updateUnit(el, value) {
      if (!el) return;
      const formatted = String(value).padStart(2, "0");
      if (el.textContent !== formatted) {
        el.textContent = formatted;
        el.classList.remove("is-tick");
        void el.offsetWidth;
        el.classList.add("is-tick");
      }
    }

    function updateCountdown() {
      const diff = deadlineMs - Date.now();
      if (diff <= 0) {
        updateUnit(cdDays, 0);
        updateUnit(cdHours, 0);
        updateUnit(cdMinutes, 0);
        updateUnit(cdSeconds, 0);
        if (closedNotice) closedNotice.hidden = false;
        return false;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      updateUnit(cdDays, days);
      updateUnit(cdHours, hours);
      updateUnit(cdMinutes, minutes);
      updateUnit(cdSeconds, seconds);
      if (closedNotice) closedNotice.hidden = true;
      return true;
    }

    if (updateCountdown()) {
      const timerId = setInterval(() => {
        if (!updateCountdown()) {
          clearInterval(timerId);
        }
      }, 1000);
    }
  }

  /* ================= INICIALIZACIÓN ================= */
  document.addEventListener("DOMContentLoaded", () => {
    hydrateConfig();
    initNavigation();
    initSymbols();
    initCopyButtons();
    initFormLogic();
    initEutrapeliaReveal();
    initPaymentModal();
    initCuposAndCountdown();
  });
})();
