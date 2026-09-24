const container = document.querySelector('#typed-container');
const textElement = document.querySelector('#biotyped');

const text =
    'I am Oskari, a full-stack developer who is really into building things that actually work. I co-founded Portawebia Oy, where I spend my days and most of my nights building websites, software and AI automation for businesses. My life has not been straightforward. I have been all over the place from internships in Germany to starting my own company always trying to solve real problems with code. When I am not staring at the screen I like to look up at the sky. I am really interested in space and how things work. My big goal is to bring these two things using my programming skills to help people get to the stars.';

const wordsArray = text.split(' ');
textElement.innerHTML = wordsArray
    .map((word) => `<span class="scroll-word">${word}</span>`)
    .join(' ');

const wordElements = document.querySelectorAll('.scroll-word');
// last applied state per word — only touch the DOM when it actually changes
const wordState = new Array(wordElements.length).fill(-1);

let ticking = false;
let inView = true;

function applyWord(index, state) {
    if (wordState[index] === state) return;
    wordState[index] = state;

    const word = wordElements[index];
    if (state === 0) {
        word.style.opacity = 1;
        word.style.filter = 'none';
    } else if (state === 100) {
        word.style.opacity = 0;
        word.style.filter = 'blur(10px)';
    } else {
        // blur zone — state is distance * 10, rounded so tiny scroll deltas don't repaint
        const distance = state / 10;
        word.style.opacity = 1 - distance * 0.15;
        word.style.filter = `blur(${distance * 1.5}px)`;
    }
}

function handleScrollReveal() {
    ticking = false;

    const rect = container.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // reveal track: 80% -> 30% of viewport
    const start = windowHeight * 0.8;
    const end = windowHeight * 0.3;

    let progress = (start - rect.top) / (start - end);
    progress = Math.max(0, Math.min(1, progress));

    const currentWordIndex = progress * wordsArray.length;

    for (let i = 0; i < wordElements.length; i++) {
        const distance = i - currentWordIndex;

        if (distance < 0) applyWord(i, 0);
        else if (distance < 6) applyWord(i, Math.max(1, Math.round(distance * 10)));
        else applyWord(i, 100);
    }
}

function requestReveal() {
    if (!ticking && inView) {
        ticking = true;
        requestAnimationFrame(handleScrollReveal);
    }
}

new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    // one last pass when leaving so words settle in their final state
    ticking = true;
    requestAnimationFrame(handleScrollReveal);
}).observe(container);

window.addEventListener('scroll', requestReveal, { passive: true });

// run once in case page loads scrolled down
handleScrollReveal();
