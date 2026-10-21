document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('docsSidebar');
    const mobileToggle = document.getElementById('docsMobileToggle');
    const mobileOverlay = document.getElementById('docsMobileOverlay');
    const searchInput = document.getElementById('docsSearchInput');
    const backToTopBtn = document.getElementById('backToTopBtn');
    const sections = [...document.querySelectorAll('.docs-section')];
    const navLinks = [...document.querySelectorAll('.docs-nav-link')];
    const navGroupToggles = [...document.querySelectorAll('.docs-nav-group-toggle')];
    const docsContent = document.getElementById('docsContent');
    const manuallyExpandedGroups = new Set();
    let activeSectionId = sections[0]?.id || '';
    let isTransitioningSection = false;

    const escapeHtml = (value) => value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const highlightCode = () => {
        document.querySelectorAll('pre code').forEach((block) => {
            const raw = block.textContent || '';
            let html = escapeHtml(raw);
            html = html.replace(/("(?:\\.|[^"])*")/g, '<span class="token-string">$1</span>');
            html = html.replace(/\b(true|false|null)\b/g, '<span class="token-boolean">$1</span>');
            html = html.replace(/\b(POST|GET|DELETE|PUT|PATCH|Authorization|Content-Type|Bearer|curl)\b/g, '<span class="token-keyword">$1</span>');
            html = html.replace(/\b(\d+)\b/g, '<span class="token-number">$1</span>');
            block.innerHTML = html;
        });
    };

    const appendTokenStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            .token-string { color: #86efac; }
            .token-boolean { color: #f9a8d4; }
            .token-keyword { color: #7dd3fc; }
            .token-number { color: #fcd34d; }
            body.light-theme .token-string { color: #166534; }
            body.light-theme .token-boolean { color: #be185d; }
            body.light-theme .token-keyword { color: #0f766e; }
            body.light-theme .token-number { color: #92400e; }
        `;
        document.head.appendChild(style);
    };

    const showFeedback = (message) => {
        let feedback = document.querySelector('.copy-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'copy-feedback';
            document.body.appendChild(feedback);
        }
        feedback.textContent = message;
        feedback.classList.add('is-visible');
        clearTimeout(showFeedback.timer);
        showFeedback.timer = setTimeout(() => {
            feedback.classList.remove('is-visible');
        }, 1600);
    };

    const copyText = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            showFeedback('Đã sao chép vào clipboard');
        } catch (error) {
            showFeedback('Không thể sao chép');
        }
    };

    const bindCopyButtons = () => {
        document.querySelectorAll('[data-copy]').forEach((button) => {
            button.addEventListener('click', () => copyText(button.getAttribute('data-copy') || ''));
        });
    };

    const setGroupExpandedState = (group, shouldExpand) => {
        const toggle = group?.querySelector('.docs-nav-group-toggle');
        const links = group?.querySelector('.docs-nav-links');
        if (!group || !toggle || !links) return;

        group.classList.toggle('is-open', shouldExpand);
        toggle.setAttribute('aria-expanded', String(shouldExpand));
        links.classList.toggle('hidden', !shouldExpand);
    };

    const syncGroupExpansion = (activeId = activeSectionId) => {
        navGroupToggles.forEach((toggle) => {
            const group = toggle.closest('.docs-nav-group');
            const containsActive = Boolean(group?.querySelector(`.docs-nav-link[href="#${activeId}"]`));
            const shouldExpand = containsActive || manuallyExpandedGroups.has(group?.dataset.groupId || '');
            setGroupExpandedState(group, shouldExpand);
        });
    };

    const setActiveNavLink = (id) => {
        navLinks.forEach((link) => {
            const isActive = link.getAttribute('href') === `#${id}`;
            link.classList.toggle('is-active', isActive);
        });
    };

    const renderEmptyState = (shouldShow) => {
        let emptyState = document.querySelector('.docs-empty-state');
        if (shouldShow) {
            if (!emptyState) {
                emptyState = document.createElement('div');
                emptyState.className = 'docs-empty-state';
                emptyState.textContent = 'Không tìm thấy mục tài liệu phù hợp với từ khóa hiện tại.';
                docsContent?.prepend(emptyState);
            }
            return;
        }

        emptyState?.remove();
    };

    const animateSectionChange = (nextId) => {
        if (!nextId || isTransitioningSection) return;
        const nextSection = sections.find((section) => section.id === nextId);
        if (!nextSection) return;

        isTransitioningSection = true;
        docsContent?.classList.add('is-switching');

        sections.forEach((section) => {
            section.hidden = section.id !== nextId;
            section.classList.remove('section-enter-active');
        });

        renderEmptyState(false);
        nextSection.hidden = false;

        requestAnimationFrame(() => {
            nextSection.classList.add('section-enter-active');
        });

        window.setTimeout(() => {
            docsContent?.classList.remove('is-switching');
            nextSection.classList.remove('section-enter-active');
            isTransitioningSection = false;
        }, 280);
    };

    const setActiveSection = (id, options = {}) => {
        if (!id) return;
        const { scrollToTop = false, animate = true } = options;

        activeSectionId = id;
        setActiveNavLink(id);
        syncGroupExpansion(id);

        if (animate) {
            animateSectionChange(id);
        } else {
            sections.forEach((section) => {
                section.hidden = section.id !== id;
                section.classList.remove('section-enter-active');
            });
            renderEmptyState(false);
        }

        if (scrollToTop) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const filterSections = () => {
        const term = (searchInput?.value || '').trim().toLowerCase();
        let firstMatchedSectionId = '';

        sections.forEach((section) => {
            const haystack = [
                section.dataset.docTitle || '',
                section.dataset.docSearch || '',
                section.textContent || ''
            ].join(' ').toLowerCase();

            const matched = !term || haystack.includes(term);
            if (matched && !firstMatchedSectionId) {
                firstMatchedSectionId = section.id;
            }
        });

        if (!firstMatchedSectionId) {
            sections.forEach((section) => {
                section.hidden = true;
            });
            renderEmptyState(true);
            return;
        }

        setActiveSection(firstMatchedSectionId, { scrollToTop: Boolean(term), animate: false });
    };

    const closeMobileNav = () => {
        sidebar?.classList.remove('is-open');
        mobileOverlay.hidden = true;
        mobileToggle?.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    };

    const openMobileNav = () => {
        sidebar?.classList.add('is-open');
        mobileOverlay.hidden = false;
        mobileToggle?.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    };

    mobileToggle?.addEventListener('click', () => {
        const open = sidebar?.classList.contains('is-open');
        if (open) closeMobileNav();
        else openMobileNav();
    });

    mobileOverlay?.addEventListener('click', closeMobileNav);

    navLinks.forEach((link) => {
        link.addEventListener('click', () => {
            const targetId = link.getAttribute('href')?.replace('#', '');
            if (targetId) {
                setActiveSection(targetId, { scrollToTop: true, animate: true });
            }
            if (window.innerWidth <= 1024) closeMobileNav();
        });
    });

    navGroupToggles.forEach((toggle, index) => {
        const group = toggle.closest('.docs-nav-group');
        if (group && !group.dataset.groupId) {
            group.dataset.groupId = `group-${index + 1}`;
        }

        toggle.addEventListener('click', () => {
            const currentGroup = toggle.closest('.docs-nav-group');
            const groupId = currentGroup?.dataset.groupId;
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

            if (!currentGroup || !groupId) return;

            if (isExpanded) {
                manuallyExpandedGroups.delete(groupId);
                setGroupExpandedState(currentGroup, false);
                return;
            }

            manuallyExpandedGroups.add(groupId);
            setGroupExpandedState(currentGroup, true);
        });
    });

    searchInput?.addEventListener('input', filterSections);

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (event) => {
            const href = anchor.getAttribute('href');
            if (!href || href === '#') return;
            const target = document.querySelector(href);
            if (!target) return;
            event.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.replaceState(null, '', href);
        });
    });

    backToTopBtn?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', () => {
        backToTopBtn?.classList.toggle('is-visible', window.scrollY > 700);
    }, { passive: true });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) closeMobileNav();
    });

    appendTokenStyles();
    highlightCode();
    bindCopyButtons();
    filterSections();
    syncGroupExpansion(activeSectionId);
});
