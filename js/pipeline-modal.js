const pipelineModal = document.getElementById('pipelineModal');
let pipelineLastFocus = null;

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

function openPipelineModal() {
    pipelineLastFocus = document.activeElement;
    pipelineModal.classList.add('active');
    pipelineModal.querySelector('.pipeline-body').scrollTop = 0;
    document.documentElement.classList.add('modal-open');
    pipelineModal.querySelector('.pipeline-close').focus({ preventScroll: true });
}

function closePipelineModal() {
    pipelineModal.classList.remove('active');
    document.documentElement.classList.remove('modal-open');
    if (pipelineLastFocus) pipelineLastFocus.focus({ preventScroll: true });
}

// click on the dimmed backdrop closes, clicks inside the terminal don't
pipelineModal.addEventListener('click', (e) => {
    if (e.target === pipelineModal) closePipelineModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pipelineModal.classList.contains('active')) closePipelineModal();
});
