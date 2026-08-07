const music = document.getElementById('bg-music');
const wave = document.getElementById('wave-container');
const statusText = document.getElementById('audio-status');
const audioControl = document.querySelector('.audio-control');
let statusTimeout;
let fadeInterval;

music.volume = 0;

function toggleMusic() {
    const fadeDuration = 1000;
    const targetMaxVolume = 0.05;
    const step = 0.01;
    const intervalTime = fadeDuration / (targetMaxVolume / step);

    clearInterval(fadeInterval);

    if (music.paused) {
        music.play();
        wave.classList.add('playing');
        statusText.innerText = 'SOUND: ON';
        audioControl.setAttribute('aria-pressed', 'true');

        fadeInterval = setInterval(() => {
            if (music.volume < targetMaxVolume) {
                music.volume = Math.min(targetMaxVolume, music.volume + step);

                let progress = music.volume / targetMaxVolume;
                wave.style.setProperty('--wave-scale', 0.33 + progress * 0.67);
            } else {
                clearInterval(fadeInterval);
            }
        }, intervalTime);
    } else {
        statusText.innerText = 'SOUND: OFF';
        audioControl.setAttribute('aria-pressed', 'false');

        fadeInterval = setInterval(() => {
            if (music.volume > 0.01) {
                music.volume = Math.max(0, music.volume - step);

                let progress = music.volume / targetMaxVolume;
                wave.style.setProperty('--wave-scale', 0.33 + progress * 0.67);
            } else {
                music.pause();
                wave.classList.remove('playing');
                wave.style.setProperty('--wave-scale', 1);
                clearInterval(fadeInterval);
            }
        }, intervalTime);
    }

    if (window.innerWidth <= 768) {
        clearTimeout(statusTimeout);
        statusText.classList.add('mobile-visible');
        statusTimeout = setTimeout(() => {
            statusText.classList.remove('mobile-visible');
        }, 3000);
    }
}

// role="button" needs Enter/Space to actually work like one
audioControl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleMusic();
    }
});

const sfxHover = new Audio('/sounds/255764__andreasmustola__mouse-hover.mp3');
const sfxClick = new Audio('/sounds/702168__foxfire__click-tick-menu-navigation.wav');

sfxHover.volume = 1;
sfxClick.volume = 1;

function playSFX(audio) {
    if (!music.paused) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }
}
window.addEventListener('mouseover', (e) => {
    const target = e.target.closest('.sfx-hover');
    const from = e.relatedTarget ? e.relatedTarget.closest('.sfx-hover') : null;

    // only fire when entering a new sfx-hover, not when moving within one
    if (target && target !== from) {
        playSFX(sfxHover);
    }
});

window.addEventListener('click', (e) => {
    if (e.target.closest('.sfx-click')) {
        playSFX(sfxClick);
    }
});
