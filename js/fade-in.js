document.addEventListener('DOMContentLoaded', () => {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                } else {
                    if (entry.boundingClientRect.top > 0) {
                        entry.target.classList.remove('animate');
                    }
                }
            });
        },
        { threshold: 0.1 }
    );

    const selectors =
        '.sh-line,.fade-in, h2, .btn, .avatar, .bio p, .project-card, .experience-card, .languages, .company-logo, .logo-cluster-container, .terminal-window, .contact form';

    document.querySelectorAll(selectors).forEach((element) => {
        observer.observe(element);
    });

    // stagger via css var so transition-delay stays composable.
    // counted per grid: a page-wide index left later cards waiting ~0.7s
    const cardIndex = new Map();
    document.querySelectorAll('.project-card').forEach((card) => {
        const index = cardIndex.get(card.parentElement) || 0;
        cardIndex.set(card.parentElement, index + 1);
        card.style.setProperty('--stagger-delay', `${index * 0.1}s`);
    });

    // own var name: --stagger-delay is inherited and would leak into the card's pills
    document.querySelectorAll('.company-card').forEach((card, index) => {
        card.style.setProperty('--co-delay', `${index * 0.18}s`);
    });

    // pop groups: icons/pills pop in one by one when their group scrolls into view.
    // delay counts per group, so items deep in the page aren't left waiting
    const popGroups = [
        { group: '.skills', item: 'span', base: 0.1, step: 0.045 },
        { group: '.social-links-container, .social-links-container_avatar', item: '.social-icon', base: 0.2, step: 0.12 },
        { group: '.experience-company-logo_container', item: ':scope > *', base: 0.3, step: 0 },
    ];

    const popObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('popped');
                } else if (entry.boundingClientRect.top > 0) {
                    entry.target.classList.remove('popped');
                }
            });
        },
        { threshold: 0.1 }
    );

    popGroups.forEach(({ group, item, base, step }) => {
        document.querySelectorAll(group).forEach((el) => {
            // company cards run their own cascade
            if (el.closest('.company-card')) return;
            el.classList.add('pop-group');
            el.style.setProperty('--pop-base', `${base}s`);
            el.querySelectorAll(item).forEach((child, i) => {
                child.classList.add('pop-item');
                child.style.setProperty('--pop-delay', `${i * step}s`);
            });
            popObserver.observe(el);
        });
    });
});
