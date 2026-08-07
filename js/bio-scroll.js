const container = document.querySelector('#typed-container');
const textElement = document.querySelector('#biotyped');

const text =
    'I am Oskari, a 21 year old programmer who is really into building things that actually work. I am in charge of Portawebia Oy, where I spend my days and most of my nights working on web development and software engineering. My life has not been straightforward. I have been all over the place from internships in Germany to starting my own company always trying to solve real problems with code. When I am not staring at the screen I like to look up at the sky. I am really interested in space and how things work. My big goal is to bring these two things using my programming skills to help people get to the stars.';

const wordsArray = text.split(' ');
textElement.innerHTML = wordsArray
    .map((word) => `<span class="scroll-word">${word}</span>`)
    .join(' ');

const wordElements = document.querySelectorAll('.scroll-word');

function handleScrollReveal() {
    const rect = container.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // reveal track: 80% -> 30% of viewport
    const start = windowHeight * 0.8;
    const end = windowHeight * 0.3;

    const totalDistance = start - end;
    let progress = (start - rect.top) / totalDistance;

    progress = Math.max(0, Math.min(1, progress));

    const currentWordIndex = progress * wordsArray.length;

    wordElements.forEach((word, index) => {
        const distance = index - currentWordIndex;

        if (distance < 0) {
            word.style.opacity = 1;
            word.style.filter = 'blur(0px)';
        } else if (distance < 6) {
            // blur zone — next ~6 words ahead
            const blurAmount = distance * 1.5;
            const opacityAmount = 1 - distance * 0.15;

            word.style.opacity = opacityAmount;
            word.style.filter = `blur(${blurAmount}px)`;
        } else {
            word.style.opacity = 0;
            word.style.filter = 'blur(10px)';
        }
    });
}

window.addEventListener('scroll', handleScrollReveal);

// run once in case page loads scrolled down
handleScrollReveal();
