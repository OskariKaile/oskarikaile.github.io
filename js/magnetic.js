const magneticElements = document.querySelectorAll('.magnetic');
// track which elements are pulled so we only write styles when something changes
const magneticActive = new Array(magneticElements.length).fill(true);

const activationDistance = 80;
const pullStrength = 0.4;

let magneticMouseX = 0;
let magneticMouseY = 0;
let magneticTicking = false;

function resetMagnetic(el, i) {
    if (!magneticActive[i]) return;
    magneticActive[i] = false;
    el.style.transform = 'translate(0px, 0px) scale(1)';
}

function updateMagnetic() {
    magneticTicking = false;

    if (window.innerWidth <= 768) {
        // reset on mobile in case of rotation
        magneticElements.forEach(resetMagnetic);
        return;
    }

    // read all rects first, then write — avoids layout thrashing
    const rects = Array.from(magneticElements, (el) => el.getBoundingClientRect());

    magneticElements.forEach((el, i) => {
        const rect = rects[i];

        const distanceX = magneticMouseX - (rect.left + rect.width / 2);
        const distanceY = magneticMouseY - (rect.top + rect.height / 2);

        const distance = Math.hypot(distanceX, distanceY);

        if (distance < activationDistance) {
            const power = (activationDistance - distance) / activationDistance;

            const x = distanceX * power * pullStrength;
            const y = distanceY * power * pullStrength;

            magneticActive[i] = true;
            el.style.transform = `translate(${x}px, ${y}px) scale(1.1)`;
        } else {
            resetMagnetic(el, i);
        }
    });
}

window.addEventListener(
    'mousemove',
    (e) => {
        magneticMouseX = e.clientX;
        magneticMouseY = e.clientY;

        if (!magneticTicking) {
            magneticTicking = true;
            requestAnimationFrame(updateMagnetic);
        }
    },
    { passive: true }
);
