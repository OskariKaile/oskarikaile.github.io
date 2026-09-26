// 3d text orbits around the space-divider planets.
// letters sit on a vertical cylinder around each planet; css spins it, and the
// planet shares the 3d scene (preserve-3d) so the back half passes behind it
(function () {
    'use strict';

    const wrap = document.getElementById('spaceDivider');
    if (!wrap) return;

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
        const frag = document.createDocumentFragment();
        for (let i = 0; i < chars.length; i++) {
            const span = document.createElement('span');
            span.textContent = chars[i] === ' ' ? String.fromCharCode(160) : chars[i]; // nbsp keeps the slot
            span.style.cssText =
                `width:${pitch}px;height:${font}px;left:${-pitch / 2}px;top:${-font / 2}px;` +
                `font-size:${font}px;transform:rotateY(${i * step}deg) translateZ(${R}px)`;
            frag.appendChild(span);
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
