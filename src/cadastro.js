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

// ===== FUNÇÃO UNIFICADA (jovem e adulto compartilham ~80% da lógica) =====
async function submitCatequisando(tipo, e) {
    e.preventDefault();
    const p = tipo === 'jovem' ? 'j' : 'a';
    const btn = e.target.querySelector('[type="submit"]');
    btn.disabled = true; btn.textContent = 'Salvando...';

    try {
        let fotoUrl = null;
        const fotoFile = document.getElementById(`input-foto-${tipo}`).files[0];
        if (fotoFile) fotoUrl = await uploadFile('catequese_fotos', fotoFile, `${tipo}_`);

        const temBatismo = document.querySelector(`input[name="${p}-batismo"]:checked`)?.value === 'sim';
        const temComunhao = document.querySelector(`input[name="${p}-comunhao"]:checked`)?.value === 'sim';

        const payload = {
            nome_completo: document.getElementById(`${p}-nome`).value,
            data_nascimento: document.getElementById(`${p}-nascimento`).value,
            naturalidade: document.getElementById(`${p}-naturalidade`)?.value || null,
            telefone: document.getElementById(`${p}-telefone`)?.value || null,
            endereco: document.getElementById(`${p}-endereco`)?.value || null,
            nome_mae: document.getElementById(`${p}-mae`)?.value || null,
            nome_pai: document.getElementById(`${p}-pai`)?.value || null,
            condicao_especial: document.getElementById(`${p}-especial`)?.value || null,
            tipo,
            turma_id: document.getElementById(`${p}-turma`).value || null,
            catequista_id: document.getElementById(`${p}-catequista`).value || null,
            foto_url: fotoUrl,
            status_cadastro: 'pendente'
        };

        // Campos exclusivos do jovem
        if (tipo === 'jovem') {
            payload.telefone_responsavel = document.getElementById('j-telefone-responsavel').value;
        }

        // Campos exclusivos do adulto
        if (tipo === 'adulto') {
            payload.estado_civil = document.getElementById('a-estado-civil').value;
            payload.nome_conjuge = document.getElementById('a-nome-conjuge').value;
            payload.casado_igreja = document.querySelector('input[name="a-casado-igreja"]:checked')?.value === 'sim';
        }

        const { data: catequisando, error } = await db.from('catequisandos').insert([payload]).select().single();
        if (error) throw error;

        await db.from('sacramentos').insert([{
            catequisando_id: catequisando.id,
            tem_batismo: temBatismo,
            tem_primeira_comunhao: temComunhao
        }]);

        // Documentos comuns a ambos os tipos
        const docs = [
            [document.getElementById(`${p}-doc-batismo`).files[0], 'Certidão de Batismo', 'bat_'],
            [document.getElementById(`${p}-doc-comunhao`).files[0], '1ª Comunhão', 'com_'],
            [document.getElementById(`${p}-doc-rg`).files[0],
                tipo === 'jovem' ? 'Foto do RG ou Certidão de Nascimento' : 'Foto do RG ou CNH', 'rg_'],
        ];

        // Documento exclusivo de cada tipo
        if (tipo === 'jovem') {
            docs.push([document.getElementById('j-doc-rg-responsavel').files[0], 'RG do Responsável', 'rg_resp_']);
        }
        if (tipo === 'adulto') {
            docs.push([document.getElementById('a-doc-certidao').files[0], 'Certidão de Nascimento / Casamento', 'cert_']);
        }

        for (const [file, tipoDoc, prefix] of docs) {
            if (file) {
                const path = await uploadFile('catequese_documentos', file, prefix);
                await db.from('documentos').insert([{ catequisando_id: catequisando.id, tipo_documento: tipoDoc, arquivo_path: path }]);
            }
        }

        showToast('Cadastro realizado com sucesso!');
        e.target.reset();
        resetPhotoPreview(`photo-preview-${tipo}`, `photo-placeholder-${tipo}`);

    } catch (err) {
        console.error(err);
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = '✅ Finalizar Cadastro';
    }
}

export async function submitJovem(e) { return submitCatequisando('jovem', e); }
export async function submitAdulto(e) { return submitCatequisando('adulto', e); }
