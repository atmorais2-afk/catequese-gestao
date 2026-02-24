import { db, uploadFile, loadSelectOptions } from './api.js';
import { showToast } from './ui.js';
import { loadDashboardData } from './dashboard.js';

let currentEditData = null;

window.openEditModal = async (id) => {
    console.log('[EditModal] Opening for ID:', id);
    const modal = document.getElementById('edit-modal');
    modal.style.display = 'flex';

    // Fetch full record
    const { data: c, error } = await db
        .from('catequisandos')
        .select('*, turmas(nome), sacramentos(tem_batismo, tem_primeira_comunhao), catequistas(nome)')
        .eq('id', id)
        .single();

    if (error || !c) {
        console.error('[EditModal] Error fetching record:', error);
        showToast('Erro ao carregar cadastro.', 'error');
        return;
    }
    console.log('[EditModal] Data loaded:', c);
    currentEditData = c;


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
            <button type="button" class="btn btn-sm btn-danger" style="padding:0.2rem 0.4rem" onclick="window.deleteDocument('${d.id}', '${d.arquivo_path}', '${catequisandoId}')">🗑️</button>
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

export function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    document.getElementById('input-foto-edit').value = '';
}

export async function saveEditModal() {
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

export async function deleteEditModal() {
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

export function printFicha() {
    console.log('[Print] printFicha called. CurrentEditData:', currentEditData);
    if (!currentEditData) {
        console.warn('[Print] No currentEditData found. Cannot print.');
        showToast('Abra um cadastro antes de imprimir.', 'error');
        return;
    }
    const c = currentEditData;
    console.log('[Print] Preparing print-area for:', c.nome_completo);
    const area = document.getElementById('print-area');

    // Formatting date
    const dInscricao = c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
    const dNascimento = c.data_nascimento ? new Date(c.data_nascimento).toLocaleDateString('pt-BR') : '-';

    // Make visible for print engine
    area.style.display = 'block';

    area.innerHTML = `
        <div style="font-family:'Outfit', 'Segoe UI', Tahoma, sans-serif; color:#000; background:#fff; padding:0mm 2mm 2mm 2mm; width:210mm; min-height:297mm; margin:0 auto; box-sizing:border-box; line-height:1.4; font-size:11pt">
            <!-- HEADER -->
            <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:1.5rem; border-bottom:2px solid #000; padding-bottom:1rem">
                <div style="flex:1">
                    <h1 style="margin:0; font-size:20pt; font-weight:800; text-transform:uppercase; letter-spacing:1px">Ficha de Inscrição - Catequese</h1>
                    <p style="margin:4px 0 0; font-size:12pt; font-weight:600; color:#333">Paróquia São Sebastião do Gramacho - Duque de Caxias - RJ</p>
                </div>
                <div style="margin-left:20px">
                    ${c.foto_url ? `<img src="${c.foto_url}" style="width:100px; height:120px; object-fit:cover; border:1px solid #000; padding:2px">` : `
                    <div style="width:100px; height:120px; border:1px solid #000; display:flex; align-items:center; justify-content:center; color:#999; font-size:9pt; text-align:center">FOTO</div>
                    `}
                </div>
            </div>

            <!-- SECTION 1: DADOS -->
            <div style="background:#000; color:#fff; padding:5px 12px; font-weight:700; text-transform:uppercase; margin-bottom:10px">1. Dados do Catequizando e Sacramentos</div>
            <table style="width:100%; border-collapse:collapse; margin-bottom:1rem">
                <tr>
                    <td style="padding:6px; border:1px solid #000; width:20%"><strong>Nome:</strong></td>
                    <td style="padding:6px; border:1px solid #000" colspan="3">${c.nome_completo || '-'}</td>
                </tr>
                <tr>
                    <td style="padding:6px; border:1px solid #000"><strong>Nascimento:</strong></td>
                    <td style="padding:6px; border:1px solid #000">${dNascimento}</td>
                    <td style="padding:6px; border:1px solid #000; width:20%"><strong>Naturalidade:</strong></td>
                    <td style="padding:6px; border:1px solid #000">${c.naturalidade || '-'}</td>
                </tr>
                <tr>
                    <td style="padding:6px; border:1px solid #000"><strong>Endereço:</strong></td>
                    <td style="padding:6px; border:1px solid #000" colspan="3">${c.endereco || '-'}</td>
                </tr>
                <tr>
                    <td style="padding:6px; border:1px solid #000"><strong>Telefone:</strong></td>
                    <td style="padding:6px; border:1px solid #000">${c.telefone || '-'}</td>
                    <td style="padding:6px; border:1px solid #000"><strong>Tel. Responsável:</strong></td>
                    <td style="padding:6px; border:1px solid #000">${c.telefone_responsavel || '-'}</td>
                </tr>
                <tr>
                    <td style="padding:6px; border:1px solid #000"><strong>Turma:</strong></td>
                    <td style="padding:6px; border:1px solid #000">${c.turmas?.nome || '-'}</td>
                    <td style="padding:6px; border:1px solid #000"><strong>Catequista:</strong></td>
                    <td style="padding:6px; border:1px solid #000">${c.catequistas?.nome || '-'}</td>
                </tr>
                <tr>
                    <td style="padding:6px; border:1px solid #000; vertical-align:top"><strong>Sacramentos:</strong></td>
                    <td style="padding:6px; border:1px solid #000" colspan="3">
                        [ ${c.sacramentos?.tem_batismo ? 'X' : ' '} ] Batismo &nbsp;&nbsp;&nbsp;
                        [ ${c.sacramentos?.tem_primeira_comunhao ? 'X' : ' '} ] Primeira Eucaristia
                    </td>
                </tr>
            </table>

            <div style="border:1px dashed #000; padding:10px; margin-bottom:20px; font-size:10pt; background:#f9f9f9">
                <strong style="display:block; margin-bottom:5px">⚠️ ATENÇÃO! Documentos necessários para serem entregues nos primeiros encontros:</strong>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px">
                    <span>- Xerox do RG;</span>
                    <span>- Comprovante de Residência;</span>
                    <span>- Certidão de Nascimento ou Casamento;</span>
                    <span>- Declaração dos sacramentos já recebidos (1ª Eucaristia, Batismo).</span>
                </div>
            </div>

            <!-- SECTION 2: COMPROMISSO -->
            <div style="background:#000; color:#fff; padding:5px 12px; font-weight:700; text-transform:uppercase; margin-bottom:10px">2. Termo de Compromisso com a Catequese</div>
            <div style="font-size:8pt; text-align:justify; margin-bottom:10px">
                <strong>📄 Nosso Compromisso:</strong> Eu entendo que a Catequese é um momento especial de aprendizado sobre nossa fé, de crescimento espiritual e de preparo para receber os sacramentos da Igreja com o coração aberto. Por isso, eu me comprometo a:<br><br>
                <strong>✅ Presença:</strong> Fazer o possível para que o(a) catequizando(a) participe dos encontros, principalmente quando estiver se preparando para a Primeira Comunhão ou Crisma.<br>
                <strong>✅ Comunicação:</strong> Avisar quando houver algum motivo importante que impeça a presença nos encontros. Sei que faltas sem aviso podem comprometer a preparação para receber o sacramento.<br>
                <strong>✅ Família:</strong> Participar dos encontros com pais e responsáveis quando for chamado(a), porque entendo que a família tem um papel muito importante nessa caminhada de fé.<br>
                <strong>✅ Vivência:</strong> Incentivar e acompanhar a participação na Missa, ajudando o(a) catequizando(a) a viver sua fé junto com a comunidade.<br>
                <p style="margin:8px 0"><em>Para catequizandos adultos: Assumo o compromisso pessoal de comparecer aos encontros, participar da Missa e viver essa caminhada com responsabilidade.</em></p>
                <strong>💙 Eu sei que a Catequese é muito mais do que uma preparação para receber um sacramento. É um caminho de aprendizado e crescimento na fé que pede a minha presença, participação e envolvimento.</strong>
            </div>
            <div style="margin-bottom:20px; font-size:9pt">
                [ &nbsp; ] <strong>Li e estou de acordo com o Termo de Responsabilidade e Compromisso com a Catequese.</strong>
            </div>

            <!-- SECTION 3: AUTORIZAÇÃO IMAGEM -->
            <div style="background:#000; color:#fff; padding:5px 12px; font-weight:700; text-transform:uppercase; margin-bottom:10px">3. Autorização para uso de Fotos e Vídeos</div>
            <div style="font-size:8pt; text-align:justify; margin-bottom:10px">
                <strong>📸 Eu autorizo</strong>, sem custos, que as fotos e vídeos do(a) catequizando(a) tiradas durante as atividades da Catequese da Paróquia São Sebastião possam ser usadas para divulgar o trabalho pastoral e evangelizador da nossa comunidade em materiais impressos, redes sociais, site e outros canais de comunicação da Igreja.<br>
                <strong>Eu compreendo que:</strong> As imagens serão usadas com cuidado, respeito e responsabilidade; não haverá uso comercial; esta autorização vale enquanto o(a) catequizando(a) estiver participando da catequese; posso cancelar essa autorização a qualquer momento por escrito.
            </div>
            <div style="display:flex; gap:30px; margin-bottom:25px; font-size:9.5pt">
                <span>( &nbsp; ) <strong>Autorizo</strong></span>
                <span>( &nbsp; ) <strong>Não Autorizo</strong></span>
            </div>

            <!-- SIGNATURE -->
            <div style="margin-top:3rem">
                <div style="width:100%; display:flex; flex-direction:column; align-items:center; margin-bottom:20px">
                    <div style="border-top:1px solid #000; width:80%; margin-top:20px; text-align:center; padding-top:5px">
                        <strong>Assinatura do Responsável / Catequizando Adulto</strong>
                    </div>
                </div>
            </div>

        </div>
    `;



    setTimeout(() => {
        window.print();
        area.style.display = 'none';
        area.innerHTML = '';
    }, 500);
}


