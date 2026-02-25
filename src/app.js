import { setupFilters } from './dashboard.js';
import { setupCatequistaCRUD, loadCatequistas } from './catequistas.js';
import { setupTurmaCRUD, loadTurmas } from './turmas.js';
import { loadDashboardData } from './dashboard.js';
import { loadPresencaResumo, submitPresenca, closeAttendanceModal, closeHistoryModal, exportFrequenciaExcel, setupFrequenciaActions } from './frequencia.js';
import { setupPhotoUploader, setupConditionalDocUpload, submitJovem, submitAdulto } from './cadastro.js';
import { setupAuth } from './auth.js';
import { closeEditModal, saveEditModal, deleteEditModal, printFicha, setupDocListActions } from './edit.js';
import { setupNavigation as setupUINav, closeSidebar } from './ui.js';
import { initAppData } from './init.js';

async function ignite() {
    console.log('[App] Ignite started...');

    setupUINav();
    setupFilters();
    setupCatequistaCRUD();
    setupTurmaCRUD();
    setupFrequenciaActions();
    setupDocListActions();
    setupAuth();

    console.log('[App] Modules setup called.');

    setupPhotoUploader('photo-trigger-jovem', 'input-foto-jovem', 'photo-preview-jovem', 'photo-placeholder-jovem');
    setupPhotoUploader('photo-trigger-adulto', 'input-foto-adulto', 'photo-preview-adulto', 'photo-placeholder-adulto');
    setupPhotoUploader('photo-trigger-edit', 'input-foto-edit', 'photo-preview-edit', 'photo-placeholder-edit');

    setupConditionalDocUpload('j-batismo-sim', 'j-batismo-nao', 'j-batismo-doc');
    setupConditionalDocUpload('j-comunhao-sim', 'j-comunhao-nao', 'j-comunhao-doc');
    setupConditionalDocUpload('a-batismo-sim', 'a-batismo-nao', 'a-batismo-doc');
    setupConditionalDocUpload('a-comunhao-sim', 'a-comunhao-nao', 'a-comunhao-doc');

    document.getElementById('form-jovem')?.addEventListener('submit', submitJovem);
    document.getElementById('form-adulto')?.addEventListener('submit', submitAdulto);

    document.getElementById('btn-att-save')?.addEventListener('click', submitPresenca);
    document.getElementById('btn-att-close')?.addEventListener('click', closeAttendanceModal);
    document.getElementById('btn-att-cancel')?.addEventListener('click', closeAttendanceModal);

    document.getElementById('btn-modal-close')?.addEventListener('click', closeEditModal);
    document.getElementById('btn-edit-cancel')?.addEventListener('click', closeEditModal);
    document.getElementById('btn-edit-save')?.addEventListener('click', saveEditModal);
    document.getElementById('btn-edit-delete')?.addEventListener('click', deleteEditModal);

    const btnPrint = document.getElementById('btn-print-ficha');
    if (btnPrint) {
        console.log('[App] Binding click to btn-print-ficha');
        btnPrint.addEventListener('click', printFicha);
    } else {
        console.warn('[App] btn-print-ficha NOT found in DOM during ignite');
    }

    const btnExcel = document.getElementById('btn-export-excel');
    if (btnExcel) {
        console.log('[App] Binding click to btn-export-excel');
        btnExcel.addEventListener('click', exportFrequenciaExcel);
    }

    document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);
    console.log('[App] Ignite finished.');
}


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ignite);
} else {
    ignite();
}
