import { db, loadSelectOptions } from './api.js';
import { showToast } from './ui.js';

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
    if (!data || !data.length) { container.innerHTML = `<p style="color:var(--text-dim)">Nenhuma turma cadastrada ainda.</p>`; return; }

    container.innerHTML = data.map(t => `
        <div class="list-item">
            <div class="list-item-info">
                <p>📚 ${t.nome}</p>
                <small>${t.tipo || ''} • ${t.ano || ''}</small>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-sm" onclick="window.editTurma('${t.id}','${t.nome}','${t.tipo || ''}','${t.ano || ''}')">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="window.deleteTurma('${t.id}')">🗑️</button>
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

    window.editTurma = (id, nome, tipo, ano) => {
        document.getElementById('turma-edit-id').value = id;
        document.getElementById('t-nome').value = nome;
        document.getElementById('t-tipo').value = tipo;
        document.getElementById('t-ano').value = ano;
        const btnCancel = document.getElementById('btn-cancel-turma');
        const btnSave = document.getElementById('btn-save-turma');
        if (btnCancel) btnCancel.style.display = 'inline-flex';
        if (btnSave) btnSave.textContent = 'Atualizar';
    };

    window.deleteTurma = async (id) => {
        if (!confirm('Deseja excluir esta turma?')) return;
        await db.from('turmas').delete().eq('id', id);
        showToast('Turma removida.');
        await loadTurmas();
    };
}
