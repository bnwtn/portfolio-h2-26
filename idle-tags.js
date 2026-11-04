/* ============================================================
   Billy Newton · Portfolio 2027 · idle skill tags
   After IDLE_MS without input the skill tags drop in under gravity
   (same behaviour as the 404 page). The cursor shoves them around and
   they can be grabbed and thrown. Scrolling, a key press or a touch
   drops the floor so they fall away, then the idle clock restarts.
   Skipped on the cover (body.on-cover) and while a dialog is open.
   On the footer (body.on-end) the tags are black with two white.
   On Projects (#work) they wait until no project is hovered, clear
   when one is, and sit over a 50% black scrim for contrast.
   Never while a video is playing on screen; one starting clears them.
   In projects (the Projects index and every project deck) the wait is 15s.
   ============================================================ */
(() => {
  const IDLE_MS = 5000, PROJECT_IDLE_MS = 15000;   // projects get longer: people are reading and watching
  const MATTER = 'https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const TAGS = [
    ['Design Systems',        '#f55213', 'rgba(255,255,255,.4)'],
    ['User Experience',       '#bbff00', '#fff'],
    ['Product Design',        '#1b1b1b', 'rgba(255,255,255,.4)'],
    ['Strategy',              '#0509fa', 'rgba(255,255,255,.4)'],
    ['Visual Design',         '#ff1ad1', 'rgba(0,0,0,.2)'],
    ['Motion',                '#1b1b1b', 'rgba(255,255,255,.4)'],
    ['AI Development',        '#aa00ff', 'rgba(255,255,255,.4)'],
    ['Automation',            '#0509fa', 'rgba(255,255,255,.4)'],
    ['Product Visualisation', '#ffffff', 'rgba(0,0,0,.2)'],
    ['Prototyping',           '#1b1b1b', 'rgba(255,255,255,.4)'],
  ];
  const FOOT_WHITE = new Set(['User Experience', 'Motion']);

  const css = document.createElement('style');
  css.textContent = `
.itags{position:fixed; inset:0; z-index:45; pointer-events:none; overflow:hidden}
.itag{
  position:absolute; left:0; top:0; pointer-events:auto; cursor:grab; user-select:none; -webkit-user-select:none; touch-action:none;
  --tf:max(calc(47.71 * min(100vw / 1400, 100svh / 1080)), 20px);
  padding:calc(var(--tf) * .5634); border-radius:calc(var(--tf) * .2465); white-space:nowrap;
  font:500 var(--tf)/.86 Inter, system-ui, sans-serif; letter-spacing:-.02em;
  background:var(--bg); color:var(--fg); visibility:hidden; will-change:transform;
}
.itag span{display:block; text-box:trim-both cap alphabetic}
.itag.drag{cursor:grabbing}
.itag.on{visibility:visible}
.itags-scrim{position:fixed; inset:0; z-index:44; pointer-events:none; background:rgba(0,0,0,.5); opacity:0; transition:opacity .6s cubic-bezier(.22,1,.36,1)}
.itags-scrim.on{opacity:1}`;
  document.head.appendChild(css);

  const layer = document.createElement('div');
  layer.className = 'itags'; layer.setAttribute('aria-hidden', 'true');
  const els = TAGS.map(([label]) => {
    const el = document.createElement('div'); el.className = 'itag';
    const s = document.createElement('span'); s.textContent = label; el.appendChild(s);
    layer.appendChild(el); return el;
  });
  const scrim = document.createElement('div'); scrim.className = 'itags-scrim';
  document.body.append(scrim, layer);

  const work = document.getElementById('work');
  const onWork = () => { if (!work) return false; const r = work.getBoundingClientRect(); return r.top <= innerHeight / 2 && r.bottom >= innerHeight / 2; };
  const playing = () => [...document.querySelectorAll('video')].some(v => {
    if (v.paused || v.ended) return false;
    const r = v.getBoundingClientRect();
    return r.width && r.height && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  });
  document.addEventListener('playing', () => { if (world && playing()) world.clear(); }, true);
  const hovered = () => onWork() && !!work.dataset.art;
  if (work) new MutationObserver(() => { if (world && work.dataset.art) world.clear(); }).observe(work, {attributes:true, attributeFilter:['data-art']});

  let world = null, timer, loading = null;
  const blocked = () => document.body.classList.contains('on-cover') || document.querySelector('dialog[open]') || hovered() || playing();
  const inProject = () => {
    if (document.body.dataset.solo) return true;
    const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('section');
    return !!el && (el.id === 'work' || el.classList.contains('deck'));
  };
  const idle = () => { clearTimeout(timer); if (!world) timer = setTimeout(drop, inProject() ? PROJECT_IDLE_MS : IDLE_MS); };
  ['pointermove','pointerdown','keydown','wheel','touchstart','scroll'].forEach(t => addEventListener(t, idle, {passive:true}));
  // anything that moves the page clears the pile
  ['wheel','keydown','touchmove','scroll'].forEach(t => addEventListener(t, () => world && world.clear(), {passive:true}));
  idle();

  const load = () => loading ||= window.Matter ? Promise.resolve() : new Promise((ok, no) => {
    const s = document.createElement('script'); s.src = MATTER; s.onload = ok; s.onerror = no; document.head.appendChild(s);
  });

  function drop(){
    if (blocked()) return idle();
    load().then(() => { if (!world && !blocked()) world = physics(); }, () => {});
  }

  function paint(){
    const foot = document.body.classList.contains('on-end');
    TAGS.forEach(([label, bg, fg], i) => {
      const white = FOOT_WHITE.has(label);
      els[i].style.setProperty('--bg', foot ? (white ? '#fff' : '#000') : bg);
      els[i].style.setProperty('--fg', foot ? (white ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.4)') : fg);
    });
  }

  function physics(){
    paint();
    scrim.classList.toggle('on', onWork());
    const {Engine, Bodies, Body, Composite, Constraint, Vector} = Matter;
    const engine = Engine.create({gravity:{y:1.1}});
    const TAG = 0x2, HAND = 0x4;
    const W = () => innerWidth, H = () => innerHeight, T = 400;
    let walls = [], floorOn = true, raf = 0;
    const buildWalls = () => {
      Composite.remove(engine.world, walls);
      walls = [
        Bodies.rectangle(-T/2, H()/2 - H(), T, H() * 4, {isStatic:true}),
        Bodies.rectangle(W() + T/2, H()/2 - H(), T, H() * 4, {isStatic:true}),
      ];
      if (floorOn) walls.push(Bodies.rectangle(W()/2, H() + T/2, W() * 3, T, {isStatic:true}));
      Composite.add(engine.world, walls);
    };
    buildWalls();

    // shuffle the drop order so it reads differently every time
    const order = els.map(el => ({el, k:Math.random()})).sort((a, b) => a.k - b.k).map(o => o.el);
    const timers = [];
    let items = order.map((el, i) => {
      const w = el.offsetWidth, h = el.offsetHeight;
      const r = parseFloat(getComputedStyle(el).borderRadius) || 0;
      const x = w/2 + Math.random() * Math.max(1, W() - w);
      const b = Bodies.rectangle(x, -h - 40, w, h, {
        chamfer:{radius:Math.min(r, h/2 - 1)}, collisionFilter:{category:TAG}, restitution:.25, friction:.5, frictionAir:.012, density:.0015,
        angle:(Math.random() - .5) * 1.1,
      });
      Body.setInertia(b, b.inertia * 4);               // resist flipping, so labels land readable
      Body.setAngularVelocity(b, (Math.random() - .5) * .03);
      return {el, b, w, h, at: i * 260};
    });
    const all = items.slice();
    items.forEach(it => timers.push(setTimeout(() => { Composite.add(engine.world, it.b); it.el.classList.add('on'); }, it.at)));

    // the pointer is a heavy invisible disc; steering it by velocity (not position)
    // lets Matter resolve real contacts, so moving through the pile shoves tags around
    const R = Math.max(18, 28 * Math.min(innerWidth / 1400, innerHeight / 1080));
    const hand = Bodies.circle(-999, -999, R, {collisionFilter:{category:HAND, mask:0}, density:.05, frictionAir:0, restitution:.2, inertia:Infinity});
    Composite.add(engine.world, hand);
    const ptr = {x:-999, y:-999, live:false};
    let grab = null;
    const handOn = on => { hand.collisionFilter.mask = on ? TAG : 0; };
    const onMove = e => {
      if (!ptr.live){ Body.setPosition(hand, {x:e.clientX, y:e.clientY}); Body.setVelocity(hand, {x:0, y:0}); ptr.live = true; }
      ptr.x = e.clientX; ptr.y = e.clientY;
      if (grab) grab.c.pointA = {x:e.clientX, y:e.clientY}; else handOn(true);
    };
    const onLeave = () => { ptr.live = false; handOn(false); };
    const steer = () => {
      if (!ptr.live) return Body.setPosition(hand, {x:-999, y:-999});
      const cap = 45, vx = (ptr.x - hand.position.x) * .6, vy = (ptr.y - hand.position.y) * .6;
      const m = Math.hypot(vx, vy), k = m > cap ? cap / m : 1;
      Body.setVelocity(hand, {x:vx * k, y:vy * k});
    };

    // grab and throw
    const downs = items.map(it => {
      const fn = e => {
        e.stopPropagation();
        const p = {x:e.clientX, y:e.clientY};
        const local = Vector.rotate(Vector.sub(p, it.b.position), -it.b.angle);
        grab = {it, c: Constraint.create({pointA:p, bodyB:it.b, pointB:Vector.rotate(local, it.b.angle), stiffness:.2, damping:.1, length:0})};
        Composite.add(engine.world, grab.c);
        it.el.classList.add('drag');
        handOn(false);                                 // the held tag goes where the pointer goes
        it.el.setPointerCapture(e.pointerId);
      };
      it.el.addEventListener('pointerdown', fn); return fn;
    });
    const release = () => { if (!grab) return; Composite.remove(engine.world, grab.c); grab.it.el.classList.remove('drag'); grab = null; };
    const onResize = () => {
      buildWalls();
      items.forEach(({b, w, h}) => {                   // keep everything on screen
        const x = Math.min(Math.max(b.position.x, w/2), W() - w/2), y = floorOn ? Math.min(b.position.y, H() - h/2) : b.position.y;
        if (x !== b.position.x || y !== b.position.y) Body.setPosition(b, {x, y});
      });
    };
    addEventListener('pointermove', onMove, {passive:true});
    document.documentElement.addEventListener('pointerleave', onLeave);
    addEventListener('pointerup', release); addEventListener('pointercancel', release);
    addEventListener('resize', onResize);

    function teardown(){
      cancelAnimationFrame(raf); timers.forEach(clearTimeout);
      removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      removeEventListener('pointerup', release); removeEventListener('pointercancel', release);
      removeEventListener('resize', onResize);
      all.forEach((it, i) => { it.el.removeEventListener('pointerdown', downs[i]); it.el.classList.remove('on', 'drag'); it.el.style.transform = ''; });
      Composite.clear(engine.world, false); Engine.clear(engine);
      world = null; idle();
    }

    let last = performance.now();
    (function tick(now){
      steer();
      Engine.update(engine, Math.min(now - last, 32)); last = now;
      for (const {el, b, w, h} of items){
        el.style.transform = `translate(${b.position.x - w/2}px, ${b.position.y - h/2}px) rotate(${b.angle}rad)`;
      }
      // once the floor is gone, finish when everything has fallen out of view
      if (!floorOn && items.every(({b, h}) => b.position.y - h > H())) return teardown();
      raf = requestAnimationFrame(tick);
    })(last);

    return {
      clear(){
        if (!floorOn) return;
        floorOn = false; release(); handOn(false); scrim.classList.remove('on');
        timers.forEach(clearTimeout);
        items = items.filter(it => it.el.classList.contains('on'));   // tags still waiting to drop never appear
        items.forEach(it => Body.setVelocity(it.b, {x:it.b.velocity.x, y:Math.max(it.b.velocity.y, 6)}));
        buildWalls();
      },
    };
  }
})();
