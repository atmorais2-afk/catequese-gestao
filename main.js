// ===== CONFIG =====
const CONFIG = {
    SUPABASE_URL: "https://eujwonmkvahhvwkfipmf.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1andvbm1rdmFoaHZ3a2ZpcG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODQ2OTAsImV4cCI6MjA4NzQ2MDY5MH0.eGzasXsGxfKfyLqbVmlddySk0otFnWaAqUVEUH1CTjg"
};

const db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// ===== NAVIGATION =====
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = item.getAttribute('data-page');
        navItems.forEach(n => n.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active'));
        item.classList.add('active');
        document.getElementById(`page-${target}`).classList.add('active');

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    });
});

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('sidebar-open');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

function closeSidebar() {
    document.querySelector('.sidebar').classList.remove('sidebar-open');
    document.getElementById('sidebar-overlay').classList.remove('active');
}

// ===== TOAST =====
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = (type === 'success' ? '✅ ' : '❌ ') + msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.className = 'toast'; }, 4000);
}

// ===== HELPERS =====
async function uploadFile(bucket, file, prefix = '') {
    const fileName = `${prefix}${Date.now()}_${file.name}`;
    const { error } = await db.storage.from(bucket).upload(fileName, file);
    if (error) throw new Error(`Erro no upload para ${bucket}: ${error.message}`);
    return db.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
}

async function loadSelectOptions(tableId, selectEl, labelField = 'nome') {
    const { data } = await db.from(tableId).select(`id, ${labelField}`).order(labelField);
    if (!data) return;
    const current = selectEl.value;
    selectEl.innerHTML = `<option value="">Selecione...</option>` +
        data.map(r => `<option value="${r.id}" ${r.id === current ? 'selected' : ''}>${r[labelField]}</option>`).join('');
}

// ===== PHOTO UPLOADERS =====
function setupPhotoUploader(triggerId, inputId, previewId, placeholderId) {
    const trigger = document.getElementById(triggerId);
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const placeholder = document.getElementById(placeholderId);

    trigger.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            preview.src = ev.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    });
}

// ===== CONDITIONAL DOCUMENT UPLOAD =====
function setupConditionalDocUpload(radioSimId, radioNaoId, docAreaId) {
    const radioSim = document.getElementById(radioSimId);
    const radioNao = document.getElementById(radioNaoId);
    const docArea = document.getElementById(docAreaId);

    radioSim.addEventListener('change', () => {
        if (radioSim.checked) docArea.style.display = 'block';
    });
    radioNao.addEventListener('change', () => {
        if (radioNao.checked) docArea.style.display = 'none';
    });
}

// ===== FORM: JOVEM =====
async function submitJovem(e) {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    btn.disabled = true; btn.textContent = 'Salvando...';

    try {
        let fotoUrl = null;
        const fotoFile = document.getElementById('input-foto-jovem').files[0];
        if (fotoFile) fotoUrl = await uploadFile('catequese_fotos', fotoFile, 'jovem_');

        const temBatismo = document.querySelector('input[name="j-batismo"]:checked')?.value === 'sim';
        const temComunhao = document.querySelector('input[name="j-comunhao"]:checked')?.value === 'sim';

        const turmaId = document.getElementById('j-turma').value || null;
        const catequistaId = document.getElementById('j-catequista').value || null;

        const { data: catequisando, error } = await db.from('catequisandos').insert([{
            nome_completo: document.getElementById('j-nome').value,
            data_nascimento: document.getElementById('j-nascimento').value,
            naturalidade: document.getElementById('j-naturalidade').value,
            telefone: document.getElementById('j-telefone').value,
            endereco: document.getElementById('j-endereco').value,
            nome_mae: document.getElementById('j-mae').value,
            nome_pai: document.getElementById('j-pai').value,
            telefone_responsavel: document.getElementById('j-telefone-responsavel').value,
            condicao_especial: document.getElementById('j-especial').value,
            tipo: 'jovem',
            turma_id: turmaId,
            catequista_id: catequistaId,
            foto_url: fotoUrl,
            status_cadastro: 'completo'
        }]).select().single();

        if (error) throw error;

        await db.from('sacramentos').insert([{
            catequisando_id: catequisando.id,
            tem_batismo: temBatismo,
            tem_primeira_comunhao: temComunhao
        }]);

        // Upload docs sacramento
        const docBatismo = document.getElementById('j-doc-batismo').files[0];
        const docComunhao = document.getElementById('j-doc-comunhao').files[0];
        const docRG = document.getElementById('j-doc-rg').files[0];

        if (docBatismo) {
            const path = await uploadFile('catequese_documentos', docBatismo, 'bat_');
            await db.from('documentos').insert([{ catequisando_id: catequisando.id, tipo_documento: 'Certidão de Batismo', arquivo_path: path }]);
        }
        if (docComunhao) {
            const path = await uploadFile('catequese_documentos', docComunhao, 'com_');
            await db.from('documentos').insert([{ catequisando_id: catequisando.id, tipo_documento: '1ª Comunhão', arquivo_path: path }]);
        }
        if (docRG) {
            const path = await uploadFile('catequese_documentos', docRG, 'rg_');
            await db.from('documentos').insert([{ catequisando_id: catequisando.id, tipo_documento: 'Foto do RG ou Certidão de Nascimento', arquivo_path: path }]);
        }
        const docRGResp = document.getElementById('j-doc-rg-responsavel').files[0];
        if (docRGResp) {
            const path = await uploadFile('catequese_documentos', docRGResp, 'rg_resp_');
            await db.from('documentos').insert([{ catequisando_id: catequisando.id, tipo_documento: 'RG do Responsável', arquivo_path: path }]);
        }

        showToast('Cadastro realizado com sucesso!');
        e.target.reset();
        resetPhotoPreview('photo-preview-jovem', 'photo-placeholder-jovem');

    } catch (err) {
        console.error(err);
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = '✅ Finalizar Cadastro';
    }
}

// ===== FORM: ADULTO =====
async function submitAdulto(e) {
    e.preventDefault();
    const btn = e.target.querySelector('[type="submit"]');
    btn.disabled = true; btn.textContent = 'Salvando...';

    try {
        let fotoUrl = null;
        const fotoFile = document.getElementById('input-foto-adulto').files[0];
        if (fotoFile) fotoUrl = await uploadFile('catequese_fotos', fotoFile, 'adulto_');

        const temBatismo = document.querySelector('input[name="a-batismo"]:checked')?.value === 'sim';
        const temComunhao = document.querySelector('input[name="a-comunhao"]:checked')?.value === 'sim';

        const turmaId = document.getElementById('a-turma').value || null;
        const catequistaId = document.getElementById('a-catequista').value || null;

        const { data: catequisando, error } = await db.from('catequisandos').insert([{
            nome_completo: document.getElementById('a-nome').value,
            data_nascimento: document.getElementById('a-nascimento').value,
            estado_civil: document.getElementById('a-estado-civil').value,
            naturalidade: document.getElementById('a-naturalidade').value,
            telefone: document.getElementById('a-telefone').value,
            endereco: document.getElementById('a-endereco').value,
            nome_mae: document.getElementById('a-mae').value,
            nome_pai: document.getElementById('a-pai').value,
            nome_conjuge: document.getElementById('a-nome-conjuge').value,
            casado_igreja: document.querySelector('input[name="a-casado-igreja"]:checked')?.value === 'sim',
            condicao_especial: document.getElementById('a-especial').value,
            tipo: 'adulto',
            turma_id: turmaId,
            catequista_id: catequistaId,
            foto_url: fotoUrl,
            status_cadastro: 'completo'
        }]).select().single();

        if (error) throw error;

        await db.from('sacramentos').insert([{
            catequisando_id: catequisando.id,
            tem_batismo: temBatismo,
            tem_primeira_comunhao: temComunhao
        }]);

        const docBatismo = document.getElementById('a-doc-batismo').files[0];
        const docComunhao = document.getElementById('a-doc-comunhao').files[0];
        const docRG = document.getElementById('a-doc-rg').files[0];
        const docCertidao = document.getElementById('a-doc-certidao').files[0];

        for (const [file, tipo, prefix] of [
            [docBatismo, 'Certidão de Batismo', 'bat_'],
            [docComunhao, '1ª Comunhão', 'com_'],
            [docRG, 'Foto do RG ou CNH', 'rg_'],
            [docCertidao, 'Certidão de Nascimento / Casamento', 'cert_']
        ]) {
            if (file) {
                const path = await uploadFile('catequese_documentos', file, prefix);
                await db.from('documentos').insert([{ catequisando_id: catequisando.id, tipo_documento: tipo, arquivo_path: path }]);
            }
        }

        showToast('Cadastro realizado com sucesso!');
        e.target.reset();
        resetPhotoPreview('photo-preview-adulto', 'photo-placeholder-adulto');

    } catch (err) {
        console.error(err);
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = '✅ Finalizar Cadastro';
    }
}

function resetPhotoPreview(previewId, placeholderId) {
    document.getElementById(previewId).style.display = 'none';
    document.getElementById(placeholderId).style.display = 'block';
}

// ===== DASHBOARD =====
let currentAlunos = [];

async function loadDashboardData() {
    const { data: alunos, error } = await db.from('catequisandos').select(`
        id, nome_completo, tipo, foto_url, status_cadastro,
        turmas(nome),
        sacramentos(tem_batismo, tem_primeira_comunhao)
    `);

    if (error) { console.error(error); return; }
    currentAlunos = alunos || [];

    document.getElementById('stat-total').textContent = currentAlunos.length;
    document.getElementById('stat-jovens').textContent = currentAlunos.filter(a => a.tipo === 'jovem').length;
    document.getElementById('stat-adultos').textContent = currentAlunos.filter(a => a.tipo === 'adulto').length;
    document.getElementById('stat-batismo').textContent = currentAlunos.filter(a => a.sacramentos?.tem_batismo).length;
    document.getElementById('stat-comunhao').textContent = currentAlunos.filter(a => a.sacramentos?.tem_primeira_comunhao).length;

    renderTable(currentAlunos);
}

function renderTable(alunos) {
    const tbody = document.getElementById('table-body');
    if (!alunos.length) {
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
            <td>${a.sacramentos?.tem_batismo ? '<span class="badge badge-green">✅ Sim</span>' : '<span class="badge badge-red">❌ Não</span>'}</td>
            <td>${a.sacramentos?.tem_primeira_comunhao ? '<span class="badge badge-green">✅ Sim</span>' : '<span class="badge badge-red">❌ Não</span>'}</td>
            <td><span class="badge ${a.status_cadastro === 'completo' ? 'badge-green' : 'badge-yellow'}">${a.status_cadastro}</span></td>
            <td><button class="btn-edit-row" onclick="openEditModal('${a.id}')">✏️ Editar</button></td>
        </tr>
    `).join('');
}

document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const f = e.target.getAttribute('data-filter');
        let filtered = currentAlunos;
        if (f === 'sem-batismo') filtered = currentAlunos.filter(a => !a.sacramentos?.tem_batismo);
        else if (f === 'sem-comunhao') filtered = currentAlunos.filter(a => !a.sacramentos?.tem_primeira_comunhao);
        else if (f === 'jovem') filtered = currentAlunos.filter(a => a.tipo === 'jovem');
        else if (f === 'adulto') filtered = currentAlunos.filter(a => a.tipo === 'adulto');
        renderTable(filtered);
    });
});

// ===== CATEQUISTAS CRUD =====
async function loadCatequistas() {
    const { data } = await db.from('catequistas').select('*').order('nome');
    const container = document.getElementById('list-catequistas');
    if (!data || !data.length) { container.innerHTML = `<p style="color:var(--text-dim)">Nenhum catequista cadastrado ainda.</p>`; return; }

    container.innerHTML = data.map(c => `
        <div class="list-item">
            <div class="list-item-info">
                <p>👤 ${c.nome}</p>
                <small>${c.email || ''} ${c.telefone ? '• ' + c.telefone : ''}</small>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-sm" onclick="editCatequista('${c.id}','${c.nome}','${c.email || ''}','${c.telefone || ''}')">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteCatequista('${c.id}')">🗑️</button>
            </div>
        </div>
    `).join('');

    // Refresh selects in forms
    await loadSelectOptions('catequistas', document.getElementById('j-catequista'));
    await loadSelectOptions('catequistas', document.getElementById('a-catequista'));
}

document.getElementById('form-catequista').addEventListener('submit', async (e) => {
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
    document.getElementById('btn-cancel-catequista').style.display = 'none';
    await loadCatequistas();
});

window.editCatequista = (id, nome, email, telefone) => {
    document.getElementById('catequista-edit-id').value = id;
    document.getElementById('c-nome').value = nome;
    document.getElementById('c-email').value = email;
    document.getElementById('c-telefone').value = telefone;
    document.getElementById('btn-cancel-catequista').style.display = 'inline-flex';
    document.getElementById('btn-save-catequista').textContent = 'Atualizar';
};

document.getElementById('btn-cancel-catequista').addEventListener('click', () => {
    document.getElementById('form-catequista').reset();
    document.getElementById('catequista-edit-id').value = '';
    document.getElementById('btn-cancel-catequista').style.display = 'none';
    document.getElementById('btn-save-catequista').textContent = 'Salvar';
});

window.deleteCatequista = async (id) => {
    if (!confirm('Deseja excluir este catequista?')) return;
    await db.from('catequistas').delete().eq('id', id);
    showToast('Catequista removido.');
    await loadCatequistas();
};

// ===== TURMAS CRUD =====
async function loadTurmas() {
    const { data } = await db.from('turmas').select('*').order('nome');
    const container = document.getElementById('list-turmas');
    if (!data || !data.length) { container.innerHTML = `<p style="color:var(--text-dim)">Nenhuma turma cadastrada ainda.</p>`; return; }

    container.innerHTML = data.map(t => `
        <div class="list-item">
            <div class="list-item-info">
                <p>📚 ${t.nome}</p>
                <small>${t.tipo || ''} • ${t.ano || ''}</small>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-sm" onclick="editTurma('${t.id}','${t.nome}','${t.tipo || ''}','${t.ano || ''}')">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteTurma('${t.id}')">🗑️</button>
            </div>
        </div>
    `).join('');

    // Refresh selects in forms
    await loadSelectOptions('turmas', document.getElementById('j-turma'));
    await loadSelectOptions('turmas', document.getElementById('a-turma'));
}

document.getElementById('form-turma').addEventListener('submit', async (e) => {
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
    document.getElementById('btn-cancel-turma').style.display = 'none';
    await loadTurmas();
});

window.editTurma = (id, nome, tipo, ano) => {
    document.getElementById('turma-edit-id').value = id;
    document.getElementById('t-nome').value = nome;
    document.getElementById('t-tipo').value = tipo;
    document.getElementById('t-ano').value = ano;
    document.getElementById('btn-cancel-turma').style.display = 'inline-flex';
    document.getElementById('btn-save-turma').textContent = 'Atualizar';
};

document.getElementById('btn-cancel-turma').addEventListener('click', () => {
    document.getElementById('form-turma').reset();
    document.getElementById('turma-edit-id').value = '';
    document.getElementById('btn-cancel-turma').style.display = 'none';
    document.getElementById('btn-save-turma').textContent = 'Salvar';
});

window.deleteTurma = async (id) => {
    if (!confirm('Deseja excluir esta turma?')) return;
    await db.from('turmas').delete().eq('id', id);
    showToast('Turma removida.');
    await loadTurmas();
};

// ===== EDIT MODAL =====
window.openEditModal = async (id) => {
    const modal = document.getElementById('edit-modal');
    modal.style.display = 'flex';

    // Fetch full record
    const { data: c, error } = await db
        .from('catequisandos')
        .select('*, turmas(nome), sacramentos(tem_batismo, tem_primeira_comunhao), catequistas(nome)')
        .eq('id', id)
        .single();

    if (error || !c) { showToast('Erro ao carregar cadastro.', 'error'); return; }

    // Store id & tipo
    document.getElementById('edit-id').value = c.id;
    document.getElementById('edit-tipo').value = c.tipo;
    document.getElementById('modal-title').textContent = `Editar: ${c.nome_completo}`;

    // Presence count
    const { count } = await db.from('frequencia').select('*', { count: 'exact', head: true }).eq('catequisando_id', id);
    document.getElementById('edit-presence-count').textContent = `Total de Presenças: ${count || 0}`;

    // Fill fields
    document.getElementById('edit-nome').value = c.nome_completo || '';
    document.getElementById('edit-nascimento').value = c.data_nascimento || '';
    document.getElementById('edit-telefone').value = c.telefone || '';
    document.getElementById('edit-endereco').value = c.endereco || '';
    document.getElementById('edit-mae').value = c.nome_mae || '';
    document.getElementById('edit-pai').value = c.nome_pai || '';
    document.getElementById('edit-especial').value = c.condicao_especial || '';
    document.getElementById('edit-status').value = c.status_cadastro || 'completo';

    // Sacramentos
    document.getElementById('edit-batismo').checked = c.sacramentos?.tem_batismo || false;
    document.getElementById('edit-comunhao').checked = c.sacramentos?.tem_primeira_comunhao || false;

    // Adulto-only fields visibility
    const isAdulto = c.tipo === 'adulto';
    document.getElementById('edit-row-estado-civil').style.display = isAdulto ? '' : 'none';
    document.getElementById('edit-row-naturalidade').style.display = isAdulto ? '' : 'none';
    if (isAdulto) {
        document.getElementById('edit-estado-civil').value = c.estado_civil || '';
        document.getElementById('edit-naturalidade').value = c.naturalidade || '';
    }

    // photo preview logic...
    const preview = document.getElementById('photo-preview-edit');
    const placeholder = document.getElementById('photo-placeholder-edit');
    if (c.foto_url) {
        preview.src = c.foto_url;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        preview.style.display = 'none';
        placeholder.style.display = 'flex';
    }

    // Documents
    await loadEditDocuments(id);

    // Load selects
    await loadSelectOptions('turmas', document.getElementById('edit-turma'));
    await loadSelectOptions('catequistas', document.getElementById('edit-catequista'));
    document.getElementById('edit-turma').value = c.turma_id || '';
    document.getElementById('edit-catequista').value = c.catequista_id || '';
};

async function loadEditDocuments(catequisandoId) {
    const listEl = document.getElementById('edit-doc-list');
    const { data: docs, error } = await db.from('documentos').select('*').eq('catequisando_id', catequisandoId);

    if (error) { listEl.innerHTML = `<p style="color:var(--accent)">Erro ao carregar documentos.</p>`; return; }
    if (!docs || docs.length === 0) { listEl.innerHTML = `<p style="color:var(--text-dim); font-size:0.85rem">Nenhum documento anexado.</p>`; return; }

    listEl.innerHTML = docs.map(d => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--glass); padding:0.5rem; border-radius:0.4rem; margin-bottom:0.4rem; border:1px solid var(--border)">
            <a href="${db.storage.from('catequese_documentos').getPublicUrl(d.arquivo_path).data.publicUrl}" target="_blank" style="color:var(--primary); font-size:0.85rem; text-decoration:none;">📄 ${d.tipo_documento}</a>
            <button type="button" class="btn btn-sm btn-danger" style="padding:0.2rem 0.4rem" onclick="deleteDocument('${d.id}', '${d.arquivo_path}', '${catequisandoId}')">🗑️</button>
        </div>
    `).join('');
}

window.deleteDocument = async (docId, filePath, catequisandoId) => {
    if (!confirm('Deseja excluir este documento?')) return;
    try {
        await db.storage.from('catequese_documentos').remove([filePath]);
        await db.from('documentos').delete().eq('id', docId);
        showToast('Documento removido.');
        await loadEditDocuments(catequisandoId);
    } catch (err) {
        showToast('Erro ao remover arquivo.', 'error');
    }
};

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    document.getElementById('input-foto-edit').value = '';
}

async function saveEditModal() {
    const id = document.getElementById('edit-id').value;
    const tipo = document.getElementById('edit-tipo').value;
    const btn = document.getElementById('btn-edit-save');
    btn.disabled = true; btn.textContent = 'Salvando...';

    try {
        // Optional new photo
        let fotoUrl;
        const newPhoto = document.getElementById('input-foto-edit').files[0];
        if (newPhoto) fotoUrl = await uploadFile('catequese_fotos', newPhoto, `${tipo}_`);

        const payload = {
            nome_completo: document.getElementById('edit-nome').value,
            data_nascimento: document.getElementById('edit-nascimento').value || null,
            telefone: document.getElementById('edit-telefone').value,
            endereco: document.getElementById('edit-endereco').value,
            nome_mae: document.getElementById('edit-mae').value,
            nome_pai: document.getElementById('edit-pai').value,
            condicao_especial: document.getElementById('edit-especial').value || null,
            turma_id: document.getElementById('edit-turma').value || null,
            catequista_id: document.getElementById('edit-catequista').value || null,
            status_cadastro: document.getElementById('edit-status').value,
        };
        if (tipo === 'adulto') {
            payload.estado_civil = document.getElementById('edit-estado-civil').value;
            payload.naturalidade = document.getElementById('edit-naturalidade').value;
        }
        if (fotoUrl) payload.foto_url = fotoUrl;

        const { error: errC } = await db.from('catequisandos').update(payload).eq('id', id);
        if (errC) throw errC;

        // Upsert sacramentos
        const { error: errS } = await db.from('sacramentos').upsert({
            catequisando_id: id,
            tem_batismo: document.getElementById('edit-batismo').checked,
            tem_primeira_comunhao: document.getElementById('edit-comunhao').checked,
            updated_at: new Date().toISOString()
        }, { onConflict: 'catequisando_id' });
        if (errS) throw errS;

        // New document upload
        const newDocFile = document.getElementById('edit-new-doc-file').files[0];
        if (newDocFile) {
            const tipo = document.getElementById('edit-new-doc-tipo').value;
            const path = await uploadFile('catequese_documentos', newDocFile, `${tipo.replace(/\s+/g, '_').toLowerCase()}_`);
            const fileName = path.split('/').pop();
            await db.from('documentos').insert([{
                catequisando_id: id,
                tipo_documento: tipo,
                arquivo_path: fileName
            }]);
            document.getElementById('edit-new-doc-file').value = '';
        }

        showToast('✅ Cadastro atualizado com sucesso!');
        closeEditModal();
        await loadDashboardData();
    } catch (err) {
        console.error(err);
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = '💾 Salvar Alterações';
    }
}

async function deleteEditModal() {
    const id = document.getElementById('edit-id').value;
    const nome = document.getElementById('edit-nome').value;
    if (!confirm(`Excluir "${nome}" permanentemente? Esta ação não pode ser desfeita.`)) return;

    try {
        await db.from('documentos').delete().eq('catequisando_id', id);
        await db.from('sacramentos').delete().eq('catequisando_id', id);
        const { error } = await db.from('catequisandos').delete().eq('id', id);
        if (error) throw error;
        showToast('🗑️ Catequisando excluído.');
        closeEditModal();
        await loadDashboardData();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ===== FREQUÊNCIA =====
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

async function loadPresencaResumo() {
    const searchTerm = document.getElementById('f-search')?.value.toLowerCase() || '';
    const sortOrder = document.getElementById('f-sort')?.value || 'desc';

    const { data: alunos } = await db.from('catequisandos').select('id, nome_completo, tipo');
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
                <a href="#" class="clickable-name" onclick="openHistoryModal('${s.id}', '${s.nome_completo}')">
                    ${s.nome_completo}
                </a>
            </td>
            <td><span class="badge ${s.tipo === 'jovem' ? 'badge-blue' : 'badge-yellow'}">${s.tipo}</span></td>
            <td><span class="badge badge-green">${s.total}</span></td>
            <td><button class="btn-edit-row" onclick="openAttendanceModal('${s.id}', '${s.nome_completo}')">📅 Registrar</button></td>
        </tr>
    `).join('') : `<tr><td colspan="4" style="text-align:center; padding:1rem; color:var(--text-dim);">Nenhum resultado encontrado.</td></tr>`;
}

function openAttendanceModal(id, nome) {
    document.getElementById('att-student-id').value = id;
    document.getElementById('att-student-name').textContent = nome;
    document.getElementById('att-data').value = getMostRecentSunday();
    document.getElementById('att-observacao').value = '';
    document.getElementById('attendance-modal').style.display = 'flex';
}

function closeAttendanceModal() {
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
                <td style="font-size: 0.9rem; color: var(--text-dim);">${h.observacao || '—'}</td>
            </tr>
        `).join('');
    } catch (err) {
        showToast(err.message, 'error');
        closeHistoryModal();
    }
}

function closeHistoryModal() {
    document.getElementById('history-modal').style.display = 'none';
}

async function submitPresenca(e) {
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

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    setupPhotoUploader('photo-trigger-jovem', 'input-foto-jovem', 'photo-preview-jovem', 'photo-placeholder-jovem');
    setupPhotoUploader('photo-trigger-adulto', 'input-foto-adulto', 'photo-preview-adulto', 'photo-placeholder-adulto');
    setupPhotoUploader('photo-trigger-edit', 'input-foto-edit', 'photo-preview-edit', 'photo-placeholder-edit');

    setupConditionalDocUpload('j-batismo-sim', 'j-batismo-nao', 'j-batismo-doc');
    setupConditionalDocUpload('j-comunhao-sim', 'j-comunhao-nao', 'j-comunhao-doc');
    setupConditionalDocUpload('a-batismo-sim', 'a-batismo-nao', 'a-batismo-doc');
    setupConditionalDocUpload('a-comunhao-sim', 'a-comunhao-nao', 'a-comunhao-doc');

    document.getElementById('form-jovem').addEventListener('submit', submitJovem);
    document.getElementById('form-adulto').addEventListener('submit', submitAdulto);

    // Toggle Adult Spouse Fields
    document.getElementById('a-estado-civil').addEventListener('change', (e) => {
        const area = document.getElementById('a-conjuge-area');
        area.style.display = e.target.value === 'Casado(a)' ? 'block' : 'none';
    });

    document.getElementById('btn-att-save').addEventListener('click', submitPresenca);

    // Modal controls
    document.getElementById('btn-att-close').addEventListener('click', closeAttendanceModal);
    document.getElementById('btn-att-cancel').addEventListener('click', closeAttendanceModal);
    document.getElementById('attendance-modal').addEventListener('click', (e) => {
        if (e.target.id === 'attendance-modal') closeAttendanceModal();
    });

    document.getElementById('btn-hist-close').addEventListener('click', closeHistoryModal);
    document.getElementById('btn-hist-close-footer').addEventListener('click', closeHistoryModal);
    document.getElementById('history-modal').addEventListener('click', (e) => {
        if (e.target.id === 'history-modal') closeHistoryModal();
    });

    // Frequency search/sort
    document.getElementById('f-search')?.addEventListener('input', loadPresencaResumo);
    document.getElementById('f-sort')?.addEventListener('change', loadPresencaResumo);

    // Edit modal buttons
    document.getElementById('btn-modal-close').addEventListener('click', closeEditModal);
    document.getElementById('btn-edit-cancel').addEventListener('click', closeEditModal);
    document.getElementById('btn-edit-save').addEventListener('click', saveEditModal);
    document.getElementById('btn-edit-delete').addEventListener('click', deleteEditModal);
    // Close on backdrop click
    document.getElementById('edit-modal').addEventListener('click', (e) => {
        if (e.target.id === 'edit-modal') closeEditModal();
    });

    // Mobile menu
    document.getElementById('mobile-menu-toggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

    await loadDashboardData();
    await loadCatequistas();
    await loadTurmas();
    await loadPresencaResumo();

    // Set default attendance date to most recent Sunday
    const freqDateInput = document.getElementById('f-data');
    if (freqDateInput) {
        freqDateInput.value = getMostRecentSunday();
    }
});
