import { db } from './api.js';
import { state } from './state.js';

let currentAlunos = [];
let currentPage = 1;
const pageSize = 10;
let currentFilter = 'all';
let currentSearch = '';

export async function loadDashboardData() {
    const tbody = document.getElementById('table-body');
    if (tbody) {
        tbody.innerHTML = Array(5).fill(0).map(() => `
            <tr>
                <td><div class="student-cell"><div class="skeleton-avatar"></div><div class="skeleton" style="width:120px"></div></div></td>
                <td><div class="skeleton" style="width:60px"></div></td>
                <td><div class="skeleton" style="width:100px"></div></td>
                <td><div class="skeleton" style="width:50px"></div></td>
                <td><div class="skeleton" style="width:50px"></div></td>
                <td><div class="skeleton" style="width:80px"></div></td>
                <td><div class="skeleton" style="width:70px"></div></td>
            </tr>
        `).join('');
    }

    let query = db.from('catequisandos').select(`
        id, nome_completo, tipo, foto_url, status_cadastro,
        turmas(nome),
        sacramentos(tem_batismo, tem_primeira_comunhao)
    `);

    if (state.currentUserRole === 'catequista' && state.currentCatequistaId) {
        query = query.eq('catequista_id', state.currentCatequistaId);
    }

    const { data: alunos, error } = await query;

    if (error) { console.error(error); return; }
    currentAlunos = alunos || [];

    document.getElementById('stat-total').textContent = currentAlunos.length;
    document.getElementById('stat-jovens').textContent = currentAlunos.filter(a => a.tipo === 'jovem').length;
    document.getElementById('stat-adultos').textContent = currentAlunos.filter(a => a.tipo === 'adulto').length;
    document.getElementById('stat-batismo').textContent = currentAlunos.filter(a => a.sacramentos?.[0]?.tem_batismo).length;
    document.getElementById('stat-comunhao').textContent = currentAlunos.filter(a => a.sacramentos?.[0]?.tem_primeira_comunhao).length;

    applyFiltersAndRender();
}

function applyFiltersAndRender() {
    let filtered = currentAlunos;

    // Search filter
    if (currentSearch) {
        const lowerSearch = currentSearch.toLowerCase();
        filtered = filtered.filter(a => a.nome_completo.toLowerCase().includes(lowerSearch));
    }

    // Type filter
    if (currentFilter === 'sem-batismo') filtered = filtered.filter(a => !a.sacramentos?.[0]?.tem_batismo);
    else if (currentFilter === 'sem-comunhao') filtered = filtered.filter(a => !a.sacramentos?.[0]?.tem_primeira_comunhao);
    else if (currentFilter === 'jovem') filtered = filtered.filter(a => a.tipo === 'jovem');
    else if (currentFilter === 'adulto') filtered = filtered.filter(a => a.tipo === 'adulto');

    // Pagination
    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * pageSize;
    const paginated = filtered.slice(startIdx, startIdx + pageSize);

    // Update UI controls
    document.getElementById('current-page').textContent = currentPage;
    document.getElementById('total-pages').textContent = totalPages;
    document.getElementById('btn-prev-page').disabled = currentPage === 1;
    document.getElementById('btn-next-page').disabled = currentPage === totalPages;

    renderTable(paginated);
}

function renderTable(alunos) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    if (!alunos || !alunos.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-dim);">Nenhum catequisando encontrado.</td></tr>`;
        return;
    }
    tbody.innerHTML = alunos.map(a => `
        <tr>
            <td>
                <div class="student-cell">
                    <img class="student-avatar" src="${a.foto_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(a.nome_completo) + '&background=6366f1&color=fff&size=36'}" alt="${a.nome_completo}">
                    ${a.nome_completo}
                </div>
            </td>
            <td><span class="badge ${a.tipo === 'jovem' ? 'badge-blue' : 'badge-yellow'}">${a.tipo === 'jovem' ? 'Jovem' : 'Adulto'}</span></td>
            <td>${a.turmas?.nome || '—'}</td>
            <td>${a.sacramentos?.[0]?.tem_batismo ? '<span class="badge badge-green">✅ Sim</span>' : '<span class="badge badge-red">❌ Não</span>'}</td>
            <td>${a.sacramentos?.[0]?.tem_primeira_comunhao ? '<span class="badge badge-green">✅ Sim</span>' : '<span class="badge badge-red">❌ Não</span>'}</td>
            <td><span class="badge ${a.status_cadastro === 'completo' ? 'badge-green' : 'badge-yellow'}">${a.status_cadastro}</span></td>
            <td><button class="btn-edit-row" onclick="window.openEditModal('${a.id}')">✏️ Editar</button></td>
        </tr>
    `).join('');
}

export function setupFilters() {
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentFilter = e.target.getAttribute('data-filter');
            currentPage = 1;
            applyFiltersAndRender();
        });
    });

    document.getElementById('db-search')?.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        currentPage = 1;
        applyFiltersAndRender();
    });

    document.getElementById('btn-prev-page')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            applyFiltersAndRender();
        }
    });

    document.getElementById('btn-next-page')?.addEventListener('click', () => {
        currentPage++;
        applyFiltersAndRender();
    });
}
