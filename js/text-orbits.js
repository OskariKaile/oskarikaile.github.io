// 3d text orbits around the space-divider planets.
// letters sit on a vertical cylinder around each planet; css spins it, and the
// planet shares the 3d scene (preserve-3d) so the back half passes behind it
(function () {
    'use strict';

    const wrap = document.getElementById('spaceDivider');
    if (!wrap) return;

    const CHUNK = 3;

    // nothing spins or breathes while the scene is off screen
    new IntersectionObserver((entries) => {
        entries.forEach((entry) => wrap.classList.toggle('is-offscreen', !entry.isIntersecting));
    }).observe(wrap);

    // font size is solved so the text wraps the full circumference evenly
    function buildOrbit(host) {
        const orbit = host.querySelector('.text-orbit');
        if (!orbit) return;
        orbit.textContent = '';
        const text = orbit.dataset.orbit.replace(/\s+/g, ' ').trim() + ' ';
        const size = host.offsetWidth;
        const R = size * 0.8;
        const circ = Math.PI * 2 * R;
        const wanted = Math.min(Math.max(size * 0.105, 18), 46);
        const reps = Math.max(1, Math.round(circ / wanted / text.length));
        const chars = text.repeat(reps);
        const pitch = circ / chars.length;
        const font = Math.min(pitch, size * 0.12);
        const step = 360 / chars.length;

        const spin = document.createElement('div');
        spin.className = 'text-orbit-spin';
        spin.style.fontSize = `${font}px`;
        const frag = document.createDocumentFragment();
        // every 3d-transformed element is its own gpu layer, so letters go on
        // in flat chunks of 3; the facets sit ~1% off the true curve, unseen
        for (let i = 0; i < chars.length; i += CHUNK) {
            const n = Math.min(CHUNK, chars.length - i);
            const chunk = document.createElement('span');
            chunk.style.cssText =
                `width:${pitch * n}px;height:${font}px;left:${(-pitch * n) / 2}px;top:${-font / 2}px;` +
                `transform:rotateY(${(i + (n - 1) / 2) * step}deg) translateZ(${R}px)`;
            for (let k = 0; k < n; k++) {
                const letter = document.createElement('i');
                letter.style.width = `${pitch}px`;
                letter.textContent = chars[i + k] === ' ' ? String.fromCharCode(160) : chars[i + k]; // nbsp keeps the slot
                chunk.appendChild(letter);
            }
            frag.appendChild(chunk);
        }
        spin.appendChild(frag);
        orbit.appendChild(spin);

        for (const dir of [-1, 1]) {
            const rail = document.createElement('div');
            rail.className = 'text-orbit-rail';
            rail.style.cssText =
                `width:${R * 2}px;height:${R * 2}px;left:${-R}px;top:${-R}px;` +
                `transform:translateY(${dir * font * 0.8}px) rotateX(90deg)`;
            orbit.appendChild(rail);
        }
    }

    function buildOrbits() {
        wrap.querySelectorAll('.layer-planet, .layer-planet-small-1').forEach(buildOrbit);
    }
    buildOrbits();
    let resizeTimer = 0;
    let lastWidth = window.innerWidth;
    window.addEventListener(
        'resize',
        () => {
            // mobile url-bar resizes only change height, skip those
            if (window.innerWidth === lastWidth) return;
            lastWidth = window.innerWidth;
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(buildOrbits, 200);
        },
        { passive: true }
    );
})();
