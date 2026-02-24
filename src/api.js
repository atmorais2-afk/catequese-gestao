import CONFIG from '../config.js';

if (typeof supabase === 'undefined') {
    throw new Error('A biblioteca Supabase não foi carregada. Verifique sua conexão ou se o script no index.html está correto.');
}

export const db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

export async function uploadFile(bucket, file, prefix = '') {
    const fileName = `${prefix}${Date.now()}_${file.name}`;
    const { error } = await db.storage.from(bucket).upload(fileName, file);
    if (error) throw new Error(`Erro no upload para ${bucket}: ${error.message}`);
    return db.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
}

export async function loadSelectOptions(tableId, selectEl, labelField = 'nome') {
    const { data } = await db.from(tableId).select(`id, ${labelField}`).order(labelField);
    if (!data) return;
    const current = selectEl.value;
    selectEl.innerHTML = `<option value="">Selecione...</option>` +
        data.map(r => `<option value="${r.id}" ${r.id === current ? 'selected' : ''}>${r[labelField]}</option>`).join('');
}
