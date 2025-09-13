/* Pro Image Slider — Final */
class ProSlider {
  constructor(root, { autoplay = false, interval = 3500 } = {}) {
    this.root = root;
    this.viewport = root.querySelector(".slider__viewport");
    this.slides = Array.from(root.querySelectorAll(".slide"));
    this.prevBtn = root.querySelector('[data-action="prev"]');
    this.nextBtn = root.querySelector('[data-action="next"]');
    this.toggleAutoBtn = root.querySelector('[data-action="toggle-autoplay"]');
    this.toggleFitBtn = root.querySelector('[data-action="toggle-fit"]');
    this.toggleFSBtn = root.querySelector('[data-action="toggle-fullscreen"]');
    this.dotsWrap = root.querySelector(".dots");
    this.thumbsWrap = root.querySelector(".thumbs");

    this.index = 0;
    this.timer = null;
    this.autoplay = autoplay;
    this.interval = interval;
    this.fit = root.dataset.fit || "contain";
    this.touchStartX = null;
    this.touchDeltaX = 0;

    this._buildDots();
    this._buildThumbs();
    this._bind();
    this._activate(0);
    this._updateFitUI();
    if (this.autoplay) this.play();

    // Lazy load boost: preload next/prev
    this._preloadNeighbors();
  }

  _bind() {
    this.prevBtn.addEventListener("click", () => this.prev());
    this.nextBtn.addEventListener("click", () => this.next());
    this.toggleAutoBtn.addEventListener("click", () => this.toggleAutoplay());
    this.toggleFitBtn.addEventListener("click", () => this.toggleFit());
    this.toggleFSBtn.addEventListener("click", () => this.toggleFullscreen());

    // Click image to open lightbox, double-click để đổi Fit/Fill
    this.slides.forEach((slide, i) => {
      slide.addEventListener("click", (e) => {
        if (e.target.tagName.toLowerCase() === "img") openLightbox(i, this);
      });
      slide.addEventListener("dblclick", () => this.toggleFit());
    });

    // Keyboard
    this.root.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); this.prev(); break;
        case "ArrowRight": e.preventDefault(); this.next(); break;
        case " ": e.preventDefault(); this.toggleAutoplay(); break;
        case "Home": e.preventDefault(); this.goTo(0); break;
        case "End": e.preventDefault(); this.goTo(this.slides.length - 1); break;
      }
    });
    this.root.tabIndex = 0; // focusable

    // Pause autoplay on hover/focus
    this.root.addEventListener("mouseenter", () => this.pause());
    this.root.addEventListener("mouseleave", () => this.autoplay && this.play());
    this.root.addEventListener("focusin", () => this.pause());
    this.root.addEventListener("focusout", () => this.autoplay && this.play());

    // Touch swipe
    this.viewport.addEventListener("touchstart", (e) => {
      this.touchStartX = e.touches[0].clientX;
      this.touchDeltaX = 0;
      this.pause();
    }, { passive: true });

    this.viewport.addEventListener("touchmove", (e) => {
      this.touchDeltaX = e.touches[0].clientX - this.touchStartX;
    }, { passive: true });

    this.viewport.addEventListener("touchend", () => {
      if (Math.abs(this.touchDeltaX) > 40) {
        if (this.touchDeltaX > 0) this.prev(); else this.next();
      }
      this.touchStartX = null; this.touchDeltaX = 0;
      if (this.autoplay) this.play();
    });

    // Reflect fullscreen state
    document.addEventListener("fullscreenchange", () => {
      const active = !!document.fullscreenElement;
      this.toggleFSBtn.setAttribute("aria-pressed", String(active));
    });
  }

  _buildDots() {
    this.dotsWrap.innerHTML = "";
    this.dots = this.slides.map((_, i) => {
      const b = document.createElement("button");
      b.className = "dot";
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", "false");
      b.setAttribute("aria-label", `Ảnh số ${i + 1}`);
      b.addEventListener("click", () => this.goTo(i));
      this.dotsWrap.appendChild(b);
      return b;
    });
  }

  _buildThumbs() {
    this.thumbsWrap.innerHTML = "";
    this.thumbs = this.slides.map((slide, i) => {
      const src = slide.querySelector("img").src;
      const cap = slide.querySelector("figcaption")?.textContent ?? `Ảnh ${i+1}`;
      const item = document.createElement("button");
      item.className = "thumb";
      item.type = "button";
      item.setAttribute("aria-label", `Mở ${cap}`);
      item.innerHTML = `<img src="${src}" alt="" loading="lazy">`;
      item.addEventListener("click", () => this.goTo(i));
      this.thumbsWrap.appendChild(item);
      return item;
    });
  }

  _activate(i) {
    this.slides.forEach(s => s.classList.remove("is-active"));
    this.slides[i].classList.add("is-active");
    this.dots?.forEach((d, k) => d.setAttribute("aria-selected", String(k === i)));
    this.thumbs?.forEach((t, k) => t.classList.toggle("is-active", k === i));
    this.index = i;
    this._preloadNeighbors();
  }

  _preloadNeighbors() {
    const neighbors = [this.index, (this.index+1)%this.slides.length, (this.index-1+this.slides.length)%this.slides.length];
    neighbors.forEach(idx => {
      const img = this.slides[idx].querySelector("img");
      if (img.dataset && img.dataset.src && !img.src) {
        img.src = img.dataset.src;
      }
    });
  }

  goTo(i) {
    const n = this.slides.length;
    const idx = ((i % n) + n) % n;
    this._activate(idx);
  }
  next(){ this.goTo(this.index + 1); }
  prev(){ this.goTo(this.index - 1); }

  play() {
    this.autoplay = true;
    this.toggleAutoBtn.setAttribute("aria-pressed", "true");
    clearInterval(this.timer);
    this.timer = setInterval(() => this.next(), this.interval);
  }
  pause() {
    this.autoplay = false;
    this.toggleAutoBtn.setAttribute("aria-pressed", "false");
    clearInterval(this.timer);
  }
  toggleAutoplay(){ this.autoplay ? this.pause() : this.play(); }

  toggleFit(){
    this.fit = this.fit === "contain" ? "cover" : "contain";
    this._updateFitUI();
  }
  _updateFitUI(){
    this.root.dataset.fit = this.fit;
    if (this.toggleFitBtn){
      const isFit = this.fit === "contain";
      this.toggleFitBtn.setAttribute("aria-pressed", String(isFit));
      this.toggleFitBtn.textContent = isFit ? "Fit" : "Fill";
      this.toggleFitBtn.setAttribute("aria-label", isFit ? "Chế độ hiển thị ảnh: Vừa khung (Fit). Bấm để chuyển sang Fill" : "Chế độ hiển thị ảnh: Phủ kín (Fill). Bấm để chuyển sang Fit");
    }
  }

  async toggleFullscreen() {
    try{
      if (!document.fullscreenElement) {
        await this.root.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    }catch(e){ /* bỏ qua */ }
  }
}

/* ---------- Lightbox logic ---------- */
const lb = {
  el: null, img: null, cap: null, slider: null, fit: "contain",
  open(index, slider) {
    this.el = document.getElementById("lightbox");
    this.img = document.getElementById("lightbox-img");
    this.cap = document.getElementById("lightbox-cap");
    this.slider = slider;
    this.fit = "contain";
    this._render(index);
    this._applyFit();
    this.el.hidden = false;
    this.el.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    this._bind();
  },
  close() {
    if (!this.el) return;
    this.el.hidden = true;
    this.el.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    this._unbind();
  },
  _render(index) {
    const slide = this.slider.slides[index];
    const img = slide.querySelector("img");
    const cap = slide.querySelector("figcaption")?.textContent ?? "";
    this.img.src = img.src;
    this.img.alt = img.alt || cap;
    this.cap.textContent = cap;
  },
  prev(){ this.slider.prev(); this._render(this.slider.index); },
  next(){ this.slider.next(); this._render(this.slider.index); },
  _applyFit(){
    if (this.img){
      this.img.style.objectFit = this.fit;
      this.img.style.background = "#0e141b";
    }
    const btn = this.el?.querySelector('[data-lb="toggle-fit"]');
    if (btn){
      btn.textContent = this.fit === "contain" ? "Fit" : "Fill";
      btn.setAttribute("aria-label", this.fit === "contain" ? "Đang vừa khung (Fit). Bấm để Fill" : "Đang phủ kín (Fill). Bấm để Fit");
    }
  },
  async toggleFullscreen() {
    try{
      if (!document.fullscreenElement) await this.el.requestFullscreen?.();
      else await document.exitFullscreen?.();
    }catch(e){ /* bỏ qua */ }
  },
  _keydown(e){
    switch(e.key){
      case "Escape": lb.close(); break;
      case "ArrowLeft": lb.prev(); break;
      case "ArrowRight": lb.next(); break;
    }
  },
  _bind(){
    this._onClick = (e)=>{
      const t = e.target;
      if (t.matches('[data-lb="close"]')) this.close();
      if (t.matches('[data-lb="prev"]')) this.prev();
      if (t.matches('[data-lb="next"]')) this.next();
      if (t.matches('[data-lb="toggle-fullscreen"]')) this.toggleFullscreen();
      if (t.matches('[data-lb="toggle-fit"]')) { this.fit = this.fit === "contain" ? "cover" : "contain"; this._applyFit(); }
      // Click ảnh để đóng
      if (t.id === "lightbox-img") this.close();
    };
    this.el.addEventListener("click", this._onClick);
    this._onKey = this._keydown.bind(this);
    window.addEventListener("keydown", this._onKey);
  },
  _unbind(){
    this.el.removeEventListener("click", this._onClick);
    window.removeEventListener("keydown", this._onKey);
  }
};
function openLightbox(index, slider){ lb.open(index, slider); }

/* ---------- Init ---------- */
window.addEventListener("DOMContentLoaded", () => {
  const sliderRoot = document.getElementById("slider");
  // Bật autoplay mặc định: { autoplay: true }
  const slider = new ProSlider(sliderRoot, { autoplay: false, interval: 3500 });
});
