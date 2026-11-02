/* CHART · Back to the blue. Vanilla JS, no dependencies. */
(() => {
  const root = document.documentElement;
  root.classList.add('js');
  if (/[?&]shot\b/.test(location.search)) root.classList.add('shot');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const small = () => innerWidth < 760;

  /* ---------------- AI image switch ----------------
     Slots listed in assets/ai-ready.js (window.CHART_AI_READY) swap their fallback photo for the
     generated file named in data-ai. Nothing is requested until a slot is listed, so a missing
     file never causes a failed request. */
  const aiReady = Array.isArray(window.CHART_AI_READY) ? window.CHART_AI_READY : [];
  const aiOn = path => !!path && (aiReady.includes('*') || aiReady.includes(path.split('/').pop().replace(/\.[a-z]+$/i, '')));
  $$('img[data-ai]').forEach(img => {
    if (!aiOn(img.dataset.ai)) return;
    const pic = img.closest('picture');
    if (pic) $$('source', pic).forEach(s => s.remove());
    img.removeAttribute('srcset'); img.removeAttribute('sizes');
    img.src = img.dataset.ai;
  });

  /* ---------------- menu (keyboard friendly) ---------------- */
  const menuBtn = $('[data-menu]');
  const nav = $('[data-nav]');
  if (menuBtn && nav) {
    const setMenu = open => {
      nav.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      $('.menu-label', menuBtn).textContent = open ? 'Close' : 'Menu';
      root.classList.toggle('menu-open', open);
      if (open) { const first = $('a', nav); first && first.focus(); }
    };
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
    });
    // keep Tab inside the open menu: links, then back to the button
    nav.addEventListener('keydown', e => {
      if (e.key !== 'Tab' || !nav.classList.contains('open')) return;
      const links = $$('a', nav), last = links[links.length - 1];
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); menuBtn.focus(); }
      if (e.shiftKey && document.activeElement === links[0]) { e.preventDefault(); menuBtn.focus(); }
    });
    menuBtn.addEventListener('keydown', e => {
      if (e.key !== 'Tab' || !nav.classList.contains('open')) return;
      const links = $$('a', nav);
      e.preventDefault(); (e.shiftKey ? links[links.length - 1] : links[0]).focus();
    });
    matchMedia('(min-width: 1021px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
  }

  /* ---------------- parallax ---------------- */
  // One rAF loop moves every layer. "top" hosts (the heroes) measure from the top of the page;
  // the others measure from the middle of the screen, so layers sit at rest when centred.
  const hosts = $$('[data-parallax]').map(el => ({
    el,
    top: el.dataset.parallax === 'top',
    fade: $('[data-fade]', el),
    layers: $$('[data-speed]', el).map(l => ({ l, s: parseFloat(l.dataset.speed) || 0 }))
  }));

  function parallax(vh) {
    if (reduce) return;
    const k = small() ? 0.6 : 1;
    for (const h of hosts) {
      const r = h.el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      const off = h.top ? Math.max(0, -r.top) : (vh / 2 - (r.top + r.height / 2));
      const lim = h.top ? 700 : 240;
      for (const { l, s } of h.layers) {
        const y = clamp(off * s * k, -lim, lim);
        l.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      }
      if (h.fade) h.fade.style.opacity = clamp(1 - off / (vh * 0.75), 0, 1).toFixed(3);
    }
  }

  /* ---------------- photo backdrop ----------------
     One full-bleed frame per depth zone. A frame is built (and its image requested) only when
     the dive gets within one zone of it, then the frames crossfade as the depth changes. */
  const frames = $$('[data-bd]').reduce((o, el) => (o[el.dataset.bd] = el, o), {});
  const zoneFrame = ['surface', 'shallows', 'reef', 'openblue', 'midwater', 'deep', 'deep', 'floor'];
  function build(key) {
    const el = frames[key];
    if (!el || el.firstElementChild) return;
    const base = `assets/photo/bd-${key}`;
    const pic = document.createElement('picture');
    const img = document.createElement('img');
    img.width = 1600; img.height = 1000; img.alt = el.dataset.alt || ''; img.decoding = 'async';
    if (aiOn(el.dataset.ai)) {
      img.src = el.dataset.ai;
      pic.append(img);
    } else {
      const src = document.createElement('source');
      src.media = '(orientation: portrait)'; src.srcset = `${base}-port.webp`; src.width = 1080; src.height = 1920;
      img.src = `${base}-1600.webp`; img.srcset = `${base}-1600.webp 1600w, ${base}-2400.webp 2400w`; img.sizes = '100vw';
      pic.append(src, img);
    }
    el.append(pic);
  }
  let shown = -1;
  function backdrop(i) {
    if (i === shown) return;
    shown = i;
    [i - 1, i, i + 1, i + 2].forEach(k => zoneFrame[k] && build(zoneFrame[k]));
    const key = zoneFrame[i];
    Object.entries(frames).forEach(([k, el]) => el.classList.toggle('on', k === key));
  }

  /* ---------------- depth gauge ---------------- */
  // the partners marker sits in the deep, so it lights the "The deep" link
  const zones = [
    ['top', 0], ['who', 5], ['journey', 18], ['help', 40], ['wildlife', 120], ['give', 400], ['partners', 520, 'give', '#partners .rig-frame'], ['floor', 600]
  ].map(([id, m, linkId, anchor]) => ({ id, m, mid: !!anchor, el: anchor ? $(anchor) : document.getElementById(id), link: $(`[data-zone="${linkId || id}"]`) }));
  const depthNums = $$('[data-depth-num]');
  const gaugeDot = $('[data-gauge-dot]');
  const track = $('.gauge-track');

  const hasGauge = !!$('[data-gauge]');
  function gauge(vh) {
    if (!hasGauge) return;
    const y = scrollY + vh * 0.4;
    // a mid-anchored zone reads its exact depth when that element sits centred on screen
    const tops = zones.map(z => { if (!z.el) return 0; const r = z.el.getBoundingClientRect(); return r.top + scrollY + (z.mid ? r.height / 2 - vh * 0.1 : 0); });
    let i = 0;
    while (i < zones.length - 1 && y >= tops[i + 1]) i++;
    const next = zones[Math.min(i + 1, zones.length - 1)];
    const span = (tops[i + 1] || tops[i] + 1) - tops[i];
    const f = i === zones.length - 1 ? 0 : clamp((y - tops[i]) / span, 0, 1);
    const depth = zones[i].m + (next.m - zones[i].m) * f;
    const d = String(Math.round(depth));
    depthNums.forEach(n => { if (n.textContent !== d) n.textContent = d; });
    zones.forEach(z => z.link && z.link.classList.toggle('on', z.link === zones[i].link));
    backdrop(i);
    if (gaugeDot && track) {
      const p = scrollY / Math.max(1, root.scrollHeight - vh);
      gaugeDot.style.setProperty('--p', (p * (track.clientHeight - 10)).toFixed(1) + 'px');
    }
  }

  /* ---------------- the current (how we help) ---------------- */
  const current = $('[data-current]');
  const buoys = $$('.buoy');
  const buoyList = $('.buoys');
  function currentDraw(vh) {
    if (!current) return;
    const r = current.getBoundingClientRect();
    const p = reduce ? 1 : clamp((vh * 0.85 - r.top) / (r.height * 0.85), 0, 1);
    current.style.setProperty('--draw', (1 - p).toFixed(3));
    buoyList.style.setProperty('--fill', (p * 100).toFixed(1) + '%');
    buoys.forEach((b, i) => b.classList.toggle('lit', p > [0.08, 0.45, 0.82][i]));
  }

  /* ---------------- journey: rescue, rehab, release ---------------- */
  const journey = $('[data-journey]');
  let journeyScroll = () => {};
  if (journey) {
    const path = $('#js-path');
    const turtle = $('[data-js-turtle]');
    const line = $('.js-line', journey);
    const heart = $('.js-heart', journey);
    const ripple = $('.js-ripple', journey);
    const bubbles = $('.js-bubbles', journey);
    const range = $('[data-js-range]');
    const stages = $$('[data-stage]', journey);
    const scene = $('.journey-scene', journey);
    const photos = $$('.js-photo', journey);
    const L = path.getTotalLength();
    const findLen = x => { let lo = 0, hi = L; for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (path.getPointAtLength(mid).x < x) lo = mid; else hi = mid; } return lo; };
    const lPool = findLen(376), lEnd = findLen(900);
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const toLen = u => {
      if (u < 0.12) return 0;
      if (u < 0.42) return ease((u - 0.12) / 0.30) * lPool;
      if (u < 0.58) return lPool;
      return lPool + ease((u - 0.58) / 0.42) * (lEnd - lPool);
    };
    let u = 0, manual = false, tween = null;

    function render() {
      const len = toLen(u);
      const p = path.getPointAtLength(len);
      const q = path.getPointAtLength(Math.min(L, len + 2));
      let ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
      if (u >= 0.42 && u < 0.58) ang = Math.sin(u * 60) * 4;
      const sc = (u > 0.8 ? 1 - (u - 0.8) * 1.2 : 1) * (small() ? 1.7 : 1);
      turtle.setAttribute('transform', `translate(${p.x.toFixed(1)} ${(p.y - 4).toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${sc.toFixed(3)})`);
      line.style.opacity = clamp(1 - (u - 0.08) / 0.12, 0, 1);
      const stage = u < 0.34 ? 0 : u < 0.67 ? 1 : 2;
      heart.style.opacity = stage === 1 ? 1 : 0;
      ripple.style.opacity = stage === 1 ? 1 : 0.3;
      bubbles.style.opacity = u > 0.66 ? 1 : 0;
      bubbles.setAttribute('transform', `translate(${(p.x - 46 * sc).toFixed(1)} ${(p.y - 24).toFixed(1)})`);
      stages.forEach((s, i) => s.classList.toggle('on', i === stage));
      photos.forEach((ph, i) => ph.classList.toggle('on', i === stage));
      range.value = Math.round(u * 1000);
      range.setAttribute('aria-valuetext', ['Rescue', 'Rehab', 'Release'][stage]);
    }
    function setU(v) { u = clamp(v, 0, 1); render(); }
    function animateTo(target) {
      cancelAnimationFrame(tween);
      if (reduce) return setU(target);
      const from = u, t0 = performance.now(), dur = 1100;
      const step = now => { const k = clamp((now - t0) / dur, 0, 1); setU(from + (target - from) * ease(k)); if (k < 1) tween = requestAnimationFrame(step); };
      tween = requestAnimationFrame(step);
    }
    range.addEventListener('input', () => { manual = true; cancelAnimationFrame(tween); setU(range.value / 1000); });
    $$('[data-goto]', journey).forEach(b => b.addEventListener('click', () => { manual = true; animateTo([0.04, 0.5, 0.97][+b.dataset.goto]); }));
    let dragging = false;
    const fromPointer = e => { const r = scene.getBoundingClientRect(); setU((e.clientX - r.left - r.width * 0.1) / (r.width * 0.8)); };
    scene.addEventListener('pointerdown', e => { dragging = true; manual = true; cancelAnimationFrame(tween); scene.setPointerCapture(e.pointerId); fromPointer(e); });
    scene.addEventListener('pointermove', e => { if (dragging) fromPointer(e); });
    scene.addEventListener('pointerup', () => { dragging = false; });
    scene.addEventListener('pointercancel', () => { dragging = false; });
    journeyScroll = vh => {
      if (manual) return;
      const r = journey.getBoundingClientRect();
      setU(clamp((vh * 0.7 - r.top) / (r.height * 0.75), 0, 1));
    };
    render();
  }

  /* ---------------- frame loop on scroll ---------------- */
  let ticking = false;
  function frame() {
    ticking = false;
    const vh = innerHeight;
    parallax(vh); gauge(vh); currentDraw(vh); journeyScroll(vh);
  }
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request, { passive: true });
  frame();

  /* ---------------- hero ripples ---------------- */
  const ripples = $('[data-ripples]');
  if (ripples) {
    ripples.addEventListener('pointerdown', e => {
      const r = ripples.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (y < r.height * 0.42) return;
      for (const cls of ['ripple', 'ripple r2']) {
        const s = document.createElement('span');
        s.className = cls; s.style.left = x + 'px'; s.style.top = y + 'px';
        ripples.appendChild(s);
        setTimeout(() => s.remove(), 2000);
      }
    });
  }

  /* ---------------- rising bubbles ---------------- */
  if (!reduce) {
    $$('.shallows, .reef').forEach(sec => {
      const box = document.createElement('div');
      box.className = 'bubbles'; box.setAttribute('aria-hidden', 'true');
      const n = small() ? 7 : 14;
      for (let i = 0; i < n; i++) {
        const b = document.createElement('i');
        const size = 4 + Math.random() * 12;
        b.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;width:${size}px;height:${size}px;animation-duration:${(9 + Math.random() * 12).toFixed(1)}s;animation-delay:-${(Math.random() * 20).toFixed(1)}s;--dx:${(Math.random() * 60 - 30).toFixed(0)}px`;
        box.appendChild(b);
      }
      sec.prepend(box);
    });
  }

  /* ---------------- message in a bottle ---------------- */
  const bottle = $('[data-bottle]');
  if (bottle) {
    const btn = $('[data-bottle-btn]', bottle);
    const note = $('[data-note]', bottle);
    const label = $('.bottle-label', bottle);
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'note-close'; close.setAttribute('aria-label', 'Put the note back'); close.textContent = '×';
    note.appendChild(close);
    let touched = false;
    const set = open => {
      bottle.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Close the bottle' : 'Open the bottle';
    };
    btn.addEventListener('click', () => { touched = true; set(!bottle.classList.contains('open')); if (bottle.classList.contains('open')) close.focus(); });
    close.addEventListener('click', () => { touched = true; set(false); btn.focus(); });
    new IntersectionObserver((es, io) => {
      if (es[0].isIntersecting) { io.disconnect(); setTimeout(() => { if (!touched) set(true); }, 1400); }
    }, { threshold: 0.6 }).observe(bottle);
  }

  /* ---------------- sonar ---------------- */
  const sonar = $('[data-sonar]');
  if (sonar) {
    const field = $('.sonar-field', sonar);
    const rings = $('[data-sonar-rings]', sonar);
    const critters = $$('.critter', sonar);
    const live = $('[data-sonar-live]', sonar);
    const timers = [];
    function ping() {
      timers.forEach(clearTimeout); timers.length = 0;
      const fr = field.getBoundingClientRect();
      const cx = fr.width / 2, cy = fr.height / 2;
      const ds = critters.map(c => { const r = c.getBoundingClientRect(); return Math.hypot(r.left - fr.left + r.width / 2 - cx, r.top - fr.top + r.height / 2 - cy); });
      const max = Math.max(...ds) + 60;
      const ring = document.createElement('i');
      ring.className = 'ring'; ring.style.setProperty('--to', (max / 10).toFixed(1));
      rings.appendChild(ring); setTimeout(() => ring.remove(), 2600);
      critters.forEach((c, i) => {
        c.classList.remove('lit');
        timers.push(setTimeout(() => c.classList.add('lit'), reduce ? 0 : (ds[i] / max) * 2400));
      });
      live.textContent = 'Sonar found: ' + critters.map(c => c.textContent.trim().toLowerCase()).join(', ') + '.';
    }
    $('[data-ping]', sonar).addEventListener('click', ping);
    new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { io.disconnect(); setTimeout(ping, 500); } }, { threshold: 0.35 }).observe(field);
  }

  /* ---------------- plankton in the deep ---------------- */
  const cvs = $('[data-plankton]');
  if (cvs) {
    const sec = cvs.parentElement;
    const ctx = cvs.getContext('2d');
    const dpr = Math.min(2, devicePixelRatio || 1);
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const sg = sprite.getContext('2d');
    const grd = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(210,255,248,1)'); grd.addColorStop(.25, 'rgba(125,239,226,.6)'); grd.addColorStop(1, 'rgba(125,239,226,0)');
    sg.fillStyle = grd; sg.fillRect(0, 0, 64, 64);
    let W = 0, H = 0, motes = [], trail = [], running = false, visible = false;
    function size() {
      W = sec.clientWidth; H = sec.clientHeight;
      cvs.width = W * dpr; cvs.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(W * H / (small() ? 9000 : 12000));
      motes = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 3 + Math.random() * 9, v: .1 + Math.random() * .3, ph: Math.random() * 6.28 }));
    }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const m of motes) {
        if (!reduce) { m.y -= m.v; m.x += Math.sin(t / 2000 + m.ph) * .15; if (m.y < -20) { m.y = H + 20; m.x = Math.random() * W; } }
        ctx.globalAlpha = .25 + .25 * Math.sin(t / 900 + m.ph);
        ctx.drawImage(sprite, m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
      }
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i];
        p.life -= 0.012; p.x += p.vx; p.y += p.vy;
        if (p.life <= 0) { trail.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        const r = p.r * (0.6 + p.life * 0.6);
        ctx.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    function loop(t) { draw(t); if (visible && !reduce) requestAnimationFrame(loop); else running = false; }
    function start() { if (!running && !reduce) { running = true; requestAnimationFrame(loop); } }
    sec.addEventListener('pointermove', e => {
      const r = sec.getBoundingClientRect();
      for (let k = 0; k < 2; k++) trail.push({ x: e.clientX - r.left + (Math.random() * 10 - 5), y: e.clientY - r.top + (Math.random() * 10 - 5), vx: Math.random() * .6 - .3, vy: -Math.random() * .5, r: 8 + Math.random() * 14, life: 1 });
      if (trail.length > 260) trail.splice(0, trail.length - 260);
      if (reduce) draw(performance.now());
    }, { passive: true });
    new ResizeObserver(() => { size(); draw(performance.now()); }).observe(sec);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); }).observe(sec);
  }

  /* ---------------- partners: plankton gather round the depth marker ----------------
     Scattered sparks drift in the dark until the marker comes into view, then swarm in and
     hug its frame; their light brings up the acrylic face (--lit). Stirring the water
     (pointer, tap, or focusing the link) makes them flash, like real bioluminescence. */
  const swarmCvs = $('[data-swarm]');
  if (swarmCvs) {
    const sec = swarmCvs.parentElement;
    const rig = $('[data-rig]', sec);
    const frameEl = $('.rig-frame', sec);
    const link = $('.partner', sec);
    const ctx = swarmCvs.getContext('2d');
    const dpr = Math.min(2, devicePixelRatio || 1);
    const COLS = ['125,239,226', '96,186,255', '196,255,230', '150,160,255'];
    const sprites = COLS.map(c => {
      const s = document.createElement('canvas'); s.width = s.height = 48;
      const g = s.getContext('2d'), gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
      gr.addColorStop(0, `rgba(${c},.95)`); gr.addColorStop(.28, `rgba(${c},.38)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, 48, 48); return s;
    });
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const ease = t => 1 - Math.pow(1 - t, 3);
    let W = 0, H = 0, F = { x: 0, y: 0, w: 0, h: 0, cx: 0, cy: 0 }, parts = [];
    let t0 = null, lit = reduce ? 1 : 0, visible = false, running = false, last = 0;
    const ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, on: false };
    const setLit = v => sec.style.setProperty('--lit', v.toFixed(3));
    setLit(lit);

    function home(p) {
      if (p.kind === 0) { // halo hugging the frame (a superellipse just outside it)
        const a = p.a, off = p.off * Math.min(1, W / 900);
        const c = Math.cos(a), s = Math.sin(a);
        p.hx = F.cx + Math.sign(c) * Math.pow(Math.abs(c), .45) * (F.w / 2 + 6 + off);
        p.hy = F.cy + Math.sign(s) * Math.pow(Math.abs(s), .45) * (F.h / 2 + 6 + p.off * .8);
      } else { // strung along the mooring line above and below
        p.hx = F.cx + p.off * .12;
        p.hy = p.a < Math.PI ? F.y - 8 - (p.a / Math.PI) * 62 : F.y + F.h + 8 + ((p.a - Math.PI) / Math.PI) * 58;
      }
    }
    function size() {
      W = sec.clientWidth; H = sec.clientHeight;
      swarmCvs.width = W * dpr; swarmCvs.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sr = sec.getBoundingClientRect(), fr = frameEl.getBoundingClientRect();
      F = { x: fr.left - sr.left, y: fr.top - sr.top, w: fr.width, h: fr.height };
      F.cx = F.x + F.w / 2; F.cy = F.y + F.h / 2;
      const n = small() ? 150 : 260;
      if (parts.length !== n) {
        parts = Array.from({ length: n }, (_, i) => {
          const free = i % 6 === 0; // a few stay loose and drift in the dark
          const p = {
            free, kind: Math.random() < .86 ? 0 : 1,
            a: Math.random() * Math.PI * 2, off: Math.min(78, Math.abs(gauss()) * 95 + Math.random() * 10),
            r: .7 + Math.random() * 1.5, c: (Math.random() * COLS.length) | 0,
            ph: Math.random() * 6.28, w: .0006 + Math.random() * .0012, wa: 3 + Math.random() * 9,
            v: .12 + Math.random() * .3, ex: 0, vx: 0, vy: 0,
            sx: Math.random() * W, sy: Math.random() * H
          };
          p.x = p.sx; p.y = p.sy;
          return p;
        });
      }
      for (const p of parts) {
        home(p);
        if (p.sx > W) p.sx = Math.random() * W;
        p.delay = .05 + Math.min(1, Math.hypot(p.sx - p.hx, p.sy - p.hy) / Math.max(W, H)) * .9 + Math.random() * .35;
        if (reduce || (t0 !== null && !running)) { p.x = p.free ? p.sx : p.hx; p.y = p.free ? p.sy : p.hy; }
      }
    }

    function burst(x, y, R, kick) {
      if (reduce) return;
      for (const p of parts) {
        const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
        if (d > R) continue;
        const f = 1 - d / R;
        p.vx += dx / d * f * kick - dy / d * f * kick * .5;
        p.vy += dy / d * f * kick + dx / d * f * kick * .5;
        p.ex = Math.max(p.ex, .4 + f * .6);
      }
      start();
    }

    function step(t) {
      const dt = Math.min(2.5, last ? (t - last) / 16.67 : 1); last = t;
      const g = t0 === null ? -1 : (t - t0) / 1000;
      if (t0 !== null && lit < 1) { lit = ease(Math.min(1, Math.max(0, (g - .55) / 1.7))); setLit(lit); }
      const R = small() ? 90 : 130;
      for (const p of parts) {
        const gathered = !p.free && g > p.delay;
        let tx, ty, k;
        p.sy -= p.v * dt; p.sx += Math.sin(t / 2400 + p.ph) * .18 * dt;
        if (p.sy < -12) { p.sy = H + 12; p.sx = Math.random() * W; if (!gathered) { p.x = p.sx; p.y = p.sy; p.vx = p.vy = 0; } }
        if (gathered) {
          tx = p.hx + Math.cos(t * p.w + p.ph) * p.wa; ty = p.hy + Math.sin(t * p.w * 1.3 + p.ph) * p.wa; k = .0035;
        } else { tx = p.sx; ty = p.sy; k = .03; }
        let ax = (tx - p.x) * k, ay = (ty - p.y) * k;
        if (gathered) { // spiral in rather than fly straight
          const sw = Math.max(0, 1 - (g - p.delay) / 2.6) * .006;
          ax -= (ty - p.y) * sw; ay += (tx - p.x) * sw;
        }
        if (ptr.on) {
          const dx = p.x - ptr.x, dy = p.y - ptr.y, d2 = dx * dx + dy * dy;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1, f = 1 - d / R;
            ax += (dx / d * 1.1 - dy / d * .7) * f + ptr.vx * f * .05;
            ay += (dy / d * 1.1 + dx / d * .7) * f + ptr.vy * f * .05;
            p.ex = Math.max(p.ex, f);
          }
        }
        p.vx = (p.vx + ax * dt) * Math.pow(.9, dt); p.vy = (p.vy + ay * dt) * Math.pow(.9, dt);
        const sp = Math.hypot(p.vx, p.vy), cap = p.ex > .3 ? 16 : 7; // drift, never dart
        if (sp > cap) { p.vx *= cap / sp; p.vy *= cap / sp; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.ex *= Math.pow(.975, dt);
      }
      ptr.vx *= .8; ptr.vy *= .8;
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      if (lit > 0) { // the pool of light the swarm makes round the marker
        const br = reduce ? 1 : .88 + .12 * Math.sin(t / 1700);
        ctx.save(); ctx.translate(F.cx, F.cy); ctx.scale(1, Math.max(.7, F.h / F.w * 1.25));
        const rr = Math.max(F.w, 220) * .95;
        const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
        gr.addColorStop(0, `rgba(80,210,200,${(.26 * lit * br).toFixed(3)})`); gr.addColorStop(.55, `rgba(60,150,200,${(.1 * lit * br).toFixed(3)})`); gr.addColorStop(1, 'rgba(40,90,160,0)');
        ctx.fillStyle = gr; ctx.fillRect(-rr, -rr, rr * 2, rr * 2); ctx.restore();
      }
      ctx.lineCap = 'round';
      for (const p of parts) {
        const tw = .5 + .5 * Math.sin(t / 650 + p.ph * 3);
        const a = Math.min(1, (p.free ? .3 : .42) + tw * .3 + p.ex * .7);
        const gs = p.r * (5 + p.ex * 6);
        ctx.globalAlpha = a * .8;
        ctx.drawImage(sprites[p.c], p.x - gs, p.y - gs, gs * 2, gs * 2);
        const sp = Math.hypot(p.vx, p.vy);
        ctx.globalAlpha = a;
        if (sp > 1.2) { // a moving spark leaves a short streak
          ctx.strokeStyle = `rgb(${COLS[p.c]})`; ctx.lineWidth = p.r * 1.4;
          ctx.beginPath(); ctx.moveTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); ctx.lineTo(p.x, p.y); ctx.stroke();
        }
        ctx.fillStyle = p.ex > .3 ? '#F2FFFC' : `rgb(${COLS[p.c]})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + p.ex * .8), 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    function loop(t) { step(t); draw(t); if (visible && !reduce) requestAnimationFrame(loop); else { running = false; last = 0; } }
    function start() { if (!running && visible && !reduce) { running = true; requestAnimationFrame(loop); } }

    sec.addEventListener('pointermove', e => {
      const r = sec.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (ptr.on) { ptr.vx = x - ptr.x; ptr.vy = y - ptr.y; }
      ptr.x = x; ptr.y = y; ptr.on = true;
    }, { passive: true });
    sec.addEventListener('pointerleave', () => { ptr.on = false; });
    sec.addEventListener('pointerdown', e => {
      const r = sec.getBoundingClientRect();
      burst(e.clientX - r.left, e.clientY - r.top, small() ? 170 : 230, 7);
    }, { passive: true });
    link.addEventListener('focus', () => burst(F.cx, F.cy, Math.max(F.w, F.h) * .95 + 60, 5));

    new ResizeObserver(() => { size(); draw(performance.now()); }).observe(sec);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); }).observe(sec);
    new IntersectionObserver((es, io) => {
      if (es[0].isIntersecting) { io.disconnect(); if (!reduce) { t0 = performance.now(); start(); } }
    }, { threshold: .45 }).observe(rig);
  }

  /* ---------------- wildlife: which rescue line? ---------------- */
  const triage = $('[data-triage]');
  if (triage) {
    const chips = $$('button[data-line]', triage);
    const cards = $$('[data-card]');
    const live = $('[data-triage-live]', triage);
    const wrap = cards[0] && cards[0].parentElement;
    const names = { orrca: 'ORRCA on (02) 9415 3333', wires: 'WIRES on 1300 094 737' };
    chips.forEach(c => c.addEventListener('click', () => {
      chips.forEach(o => o.setAttribute('aria-pressed', String(o === c)));
      wrap && wrap.classList.add('triage-on');
      cards.forEach(card => card.classList.toggle('match', card.dataset.card === c.dataset.line));
      live.textContent = `${c.textContent}: call ${names[c.dataset.line]}, 24/7.`;
      const hit = cards.find(card => card.dataset.card === c.dataset.line);
      if (hit) { const r = hit.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) hit.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); }
    }));
  }

  /* ---------------- share ---------------- */
  $$('[data-share]').forEach(share => {
    const msg = share.parentElement.querySelector('[data-share-msg]') || share.parentElement.parentElement.querySelector('[data-share-msg]');
    share.addEventListener('click', async () => {
      const data = { title: document.title, url: location.href };
      try {
        if (navigator.share) { await navigator.share(data); return; }
        await navigator.clipboard.writeText(location.href);
        if (msg) msg.textContent = 'Link copied. Thank you for sharing.';
      } catch (e) {
        if (e && e.name === 'AbortError') return;
        if (msg) msg.textContent = location.href;
      }
    });
  });
})();
