import { db } from './api.js';
import { showToast } from './ui.js';
import { state } from './state.js';

function getMostRecentSunday() {
    const d = new Date();
    const day = d.getDay(); // 0 is Sunday
    const diff = d.getDate() - day;
    const sunday = new Date(d.getFullYear(), d.getMonth(), diff);
    // Return YYYY-MM-DD string in local time
    const year = sunday.getFullYear();
    const month = String(sunday.getMonth() + 1).padStart(2, '0');
    const date = String(sunday.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
}

export async function loadPresencaResumo() {
    const searchTerm = document.getElementById('f-search')?.value.toLowerCase() || '';
    const sortOrder = document.getElementById('f-sort')?.value || 'desc';

    let query = db.from('catequisandos').select('id, nome_completo, tipo');
    if (state.currentUserRole === 'catequista' && state.currentCatequistaId) {
        query = query.eq('catequista_id', state.currentCatequistaId);
    }

    const { data: alunos } = await query;
    const { data: presencas } = await db.from('frequencia').select('catequisando_id');

    let summary = (alunos || []).map(a => ({
        ...a,
        total: (presencas || []).filter(p => p.catequisando_id === a.id).length
    }));

    // Search filter
    if (searchTerm) {
        summary = summary.filter(s => s.nome_completo.toLowerCase().includes(searchTerm));
    }

    // Sort
    summary.sort((a, b) => {
        return sortOrder === 'desc' ? b.total - a.total : a.total - b.total;
    });

    const tbody = document.getElementById('table-frequencia-body');
    if (!tbody) return;

    tbody.innerHTML = summary.length > 0 ? summary.map(s => `
        <tr>
            <td>
                <a href="#" class="clickable-name" onclick="window.openHistoryModal('${s.id}', '${s.nome_completo}')">
                    ${s.nome_completo}
                </a>
            </td>
            <td><span class="badge ${s.tipo === 'jovem' ? 'badge-blue' : 'badge-yellow'}">${s.tipo}</span></td>
            <td><span class="badge badge-green">${s.total}</span></td>
            <td><button class="btn-edit-row" onclick="window.openAttendanceModal('${s.id}', '${s.nome_completo}')">📅 Registrar</button></td>
        </tr>
    `).join('') : `<tr><td colspan="4" style="text-align:center; padding:1rem; color:var(--text-dim);">Nenhum resultado encontrado.</td></tr>`;
}

window.openAttendanceModal = (id, nome) => {
    document.getElementById('att-student-id').value = id;
    document.getElementById('att-student-name').textContent = nome;
    document.getElementById('att-data').value = getMostRecentSunday();
    document.getElementById('att-observacao').value = '';
    document.getElementById('attendance-modal').style.display = 'flex';
};

export function closeAttendanceModal() {
    document.getElementById('attendance-modal').style.display = 'none';
}

window.openHistoryModal = async (id, nome) => {
    document.getElementById('hist-student-name').textContent = nome;
    const tbody = document.getElementById('table-history-body');
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:1rem;">Carregando histórico...</td></tr>';
    document.getElementById('history-modal').style.display = 'flex';

    try {
        const { data, error } = await db.from('frequencia')
            .select('data, observacao')
            .eq('catequisando_id', id)
            .order('data', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:1rem;">Nenhuma presença registrada.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(h => `
            <tr>
                <td>${new Date(h.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td style="font-size: 0.9rem; color: var(--text-dim);">${h.observacao || '—'}</td>
            </tr>
        `).join('');
    } catch (err) {
        showToast(err.message, 'error');
        closeHistoryModal();
    }
};

export function closeHistoryModal() {
    document.getElementById('history-modal').style.display = 'none';
}

export async function submitPresenca(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-att-save');
    btn.disabled = true; btn.textContent = 'Registrando...';

    const payload = {
        catequisando_id: document.getElementById('att-student-id').value,
        data: document.getElementById('att-data').value,
        observacao: document.getElementById('att-observacao').value
    };

    try {
        const { error } = await db.from('frequencia').insert([payload]);
        if (error) throw error;
        showToast('Presença registrada!');
        closeAttendanceModal();
        await loadPresencaResumo();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = '✅ Confirmar Presença';
    }
}

export function exportFrequenciaExcel() {
    if (!window.XLSX) {
        showToast('Biblioteca de exportação não carregada.', 'error');
        return;
    }

    const table = document.getElementById('table-frequencia-body');
    if (!table || table.rows.length === 0 || table.rows[0].cells.length === 1) {
        showToast('Nenhum dado para exportar.', 'error');
        return;
    }

    // Clone table to manipulate
    const tableClone = document.createElement('table');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>Nome</th><th>Tipo</th><th>Presenças</th>';
    tableClone.appendChild(headerRow);

    Array.from(table.rows).forEach(r => {
        const newRow = document.createElement('tr');
        const nome = r.cells[0].innerText.trim();
        const tipo = r.cells[1].innerText.trim();
        const presencas = r.cells[2].innerText.trim();
        newRow.innerHTML = `<td>${nome}</td><td>${tipo}</td><td>${presencas}</td>`;
        tableClone.appendChild(newRow);
    });

    const wb = XLSX.utils.table_to_book(tableClone, { sheet: "Frequência" });
    XLSX.writeFile(wb, `Frequencia_Catequese_${new Date().toLocaleDateString('pt-BR')}.xlsx`);
}
