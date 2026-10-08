// hero orbital field — replaces the particles.js network.
// a 3d cloud of dust around the globe, drawn on a 2d canvas.
// the field's orientation is driven by the same lat/lng as the globe's camera, so when
// the globe flies in and tracks the ISS everything spins with it (further out = faster)
(function () {
    'use strict';

    const container = document.getElementById('particles-js');
    const hero = container && container.closest('.hero');
    const globeEl = document.getElementById('hero-globe');
    if (!container || !hero || !globeEl) return;

    const isMobile = window.innerWidth < 768;
    const isLowEnd =
        (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const DUST_COUNT = isMobile ? 360 : isLowEnd ? 420 : 760;
    // full resolution (capped at 2x) so the dots stay crisp
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    // degrees per second the field drifts on its own, eastward like the ISS track
    const IDLE_SPIN = reducedMotion ? 0 : isMobile ? 1.6 : 1.2;
    // perspective distance of the field's virtual camera, in globe radii
    const PERSP = 8;

    const TEAL = '0,255,204';
    const WHITE = '235,245,255';
    const ICE = '170,205,255';

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    container.appendChild(canvas);
    // no z-index: the globe is painted over this layer, so the whole field reads
    // as being behind the planet
    const ctx = canvas.getContext('2d');

    let W = 0;
    let H = 0;
    // where the globe is on screen and how big, eased toward the real values
    let cx = 0;
    let cy = 0;
    let radiusPx = 0;
    let targetCx = 0;
    let targetCy = 0;
    let globeH = 0;

    // field orientation, same parameterisation as globe.gl's pointOfView
    let fieldLat = 18;
    let fieldLng = 0;
    // the globe's camera moves in steps (its own fps cap), so the field chases
    // these targets with smoothing instead of copying every step
    let targetLat = fieldLat;
    let targetLng = fieldLng;
    let prevPov = null;
    let globeShown = 0; // occlusion fades in with the globe
    let globeReady = false;

    const rand = (a, b) => a + Math.random() * (b - a);
    const DEG = Math.PI / 180;

    // ---- dust shell -----------------------------------------------------------
    const dust = [];
    function buildDust() {
        dust.length = 0;
        const estRadius = radiusPx || H * 0.41;
        const maxR = Math.min(4.5, Math.max(2.2, Math.hypot(W / 2, H) / estRadius));
        for (let i = 0; i < DUST_COUNT; i++) {
            // random direction, radius biased toward the globe
            const u = Math.random() * 2 - 1;
            const a = Math.random() * Math.PI * 2;
            const s = Math.sqrt(1 - u * u);
            const r = 1.15 + (maxR - 1.15) * Math.pow(Math.random(), 0.8);
            const roll = Math.random();
            dust.push({
                x: s * Math.cos(a) * r,
                y: u * r,
                z: s * Math.sin(a) * r,
                size: rand(0.7, 2),
                alpha: rand(0.4, 0.9),
                col: roll < 0.1 ? TEAL : roll < 0.4 ? ICE : WHITE,
                tw: Math.random() * Math.PI * 2, // twinkle phase
                sx: 0, sy: 0, px: NaN, py: NaN, vis: 1,
                ox: 0, oy: 0, vx: 0, vy: 0,
            });
        }
    }

    // one pre-rendered soft dot per colour: drawImage at sub-pixel positions moves
    // smoothly, where thin strokes shimmered and stepped
    const SPRITE = 64;
    const sprites = {};
    for (const col of [TEAL, ICE, WHITE]) {
        const c = document.createElement('canvas');
        c.width = c.height = SPRITE;
        const g = c.getContext('2d');
        const h = SPRITE / 2;
        const grad = g.createRadialGradient(h, h, 0, h, h, h);
        grad.addColorStop(0, `rgba(${col},1)`);
        grad.addColorStop(0.22, `rgba(${col},0.95)`);
        grad.addColorStop(0.4, `rgba(${col},0.3)`);
        grad.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = grad;
        g.fillRect(0, 0, SPRITE, SPRITE);
        sprites[col] = c;
    }

    // ---- layout ---------------------------------------------------------------
    function globeRadiusPx() {
        const world = window.heroGlobe;
        const fov = (world && world.camera().fov) || 50;
        const alt = (world && globeReady && world.pointOfView().altitude) || 2.5;
        const d = 1 + alt;
        return ((globeH / 2) / Math.tan((fov / 2) * DEG)) / Math.sqrt(d * d - 1);
    }

    function resize() {
        W = hero.clientWidth;
        H = hero.clientHeight;
        canvas.width = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

        // untransformed position — the globe's css entrance shouldn't drag the field
        globeH = globeEl.offsetHeight || H;
        targetCx = globeEl.offsetLeft + globeEl.offsetWidth / 2;
        targetCy = globeEl.offsetTop + globeH / 2;
        if (!radiusPx) {
            cx = targetCx;
            cy = targetCy;
            radiusPx = globeRadiusPx();
            buildDust();
        }
        // positions jump on resize; forget the old ones
        for (const p of dust) p.px = NaN;
        for (const p of sparks) p.px = NaN;
    }

    // ---- interaction ------------------------------------------------------------
    const mouse = { x: null, y: null };
    // dots added by clicking — they join the cloud and spin with it
    const sparks = [];
    const SPARK_MAX = 80;
    const modal2 = document.getElementById('whatareudoung');
    let clickCount = 0;

    container.addEventListener(
        'mousemove',
        (e) => {
            const rect = container.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        },
        { passive: true }
    );
    container.addEventListener(
        'mouseleave',
        () => {
            mouse.x = mouse.y = null;
        },
        { passive: true }
    );

    container.addEventListener('click', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        spawnAt(x, y);

        // easter egg: 10 clicks
        if (++clickCount === 10 && modal2) {
            modal2.classList.add('active');
            clickCount = 0;
        }
    });

    // un-project a screen point into the field so the new dot lives in 3d like
    // the rest: picked at a depth in front of the globe, then rotated back
    // through the transpose of the view matrix
    function spawnAt(x, y) {
        if (m00 === undefined || !radiusPx) return;
        const n = isMobile ? 3 : 4;
        for (let k = 0; k < n; k++) {
            const sx = x + rand(-22, 22);
            const sy = y + rand(-22, 22);
            let vz = rand(0.3, 1.8);
            let vx = 0, vy = 0;
            for (let it = 0; it < 3; it++) {
                const f = PERSP / (PERSP - vz);
                vx = (sx - cx) / (f * radiusPx);
                vy = -(sy - cy) / (f * radiusPx);
                // keep it outside the globe
                const rest = 1.35 - vx * vx - vy * vy;
                if (rest > vz * vz) vz = Math.sqrt(rest);
                else break;
            }
            if (sparks.length >= SPARK_MAX) sparks.shift();
            sparks.push({
                x: m00 * vx + m10 * vy + m20 * vz,
                y: m01 * vx + m11 * vy + m21 * vz,
                z: m02 * vx + m12 * vy + m22 * vz,
                size: rand(1.4, 2.2),
                alpha: rand(0.8, 1),
                col: Math.random() < 0.7 ? TEAL : WHITE,
                tw: Math.random() * Math.PI * 2,
                born: time,
                sx, sy, px: NaN, py: NaN, vis: 1,
                // small outward burst from the click point
                ox: 0, oy: 0, vx: (sx - x) * 0.25, vy: (sy - y) * 0.25,
            });
        }
    }

    // screen-space push away from the cursor, springs back afterwards
    const REPEL_R = 130;
    function physics(p) {
        if (mouse.x !== null && !isMobile) {
            const dx = p.sx - mouse.x;
            const dy = p.sy - mouse.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < REPEL_R * REPEL_R && d2 > 0.25) {
                const d = Math.sqrt(d2);
                const t = 1 - d / REPEL_R;
                const f = 1.1 * t * t * (3 - 2 * t);
                p.vx += (dx / d) * f;
                p.vy += (dy / d) * f;
            }
        }
        p.vx = (p.vx - p.ox * 0.035) * 0.86;
        p.vy = (p.vy - p.oy * 0.035) * 0.86;
        p.ox += p.vx;
        p.oy += p.vy;
    }

    // ---- globe coupling ---------------------------------------------------------
    window.addEventListener('globe:ready', () => {
        globeReady = true;
        prevPov = null;
    });

    function followGlobe() {
        const world = window.heroGlobe;
        if (!world || !globeReady) return;
        const pov = world.pointOfView();
        if (prevPov) {
            const dLat = pov.lat - prevPov.lat;
            let dLng = pov.lng - prevPov.lng;
            if (dLng > 180) dLng -= 360;
            else if (dLng < -180) dLng += 360;
            // a snap (tab coming back, re-sync) isn't a spin — skip it
            if (Math.abs(dLat) < 10 && Math.abs(dLng) < 10) {
                targetLat += dLat;
                targetLng += dLng;
            }
        }
        prevPov = { lat: pov.lat, lng: pov.lng };
    }

    // ---- frame ------------------------------------------------------------------
    let m00, m01, m02, m10, m11, m12, m20, m21, m22;
    function buildView() {
        // world -> view: turn about y by -lng, then about x by lat (globe.gl's camera)
        const cl = Math.cos(-fieldLng * DEG), sl = Math.sin(-fieldLng * DEG);
        const ca = Math.cos(fieldLat * DEG), sa = Math.sin(fieldLat * DEG);
        m00 = cl; m01 = 0; m02 = sl;
        m10 = -sa * -sl; m11 = ca; m12 = -sa * cl;
        m20 = ca * -sl; m21 = sa; m22 = ca * cl;
    }

    const smooth = (e0, e1, x) => {
        const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
        return t * t * (3 - 2 * t);
    };

    // projects into p.sx/p.sy and p.vis (0..1 fade), returns depth scale or 0 when hidden.
    // everything fades rather than pops: near the camera, and sliding behind the globe
    function project(p, x, y, z) {
        const vx = m00 * x + m01 * y + m02 * z;
        const vy = m10 * x + m11 * y + m12 * z;
        const vz = m20 * x + m21 * y + m22 * z;
        const denom = PERSP - vz;
        if (denom < 1.5) return 0;
        const f = PERSP / denom;
        const sx = cx + vx * f * radiusPx;
        const sy = cy - vy * f * radiusPx;
        let vis = smooth(1.5, 2.5, denom);
        if (globeShown > 0) {
            // everything sits behind the planet: fade dots out across its limb so
            // they slide behind it, and links to them go with them
            const d = Math.hypot(sx - cx, sy - cy) / radiusPx;
            vis *= 1 - (1 - smooth(0.97, 1.08, d)) * globeShown;
        }
        if (vis <= 0.01) return 0;
        p.sx = sx;
        p.sy = sy;
        p.vis = vis;
        return f;
    }

    // dots that made it on screen this frame, for the links pass
    const shown = [];

    function placeParticle(p, f, alpha) {
        physics(p);
        const x = p.sx + p.ox;
        const y = p.sy + p.oy;
        let size = p.size * f * 3.2; // sprite core is ~40% of its width
        if (p.born !== undefined) {
            // clicked-in dots pop big and bright, then settle
            const k = Math.min(1, (time - p.born) / 0.7);
            const pop = (1 - k) * (1 - k);
            size *= 1 + 2.4 * pop;
            alpha *= 1 + 1.5 * pop;
        }
        if (x < -size || x > W + size || y < -size || y > H + size) {
            p.px = NaN;
            return;
        }
        p.px = x;
        p.py = y;
        p.draw = size;
        p.a = Math.min(1, alpha * p.vis * Math.min(1.3, 0.25 + (f - 0.75) * 1.4));
        if (p.a > 0.01) shown.push(p);
    }

    // the old network look: link dots that are close on screen. alpha is bucketed
    // so the whole web is a handful of strokes instead of one per line
    const LINK_DIST = isMobile ? 95 : 120;
    const LINK_BUCKETS = 8;
    const linkPaths = [];
    // spatial grid with LINK_DIST cells: each dot only checks its own and the
    // neighbouring cells, so the cost grows with the dot count instead of its square
    let grid = [];
    let gridCols = 0;
    let gridRows = 0;
    function drawLinks() {
        const cols = Math.ceil(W / LINK_DIST) + 2;
        const rows = Math.ceil(H / LINK_DIST) + 2;
        if (cols !== gridCols || rows !== gridRows) {
            gridCols = cols;
            gridRows = rows;
            grid = Array.from({ length: cols * rows }, () => []);
        }
        for (let c = 0; c < grid.length; c++) grid[c].length = 0;
        for (let i = 0; i < shown.length; i++) {
            const p = shown[i];
            const gx = Math.min(cols - 1, Math.max(0, Math.floor(p.px / LINK_DIST) + 1));
            const gy = Math.min(rows - 1, Math.max(0, Math.floor(p.py / LINK_DIST) + 1));
            grid[gy * cols + gx].push(p);
        }

        const maxD2 = LINK_DIST * LINK_DIST;
        for (let b = 0; b < LINK_BUCKETS; b++) linkPaths[b] = null;
        const link = (p, q) => {
            const dx = p.px - q.px;
            const dy = p.py - q.py;
            const d2 = dx * dx + dy * dy;
            if (d2 > maxD2) return;
            // fades with distance and with the dimmer dot, so links never pop
            const a = (1 - Math.sqrt(d2) / LINK_DIST) * Math.min(1, Math.min(p.a, q.a) * 2.2);
            const b = Math.min(LINK_BUCKETS - 1, Math.floor(a * LINK_BUCKETS));
            if (b <= 0) return;
            if (!linkPaths[b]) linkPaths[b] = new Path2D();
            linkPaths[b].moveTo(p.px, p.py);
            linkPaths[b].lineTo(q.px, q.py);
        };
        const pairs = (a, b) => {
            for (let i = 0; i < a.length; i++) {
                for (let j = 0; j < b.length; j++) link(a[i], b[j]);
            }
        };
        for (let gy = 0; gy < rows; gy++) {
            for (let gx = 0; gx < cols; gx++) {
                const cell = grid[gy * cols + gx];
                if (!cell.length) continue;
                for (let i = 0; i < cell.length; i++) {
                    for (let j = i + 1; j < cell.length; j++) link(cell[i], cell[j]);
                }
                // forward neighbours only, so each pair is seen once
                if (gx + 1 < cols) pairs(cell, grid[gy * cols + gx + 1]);
                if (gy + 1 < rows) {
                    const below = (gy + 1) * cols + gx;
                    pairs(cell, grid[below]);
                    if (gx + 1 < cols) pairs(cell, grid[below + 1]);
                    if (gx > 0) pairs(cell, grid[below - 1]);
                }
            }
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgb(${TEAL})`;
        for (let b = 1; b < LINK_BUCKETS; b++) {
            if (!linkPaths[b]) continue;
            ctx.globalAlpha = 0.42 * ((b + 0.5) / LINK_BUCKETS);
            ctx.stroke(linkPaths[b]);
        }
    }

    function drawDots() {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < shown.length; i++) {
            const p = shown[i];
            ctx.globalAlpha = p.a;
            ctx.drawImage(sprites[p.col], p.px - p.draw / 2, p.py - p.draw / 2, p.draw, p.draw);
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    function drawCursorLinks() {
        if (mouse.x === null || isMobile) return;
        const R = 150;
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = `rgb(${TEAL})`;
        let n = 0;
        for (const p of shown) {
            const dx = p.px - mouse.x, dy = p.py - mouse.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > R * R) continue;
            ctx.globalAlpha = 0.35 * (1 - Math.sqrt(d2) / R);
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p.px, p.py);
            ctx.stroke();
            if (++n > 18) return;
        }
    }

    // if a device can't keep up, quietly draw fewer dots (never below 45%)
    let active = DUST_COUNT;
    let workAvg = 0;
    let workFrames = 0;

    let running = false;
    let visible = false;
    let last = 0;
    let time = 0;

    function frame(now) {
        if (!visible) {
            running = false;
            return;
        }
        requestAnimationFrame(frame);
        const workStart = performance.now();

        const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
        last = now;
        time += dt;
        followGlobe();
        targetLng += IDLE_SPIN * dt;
        // frame-rate independent ease toward the globe's orientation
        const follow = 1 - Math.exp(-dt * 7);
        fieldLat += (targetLat - fieldLat) * follow;
        fieldLng += (targetLng - fieldLng) * follow;

        if (globeReady) {
            globeShown = Math.min(1, globeShown + dt / 1);
        }
        const ease = 1 - Math.pow(0.001, dt);
        cx += (targetCx - cx) * ease;
        cy += (targetCy - cy) * ease;
        radiusPx += (globeRadiusPx() - radiusPx) * ease;

        buildView();
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.clearRect(0, 0, W, H);

        shown.length = 0;
        const place = (p) => {
            const f = project(p, p.x, p.y, p.z);
            if (!f) {
                p.px = NaN;
                return;
            }
            const tw = reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(time * 1.3 + p.tw);
            placeParticle(p, f, p.alpha * tw);
        };
        for (let i = 0; i < active; i++) place(dust[i]);
        for (let i = 0; i < sparks.length; i++) place(sparks[i]);

        drawLinks();
        drawDots();

        drawCursorLinks();

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;

        workAvg = workAvg * 0.95 + (performance.now() - workStart) * 0.05;
        if (++workFrames % 90 === 0 && workAvg > 8 && active > DUST_COUNT * 0.45) {
            for (let i = Math.floor(active * 0.85); i < active; i++) dust[i].px = NaN;
            active = Math.floor(active * 0.85);
        }
    }

    function start() {
        if (running || !visible) return;
        running = true;
        last = 0;
        requestAnimationFrame(frame);
    }

    resize();
    let resizeTimer;
    window.addEventListener(
        'resize',
        () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resize, 150);
        },
        { passive: true }
    );

    // stop all work once the hero is scrolled away
    new IntersectionObserver(
        ([entry]) => {
            visible = entry.isIntersecting;
            if (visible) start();
        },
        { threshold: 0 }
    ).observe(hero);
})();
