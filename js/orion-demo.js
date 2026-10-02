const orionDemoModal = document.getElementById('orionDemoModal');
const orionDemoVideo = orionDemoModal.querySelector('video');
const ORION_DEMO_HASH = '#orion-demo';
let orionDemoLastFocus = null;
let orionDemoPushedHash = false;
// background music gets paused for the video and comes back on close
let orionDemoMutedMusic = false;

function showOrionDemo() {
    if (orionDemoModal.classList.contains('active')) return;

    orionDemoLastFocus = document.activeElement;
    orionDemoModal.classList.add('active');
    document.documentElement.classList.add('modal-open');

    const music = document.getElementById('bg-music');
    if (music && !music.paused && typeof toggleMusic === 'function') {
        toggleMusic();
        orionDemoMutedMusic = true;
    }

    if (!orionDemoVideo.src) orionDemoVideo.src = orionDemoVideo.dataset.src;
    orionDemoVideo.currentTime = 0;
    // autoplay with sound can be blocked (e.g. opened from a link), then the controls are there
    orionDemoVideo.play().catch(() => {});
    orionDemoModal.querySelector('.pipeline-close').focus({ preventScroll: true });
}

function hideOrionDemo() {
    if (!orionDemoModal.classList.contains('active')) return;

    orionDemoVideo.pause();
    orionDemoModal.classList.remove('active');
    document.documentElement.classList.remove('modal-open');

    if (orionDemoMutedMusic) {
        orionDemoMutedMusic = false;
        toggleMusic();
    }
    if (orionDemoLastFocus) orionDemoLastFocus.focus({ preventScroll: true });
}

function openOrionDemo() {
    showOrionDemo();
    if (location.hash !== ORION_DEMO_HASH) {
        history.pushState(null, '', ORION_DEMO_HASH);
        orionDemoPushedHash = true;
    }
}

function closeOrionDemo() {
    hideOrionDemo();
    if (location.hash !== ORION_DEMO_HASH) return;

    if (orionDemoPushedHash) {
        orionDemoPushedHash = false;
        history.back();
    } else {
        history.replaceState(null, '', location.pathname + location.search);
    }
}

function syncOrionDemoToHash() {
    if (location.hash === ORION_DEMO_HASH) showOrionDemo();
    else hideOrionDemo();
}
window.addEventListener('hashchange', syncOrionDemoToHash);
window.addEventListener('popstate', () => {
    orionDemoPushedHash = false;
    syncOrionDemoToHash();
});
syncOrionDemoToHash();

orionDemoModal.addEventListener('click', (e) => {
    if (e.target === orionDemoModal) closeOrionDemo();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && orionDemoModal.classList.contains('active')) closeOrionDemo();
});
