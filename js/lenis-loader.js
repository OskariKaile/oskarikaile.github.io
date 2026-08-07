window.addEventListener('load', () => {
    // smooth scroll is the main motion offender — skip it entirely if the OS asks
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const script = document.createElement('script');
    script.src = 'libs/lenis.min.js';
    script.onload = () => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            direction: 'vertical',
            gestureDirection: 'vertical',
            smooth: true,
            mouseMultiplier: 1,
            smoothTouch: false,
            touchMultiplier: 2,
            infinite: false,
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);
        console.log('Lenis loaded lazily');
    };
    document.head.appendChild(script);
});
