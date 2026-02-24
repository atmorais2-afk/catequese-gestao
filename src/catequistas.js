import { db, loadSelectOptions } from './api.js';
import { showToast } from './ui.js';

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
    if (!data || !data.length) { container.innerHTML = `<p style="color:var(--text-dim)">Nenhum catequista cadastrado ainda.</p>`; return; }

    container.innerHTML = data.map(c => `
        <div class="list-item">
            <div class="list-item-info">
                <p>👤 ${c.nome}</p>
                <small>${c.email || ''} ${c.telefone ? '• ' + c.telefone : ''}</small>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-sm" onclick="window.editCatequista('${c.id}','${c.nome}','${c.email || ''}','${c.telefone || ''}')">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="window.deleteCatequista('${c.id}')">🗑️</button>
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

    window.editCatequista = (id, nome, email, telefone) => {
        document.getElementById('catequista-edit-id').value = id;
        document.getElementById('c-nome').value = nome;
        document.getElementById('c-email').value = email;
        document.getElementById('c-telefone').value = telefone;
        const btnCancel = document.getElementById('btn-cancel-catequista');
        const btnSave = document.getElementById('btn-save-catequista');
        if (btnCancel) btnCancel.style.display = 'inline-flex';
        if (btnSave) btnSave.textContent = 'Atualizar';
    };

    window.deleteCatequista = async (id) => {
        if (!confirm('Deseja excluir este catequista?')) return;
        await db.from('catequistas').delete().eq('id', id);
        showToast('Catequista removido.');
        await loadCatequistas();
    };
}
