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
let isWarm = false;

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
// globe.gl applies data changes on a short debounce, not synchronously
const afterDigest = () => new Promise((resolve) => setTimeout(resolve, 30));

// meshing cost grows with a country's area (its fill is a grid of points), so
// batches are sized by rough area: big countries get a frame to themselves,
// dozens of small ones share one
const BATCH_AREA = 1500; // square degrees of bounding box
const BATCH_MAX = 12;

function ringsOf(geometry) {
    const polys = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
    return polys.flat();
}

function bboxArea(geometry) {
    let minX = 180, maxX = -180, minY = 90, maxY = -90;
    for (const ring of ringsOf(geometry)) {
        for (const [x, y] of ring) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
    return (maxX - minX) * (maxY - minY);
}

// antarctica's outline wraps right round the south pole, which forces globe.gl
// onto a far slower spherical triangulation (~150ms for that one shape). its
// fill is built from a west and an east half that stop just short of the pole
// instead, and its coast is drawn as a line so the cut between them never shows
const POLE_LAT = -88.9;
let coastPaths = [];

function polarEdge(fromLng, toLng) {
    const pts = [];
    const dir = Math.sign(toLng - fromLng);
    for (let lng = fromLng; dir * (toLng - lng) > 0; lng += dir * 10) pts.push([lng, POLE_LAT]);
    pts.push([toLng, POLE_LAT]);
    return pts;
}

function splitAntarctica(features) {
    const ant = features.find((f) => f.properties.NAME === 'Antarctica');
    const polys = ant ? ant.geometry.coordinates : [];
    const mainIdx = polys.findIndex((poly) => poly[0].some(([, y]) => y <= -89.9));
    if (mainIdx === -1) return features;

    // the ring runs the coast from -180 to 180 and closes back along the pole;
    // rotate it to start at -180 and keep just the coast
    const ring = polys[mainIdx][0].slice(0, -1);
    const start = ring.findIndex(([x, y], i) => x === -180 && y > -89.9 && ring[(i || ring.length) - 1][1] <= -89.9);
    const coast = ring.slice(start).concat(ring.slice(0, start)).filter(([, y]) => y > -89.9);
    const cut = coast.findIndex(([x], i) => i > 0 && coast[i - 1][0] < 0 && x >= 0);
    if (start === -1 || cut === -1) return features;

    const [x0, y0] = coast[cut - 1];
    const [x1, y1] = coast[cut];
    const mid = [0, y0 + ((y1 - y0) * -x0) / (x1 - x0)];
    const west = [...coast.slice(0, cut), mid, ...polarEdge(0, -180), coast[0]];
    const east = [mid, ...coast.slice(cut), ...polarEdge(180, 0), mid];

    coastPaths = [{ coast: true, coords: coast.map(([lng, lat]) => ({ lat, lng, alt: 0.01 })) }];
    const fill = (outline) => ({ type: 'Feature', properties: ant.properties, fillOnly: true, geometry: { type: 'Polygon', coordinates: [outline] } });
    const islands = { ...ant, geometry: { type: 'MultiPolygon', coordinates: polys.filter((_, i) => i !== mainIdx) } };
    return features.flatMap((f) => (f === ant ? [islands, fill(west), fill(east)] : [f]));
}

function batchByArea(features) {
    const batches = [];
    let batch = [];
    let area = 0;
    for (const f of features) {
        const a = bboxArea(f.geometry);
        if (batch.length && (area + a > BATCH_AREA || batch.length >= BATCH_MAX)) {
            batches.push(batch);
            batch = [];
            area = 0;
        }
        batch.push(f);
        area += a;
    }
    if (batch.length) batches.push(batch);
    return batches;
}

async function warmUp(features) {
    // one batch of countries plus the orbit trail puts every material type in
    // the scene, so compileAsync can build all the shaders without blocking
    const batches = batchByArea(splitAntarctica(features));
    const shown = [...batches[0]];
    world.polygonsData(shown);
    const now = new Date();
    world.pathsData([{ coords: generateOrbitTrail(now) }, ...coastPaths]);
    lastTrailUpdate = now.getTime();
    await afterDigest();

    const renderer = world.renderer();
    if (renderer.compileAsync) {
        try {
            await renderer.compileAsync(world.scene(), world.camera());
        } catch (e) {
            // fall back to compiling on first render
        }
    }

    isWarm = true;
    if (isVisible) world.resumeAnimation();

    for (let i = 1; i < batches.length; i++) {
        await nextFrame();
        shown.push(...batches[i]);
        world.polygonsData(shown.slice());
    }
    await afterDigest();
}

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
        .polygonsData([])
        // countries are streamed in by warmUp(), and the rise-in tween would
        // rebuild every country mesh each frame for a second
        .polygonsTransitionDuration(0)
        .polygonCapColor(() => 'rgba(0, 255, 204, 0.1)')
        .polygonSideColor((d) => (d.fillOnly ? null : '#ffffaa'))
        .polygonStrokeColor((d) => (d.fillOnly ? null : '#00ffcc'))
        .polygonAltitude(0.01)
        .pathPoints('coords')
        .pathPointLat((p) => p.lat)
        .pathPointLng((p) => p.lng)
        .pathPointAlt((p) => p.alt)
        .pathColor((d) => (d.coast ? '#00ffcc' : 'rgba(253, 122, 51, 0.5)'))
        .pathStroke((d) => (d.coast ? null : 1.5))
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

    // the hero orbit field reads the camera from here so it can spin with the globe
    window.heroGlobe = world;

    // building all 177 country meshes, compiling their shaders and uploading
    // them in one go froze the page for ~0.5s a few seconds after load. so:
    // hold rendering, compile shaders off the main thread, then add the
    // countries a few per frame, and only reveal the globe once it's all in
    world.pauseAnimation();
    const globeReady = new Promise((resolve) => world.onGlobeReady(resolve));

    Promise.all([globeReady, warmUp(landData.features)]).then(() => {
        // small pause before the entrance so the page settles first
        setTimeout(() => {
            globeEl.classList.add('globe-ready');
            window.dispatchEvent(new Event('globe:ready'));

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
                if (isWarm) world.resumeAnimation();
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
        world.pathsData([{ coords: trailCoords }, ...coastPaths]);
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
