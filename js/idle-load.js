window.addEventListener('load', () => {
    const runner = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));

    runner(() => {
        const isLowEnd =
            (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
            (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
        const TILE_SIZE = 60;
        // fewer animated tiles on weak devices, grid lines stay the same
        const TILE_PROB = isLowEnd ? 0.15 : 0.3;

        function initGrid(bg) {
            const canvas = document.createElement('canvas');
            canvas.className = 'tiles-canvas';

            canvas.style.cssText = `
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
            `;

            // canvas is absolute, so the parent needs a positioning context
            if (getComputedStyle(bg).position === 'static') {
                bg.style.position = 'relative';
            }

            bg.appendChild(canvas);
            const ctx = canvas.getContext('2d', { alpha: true });

            let tiles = [];
            let animationFrame = 0;
            let isVisible = false;
            let hasTiles = false;
            let lastDraw = 0;

            function startAnimate() {
                if (!isVisible || !hasTiles || animationFrame) return;
                animationFrame = requestAnimationFrame(animate);
            }

            function stopAnimate() {
                if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                    animationFrame = 0;
                }
            }

            function rebuild(W, H) {
                if (!W || !H) return;

                const dpr = window.devicePixelRatio || 1;
                canvas.width = W * dpr;
                canvas.height = H * dpr;
                // setTransform, not scale — scale() compounds on every resize
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

                const cols = Math.ceil(W / TILE_SIZE);
                const rows = Math.ceil(H / TILE_SIZE);

                tiles = [];
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        if (Math.random() <= TILE_PROB) {
                            tiles.push({
                                x: c * TILE_SIZE,
                                y: r * TILE_SIZE,
                                offset: Math.random() * Math.PI * 2,
                            });
                        }
                    }
                }
                hasTiles = tiles.length > 0;
                // ensure the loop is running once we actually have tiles to draw
                startAnimate();
            }

            function animate(time) {
                animationFrame = 0;
                if (!isVisible) return;

                // the pulse is a ~6s sine, 30fps is indistinguishable and halves the work
                if (time - lastDraw < 33) {
                    animationFrame = requestAnimationFrame(animate);
                    return;
                }
                lastDraw = time;

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'rgba(0, 255, 204, 0.1)';

                for (let i = 0; i < tiles.length; i++) {
                    const t = tiles[i];
                    const opacity = (Math.sin(time / 1000 + t.offset) + 1) / 2;
                    ctx.globalAlpha = opacity * 0.4;
                    ctx.fillRect(t.x + 1, t.y + 1, TILE_SIZE - 1, TILE_SIZE - 1);
                }
                animationFrame = requestAnimationFrame(animate);
            }

            const observer = new IntersectionObserver(
                (entries) => {
                    isVisible = entries[0].isIntersecting;
                    if (isVisible) startAnimate();
                    else stopAnimate();
                },
                { threshold: 0.01 }
            );
            observer.observe(bg);

            let resizeTimer;
            const resizer = new ResizeObserver((entries) => {
                const rect = entries[0].contentRect;
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => rebuild(rect.width, rect.height), 200);
            });
            resizer.observe(bg);

            // ResizeObserver fires its initial entry on observe(), so rebuild
            // will be driven from there once the parent actually has a size.
        }

        document.querySelectorAll('.card-grid-bg').forEach(initGrid);
    });
});
