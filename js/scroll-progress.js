const scrollLine = document.getElementById('scroll-line');
let progressTicking = false;

function updateScrollProgress() {
    progressTicking = false;
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;

    // scaleX is compositor-only, width would relayout every scroll
    scrollLine.style.transform = `scaleX(${ratio})`;
}

window.addEventListener(
    'scroll',
    () => {
        if (!progressTicking) {
            progressTicking = true;
            requestAnimationFrame(updateScrollProgress);
        }
    },
    { passive: true }
);

updateScrollProgress();
