import { db, loadSelectOptions } from './api.js';
import { showToast, escapeHtml } from './ui.js';

let catequistasData = [];

export async function loadCatequistas() {
    const container = document.getElementById('list-catequistas');
    if (container) {
        container.innerHTML = Array(3).fill(0).map(() => `
            <div class="list-item">
                <div class="list-item-info" style="width: 100%">
                    <div class="skeleton" style="width: 60%; margin-bottom: 4px;"></div>
                    <div class="skeleton" style="width: 40%;"></div>
                </div>
            </div>
        `).join('');
    }

    const { data } = await db.from('catequistas').select('*').order('nome');
    catequistasData = data || [];
    if (!catequistasData.length) { container.innerHTML = `<p style="color:var(--text-dim)">Nenhum catequista cadastrado ainda.</p>`; return; }

    container.innerHTML = catequistasData.map(c => `
        <div class="list-item">
            <div class="list-item-info">
                <p>👤 ${escapeHtml(c.nome)}</p>
                <small>${escapeHtml(c.email || '')} ${c.telefone ? '• ' + escapeHtml(c.telefone) : ''}</small>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-sm" data-action="edit" data-id="${c.id}">✏️</button>
                <button class="btn btn-danger btn-sm" data-action="delete" data-id="${c.id}">🗑️</button>
            </div>
        </div>
    `).join('');

    // Refresh selects in forms
    const jCat = document.getElementById('j-catequista');
    const aCat = document.getElementById('a-catequista');
    if (jCat) await loadSelectOptions('catequistas', jCat);
    if (aCat) await loadSelectOptions('catequistas', aCat);
}

export function setupCatequistaCRUD() {
    document.getElementById('form-catequista')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('catequista-edit-id').value;
        const payload = {
            nome: document.getElementById('c-nome').value,
            email: document.getElementById('c-email').value,
            telefone: document.getElementById('c-telefone').value
        };

        const { error } = editId
            ? await db.from('catequistas').update(payload).eq('id', editId)
            : await db.from('catequistas').insert([payload]);

        if (error) { showToast(error.message, 'error'); return; }

        showToast(editId ? 'Catequista atualizado!' : 'Catequista cadastrado!');
        e.target.reset();
        document.getElementById('catequista-edit-id').value = '';
        const btnCancel = document.getElementById('btn-cancel-catequista');
        if (btnCancel) btnCancel.style.display = 'none';
        await loadCatequistas();
    });

    document.getElementById('btn-cancel-catequista')?.addEventListener('click', () => {
        document.getElementById('form-catequista').reset();
        document.getElementById('catequista-edit-id').value = '';
        const btnCancel = document.getElementById('btn-cancel-catequista');
        const btnSave = document.getElementById('btn-save-catequista');
        if (btnCancel) btnCancel.style.display = 'none';
        if (btnSave) btnSave.textContent = 'Salvar';
    });

    // Event delegation: sem onclick inline, sem window.*
    document.getElementById('list-catequistas')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const { action, id } = btn.dataset;

        if (action === 'edit') {
            const c = catequistasData.find(x => x.id === id);
            if (!c) return;
            document.getElementById('catequista-edit-id').value = c.id;
            document.getElementById('c-nome').value = c.nome;
            document.getElementById('c-email').value = c.email || '';
            document.getElementById('c-telefone').value = c.telefone || '';
            const btnCancel = document.getElementById('btn-cancel-catequista');
            const btnSave = document.getElementById('btn-save-catequista');
            if (btnCancel) btnCancel.style.display = 'inline-flex';
            if (btnSave) btnSave.textContent = 'Atualizar';
        }

        if (action === 'delete') {
            if (!confirm('Deseja excluir este catequista?')) return;
            const { error } = await db.from('catequistas').delete().eq('id', id);
            if (error) { showToast(error.message, 'error'); return; }
            showToast('Catequista removido.');
            await loadCatequistas();
        }
    });
}
