// ===== Clock vi-VN =====
function formatVNDateTime(date) {
  const days = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];
  const d = days[date.getDay()];
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${hh}h${mi} | ${d} ngày ${dd}/${mm}/${yyyy}`;
}
function startClock() {
  const el = document.getElementById("clockText");
  if (!el) return;
  const tick = () => {
    el.textContent = formatVNDateTime(new Date());
  };
  tick();
  setInterval(tick, 1000);
}

// ===== Sticky navbar glow =====
function initSticky() {
  const nav = document.querySelector(".navbar");
  const topbar = document.querySelector(".topbar");
  if (!nav) return;
  const onScroll = () => {
    if (window.scrollY > 10) {
      nav.classList.add("is-sticky");
      if (topbar) topbar.classList.add("is-sticky");
    } else {
      nav.classList.remove("is-sticky");
      if (topbar) topbar.classList.remove("is-sticky");
    }
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// ===== Mobile menu toggle =====
function initMobileMenu() {
  const toggle = document.getElementById("menuToggle");
  const menu = document.getElementById("primaryMenu");
  if (!toggle || !menu) return;
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !toggle.contains(e.target)) {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

// ===== Desktop dropdowns =====
function initDesktopDropdowns() {
  const menu = document.getElementById("primaryMenu");
  if (!menu) return;

  const indicator = menu.querySelector(".indicator");
  const items = Array.from(
    menu.querySelectorAll(".has-submenu, .menu__item:not(.has-submenu)")
  );
  const dropdownItems = Array.from(menu.querySelectorAll(".has-submenu"));
  const CLOSE_DELAY = 180;
  const isDesktop = () => window.matchMedia("(min-width:1025px)").matches;

  function clearTimers(it) {
    if (it && it._closeTimer) {
      clearTimeout(it._closeTimer);
      it._closeTimer = null;
    }
  }
  function hideIndicator() {
    if (!indicator) return;
    indicator.style.opacity = 0;
    indicator.style.width = "0px";
  }
  function moveIndicatorTo(link) {
    if (!isDesktop() || !indicator || !link) return;
    const rect = link.getBoundingClientRect();
    const parentRect = menu.getBoundingClientRect();
    const left = rect.left - parentRect.left + menu.scrollLeft;
    indicator.style.left = left - 4 + "px";
    indicator.style.width = rect.width + 8 + "px";
    indicator.style.opacity = 1;
  }
  function closeAll() {
    dropdownItems.forEach((it) => {
      clearTimers(it);
      it.classList.remove("hover-open", "pinned-open", "is-active");
    });
    hideIndicator();
  }

  items.forEach((item) => {
    const link = item.querySelector(":scope > a");
    item.addEventListener("mouseenter", () => {
      if (!isDesktop()) return;
      if (item.classList.contains("has-submenu")) {
        dropdownItems.forEach((it) => {
          if (it !== item) {
            it.classList.remove("hover-open");
            clearTimers(it);
          }
        });
        item.classList.add("hover-open", "is-active");
        clearTimers(item);
      }
      moveIndicatorTo(link);
    });

    item.addEventListener("mouseleave", () => {
      if (!isDesktop()) return;
      if (item.classList.contains("has-submenu")) {
        if (item.classList.contains("pinned-open")) return;
        clearTimers(item);
        item._closeTimer = setTimeout(() => {
          item.classList.remove("hover-open", "is-active");
        }, CLOSE_DELAY);
      }
      const anyPinned = dropdownItems.some((it) =>
        it.classList.contains("pinned-open")
      );
      if (!anyPinned) hideIndicator();
    });
  });

  dropdownItems.forEach((item) => {
    const link = item.querySelector(":scope > a");
    if (!link) return;
    link.addEventListener("click", (e) => {
      if (!isDesktop()) return;
      e.preventDefault();
      const willPin = !item.classList.contains("pinned-open");
      dropdownItems.forEach((it) => {
        if (it !== item) {
          it.classList.remove("pinned-open", "hover-open", "is-active");
          clearTimers(it);
        }
      });
      if (willPin) {
        item.classList.add("pinned-open", "hover-open", "is-active");
        moveIndicatorTo(link);
        link.setAttribute("aria-expanded", "true");
      } else {
        item.classList.remove("pinned-open", "hover-open", "is-active");
        link.setAttribute("aria-expanded", "false");
        hideIndicator();
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!isDesktop()) return;
    const inside = dropdownItems.some((it) => it.contains(e.target));
    if (!inside) closeAll();
  });
  document.addEventListener("keydown", (e) => {
    if (!isDesktop()) return;
    if (e.key === "Escape") closeAll();
  });

  window.addEventListener(
    "resize",
    () => {
      const pinned = dropdownItems.find((it) =>
        it.classList.contains("pinned-open")
      );
      if (pinned) {
        const link = pinned.querySelector(":scope > a");
        moveIndicatorTo(link);
      } else {
        hideIndicator();
      }
    },
    { passive: true }
  );
}

// ===== Mobile submenus (<=1024px) =====
function initSubmenusMobile() {
  const items = document.querySelectorAll(".has-submenu");
  items.forEach((item) => {
    const link = item.querySelector(":scope > a");
    if (!link) return;
    link.addEventListener("click", (e) => {
      if (window.matchMedia("(max-width:1024px)").matches) {
        e.preventDefault();
        items.forEach((it) => {
          if (it !== item) it.classList.remove("open");
        });
        item.classList.toggle("open");
        link.setAttribute(
          "aria-expanded",
          String(item.classList.contains("open"))
        );
      }
    });
  });
}

// ===== Đồng bộ chiều cao =====
function syncTopbarHeight() {
  const tb = document.querySelector(".topbar");
  const nv = document.querySelector(".navbar");
  if (!tb && !nv) return;
  const th = tb?.offsetHeight || 44;
  const nh = nv?.offsetHeight || 64;
  document.documentElement.style.setProperty("--topbar-h", th + "px");
  document.documentElement.style.setProperty("--nav-h", nh + "px");
}

// ===== Dual logo sync =====
function syncDualLogoSize() {
  const root = document.documentElement;
  const left = document.querySelector(".brand__logo--left");
  const right = document.querySelector(".brand__logo--right");
  if (!left || !right) return;

  const applySize = () => {
    const rect = left.getBoundingClientRect();
    const size = Math.round(Math.min(rect.width, rect.height));
    if (size > 0) root.style.setProperty("--logo-size", size + "px");
  };

  if (left.complete !== undefined) {
    if (left.complete) applySize();
    else left.addEventListener("load", applySize, { once: true });
  } else {
    requestAnimationFrame(applySize);
  }

  window.addEventListener("resize", applySize, { passive: true });
}

/* ===== Clipboard helper ===== */
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
}

/* Toast nhỏ */
function ensureCopyToast() {
  let el = document.querySelector(".toast-copy");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast-copy";
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.top = "14px";
    el.style.transform = "translateX(-50%)";
    el.style.background = "#0b2e1f";
    el.style.color = "#e6ffef";
    el.style.padding = "8px 12px";
    el.style.borderRadius = "10px";
    el.style.boxShadow = "0 10px 30px rgba(16,24,40,.18)";
    el.style.fontWeight = "700";
    el.style.fontSize = "13px";
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    el.style.transition = "opacity .25s ease, transform .25s ease";
    el.style.zIndex = "2200";
    document.body.appendChild(el);
  }
  return el;
}
function showCopyToast(text) {
  const t = ensureCopyToast();
  t.textContent = text || "Đã sao chép";
  t.style.opacity = "1";
  t.style.transform = "translateX(-50%) translateY(4px)";
  clearTimeout(showCopyToast._t);
  showCopyToast._t = setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateX(-50%)";
  }, 1400);
}

/* ===== Modal logic (giữ nguyên theo yêu cầu) ===== */
function qs(sel) {
  return document.querySelector(sel);
}
function openPhoneModal() {
  const modal = qs("#phoneActionModal");
  if (!modal) return;
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add("show"));
  setTimeout(() => qs("#pamCallBtn")?.focus(), 0);
}
function closePhoneModal() {
  const modal = qs("#phoneActionModal");
  if (!modal) return;
  modal.classList.remove("show");
  setTimeout(() => {
    modal.hidden = true;
  }, 180);
}
function initHotlineModal() {
  const hotlineLink = document.getElementById("hotlineLink");
  const hotlineNumberEl = document.getElementById("hotlineNumber");
  const modal = document.getElementById("phoneActionModal");
  const callBtn = document.getElementById("pamCallBtn");
  const copyBtn = document.getElementById("pamCopyBtn");
  if (!hotlineLink || !hotlineNumberEl || !modal || !callBtn || !copyBtn)
    return;

  hotlineLink.addEventListener("click", (e) => {
    e.preventDefault();
    openPhoneModal();
  });
  modal.addEventListener("click", (e) => {
    if (e.target.matches("[data-close]") || e.target === modal)
      closePhoneModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePhoneModal();
  });

  callBtn.addEventListener("click", () => {
    const num = (
      hotlineNumberEl.dataset.phone ||
      hotlineNumberEl.textContent ||
      ""
    ).replace(/\s+/g, "");
    closePhoneModal();
    window.location.href = "tel:" + num;
  });
  copyBtn.addEventListener("click", async () => {
    const raw =
      hotlineNumberEl.dataset.phone || hotlineNumberEl.textContent || "";
    const num = raw.replace(/\s+/g, "");
    const ok = await copyText(num);
    closePhoneModal();
    if (ok) showCopyToast("Đã sao chép số điện thoại");
  });
}

/* ===== Super Search VIP PRO ===== */
(function () {
  const cfg = {
    crawl: true,
    maxPages: 30,
    concurrency: 3,
    sameOriginOnly: true,
    selectorOnPage: [
      "h1,h2,h3,h4,h5,h6",
      "p,li,figcaption,blockquote",
      "td,th,summary,caption",
      "a[href],button,[role=button]",
      "[data-search]",
    ].join(","),
  };

  const state = {
    open: false,
    built: false,
    building: false,
    index: [],
    visited: new Set(),
  };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const isVisible = (el) => {
    const cs = getComputedStyle(el);
    return (
      cs &&
      cs.display !== "none" &&
      cs.visibility !== "hidden" &&
      el.offsetParent !== null
    );
  };
  const normalize = (s) => (s || "").replace(/\s+/g, " ").trim();
  const tokenize = (q) =>
    normalize(q).toLowerCase().split(/\s+/).filter(Boolean);
  const hasExt = (url) => /\.(html?)($|[?#])/i.test(url);
  function slugify(s) {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\-\s]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 64);
  }
  function markMatch(snippet, terms) {
    let out = snippet;
    terms.forEach((t) => {
      const re = new RegExp(
        `(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
        "gi"
      );
      out = out.replace(re, "<mark>$1</mark>");
    });
    return out;
  }

  function indexCurrentPage() {
    const url = location.pathname + location.search;
    const title = document.title || "Trang hiện tại";
    $$(cfg.selectorOnPage).forEach((el, i) => {
      if (!normalize(el.textContent)) return;
      if (!isVisible(el)) return;
      let id = el.id;
      if (!id) {
        id = `ss-${slugify(el.textContent).slice(0, 24)}-${i}`;
        el.id = id;
      }
      state.index.push({
        type: "node",
        url: `${url}#${id}`,
        title: title,
        text: normalize(
          [
            el.textContent,
            el.getAttribute("title"),
            el.getAttribute("aria-label"),
          ]
            .filter(Boolean)
            .join(" ")
        ),
        anchorId: id,
        scoreHint: el.matches("h1,h2") ? 3 : el.matches("h3,h4") ? 2 : 1,
      });
    });
  }

  function collectLinksFrom(doc, base) {
    const out = [];
    $$("a[href]", doc).forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      )
        return;
      const u = new URL(href, base);
      if (cfg.sameOriginOnly && u.origin !== location.origin) return;
      if (!(hasExt(u.pathname) || !/\.[a-z0-9]+$/i.test(u.pathname))) return;
      out.push(u.href);
    });
    return Array.from(new Set(out));
  }

  async function fetchHTML(url) {
    try {
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) return null;
      const text = await res.text();
      return new DOMParser().parseFromString(text, "text/html");
    } catch (e) {
      return null;
    }
  }

  function indexDoc(doc, url) {
    const title = doc.title || url;
    const bodyText = normalize(doc.body ? doc.body.innerText : "");
    if (bodyText) {
      state.index.push({
        type: "page",
        url,
        title,
        text: bodyText,
        scoreHint: 1,
      });
    }
    $$("h1,h2,h3", doc).forEach((h, i) => {
      const id = h.id || `ss-ext-${i}`;
      if (!h.id) h.id = id;
      const t = normalize(h.textContent);
      if (t) {
        state.index.push({
          type: "page",
          url: `${url}#${id}`,
          title: `${title} — ${t}`,
          text: bodyText,
          scoreHint: 2,
        });
      }
    });
  }

  async function buildIndex(progress) {
    if (state.built || state.building) return;
    state.building = true;
    state.index = [];

    indexCurrentPage();

    if (!cfg.crawl) {
      state.built = true;
      state.building = false;
      return;
    }

    const seedLinks = collectLinksFrom(document, location.href).slice(
      0,
      cfg.maxPages
    );
    const queue = seedLinks.filter((u) => !state.visited.has(u));
    let done = 0;

    async function worker() {
      while (queue.length) {
        const u = queue.shift();
        if (state.visited.has(u)) {
          done++;
          updateProgress();
          continue;
        }
        state.visited.add(u);
        const dom = await fetchHTML(u);
        if (dom) {
          indexDoc(dom, u);
          collectLinksFrom(dom, u)
            .slice(0, 4)
            .forEach((nu) => {
              if (!state.visited.has(nu) && queue.length < cfg.maxPages)
                queue.push(nu);
            });
        }
        done++;
        updateProgress();
      }
    }
    function updateProgress() {
      if (typeof progress === "function")
        progress(done, Math.max(seedLinks.length, 1));
    }

    await Promise.all(Array.from({ length: cfg.concurrency }).map(worker));
    state.built = true;
    state.building = false;
  }

  function search(q) {
    const terms = tokenize(q);
    if (!terms.length) return [];
    const res = [];
    for (const it of state.index) {
      let score = 0,
        firstPos = Infinity;
      for (const t of terms) {
        const posTitle = it.title.toLowerCase().indexOf(t);
        const posText = it.text.toLowerCase().indexOf(t);
        if (posTitle !== -1) score += 8 + t.length * 2;
        if (posText !== -1) score += 3 + t.length;
        if (posText !== -1) firstPos = Math.min(firstPos, posText);
      }
      if (score > 0)
        res.push({ item: it, score: score + (it.scoreHint || 0), firstPos });
    }
    res.sort((a, b) => b.score - a.score || a.firstPos - b.firstPos);
    return res.slice(0, 80);
  }

  function buildSnippet(text, terms, pos) {
    const start = Math.max(0, pos - 50);
    const end = Math.min(text.length, pos + 120);
    const slice = text.slice(start, end);
    return (
      (start > 0 ? "…" : "") +
      markMatch(slice, terms) +
      (end < text.length ? "…" : "")
    );
  }

  function open() {
    if (state.open) return;
    state.open = true;
    const wrap = $("#superSearch");
    if (!wrap) return;
    wrap.hidden = false;
    requestAnimationFrame(() => wrap.classList.add("show"));
    $("#ss-input")?.focus();
  }
  function close() {
    if (!state.open) return;
    state.open = false;
    const wrap = $("#superSearch");
    if (!wrap) return;
    wrap.classList.remove("show");
    setTimeout(() => {
      wrap.hidden = true;
    }, 150);
  }

  let __ssActiveIndex = -1;
  function render(results, q) {
    // --- Deduplicate "page" results by base URL (1 page = 1 item) ---
    (function () {
      try {
        const pageItemsRaw = Array.isArray(results)
          ? results.filter((r) => r && r.item && r.item.type === "page")
          : [];
        const nodeItems = Array.isArray(results)
          ? results.filter((r) => r && r.item && r.item.type === "node")
          : [];
        const bestByPage = new Map();
        for (const r of pageItemsRaw) {
          const url = String(r.item.url || "");
          const baseUrl = url.split("#")[0];
          if (!baseUrl) continue;
          const isBase = url.indexOf("#") === -1;
          const prev = bestByPage.get(baseUrl);

          function normTitle(x) {
            // If title looks like "Page Title — Section", keep original page title
            const t = String(x || "");
            const idx = t.indexOf(" — ");
            return idx > -1 ? t.slice(0, idx) : t;
          }

          // Decide winner:
          // 1) Prefer exact base-url entries over hash anchors
          // 2) Otherwise, take higher score
          if (!prev) {
            const copy = { ...r, item: { ...r.item } };
            copy.item.title = isBase ? r.item.title : normTitle(r.item.title);
            bestByPage.set(baseUrl, copy);
          } else {
            const prevIsBase = String(prev.item.url || "").indexOf("#") === -1;
            if (isBase && !prevIsBase) {
              const copy = { ...r, item: { ...r.item, title: r.item.title } };
              bestByPage.set(baseUrl, copy);
            } else if (!prevIsBase && !isBase) {
              if (
                (typeof r.score === "number" ? r.score : 0) >
                (typeof prev.score === "number" ? prev.score : 0)
              ) {
                const copy = {
                  ...r,
                  item: { ...r.item, title: normTitle(r.item.title) },
                };
                bestByPage.set(baseUrl, copy);
              }
            } else if (prevIsBase && isBase) {
              if (
                (typeof r.score === "number" ? r.score : 0) >
                (typeof prev.score === "number" ? prev.score : 0)
              ) {
                const copy = { ...r, item: { ...r.item, title: r.item.title } };
                bestByPage.set(baseUrl, copy);
              }
            }
          }
        }
        const dedupedPages = Array.from(bestByPage.values());
        results = [...nodeItems, ...dedupedPages];
      } catch (e) {
        console.warn("SuperSearch dedupe failed:", e);
      }
    })();
    const box = $("#ss-results");
    const count = $("#ss-count");
    box.innerHTML = "";
    let inserted = 0;
    const groups = [
      {
        label: "Trên trang này",
        items: results.filter((r) => r.item.type === "node").slice(0, 30),
      },
      {
        label: "Các trang khác",
        items: results.filter((r) => r.item.type === "page").slice(0, 50),
      },
    ];
    const terms = tokenize(q);
    groups.forEach((g) => {
      if (!g.items.length) return;
      const groupEl = document.createElement("div");
      groupEl.className = "ss__group";
      groupEl.textContent = g.label;
      box.appendChild(groupEl);
      g.items.forEach(({ item, firstPos }) => {
        const el = document.createElement("div");
        el.className = "ss__item";
        el.setAttribute("role", "option");
        el.dataset.url = item.url;
        const urlDisp = item.url.replace(location.origin, "");
        const snippet = buildSnippet(
          item.text,
          terms,
          isFinite(firstPos) ? firstPos : 0
        );
        el.innerHTML = `
          <div class="ss__title">${markMatch(item.title, terms)}</div>
          <div class="ss__url">${urlDisp}</div>
          <div class="ss__snippet">${snippet}</div>
        `;
        box.appendChild(el);
        inserted++;
      });
    });
    count.textContent = `${inserted} kết quả`;
  }

  function updateProgressUI(done, total) {
    const bar = $("#ss-bar");
    const prog = $("#ss-progress");
    const txt = $("#ss-progress-text");
    if (total <= 1) {
      prog.setAttribute("aria-hidden", "true");
      return;
    }
    prog.removeAttribute("aria-hidden");
    const pct = Math.round((done / total) * 100);
    bar.style.width = pct + "%";
    txt.textContent = `Đang quét ${done}/${total} trang…`;
  }

  function wireEvents() {
    const backdrop = $("#superSearch");
    const input = $("#ss-input");
    const results = $("#ss-results");
    const openBtn = document.getElementById("openSearchBtn");
    const closeBtn = $(".ss__close");

    openBtn?.addEventListener("click", async () => {
      open();
      if (!state.built) await buildIndex(updateProgressUI);
    });
    closeBtn?.addEventListener("click", close);
    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });

    document.addEventListener("keydown", async (e) => {
      const inInput = ["INPUT", "TEXTAREA"].includes(
        document.activeElement?.tagName
      );
      if (
        (e.key === "k" && (e.ctrlKey || e.metaKey)) ||
        (e.key === "/" && !inInput)
      ) {
        e.preventDefault();
        open();
        if (!state.built) await buildIndex(updateProgressUI);
        input?.focus();
      } else if (e.key === "Escape" && state.open) {
        close();
      }
    });

    // search as you type
    let t = null;
    input?.addEventListener("input", () => {
      clearTimeout(t);
      const q = input.value;
      t = setTimeout(() => {
        render(search(q), q);
      }, 90);
    });

    // keyboard nav (ENTER: luôn mở cùng tab)
    document.addEventListener("keydown", (e) => {
      if (!state.open) return;
      const items = Array.from(results.querySelectorAll(".ss__item"));
      if (!items.length) return;
      const cur = results.querySelector(".ss__item.is-active");
      let idx = Math.max(0, items.indexOf(cur));
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (cur) cur.classList.remove("is-active");
        idx = Math.min(items.length - 1, idx + 1);
        items[idx].classList.add("is-active");
        items[idx].scrollIntoView({ block: "nearest" });
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (cur) cur.classList.remove("is-active");
        idx = Math.max(0, idx - 1);
        items[idx].classList.add("is-active");
        items[idx].scrollIntoView({ block: "nearest" });
      }
      if (e.key === "Enter") {
        const target = items[idx];
        if (!target) return;
        const url = target.dataset.url;
        close();
        setTimeout(() => {
          location.href = url;
        }, 0); // mở trên tab hiện tại
      }
    });

    // mouse click (luôn mở cùng tab)
    results.addEventListener("click", (e) => {
      const item = e.target.closest(".ss__item");
      if (!item) return;
      const url = item.dataset.url;
      if (!url) return;
      close();
      setTimeout(() => {
        location.href = url;
      }, 0); // mở trên tab hiện tại
    });
  }

  window.initSuperSearch = function () {
    wireEvents();
  };
  // === Enhance results with green glow on hover & keyboard navigation ===
  try {
    const box = document.getElementById("ss-results");
    const resultsEls = Array.from(
      box.querySelectorAll("[role='option'], .ss__result, .ss__row, .ss__item")
    ).filter(Boolean);
    // Normalize: ensure a class for styling
    resultsEls.forEach((el) => {
      el.classList.add("ss__result");
    });
    function clearActive() {
      resultsEls.forEach((el) => {
        el.classList.remove("is-active");
        el.style.cssText = el.style.cssText.replace(
          /background:[^;]*;?\s*|box-shadow:[^;]*;?\s*/g,
          ""
        );
      });
    }
    function applyActive(idx) {
      if (!resultsEls.length) return;
      __ssActiveIndex = (idx + resultsEls.length) % resultsEls.length;
      const el = resultsEls[__ssActiveIndex];
      el.classList.add("is-active");
      // inline glow (xanh lá)
      el.style.background = "rgba(52,199,89,0.15)";
      el.style.boxShadow = "0 0 10px rgba(52,199,89,0.35)";
      // ensure visible
      el.scrollIntoView({ block: "nearest" });
    }
    // Mouse highlight
    resultsEls.forEach((el, i) => {
      el.addEventListener("mouseenter", () => {
        clearActive();
        __ssActiveIndex = i;
        applyActive(i);
      });
      el.addEventListener("mouseleave", () => {
        // keep highlight if using keyboard; otherwise, remove soft hover when leaving box entirely
        if (document.activeElement && document.activeElement.id === "ss-input")
          return;
        // no-op to keep last selection
      });
      // click selects
      el.addEventListener("click", () => {
        __ssActiveIndex = i;
      });
    });
    // Keyboard navigation
    const input = document.getElementById("ss-input");
    const onKey = (e) => {
      if (
        !document.getElementById("superSearch") ||
        document.getElementById("superSearch").hidden
      )
        return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (__ssActiveIndex < 0) clearActive();
        applyActive(__ssActiveIndex + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (__ssActiveIndex < 0) __ssActiveIndex = 0;
        applyActive(__ssActiveIndex - 1);
      } else if (e.key === "Enter" && __ssActiveIndex >= 0) {
        const chosen = resultsEls[__ssActiveIndex];
        const link = chosen && chosen.querySelector("a[href]");
        if (link) link.click();
      }
    };
    document.addEventListener("keydown", onKey, { passive: false });
  } catch (e) {
    console.warn("Search highlight enhancement error:", e);
  }
})();
/* ===== /Super Search VIP PRO ===== */

// ===== DOM Ready =====
document.addEventListener("DOMContentLoaded", () => {
  startClock?.();
  initSticky?.();
  initMobileMenu?.();
  initDesktopDropdowns?.();
  initSubmenusMobile?.();
  syncTopbarHeight?.();
  window.addEventListener("resize", syncTopbarHeight ?? (() => {}), {
    passive: true,
  });
  syncDualLogoSize?.();

  // Ẩn caret cho item không có submenu
  document.querySelectorAll(".menu__item").forEach((item) => {
    if (!item.classList.contains("has-submenu")) {
      const caret = item.querySelector(".caret");
      if (caret) caret.remove();
    }
  });

  // Modal + Search
  initHotlineModal();
  initSuperSearch();
});

document.addEventListener("DOMContentLoaded", () => {
  // ===== Current page highlighting (Home active + indicator snap) =====
  (function () {
    const menu = document.getElementById("primaryMenu");
    if (!menu) return;
    const indicator = menu.querySelector(".indicator");
    const links = menu.querySelectorAll(".menu-link");

    // Mark current link by URL (fallback if not already marked in HTML)
    const current = (
      location.pathname.split("/").pop() || "home.html"
    ).toLowerCase();
    let activeLink = null;
    links.forEach((a) => {
      const href = (a.getAttribute("href") || "")
        .split("#")[0]
        .split("?")[0]
        .toLowerCase();
      if (!href) return;
      if (a.hasAttribute("aria-current")) {
        activeLink = a;
      } else if (
        href === current ||
        (current === "" && /home\.html$/.test(href))
      ) {
        a.setAttribute("aria-current", "page");
        activeLink = a;
      }
    });
    // ĐOẠN MÃ MỚI ĐÃ SỬA LỖI
    const isContactPage = window.location.pathname.includes("contact.html");

    if (!activeLink && !isContactPage) {
      // if still not found (and not on contact page), prefer Home icon link
      activeLink =
        menu.querySelector('.menu-link--icon[href$="home.html"]') || links[0];
      if (activeLink) activeLink.setAttribute("aria-current", "page");
    }
    // also flag parent li
    if (activeLink)
      activeLink.closest(".menu__item")?.classList.add("is-current");

    // Position indicator under active on desktop
    function snapTo(link) {
      if (!indicator || !link) return;
      const desktop = window.matchMedia("(min-width:1025px)").matches;
      if (!desktop) {
        indicator.style.opacity = 0;
        return;
      }
      const menuRect = menu.getBoundingClientRect();
      const rect = link.getBoundingClientRect();
      const left = rect.left - menuRect.left + menu.scrollLeft;
      indicator.style.left = left - 4 + "px";
      indicator.style.width = rect.width + 8 + "px";
      indicator.style.opacity = 1;
    }
    snapTo(activeLink);
    window.addEventListener("resize", () => snapTo(activeLink), {
      passive: true,
    });
  })();
});
/* =============== PARALLAX BANNER ======================== */
function initParallaxBrand() {
  const el = document.querySelector(".brand[data-parallax]");
  if (!el) return;

  // tắt nếu user prefers-reduced-motion hoặc màn nhỏ
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => window.matchMedia("(max-width: 768px)").matches;
  if (reduce) return;

  let lastY = window.scrollY,
    ticking = false;

  function update(y) {
    // Giới hạn biên độ để không “trôi” quá đà
    const para = Math.max(-120, Math.min(y * 0.35, 180)); // nền
    const slow = Math.max(-60, Math.min(y * 0.18, 90)); // overlay
    // Trên mobile: giữ cố định để mượt mà
    if (isMobile()) {
      el.style.setProperty("--para", "0px");
      el.style.setProperty("--para-slow", "0px");
      return;
    }
    el.style.setProperty("--para", para + "px");
    el.style.setProperty("--para-slow", -slow + "px"); // trượt ngược chiều
  }

  function onScroll() {
    lastY = window.scrollY || 0;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        update(lastY);
        ticking = false;
      });
    }
  }

  // init lần đầu
  update(window.scrollY || 0);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => update(window.scrollY || 0), {
    passive: true,
  });
}

/* GỌI HÀM KHI TRANG SẴN SÀNG: nếu bạn đã có DOMContentLoaded thì thêm dòng dưới vào chung */
document.addEventListener("DOMContentLoaded", () => {
  // ... các init khác đã có (clock, menu, sticky, search, v.v.)
  initParallaxBrand();
  initContactForm();
});

/* =================== CONTACT CONFIG =================== */
const CONTACT_FORCE_GMAIL = true; // BẮT BUỘC GMAIL WEB (mở tab mới)
const CONTACT_FALLBACK_TO = "example@yourdomain.com"; // nếu form không có email hợp lệ

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}
function getToEmailFromForm(fd) {
  const candidates = [
    fd.get("gmail"),
    fd.get("to"),
    fd.get("receiverEmail"),
    fd.get("email"),
  ].map((v) => (v || "").toString().trim());
  for (const v of candidates) if (isValidEmail(v)) return v;
  return CONTACT_FALLBACK_TO;
}

// ===== Contact form submit: bắt buộc Gmail Web + mở TAB MỚI =====
function initContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const statusEl = document.getElementById("contactStatus");
  const submitBtn = form.querySelector(
    'button[type="submit"], [type="submit"]'
  );

  function setStatus(msg, ok) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = "contact-status " + (ok ? "ok" : "err");
    statusEl.style.display = "block";
  }

  // Reset form khi quay lại (BFCache/back-forward)
  function clearIfNeeded(navType) {
    if (
      sessionStorage.getItem("contact:clear") === "1" ||
      navType === "back_forward"
    ) {
      form.reset();
      if (statusEl) {
        statusEl.textContent = "";
        statusEl.style.display = "none";
        statusEl.classList.remove("ok", "err");
      }
      sessionStorage.removeItem("contact:clear");
    }
  }
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    clearIfNeeded(nav && nav.type);
  } catch {}
  window.addEventListener("pageshow", (e) => {
    clearIfNeeded(e.persisted ? "back_forward" : undefined);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const name = (fd.get("name") || "").toString().trim();
    const subjectInput = (fd.get("subject") || "").toString().trim(); // dùng y nguyên, KHÔNG thêm [Liên hệ]
    const message = (fd.get("message") || "").toString().trim();

    if (!name || !message) {
      setStatus("Vui lòng điền Họ tên và Nội dung.", false);
      return;
    }

    const to = getToEmailFromForm(fd);
    if (!isValidEmail(to)) {
      setStatus("Vui lòng nhập Gmail/Email nhận thư hợp lệ trong form.", false);
      return;
    }

    submitBtn && (submitBtn.disabled = true);

    // SUBJECT: lấy đúng từ input, không thêm tiền tố
    const subject = subjectInput;

    // BODY: bỏ 'Email người gửi' & 'Tiêu đề', làm nổi bật người gửi (Gmail body không hỗ trợ màu từ URL)
    const header = `━━━━━━━━━━━━━━━━━━━━━━━━
🙋 HỌ VÀ TÊN: ${name.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━`;

    const body = `${header}

${message}

—
Gửi từ trang Liên hệ`;

    // Khi BACK về sẽ xoá form
    sessionStorage.setItem("contact:clear", "1");

    // BẮT BUỘC mở Gmail Web ở TAB MỚI
    const gmailUrl =
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        to
      )}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    let win = window.open(gmailUrl, "_blank", "noopener,noreferrer");
    if (win && typeof win.focus === "function") {
      try {
        win.focus();
      } catch {}
      try {
        win.opener = null;
      } catch {}
    } else {
      // Popup bị chặn → KHÔNG điều hướng trong tab hiện tại
      setStatus("Gmail đã gửi đi!", false);
    }

    // Reset form ngay trên trang hiện tại
    setTimeout(() => form.reset(), 0);

    setTimeout(() => {
      submitBtn && (submitBtn.disabled = false);
    }, 1200);
  });
}

/* Vô hiệu hóa liên kết dẫn tới chính trang hiện tại (không để click reload lại trang) */
function disableCurrentPageNavLinks() {
  try {
    var here = location.pathname.replace(/\/index\.html?$/, "/");
    document.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      // match tương đối hoặc tuyệt đối tới cùng trang
      var abs = a.href.replace(/\/index\.html?$/, "/");
      var isSelf =
        href === "#" ||
        abs === location.href.replace(/\/index\.html?$/, "/") ||
        href.replace(/\/index\.html?$/, "/") === here ||
        (/(^|\/)contact\.html$/.test(href) &&
          /(^|\/)contact\.html$/.test(location.pathname));
      if (isSelf) {
        a.classList.add("link-disabled");
        a.setAttribute("aria-disabled", "true");
        a.setAttribute("tabindex", "-1");
        a.addEventListener(
          "click",
          function (e) {
            e.preventDefault();
          },
          { passive: true }
        );
      }
    });
  } catch (e) {}
}
