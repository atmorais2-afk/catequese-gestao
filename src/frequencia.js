import { db } from './api.js';
import { showToast, escapeHtml } from './ui.js';
import { state } from './state.js';

function getMostRecentSunday() {
    const d = new Date();
    const day = d.getDay(); // 0 = domingo
    // Subtrai os dias da semana para chegar no domingo anterior (ou hoje se for domingo)
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - day);
    const year = sunday.getFullYear();
    const month = String(sunday.getMonth() + 1).padStart(2, '0');
    const date = String(sunday.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
}

let summaryData = [];

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

    summaryData = summary;

    const tbody = document.getElementById('table-frequencia-body');
    if (!tbody) return;

    // Sem onclick inline: usa data-action + data-id (event delegation via setupFrequenciaActions)
    tbody.innerHTML = summary.length > 0 ? summary.map(s => `
        <tr>
            <td>
                <a href="#" class="clickable-name" data-action="history" data-id="${s.id}">
                    ${escapeHtml(s.nome_completo)}
                </a>
            </td>
            <td><span class="badge ${s.tipo === 'jovem' ? 'badge-blue' : 'badge-yellow'}">${s.tipo}</span></td>
            <td><span class="badge badge-green">${s.total}</span></td>
            <td><button class="btn-edit-row" data-action="attendance" data-id="${s.id}">📅 Registrar</button></td>
        </tr>
    `).join('') : `<tr><td colspan="4" style="text-align:center; padding:1rem; color:var(--text-dim);">Nenhum resultado encontrado.</td></tr>`;
}

// Configura event delegation na tabela de frequência (chamar uma vez em app.js)
export function setupFrequenciaActions() {
    document.getElementById('table-frequencia-body')?.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action]');
        if (!el) return;
        e.preventDefault();
        const { action, id } = el.dataset;
        const entry = summaryData.find(s => s.id === id);
        if (!entry) return;

        if (action === 'attendance') openAttendanceModal(id, entry.nome_completo);
        if (action === 'history') openHistoryModal(id, entry.nome_completo);
    });
}

function openAttendanceModal(id, nome) {
    document.getElementById('att-student-id').value = id;
    document.getElementById('att-student-name').textContent = nome;
    document.getElementById('att-data').value = getMostRecentSunday();
    document.getElementById('att-observacao').value = '';
    document.getElementById('attendance-modal').style.display = 'flex';
}

export function closeAttendanceModal() {
    document.getElementById('attendance-modal').style.display = 'none';
}

async function openHistoryModal(id, nome) {
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
                <td style="font-size: 0.9rem; color: var(--text-dim);">${escapeHtml(h.observacao || '—')}</td>
            </tr>
        `).join('');
    } catch (err) {
        showToast(err.message, 'error');
        closeHistoryModal();
    }
}

export function closeHistoryModal() {
    document.getElementById('history-modal').style.display = 'none';
}

export async function submitPresenca(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-att-save');
    btn.disabled = true; btn.textContent = 'Registrando...';

    const catequisandoId = document.getElementById('att-student-id').value;
    const data = document.getElementById('att-data').value;

    try {
        // Previne presença duplicada na mesma data
        const { data: existing } = await db.from('frequencia')
            .select('id')
            .eq('catequisando_id', catequisandoId)
            .eq('data', data)
            .maybeSingle();

        if (existing) {
            showToast('Presença já registrada para esta data.', 'error');
            return;
        }

        const payload = {
            catequisando_id: catequisandoId,
            data,
            observacao: document.getElementById('att-observacao').value
        };

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
