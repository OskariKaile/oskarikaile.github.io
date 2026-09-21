const globeEl = document.getElementById('hero-globe');
let globeFixed = false;

window.addEventListener(
    'scroll',
    () => {
        const shouldFix = window.scrollY > 1500;

        // only touch the class when the state flips
        if (shouldFix !== globeFixed) {
            globeFixed = shouldFix;
            globeEl.classList.toggle('is-fixed', shouldFix);
        }
    },
    { passive: true }
);
