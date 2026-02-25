import { db, loadSelectOptions } from './api.js';
import { showToast, escapeHtml } from './ui.js';

let turmasData = [];

export async function loadTurmas() {
    const container = document.getElementById('list-turmas');
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

    const { data } = await db.from('turmas').select('*').order('nome');
    turmasData = data || [];
    if (!turmasData.length) { container.innerHTML = `<p style="color:var(--text-dim)">Nenhuma turma cadastrada ainda.</p>`; return; }

    container.innerHTML = turmasData.map(t => `
        <div class="list-item">
            <div class="list-item-info">
                <p>📚 ${escapeHtml(t.nome)}</p>
                <small>${escapeHtml(t.tipo || '')} • ${escapeHtml(String(t.ano || ''))}</small>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-sm" data-action="edit" data-id="${t.id}">✏️</button>
                <button class="btn btn-danger btn-sm" data-action="delete" data-id="${t.id}">🗑️</button>
            </div>
        </div>
    `).join('');

    // Refresh selects in forms
    const jTurma = document.getElementById('j-turma');
    const aTurma = document.getElementById('a-turma');
    if (jTurma) await loadSelectOptions('turmas', jTurma);
    if (aTurma) await loadSelectOptions('turmas', aTurma);
}

export function setupTurmaCRUD() {
    document.getElementById('form-turma')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editId = document.getElementById('turma-edit-id').value;
        const payload = {
            nome: document.getElementById('t-nome').value,
            tipo: document.getElementById('t-tipo').value,
            ano: parseInt(document.getElementById('t-ano').value)
        };

        const { error } = editId
            ? await db.from('turmas').update(payload).eq('id', editId)
            : await db.from('turmas').insert([payload]);

        if (error) { showToast(error.message, 'error'); return; }

        showToast(editId ? 'Turma atualizada!' : 'Turma cadastrada!');
        e.target.reset();
        document.getElementById('turma-edit-id').value = '';
        const btnCancel = document.getElementById('btn-cancel-turma');
        if (btnCancel) btnCancel.style.display = 'none';
        await loadTurmas();
    });

    document.getElementById('btn-cancel-turma')?.addEventListener('click', () => {
        document.getElementById('form-turma').reset();
        document.getElementById('turma-edit-id').value = '';
        const btnCancel = document.getElementById('btn-cancel-turma');
        const btnSave = document.getElementById('btn-save-turma');
        if (btnCancel) btnCancel.style.display = 'none';
        if (btnSave) btnSave.textContent = 'Salvar';
    });

    // Event delegation: sem onclick inline, sem window.*
    document.getElementById('list-turmas')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const { action, id } = btn.dataset;

        if (action === 'edit') {
            const t = turmasData.find(x => x.id === id);
            if (!t) return;
            document.getElementById('turma-edit-id').value = t.id;
            document.getElementById('t-nome').value = t.nome;
            document.getElementById('t-tipo').value = t.tipo || '';
            document.getElementById('t-ano').value = t.ano || '';
            const btnCancel = document.getElementById('btn-cancel-turma');
            const btnSave = document.getElementById('btn-save-turma');
            if (btnCancel) btnCancel.style.display = 'inline-flex';
            if (btnSave) btnSave.textContent = 'Atualizar';
        }

        if (action === 'delete') {
            if (!confirm('Deseja excluir esta turma?')) return;
            const { error } = await db.from('turmas').delete().eq('id', id);
            if (error) { showToast(error.message, 'error'); return; }
            showToast('Turma removida.');
            await loadTurmas();
        }
    });
}
