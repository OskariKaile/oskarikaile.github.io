// lenis is loaded with the other deferred scripts and started straight away.
// it used to wait for window 'load' (5-8s on a real connection), and switching
// the whole page over to smooth scroll that late caused a visible ~0.3s hitch
(function () {
    // smooth scroll is the main motion offender — skip it entirely if the OS asks
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof Lenis === 'undefined') return;

    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        touchMultiplier: 2,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
})();
