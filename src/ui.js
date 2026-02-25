// ===== ESCAPE HTML =====
export function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ===== TOAST =====
export function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = (type === 'success' ? '✅ ' : '❌ ') + msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.className = 'toast'; }, 4000);
}

// ===== ERRORS =====
window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.error('ERRO GLOBAL:', msg, url, lineNo, error);
    // showToast('Erro no sistema: ' + msg, 'error');
    return false;
};

// ===== NAVIGATION =====
export function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = item.getAttribute('data-page');
            console.log(`[Navigation] Clicked: ${target}`);
            if (!target) {
                console.warn('[Navigation] Item clicked but no data-page found:', item);
                return;
            }

            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            item.classList.add('active');
            const targetPage = document.getElementById(`page-${target}`);
            if (targetPage) {
                console.log(`[Navigation] Activating page: page-${target}`);
                targetPage.classList.add('active');
            } else {
                console.error(`[Navigation] Page not found: page-${target}`);
            }

            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });

    document.getElementById('mobile-menu-toggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);
}

export function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('sidebar-open');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

export function closeSidebar() {
    document.querySelector('.sidebar').classList.remove('sidebar-open');
    document.getElementById('sidebar-overlay').classList.remove('active');
}

export function updateUIForAuth(session, role = null) {
    console.log('--- updateUIForAuth started ---', { hasSession: !!session, role });
    const loginOverlay = document.getElementById('login-overlay');
    const appContainer = document.getElementById('app-container');
    const loadingOverlay = document.getElementById('loading-overlay');

    if (session) {
        console.log('Session detected, hiding login overlay...');
        if (loginOverlay) loginOverlay.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
        document.body.classList.remove('not-auth');

        // RBAC UI Elements
        const adminSection = document.getElementById('admin-section');
        const adminElements = document.querySelectorAll('.admin-only');
        if (role === 'admin') {
            document.body.classList.add('is-admin');
            if (adminSection) adminSection.style.display = 'block';
            adminElements.forEach(el => el.style.display = '');
        } else {
            document.body.classList.remove('is-admin');
            if (adminSection) adminSection.style.display = 'none';
            adminElements.forEach(el => el.style.display = 'none');
        }
    } else {
        loginOverlay.style.display = 'flex';
        appContainer.style.display = 'none';
        document.body.classList.add('not-auth');
        document.body.classList.remove('is-admin');
    }
    if (loadingOverlay) loadingOverlay.style.display = 'none';
}
