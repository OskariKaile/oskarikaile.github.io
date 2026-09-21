const dot = document.querySelector('.cursor-dot');
const outline = document.querySelector('.cursor-outline');

// bail on touch/coarse pointer — cursor is hidden in CSS there, no point burning rAF
const supportsFineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
if (!supportsFineHover || !dot || !outline) {
    // no-op
} else {

let mouseX = 0,
    mouseY = 0;
let outlineX = 0,
    outlineY = 0;
let cursorLoopRunning = false;

// position via the `translate` property: it stacks with the css `transform`
// (centering + hover scale) and moves on the compositor instead of re-running layout
window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    // dot follows the mouse 1:1 for instant feedback
    dot.style.translate = `${mouseX}px ${mouseY}px`;

    if (!cursorLoopRunning) {
        cursorLoopRunning = true;
        requestAnimationFrame(animateCursor);
    }
}, { passive: true });

function animateCursor() {
    // lerp — 0.15 lands between smooth and snappy
    outlineX += (mouseX - outlineX) * 0.15;
    outlineY += (mouseY - outlineY) * 0.15;

    outline.style.translate = `${outlineX}px ${outlineY}px`;

    // park the loop once the ring has caught up — restarts on next mousemove
    if (Math.abs(mouseX - outlineX) < 0.1 && Math.abs(mouseY - outlineY) < 0.1) {
        cursorLoopRunning = false;
        return;
    }
    requestAnimationFrame(animateCursor);
}

document.addEventListener('mouseleave', () => {
    dot.style.opacity = '0';
    outline.style.opacity = '0';
});
document.addEventListener('mouseenter', () => {
    dot.style.opacity = '1';
    outline.style.opacity = '1';
});

// one delegated listener instead of binding every interactive element
window.addEventListener('mouseover', (e) => {
    const isInteractive = e.target.closest('a, button, .magnetic, input, textarea, .lang-item, .social-mini-link');
    document.body.classList.toggle('cursor-active', !!isInteractive);
}, { passive: true });

window.addEventListener('mousedown', () => {
    dot.style.transform = 'translate(-50%, -50%) scale(0.7)';
    outline.style.transform = 'translate(-50%, -50%) scale(0.8)';
    outline.style.borderColor = '#fd7a33';
});

window.addEventListener('mouseup', () => {
    dot.style.transform = '';
    outline.style.transform = '';
    outline.style.borderColor = 'rgba(0, 255, 204, 0.5)';
});

}
