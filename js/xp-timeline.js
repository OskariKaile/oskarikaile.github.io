// History section: builds the overview chart, the side lines (rails) and the card tags
// from the data-* attributes on each .experience-item, so adding an entry is html only
(function () {
    const section = document.getElementById('experience');
    const list = section && section.querySelector('.experience-list');
    const overview = section && section.querySelector('.xp-overview');
    if (!list || !overview) return;

    const DAY = 86400000;
    const NOW = new Date();
    const LANES = [
        { key: 'studies', name: 'Studies' },
        { key: 'work', name: 'Work' },
        { key: 'company', name: 'Company' },
    ];
    const LONG_LANES = ['studies', 'company'];

    const parse = (v) => (v === 'now' ? NOW : new Date(v + 'T00:00:00'));

    const items = [...list.querySelectorAll('.experience-item')].map((el) => ({
        el,
        card: el.querySelector('.experience-card'),
        lane: el.dataset.lane,
        start: parse(el.dataset.start),
        end: el.dataset.end ? parse(el.dataset.end) : null,
        ongoing: el.dataset.end === 'now',
        abroad: el.dataset.abroad || '',
    }));
    const entries = items.filter((it) => it.lane !== 'now');

    // "1 month", "7 weeks", "3 years", "2 yrs 5 mo"
    function duration(a, b) {
        const days = Math.round((b - a) / DAY) + 1;
        const months = days / 30.44;
        if (months >= 11.5) {
            const total = Math.round(months);
            const rest = total % 12;
            if (rest <= 1 || rest >= 11) {
                const y = Math.round(total / 12);
                return `${y} year${y > 1 ? 's' : ''}`;
            }
            return `${Math.floor(total / 12)} yr${total >= 24 ? 's' : ''} ${rest} mo`;
        }
        const whole = Math.round(months);
        if (months >= 0.9 && Math.abs(months - whole) < 0.15) return `${whole} month${whole > 1 ? 's' : ''}`;
        if (days < 63) return `${Math.max(1, Math.round(days / 7))} weeks`;
        return `${whole} months`;
    }

    const laneColor = (it) => (it.abroad ? 'var(--c-abroad)' : `var(--c-${it.lane})`);

    /* ── side rails in the list ─────────────────────────────── */
    // a studies / company entry draws a line down past every later item that
    // started before it ended; an ongoing one runs all the way to the "now" node
    entries
        .filter((it) => LONG_LANES.includes(it.lane))
        .forEach((long) => {
            const after = items.slice(items.indexOf(long) + 1);
            const covered = after.filter((it) => long.ongoing || it.start < long.end);
            if (!covered.length) return;

            const rail = (it, cls) => {
                const s = document.createElement('span');
                s.className = `xp-rail xp-rail--${long.lane} ${cls}`.trim();
                s.setAttribute('aria-hidden', 'true');
                it.el.prepend(s);
            };
            rail(long, 'is-start');
            covered.forEach((it, i) => {
                const last = i === covered.length - 1;
                rail(it, last ? (long.ongoing ? 'is-end is-open' : 'is-end') : '');
            });
        });

    /* ── tags on each card ──────────────────────────────────── */
    entries.forEach((it) => {
        it.el.style.setProperty('--lane-c', laneColor(it));

        const chips = document.createElement('div');
        chips.className = 'xp-chips';
        const chip = (text, color, cls = '') => {
            const c = document.createElement('span');
            c.className = `xp-chip ${cls}`.trim();
            c.style.setProperty('--c', color);
            c.textContent = text;
            chips.append(c);
        };

        chip(it.el.dataset.type, laneColor(it), 'is-type');
        if (it.abroad) chip(it.abroad, 'var(--c-abroad)', 'is-place');
        // data-duration overrides the worked-out length (school years don't start / end on the 1st)
        const dur = it.el.dataset.duration || duration(it.start, it.ongoing ? NOW : it.end);
        chip(it.ongoing ? `${dur} · ongoing` : dur, 'var(--c-muted)', 'is-time');

        const date = it.card.querySelector('.colored-date');
        date.after(chips);
    });

    /* ── overview chart ─────────────────────────────────────── */
    const first = Math.min(...entries.map((it) => it.start));
    const axisStart = new Date(new Date(first).getFullYear(), new Date(first).getMonth() - 2, 1);
    const axisEnd = new Date(NOW.getFullYear(), NOW.getMonth() + 3, 1);
    const pct = (d) => ((d - axisStart) / (axisEnd - axisStart)) * 100;

    const chart = overview.querySelector('.xp-chart');
    const el = (tag, cls, parent) => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (parent) parent.append(n);
        return n;
    };

    // left column: lane names
    el('span', 'xp-axis-corner', chart);
    LANES.forEach((lane) => {
        const name = el('span', 'xp-lane-name', chart);
        name.style.setProperty('--c', `var(--c-${lane.key})`);
        name.textContent = lane.name;
    });

    const track = el('div', 'xp-track', chart);

    // year bands: line at each new year, label centred in the visible part of the year
    for (let y = axisStart.getFullYear(); y <= axisEnd.getFullYear(); y++) {
        const from = Math.max(new Date(y, 0, 1), axisStart);
        const to = Math.min(new Date(y + 1, 0, 1), axisEnd);
        if (to - from < 45 * DAY) continue;
        const label = el('span', 'xp-year', track);
        label.style.left = `${(pct(from) + pct(to)) / 2}%`;
        label.textContent = y;
        if (new Date(y, 0, 1) > axisStart) {
            el('span', 'xp-gridline', track).style.left = `${pct(new Date(y, 0, 1))}%`;
        }
    }

    const rows = {};
    LANES.forEach((lane) => (rows[lane.key] = el('div', `xp-row xp-row--${lane.key}`, track)));

    const tip = el('div', 'xp-tip', overview);
    tip.setAttribute('role', 'tooltip');

    // where each bar sits, in % of the track. Short jobs are stretched to a minimum
    // length around their real middle so they read as bars, not dots; neighbours that
    // would touch are cut back to just short of the middle of the gap between them
    const MIN_BAR = 3.6;
    const BAR_GAP = 0.3;
    entries.forEach((it) => {
        it.left = pct(it.start);
        it.right = pct(it.ongoing ? NOW : it.end);
    });
    const work = entries.filter((it) => it.lane === 'work').sort((a, b) => a.start - b.start);
    const real = work.map((it) => [it.left, it.right]);
    work.forEach((it) => {
        const grow = Math.max(0, MIN_BAR - (it.right - it.left)) / 2;
        it.left -= grow;
        it.right += grow;
    });
    work.slice(1).forEach((it, i) => {
        const prev = work[i];
        const [, prevEnd] = real[i];
        const [thisStart] = real[i + 1];
        const mid = (prevEnd + thisStart) / 2;
        const gap = Math.min(BAR_GAP, (thisStart - prevEnd) / 2);
        prev.right = Math.min(prev.right, mid - gap);
        it.left = Math.max(it.left, mid + gap);
    });

    let workIndex = 0;
    entries.forEach((it, i) => {
        const bar = el('button', 'xp-bar', rows[it.lane]);
        bar.type = 'button';
        const end = it.ongoing ? NOW : it.end;
        bar.style.setProperty('--s', it.left);
        bar.style.setProperty('--w', it.right - it.left);
        bar.style.setProperty('--c', laneColor(it));
        bar.style.setProperty('--d', `${0.25 + i * 0.12}s`);
        if (it.ongoing) bar.classList.add('is-ongoing');

        const title = it.card.querySelector('h3').textContent.trim();
        const dates = it.card.querySelector('.colored-date').textContent.trim();
        const dur = it.el.dataset.duration || duration(it.start, end);
        bar.setAttribute('aria-label', `${title}, ${dates}. Jump to details`);

        const label = el('span', 'xp-bar-label', bar);
        label.textContent = it.el.dataset.label;
        // short bars put their label above / below, alternating so neighbours don't collide
        if (it.lane === 'work') label.classList.add(workIndex++ % 2 ? 'is-below' : 'is-above');

        it.bar = bar;
        it.tip = { title, dates, dur: it.ongoing ? `${dur} so far` : dur };

        bar.addEventListener('mouseenter', () => showTip(it));
        bar.addEventListener('focus', () => showTip(it));
        bar.addEventListener('mouseleave', hideTip);
        bar.addEventListener('blur', hideTip);
        bar.addEventListener('click', () => jumpTo(it));

        // hovering a card lights its bar up too
        it.card.addEventListener('mouseenter', () => bar.classList.add('is-linked'));
        it.card.addEventListener('mouseleave', () => bar.classList.remove('is-linked'));
    });

    const nowLine = el('span', 'xp-now-line', track);
    nowLine.style.left = `${pct(NOW)}%`;
    el('span', 'xp-now-label', nowLine).textContent = 'Now';

    function showTip(it) {
        tip.innerHTML = '';
        el('strong', '', tip).textContent = it.tip.title;
        el('span', '', tip).textContent = it.tip.dates;
        const d = el('span', 'xp-tip-dur', tip);
        d.textContent = it.tip.dur;
        d.style.setProperty('--c', laneColor(it));

        const box = overview.getBoundingClientRect();
        const b = it.bar.getBoundingClientRect();
        tip.classList.add('is-on');
        const half = tip.offsetWidth / 2;
        const x = Math.min(Math.max(b.left + b.width / 2 - box.left, half + 8), box.width - half - 8);
        tip.style.left = `${x}px`;
        tip.style.top = `${b.top - box.top}px`;
        it.el.classList.add('xp-linked');
    }

    function hideTip() {
        tip.classList.remove('is-on');
        entries.forEach((it) => it.el.classList.remove('xp-linked'));
    }

    function jumpTo(it) {
        hideTip();
        const offset = -Math.round(window.innerHeight * 0.25);
        if (window.lenis) window.lenis.scrollTo(it.el, { offset });
        else window.scrollTo({ top: it.el.getBoundingClientRect().top + window.scrollY + offset, behavior: 'smooth' });

        it.el.classList.remove('xp-flash');
        void it.el.offsetWidth; // restart the animation if clicked twice
        it.el.classList.add('xp-flash');
    }

    overview.hidden = false;

    // chart bars grow in / the "now" line draws in on scroll, same in / out rule as fade-in.js
    const reveal = new IntersectionObserver(
        (seen) =>
            seen.forEach((e) => {
                if (e.isIntersecting) e.target.classList.add('animate');
                else if (e.boundingClientRect.top > 0) e.target.classList.remove('animate');
            }),
        { threshold: 0.25 }
    );
    reveal.observe(overview);
    items.filter((it) => it.lane === 'now').forEach((it) => reveal.observe(it.el));

    /* ── lines draw in one after another ────────────────────── */
    // each item's piece of the main line and side lines only starts once the piece
    // above has reached it, so the line never shows a gap. Everything down to the
    // lowest card in view gets drawn (also the ones a chart jump scrolled past)
    const SPEED = 420; // px per second, doubled while catching up on several pieces
    const shown = (it) => (it.card || it.el).classList.contains('animate');
    let drawn = 0; // items[0 .. drawn-1] have their lines
    let timer = null;

    function sync() {
        let target = -1;
        items.forEach((it, i) => shown(it) && (target = i));

        // scrolled back up: lines below the last card in view go away
        if (drawn > target + 1) {
            clearTimeout(timer);
            timer = null;
            items.slice(target + 1).forEach((it) => it.el.classList.remove('xp-drawn'));
            drawn = target + 1;
        }
        if (timer || drawn > target) return;

        const it = items[drawn++];
        const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
        const speed = target - drawn > 1 ? SPEED * 2 : SPEED;
        const secs = Math.min(Math.max((it.el.offsetHeight + gap) / speed, 0.25), 0.9);
        it.el.style.setProperty('--draw', `${secs}s`);
        it.el.classList.add('xp-drawn');
        timer = setTimeout(() => {
            timer = null;
            sync();
        }, secs * 1000);
    }

    const watch = new MutationObserver(sync);
    items.forEach((it) => watch.observe(it.card || it.el, { attributes: true, attributeFilter: ['class'] }));
    sync();
})();
