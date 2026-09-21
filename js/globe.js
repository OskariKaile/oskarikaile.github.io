let world, satrec;
const ISS_ID = 25544;
const issMarker = { name: 'ISS', lat: 0, lng: 0, alt: 0 };
let lastTrailUpdate = 0;
let isVisible = true;
let issEl = null;

const isMobileGlobe = window.innerWidth < 768;

// 30fps on mobile, 60 on desktop
const fpsInterval = isMobileGlobe ? 1000 / 30 : 1000 / 60;
let lastFrameTime = 0;

const latValEl = document.getElementById('lat-val');
const lngValEl = document.getElementById('lng-val');
const altValEl = document.getElementById('alt-val');
let lastDomUpdate = 0;
const DOM_UPDATE_INTERVAL = 250;

// parallax tilt from mouse
let targetLatOffset = 0;
let targetLngOffset = 0;
let currentLatOffset = 0;
let currentLngOffset = 0;

window.addEventListener('mousemove', (e) => {
    if (window.innerWidth > 768) {
        const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        const mouseY = (e.clientY / window.innerHeight) * 2 - 1;

        // cap at ~3deg either way
        targetLngOffset = mouseX * -3;
        targetLatOffset = mouseY * 3; // inverted so mouse down tilts down
    } else {
        targetLatOffset = 0;
        targetLngOffset = 0;
    }
}, { passive: true });

function getLatLngAlt(date) {
    const posVel = satellite.propagate(satrec, date);
    const gmst = satellite.gstime(date);
    const posGd = satellite.eciToGeodetic(posVel.position, gmst);
    const orbitHeight = posGd.height / 6371 + 0.015;

    return {
        lat: satellite.degreesLat(posGd.latitude),
        lng: satellite.degreesLong(posGd.longitude),
        alt: orbitHeight,
        rawHeight: posGd.height,
    };
}

function generateOrbitTrail(centerDate) {
    const trail = [];
    for (let i = -45; i <= 45; i++) {
        const d = new Date(centerDate.getTime() + i * 60000);
        const pos = getLatLngAlt(d);
        trail.push({ lat: pos.lat, lng: pos.lng, alt: pos.alt });
    }
    return trail;
}

let isTrackingISS = false;

async function initGlobe() {
    const landData = await fetch('data/ne_110m_admin_0_countries.geojson.json').then((res) =>
        res.json()
    );

    try {
        const tleData = await fetch(`https://tle.ivanstanojevic.me/api/tle/${ISS_ID}`).then((res) =>
            res.json()
        );
        satrec = satellite.twoline2satrec(tleData.line1, tleData.line2);
    } catch (e) {
        // fallback TLE if the api is down
        satrec = satellite.twoline2satrec(
            '1 25544U 98067A   24117.50000000  .00016717  00000-0  30164-3 0  9994',
            '2 25544  51.6416 281.3340 0004928  14.0044  51.2185 15.49815024450654'
        );
    }

    const globeEl = document.getElementById('hero-globe');

    world = Globe()(globeEl)
        .backgroundColor('rgba(0,0,0,0)')
        .showGlobe(true)
        .showAtmosphere(true)
        .atmosphereColor('#00ffcc')
        .atmosphereAltitude(0.2)
        .showGraticules(true)
        .polygonsData(landData.features)
        .polygonCapColor(() => 'rgba(0, 255, 204, 0.1)')
        .polygonStrokeColor(() => '#00ffcc')
        .polygonAltitude(0.01)
        .pathPoints('coords')
        .pathPointLat((p) => p.lat)
        .pathPointLng((p) => p.lng)
        .pathPointAlt((p) => p.alt)
        .pathColor(() => 'rgba(253, 122, 51, 0.5)')
        .pathStroke(1.5)
        .htmlElementsData([issMarker])
        .htmlAltitude((p) => p.alt)

        .htmlElement(() => {
            const el = document.createElement('div');
            issEl = el;
            el.style.width = '0px';
            el.style.height = '0px';
            el.style.pointerEvents = 'none';
            el.innerHTML = `
            <div style="position: absolute; top: -6px; left: -6px; display: flex; align-items: center;">
            <div style="width:12px; height:12px; background:#fd7a33; border-radius:50%; box-shadow:0 0 15px #fd7a33; animation: pulse 1.5s infinite; flex-shrink: 0;"></div>
            <div style="color:#fd7a33; font-size:10px; margin-left:10px; font-weight:bold; font-family:Orbitron; text-shadow: 0 0 5px #000; white-space: nowrap;">ISS</div>
            </div>
        `;
            return el;
        });

    world.onGlobeReady(() => {
        // small pause before the entrance so the page settles first
        setTimeout(() => {
            globeEl.classList.add('globe-ready');

            const now = new Date();
            const current = getLatLngAlt(now);

            // cinematic fly-in
            world.pointOfView(
                {
                    lat: current.lat - 20,
                    lng: current.lng,
                    altitude: 1.8,
                },
                3500
            );

            // hand off to live tracking once we arrive
            setTimeout(() => {
                isTrackingISS = true;
            }, 3500);
        }, 500);
    });

    world.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 2));

    world.controls().enableRotate = false;
    world.controls().enableZoom = false;
    world.controls().enablePan = false;

    // the globe is only ever seen inside the hero — once .is-fixed kicks in it sits
    // behind the opaque .Background layer, so watch the hero, not the globe itself.
    // pausing stops globe.gl's own WebGL render loop, not just our ISS updates
    const heroEl = globeEl.closest('.hero') || globeEl;
    const observer = new IntersectionObserver(
        ([entry]) => {
            isVisible = entry.isIntersecting;
            if (isVisible) {
                lastFrameTime = 0;
                world.resumeAnimation();
            } else {
                world.pauseAnimation();
            }
        },
        { threshold: 0 }
    );
    observer.observe(heroEl);

    const style = document.createElement('style');
    style.innerHTML = `@keyframes pulse { 0% { transform: scale(0.8); opacity: 0.6; } 50% { transform: scale(1.3); opacity: 1; } 100% { transform: scale(0.8); opacity: 0.6; } }`;
    document.head.appendChild(style);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden || !satrec) return;

        lastFrameTime = 0;
        lastTrailUpdate = 0;

        const now = new Date();
        const current = getLatLngAlt(now);

        issMarker.lat = current.lat;
        issMarker.lng = current.lng;
        issMarker.alt = current.alt;

        // kill globe.gl's wrapper transition so the marker doesn't snap-tween across the globe
        const wrapper = issEl?.parentElement;
        if (wrapper) {
            wrapper.style.transition = 'none';
            wrapper.style.willChange = 'auto';
        }

        world.htmlElementsData([issMarker]);

        if (isTrackingISS) {
            world.pointOfView(
                {
                    lat: current.lat - 20 + currentLatOffset,
                    lng: current.lng + currentLngOffset,
                    altitude: 1.8,
                },
                0
            );
        }

        // restore transition next frame
        requestAnimationFrame(() => {
            if (wrapper) wrapper.style.transition = '';
        });
    });

    requestAnimationFrame(updateFrame);
}

function updateFrame(timestamp) {
    requestAnimationFrame(updateFrame);

    if (!isVisible || !satrec) return;

    const nowTime = timestamp || performance.now();
    const elapsed = nowTime - lastFrameTime;

    if (elapsed < fpsInterval) return;

    lastFrameTime = nowTime - (elapsed % fpsInterval);

    const now = new Date();
    const current = getLatLngAlt(now);

    issMarker.lat = current.lat;
    issMarker.lng = current.lng;
    issMarker.alt = current.alt;

    if (now.getTime() - lastTrailUpdate > 60000) {
        const trailCoords = generateOrbitTrail(now);
        world.pathsData([{ coords: trailCoords }]);
        lastTrailUpdate = now.getTime();
    }

    world.htmlElementsData([issMarker]);

    if (isTrackingISS) {
        // ease mouse-parallax offset toward target
        currentLatOffset += (targetLatOffset - currentLatOffset) * 0.05;
        currentLngOffset += (targetLngOffset - currentLngOffset) * 0.05;

        world.pointOfView(
            {
                lat: current.lat - 20 + currentLatOffset,
                lng: current.lng + currentLngOffset,
                altitude: 1.8,
            },
            0
        );
    }

    if (latValEl && lngValEl && altValEl && nowTime - lastDomUpdate > DOM_UPDATE_INTERVAL) {
        latValEl.innerText = current.lat.toFixed(2);
        lngValEl.innerText = current.lng.toFixed(2);
        altValEl.innerText = Math.round(current.rawHeight) + ' KM';
        lastDomUpdate = nowTime;
    }
}

window.addEventListener('load', () => {
    setTimeout(() => {
        const script = document.createElement('script');
        script.src = 'libs/globe.gl.min.js';
        script.onload = () => initGlobe();
        document.head.appendChild(script);
    }, 0);
});
