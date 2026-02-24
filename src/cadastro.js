import { db, uploadFile } from './api.js';
import { showToast } from './ui.js';

export function setupConditionalDocUpload(radioSimId, radioNaoId, docAreaId) {
    const radioSim = document.getElementById(radioSimId);
    const radioNao = document.getElementById(radioNaoId);
    const docArea = document.getElementById(docAreaId);

    radioSim?.addEventListener('change', () => {
        if (radioSim.checked) docArea.style.display = 'block';
    });
    radioNao?.addEventListener('change', () => {
        if (radioNao.checked) docArea.style.display = 'none';
    });
}

function resetPhotoPreview(previewId, placeholderId) {
    document.getElementById(previewId).style.display = 'none';
    document.getElementById(placeholderId).style.display = 'block';
}

export function setupPhotoUploader(triggerId, inputId, previewId, placeholderId) {
    const trigger = document.getElementById(triggerId);
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const placeholder = document.getElementById(placeholderId);

    trigger?.addEventListener('click', () => input.click());
    input?.addEventListener('change', (e) => {
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

// ===== FORM: JOVEM =====
export async function submitJovem(e) {
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
            status_cadastro: 'pendente'
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
export async function submitAdulto(e) {
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
            status_cadastro: 'pendente'
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
