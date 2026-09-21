(function () {
    'use strict';

    const wrap = document.getElementById('spaceDivider');
    if (!wrap) return;

    const canvas = document.getElementById('sd-dust');
    const starContainer = document.getElementById('sdStars');
    const ctx = canvas.getContext('2d', { alpha: true });

    let W = wrap.offsetWidth;
    let H = wrap.offsetHeight;
    let isPaused = false;
    let ticking = false;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // drop counts on weak hardware so it still feels the same
    const isLowEnd =
        (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
        window.innerWidth < 768;
    const STAR_COUNT = isLowEnd ? 130 : 240;
    const DUST_BACK = isLowEnd ? 45 : 90;
    const DUST_FRONT = isLowEnd ? 28 : 55;

    function initStars() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.cssText = 'position:absolute;inset:0;pointer-events:none;';

        const fragment = document.createDocumentFragment();

        for (let i = 0; i < STAR_COUNT; i++) {
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            const r = Math.random() < 0.12 ? 1.4 : Math.random() < 0.4 ? 0.8 : 0.45;
            const op = 0.2 + Math.random() * 0.6;

            c.setAttribute('cx', Math.random() * 100 + '%');
            c.setAttribute('cy', Math.random() * 100 + '%');
            c.setAttribute('r', r);
            c.setAttribute('fill', 'white');
            c.setAttribute('opacity', op);
            // no per-star svg filter: 240 filtered circles re-rasterised on every twinkle
            // frame, and a 0.4px blur is invisible next to normal anti-aliasing

            if (!prefersReducedMotion && Math.random() < 0.28) {
                const delay = (Math.random() * 5).toFixed(1);
                const dur = (2 + Math.random() * 4).toFixed(1);
                c.style.animation = `starTwinkle ${dur}s ${delay}s ease-in-out infinite`;
            }
            fragment.appendChild(c);
        }
        svg.appendChild(fragment);
        starContainer.appendChild(svg);
    }

    canvas.width = W;
    canvas.height = H;
    const dust = [];

    function createDust(count, layerType) {
        for (let i = 0; i < count; i++) {
            dust.push({
                x: Math.random() * W,
                y: Math.random() * H,
                vx: (Math.random() - 0.5) * (layerType === 0 ? 0.12 : 0.35),
                vy: -(layerType === 0 ? 0.08 + Math.random() * 0.18 : 0.35 + Math.random() * 0.55),
                r: layerType === 0 ? 0.4 + Math.random() * 1.2 : 0.5 + Math.random() * 0.9,
                op: layerType === 0 ? 0.06 + Math.random() * 0.18 : 0.08 + Math.random() * 0.22,
                col:
                    layerType === 0
                        ? Math.random() < 0.5
                            ? '180,210,255'
                            : '200,255,230'
                        : Math.random() < 0.4
                          ? '255,200,160'
                          : '160,200,255',
                layer: layerType,
            });
            dust[dust.length - 1].sprite = getSprite(dust[dust.length - 1].col);
        }
    }

    // pre-render one soft glow per colour instead of building a gradient per particle per frame
    const SPRITE_SIZE = 32;
    const sprites = {};
    function getSprite(col) {
        if (sprites[col]) return sprites[col];
        const c = document.createElement('canvas');
        c.width = c.height = SPRITE_SIZE;
        const g = c.getContext('2d');
        const half = SPRITE_SIZE / 2;
        const gradient = g.createRadialGradient(half, half, 0, half, half, half);
        gradient.addColorStop(0, `rgba(${col}, 1)`);
        gradient.addColorStop(1, `rgba(${col}, 0)`);
        g.fillStyle = gradient;
        g.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
        return (sprites[col] = c);
    }

    let dustRunning = false;

    function startDust() {
        if (dustRunning || isPaused || prefersReducedMotion) return;
        dustRunning = true;
        requestAnimationFrame(animateDust);
    }

    function animateDust() {
        if (isPaused || prefersReducedMotion) {
            dustRunning = false;
            return;
        }

        ctx.clearRect(0, 0, W, H);

        for (let i = 0; i < dust.length; i++) {
            const p = dust[i];
            p.x += p.vx;
            p.y += p.vy;

            if (p.y < -10) {
                p.y = H + 10;
                p.x = Math.random() * W;
            }
            if (p.x < -10) p.x = W + 10;
            if (p.x > W + 10) p.x = -10;

            const size = p.r * 4;
            ctx.globalAlpha = p.op;
            ctx.drawImage(p.sprite, p.x - size / 2, p.y - size / 2, size, size);
        }
        ctx.globalAlpha = 1;

        requestAnimationFrame(animateDust);
    }

    const els = {
        stars: document.getElementById('sdStars'),
        neb1: document.getElementById('sdNeb1'),
        neb2: document.getElementById('sdNeb2'),
        neb3: document.getElementById('sdNeb3'),
        pXs: document.getElementById('sdPxs'),
        pSm: document.getElementById('sdPsm'),
        pMain: document.getElementById('sdPmain'),
    };

    const speeds = {
        stars: 0.03,
        neb1: 0.05,
        neb2: 0.07,
        neb3: 0.06,
        pXs: -0.12,
        pSm: -0.3,
        pMain: -0.54,
    };

    function doParallax() {
        ticking = false;
        const rect = wrap.getBoundingClientRect();

        if (rect.top > window.innerHeight || rect.bottom < 0) return;

        const offset = window.innerHeight / 2 - rect.top;

        for (let key in els) {
            if (els[key]) {
                // translate3d to get on the GPU
                els[key].style.transform = `translate3d(0, ${offset * (speeds[key] || 0)}px, 0)`;
            }
        }
    }

    // pause work when off-screen — big lighthouse win
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    isPaused = false;
                    startDust();
                } else {
                    isPaused = true;
                }
            });
        },
        { threshold: 0.01 }
    );

    initStars();
    createDust(DUST_BACK, 0);
    createDust(DUST_FRONT, 1);
    observer.observe(wrap);

    window.addEventListener(
        'scroll',
        () => {
            if (!ticking && !prefersReducedMotion) {
                requestAnimationFrame(doParallax);
                ticking = true;
            }
        },
        { passive: true }
    );

    window.addEventListener(
        'resize',
        () => {
            W = wrap.offsetWidth;
            H = wrap.offsetHeight;
            canvas.width = W;
            canvas.height = H;
        },
        { passive: true }
    );

    doParallax();
})();
