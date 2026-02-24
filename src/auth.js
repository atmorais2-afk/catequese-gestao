import { db } from './api.js';
import { updateUIForAuth, showToast } from './ui.js';
import { initAppData } from './init.js';
import { state } from './state.js';

export async function setupAuth() {
    console.log('--- setupAuth started ---');
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('btn-logout')?.addEventListener('click', handleLogout);
    document.getElementById('btn-forgot-password')?.addEventListener('click', handleForgotPassword);

    // 1. Check for existing session immediately on load
    const { data: { session } } = await db.auth.getSession();
    console.log('[Auth] Initial getSession:', session ? 'Found' : 'None');

    if (session) {
        // Use cached role if available for immediate UI response
        const cachedRole = localStorage.getItem('catequese_role');
        const cachedCatId = localStorage.getItem('catequese_cat_id');
        if (cachedRole) {
            console.log('[Auth] Using cached role:', cachedRole);
            state.currentUserRole = cachedRole;
            state.currentCatequistaId = cachedCatId;
            updateUIForAuth(session, cachedRole);
        }

        // Refresh role and init data
        await handleSessionSync(session, 'INITIAL_SESSION');
    } else {
        updateUIForAuth(null);
    }

    // 2. Listen for auth changes
    db.auth.onAuthStateChange(async (event, session) => {
        console.log('--- Auth event triggered ---', event);
        if (session) {
            await handleSessionSync(session, event);
        } else {
            console.log('[Auth] No session, cleaning up.');
            state.currentUserRole = null;
            state.currentCatequistaId = null;
            localStorage.removeItem('catequese_role');
            localStorage.removeItem('catequese_cat_id');
            updateUIForAuth(null);
        }
    });
}

let isInitializing = false;
async function handleSessionSync(session, event) {
    if (!session) return;

    console.log('[Auth] Syncing session for event:', event);
    try {
        // Always try to fetch freshest role
        const { data, error } = await db.from('user_roles').select('*').eq('id', session.user.id).single();
        if (error && error.code !== 'PGRST116') throw error;

        const role = data?.role || 'catequista';
        const catId = data?.catequista_id || null;

        state.currentUserRole = role;
        state.currentCatequistaId = catId;

        // Persist for next refresh
        localStorage.setItem('catequese_role', role);
        if (catId) localStorage.setItem('catequese_cat_id', catId);

        updateUIForAuth(session, role);
    } catch (err) {
        console.warn('[Auth] Error fetching role, using default:', err);
        state.currentUserRole = state.currentUserRole || 'catequista';
        updateUIForAuth(session, state.currentUserRole);
    }

    if (!isInitializing && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        console.log('[Auth] Starting data initialization...');
        isInitializing = true;
        try {
            await initAppData();
            console.log('[Auth] Data initialization complete.');
        } catch (err) {
            console.error('[Auth] Initialization error:', err);
        } finally {
            isInitializing = false;
        }
    }
}


async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    if (!email) {
        showToast('Digite seu e-mail no campo acima para recuperar a senha.', 'error');
        return;
    }

    const btn = document.getElementById('btn-forgot-password');
    const originalText = btn.textContent;
    btn.textContent = 'Enviando...';
    btn.style.pointerEvents = 'none';

    try {
        const { error } = await db.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
        if (error) throw error;
        showToast('Link de recuperação enviado para o seu e-mail!');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.textContent = originalText;
        btn.style.pointerEvents = 'auto';
    }
}

// ===== AUTHENTICATION =====
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login');

    console.log('--- handleLogin started ---');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'AUTENTICANDO...';
    }

    try {
        console.log('Attempting Supabase login for:', email);
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        console.log('signInWithPassword returned successfully');
        showToast('Login realizado com sucesso!');
    } catch (err) {
        console.error('handleLogin error:', err);
        showToast(err.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Entrar no Sistema';
        }
    }
}

async function handleLogout(e) {
    if (e) e.preventDefault();
    try {
        await db.auth.signOut();
        window.location.reload();
    } catch (err) {
        console.error('Erro ao sair:', err);
        window.location.reload(); // Force reload anyway
    }
}
