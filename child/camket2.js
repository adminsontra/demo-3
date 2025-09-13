// ======================== CAM KET =============================================== //
// == Helpers ==
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

// === Modal helpers (TECH skin compatible) ===
function getSigModalEl() {
  return $("#sigTechModal") || $("#sigModal");
}
function isBackdrop(el) {
  return !!el && el.classList.contains("modal-backdrop");
}
function openSigModal() {
  const m = getSigModalEl();
  if (!m) return;
  m.hidden = false;
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => m.classList.add("show"));
  (m.querySelector("[data-close]") || m).focus?.();
}
function closeSigModal() {
  const m = getSigModalEl();
  if (!m) return;
  m.classList.remove("show");
  setTimeout(() => (m.hidden = true), 200);
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
}

/** Nâng cấp #sigModal cũ -> #sigTechModal (backdrop + modal--tech) */
function upgradeLegacySigModal() {
  if ($("#sigTechModal")) return;
  const legacy = $("#sigModal");
  if (!legacy) return;

  const box = legacy.querySelector(".modal__box") || legacy;
  const children = Array.from(box.childNodes);

  const backdrop = document.createElement("div");
  backdrop.id = "sigTechModal";
  backdrop.className = "modal-backdrop";
  backdrop.hidden = true;
  backdrop.setAttribute("aria-hidden", "true");

  const modal = document.createElement("div");
  modal.className = "modal modal--tech";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "sigTitle");

  children.forEach((n) => modal.appendChild(n));
  backdrop.appendChild(modal);

  legacy.remove();
  document.body.appendChild(backdrop);

  const wrap = modal.querySelector(".modal__canvaswrap");
  if (wrap) wrap.style.background = "#0b2e1f"; // nền tối để nét trắng nổi bật
}

// == Signature state ==
const state = { sigDataUrl: null, sigSize: 100 }; // percent
let fitMode = false; // "Vừa khung" cho chữ ký HS

// ========== Size (HS) ==========
function setSigSize(pct) {
  state.sigSize = Math.min(800, Math.max(40, Math.round(pct)));
  const img = $("#pSig img");
  if (img && !fitMode) img.style.width = state.sigSize + "%";
  $("#sigRange") && ($("#sigRange").value = state.sigSize);
  $("#sigPct") && ($("#sigPct").textContent = state.sigSize + "%");
}

/** Tách nền giấy: biến ảnh chụp (giấy sáng) -> PNG trong suốt, giữ nét mực */
function removePaperBackground(
  dataUrl,
  { whitePct = 0.86, feather = 20 } = {}
) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth,
        h = img.naturalHeight;

      // Giới hạn kích thước xử lý để mượt hơn
      const maxSide = 2600;
      let dw = w,
        dh = h;
      if (Math.max(w, h) > maxSide) {
        const s = maxSide / Math.max(w, h);
        dw = Math.round(w * s);
        dh = Math.round(h * s);
      }

      const c = document.createElement("canvas");
      c.width = dw;
      c.height = dh;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, dw, dh);

      const imgData = ctx.getImageData(0, 0, dw, dh);
      const d = imgData.data;

      // Lấy mẫu độ sáng để ước lượng ngưỡng "trắng giấy" theo percentile
      const samples = [];
      for (let i = 0; i < d.length; i += 4 * 16) {
        const r = d[i],
          g = d[i + 1],
          b = d[i + 2];
        const y = 0.2126 * r + 0.7152 * g + 0.0722 * b; // luminance
        samples.push(y);
      }
      samples.sort((a, b) => a - b);
      const T = samples[Math.floor(samples.length * whitePct)] || 230; // ngưỡng

      // Làm mềm biên bằng ramp tuyến tính quanh ngưỡng
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i],
          g = d[i + 1],
          b = d[i + 2];
        const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        let a = T + feather - y; // [0 .. 2*feather]
        a = Math.max(0, Math.min(2 * feather, a));
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0; // mực → đen
        d[i + 3] = Math.round((a * 255) / (2 * feather)); // alpha
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(c.toDataURL("image/png"));
    };
    img.src = dataUrl;
  });
}

/** Làm trắng nền vở: biến lưới xanh/xám + giấy xám -> trắng tinh */
function whitenNotebookBackground(
  dataUrl,
  {
    blueHueMin = 180, // vùng xanh/cyan
    blueHueMax = 255,
    minSat = 0.18, // bão hòa tối thiểu để nhận lưới
    maxVal = 0.95, // loại trừ vùng tối (mực)
  } = {}
) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth,
        h = img.naturalHeight;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const im = ctx.getImageData(0, 0, w, h);
      const d = im.data;

      for (let i = 0; i < d.length; i += 4) {
        // RGB -> HSV
        let r = d[i] / 255,
          g = d[i + 1] / 255,
          b = d[i + 2] / 255;
        const max = Math.max(r, g, b),
          min = Math.min(r, g, b);
        const chroma = max - min;
        let hdeg = 0;
        if (chroma > 1e-6) {
          if (max === r) hdeg = 60 * (((g - b) / chroma) % 6);
          else if (max === g) hdeg = 60 * ((b - r) / chroma + 2);
          else hdeg = 60 * ((r - g) / chroma + 4);
        }
        if (hdeg < 0) hdeg += 360;
        const s = max === 0 ? 0 : chroma / max;
        const v = max;

        const isBlueGrid =
          hdeg >= blueHueMin &&
          hdeg <= blueHueMax &&
          s >= minSat &&
          v <= maxVal &&
          v >= 0.35;
        const isAlmostWhite = s <= 0.1 && v >= 0.82;

        if (isBlueGrid || isAlmostWhite) {
          d[i] = 255;
          d[i + 1] = 255;
          d[i + 2] = 255; // đẩy về trắng
        }
      }

      ctx.putImageData(im, 0, 0);
      resolve(c.toDataURL("image/png"));
    };
    img.src = dataUrl;
  });
}

/** Tạo phiên bản đen của ảnh PNG trong suốt (mọi pixel có alpha>0 đều đổi sang đen) */
function recolorToBlack(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth,
        h = img.naturalHeight;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, w, h);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 10) {
          d[i] = 0;
          d[i + 1] = 0;
          d[i + 2] = 0; // thành đen
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(c.toDataURL("image/png"));
    };
    img.src = dataUrl;
  });
}

/** Cắt viền trong suốt */
function trimTransparent(dataUrl, padding = 8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth,
        h = img.naturalHeight;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, w, h).data;
      let top = h,
        left = w,
        right = 0,
        bottom = 0,
        found = false;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (px[i + 3] > 10) {
            found = true;
            if (x < left) left = x;
            if (x > right) right = x;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
          }
        }
      }
      if (!found) return resolve(dataUrl);
      left = Math.max(0, left - padding);
      top = Math.max(0, top - padding);
      right = Math.min(w - 1, right + padding);
      bottom = Math.min(h - 1, bottom + padding);
      const cw = right - left + 1,
        ch = bottom - top + 1;
      const c2 = document.createElement("canvas");
      c2.width = cw;
      c2.height = ch;
      c2.getContext("2d").drawImage(c, left, top, cw, ch, 0, 0, cw, ch);
      resolve(c2.toDataURL("image/png"));
    };
    img.src = dataUrl;
  });
}

/** Chuỗi xử lý import: Trắng nền vở -> Xóa nền trắng -> Cắt viền */
function processSignatureImport(raw) {
  return whitenNotebookBackground(raw)
    .then((png) => removePaperBackground(png, { whitePct: 0.88, feather: 22 }))
    .then((png) => trimTransparent(png));
}

/** Chèn chữ ký HS: LUÔN đen + nền trong suốt */
async function injectSignature(dataUrlIn) {
  // đổi mọi nét có alpha>0 -> ĐEN, giữ alpha
  const dataUrlBlack = await recolorToBlack(dataUrlIn);

  state.sigDataUrl = dataUrlBlack;
  const slot = $("#pSig");
  if (!slot) return;
  slot.innerHTML = "";
  slot.style.background = "transparent"; // tránh khung nền đen

  const img = new Image();
  img.alt = "Chữ ký học sinh";
  img.src = dataUrlBlack; // HIỂN THỊ = ĐEN
  img.dataset.srcWhite = dataUrlBlack; // in/out giống nhau
  img.dataset.srcBlack = dataUrlBlack;
  img.dataset.inkColor = "black";
  img.style.width = state.sigSize + "%";
  img.decoding = "async";
  img.loading = "eager";
  slot.appendChild(img);

  updateFitAvailability();
  applyFitMode();
}

/** Chèn chữ ký HS: GIỮ NGUYÊN ảnh upload (không xoá nền/không đổi màu) */
function injectSignatureRawHS(dataUrl) {
  state.sigDataUrl = dataUrl;
  const slot = $("#pSig");
  if (!slot) return;
  slot.innerHTML = "";
  slot.style.background = "transparent";

  const img = new Image();
  img.alt = "Chữ ký học sinh (nguyên gốc)";
  img.src = dataUrl; // giữ nguyên ảnh upload
  img.dataset.srcWhite = dataUrl; // để beforeprint/afterprint vẫn an toàn
  img.dataset.srcBlack = dataUrl; // (không đổi đen nữa)
  img.dataset.inkColor = "original";
  img.style.width = state.sigSize + "%";
  img.decoding = "async";
  img.loading = "eager";
  slot.appendChild(img);

  updateFitAvailability?.();
  applyFitMode?.();
}

// ========== Bind form -> preview ==========
function bindPreview() {
  const name = $("#ckHoten");
  const lop = $("#ckLop");
  const ns = $("#ckNgaysinh");
  const chk = $("#ckDongY");

  const sync = () => {
    $("#pHoten").textContent =
      (name?.value || "").trim() || "..................................";
    $("#pLop").textContent = (lop?.value || "").trim() || ".. / ..";
    $("#pNgaysinh").textContent = (ns?.value || "").trim() || ".. / .. / ....";

    const d = new Date();
    $("#pNgayViet").textContent = `Ngày ${String(d.getDate()).padStart(
      2,
      "0"
    )} tháng ${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )} năm ${d.getFullYear()}`;

    const checked = !!chk?.checked;
    $("#ackLine") && ($("#ackLine").hidden = !!checked);
    $("#ackFull") && ($("#ackFull").hidden = !checked);
    $("#pCheck") &&
      ($("#pCheck").textContent = checked ? "Đã đánh dấu" : "Chưa đánh dấu");
    $("#ckPrint") && ($("#ckPrint").disabled = !checked);
  };

  ["input", "change", "keyup"].forEach((ev) => {
    [name, lop, ns, chk].forEach((el) => el && el.addEventListener(ev, sync));
  });
  sync();
}

// ========== Signature pad (drawing) ==========
function initSignaturePad() {
  const canvas = $("#ckCanvas");
  if (!canvas) return;

  const DPR = Math.max(1, window.devicePixelRatio || 1);
  function resizeCanvas() {
    const wrap = canvas.parentElement;
    const cssW = wrap.clientWidth || 1000;
    const cssH = 340;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * DPR);
    canvas.height = Math.round(cssH * DPR);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffff"; // bút trắng trên nền tối
    return ctx;
  }
  let ctx = resizeCanvas();
  window.addEventListener("resize", () => {
    ctx = resizeCanvas();
  });

  let drawing = false,
    last = null;
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    let x, y;
    if (e.touches && e.touches[0]) {
      x = e.touches[0].clientX - r.left;
      y = e.touches[0].clientY - r.top;
    } else {
      x = e.clientX - r.left;
      y = e.clientY - r.top;
    }
    return { x, y };
  }
  function start(e) {
    drawing = true;
    last = pos(e);
    e.preventDefault();
  }
  function move(e) {
    if (!drawing) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
    e.preventDefault();
  }
  function end(e) {
    drawing = false;
    e.preventDefault();
  }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  canvas.addEventListener("mouseup", end);
  canvas.addEventListener("mouseleave", end);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end);

  $("#ckClear")?.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
  $("#ckUse")?.addEventListener("click", () => {
    const raw = canvas.toDataURL("image/png"); // canvas nền trong suốt, nét trắng
    // đổi nét -> ĐEN, cắt viền, rồi chèn
    recolorToBlack(raw)
      .then((png) => trimTransparent(png))
      .then((png) => injectSignature(png))
      .then(closeSigModal);
  });

  const modalRoot = getSigModalEl();
  modalRoot?.addEventListener("click", (e) => {
    if (e.target.matches("[data-close]")) return closeSigModal();
    if (isBackdrop(modalRoot) && e.target === modalRoot) return closeSigModal();
    if (!isBackdrop(modalRoot) && e.target === modalRoot)
      return closeSigModal();
  });
  document.addEventListener("keydown", (e) => {
    const m = getSigModalEl();
    if (!m || m.hidden) return;
    if (e.key === "Escape") closeSigModal();
  });
}

// ========== Upload HS ==========
function initUpload() {
  const up = $("#ckUpload");
  if (!up) return;
  up.addEventListener("change", () => {
    const file = up.files && up.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = e.target.result;
      // Trắng nền vở -> Xóa nền trắng -> Cắt viền -> Chèn (đen)
      injectSignatureRawHS(raw);
    };
    reader.readAsDataURL(file);
  });
}

// ========== Upload GV ==========
async function injectSignatureGV(dataUrl) {
  const slot = $("#pSigGV");
  if (!slot) return;
  slot.innerHTML = "";
  slot.style.background = "transparent"; // đảm bảo khung không có nền

  const img = new Image();
  img.alt = "Chữ ký giáo viên";
  img.src = dataUrl; // giữ nguyên ảnh upload
  img.style.width = "100%";
  img.decoding = "async";
  img.loading = "eager";
  slot.appendChild(img);
}

function initUploadGV() {
  const up = $("#ckUploadGV");
  if (!up) return;
  up.addEventListener("change", () => {
    const file = up.files && up.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      // Trắng nền vở -> Xóa nền trắng -> Cắt viền -> Đen -> Chèn
      injectSignatureGV(e.target.result);
    };
    reader.readAsDataURL(file);
  });
}

// ========== Size controls ==========
function initSizeControls() {
  $("#sigRange")?.addEventListener("input", (e) => setSigSize(e.target.value));
  $("#sigMinus")?.addEventListener("click", () =>
    setSigSize(state.sigSize - 10)
  );
  $("#sigPlus")?.addEventListener("click", () =>
    setSigSize(state.sigSize + 10)
  );
  setSigSize(state.sigSize);
}

// ========== Fit khung toggle ==========
function applyFitMode() {
  const slot = $("#pSig");
  const img = slot?.querySelector("img");
  slot?.classList.toggle("fit", fitMode);
  const dis = fitMode;
  ["sigRange", "sigMinus", "sigPlus"].forEach((id) => {
    const el = $("#" + id);
    if (el) el.disabled = dis;
  });
  if (img) img.style.width = fitMode ? "100%" : state.sigSize + "%";
}
function initFitToggle() {
  const btn = $("#fitToggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    fitMode = !fitMode;
    btn.textContent = fitMode ? "Thoát vừa khung" : "Vừa khung";
    applyFitMode();
  });
}

// ========== Logo controls ==========
function initLogo() {
  const up = $("#logoUpload");
  const img = $("#pLogo");
  const tog = $("#logoToggle");
  const rm = $("#logoRemove");
  const applyVis = () => {
    img.style.display =
      img.getAttribute("src") && tog?.checked ? "block" : "none";
  };
  up?.addEventListener("change", () => {
    const f = up.files && up.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (e) => {
      img.src = e.target.result;
      applyVis();
    };
    r.readAsDataURL(f);
  });
  tog?.addEventListener("change", applyVis);
  rm?.addEventListener("click", () => {
    img.removeAttribute("src");
    applyVis();
  });
  applyVis();
}

// ========== Input masks ==========
function formatLop(raw) {
  const d = (raw || "").replace(/\D+/g, "").slice(0, 4);
  return d.length <= 2 ? d : d.slice(0, 2) + "/" + d.slice(2);
}
function formatNgaySinh(raw) {
  const d = (raw || "").replace(/\D+/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return d.slice(0, 2) + " / " + d.slice(2);
  return d.slice(0, 2) + " / " + d.slice(2, 4) + " / " + d.slice(4);
}
function setMaskedValue(el, formatter) {
  const prev = el.value;
  const selStart = el.selectionStart || 0;
  const digitsBefore = prev.slice(0, selStart).replace(/\D+/g, "").length;
  const next = formatter(prev);
  let count = 0,
    idx = 0;
  while (idx < next.length && count < digitsBefore) {
    if (/\d/.test(next[idx])) count++;
    idx++;
  }
  el.value = next;
  el.setSelectionRange(idx, idx);
}
function initInputMasks() {
  const lop = $("#ckLop");
  const ns = $("#ckNgaysinh");
  lop?.addEventListener("input", () => setMaskedValue(lop, formatLop));
  ns?.addEventListener("input", () => setMaskedValue(ns, formatNgaySinh));
}

// ========== Clear signatures ==========
function hasSigHS() {
  return !!$("#pSig img");
}
function updateFitAvailability() {
  const btn = $("#fitToggle");
  if (!btn) return;
  const available = hasSigHS();
  btn.disabled = !available;
  btn.title = available ? "" : "Chưa có chữ ký HS";
}
function clearSigHS() {
  const slot = $("#pSig");
  if (slot) {
    slot.innerHTML = "";
    state.sigDataUrl = null;
  }
  if (fitMode) {
    fitMode = false;
    applyFitMode();
  }
  updateFitAvailability();
}
function clearSigGV() {
  const slot = $("#pSigGV");
  if (slot) slot.innerHTML = "";
}
function initClearButtons() {
  $("#sigClearHS")?.addEventListener("click", clearSigHS);
  $("#sigClearGV")?.addEventListener("click", clearSigGV);
}

// === Apps Script Web App endpoint (send row before printing) ===
// Quan trọng: Dán URL ứng dụng web của bạn vào đây.
// URL này có được sau khi bạn triển khai Apps Script.
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbwK21ujJ7nKiI4PyAy_XhXK8Ot6Z2EnXwpzaERsc5QIjDecEBY7ppFZxYmuxoAEY_kx/exec"; // e.g. https://script.google.com/.../exec

// Lấy data URL của chữ ký HỌC SINH
function getSigHsDataUrl() {
  const img = $("#pSig img");
  return img ? img.getAttribute("src") || "" : "";
}

// Lấy data URL của chữ ký GIÁO VIÊN
function getSigGvDataUrl() {
  const img = $("#pSigGV img");
  return img ? img.getAttribute("src") || "" : "";
}
// Lấy "Số: 004 / 2025" từ phần tử .gov__code (fallback khi không có #ckSo)
function getSoFromGovCode() {
  const el = document.querySelector(".gov__code");
  if (!el) return "";
  const txt = (el.textContent || "").trim();
  // Hỗ trợ các biến thể: "Số:004/2025" | "Số 4 / 2025" | "Số: 004 /2025" ...
  const m = txt.match(/Số[:\s]*([0-9]{1,})\s*\/\s*([0-9]{4})/i);
  if (!m) return txt; // nếu format khác thì trả nguyên chuỗi
  const seq = String(m[1]).padStart(3, "0"); // 4 -> 004
  return `${seq} / ${m[2]}`;
}

async function sendToSheetBeforePrint() {
  // Ưu tiên lấy từ input #ckSo; nếu trống → đọc tự động từ .gov__code đang hiển thị
  const so = ($("#ckSo")?.value || "").trim() || getSoFromGovCode();

  const hoten = ($("#ckHoten")?.value || "").trim();
  const lop = ($("#ckLop")?.value || "").trim();
  const ngaysinh = ($("#ckNgaysinh")?.value || "").trim();
  const dongy = !!$("#ckDongY")?.checked;

  if (!hoten || !lop || !ngaysinh || !dongy) {
    alert(
      "Vui lòng nhập Họ tên, Lớp, Ngày sinh và đánh dấu đã đọc trước khi in/tải."
    );
    throw new Error("invalid form");
  }

  const fd = new FormData();
  fd.append("action", "upsertRow");
  fd.append("so", so); // ← cột B: ví dụ "004 / 2025"
  fd.append("hoten", hoten); // ← cột C
  fd.append("lop", lop); // ← cột D
  fd.append("ngaysinh", ngaysinh); // ← cột E
  fd.append("sig_hs", getSigHsDataUrl()); // ← cột F (ảnh)
  fd.append("sig_gv", getSigGvDataUrl()); // ← cột G (ảnh)

  try {
    await fetch(GAS_URL + "?action=upsertRow", { method: "POST", body: fd });
  } catch (e) {
    console.warn("Send to sheet failed:", e);
    alert("Dữ liệu đã đưa về cho Admin. Xin cảm ơn bạn đã làm bản cam kết");
  }
}

// ========== Print (A4) & Download hint ==========
function initExport() {
  // In
  $("#ckPrint")?.addEventListener("click", () => {
    if (!$("#ckDongY")?.checked) {
      alert(
        "Bạn cần đánh dấu “Tôi đã đọc và hiểu nội dung trang này” trước khi in."
      );
      return;
    }

    // 1) MỞ POPUP NGAY (tránh bị chặn)
    const popup = window.open("", "camket-print", "width=900,height=700");
    if (!popup) {
      alert("Trình duyệt đang chặn popup. Hãy cho phép để in.");
      return;
    }

    // 2) GỬI DỮ LIỆU VỀ SHEET Ở NỀN (không await để không chặn popup)
    //    Nếu lỗi mạng, chỉ log cảnh báo, không cản in
    sendToSheetBeforePrint().catch((e) => {
      console.warn("Send to Sheet failed:", e);
    });

    // 3) Render nội dung vào popup rồi in
    const fonts =
      '<link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&display=swap" rel="stylesheet">' +
      '<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&display=swap" rel="stylesheet">' +
      '<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;800&display=swap" rel="stylesheet">';
    const cssLink = '<link rel="stylesheet" href="camket.css">';
    const inline =
      "<style>@page{size:A4;margin:14mm}" +
      "body{-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
      "[data-ck-scope] .only-screen,[data-ck-scope] .paper__note{display:none!important}" +
      "html,body{margin:0;padding:0}" +
      "</style>";

    const content = "<div data-ck-scope>" + $("#ckPaper").outerHTML + "</div>";

    const swapScript =
      "<script>(function(){" +
      "function swapToBlack(){var img=document.querySelector('#pSig img');if(!img) return;var b=img.getAttribute('data-src-black');if(b) img.setAttribute('src', b);}" +
      "function swapBack(){var img=document.querySelector('#pSig img');if(!img) return;var w=img.getAttribute('data-src-white');if(w) img.setAttribute('src', w);}" +
      "window.addEventListener('beforeprint', swapToBlack);" +
      "window.addEventListener('afterprint', swapBack);" +
      "swapToBlack();" +
      "})();</script>";

    popup.document.write(
      '<!doctype html><html><head><meta charset="utf-8">' +
        fonts +
        cssLink +
        inline +
        "</head><body>" +
        content +
        swapScript +
        "</body></html>"
    );
    popup.document.close();

    const tryPrint = () => {
      setTimeout(() => {
        popup.focus();
        popup.print();
        popup.close();
      }, 120);
    };
    popup.onload = tryPrint;
    setTimeout(tryPrint, 450); // fallback
  });

  // Tải xuống
  $("#ckDownload")?.addEventListener("click", () => {
    // Gửi về Sheet ở nền, KHÔNG alert gây block UX
    sendToSheetBeforePrint().catch((e) => {
      console.warn("Send to Sheet failed:", e);
    });
    // … Logic tải file nếu có, giữ nguyên như bạn đang làm
  });
}

// ========== Wire up ==========
document.addEventListener("DOMContentLoaded", () => {
  upgradeLegacySigModal();
  bindPreview();
  initSignaturePad();
  initUpload();
  initUploadGV();
  initSizeControls();
  initFitToggle();
  updateFitAvailability();
  initLogo();
  initInputMasks();
  initExport();
  initClearButtons();
  $("#ckOpenPad")?.addEventListener("click", openSigModal);
});
function autoFillGovCode() {
  const el = document.querySelector(".gov__code");
  if (!el) return;

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  // Bộ đếm theo ngày (lưu ở localStorage trên máy người dùng)
  const key = `ck-gov-seq-${y}${m}${d}`;
  const next = parseInt(localStorage.getItem(key) || "0", 10) + 1;
  localStorage.setItem(key, String(next));

  const seq = String(next).padStart(3, "0"); // 001, 002, ...
  el.textContent = `Số: ${seq} / ${y}`;
}

document.addEventListener("DOMContentLoaded", () => {
  // ... các init khác
  autoFillGovCode();
});
