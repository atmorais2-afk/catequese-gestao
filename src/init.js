import { loadDashboardData } from './dashboard.js';
import { loadCatequistas } from './catequistas.js';
import { loadTurmas } from './turmas.js';
import { loadPresencaResumo } from './frequencia.js';

export async function initAppData() {
    console.log('--- initAppData started ---');
    const start = Date.now();
    try {
        console.log('Fetching all app data sequentially...');
        await loadDashboardData();
        console.log('Dashboard data loaded...');
        await loadCatequistas();
        console.log('Catequistas loaded...');
        await loadTurmas();
        console.log('Turmas loaded...');
        await loadPresencaResumo();
        console.log('Attendance summary loaded...');

        console.log(`Initial data load took ${Date.now() - start}ms`);

        const freqDateInput = document.getElementById('f-data');
        if (freqDateInput) {
            const d = new Date();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const date = String(d.getDate()).padStart(2, '0');
            freqDateInput.value = `${year}-${month}-${date}`;
        }
    } catch (err) {
        console.error('Falha ao carregar dados:', err);
    }
}
