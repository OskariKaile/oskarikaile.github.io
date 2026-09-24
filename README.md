# 🛰️ Oskari Kaile | Portfolio

### [Live: oskarikaile.github.io](https://oskarikaile.github.io/)

Personal portfolio of **Oskari Kaile**, full-stack developer and co-founder of [Portawebia Oy](https://www.portawebia.com/). Designed as an ISS-inspired "Command Center": live satellite tracking on a 3D globe, a terminal-style UI and spatial audio, built with no framework and tuned to stay fast on low-end devices.

---

## 📂 What's on the site

- **Projects:** Galaxy Simulation, ThreatScope and Particle Visualizer, each with a live demo and source link.
- **Featured work:** Orion (local AI voice assistant, in progress) and the **AI Outbound Pipeline**, with a full case study: architecture, before/after demo, production numbers and what broke. Direct link: [`/#ai-outbound-pipeline`](https://oskarikaile.github.io/#ai-outbound-pipeline)
- **Companies:** Portawebia Oy (co-founder) and ScanSal Oy (co-owner, head of IT).
- **Client sites:** a selection of websites shipped for Portawebia clients.
- **Experience & skills:** work history, tech stack, and AI & automation skills.

---

## 🚀 Key Systems & Engineering

### 🛰️ Live ISS Tracking
The hero card shows the **International Space Station's** live latitude, longitude and altitude.
- Fetches the ISS orbital elements (TLE) once, then computes the position **client-side with SGP4 propagation** (`satellite.js`). There's no per-second API polling.
- A built-in fallback TLE keeps tracking working if the API is down.

### 🌎 3D Globe with Orbit Trail
- **globe.gl / Three.js (WebGL)** globe with country polygons rendered from Natural Earth GeoJSON.
- The ISS marker follows its real position, with a projected orbit trail.
- Rendering pauses when the globe scrolls out of view, via `IntersectionObserver`.

### 📄 Case Study Modal
- Deep-linkable (`#ai-outbound-pipeline`), with History API handling so closing it never navigates away from a shared link.
- Accessible dialog (`role="dialog"`, `aria-modal`, focus return on close), a "copy link" button, and a before/after comparison with a wipe transition.

### 🔊 Spatial Audio
- Ambient space track with smooth fade in and out, off by default and toggled by the user.
- UI sound effects on hover and click, using global event delegation and volume normalization to prevent audio clutter.

### 🖱️ Interaction Layer
- **Magnetic elements:** vector distance (`Math.hypot`) calculations batched through `requestAnimationFrame`, and disabled on small screens.
- **Custom cursor** with LERP smoothing, only on devices with `(hover: hover)`.
- **Cursor spotlight** on cards, 3D tilt (VanillaTilt), scroll-triggered reveals and a scroll progress bar.

---

## ⚡ Performance & Accessibility

- **Idle loading:** non-critical visuals (animated tile grid, particles, constellations) start with `requestIdleCallback` after page load.
- **Device-aware:** fewer animated elements on low-end hardware (`deviceMemory` / `hardwareConcurrency`).
- **Off-screen work paused:** canvases and animations stop when out of view.
- **Respects `prefers-reduced-motion`** (smooth scroll and animated backgrounds).
- **Optimized assets:** WebP images with `srcset`, lazy loading, self-hosted `woff2` fonts with preloading.
- **Contact form:** submits asynchronously via Formspree without leaving the page.

---

## 🛠️ Tech Stack

- **Core:** HTML5, CSS3 (Flexbox / Grid), vanilla JavaScript (ES6+). No framework or build step.
- **3D & Space:** globe.gl (Three.js / WebGL), satellite.js (SGP4).
- **Motion:** Lenis (smooth scroll), VanillaTilt.js, Typed.js, particles.js, custom LERP animations.
- **Integrations:** TLE API (ISS orbital data), Formspree (contact form).
- **Deployment:** GitHub Pages.

---

## 🎨 Design

- **Palette:** Neon Cyan (`#00ffcc`) for HUD elements, Deep Space Navy (`#0a0a23`) for depth, and Rocket Orange (`#fd7a33`) for accents and the ISS.
- **Terminal UI:** cards and modals styled as terminal windows (`scansal.json`, `ai_outbound_pipeline.md`).
- **Glassmorphism:** `backdrop-filter: blur()` for semi-transparent control panels.
- **Typography:** `Orbitron` for headings, `Roboto` for body text, `Share Tech Mono` for terminal details.

---

## 📁 Repository Structure

```bash
├── css/
│   └── styles.css   # All styles
├── js/              # One module per system (globe, audio, cursor, magnetic, case-study modal, idle loading, …)
├── libs/            # Third-party libraries (globe.gl, satellite.js, Lenis, Typed, VanillaTilt, particles.js)
├── data/            # Natural Earth country GeoJSON for the globe
├── images/          # WebP images, logos and project screenshots
├── sounds/          # UI sound effects & ambient track
├── fonts/           # Self-hosted fonts (Orbitron, Roboto)
├── index.html       # Page markup
└── README.md
```
