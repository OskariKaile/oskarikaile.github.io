(function () {
    const grid = document.querySelector('.edu-bg-grid');
    if (!grid) return;

    let gridVisible = false;
    let ticking = false;
    let mouseX = 0;
    let mouseY = 0;

    new IntersectionObserver(([entry]) => {
        gridVisible = entry.isIntersecting;
    }).observe(grid);

    function updateSpotlight() {
        ticking = false;
        const rect = grid.getBoundingClientRect();

        grid.style.setProperty('--mouse-x', `${mouseX - rect.left}px`);
        grid.style.setProperty('--mouse-y', `${mouseY - rect.top}px`);
    }

    document.addEventListener(
        'mousemove',
        (e) => {
            // spotlight repaints the whole mask — skip it when the grid is off-screen
            if (!gridVisible) return;

            mouseX = e.clientX;
            mouseY = e.clientY;

            if (!ticking) {
                ticking = true;
                requestAnimationFrame(updateSpotlight);
            }
        },
        { passive: true }
    );
})();
