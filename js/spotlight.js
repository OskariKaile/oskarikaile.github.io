// mouse-follow glow for .spot cards — one delegated listener, one write per frame
(function () {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let target = null;
    let x = 0;
    let y = 0;
    let ticking = false;

    function update() {
        ticking = false;
        if (!target) return;
        const r = target.getBoundingClientRect();
        target.style.setProperty('--mx', `${x - r.left}px`);
        target.style.setProperty('--my', `${y - r.top}px`);
    }

    document.addEventListener(
        'pointermove',
        (e) => {
            target = e.target.closest ? e.target.closest('.spot') : null;
            if (!target) return;
            x = e.clientX;
            y = e.clientY;
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        },
        { passive: true }
    );
})();
