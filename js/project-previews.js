// project preview clips: nothing downloads until a card is near the screen,
// and each clip only plays while it's actually visible
(function () {
    'use strict';

    const videos = document.querySelectorAll('.pp-video');
    if (!videos.length) return;

    // reduced motion keeps the poster still
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                const video = entry.target;
                if (entry.isIntersecting) {
                    const play = video.play();
                    // autoplay can still be refused (data saver etc.), poster stays
                    if (play) play.catch(() => {});
                } else {
                    video.pause();
                }
            });
        },
        { threshold: 0.25 }
    );

    videos.forEach((video) => observer.observe(video));
})();
