const pipelineModal = document.getElementById('pipelineModal');
// the case study is linkable: yoursite.com/#ai-outbound-pipeline opens it
const PIPELINE_HASH = '#ai-outbound-pipeline';
let pipelineLastFocus = null;
// true only when this page added the hash, so closing never navigates away
// from a link someone opened directly
let pipelinePushedHash = false;

// before / after toggle — same behaviour as the Portawebia site
pipelineModal.querySelectorAll('.bb-frame').forEach((frame) => {
    const stack = frame.querySelector('.bb-stack');
    let wipeTimer;

    frame.querySelector('.bb-toggle').addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-bb]');
        if (!btn || btn.getAttribute('aria-selected') === 'true') return;

        frame
            .querySelectorAll('.bb-toggle button')
            .forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
        stack.style.setProperty('--w', btn.dataset.bb === 'before' ? '100%' : '0%');
        stack.classList.add('is-wiping');
        clearTimeout(wipeTimer);
        wipeTimer = setTimeout(() => stack.classList.remove('is-wiping'), 800);
    });
});

function showPipelineModal() {
    if (pipelineModal.classList.contains('active')) return;

    pipelineLastFocus = document.activeElement;
    pipelineModal.classList.add('active');
    pipelineModal.querySelector('.pipeline-body').scrollTop = 0;
    document.documentElement.classList.add('modal-open');
    pipelineModal.querySelector('.pipeline-close').focus({ preventScroll: true });
}

function hidePipelineModal() {
    pipelineModal.classList.remove('active');
    document.documentElement.classList.remove('modal-open');
    if (pipelineLastFocus) pipelineLastFocus.focus({ preventScroll: true });
}

function openPipelineModal() {
    showPipelineModal();
    // add the hash so the open case study can be copied / shared / bookmarked
    if (location.hash !== PIPELINE_HASH) {
        history.pushState(null, '', PIPELINE_HASH);
        pipelinePushedHash = true;
    }
}

function closePipelineModal() {
    hidePipelineModal();
    if (location.hash !== PIPELINE_HASH) return;

    if (pipelinePushedHash) {
        pipelinePushedHash = false;
        history.back();
    } else {
        // opened straight from a link: drop the hash without leaving the page
        history.replaceState(null, '', location.pathname + location.search);
    }
}

function copyPipelineLink(btn) {
    const url = location.origin + location.pathname + PIPELINE_HASH;
    const label = btn.querySelector('.pm-copy-text');

    const done = (text) => {
        label.textContent = text;
        btn.classList.add('copied');
        setTimeout(() => {
            label.textContent = 'Copy link';
            btn.classList.remove('copied');
        }, 2000);
    };

    navigator.clipboard?.writeText(url).then(() => done('Link copied'), () => done(url));
}

// open / close when the hash changes (links, back and forward buttons)
function syncPipelineToHash() {
    if (location.hash === PIPELINE_HASH) showPipelineModal();
    else hidePipelineModal();
}
window.addEventListener('hashchange', syncPipelineToHash);
window.addEventListener('popstate', () => {
    pipelinePushedHash = false;
    syncPipelineToHash();
});
syncPipelineToHash();

// click on the dimmed backdrop closes, clicks inside the terminal don't
pipelineModal.addEventListener('click', (e) => {
    if (e.target === pipelineModal) closePipelineModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pipelineModal.classList.contains('active')) closePipelineModal();
});
