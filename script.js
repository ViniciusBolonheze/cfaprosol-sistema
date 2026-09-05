const SUPABASE_URL = 'https://jrudgjopfxfyyhnvgidz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VScGEvhYLgQSDGll2IQIsw_bsTQXRCO';

function criarSupabaseIndisponivel() {
    const erro = { message: 'Biblioteca Supabase não carregada. Verifique a conexão com a internet.' };
    const query = {
        select() { return this; }, eq() { return this; }, single() { return Promise.resolve({ data: null, error: erro }); },
        maybeSingle() { return Promise.resolve({ data: null, error: erro }); }, order() { return this; }, limit() { return this; },
        upsert() { return Promise.resolve({ error: erro }); }, insert() { return Promise.resolve({ error: erro }); },
        update() { return this; }, delete() { return this; }, then(resolve) { resolve({ data: [], error: erro }); }
    };
    return {
        from() { return query; },
        storage: { from() { return { upload() { return Promise.resolve({ data: null, error: erro }); }, getPublicUrl() { return { data: { publicUrl: '' } }; }, remove() { return Promise.resolve({ data: [], error: erro }); } }; } }
    };
}
const supabaseCreateClient = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient
    : (typeof supabase !== 'undefined' && supabase.createClient ? supabase.createClient : null);
const _supabase = supabaseCreateClient ? supabaseCreateClient(SUPABASE_URL, SUPABASE_ANON_KEY) : criarSupabaseIndisponivel();
// Variável global para armazenar a quantidade de grupos ativa (padrão é 6)
let quantidadeGruposAtivos = 6;

const STORAGE_CONVOCACAO_KEY = 'prosol_cfa_convocacao_v1';
let criterioOrdenacaoAtual = 'nome';
let direcaoOrdenacaoAtual = 'asc'; // 'asc' (menor para maior / A-Z) ou 'desc' (maior para menor / Z-A)
let defaultColumns = [
    'Ano', 'NOME COMPLETO', 'APELIDO', 'Data de nascimento', 'Posição 1', 'Posição 2', 'CIDADE', 'Contato', 'RG', 'Foto', 'Anotacoes',
    'AVALIAÇÃO1', 'Data1', 'Altura1', 'alturasentado1', 'peso1', 'Dobras1_1', 'Dobras2_1', 'Dobras3_1', 'Dobras4_1', 'PercentualGordura1', 'alturapredita1', 'nivel1', 'distancia1', 'Salto1_1', 'Salto2_1', 'Salto3_1', 'MelhorSalto1', 'aceleração1_1', 'velocidade1_1', 'aceleração2_1', 'velocidade2_1', 'aceleração3_1', 'velocidade3_1', 'aceleração4_1', 'velocidade4_1', 'aceleração5_1', 'velocidade5_1', 'aceleração6_1', 'velocidade6_1', 'aceleração7_1', 'velocidade7_1', 'Aceleraçãofinal1', 'Velocidadefinal1', 'Volta1_1', 'Volta2_1', 'Agilidade1', 
    'AVALIAÇÃO2', 'Data2', 'Altura2', 'alturasentado2', 'peso2', 'Dobras1_2', 'Dobras2_2', 'Dobras3_2', 'Dobras4_2', 'PercentualGordura2', 'alturapredita2', 'nivel2', 'distancia2', 'Salto1_2', 'Salto2_2', 'Salto3_2', 'MelhorSalto2', 'aceleração1_2', 'velocidade1_2', 'aceleração2_2', 'velocidade2_2', 'aceleração3_2', 'velocidade3_2', 'aceleração4_2', 'velocidade4_2', 'aceleração5_2', 'velocidade5_2', 'aceleração6_2', 'velocidade6_2', 'aceleração7_2', 'velocidade7_2', 'Aceleraçãofinal2', 'Velocidadefinal2', 'Volta1_2', 'Volta2_2', 'Agilidade2'
];

let defaultData = [
    {
        'Ano': '2010', 'NOME COMPLETO': 'Bernardo Delgado Alaver Barroso', 'APELIDO': 'Bernardo', 'Data de nascimento': '23/02/2010', 'Posição 1': 'Volante', 'Posição 2': '1º volante', 'CIDADE': 'Londrina', 'Contato': '(43) 99999-0000', 'RG': '138052478', 'Foto': '', 'Anotacoes':'',
        'Data1': '02/02/2026', 'Altura1': '1,73', 'alturapredita1': '1,78', 'alturasentado1': '90', 'peso1': '66,6', 'Dobras1_1': '7', 'Dobras2_1': '6', 'Dobras3_1': '4,5', 'Dobras4_1': '9,5', 'PercentualGordura1': '0.10495',
        'nivel1': '18,4', 'distancia1': '1880', 'Salto1_1': '2,09', 'Salto2_1': '2,3', 'Salto3_1': '2,39', 'MelhorSalto1': '2,39',
        'Aceleraçãofinal1': '4.2', 'Velocidadefinal1': '21.5',
        'Volta1_1': '4,7', 'Volta2_1': '4,7', 'Agilidade1': '4,7'
    }
];

let excelColumns = defaultColumns;
let excelData = defaultData;
let uploadedPhotoBase64 = '';
let selectedAthleteIndex = null;
let editingAthleteIndex = null;
let currentPfTab = 'antropometricas';
let selectedConvocados = new Set();
let convocacaoSessaoAtiva = false;
let convocacaoCarregadaNaSessao = false;
let professorJogosAtual = null;

// Variável de controle para os Grupos
let gruposData = {
    'Grupo 1': [], 'Grupo 2': [], 'Grupo 3': [], 'Grupo 4': [], 'Grupo 5': [], 'Grupo 6': []
};
// Variável global para armazenar os exercícios que vêm do banco de dados
let exerciciosSalvosNaNuvem = {};
async function loadFromStorage() {
    try {
        const { data, error } = await _supabase.from('sistema_config').select('colunas, dados').eq('chave', 'principal').single();
        if (!error && data) {
            if (data.colunas && data.colunas.length > 0) excelColumns = data.colunas;
            if (data.dados && data.dados.length > 0) excelData = data.dados;
        }
    } catch (err) { console.error('Erro de conexão:', err); }

    const savedConvocacao = localStorage.getItem(STORAGE_CONVOCACAO_KEY);
    if (savedConvocacao) {
        try { selectedConvocados = new Set(JSON.parse(savedConvocacao)); } catch(e) {}
    }

    await carregarControlePesoStorage();
    initExcelTable();
    populateEvalSelect(); 
    ensureTestAddButton();
    ensureCalculadoraButton();
    ensurePesoButton();
    ensureGruposButton(); // Inicializa o novo botão flutuante
    ensureConvocacaoModalDom();
    ensurePrintStyles();
    initGruposFilter(); // Inicializa checkboxes da aba de grupos
}

let saveQueue = Promise.resolve();
async function saveToStorage() {
    const payload = { chave: 'principal', colunas: excelColumns, dados: excelData, atualizado_em: new Date().toISOString() };
    saveQueue = saveQueue.then(async () => {
        const { error } = await _supabase.from('sistema_config').upsert(payload, { onConflict: 'chave' });
        if (error) { console.error('Erro ao salvar no Supabase:', error); alert('Não foi possível salvar os dados no banco.'); return false; }
        return true;
    });
    return saveQueue;
}

function atualizarCabecalhoSistema() {
    const dateEl = document.querySelector('.date-display');
    if (dateEl) {
        const dataAtual = new Intl.DateTimeFormat('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }).format(new Date());
        dateEl.textContent = dataAtual;
    }

    const instagramEl = document.querySelector('.instagram-icon');
    if (instagramEl && !instagramEl.dataset.instagramReady) {
        instagramEl.dataset.instagramReady = '1';
        instagramEl.style.cursor = 'pointer';
        instagramEl.title = 'Abrir Instagram';
        instagramEl.addEventListener('click', () => {
            window.open('https://instagram.com/vinicius_bolonheze', '_blank', 'noopener,noreferrer');
        });
        instagramEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                window.open('https://instagram.com/vinicius_bolonheze', '_blank', 'noopener,noreferrer');
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", () => { atualizarCabecalhoSistema(); loadFromStorage(); });

/* === FUNÇÕES DE IMPRESSÃO / EXPORTAÇÃO === */
function ensurePrintStyles() {
    if (!document.getElementById('dynamic-print-style')) {
        const style = document.createElement('style');
        style.id = 'dynamic-print-style';
        style.innerHTML = `
            @media print {
                /* Oculta as demais telas, mas mantém o modal da ficha visível.
                   O seletor body > #fichaModal é intencionalmente mais específico
                   que a regra geral de impressão das fichas de treino. */
                body.printing-athlete > *:not(#fichaModal) { display: none !important; }
                body.printing-athlete > #fichaModal {
                    display: flex !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                    min-height: 0 !important;
                    align-items: flex-start !important;
                    justify-content: center !important;
                    background: #fff !important;
                    z-index: 9999 !important;
                }
                body.printing-athlete #fichaModal { display: flex !important; }
                .modal-container { box-shadow: none !important; border: none !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
                .modal-header, .close-btn, .print-hide, button { display: none !important; }
                #fichaExportContent { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
                #fichaExportContent .modal-footer ~ .modal-footer { display: none !important; }
                html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
                @page { size: portrait; margin: 10mm; }
            }
        `;
        document.head.appendChild(style);
    }
}


function onQtdGruposChange() {
    const selectQtd = document.getElementById('select-qtd-grupos');
    quantidadeGruposAtivos = parseInt(selectQtd.value) || 6;
    renderGruposScreen();
}


function shareFichaPDF() {
    const element = document.getElementById('fichaExportContent');
    if (!element) return;
    if (typeof html2pdf !== 'undefined') {
        const opt = { margin: 10, filename: 'ficha_do_atleta.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
        html2pdf().from(element).set(opt).outputPdf('blob').then((pdfBlob) => {
            const file = new File([pdfBlob], 'ficha_do_atleta.pdf', { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: 'Ficha do Atleta', text: 'Segue a ficha do atleta em PDF.' }).catch(err => console.log('Erro:', err));
            } else { html2pdf().from(element).set(opt).save(); }
        });
    } else { window.print(); }
}
function printFicha() {
    document.body.classList.add('printing-athlete');
    const cleanup = () => {
        document.body.classList.remove('printing-athlete');
        window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1500);
}

/* === NAVEGAÇÃO === */
function enterSystem() {
    document.body.classList.add('app-v3-mode');
    if (typeof modernV3EnsureMenu === 'function') modernV3EnsureMenu();
    if (typeof modernV3BuildHome === 'function') modernV3BuildHome();
    if (typeof modernV3HistoryInit === 'function') modernV3HistoryInit();
    if (typeof modernV3ApplyMobileClass === 'function') modernV3ApplyMobileClass();
    document.getElementById('login-screen').classList.remove('active-screen');
    document.getElementById('home-screen').classList.add('active-screen');
    document.getElementById('main-nav').style.display = 'flex';
    document.getElementById('yellow-bar-nav').style.display = 'block';
    renderIndicadorPreparacaoFisica();
    atualizarIndicadorPreparacaoFisica();
    modernV3ManualSidebarClosed = (typeof modernV3IsMobileViewport === 'function' && modernV3IsMobileViewport());
    document.body.classList.toggle('modern-v3-sidebar-collapsed', modernV3ManualSidebarClosed);
}

function navigateTo(screenId, event) {
    if (screenId !== 'convocacao') { convocacaoSessaoAtiva = false; convocacaoCarregadaNaSessao = false; }
    if (screenId === 'convocacao') { openConvocacaoModal(); return; }

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active-screen');
        // O GERAR FICHAS coloca display:none inline em todas as telas.
        // Limpamos esse estilo para que a classe active-screen volte a funcionar.
        screen.style.display = '';
    });

    // A tela de fichas é exibida com display inline pelo GERAR FICHAS.
    // Ao navegar pelo menu, ela precisa ser escondida explicitamente;
    // caso contrário, permanece sobre as outras telas e bloqueia os cliques.
    const fichasTreinoScreen = document.getElementById('fichas-treino-screen');
    if (fichasTreinoScreen) {
        fichasTreinoScreen.style.display = 'none';
    }

    const fabCalc = document.getElementById('btn-calculadora-fab');
    if (fabCalc) fabCalc.style.display = (screenId === 'testes') ? 'flex' : 'none';
    const fabPeso = document.getElementById('btn-peso-pf-fab');
    if (fabPeso) fabPeso.style.display = (screenId === 'testes') ? 'flex' : 'none';
    const fabAdd = document.getElementById('btn-add-athlete-pf-fab');
    const fabGrupos = document.getElementById('btn-grupos-pf-fab');
    if (fabAdd) fabAdd.style.display = (screenId === 'testes') ? 'flex' : 'none';
    if (fabGrupos) fabGrupos.style.display = (screenId === 'testes') ? 'flex' : 'none';

    if (screenId === 'home') {
        document.getElementById('home-screen').classList.add('active-screen');
    } else if (screenId === 'excel-db') {
        document.getElementById('excel-db-screen').classList.add('active-screen');
        renderExcelTable();
    } else if (screenId === 'atletas') {
        document.getElementById('atletas-screen').classList.add('active-screen');
        renderAtletasScreen();
        if (event && event.target && event.target.classList.contains('nav-btn')) event.target.classList.add('active');
    } else if (screenId === 'testes') {
        document.getElementById('testes-screen').classList.add('active-screen');
        renderPfTable();
        if (event && event.target && event.target.classList.contains('nav-btn')) event.target.classList.add('active');
    } else if (screenId === 'grupos') {
        document.getElementById('grupos-screen').classList.add('active-screen');
        renderGruposScreen();
    } else {
        if (screenId === 'relatorios') { openRelatoriosMenuModal(); return; }
        if (screenId === 'jogos') { openJogosProfessorModal(); return; }
        if (screenId === 'prancheta') {
            openPranchetaModal();
            return;
        }
        const genericScreen = document.getElementById('generic-screen');
        genericScreen.style.display = 'flex';
        genericScreen.classList.add('active-screen');
        const titles = { 'prancheta': 'Prancheta Tática Virtual', 'relatorios': 'Relatórios de Desempenho', 'jogos': 'Controle de Jogos' };
        document.getElementById('generic-title').innerText = titles[screenId] || 'Módulo em Desenvolvimento';
        if (event && event.target && event.target.classList.contains('nav-btn')) event.target.classList.add('active');
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => alert(`Erro: ${err.message}`));
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

/* === FUNÇÕES AUXILIARES / EXCEL === */
function initExcelTable() {
    const headerRow = document.getElementById('excel-header-row');
    if (!headerRow) return;
    headerRow.innerHTML = '';
    const thNum = document.createElement('th'); thNum.textContent = '#'; headerRow.appendChild(thNum);
    excelColumns.forEach(col => { const th = document.createElement('th'); th.textContent = col; headerRow.appendChild(th); });
}

function convertExcelDate(value) {
    if (!value) return '';
    if (typeof value === 'string' && (value.includes('/') || value.includes('-'))) return value;
    let num = Number(value);
    if (!isNaN(num) && num > 1000 && num < 60000) {
        let utc_days = Math.floor(num - 25569);
        let date_info = new Date(utc_days * 86400 * 1000);
        return `${String(date_info.getUTCDate()).padStart(2, '0')}/${String(date_info.getUTCMonth() + 1).padStart(2, '0')}/${date_info.getUTCFullYear()}`;
    }
    return value;
}

function formatGordura(val) {
    if (val === undefined || val === null || val === '' || val === '-') return '-';
    let clean = String(val).replace('%', '').trim().replace(',', '.');
    let num = parseFloat(clean);
    if (isNaN(num)) return val;
    if (num > 0 && num <= 1) num = num * 100;
    return num.toFixed(2).replace('.', ',') + '%';
}

function renderExcelTable() {
    initExcelTable();
    const tbody = document.getElementById('excel-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    excelData.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        const tdNum = document.createElement('td');
        tdNum.textContent = rowIndex + 1; tdNum.style.backgroundColor = '#f2f2f2'; tdNum.style.fontWeight = 'bold';
        tr.appendChild(tdNum);
        excelColumns.forEach(col => {
            const td = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'text';
            let val = row[col] !== undefined && row[col] !== null ? row[col] : '';
            if (col.toLowerCase().includes('data') || col.toLowerCase().includes('nascimento')) val = convertExcelDate(val);
            input.value = val;
            input.onchange = (e) => { excelData[rowIndex][col] = e.target.value; saveToStorage(); };
            td.appendChild(input); tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

function addRowToExcel() {
    let newRow = {}; excelColumns.forEach(col => { newRow[col] = ''; });
    excelData.push(newRow); saveToStorage(); renderExcelTable();
}

function exportarBancoDadosXLSX() {
    if (typeof XLSX === 'undefined') {
        alert('A biblioteca do Excel não foi carregada.');
        return;
    }
    if (!excelData || excelData.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }

    // Usa a ordem atual das colunas do banco, sem alterar os títulos.
    const dadosParaExportar = excelData.map(row => {
        const novoRow = {};
        excelColumns.forEach(coluna => {
            novoRow[coluna] = row[coluna] !== undefined && row[coluna] !== null ? row[coluna] : '';
        });
        return novoRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(dadosParaExportar, { header: excelColumns });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Banco de Dados');
    XLSX.writeFile(workbook, 'banco_de_dados_cfa_prosol.xlsx');
}

function importExcelFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
            if (jsonData.length > 0) {
                excelColumns = Object.keys(jsonData[0]);
                excelData = jsonData; saveToStorage(); populateEvalSelect(); renderExcelTable();
                alert(`Importado com sucesso! ${jsonData.length} atletas carregados.`);
            }
        } catch (error) { alert(`Erro: ${error.message}`); }
    };
    reader.readAsArrayBuffer(file); event.target.value = '';
}

/* === FUNÇÕES GENÉRICAS E TELA DE ATLETAS MANTIDAS DO ORIGINAL === */
function openFichaAtleta(globalIndex) {
    if (globalIndex === null || globalIndex === undefined || !excelData[globalIndex]) {
        alert('Selecione um atleta na lista primeiro.'); return;
    }
    const row = excelData[globalIndex];
    function getVal(keys) {
        for (let key in row) {
            let kLow = key.toLowerCase();
            for (let target of keys) {
                if (kLow === target.toLowerCase() || kLow.includes(target.toLowerCase())) {
                    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return row[key];
                }
            }
        }
        return '-';
    }
    let maxEvalNum = 1;
    for (let i = 1; i <= 20; i++) {
        let hasEvalData = false;
        for (let key in row) {
            let kLow = key.toLowerCase();
            if ((kLow === ('altura' + i) || kLow === ('peso' + i) || kLow === ('data' + i)) && row[key] && String(row[key]).trim() !== '-') { hasEvalData = true; break; }
        }
        if (hasEvalData) maxEvalNum = i;
    }
    const evalNum = maxEvalNum;
    function getEvalVal(baseNames) {
        for (let base of baseNames) {
            let candidates = [base + evalNum, base + '_' + evalNum];
            for (let cand of candidates) {
                for (let key in row) {
                    if (key.toLowerCase() === cand.toLowerCase()) {
                        if (row[key] && String(row[key]).trim() !== '-' && String(row[key]).trim() !== '') return row[key];
                    }
                }
            }
        }
        return '-';
    }
    const nome = getVal(['NOME COMPLETO', 'nome']) !== '-' ? getVal(['NOME COMPLETO', 'nome']) : (getVal(['APELIDO']) !== '-' ? getVal(['APELIDO']) : 'Sem Nome');
    const posicao = getVal(['Posição 1', 'posicao1', 'posição']);
    const nascimento = convertExcelDate(getVal(['Data de nascimento', 'nascimento']));
    const cidade = getVal(['CIDADE', 'cidade']);
    const foto = getVal(['Foto', 'foto']);
    const altura = getEvalVal(['Altura', 'altura']);
    const peso = getEvalVal(['peso', 'peso']);
    const alturapredita = getEvalVal(['alturapredita']);
    const subescapular = getEvalVal(['Dobras1', 'dobras1']);
    const triciptal = getEvalVal(['Dobras2', 'dobras2']);
    const supraIliaca = getEvalVal(['Dobras3', 'dobras3']);
    const abdominal = getEvalVal(['Dobras4', 'dobras4']);
    const gordura = formatGordura(getEvalVal(['PercentualGordura', 'gordura']));
    const dataAvaliacao = convertExcelDate(getEvalVal(['Data', 'data']));
    
    document.getElementById('fichaModalBody').innerHTML = `
        <div id="fichaExportContent" style="background: #fff; padding: 10px;">
            <div class="player-profile">
                <img src="${(foto && foto !== '-') ? foto : 'https://via.placeholder.com/110x140?text=Sem+Foto'}" class="player-photo">
                <div class="player-details">
                    <h3>${nome}</h3><p><strong>Posição:</strong> ${posicao}</p><p><strong>Nascimento:</strong> ${nascimento}</p><p><strong>Cidade:</strong> ${cidade !== '-' ? cidade : 'Apucarana'}</p>
                </div>
            </div>
            <div class="metrics-section">
                <h4>MEDIDAS ANTROPOMÉTRICAS ${dataAvaliacao !== '-' ? '(Avaliação ' + evalNum + ': ' + dataAvaliacao + ')' : ''}</h4>
                <div class="metrics-grid">
                    <div class="metric-item"><strong>Altura:</strong> ${altura !== '-' ? altura + ' m' : '-'}</div>
                    <div class="metric-item"><strong>Subescapular:</strong> ${subescapular !== '-' ? subescapular + ' cm' : '-'}</div>
                    <div class="metric-item"><strong>Massa Corporal:</strong> ${peso !== '-' ? peso + ' Kg' : '-'}</div>
                    <div class="metric-item"><strong>Triciptal:</strong> ${triciptal !== '-' ? triciptal + ' cm' : '-'}</div>
                    <div class="metric-item"><strong>Supra Ilíaca:</strong> ${supraIliaca !== '-' ? supraIliaca + ' cm' : '-'}</div>
                    <div class="metric-item"><strong>Abdominal:</strong> ${abdominal !== '-' ? abdominal + ' cm' : '-'}</div>
                    <div class="metric-item"><strong>% Gordura:</strong> ${gordura}</div>
                </div>
                ${alturapredita !== '-' ? `<div class="predicted-height">Altura Predita: ${alturapredita} m</div>` : ''}
            </div>
            <div class="modal-footer" style="margin-top: 15px;"><p><strong>CEO Enzo Gardini:</strong> (43) 98807-1610</p><p><strong>Instagram:</strong> @cfaprosol</p></div>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px;" class="no-print">
            <button onclick="shareFichaPDF()" style="flex: 1; padding: 12px; background: #0984e3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Compartilhar PDF</button>
            <button onclick="printFicha()" style="flex: 1; padding: 12px; background: #6c5ce7; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Imprimir</button>
        </div>
    `;
    document.getElementById('fichaModal').style.display = 'flex';
}
function closeModal() { document.getElementById('fichaModal').style.display = 'none'; }
window.onclick = function(event) { if (event.target === document.getElementById('fichaModal')) closeModal(); }

function renderAtletasScreen() {
    const selectedYears = Array.from(document.querySelectorAll('.year-chk:checked')).map(chk => chk.value);
    const posLists = { 'goleiros': document.getElementById('list-goleiros'), 'zagueiros': document.getElementById('list-zagueiros'), 'laterais': document.getElementById('list-laterais'), 'volantes': document.getElementById('list-volantes'), 'meias': document.getElementById('list-meias'), 'atacantes': document.getElementById('list-atacantes'), 'extremos': document.getElementById('list-extremos') };
    for (let key in posLists) { if (posLists[key]) posLists[key].innerHTML = ''; }

    excelData.forEach((row, globalIndex) => {
        let anoAtleta = Object.keys(row).find(k => k.toLowerCase() === 'ano'); anoAtleta = anoAtleta ? String(row[anoAtleta]).trim() : '';
        if (selectedYears.length > 0 && !selectedYears.includes(anoAtleta)) return;
        
        let nomeExibicao = Object.keys(row).find(k => k.toLowerCase().includes('apelido')); nomeExibicao = nomeExibicao && row[nomeExibicao] ? row[nomeExibicao] : '';
        if (!nomeExibicao) { let nm = Object.keys(row).find(k => k.toLowerCase().includes('nome')); nomeExibicao = nm && row[nm] ? row[nm] : 'Sem Nome'; }
        
        let posicao = Object.keys(row).find(k => k.toLowerCase().includes('posição') || k.toLowerCase().includes('posicao'));
        posicao = posicao ? String(row[posicao]).toLowerCase() : '';
        
        let targetBox = 'meias';
        if (posicao.includes('goleiro')) targetBox = 'goleiros'; else if (posicao.includes('zagueiro')) targetBox = 'zagueiros'; else if (posicao.includes('lateral')) targetBox = 'laterais'; else if (posicao.includes('volante')) targetBox = 'volantes'; else if (posicao.includes('atacante')) targetBox = 'atacantes'; else if (posicao.includes('extremo') || posicao.includes('ponta')) targetBox = 'extremos';

        // 1. Verifica se existe anotação preenchida
        let temAnotacao = row['Anotacoes'] && String(row['Anotacoes']).trim() !== '';
        let iconeFicha = temAnotacao ? `
            <svg width="13" height="15" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-2px; margin-left:35px;" title="Atleta possui anotações">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" fill="#ccc"></rect>
                <line x1="9" y1="12" x2="15" y2="12"></line>
                <line x1="9" y1="16" x2="13" y2="16"></line>
            </svg>
        ` : '';

        // 2. NOVO: Verifica se o atleta está lesionado ('Lesao' igual a 'sim')
        let chaveLesao = Object.keys(row).find(k => k.toLowerCase() === 'lesao');
        let valorLesao = chaveLesao ? String(row[chaveLesao]).toLowerCase().trim() : '';
        let estaLesionado = valorLesao === 'sim';

        let iconeLesao = estaLesionado ? `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#d63031" style="display:inline-block; vertical-align:-2px; margin-left:4px;" title="Atleta Lesionado">
                <rect x="9" y="2" width="6" height="20" rx="1" fill="#d63031"></rect>
                <rect x="2" y="9" width="20" height="6" rx="1" fill="#d63031"></rect>
            </svg>
        ` : '';

        // 3. Verifica se o atleta está marcado com cartão vermelho
        let chaveCartaoVermelho = Object.keys(row).find(k => ['cartaovermelho','cartao vermelho','cartão vermelho'].includes(k.toLowerCase().replace(/_/g, ' ').trim()) || k.toLowerCase().replace(/\s+/g,'') === 'cartaovermelho');
        let valorCartaoVermelho = chaveCartaoVermelho ? String(row[chaveCartaoVermelho]).toLowerCase().trim() : '';
        let temCartaoVermelho = valorCartaoVermelho === 'sim';

        let iconeCartaoVermelho = temCartaoVermelho ? `
            <svg width="13" height="16" viewBox="0 0 18 24" style="display:inline-block; vertical-align:-3px; margin-left:4px;" title="Cartão Vermelho">
                <rect x="3" y="2" width="12" height="20" rx="2" fill="#d63031" stroke="#7a0000" stroke-width="1.5"></rect>
            </svg>
        ` : '';

        const itemDiv = document.createElement('div');
        itemDiv.className = 'athlete-item' + (selectedAthleteIndex === globalIndex ? ' selected' : '');
        itemDiv.draggable = true;
        itemDiv.dataset.atletaIndex = String(globalIndex);
        itemDiv.addEventListener('dragstart', (event) => {
            event.dataTransfer.setData('text/plain', String(globalIndex));
            event.dataTransfer.effectAllowed = 'move';
            itemDiv.classList.add('arrastando-atleta');
        });
        itemDiv.addEventListener('dragend', () => itemDiv.classList.remove('arrastando-atleta'));
        if(selectedAthleteIndex === globalIndex) { itemDiv.style.backgroundColor = '#0984e3'; itemDiv.style.color = '#fff'; }
        
        // 4. Insere o nome junto com os ícones (ficha, lesão e/ou cartão vermelho)
        itemDiv.innerHTML = `<span>${nomeExibicao} ${iconeFicha} ${iconeLesao} ${iconeCartaoVermelho}</span> <span>${anoAtleta}</span>`;
        
        itemDiv.onclick = () => {
            selectedAthleteIndex = globalIndex;
            renderAtletasScreen();
            setTimeout(() => mostrarCardAtletaSelecionado(globalIndex), 0);
        };
        if (posLists[targetBox]) posLists[targetBox].appendChild(itemDiv);
    });
    configurarDropAtletasPosicoes(posLists);
    if (selectedAthleteIndex !== null && selectedAthleteIndex !== undefined) {
        setTimeout(() => mostrarCardAtletaSelecionado(selectedAthleteIndex), 0);
    } else {
        esconderTooltipAtletaCadastro();
    }
}


function atletasTooltipEscape(valor){
    if (typeof escapeHtmlJogos === 'function') return escapeHtmlJogos(valor);
    return String(valor ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
}
function valorFlexAtletaCadastro(row, termos){
    const chave = Object.keys(row || {}).find(k => termos.some(t => String(k).toLowerCase().includes(String(t).toLowerCase())));
    return chave ? row[chave] : '';
}
function valorExatoAtletaCadastro(row, nome){
    const chave = Object.keys(row || {}).find(k => String(k).toLowerCase().trim() === String(nome).toLowerCase().trim());
    return chave ? row[chave] : '';
}
function ultimaAvaliacaoAtletaCadastro(row){
    let max = 1;
    for(let i=1;i<=30;i++){
        const bases=['Data','Altura','peso','alturapredita','altura','Peso'];
        const tem=bases.some(base=>{
            const nomes=[base+i,base+'_'+i].map(x=>x.toLowerCase());
            const chave=Object.keys(row||{}).find(k=>nomes.includes(String(k).toLowerCase()));
            return chave && row[chave] !== undefined && row[chave] !== null && String(row[chave]).trim() !== '' && String(row[chave]).trim() !== '-';
        });
        if(tem)max=i;
    }
    const get=(base)=>{
        const nomes=[base+max,base+'_'+max].map(x=>x.toLowerCase());
        const chave=Object.keys(row||{}).find(k=>nomes.includes(String(k).toLowerCase()));
        const val=chave?row[chave]:'';
        return (val!==undefined&&val!==null&&String(val).trim()!=='')?String(val).trim():'-';
    };
    return {numero:max,peso:get('peso'),altura:get('Altura'),alturaPredita:get('alturapredita')};
}

function textoAnotacaoAtletaCadastro(row){
    const bruto = String((row || {}).Anotacoes || valorFlexAtletaCadastro(row, ['anotacoes','anotações']) || '').trim();
    if(!bruto)return '';
    const texto = bruto.split('--- [DOCUMENTOS ANEXADOS] ---')[0].trim();
    return texto;
}
function atletaCadastroTemLesao(row){
    const chave = Object.keys(row || {}).find(k => String(k).toLowerCase().trim() === 'lesao' || String(k).toLowerCase().trim() === 'lesão');
    return chave ? String(row[chave]).toLowerCase().trim() === 'sim' : false;
}
function atletaCadastroTemCartaoVermelho(row){
    const chave = Object.keys(row || {}).find(k => {
        const norm = String(k).toLowerCase().replace(/_/g,' ').replace(/\s+/g,' ').trim();
        const compact = norm.replace(/\s+/g,'');
        return ['cartao vermelho','cartão vermelho'].includes(norm) || compact === 'cartaovermelho';
    });
    return chave ? String(row[chave]).toLowerCase().trim() === 'sim' : false;
}
function statusIconsAtletaCadastro(row, anotacaoTexto){
    const icons=[];
    if(atletaCadastroTemLesao(row)) icons.push('<span class="atleta-status-icon lesao" title="Lesão">✚</span>');
    if(atletaCadastroTemCartaoVermelho(row)) icons.push('<span class="atleta-status-icon cartao" title="Cartão vermelho"></span>');
    if(anotacaoTexto) icons.push('<span class="atleta-status-icon anotacao" title="Anotação">📝</span>');
    return icons.length ? `<div class="atleta-hover-status-row">${icons.join('')}</div>` : '';
}
function htmlAnotacaoAtletaCadastro(texto){
    if(!texto)return '';
    const seguro = atletasTooltipEscape(texto).replace(/\n/g,'<br>');
    return `<div class="atleta-hover-tooltip-anotacao"><span>Anotações:</span> ${seguro}</div>`;
}
function htmlTooltipAtletaCadastro(globalIndex){
    const row=excelData[globalIndex]||{};
    const nome=valorExatoAtletaCadastro(row,'NOME COMPLETO')||valorFlexAtletaCadastro(row,['nome completo'])||valorFlexAtletaCadastro(row,['nome'])||'Sem nome';
    const apelido=valorFlexAtletaCadastro(row,['apelido'])||nome;
    const nascimento=convertExcelDate(valorFlexAtletaCadastro(row,['data de nascimento','nascimento']))||'-';
    const cidade=valorExatoAtletaCadastro(row,'CIDADE')||valorFlexAtletaCadastro(row,['cidade'])||'-';
    const foto=valorFlexAtletaCadastro(row,['foto','imagem'])||'logo.png';
    const av=ultimaAvaliacaoAtletaCadastro(row);
    const anotacaoTexto=textoAnotacaoAtletaCadastro(row);
    const status=statusIconsAtletaCadastro(row, anotacaoTexto);
    return `<div class="atleta-hover-tooltip-head"><img src="${atletasTooltipEscape(foto)}" onerror="this.src='logo.png'" alt="${atletasTooltipEscape(apelido)}"><div><div class="atleta-hover-tooltip-title">${atletasTooltipEscape(apelido)}${status}</div><div class="atleta-hover-tooltip-name">${atletasTooltipEscape(nome)}</div></div></div>
        <div class="atleta-hover-tooltip-grid">
            <span>Nascimento</span><b>${atletasTooltipEscape(nascimento)}</b>
            <span>Peso</span><b>${atletasTooltipEscape(av.peso)}${av.peso!=='-'?' kg':''}</b>
            <span>Altura</span><b>${atletasTooltipEscape(av.altura)}${av.altura!=='-'?' m':''}</b>
            <span>Alt. Predita</span><b>${atletasTooltipEscape(av.alturaPredita)}${av.alturaPredita!=='-'?' m':''}</b>
            <span>Cidade</span><b>${atletasTooltipEscape(cidade)}</b>
        </div>${htmlAnotacaoAtletaCadastro(anotacaoTexto)}`;
}
function obterTooltipAtletaCadastro(){
    let el=document.getElementById('atleta-hover-tooltip');
    if(!el){
        el=document.createElement('div');
        el.id='atleta-hover-tooltip';
        el.className='atleta-hover-tooltip';
        document.body.appendChild(el);
    }
    return el;
}
function posicionarTooltipAtletaCadastro(event){
    const el=document.getElementById('atleta-hover-tooltip');
    if(!el || el.style.display==='none')return;
    const margem=14;
    const rect=el.getBoundingClientRect();
    let x=event.clientX+margem;
    let y=event.clientY+margem;
    if(x+rect.width>window.innerWidth-8) x=event.clientX-rect.width-margem;
    if(y+rect.height>window.innerHeight-8) y=event.clientY-rect.height-margem;
    el.style.left=Math.max(8,x)+'px';
    el.style.top=Math.max(8,y)+'px';
}
function mostrarTooltipAtletaCadastro(event, globalIndex){
    mostrarCardAtletaSelecionado(globalIndex, event);
}
function posicionarCardAtletaSelecionado(globalIndex, event){
    const el=document.getElementById('atleta-hover-tooltip');
    if(!el || el.style.display==='none')return;
    let alvo=document.querySelector(`.athlete-item.selected[data-atleta-index="${globalIndex}"]`);
    let rect=alvo ? alvo.getBoundingClientRect() : null;
    const margem=12;
    const card=el.getBoundingClientRect();
    let x, y;
    if(rect){
        x=rect.right+margem;
        y=rect.top;
        if(x+card.width>window.innerWidth-8) x=rect.left-card.width-margem;
        if(y+card.height>window.innerHeight-8) y=window.innerHeight-card.height-8;
    }else if(event){
        x=event.clientX+margem;
        y=event.clientY+margem;
    }else{
        el.style.display='none';
        return;
    }
    el.style.left=Math.max(8,x)+'px';
    el.style.top=Math.max(8,y)+'px';
}
function mostrarCardAtletaSelecionado(globalIndex, event){
    if(globalIndex===null || globalIndex===undefined || !excelData[globalIndex]){esconderTooltipAtletaCadastro();return;}
    const el=obterTooltipAtletaCadastro();
    el.innerHTML=htmlTooltipAtletaCadastro(globalIndex);
    el.style.display='block';
    posicionarCardAtletaSelecionado(globalIndex, event);
}
function moverTooltipAtletaCadastro(event){/* Agora o card aparece ao selecionar, não ao passar o mouse. */}
function esconderTooltipAtletaCadastro(){const el=document.getElementById('atleta-hover-tooltip');if(el)el.style.display='none';}

function limparSelecaoAtletaCadastro(renderizar=true){
    esconderTooltipAtletaCadastro();
    if(selectedAthleteIndex!==null && selectedAthleteIndex!==undefined){
        selectedAthleteIndex=null;
        const atletasScreen=document.getElementById('atletas-screen');
        if(renderizar && atletasScreen && atletasScreen.classList.contains('active-screen')) renderAtletasScreen();
    }
}
function cliqueMantemSelecaoAtleta(alvo){
    const botao=alvo.closest ? alvo.closest('button') : null;
    const acao=botao ? String(botao.getAttribute('onclick')||'') : '';
    return /openEditAthleteModal|openFichaAtleta|openAnotacoesModal|deleteSelectedAthlete/.test(acao);
}
function limparSelecaoAtletaAoClicarFora(event){
    const alvo=event.target;
    // Se clicou em outro atleta, o próprio clique do atleta atualiza seleção e card.
    if(alvo.closest && alvo.closest('.athlete-item')) return;

    // Clicou em Editar / Ver Ficha / Anotações / Excluir:
    // esconde o card, mas mantém o atleta selecionado para a ação funcionar.
    if(alvo.closest && cliqueMantemSelecaoAtleta(alvo)){
        esconderTooltipAtletaCadastro();
        return;
    }

    // Cliques dentro de modais não devem alterar estado enquanto a ação está em andamento.
    if(alvo.closest && alvo.closest('.vba-modal-overlay,.modal-overlay,.atleta-posicao-drop-overlay,#fichaModal,#modal-anotacoes')){
        esconderTooltipAtletaCadastro();
        return;
    }

    // Qualquer outro local/botão limpa card e seleção.
    limparSelecaoAtletaCadastro(true);
}
if(!window.__limparSelecaoAtletaForaReady){
    window.__limparSelecaoAtletaForaReady=true;
    document.addEventListener('click',limparSelecaoAtletaAoClicarFora);
}

function deleteSelectedAthlete() {
    if (selectedAthleteIndex === null) { alert('Selecione um atleta na lista.'); return; }
    if (confirm('Deseja realmente excluir o atleta?')) { excelData.splice(selectedAthleteIndex, 1); selectedAthleteIndex = null; saveToStorage(); renderAtletasScreen(); }
}

function atletasPosicaoOpcoes(grupo){
    const mapa = {
        goleiros: [{label:'Goleiro', pos1:'Goleiro', pos2:'Goleiro'}],
        zagueiros: [
            {label:'Zagueiro', pos1:'Zagueiro', pos2:'Zagueiro'},
            {label:'Zagueiro Dir.', pos1:'Zagueiro', pos2:'Zagueiro Dir.'},
            {label:'Zagueiro Esq.', pos1:'Zagueiro', pos2:'Zagueiro Esq.'}
        ],
        laterais: [
            {label:'Lateral Dir.', pos1:'Lateral', pos2:'Lateral Dir.'},
            {label:'Lateral Esq.', pos1:'Lateral', pos2:'Lateral Esq.'}
        ],
        volantes: [
            {label:'Volante', pos1:'Volante', pos2:'Volante'},
            {label:'1º volante', pos1:'Volante', pos2:'1º volante'},
            {label:'2º volante', pos1:'Volante', pos2:'2º volante'}
        ],
        meias: [
            {label:'Meia', pos1:'Meia', pos2:'Meia'},
            {label:'Meia central', pos1:'Meia', pos2:'Meia central'},
            {label:'Meia atacante', pos1:'Meia', pos2:'Meia atacante'}
        ],
        atacantes: [
            {label:'Atacante', pos1:'Atacante', pos2:'Atacante'},
            {label:'Centroavante', pos1:'Atacante', pos2:'Centroavante'},
            {label:'Segundo atacante', pos1:'Atacante', pos2:'Segundo atacante'}
        ],
        extremos: [
            {label:'Ponta Dir.', pos1:'Extremo', pos2:'Ponta Dir.'},
            {label:'Ponta Esq.', pos1:'Extremo', pos2:'Ponta Esq.'},
            {label:'Extremo', pos1:'Extremo', pos2:'Extremo'}
        ]
    };
    return mapa[grupo] || mapa.meias;
}
function garantirColunaAtleta(nomeColuna){
    if(!excelColumns.includes(nomeColuna)) excelColumns.push(nomeColuna);
}
function aplicarNovaPosicaoAtleta(globalIndex, opcao){
    const row = excelData[globalIndex];
    if(!row || !opcao) return;
    garantirColunaAtleta('Posição 1');
    garantirColunaAtleta('Posição 2');
    row['Posição 1'] = opcao.pos1;
    row['Posição 2'] = opcao.pos2 || opcao.pos1;
    selectedAthleteIndex = globalIndex;
    saveToStorage();
    renderAtletasScreen();
}
function abrirPopupPosicaoAtleta(globalIndex, grupo){
    const row = excelData[globalIndex];
    if(!row) return;
    const opcoes = atletasPosicaoOpcoes(grupo);
    if(opcoes.length === 1){ aplicarNovaPosicaoAtleta(globalIndex, opcoes[0]); return; }
    const apelidoKey = Object.keys(row).find(k=>k.toLowerCase().includes('apelido')) || Object.keys(row).find(k=>k.toLowerCase().includes('nome'));
    const nome = apelidoKey ? row[apelidoKey] : 'Atleta';
    let modal = document.getElementById('atleta-posicao-drop-modal');
    if(!modal){
        modal = document.createElement('div');
        modal.id = 'atleta-posicao-drop-modal';
        modal.className = 'atleta-posicao-drop-overlay';
        document.body.appendChild(modal);
        modal.addEventListener('click', e=>{ if(e.target===modal) fecharPopupPosicaoAtleta(); });
    }
    modal.innerHTML = `<div class="atleta-posicao-drop-card"><button class="atleta-posicao-drop-close" onclick="fecharPopupPosicaoAtleta()">×</button><h3>Definir posição</h3><p>${escapeHtmlJogos(nome)} foi movido. Escolha a função:</p><div class="atleta-posicao-drop-options">${opcoes.map((op,i)=>`<button onclick="confirmarPopupPosicaoAtleta(${globalIndex},'${grupo}',${i})">${escapeHtmlJogos(op.label)}</button>`).join('')}</div></div>`;
    modal.style.display='flex';
}
function confirmarPopupPosicaoAtleta(globalIndex, grupo, idx){
    const opcao = atletasPosicaoOpcoes(grupo)[idx];
    fecharPopupPosicaoAtleta();
    aplicarNovaPosicaoAtleta(globalIndex, opcao);
}
function fecharPopupPosicaoAtleta(){const modal=document.getElementById('atleta-posicao-drop-modal');if(modal)modal.style.display='none';}
function configurarDropAtletasPosicoes(posLists){
    Object.entries(posLists || {}).forEach(([grupo, lista])=>{
        if(!lista) return;
        const alvo = lista.closest('.pos-box') || lista;
        [lista, alvo].forEach(el=>{
            el.ondragover = (event)=>{event.preventDefault(); el.classList.add('pos-drop-hover');};
            el.ondragleave = ()=>el.classList.remove('pos-drop-hover');
            el.ondrop = (event)=>{
                event.preventDefault();
                el.classList.remove('pos-drop-hover');
                const idx = parseInt(event.dataTransfer.getData('text/plain'),10);
                if(Number.isNaN(idx) || !excelData[idx]) return;
                abrirPopupPosicaoAtleta(idx, grupo);
            };
        });
    });
}
function setAddAthleteModalMode(mode) {
    const modal = document.getElementById('add-athlete-modal');
    if (!modal) return;
    const titleSpan = modal.querySelector('.vba-modal-title span:first-child');
    const submitBtn = modal.querySelector('.vba-btn-salvar');
    if (titleSpan) titleSpan.textContent = mode === 'edit' ? 'Editar Atleta - CFA Prosol' : 'Adicionar Atletas - CFA Prosol';
    if (submitBtn) submitBtn.textContent = mode === 'edit' ? 'Atualizar' : 'Salvar';
}
function valorCampoAtleta(row, termos) {
    const chave = Object.keys(row || {}).find(k => termos.some(t => String(k).toLowerCase().trim() === String(t).toLowerCase().trim() || String(k).toLowerCase().includes(String(t).toLowerCase())));
    return chave && row[chave] !== undefined && row[chave] !== null ? row[chave] : '';
}

const OPCOES_POSICAO_ATLETA_COMPLETAS = ['Goleiro','Zagueiro','Zagueiro Dir.','Zagueiro Esq.','Lateral Dir.','Lateral Esq.','Volante','1º Volante','2º Volante','Meia','Atacante','Ponta Dir.','Ponta Esq.','Extremo'];
function normalizarPosicaoAtletaValor(valor){
    const txt = String(valor||'').trim();
    if(!txt)return '';
    const n = txt.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
    const mapa = {
        'goleiro':'Goleiro',
        'zagueiro':'Zagueiro',
        'zagueiro dir':'Zagueiro Dir.','zagueiro dir.':'Zagueiro Dir.','zagueiro direito':'Zagueiro Dir.',
        'zagueiro esq':'Zagueiro Esq.','zagueiro esq.':'Zagueiro Esq.','zagueiro esquerdo':'Zagueiro Esq.',
        'lateral':'Lateral Dir.',
        'lateral dir':'Lateral Dir.','lateral dir.':'Lateral Dir.','lateral direito':'Lateral Dir.',
        'lateral esq':'Lateral Esq.','lateral esq.':'Lateral Esq.','lateral esquerdo':'Lateral Esq.',
        'volante':'Volante','1 volante':'1º Volante','1º volante':'1º Volante','primeiro volante':'1º Volante',
        '2 volante':'2º Volante','2º volante':'2º Volante','segundo volante':'2º Volante',
        'meia':'Meia','atacante':'Atacante',
        'ponta dir':'Ponta Dir.','ponta dir.':'Ponta Dir.','ponta direito':'Ponta Dir.','extremo direito':'Ponta Dir.',
        'ponta esq':'Ponta Esq.','ponta esq.':'Ponta Esq.','ponta esquerdo':'Ponta Esq.','extremo esquerdo':'Ponta Esq.',
        'extremo':'Extremo'
    };
    return mapa[n] || txt;
}
function garantirOpcoesPosicaoAtletaModal(){
    const select=document.getElementById('add-posicao');
    if(!select)return;
    const valorAtual=normalizarPosicaoAtletaValor(select.value)||'Meia';
    select.innerHTML=OPCOES_POSICAO_ATLETA_COMPLETAS.map(pos=>`<option value="${pos}">${pos}</option>`).join('');
    select.value=OPCOES_POSICAO_ATLETA_COMPLETAS.includes(valorAtual)?valorAtual:'Meia';
}
function posicaoEdicaoAtleta(row){
    const pos2=normalizarPosicaoAtletaValor(valorCampoAtleta(row,['Posição 2','posicao 2']));
    const pos1=normalizarPosicaoAtletaValor(valorCampoAtleta(row,['Posição 1','posicao 1','posição','posicao']));
    if(pos2 && OPCOES_POSICAO_ATLETA_COMPLETAS.includes(pos2))return pos2;
    if(pos1 && OPCOES_POSICAO_ATLETA_COMPLETAS.includes(pos1))return pos1;
    return 'Meia';
}
function openAddAthleteModal() {
    editingAthleteIndex = null;
    uploadedPhotoBase64 = '';
    const form = document.getElementById('athlete-form');
    if (form) form.reset();
    garantirOpcoesPosicaoAtletaModal();
    const fileLabel = document.getElementById('file-label-text');
    if (fileLabel) fileLabel.textContent = 'Selecionar Foto';
    setAddAthleteModalMode('add');
    document.getElementById('add-athlete-modal').style.display = 'flex';
}
function openEditAthleteModal() {
    if (selectedAthleteIndex === null || selectedAthleteIndex === undefined || !excelData[selectedAthleteIndex]) {
        alert('Selecione um atleta na lista primeiro.');
        return;
    }
    editingAthleteIndex = selectedAthleteIndex;
    const row = excelData[editingAthleteIndex];
    const form = document.getElementById('athlete-form');
    if (form) form.reset();
    garantirOpcoesPosicaoAtletaModal();
    document.getElementById('add-ano').value = valorCampoAtleta(row, ['Ano']) || '2010';
    document.getElementById('add-nome').value = valorCampoAtleta(row, ['NOME COMPLETO', 'nome completo', 'nome']);
    document.getElementById('add-apelido').value = valorCampoAtleta(row, ['APELIDO', 'apelido']);
    document.getElementById('add-nascimento').value = convertExcelDate(valorCampoAtleta(row, ['Data de nascimento', 'nascimento']));
    document.getElementById('add-posicao').value = posicaoEdicaoAtleta(row);
    document.getElementById('add-cidade').value = valorCampoAtleta(row, ['CIDADE', 'cidade']);
    document.getElementById('add-contato').value = valorCampoAtleta(row, ['Contato', 'contato']);
    document.getElementById('add-rg').value = valorCampoAtleta(row, ['RG', 'rg']);
    uploadedPhotoBase64 = valorCampoAtleta(row, ['Foto', 'foto', 'imagem']);
    const fileLabel = document.getElementById('file-label-text');
    if (fileLabel) fileLabel.textContent = uploadedPhotoBase64 ? 'Substituir foto' : 'Enviar foto';
    const fileInput = document.getElementById('add-foto');
    if (fileInput) fileInput.value = '';
    setAddAthleteModalMode('edit');
    document.getElementById('add-athlete-modal').style.display = 'flex';
}
function closeAddAthleteModal() {
    document.getElementById('add-athlete-modal').style.display = 'none';
    editingAthleteIndex = null;
    uploadedPhotoBase64 = '';
    setAddAthleteModalMode('add');
}
function previewAthletePhoto(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const label = document.getElementById('file-label-text');
        if (label) label.textContent = 'Nova foto: ' + file.name;
        const reader = new FileReader();
        reader.onload = function(e) { uploadedPhotoBase64 = e.target.result; };
        reader.readAsDataURL(file);
    }
}
function saveNewAthlete(event) {
    event.preventDefault();
    const isEdit = editingAthleteIndex !== null && editingAthleteIndex !== undefined && excelData[editingAthleteIndex];
    let row;
    if (isEdit) {
        row = excelData[editingAthleteIndex];
    } else {
        row = {};
        excelColumns.forEach(col => { row[col] = ''; });
    }
    row['Ano'] = document.getElementById('add-ano').value;
    row['NOME COMPLETO'] = document.getElementById('add-nome').value;
    row['APELIDO'] = document.getElementById('add-apelido').value;
    row['Data de nascimento'] = document.getElementById('add-nascimento').value;
    const posicaoSelecionada = normalizarPosicaoAtletaValor(document.getElementById('add-posicao').value) || 'Meia';
    row['Posição 1'] = posicaoSelecionada;
    row['Posição 2'] = posicaoSelecionada;
    if(!excelColumns.includes('Posição 2')) excelColumns.push('Posição 2');
    row['CIDADE'] = document.getElementById('add-cidade').value;
    row['Contato'] = document.getElementById('add-contato').value;
    row['RG'] = document.getElementById('add-rg').value;
    row['Foto'] = uploadedPhotoBase64 || row['Foto'] || '';
    if (!isEdit) {
        excelData.push(row);
        selectedAthleteIndex = excelData.length - 1;
    }
    saveToStorage();
    closeAddAthleteModal();
    if (typeof renderAtletasScreen === 'function') renderAtletasScreen();
    if (typeof renderExcelTable === 'function') renderExcelTable();
    alert(isEdit ? 'Atleta atualizado com sucesso!' : 'Salvo com sucesso!');
}

/* === TESTES FÍSICOS === */
function switchPfTab(tabName, eventObj) {
    currentPfTab = tabName;
    document.querySelectorAll('.pf-tab').forEach(t => t.classList.remove('active'));
    if(eventObj) eventObj.target.classList.add('active');
    renderPfTable();
}

function ensureCalculadoraButton(){let b=document.getElementById('btn-calculadora-fab');if(!b){b=document.createElement('div');b.id='btn-calculadora-fab';b.textContent='Calculadora';b.style.cssText='position:fixed;bottom:180px;right:30px;width:65px;height:65px;border-radius:50%;background:#f39c12;color:#fff;display:none;align-items:center;justify-content:center;box-shadow:0 4px 12px #0006;cursor:pointer;font-weight:bold;font-size:11px;z-index:9999;text-align:center';b.onclick=abrirCalculadoraAltura;document.body.appendChild(b);}}
function abrirCalculadoraAltura(){let m=document.getElementById('calculadora-altura-modal');if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='calculadora-altura-modal';document.body.appendChild(m)}m.innerHTML='<div class="calc-altura-card"><h3>Calculadora de Altura Predita</h3><label>Peso (kg)<input id="calc-peso" type="number" step="0.1"></label><label>Altura (m)<input id="calc-altura" type="number" step="0.01"></label><label>Data de nascimento<input id="calc-nasc" type="date"></label><label>Data da avaliação<input id="calc-aval" type="date"></label><label>Altura sentado (cm)<input id="calc-sentado" type="number" step="0.1"></label><div id="calc-resultado">Preencha os dados para calcular.</div><button onclick="calcularAlturaCalculadora()">Calcular</button><button onclick="document.getElementById(\'calculadora-altura-modal\').style.display=\'none\'">Fechar</button></div>';m.style.display='flex';document.getElementById('calc-aval').value=new Date().toISOString().slice(0,10)}
function calcularAlturaCalculadora(){const p=parseFloat(document.getElementById('calc-peso').value),h=parseFloat(document.getElementById('calc-altura').value),s=parseFloat(document.getElementById('calc-sentado').value),n=new Date(document.getElementById('calc-nasc').value),a=new Date(document.getElementById('calc-aval').value);if(!p||!h||!s||isNaN(n)||isNaN(a))return alert('Preencha todos os campos.');const idade=(a-n)/86400000/365;const r=alturaPreditaCalculada(idade,p,h,s);document.getElementById('calc-resultado').innerHTML=`MO: ${r.mo.toFixed(2).replace('.',',')}<br>Categoria: ${r.categoria.toUpperCase()}<br><strong>Altura predita: ${(Math.floor(r.valor)/100).toFixed(2).replace('.',',')} m</strong>`}

function ensureTestAddButton() {
    let fab = document.getElementById('btn-add-athlete-pf-fab');
    if (!fab) {
        fab = document.createElement('div'); fab.id = 'btn-add-athlete-pf-fab'; fab.innerHTML = '+ add';
        fab.style.cssText = 'position:fixed; bottom:30px; right:30px; width:65px; height:65px; border-radius:50%; background-color:#2ed573; color:#fff; display:none; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.4); cursor:pointer; font-weight:bold; font-size:13px; z-index:9999; user-select:none; transition:0.2s;';
        fab.onmouseover = () => { fab.style.transform = 'scale(1.1)'; fab.style.backgroundColor = '#26af5f'; };
        fab.onmouseout = () => { fab.style.transform = 'scale(1.0)'; fab.style.backgroundColor = '#2ed573'; };
        fab.onclick = openAddAthleteModal; document.body.appendChild(fab);
    }
}

// NOVO: Criar botão flutuante para Grupos
function ensureGruposButton() {
    let fab = document.getElementById('btn-grupos-pf-fab');
    if (!fab) {
        fab = document.createElement('div'); fab.id = 'btn-grupos-pf-fab'; fab.innerHTML = 'Grupos';
        // Posicionado um pouco acima do botão +add (bottom: 105px)
        fab.style.cssText = 'position:fixed; bottom:105px; right:30px; width:65px; height:65px; border-radius:50%; background-color:#316ac5; color:#fff; display:none; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.4); cursor:pointer; font-weight:bold; font-size:12px; z-index:9999; user-select:none; transition:0.2s;';
        fab.onmouseover = () => { fab.style.transform = 'scale(1.1)'; fab.style.backgroundColor = '#214a8a'; };
        fab.onmouseout = () => { fab.style.transform = 'scale(1.0)'; fab.style.backgroundColor = '#316ac5'; };
        fab.onclick = () => navigateTo('grupos'); 
        document.body.appendChild(fab);
    }
}

function populateEvalSelect() {
    let maxEval = 1;
    excelColumns.forEach(col => { let m = col.match(/^Data(\d+)$/i); if (m && parseInt(m[1]) > maxEval) maxEval = parseInt(m[1]); });
    const evalSelect = document.getElementById('pf-eval-select');
    if (evalSelect) {
        let currentVal = evalSelect.value; evalSelect.innerHTML = '';
        for (let i = 1; i <= maxEval; i++) {
            const opt = document.createElement('option'); opt.value = i; opt.textContent = 'Avaliação ' + i; evalSelect.appendChild(opt);
        }
        evalSelect.value = (currentVal && currentVal <= maxEval) ? currentVal : maxEval;
    }
}

function addNewEvaluation() {
    let maxEval = 1; excelColumns.forEach(c => { let m = c.match(/^Data(\d+)$/i); if (m && parseInt(m[1]) > maxEval) maxEval = parseInt(m[1]); });
    let newEval = maxEval + 1;
    let newCols = ['AVALIAÇÃO', 'Data', 'Altura', 'alturasentado', 'peso', 'Dobras1_', 'Dobras2_', 'Dobras3_', 'Dobras4_', 'PercentualGordura', 'alturapredita', 'nivel', 'distancia', 'Salto1_', 'Salto2_', 'Salto3_', 'MelhorSalto', 'aceleração1_', 'velocidade1_', 'aceleração2_', 'velocidade2_', 'aceleração3_', 'velocidade3_', 'aceleração4_', 'velocidade4_', 'aceleração5_', 'velocidade5_', 'aceleração6_', 'velocidade6_', 'aceleração7_', 'velocidade7_', 'Aceleraçãofinal', 'Velocidadefinal', 'Volta1_', 'Volta2_', 'Agilidade'].map(c => c + newEval);
    newCols.forEach(c => { if (!excelColumns.includes(c)) excelColumns.push(c); });
    excelData.forEach(row => { newCols.forEach(c => { if (row[c] === undefined) row[c] = ''; }); });
    saveToStorage(); populateEvalSelect(); document.getElementById('pf-eval-select').value = newEval; renderPfTable(); alert('Avaliação ' + newEval + ' adicionada!');
}

function deleteCurrentEvaluation() {
    const evalSelect = document.getElementById('pf-eval-select');
    if (!evalSelect) return;
    let currentEval = parseInt(evalSelect.value);
    let maxEval = 1; excelColumns.forEach(c => { let m = c.match(/^Data(\d+)$/i); if (m && parseInt(m[1]) > maxEval) maxEval = parseInt(m[1]); });
    if (currentEval !== maxEval || currentEval === 1) { alert('Só pode apagar a última avaliação (se maior que 1).'); return; }
    if (confirm('Deseja apagar a Avaliação ' + currentEval + '?')) {
        let colsToRemove = excelColumns.filter(c => c.toLowerCase() === ('avaliação' + currentEval) || c.toLowerCase().endsWith(currentEval) || c.toLowerCase().endsWith('_' + currentEval)).filter(c => c !== 'Ano' && c !== 'NOME COMPLETO');
        excelColumns = excelColumns.filter(c => !colsToRemove.includes(c));
        excelData.forEach(row => { colsToRemove.forEach(c => { delete row[c]; }); });
        saveToStorage(); populateEvalSelect(); evalSelect.value = maxEval - 1; renderPfTable(); alert('Apagada.');
    }
}

function valorColunaExata(row, nome) {
    const chave = Object.keys(row).find(k => k.toLowerCase() === nome.toLowerCase());
    return chave ? row[chave] : '';
}
function valorAvaliacao(row, base, evalNum) {
    const nomes = [base + evalNum, base + '_' + evalNum];
    const chave = Object.keys(row).find(k => nomes.some(n => k.toLowerCase() === n.toLowerCase()));
    return chave ? row[chave] : '';
}
function calcularIdadeAvaliacao(nascimento, avaliacao) {
    const parseData = v => {
        if (!v) return null;
        const m = String(v).match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
        if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
        const d = new Date(v); return isNaN(d) ? null : d;
    };
    const nasc = parseData(nascimento), aval = parseData(avaliacao);
    if (!nasc || !aval) return '-';
    return ((aval - nasc) / 86400000 / 365).toFixed(1).replace('.', ',');
}
const tabelaAlturaCrescer = {
 tardio:[[-2,25.77],[-1.8,25.77],[-1.6,23.74],[-1.4,23.74],[-1.2,22.63],[-1,20.22],[-.8,19.06],[-.6,17.68],[-.4,16.31],[-.2,14.76],[0,13.05],[.2,11.32],[.4,9.71],[.6,8.27],[.8,6.94],[1,5.7],[1.2,4.54],[1.4,3.51],[1.6,2.64],[1.8,1.82],[2,1.35],[2.2,.91],[2.4,.58],[2.6,.32],[2.8,.13],[3,0]],
 medio:[[-2,30.06],[-1.8,29.03],[-1.6,27.95],[-1.4,26.83],[-1.2,25.63],[-1,24.33],[-.8,22.99],[-.6,21.51],[-.4,19.88],[-.2,18.09],[0,16.16],[.2,14.12],[.4,12.35],[.6,10.65],[.8,9.12],[1,7.79],[1.2,6.59],[1.4,5.58],[1.6,4.62],[1.8,3.8],[2,3.08],[2.2,2.48],[2.4,1.96],[2.6,1.52],[2.8,1.16],[3,.87]],
 cedo:[[-2,33.8],[-1.8,32.62],[-1.6,31.44],[-1.4,30.23],[-1.2,29.05],[-1,27.66],[-.8,26.24],[-.6,24.68],[-.4,22.96],[-.2,21.07],[0,19.04],[.2,16.96],[.4,14.92],[.6,13.01],[.8,11.26],[1,9.7],[1.2,8.33],[1.4,7.11],[1.6,6.04],[1.8,5.1],[2,4.26],[2.2,3.52],[2.4,2.86],[2.6,2.29],[2.8,1.78],[3,1.34]]
};
function alturaPreditaCalculada(idade,peso,alturaM,sentadoCm){
 const alturaCm=alturaM*100, pernas=alturaCm-sentadoCm;
 const mo=-9.236+(0.0002708*pernas*sentadoCm)-(0.001663*idade*pernas)+(0.007216*idade*sentadoCm)+(0.02292*(peso/alturaCm));
 const maturidade=idade-mo; const categoria=maturidade<=13?'cedo':maturidade<=14.9?'medio':'tardio'; const tabela=tabelaAlturaCrescer[categoria];
 let a=tabela[0],b=tabela[tabela.length-1]; for(let i=1;i<tabela.length;i++){if(mo<=tabela[i][0]){a=tabela[i-1];b=tabela[i];break;}}
 const crescer=a[1]+(mo-a[0])*(b[1]-a[1])/(b[0]-a[0]); return {mo,maturidade,categoria,valor:alturaCm+crescer};
}
function normalizarTextoOrdenacaoPf(valor){
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function getPfAnoOrdenacao(row){
    let ano = String(valorColunaExata(row, 'Ano') || '').trim();
    if (!ano) {
        const nasc = convertExcelDate(valorColunaExata(row, 'Data de nascimento') || '');
        const m = String(nasc).match(/(\d{4})$/);
        if (m) ano = m[1];
    }
    const n = parseInt(ano, 10);
    return isNaN(n) ? 9999 : n;
}
function getPfNomeOrdenacao(row){
    let nome = valorColunaExata(row, 'NOME COMPLETO') || valorColunaExata(row, 'APELIDO') || '';
    if (!nome) {
        const chaveNome = Object.keys(row || {}).find(k => k.toLowerCase().includes('nome'));
        if (chaveNome) nome = row[chaveNome];
    }
    return normalizarTextoOrdenacaoPf(nome);
}
function getPfSortedEntries(selectedYear){
    return (excelData || []).map((row, rowIndex) => ({ row, rowIndex }))
        .filter(({ row }) => {
            const ano = String(valorColunaExata(row, 'Ano') || '').trim();
            return selectedYear === 'todos' || ano === selectedYear;
        })
        .sort((a, b) => {
            const anoA = getPfAnoOrdenacao(a.row);
            const anoB = getPfAnoOrdenacao(b.row);
            if (anoA !== anoB) return anoA - anoB;
            return getPfNomeOrdenacao(a.row).localeCompare(getPfNomeOrdenacao(b.row), 'pt-BR');
        });
}

function renderTabelaAntropometrica(evalNum, selectedYear, headerRow, tbody) {
    const colunas = [
        ['Ano','ano'], ['NOME COMPLETO','nome'], ['DATA NASCIMENTO','nascimento'],
        ['DATA AVALIAÇÃO','data'], ['IDADE','idade'], ['ALTURA','altura'],
        ['ALT. SENTADO','sentado'], ['ALTURA PREDITA','predita'], ['PESO','peso'],
        ['SBE','sbe'], ['TRI','tri'], ['SPI','spi'], ['ABD','abd'],
        ['SOMA DOBRAS','soma'], ['% DE GORDURA','gordura']
    ];
    colunas.forEach(c => { const th=document.createElement('th'); th.textContent=c[0]; if(c[1]==='predita'||c[1]==='idade'||c[1]==='soma'||c[1]==='gordura') th.style.color='#168a32'; headerRow.appendChild(th); });
    getPfSortedEntries(selectedYear).forEach(({row,rowIndex})=>{
        const ano=String(valorColunaExata(row,'Ano')||'').trim();
        const nascimento=convertExcelDate(valorColunaExata(row,'Data de nascimento'));
        const dataAval=convertExcelDate(valorAvaliacao(row,'Data',evalNum));
        const nums=['Dobras1_','Dobras2_','Dobras3_','Dobras4_'].map(b=>parseFloat(String(valorAvaliacao(row,b,evalNum)).replace(',','.'))||0);
        const soma=nums.reduce((a,b)=>a+b,0);
        const gordura=((soma*0.153+5.783)/100);
        const gorduraTexto=(gordura*100).toFixed(2).replace('.',',')+'%';
        const gorduraKey='PercentualGordura'+evalNum;
        const alturaPreditaKey='alturapredita'+evalNum;
        const calculoPredita=alturaPreditaCalculada(
            parseFloat(calcularIdadeAvaliacao(nascimento,dataAval).replace(',','.')) || 0,
            parseFloat(String(valorAvaliacao(row,'peso',evalNum)).replace(',','.')) || 0,
            parseFloat(String(valorAvaliacao(row,'Altura',evalNum)).replace(',','.')) || 0,
            parseFloat(String(valorAvaliacao(row,'alturasentado',evalNum)).replace(',','.')) || 0
        );
        if (calculoPredita.valor) row[alturaPreditaKey]=(Math.floor(calculoPredita.valor)/100).toFixed(2);
        row[gorduraKey]=gordura;
        if (!excelColumns.includes(gorduraKey)) excelColumns.push(gorduraKey);
        if (!excelColumns.includes(alturaPreditaKey)) excelColumns.push(alturaPreditaKey);
        const valores={ano,nome:valorColunaExata(row,'NOME COMPLETO'),nascimento,data:dataAval,idade:calcularIdadeAvaliacao(nascimento,dataAval),altura:valorAvaliacao(row,'Altura',evalNum),sentado:valorAvaliacao(row,'alturasentado',evalNum),predita:(()=>{const r=alturaPreditaCalculada(calcularIdadeAvaliacao(nascimento,dataAval).replace(',','.'),parseFloat(String(valorAvaliacao(row,'peso',evalNum)).replace(',','.'))||0,parseFloat(String(valorAvaliacao(row,'Altura',evalNum)).replace(',','.'))||0,parseFloat(String(valorAvaliacao(row,'alturasentado',evalNum)).replace(',','.'))||0);return r.valor?(Math.floor(r.valor)/100).toFixed(2).replace('.',',')+' m':'-'})(),peso:valorAvaliacao(row,'peso',evalNum),sbe:nums[0]||'',tri:nums[1]||'',spi:nums[2]||'',abd:nums[3]||'',soma:soma ? soma.toFixed(1).replace('.',',') : '',gordura:gorduraTexto};
        const tr=document.createElement('tr');
        colunas.forEach((c,i)=>{const td=document.createElement('td'), key=c[1], fixed=['idade','predita','soma','gordura'].includes(key); if(key==='ano'||key==='nome'||key==='nascimento'){td.textContent=valores[key];td.style.background='#f4f6f7';}else if(fixed){td.textContent=valores[key];td.style.background='#e8f5e9';td.style.fontWeight='bold';}else{const input=document.createElement('input');input.type='text';input.value=valores[key];input.onchange=e=>{let base={data:'Data',altura:'Altura',sentado:'alturasentado',peso:'peso',sbe:'Dobras1_',tri:'Dobras2_',spi:'Dobras3_',abd:'Dobras4_'}[key];if(base){const k=base+evalNum;excelData[rowIndex][k]=e.target.value;renderPfTable();saveToStorage();}};td.appendChild(input);}tr.appendChild(td);}); tbody.appendChild(tr);
    });
}

function distanciaNivelResistencia(valor){
 const n=parseFloat(String(valor).replace(',', '.')); if(isNaN(n)) return '';
 const tabela={9.1:80,11.1:120,11.2:160,12.1:200,12.2:240,12.3:280,13.1:320,13.2:360,13.3:400,14.1:480,14.3:560,14.4:600,14.5:640,14.6:680,14.7:720,14.8:760,15.1:800,15.2:840,15.3:880,15.4:920,15.5:960,15.6:1000,15.7:1040,15.8:1080,16.1:1120,16.2:1160,16.3:1200,16.4:1240,16.5:1280,16.6:1320,16.7:1360,16.8:1400,17.1:1440,17.2:1480,17.3:1520,17.4:1560,17.5:1600,17.6:1640,17.7:1680,17.8:1720,18.1:1760,18.2:1800,18.3:1840,18.4:1880,18.5:1920,18.6:1960,18.7:2000,18.8:2040,19.1:2080,19.2:2120,19.3:2160,19.4:2200,19.5:2240,19.6:2280,19.7:2320,19.8:2360,20.1:2400,20.2:2440,20.3:2480,20.4:2520,20.5:2560,20.6:2600,20.7:2640,20.8:2680,21.1:2720,21.2:2760,21.3:2800,21.4:2840,21.5:2880,21.6:2920,21.7:2960,21.8:3000,22.1:3040,22.2:3080,22.3:3120,22.4:3160,22.5:3200,22.6:3240,22.7:3280,22.8:3320,23.1:3360,23.2:3400,23.3:3440,23.4:3480,23.5:3520,23.6:3560,23.7:3600,23.8:3640}; return tabela[Math.round(n*10)/10] ?? '';
}
function renderTabelaResistencia(evalNum, selectedYear, headerRow, tbody){
 ['Ano','NOME COMPLETO','DATA NASCIMENTO','DATA AVALIAÇÃO','NÍVEL','DISTÂNCIA'].forEach(x=>{const th=document.createElement('th');th.textContent=x;headerRow.appendChild(th)});
 getPfSortedEntries(selectedYear).forEach(({row,rowIndex})=>{let ano=String(valorColunaExata(row,'Ano')||'').trim();const tr=document.createElement('tr');const vals=[ano,valorColunaExata(row,'NOME COMPLETO'),convertExcelDate(valorColunaExata(row,'Data de nascimento')),convertExcelDate(valorAvaliacao(row,'Data',evalNum)),valorAvaliacao(row,'nivel',evalNum),''];vals[5]=distanciaNivelResistencia(vals[4]);vals.forEach((v,i)=>{const td=document.createElement('td');if(i<4)td.textContent=v;else if(i===4){const inp=document.createElement('input');inp.value=v;inp.onchange=e=>{row['nivel'+evalNum]=e.target.value;row['distancia'+evalNum]=distanciaNivelResistencia(e.target.value);saveToStorage();renderPfTable()};td.appendChild(inp)}else{td.textContent=v;td.style.background='#e8f5e9';td.style.fontWeight='bold'}tr.appendChild(td)});tbody.appendChild(tr)})}

function renderPfTable() {
    const headerRow = document.getElementById('pf-header-row'); const tbody = document.getElementById('pf-tbody');
    if (!headerRow || !tbody) return; headerRow.innerHTML = ''; tbody.innerHTML = '';
    const evalNum = document.getElementById('pf-eval-select') ? document.getElementById('pf-eval-select').value : '1';
    const selectedYear = document.getElementById('pf-year-select') ? document.getElementById('pf-year-select').value : 'todos';
    if (currentPfTab === 'antropometricas') { renderTabelaAntropometrica(evalNum, selectedYear, headerRow, tbody); return; }
    if (currentPfTab === 'resistencia') { renderTabelaResistencia(evalNum, selectedYear, headerRow, tbody); return; }

    let baseCols = [];
    if (currentPfTab === 'antropometricas') baseCols = ['Altura', 'alturapredita', 'alturasentado', 'peso', 'Dobras1_', 'Dobras2_', 'Dobras3_', 'Dobras4_'];
    else if (currentPfTab === 'resistencia') baseCols = ['nivel', 'distancia'];
    else if (currentPfTab === 'potencia') baseCols = ['Salto1_', 'Salto2_', 'Salto3_', 'MelhorSalto'];
    else if (currentPfTab === 'velocidade') baseCols = ['Aceleraçãofinal', 'Velocidadefinal', 'aceleração1_', 'velocidade1_', 'aceleração2_', 'velocidade2_', 'aceleração3_', 'velocidade3_', 'aceleração4_', 'velocidade4_', 'aceleração5_', 'velocidade5_', 'aceleração6_', 'velocidade6_', 'aceleração7_', 'velocidade7_'];
    else if (currentPfTab === 'agilidade') baseCols = ['Volta1_', 'Volta2_', 'Agilidade'];

    let colsToDisplay = ['Ano', 'NOME COMPLETO', 'Data de nascimento', 'Data' + evalNum];
    baseCols.forEach(col => colsToDisplay.push(col + evalNum));

    colsToDisplay.forEach((col) => {
        const th = document.createElement('th'); let label = col; let cleanCol = col.replace(evalNum, '').replace('_', '');
        if (col === 'Data de nascimento') label = 'DATA NASCIMENTO'; else if (col.startsWith('Data')) label = 'DATA AVALIAÇÃO'; else if (cleanCol === 'Altura') label = 'ALTURA'; else if (cleanCol === 'alturapredita') { label = 'ALTURA PREDITA'; th.style.color = '#4cd137'; } else if (cleanCol === 'alturasentado') label = 'ALT. SENTADO'; else if (cleanCol === 'peso') label = 'PESO'; else if (cleanCol === 'Dobras1') label = 'SBE'; else if (cleanCol === 'Dobras2') label = 'TRI'; else if (cleanCol === 'Dobras3') label = 'SPI'; else if (cleanCol === 'Dobras4') label = 'ABD'; else if (cleanCol === 'nivel') label = 'NÍVEL'; else if (cleanCol === 'distancia') label = 'DISTÂNCIA'; else if (cleanCol === 'Salto1') label = 'SALTO 1'; else if (cleanCol === 'Salto2') label = 'SALTO 2'; else if (cleanCol === 'Salto3') label = 'SALTO 3'; else if (cleanCol === 'MelhorSalto') label = 'FINAL'; else if (cleanCol === 'Volta1') label = 'VOLTA 1'; else if (cleanCol === 'Volta2') label = 'VOLTA 2'; else if (cleanCol === 'Agilidade') label = 'AGILIDADE'; else if (cleanCol === 'Aceleraçãofinal') label = 'MÉDIA ACELERAÇÃO'; else if (cleanCol === 'Velocidadefinal') label = 'MÉDIA VELOCIDADE'; else if (cleanCol.toLowerCase().includes('aceleração')) label = cleanCol.replace(/aceleração/i, 'ACELERAÇÃO '); else if (cleanCol.toLowerCase().includes('velocidade')) label = cleanCol.replace(/velocidade/i, 'VELOCIDADE ');
        th.textContent = label.toUpperCase();
        if (col === 'Ano' || col === 'NOME COMPLETO') { th.style.position = 'sticky'; th.style.left = col === 'Ano' ? '0px' : '60px'; th.style.zIndex = '5'; th.style.backgroundColor = '#e1e1e1'; th.style.minWidth = col === 'Ano' ? '60px' : '220px'; }
        headerRow.appendChild(th);
    });

    getPfSortedEntries(selectedYear).forEach(({row, rowIndex}) => {
        let anoAtleta = Object.keys(row).find(k => k.toLowerCase() === 'ano'); anoAtleta = anoAtleta ? String(row[anoAtleta]).trim() : '';
        // Campos calculados e fixos das abas de desempenho
        if (currentPfTab === 'potencia') {
            const vals=['Salto1_','Salto2_','Salto3_'].map(b=>parseFloat(String(valorAvaliacao(row,b,evalNum)).replace(',','.'))).filter(v=>!isNaN(v));
            row['MelhorSalto'+evalNum]=vals.length?Math.max(...vals):'';
        } else if (currentPfTab === 'velocidade') {
            const media=(base)=>{const vals=[];for(let i=1;i<=7;i++){const v=parseFloat(String(valorAvaliacao(row,base+i,evalNum)).replace(',','.'));if(!isNaN(v))vals.push(v)}return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2):''};
            row['Aceleraçãofinal'+evalNum]=media('aceleração'); row['Velocidadefinal'+evalNum]=media('velocidade');
        } else if (currentPfTab === 'agilidade') {
            const vals=['Volta1_','Volta2_'].map(b=>parseFloat(String(valorAvaliacao(row,b,evalNum)).replace(',','.'))).filter(v=>!isNaN(v));
            row['Agilidade'+evalNum]=vals.length?Math.min(...vals):'';
        }
        const tr = document.createElement('tr');
        colsToDisplay.forEach(col => {
            const td = document.createElement('td');
            let val = row[col] !== undefined ? row[col] : (row[Object.keys(row).find(k => k.toLowerCase() === col.toLowerCase())] || '');
            if (col.toLowerCase().includes('data') || col.toLowerCase().includes('nascimento')) val = convertExcelDate(val);
            if (['Ano', 'NOME COMPLETO', 'Data de nascimento'].includes(col)) { td.textContent = val; td.style.backgroundColor = '#f4f6f7'; td.style.fontWeight = '600'; }
            else {
                const cleanBase=col.replace(evalNum,'').replace('_','');
                const fixed=(currentPfTab==='potencia'&&cleanBase==='MelhorSalto') || (currentPfTab==='velocidade'&&(cleanBase==='Aceleraçãofinal'||cleanBase==='Velocidadefinal')) || (currentPfTab==='agilidade'&&cleanBase==='Agilidade');
                if(fixed){td.textContent=val;td.style.backgroundColor='#e8f5e9';td.style.fontWeight='bold';}
                else { const input=document.createElement('input'); input.type='text'; input.value=val; input.onchange=(e)=>{excelData[rowIndex][Object.keys(row).find(k=>k.toLowerCase()===col.toLowerCase())||col]=e.target.value;saveToStorage();renderPfTable();}; td.appendChild(input); }
            }
            if (col === 'Ano' || col === 'NOME COMPLETO') { td.style.position = 'sticky'; td.style.left = col === 'Ano' ? '0px' : '60px'; td.style.zIndex = '2'; td.style.backgroundColor = '#f4f6f7'; td.style.minWidth = col === 'Ano' ? '60px' : '220px'; }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}


let atletaGlobalIndexAtual = null;
let documentosAtletaTemporarios = []; // Armazena os links dos documentos atuais da sessão do modal
// Abre o pop-up de anotações preenchendo os dados do atleta selecionado
function openAnotacoesModal(globalIndex) {
    atletaGlobalIndexAtual = globalIndex;
    const row = excelData[globalIndex];
    if (!row) return;

    let nome = getValorColuna(row, ['nome', 'atleta', 'nome completo']) || 'Sem Nome';
    let apelido = getValorColuna(row, ['apelido']);
    let nomeExibicao = apelido ? `${nome} (${apelido})` : nome;
    
    document.getElementById('anotacao-atleta-nome').textContent = nomeExibicao;
    document.getElementById('anotacao-atleta-posicao').textContent = getValorColuna(row, ['posicao', 'posição']) || '-';
    document.getElementById('anotacao-atleta-nasc').textContent = getValorColuna(row, ['nascimento', 'data de nascimento']) || '-';
    document.getElementById('anotacao-atleta-cidade').textContent = getValorColuna(row, ['cidade']) || '-';
    
    const imgEl = document.getElementById('anotacao-atleta-foto');
    let foto = getValorColuna(row, ['foto', 'imagem']);
    imgEl.src = (foto) ? foto : '';
    imgEl.style.display = foto ? 'block' : 'none';

    // Separa o texto da anotação dos links salvos na coluna 'Anotacoes'
    let conteudoColuna = row['Anotacoes'] || '';
    let partes = conteudoColuna.split('--- [DOCUMENTOS ANEXADOS] ---');
    
    document.getElementById('textarea-anotacoes-texto').value = partes[0] ? partes[0].trim() : '';
    
    document.getElementById('input-novos-documentos').value = '';
    documentosAtletaTemporarios = []; // Array limpo corretamente aqui

    if (partes[1]) {
        try {
            documentosAtletaTemporarios = JSON.parse(partes[1].trim());
        } catch(e) {
            documentosAtletaTemporarios = [];
        }
    }
    
    renderizarListaDocumentosModal();

    // Checkbox de lesão
    let chaveLesao = Object.keys(row).find(k => k.toLowerCase() === 'lesao');
    document.getElementById('checkbox-lesao').checked = chaveLesao ? String(row[chaveLesao]).toLowerCase().trim() === 'sim' : false;

    // Checkbox de cartão vermelho
    let chaveCartaoVermelho = Object.keys(row).find(k => ['cartaovermelho','cartao vermelho','cartão vermelho'].includes(k.toLowerCase().replace(/_/g, ' ').trim()) || k.toLowerCase().replace(/\s+/g,'') === 'cartaovermelho');
    const checkboxCartaoVermelho = document.getElementById('checkbox-cartao-vermelho');
    if (checkboxCartaoVermelho) {
        checkboxCartaoVermelho.checked = chaveCartaoVermelho ? String(row[chaveCartaoVermelho]).toLowerCase().trim() === 'sim' : false;
    }

    document.getElementById('modal-anotacoes').style.display = 'flex';
}

// Faz o upload dos arquivos selecionados para o Supabase Storage em lote
async function processarUploadDocumentos(input) {
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    alert('Fazendo upload de ' + files.length + ' arquivo(s) para o Supabase Storage...');

    for (let file of files) {
        try {
            const nomeArquivoUnico = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            
            // Realiza o upload para o bucket 'documentos-atletas' criado no Supabase
            const { data, error } = await _supabase.storage
                .from('documentos-atletas')
                .upload(nomeArquivoUnico, file);

            if (error) {
                console.error('Erro no upload:', error.message);
                alert('Erro ao enviar o arquivo: ' + file.name);
                continue;
            }

            // Pega a URL pública do arquivo enviado
            const { data: publicUrlData } = _supabase.storage
                .from('documentos-atletas')
                .getPublicUrl(nomeArquivoUnico);

            if (publicUrlData && publicUrlData.publicUrl) {
                documentosAtletaTemporarios.push({
                    nome: file.name,
                    url: publicUrlData.publicUrl,
                    path: nomeArquivoUnico // SALVANDO O CAMINHO PARA FACILITAR A EXCLUSÃO
                });
            }
        } catch (err) {
            console.error('Erro inesperado:', err);
        }
    }

    input.value = ''; // Limpa o input file
    renderizarListaDocumentosModal();
    alert('Upload concluído com sucesso!');
}
// Fecha o modal de anotações
function closeAnotacoesModal() {
    document.getElementById('modal-anotacoes').style.display = 'none';
}
// Renderiza a lista de documentos dentro do modal com opção de abrir ou excluir
function renderizarListaDocumentosModal() {
    const container = document.getElementById('lista-documentos-anexados');
    if (!container) return;
    container.innerHTML = '';

    if (documentosAtletaTemporarios.length === 0) {
        container.innerHTML = '<span style="color: #777; font-style: italic;">Nenhum documento anexado.</span>';
        return;
    }

    documentosAtletaTemporarios.forEach((doc, index) => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 4px 8px; border: 1px solid #ddd; border-radius: 3px;';
        
        item.innerHTML = `
            <a href="${doc.url}" target="_blank" style="color: #0984e3; text-decoration: none; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 320px;" title="${doc.nome}">
                📎 ${doc.nome}
            </a>
            <button type="button" onclick="removerDocumentoTemporario(${index})" style="background: #e53935; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer; font-size: 10px; font-weight: bold;">X</button>
        `;
        container.appendChild(item);
    });
}

// Remove o documento da lista e exclui definitivamente do Supabase Storage
async function removerDocumentoTemporario(index) {
    const doc = documentosAtletaTemporarios[index];

    if (!confirm(`Tem certeza que deseja excluir o anexo "${doc.nome}"? Ele será apagado definitivamente do storage.`)) {
        return;
    }

    // Identifica o caminho exato do arquivo
    let filePath = doc.path;

    // Se não houver 'path' direto, extrai o nome final a partir da URL
    if (!filePath && doc.url) {
        try {
            const urlObj = new URL(doc.url);
            const pathParts = urlObj.pathname.split('/documentos-atletas/');
            if (pathParts.length > 1) {
                filePath = decodeURIComponent(pathParts[1]);
            }
        } catch (e) {
            console.error('Erro ao processar URL do arquivo:', e);
        }
    }

    if (filePath) {
        // Tenta remover do Supabase Storage
        const { data, error } = await _supabase.storage
            .from('documentos-atletas')
            .remove([filePath]);

        if (error) {
            console.error('Erro ao excluir no Supabase Storage:', error);
            alert('Falha ao excluir no Supabase: ' + error.message + '\nVerifique as políticas (RLS) do bucket.');
            return; // Interrompe para não remover da tela se falhar na nuvem
        }

        // Se o Supabase responder sem erro mas não deletar nada
        if (data && data.length === 0) {
            console.warn('O Supabase não encontrou o arquivo com o caminho informado:', filePath);
        }
    }

    // Remove do array local e atualiza a interface
    documentosAtletaTemporarios.splice(index, 1);
    renderizarListaDocumentosModal();
    alert('Arquivo removido com sucesso!');
}





function setValorInputFicha(input, valor) {
    if (!input || valor === undefined || valor === null) return;
    input.value = valor;
    input.setAttribute('value', valor);
}
function aplicarValoresExerciciosFicha(card, valoresSalvos) {
    if (!card || !valoresSalvos) return;
    const inputs = Array.from(card.querySelectorAll('input'));
    const valores = Array.isArray(valoresSalvos) ? valoresSalvos : [];
    if (!valores.length || !inputs.length) return;

    // Formato atual: MMI/Protocolo/HIIT editáveis + 6 campos de tempo do HIIT.
    // A frase final é fixa e NÃO é salva como campo editável.
    if (valores.length >= inputs.length) {
        inputs.forEach((input, i) => setValorInputFicha(input, valores[i]));
        return;
    }

    // Compatibilidade com o formato anterior de 44 inputs:
    // [MMI label] + 21, [Protocolo label] + 12, [HIIT label] + 6 exercícios + 1 tempo único + 1 aviso final.
    // No modelo novo, o tempo único vira 6 quadradinhos e o aviso final é fixo.
    if (valores.length === 44 && inputs.length >= 48) {
        for (let i = 0; i <= 41; i++) setValorInputFicha(inputs[i], valores[i]);
        for (let i = 0; i < 6; i++) setValorInputFicha(inputs[42 + i], valores[42] || '20 SEG.');
        return;
    }

    // Compatibilidade com fichas antigas de 40 inputs:
    // 21 MMI + 12 Protocolo + 6 exercícios HIIT + 1 tempo único.
    if (valores.length === 40 && inputs.length >= 48) {
        setValorInputFicha(inputs[0], 'MMI');
        for (let i = 0; i < 21; i++) setValorInputFicha(inputs[1 + i], valores[i]);
        setValorInputFicha(inputs[22], 'Protocolo');
        for (let i = 0; i < 12; i++) setValorInputFicha(inputs[23 + i], valores[21 + i]);
        setValorInputFicha(inputs[35], 'HIIT');
        for (let i = 0; i < 6; i++) setValorInputFicha(inputs[36 + i], valores[33 + i]);
        for (let i = 0; i < 6; i++) setValorInputFicha(inputs[42 + i], valores[39] || '20 SEG.');
        return;
    }

    // Fallback seguro: aplica o que existir sem quebrar.
    inputs.forEach((input, i) => setValorInputFicha(input, valores[i]));
}

/* === GERAR FICHAS COM LAYOUT PERSONALIZADO (ATUALIZADO) === */
function gerarFichasTreino() {
    // 1. Pega apenas os painéis de grupos que estão visíveis na tela
    const paineisGrupos = Array.from(document.querySelectorAll('#grupos-screen .grupos-ficha-panel'))
                               .filter(panel => panel.style.display !== 'none');

    if (paineisGrupos.length === 0) {
        alert("Por favor, selecione a quantidade e monte os grupos na tela antes de gerar as fichas!");
        return;
    }

    const container = document.getElementById('fichas-render-container');
    container.innerHTML = '';

    // 2. Captura o nome da categoria selecionada
    const catSelect = document.getElementById('grupo-categoria-select');
    let nomeCategoria = 'Categoria Indefinida';
    if (catSelect && catSelect.selectedIndex > 0) {
        nomeCategoria = catSelect.options[catSelect.selectedIndex].text.split(' (')[0];
    }

    // 3. Captura as médias globais corretas geradas na tela anterior
    const getMediaVal = (id) => {
        const el = document.getElementById(id);
        return el && el.textContent.includes(': ') ? el.textContent.split(': ')[1] : '-';
    };
    
    const medias = { 
        yoyo: getMediaVal('media-resistencia'), 
        gord: getMediaVal('media-gordura'), 
        acel: getMediaVal('media-aceleracao'), 
        vel: getMediaVal('media-velocidade'), 
        agil: getMediaVal('media-agilidade'),
        pot: getMediaVal('media-potencia')
    };

    // 4. Inicia o loop para gerar UMA ficha para cada Grupo
        paineisGrupos.forEach((grupoElem) => {
            const nomeGrupo = grupoElem.getAttribute('data-grupo'); 
            const numeroGrupo = nomeGrupo.replace('Grupo ', '');
            
            const linhasAtletas = grupoElem.querySelectorAll('.ficha-table tbody tr');
            let atletasData = [];

            linhasAtletas.forEach((tr) => {
                const cols = tr.querySelectorAll('td');
                if (cols.length >= 9) { 
                    let nome = cols[1]?.textContent || '';
                    if (nome.trim() !== '') {
                        
                        const getVal = (index) => {
                            const input = cols[index]?.querySelector('input');
                            return input ? input.value : (cols[index]?.textContent?.trim() || '-');
                        };

                        atletasData.push({
                            nome: nome.trim(),
                            yoyo: getVal(3),
                            gordura: getVal(4),
                            aceleracao: getVal(5),
                            velocidade: getVal(6),
                            agilidade: getVal(7),
                            potencia: getVal(8)
                        });
                    }
                }
            });

            // 5. Define os valores de referência e marca em vermelho somente os testes
            const numeroReferencia = (valor) => {
                if (valor === undefined || valor === null) return NaN;
                return parseFloat(String(valor).replace('%', '').replace(',', '.'));
            };
            const mediaPotencia = numeroReferencia(medias.pot);
            const mediaYoyo = numeroReferencia(medias.yoyo);
            const mediaAceleracao = numeroReferencia(medias.acel);
            const mediaVelocidade = numeroReferencia(medias.vel);
            const mediaAgilidade = numeroReferencia(medias.agil);
            const corTeste = (tipo, valor) => {
                const n = numeroReferencia(valor);
                if (isNaN(n)) return '';
                let alerta = false;
                if (tipo === 'potencia') alerta = !isNaN(mediaPotencia) && n <= mediaPotencia;
                if (tipo === 'gordura') alerta = n < 9.10 || n > 10.99;
                if (tipo === 'yoyo') alerta = !isNaN(mediaYoyo) && n < mediaYoyo;
                if (tipo === 'aceleracao') alerta = !isNaN(mediaAceleracao) && n > mediaAceleracao;
                if (tipo === 'velocidade') alerta = !isNaN(mediaVelocidade) && n > mediaVelocidade;
                if (tipo === 'agilidade') alerta = !isNaN(mediaAgilidade) && n > mediaAgilidade;
                return alerta ? 'color: #d00000 !important;' : '';
            };

            // 6. Monta a ficha, deixando vermelho apenas o teste abaixo/acima da referência
            const fichaHTML = `
            <div class="ficha-grupo-card">
                <div class="ficha-header-title">
                    ${nomeCategoria} &nbsp;&nbsp;/&nbsp;&nbsp; Grupo ${numeroGrupo}
                </div>

                <table class="ficha-table">
                    <thead>
                        <tr style="background-color: #fff; font-weight: bold;">
                            <th style="width: 35px;"></th>
                            <th style="text-align: center; width: 220px;">NOME</th>
                            <th>POTÊNCIA</th>
                            <th>%GORDURA</th>
                            <th>YOYO</th>
                            <th>ACELERAÇÃO</th>
                            <th>VELOCIDADE</th>
                            <th>AGILIDADE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${atletasData.map((a, i) => {
                            const bgStyle = i % 2 === 1 ? 'background-color: #e2e2e2;' : 'background-color: #ffffff;';
                            return `
                                <tr style="${bgStyle}">
                                    <td style="text-align: center; font-weight: bold;">${i + 1}</td>
                                    <td style="text-align: center; font-weight: bold;">${a.nome}</td>
                                    <td style="text-align: center; font-weight: bold; ${corTeste('potencia', a.potencia)}">${a.potencia}</td>
                                    <td style="text-align: center; font-weight: bold; ${corTeste('gordura', a.gordura)}">${a.gordura}</td>
                                    <td style="text-align: center; font-weight: bold; ${corTeste('yoyo', a.yoyo)}">${a.yoyo}</td>
                                    <td style="text-align: center; font-weight: bold; ${corTeste('aceleracao', a.aceleracao)}">${a.aceleracao}</td>
                                    <td style="text-align: center; font-weight: bold; ${corTeste('velocidade', a.velocidade)}">${a.velocidade}</td>
                                    <td style="text-align: center; font-weight: bold; ${corTeste('agilidade', a.agilidade)}">${a.agilidade}</td>
                                </tr>
                            `;
                        }).join('')}
                        
                        <tr class="row-media">
                            <td colspan="2" style="text-align: center; font-size: 13px;">MÉDIA DA CATEGORIA</td>
                            <td>${medias.pot}</td>
                            <td>${medias.gord}</td>
                            <td>${medias.yoyo}</td>
                            <td>${medias.acel}</td>
                            <td>${medias.vel}</td>
                            <td>${medias.agil}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- MMI -->
                <table class="ficha-table" style="margin-top: 8px;">
                    <tr>
                        <td rowspan="3" class="side-label"><input type="text" class="side-label-edit" value="MMI"></td>
                        <td class="mmi-header"><input type="text" value="Agachamento livre"></td>
                        <td class="mmi-header"><input type="text" value="Agachamento lateral"></td>
                        <td class="mmi-header"><input type="text" value="STIFF + Avanço"></td>
                        <td class="mmi-header"><input type="text" value="Avanço Dinamico"></td>
                        <td class="mmi-header"><input type="text" value="Terra + Salto"></td>
                        <td class="mmi-header"><input type="text" value="Agachamento sumo abre e fecha com salto"></td>
                        <td class="mmi-header"><input type="text" value="Ele. Pelvica"></td>
                    </tr>
                    <tr>
                        <td class="mmi-reps"><input type="text" value="3X8"></td>
                        <td class="mmi-reps"><input type="text" value="3X8"></td>
                        <td class="mmi-reps"><input type="text" value="3X8"></td>
                        <td class="mmi-reps"><input type="text" value="3x8"></td>
                        <td class="mmi-reps"><input type="text" value="3x8"></td>
                        <td class="mmi-reps"><input type="text" value="3x6"></td>
                        <td class="mmi-reps"><input type="text" value="3x10"></td>
                    </tr>
                    <tr>
                        <td class="mmi-weight"><input type="text" value="15kg"></td>
                        <td class="mmi-weight"><input type="text" value="14kg"></td>
                        <td class="mmi-weight"><input type="text" value="8kg"></td>
                        <td class="mmi-weight"><input type="text" value="10kg"></td>
                        <td class="mmi-weight"><input type="text" value="20kg"></td>
                        <td class="mmi-weight"><input type="text" value="10kg"></td>
                        <td class="mmi-weight"><input type="text" value="20kg"></td>
                    </tr>
                </table>

                <!-- PROTOCOLO -->
                <table class="ficha-table" style="margin-top: 8px;">
                    <tr>
                        <td rowspan="2" class="side-label"><input type="text" class="side-label-edit" value="Protocolo"></td>
                        <td class="proto-header"><input type="text" value="Remada baixa"></td>
                        <td class="proto-header"><input type="text" value="Supino com elevação pélvica"></td>
                        <td class="proto-header"><input type="text" value="Remada serrote"></td>
                        <td class="proto-header"><input type="text" value="Abd remador"></td>
                        <td class="proto-header"><input type="text" value="Dumbbell Snatch"></td>
                        <td class="proto-header"><input type="text" value="Flexão"></td>
                    </tr>
                    <tr>
                        <td class="proto-weight"><input type="text" value="60kg"></td>
                        <td class="proto-weight"><input type="text" value="6kg"></td>
                        <td class="proto-weight"><input type="text" value="12kg"></td>
                        <td class="proto-weight"><input type="text" value="10kg"></td>
                        <td class="proto-weight"><input type="text" value="10kg"></td>
                        <td class="proto-weight"><input type="text" value="-"></td>
                    </tr>
                </table>

                <!-- HIIT -->
                <table class="ficha-table" style="margin-top: 8px;">
                    <tr>
                        <td rowspan="2" class="side-label"><input type="text" class="side-label-edit" value="HIIT"></td>
                        <td class="hiit-header"><input type="text" value="AGACHAMENTO COM SALTO"></td>
                        <td class="hiit-header"><input type="text" value="AVANÇO COM SALTO"></td>
                        <td class="hiit-header"><input type="text" value="POLICHINELO"></td>
                        <td class="hiit-header"><input type="text" value="ABDOMINAL"></td>
                        <td class="hiit-header"><input type="text" value="FLEXÃO"></td>
                        <td class="hiit-header"><input type="text" value="BURPEE"></td>
                    </tr>
                    <tr>
                        <td class="hiit-footer"><input type="text" value="20 SEG." style="font-weight: bold; text-align: center;"></td>
                        <td class="hiit-footer"><input type="text" value="20 SEG." style="font-weight: bold; text-align: center;"></td>
                        <td class="hiit-footer"><input type="text" value="20 SEG." style="font-weight: bold; text-align: center;"></td>
                        <td class="hiit-footer"><input type="text" value="20 SEG." style="font-weight: bold; text-align: center;"></td>
                        <td class="hiit-footer"><input type="text" value="20 SEG." style="font-weight: bold; text-align: center;"></td>
                        <td class="hiit-footer"><input type="text" value="20 SEG." style="font-weight: bold; text-align: center;"></td>
                    </tr>
                </table>

                <!-- AVISO FINAL -->
                <table class="ficha-table ficha-aviso-final" style="margin-top: 8px;">
                    <tr>
                        <td class="proto-banner">
                            Chegar ANTES ou ficar APÓS para realizar os PROTOCOLOS (Atletas marcados, deverão realizar)
                        </td>
                    </tr>
                </table>
            </div>
            `;

            container.insertAdjacentHTML('beforeend', fichaHTML);
        });

        // ==========================================
        // NOVO: APLICA OS EXERCÍCIOS SALVOS ANTES DE EXIBIR A TELA
        // ==========================================
        if (Object.keys(exerciciosSalvosNaNuvem).length > 0) {
            document.querySelectorAll('.ficha-grupo-card').forEach((card, index) => {
                const valoresSalvos = exerciciosSalvosNaNuvem[index];
                aplicarValoresExerciciosFicha(card, valoresSalvos);
            });
        }
        // ==========================================

        document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active-screen'); s.style.display = 'none'; });
        const fichasScreen = document.getElementById('fichas-treino-screen');
        fichasScreen.style.display = 'block';
        fichasScreen.classList.add('active-screen');
        const mainContent = document.querySelector('.main-content');
        if(mainContent) mainContent.scrollTo(0,0);
        window.scrollTo(0, 0);

        // -> SALVA AUTOMATICAMENTE NO SUPABASE APÓS GERAR AS FICHAS
        salvarNoSupabase();
}

function voltarParaGrupos() {
    const fichas=document.getElementById('fichas-treino-screen');
    const grupos=document.getElementById('grupos-screen');
    if(fichas){fichas.style.display='none';fichas.classList.remove('active-screen');}
    if(grupos){grupos.style.display='block';grupos.classList.add('active-screen');}
    const mainContent=document.querySelector('.main-content');
    if(mainContent) mainContent.scrollTo(0,0);
}

// Salva as anotações de forma segura
function salvarAnotacoesAtleta() {
    if (atletaGlobalIndexAtual === null || atletaGlobalIndexAtual === undefined || !excelData[atletaGlobalIndexAtual]) {
        alert('Nenhum atleta selecionado.');
        return;
    }

    const textoDigitado = document.getElementById('textarea-anotacoes-texto').value.trim();
    
    let stringFinal = textoDigitado;
    if (documentosAtletaTemporarios.length > 0) {
        stringFinal += '\n\n--- [DOCUMENTOS ANEXADOS] ---\n' + JSON.stringify(documentosAtletaTemporarios);
    }

    excelData[atletaGlobalIndexAtual]['Anotacoes'] = stringFinal;

    const checkboxLesao = document.getElementById('checkbox-lesao');
    if (checkboxLesao) {
        excelData[atletaGlobalIndexAtual]['Lesao'] = checkboxLesao.checked ? 'sim' : '';
    }

    const checkboxCartaoVermelho = document.getElementById('checkbox-cartao-vermelho');
    if (checkboxCartaoVermelho) {
        excelData[atletaGlobalIndexAtual]['CartaoVermelho'] = checkboxCartaoVermelho.checked ? 'sim' : '';
    }

    saveToStorage(); 

    if (typeof renderExcelTable === 'function') renderExcelTable();
    if (typeof renderAtletasScreen === 'function') renderAtletasScreen();

    alert('Informações e documentos salvos com sucesso!');
    closeAnotacoesModal(); 
}


// Função auxiliar genérica para buscar dados da linha independentemente de maiúsculas/minúsculas
function getValorColuna(row, chavesPossiveis) {
    const chaveEncontrada = Object.keys(row).find(k => 
        chavesPossiveis.some(p => k.toLowerCase().trim() === p.toLowerCase().trim())
    );
    return chaveEncontrada ? row[chaveEncontrada] : '';
}

function normalizarTextoGrupoAtleta(valor) {
    return String(valor || '').trim().replace(/\s+/g, ' ');
}
function normalizarDataGrupoAtleta(valor) {
    return normalizarTextoGrupoAtleta(convertExcelDate(valor) || valor);
}
function valorColunaGrupoFlex(row, termos) {
    const chave = Object.keys(row || {}).find(k => termos.some(t => String(k).toLowerCase().includes(String(t).toLowerCase())));
    return chave ? row[chave] : '';
}
function identidadeAtletaGrupo(index) {
    const row = excelData[index] || {};
    const nomeCompleto = normalizarTextoGrupoAtleta(
        valorColunaGrupoFlex(row, ['nome completo']) ||
        valorColunaExata(row, 'NOME COMPLETO') ||
        valorColunaGrupoFlex(row, ['nome'])
    );
    const apelido = normalizarTextoGrupoAtleta(valorColunaGrupoFlex(row, ['apelido']));
    const nascimento = normalizarDataGrupoAtleta(valorColunaGrupoFlex(row, ['data de nascimento', 'nascimento']));
    const ano = normalizarTextoGrupoAtleta(valorColunaExata(row, 'Ano'));
    return { nomeCompleto, apelido, nascimento, ano };
}
function localizarAtletaGrupoSalvo(atletaSalvo) {
    if (atletaSalvo === undefined || atletaSalvo === null) return -1;
    const normalizar = normalizarTextoGrupoAtleta;
    const normalizarData = normalizarDataGrupoAtleta;

    if (typeof atletaSalvo === 'object') {
        const nomeCompletoSalvo = normalizar(atletaSalvo.nomeCompleto || atletaSalvo.nome_completo || '');
        const apelidoSalvo = normalizar(atletaSalvo.apelido || '');
        const nomeSalvo = normalizar(atletaSalvo.nome || ''); // compatibilidade com formato antigo: geralmente era apelido
        const nascimentoSalvo = normalizarData(atletaSalvo.nascimento || atletaSalvo.dataNascimento || atletaSalvo.data_nascimento || '');
        const anoSalvo = normalizar(atletaSalvo.ano || '');

        let idx = -1;
        if (nomeCompletoSalvo && nascimentoSalvo) {
            idx = excelData.findIndex((_, i) => {
                const id = identidadeAtletaGrupo(i);
                return id.nomeCompleto === nomeCompletoSalvo && id.nascimento === nascimentoSalvo;
            });
            if (idx >= 0) return idx;
        }
        if (nomeSalvo && nascimentoSalvo) {
            idx = excelData.findIndex((_, i) => {
                const id = identidadeAtletaGrupo(i);
                return (id.apelido === nomeSalvo || id.nomeCompleto === nomeSalvo) && id.nascimento === nascimentoSalvo;
            });
            if (idx >= 0) return idx;
        }
        if (apelidoSalvo && nascimentoSalvo) {
            idx = excelData.findIndex((_, i) => {
                const id = identidadeAtletaGrupo(i);
                return id.apelido === apelidoSalvo && id.nascimento === nascimentoSalvo;
            });
            if (idx >= 0) return idx;
        }
        if ((nomeCompletoSalvo || nomeSalvo || apelidoSalvo) && anoSalvo) {
            const nomeBusca = nomeCompletoSalvo || nomeSalvo || apelidoSalvo;
            idx = excelData.findIndex((_, i) => {
                const id = identidadeAtletaGrupo(i);
                return (id.nomeCompleto === nomeBusca || id.apelido === nomeBusca) && id.ano === anoSalvo;
            });
            if (idx >= 0) return idx;
        }
        return -1;
    }

    const nomeAntigo = normalizar(atletaSalvo);
    if (!nomeAntigo) return -1;
    return excelData.findIndex((_, i) => {
        const id = identidadeAtletaGrupo(i);
        return id.apelido === nomeAntigo || id.nomeCompleto === nomeAntigo;
    });
}

async function salvarNoSupabase() {
    const catSelect = document.getElementById('grupo-categoria-select');
    if (!catSelect || catSelect.selectedIndex <= 0) {
        alert("Selecione uma categoria primeiro!");
        return;
    }
    
    const categoriaId = catSelect.value;

    // 1. Salva os grupos e atletas (que já funcionam perfeitamente)
    const paineisGrupos = Array.from(document.querySelectorAll('#grupos-screen .grupos-ficha-panel'));
    const gruposDataPayload = paineisGrupos.map(panel => {
        const nomeGrupo = panel.getAttribute('data-grupo');
        const isVisivel = panel.style.display !== 'none';
        
        const atletas = Array.from(panel.querySelectorAll('.ficha-table tbody tr')).map(tr => {
            const index = Number(tr.dataset.globalIndex);
            if (Number.isInteger(index) && excelData[index]) {
                const id = identidadeAtletaGrupo(index);
                return {
                    nomeCompleto: id.nomeCompleto,
                    apelido: id.apelido,
                    nascimento: id.nascimento,
                    ano: id.ano
                };
            }
            return null;
        }).filter(atleta => atleta && atleta.nomeCompleto && atleta.nascimento);

        return { nomeGrupo, isVisivel, atletas };
    });

    // 2. Captura correta de todos os campos de exercícios (repetições, cargas) dos cards
    const exerciciosData = {};
    document.querySelectorAll('.ficha-grupo-card').forEach((card, index) => {
        const inputs = Array.from(card.querySelectorAll('input')).map(input => input.value);
        exerciciosData[index] = inputs;
    });

    // Atualiza a variável global com o que acabou de ser lido da tela
    exerciciosSalvosNaNuvem = exerciciosData;

    const payload = {
        grupos: gruposDataPayload,
        exercicios: exerciciosData
    };

    const { error } = await _supabase
        .from('configuracoes_categorias')
        .upsert({ 
            categoria_id: categoriaId, 
            dados: payload, 
            atualizado_em: new Date() 
        });

    if (error) {
        console.error("Erro ao salvar no Supabase:", error.message);
        alert("Erro ao salvar alterações na nuvem.");
    } else {
        console.log("Ficha e exercícios salvos com sucesso!");
        alert("Alterações salvas com sucesso!");
    }
}

async function carregarDoSupabase() {
    const catSelect = document.getElementById('grupo-categoria-select');
    if (!catSelect || catSelect.selectedIndex <= 0) {
        for (let g in gruposData) {
            gruposData[g] = [];
        }
        if (typeof renderGruposScreen === 'function') renderGruposScreen();
        return;
    }

    const categoriaId = catSelect.value;

    const { data, error } = await _supabase
        .from('configuracoes_categorias')
        .select('dados')
        .eq('categoria_id', categoriaId)
        .maybeSingle();

    if (error) {
        console.error("Erro ao consultar o Supabase:", error.message);
        return;
    }

    for (let g in gruposData) {
        gruposData[g] = [];
    }

    if (!data || !data.dados) {
        if (typeof renderGruposScreen === 'function') renderGruposScreen();
        return;
    }

    const estado = data.dados;

    if (estado && estado.grupos) {
        estado.grupos.forEach(gData => {
            const panel = document.querySelector(`#grupos-screen .grupos-ficha-panel[data-grupo="${gData.nomeGrupo}"]`);
            if (panel) {
                panel.style.display = gData.isVisivel ? 'block' : 'none';
            }

            if (gData.atletas && Array.isArray(gData.atletas)) {
                gData.atletas.forEach(atletaSalvo => {
                    const idx = localizarAtletaGrupoSalvo(atletaSalvo);
                    if (idx >= 0 && idx < excelData.length) {
                        if (!gruposData[gData.nomeGrupo]) gruposData[gData.nomeGrupo] = [];
                        if (!gruposData[gData.nomeGrupo].some(item => item.index === idx)) {
                            gruposData[gData.nomeGrupo].push({ index: idx, manualData: {} });
                        }
                    } else {
                        console.warn('Atleta salvo no grupo não localizado:', atletaSalvo);
                    }
                });
            }
        });

        if (typeof renderGruposScreen === 'function') {
            renderGruposScreen();
        }
    }

    // 3. Salva os dados de exercícios na variável global para quando a ficha for gerada
    if (estado && estado.exercicios) {
        exerciciosSalvosNaNuvem = estado.exercicios;
        
        // Tenta aplicar caso a tela de fichas já esteja aberta (re-render)
        document.querySelectorAll('.ficha-grupo-card').forEach((card, index) => {
            const inputs = card.querySelectorAll('input');
            const valoresSalvos = exerciciosSalvosNaNuvem[index];
            if (valoresSalvos && inputs) {
                inputs.forEach((input, i) => {
                    if (valoresSalvos[i] !== undefined) {
                        input.value = valoresSalvos[i];
                    }
                });
            }
        });
    } else {
        exerciciosSalvosNaNuvem = {}; // Limpa caso não exista nada salvo na categoria
    }
}

function imprimirFichaAtleta() {
    var bodyContent = document.getElementById('fichaModalBody').innerHTML;
    
    var janela = window.open('', '_blank', 'width=800,height=600');
    janela.document.write(`
        <html>
        <head>
            <title>Ficha do Atleta - CFA Prosol</title>
            <link rel="stylesheet" href="style.css">
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .close-btn, .modal-footer, .modal-header { display: none !important; }
                .modal-overlay { display: block !important; position: static !important; background: none !important; height: auto !important; }
                .modal-container { width: 100% !important; max-width: 100% !important; border: none !important; box-shadow: none !important; }
                .modal-body { padding: 10px !important; }
                @page { size: A4 landscape; margin: 6mm; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            </style>
        </head>
        <body>
            ${bodyContent}
            <script>
                window.onload = function() { window.print(); window.close(); };
            <\/script>
        </body>
        </html>
    `);
    janela.document.close();
}






/* ========================================================
   MÓDULO NOVO: GRUPOS (Separação de Grupos)
   ======================================================== */

// Extrai as métricas da última avaliação existente do atleta
function getUltimaAvaliacao(row) {
    let maxEvalNum = 1;
    for (let i = 1; i <= 20; i++) {
        let hasData = false;
        for (let key in row) {
            let kLow = key.toLowerCase();
            if ((kLow === ('altura' + i) || kLow === ('peso' + i) || kLow === ('distancia' + i) || kLow === ('data' + i)) && row[key] && String(row[key]).trim() !== '-') {
                hasData = true; break;
            }
        }
        if (hasData) maxEvalNum = i;
    }

    function getVal(baseName) {
        let val = '-';
        for (let key in row) {
            let k = key.toLowerCase();
            if (k === (baseName.toLowerCase() + maxEvalNum) || k === (baseName.toLowerCase() + '_' + maxEvalNum)) {
                if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') val = row[key];
            }
        }
        return val;
    }

    return {
        distancia: getVal('distancia'),
        gordura: formatGordura(getVal('PercentualGordura')),
        aceleracao: getVal('Aceleraçãofinal'),
        velocidade: getVal('Velocidadefinal'),
        agilidade: getVal('Agilidade'),
        potencia: getVal('MelhorSalto')
    };
}

function initGruposFilter() {
    const container = document.getElementById('grupos-anos-filter');
    if (!container) return;
    container.innerHTML = '';
    const anos = ['2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018'];
    anos.forEach(ano => {
        container.innerHTML += `<label><input type="checkbox" class="grupo-chk-ano" value="${ano}" onchange="renderGruposScreen()"> ${ano}</label>`;
    });
}

function renderGruposScreen() {
    renderGruposLista();
    renderFichaGrupo();
    calcularMediaCategoria(); // Atualiza a média se houver categoria selecionada
    
    // NOVO: Controla a visibilidade dos painéis de grupos de acordo com a quantidade selecionada (1 a 6)
    document.querySelectorAll('.grupos-ficha-panel').forEach(panel => {
        const grupoNome = panel.getAttribute('data-grupo'); // Ex: "Grupo 1", "Grupo 2"...
        if (grupoNome) {
            // Extrai o número do grupo (ex: "Grupo 3" vira o número 3)
            const numeroGrupo = parseInt(grupoNome.replace('Grupo ', ''));
            
            // Se o número do grupo for menor ou igual ao selecionado, ele aparece. Senão, fica oculto.
            if (numeroGrupo <= quantidadeGruposAtivos) {
                panel.style.display = 'block'; // Ou 'flex', dependendo do seu layout original
            } else {
                panel.style.display = 'none';
                
                // Opcional: Se o usuário diminuiu a quantidade de grupos e havia atletas no grupo oculto,
                // você pode opcionalmente limpá-los ou mantê-los nos dados. Aqui mantemos apenas oculto visualmente.
            }
        }
    });

    // Configura o Drop Zone em TODAS as fichas ativas
    document.querySelectorAll('.grupos-ficha-panel').forEach(panel => {
        // Ignora painéis que estão ocultos
        if (panel.style.display === 'none') return;

        panel.ondragover = (e) => e.preventDefault();
        panel.ondrop = (e) => {
            e.preventDefault();
            const globalIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const grupoAtual = panel.getAttribute('data-grupo');
            
            if (!isNaN(globalIndex) && !isAtletaEmAlgumGrupo(globalIndex)) {
                gruposData[grupoAtual].push({ index: globalIndex, manualData: {} });
                renderGruposScreen(); // Re-renderiza para atualizar cores e tabelas
            }
        };
    });
}


document.addEventListener('DOMContentLoaded', () => {
    // 1. Ouvinte para o select de categoria (carregamento automático ao trocar a categoria)
    const catSelect = document.getElementById('grupo-categoria-select');
    if (catSelect) {
        catSelect.addEventListener('change', async () => {
            await carregarDoSupabase();
        });
    }

    // 2. Ouvinte EXCLUSIVO para o botão de Salvar (Apenas Manual)
    const btnSalvarFicha = document.getElementById('btn-salvar-ficha');
    if (btnSalvarFicha) {
        btnSalvarFicha.addEventListener('click', async () => {
            // O salvamento agora só acontece quando este botão for clicado
            await salvarNoSupabase();
            
            // Opcional: Se a sua função salvarNoSupabase() já tiver um alert() dentro dela, 
            // não precisa colocar nada aqui. Se não tiver, você pode adicionar:
            // alert('Ficha salva com sucesso!');
       });
    }
});

    



function isAtletaEmAlgumGrupo(globalIndex) {
    for (let grupo in gruposData) {
        if (gruposData[grupo].some(atleta => atleta.index === globalIndex)) return true;
    }
    return false;
}

function renderGruposLista() {
    const container = document.getElementById('grupos-lista-container');
    if (!container) return;
    container.innerHTML = '';

    const anosSelecionados = Array.from(document.querySelectorAll('.grupo-chk-ano:checked')).map(chk => chk.value);

    let atletasValidos = [];

    excelData.forEach((row, globalIndex) => {
        let anoAtleta = Object.keys(row).find(k => k.toLowerCase() === 'ano');
        anoAtleta = anoAtleta ? String(row[anoAtleta]).trim() : '';

        if (anosSelecionados.length > 0 && !anosSelecionados.includes(anoAtleta)) return;
        if (isAtletaEmAlgumGrupo(globalIndex)) return;

        let nomeExibicao = Object.keys(row).find(k => k.toLowerCase().includes('apelido'));
        nomeExibicao = nomeExibicao && row[nomeExibicao] ? row[nomeExibicao] : '';
        if (!nomeExibicao) {
            let nm = Object.keys(row).find(k => k.toLowerCase().includes('nome'));
            nomeExibicao = nm && row[nm] ? row[nm] : 'Sem Nome';
        }

        const stats = getUltimaAvaliacao(row);

        atletasValidos.push({ globalIndex, nomeExibicao, anoAtleta, stats });
    });

    // Lógica de Ordenação
    atletasValidos.sort((a, b) => {
        let valorA, valorB;
        if (criterioOrdenacaoAtual === 'nome') {
            valorA = a.nomeExibicao.toLowerCase();
            valorB = b.nomeExibicao.toLowerCase();
            if (valorA < valorB) return direcaoOrdenacaoAtual === 'asc' ? -1 : 1;
            if (valorA > valorB) return direcaoOrdenacaoAtual === 'asc' ? 1 : -1;
            return 0;
        } else {
            valorA = parseFloat(String(a.stats[criterioOrdenacaoAtual]).replace(',', '.')) || 0;
            valorB = parseFloat(String(b.stats[criterioOrdenacaoAtual]).replace(',', '.')) || 0;
            if (direcaoOrdenacaoAtual === 'asc') return valorA - valorB; 
            else return valorB - valorA; 
        }
    });

    // Função auxiliar para exibir a setinha da ordenação atual
    const getSortIcon = (criterio) => {
        if (criterioOrdenacaoAtual === criterio) {
            return direcaoOrdenacaoAtual === 'asc' ? ' <i class="fa-solid fa-caret-up"></i>' : ' <i class="fa-solid fa-caret-down"></i>';
        }
        return '';
    };

    // Montando o Cabeçalho (com função de filtro embutida)
    const headerHTML = `
        <div class="athlete-list-header athlete-grid-layout">
            <div onclick="mudarOrdenacao('nome')">NOME / ANO${getSortIcon('nome')}</div>
            <div onclick="mudarOrdenacao('distancia')">RES.${getSortIcon('distancia')}</div>
            <div onclick="mudarOrdenacao('gordura')">% GOR.${getSortIcon('gordura')}</div>
            <div onclick="mudarOrdenacao('aceleracao')">ACE.${getSortIcon('aceleracao')}</div>
            <div onclick="mudarOrdenacao('velocidade')">VEL.${getSortIcon('velocidade')}</div>
            <div onclick="mudarOrdenacao('agilidade')">AGIL.${getSortIcon('agilidade')}</div>
            <div onclick="mudarOrdenacao('potencia')">POT.${getSortIcon('potencia')}</div>
        </div>
    `;

    // Como são 2 colunas no grid, injetamos o cabeçalho 2 vezes para preencher o topo de ambas
    container.innerHTML += headerHTML + headerHTML;

    // Renderiza os atletas (sem os prefixos, apenas os dados)
    atletasValidos.forEach(atleta => {
        const card = document.createElement('div');
        card.className = 'athlete-list-item athlete-grid-layout';
        card.draggable = true;
        card.ondragstart = (e) => { e.dataTransfer.setData('text/plain', atleta.globalIndex); };
	// NOVO: Adiciona o evento de clique para abrir o pop-up de seleção de grupo
        card.onclick = () => openSelectGrupoModal(atleta.globalIndex);
        card.style.cursor = 'pointer';
        card.innerHTML = `
            <span class="athlete-name" title="${atleta.nomeExibicao} (${atleta.anoAtleta})">${atleta.nomeExibicao} (${atleta.anoAtleta})</span>
            <span class="athlete-stat" title="Resistência">${atleta.stats.distancia}</span>
            <span class="athlete-stat" title="% Gordura">${atleta.stats.gordura}</span>
            <span class="athlete-stat" title="Aceleração">${atleta.stats.aceleracao}</span>
            <span class="athlete-stat" title="Velocidade">${atleta.stats.velocidade}</span>
            <span class="athlete-stat" title="Agilidade">${atleta.stats.agilidade}</span>
            <span class="athlete-stat" title="Potência">${atleta.stats.potencia}</span>
        `;
        container.appendChild(card);
    });
}

function renderFichaGrupo() {
    const grupos = ['Grupo 1', 'Grupo 2', 'Grupo 3', 'Grupo 4', 'Grupo 5', 'Grupo 6'];
    
    grupos.forEach(grupoNome => {
        const tbody = document.getElementById(`tbody-${grupoNome}`);
        if (!tbody) return;
        tbody.innerHTML = '';

        const atletasDoGrupo = gruposData[grupoNome] || [];

        atletasDoGrupo.forEach((item, arrIndex) => {
            const row = excelData[item.index];
            let anoAtleta = Object.keys(row).find(k => k.toLowerCase() === 'ano');
            anoAtleta = anoAtleta ? String(row[anoAtleta]).trim() : '';
            
            let nomeExibicao = Object.keys(row).find(k => k.toLowerCase().includes('apelido'));
            nomeExibicao = nomeExibicao && row[nomeExibicao] ? row[nomeExibicao] : '';
            if (!nomeExibicao) {
                let nm = Object.keys(row).find(k => k.toLowerCase().includes('nome'));
                nomeExibicao = nm && row[nm] ? row[nm] : 'Sem Nome';
            }

            const defaultStats = getUltimaAvaliacao(row);

            const valDistancia = item.manualData.distancia !== undefined ? item.manualData.distancia : defaultStats.distancia;
            const valGordura = item.manualData.gordura !== undefined ? item.manualData.gordura : defaultStats.gordura;
            const valAceleracao = item.manualData.aceleracao !== undefined ? item.manualData.aceleracao : defaultStats.aceleracao;
            const valVelocidade = item.manualData.velocidade !== undefined ? item.manualData.velocidade : defaultStats.velocidade;
            const valAgilidade = item.manualData.agilidade !== undefined ? item.manualData.agilidade : defaultStats.agilidade;
            const valPotencia = item.manualData.potencia !== undefined ? item.manualData.potencia : defaultStats.potencia;

            const tr = document.createElement('tr');
            tr.dataset.globalIndex = item.index;
            
            const tdAction = document.createElement('td');
            tdAction.innerHTML = `<button class="grupo-remove-atleta-btn" title="Remover atleta do grupo" onclick="removerAtletaDoGrupo('${grupoNome}', ${item.index})">×</button>`;
            
            const tdNome = document.createElement('td'); tdNome.textContent = nomeExibicao; tdNome.style.fontWeight = 'bold';
            const tdAno = document.createElement('td'); tdAno.textContent = anoAtleta;

            const createInputCell = (field, value) => {
                const td = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'text';
                input.value = value;
                input.readOnly = true;
                input.tabIndex = -1;
                td.appendChild(input);
                return td;
            };

            tr.appendChild(tdAction);
            tr.appendChild(tdNome);
            tr.appendChild(tdAno);
            tr.appendChild(createInputCell('distancia', valDistancia));
            tr.appendChild(createInputCell('gordura', valGordura));
            tr.appendChild(createInputCell('aceleracao', valAceleracao));
            tr.appendChild(createInputCell('velocidade', valVelocidade));
            tr.appendChild(createInputCell('agilidade', valAgilidade));
            tr.appendChild(createInputCell('potencia', valPotencia));

            tbody.appendChild(tr);
        });
    });
}

function removerAtletaDoGrupo(grupo, globalIndex) {
    gruposData[grupo] = gruposData[grupo].filter(item => item.index !== globalIndex);
    renderGruposScreen();
}

function limparGrupo(grupoNome) {
    if (confirm(`Deseja limpar todos os atletas do ${grupoNome}?`)) {
        gruposData[grupoNome] = [];
        renderGruposScreen();
    }
}

// Calcula as médias baseado APENAS nos anos da categoria escolhida, lendo do banco completo (excelData)
function calcularMediaCategoria() {
    const categoria = document.getElementById('grupo-categoria-select').value;
    let anosCategoria = [];
    
    if (categoria === 'sub11') anosCategoria = ['2015', '2016', '2017', '2018'];
    else if (categoria === 'sub12') anosCategoria = ['2014'];
    else if (categoria === 'sub13') anosCategoria = ['2013'];
    else if (categoria === 'sub16') anosCategoria = ['2009', '2010', '2011', '2012'];

    if (anosCategoria.length === 0) {
        document.getElementById('media-resistencia').textContent = `Resistência: -`;
        document.getElementById('media-gordura').textContent = `% Gordura: -`;
        document.getElementById('media-aceleracao').textContent = `Aceleração: -`;
        document.getElementById('media-velocidade').textContent = `Velocidade: -`;
        document.getElementById('media-agilidade').textContent = `Agilidade: -`;
        document.getElementById('media-potencia').textContent = `Potência: -`;
        return;
    }

    let sums = { dist: 0, gordura: 0, acel: 0, vel: 0, agil: 0, pot: 0 };
    let counts = { dist: 0, gordura: 0, acel: 0, vel: 0, agil: 0, pot: 0 };

    excelData.forEach(row => {
        let anoAtleta = Object.keys(row).find(k => k.toLowerCase() === 'ano');
        anoAtleta = anoAtleta ? String(row[anoAtleta]).trim() : '';

        if (anosCategoria.includes(anoAtleta)) {
            const stats = getUltimaAvaliacao(row);
            
            const parseNum = (str) => {
                if(!str || str === '-') return NaN;
                return parseFloat(String(str).replace('%', '').replace(',', '.'));
            };

            const d = parseNum(stats.distancia); if(!isNaN(d)){ sums.dist += d; counts.dist++; }
            const g = parseNum(stats.gordura); if(!isNaN(g)){ sums.gordura += g; counts.gordura++; }
            const ac = parseNum(stats.aceleracao); if(!isNaN(ac)){ sums.acel += ac; counts.acel++; }
            const v = parseNum(stats.velocidade); if(!isNaN(v)){ sums.vel += v; counts.vel++; }
            const ag = parseNum(stats.agilidade); if(!isNaN(ag)){ sums.agil += ag; counts.agil++; }
            const p = parseNum(stats.potencia); if(!isNaN(p)){ sums.pot += p; counts.pot++; }
        }
    });

    const formatMedia = (sum, count, isGordura) => {
        if(count === 0) return '-';
        let media = sum / count;
        return media.toFixed(2).replace('.', ',') + (isGordura ? '%' : '');
    };

    document.getElementById('media-resistencia').textContent = `Resistência: ${formatMedia(sums.dist, counts.dist)}`;
    document.getElementById('media-gordura').textContent = `% Gordura: ${formatMedia(sums.gordura, counts.gordura, true)}`;
    document.getElementById('media-aceleracao').textContent = `Aceleração: ${formatMedia(sums.acel, counts.acel)}`;
    document.getElementById('media-velocidade').textContent = `Velocidade: ${formatMedia(sums.vel, counts.vel)}`;
    document.getElementById('media-agilidade').textContent = `Agilidade: ${formatMedia(sums.agil, counts.agil)}`;
    document.getElementById('media-potencia').textContent = `Potência: ${formatMedia(sums.pot, counts.pot)}`;
}


let atletaSelecionadoParaGrupo = null;

function openSelectGrupoModal(globalIndex) {
    atletaSelecionadoParaGrupo = globalIndex;
    const row = excelData[globalIndex];
    let nomeExibicao = Object.keys(row).find(k => k.toLowerCase().includes('apelido'));
    nomeExibicao = nomeExibicao && row[nomeExibicao] ? row[nomeExibicao] : '';
    if (!nomeExibicao) {
        let nm = Object.keys(row).find(k => k.toLowerCase().includes('nome'));
        nomeExibicao = nm && row[nm] ? row[nm] : 'Sem Nome';
    }
    
    document.getElementById('modal-atleta-nome').textContent = `Atleta: ${nomeExibicao}`;
    
    // Gera os botões dos grupos dinamicamente baseados na quantidade ativa selecionada
    const containerGrupos = document.getElementById('modal-grupos-container');
    containerGrupos.innerHTML = '';
    
    for (let i = 1; i <= quantidadeGruposAtivos; i++) {
        const nomeGrupo = `Grupo ${i}`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vba-btn-salvar';
        btn.style.width = '100%';
        btn.style.textAlign = 'center';
        btn.style.marginBottom = '2px';
        btn.textContent = nomeGrupo;
        
        btn.onclick = () => {
            if (!isAtletaEmAlgumGrupo(atletaSelecionadoParaGrupo)) {
                gruposData[nomeGrupo].push({ index: atletaSelecionadoParaGrupo, manualData: {} });
                renderGruposScreen();
            }
            closeSelectGrupoModal();
        };
        
        containerGrupos.appendChild(btn);
    }

    document.getElementById('select-grupo-modal').style.display = 'flex';
}

function closeSelectGrupoModal() {
    document.getElementById('select-grupo-modal').style.display = 'none';
    atletaSelecionadoParaGrupo = null;
}






function mudarOrdenacao(criterio) {
    if (criterioOrdenacaoAtual === criterio) {
        // Se já está ordenado por este critério, inverte a direção (asc <-> desc)
        direcaoOrdenacaoAtual = direcaoOrdenacaoAtual === 'asc' ? 'desc' : 'asc';
    } else {
        // Se mudou de critério, define ele e começa do padrão (asc)
        criterioOrdenacaoAtual = criterio;
        direcaoOrdenacaoAtual = 'asc';
    }

    // Como inserimos os ícones dinamicamente na renderGruposLista, 
    // basta re-renderizar a lista para que a ordenação visual e funcional seja aplicada.
    renderGruposLista();
}


/* === RESTANTE DO CÓDIGO (CONVOCAÇÃO, ETC.) MANTIDO IGUAL === */
/* === RESTANTE DO CÓDIGO (CONVOCAÇÃO, ETC.) MANTIDO IGUAL === */
function ensureConvocacaoModalDom() {
    let modal = document.getElementById('convocacao-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'convocacao-modal';
        modal.style.cssText = `display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.6); z-index: 10000; align-items: center; justify-content: center; padding: 20px;`;
        modal.innerHTML = `
            <div style="background: #fff; width: 100%; max-width: 1250px; height: 90vh; border-radius: 8px; box-shadow: 0 8px 25px rgba(0,0,0,0.3); display: flex; flex-direction: column; overflow: hidden; border: 1px solid #aaa;">
                <div style="background: #f1f1f1; padding: 12px 20px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 16px;">
                    <span>Atletas - Arraste para mudar de posição</span>
                    <button onclick="closeConvocacaoModal()" style="background: none; border: none; font-size: 18px; font-weight: bold; cursor: pointer; color: #555;">&times;</button>
                </div>
                <div id="convocacao-years-bar" style="padding: 12px 20px; display: flex; gap: 20px; flex-wrap: wrap; background: #fafafa; border-bottom: 1px solid #ddd; align-items: center; justify-content: center;"></div>
                <div style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; background: #fff;">
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                        <div class="drop-box" data-category="goleiros" style="border: 1px solid #b2bec3; border-radius: 4px; display: flex; flex-direction: column; background: #fff;">
                            <div style="background: #dfe6e9; padding: 6px; text-align: center; font-weight: bold; border-bottom: 1px solid #b2bec3; font-size: 14px;">Goleiros</div>
                            <div id="conv-list-goleiros" style="height: 180px; overflow-y: auto; background: #fff; padding: 2px;"></div>
                        </div>
                        <div class="drop-box" data-category="zagueiros" style="border: 1px solid #b2bec3; border-radius: 4px; display: flex; flex-direction: column; background: #fff;">
                            <div style="background: #dfe6e9; padding: 6px; text-align: center; font-weight: bold; border-bottom: 1px solid #b2bec3; font-size: 14px;">Zagueiros</div>
                            <div id="conv-list-zagueiros" style="height: 180px; overflow-y: auto; background: #fff; padding: 2px;"></div>
                        </div>
                        <div class="drop-box" data-category="laterais" style="border: 1px solid #b2bec3; border-radius: 4px; display: flex; flex-direction: column; background: #fff;">
                            <div style="background: #dfe6e9; padding: 6px; text-align: center; font-weight: bold; border-bottom: 1px solid #b2bec3; font-size: 14px;">Laterais</div>
                            <div id="conv-list-laterais" style="height: 180px; overflow-y: auto; background: #fff; padding: 2px;"></div>
                        </div>
                        <div class="drop-box" data-category="volantes" style="border: 1px solid #b2bec3; border-radius: 4px; display: flex; flex-direction: column; background: #fff;">
                            <div style="background: #dfe6e9; padding: 6px; text-align: center; font-weight: bold; border-bottom: 1px solid #b2bec3; font-size: 14px;">Volantes</div>
                            <div id="conv-list-volantes" style="height: 180px; overflow-y: auto; background: #fff; padding: 2px;"></div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                        <div class="drop-box" data-category="meias" style="border: 1px solid #b2bec3; border-radius: 4px; display: flex; flex-direction: column; background: #fff;">
                            <div style="background: #dfe6e9; padding: 6px; text-align: center; font-weight: bold; border-bottom: 1px solid #b2bec3; font-size: 14px;">Meias</div>
                            <div id="conv-list-meias" style="height: 180px; overflow-y: auto; background: #fff; padding: 2px;"></div>
                        </div>
                        <div class="drop-box" data-category="atacantes" style="border: 1px solid #b2bec3; border-radius: 4px; display: flex; flex-direction: column; background: #fff;">
                            <div style="background: #dfe6e9; padding: 6px; text-align: center; font-weight: bold; border-bottom: 1px solid #b2bec3; font-size: 14px;">Atacantes</div>
                            <div id="conv-list-atacantes" style="height: 180px; overflow-y: auto; background: #fff; padding: 2px;"></div>
                        </div>
                        <div class="drop-box" data-category="extremos" style="border: 1px solid #b2bec3; border-radius: 4px; display: flex; flex-direction: column; background: #fff;">
                            <div style="background: #dfe6e9; padding: 6px; text-align: center; font-weight: bold; border-bottom: 1px solid #b2bec3; font-size: 14px;">Extremos</div>
                            <div id="conv-list-extremos" style="height: 180px; overflow-y: auto; background: #fff; padding: 2px;"></div>
                        </div>
                    </div>
                </div>
                <div style="background: #f1f1f1; padding: 15px 20px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; gap: 10px;">
                        <button onclick="carregarConvocacaoSalva()" style="padding: 8px 15px; border: 1px solid #b2bec3; background: #fff; border-radius: 4px; cursor: pointer; font-weight: 600;">Carregar Convocações</button><button onclick="abrirExcluirConvocacaoModal()" style="padding: 8px 15px; border: 1px solid #d32f2f; background: #fff; color: #b30000; border-radius: 4px; cursor: pointer; font-weight: 600;">Excluir Convocação</button>
                        <button onclick="limparConvocacao()" style="padding: 8px 15px; border: 1px solid #b2bec3; background: #fff; border-radius: 4px; cursor: pointer; font-weight: 600;">Limpar Convocação</button>
                        <button onclick="excluirAtletasSelecionadosConvocacao()" style="padding: 8px 15px; border: 1px solid #d32f2f; background: #ff5252; color: #fff; border-radius: 4px; cursor: pointer; font-weight: bold;">Excluir Atletas Selecionados</button>
                    </div>
                    <div id="convocacao-contador" style="font-weight: bold; font-size: 14px; color: #111; padding: 0 15px; white-space: nowrap;">Atletas convocados: 0</div>
                    <div>
                        <button onclick="confirmarConvocacao()" style="padding: 10px 25px; border: none; background: #2ed573; color: #fff; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">Confirmar Convocação</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}
function openConvocacaoModal() { document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active-screen');s.style.display='';}); document.getElementById('home-screen')?.classList.add('active-screen'); if(!convocacaoSessaoAtiva){selectedConvocados.clear();localStorage.removeItem(STORAGE_CONVOCACAO_KEY);localStorage.removeItem('prosol_cfa_escalacao_v1');convocacaoCarregadaNaSessao=false;} convocacaoSessaoAtiva=true; ensureConvocacaoModalDom(); renderConvocacaoScreen(); document.getElementById('convocacao-modal').style.display = 'flex'; }
function closeConvocacaoModal() { document.getElementById('convocacao-modal').style.display = 'none'; }
function renderConvocacaoScreen() {
    const yearsBar = document.getElementById('convocacao-years-bar'); if (!yearsBar) return;
    yearsBar.innerHTML = '';
    ['2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018'].forEach(ano => {
        const label = document.createElement('label'); label.style.cssText = 'display: flex; align-items: center; gap: 5px; cursor: pointer; font-weight: 500;';
        const chk = document.createElement('input'); chk.type = 'checkbox'; chk.value = ano; chk.checked = false; chk.className = 'conv-year-chk'; chk.onchange = renderConvocacaoLists;
        label.appendChild(chk); label.appendChild(document.createTextNode(ano)); yearsBar.appendChild(label);
    });
    renderConvocacaoLists();
}
function atualizarContadorConvocados() {
    const el = document.getElementById('convocacao-contador');
    if (el) el.textContent = 'Atletas convocados: ' + selectedConvocados.size;
}
function renderConvocacaoLists() {
    const selectedYears = Array.from(document.querySelectorAll('.conv-year-chk:checked')).map(chk => chk.value);
    const posLists = { 'goleiros': document.getElementById('conv-list-goleiros'), 'zagueiros': document.getElementById('conv-list-zagueiros'), 'laterais': document.getElementById('conv-list-laterais'), 'volantes': document.getElementById('conv-list-volantes'), 'meias': document.getElementById('conv-list-meias'), 'atacantes': document.getElementById('conv-list-atacantes'), 'extremos': document.getElementById('conv-list-extremos') };
    for (let key in posLists) { if (posLists[key]) posLists[key].innerHTML = ''; }

    document.querySelectorAll('.drop-box').forEach(box => {
        const cat = box.getAttribute('data-category');
        box.ondragover = (e) => e.preventDefault();
        box.ondrop = (e) => { e.preventDefault(); const globalIndex = parseInt(e.dataTransfer.getData('text/plain')); if (!isNaN(globalIndex)) handleAthleteDrop(globalIndex, cat); };
    });

    if (selectedYears.length === 0) { atualizarContadorConvocados(); return; }

    excelData.forEach((row, globalIndex) => {
        let anoAtleta = Object.keys(row).find(k => k.toLowerCase() === 'ano'); anoAtleta = anoAtleta ? String(row[anoAtleta]).trim() : '';
        if (!selectedYears.includes(anoAtleta)) return;

        let nomeExibicao = Object.keys(row).find(k => k.toLowerCase().includes('apelido')); nomeExibicao = nomeExibicao && row[nomeExibicao] ? row[nomeExibicao] : '';
        if (!nomeExibicao) { let nm = Object.keys(row).find(k => k.toLowerCase().includes('nome')); nomeExibicao = nm && row[nm] ? row[nm] : 'Sem Nome'; }
        
        let posicao = Object.keys(row).find(k => k.toLowerCase().includes('posição') || k.toLowerCase().includes('posicao'));
        posicao = posicao ? String(row[posicao]).toLowerCase() : '';
        
        let targetBox = 'meias';
        if (posicao.includes('goleiro')) targetBox = 'goleiros'; else if (posicao.includes('zagueiro')) targetBox = 'zagueiros'; else if (posicao.includes('lateral')) targetBox = 'laterais'; else if (posicao.includes('volante')) targetBox = 'volantes'; else if (posicao.includes('atacante')) targetBox = 'atacantes'; else if (posicao.includes('extremo') || posicao.includes('ponta')) targetBox = 'extremos';

        // Indicadores visuais apenas para identificação na convocação: lesão e cartão vermelho.
        const chaveLesaoConv = Object.keys(row).find(k => k.toLowerCase() === 'lesao');
        const estaLesionadoConv = chaveLesaoConv ? String(row[chaveLesaoConv]).toLowerCase().trim() === 'sim' : false;
        const iconeLesaoConv = estaLesionadoConv ? `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#d63031" style="display:inline-block; vertical-align:-2px; margin-right:4px; flex:0 0 auto;" title="Atleta lesionado">
                <rect x="9" y="2" width="6" height="20" rx="1" fill="#d63031"></rect>
                <rect x="2" y="9" width="20" height="6" rx="1" fill="#d63031"></rect>
            </svg>` : '';

        const chaveCartaoConv = Object.keys(row).find(k => ['cartaovermelho','cartao vermelho','cartão vermelho'].includes(k.toLowerCase().replace(/_/g, ' ').trim()) || k.toLowerCase().replace(/\s+/g,'') === 'cartaovermelho');
        const temCartaoConv = chaveCartaoConv ? String(row[chaveCartaoConv]).toLowerCase().trim() === 'sim' : false;
        const iconeCartaoConv = temCartaoConv ? `
            <svg width="11" height="14" viewBox="0 0 18 24" style="display:inline-block; vertical-align:-3px; margin-right:4px; flex:0 0 auto;" title="Cartão vermelho / suspenso">
                <rect x="3" y="2" width="12" height="20" rx="2" fill="#d63031" stroke="#7a0000" stroke-width="1.5"></rect>
            </svg>` : '';

        const itemDiv = document.createElement('div');
        itemDiv.draggable = true; itemDiv.style.cssText = 'padding: 6px 8px; cursor: grab; display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px solid #f1f1f1; user-select: none;';
        itemDiv.ondragstart = (e) => { e.dataTransfer.setData('text/plain', globalIndex); };
        if (selectedConvocados.has(globalIndex)) { itemDiv.style.backgroundColor = '#0984e3'; itemDiv.style.color = '#fff'; }
        itemDiv.innerHTML = `<span style="display:flex; align-items:center; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${iconeLesaoConv}${iconeCartaoConv}<span style="overflow:hidden; text-overflow:ellipsis;">${nomeExibicao}</span></span> <span style="font-size: 11px; opacity: 0.8; flex:0 0 auto; margin-left:8px;">${anoAtleta}</span>`;
        itemDiv.onclick = (e) => {
            e.stopPropagation();
            if (selectedConvocados.has(globalIndex)) { selectedConvocados.delete(globalIndex); itemDiv.style.backgroundColor = 'transparent'; itemDiv.style.color = '#000'; }
            else { selectedConvocados.add(globalIndex); itemDiv.style.backgroundColor = '#0984e3'; itemDiv.style.color = '#fff'; }
            atualizarContadorConvocados();
        };
        if (posLists[targetBox]) posLists[targetBox].appendChild(itemDiv);
    });
    atualizarContadorConvocados();
}
function handleAthleteDrop(globalIndex, targetCategory) {
    if (targetCategory === 'goleiros') updateAthletePositionInDatabase(globalIndex, 'Goleiro'); else if (targetCategory === 'zagueiros') updateAthletePositionInDatabase(globalIndex, 'Zagueiro'); else if (targetCategory === 'meias') updateAthletePositionInDatabase(globalIndex, 'Meia'); else if (targetCategory === 'atacantes') updateAthletePositionInDatabase(globalIndex, 'Atacante');
    else if (targetCategory === 'laterais') showPositionChoiceModal(['Lateral Direito', 'Lateral Esquerdo'], (chosen) => updateAthletePositionInDatabase(globalIndex, chosen));
    else if (targetCategory === 'volantes') showPositionChoiceModal(['1º Volante', '2º Volante'], (chosen) => updateAthletePositionInDatabase(globalIndex, chosen));
    else if (targetCategory === 'extremos') showPositionChoiceModal(['Ponta Dir.', 'Ponta Esq.'], (chosen) => updateAthletePositionInDatabase(globalIndex, chosen));
}
function showPositionChoiceModal(options, onSelect) {
    let choiceModal = document.getElementById('position-choice-modal');
    if (!choiceModal) {
        choiceModal = document.createElement('div'); choiceModal.id = 'position-choice-modal';
        choiceModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 10500; display: flex; align-items: center; justify-content: center;';
        document.body.appendChild(choiceModal);
    }
    choiceModal.style.display = 'flex';
    choiceModal.innerHTML = `<div style="background: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); width: 320px; text-align: center;"><h3 style="margin-bottom: 20px; font-size: 16px; color: #333;">Escolha a Posição Específica</h3><div id="position-choice-buttons" style="display: flex; flex-direction: column; gap: 12px;"></div><button onclick="document.getElementById('position-choice-modal').style.display='none'" style="margin-top: 15px; background: #e0e0e0; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;">Cancelar</button></div>`;
    options.forEach(opt => {
        const btn = document.createElement('button'); btn.textContent = opt; btn.style.cssText = 'padding: 10px; background: #58111a; color: #d4af37; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;';
        btn.onclick = () => { choiceModal.style.display = 'none'; onSelect(opt); };
        document.getElementById('position-choice-buttons').appendChild(btn);
    });
}
function updateAthletePositionInDatabase(globalIndex, newPosition) {
    let posCol = excelColumns.find(c => c.toLowerCase() === 'posição 1' || c.toLowerCase() === 'posicao 1');
    if (!posCol) { posCol = 'Posição 1'; excelColumns.push(posCol); }
    if (excelData[globalIndex]) { excelData[globalIndex][posCol] = newPosition; saveToStorage(); renderConvocacaoLists(); }
}
function limparConvocacao() { selectedConvocados.clear(); renderConvocacaoLists(); }
function confirmarConvocacao() {
    if (selectedConvocados.size === 0) { alert('Nenhum atleta selecionado.'); return; }
    localStorage.setItem(STORAGE_CONVOCACAO_KEY, JSON.stringify(Array.from(selectedConvocados)));
    if(!convocacaoCarregadaNaSessao) localStorage.removeItem('prosol_cfa_escalacao_v1');
    abrirEscalacaoConvocacao();
}

function abrirEscalacaoConvocacao() {
    let modal = document.getElementById('escalacao-convocacao-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'escalacao-convocacao-modal';
        modal.className = 'escalacao-overlay';
        document.body.appendChild(modal);
    }
    const salvo = JSON.parse(localStorage.getItem('prosol_cfa_escalacao_v1') || '{}');
    const ordemPosicoes = ['goleiro','zagueiro','lateral','volante','meia','atacante','extremo','ponta'];
    let atletas = Array.from(selectedConvocados).map(index => {
        const row = excelData[index] || {};
        const nomeKey = Object.keys(row).find(k => k.toLowerCase().includes('apelido')) || Object.keys(row).find(k => k.toLowerCase().includes('nome'));
        const posKey = Object.keys(row).find(k => k.toLowerCase().includes('posição') || k.toLowerCase().includes('posicao'));
        const posicao = posKey && row[posKey] ? String(row[posKey]).toLowerCase() : '';
        const ordem = ordemPosicoes.findIndex(p => posicao.includes(p));
        return { index, nome: nomeKey && row[nomeKey] ? row[nomeKey] : 'Sem Nome', ordem: ordem < 0 ? 99 : ordem };
    }).sort((a,b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'));
    modal.innerHTML = `<div class="escalacao-card"><div class="escalacao-header"><span>ESCALAÇÃO DA CONVOCAÇÃO</span><button onclick="fecharEscalacaoConvocacao()">×</button></div><p class="escalacao-help">Defina o número e indique se cada atleta é titular ou reserva.</p><div class="escalacao-list">${atletas.map((a,i) => { const v=salvo[a.index]||{}; return `<div class="escalacao-row posicao-${a.ordem}"><span class="escalacao-name">${a.nome}</span><input class="escalacao-numero" data-index="${a.index}" value="${v.numero||''}" placeholder="#" type="number" min="1" max="99"><label><input type="radio" name="status-${a.index}" value="titular" ${v.status==='titular'?'checked':''}> Titular</label><label><input type="radio" name="status-${a.index}" value="reserva" ${v.status==='reserva'||!v.status?'checked':''}> Reserva</label></div>`; }).join('')}</div><div class="escalacao-footer"><span id="escalacao-status"></span><button class="escalacao-field" onclick="salvarEscalacaoConvocacao(); abrirCampoConvocacao()">Confirmar e abrir campo</button></div></div>`;
    modal.style.display = 'flex';
    modal.querySelectorAll('input[type="radio"]').forEach(r=>r.addEventListener('change', atualizarStatusEscalacao));
    atualizarStatusEscalacao();
}
function atualizarStatusEscalacao(){const el=document.getElementById('escalacao-status');if(!el)return;let titulares=0,reservas=0;document.querySelectorAll('#escalacao-convocacao-modal .escalacao-row').forEach(row=>{const r=row.querySelector('input[type="radio"]:checked');if(r?.value==='reserva')reservas++;else if(r?.value==='titular')titulares++;});el.textContent=`Titulares: ${titulares} | Reservas: ${reservas}`;}
function salvarEscalacaoConvocacao() {
    const dados={};
    document.querySelectorAll('#escalacao-convocacao-modal .escalacao-row').forEach(row=>{const input=row.querySelector('.escalacao-numero');const idx=input.dataset.index;const radio=row.querySelector('input[type="radio"]:checked');dados[idx]={numero:input.value,status:radio?radio.value:'titular'};});
    localStorage.setItem('prosol_cfa_escalacao_v1',JSON.stringify(dados));
    atualizarStatusEscalacao();
    alert('Escalação salva com sucesso!');
}
function voltarParaSelecaoConvocacao(){
    salvarEscalacaoConvocacao();
    fecharEscalacaoConvocacao();
    openConvocacaoModal();
    renderConvocacaoScreen();
}
function fecharEscalacaoConvocacao(){const m=document.getElementById('escalacao-convocacao-modal');if(m)m.style.display='none';}
async function carregarConvocacaoSalva(){
 const {data,error}=await _supabase.from('convocacoes').select('nome,dados').order('nome');
 if(error){alert('Erro ao carregar convocações.');return;} if(!data||!data.length){alert('Nenhuma convocação salva.');return;}
 let m=document.getElementById('carregar-convocacao-modal');if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='carregar-convocacao-modal';document.body.appendChild(m);}
 m.innerHTML=`<div class="excluir-card"><h3>Carregar convocação</h3><p>Selecione uma convocação salva:</p><select id="convocacao-para-carregar" size="9">${data.map(x=>`<option value="${x.nome.replace(/"/g,'&quot;')}">${x.nome}</option>`).join('')}</select><div><button class="carregar-btn" onclick="confirmarCarregamentoConvocacao()">Carregar</button><button onclick="document.getElementById('carregar-convocacao-modal').style.display='none'">Cancelar</button></div></div>`;
 m.style.display='flex';
}
function excluirAtletasSelecionadosConvocacao() {
    if (selectedConvocados.size === 0) { alert('Nenhum atleta selecionado.'); return; }
    if (confirm('Deseja remover os atletas selecionados da convocação?')) { selectedConvocados.clear(); localStorage.removeItem(STORAGE_CONVOCACAO_KEY); renderConvocacaoLists(); }
}

// Ativa a rolagem automática (auto-scroll) da tela de grupos ao arrastar um atleta para a beirada
document.addEventListener('DOMContentLoaded', () => {
    const screenScroll = document.getElementById('grupos-screen');
    if (screenScroll) {
        screenScroll.addEventListener('dragover', (e) => {
            const scrollSpeed = 15;
            const edgeSize = 80; // Zona de ativação do scroll nas bordas (pixels)
            const rect = screenScroll.getBoundingClientRect();
            
            // Se o mouse estiver perto da borda inferior durante o arrasto, desce a tela
            if (e.clientY > rect.bottom - edgeSize) {
                screenScroll.scrollTop += scrollSpeed;
            } 
            // Se o mouse estiver perto da borda superior, sobe a tela
            else if (e.clientY < rect.top + edgeSize) {
                screenScroll.scrollTop -= scrollSpeed;
            }
        });
    }
});
/* === FUNÇÃO PARA IMPRIMIR OS GRUPOS EM A4 PAISAGEM (MÉTODO IFRAME ISOLADO) === */
function imprimirGrupos() {
    // 1. Captura os painéis de grupos montados na tela
    const paineisGrupos = document.querySelectorAll('#grupos-screen .grupos-split-view');

    if (paineisGrupos.length === 0) {
        alert("Não há grupos visíveis para imprimir. Certifique-se de formar os grupos primeiro.");
        return;
    }

    // 2. Cria uma janela invisível (iframe) para isolar a impressão do resto do site
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write('<html><head><title>Impressão de Grupos</title>');

    // 3. Copia o seu CSS original para o iframe (para manter as cores, fontes e formatos)
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach(style => {
        doc.write(style.outerHTML);
    });

    // 4. Injeta as regras EXCLUSIVAS de impressão (A4, Paisagem, 1 por página)
    doc.write(`
        <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { 
                background: #fff !important; 
                margin: 0; 
                padding: 0; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
            }
            .print-grupo-page { 
                page-break-after: always; 
                width: 100%; 
                margin-bottom: 20px;
            }
            .print-grupo-page:last-child { page-break-after: auto; }
            
            /* Limpa sobras visuais indesejadas para o papel */
            .grupos-split-view, .grupos-ficha-panel, .grupos-list-panel { 
                box-shadow: none !important; 
            }
            .grupos-panel-title { 
                background-color: #e50000 !important; 
                color: #fff !important; 
                border-bottom: 2px solid #000 !important; 
            }
            .grupos-data-table th { background-color: #f2f2f2 !important; color: #000 !important; }
            .grupos-data-table th, .grupos-data-table td { border: 1px solid #000 !important; color: #000 !important; }
        </style>
    `);
    doc.write('</head><body>');
    doc.write('<div class="grupos-container">'); // Mantém o container para garantir o alinhamento

    // 5. Clona cada grupo e transforma os inputs em texto puro
    paineisGrupos.forEach(painel => {
        let wrapper = document.createElement('div');
        wrapper.className = 'print-grupo-page';
        
        let clone = painel.cloneNode(true);
        
        let origInputs = painel.querySelectorAll('input');
        let cloneInputs = clone.querySelectorAll('input');
        
        origInputs.forEach((inp, i) => {
            let span = document.createElement('span');
            span.textContent = inp.value;
            span.style.fontWeight = 'bold';
            span.style.color = '#b30000';
            span.style.textAlign = 'center';
            span.style.display = 'block';
            
            if (cloneInputs[i] && cloneInputs[i].parentNode) {
                cloneInputs[i].parentNode.replaceChild(span, cloneInputs[i]);
            }
        });

        wrapper.appendChild(clone);
        doc.write(wrapper.outerHTML);
    });

    doc.write('</div></body></html>');
    doc.close();

    // 6. Aguarda 1 segundo para o navegador carregar o CSS no iframe invisível e aciona a impressão
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        // Remove o iframe da memória após a impressão
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
    }, 1000); 
}
/* Impressão exclusiva das fichas de grupos - independente da ficha do atleta */
function imprimirFichasTreino() {
    const cards = Array.from(document.querySelectorAll('#fichas-render-container .ficha-grupo-card'));
    if (!cards.length) { alert('Nenhuma ficha de grupo foi gerada.'); return; }

    const janela = window.open('', '_blank', 'width=1200,height=800');
    if (!janela) { alert('Permita pop-ups para imprimir as fichas.'); return; }

    const paginas = cards.map(card => {
        const clone = card.cloneNode(true);
        clone.querySelectorAll('input').forEach(input => {
            const span = document.createElement('span');
            span.textContent = input.value;
            span.style.fontWeight = 'bold';
            input.replaceWith(span);
        });
        return clone.outerHTML;
    }).join('');

    janela.document.write(`<!doctype html><html><head><meta charset="UTF-8">
    <title>Fichas de Grupos</title><style>
    @page { size: A4 landscape; margin: 6mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html,body { margin:0; padding:0; background:#fff; font-family:Arial,sans-serif; color:#000; }
    .ficha-grupo-card { width:100%; max-width:none; margin:0 0 12px 0; padding:15px; background:#fff; border:2px solid #000; page-break-after:always; break-after:page; box-shadow:none; }
    .ficha-grupo-card:last-child { page-break-after:auto; break-after:auto; }
    .ficha-header-title { background:#d9d9d9; font-size:26px; font-weight:bold; text-align:center; padding:10px; border:2px solid #000; margin-bottom:-1px; }
    .ficha-table { width:100%; border-collapse:collapse; font-size:12px; color:#000; text-align:center; }
    .ficha-table th,.ficha-table td { border:1.5px solid #000; padding:4px; vertical-align:middle; }
    .ficha-table input { width:100%; border:0; background:transparent; text-align:center; font-size:12px; font-weight:bold; color:inherit; }
    .row-media { background:#000 !important; color:#fff !important; font-weight:bold; font-style:italic; }
    .side-label { writing-mode:vertical-rl; transform:rotate(180deg); font-weight:bold; font-size:14px; text-align:center; background:#e0e0e0; width:32px; }
    .mmi-header { background:#c5d9f1; font-weight:bold; } .mmi-reps { background:#000; color:#fff; font-weight:bold; } .mmi-weight { background:#b8cce4; font-weight:bold; }
    .proto-header { background:#d9d9d9; font-weight:bold; } .proto-banner { background:#000; color:#fff; font-weight:bold; font-size:11px; } .proto-weight { background:#f2f2f2; font-weight:bold; }
    .hiit-header { background:#fde9d9; font-weight:bold; } .hiit-footer { background:#fcd5b4; font-weight:bold; font-size:13px; }
    </style></head><body>${paginas}</body></html>`);
    janela.document.close();
    janela.onload = () => setTimeout(() => { janela.focus(); janela.print(); }, 400);
}

/* Prancheta virtual: implementação final mini-campo localizada ao final do arquivo. */

function posicaoInicialCampo(numero, indice) {
 const n=Number(numero);
 const mapa={1:[50,90],2:[80,70],3:[60,70],4:[40,70],6:[20,70],5:[70,48],10:[50,48],8:[30,48],7:[75,25],9:[50,25],11:[25,25]};
 return mapa[n] || [50,50];
}
function abrirCampoConvocacao(){
 const salvo=JSON.parse(localStorage.getItem('prosol_cfa_escalacao_v1')||'{}');
 let modal=document.getElementById('campo-convocacao-modal'); if(!modal){modal=document.createElement('div');modal.id='campo-convocacao-modal';modal.className='campo-overlay';document.body.appendChild(modal);}
 const titulares=Object.keys(salvo).filter(i=>salvo[i].status!=='reserva').map(i=>{const r=excelData[i]||{};const nk=Object.keys(r).find(k=>k.toLowerCase().includes('apelido'))||Object.keys(r).find(k=>k.toLowerCase().includes('nome'));const pk=Object.keys(r).find(k=>k.toLowerCase().includes('posição')||k.toLowerCase().includes('posicao'));const pos=String(pk?r[pk]:'').toLowerCase();const dataKey=Object.keys(r).find(k=>k.toLowerCase().includes('nascimento')); const nascimento=dataKey?convertExcelDate(r[dataKey]):''; return {nome:nk&&r[nk]||'Sem Nome',num:salvo[i].numero||'',pos,nascimento};});
 const ordem=['goleiro','zagueiro','lateral','volante','meia','atacante','extremo'];titulares.sort((a,b)=>ordem.findIndex(x=>a.pos.includes(x))-ordem.findIndex(x=>b.pos.includes(x)));
 const reservas=Object.keys(salvo).filter(i=>salvo[i].status==='reserva').sort((a,b)=>(Number(salvo[a].numero)||999)-(Number(salvo[b].numero)||999));
 modal.innerHTML=`<div class="campo-card"><div class="campo-top"><b>CONVOCAÇÃO — ESCALAÇÃO</b><div class="campo-acoes"><button onclick="salvarConvocacaoNuvem()">💾 Salvar Convocação</button><button onclick="imprimirConvocacaoCampo()">🖨 Imprimir</button><button onclick="abrirMinutagemConvocacao()">⏱ Minutagem</button><button onclick="abrirArbitragemConvocacao()">⚖ Arbitragem</button><button class="campo-fechar" onclick="fecharCampoConvocacao()">×</button></div></div><div class="campo-layout"><aside><h3>SUPLENTES</h3><div class="campo-reservas">${reservas.map(i=>{const r=excelData[i]||{};const nk=Object.keys(r).find(k=>k.toLowerCase().includes('apelido'))||Object.keys(r).find(k=>k.toLowerCase().includes('nome'));const dataKey=Object.keys(r).find(k=>k.toLowerCase().includes('nascimento')); const nascimento=dataKey?convertExcelDate(r[dataKey]):''; return `<div class="reserva-item"><span>${salvo[i].numero||''} - ${nk&&r[nk]||'Sem Nome'}</span><span class="reserva-data">${nascimento}</span></div>`}).join('')}</div><h3>COMISSÃO TÉCNICA</h3><label class="comissao-label">Técnico:<input class="campo-edit" placeholder=""></label><label class="comissao-label">Aux. Técnico:<input class="campo-edit" placeholder=""></label><label class="comissao-label">Prep. Físico:<input class="campo-edit" placeholder=""></label><label class="comissao-label">Trein. Goleiros:<input class="campo-edit" placeholder=""></label></aside><main><div class="campo-futebol"><div class="linha-meio"></div><div class="circulo-meio"></div>${titulares.map((a,i)=>`<div class="jogador-campo" style="left:${posicaoInicialCampo(a.num,i)[0]}%;top:${posicaoInicialCampo(a.num,i)[1]}%" data-x=""><img src="${a.pos.includes('goleiro')?'camiseta_goleiro.png':'camiseta_linha.png'}"><span>${a.num} ${a.nome}<small>${a.nascimento}</small></span></div>`).join('')}</div><div class="campo-detalhes"><div class="campo-faixa"><input placeholder="Horário"><span> - </span><input placeholder="Local"><span> - </span><input placeholder="Data"></div><div class="campo-info-jogo"><div class="campo-adversario"><img src="logo.png"><b>×</b><input placeholder="Nome do adversário"></div><div class="campo-horarios"><label>Apresentação: <input placeholder=""></label><label>Preleção: <input placeholder=""></label><label>Aquecimento: <input placeholder=""></label></div></div></div></main></div></div>`;
 modal.style.display='flex';
 const carregada=window.__convocacaoCarregada;if(carregada){const faixa=[...modal.querySelectorAll('.campo-faixa input')];[carregada.horario,carregada.local,carregada.data].forEach((v,i)=>{if(faixa[i])faixa[i].value=v||''});const adv=modal.querySelector('.campo-adversario input');if(adv)adv.value=carregada.adversario||'';const hs=[...modal.querySelectorAll('.campo-horarios input')];[carregada.apresentacao,carregada.prelecao,carregada.aquecimento].forEach((v,i)=>{if(hs[i])hs[i].value=v||''});const cs=[...modal.querySelectorAll('.comissao-label input')];(carregada.comissao||[]).forEach((v,i)=>{if(cs[i])cs[i].value=v});
  const ps=carregada.jogadores||[];modal.querySelectorAll('.jogador-campo').forEach(el=>{const t=el.querySelector('span')?.innerText||'';const p=ps.find(x=>x.texto===t);if(p){el.style.left=p.left;el.style.top=p.top}});
 }
 modal.querySelectorAll('.jogador-campo').forEach(makeCampoDraggable);
}
function makeCampoDraggable(el){
 let dragging=false,dx=0,dy=0;
 el.addEventListener('pointerdown',e=>{e.preventDefault();dragging=true;const r=el.getBoundingClientRect();dx=e.clientX-(r.left+r.width/2);dy=e.clientY-(r.top+r.height/2);el.setPointerCapture(e.pointerId);el.classList.add('arrastando');});
 el.addEventListener('pointermove',e=>{if(!dragging)return;const area=el.parentElement.getBoundingClientRect();let x=((e.clientX-dx-area.left)/area.width)*100;let y=((e.clientY-dy-area.top)/area.height)*100;el.style.left=Math.max(2,Math.min(98,x))+'%';el.style.top=Math.max(4,Math.min(96,y))+'%';});
 el.addEventListener('pointerup',e=>{dragging=false;el.releasePointerCapture?.(e.pointerId);el.classList.remove('arrastando');});
 el.addEventListener('pointercancel',()=>{dragging=false;el.classList.remove('arrastando');});
}
function fecharCampoConvocacao(){const m=document.getElementById('campo-convocacao-modal');if(m)m.style.display='none';}

/* Impressão e PDF exclusivos da convocação */
function imprimirConvocacaoCampo(){
 const modal=document.getElementById('campo-convocacao-modal');if(!modal)return;
 const card=modal.querySelector('.campo-card');const layout=document.createElement('div');layout.id='print-convocacao-layout';
 layout.innerHTML='<img class="print-base" src="BASE limpa .png"><div class="print-title">CONVOCAÇÃO — ESCALAÇÃO</div><div class="print-side"></div><div class="print-bottom"></div><div class="print-players"></div>';
 const side=layout.querySelector('.print-side');const aside=card.querySelector('aside');if(aside){side.innerHTML=aside.innerHTML;aside.querySelectorAll('input').forEach((x,i)=>{const y=side.querySelectorAll('input')[i];if(y)y.value=x.value;});}
 const bottom=layout.querySelector('.print-bottom');const details=card.querySelector('.campo-detalhes');if(details){bottom.innerHTML=details.innerHTML;details.querySelectorAll('input').forEach((x,i)=>{const y=bottom.querySelectorAll('input')[i];if(y)y.value=x.value;});}
 const origemCampo=card.querySelector('.campo-futebol'), rCampo=origemCampo.getBoundingClientRect(), rCard=card.getBoundingClientRect();
 card.querySelectorAll('.jogador-campo').forEach(p=>{const q=p.cloneNode(true),r=p.getBoundingClientRect();q.style.left=(((r.left+r.width/2-rCard.left)/rCard.width)*100)+'%';q.style.top=(((r.top+r.height/2-rCard.top)/rCard.height)*100)+'%';layout.querySelector('.print-players').appendChild(q)});
 document.body.appendChild(layout);document.body.classList.add('printing-dedicated-convocacao');
 const clean=()=>{document.body.classList.remove('printing-dedicated-convocacao');layout.remove();window.removeEventListener('afterprint',clean)};window.addEventListener('afterprint',clean);window.print();setTimeout(clean,1500);
}

function identidadeAtleta(index){const r=excelData[index]||{};const nk=Object.keys(r).find(k=>k.toLowerCase().includes('nome completo'))||Object.keys(r).find(k=>k.toLowerCase().includes('nome'));const dk=Object.keys(r).find(k=>k.toLowerCase().includes('data de nascimento')||k.toLowerCase().includes('nascimento'));const ak=Object.keys(r).find(k=>k.toLowerCase()==='ano');return {nome:nk?String(r[nk]||'').trim():'',nascimento:dk?String(r[dk]||'').trim():'',ano:ak?String(r[ak]||'').trim():''};}
function localizarAtletaPorIdentidade(id){return excelData.findIndex(r=>{const x=identidadeAtleta(excelData.indexOf(r));return x.nome===id.nome&&x.nascimento===id.nascimento});}

function normalizarTextoIdentidadeConvocacao(valor){
 return String(valor||'').trim().replace(/\s+/g,' ');
}
function normalizarNascimentoIdentidadeConvocacao(valor){
 return normalizarTextoIdentidadeConvocacao(convertExcelDate(valor)||valor);
}
function nomeCompletoAtletaConvocacao(index){
 const r=excelData[index]||{};
 const nk=Object.keys(r).find(k=>k.toLowerCase().includes('nome completo'))||Object.keys(r).find(k=>k.toLowerCase()==='nome')||Object.keys(r).find(k=>k.toLowerCase().includes('nome'));
 return normalizarTextoIdentidadeConvocacao(nk?r[nk]:'');
}
function nascimentoAtletaConvocacao(index){
 const r=excelData[index]||{};
 const dk=Object.keys(r).find(k=>k.toLowerCase().includes('data de nascimento')||k.toLowerCase().includes('nascimento'));
 return normalizarNascimentoIdentidadeConvocacao(dk?r[dk]:'');
}
function identidadeAtletaConvocacao(index){
 return { nomeCompleto: nomeCompletoAtletaConvocacao(index), nascimento: nascimentoAtletaConvocacao(index) };
}
function chaveIdentidadeConvocacao(id){
 return normalizarTextoIdentidadeConvocacao(id?.nomeCompleto||id?.nome||'')+'||'+normalizarNascimentoIdentidadeConvocacao(id?.nascimento||'');
}
function localizarAtletaPorIdentidadeConvocacao(id){
 const chave=chaveIdentidadeConvocacao(id);
 if(!chave || chave==='||') return -1;
 return excelData.findIndex((row,index)=>chaveIdentidadeConvocacao(identidadeAtletaConvocacao(index))===chave);
}
function escalacaoPorIdentidadeConvocacao(escalacaoPorIndice){
 const out={};
 Array.from(selectedConvocados).forEach(index=>{
  const id=identidadeAtletaConvocacao(index);
  const chave=chaveIdentidadeConvocacao(id);
  if(chave && chave!=='||') out[chave]=escalacaoPorIndice?.[index]||{};
 });
 return out;
}
function restaurarEscalacaoPorIndiceConvocacao(escalacaoPorIdentidade, indices){
 const out={};
 (indices||[]).forEach(index=>{
  const chave=chaveIdentidadeConvocacao(identidadeAtletaConvocacao(index));
  if(escalacaoPorIdentidade && escalacaoPorIdentidade[chave]) out[index]=escalacaoPorIdentidade[chave];
 });
 return out;
}

async function salvarConvocacaoNuvem(){
 const {data,error}=await _supabase.from('convocacoes').select('nome').order('nome');
 if(error){alert('Erro ao consultar convocações.');return;}
 let m=document.getElementById('salvar-convocacao-modal');if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='salvar-convocacao-modal';document.body.appendChild(m);}
 m.innerHTML=`<div class="excluir-card salvar-card"><h3>Salvar convocação</h3><p>Digite um nome novo ou selecione uma convocação para substituir.</p><input id="nome-nova-convocacao" class="nome-convocacao-input" placeholder="Nome da convocação"><select id="convocacao-para-substituir" size="7"><option value="">— Nova convocação —</option>${(data||[]).map(x=>`<option value="${x.nome.replace(/"/g,'&quot;')}">${x.nome}</option>`).join('')}</select><div><button class="carregar-btn" onclick="confirmarSalvarConvocacao()">Salvar</button><button onclick="document.getElementById('salvar-convocacao-modal').style.display='none'">Cancelar</button></div></div>`;
 m.querySelector('#convocacao-para-substituir').onchange=e=>{if(e.target.value)m.querySelector('#nome-nova-convocacao').value=e.target.value;};m.style.display='flex';
}
async function confirmarSalvarConvocacao(){
 const nome=document.getElementById('nome-nova-convocacao')?.value.trim();if(!nome)return alert('Digite ou selecione um nome.');
 const salvo=JSON.parse(localStorage.getItem('prosol_cfa_escalacao_v1')||'{}');const faixa=[...document.querySelectorAll('#campo-convocacao-modal .campo-faixa input')].map(x=>x.value);const horarios=[...document.querySelectorAll('#campo-convocacao-modal .campo-horarios input')].map(x=>x.value);const comissao=[...document.querySelectorAll('#campo-convocacao-modal .comissao-label input')].map(x=>x.value);const jogadores=[...document.querySelectorAll('#campo-convocacao-modal .jogador-campo')].map(el=>({texto:el.querySelector('span')?.innerText||'',left:el.style.left,top:el.style.top}));const anos=[...document.querySelectorAll('.conv-year-chk:checked')].map(x=>x.value);
 const selecionadosDetalhes=[...selectedConvocados].map(identidadeAtletaConvocacao).filter(id=>id.nomeCompleto&&id.nascimento);
 const dados={nome,anos,selecionadosDetalhes,escalacao:escalacaoPorIdentidadeConvocacao(salvo),jogadores,comissao,horario:faixa[0]||'',local:faixa[1]||'',data:faixa[2]||'',adversario:document.querySelector('#campo-convocacao-modal .campo-adversario input')?.value||'',apresentacao:horarios[0]||'',prelecao:horarios[1]||'',aquecimento:horarios[2]||''};
 const {error}=await _supabase.from('convocacoes').upsert({nome,dados,atualizado_em:new Date().toISOString()},{onConflict:'nome'});if(error){alert('Erro ao salvar convocação.');console.error(error);return;}document.getElementById('salvar-convocacao-modal').style.display='none';alert('Convocação salva com sucesso!');
}


async function confirmarCarregamentoConvocacao(){
 const select=document.getElementById('convocacao-para-carregar');if(!select||!select.value)return alert('Selecione uma convocação.');
 const {data,error}=await _supabase.from('convocacoes').select('nome,dados').eq('nome',select.value).single();
 if(error||!data){alert('Não foi possível carregar a convocação.');return;}
 const d=data.dados||{};window.__convocacaoCarregada=d;convocacaoCarregadaNaSessao=true;const indices=(d.selecionadosDetalhes||[]).map(localizarAtletaPorIdentidadeConvocacao).filter(i=>i>=0);if(!indices.length){alert('Nenhum atleta desta convocação foi localizado pelo Nome Completo + Data de Nascimento.');return;}selectedConvocados=new Set(indices);localStorage.setItem(STORAGE_CONVOCACAO_KEY,JSON.stringify([...selectedConvocados]));localStorage.setItem('prosol_cfa_escalacao_v1',JSON.stringify(restaurarEscalacaoPorIndiceConvocacao(d.escalacao||{},indices)));
 document.querySelectorAll('.conv-year-chk').forEach(c=>c.checked=(d.anos||[]).includes(c.value));renderConvocacaoLists();document.getElementById('carregar-convocacao-modal').style.display='none';abrirEscalacaoConvocacao();
}

async function abrirExcluirConvocacaoModal(){
 const {data,error}=await _supabase.from('convocacoes').select('nome').order('nome');
 if(error){alert('Erro ao consultar convocações.');return;} if(!data||!data.length){alert('Nenhuma convocação salva.');return;}
 let m=document.getElementById('excluir-convocacao-modal');if(!m){m=document.createElement('div');m.id='excluir-convocacao-modal';m.className='escalacao-overlay';document.body.appendChild(m);}
 m.innerHTML=`<div class="excluir-card"><h3>Excluir convocação</h3><select id="convocacao-para-excluir" size="8">${data.map(x=>`<option value="${x.nome.replace(/"/g,'&quot;')}">${x.nome}</option>`).join('')}</select><div><button onclick="excluirConvocacaoSelecionada()">Excluir</button><button onclick="document.getElementById('excluir-convocacao-modal').style.display='none'">Cancelar</button></div></div>`;m.style.display='flex';
}
async function excluirConvocacaoSelecionada(){const s=document.getElementById('convocacao-para-excluir');if(!s||!s.value)return alert('Selecione uma convocação.');if(!confirm('Excluir '+s.value+' permanentemente?'))return;const {error}=await _supabase.from('convocacoes').delete().eq('nome',s.value);if(error){alert('Erro ao excluir.');return;}document.getElementById('excluir-convocacao-modal').style.display='none';alert('Convocação excluída.');}

function exportarConvocacaoPDF(){
 // Exportação robusta: usa a impressão da própria convocação.
 // No diálogo do navegador, escolha "Microsoft Print to PDF" ou "Salvar como PDF".
 imprimirConvocacaoCampo();
}

function abrirArbitragemConvocacao(){
 const salvo=JSON.parse(localStorage.getItem('prosol_cfa_escalacao_v1')||'{}');
 const lista=Object.keys(salvo).map(i=>{const r=excelData[i]||{};const nomeKey=Object.keys(r).find(k=>k.toLowerCase().includes('nome completo'))||Object.keys(r).find(k=>k.toLowerCase()==='nome');const apelidoKey=Object.keys(r).find(k=>k.toLowerCase().includes('apelido'));const dataKey=Object.keys(r).find(k=>k.toLowerCase().includes('nascimento'));return{numero:salvo[i].numero||'',nome:nomeKey?r[nomeKey]||'':'',apelido:apelidoKey?r[apelidoKey]||'':'',nascimento:dataKey?convertExcelDate(r[dataKey]):''}}).sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR'));
 const w=window.open('','_blank','width=800,height=800');if(!w)return;
 const linhas=lista.map(a=>`<tr><td>${a.numero}</td><td>${a.nome}</td><td>${a.apelido}</td><td>${a.nascimento}</td></tr>`).join('');
 w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Arbitragem</title><style>@page{size:A4 portrait;margin:8mm}*{box-sizing:border-box}body{font-family:Arial;margin:0}.ficha{border:1px solid #111;min-height:0;height:auto}.cab{height:38mm;border-bottom:1px solid #111;display:flex;align-items:center;padding:8px 20px;gap:100px}.cab img{width:32mm;height:32mm;object-fit:contain}.cab h1{font-size:28px;margin:0}.tab{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px}.tab th{text-align:left;border-bottom:1px solid #111;padding:4px}.tab td{height:15px;border-bottom:1px dotted #111;border-right:1px dotted #111;padding:2px 4px}.tab th:nth-child(1),.tab td:nth-child(1){width:11%;font-weight:bold}.tab th:nth-child(2),.tab td:nth-child(2){width:46%;font-weight:bold}.tab th:nth-child(2),.tab td:nth-child(2){width:46%}.tab th:nth-child(3),.tab td:nth-child(3){width:23%}.tab th:nth-child(4),.tab td:nth-child(4){width:20%}</style></head><body><div class="ficha"><div class="cab"><img src="logo.png"><h1>CFA Prosol</h1></div><table class="tab"><thead><tr><th>Número</th><th>Nome Completo</th><th>Apelido</th><th>Data Nasc.</th></tr></thead><tbody>${linhas}</tbody></table></div><script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);w.document.close();
}

function abrirMinutagemConvocacao(){
 const salvo=JSON.parse(localStorage.getItem('prosol_cfa_escalacao_v1')||'{}');const adv=document.querySelector('#campo-convocacao-modal .campo-adversario input')?.value||'';const data=document.querySelector('#campo-convocacao-modal .campo-faixa input:nth-of-type(3)')?.value||'';
 const arr=Object.keys(salvo).map(i=>{const r=excelData[i]||{};const nk=Object.keys(r).find(k=>k.toLowerCase().includes('apelido'))||Object.keys(r).find(k=>k.toLowerCase().includes('nome'));return{n:salvo[i].numero||'',nome:nk&&r[nk]||'' ,res:salvo[i].status==='reserva'}});const tit=arr.filter(x=>!x.res).sort((a,b)=>(Number(a.n)||999)-(Number(b.n)||999)),sup=arr.filter(x=>x.res).sort((a,b)=>(Number(a.n)||999)-(Number(b.n)||999));
 const linha=(x,i)=>`<tr><td>${x.n}</td><td>${x.nome}</td><td></td><td class="box"></td><td class="box"></td><td class="tempo-box"></td><td class="minuto"></td><td class="tempo-box"></td><td></td><td></td><td class="box"></td><td class="box"></td></tr>`;const supl=sup.map(x=>`<tr><td>${x.n}</td><td>${x.nome}</td></tr>`).join('');
 const w=window.open('','_blank','width=1100,height=800');if(!w)return;w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Minutagem</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Arial;margin:0;font-size:12px}.head{height:92px;display:flex;align-items:center;justify-content:center;gap:35px}.head img{width:82px}.sq{width:64px;height:38px;border:3px solid #111}.x{font-size:34px;font-weight:bold}.adv{font-size:22px;font-weight:bold}.tbl{width:100%;border-collapse:collapse;table-layout:fixed}.tbl th{text-align:center;height:23px}.tbl td{height:18px;border:1px solid #111;padding:1px 4px}.tbl td:nth-child(1){width:52px;text-align:center;border-right:0}.tbl td:nth-child(2){width:180px;text-align:left}.tbl td:nth-child(3){width:55px}.tbl td:nth-child(4),.tbl td:nth-child(5),.tbl td:nth-child(9),.tbl td:nth-child(10){width:62px}.tbl td.box,.tbl td.tempo-box,.tbl td.minuto{border:1px solid #111!important;background:#fff;height:16px}.tbl th:nth-child(1),.tbl td:nth-child(1){font-size:10px!important;width:32px!important;min-width:32px!important;max-width:32px!important;text-align:center!important}.tbl td:nth-child(7),.tbl th:nth-child(7){text-align:center!important} .tbl th:nth-child(3),.tbl td:nth-child(3),.tbl th:nth-child(10),.tbl td:nth-child(10){width:42px!important;min-width:42px!important;max-width:42px!important;padding:1px!important;text-align:center!important;white-space:nowrap}.tbl th:nth-child(4),.tbl td:nth-child(4),.tbl th:nth-child(5),.tbl td:nth-child(5),.tbl th:nth-child(11),.tbl td:nth-child(11),.tbl th:nth-child(12),.tbl td:nth-child(12){width:40px!important;min-width:40px!important;max-width:40px!important;padding:1px!important;text-align:center!important;white-space:nowrap}.tbl th:nth-child(6),.tbl td:nth-child(6),.tbl th:nth-child(8),.tbl td:nth-child(8){width:32px!important;min-width:32px!important;max-width:32px!important;padding:1px!important;text-align:center!important;white-space:nowrap}.tbl th:nth-child(7),.tbl td:nth-child(7){width:58px!important;min-width:58px!important;max-width:58px!important;text-align:center!important}.ca{background:#ff0}.cv{color:red}.bar{background:#c00;color:#fff;text-align:center;font-weight:bold;height:18px}.bottom{display:grid;grid-template-columns:240px 1fr;gap:60px}.sup td{height:15px;border-bottom:1px solid #111;border-right:2px dotted #111}.info{margin-top:15px;font-size:20px;text-align:center}.check{display:inline-block;width:36px;height:34px;border:2px solid #e33;vertical-align:middle;margin:8px 15px}.notes{border:3px solid #111;height:90px;margin-top:0;padding:4px;font-size:12px}</style></head><body><div class="head"><img src="logo.png"><span class="sq"></span><span class="x">X</span><span class="sq"></span><span class="adv">${adv||'Adversário'}</span></div><table class="tbl"><thead><tr><th>Número</th><th>Titulares</th><th>Gols</th><th class="ca">C.A.</th><th class="cv">C.V.</th><th>1º</th><th>Minuto</th><th>2º</th><th>Suplentes</th><th>Gols</th><th class="ca">C.A.</th><th class="cv">C.V.</th></tr></thead><tbody>${tit.map(linha).join('')}<tr><td colspan="12" class="bar">Suplentes</td></tr></tbody></table><div class="bottom"><table class="sup"><tbody>${supl}</tbody></table><div><div class="info"><b>Data:</b> ${data||'____/____/______'}<br><span class="check"></span> Casa <span class="check"></span> Fora</div><div class="notes">Informações adicionais</div></div></div><script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);w.document.close();
}

/* Atualiza a tela após 10 minutos sem atividade, evitando manter uma cópia antiga aberta */
let timerInatividadeSistema;
const TEMPO_INATIVIDADE_SISTEMA = 10 * 60 * 1000;
let inicioInatividadeSistema=Date.now();
function atualizarRelogioInatividade(){
    let el=document.getElementById('relogio-inatividade-sistema');
    if(!el){el=document.createElement('div');el.id='relogio-inatividade-sistema';el.title='Tempo para atualização automática';document.body.appendChild(el);}
    const restante=Math.max(0,TEMPO_INATIVIDADE_SISTEMA-(Date.now()-inicioInatividadeSistema));
    const minutos=String(Math.floor(restante/60000)).padStart(2,'0');
    const segundos=String(Math.floor(restante%60000/1000)).padStart(2,'0');
    el.textContent='↻ '+minutos+':'+segundos;
}
function reiniciarTimerInatividadeSistema(){
    clearTimeout(timerInatividadeSistema);inicioInatividadeSistema=Date.now();atualizarRelogioInatividade();
    timerInatividadeSistema=setTimeout(()=>window.location.reload(),TEMPO_INATIVIDADE_SISTEMA);
}
function iniciarRelogioInatividadeSistema(){
    ['mousedown','keydown','input','change','scroll','touchstart','pointerdown'].forEach(evt=>document.addEventListener(evt,reiniciarTimerInatividadeSistema,{passive:true}));
    reiniciarTimerInatividadeSistema();
    setInterval(atualizarRelogioInatividade,1000);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciarRelogioInatividadeSistema); else iniciarRelogioInatividadeSistema();


/* === MÓDULO JOGOS === */
function openJogosProfessorModal(){
 let m=document.getElementById('jogos-professor-modal');if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='jogos-professor-modal';document.body.appendChild(m)}
 const professores=['Christian Rondina','Eric Bergmann','Roberto Fonseca Jr.','Roberto Fonseca Jr. Sub 14','Vinícius Bolonheze'];
 m.innerHTML=`<div class="jogos-professor-card"><h3>Selecione o professor</h3><p>Escolha o banco de dados que deseja acessar:</p><div>${professores.map(p=>`<button onclick="selecionarProfessorJogos('${p}')">${p}</button>`).join('')}</div><button class="cancelar-jogos" onclick="fecharJogosProfessorModal()">Cancelar</button></div>`;
 m.style.display='flex';
}
function fecharJogosProfessorModal(){
 const m=document.getElementById('jogos-professor-modal');if(m)m.style.display='none';
 if(typeof modernV3VoltarInicio==='function') modernV3VoltarInicio();
}
function selecionarProfessorJogos(professor){
 professorJogosAtual=professor;const m=document.getElementById('jogos-professor-modal');if(m)m.style.display='none';
 document.querySelectorAll('.screen').forEach(x=>{x.classList.remove('active-screen');x.style.display=''});const g=document.getElementById('generic-screen');g.classList.add('active-screen');g.style.display='flex';renderJogosScreen();
}
function renderJogosScreen(){
 const box=document.getElementById('generic-content');if(!box)return;
 const qtdAtivos=contarAtletasAtivosJogos();
 const modoAtivos=getJogosAtivosConfigRaw()===null?`${qtdAtivos} atleta(s) disponíveis`: `${qtdAtivos} atleta(s) ativo(s)`;
 box.innerHTML=`<div class="jogos-header"><h2>Jogos — ${professorJogosAtual||''}</h2><p>Banco de dados individual do professor<br><small>${modoAtivos}</small></p></div><div id="jogos-salvos-lista" class="jogos-salvos-lista"><p>Carregando jogos salvos...</p></div><button class="atletas-ativos-fab" onclick="abrirAtletasAtivosJogos()">Atletas Ativos <span>${qtdAtivos}</span></button><button class="novo-jogo-fab" onclick="novoJogo()">Novo Jogo</button>`;
 carregarJogosSalvosProfessor();
}

function getJogosAtivosTempSet(){
 if(!window.__jogosAtivosTempSet) window.__jogosAtivosTempSet=new Set();
 return window.__jogosAtivosTempSet;
}

function chaveJogosAtivosProfessor(professor=professorJogosAtual){
 return 'prosol_cfa_jogos_ativos_v1_'+encodeURIComponent(professor||'geral');
}
function getJogosAtivosConfigRaw(){
 const raw=localStorage.getItem(chaveJogosAtivosProfessor());
 if(raw===null)return null;
 try{return JSON.parse(raw)||[]}catch(e){return []}
}
function normalizarTextoProfessorJogos(valor){
 return String(valor||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}
function anosPadraoJogosProfessor(professor=professorJogosAtual){
 const nome=normalizarTextoProfessorJogos(professor);
 if(nome.includes('christian')) return ['2015','2016','2017','2018'];
 if(nome.includes('eric')) return ['2014'];
 if(nome.includes('vinicius')) return ['2013'];
 if(nome.includes('roberto') && (nome.includes('sub 14') || nome.includes('sub14'))) return ['2012'];
 if(nome.includes('roberto')) return ['2009','2010','2011','2012'];
 return ['2013'];
}
function nomeAtletaJogos(row){
 const nk=Object.keys(row).find(k=>k.toLowerCase().includes('apelido'))||Object.keys(row).find(k=>k.toLowerCase().includes('nome'));
 return nk&&row[nk]?String(row[nk]).trim():'Sem Nome';
}
function anoAtletaJogos(row){return String(valorColunaExata(row,'Ano')||'').trim();}
function posicaoAtletaJogos(row){
 const pk=Object.keys(row).find(k=>k.toLowerCase().includes('posição')||k.toLowerCase().includes('posicao'));
 return pk&&row[pk]?String(row[pk]).trim():'-';
}
function normalizarDataJogos(valor){return String(convertExcelDate(valor)||'').trim();}
function nascimentoAtletaJogos(row){
 const dk=Object.keys(row).find(k=>k.toLowerCase().includes('data de nascimento')||k.toLowerCase().includes('nascimento'));
 return dk?normalizarDataJogos(row[dk]):'';
}
function nomeCompletoAtletaJogos(row){
 const nk=Object.keys(row).find(k=>k.toLowerCase().includes('nome completo'))||Object.keys(row).find(k=>k.toLowerCase()==='nome')||Object.keys(row).find(k=>k.toLowerCase().includes('nome'));
 return nk&&row[nk]?String(row[nk]).trim():'';
}
function identidadeAtletaJogos(index){
 const row=excelData[index]||{};
 return {apelido:nomeAtletaJogos(row),nascimento:nascimentoAtletaJogos(row),nomeCompleto:nomeCompletoAtletaJogos(row),ano:anoAtletaJogos(row)};
}
function localizarAtletaAtivoJogos(id){
 if(id===undefined||id===null)return -1;
 if(typeof id==='number')return id;
 const apelido=String(id.apelido||'').trim();
 const nascimento=normalizarDataJogos(id.nascimento||'');
 const nomeCompleto=String(id.nomeCompleto||id.nome||'').trim();
 const ano=String(id.ano||'').trim();
 let idx=-1;
 if(apelido&&nascimento){
  idx=excelData.findIndex(row=>nomeAtletaJogos(row)===apelido&&nascimentoAtletaJogos(row)===nascimento);
  if(idx>=0)return idx;
 }
 if(apelido&&ano){
  idx=excelData.findIndex(row=>nomeAtletaJogos(row)===apelido&&anoAtletaJogos(row)===ano);
  if(idx>=0)return idx;
 }
 if(nomeCompleto&&nascimento){
  idx=excelData.findIndex(row=>nomeCompletoAtletaJogos(row)===nomeCompleto&&nascimentoAtletaJogos(row)===nascimento);
  if(idx>=0)return idx;
 }
 return -1;
}
function getJogosAtletasAtivosIndices(){
 const cfg=getJogosAtivosConfigRaw();
 if(cfg===null){
  const anosPadrao=anosPadraoJogosProfessor();
  return excelData.map((r,i)=>({r,i})).filter(x=>anosPadrao.includes(anoAtletaJogos(x.r))).map(x=>x.i);
 }
 const indices=cfg.map(item=>localizarAtletaAtivoJogos(item)).filter(i=>Number.isInteger(i)&&i>=0&&excelData[i]);
 return Array.from(new Set(indices));
}
function contarAtletasAtivosJogos(){return getJogosAtletasAtivosIndices().length;}

function abrirAtletasAtivosJogos(){
 const cfgAtivosSalvos=getJogosAtivosConfigRaw();
 window.__jogosAtivosTempSet=new Set((cfgAtivosSalvos===null?[]:getJogosAtletasAtivosIndices()).map(i=>String(i)));
 let m=document.getElementById('atletas-ativos-jogos-modal');
 if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='atletas-ativos-jogos-modal';document.body.appendChild(m)}
 const anos=['2009','2010','2011','2012','2013','2014','2015','2016','2017','2018'];
 m.innerHTML=`<div class="atletas-ativos-card"><div class="novo-jogo-title"><b>Atletas Ativos — ${professorJogosAtual||''}</b><button onclick="document.getElementById('atletas-ativos-jogos-modal').style.display='none'">×</button></div><div class="ativos-toolbar"><input id="busca-atleta-ativo-jogos" placeholder="Buscar atleta..." oninput="renderAtletasAtivosJogosLista()"><div class="ativos-anos">${anos.map(a=>`<label><input type="checkbox" class="jogo-ativo-ano" value="${a}" onchange="renderAtletasAtivosJogosLista()"> ${a}</label>`).join('')}</div><div class="ativos-acoes"><button onclick="marcarAtletasAtivosFiltrados(true)">Marcar filtrados</button><button onclick="marcarAtletasAtivosFiltrados(false)">Desmarcar filtrados</button><button onclick="getJogosAtivosTempSet().clear();renderAtletasAtivosJogosLista()">Limpar</button></div><p>Escolha os atletas que ficarão disponíveis em todos os jogos deste professor. Se nada for salvo, será usado o padrão de anos deste professor.</p></div><div id="jogos-atletas-ativos-lista"></div><div class="ativos-footer"><strong id="jogos-ativos-contador"></strong><div><button class="salvar-jogo" onclick="salvarAtletasAtivosJogos()">Salvar Ativos</button><button class="cancelar-ativos" onclick="document.getElementById('atletas-ativos-jogos-modal').style.display='none'">Cancelar</button></div></div></div>`;
 m.style.display='flex';
 renderAtletasAtivosJogosLista();
}
function getAtletasFiltradosAtivosJogos(){
 const anosSel=Array.from(document.querySelectorAll('#atletas-ativos-jogos-modal .jogo-ativo-ano:checked')).map(x=>x.value);
 const busca=(document.getElementById('busca-atleta-ativo-jogos')?.value||'').toLowerCase().trim();
 return excelData.map((row,index)=>({index,row,nome:nomeAtletaJogos(row),ano:anoAtletaJogos(row),posicao:posicaoAtletaJogos(row)})).filter(a=>{
  if(anosSel.length&& !anosSel.includes(a.ano))return false;
  if(busca&& !(`${a.nome} ${a.ano} ${a.posicao}`.toLowerCase().includes(busca)))return false;
  return true;
 }).sort((a,b)=>a.ano.localeCompare(b.ano)||a.nome.localeCompare(b.nome,'pt-BR'));
}
function renderAtletasAtivosJogosLista(){
 const box=document.getElementById('jogos-atletas-ativos-lista');if(!box)return;
 const atletas=getAtletasFiltradosAtivosJogos();
 box.innerHTML=`<div class="ativo-atleta-head"><span></span><span>Atleta</span><span>Ano</span><span>Posição</span></div>`+atletas.map(a=>`<label class="ativo-atleta-row"><input type="checkbox" ${getJogosAtivosTempSet().has(String(a.index))?'checked':''} onchange="toggleAtletaAtivoJogos(${a.index},this.checked)"><span>${a.nome}</span><span>${a.ano}</span><span>${a.posicao}</span></label>`).join('');
 atualizarContadorAtivosJogos();
}
function toggleAtletaAtivoJogos(index,checked){
 const set=getJogosAtivosTempSet(); if(checked)set.add(String(index));else set.delete(String(index));
 atualizarContadorAtivosJogos();
}
function atualizarContadorAtivosJogos(){
 const el=document.getElementById('jogos-ativos-contador');
 if(el)el.textContent=`Selecionados: ${getJogosAtivosTempSet().size}`;
}
function marcarAtletasAtivosFiltrados(marcar){
 const set=getJogosAtivosTempSet(); getAtletasFiltradosAtivosJogos().forEach(a=>{if(marcar)set.add(String(a.index));else set.delete(String(a.index));});
 renderAtletasAtivosJogosLista();
}
function salvarAtletasAtivosJogos(){
 const indices=Array.from(getJogosAtivosTempSet()).map(x=>parseInt(x)).filter(i=>Number.isInteger(i)&&excelData[i]);
 const payload=indices.map(i=>identidadeAtletaJogos(i));
 localStorage.setItem(chaveJogosAtivosProfessor(),JSON.stringify(payload));
 const m=document.getElementById('atletas-ativos-jogos-modal');if(m)m.style.display='none';
 renderJogosScreen();
 alert('Atletas ativos salvos para '+(professorJogosAtual||'este professor')+'.');
}

function converterDataConvocacaoParaInput(valor){
 if(!valor)return '';
 const s=String(valor).trim();
 let m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
 if(m)return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
 if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
 const d=new Date(s);
 if(!isNaN(d))return d.toISOString().slice(0,10);
 return '';
}
function getConvocacaoJogoAtual(){return window.__jogoConvocacaoAtual||null;}
function indicesConvocadosDoJogo(dados){
 const d=dados||{};
 let indices=[];
 if(Array.isArray(d.selecionadosDetalhes)&&d.selecionadosDetalhes.length){
  indices=d.selecionadosDetalhes.map(id=>localizarAtletaPorIdentidadeConvocacao(id)).filter(i=>Number.isInteger(i)&&i>=0&&excelData[i]);
 }
 return Array.from(new Set(indices));
}
function getIndicesListaNovoJogo(){
 const base=getJogosAtletasAtivosIndices();
 const conv=getConvocacaoJogoAtual();
 const convocados=conv?indicesConvocadosDoJogo(conv.dados):[];
 const editados=Array.isArray(window.__jogoAtletasEditIndices)?window.__jogoAtletasEditIndices:[];
 return Array.from(new Set([...base,...convocados,...editados]));
}
function isAtletaConvocadoNoJogo(index){
 const conv=getConvocacaoJogoAtual();
 if(!conv)return false;
 return indicesConvocadosDoJogo(conv.dados).includes(index);
}
function ordemPosicaoJogos(row){
 const p=String(posicaoAtletaJogos(row)||'').toLowerCase();
 if(p.includes('goleiro'))return 0;
 if(p.includes('zagueiro'))return 1;
 if(p.includes('lateral'))return 2;
 if(p.includes('volante'))return 3;
 if(p.includes('meia'))return 4;
 if(p.includes('atacante'))return 5;
 if(p.includes('extremo')||p.includes('ponta'))return 6;
 return 99;
}
function aplicarStatsEditadasJogoNasLinhas(){
 const mapa=window.__jogoStatsEditMap||{};
 document.querySelectorAll('#novo-jogo-atletas-lista .jogo-atleta-row').forEach(row=>{
  const s=mapa[row.dataset.index];
  if(!s)return;
  const set=(sel,val)=>{const el=row.querySelector(sel);if(el)el.value=val??0;};
  set('.jogo-atleta-minutos',s.minutos);
  set('.jogo-atleta-gols',s.gols);
  set('.jogo-atleta-amarelo',s.amarelo);
  set('.jogo-atleta-vermelho',s.vermelho);
 });
}
function renderNovoJogoListaAtletas(){
 const lista=document.getElementById('novo-jogo-atletas-lista');
 if(!lista)return;
 const conv=getConvocacaoJogoAtual();
 const editando=window.__jogoEditandoAtual||null;
 const editConvSet=window.__jogoConvocadosEditSet instanceof Set?window.__jogoConvocadosEditSet:new Set();
 const cfgAtivosJogo=getJogosAtivosConfigRaw();
 const titulo=document.getElementById('novo-jogo-atletas-titulo');
 const info=document.getElementById('jogo-convocacao-info');
 const convocadosSet=new Set(conv?indicesConvocadosDoJogo(conv.dados):Array.from(editConvSet));
 if(titulo)titulo.textContent=(conv||editando)?'Atletas do Jogo — Convocados Grifados':(cfgAtivosJogo===null?'Atletas disponíveis':'Atletas Ativos');
 if(info){
  if(conv) info.innerHTML=`Convocação carregada: <strong>${conv.nome}</strong>. Atletas convocados estão grifados em verde.`;
  else if(editando) info.innerHTML=`Editando: <strong>${editando.nome}</strong>${editando.convocacaoNome?` — Convocação: <strong>${editando.convocacaoNome}</strong>`:''}. Atletas convocados estão grifados em verde.`;
  else info.innerHTML='Nenhuma convocação carregada.';
 }
 let indices=getIndicesListaNovoJogo();
 if(conv||editando){
  indices=indices.sort((ia,ib)=>{
   const ca=convocadosSet.has(ia), cb=convocadosSet.has(ib);
   if(ca!==cb)return ca?-1:1;
   const ra=excelData[ia]||{}, rb=excelData[ib]||{};
   if(ca&&cb){
    const oa=ordemPosicaoJogos(ra), ob=ordemPosicaoJogos(rb);
    if(oa!==ob)return oa-ob;
   }
   return nomeAtletaJogos(ra).localeCompare(nomeAtletaJogos(rb),'pt-BR');
  });
 }
 const linhas=indices.map(i=>{
  const row=excelData[i]||{};
  const nome=nomeAtletaJogos(row);
  const convocado=convocadosSet.has(i);
  return `<div class="jogo-atleta-row ${convocado?'jogo-convocado':''}" data-index="${i}"><span>${nome}</span><input class="jogo-atleta-minutos" type="number" value="0"><input class="jogo-atleta-gols" type="number" value="0"><input class="jogo-atleta-amarelo" type="number" value="0"><input class="jogo-atleta-vermelho" type="number" value="0"></div>`;
 }).join('');
 lista.innerHTML=`<div class="jogo-atleta-head">Atleta <span>Min.</span><span>Gols</span><span>AM.</span><span>VER.</span></div>${linhas}`;
 aplicarStatsEditadasJogoNasLinhas();
}
async function abrirBuscarConvocacaoJogo(){
 const {data,error}=await _supabase.from('convocacoes').select('nome,dados').order('nome');
 if(error){alert('Erro ao buscar convocações.');console.error(error);return;}
 if(!data||!data.length){alert('Nenhuma convocação salva encontrada.');return;}
 let m=document.getElementById('buscar-convocacao-jogo-modal');
 if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='buscar-convocacao-jogo-modal';document.body.appendChild(m)}
 m.innerHTML=`<div class="buscar-convocacao-jogo-card"><div class="novo-jogo-title"><b>Buscar Convocação</b><button onclick="document.getElementById('buscar-convocacao-jogo-modal').style.display='none'">×</button></div><div class="buscar-convocacao-jogo-body"><p>Selecione uma convocação salva para preencher a data, o adversário e grifar os atletas convocados.</p><select id="convocacao-jogo-select" size="10">${data.map(x=>`<option value="${String(x.nome).replace(/"/g,'&quot;')}">${x.nome}</option>`).join('')}</select><div class="buscar-convocacao-jogo-actions"><button onclick="confirmarBuscarConvocacaoJogo()">Carregar Convocação</button><button onclick="document.getElementById('buscar-convocacao-jogo-modal').style.display='none'">Cancelar</button></div></div></div>`;
 m.style.display='flex';
}
async function confirmarBuscarConvocacaoJogo(){
 const select=document.getElementById('convocacao-jogo-select');
 if(!select||!select.value)return alert('Selecione uma convocação.');
 const {data,error}=await _supabase.from('convocacoes').select('nome,dados').eq('nome',select.value).single();
 if(error||!data){alert('Não foi possível carregar a convocação.');console.error(error);return;}
 const dados=data.dados||{};
 window.__jogoConvocacaoAtual={nome:data.nome,dados};
 const campoData=document.querySelector('#novo-jogo-modal .jogo-data-input');
 const dataFormatada=converterDataConvocacaoParaInput(dados.data||'');
 if(campoData&&dataFormatada)campoData.value=dataFormatada;
 const campoAdversario=document.querySelector('#novo-jogo-modal .jogo-adversario-top');
 if(campoAdversario)campoAdversario.value=dados.adversario||'';
 renderNovoJogoListaAtletas();
 const m=document.getElementById('buscar-convocacao-jogo-modal');if(m)m.style.display='none';
}
function novoJogo(){
 window.__jogoConvocacaoAtual=null;
 window.__jogoEditandoAtual=null;
 window.__jogoAtletasEditIndices=[];
 window.__jogoStatsEditMap={};
 window.__jogoConvocadosEditSet=new Set();
 let m=document.getElementById('novo-jogo-modal');
 if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='novo-jogo-modal';document.body.appendChild(m)}
 const cfgAtivosJogo=getJogosAtivosConfigRaw();
 const tituloAtletasJogo=cfgAtivosJogo===null?'Atletas disponíveis':'Atletas Ativos';
 m.innerHTML=`
  <div class="novo-jogo-card">
   <div class="novo-jogo-title">
    <b>Novo Jogo</b>
    <div class="novo-jogo-title-actions">
     <button class="buscar-convocacao-jogo-btn" onclick="abrirBuscarConvocacaoJogo()">Buscar Convocação</button>
     <button class="carregar-jogo-salvo-btn" onclick="abrirCarregarJogoSalvoModal()">Carregar Jogo</button>
     <button class="novo-jogo-fechar" onclick="document.getElementById('novo-jogo-modal').style.display='none'">×</button>
    </div>
   </div>
   <div class="jogo-placar-header">
    <img src="logo.png">
    <input class="jogo-placar-prosol" type="number" min="0" placeholder="0">
    <b>X</b>
    <input class="jogo-placar-adversario" type="number" min="0" placeholder="0">
    <input class="jogo-adversario-top" placeholder="Adversário">
   </div>
   <div class="jogo-form-top">
    <label>Jogo<select class="jogo-tipo-select"><option>Campeonato</option><option>Amistoso</option><option>Torneio</option></select></label>
    <label>Data<input type="date" class="jogo-data-input"></label>
    <label>Local<select class="jogo-local-select"><option>Casa</option><option>Fora</option></select></label>
    <label class="jogo-caracteristica">Característica<select class="jogo-caracteristica-select"><option>Clube</option><option>Escolinha</option><option>Projeto</option></select></label>
    <label class="jogo-minutos">Minutos do jogo<input class="jogo-minutos-input" type="number" value="" min="0"></label>
   </div>
   <div class="jogo-convocacao-info" id="jogo-convocacao-info">Nenhuma convocação carregada.</div>
   <h3 id="novo-jogo-atletas-titulo">${tituloAtletasJogo}</h3>
   <div class="jogo-atletas" id="novo-jogo-atletas-lista"></div>
   <button class="salvar-jogo" onclick="salvarJogoSupabase()">Salvar Jogo</button>
  </div>`;
 m.style.display='flex';
 renderNovoJogoListaAtletas();
}


function formatarDataJogoBR(dataISO){
 if(!dataISO)return '';
 const m=String(dataISO).match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(m)return `${m[3]}/${m[2]}/${m[1]}`;
 return String(dataISO);
}
function numeroValorJogo(selector){
 const el=document.querySelector(selector);
 const n=parseInt(el?.value||'0',10);
 return isNaN(n)?0:n;
}
function textoValorJogo(selector){return (document.querySelector(selector)?.value||'').trim();}
function apelidoAtletaJogos(row){
 const ak=Object.keys(row||{}).find(k=>k.toLowerCase().includes('apelido'));
 return ak&&row[ak]?String(row[ak]).trim():'';
}
function dadosAtletasJogo(){
 const conv=getConvocacaoJogoAtual();
 const editConvSet=window.__jogoConvocadosEditSet instanceof Set?window.__jogoConvocadosEditSet:new Set();
 const convocadosSet=new Set(conv?indicesConvocadosDoJogo(conv.dados):Array.from(editConvSet));
 return Array.from(document.querySelectorAll('#novo-jogo-atletas-lista .jogo-atleta-row')).map(row=>{
  const index=parseInt(row.dataset.index,10);
  const atleta=excelData[index]||{};
  return {
   nomeCompleto: nomeCompletoAtletaJogos(atleta) || nomeAtletaJogos(atleta),
   apelido: apelidoAtletaJogos(atleta),
   ano: anoAtletaJogos(atleta),
   nascimento: nascimentoAtletaJogos(atleta),
   convocado: convocadosSet.has(index),
   minutos: parseInt(row.querySelector('.jogo-atleta-minutos')?.value||'0',10)||0,
   gols: parseInt(row.querySelector('.jogo-atleta-gols')?.value||'0',10)||0,
   amarelo: parseInt(row.querySelector('.jogo-atleta-amarelo')?.value||'0',10)||0,
   vermelho: parseInt(row.querySelector('.jogo-atleta-vermelho')?.value||'0',10)||0
  };
 });
}
async function proximoNumeroJogoProfessor(professor){
 const {data,error}=await _supabase.from('jogos').select('numero_jogo').eq('professor',professor).order('numero_jogo',{ascending:false}).limit(1);
 if(error)throw error;
 const ultimo=data&&data.length?parseInt(data[0].numero_jogo,10):0;
 return (isNaN(ultimo)?0:ultimo)+1;
}
function escapeHtmlJogos(valor){
 return String(valor??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}
async function buscarJogoSalvoPorId(id){
 const {data,error}=await _supabase.from('jogos').select('id,professor,numero_jogo,nome,dados,criado_em').eq('id',id).single();
 if(error||!data){console.error(error);alert('Não foi possível carregar o jogo salvo.');return null;}
 return data;
}
async function carregarJogosSalvosProfessor(){
 const box=document.getElementById('jogos-salvos-lista');if(!box)return;
 const professor=professorJogosAtual||'Geral';
 const {data,error}=await _supabase.from('jogos').select('id,numero_jogo,nome,dados,criado_em').eq('professor',professor).order('numero_jogo',{ascending:false});
 if(error){
  box.innerHTML='<div class="jogos-salvos-card"><strong>Banco de jogos ainda não configurado.</strong><br><small>Crie a tabela <b>jogos</b> no Supabase usando o SQL que combinamos.</small></div>';
  return;
 }
 if(!data||!data.length){box.innerHTML='<div class="jogos-salvos-card">Nenhum jogo salvo para este professor.</div>'+renderEstatisticasJogosProfessor(calcularEstatisticasJogosProfessor([]))+renderBotaoRelatorioJogosProfessor(false);return;}
 const stats=calcularEstatisticasJogosProfessor(data);
 box.innerHTML=`<div class="jogos-salvos-card"><h3>Jogos salvos</h3>${data.map(j=>`<div class="jogo-salvo-item"><strong>${escapeHtmlJogos(j.nome)}</strong><div class="jogo-salvo-acoes"><button class="jogo-btn-editar" title="Editar jogo" aria-label="Editar jogo" onclick="editarJogoSalvoDireto('${j.id}')">Editar</button><button class="jogo-btn-detalhes" title="Ver detalhes" aria-label="Ver detalhes" onclick="verDetalhesJogoSalvo('${j.id}')">Detalhes</button><button title="Excluir jogo" aria-label="Excluir jogo" class="excluir-jogo-salvo" onclick="excluirJogoSalvo('${j.id}')">Excluir</button></div></div>`).join('')}</div>${renderEstatisticasJogosProfessor(stats)}${renderBotaoRelatorioJogosProfessor(true)}`;
}
async function editarJogoSalvoDireto(id){
 const jogo=await buscarJogoSalvoPorId(id);if(!jogo)return;
 novoJogo();
 aplicarJogoSalvoParaEdicao(jogo);
}
async function verDetalhesJogoSalvo(id){
 const jogo=await buscarJogoSalvoPorId(id);if(!jogo)return;
 const d=jogo.dados||{};
 const placar=d.placar||{};
 const atletas=(d.atletas||[]).filter(a=>(Number(a.minutos)||0)>0||(Number(a.gols)||0)>0||(Number(a.amarelo)||0)>0||(Number(a.vermelho)||0)>0);
 let m=document.getElementById('detalhes-jogo-salvo-modal');
 if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='detalhes-jogo-salvo-modal';document.body.appendChild(m)}
 const lista=atletas.length?atletas.map(a=>{
  const eventos=[];
  if(Number(a.gols)>0)eventos.push(`<span class="det-gol">${a.gols} gol${Number(a.gols)>1?'s':''}</span>`);
  if(Number(a.amarelo)>0)eventos.push(`<span class="det-amarelo">${a.amarelo} CA</span>`);
  if(Number(a.vermelho)>0)eventos.push(`<span class="det-vermelho">${a.vermelho} CV</span>`);
  return `<div class="det-atleta-row"><strong>${escapeHtmlJogos(a.apelido||a.nomeCompleto||'Atleta')}</strong><span>${Number(a.minutos)||0} min</span><span>${eventos.join(' ')||'-'}</span></div>`;
 }).join(''):'<p class="det-sem-atletas">Nenhum atleta com minutos/eventos registrados.</p>';
 m.innerHTML=`<div class="detalhes-jogo-card"><div class="novo-jogo-title"><b>Resumo do Jogo</b><button onclick="document.getElementById('detalhes-jogo-salvo-modal').style.display='none'">×</button></div><div class="detalhes-jogo-body"><div class="det-placar"><img src="logo.png"><strong>CFA Prosol</strong><span>${placar.cfa_prosol??0}</span><b>X</b><span>${placar.adversario??0}</span><strong>${escapeHtmlJogos(d.adversario||'Adversário')}</strong></div><div class="det-info-jogo">${escapeHtmlJogos(jogo.nome)}</div><h4>Atletas que jogaram</h4><div class="det-atletas-lista">${lista}</div></div></div>`;
 m.style.display='flex';
}
async function excluirJogoSalvo(id){
 const jogo=await buscarJogoSalvoPorId(id);if(!jogo)return;
 if(!confirm('Excluir permanentemente o jogo salvo?\n\n'+jogo.nome))return;
 const {error}=await _supabase.from('jogos').delete().eq('id',id);
 if(error){console.error(error);alert('Erro ao excluir jogo. Verifique as permissões no Supabase.');return;}
 alert('Jogo excluído com sucesso.');
 carregarJogosSalvosProfessor();
}
function chaveAtletaEstatisticaJogos(atleta){
 const nome=String(atleta.nomeCompleto||atleta.nome||'').trim();
 const nascimento=String(atleta.nascimento||'').trim();
 const ano=String(atleta.ano||'').trim();
 return `${nome}|${nascimento}|${ano}`;
}
function nomeExibicaoEstatisticaJogos(atleta){
 return atleta.apelido||atleta.nomeCompleto||'Atleta';
}
function detalhesEventoJogoTexto(detalhes, tipo){
 if(!detalhes||!detalhes.length)return '';
 return detalhes.map(d=>{
  const qtd=Number(d.qtd)||0;
  let label=tipo;
  if(tipo==='gol')label=qtd>1?'gols':'gol';
  if(tipo==='CA')label='CA';
  if(tipo==='CV')label='CV';
  return `${d.data||'-'} - ${d.adversario||'Adversário'}: ${qtd} ${label}`;
 }).join('\n');
}
function detalhesResultadoJogosTexto(lista){
 if(!lista||!lista.length)return 'Nenhum jogo.';
 return lista.map(j=>`${j.data||'-'} - CFA Prosol - ${j.gf} x ${j.gs} ${j.adversario||'Adversário'}`).join('\n');
}
function calcularEstatisticasJogosProfessor(jogos){
 const stats={total:0,vitorias:0,derrotas:0,empates:0,golsFeitos:0,golsSofridos:0,vitoriasDetalhes:[],empatesDetalhes:[],derrotasDetalhes:[],atletas:{},maisMinutos:[],menosMinutos:[],goleadores:[],cartoes:[]};
 (jogos||[]).forEach(j=>{
  const dados=j.dados||{};
  const p=dados.placar||{};
  const gf=parseInt(p.cfa_prosol??0,10)||0;
  const gs=parseInt(p.adversario??0,10)||0;
  const dataJogo=dados.data||formatarDataJogoBR(dados.data_iso||'')||'';
  const adversario=dados.adversario||'Adversário';
  const detalheResultado={data:dataJogo,adversario,gf,gs,nome:j.nome||dados.nome||''};
  stats.total++;
  stats.golsFeitos+=gf;
  stats.golsSofridos+=gs;
  if(gf>gs){stats.vitorias++;stats.vitoriasDetalhes.push(detalheResultado);}
  else if(gf<gs){stats.derrotas++;stats.derrotasDetalhes.push(detalheResultado);}
  else {stats.empates++;stats.empatesDetalhes.push(detalheResultado);}
  (dados.atletas||[]).forEach(a=>{
   // Se o atleta foi removido do banco principal, mantém o resultado do jogo,
   // mas não exibe mais este atleta nos cards/listas individuais do relatório.
   if (localizarAtletaSalvoEmJogo(a) < 0) return;
   const key=chaveAtletaEstatisticaJogos(a);
   if(!stats.atletas[key]){
    stats.atletas[key]={
     nomeCompleto:a.nomeCompleto||'',
     apelido:a.apelido||'',
     ano:a.ano||'',
     nascimento:a.nascimento||'',
     minutos:0,
     gols:0,
     amarelo:0,
     vermelho:0,
     golsDetalhes:[],
     amareloDetalhes:[],
     vermelhoDetalhes:[]
    };
   }
   const item=stats.atletas[key];
   const minutos=parseInt(a.minutos??0,10)||0;
   const gols=parseInt(a.gols??0,10)||0;
   const amarelo=parseInt(a.amarelo??0,10)||0;
   const vermelho=parseInt(a.vermelho??0,10)||0;
   item.minutos+=minutos;
   item.gols+=gols;
   item.amarelo+=amarelo;
   item.vermelho+=vermelho;
   if(gols>0)item.golsDetalhes.push({data:dataJogo,adversario,qtd:gols});
   if(amarelo>0)item.amareloDetalhes.push({data:dataJogo,adversario,qtd:amarelo});
   if(vermelho>0)item.vermelhoDetalhes.push({data:dataJogo,adversario,qtd:vermelho});
  });
 });
 const atletas=Object.values(stats.atletas);
 stats.maisMinutos=[...atletas].sort((a,b)=>b.minutos-a.minutos||nomeExibicaoEstatisticaJogos(a).localeCompare(nomeExibicaoEstatisticaJogos(b),'pt-BR'));
 stats.menosMinutos=[...atletas].sort((a,b)=>a.minutos-b.minutos||nomeExibicaoEstatisticaJogos(a).localeCompare(nomeExibicaoEstatisticaJogos(b),'pt-BR'));
 stats.goleadores=[...atletas].filter(a=>a.gols>0).sort((a,b)=>b.gols-a.gols||nomeExibicaoEstatisticaJogos(a).localeCompare(nomeExibicaoEstatisticaJogos(b),'pt-BR'));
 stats.cartoes=[...atletas].filter(a=>a.amarelo>0||a.vermelho>0).sort((a,b)=>(b.amarelo+b.vermelho)-(a.amarelo+a.vermelho)||nomeExibicaoEstatisticaJogos(a).localeCompare(nomeExibicaoEstatisticaJogos(b),'pt-BR'));
 return stats;
}
function renderListaMinutosJogos(lista,tipo){
 if(!lista||!lista.length)return '<div class="estat-vazio">Sem dados.</div>';
 return `<div class="estat-lista-atletas">${lista.map((a,i)=>`<div class="estat-atleta-row"><span>${i+1}. ${escapeHtmlJogos(nomeExibicaoEstatisticaJogos(a))} <small>${escapeHtmlJogos(a.ano||'')}</small></span><strong>${a.minutos} min</strong></div>`).join('')}</div>`;
}
function renderListaGolsJogos(lista){
 if(!lista||!lista.length)return '<div class="estat-vazio">Nenhum gol registrado.</div>';
 return `<div class="estat-lista-atletas">${lista.map(a=>{const detalhe=escapeHtmlJogos(detalhesEventoJogoTexto(a.golsDetalhes,'gol'));return `<div class="estat-atleta-row"><span>${escapeHtmlJogos(nomeExibicaoEstatisticaJogos(a))} <small>${escapeHtmlJogos(a.ano||'')}</small></span><strong class="estat-tooltip" data-tooltip="${detalhe}">${a.gols} gol${a.gols>1?'s':''}</strong></div>`;}).join('')}</div>`;
}
function renderListaCartoesJogos(lista){
 if(!lista||!lista.length)return '<div class="estat-vazio">Nenhum cartão registrado.</div>';
 return `<div class="estat-lista-atletas">${lista.map(a=>{const detCA=escapeHtmlJogos(detalhesEventoJogoTexto(a.amareloDetalhes,'CA'));const detCV=escapeHtmlJogos(detalhesEventoJogoTexto(a.vermelhoDetalhes,'CV'));return `<div class="estat-atleta-row"><span>${escapeHtmlJogos(nomeExibicaoEstatisticaJogos(a))} <small>${escapeHtmlJogos(a.ano||'')}</small></span><strong>${a.amarelo>0?`<em class="estat-ca estat-tooltip" data-tooltip="${detCA}">CA ${a.amarelo}</em>`:`<em class="estat-ca">CA 0</em>`} ${a.vermelho>0?`<em class="estat-cv estat-tooltip" data-tooltip="${detCV}">CV ${a.vermelho}</em>`:`<em class="estat-cv">CV 0</em>`}</strong></div>`;}).join('')}</div>`;
}
function renderEstatisticasJogosProfessor(stats){
 const detVitorias=escapeHtmlJogos(detalhesResultadoJogosTexto(stats.vitoriasDetalhes));
 const detEmpates=escapeHtmlJogos(detalhesResultadoJogosTexto(stats.empatesDetalhes));
 const detDerrotas=escapeHtmlJogos(detalhesResultadoJogosTexto(stats.derrotasDetalhes));
 return `<div class="jogos-estatisticas-card"><h3>Estatísticas</h3><div class="jogos-estatisticas-grid"><div><strong>${stats.total}</strong><span>Total de jogos</span></div><div class="estat-tooltip" data-tooltip="${detVitorias}"><strong>${stats.vitorias}</strong><span>Vitórias</span></div><div class="estat-tooltip" data-tooltip="${detDerrotas}"><strong>${stats.derrotas}</strong><span>Derrotas</span></div><div class="estat-tooltip" data-tooltip="${detEmpates}"><strong>${stats.empates}</strong><span>Empates</span></div><div><strong>${stats.golsFeitos}</strong><span>Gols feitos</span></div><div><strong>${stats.golsSofridos}</strong><span>Gols sofridos</span></div></div><div class="jogos-estatisticas-detalhes"><div class="estat-detalhe-card"><h4>Atletas com mais tempo</h4>${renderListaMinutosJogos(stats.maisMinutos,'mais')}</div><div class="estat-detalhe-card"><h4>Atletas com menos tempo</h4>${renderListaMinutosJogos(stats.menosMinutos,'menos')}</div><div class="estat-detalhe-card"><h4>Atletas com gols</h4>${renderListaGolsJogos(stats.goleadores)}</div><div class="estat-detalhe-card"><h4>Cartões amarelos e vermelhos</h4>${renderListaCartoesJogos(stats.cartoes)}</div></div></div>`;
}

function renderBotaoRelatorioJogosProfessor(habilitado=true){
 return `<div class="relatorio-jogos-area"><button class="relatorio-jogos-btn" onclick="abrirRelatorioJogosProfessor()" ${habilitado?'':'disabled'}><i class="fa-solid fa-clipboard-list"></i> Relatório de Jogos</button></div>`;
}
function relatorioJogosGrupoPosicao(row){
 const p=String(posicaoAtletaJogos(row)||'').toLowerCase();
 if(p.includes('goleiro'))return 'Goleiros';
 if(p.includes('zagueiro'))return 'Zagueiros';
 if(p.includes('lateral')&&(p.includes('dir')||p.includes('direito')))return 'Lateral Dir.';
 if(p.includes('lateral')&&(p.includes('esq')||p.includes('esquerdo')))return 'Lateral Esq.';
 if(p.includes('lateral'))return 'Laterais';
 if(p.includes('volante'))return 'Volantes';
 if(p.includes('meia'))return 'Meias';
 if(p.includes('atacante'))return 'Atacantes';
 if((p.includes('extremo')||p.includes('ponta'))&&(p.includes('dir')||p.includes('direito')))return 'Ponta Dir.';
 if((p.includes('extremo')||p.includes('ponta'))&&(p.includes('esq')||p.includes('esquerdo')))return 'Ponta Esq.';
 if(p.includes('extremo')||p.includes('ponta'))return 'Extremos';
 return 'Outros';
}
function relatorioJogosOrdemPosicao(grupo){
 const ordem=['Goleiros','Zagueiros','Lateral Dir.','Lateral Esq.','Laterais','Volantes','Meias','Atacantes','Ponta Dir.','Ponta Esq.','Extremos','Outros'];
 const i=ordem.indexOf(grupo);return i<0?99:i;
}
function relatorioJogosClassePosicao(grupo){
 const map={'Goleiros':'pos-goleiros','Zagueiros':'pos-zagueiros','Lateral Dir.':'pos-laterais','Lateral Esq.':'pos-laterais','Laterais':'pos-laterais','Volantes':'pos-volantes','Meias':'pos-meias','Atacantes':'pos-atacantes','Ponta Dir.':'pos-extremos','Ponta Esq.':'pos-extremos','Extremos':'pos-extremos','Outros':'pos-outros'};
 return map[grupo]||'pos-outros';
}
function relatorioJogosZonaCampo(grupo){
 const zonas={
  // Linha defensiva: zagueiros sempre abaixo dos goleiros
  'Goleiros':{l:24,t:2,w:52,h:8},
  'Zagueiros':{l:27,t:12,w:46,h:18},

  // Laterais nas faixas, abaixo dos zagueiros
  'Lateral Dir.':{l:2,t:31,w:27,h:22},
  'Lateral Esq.':{l:71,t:31,w:27,h:22},
  'Laterais':{l:32,t:31,w:36,h:14},

  // Corredor central em sequência vertical, sem sobreposição
  'Volantes':{l:32,t:34,w:36,h:18},
  'Meias':{l:32,t:53,w:36,h:18},
  'Atacantes':{l:32,t:72,w:36,h:12},

  // Pontas/extremos abaixo dos laterais
  'Ponta Dir.':{l:3,t:64,w:27,h:26},
  'Ponta Esq.':{l:70,t:64,w:27,h:26},
  'Extremos':{l:32,t:84,w:36,h:10},
  'Outros':{l:32,t:93,w:36,h:7}
 };
 return zonas[grupo]||zonas['Outros'];
}
function relatorioJogosLayoutCards(grupo){
 if(grupo==='Goleiros')return 'layout-row';
 if(['Zagueiros','Volantes','Meias','Atacantes','Laterais','Extremos','Outros'].includes(grupo))return 'layout-2';
 if(['Lateral Dir.','Lateral Esq.','Ponta Dir.','Ponta Esq.'].includes(grupo))return 'layout-1';
 return 'layout-2';
}
function relatorioJogosAno(jogos){
 const anos=[...(new Set((jogos||[]).map(j=>String(j.dados?.data_iso||j.dados?.data||'').match(/(20\d{2})/)?.[1]).filter(Boolean)))];
 if(anos.length===1)return anos[0];
 if(anos.length>1)return anos.join(' / ');
 return String(new Date().getFullYear());
}
function relatorioJogosTotalMinutos(jogos){
 return (jogos||[]).reduce((s,j)=>{
  const min=parseInt(j.dados?.minutos_jogo??0,10);
  if(!isNaN(min)&&min>0)return s+min;
  const atletas=j.dados?.atletas||[];
  const maxAtleta=Math.max(0,...atletas.map(a=>parseInt(a.minutos||0,10)||0));
  return s+maxAtleta;
 },0);
}
function relatorioJogosAtletasMinutagem(jogos){
 const mapa={};
 (jogos||[]).forEach(j=>{
  (j.dados?.atletas||[]).forEach(a=>{
   const min=parseInt(a.minutos||0,10)||0;
   if(min<=0)return;
   const idx=localizarAtletaSalvoEmJogo(a);
   if(idx<0)return; // não mostra atletas que já foram excluídos do banco principal
   const key=chaveAtletaEstatisticaJogos(a);
   if(!mapa[key]){
    const row=excelData[idx]||{};
    const grupo=relatorioJogosGrupoPosicao(row);
    mapa[key]={apelido:a.apelido||a.nomeCompleto||'Atleta',nomeCompleto:a.nomeCompleto||'',ano:a.ano||'',nascimento:a.nascimento||'',minutos:0,grupo};
   }
   mapa[key].minutos+=min;
  });
 });
 return Object.values(mapa).sort((a,b)=>relatorioJogosOrdemPosicao(a.grupo)-relatorioJogosOrdemPosicao(b.grupo)||b.minutos-a.minutos||a.apelido.localeCompare(b.apelido,'pt-BR'));
}
function relatorioJogosTabelaResultados(titulo,lista,classe){
 const itens=lista||[];
 if(!itens.length)return `<div class="rj-result-box ${classe}"><h4>${titulo}</h4><table><tr><td colspan="2">-</td></tr></table></div>`;
 const maxLinhas=7;
 const colunas=[];
 for(let i=0;i<itens.length;i+=maxLinhas)colunas.push(itens.slice(i,i+maxLinhas));
 const tabelas=colunas.map(col=>`<table>${col.map(j=>`<tr><td>CFA Prosol ${j.gf} x ${j.gs} ${escapeHtmlJogos(j.adversario||'Adversário')}</td></tr>`).join('')}</table>`).join('');
 return `<div class="rj-result-box ${classe}"><h4>${titulo}</h4><div class="rj-result-cols cols-${Math.min(colunas.length,4)}">${tabelas}</div></div>`;
}
function simboloCartaoRelatorio(cor){
 const cls=cor==='amarelo'?'rj-card-yellow':'rj-card-red';
 return `<i class="${cls}"></i>`;
}
function relatorioJogosListaCompacta(lista,tipo){
 if(!lista||!lista.length)return '<div class="rj-list-cols cols-1"><table><tr><td colspan="2">-</td></tr></table></div>';
 const maxLinhas=10;
 const colunas=[];
 for(let i=0;i<lista.length;i+=maxLinhas)colunas.push(lista.slice(i,i+maxLinhas));
 const tabelas=colunas.map(col=>`<table>${col.map(a=>{
  if(tipo==='min')return `<tr><td>${escapeHtmlJogos(nomeExibicaoEstatisticaJogos(a))}</td><td>${a.minutos} min</td></tr>`;
  if(tipo==='gol')return `<tr><td>${escapeHtmlJogos(nomeExibicaoEstatisticaJogos(a))}</td><td>${a.gols}</td></tr>`;
  return `<tr><td>${escapeHtmlJogos(nomeExibicaoEstatisticaJogos(a))}</td><td>${a.amarelo} ${simboloCartaoRelatorio('amarelo')} / ${a.vermelho} ${simboloCartaoRelatorio('vermelho')}</td></tr>`;
 }).join('')}</table>`).join('');
 return `<div class="rj-list-cols cols-${Math.min(colunas.length,4)}">${tabelas}</div>`;
}
function montarRelatorioJogosMarkup(jogos,professor){
 const stats=calcularEstatisticasJogosProfessor(jogos);
 const ano=relatorioJogosAno(jogos);
 const totalMin=relatorioJogosTotalMinutos(jogos);
 const aproveitamento=stats.total?(((stats.vitorias*3+stats.empates)/(stats.total*3))*100).toFixed(1).replace('.',',')+'%':'0%';
 const atletasCampo=relatorioJogosAtletasMinutagem(jogos);
 const grupos={};
 atletasCampo.forEach(a=>{if(!grupos[a.grupo])grupos[a.grupo]=[];grupos[a.grupo].push(a);});
 const campo=Object.keys(grupos).sort((a,b)=>relatorioJogosOrdemPosicao(a)-relatorioJogosOrdemPosicao(b)).map(grupo=>{
  const z=relatorioJogosZonaCampo(grupo);
  const cards=grupos[grupo].map(a=>`<em class="${relatorioJogosClassePosicao(grupo)}"><b>${a.minutos}</b><span>${escapeHtmlJogos(a.apelido)}</span></em>`).join('');
  return `<div class="rj-zone" style="left:${z.l}%;top:${z.t}%;width:${z.w}%;height:${z.h}%"><div class="rj-cards ${relatorioJogosLayoutCards(grupo)}">${cards}</div></div>`;
 }).join('');
 const topMais=stats.maisMinutos.slice(0,10);
 const topMenos=stats.menosMinutos.slice(0,10);
 const style=`<style>@page{size:A4 portrait;margin:4mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;margin:0;color:#111;background:#fff;font-weight:400}.rj-page{width:202mm;height:289mm;margin:0 auto;padding:1.5mm 3mm;overflow:hidden}.rj-head{display:grid;grid-template-columns:23mm 1fr 23mm;align-items:center;height:24mm}.rj-head img{width:18mm;margin:auto}.rj-title{text-align:center}.rj-title h1{font-size:23.7px;margin:0 0 2px;font-weight:700}.rj-title h2{font-size:16.9px;margin:0;font-weight:900}.rj-campo{height:142mm;width:101mm;margin:2mm auto 0;border:2px solid #3e7d2b;background:#4b8f3c url('base_campo_relatorio.png') center/100% 100% no-repeat;position:relative;overflow:hidden}.rj-zone{position:absolute;z-index:2;display:flex;align-items:center;justify-content:center;overflow:visible}.rj-cards{display:flex;flex-wrap:wrap;gap:.75mm;align-items:center;justify-content:center;max-height:100%;overflow:visible}.rj-cards.layout-1{display:grid;grid-template-columns:1fr;align-content:center;justify-items:center}.rj-cards.layout-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-content:center;justify-items:center}.rj-cards.layout-row{display:flex;flex-wrap:nowrap;justify-content:center;align-items:center}.rj-cards em{font-style:normal;border-radius:3px;padding:.55mm 1mm;min-width:16mm;max-width:25mm;text-align:center;font-size:9.4px;line-height:1.05;color:#111;font-weight:400;box-shadow:0 1px 2px rgba(0,0,0,.25)}.rj-cards em b{display:block;font-size:11.1px;font-weight:400}.rj-cards em span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pos-goleiros{background:#d9edf7}.pos-zagueiros{background:#c9e7ff}.pos-laterais{background:#bdefff}.pos-volantes{background:#d8c5f2}.pos-meias{background:#9ee071}.pos-atacantes{background:#ffd21f}.pos-extremos{background:#f4a6a6}.pos-outros{background:#ddd}.rj-summary{display:grid;grid-template-columns:repeat(8,1fr);gap:1mm;margin:1.4mm 0}.rj-summary div{border:1px solid #111;text-align:center;font-size:9.1px;padding:.65mm;background:#f6f6f6;font-weight:400}.rj-summary b{display:block;font-size:12.5px;font-weight:400}.rj-results{display:flex;gap:1mm;height:30mm;overflow:hidden;justify-content:center;align-items:flex-start}.rj-result-box{border:1px solid #111;overflow:hidden;flex:0 1 auto;width:max-content;max-width:120mm;min-width:36mm;background:#fff}.rj-result-box h4{margin:0;background:#58111a;color:#f9c614;font-size:10px;padding:.8mm;text-align:center;font-weight:400}.rj-result-box table,.rj-lists table{width:100%;border-collapse:collapse;font-size:8.6px;font-weight:400}.rj-result-cols{display:flex;gap:.6mm;align-items:flex-start;width:100%}.rj-result-cols table{width:auto;min-width:max-content;flex:0 0 auto}.rj-result-cols.cols-1{display:block;width:100%}.rj-result-cols.cols-1 table{width:100%;min-width:100%;table-layout:auto}.rj-list-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:.6mm;align-items:flex-start;width:100%;overflow:hidden}.rj-list-cols table{width:100%!important;min-width:0;table-layout:auto}.rj-list-cols.cols-1{display:block;width:100%}.rj-list-cols.cols-1 table{width:100%!important;min-width:100%;table-layout:auto}.rj-list-cols td:first-child{width:auto}.rj-list-cols td:last-child{width:8mm;text-align:center}.rj-result-box td,.rj-lists td{border:1px solid #333;padding:.42mm;line-height:1.06;font-weight:400}.rj-result-box td{white-space:nowrap;padding-left:.65mm;padding-right:.65mm}.rj-lists td{white-space:nowrap}.rj-result-box tr td:last-child{border-right:1px solid #333}.rj-result-box table{border-right:1px solid #333}.rj-card-yellow,.rj-card-red{display:inline-block;width:3.2mm;height:4.4mm;border-radius:.5mm;vertical-align:-.7mm;border:1px solid #111}.rj-card-yellow{background:#f1c40f}.rj-card-red{background:#d63031}.rj-lists{display:grid;grid-template-columns:repeat(4,1fr);gap:1mm;margin-top:1mm;height:61mm;overflow:hidden}.rj-lists>div{border:1px solid #111;overflow:hidden}.rj-lists h4{margin:0;background:#d00000;color:#fff;font-size:9.8px;text-align:center;padding:.8mm;font-weight:400}.rj-lists .green h4{background:#009245}.rj-lists .black h4{background:#111}.rj-lists .yellow h4{background:#f1c40f;color:#111}.rj-lists tbody{vertical-align:top}.rj-foot{font-size:9.1px;font-weight:400;text-align:center;margin-top:.8mm;color:#555}</style>`;
 const body=`<div class="rj-page"><div class="rj-head"><img src="logo.png"><div class="rj-title"><h1>Relatório de Jogos - ${escapeHtmlJogos(professor)}</h1><h2>${ano}</h2></div><img src="logo.png"></div><div class="rj-campo">${campo||'<p style="text-align:center;color:#fff;font-weight:bold">Sem atletas com minutagem.</p>'}</div><div class="rj-summary"><div><b>${stats.total}</b>Jogos</div><div><b>${stats.vitorias}</b>Vitórias</div><div><b>${stats.empates}</b>Empates</div><div><b>${stats.derrotas}</b>Derrotas</div><div><b>${totalMin}'</b>Minutos</div><div><b>${aproveitamento}</b>Aproveitamento</div><div><b>${stats.golsFeitos}</b>Gols feitos</div><div><b>${stats.golsSofridos}</b>Gols sofridos</div></div><div class="rj-results">${relatorioJogosTabelaResultados('Vitórias',stats.vitoriasDetalhes,'win')}${relatorioJogosTabelaResultados('Empates',stats.empatesDetalhes,'draw')}${relatorioJogosTabelaResultados('Derrotas',stats.derrotasDetalhes,'loss')}</div><div class="rj-lists"><div class="green"><h4>Top 10 atletas mais tempo</h4>${relatorioJogosListaCompacta(topMais,'min')}</div><div><h4>Top 10 atletas menos tempo</h4>${relatorioJogosListaCompacta(topMenos,'min')}</div><div class="black"><h4>Gols</h4>${relatorioJogosListaCompacta(stats.goleadores,'gol')}</div><div class="yellow"><h4>Cartões</h4>${relatorioJogosListaCompacta(stats.cartoes,'cartao')}</div></div><div class="rj-foot">CFA Prosol • Relatório gerado automaticamente</div></div>`;
 return {style,body,title:`Relatório de Jogos - ${professor}`};
}

function pdfRelatorioCorGrupo(grupo){
 const map={'Goleiros':[217,237,247],'Zagueiros':[201,231,255],'Lateral Dir.':[189,239,255],'Lateral Esq.':[189,239,255],'Laterais':[189,239,255],'Volantes':[216,197,242],'Meias':[158,224,113],'Atacantes':[255,210,31],'Ponta Dir.':[244,166,166],'Ponta Esq.':[244,166,166],'Extremos':[244,166,166],'Outros':[221,221,221]};
 return map[grupo]||map['Outros'];
}
function pdfRelatorioLoadImage(src){
 return new Promise(resolve=>{
  const img=new Image();
  img.onload=()=>{try{const c=document.createElement('canvas');c.width=img.naturalWidth||img.width;c.height=img.naturalHeight||img.height;c.getContext('2d').drawImage(img,0,0);resolve(c.toDataURL('image/png'));}catch(e){resolve(null);}};
  img.onerror=()=>resolve(null);
  img.src=src;
 });
}
function pdfRelatorioResultadoLinhas(lista){
 return (lista||[]).map(j=>`CFA Prosol ${j.gf} x ${j.gs} ${j.adversario||'Adversário'}`);
}
function pdfRelatorioDrawBoxTable(doc,x,y,w,h,title,rows,opts={}){
 const header=opts.header||[88,17,26], headerText=opts.headerText||[249,198,20], fontSize=opts.fontSize||5.3, rowH=opts.rowH||3.2;
 doc.setDrawColor(0);doc.setLineWidth(.18);doc.rect(x,y,w,h);
 doc.setFillColor(...header);doc.rect(x,y,w,4.3,'F');
 doc.setTextColor(...headerText);doc.setFont('helvetica','normal');doc.setFontSize(opts.headerSize||7);doc.text(title,x+w/2,y+3,{align:'center'});
 doc.setTextColor(0);doc.setFont('helvetica','normal');doc.setFontSize(fontSize);
 if(!rows||!rows.length)rows=['-'];
 const maxRows=Math.max(1,Math.floor((h-4.6)/rowH));
 const cols=[];for(let i=0;i<rows.length;i+=maxRows)cols.push(rows.slice(i,i+maxRows));
 const colW=w/cols.length;
 cols.forEach((col,ci)=>{let yy=y+4.3;col.forEach(r=>{doc.rect(x+ci*colW,yy,colW,rowH);if(Array.isArray(r)){doc.text(String(r[0]||''),x+ci*colW+.7,yy+2.25);doc.text(String(r[1]||''),x+(ci+1)*colW-.7,yy+2.25,{align:'right'});}else{doc.text(doc.splitTextToSize(String(r),colW-1.4)[0]||'',x+ci*colW+.7,yy+2.25);}yy+=rowH;});});
}
async function gerarRelatorioJogosPDFMobileDireto(jogos,professor){
 const Ctor=window.jspdf&&window.jspdf.jsPDF;if(!Ctor)return false;
 const doc=new Ctor({orientation:'portrait',unit:'mm',format:'a4',compress:true});
 const stats=calcularEstatisticasJogosProfessor(jogos), ano=relatorioJogosAno(jogos), totalMin=relatorioJogosTotalMinutos(jogos);
 const aproveitamento=stats.total?(((stats.vitorias*3+stats.empates)/(stats.total*3))*100).toFixed(1).replace('.',',')+'%':'0%';
 const logo=await pdfRelatorioLoadImage('logo.png'); const campoImg=await pdfRelatorioLoadImage('base_campo_relatorio.png')||await pdfRelatorioLoadImage('BASE CAMPO.png');
 const W=210,H=297;if(logo){doc.addImage(logo,'PNG',13,5,18,18);doc.addImage(logo,'PNG',179,5,18,18);}doc.setTextColor(15);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text(`Relatório de Jogos - ${professor}`,W/2,12,{align:'center'});doc.setFontSize(10);doc.text(String(ano),W/2,18,{align:'center'});
 const fx=55,fy=24,fw=100,fh=150;if(campoImg)doc.addImage(campoImg,'PNG',fx,fy,fw,fh);else{doc.setFillColor(75,143,60);doc.rect(fx,fy,fw,fh,'F');}
 const atletas=relatorioJogosAtletasMinutagem(jogos), grupos={};atletas.forEach(a=>{(grupos[a.grupo]||(grupos[a.grupo]=[])).push(a);});
 Object.keys(grupos).sort((a,b)=>relatorioJogosOrdemPosicao(a)-relatorioJogosOrdemPosicao(b)).forEach(grupo=>{const z=relatorioJogosZonaCampo(grupo), arr=grupos[grupo], color=pdfRelatorioCorGrupo(grupo);const zx=fx+z.l/100*fw,zy=fy+z.t/100*fh,zw=z.w/100*fw,zh=z.h/100*fh;let cols=2;if(['Lateral Dir.','Lateral Esq.','Ponta Dir.','Ponta Esq.'].includes(grupo))cols=1;if(grupo==='Goleiros')cols=arr.length;cols=Math.max(1,cols);const gap=.7,cw=Math.min(cols===1?22:(zw-(cols-1)*gap)/cols,24),ch=6.4,rows=Math.ceil(arr.length/cols),totalH=rows*ch+(rows-1)*gap,startY=zy+Math.max(0,(zh-totalH)/2);arr.forEach((a,i)=>{const c=i%cols,r=Math.floor(i/cols),rowCount=(r===rows-1)?arr.length-r*cols:cols,totalW=rowCount*cw+(rowCount-1)*gap,startX=zx+Math.max(0,(zw-totalW)/2),x=startX+c*(cw+gap),y=startY+r*(ch+gap);doc.setFillColor(...color);doc.roundedRect(x,y,cw,ch,1,1,'F');doc.setTextColor(0);doc.setFont('helvetica','bold');doc.setFontSize(5.4);doc.text(String(a.minutos),x+cw/2,y+2.2,{align:'center'});doc.setFont('helvetica','normal');doc.setFontSize(5.0);doc.text(doc.splitTextToSize(a.apelido,cw-1)[0]||'',x+cw/2,y+5,{align:'center'});});});
 const sy=fy+fh+3,sx=8,sw=(W-16-7*1.2)/8,sh=8;[['Jogos',stats.total],['Vitórias',stats.vitorias],['Empates',stats.empates],['Derrotas',stats.derrotas],['Minutos',`${totalMin}'`],['Aproveit.',aproveitamento],['Gols feitos',stats.golsFeitos],['Gols sofridos',stats.golsSofridos]].forEach((it,i)=>{const x=sx+i*(sw+1.2);doc.rect(x,sy,sw,sh);doc.setFont('helvetica','normal');doc.setFontSize(6.3);doc.text(String(it[1]),x+sw/2,sy+3,{align:'center'});doc.setFontSize(4.7);doc.text(String(it[0]),x+sw/2,sy+6.4,{align:'center'});});
 const ry=sy+11,rh=30,rw=(W-16-2*1.5)/3;pdfRelatorioDrawBoxTable(doc,8,ry,rw,rh,'Vitórias',pdfRelatorioResultadoLinhas(stats.vitoriasDetalhes));pdfRelatorioDrawBoxTable(doc,8+rw+1.5,ry,rw,rh,'Empates',pdfRelatorioResultadoLinhas(stats.empatesDetalhes));pdfRelatorioDrawBoxTable(doc,8+2*(rw+1.5),ry,rw,rh,'Derrotas',pdfRelatorioResultadoLinhas(stats.derrotasDetalhes));
 const ly=ry+33,lh=54,lw=(W-16-3*1.5)/4;pdfRelatorioDrawBoxTable(doc,8,ly,lw,lh,'Top 10 atletas mais tempo',stats.maisMinutos.slice(0,10).map(a=>[nomeExibicaoEstatisticaJogos(a),`${a.minutos} min`]),{header:[0,146,69],headerText:[255,255,255]});pdfRelatorioDrawBoxTable(doc,8+lw+1.5,ly,lw,lh,'Top 10 atletas menos tempo',stats.menosMinutos.slice(0,10).map(a=>[nomeExibicaoEstatisticaJogos(a),`${a.minutos} min`]),{header:[208,0,0],headerText:[255,255,255]});pdfRelatorioDrawBoxTable(doc,8+2*(lw+1.5),ly,lw,lh,'Gols',stats.goleadores.map(a=>[nomeExibicaoEstatisticaJogos(a),String(a.gols)]),{header:[0,0,0],headerText:[255,255,255]});pdfRelatorioDrawBoxTable(doc,8+3*(lw+1.5),ly,lw,lh,'Cartões',stats.cartoes.map(a=>[nomeExibicaoEstatisticaJogos(a),`${a.amarelo} CA / ${a.vermelho} CV`]),{header:[241,196,15],headerText:[0,0,0],fontSize:5.0});
 doc.setFontSize(6);doc.setTextColor(80);doc.text('CFA Prosol • Relatório gerado automaticamente',W/2,H-5,{align:'center'});
 const filename=prosolSanitizeFilename(`Relatório de Jogos - ${professor}`)+'.pdf';const blob=doc.output('blob');const file=new File([blob],filename,{type:'application/pdf'});if(navigator.canShare&&navigator.canShare({files:[file]}))await navigator.share({files:[file],title:`Relatório de Jogos - ${professor}`,text:'Relatório de Jogos CFA Prosol'});else doc.save(filename);return true;
}
async function abrirRelatorioJogosProfessor(){
 const professor=professorJogosAtual||'Geral';
 const {data,error}=await _supabase.from('jogos').select('id,professor,numero_jogo,nome,dados,criado_em').eq('professor',professor).order('numero_jogo',{ascending:true});
 if(error){console.error(error);alert('Erro ao carregar jogos para o relatório.');return;}
 if(!data||!data.length){alert('Nenhum jogo salvo para gerar relatório.');return;}
 if(typeof prosolIsMobile==='function'&&prosolIsMobile()&&window.jspdf&&window.jspdf.jsPDF){try{if(await gerarRelatorioJogosPDFMobileDireto(data,professor))return;}catch(e){console.error('Falha no PDF direto mobile:',e);}}
 const {style,body,title}=montarRelatorioJogosMarkup(data,professor);
 const w=window.open('','_blank','width=900,height=1100');if(!w)return alert('Permita pop-ups para gerar o relatório.');
 w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${style}</head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);w.document.close();
}
async function salvarJogoSupabase(){
 const professor=professorJogosAtual||'Geral';
 const editando=window.__jogoEditandoAtual||null;
 const dataISO=textoValorJogo('#novo-jogo-modal .jogo-data-input');
 const dataBR=formatarDataJogoBR(dataISO);
 const adversario=textoValorJogo('#novo-jogo-modal .jogo-adversario-top');
 const placarProsol=numeroValorJogo('#novo-jogo-modal .jogo-placar-prosol');
 const placarAdversario=numeroValorJogo('#novo-jogo-modal .jogo-placar-adversario');
 if(!dataISO)return alert('Informe a data do jogo antes de salvar.');
 if(!adversario)return alert('Informe o adversário antes de salvar.');
 let numeroJogo;
 try{numeroJogo=editando&&editando.numero_jogo?editando.numero_jogo:await proximoNumeroJogoProfessor(professor);}catch(error){
  console.error(error);
  alert('Não foi possível acessar a tabela jogos no Supabase. Crie a tabela jogos antes de salvar.');
  return;
 }
 const nomeJogo=`Jogo ${numeroJogo} - ${dataBR} - CFA Prosol ${placarProsol} x ${placarAdversario} ${adversario}`;
 const conv=getConvocacaoJogoAtual();
 const dados={
  professor,
  numero_jogo:numeroJogo,
  nome:nomeJogo,
  tipo:textoValorJogo('#novo-jogo-modal .jogo-tipo-select'),
  data:dataBR,
  data_iso:dataISO,
  local:textoValorJogo('#novo-jogo-modal .jogo-local-select'),
  adversario,
  caracteristica:textoValorJogo('#novo-jogo-modal .jogo-caracteristica-select'),
  minutos_jogo:numeroValorJogo('#novo-jogo-modal .jogo-minutos-input'),
  placar:{cfa_prosol:placarProsol,adversario:placarAdversario},
  convocacao:conv?{nome:conv.nome}:(editando&&editando.convocacaoNome?{nome:editando.convocacaoNome}:null),
  atletas:dadosAtletasJogo()
 };
 const payload={professor,numero_jogo:numeroJogo,nome:nomeJogo,dados,atualizado_em:new Date().toISOString()};
 let error;
 if(editando&&editando.id){
  ({error}=await _supabase.from('jogos').update(payload).eq('id',editando.id));
 }else{
  ({error}=await _supabase.from('jogos').insert(payload));
 }
 if(error){console.error(error);alert('Erro ao salvar jogo no Supabase. Verifique a tabela jogos e as permissões.');return;}
 alert(nomeJogo+(editando?' atualizado':' salvo')+' com sucesso!');
 const modal=document.getElementById('novo-jogo-modal');if(modal)modal.style.display='none';
 renderJogosScreen();
}
async function abrirCarregarJogoSalvoModal(){
 const professor=professorJogosAtual||'Geral';
 const {data,error}=await _supabase.from('jogos').select('id,numero_jogo,nome,dados,criado_em').eq('professor',professor).order('numero_jogo',{ascending:false});
 if(error){alert('Erro ao carregar jogos salvos. Verifique a tabela jogos no Supabase.');console.error(error);return;}
 if(!data||!data.length){alert('Nenhum jogo salvo para este professor.');return;}
 window.__jogosSalvosCarregarTemp=data;
 let m=document.getElementById('carregar-jogo-salvo-modal');
 if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='carregar-jogo-salvo-modal';document.body.appendChild(m)}
 m.innerHTML=`<div class="buscar-convocacao-jogo-card"><div class="novo-jogo-title"><b>Carregar Jogo Salvo</b><button onclick="document.getElementById('carregar-jogo-salvo-modal').style.display='none'">×</button></div><div class="buscar-convocacao-jogo-body"><p>Selecione um jogo salvo para editar. Ao salvar, ele será atualizado no Supabase mantendo o mesmo número do jogo.</p><select id="jogo-salvo-select" size="10">${data.map(j=>`<option value="${j.id}">${j.nome}</option>`).join('')}</select><div class="buscar-convocacao-jogo-actions"><button onclick="confirmarCarregarJogoSalvo()">Carregar para Editar</button><button onclick="document.getElementById('carregar-jogo-salvo-modal').style.display='none'">Cancelar</button></div></div></div>`;
 m.style.display='flex';
}
function setValorCampoJogo(selector,valor){const el=document.querySelector(selector);if(el)el.value=valor??'';}
function localizarAtletaSalvoEmJogo(atletaSalvo){
 if(!atletaSalvo)return -1;
 let idx=localizarAtletaAtivoJogos({apelido:atletaSalvo.apelido,nascimento:atletaSalvo.nascimento,nomeCompleto:atletaSalvo.nomeCompleto,ano:atletaSalvo.ano});
 if(idx>=0)return idx;
 const nomeCompleto=String(atletaSalvo.nomeCompleto||'').trim();
 const nascimento=normalizarDataJogos(atletaSalvo.nascimento||'');
 const ano=String(atletaSalvo.ano||'').trim();
 if(nomeCompleto&&nascimento){idx=excelData.findIndex(row=>nomeCompletoAtletaJogos(row)===nomeCompleto&&nascimentoAtletaJogos(row)===nascimento);if(idx>=0)return idx;}
 if(nomeCompleto&&ano){idx=excelData.findIndex(row=>nomeCompletoAtletaJogos(row)===nomeCompleto&&anoAtletaJogos(row)===ano);if(idx>=0)return idx;}
 return -1;
}
function confirmarCarregarJogoSalvo(){
 const select=document.getElementById('jogo-salvo-select');
 if(!select||!select.value)return alert('Selecione um jogo salvo.');
 const jogo=(window.__jogosSalvosCarregarTemp||[]).find(j=>j.id===select.value);
 if(!jogo)return alert('Jogo não encontrado na lista carregada.');
 aplicarJogoSalvoParaEdicao(jogo);
 const m=document.getElementById('carregar-jogo-salvo-modal');if(m)m.style.display='none';
}
function aplicarJogoSalvoParaEdicao(jogo){
 const d=jogo.dados||{};
 window.__jogoConvocacaoAtual=null;
 window.__jogoEditandoAtual={id:jogo.id,numero_jogo:jogo.numero_jogo,nome:jogo.nome,convocacaoNome:d.convocacao&&d.convocacao.nome?d.convocacao.nome:''};
 setValorCampoJogo('#novo-jogo-modal .jogo-placar-prosol',d.placar?.cfa_prosol??0);
 setValorCampoJogo('#novo-jogo-modal .jogo-placar-adversario',d.placar?.adversario??0);
 setValorCampoJogo('#novo-jogo-modal .jogo-adversario-top',d.adversario||'');
 setValorCampoJogo('#novo-jogo-modal .jogo-data-input',d.data_iso||converterDataConvocacaoParaInput(d.data||''));
 setValorCampoJogo('#novo-jogo-modal .jogo-tipo-select',d.tipo||'Campeonato');
 setValorCampoJogo('#novo-jogo-modal .jogo-local-select',d.local||'Casa');
 setValorCampoJogo('#novo-jogo-modal .jogo-caracteristica-select',d.caracteristica||'Clube');
 setValorCampoJogo('#novo-jogo-modal .jogo-minutos-input',d.minutos_jogo||'');
 const indices=[];
 const statsMap={};
 const convocadosSet=new Set();
 (d.atletas||[]).forEach(a=>{
  const idx=localizarAtletaSalvoEmJogo(a);
  if(idx<0)return;
  indices.push(idx);
  statsMap[String(idx)]={minutos:a.minutos||0,gols:a.gols||0,amarelo:a.amarelo||0,vermelho:a.vermelho||0};
  if(a.convocado)convocadosSet.add(idx);
 });
 window.__jogoAtletasEditIndices=Array.from(new Set(indices));
 window.__jogoStatsEditMap=statsMap;
 window.__jogoConvocadosEditSet=convocadosSet;
 renderNovoJogoListaAtletas();
}


/* === MÓDULO RELATÓRIOS === */
function relatoriosAnosDisponiveis(){return ['2009','2010','2011','2012','2013','2014','2015','2016','2017'];}
function relatoriosTipos(){return {antropometricas:'Medidas Antropométricas',resistencia:'Resistência',potencia:'Potência',velocidade:'Velocidade',agilidade:'Agilidade',todos:'Todos'};}
function relatoriosMaxAvaliacao(){
 let max=1;
 (excelColumns||[]).forEach(col=>{const m=String(col).match(/^Data(\d+)$/i);if(m)max=Math.max(max,parseInt(m[1],10)||1);});
 return max;
}
function relatoriosValorColuna(row,termos){
 const chave=Object.keys(row||{}).find(k=>termos.some(t=>String(k).toLowerCase().trim()===String(t).toLowerCase().trim()));
 return chave?(row[chave]??''):'';
}
function relatoriosValorColunaFlex(row,termos){
 const chave=Object.keys(row||{}).find(k=>termos.some(t=>String(k).toLowerCase().includes(String(t).toLowerCase())));
 return chave?(row[chave]??''):'';
}
function relatoriosNomeAtleta(row){return relatoriosValorColunaFlex(row,['apelido'])||relatoriosValorColunaFlex(row,['nome completo','nome'])||'Sem Nome';}
function relatoriosAnoAtleta(row){return String(relatoriosValorColuna(row,['Ano'])||'').trim();}
function relatoriosNascimento(row){return convertExcelDate(relatoriosValorColunaFlex(row,['data de nascimento','nascimento']));}
function relatoriosNum(valor){
 if(valor===undefined||valor===null||valor==='-'||String(valor).trim()==='')return NaN;
 let s=String(valor).replace('%','').replace(/\s/g,'').replace(',','.');
 const n=parseFloat(s);
 return isNaN(n)?NaN:n;
}
function relatoriosDataSort(valor){
 const s=String(valor||'').trim();
 const m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
 if(m)return new Date(+m[3],+m[2]-1,+m[1]).getTime();
 const d=new Date(s);return isNaN(d)?0:d.getTime();
}
function relatoriosValorAvaliacao(row,base,evalNum){return valorAvaliacao(row,base,evalNum);}
function relatoriosMediaCampo(row,prefixo,evalNum){
 const vals=[];
 for(let i=1;i<=7;i++){
  const v=relatoriosNum(relatoriosValorAvaliacao(row,prefixo+i+'_',evalNum)||relatoriosValorAvaliacao(row,prefixo+i,evalNum));
  if(!isNaN(v))vals.push(v);
 }
 if(!vals.length)return '';
 return (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2).replace('.',',');
}
function relatoriosMelhorSalto(row,evalNum){
 const salvo=relatoriosValorAvaliacao(row,'MelhorSalto',evalNum); if(String(salvo||'').trim())return salvo;
 const vals=['Salto1_','Salto2_','Salto3_'].map(b=>relatoriosNum(relatoriosValorAvaliacao(row,b,evalNum))).filter(v=>!isNaN(v));
 return vals.length?String(Math.max(...vals)).replace('.',','):'';
}
function relatoriosAgilidade(row,evalNum){
 const salvo=relatoriosValorAvaliacao(row,'Agilidade',evalNum); if(String(salvo||'').trim())return salvo;
 const vals=['Volta1_','Volta2_'].map(b=>relatoriosNum(relatoriosValorAvaliacao(row,b,evalNum))).filter(v=>!isNaN(v));
 return vals.length?String(Math.min(...vals)).replace('.',','):'';
}
function relatoriosDistancia(row,evalNum){
 const dist=relatoriosValorAvaliacao(row,'distancia',evalNum); if(String(dist||'').trim())return dist;
 const nivel=relatoriosValorAvaliacao(row,'nivel',evalNum);
 return distanciaNivelResistencia(nivel)||'';
}
function relatoriosGordura(row,evalNum){
 const salvo=relatoriosValorAvaliacao(row,'PercentualGordura',evalNum); if(String(salvo||'').trim())return formatGordura(salvo);
 const nums=['Dobras1_','Dobras2_','Dobras3_','Dobras4_'].map(b=>relatoriosNum(relatoriosValorAvaliacao(row,b,evalNum)));
 if(nums.some(v=>isNaN(v)))return '';
 const soma=nums.reduce((a,b)=>a+b,0);
 return ((soma*0.153+5.783)).toFixed(2).replace('.',',')+'%';
}
function relatoriosAlturaPredita(row,evalNum){
 const salvo=relatoriosValorAvaliacao(row,'alturapredita',evalNum); if(String(salvo||'').trim())return String(salvo).replace('.',',');
 const nasc=relatoriosNascimento(row), dataAval=convertExcelDate(relatoriosValorAvaliacao(row,'Data',evalNum));
 const idade=relatoriosNum(calcularIdadeAvaliacao(nasc,dataAval));
 const peso=relatoriosNum(relatoriosValorAvaliacao(row,'peso',evalNum));
 const altura=relatoriosNum(relatoriosValorAvaliacao(row,'Altura',evalNum));
 const sentado=relatoriosNum(relatoriosValorAvaliacao(row,'alturasentado',evalNum));
 if([idade,peso,altura,sentado].some(v=>isNaN(v)||v<=0))return '';
 const r=alturaPreditaCalculada(idade,peso,altura,sentado);
 return r&&r.valor?(Math.floor(r.valor)/100).toFixed(2).replace('.',','):'';
}
function relatoriosColunas(tipo){
 const base=[{key:'nome',label:'Nome',type:'text'},{key:'nascimento',label:'Data de Nascimento',type:'date'}];
 if(tipo==='antropometricas')return base.concat([{key:'altura',label:'Altura',type:'num'},{key:'peso',label:'Peso',type:'num'},{key:'predita',label:'Altura Predita',type:'num'},{key:'gordura',label:'% de gordura',type:'num'}]);
 if(tipo==='resistencia')return base.concat([{key:'nivel',label:'Nível',type:'num'},{key:'distancia',label:'Distância',type:'num'}]);
 if(tipo==='potencia')return base.concat([{key:'salto1',label:'Salto 1',type:'num'},{key:'salto2',label:'Salto 2',type:'num'},{key:'salto3',label:'Salto 3',type:'num'},{key:'melhorSalto',label:'Melhor Salto',type:'num'}]);
 if(tipo==='velocidade')return base.concat([{key:'aceleracao',label:'Aceleração',type:'num'},{key:'velocidade',label:'Velocidade',type:'num'}]);
 if(tipo==='agilidade')return base.concat([{key:'agilidade',label:'Agilidade',type:'num'}]);
 return base.concat([{key:'peso',label:'Peso',type:'num'},{key:'altura',label:'Altura',type:'num'},{key:'predita',label:'Altura Predita',type:'num'},{key:'gordura',label:'% de Gordura',type:'num'},{key:'distancia',label:'Distância',type:'num'},{key:'melhorSalto',label:'Salto',type:'num'},{key:'aceleracao',label:'Aceleração',type:'num'},{key:'velocidade',label:'Velocidade',type:'num'},{key:'agilidade',label:'Agilidade',type:'num'}]);
}
function relatoriosLinha(row,evalNum){
 const aceleracao=relatoriosValorAvaliacao(row,'Aceleraçãofinal',evalNum)||relatoriosMediaCampo(row,'aceleração',evalNum);
 const velocidade=relatoriosValorAvaliacao(row,'Velocidadefinal',evalNum)||relatoriosMediaCampo(row,'velocidade',evalNum);
 return {
  ano:relatoriosAnoAtleta(row),
  nome:relatoriosNomeAtleta(row),
  nascimento:relatoriosNascimento(row),
  altura:relatoriosValorAvaliacao(row,'Altura',evalNum),
  peso:relatoriosValorAvaliacao(row,'peso',evalNum),
  predita:relatoriosAlturaPredita(row,evalNum),
  gordura:relatoriosGordura(row,evalNum),
  nivel:relatoriosValorAvaliacao(row,'nivel',evalNum),
  distancia:relatoriosDistancia(row,evalNum),
  salto1:relatoriosValorAvaliacao(row,'Salto1_',evalNum),
  salto2:relatoriosValorAvaliacao(row,'Salto2_',evalNum),
  salto3:relatoriosValorAvaliacao(row,'Salto3_',evalNum),
  melhorSalto:relatoriosMelhorSalto(row,evalNum),
  aceleracao:aceleracao,
  velocidade:velocidade,
  agilidade:relatoriosAgilidade(row,evalNum)
 };
}
function openRelatoriosModal(){
 document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active-screen');s.style.display='';});
 document.getElementById('home-screen')?.classList.add('active-screen');
 let m=document.getElementById('relatorios-modal');
 if(!m){m=document.createElement('div');m.className='relatorios-overlay';m.id='relatorios-modal';document.body.appendChild(m);}
 const tipos=relatoriosTipos();
 const maxEval=relatoriosMaxAvaliacao();
 window.__relatoriosSort={key:'anoNome',dir:'asc'};
 window.__relatorioAtletaSelecionadoIndex=null;
 m.innerHTML=`<div class="relatorios-card"><div class="relatorios-top"><div class="relatorios-left"><select id="relatorio-tipo-select" onchange="relatoriosResetSort();renderRelatoriosTabela()">${Object.keys(tipos).map(k=>`<option value="${k}" ${k==='todos'?'selected':''}>${tipos[k]}</option>`).join('')}</select></div><h2 id="relatorios-titulo">Todos</h2><div class="relatorios-anos">${relatoriosAnosDisponiveis().map(a=>`<label><input type="checkbox" class="relatorio-ano-chk" value="${a}" onchange="renderRelatoriosTabela()"> ${a}</label>`).join('')}</div><div class="relatorios-actions"><button onclick="closeRelatoriosModal()">Fechar</button><button onclick="exportarRelatorioPDF()">PDF</button></div></div><div class="relatorios-table-wrap"><table id="relatorios-table"><thead><tr id="relatorios-head"></tr></thead><tbody id="relatorios-body"></tbody></table></div><div class="relatorios-bottom"><select id="relatorio-eval-select" onchange="renderRelatoriosTabela()">${Array.from({length:maxEval},(_,i)=>i+1).map(n=>`<option value="${n}" ${n===maxEval?'selected':''}>Avaliação ${n}</option>`).join('')}</select><button id="btn-relatorio-individual" class="relatorio-individual-btn" onclick="gerarRelatorioFisicoIndividual()" disabled>Relatório Físico Individual</button></div></div>`;
 m.style.display='flex';
 renderRelatoriosTabela();
}
function closeRelatoriosModal(){const m=document.getElementById('relatorios-modal');if(m)m.style.display='none';}

/* === MENU RELATÓRIOS + TRABALHO DIÁRIO === */
const TRABALHOS_DIARIOS_BUCKET = 'trabalhos-diarios';
let trabalhoDiarioEstado = {};
let trabalhoDiarioAtletasModal = { categoriaId: null, filtroAno: 'todos', busca: '' };

function categoriasTrabalhoDiarioConfig(){
 return {
  sub11:{label:'Sub 11',anos:['2015','2016','2017','2018']},
  sub12:{label:'Sub 12',anos:['2014']},
  sub13:{label:'Sub 13',anos:['2013']},
  sub16:{label:'Sub 16',anos:['2012','2011','2010','2009']}
 };
}
function trabalhoDataLocalISO(data){
 const d=new Date(data);
 if(isNaN(d))return '';
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function trabalhoParseDataReferencia(valor){
 const s=String(valor||'');
 let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(m)return new Date(+m[1],+m[2]-1,+m[3]);
 m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
 if(m)return new Date(+m[3],+m[2]-1,+m[1]);
 const d=new Date(s);
 return isNaN(d)?null:d;
}
function trabalhoFormatarDataReferenciaBR(valor){
 const d=trabalhoParseDataReferencia(valor);
 if(!d)return '';
 return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function trabalhoAjustarParaDiaUtil(data){
 const d=new Date(data);
 d.setHours(0,0,0,0);
 const dia=d.getDay();
 if(dia===6)d.setDate(d.getDate()+2);
 else if(dia===0)d.setDate(d.getDate()+1);
 return d;
}
function calcularDataReferenciaTrabalhoDiario(dataBase=new Date()){
 const d=new Date(dataBase);
 const minutos=d.getHours()*60+d.getMinutes();
 // Regra do trabalho diário: 14:01 até 14:00 do dia seguinte conta para o próximo dia útil.
 if(minutos>=14*60+1)d.setDate(d.getDate()+1);
 return trabalhoDataLocalISO(trabalhoAjustarParaDiaUtil(d));
}
function calcularDataReferenciaPlanejamentoSemanal(dataBase=new Date()){
 const d=new Date(dataBase);
 d.setHours(0,0,0,0);
 const dia=d.getDay();
 // Sexta, sábado e domingo já apontam para a próxima segunda. Segunda a quinta apontam para a segunda da semana atual.
 if(dia===5)d.setDate(d.getDate()+3);
 else if(dia===6)d.setDate(d.getDate()+2);
 else if(dia===0)d.setDate(d.getDate()+1);
 else d.setDate(d.getDate()-(dia-1));
 return trabalhoDataLocalISO(d);
}
function openRelatoriosMenuModal(){
 document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active-screen');s.style.display='';});
 document.getElementById('home-screen')?.classList.add('active-screen');
 let m=document.getElementById('relatorios-menu-modal');
 if(!m){m=document.createElement('div');m.id='relatorios-menu-modal';m.className='relatorios-menu-overlay';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)closeRelatoriosMenuModal();});}
 m.innerHTML=`<div class="relatorios-menu-card"><button class="relatorios-menu-close" onclick="closeRelatoriosMenuModal()">×</button><h2>Relatórios</h2><p>Escolha o tipo de relatório que deseja abrir.</p><div class="relatorios-menu-options"><button onclick="closeRelatoriosMenuModal();openRelatoriosModal();"><i class="fa-solid fa-chart-line"></i><span>Relatório Físico</span><small>Abrir relatório físico atual</small></button><button onclick="closeRelatoriosMenuModal();openTrabalhoDiarioModal();"><i class="fa-solid fa-file-pdf"></i><span>Trabalho Diário</span><small>Enviar PDF diário por categoria</small></button><button onclick="closeRelatoriosMenuModal();openPlanejamentoSemanalModal();"><i class="fa-solid fa-calendar-week"></i><span>Planejamento Semanal</span><small>Enviar PDF semanal por categoria</small></button><button onclick="closeRelatoriosMenuModal();openRelatorioPsrPse('psr');"><i class="fa-solid fa-heart-pulse"></i><span>PSR</span><small>Relatório de recuperação</small></button><button onclick="closeRelatoriosMenuModal();openRelatorioPsrPse('pse');"><i class="fa-solid fa-person-running"></i><span>PSE</span><small>Relatório de esforço</small></button><button onclick="closeRelatoriosMenuModal();openGoleirosTecnicoModal();"><i class="fa-solid fa-shield-halved"></i><span>Goleiros</span><small>Informações técnicas</small></button><button data-prep-alert="1" onclick="closeRelatoriosMenuModal();openPreparacaoFisicaQueixasModal();"><i class="fa-solid fa-notes-medical"></i><span>Preparação Física</span><small>Queixas dos atletas</small></button><button onclick="closeRelatoriosMenuModal();openMonitoramentoCargaModal();"><i class="fa-solid fa-gauge-high"></i><span>Monitoramento de Carga</span><small>PSR/PSE automático</small></button></div></div>`;
 m.style.display='flex';
 renderIndicadorPreparacaoFisica();
 atualizarIndicadorPreparacaoFisica();
}
function closeRelatoriosMenuModal(){const m=document.getElementById('relatorios-menu-modal');if(m)m.style.display='none';}
function normalizarTextoTrabalho(valor){return String(valor||'').trim().replace(/\s+/g,' ');}
function valorFlexTrabalho(row,termos){const chave=Object.keys(row||{}).find(k=>termos.some(t=>String(k).toLowerCase().includes(String(t).toLowerCase())));return chave?row[chave]:'';}
function trabalhoAnoAtleta(row){return normalizarTextoTrabalho(valorColunaExata(row,'Ano')||valorFlexTrabalho(row,['ano']));}
function trabalhoNomeCompleto(row){return normalizarTextoTrabalho(valorFlexTrabalho(row,['nome completo'])||valorColunaExata(row,'NOME COMPLETO')||valorFlexTrabalho(row,['nome']));}
function trabalhoApelido(row){return normalizarTextoTrabalho(valorFlexTrabalho(row,['apelido'])||valorColunaExata(row,'APELIDO')||trabalhoNomeCompleto(row));}
function trabalhoNascimento(row){return normalizarTextoTrabalho(convertExcelDate(valorFlexTrabalho(row,['data de nascimento','nascimento']))||valorFlexTrabalho(row,['data de nascimento','nascimento']));}
function trabalhoIdentidadeAtleta(index){const row=excelData[index]||{};return {nomeCompleto:trabalhoNomeCompleto(row),apelido:trabalhoApelido(row),nascimento:trabalhoNascimento(row),ano:trabalhoAnoAtleta(row)};}
function trabalhoChaveAtleta(id){return normalizarTextoTrabalho(id?.nomeCompleto||'')+'||'+normalizarTextoTrabalho(id?.nascimento||'');}
function trabalhoChaveExtraAtleta(id){return normalizarTextoTrabalho(id?.nomeCompleto||'')+'||'+normalizarTextoTrabalho(id?.ano||'');}
function localizarAtletaTrabalhoPorNomeAno(extra){
 const nome=normalizarTextoTrabalho(extra?.nomeCompleto||extra?.nome_completo||extra?.nome||'');
 const ano=normalizarTextoTrabalho(extra?.ano||'');
 if(!nome||!ano)return null;
 return trabalhoTodosAtletas().find(item=>item.id.nomeCompleto===nome&&item.id.ano===ano)||null;
}
function aplicarExtrasSalvosTrabalho(catId, extras){
 const estado=trabalhoDiarioEstado[catId];
 if(!estado||!Array.isArray(extras))return;
 extras.forEach(extra=>{
  const item=localizarAtletaTrabalhoPorNomeAno(extra);
  if(item)estado.selecionados.add(trabalhoChaveAtleta(item.id));
 });
}
function trabalhoAtletasPorAnos(anos){return (excelData||[]).map((row,index)=>({row,index,id:trabalhoIdentidadeAtleta(index)})).filter(a=>a.id.nomeCompleto&&a.id.nascimento&&anos.includes(a.id.ano)).sort((a,b)=>a.id.ano.localeCompare(b.id.ano)||a.id.apelido.localeCompare(b.id.apelido,'pt-BR'));}
function trabalhoTodosAtletas(){return (excelData||[]).map((row,index)=>({row,index,id:trabalhoIdentidadeAtleta(index)})).filter(a=>a.id.nomeCompleto&&a.id.nascimento).sort((a,b)=>a.id.ano.localeCompare(b.id.ano)||a.id.apelido.localeCompare(b.id.apelido,'pt-BR'));}
function inicializarEstadoTrabalhoDiario(){
 const cats=categoriasTrabalhoDiarioConfig();
 Object.keys(cats).forEach(id=>{
  if(!trabalhoDiarioEstado[id]){
   const padrao=trabalhoAtletasPorAnos(cats[id].anos).map(a=>trabalhoChaveAtleta(a.id));
   trabalhoDiarioEstado[id]={file:null,selecionados:new Set(padrao),padrao:new Set(padrao),registro:null};
  }
 });
}
function trabalhoDiarioExpiraEm(registro){
 const base=new Date(registro?.atualizado_em||registro?.criado_em||Date.now());
 if(isNaN(base))return null;
 const exp=new Date(base);
 exp.setHours(18,0,0,0);
 if(base.getTime()>=exp.getTime()) exp.setDate(exp.getDate()+1);
 return exp;
}
function trabalhoDiarioExpirado(registro){
 const exp=trabalhoDiarioExpiraEm(registro);
 return exp ? Date.now()>=exp.getTime() : false;
}
async function excluirRegistroTrabalhoDiario(registro){
 try{
  if(registro?.storage_path) await _supabase.storage.from(TRABALHOS_DIARIOS_BUCKET).remove([registro.storage_path]);
 }catch(e){console.warn('Não foi possível remover arquivo expirado:',e);}
 try{
  if(registro?.categoria_id) await _supabase.from('trabalhos_diarios').delete().eq('categoria_id',registro.categoria_id);
 }catch(e){console.warn('Não foi possível remover registro expirado:',e);}
}
async function carregarTrabalhosDiariosAtuais(){
 try{
  const {data,error}=await _supabase.from('trabalhos_diarios').select('*');
  if(error){console.warn('Tabela trabalhos_diarios não carregada:',error.message);return;}
  for(const r of (data||[])){
   if(!trabalhoDiarioEstado[r.categoria_id]) continue;
   trabalhoDiarioEstado[r.categoria_id].registro=r;
   // Mantém pré-selecionados os atletas extras usados no envio anterior.
   aplicarExtrasSalvosTrabalho(r.categoria_id, r.atletas || []);
  }
 }catch(e){console.warn('Erro ao carregar trabalhos diários:',e);}
}
async function openTrabalhoDiarioModal(){
 inicializarEstadoTrabalhoDiario();
 await carregarTrabalhosDiariosAtuais();
 let m=document.getElementById('trabalho-diario-modal');
 if(!m){m=document.createElement('div');m.id='trabalho-diario-modal';m.className='trabalho-diario-overlay';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)closeTrabalhoDiarioModal();});}
 const cats=categoriasTrabalhoDiarioConfig();
 m.innerHTML=`<div class="trabalho-diario-card"><button class="trabalho-diario-close" onclick="closeTrabalhoDiarioModal()">×</button><h2>Trabalho Diário</h2><p class="trabalho-diario-sub">Envie o PDF do trabalho por categoria. Cada novo envio substitui o trabalho anterior da categoria.</p><div class="trabalho-diario-grid">${Object.keys(cats).map(id=>renderTrabalhoDiarioCategoriaHTML(id)).join('')}</div></div>`;
 m.style.display='flex';
}
function closeTrabalhoDiarioModal(){const m=document.getElementById('trabalho-diario-modal');if(m)m.style.display='none';}
function trabalhoExtrasSelecionados(catId){
 const estado=trabalhoDiarioEstado[catId];
 if(!estado)return [];
 return Array.from(estado.selecionados)
  .filter(key=>!estado.padrao.has(key))
  .map(key=>trabalhoTodosAtletas().find(item=>trabalhoChaveAtleta(item.id)===key))
  .filter(Boolean)
  .sort((a,b)=>a.id.ano.localeCompare(b.id.ano)||a.id.apelido.localeCompare(b.id.apelido,'pt-BR'));
}
function renderTrabalhoExtrasHTML(catId){
 const extras=trabalhoExtrasSelecionados(catId);
 if(!extras.length)return `<div class="td-extras" id="td-extras-${catId}"></div>`;
 return `<div class="td-extras" id="td-extras-${catId}">${extras.map(a=>{const key=encodeURIComponent(trabalhoChaveAtleta(a.id));return `<span><button type="button" class="td-extra-remove" title="Remover atleta extra" onclick="removerExtraTrabalhoDiario('${catId}',decodeURIComponent('${key}'))">×</button>+ ${escapeHtmlJogos(a.id.apelido || a.id.nomeCompleto)} - ${escapeHtmlJogos(a.id.ano)}</span>`;}).join('')}</div>`;
}
async function removerExtraTrabalhoDiario(catId,key){
 const estado=trabalhoDiarioEstado[catId];
 if(!estado||estado.padrao.has(key))return;
 estado.selecionados.delete(key);
 atualizarContadorTrabalho(catId);
 // Persiste a remoção dos extras no registro atual, sem precisar reenviar PDF.
 if(estado.registro){
  const extras=destinatariosTrabalho(catId);
  const {error}=await _supabase.from('trabalhos_diarios').update({atletas:extras,atualizado_em:new Date().toISOString()}).eq('categoria_id',catId);
  if(error){console.error(error);alert('Não foi possível salvar a remoção do atleta extra.');return;}
  estado.registro.atletas=extras;
 }
}
function renderTrabalhoDiarioCategoriaHTML(catId){
 const cat=categoriasTrabalhoDiarioConfig()[catId];
 const estado=trabalhoDiarioEstado[catId];
 const count=estado?estado.padrao.size:0;
 const reg=estado&&estado.registro;
 const referencia=trabalhoFormatarDataReferenciaBR(reg?.data_referencia);
 const status=reg?`<button type="button" class="td-status ok td-status-link" onclick="abrirTrabalhoAtual('${catId}')" title="Abrir PDF atual"><strong>Atual:</strong> ${escapeHtmlJogos(reg.arquivo_nome||'PDF enviado')}<br><small>${reg.atualizado_em?new Date(reg.atualizado_em).toLocaleString('pt-BR'):''}${referencia?` • Dia: ${referencia}`:''} • Extras: ${(reg.atletas||[]).length}</small></button>`:`<div class="td-status">Nenhum trabalho enviado.</div>`;
 return `<section class="td-cat-panel" data-cat="${catId}"><h3>${cat.label}</h3><div class="td-anos">Padrão: ${cat.anos.join(', ')}</div>${status}<label class="td-file-label">PDF do trabalho<input type="file" accept="application/pdf,.pdf" onchange="selecionarArquivoTrabalhoDiario('${catId}',this)"></label><div class="td-file-name" id="td-file-${catId}">Nenhum arquivo selecionado</div><div class="td-actions"><button type="button" onclick="abrirSelecionarAtletasTrabalho('${catId}')"><i class="fa-solid fa-user-plus"></i> Atletas <span id="td-count-${catId}">${count}</span></button><button type="button" class="enviar" onclick="enviarTrabalhoDiario('${catId}')"><i class="fa-solid fa-upload"></i> Enviar/Substituir</button>${reg?`<button type="button" class="relatorio-visualizacao-btn" onclick="abrirRelatorioVisualizacaoDocumento('trabalho_diario','${catId}')"><i class="fa-solid fa-eye"></i> Relatório de visualização</button><button type="button" class="excluir-trabalho" onclick="excluirTrabalhoAtual('${catId}')"><i class="fa-solid fa-trash"></i> Excluir trabalho atual</button>`:''}</div>${renderTrabalhoExtrasHTML(catId)}</section>`;
}
function abrirTrabalhoAtual(catId){
 const reg=trabalhoDiarioEstado[catId]&&trabalhoDiarioEstado[catId].registro;
 if(!reg)return alert('Nenhum trabalho atual para abrir.');
 let url=reg.public_url||'';
 if(!url&&reg.storage_path){
  try{const {data}= _supabase.storage.from(TRABALHOS_DIARIOS_BUCKET).getPublicUrl(reg.storage_path);url=data&&data.publicUrl?data.publicUrl:'';}catch(e){console.warn(e);}
 }
 if(!url)return alert('Não encontrei o link do PDF atual.');
 window.open(url,'_blank','noopener,noreferrer');
}
async function excluirTrabalhoAtual(catId){
 const estado=trabalhoDiarioEstado[catId];
 const reg=estado&&estado.registro;
 if(!reg)return alert('Nenhum trabalho atual para excluir.');
 if(!confirm('Excluir o trabalho atual de '+(reg.categoria_label||catId)+'?'))return;
 const btn=document.querySelector(`.td-cat-panel[data-cat="${catId}"] .excluir-trabalho`);
 if(btn){btn.disabled=true;btn.textContent='Excluindo...';}
 try{
  await removerArquivoAntigoTrabalho(catId);
  const {error}=await _supabase.from('trabalhos_diarios').delete().eq('categoria_id',catId);
  if(error)throw error;
  estado.registro=null;
  estado.file=null;
  alert('Trabalho atual excluído com sucesso.');
  openTrabalhoDiarioModal();
 }catch(e){
  console.error(e);
  alert('Erro ao excluir trabalho atual.');
 }finally{
  if(btn){btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-trash"></i> Excluir trabalho atual';}
 }
}
function selecionarArquivoTrabalhoDiario(catId,input){inicializarEstadoTrabalhoDiario();const file=input.files&&input.files[0];trabalhoDiarioEstado[catId].file=file||null;const el=document.getElementById('td-file-'+catId);if(el)el.textContent=file?file.name:'Nenhum arquivo selecionado';}
function abrirSelecionarAtletasTrabalho(catId){
 inicializarEstadoTrabalhoDiario();
 trabalhoDiarioAtletasModal={categoriaId:catId,filtroAno:'todos',busca:''};
 let m=document.getElementById('trabalho-atletas-modal');
 if(!m){m=document.createElement('div');m.id='trabalho-atletas-modal';m.className='trabalho-atletas-overlay';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)closeSelecionarAtletasTrabalho();});}
 renderSelecionarAtletasTrabalho();
 m.style.display='flex';
}
function closeSelecionarAtletasTrabalho(){const m=document.getElementById('trabalho-atletas-modal');if(m)m.style.display='none';}
function renderSelecionarAtletasTrabalho(){
 const catId=trabalhoDiarioAtletasModal.categoriaId;
 const cats=categoriasTrabalhoDiarioConfig();const cat=cats[catId];const estado=trabalhoDiarioEstado[catId];
 const anos=[...new Set((excelData||[]).map(trabalhoAnoAtleta).filter(Boolean))].sort();
 const filtroAno=trabalhoDiarioAtletasModal.filtroAno;
 const busca=normalizarTextoTrabalho(trabalhoDiarioAtletasModal.busca).toLowerCase();
 const atletas=trabalhoTodosAtletas().filter(a=>(filtroAno==='todos'||a.id.ano===filtroAno)&&(!busca||(`${a.id.apelido} ${a.id.nomeCompleto}`).toLowerCase().includes(busca)));
 const lista=atletas.map(a=>{const key=trabalhoChaveAtleta(a.id);const isPadrao=estado.padrao.has(key);const checked=estado.selecionados.has(key);return `<label class="trabalho-atleta-item ${isPadrao?'padrao':''}"><input type="checkbox" data-key="${encodeURIComponent(key)}" ${checked?'checked':''} ${isPadrao?'disabled':''} onchange="toggleAtletaTrabalho('${catId}',decodeURIComponent(this.dataset.key),this.checked)"><span>${escapeHtmlJogos(a.id.apelido)} <small>${escapeHtmlJogos(a.id.ano)}${isPadrao?' • padrão':''}</small></span></label>`;}).join('')||'<p class="td-empty">Nenhum atleta encontrado.</p>';
 const m=document.getElementById('trabalho-atletas-modal');
 m.innerHTML=`<div class="trabalho-atletas-card"><button class="trabalho-diario-close" onclick="closeSelecionarAtletasTrabalho()">×</button><h2>Atletas - ${cat.label}</h2><p>Os atletas padrão da categoria ficam marcados. Selecione atletas extras para receber também. Eles ficarão marcados nos próximos envios.</p><div class="trabalho-atletas-filtros"><select onchange="trabalhoDiarioAtletasModal.filtroAno=this.value;renderSelecionarAtletasTrabalho()"><option value="todos">Todos os anos</option>${anos.map(a=>`<option value="${a}" ${a===filtroAno?'selected':''}>${a}</option>`).join('')}</select><input placeholder="Buscar atleta..." value="${escapeHtmlJogos(trabalhoDiarioAtletasModal.busca)}" oninput="trabalhoDiarioAtletasModal.busca=this.value;renderSelecionarAtletasTrabalho()"></div><div class="trabalho-atletas-lista">${lista}</div><div class="trabalho-atletas-footer"><strong>Padrão: ${estado.padrao.size} • Extras: ${trabalhoExtrasSelecionados(catId).length}</strong><button onclick="closeSelecionarAtletasTrabalho();atualizarContadorTrabalho('${catId}')">Concluir</button></div></div>`;
}
function toggleAtletaTrabalho(catId,key,checked){const estado=trabalhoDiarioEstado[catId];if(!estado||estado.padrao.has(key))return;if(checked)estado.selecionados.add(key);else estado.selecionados.delete(key);}
function atualizarContadorTrabalho(catId){const estado=trabalhoDiarioEstado[catId];const el=document.getElementById('td-count-'+catId);if(el&&estado)el.textContent=estado.padrao.size;const extras=document.getElementById('td-extras-'+catId);if(extras)extras.outerHTML=renderTrabalhoExtrasHTML(catId);}
function destinatariosTrabalho(catId){
 const estado=trabalhoDiarioEstado[catId];
 const keys=estado?Array.from(estado.selecionados):[];
 // Salva no Supabase APENAS os atletas extras. Os atletas padrão serão definidos pelos anos_padrao.
 return keys
  .filter(key=>!estado.padrao.has(key))
  .map(key=>{
   const a=trabalhoTodosAtletas().find(item=>trabalhoChaveAtleta(item.id)===key);
   return a?{nomeCompleto:a.id.nomeCompleto,ano:a.id.ano}:null;
  })
  .filter(Boolean);
}
async function removerArquivoAntigoTrabalho(catId){
 const reg=trabalhoDiarioEstado[catId]&&trabalhoDiarioEstado[catId].registro;
 if(reg&&reg.storage_path){try{await _supabase.storage.from(TRABALHOS_DIARIOS_BUCKET).remove([reg.storage_path]);}catch(e){console.warn('Não foi possível remover PDF antigo:',e);}}
}
async function notificarPortalDocumentoPush(opts){
  const tipo=opts&&opts.tipo;
  const categoriaLabel=opts&&opts.categoriaLabel||'';
  const anosPadrao=(opts&&opts.anosPadrao)||[];
  const extras=(opts&&opts.extras)||[];
  try{
    const {data:tokens,error}=await _supabase.from('portal_push_tokens').select('token,nome_completo,nascimento,ano,atualizado_em');
    if(error){console.warn('Tokens push:',error.message);return 0;}
    if(!tokens||!tokens.length)return 0;
    const porToken=new Map();
    tokens.forEach(t=>{
      if(!t||!t.token)return;
      const prev=porToken.get(t.token);
      if(!prev||String(t.atualizado_em||'')>=String(prev.atualizado_em||'')) porToken.set(t.token,t);
    });
    const anos=(anosPadrao||[]).map(a=>String(a||'').trim());
    const extrasNomes=new Set((extras||[]).map(e=>normalizarTextoTrabalho(e.nomeCompleto||e.nome_completo||e.nome||'')));
    const tabelaExtras=tipo==='planejamento'?'planejamentos_semanais':'trabalhos_diarios';
    let extrasGlobais=new Set(extrasNomes);
    try{
      const {data:regs}=await _supabase.from(tabelaExtras).select('atletas');
      (regs||[]).forEach(r=>{(r.atletas||[]).forEach(e=>{
        const n=normalizarTextoTrabalho(e.nomeCompleto||e.nome_completo||e.nome||'');
        if(n)extrasGlobais.add(n);
      });});
    }catch(eEx){}
    const lista=[...porToken.values()].filter(t=>{
      const nome=normalizarTextoTrabalho(t.nome_completo||'');
      const ano=String(t.ano||'').trim();
      if(nome&&extrasNomes.has(nome))return true;
      if(nome&&extrasGlobais.has(nome))return false;
      if(ano&&anos.includes(ano))return true;
      return false;
    }).map(t=>t.token).filter(Boolean);
    if(!lista.length)return 0;
    const title=tipo==='planejamento'?'Planejamento semanal':'Trabalho diário';
    const body=(categoriaLabel?categoriaLabel+' — ':'')+'Novo documento no Portal.';
    const {error:fnErr}=await _supabase.functions.invoke('notify-portal-doc',{body:{tokens:lista,title,body}});
    if(fnErr)console.warn('Falha ao enviar push (função notify-portal-doc):',fnErr.message||fnErr);
    return lista.length;
  }catch(e){console.warn('Push documento:',e);return 0;}
}
async function enviarTrabalhoDiario(catId){
 inicializarEstadoTrabalhoDiario();
 const cat=categoriasTrabalhoDiarioConfig()[catId];const estado=trabalhoDiarioEstado[catId];
 if(!estado.file)return alert('Selecione um PDF para enviar.');
 if(estado.file.type && estado.file.type!=='application/pdf' && !estado.file.name.toLowerCase().endsWith('.pdf'))return alert('Envie apenas arquivo PDF.');
 const atletas=destinatariosTrabalho(catId);
 if(!estado.selecionados.size)return alert('Nenhum atleta selecionado para este trabalho.');
 const btn=document.querySelector(`.td-cat-panel[data-cat="${catId}"] .enviar`);if(btn){btn.disabled=true;btn.textContent='Enviando...';}
 try{
  await removerArquivoAntigoTrabalho(catId);
  const safeName=estado.file.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_.-]+/gi,'_');
  const path=`${catId}/${Date.now()}_${safeName}`;
  const up=await _supabase.storage.from(TRABALHOS_DIARIOS_BUCKET).upload(path,estado.file,{upsert:true,contentType:'application/pdf'});
  if(up.error)throw up.error;
  const {data:pub}= _supabase.storage.from(TRABALHOS_DIARIOS_BUCKET).getPublicUrl(path);
  const agora=new Date();
  const dataReferencia=calcularDataReferenciaTrabalhoDiario(agora);
  const payload={categoria_id:catId,categoria_label:cat.label,anos_padrao:cat.anos,arquivo_nome:estado.file.name,storage_path:path,public_url:pub&&pub.publicUrl?pub.publicUrl:'',atletas,data_referencia:dataReferencia,atualizado_em:agora.toISOString()};
  const res=await _supabase.from('trabalhos_diarios').upsert(payload,{onConflict:'categoria_id'});
  if(res.error)throw res.error;
  estado.registro=payload;estado.file=null;
  const nPush=await notificarPortalDocumentoPush({tipo:'trabalho',categoriaLabel:cat.label,anosPadrao:cat.anos,extras:atletas});
  alert('Trabalho enviado para '+cat.label+' com sucesso.'+(nPush?(' Notificação enviada para '+nPush+' aparelho(s).'):' (nenhum app registrado nesta categoria ainda)'));
  openTrabalhoDiarioModal();
 }catch(e){console.error(e);alert('Erro ao enviar trabalho. Verifique tabela/bucket no Supabase.');}
 finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-upload"></i> Enviar/Substituir';}}
}



/* === PLANEJAMENTO SEMANAL === */
const PLANEJAMENTOS_SEMANAIS_BUCKET = 'planejamentos-semanais';
let planejamentoSemanalEstado = {};
let planejamentoSemanalAtletasModal = { categoriaId: null, filtroAno: 'todos', busca: '' };
function inicializarEstadoPlanejamentoSemanal(){
 const cats=categoriasTrabalhoDiarioConfig();
 Object.keys(cats).forEach(id=>{
  if(!planejamentoSemanalEstado[id]){
   const padrao=trabalhoAtletasPorAnos(cats[id].anos).map(a=>trabalhoChaveAtleta(a.id));
   planejamentoSemanalEstado[id]={file:null,selecionados:new Set(padrao),padrao:new Set(padrao),registro:null};
  }
 });
}
function aplicarExtrasSalvosPlanejamento(catId, extras){
 const estado=planejamentoSemanalEstado[catId];
 if(!estado||!Array.isArray(extras))return;
 extras.forEach(extra=>{
  const item=localizarAtletaTrabalhoPorNomeAno(extra);
  if(item)estado.selecionados.add(trabalhoChaveAtleta(item.id));
 });
}
async function carregarPlanejamentosSemanaisAtuais(){
 try{
  const {data,error}=await _supabase.from('planejamentos_semanais').select('*');
  if(error){console.warn('Tabela planejamentos_semanais não carregada:',error.message);return;}
  for(const r of (data||[])){
   if(!planejamentoSemanalEstado[r.categoria_id]) continue;
   planejamentoSemanalEstado[r.categoria_id].registro=r;
   aplicarExtrasSalvosPlanejamento(r.categoria_id, r.atletas || []);
  }
 }catch(e){console.warn('Erro ao carregar planejamentos semanais:',e);}
}
async function openPlanejamentoSemanalModal(){
 inicializarEstadoPlanejamentoSemanal();
 await carregarPlanejamentosSemanaisAtuais();
 let m=document.getElementById('planejamento-semanal-modal');
 if(!m){m=document.createElement('div');m.id='planejamento-semanal-modal';m.className='trabalho-diario-overlay';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)closePlanejamentoSemanalModal();});}
 const cats=categoriasTrabalhoDiarioConfig();
 m.innerHTML=`<div class="trabalho-diario-card planejamento-semanal-card"><button class="trabalho-diario-close" onclick="closePlanejamentoSemanalModal()">×</button><h2>Planejamento Semanal</h2><p class="trabalho-diario-sub">Envie o PDF do planejamento semanal por categoria. Cada novo envio substitui o planejamento anterior da categoria.</p><div class="trabalho-diario-grid">${Object.keys(cats).map(id=>renderPlanejamentoSemanalCategoriaHTML(id)).join('')}</div></div>`;
 m.style.display='flex';
}
function closePlanejamentoSemanalModal(){const m=document.getElementById('planejamento-semanal-modal');if(m)m.style.display='none';}
function planejamentoExtrasSelecionados(catId){
 const estado=planejamentoSemanalEstado[catId];
 if(!estado)return [];
 return Array.from(estado.selecionados)
  .filter(key=>!estado.padrao.has(key))
  .map(key=>trabalhoTodosAtletas().find(item=>trabalhoChaveAtleta(item.id)===key))
  .filter(Boolean)
  .sort((a,b)=>a.id.ano.localeCompare(b.id.ano)||a.id.apelido.localeCompare(b.id.apelido,'pt-BR'));
}
function renderPlanejamentoExtrasHTML(catId){
 const extras=planejamentoExtrasSelecionados(catId);
 if(!extras.length)return `<div class="td-extras" id="ps-extras-${catId}"></div>`;
 return `<div class="td-extras" id="ps-extras-${catId}">${extras.map(a=>{const key=encodeURIComponent(trabalhoChaveAtleta(a.id));return `<span><button type="button" class="td-extra-remove" title="Remover atleta extra" onclick="removerExtraPlanejamento('${catId}',decodeURIComponent('${key}'))">×</button>+ ${escapeHtmlJogos(a.id.apelido || a.id.nomeCompleto)} - ${escapeHtmlJogos(a.id.ano)}</span>`;}).join('')}</div>`;
}
async function removerExtraPlanejamento(catId,key){
 const estado=planejamentoSemanalEstado[catId];
 if(!estado||estado.padrao.has(key))return;
 estado.selecionados.delete(key);
 atualizarContadorPlanejamento(catId);
 if(estado.registro){
  const extras=destinatariosPlanejamento(catId);
  const {error}=await _supabase.from('planejamentos_semanais').update({atletas:extras,atualizado_em:new Date().toISOString()}).eq('categoria_id',catId);
  if(error){console.error(error);alert('Não foi possível salvar a remoção do atleta extra.');return;}
  estado.registro.atletas=extras;
 }
}
function renderPlanejamentoSemanalCategoriaHTML(catId){
 const cat=categoriasTrabalhoDiarioConfig()[catId];
 const estado=planejamentoSemanalEstado[catId];
 const count=estado?estado.padrao.size:0;
 const reg=estado&&estado.registro;
 const referencia=trabalhoFormatarDataReferenciaBR(reg?.data_referencia);
 const status=reg?`<button type="button" class="td-status ok td-status-link" onclick="abrirPlanejamentoAtual('${catId}')" title="Abrir PDF atual"><strong>Atual:</strong> ${escapeHtmlJogos(reg.arquivo_nome||'PDF enviado')}<br><small>${reg.atualizado_em?new Date(reg.atualizado_em).toLocaleString('pt-BR'):''}${referencia?` • Semana: ${referencia}`:''} • Extras: ${(reg.atletas||[]).length}</small></button>`:`<div class="td-status">Nenhum planejamento enviado.</div>`;
 return `<section class="td-cat-panel" data-cat="${catId}"><h3>${cat.label}</h3><div class="td-anos">Padrão: ${cat.anos.join(', ')}</div>${status}<label class="td-file-label">PDF do planejamento<input type="file" accept="application/pdf,.pdf" onchange="selecionarArquivoPlanejamento('${catId}',this)"></label><div class="td-file-name" id="ps-file-${catId}">Nenhum arquivo selecionado</div><div class="td-actions"><button type="button" onclick="abrirSelecionarAtletasPlanejamento('${catId}')"><i class="fa-solid fa-user-plus"></i> Atletas <span id="ps-count-${catId}">${count}</span></button><button type="button" class="enviar" onclick="enviarPlanejamentoSemanal('${catId}')"><i class="fa-solid fa-upload"></i> Enviar/Substituir</button>${reg?`<button type="button" class="relatorio-visualizacao-btn" onclick="abrirRelatorioVisualizacaoDocumento('planejamento_semanal','${catId}')"><i class="fa-solid fa-eye"></i> Relatório de visualização</button><button type="button" class="excluir-trabalho" onclick="excluirPlanejamentoAtual('${catId}')"><i class="fa-solid fa-trash"></i> Excluir planejamento atual</button>`:''}</div>${renderPlanejamentoExtrasHTML(catId)}</section>`;
}
function selecionarArquivoPlanejamento(catId,input){inicializarEstadoPlanejamentoSemanal();const file=input.files&&input.files[0];planejamentoSemanalEstado[catId].file=file||null;const el=document.getElementById('ps-file-'+catId);if(el)el.textContent=file?file.name:'Nenhum arquivo selecionado';}
function abrirSelecionarAtletasPlanejamento(catId){
 inicializarEstadoPlanejamentoSemanal();
 planejamentoSemanalAtletasModal={categoriaId:catId,filtroAno:'todos',busca:''};
 let m=document.getElementById('planejamento-atletas-modal');
 if(!m){m=document.createElement('div');m.id='planejamento-atletas-modal';m.className='trabalho-atletas-overlay';document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)closeSelecionarAtletasPlanejamento();});}
 renderSelecionarAtletasPlanejamento();
 m.style.display='flex';
}
function closeSelecionarAtletasPlanejamento(){const m=document.getElementById('planejamento-atletas-modal');if(m)m.style.display='none';}
function renderSelecionarAtletasPlanejamento(){
 const catId=planejamentoSemanalAtletasModal.categoriaId;
 const cats=categoriasTrabalhoDiarioConfig();const cat=cats[catId];const estado=planejamentoSemanalEstado[catId];
 const anos=[...new Set((excelData||[]).map(trabalhoAnoAtleta).filter(Boolean))].sort();
 const filtroAno=planejamentoSemanalAtletasModal.filtroAno;
 const busca=normalizarTextoTrabalho(planejamentoSemanalAtletasModal.busca).toLowerCase();
 const atletas=trabalhoTodosAtletas().filter(a=>(filtroAno==='todos'||a.id.ano===filtroAno)&&(!busca||(`${a.id.apelido} ${a.id.nomeCompleto}`).toLowerCase().includes(busca)));
 const lista=atletas.map(a=>{const key=trabalhoChaveAtleta(a.id);const isPadrao=estado.padrao.has(key);const checked=estado.selecionados.has(key);return `<label class="trabalho-atleta-item ${isPadrao?'padrao':''}"><input type="checkbox" data-key="${encodeURIComponent(key)}" ${checked?'checked':''} ${isPadrao?'disabled':''} onchange="toggleAtletaPlanejamento('${catId}',decodeURIComponent(this.dataset.key),this.checked)"><span>${escapeHtmlJogos(a.id.apelido)} <small>${escapeHtmlJogos(a.id.ano)}${isPadrao?' • padrão':''}</small></span></label>`;}).join('')||'<p class="td-empty">Nenhum atleta encontrado.</p>';
 const m=document.getElementById('planejamento-atletas-modal');
 m.innerHTML=`<div class="trabalho-atletas-card"><button class="trabalho-diario-close" onclick="closeSelecionarAtletasPlanejamento()">×</button><h2>Atletas - ${cat.label}</h2><p>Os atletas padrão da categoria ficam marcados. Selecione atletas extras para receber também. Eles ficarão marcados nos próximos envios.</p><div class="trabalho-atletas-filtros"><select onchange="planejamentoSemanalAtletasModal.filtroAno=this.value;renderSelecionarAtletasPlanejamento()"><option value="todos">Todos os anos</option>${anos.map(a=>`<option value="${a}" ${a===filtroAno?'selected':''}>${a}</option>`).join('')}</select><input placeholder="Buscar atleta..." value="${escapeHtmlJogos(planejamentoSemanalAtletasModal.busca)}" oninput="planejamentoSemanalAtletasModal.busca=this.value;renderSelecionarAtletasPlanejamento()"></div><div class="trabalho-atletas-lista">${lista}</div><div class="trabalho-atletas-footer"><strong>Padrão: ${estado.padrao.size} • Extras: ${planejamentoExtrasSelecionados(catId).length}</strong><button onclick="closeSelecionarAtletasPlanejamento();atualizarContadorPlanejamento('${catId}')">Concluir</button></div></div>`;
}
function toggleAtletaPlanejamento(catId,key,checked){const estado=planejamentoSemanalEstado[catId];if(!estado||estado.padrao.has(key))return;if(checked)estado.selecionados.add(key);else estado.selecionados.delete(key);}
function atualizarContadorPlanejamento(catId){const estado=planejamentoSemanalEstado[catId];const el=document.getElementById('ps-count-'+catId);if(el&&estado)el.textContent=estado.padrao.size;const extras=document.getElementById('ps-extras-'+catId);if(extras)extras.outerHTML=renderPlanejamentoExtrasHTML(catId);}
function destinatariosPlanejamento(catId){
 const estado=planejamentoSemanalEstado[catId];
 const keys=estado?Array.from(estado.selecionados):[];
 return keys
  .filter(key=>!estado.padrao.has(key))
  .map(key=>{
   const a=trabalhoTodosAtletas().find(item=>trabalhoChaveAtleta(item.id)===key);
   return a?{nomeCompleto:a.id.nomeCompleto,ano:a.id.ano}:null;
  })
  .filter(Boolean);
}
async function removerArquivoAntigoPlanejamento(catId){
 const reg=planejamentoSemanalEstado[catId]&&planejamentoSemanalEstado[catId].registro;
 if(reg&&reg.storage_path){try{await _supabase.storage.from(PLANEJAMENTOS_SEMANAIS_BUCKET).remove([reg.storage_path]);}catch(e){console.warn('Não foi possível remover PDF antigo:',e);}}
}
function abrirPlanejamentoAtual(catId){
 const reg=planejamentoSemanalEstado[catId]&&planejamentoSemanalEstado[catId].registro;
 if(!reg)return alert('Nenhum planejamento atual para abrir.');
 let url=reg.public_url||'';
 if(!url&&reg.storage_path){try{const {data}= _supabase.storage.from(PLANEJAMENTOS_SEMANAIS_BUCKET).getPublicUrl(reg.storage_path);url=data&&data.publicUrl?data.publicUrl:'';}catch(e){console.warn(e);}}
 if(!url)return alert('Não encontrei o link do PDF atual.');
 window.open(url,'_blank','noopener,noreferrer');
}
async function excluirPlanejamentoAtual(catId){
 const estado=planejamentoSemanalEstado[catId];const reg=estado&&estado.registro;
 if(!reg)return alert('Nenhum planejamento atual para excluir.');
 if(!confirm('Excluir o planejamento atual de '+(reg.categoria_label||catId)+'?'))return;
 const btn=document.querySelector(`.td-cat-panel[data-cat="${catId}"] .excluir-trabalho`);if(btn){btn.disabled=true;btn.textContent='Excluindo...';}
 try{
  await removerArquivoAntigoPlanejamento(catId);
  const {error}=await _supabase.from('planejamentos_semanais').delete().eq('categoria_id',catId);
  if(error)throw error;
  estado.registro=null;estado.file=null;
  alert('Planejamento atual excluído com sucesso.');
  openPlanejamentoSemanalModal();
 }catch(e){console.error(e);alert('Erro ao excluir planejamento atual.');}
 finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-trash"></i> Excluir planejamento atual';}}
}
async function enviarPlanejamentoSemanal(catId){
 inicializarEstadoPlanejamentoSemanal();
 const cat=categoriasTrabalhoDiarioConfig()[catId];const estado=planejamentoSemanalEstado[catId];
 if(!estado.file)return alert('Selecione um PDF para enviar.');
 if(estado.file.type && estado.file.type!=='application/pdf' && !estado.file.name.toLowerCase().endsWith('.pdf'))return alert('Envie apenas arquivo PDF.');
 const atletas=destinatariosPlanejamento(catId);
 if(!estado.selecionados.size)return alert('Nenhum atleta selecionado para este planejamento.');
 const btn=document.querySelector(`#planejamento-semanal-modal .td-cat-panel[data-cat="${catId}"] .enviar`);if(btn){btn.disabled=true;btn.textContent='Enviando...';}
 try{
  await removerArquivoAntigoPlanejamento(catId);
  const safeName=estado.file.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_.-]+/gi,'_');
  const path=`${catId}/${Date.now()}_${safeName}`;
  const up=await _supabase.storage.from(PLANEJAMENTOS_SEMANAIS_BUCKET).upload(path,estado.file,{upsert:true,contentType:'application/pdf'});
  if(up.error)throw up.error;
  const {data:pub}= _supabase.storage.from(PLANEJAMENTOS_SEMANAIS_BUCKET).getPublicUrl(path);
  const agora=new Date();
  const dataReferencia=calcularDataReferenciaPlanejamentoSemanal(agora);
  const payload={categoria_id:catId,categoria_label:cat.label,anos_padrao:cat.anos,arquivo_nome:estado.file.name,storage_path:path,public_url:pub&&pub.publicUrl?pub.publicUrl:'',atletas,data_referencia:dataReferencia,atualizado_em:agora.toISOString()};
  const res=await _supabase.from('planejamentos_semanais').upsert(payload,{onConflict:'categoria_id'});
  if(res.error)throw res.error;
  estado.registro=payload;estado.file=null;
  const nPush=await notificarPortalDocumentoPush({tipo:'planejamento',categoriaLabel:cat.label,anosPadrao:cat.anos,extras:atletas});
  alert('Planejamento enviado para '+cat.label+' com sucesso.'+(nPush?(' Notificação enviada para '+nPush+' aparelho(s).'):' (nenhum app registrado nesta categoria ainda)'));
  openPlanejamentoSemanalModal();
 }catch(e){console.error(e);alert('Erro ao enviar planejamento. Verifique tabela/bucket no Supabase.');}
 finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="fa-solid fa-upload"></i> Enviar/Substituir';}}
}



/* === RELATÓRIO DE VISUALIZAÇÃO - TRABALHOS/PLANEJAMENTOS === */
let relatorioVisualizacaoState={tipo:'trabalho_diario',catId:'sub13',modo:'dia',registro:null};
function rvConfigTipo(tipo){
 if(tipo==='planejamento_semanal')return {tabela:'planejamentos_semanais',estado:planejamentoSemanalEstado,titulo:'Planejamento Semanal'};
 return {tabela:'trabalhos_diarios',estado:trabalhoDiarioEstado,titulo:'Trabalho Diário'};
}
function rvParseDate(v){const s=String(v||'');let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return new Date(+m[1],+m[2]-1,+m[3]);m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);if(m)return new Date(+m[3],+m[2]-1,+m[1]);const d=new Date(s);return isNaN(d)?new Date():d;}
function rvISO(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function rvBR(d){return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;}
function rvDataDocumento(reg){return rvISO(rvParseDate(reg?.data_referencia||reg?.atualizado_em||reg?.criado_em||new Date()));}
function rvInicioSemana(d){const x=new Date(d);const day=x.getDay();if(day===6)x.setDate(x.getDate()+2);else if(day===0)x.setDate(x.getDate()+1);else x.setDate(x.getDate()-(day-1));x.setHours(0,0,0,0);return x;}
function rvDiasUteisSemana(base){const ini=rvInicioSemana(base);return [0,1,2,3,4].map(i=>{const d=new Date(ini);d.setDate(ini.getDate()+i);return d;});}
function rvDiasUteisMes(base){const d=new Date(base.getFullYear(),base.getMonth(),1);const out=[];while(d.getMonth()===base.getMonth()){const day=d.getDay();if(day>=1&&day<=5)out.push(new Date(d));d.setDate(d.getDate()+1);}return out;}
function rvSemanasMes(base){const semanas=[];let d=new Date(base.getFullYear(),base.getMonth(),1);while(d.getMonth()===base.getMonth()){const ini=rvInicioSemana(d);const iso=rvISO(ini);if(!semanas.some(s=>s.iso===iso))semanas.push({iso,date:new Date(ini)});d.setDate(d.getDate()+7);}return semanas;}
function rvChaveDocumento(reg){return String(reg?.storage_path||reg?.public_url||reg?.arquivo_nome||'');}
function rvAccessDate(tipo,a){const dataBase=a?.data_documento||a?.data_referencia||a?.primeiro_acesso_em||a?.ultimo_acesso_em;return tipo==='planejamento_semanal'?rvISO(rvInicioSemana(rvParseDate(dataBase))):String(dataBase||'').slice(0,10);}
function rvDestinatarios(reg){
 const anos=Array.isArray(reg?.anos_padrao)?reg.anos_padrao.map(String):[];
 const mapa=new Map();
 trabalhoAtletasPorAnos(anos).forEach(a=>mapa.set(trabalhoChaveAtleta(a.id),a));
 (reg?.atletas||[]).forEach(extra=>{const item=localizarAtletaTrabalhoPorNomeAno(extra);if(item)mapa.set(trabalhoChaveAtleta(item.id),item);else{const nome=normalizarTextoTrabalho(extra.nomeCompleto||extra.nome||'');const ano=normalizarTextoTrabalho(extra.ano||'');if(nome&&ano)mapa.set(`${nome}||${ano}`,{id:{nomeCompleto:nome,apelido:nome,nascimento:'',ano}});}});
 return Array.from(mapa.values()).sort((a,b)=>a.id.ano.localeCompare(b.id.ano)||a.id.apelido.localeCompare(b.id.apelido,'pt-BR'));
}
function rvGerarDocumentos(tipo,modo,reg){
 const base=rvParseDate(rvDataDocumento(reg));
 if(tipo==='planejamento_semanal'){
  if(modo==='mes')return rvSemanasMes(base).map(s=>({label:`Semana ${rvBR(s.date)}`,date:s.iso,week:s.iso,current:false}));
  const ini=rvInicioSemana(base);return [{label:`Semana ${rvBR(ini)}`,date:rvISO(ini),week:rvISO(ini),current:true}];
 }
 if(modo==='mes')return rvDiasUteisMes(base).map(d=>({label:rvBR(d),date:rvISO(d),current:false}));
 if(modo==='semana')return rvDiasUteisSemana(base).map(d=>({label:rvBR(d),date:rvISO(d),current:false}));
 const data=rvDataDocumento(reg);return [{label:rvBR(rvParseDate(data)),date:data,current:true}];
}
function rvAtletaViuDocumento(tipo,atleta,doc,acessosRows){
 const nome=atleta.id.nomeCompleto, nasc=atleta.id.nascimento;
 const rows=(acessosRows||[]).filter(r=>normalizarTextoTrabalho(r.nome_completo)===nome && (!nasc || normalizarTextoTrabalho(r.nascimento)===nasc));
 for(const r of rows){
  const arr=Array.isArray(r.acessos)?r.acessos:[];
  for(const a of arr){
   const chave=String(a?.chave_documento||a?.storage_path||'');
   const data=rvAccessDate(tipo,a);
   if(chave && chave===rvChaveDocumento(relatorioVisualizacaoState.registro)){
    const regData=rvDataDocumento(relatorioVisualizacaoState.registro);
    if(tipo==='planejamento_semanal'){
     const regWeek=rvISO(rvInicioSemana(rvParseDate(regData)));
     if(doc.week===regWeek || doc.current)return true;
    }else if(doc.date===regData || doc.current)return true;
   }
   if(tipo==='planejamento_semanal'){
    const week=rvISO(rvInicioSemana(rvParseDate(data)));
    if(week===doc.week)return true;
   }else if(data===doc.date)return true;
  }
  if(!arr.length){const data=String(r.data||'').slice(0,10);if(tipo==='trabalho_diario'&&data===doc.date)return true;}
 }
 return false;
}

function rvBRCompleto(valor){const d=rvParseDate(valor);return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;}
function rvDiaSemanaTexto(valor){return rvParseDate(valor).toLocaleDateString('pt-BR',{weekday:'long'}).replace(/^./,c=>c.toUpperCase());}
function rvNomeAnoAtleta(atleta){return `${atleta?.id?.apelido||atleta?.id?.nomeCompleto||''}${atleta?.id?.ano?` - ${atleta.id.ano}`:''}`;}
function rvRenderListaVisualizacao(tipo,doc,atletas,acessosRows){
 const tituloData=tipo==='planejamento_semanal'
  ? `Semana ${rvBRCompleto(doc.week||doc.date)}`
  : `${rvBRCompleto(doc.date)} — ${rvDiaSemanaTexto(doc.date)}`;
 const ordenados=[...(atletas||[])].sort((a,b)=>String(a.id.apelido||a.id.nomeCompleto||'').localeCompare(String(b.id.apelido||b.id.nomeCompleto||''),'pt-BR'));
 const vistos=[];const ausentes=[];
 ordenados.forEach(a=>{(rvAtletaViuDocumento(tipo,a,doc,acessosRows)?vistos:ausentes).push(a);});
 const lista=(arr,ok)=>arr.length?arr.map(a=>`<li class="${ok?'ok':'no'}"><span>${ok?'✓':'×'}</span>${escapeHtmlJogos(rvNomeAnoAtleta(a))}</li>`).join(''):`<li class="empty">Nenhum atleta.</li>`;
 const rotuloOk=tipo==='planejamento_semanal'?'Visualizaram':'Visualizaram';
 return `<div class="rv-list-report"><div class="rv-list-date">📅 ${escapeHtmlJogos(tituloData)}</div><div class="rv-list-obs"><strong>Observações:</strong> -</div><div class="rv-list-cols"><section class="rv-list-col ok"><h3>${rotuloOk} (${vistos.length})</h3><ul>${lista(vistos,true)}</ul></section><section class="rv-list-col no"><h3>Ausentes (${ausentes.length})</h3><ul>${lista(ausentes,false)}</ul></section></div></div>`;
}
async function abrirRelatorioVisualizacaoDocumento(tipo,catId){
 const cfg=rvConfigTipo(tipo);let reg=cfg.estado?.[catId]?.registro;
 if(!reg){const {data}=await _supabase.from(cfg.tabela).select('*').eq('categoria_id',catId).maybeSingle();reg=data;}
 if(!reg)return alert('Nenhum documento atual encontrado para esta categoria.');
 relatorioVisualizacaoState={tipo,catId,modo:tipo==='planejamento_semanal'?'semana':'dia',registro:reg};
 await renderRelatorioVisualizacaoDocumento();
}
async function renderRelatorioVisualizacaoDocumento(){
 const {tipo,catId,modo,registro}=relatorioVisualizacaoState;
 const cfg=rvConfigTipo(tipo);const cat=categoriasTrabalhoDiarioConfig()[catId]||{label:registro?.categoria_label||catId};
 const {data:acessos,error}=await _supabase.from('portal_documentos_acessos').select('*').eq('tipo',tipo).eq('categoria_id',catId);
 if(error){console.error(error);alert('Erro ao carregar relatório de visualização.');return;}
 const atletas=rvDestinatarios(registro);const docs=rvGerarDocumentos(tipo,modo,registro);
 const listaUnica=(tipo==='trabalho_diario'&&modo==='dia')||(tipo==='planejamento_semanal'&&modo==='semana');
 let conteudo='';
 if(listaUnica){
  conteudo=rvRenderListaVisualizacao(tipo,docs[0],atletas,acessos||[]);
 }else{
  const headDocs=docs.map(d=>`<th>${escapeHtmlJogos(d.label)}</th>`).join('');
  const rows=atletas.map(a=>`<tr><td>${escapeHtmlJogos(a.id.apelido||a.id.nomeCompleto)} <small>${escapeHtmlJogos(a.id.ano||'')}</small></td>${docs.map(d=>`<td class="rv-check">${rvAtletaViuDocumento(tipo,a,d,acessos||[])?'<span>V</span>':''}</td>`).join('')}</tr>`).join('')||'<tr><td colspan="2">Nenhum atleta encontrado.</td></tr>';
  conteudo=`<div class="rv-table-wrap"><table class="rv-table"><thead><tr><th>Atleta</th>${headDocs}</tr></thead><tbody>${rows}</tbody></table></div>`;
 }
 let modal=document.getElementById('relatorio-visualizacao-modal');if(!modal){modal=document.createElement('div');modal.id='relatorio-visualizacao-modal';modal.className='relatorio-visualizacao-overlay';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)closeRelatorioVisualizacao();});}
 const filtros=tipo==='planejamento_semanal'
  ? `<button class="${modo==='semana'?'active':''}" onclick="setRelatorioVisualizacaoModo('semana')">Semana</button><button class="${modo==='mes'?'active':''}" onclick="setRelatorioVisualizacaoModo('mes')">Mês</button>`
  : `<button class="${modo==='dia'?'active':''}" onclick="setRelatorioVisualizacaoModo('dia')">Dia</button><button class="${modo==='semana'?'active':''}" onclick="setRelatorioVisualizacaoModo('semana')">Semana</button><button class="${modo==='mes'?'active':''}" onclick="setRelatorioVisualizacaoModo('mes')">Mês</button>`;
 modal.innerHTML=`<div class="relatorio-visualizacao-card"><button class="relatorios-menu-close" onclick="closeRelatorioVisualizacao()">×</button><div class="rv-header"><img src="logo.png"><div><h2>Relatório de visualização</h2><strong>${escapeHtmlJogos(cfg.titulo)} - ${escapeHtmlJogos(cat.label)}</strong></div><img src="logo.png"></div><div class="rv-filtros">${filtros}<button onclick="imprimirRelatorioVisualizacao()">PDF/Imprimir</button></div>${conteudo}</div>`;
 modal.style.display='flex';
}
function setRelatorioVisualizacaoModo(modo){if(relatorioVisualizacaoState.tipo==='planejamento_semanal'&&modo==='dia')modo='semana';relatorioVisualizacaoState.modo=modo;renderRelatorioVisualizacaoDocumento();}
function closeRelatorioVisualizacao(){const m=document.getElementById('relatorio-visualizacao-modal');if(m)m.style.display='none';}
function imprimirRelatorioVisualizacao(){const card=document.querySelector('#relatorio-visualizacao-modal .relatorio-visualizacao-card');if(!card)return;const w=window.open('','_blank','width=1000,height=800');w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório de visualização</title><style>body{font-family:Arial,sans-serif;margin:12px}.relatorios-menu-close,.rv-filtros{display:none}.rv-header{display:flex;align-items:center;justify-content:center;gap:20px}.rv-header img{width:60px}.rv-header h2{text-align:center;margin:0}.rv-header strong{display:block;text-align:center}.rv-table{width:100%;border-collapse:collapse;font-size:12px}.rv-table th{background:#58111a;color:#f9c614}.rv-table th,.rv-table td{border:1px solid #999;padding:5px;text-align:center}.rv-table td:first-child{text-align:left}.rv-check span{color:green;font-weight:bold;font-size:16px}.rv-list-report{border:1px solid #d8e8c4;background:#fbfff7;padding:10px}.rv-list-date{font-size:17px;color:#5c8a2a;font-weight:bold;border-bottom:1px solid #e5eadf;padding:6px}.rv-list-obs{font-size:13px;margin:8px 0}.rv-list-cols{display:grid;grid-template-columns:1fr 1fr;gap:24px}.rv-list-col h3{font-size:14px;margin:6px 0}.rv-list-col.ok h3,.rv-list-col.ok li{color:#078c49}.rv-list-col.no h3,.rv-list-col.no li{color:#c00000}.rv-list-col ul{list-style:none;padding:0;margin:0}.rv-list-col li{font-size:12px;line-height:1.35;margin:2px 0}.rv-list-col li.empty{color:#777}@media(max-width:700px){.rv-list-cols{grid-template-columns:1fr}}</style></head><body>${card.outerHTML}<script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`);w.document.close();}



/* === GOLEIROS - INFORMAÇÕES TÉCNICAS === */
const GOLEIROS_INFO_TABELA = 'goleiros_informacoes_tecnicas';
const GOLEIROS_JOGOS_TABELA = 'goleiros_informacoes_jogos';
let goleirosTecnicoState = { selecionadoIndex: null, registro: null, carregando: false, jogos: [], jogoId: null, jogoModo: 'idle' };

function goleiroEscape(valor){return typeof escapeHtmlJogos==='function'?escapeHtmlJogos(valor):String(valor??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
function goleiroNormalizar(valor){return String(valor||'').trim().replace(/\s+/g,' ');}
function goleiroValorFlex(row, termos){const chave=Object.keys(row||{}).find(k=>termos.some(t=>String(k).toLowerCase().includes(String(t).toLowerCase())));return chave?row[chave]:'';}
function goleiroAno(row){return goleiroNormalizar(valorColunaExata(row,'Ano')||goleiroValorFlex(row,['ano']));}
function goleiroNomeCompleto(row){return goleiroNormalizar(goleiroValorFlex(row,['nome completo'])||valorColunaExata(row,'NOME COMPLETO')||goleiroValorFlex(row,['nome']));}
function goleiroApelido(row){return goleiroNormalizar(goleiroValorFlex(row,['apelido'])||valorColunaExata(row,'APELIDO')||goleiroNomeCompleto(row));}
function goleiroNascimento(row){return goleiroNormalizar(convertExcelDate(goleiroValorFlex(row,['data de nascimento','nascimento']))||goleiroValorFlex(row,['data de nascimento','nascimento']));}
function goleiroPosicao(row){return goleiroNormalizar(`${goleiroValorFlex(row,['posição 1','posicao 1','posição','posicao'])} ${goleiroValorFlex(row,['posição 2','posicao 2'])}`);}
function goleiroFoto(row){return goleiroNormalizar(goleiroValorFlex(row,['foto','imagem']))||'logo.png';}
function goleiroIdentidade(index){const row=excelData[index]||{};return {index,nomeCompleto:goleiroNomeCompleto(row),apelido:goleiroApelido(row),nascimento:goleiroNascimento(row),ano:goleiroAno(row),posicao:goleiroPosicao(row),foto:goleiroFoto(row)};}
function goleirosListaTecnica(){
 return (excelData||[]).map((row,index)=>goleiroIdentidade(index))
  .filter(g=>g.nomeCompleto&&g.nascimento&&String(g.posicao||'').toLowerCase().includes('goleiro'))
  .sort((a,b)=>String(a.ano).localeCompare(String(b.ano),'pt-BR',{numeric:true})||String(a.apelido).localeCompare(String(b.apelido),'pt-BR'));
}
function goleiroBRData(data){
 if(!data)return '';
 const d=new Date(data);
 if(isNaN(d))return '';
 return d.toLocaleString('pt-BR');
}
function goleiroJogoDataBR(v){
 const s=String(v||'').slice(0,10);
 const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 return m?`${m[3]}/${m[2]}/${m[1]}`:s;
}
function goleiroSelecionadoAtual(){
 const idx=parseInt(goleirosTecnicoState.selecionadoIndex,10);
 return Number.isInteger(idx)&&idx>=0?goleiroIdentidade(idx):null;
}
function goleiroMontarCard(g){
 if(!g)return '<div class="goleiro-info-empty">Selecione um goleiro para visualizar e editar as informações técnicas.</div>';
 return `<div class="goleiro-player-card"><img src="${goleiroEscape(g.foto)}" onerror="this.src='logo.png'" alt="${goleiroEscape(g.apelido)}"><div><strong>${goleiroEscape(g.apelido||g.nomeCompleto)}</strong><span>${goleiroEscape(g.nomeCompleto)}</span><small>Ano ${goleiroEscape(g.ano||'-')} • Nasc. ${goleiroEscape(g.nascimento||'-')}</small></div></div>`;
}
function goleiroJogoAtual(){
 const id=goleirosTecnicoState.jogoId;
 if(!id)return null;
 return (goleirosTecnicoState.jogos||[]).find(j=>String(j.id)===String(id))||null;
}
function renderGoleirosTecnicoModal(){
 const modal=document.getElementById('goleiros-tecnico-modal');if(!modal)return;
 const goleiros=goleirosListaTecnica();
 const selecionado=goleiroSelecionadoAtual();
 const registro=goleirosTecnicoState.registro;
 const texto=registro?.informacoes_tecnicas||'';
 const atualizado=registro?.atualizado_em?`Última atualização: ${goleiroBRData(registro.atualizado_em)}`:'Nenhuma informação salva ainda.';
 const options=goleiros.map(g=>`<option value="${g.index}" ${String(g.index)===String(goleirosTecnicoState.selecionadoIndex)?'selected':''}>${goleiroEscape(g.apelido)} - ${goleiroEscape(g.ano)}</option>`).join('');
 const jogos=goleirosTecnicoState.jogos||[];
 const jogo=goleiroJogoAtual();
 const mostrarDetalhe=!!jogo && goleirosTecnicoState.jogoModo==='editar';
 const jogosOpts=jogos.map(j=>`<option value="${goleiroEscape(String(j.id))}" ${mostrarDetalhe&&String(j.id)===String(goleirosTecnicoState.jogoId)?'selected':''}>${goleiroEscape(goleiroJogoDataBR(j.data_jogo))} – ${goleiroEscape(j.adversario||'Adversário')}</option>`).join('');
 const dataVal=mostrarDetalhe?String(jogo?.data_jogo||'').slice(0,10):'';
 const advVal=mostrarDetalhe?(jogo?.adversario||''):'';
 const infoJogoVal=mostrarDetalhe?(jogo?.informacoes||''):'';
 const disabled=!selecionado?'disabled':'';
 const detalhe=mostrarDetalhe?`<div class="goleiros-jogo-campos"><label class="goleiros-label" for="goleiro-jogo-data">Data do jogo</label><input type="date" id="goleiro-jogo-data" value="${goleiroEscape(dataVal)}" ${disabled}><label class="goleiros-label" for="goleiro-jogo-adversario">Adversário</label><input type="text" id="goleiro-jogo-adversario" placeholder="Nome do adversário" value="${goleiroEscape(advVal)}" ${disabled}><label class="goleiros-label" for="goleiro-jogo-info">Informação do jogo</label><textarea id="goleiro-jogo-info" placeholder="Escreva aqui a informação deste jogo..." ${disabled}>${goleiroEscape(infoJogoVal)}</textarea></div><div class="goleiros-jogo-acoes"><button type="button" onclick="salvarGoleiroJogo()" ${selecionado?'':'disabled'}>Salvar jogo</button><button type="button" class="goleiros-jogo-excluir" onclick="excluirGoleiroJogo()" ${selecionado?'':'disabled'}>Excluir jogo</button><span id="goleiro-jogo-status"></span></div>`:'';
 modal.innerHTML=`<div class="goleiros-tecnico-card"><button class="goleiros-close" onclick="closeGoleirosTecnicoModal()">×</button><div class="goleiros-head"><img src="logo.png"><div><h2>Goleiros</h2><p>Informações técnicas individuais dos goleiros</p></div></div><div class="goleiros-body"><aside><label class="goleiros-label">Selecionar goleiro</label><select id="goleiro-tecnico-select" onchange="selecionarGoleiroTecnico(this.value)" ${goleiros.length?'':'disabled'}><option value="">${goleiros.length?'Escolha um goleiro...':'Nenhum goleiro encontrado'}</option>${options}</select>${goleiroMontarCard(selecionado)}</aside><section><div class="goleiros-textarea-group"><label class="goleiros-text-title" for="goleiro-info-textarea">Informações Técnicas:</label><textarea id="goleiro-info-textarea" placeholder="Escreva aqui as informações técnicas do goleiro selecionado..." ${disabled}>${goleiroEscape(texto)}</textarea></div><div class="goleiros-footer"><span id="goleiro-info-status">${goleirosTecnicoState.carregando?'Carregando...':goleiroEscape(atualizado)}</span><button type="button" onclick="salvarGoleiroInformacoesTecnicas()" ${selecionado?'':'disabled'}>Salvar informações técnicas</button></div><div class="goleiros-jogos-box"><div class="goleiros-jogos-head"><label class="goleiros-text-title">Informações do jogo</label><button type="button" class="goleiros-jogo-novo" onclick="novoGoleiroJogo()" ${disabled}>Novo jogo</button></div><label class="goleiros-label" for="goleiro-jogo-select">Selecionar o jogo</label><select id="goleiro-jogo-select" onchange="selecionarGoleiroJogo(this.value)" ${disabled}><option value="">Selecione o jogo</option>${jogosOpts}</select>${detalhe}</div></section></div></div>`;
 modal.style.display='flex';
}
async function openGoleirosTecnicoModal(){
 let modal=document.getElementById('goleiros-tecnico-modal');
 if(!modal){modal=document.createElement('div');modal.id='goleiros-tecnico-modal';modal.className='goleiros-tecnico-overlay';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)closeGoleirosTecnicoModal();});}
 const goleiros=goleirosListaTecnica();
 goleirosTecnicoState={selecionadoIndex:goleiros[0]?.index??null,registro:null,carregando:false,jogos:[],jogoId:null,jogoModo:'idle'};
 renderGoleirosTecnicoModal();
 if(goleirosTecnicoState.selecionadoIndex!==null) await carregarGoleiroInformacaoTecnica();
}
function closeGoleirosTecnicoModal(){const modal=document.getElementById('goleiros-tecnico-modal');if(modal)modal.style.display='none';fecharPopupNovoGoleiroJogo();}
async function selecionarGoleiroTecnico(index){
 goleirosTecnicoState.selecionadoIndex=index!==''?parseInt(index,10):null;
 goleirosTecnicoState.registro=null;
 goleirosTecnicoState.jogos=[];
 goleirosTecnicoState.jogoId=null;
 goleirosTecnicoState.jogoModo='idle';
 renderGoleirosTecnicoModal();
 if(goleirosTecnicoState.selecionadoIndex!==null) await carregarGoleiroInformacaoTecnica();
}
async function carregarGoleiroInformacaoTecnica(){
 const g=goleiroSelecionadoAtual();if(!g)return;
 const keepId=goleirosTecnicoState.jogoId;
 const keepModo=goleirosTecnicoState.jogoModo;
 goleirosTecnicoState.carregando=true;renderGoleirosTecnicoModal();
 try{
  const [{data,error},{data:jogos,error:erroJogos}]=await Promise.all([
   _supabase.from(GOLEIROS_INFO_TABELA).select('*').eq('nome_completo',g.nomeCompleto).eq('nascimento',g.nascimento).maybeSingle(),
   _supabase.from(GOLEIROS_JOGOS_TABELA).select('*').eq('nome_completo',g.nomeCompleto).eq('nascimento',g.nascimento).order('data_jogo',{ascending:false}).order('atualizado_em',{ascending:false})
  ]);
  if(error)throw error;
  if(erroJogos)throw erroJogos;
  goleirosTecnicoState.registro=data||null;
  goleirosTecnicoState.jogos=Array.isArray(jogos)?jogos:[];
  const aindaExiste=keepId && goleirosTecnicoState.jogos.some(j=>String(j.id)===String(keepId));
  if(aindaExiste && keepModo==='editar'){
   goleirosTecnicoState.jogoId=keepId;
   goleirosTecnicoState.jogoModo='editar';
  }else{
   goleirosTecnicoState.jogoId=null;
   goleirosTecnicoState.jogoModo='idle';
  }
 }catch(e){console.error(e);alert('Não foi possível carregar informações do goleiro. Verifique as tabelas no Supabase.');}
 finally{goleirosTecnicoState.carregando=false;renderGoleirosTecnicoModal();}
}
async function salvarGoleiroInformacoesTecnicas(){
 const g=goleiroSelecionadoAtual();if(!g)return alert('Selecione um goleiro.');
 const textarea=document.getElementById('goleiro-info-textarea');
 const status=document.getElementById('goleiro-info-status');
 const info=String(textarea?.value||'').trim();
 const btn=document.querySelector('#goleiros-tecnico-modal .goleiros-footer button');
 if(btn){btn.disabled=true;btn.textContent='Salvando...';}
 if(status)status.textContent='Salvando no Supabase...';
 const payload={nome_completo:g.nomeCompleto,nascimento:g.nascimento,apelido:g.apelido,ano:g.ano,informacoes_tecnicas:info,informacoes_jogo:goleirosTecnicoState.registro?.informacoes_jogo||'',atualizado_em:new Date().toISOString()};
 try{
  const {error}=await _supabase.from(GOLEIROS_INFO_TABELA).upsert(payload,{onConflict:'nome_completo,nascimento'});
  if(error)throw error;
  goleirosTecnicoState.registro=Object.assign({},goleirosTecnicoState.registro||{},payload);
  if(status)status.textContent=info?'Informações técnicas salvas.':'Informações técnicas apagadas e salvas em branco.';
  alert((info?'Informações técnicas salvas para ':'Informações técnicas apagadas para ')+(g.apelido||g.nomeCompleto)+'.');
 }catch(e){console.error(e);alert('Erro ao salvar informações técnicas. Verifique a tabela/políticas no Supabase.');if(status)status.textContent='Erro ao salvar.';}
 finally{if(btn){btn.disabled=false;btn.textContent='Salvar informações técnicas';}}
}
function fecharPopupNovoGoleiroJogo(){
 const pop=document.getElementById('goleiros-jogo-novo-overlay');
 if(pop)pop.style.display='none';
}
function novoGoleiroJogo(){
 const g=goleiroSelecionadoAtual();
 if(!g)return alert('Selecione um goleiro.');
 let pop=document.getElementById('goleiros-jogo-novo-overlay');
 if(!pop){
  pop=document.createElement('div');
  pop.id='goleiros-jogo-novo-overlay';
  pop.className='goleiros-jogo-novo-overlay';
  document.body.appendChild(pop);
  pop.addEventListener('click',e=>{if(e.target===pop)fecharPopupNovoGoleiroJogo();});
 }
 pop.innerHTML=`<div class="goleiros-jogo-novo-card"><button type="button" class="goleiros-close" onclick="fecharPopupNovoGoleiroJogo()">×</button><h3>Novo jogo</h3><p>${goleiroEscape(g.apelido||g.nomeCompleto)}</p><label class="goleiros-label" for="goleiro-jogo-novo-data">Data do jogo</label><input type="date" id="goleiro-jogo-novo-data"><label class="goleiros-label" for="goleiro-jogo-novo-adversario">Adversário</label><input type="text" id="goleiro-jogo-novo-adversario" placeholder="Nome do adversário"><label class="goleiros-label" for="goleiro-jogo-novo-info">Informação do jogo</label><textarea id="goleiro-jogo-novo-info" placeholder="Escreva aqui a informação deste jogo..."></textarea><div class="goleiros-jogo-acoes"><button type="button" onclick="salvarNovoGoleiroJogoPopup()">Salvar jogo</button><button type="button" class="goleiros-jogo-excluir" onclick="fecharPopupNovoGoleiroJogo()">Cancelar</button></div></div>`;
 pop.style.display='flex';
}
function selecionarGoleiroJogo(id){
 if(!id){
  goleirosTecnicoState.jogoId=null;
  goleirosTecnicoState.jogoModo='idle';
  renderGoleirosTecnicoModal();
  return;
 }
 goleirosTecnicoState.jogoId=id;
 goleirosTecnicoState.jogoModo='editar';
 renderGoleirosTecnicoModal();
}
async function persistirGoleiroJogo(payload, manterId){
 const {data,error}=await _supabase.from(GOLEIROS_JOGOS_TABELA).upsert(payload).select().maybeSingle();
 if(error)throw error;
 goleirosTecnicoState.jogoId=(data&&data.id)||manterId||null;
 goleirosTecnicoState.jogoModo=goleirosTecnicoState.jogoId?'editar':'idle';
 await carregarGoleiroInformacaoTecnica();
}
async function salvarNovoGoleiroJogoPopup(){
 const g=goleiroSelecionadoAtual();if(!g)return alert('Selecione um goleiro.');
 const dataJogo=String(document.getElementById('goleiro-jogo-novo-data')?.value||'').trim();
 const adversario=goleiroNormalizar(document.getElementById('goleiro-jogo-novo-adversario')?.value||'');
 const informacoes=String(document.getElementById('goleiro-jogo-novo-info')?.value||'').trim();
 if(!dataJogo)return alert('Informe a data do jogo.');
 if(!adversario)return alert('Informe o adversário.');
 const payload={nome_completo:g.nomeCompleto,nascimento:g.nascimento,apelido:g.apelido,ano:g.ano,data_jogo:dataJogo,adversario,informacoes,atualizado_em:new Date().toISOString()};
 try{
  await persistirGoleiroJogo(payload,null);
  fecharPopupNovoGoleiroJogo();
  alert('Jogo salvo.');
 }catch(e){console.error(e);alert('Erro ao salvar o jogo. Verifique a tabela goleiros_informacoes_jogos no Supabase.');}
}
async function salvarGoleiroJogo(){
 const g=goleiroSelecionadoAtual();if(!g)return alert('Selecione um goleiro.');
 if(goleirosTecnicoState.jogoModo!=='editar'||!goleirosTecnicoState.jogoId)return alert('Selecione um jogo.');
 const dataJogo=String(document.getElementById('goleiro-jogo-data')?.value||'').trim();
 const adversario=goleiroNormalizar(document.getElementById('goleiro-jogo-adversario')?.value||'');
 const informacoes=String(document.getElementById('goleiro-jogo-info')?.value||'').trim();
 const status=document.getElementById('goleiro-jogo-status');
 if(!dataJogo)return alert('Informe a data do jogo.');
 if(!adversario)return alert('Informe o adversário.');
 const payload={id:goleirosTecnicoState.jogoId,nome_completo:g.nomeCompleto,nascimento:g.nascimento,apelido:g.apelido,ano:g.ano,data_jogo:dataJogo,adversario,informacoes,atualizado_em:new Date().toISOString()};
 try{
  if(status)status.textContent='Salvando jogo...';
  await persistirGoleiroJogo(payload,payload.id);
  const st=document.getElementById('goleiro-jogo-status');
  if(st)st.textContent='Jogo salvo.';
 }catch(e){console.error(e);alert('Erro ao salvar o jogo. Verifique a tabela goleiros_informacoes_jogos no Supabase.');if(status)status.textContent='Erro ao salvar jogo.';}
}
async function excluirGoleiroJogo(){
 const g=goleiroSelecionadoAtual();if(!g)return;
 const id=goleirosTecnicoState.jogoId;
 if(!id || goleirosTecnicoState.jogoModo!=='editar')return alert('Selecione um jogo para excluir.');
 const jogo=goleiroJogoAtual();
 const rotulo=jogo?`${goleiroJogoDataBR(jogo.data_jogo)} – ${jogo.adversario||''}`:'este jogo';
 if(!confirm('Excluir as informações de '+rotulo+'?'))return;
 try{
  const {error}=await _supabase.from(GOLEIROS_JOGOS_TABELA).delete().eq('id',id).eq('nome_completo',g.nomeCompleto).eq('nascimento',g.nascimento);
  if(error)throw error;
  goleirosTecnicoState.jogoId=null;
  goleirosTecnicoState.jogoModo='idle';
  await carregarGoleiroInformacaoTecnica();
 }catch(e){console.error(e);alert('Erro ao excluir o jogo.');}
}

/* === PREPARAÇÃO FÍSICA - QUEIXAS DOS ATLETAS === */
const PREPARACAO_FISICA_TABELA = 'portal_preparacao_fisica';
let preparacaoFisicaState = { lista: [], selecionadoId: null, filtro: 'pendente', carregando: false };

let preparacaoFisicaPendentesCount = 0;
function renderIndicadorPreparacaoFisica(){
 const count=Number(preparacaoFisicaPendentesCount)||0;
 document.querySelectorAll('[data-prep-alert]').forEach(el=>{
  el.classList.toggle('prep-alerta-pendente',count>0);
  if(count>0){el.setAttribute('data-prep-count',String(count));el.title=`${count} queixa(s) pendente(s) na Preparação Física`;}
  else{el.removeAttribute('data-prep-count');el.title='Preparação Física';}
 });
}
async function atualizarIndicadorPreparacaoFisica(){
 try{
  const {count,error}=await _supabase.from(PREPARACAO_FISICA_TABELA).select('id',{count:'exact',head:true}).eq('status','pendente');
  if(error){console.warn('Indicador de preparação física não carregado:',error.message);return;}
  preparacaoFisicaPendentesCount=count||0;
  renderIndicadorPreparacaoFisica();
 }catch(e){console.warn('Erro ao atualizar indicador de preparação física:',e);}
}

function prepEscape(valor){return typeof escapeHtmlJogos==='function'?escapeHtmlJogos(valor):String(valor??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
function prepISO(data){const d=new Date(data);if(isNaN(d))return '';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function prepHojeISO(){return prepISO(new Date());}
function prepBR(valor){if(!valor)return '';const s=String(valor);let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return `${m[3]}/${m[2]}/${m[1]}`;const d=new Date(s);return isNaN(d)?'':d.toLocaleString('pt-BR');}
function prepDataRespostaAte(dias){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+(Math.max(1,parseInt(dias,10)||1)-1));return prepISO(d);}
function prepLinhaStatus(row){
 const resp=String(row?.resposta||'').trim();
 if(resp){
  const ate=String(row?.resposta_ate||'').slice(0,10);
  if(ate && ate < prepHojeISO())return {classe:'expirada',label:'Resposta expirada'};
  return {classe:'respondida',label:'Respondida'};
 }
 return {classe:'pendente',label:'Pendente'};
}
function prepListaFiltrada(){
 const lista=preparacaoFisicaState.lista||[];
 if(preparacaoFisicaState.filtro==='todas')return lista;
 return lista.filter(r=>{
  const st=prepLinhaStatus(r).classe;
  if(preparacaoFisicaState.filtro==='pendente')return st==='pendente';
  if(preparacaoFisicaState.filtro==='respondida')return st==='respondida';
  if(preparacaoFisicaState.filtro==='expirada')return st==='expirada';
  return true;
 });
}
function prepSelecionada(){return (preparacaoFisicaState.lista||[]).find(r=>String(r.id)===String(preparacaoFisicaState.selecionadoId))||null;}
function prepResumoTexto(txt,tam=90){txt=String(txt||'').trim();return txt.length>tam?txt.slice(0,tam-1)+'…':txt;}
function renderPreparacaoFisicaQueixasModal(){
 const modal=document.getElementById('preparacao-fisica-modal');if(!modal)return;
 const lista=prepListaFiltrada();
 const selecionada=prepSelecionada();
 const filtros=['pendente','respondida','expirada','todas'].map(f=>`<button class="${preparacaoFisicaState.filtro===f?'active':''}" onclick="setPreparacaoFisicaFiltro('${f}')">${f==='pendente'?'Pendentes':f==='respondida'?'Respondidas':f==='expirada'?'Expiradas':'Todas'}</button>`).join('');
 const linhas=lista.map(r=>{const st=prepLinhaStatus(r);const ativo=String(r.id)===String(preparacaoFisicaState.selecionadoId);return `<button class="prep-queixa-item ${ativo?'active':''}" onclick="selecionarPreparacaoFisicaQueixa('${r.id}')"><div><strong>${prepEscape(r.apelido||r.nome_completo||'Atleta')}</strong><span>${prepEscape(r.ano||'')} • ${prepBR(r.criado_em)}</span></div><p>${prepEscape(prepResumoTexto(r.queixa||''))}</p><em class="${st.classe}">${st.label}</em></button>`;}).join('')||'<div class="prep-empty">Nenhuma queixa encontrada neste filtro.</div>';
 const detalhe=selecionada?renderPreparacaoFisicaDetalhe(selecionada):'<div class="prep-detalhe-empty">Selecione uma queixa para responder.</div>';
 modal.innerHTML=`<div class="prep-fisica-card"><button class="prep-close" onclick="closePreparacaoFisicaQueixasModal()">×</button><div class="prep-head"><img src="logo.png"><div><h2>Preparação Física</h2><p>Queixas de dores enviadas pelos atletas</p></div></div><div class="prep-toolbar"><div>${filtros}</div><button class="prep-refresh" onclick="carregarPreparacaoFisicaQueixas()">Atualizar</button></div><div class="prep-layout"><aside><div class="prep-list-head"><b>Queixas</b><span>${lista.length} registro(s)</span></div><div class="prep-list">${preparacaoFisicaState.carregando?'<div class="prep-loading">Carregando...</div>':linhas}</div></aside><section>${detalhe}</section></div></div>`;
 modal.style.display='flex';
 atualizarPreparacaoFisicaDataAtePreview();
}
function renderPreparacaoFisicaDetalhe(r){
 const st=prepLinhaStatus(r);
 const dias=Number(r.resposta_dias)||3;
 return `<div class="prep-detalhe"><div class="prep-atleta"><strong>${prepEscape(r.apelido||r.nome_completo||'Atleta')}</strong><span>${prepEscape(r.nome_completo||'')}</span><small>Ano ${prepEscape(r.ano||'-')} • Nasc. ${prepEscape(r.nascimento||'-')} • Enviado em ${prepBR(r.criado_em)}</small><em class="${st.classe}">${st.label}</em></div><label>Queixa do atleta</label><div class="prep-queixa-texto">${prepEscape(r.queixa||'').replace(/\n/g,'<br>')}</div><label for="prep-resposta-textarea">Resposta / recomendação</label><div class="prep-quick"><button onclick="setPreparacaoRespostaRapida('Visto',1)">Visto</button><button onclick="setPreparacaoRespostaRapida('Não realizar academia.',3)">Não realizar academia</button><button onclick="setPreparacaoRespostaRapida('Reduzir carga e avisar a preparação física antes do treino.',3)">Reduzir carga</button><button onclick="setPreparacaoRespostaRapida('Procurar a preparação física antes do treino.',2)">Procurar preparação</button></div><textarea id="prep-resposta-textarea" placeholder="Digite a resposta para o atleta...">${prepEscape(r.resposta||'')}</textarea><div class="prep-dias"><label>Dias que a resposta ficará visível<input id="prep-resposta-dias" type="number" min="1" max="30" value="${dias}" oninput="atualizarPreparacaoFisicaDataAtePreview()"></label><span id="prep-resposta-ate-preview"></span></div><div class="prep-actions"><button class="salvar" onclick="salvarRespostaPreparacaoFisica()">Salvar resposta</button><button class="limpar" onclick="limparRespostaPreparacaoFisica()">Limpar resposta</button></div></div>`;
}
async function openPreparacaoFisicaQueixasModal(){
 let modal=document.getElementById('preparacao-fisica-modal');
 if(!modal){modal=document.createElement('div');modal.id='preparacao-fisica-modal';modal.className='prep-fisica-overlay';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)closePreparacaoFisicaQueixasModal();});}
 modal.style.display='flex';
 renderPreparacaoFisicaQueixasModal();
 await carregarPreparacaoFisicaQueixas();
}
function closePreparacaoFisicaQueixasModal(){const modal=document.getElementById('preparacao-fisica-modal');if(modal)modal.style.display='none';}
async function carregarPreparacaoFisicaQueixas(){
 preparacaoFisicaState.carregando=true;renderPreparacaoFisicaQueixasModal();
 try{
  const {data,error}=await _supabase.from(PREPARACAO_FISICA_TABELA).select('*').order('criado_em',{ascending:false});
  if(error)throw error;
  preparacaoFisicaState.lista=data||[];
  preparacaoFisicaPendentesCount=preparacaoFisicaState.lista.filter(r=>String(r.status||'').toLowerCase()==='pendente').length;
  renderIndicadorPreparacaoFisica();
  if(!preparacaoFisicaState.lista.some(r=>String(r.id)===String(preparacaoFisicaState.selecionadoId)))preparacaoFisicaState.selecionadoId=preparacaoFisicaState.lista[0]?.id||null;
 }catch(e){console.error(e);alert('Erro ao carregar queixas. Verifique a tabela portal_preparacao_fisica no Supabase.');preparacaoFisicaState.lista=[];}
 finally{preparacaoFisicaState.carregando=false;renderPreparacaoFisicaQueixasModal();}
}
function setPreparacaoFisicaFiltro(filtro){preparacaoFisicaState.filtro=filtro;renderPreparacaoFisicaQueixasModal();}
function selecionarPreparacaoFisicaQueixa(id){preparacaoFisicaState.selecionadoId=id;renderPreparacaoFisicaQueixasModal();}
function setPreparacaoRespostaRapida(texto,dias){const t=document.getElementById('prep-resposta-textarea');if(t)t.value=texto;const d=document.getElementById('prep-resposta-dias');if(d)d.value=dias||3;atualizarPreparacaoFisicaDataAtePreview();}
function atualizarPreparacaoFisicaDataAtePreview(){const el=document.getElementById('prep-resposta-ate-preview');if(!el)return;const dias=document.getElementById('prep-resposta-dias')?.value||1;el.textContent='Visível até '+prepBR(prepDataRespostaAte(dias));}
async function salvarRespostaPreparacaoFisica(){
 const r=prepSelecionada();if(!r)return alert('Selecione uma queixa.');
 const resposta=String(document.getElementById('prep-resposta-textarea')?.value||'').trim();
 if(!resposta)return alert('Digite uma resposta ou use uma resposta rápida.');
 const dias=Math.max(1,parseInt(document.getElementById('prep-resposta-dias')?.value,10)||1);
 const payload={resposta,resposta_dias:dias,resposta_ate:prepDataRespostaAte(dias),respondido_por:'Preparação Física',status:'respondido',visto_atleta:false,atualizado_em:new Date().toISOString()};
 const btn=document.querySelector('#preparacao-fisica-modal .prep-actions .salvar');if(btn){btn.disabled=true;btn.textContent='Salvando...';}
 try{
  const {error}=await _supabase.from(PREPARACAO_FISICA_TABELA).update(payload).eq('id',r.id);
  if(error)throw error;
  alert('Resposta salva com sucesso.');
  await carregarPreparacaoFisicaQueixas();
  await atualizarIndicadorPreparacaoFisica();
 }catch(e){console.error(e);alert('Erro ao salvar resposta.');}
 finally{if(btn){btn.disabled=false;btn.textContent='Salvar resposta';}}
}
async function limparRespostaPreparacaoFisica(){
 const r=prepSelecionada();if(!r)return alert('Selecione uma queixa.');
 if(!confirm('Limpar a resposta desta queixa e voltar para pendente?'))return;
 const payload={resposta:null,resposta_dias:null,resposta_ate:null,respondido_por:null,status:'pendente',visto_atleta:false,atualizado_em:new Date().toISOString()};
 try{
  const {error}=await _supabase.from(PREPARACAO_FISICA_TABELA).update(payload).eq('id',r.id);
  if(error)throw error;
  await carregarPreparacaoFisicaQueixas();
  await atualizarIndicadorPreparacaoFisica();
 }catch(e){console.error(e);alert('Erro ao limpar resposta.');}
}


/* === MONITORAMENTO DE CARGA - PSR/PSE === */
const MONITORAMENTO_CARGA_VIEW = 'vw_monitoramento_carga_psr_pse';
let monitorCargaState = { lista: [], carregando: false, data: '', ano: 'todos', zona: 'todas', busca: '', somenteAlertas: false, regraOuro: false };

function mcEscape(valor){return typeof escapeHtmlJogos==='function'?escapeHtmlJogos(valor):String(valor??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
function mcNorm(valor){return String(valor||'').trim().replace(/\s+/g,' ');}
function mcBR(valor){if(!valor)return '';const s=String(valor).slice(0,10);const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return `${m[3]}/${m[2]}/${m[1]}`;const d=new Date(valor);return isNaN(d)?s:d.toLocaleDateString('pt-BR');}
function mcNum(valor,dig=0){if(valor===null||valor===undefined||valor==='')return '—';const n=Number(valor);if(Number.isNaN(n))return '—';return dig>0?n.toFixed(dig).replace('.',','):String(Math.round(n));}
function mcParseAlertas(valor){if(Array.isArray(valor))return valor.filter(Boolean);if(typeof valor==='string'){try{const arr=JSON.parse(valor);return Array.isArray(arr)?arr.filter(Boolean):[];}catch(e){return valor? [valor]:[];}}return [];}
function mcValorFlex(row,termos){const chave=Object.keys(row||{}).find(k=>termos.some(t=>String(k).toLowerCase().includes(String(t).toLowerCase())));return chave?row[chave]:'';}
function mcAtletaBase(row){
 const nome=mcNorm(row?.nome_completo);const nasc=mcNorm(row?.nascimento);
 return (excelData||[]).find(r=>mcNorm(mcValorFlex(r,['nome completo'])||valorColunaExata(r,'NOME COMPLETO')||mcValorFlex(r,['nome']))===nome && mcNorm(convertExcelDate(mcValorFlex(r,['data de nascimento','nascimento']))||mcValorFlex(r,['data de nascimento','nascimento']))===nasc)||null;
}
function mcApelido(row){const base=mcAtletaBase(row);return base?(mcNorm(mcValorFlex(base,['apelido'])||valorColunaExata(base,'APELIDO'))||row.nome_completo):row.nome_completo;}
function mcAno(row){const base=mcAtletaBase(row);return mcNorm(row?.ano|| (base?(valorColunaExata(base,'Ano')||mcValorFlex(base,['ano'])):''));}
function mcTemAlerta(row){
 const alertas=mcParseAlertas(row.alertas_itens);
 return alertas.length>0 || !!row.regra_ouro_ajustar || ['amarelo','vermelho'].includes(String(row.zona_cor||'')) || ['salto','salto grande'].includes(String(row.alerta_variacao||''));
}
function mcDadosFiltrados(){
 let dados=[...(monitorCargaState.lista||[])];
 if(monitorCargaState.data)dados=dados.filter(r=>String(r.data).slice(0,10)===monitorCargaState.data);
 if(monitorCargaState.ano!=='todos')dados=dados.filter(r=>mcAno(r)===monitorCargaState.ano);
 if(monitorCargaState.zona!=='todas')dados=dados.filter(r=>String(r.zona_cor||'sem')===monitorCargaState.zona);
 if(monitorCargaState.somenteAlertas)dados=dados.filter(mcTemAlerta);
 if(monitorCargaState.regraOuro)dados=dados.filter(r=>!!r.regra_ouro_ajustar);
 const busca=mcNorm(monitorCargaState.busca).toLowerCase();
 if(busca)dados=dados.filter(r=>`${mcApelido(r)} ${r.nome_completo||''} ${mcAno(r)}`.toLowerCase().includes(busca));
 return dados.sort((a,b)=>String(b.data).localeCompare(String(a.data))||String(mcApelido(a)).localeCompare(String(mcApelido(b)),'pt-BR'));
}
function mcAnosDisponiveis(){return [...new Set((excelData||[]).map(r=>String(valorColunaExata(r,'Ano')||mcValorFlex(r,['ano'])).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true}));}
function mcResumo(dados){
 return {total:dados.length, ouro:dados.filter(r=>r.regra_ouro_ajustar).length, vermelho:dados.filter(r=>r.zona_cor==='vermelho').length, amarelo:dados.filter(r=>r.zona_cor==='amarelo').length, alertas:dados.filter(mcTemAlerta).length};
}
function mcZonaLabel(row){return row.zona||'Histórico insuficiente';}
function mcAlertasHTML(row){
 const a=mcParseAlertas(row.alertas_itens);
 if(row.alerta_variacao)a.push(row.alerta_variacao==='salto grande'?'Salto grande de carga':'Salto de carga');
 if(row.regra_ouro_ajustar)a.push('Regra de ouro: ajustar carga');
 return a.length?a.map(x=>`<span>${mcEscape(x)}</span>`).join(''):'<em>—</em>';
}
function renderMonitoramentoCargaTabela(dados){
 if(!dados.length)return '<div class="mc-empty">Nenhum registro encontrado para os filtros selecionados.</div>';
 return `<div class="mc-table-wrap"><table class="mc-table"><thead><tr><th>Atleta</th><th>Data</th><th>PSE</th><th>PSR</th><th>Carga</th><th>CA 7</th><th>CC 28</th><th>ACWR</th><th>Zona</th><th>Recuperação</th><th>Variação</th><th>Alertas</th></tr></thead><tbody>${dados.map(r=>`<tr class="${r.regra_ouro_ajustar?'mc-regra':''}"><td class="mc-atleta"><b>${mcEscape(mcApelido(r))}</b><small>${mcEscape(r.nome_completo||'')} ${mcAno(r)?'• '+mcEscape(mcAno(r)):''}</small></td><td>${mcBR(r.data)}</td><td>${mcNum(r.pse_valor)}</td><td>${mcNum(r.psr_total)}</td><td>${mcNum(r.carga_sessao)}</td><td>${mcNum(r.carga_aguda)}</td><td>${mcNum(r.carga_cronica,1)}</td><td>${mcNum(r.acwr,2)}</td><td><span class="mc-zona ${mcEscape(r.zona_cor||'sem')}">${mcEscape(mcZonaLabel(r))}</span></td><td>${mcEscape(r.classificacao_recuperacao||'—')}</td><td>${r.perc_variacao!==null&&r.perc_variacao!==undefined?mcNum(r.perc_variacao,1)+'%':'—'}</td><td class="mc-alertas">${mcAlertasHTML(r)}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderMonitoramentoCargaModal(){
 const modal=document.getElementById('monitoramento-carga-modal');if(!modal)return;
 const dados=mcDadosFiltrados();const res=mcResumo(dados);const anos=mcAnosDisponiveis();
 const datas=[...new Set((monitorCargaState.lista||[]).map(r=>String(r.data).slice(0,10)).filter(Boolean))].sort().reverse();
 modal.innerHTML=`<div class="mc-card"><button class="mc-close" onclick="closeMonitoramentoCargaModal()">×</button><div class="mc-head"><img src="logo.png"><div><h2>Monitoramento de Carga</h2><p>PSR × PSE • sRPE 120min • últimos 7/28 registros válidos</p></div></div><div class="mc-filtros"><label>Data <input type="date" value="${mcEscape(monitorCargaState.data)}" onchange="setMonitorCargaFiltro('data',this.value)"></label><button onclick="setMonitorCargaFiltro('data','')">Todas datas</button><select onchange="setMonitorCargaFiltro('ano',this.value)"><option value="todos">Todos os anos</option>${anos.map(a=>`<option value="${mcEscape(a)}" ${monitorCargaState.ano===a?'selected':''}>${mcEscape(a)}</option>`).join('')}</select><select onchange="setMonitorCargaFiltro('zona',this.value)"><option value="todas">Todas as zonas</option><option value="azul" ${monitorCargaState.zona==='azul'?'selected':''}>Azul - baixa</option><option value="verde" ${monitorCargaState.zona==='verde'?'selected':''}>Verde - normal</option><option value="amarelo" ${monitorCargaState.zona==='amarelo'?'selected':''}>Amarelo - atenção</option><option value="vermelho" ${monitorCargaState.zona==='vermelho'?'selected':''}>Vermelho - sobrecarga</option><option value="sem" ${monitorCargaState.zona==='sem'?'selected':''}>Histórico insuficiente</option></select><input class="mc-busca" placeholder="Buscar atleta..." value="${mcEscape(monitorCargaState.busca)}" oninput="setMonitorCargaFiltro('busca',this.value)"><label class="mc-check"><input type="checkbox" ${monitorCargaState.somenteAlertas?'checked':''} onchange="setMonitorCargaFiltro('somenteAlertas',this.checked)"> Alertas</label><label class="mc-check"><input type="checkbox" ${monitorCargaState.regraOuro?'checked':''} onchange="setMonitorCargaFiltro('regraOuro',this.checked)"> Regra ouro</label><button class="mc-refresh" onclick="carregarMonitoramentoCarga()">Atualizar</button><button onclick="imprimirMonitoramentoCarga()">Imprimir/PDF</button></div><div class="mc-summary"><div><b>${res.total}</b><span>Registros</span></div><div class="ouro"><b>${res.ouro}</b><span>Regra ouro</span></div><div class="red"><b>${res.vermelho}</b><span>Sobrecarga</span></div><div class="yellow"><b>${res.amarelo}</b><span>Atenção</span></div><div><b>${res.alertas}</b><span>Com alertas</span></div></div><div id="mc-print-area"><p class="mc-note">CA e % variação aparecem a partir de 7 registros válidos de PSE. CC e ACWR aparecem a partir de 28 registros válidos.</p>${monitorCargaState.carregando?'<div class="mc-loading">Carregando dados...</div>':renderMonitoramentoCargaTabela(dados)}</div></div>`;
 modal.style.display='flex';
}
async function openMonitoramentoCargaModal(){
 let modal=document.getElementById('monitoramento-carga-modal');
 if(!modal){modal=document.createElement('div');modal.id='monitoramento-carga-modal';modal.className='mc-overlay';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)closeMonitoramentoCargaModal();});}
 modal.style.display='flex';renderMonitoramentoCargaModal();await carregarMonitoramentoCarga();
}
function closeMonitoramentoCargaModal(){const modal=document.getElementById('monitoramento-carga-modal');if(modal)modal.style.display='none';}
function setMonitorCargaFiltro(campo,valor){monitorCargaState[campo]=valor;renderMonitoramentoCargaModal();}
async function carregarMonitoramentoCarga(){
 monitorCargaState.carregando=true;renderMonitoramentoCargaModal();
 try{
  const {data,error}=await _supabase.from(MONITORAMENTO_CARGA_VIEW).select('*').order('data',{ascending:false}).limit(5000);
  if(error)throw error;
  monitorCargaState.lista=data||[];
  if(!monitorCargaState.data&&monitorCargaState.lista.length)monitorCargaState.data=String(monitorCargaState.lista[0].data).slice(0,10);
 }catch(e){console.error(e);alert('Erro ao carregar Monitoramento de Carga. Verifique a view vw_monitoramento_carga_psr_pse no Supabase.');monitorCargaState.lista=[];}
 finally{monitorCargaState.carregando=false;renderMonitoramentoCargaModal();}
}
function imprimirMonitoramentoCarga(){
 const area=document.getElementById('mc-print-area');if(!area)return;
 const w=window.open('','_blank','width=1200,height=850');
 w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Monitoramento de Carga</title><style>body{font-family:Arial,sans-serif;margin:12px}.mc-note{font-size:11px;color:#555}.mc-table{width:100%;border-collapse:collapse;font-size:10px}.mc-table th{background:#58111a;color:#f9c614}.mc-table th,.mc-table td{border:1px solid #999;padding:4px;text-align:center}.mc-atleta{text-align:left!important}.mc-atleta b{display:block}.mc-atleta small{display:block;color:#555}.mc-zona{border-radius:8px;padding:3px 6px;font-weight:bold}.mc-zona.azul{background:#dbeafe}.mc-zona.verde{background:#dcfce7}.mc-zona.amarelo{background:#fef3c7}.mc-zona.vermelho{background:#fee2e2}.mc-alertas span{display:block}.mc-regra{background:#fff1f2}@page{size:landscape;margin:8mm}</style></head><body><h2>Monitoramento de Carga - CFA Prosol</h2>${area.outerHTML}<script>window.onload=()=>setTimeout(()=>window.print(),350)<\/script></body></html>`);
 w.document.close();
}

/* === RELATÓRIO PSR / PSE - PORTAL DO ATLETA === */
const RELATORIO_PSRPSE_EXTRAS_KEY = 'prosol_relatorio_psrpse_extras_v1';
let relatorioPsrPseState = {
 tipo:'psr',
 data:'',
 view:'notas',
 sort:{key:'nome',dir:'asc'},
 categorias:{sub11:false,sub12:false,sub13:false,sub16:false},
 respostas:[],
 carregando:false
};
let relatorioPsrPseExtraModal = {categoriaId:'sub16',filtroAno:'todos',busca:''};
let relatorioPsrPseExtras = carregarRelatorioPsrPseExtras();

function rppEscape(v){return typeof escapeHtmlJogos==='function'?escapeHtmlJogos(v):String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
function rppCats(){return categoriasTrabalhoDiarioConfig();}
function rppCatIds(){return Object.keys(rppCats());}
function rppDataISO(data){const d=new Date(data);if(isNaN(d))return '';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function rppParseData(valor){const s=String(valor||'');const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return new Date(+m[1],+m[2]-1,+m[3]);const d=new Date(s);return isNaN(d)?new Date():d;}
function rppBR(valor,ano=false){const d=rppParseData(valor);return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}${ano?`/${d.getFullYear()}`:''}`;}
function rppAjustarFimSemanaParaSexta(valor){const d=rppParseData(valor);const dia=d.getDay();if(dia===6)d.setDate(d.getDate()-1);else if(dia===0)d.setDate(d.getDate()-2);return rppDataISO(d);}
function rppDataPadrao(){return rppAjustarFimSemanaParaSexta(rppDataISO(new Date()));}
function rppInicioSemana(valor){const d=rppParseData(valor);const dia=d.getDay();const diff=dia===0?-6:1-dia;d.setDate(d.getDate()+diff);d.setHours(0,0,0,0);return d;}
function rppDiasUteisSemana(valor){const ini=rppInicioSemana(valor);return [0,1,2,3,4].map(i=>{const d=new Date(ini);d.setDate(ini.getDate()+i);return rppDataISO(d);});}
function rppDiasUteisMes(valor){const base=rppParseData(valor);const d=new Date(base.getFullYear(),base.getMonth(),1);const out=[];while(d.getMonth()===base.getMonth()){const dia=d.getDay();if(dia>=1&&dia<=5)out.push(rppDataISO(d));d.setDate(d.getDate()+1);}return out;}
function rppPeriodoAtual(){
 if(relatorioPsrPseState.view==='semanal'){const dias=rppDiasUteisSemana(relatorioPsrPseState.data);return {inicio:dias[0],fim:dias[dias.length-1],dias};}
 if(relatorioPsrPseState.view==='mensal'){const dias=rppDiasUteisMes(relatorioPsrPseState.data);return {inicio:dias[0]||relatorioPsrPseState.data,fim:dias[dias.length-1]||relatorioPsrPseState.data,dias};}
 return {inicio:relatorioPsrPseState.data,fim:relatorioPsrPseState.data,dias:[relatorioPsrPseState.data]};
}
function rppDefaultCategorias(){const out={};rppCatIds().forEach(id=>out[id]=false);return out;}
function rppCategoriasSelecionadas(){return rppCatIds().filter(id=>!!relatorioPsrPseState.categorias[id]);}
function carregarRelatorioPsrPseExtras(){
 const vazio={sub11:[],sub12:[],sub13:[],sub16:[]};
 try{const obj=JSON.parse(localStorage.getItem(RELATORIO_PSRPSE_EXTRAS_KEY)||'{}')||{};rppCatIds().forEach(id=>{vazio[id]=Array.isArray(obj[id])?obj[id]:[];});}catch(e){}
 return vazio;
}
function salvarRelatorioPsrPseExtras(){try{localStorage.setItem(RELATORIO_PSRPSE_EXTRAS_KEY,JSON.stringify(relatorioPsrPseExtras));}catch(e){console.warn('Não foi possível salvar extras PSR/PSE:',e);}}
function rppKeyAtletaId(id){return trabalhoChaveAtleta(id);}
function rppKeyExtra(extra){const nome=normalizarTextoTrabalho(extra?.nomeCompleto||extra?.nome_completo||extra?.nome||'');const nasc=normalizarTextoTrabalho(extra?.nascimento||extra?.data_nascimento||'');const ano=normalizarTextoTrabalho(extra?.ano||'');return nome+'||'+(nasc||ano);}
function rppNormalizarExtra(item,catId){const id=item?.id||item||{};return {nomeCompleto:normalizarTextoTrabalho(id.nomeCompleto||id.nome_completo||id.nome||''),apelido:normalizarTextoTrabalho(id.apelido||id.nomeCompleto||id.nome||''),nascimento:normalizarTextoTrabalho(id.nascimento||''),ano:normalizarTextoTrabalho(id.ano||''),categoriaId:catId};}
function rppExtraList(catId){if(!relatorioPsrPseExtras[catId])relatorioPsrPseExtras[catId]=[];return relatorioPsrPseExtras[catId];}
function rppLocalizarExtra(extra){
 const nome=normalizarTextoTrabalho(extra?.nomeCompleto||extra?.nome_completo||extra?.nome||'');
 const nasc=normalizarTextoTrabalho(extra?.nascimento||'');
 const ano=normalizarTextoTrabalho(extra?.ano||'');
 let item=null;
 if(nome&&nasc)item=trabalhoTodosAtletas().find(a=>normalizarTextoTrabalho(a.id.nomeCompleto)===nome&&normalizarTextoTrabalho(a.id.nascimento)===nasc)||null;
 if(!item&&nome&&ano)item=localizarAtletaTrabalhoPorNomeAno({nomeCompleto:nome,ano});
 if(item)return item;
 if(nome)return {id:{nomeCompleto:nome,apelido:normalizarTextoTrabalho(extra?.apelido||nome),nascimento:nasc,ano}};
 return null;
}
function rppAtletasRelatorio(){
 const mapa=new Map();
 const cats=rppCats();
 rppCategoriasSelecionadas().forEach(catId=>{
  const cat=cats[catId];
  trabalhoAtletasPorAnos(cat?.anos||[]).forEach(a=>mapa.set(rppKeyAtletaId(a.id),a));
 });
 rppCategoriasSelecionadas().forEach(catId=>{
  rppExtraList(catId).forEach(extra=>{const item=rppLocalizarExtra(extra);if(item){const key=rppKeyAtletaId(item.id)||rppKeyExtra(extra);if(key&&!mapa.has(key))mapa.set(key,item);}});
 });
 return Array.from(mapa.values());
}
function rppRespostaAtletaData(atleta,dataISO){
 const nome=normalizarTextoTrabalho(atleta?.id?.nomeCompleto||'');
 const nasc=normalizarTextoTrabalho(atleta?.id?.nascimento||'');
 return (relatorioPsrPseState.respostas||[]).find(r=>{
  const rn=normalizarTextoTrabalho(r.nome_completo||r.nomeCompleto||'');
  const rnas=normalizarTextoTrabalho(r.nascimento||'');
  const rd=String(r.data||'').slice(0,10);
  return rn===nome && (!nasc || rnas===nasc) && rd===dataISO;
 })||null;
}
function rppObjResposta(row,tipo=relatorioPsrPseState.tipo){const obj=row&&row[tipo];return obj&&typeof obj==='object'?obj:{};}
function rppRespondido(row,tipo=relatorioPsrPseState.tipo){
 const obj=rppObjResposta(row,tipo);
 if(tipo==='psr')return ['sono','fadiga','dor_muscular','estresse_mental','motivacao'].some(k=>obj[k]!==undefined&&obj[k]!==null&&obj[k]!=='' ) || !!obj.preenchido_em;
 return obj.valor!==undefined&&obj.valor!==null&&obj.valor!=='' || !!obj.preenchido_em;
}
function rppValorCampo(atleta,key,dataISO=relatorioPsrPseState.data){
 const row=rppRespostaAtletaData(atleta,dataISO);const obj=rppObjResposta(row);
 if(key==='nome')return atleta.id.apelido||atleta.id.nomeCompleto||'';
 if(key==='ano')return atleta.id.ano||'';
 if(key==='respondeu')return rppRespondido(row)?1:0;
 if(key==='descricao')return relatorioPsrPseState.tipo==='psr'?(obj.dor_descricao||''):(obj.descricao||'');
 if(key==='pse_valor')return obj.valor;
 if(key==='sono')return obj.sono;
 if(key==='fadiga')return obj.fadiga;
 if(key==='dor_muscular')return obj.dor_muscular;
 if(key==='estresse_mental')return obj.estresse_mental;
 if(key==='motivacao')return obj.motivacao;
 if(key.startsWith('dia:')){const dia=key.slice(4);return rppRespondido(rppRespostaAtletaData(atleta,dia))?1:0;}
 if(key==='total'){return rppPeriodoAtual().dias.reduce((acc,d)=>acc+(rppRespondido(rppRespostaAtletaData(atleta,d))?1:0),0);}
 return '';
}
function rppSortHeader(key,label){
 const sort=relatorioPsrPseState.sort||{};const active=sort.key===key;const arrow=active?(sort.dir==='asc'?' ▲':' ▼'):'';
 return `<th class="${active?'rpp-sort-active':''}"><button type="button" onclick="sortRelatorioPsrPse('${key}')">${rppEscape(label)}${arrow}</button></th>`;
}
function rppCompareNome(a,b){return String(a.id.apelido||a.id.nomeCompleto||'').localeCompare(String(b.id.apelido||b.id.nomeCompleto||''),'pt-BR');}
function rppOrdenarAtletas(atletas){
 const sort=relatorioPsrPseState.sort||{key:'nome',dir:'asc'};const key=sort.key;const dir=sort.dir==='desc'?-1:1;
 const numericKeys=['sono','fadiga','dor_muscular','estresse_mental','motivacao','pse_valor','respondeu','total'];
 return [...atletas].sort((a,b)=>{
  if(key==='nome')return dir*rppCompareNome(a,b);
  if(key==='ano'){const r=String(a.id.ano||'').localeCompare(String(b.id.ano||''),'pt-BR',{numeric:true});return r?dir*r:rppCompareNome(a,b);}
  if(key==='descricao'){
   const va=String(rppValorCampo(a,key)||'').trim();const vb=String(rppValorCampo(b,key)||'').trim();
   const ha=va?1:0,hb=vb?1:0;
   if(ha!==hb)return sort.dir==='desc'?hb-ha:ha-hb;
   const r=va.localeCompare(vb,'pt-BR');return r||rppCompareNome(a,b);
  }
  if(key.startsWith('dia:')||numericKeys.includes(key)){
   const va=rppValorCampo(a,key),vb=rppValorCampo(b,key);
   const ea=va===undefined||va===null||va==='',eb=vb===undefined||vb===null||vb==='';
   if(ea&&eb)return rppCompareNome(a,b);
   if(ea)return 1;if(eb)return -1;
   const na=Number(va),nb=Number(vb);const r=na===nb?0:(na>nb?1:-1);
   return r?dir*r:rppCompareNome(a,b);
  }
  return rppCompareNome(a,b);
 });
}
function rppDefaultSortParaView(view,tipo){if(view==='notas')return {key:tipo==='psr'?'nome':'nome',dir:'asc'};if(view==='mensal')return {key:'total',dir:'desc'};return {key:'nome',dir:'asc'};}
function rppValorHTML(valor){return (valor===undefined||valor===null||valor==='')?'<span class="rpp-muted">—</span>':rppEscape(valor);}
function rppVX(respondeu){return respondeu?'<span class="rpp-v">V</span>':'<span class="rpp-x">X</span>';}
function rppRenderTabelaNotas(atletas){
 const tipo=relatorioPsrPseState.tipo;
 const cols=tipo==='psr'
  ? [{k:'nome',l:'Nome'},{k:'ano',l:'Ano'},{k:'sono',l:'Qualidade do sono'},{k:'fadiga',l:'Fadiga'},{k:'estresse_mental',l:'Estresse'},{k:'motivacao',l:'Motivação'},{k:'dor_muscular',l:'Dor Muscular'},{k:'descricao',l:'Descrição'}]
  : [{k:'nome',l:'Nome'},{k:'ano',l:'Ano'},{k:'pse_valor',l:'PSE'},{k:'descricao',l:'Descrição'}];
 const rows=rppOrdenarAtletas(atletas).map(a=>{
  const row=rppRespostaAtletaData(a,relatorioPsrPseState.data);const obj=rppObjResposta(row,tipo);
  if(tipo==='psr')return `<tr><td class="rpp-nome">${rppEscape(a.id.apelido||a.id.nomeCompleto)}</td><td>${rppEscape(a.id.ano||'')}</td><td>${rppValorHTML(obj.sono)}</td><td>${rppValorHTML(obj.fadiga)}</td><td>${rppValorHTML(obj.estresse_mental)}</td><td>${rppValorHTML(obj.motivacao)}</td><td>${rppValorHTML(obj.dor_muscular)}</td><td class="rpp-desc">${rppValorHTML(obj.dor_descricao)}</td></tr>`;
  return `<tr><td class="rpp-nome">${rppEscape(a.id.apelido||a.id.nomeCompleto)}</td><td>${rppEscape(a.id.ano||'')}</td><td>${rppValorHTML(obj.valor)}</td><td class="rpp-desc">${rppValorHTML(obj.descricao)}</td></tr>`;
 }).join('')||`<tr><td colspan="${cols.length}" class="rpp-empty">Nenhum atleta nas categorias selecionadas.</td></tr>`;
 return `<table class="rpp-table"><thead><tr>${cols.map(c=>rppSortHeader(c.k,c.l)).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}
function rppNomeAnoAtleta(atleta){return `${atleta?.id?.apelido||atleta?.id?.nomeCompleto||''}${atleta?.id?.ano?` - ${atleta.id.ano}`:''}`;}
function rppDiaSemanaTexto(valor){return rppParseData(valor).toLocaleDateString('pt-BR',{weekday:'long'}).replace(/^./,c=>c.toUpperCase());}
function rppRenderListaPresencaDiaria(atletas){
 const ordenados=[...(atletas||[])].sort(rppCompareNome);
 if(!ordenados.length)return `<div class="rpp-list-report"><div class="rpp-empty">Selecione uma categoria para visualizar o relatório.</div></div>`;
 const respondidos=[];const ausentes=[];
 ordenados.forEach(a=>{(rppRespondido(rppRespostaAtletaData(a,relatorioPsrPseState.data))?respondidos:ausentes).push(a);});
 const lista=(arr,ok)=>arr.length?arr.map(a=>`<li class="${ok?'ok':'no'}"><span>${ok?'✓':'×'}</span>${rppEscape(rppNomeAnoAtleta(a))}</li>`).join(''):'<li class="empty">Nenhum atleta.</li>';
 return `<div class="rpp-list-report"><div class="rpp-list-date">📅 ${rppBR(relatorioPsrPseState.data,true)} — ${rppEscape(rppDiaSemanaTexto(relatorioPsrPseState.data))}</div><div class="rpp-list-obs"><strong>Observações:</strong> -</div><div class="rpp-list-cols"><section class="rpp-list-col ok"><h3>Respondido (${respondidos.length})</h3><ul>${lista(respondidos,true)}</ul></section><section class="rpp-list-col no"><h3>Ausentes (${ausentes.length})</h3><ul>${lista(ausentes,false)}</ul></section></div></div>`;
}
function rppRenderTabelaResumo(atletas){
 const periodo=rppPeriodoAtual();
 const dias=periodo.dias;
 const view=relatorioPsrPseState.view;
 if(view==='diario')return rppRenderListaPresencaDiaria(atletas);
 const headDias=dias.map(d=>rppSortHeader('dia:'+d,rppBR(d))).join('');
 const totalHead=rppSortHeader('total','Total');
 const pctHead='<th><button type="button" disabled>%</button></th>';
 const rows=rppOrdenarAtletas(atletas).map(a=>{
  let total=0;
  const cells=dias.map(d=>{const ok=rppRespondido(rppRespostaAtletaData(a,d));if(ok)total++;return `<td>${rppVX(ok)}</td>`;}).join('');
  const pct=dias.length?Math.round((total/dias.length)*100):0;
  return `<tr><td class="rpp-nome">${rppEscape(a.id.apelido||a.id.nomeCompleto)}</td><td>${rppEscape(a.id.ano||'')}</td>${cells}<td><strong>${total}/${dias.length}</strong></td><td>${pct}%</td></tr>`;
 }).join('')||`<tr><td colspan="${dias.length+4}" class="rpp-empty">Nenhum atleta nas categorias selecionadas.</td></tr>`;
 return `<table class="rpp-table rpp-table-resumo"><thead><tr>${rppSortHeader('nome','Nome')}${rppSortHeader('ano','Ano')}${headDias}${totalHead}${pctHead}</tr></thead><tbody>${rows}</tbody></table>`;
}
function rppTituloView(){
 const tipo=relatorioPsrPseState.tipo.toUpperCase();
 if(relatorioPsrPseState.view==='notas')return `${tipo} - notas do dia ${rppBR(relatorioPsrPseState.data,true)}`;
 if(relatorioPsrPseState.view==='diario')return `${tipo} - relatório diário ${rppBR(relatorioPsrPseState.data,true)}`;
 if(relatorioPsrPseState.view==='semanal'){const dias=rppDiasUteisSemana(relatorioPsrPseState.data);return `${tipo} - relatório semanal ${rppBR(dias[0])} a ${rppBR(dias[4],true)}`;}
 const d=rppParseData(relatorioPsrPseState.data);return `${tipo} - relatório mensal ${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function rppCategoriasTitulo(){const cats=rppCats();const sels=rppCategoriasSelecionadas();return sels.length?sels.map(id=>cats[id]?.label||id).join(', '):'Nenhuma categoria selecionada';}
function rppRenderExtrasChips(){
 const chips=[];const cats=rppCats();
 rppCategoriasSelecionadas().forEach(catId=>{
  rppExtraList(catId).forEach(extra=>{const item=rppLocalizarExtra(extra);if(!item)return;const key=encodeURIComponent(rppKeyExtra(extra)||rppKeyAtletaId(item.id));chips.push(`<span class="rpp-extra-chip">+ ${rppEscape(item.id.apelido||item.id.nomeCompleto)} - ${rppEscape(item.id.ano||'')} <small>${rppEscape(cats[catId]?.label||catId)}</small><button type="button" title="Remover" onclick="removerExtraRelatorioPsrPse('${catId}',decodeURIComponent('${key}'))">×</button></span>`);});
 });
 return chips.length?chips.join(''):'<span class="rpp-extra-empty">Nenhum atleta extra nas categorias selecionadas.</span>';
}
function renderRelatorioPsrPse(){
 const modal=document.getElementById('relatorio-psrpse-modal');if(!modal)return;
 const cats=rppCats();const atletas=rppAtletasRelatorio();
 const tabela=relatorioPsrPseState.carregando?'<div class="rpp-loading">Carregando respostas...</div>':(relatorioPsrPseState.view==='notas'?rppRenderTabelaNotas(atletas):rppRenderTabelaResumo(atletas));
 const dataBR=rppBR(relatorioPsrPseState.data,true);
 modal.innerHTML=`<div class="rpp-card"><button class="rpp-close" onclick="closeRelatorioPsrPse()">×</button><div class="rpp-head"><div class="rpp-extra-box"><button type="button" class="rpp-extra-btn" onclick="abrirSelecionarExtraRelatorioPsrPse()"><i class="fa-solid fa-user-plus"></i> Atleta extra</button><div class="rpp-extra-chips">${rppRenderExtrasChips()}</div></div><div class="rpp-title"><h2>${relatorioPsrPseState.tipo.toUpperCase()}</h2><strong>${dataBR}</strong><small>${rppTituloView()}</small></div><div class="rpp-cat-box">${Object.keys(cats).map(id=>`<label><input type="checkbox" ${relatorioPsrPseState.categorias[id]?'checked':''} onchange="toggleRelatorioPsrPseCategoria('${id}',this.checked)"> ${rppEscape(cats[id].label)}</label>`).join('')}</div></div><div class="rpp-toolbar"><label>Dia <input type="date" value="${relatorioPsrPseState.data}" onchange="setRelatorioPsrPseData(this.value)"></label><button type="button" class="${relatorioPsrPseState.view==='notas'?'active':''}" onclick="setRelatorioPsrPseView('notas')">Notas do dia</button><button type="button" class="${relatorioPsrPseState.view==='diario'?'active':''}" onclick="setRelatorioPsrPseView('diario')">Relatório diário</button><button type="button" class="${relatorioPsrPseState.view==='semanal'?'active':''}" onclick="setRelatorioPsrPseView('semanal')">Relatório semanal</button><button type="button" class="${relatorioPsrPseState.view==='mensal'?'active':''}" onclick="setRelatorioPsrPseView('mensal')">Relatório mensal</button><button type="button" class="print" onclick="imprimirRelatorioPsrPse()"><i class="fa-solid fa-print"></i> Imprimir/Exportar</button></div><div class="rpp-meta"><span>${rppEscape(rppCategoriasTitulo())}</span><span>${atletas.length} atleta(s)</span></div><div id="rpp-print-area" class="rpp-print-area"><div class="rpp-print-title"><img src="logo.png"><div><h2>${rppEscape(rppTituloView())}</h2><p>${rppEscape(rppCategoriasTitulo())}</p></div><img src="logo.png"></div><div class="rpp-table-wrap">${tabela}</div></div></div>`;
 modal.style.display='flex';
}
async function carregarRespostasRelatorioPsrPse(){
 const periodo=rppPeriodoAtual();relatorioPsrPseState.carregando=true;renderRelatorioPsrPse();
 try{
  const {data,error}=await _supabase.from('portal_respostas_diarias').select('*').gte('data',periodo.inicio).lte('data',periodo.fim);
  if(error)throw error;
  relatorioPsrPseState.respostas=data||[];
 }catch(e){console.error(e);alert('Erro ao carregar respostas PSR/PSE. Verifique a tabela portal_respostas_diarias no Supabase.');relatorioPsrPseState.respostas=[];}
 finally{relatorioPsrPseState.carregando=false;renderRelatorioPsrPse();}
}
async function openRelatorioPsrPse(tipo){
 relatorioPsrPseState={tipo:tipo==='pse'?'pse':'psr',data:rppDataPadrao(),view:'notas',sort:{key:'nome',dir:'asc'},categorias:rppDefaultCategorias(),respostas:[],carregando:false};
 let modal=document.getElementById('relatorio-psrpse-modal');
 if(!modal){modal=document.createElement('div');modal.id='relatorio-psrpse-modal';modal.className='rpp-overlay';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)closeRelatorioPsrPse();});}
 modal.style.display='flex';renderRelatorioPsrPse();await carregarRespostasRelatorioPsrPse();
}
function closeRelatorioPsrPse(){const modal=document.getElementById('relatorio-psrpse-modal');if(modal)modal.style.display='none';}
function setRelatorioPsrPseData(valor){relatorioPsrPseState.data=rppAjustarFimSemanaParaSexta(valor||rppDataPadrao());carregarRespostasRelatorioPsrPse();}
function setRelatorioPsrPseView(view){relatorioPsrPseState.view=view;relatorioPsrPseState.sort=rppDefaultSortParaView(view,relatorioPsrPseState.tipo);carregarRespostasRelatorioPsrPse();}
function toggleRelatorioPsrPseCategoria(catId,checked){relatorioPsrPseState.categorias[catId]=!!checked;renderRelatorioPsrPse();}
function sortRelatorioPsrPse(key){
 const atual=relatorioPsrPseState.sort||{key:'nome',dir:'asc'};
 if(atual.key===key)relatorioPsrPseState.sort={key,dir:atual.dir==='asc'?'desc':'asc'};
 else{
  const descPadrao=['sono','fadiga','dor_muscular','estresse_mental','motivacao','pse_valor','descricao','respondeu','total'].includes(key)||key.startsWith('dia:');
  relatorioPsrPseState.sort={key,dir:descPadrao?'desc':'asc'};
 }
 renderRelatorioPsrPse();
}
function abrirSelecionarExtraRelatorioPsrPse(){
 const selecionadas=rppCategoriasSelecionadas();relatorioPsrPseExtraModal={categoriaId:selecionadas[0]||'sub16',filtroAno:'todos',busca:''};
 let modal=document.getElementById('relatorio-psrpse-extra-modal');
 if(!modal){modal=document.createElement('div');modal.id='relatorio-psrpse-extra-modal';modal.className='rpp-extra-overlay';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)closeSelecionarExtraRelatorioPsrPse();});}
 renderSelecionarExtraRelatorioPsrPse();modal.style.display='flex';
}
function closeSelecionarExtraRelatorioPsrPse(){const modal=document.getElementById('relatorio-psrpse-extra-modal');if(modal)modal.style.display='none';}
function setRelatorioPsrPseExtraCat(v){relatorioPsrPseExtraModal.categoriaId=v;renderSelecionarExtraRelatorioPsrPse();}
function setRelatorioPsrPseExtraFiltroAno(v){relatorioPsrPseExtraModal.filtroAno=v;renderSelecionarExtraRelatorioPsrPse();}
function setRelatorioPsrPseExtraBusca(v){relatorioPsrPseExtraModal.busca=v;renderSelecionarExtraRelatorioPsrPse();}
function renderSelecionarExtraRelatorioPsrPse(){
 const modal=document.getElementById('relatorio-psrpse-extra-modal');if(!modal)return;
 const cats=rppCats();const catId=relatorioPsrPseExtraModal.categoriaId;const cat=cats[catId];
 const anos=[...new Set((excelData||[]).map(trabalhoAnoAtleta).filter(Boolean))].sort();
 const filtro=relatorioPsrPseExtraModal.filtroAno;const busca=normalizarTextoTrabalho(relatorioPsrPseExtraModal.busca).toLowerCase();
 const extrasKeys=new Set(rppExtraList(catId).map(rppKeyExtra));
 const atletas=trabalhoTodosAtletas().filter(a=>(filtro==='todos'||a.id.ano===filtro)&&(!busca||(`${a.id.apelido} ${a.id.nomeCompleto}`).toLowerCase().includes(busca)));
 const lista=atletas.map(a=>{const key=rppKeyAtletaId(a.id);const enc=encodeURIComponent(key);const jaExtra=extrasKeys.has(rppKeyExtra(a.id))||extrasKeys.has(key);const jaPadrao=(cat?.anos||[]).includes(String(a.id.ano));return `<div class="rpp-extra-item ${jaPadrao?'padrao':''}"><div><strong>${rppEscape(a.id.apelido||a.id.nomeCompleto)}</strong><small>${rppEscape(a.id.nomeCompleto)} • ${rppEscape(a.id.ano)}${jaPadrao?' • padrão da categoria':''}${jaExtra?' • já adicionado':''}</small></div><button type="button" ${jaExtra||jaPadrao?'disabled':''} onclick="adicionarExtraRelatorioPsrPse('${catId}',decodeURIComponent('${enc}'))">${jaExtra?'Adicionado':(jaPadrao?'Padrão':'Adicionar')}</button></div>`;}).join('')||'<p class="rpp-empty">Nenhum atleta encontrado.</p>';
 modal.innerHTML=`<div class="rpp-extra-card"><button class="rpp-close" onclick="closeSelecionarExtraRelatorioPsrPse()">×</button><h2>Adicionar atleta extra</h2><p>Escolha a categoria do relatório onde este atleta também deve aparecer.</p><div class="rpp-extra-filters"><select onchange="setRelatorioPsrPseExtraCat(this.value)">${Object.keys(cats).map(id=>`<option value="${id}" ${id===catId?'selected':''}>${rppEscape(cats[id].label)}</option>`).join('')}</select><select onchange="setRelatorioPsrPseExtraFiltroAno(this.value)"><option value="todos">Todos os anos</option>${anos.map(a=>`<option value="${rppEscape(a)}" ${a===filtro?'selected':''}>${rppEscape(a)}</option>`).join('')}</select><input placeholder="Buscar atleta..." value="${rppEscape(relatorioPsrPseExtraModal.busca)}" oninput="setRelatorioPsrPseExtraBusca(this.value)"></div><div class="rpp-extra-list">${lista}</div></div>`;
}
function adicionarExtraRelatorioPsrPse(catId,key){
 const item=trabalhoTodosAtletas().find(a=>rppKeyAtletaId(a.id)===key);if(!item)return;
 const cat=rppCats()[catId];if((cat?.anos||[]).includes(String(item.id.ano)))return;
 const extra=rppNormalizarExtra(item,catId);const lista=rppExtraList(catId);const ekey=rppKeyExtra(extra);
 if(!lista.some(x=>rppKeyExtra(x)===ekey))lista.push(extra);
 salvarRelatorioPsrPseExtras();renderSelecionarExtraRelatorioPsrPse();renderRelatorioPsrPse();
}
function removerExtraRelatorioPsrPse(catId,key){
 const lista=rppExtraList(catId);relatorioPsrPseExtras[catId]=lista.filter(x=>rppKeyExtra(x)!==key&&rppKeyAtletaId(x)!==key);
 salvarRelatorioPsrPseExtras();renderRelatorioPsrPse();
}
function imprimirRelatorioPsrPse(){
 const area=document.getElementById('rpp-print-area');if(!area)return;
 const titulo=rppTituloView();const paisagem=relatorioPsrPseState.view==='mensal'||relatorioPsrPseState.view==='semanal';
 const w=window.open('','_blank','width=1200,height=850');
 w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${rppEscape(titulo)}</title><style>body{font-family:Arial,Helvetica,sans-serif;margin:12px;color:#111}.rpp-print-title{display:flex!important;align-items:center;justify-content:center;gap:18px;margin-bottom:12px}.rpp-print-title img{width:58px;height:58px;object-fit:contain}.rpp-print-title h2{margin:0;text-align:center;color:#58111a;font-size:22px}.rpp-print-title p{margin:3px 0 0;text-align:center;font-weight:bold}.rpp-table{width:100%;border-collapse:collapse;font-size:11px}.rpp-table th{background:#58111a;color:#f9c614}.rpp-table th,.rpp-table td{border:1px solid #999;padding:5px;text-align:center}.rpp-table th button{border:0;background:transparent;color:inherit;font:inherit;font-weight:bold}.rpp-table td.rpp-nome{text-align:left;font-weight:bold}.rpp-desc{text-align:left!important}.rpp-v{color:#009b49;font-weight:900;font-size:15px}.rpp-x{color:#d63031;font-weight:900;font-size:15px}.rpp-muted{color:#999}.rpp-table-wrap{overflow:visible}.rpp-list-report{border:1px solid #d8e8c4;background:#fbfff7;padding:10px}.rpp-list-date{font-size:17px;color:#5c8a2a;font-weight:bold;border-bottom:1px solid #e5eadf;padding:6px}.rpp-list-obs{font-size:13px;margin:8px 0}.rpp-list-cols{display:grid;grid-template-columns:1fr 1fr;gap:24px}.rpp-list-col h3{font-size:14px;margin:6px 0}.rpp-list-col.ok h3,.rpp-list-col.ok li{color:#078c49}.rpp-list-col.no h3,.rpp-list-col.no li{color:#c00000}.rpp-list-col ul{list-style:none;padding:0;margin:0}.rpp-list-col li{font-size:12px;line-height:1.35;margin:2px 0}.rpp-list-col li.empty{color:#777}@page{size:${paisagem?'landscape':'portrait'};margin:8mm}</style></head><body>${area.outerHTML}<script>window.onload=()=>setTimeout(()=>window.print(),350)<\/script></body></html>`);
 w.document.close();
}

function relatoriosResetSort(){window.__relatoriosSort={key:'anoNome',dir:'asc'};window.__relatorioAtletaSelecionadoIndex=null;}
function relatoriosSortBy(key){
 const s=window.__relatoriosSort||{key:'nome',dir:'asc'};
 if(s.key===key)s.dir=s.dir==='asc'?'desc':'asc'; else {s.key=key;s.dir='asc';}
 window.__relatoriosSort=s;renderRelatoriosTabela();
}
function relatoriosDadosAtuais(){
 const tipo=document.getElementById('relatorio-tipo-select')?.value||'todos';
 const evalNum=document.getElementById('relatorio-eval-select')?.value||relatoriosMaxAvaliacao();
 const anosMarcados=Array.from(document.querySelectorAll('#relatorios-modal .relatorio-ano-chk:checked')).map(x=>x.value);
 const anosFiltro=anosMarcados.length?anosMarcados:relatoriosAnosDisponiveis();
 const cols=relatoriosColunas(tipo);
 let dados=(excelData||[]).map((row,index)=>({row,index})).filter(item=>anosFiltro.includes(relatoriosAnoAtleta(item.row))).map(item=>{const linha=relatoriosLinha(item.row,evalNum);linha.__index=item.index;return linha;});
 const sort=window.__relatoriosSort||{key:'anoNome',dir:'asc'};
 const col=cols.find(c=>c.key===sort.key);
 dados.sort((a,b)=>{
  let r=0;
  if(sort.key==='anoNome'||!col){
   const aa=parseInt(a.ano||'9999',10)||9999;
   const ab=parseInt(b.ano||'9999',10)||9999;
   r=aa-ab;
   if(r===0)r=String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR');
   return r;
  }
  let va=a[col.key], vb=b[col.key];
  if(col.type==='num'){
   const na=relatoriosNum(va), nb=relatoriosNum(vb);
   if(isNaN(na)&&isNaN(nb))r=0; else if(isNaN(na))r=1; else if(isNaN(nb))r=-1; else r=na-nb;
  }else if(col.type==='date')r=relatoriosDataSort(va)-relatoriosDataSort(vb);
  else r=String(va||'').localeCompare(String(vb||''),'pt-BR');
  return sort.dir==='asc'?r:-r;
 });
 return {tipo,evalNum,cols,dados,sort,anosMarcados,anosFiltro};
}
function renderRelatoriosTabela(){
 const state=relatoriosDadosAtuais();
 const tipos=relatoriosTipos();
 const titulo=document.getElementById('relatorios-titulo'); if(titulo)titulo.textContent=tipos[state.tipo]||'Relatórios';
 const head=document.getElementById('relatorios-head'), body=document.getElementById('relatorios-body'); if(!head||!body)return;
 head.innerHTML=state.cols.map(c=>`<th onclick="relatoriosSortBy('${c.key}')">${c.label}${state.sort.key===c.key?(state.sort.dir==='asc'?' ▲':' ▼'):''}</th>`).join('');
 const selecionavel=state.tipo==='todos';
 body.innerHTML=state.dados.map(row=>`<tr class="${selecionavel?'relatorio-row-selecionavel':''} ${window.__relatorioAtletaSelecionadoIndex===row.__index?'relatorio-row-selected':''}" ${selecionavel?`onclick="selecionarAtletaRelatorio(${row.__index})"`:''}>${state.cols.map(c=>`<td>${escapeHtmlJogos(row[c.key]||'')}</td>`).join('')}</tr>`).join('');
 atualizarBotaoRelatorioIndividual(state);
}
function selecionarAtletaRelatorio(index){
 window.__relatorioAtletaSelecionadoIndex=(window.__relatorioAtletaSelecionadoIndex===index)?null:index;
 renderRelatoriosTabela();
}
function atualizarBotaoRelatorioIndividual(state){
 const btn=document.getElementById('btn-relatorio-individual');
 if(!btn)return;
 const ativo=state&&state.tipo==='todos'&&window.__relatorioAtletaSelecionadoIndex!==null&&window.__relatorioAtletaSelecionadoIndex!==undefined;
 btn.style.display=state&&state.tipo==='todos'?'block':'none';
 btn.disabled=!ativo;
}
function relatoriosAnosTitulo(state){
 const anos=(state.anosMarcados&&state.anosMarcados.length)?state.anosMarcados:[];
 if(anos.length===0)return 'Todos os anos';
 return anos.join(' / ');
}
function relatoriosValorComUnidade(valor,unidade){
 if(valor===undefined||valor===null||String(valor).trim()==='')return '';
 return `${valor} ${unidade}`;
}
function relatoriosClasseGordura(valor){
 const n=relatoriosNum(valor);
 if(isNaN(n))return '';
 if(n<9)return 'gord-azul';
 if(n>=9 && n<=9.09)return 'gord-amarelo';
 if(n>=9.10 && n<=10.99)return 'gord-verde';
 if(n>=11 && n<12)return 'gord-amarelo';
 if(n>=12)return 'gord-vermelho';
 return '';
}
function relatorioIndividualMetricasAtleta(index){
 const row=excelData[index]||{};
 const max=relatoriosMaxAvaliacao();
 const avals=[];
 for(let n=1;n<=max;n++){
  const linha=relatoriosLinha(row,n);
  const data=convertExcelDate(relatoriosValorAvaliacao(row,'Data',n));
  const tem=['peso','altura','predita','gordura','distancia','melhorSalto','aceleracao','velocidade','agilidade'].some(k=>String(linha[k]||'').trim()!=='');
  if(tem)avals.push({eval:n,label:data&&data!=='-'?data:`Aval. ${n}`,...linha});
 }
 return avals;
}
function relatorioIndividualGrupoRows(atletaIndex){
 const atleta=excelData[atletaIndex]||{};
 const anosMarcados=Array.from(document.querySelectorAll('#relatorios-modal .relatorio-ano-chk:checked')).map(x=>x.value);
 const anos=anosMarcados.length?anosMarcados:[relatoriosAnoAtleta(atleta)];
 return (excelData||[]).filter(row=>anos.includes(relatoriosAnoAtleta(row)));
}
function relatorioIndividualMediaGrupoPorAvaliacao(atletaIndex,evalNum,key){
 const rows=relatorioIndividualGrupoRows(atletaIndex);
 const vals=rows.map(row=>relatoriosNum(relatoriosLinha(row,evalNum)[key])).filter(v=>!isNaN(v));
 if(!vals.length)return NaN;
 return vals.reduce((a,b)=>a+b,0)/vals.length;
}
function relatorioIndividualCorPonto(key,valor,media){
 if(key==='gordura'){
  const cls=relatoriosClasseGordura(valor);
  if(cls==='gord-azul')return '#00b0f0';
  if(cls==='gord-amarelo')return '#ffff00';
  if(cls==='gord-verde')return '#00ff38';
  if(cls==='gord-vermelho')return '#ff0000';
  return '#999';
 }
 const tolerancia=key==='distancia'?100:0.10;
 const menorMelhor=['aceleracao','velocidade','agilidade'].includes(key);
 const cls=relatoriosClassePorMedia(valor,media,tolerancia,menorMelhor);
 if(cls==='media-verde')return '#00b050';
 if(cls==='media-amarelo')return '#ffff00';
 if(cls==='media-vermelho')return '#ff0000';
 return '#999';
}
function relatorioIndividualChartSVG(titulo,avals,key,unidade){
 const pontos=avals.map(a=>({label:`${a.eval}`,valor:relatoriosNum(a[key]),media:relatorioIndividualMediaGrupoPorAvaliacao(window.__relatorioAtletaSelecionadoIndex,a.eval,key)})).filter(p=>!isNaN(p.valor));
 if(!pontos.length)return `<div class="grafico-vazio"><h3>${titulo}</h3><p>Sem dados suficientes.</p></div>`;
 const w=430,h=185,padL=38,padR=14,padT=26,padB=36;
 let vals=pontos.flatMap(p=>[p.valor,isNaN(p.media)?p.valor:p.media]);
 if(key==='gordura')vals=vals.concat([8,14]);
 let min=Math.min(...vals),max=Math.max(...vals); if(min===max){min-=1;max+=1;}
 const margem=(max-min)*0.08; min-=margem; max+=margem;
 if(key==='gordura'){min=Math.min(min,8);max=Math.max(max,14);}
 const x=i=>padL+(pontos.length===1?(w-padL-padR)/2:i*(w-padL-padR)/(pontos.length-1));
 const y=v=>padT+(max-v)*(h-padT-padB)/(max-min);
 const fmtValor=(v)=>{
  if(isNaN(v))return '-';
  const casas=key==='distancia'?0:2;
  return v.toFixed(casas).replace('.',',')+(unidade||'');
 };
 const linha=pontos.map((p,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
 let bg='';
 if(key==='gordura'){
  const band=(low,high,color)=>{
   const a=Math.max(low,min), b=Math.min(high,max);
   if(b<=a)return '';
   return `<rect x="${padL}" y="${y(b)}" width="${w-padL-padR}" height="${Math.max(0,y(a)-y(b))}" fill="${color}" opacity="0.62"/>`;
  };
  bg=[
   band(min,9,'#8fd3ff'),
   band(9,9.10,'#fff176'),
   band(9.10,11,'#83f29b'),
   band(11,12,'#fff176'),
   band(12,max,'#ff8a80')
  ].join('');
 }
 const circles=pontos.map((p,i)=>{const cor=relatorioIndividualCorPonto(key,p.valor,p.media);return `<circle cx="${x(i)}" cy="${y(p.valor)}" r="5" fill="${cor}" stroke="#fff" stroke-width="1.5"/><text x="${x(i)}" y="${y(p.valor)-8}" text-anchor="middle" font-size="8" font-weight="700">${fmtValor(p.valor)}</text>`;}).join('');
 const grid=[0,1,2,3,4].map(i=>{const yy=padT+i*(h-padT-padB)/4;return `<line x1="${padL}" y1="${yy}" x2="${w-padR}" y2="${yy}" stroke="#e5e5e5"/>`;}).join('');
 const mediasLabels=pontos.map((p,i)=>{
  const anchor=i===0?'start':(i===pontos.length-1?'end':'middle');
  const dx=i===0?'-2':(i===pontos.length-1?'2':'0');
  const texto=key==='gordura'?`Avaliação ${p.label}`:`Média: ${fmtValor(p.media)}`;
  return `<text x="${x(i)}" dx="${dx}" y="${h-10}" text-anchor="${anchor}" font-size="8.5" font-weight="800" fill="#111">${texto}</text>`;
 }).join('');
 return `<svg class="grafico-svg" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" fill="#fff"/><text x="${w/2}" y="18" text-anchor="middle" font-size="11" font-weight="800">${titulo}</text>${bg}${grid}<line x1="${padL}" y1="${h-padB}" x2="${w-padR}" y2="${h-padB}" stroke="#bbb"/><line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h-padB}" stroke="#bbb"/><path d="${linha}" fill="none" stroke="#0074d9" stroke-width="3"/>${circles}${mediasLabels}</svg>`;
}
async function relatorioIndividualBuscarEstatisticasJogos(atletaIndex){
 const row=excelData[atletaIndex]||{};
 const alvo={nomeCompleto:nomeCompletoAtletaJogos(row)||relatoriosNomeAtleta(row),ano:relatoriosAnoAtleta(row),nascimento:nascimentoAtletaJogos(row)};
 const stats={jogos:0,vitorias:0,empates:0,derrotas:0,minutos:0,gols:0,amarelo:0,vermelho:0};
 try{
  const {data,error}=await _supabase.from('jogos').select('professor,numero_jogo,nome,dados');
  if(error)throw error;
  (data||[]).forEach(j=>{
   const atleta=(j.dados?.atletas||[]).find(a=>String(a.nomeCompleto||'').trim()===alvo.nomeCompleto&&String(a.nascimento||'').trim()===alvo.nascimento&&String(a.ano||'').trim()===alvo.ano);
   if(!atleta)return;
   const minutos=parseInt(atleta.minutos||0,10)||0;
   if(minutos<=0)return;
   stats.jogos++; stats.minutos+=minutos; stats.gols+=parseInt(atleta.gols||0,10)||0; stats.amarelo+=parseInt(atleta.amarelo||0,10)||0; stats.vermelho+=parseInt(atleta.vermelho||0,10)||0;
   const gf=parseInt(j.dados?.placar?.cfa_prosol||0,10)||0, gs=parseInt(j.dados?.placar?.adversario||0,10)||0;
   if(gf>gs)stats.vitorias++; else if(gf<gs)stats.derrotas++; else stats.empates++;
  });
 }catch(e){console.error('Erro ao buscar jogos para relatório individual:',e);}
 return stats;
}
function relatorioIndividualValorUltima(avals,key){
 for(let i=avals.length-1;i>=0;i--){if(String(avals[i][key]||'').trim()!=='')return avals[i][key];}
 return '-';
}
async function gerarRelatorioFisicoIndividual(){
 const index=window.__relatorioAtletaSelecionadoIndex;
 if(index===null||index===undefined||!excelData[index])return alert('Selecione um atleta primeiro.');
 const row=excelData[index];
 const avals=relatorioIndividualMetricasAtleta(index);
 if(!avals.length)return alert('Este atleta não possui avaliações para gerar a ficha.');
 const jogos=await relatorioIndividualBuscarEstatisticasJogos(index);
 const nomeCompleto=nomeCompletoAtletaJogos(row)||relatoriosNomeAtleta(row);
 const apelido=apelidoAtletaJogos(row)||relatoriosNomeAtleta(row);
 const foto=relatoriosValorColunaFlex(row,['foto'])||'camiseta_linha.png';
 const logo='logo.png';
 const pos1=relatoriosValorColunaFlex(row,['posição 1','posicao 1','posição','posicao'])||'-';
 const pos2=relatoriosValorColunaFlex(row,['posição 2','posicao 2'])||'-';
 const ult=avals[avals.length-1], ant=avals.length>1?avals[avals.length-2]:null;
 const esc=v=>escapeHtmlJogos(v??'');
 const valor=(key,fallback='-')=>{for(let i=avals.length-1;i>=0;i--){if(String(avals[i][key]||'').trim()!=='')return avals[i][key];}return fallback;};
 const valorAnt=(key,fallback='-')=>ant&&String(ant[key]||'').trim()!==''?ant[key]:fallback;
 const delta=(key,menorMelhor=false,unit='')=>{
  if(!ant)return '';
  const a=relatoriosNum(ult[key]), b=relatoriosNum(ant[key]);
  if(isNaN(a)||isNaN(b))return '';
  const dif=a-b;
  const bom=menorMelhor?dif<0:dif>0;
  const ruim=menorMelhor?dif>0:dif<0;
  const cls=bom?'bom':(ruim?'ruim':'neutro');
  const sinal=dif>0?'+':'';
  return `<span class="delta ${cls}">${sinal}${dif.toFixed(2).replace('.',',')}${unit}</span>`;
 };
 const card=(label,key,unit='',menorMelhor=false)=>`<div class="res-card"><span>${label}</span><strong>${esc(valor(key))}${unit}</strong>${delta(key,menorMelhor,unit)}</div>`;
 const compRow=a=>`<tr><td>${esc(a.label)}</td><td>${esc(a.peso)}</td><td>${esc(a.altura)}</td><td>${esc(a.gordura)}</td><td>${esc(a.distancia)}</td><td>${esc(a.melhorSalto)}</td><td>${esc(a.aceleracao)}</td><td>${esc(a.velocidade)}</td><td>${esc(a.agilidade)}</td></tr>`;
 const charts=[
  relatorioIndividualChartSVG('% de Gordura',avals,'gordura','%'),
  relatorioIndividualChartSVG('Teste de Resistência',avals,'distancia','m'),
  relatorioIndividualChartSVG('Teste de Potência',avals,'melhorSalto','m'),
  relatorioIndividualChartSVG('Aceleração em 10 m',avals,'aceleracao','s'),
  relatorioIndividualChartSVG('Velocidade em 30 m',avals,'velocidade','s'),
  relatorioIndividualChartSVG('Circuito de Agilidade',avals,'agilidade','s')
 ].join('');
 const w=window.open('','_blank','width=1150,height=900'); if(!w)return alert('Permita pop-ups para gerar a ficha.');
 const html=`<!doctype html><html><head><meta charset="utf-8"><title>Ficha Física - ${esc(apelido)}</title><style>
 @page{size:A4 portrait;margin:4mm}
 *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
 body{margin:0;background:#f6f1e8;color:#171717;font-family:Arial,Helvetica,sans-serif}.page-strip{height:8px;background:#58111a;border-bottom:4px solid #f9c614}.ficha{width:100%;max-width:1040px;margin:6px auto 0}.header-card{background:#fff;border:1px solid #d8cfc2;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px #0001}.header-band{background:#58111a;color:#f9c614;text-align:center;padding:4px 10px 2px}.header-band h1{font-size:18px;margin:0;font-weight:900;letter-spacing:.4px}.header-band p{font-size:9px;margin:1px 0 0;color:#fff;font-weight:700}.header-body{display:grid;grid-template-columns:82px 1fr 70px;gap:10px;align-items:center;padding:8px 14px 9px}.foto-box{width:70px;height:105px;border:2px solid #58111a;border-radius:8px;background:#f7f7f7;display:flex;align-items:center;justify-content:center;overflow:hidden;margin:auto}.foto-box img{width:100%;height:100%;object-fit:cover}.logo-head{width:60px;display:block;margin:auto}.athlete-name{font-size:18px;line-height:1.05;margin:0;color:#58111a;font-weight:900}.athlete-sub{font-size:10px;font-weight:800;margin:4px 0;color:#222}.athlete-muted{font-size:9px;color:#666;margin-bottom:5px}.badges{display:flex;gap:5px;flex-wrap:wrap}.badge{min-width:54px;border-radius:6px;padding:4px 5px;text-align:center;color:#fff;font-weight:800}.badge span{display:block;font-size:6px;text-transform:uppercase}.badge strong{display:block;font-size:14px;line-height:1}.b-blue{background:#0984e3}.b-green{background:#27ae60}.b-yellow{background:#f9c614;color:#1c1c1c}.b-red{background:#d63031}.b-maroon{background:#58111a}.section-title{background:#58111a;color:#f9c614;text-align:center;font-size:12px;font-weight:900;padding:5px;margin:8px 0 6px;border-radius:6px;text-transform:uppercase;letter-spacing:.3px}.resumo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.res-card{background:#fff;border:1px solid #d8cfc2;border-radius:8px;padding:6px 8px;min-height:46px;position:relative;box-shadow:0 1px 3px #0001;border-left:5px solid #f9c614}.res-card:nth-child(2n){border-left-color:#58111a}.res-card span{display:block;color:#666;font-size:9px;font-weight:800}.res-card strong{display:block;font-size:15px;margin-top:3px}.delta{position:absolute;right:7px;top:24px;font-size:8px;font-weight:900}.delta.bom{color:#159957}.delta.ruim{color:#b30000}.delta.neutro{color:#58111a}.comparativo{width:100%;border-collapse:collapse;background:#fff;font-size:8px;border:1px solid #58111a}.comparativo th{background:#58111a;color:#fff;padding:3px 3px}.comparativo td{padding:2px 3px;text-align:center;border:1px solid #eadfd0}.comparativo td:first-child{font-weight:900}.comparativo tr:nth-child(even){background:#faf6ed}.graficos{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:0}.grafico-svg,.grafico-vazio{width:100%;background:#fff;border:1px solid #d8cfc2;border-radius:8px}.grafico-vazio{height:155px;display:flex;flex-direction:column;align-items:center;justify-content:center}.legenda{font-size:8px;text-align:center;color:#333;margin:4px 0;display:flex;justify-content:center;gap:14px;align-items:center;font-weight:800}.leg-item{display:inline-flex;align-items:center;gap:4px}.leg-dot{width:9px;height:9px;border-radius:50%;display:inline-block;border:1px solid #fff;box-shadow:0 0 0 1px #999}.leg-green{background:#00b050}.leg-yellow{background:#ffff00}.leg-red{background:#ff0000}.footer{border-top:1px solid #d8cfc2;color:#666;font-size:8px;margin-top:4px;padding-top:3px;display:flex;justify-content:space-between}@media print{.ficha{margin-top:4px}.grafico-svg{height:158px!important}.graficos{gap:5px}.section-title{margin:6px 0 4px}.header-card{break-inside:avoid}.resumo-grid,.comparativo,.graficos{break-inside:avoid}.footer{display:none}}
 </style></head><body><div class="page-strip"></div><div class="ficha"><div class="header-card"><div class="header-band"><h1>FICHA FÍSICA INDIVIDUAL</h1><p>Evolução dos Testes Físicos • CFA Prosol</p></div><div class="header-body"><div class="foto-box"><img src="${foto}" onerror="this.src='camiseta_linha.png'"></div><div><h2 class="athlete-name">${esc(nomeCompleto)}</h2><div class="athlete-sub">Ano: ${esc(relatoriosAnoAtleta(row))} &nbsp; • &nbsp; Nascimento: ${esc(nascimentoAtletaJogos(row))} &nbsp; • &nbsp; Posição: ${esc(pos1)}</div><div class="athlete-muted">Última avaliação: ${esc(ult.label)} &nbsp; • &nbsp; Avaliações comparadas: ${avals.length}</div><div class="badges"><div class="badge b-blue"><span>Jogos</span><strong>${jogos.jogos}</strong></div><div class="badge b-green"><span>Vitórias</span><strong>${jogos.vitorias}</strong></div><div class="badge b-yellow"><span>Empates</span><strong>${jogos.empates}</strong></div><div class="badge b-red"><span>Derrotas</span><strong>${jogos.derrotas}</strong></div><div class="badge b-maroon"><span>Minutos</span><strong>${jogos.minutos}</strong></div><div class="badge b-yellow"><span>Gols</span><strong>${jogos.gols}</strong></div></div></div><img class="logo-head" src="${logo}"></div></div><div class="section-title">Resumo da Última Avaliação</div><div class="resumo-grid">${card('Peso','peso',' Kg')}${card('Altura','altura',' m')}${card('Alt. Predita','predita',' m')}${card('% Gordura','gordura','',true)}${card('Resistência','distancia',' m')}${card('Potência','melhorSalto',' m')}${card('Aceleração','aceleracao',' s',true)}${card('Velocidade','velocidade',' s',true)}${card('Agilidade','agilidade',' s',true)}</div><div class="section-title">Comparativo das Avaliações</div><table class="comparativo"><thead><tr><th>Data</th><th>Peso</th><th>Altura</th><th>Gordura</th><th>Distância</th><th>Salto</th><th>Acel.</th><th>Veloc.</th><th>Agil.</th></tr></thead><tbody>${avals.map(compRow).join('')}</tbody></table><div class="section-title">Evolução dos Testes</div><div class="graficos">${charts}</div><div class="legenda"><span class="leg-item"><i class="leg-dot leg-green"></i>Acima da média</span><span class="leg-item"><i class="leg-dot leg-yellow"></i>Na média</span><span class="leg-item"><i class="leg-dot leg-red"></i>Abaixo da média</span></div><div class="footer"><span>CFA Prosol • Relatório gerado pelo Sistema de Organização Metodológica</span><span>Ficha Física Individual</span></div></div><script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`;
 w.document.write(html);w.document.close();
}
function relatoriosMediaValores(dados,key){
 const vals=(dados||[]).map(r=>relatoriosNum(r[key])).filter(v=>!isNaN(v));
 if(!vals.length)return NaN;
 return vals.reduce((a,b)=>a+b,0)/vals.length;
}
function relatoriosMediasCategoria(state){
 return {
  distancia:relatoriosMediaValores(state.dados,'distancia'),
  melhorSalto:relatoriosMediaValores(state.dados,'melhorSalto'),
  aceleracao:relatoriosMediaValores(state.dados,'aceleracao'),
  velocidade:relatoriosMediaValores(state.dados,'velocidade'),
  agilidade:relatoriosMediaValores(state.dados,'agilidade')
 };
}
function relatoriosFormatoMedia(valor,sufixo=''){
 if(isNaN(valor))return '-';
 return valor.toFixed(2).replace('.',',')+sufixo;
}
function relatoriosClassePorMedia(valor,media,tolerancia,menorMelhor=false){
 const n=relatoriosNum(valor);
 if(isNaN(n)||isNaN(media))return '';
 if(n < media - tolerancia)return menorMelhor?'media-verde':'media-vermelho';
 if(n > media + tolerancia)return menorMelhor?'media-vermelho':'media-verde';
 return 'media-amarelo';
}
function relatoriosClasseCelula(key,valor,medias){
 if(key==='gordura')return relatoriosClasseGordura(valor);
 if(key==='distancia')return relatoriosClassePorMedia(valor,medias.distancia,100,false);
 if(key==='melhorSalto')return relatoriosClassePorMedia(valor,medias.melhorSalto,0.10,false);
 if(key==='aceleracao')return relatoriosClassePorMedia(valor,medias.aceleracao,0.10,true);
 if(key==='velocidade')return relatoriosClassePorMedia(valor,medias.velocidade,0.10,true);
 if(key==='agilidade')return relatoriosClassePorMedia(valor,medias.agilidade,0.10,true);
 return '';
}
function relatoriosColunasPDF(tipo){
 const base=[{key:'nome',label:'Nome'},{key:'nascimento',label:'Nasc.'}];
 if(tipo==='antropometricas')return base.concat([{key:'altura',label:'Altura',unit:' m'},{key:'peso',label:'Peso',unit:' Kg'},{key:'predita',label:'Altura Predita',unit:' m'},{key:'gordura',label:'% de Gordura'}]);
 if(tipo==='resistencia')return base.concat([{key:'nivel',label:'Nível'},{key:'distancia',label:'Distância'}]);
 if(tipo==='potencia')return base.concat([{key:'salto1',label:'Salto 1'},{key:'salto2',label:'Salto 2'},{key:'salto3',label:'Salto 3'},{key:'melhorSalto',label:'Melhor Salto'}]);
 if(tipo==='velocidade')return base.concat([{key:'aceleracao',label:'Aceleração'},{key:'velocidade',label:'Velocidade'}]);
 if(tipo==='agilidade')return base.concat([{key:'agilidade',label:'Agilidade'}]);
 return base.concat([{key:'peso',label:'Peso',unit:' Kg'},{key:'altura',label:'Altura',unit:' m'},{key:'predita',label:'Altura Predita',unit:' m'},{key:'gordura',label:'% de Gordura'},{key:'distancia',label:'Distância'},{key:'melhorSalto',label:'Salto'},{key:'aceleracao',label:'Aceleração'},{key:'velocidade',label:'Velocidade'},{key:'agilidade',label:'Agilidade'}]);
}
function relatoriosValorPDF(row,col){
 const v=row[col.key];
 if(v===undefined||v===null||String(v).trim()==='')return '';
 return String(v)+(col.unit||'');
}
function relatoriosTituloPDF(state){
 const tipos=relatoriosTipos();
 const nomeTitulo=state.tipo==='todos'?'Teste Físico':(tipos[state.tipo]||'Relatório');
 return `${nomeTitulo} - ${relatoriosAnosTitulo(state)}`;
}
function relatoriosRodapeMedias(state,medias){
 if(state.tipo==='antropometricas')return '';
 if(state.tipo==='resistencia')return `<div class="media-cat">Média da categoria: ${relatoriosFormatoMedia(medias.distancia,' m')}</div>`;
 if(state.tipo==='potencia')return `<div class="media-cat">Média da categoria: ${relatoriosFormatoMedia(medias.melhorSalto,' m')}</div>`;
 if(state.tipo==='velocidade')return `<div class="media-cat">Média da categoria: Aceleração ${relatoriosFormatoMedia(medias.aceleracao)} | Velocidade ${relatoriosFormatoMedia(medias.velocidade)}</div>`;
 if(state.tipo==='agilidade')return `<div class="media-cat">Média da categoria: ${relatoriosFormatoMedia(medias.agilidade)}</div>`;
 return `<div class="media-cat">Médias da categoria: Distância ${relatoriosFormatoMedia(medias.distancia,' m')} | Salto ${relatoriosFormatoMedia(medias.melhorSalto,' m')} | Aceleração ${relatoriosFormatoMedia(medias.aceleracao)} | Velocidade ${relatoriosFormatoMedia(medias.velocidade)} | Agilidade ${relatoriosFormatoMedia(medias.agilidade)}</div>`;
}
function exportarRelatorioEspecialPDF(state){
 const w=window.open('','_blank','width=1100,height=800');
 if(!w)return alert('Permita pop-ups para gerar o PDF.');
 const titulo=relatoriosTituloPDF(state);
 const cols=relatoriosColunasPDF(state.tipo);
 const medias=relatoriosMediasCategoria(state);
 const bodyClass=state.tipo==='todos'?'rel-todos':'';
 const pageOrientation=state.tipo==='todos'?'landscape':'portrait';
 const linhas=state.dados.map(r=>`<tr>${cols.map(c=>{
  const cls=relatoriosClasseCelula(c.key,r[c.key],medias);
  const extra=(c.key==='nome')?' class="nome"':` class="${cls}"`;
  return `<td${extra}>${escapeHtmlJogos(relatoriosValorPDF(r,c))}</td>`;
 }).join('')}</tr>`).join('');
 const html=`<!doctype html><html><head><meta charset="utf-8"><title>${titulo}</title><style>
 @page{size:A4 ${pageOrientation};margin:8mm 10mm}
 *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
 body{font-family:Arial,Helvetica,sans-serif;margin:0;color:#000;background:#fff}.cab{display:grid;grid-template-columns:90px 1fr 90px;align-items:center;margin-bottom:10px}.cab img{width:64px;height:64px;object-fit:contain;margin:auto;display:block}.cab h1{text-align:center;font-size:22px;margin:0;font-weight:800}
 table{width:100%;border-collapse:collapse;font-size:13px;line-height:1.15}th{background:#d60000;color:#fff;padding:3px 5px;text-align:left;font-weight:800}td{padding:2px 5px;border:0;text-align:left}td.nome{font-weight:800}td:not(.nome){text-align:center}.gord-azul{background:#00b0f0}.gord-amarelo,.media-amarelo{background:#ffff00}.gord-verde,.media-verde{background:#00ff38}.gord-vermelho,.media-vermelho{background:#ff0000;color:#000}.media-cat{margin-top:12px;font-size:15px;font-weight:800;text-align:center;border-top:2px solid #000;padding-top:8px}
 th:nth-child(1),td:nth-child(1){text-align:left}th:nth-child(2),td:nth-child(2){text-align:center;width:95px}
 body.rel-todos .cab{grid-template-columns:62px 1fr 62px;margin-bottom:6px}body.rel-todos .cab img{width:50px;height:50px}body.rel-todos .cab h1{font-size:18px}body.rel-todos table{font-size:10px;line-height:1.08;table-layout:auto}body.rel-todos th{padding:2.5px 2px;white-space:normal;text-align:center}body.rel-todos td{padding:2px 2px;white-space:nowrap}body.rel-todos td.nome{white-space:normal;min-width:80px}body.rel-todos th:nth-child(2),body.rel-todos td:nth-child(2){width:60px}body.rel-todos .media-cat{font-size:11px;margin-top:7px;padding-top:5px}
 </style></head><body class="${bodyClass}"><div class="cab"><img src="logo.png"><h1>${titulo}</h1><img src="logo.png"></div><table><thead><tr>${cols.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead><tbody>${linhas}</tbody></table>${relatoriosRodapeMedias(state,medias)}<script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`;
 w.document.write(html);w.document.close();
}
function exportarRelatorioPDF(){
 const state=relatoriosDadosAtuais();
 exportarRelatorioEspecialPDF(state);
}


/* === PRANCHETA TÁTICA (estilo Tactical Pad) — só memória local === */
const pranchetaSistemasMini = {
 '4-3-3': [[8,50,'G'],[23,18,'2'],[23,38,'3'],[23,62,'4'],[23,82,'6'],[48,28,'5'],[48,50,'8'],[48,72,'10'],[76,18,'7'],[82,50,'9'],[76,82,'11']],
 '4-4-2': [[8,50,'G'],[23,18,'2'],[23,38,'3'],[23,62,'4'],[23,82,'6'],[50,15,'7'],[50,38,'5'],[50,62,'8'],[50,85,'11'],[78,38,'9'],[78,62,'10']],
 '4-2-3-1': [[8,50,'G'],[23,18,'2'],[23,38,'3'],[23,62,'4'],[23,82,'6'],[43,38,'5'],[43,62,'8'],[63,18,'7'],[63,50,'10'],[63,82,'11'],[82,50,'9']],
 '4-2-4': [[8,50,'G'],[23,18,'2'],[23,38,'3'],[23,62,'4'],[23,82,'6'],[45,38,'5'],[45,62,'8'],[76,14,'7'],[82,38,'9'],[82,62,'10'],[76,86,'11']],
 '3-5-2': [[8,50,'G'],[25,30,'3'],[25,50,'4'],[25,70,'5'],[48,12,'2'],[48,32,'6'],[48,50,'8'],[48,68,'10'],[48,88,'11'],[78,38,'9'],[78,62,'7']],
 '3-4-3': [[8,50,'G'],[25,30,'3'],[25,50,'4'],[25,70,'5'],[48,22,'2'],[48,42,'6'],[48,58,'8'],[48,78,'11'],[78,18,'7'],[82,50,'9'],[78,82,'10']],
 '5-3-2': [[8,50,'G'],[23,12,'2'],[23,31,'3'],[23,50,'4'],[23,69,'5'],[23,88,'6'],[51,32,'8'],[51,50,'10'],[51,68,'11'],[80,38,'9'],[80,62,'7']]
};
let pranchetaMiniContador = 12;
let tpState = { pieces: [], frames: [], nextId: 1, homeN: 1, awayN: 1, sel: null };

function tpNewId(){ return 'p'+(tpState.nextId++); }
function tpClonePieces(){ return JSON.parse(JSON.stringify(tpState.pieces)); }

const TP_CONE_SVG = '<svg class="tp-ico" viewBox="0 0 64 72" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="32" cy="64" rx="22" ry="5" fill="#7a3a10" opacity=".45"/><path d="M18 60 L26 14 Q32 8 38 14 L46 60 Z" fill="#f39c12" stroke="#c0392b" stroke-width="1.5"/><path d="M20 52 L44 52 L42.2 42 L21.8 42 Z" fill="#fff"/><path d="M23.2 28 L40.8 28 L39.4 20 L24.6 20 Z" fill="#fff"/><rect x="12" y="58" width="40" height="7" rx="2" fill="#e67e22" stroke="#c0392b" stroke-width="1.2"/></svg>';
const TP_GOAL_SVG = '<svg class="tp-ico" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="50" cy="37.5" rx="45" ry="2" fill="#000" opacity=".28"/><rect x="4" y="4" width="6" height="32" rx="1.5" fill="#fff" stroke="#444" stroke-width="1.2"/><rect x="90" y="4" width="6" height="32" rx="1.5" fill="#fff" stroke="#444" stroke-width="1.2"/><rect x="4" y="3" width="92" height="6" rx="1.5" fill="#fff" stroke="#444" stroke-width="1.2"/><g stroke="#cdd7dd" stroke-width="0.9" opacity=".9"><path d="M9 18 L91 18 M9 27 L91 27 M9 34 L91 34"/><path d="M22 9 L22 35 M36 9 L36 35 M50 9 L50 35 M64 9 L64 35 M78 9 L78 35"/></g></svg>';

function openPranchetaModal() {
 let modal=document.getElementById('prancheta-modal');
 if(!modal){
  modal=document.createElement('div');
  modal.id='prancheta-modal';
  modal.className='mini-prancheta-overlay tp-overlay';
  modal.innerHTML='<div class="mini-prancheta-box tp-box"><div id="prancheta-modal-content"></div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)closePranchetaModal();});
 }
 modal.style.display='flex';
 renderPranchetaVirtual();
}
function closePranchetaModal(){
 const modal=document.getElementById('prancheta-modal');if(modal)modal.style.display='none';
 if(typeof modernV3VoltarInicio==='function') modernV3VoltarInicio();
}
function renderPranchetaVirtual(){
 const box=document.getElementById('prancheta-modal-content')||document.getElementById('prancheta-content');
 if(!box)return;
 const sistemas=Object.keys(pranchetaSistemasMini).map(s=>`<option value="${s}">${s}</option>`).join('');
 box.innerHTML=`<div class="tp-wrap">
  <header class="tp-head">
   <strong>Prancheta tática</strong>
   <label>Sistema <select id="mini-tactical-system">${sistemas}</select></label>
   <button type="button" onclick="resetPrancheta()">Aplicar sistema</button>
   <button type="button" onclick="clearPrancheta()">Limpar campo</button>
   <button type="button" class="tp-save" onclick="tpSalvarTela()">Salvar tela</button>
   <button type="button" class="tp-export" onclick="tpExportarVideo()">Exportar vídeo</button>
   <button type="button" class="mini-close" onclick="closePranchetaModal()">Fechar</button>
  </header>
  <div class="tp-body">
   <aside class="tp-tools">
    <b>Peças</b>
    <button type="button" class="tp-add-els" onclick="tpToggleAddPop(event)">+ Adicionar elementos</button>
    <div id="tp-add-pop" class="tp-add-pop">
    <button type="button" class="tp-tool home" onclick="tpAdd('home')">+ Jogador casa</button>
    <button type="button" class="tp-tool away" onclick="tpAdd('away')">+ Jogador fora</button>
    <button type="button" class="tp-tool gk-home" onclick="tpAdd('gk-home')">+ Goleiro casa</button>
    <button type="button" class="tp-tool gk-away" onclick="tpAdd('gk-away')">+ Goleiro fora</button>
    <button type="button" class="tp-tool ball" onclick="adicionarBolaPrancheta()">+ Bola</button>
    <button type="button" class="tp-tool cone" onclick="tpAdd('cone')">+ Cone</button>
    <button type="button" class="tp-tool goal" onclick="tpAdd('goal')">+ Trave</button>
    <button type="button" class="tp-tool arrow" onclick="tpAdd('arrow')">+ Seta</button>
    <button type="button" class="tp-tool square" onclick="tpAdd('square')">+ Quadrado</button>
    <button type="button" class="tp-tool circle" onclick="tpAdd('circle')">+ Círculo</button>
    </div>
    <button type="button" class="tp-tool trashmove" id="tp-trash-mover-btn" onclick="tpTrashModoMover()">↔ Mover lixeira</button>
    <p class="tp-hint">Duplo clique no jogador para número. Arraste para a lixeira para tirar. Cone e trave: arraste as bolinhas para girar e redimensionar.</p>
   </aside>
   <div class="tp-field-col">
    <div class="mini-board-area tp-field-wrap">
     <div id="mini-football-board">
      <img id="tp-field-bg" class="tp-field-bg" src="base_prancheta.png" alt="" draggable="false">
      <div id="mini-board-players"></div>
      <div id="tp-trash" class="tp-trash">🗑 Lixeira<br><small>solte aqui para tirar</small></div>
     </div>
    </div>
   </div>
   <aside class="tp-frames">
    <b>Telas <span id="tp-frame-count">0</span></b>
    <div id="tp-frame-list" class="tp-frame-list"></div>
    <p class="tp-hint">Salve quantas telas quiser. No vídeo o jogador anda do ponto A ao B.</p>
   </aside>
  </div>
 </div>`;
 const sel=document.getElementById('mini-tactical-system');
 if(sel) sel.onchange=resetPrancheta;
 if(!tpState.pieces.length) resetPrancheta();
 else tpRenderPieces();
 tpRenderFrames();
 tpTrashAplicarPosicao();
 const board=document.getElementById('mini-football-board');
 if(board && !board.__tpClickInit){
  board.__tpClickInit=true;
  board.addEventListener('pointerdown',function(e){
   if(e.target.closest && (e.target.closest('.tp-piece')||e.target.closest('.tp-trash')||e.target.closest('.tp-handle')||e.target.closest('#tp-ctx'))) return;
   tpState.sel=null; tpRenderPieces(); tpHideCtx();
  });
 }
}
function tpToggleAddPop(e){
 if(e){ e.preventDefault(); e.stopPropagation(); }
 const p=document.getElementById('tp-add-pop');
 if(!p)return;
 const on=p.classList.toggle('open');
 if(on){
  const bg=document.getElementById('tp-add-bg')||document.createElement('div');
  bg.id='tp-add-bg'; bg.className='tp-add-bg';
  bg.onclick=tpFecharAddPop;
  if(!bg.parentNode) document.body.appendChild(bg);
 }
 else tpFecharAddPop();
}
function tpFecharAddPop(){
 const p=document.getElementById('tp-add-pop');
 if(p) p.classList.remove('open');
 const bg=document.getElementById('tp-add-bg');
 if(bg) bg.remove();
}
function resetPrancheta(){
 const sel=document.getElementById('mini-tactical-system');
 const form=sel?sel.value:'4-3-3';
 tpState.pieces=[];
 tpState.homeN=1;
 tpState.awayN=1;
 tpState.sel=null;
 pranchetaMiniContador=12;
 (pranchetaSistemasMini[form]||[]).forEach(p=>{
  const isGk=p[2]==='G';
  tpState.pieces.push({id:tpNewId(),type:isGk?'gk-home':'home',x:p[0],y:p[1],rot:0,w:isGk?7:6,h:isGk?7:6,label:String(p[2])});
 });
 tpState.pieces.push({id:tpNewId(),type:'ball',x:50,y:50,rot:0,w:5,h:5,label:''});
 tpState.pieces.unshift(
  {id:tpNewId(),type:'goal',x:0.85,y:50,rot:270,w:9,h:4.2,label:''},
  {id:tpNewId(),type:'goal',x:98.0,y:50,rot:90,w:9,h:4.2,label:''}
 );
 tpRenderPieces();
}
function clearPrancheta(){ tpState.pieces=[]; tpState.sel=null; tpRenderPieces(); }
function adicionarBotaoPrancheta(){ tpAdd('home'); }
function adicionarBolaPrancheta(){ tpAdd('ball'); }
function criarBotaoPrancheta(x,y,texto,tipo){
 const t=tipo==='ball'?'ball':'home';
 tpState.pieces.push({id:tpNewId(),type:t,x:x,y:y,rot:0,w:t==='ball'?5:6,h:t==='ball'?5:6,label:String(texto||'')});
 tpRenderPieces();
}
function tpSpawnXY(type){
 const n=tpState.pieces.filter(p=>p.type===type).length;
 if(type==='square') return {x:30+n*4, y:22+n*3};
 if(type==='circle') return {x:70-n*4, y:22+n*3};
 if(type==='arrow') return {x:50, y:18+n*8};
 if(type==='cone') return {x:58+n*4, y:72};
 if(type==='goal') return {x:(n%2)?88:12, y:32};
 if(type==='ball') return {x:50, y:50};
 return {x:46+n*3, y:48};
}
function tpAdd(type){
 let label='', w=6, h=6, rot=0;
 if(type==='home'){ label=String(tpState.homeN++); }
 else if(type==='away'){ label=String(tpState.awayN++); }
 else if(type==='gk-home'||type==='gk-away'){ label='G'; w=7; h=7; }
 else if(type==='ball'){ label=''; w=5; h=5; }
 else if(type==='cone'){ label=''; w=2; h=3; }
 else if(type==='goal'){ label=''; w=10; h=5; }
 else if(type==='arrow'){ label=''; w=18; h=3; }
 else if(type==='square'){ label=''; w=18; h=18; }
 else if(type==='circle'){ label=''; w=16; h=16; }
 const xy=tpSpawnXY(type);
 const piece={id:tpNewId(),type,x:xy.x,y:xy.y,rot,w,h,label};
 if(type==='square'||type==='circle'){
  tpState.pieces.unshift(piece);
 }else{
  tpState.pieces.push(piece);
 }
 tpState.sel=piece.id;
 tpRenderPieces();
 tpFecharAddPop();
}
function tpPieceInner(p){
 const hs = '<span class="tp-handle tp-h-rot" data-h="rot"></span><span class="tp-handle tp-h-se" data-h="se"></span>';
 const har = '<span class="tp-handle tp-h-rot" data-h="rot"></span><span class="tp-handle tp-h-len" data-h="len"></span>';
 const hse = '<span class="tp-handle tp-h-se" data-h="se"></span>';
 if(p.type==='ball') return '<img class="tp-ico-img" src="bola.png" alt="Bola">';
 if(p.type==='goal') return TP_GOAL_SVG+hs;
 if(p.type==='cone') return TP_CONE_SVG+hs;
 if(p.type==='arrow') return '<span class="tp-arrow-body"></span>'+har;
 if(p.type==='square') return '<svg class="tp-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="4" y="4" width="92" height="92" fill="none" stroke="#fff" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>'+hse;
 if(p.type==='circle') return '<svg class="tp-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><circle cx="50" cy="50" r="45" fill="none" stroke="#fff" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>'+hse;
 return '';
}
function tpRenderPieces(){
 const area=document.getElementById('mini-board-players');
 if(!area)return;
 area.innerHTML='';
 tpState.pieces.forEach(p=>{
  const el=document.createElement('div');
  const shape=p.type==='square'?'tp-shape-sq':(p.type==='circle'?'tp-shape-ci':'');
  el.className=('tp-piece tp-'+p.type+' '+shape+(tpState.sel===p.id?' selected':'')).trim();
  el.dataset.id=p.id;
  el.style.left=p.x+'%';
  el.style.top=p.y+'%';
  const rot='translate(-50%,-50%) rotate('+(p.rot||0)+'deg)';
  if(p.type==='arrow'){
   el.style.width=p.w+'%';
   el.style.height='12px';
   el.style.transform=rot;
   el.innerHTML=tpPieceInner(p);
  } else if(p.type==='square'||p.type==='circle'||p.type==='cone'||p.type==='goal'||p.type==='ball'){
   if(p.type!=='ball'){ el.style.width=p.w+'%'; el.style.height=p.h+'%'; }
   el.style.transform=rot;
   el.innerHTML=tpPieceInner(p);
  } else {
   el.style.transform=rot;
   el.textContent=p.label;
  }
  el.style.zIndex=(p.type==='square'||p.type==='circle')?'1':String(20+tpState.pieces.indexOf(p));
  el.addEventListener('pointerdown',e=>tpPointerDown(e,p,el));
  el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();tpState.sel=p.id;tpRenderPieces();tpShowCtx(e,p);});
  el.ondblclick=()=>{
   if(['home','away','gk-home','gk-away'].includes(p.type)){
    const n=prompt('Número ou nome:',p.label); if(n!==null){p.label=n; tpRenderPieces();}
   }
  };
  area.appendChild(el);
 });
}
function tpBoardRect(){
 const board=document.getElementById('mini-football-board');
 return board?board.getBoundingClientRect():null;
}
function tpOverTrash(ev,trash){
 if(!trash)return false;
 const tr=trash.getBoundingClientRect();
 return ev.clientX>=tr.left&&ev.clientX<=tr.right&&ev.clientY>=tr.top&&ev.clientY<=tr.bottom;
}
function tpPointerDown(e,p,el){
 const h=e.target.closest&&e.target.closest('.tp-handle');
 const mode=h?h.getAttribute('data-h'):'move';
 e.preventDefault(); e.stopPropagation();
 tpState.sel=p.id;
 document.querySelectorAll('.tp-piece.selected').forEach(n=>n.classList.remove('selected'));
 el.classList.add('selected');
 el.setPointerCapture?.(e.pointerId);
 const br=tpBoardRect(); if(!br)return;
 const start={x:e.clientX,y:e.clientY,px:p.x,py:p.y,pw:p.w,ph:p.h,pr:p.rot};
 const trash=document.getElementById('tp-trash');
 function move(ev){
  const dx=((ev.clientX-start.x)/br.width)*100;
  const dy=((ev.clientY-start.y)/br.height)*100;
  if(mode==='move'){
   p.x=Math.max(-2,Math.min(102,start.px+dx));
   p.y=Math.max(-2,Math.min(102,start.py+dy));
   el.style.left=p.x+'%'; el.style.top=p.y+'%';
   if(trash) trash.classList.toggle('hot', tpOverTrash(ev,trash));
  } else if(mode==='len'){
   p.w=Math.max(6,Math.min(50,start.pw+dx));
   el.style.width=p.w+'%';
  } else if(mode==='rot'){
   const cx=br.left+(p.x/100)*br.width;
   const cy=br.top+(p.y/100)*br.height;
   p.rot=Math.round(Math.atan2(ev.clientY-cy,ev.clientX-cx)*180/Math.PI);
   el.style.transform='translate(-50%,-50%) rotate('+p.rot+'deg)';
  } else if(mode==='se'){
   const minS=(p.type==='cone'||p.type==='goal')?1.2:6;
   const maxS=(p.type==='cone')?8:(p.type==='goal')?22:55;
   p.w=Math.max(minS,Math.min(maxS,start.pw+dx));
   p.h=Math.max(minS,Math.min(maxS,start.ph+dy));
   el.style.width=p.w+'%'; el.style.height=p.h+'%';
  }
 }
 function up(ev){
  el.releasePointerCapture?.(ev.pointerId);
  el.removeEventListener('pointermove',move);
  el.removeEventListener('pointerup',up);
  if(mode==='move'&&trash){
   const over=tpOverTrash(ev,trash);
   trash.classList.remove('hot');
   if(over){ tpState.pieces=tpState.pieces.filter(x=>x.id!==p.id); tpState.sel=null; tpRenderPieces(); }
  }
 }
 el.addEventListener('pointermove',move);
 el.addEventListener('pointerup',up);
}
function tpSalvarTela(){
 tpState.frames.push({pieces:tpClonePieces()});
 tpRenderFrames();
}
function tpApagarFrame(i){
 tpState.frames.splice(i,1);
 tpRenderFrames();
}
function tpCarregarFrame(i){
 const f=tpState.frames[i]; if(!f)return;
 tpState.pieces=JSON.parse(JSON.stringify(f.pieces));
 tpRenderPieces();
}
function tpRenderFrames(){
 const list=document.getElementById('tp-frame-list');
 const cnt=document.getElementById('tp-frame-count');
 if(cnt)cnt.textContent=String(tpState.frames.length);
 if(!list)return;
 list.innerHTML=tpState.frames.map((f,i)=>`<div class="tp-thumb"><span>Tela ${i+1}</span><button type="button" onclick="tpCarregarFrame(${i})">Abrir</button><button type="button" class="del" onclick="tpApagarFrame(${i})">×</button></div>`).join('')||'<em>Nenhuma tela salva</em>';
}
/* === Lixeira móvel === */
let tpTrashPos=null; // {x,y} em % do campo
let tpTrashMoveMode=false;
function tpTrashAplicarPosicao(){
 const t=document.getElementById('tp-trash');
 if(!t)return;
 if(tpTrashPos){
  t.style.left=tpTrashPos.x+'%';
  t.style.top=tpTrashPos.y+'%';
  t.style.right='auto';
  t.style.bottom='auto';
  t.style.transform='translate(-50%,-50%)';
 }
 t.style.pointerEvents=tpTrashMoveMode?'auto':'none';
 t.classList.toggle('mover',tpTrashMoveMode);
 const b=document.getElementById('tp-trash-mover-btn');
 if(b)b.classList.toggle('active',tpTrashMoveMode);
}
function tpTrashModoMover(){
 tpTrashMoveMode=!tpTrashMoveMode;
 tpTrashAplicarPosicao();
 const t=document.getElementById('tp-trash');
 if(!t||t.__dragInit)return;
 t.__dragInit=true;
 t.addEventListener('pointerdown',function(e){
  if(!tpTrashMoveMode)return;
  e.preventDefault(); e.stopPropagation();
  const br=tpBoardRect(); if(!br)return;
  const start={x:e.clientX,y:e.clientY};
  const r=t.getBoundingClientRect();
  let cx=(r.left+r.width/2-br.left)/br.width*100;
  let cy=(r.top+r.height/2-br.top)/br.height*100;
  try{t.setPointerCapture&&t.setPointerCapture(e.pointerId);}catch(e2){}
  function mv(ev){
   const nx=cx+((ev.clientX-start.x)/br.width)*100;
   const ny=cy+((ev.clientY-start.y)/br.height)*100;
   tpTrashPos={x:Math.max(0,Math.min(100,nx)),y:Math.max(0,Math.min(100,ny))};
   tpTrashAplicarPosicao();
  }
  function up(ev){
   try{t.releasePointerCapture&&t.releasePointerCapture(ev.pointerId);}catch(e2){}
   t.removeEventListener('pointermove',mv);
   t.removeEventListener('pointerup',up);
  }
  t.addEventListener('pointermove',mv);
  t.addEventListener('pointerup',up);
 });
}


function tpHideCtx(){ const m=document.getElementById('tp-ctx'); if(m) m.style.display='none'; }
function tpShowCtx(e,p){
 let m=document.getElementById('tp-ctx');
 if(!m){
  m=document.createElement('div'); m.id='tp-ctx'; m.className='tp-ctx';
  document.body.appendChild(m);
  m.addEventListener('pointerdown',ev=>ev.stopPropagation());
  document.addEventListener('pointerdown',function(ev){
   if(ev.target.closest && ev.target.closest('#tp-ctx')) return;
   tpHideCtx();
  });
 }
 m.innerHTML='<button type="button" onclick="tpCamada(1)">Enviar para frente</button><button type="button" onclick="tpCamada(-1)">Enviar para trás</button><button type="button" onclick="tpGirar45()">Rotacionar 45°</button>';
 m.style.display='block';
 m.style.left=Math.min(e.clientX, window.innerWidth-200)+'px';
 m.style.top=Math.min(e.clientY, window.innerHeight-140)+'px';
 m.dataset.id=p.id;
}
function tpPecaDoMenu(){
 const m=document.getElementById('tp-ctx');
 const id=(m&&m.dataset.id)||tpState.sel;
 return tpState.pieces.find(x=>x.id===id)||null;
}
function tpCamada(dir){
 const item=tpPecaDoMenu();
 if(!item)return;
 const i=tpState.pieces.indexOf(item);
 if(i<0)return;
 tpState.pieces.splice(i,1);
 if(dir>0) tpState.pieces.push(item);
 else tpState.pieces.unshift(item);
 tpState.sel=item.id;
 tpRenderPieces();
}
function tpGirar45(){
 const item=tpPecaDoMenu();
 if(!item)return;
 item.rot=((item.rot||0)+45)%360;
 tpState.sel=item.id;
 tpRenderPieces();
}

function makeTacticalDraggable(){ /* compat */ }

var TP_FIELD_JPEG="data:image/jpeg;base64,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";
var __tpFieldJpegImg=null;
function tpFieldJpegReady(){
 if(__tpFieldJpegImg && __tpFieldJpegImg.complete && __tpFieldJpegImg.naturalWidth) return Promise.resolve(__tpFieldJpegImg);
 return new Promise(function(res){
  const i=new Image();
  i.onload=function(){ __tpFieldJpegImg=i; res(i); };
  i.onerror=function(){ res(null); };
  i.src=TP_FIELD_JPEG;
 });
}
function tpDrawField(ctx,W,H){
 const im=__tpFieldJpegImg;
 if(im && im.naturalWidth){
  ctx.drawImage(im,0,0,W,H);
  return;
 }
 ctx.fillStyle='#3a9a4a'; ctx.fillRect(0,0,W,H);
 for(let i=0;i<16;i++){ ctx.fillStyle=i%2?'#3a9a4a':'#348c44'; ctx.fillRect(i*(W/16),0,W/16,H); }
 const m=W*0.045, t=H*0.055;
 ctx.strokeStyle='rgba(232,245,220,.92)'; ctx.lineWidth=Math.max(2,W/500);
 ctx.strokeRect(m,t,W-2*m,H-2*t);
 ctx.beginPath(); ctx.moveTo(W/2,t); ctx.lineTo(W/2,H-t); ctx.stroke();
 ctx.beginPath(); ctx.arc(W/2,H/2,H*0.145,0,Math.PI*2); ctx.stroke();
 ctx.beginPath(); ctx.arc(W/2,H/2,3,0,Math.PI*2); ctx.fillStyle='rgba(232,245,220,.92)'; ctx.fill();
 const boxW=W*0.165, boxH=H*0.52, boxY=(H-boxH)/2;
 const sixW=W*0.07, sixH=H*0.26, sixY=(H-sixH)/2;
 ctx.strokeStyle='rgba(232,245,220,.92)';
 ctx.strokeRect(m,boxY,boxW,boxH);
 ctx.strokeRect(W-m-boxW,boxY,boxW,boxH);
 ctx.strokeRect(m,sixY,sixW,sixH);
 ctx.strokeRect(W-m-sixW,sixY,sixW,sixH);
 const arcR=H*0.12, pen=m+boxW;
 ctx.beginPath(); ctx.arc(pen,H/2,arcR,-Math.PI*0.53,Math.PI*0.53); ctx.stroke();
 ctx.beginPath(); ctx.arc(W-pen,H/2,arcR,Math.PI-Math.PI*0.53,Math.PI+Math.PI*0.53); ctx.stroke();
}
function tpDrawPieces(ctx,W,H,pieces){
 pieces.forEach(p=>{
  const x=(p.x/100)*W, y=(p.y/100)*H;
  if(p.type==='arrow'){
   ctx.save(); ctx.translate(x,y); ctx.rotate(p.rot*Math.PI/180);
   const len=(p.w/100)*W; ctx.strokeStyle='#111'; ctx.fillStyle='#111'; ctx.lineWidth=2; ctx.lineCap='round';
   ctx.beginPath(); ctx.moveTo(-len/2,0); ctx.lineTo(len/2-8,0); ctx.stroke();
   ctx.beginPath(); ctx.moveTo(len/2,0); ctx.lineTo(len/2-11,-4.5); ctx.lineTo(len/2-11,4.5); ctx.closePath(); ctx.fill();
   ctx.restore(); return;
  }
  if(p.type==='square'||p.type==='circle'){
   ctx.save(); ctx.translate(x,y); ctx.rotate((p.rot||0)*Math.PI/180);
   ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.fillStyle='rgba(0,0,0,0)';
   const ww=(p.w/100)*W, hh=(p.h/100)*H;
   if(p.type==='circle'){ ctx.beginPath(); ctx.ellipse(0,0,ww/2,hh/2,0,0,Math.PI*2); ctx.stroke(); }
   else { ctx.strokeRect(-ww/2,-hh/2,ww,hh); }
   ctx.restore(); return;
  }
  if(p.type==='goal'){
   ctx.save(); ctx.translate(x,y);
   if(p.rot)ctx.rotate(p.rot*Math.PI/180);
   const gw=Math.max(14,(p.w/100)*W), gh=Math.max(16,(p.h/100)*H);
   ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=1;
   for(let i=1;i<4;i++){ const yy=-gh/2+(gh/4)*i; ctx.beginPath(); ctx.moveTo(-gw/2,yy); ctx.lineTo(gw/2,yy); ctx.stroke(); }
   for(let i=1;i<4;i++){ const xx=-gw/2+(gw/4)*i; ctx.beginPath(); ctx.moveTo(xx,-gh/2); ctx.lineTo(xx,gh/2); ctx.stroke(); }
   ctx.strokeStyle='#fff'; ctx.lineWidth=2.5;
   ctx.strokeRect(-gw/2,-gh/2,gw,gh);
   ctx.restore(); return;
  }
  if(p.type==='cone'){
   const ch=Math.max(16,(p.h/100)*H);
   const cw=ch*0.52;
   ctx.save(); ctx.translate(x,y);
   if(p.rot)ctx.rotate(p.rot*Math.PI/180);
   ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0,ch*0.42,cw*0.28,ch*0.06,0,0,Math.PI*2); ctx.fill();
   ctx.fillStyle='#f39c12'; ctx.strokeStyle='#c0392b'; ctx.lineWidth=1;
   ctx.beginPath(); ctx.moveTo(-cw*0.28,ch*0.38); ctx.lineTo(-cw*0.08,-ch*0.42); ctx.quadraticCurveTo(0,-ch*0.5,cw*0.08,-ch*0.42); ctx.lineTo(cw*0.28,ch*0.38); ctx.closePath(); ctx.fill(); ctx.stroke();
   ctx.fillStyle='#fff'; ctx.fillRect(-cw*0.2,ch*0.04,cw*0.4,ch*0.1); ctx.fillRect(-cw*0.14,-ch*0.18,cw*0.28,ch*0.09);
   ctx.fillStyle='#e67e22'; ctx.fillRect(-cw*0.3,ch*0.32,cw*0.6,ch*0.1);
   ctx.restore(); return;
  }
  let r=Math.max(5,(p.w/100)*W*0.2), fill='#d63031', color='#fff';
  if(p.type==='home'){ fill='#d63031'; }
  if(p.type==='away'){ fill='#0984e3'; }
  if(p.type==='gk-home'){ fill='#f9c614'; color='#111'; }
  if(p.type==='gk-away'){ fill='#111'; color='#f9c614'; }
  ctx.save(); ctx.translate(x,y); ctx.rotate((p.rot||0)*Math.PI/180);
  if(p.type==='ball'){
   ctx.beginPath(); ctx.arc(0,0,7,0,Math.PI*2); ctx.fillStyle='#f4f4f4'; ctx.fill(); ctx.strokeStyle='#111'; ctx.lineWidth=1.5; ctx.stroke();
   ctx.fillStyle='#111'; ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(2.5,-1.5); ctx.lineTo(1.5,1.5); ctx.lineTo(-1.5,1.5); ctx.lineTo(-2.5,-1.5); ctx.closePath(); ctx.fill();
   ctx.restore(); return;
  }
  ctx.fillStyle=fill; ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill(); ctx.stroke();
  if(p.label){ ctx.fillStyle=color; ctx.font='bold 10px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(p.label).slice(0,3),0,0); }
  ctx.restore();
 });
}
function tpLerp(a,b,t){ return a+(b-a)*t; }
function tpMixPieces(a,b,t){
 const mapB=new Map(b.map(p=>[p.id,p]));
 const out=[];
 a.forEach(pa=>{
  const pb=mapB.get(pa.id);
  if(!pb){ out.push(pa); return; }
  out.push({id:pa.id,type:pa.type,label:pb.label,x:tpLerp(pa.x,pb.x,t),y:tpLerp(pa.y,pb.y,t),w:tpLerp(pa.w,pb.w,t),h:tpLerp(pa.h,pb.h,t),rot:tpLerp(pa.rot,pb.rot,t)});
 });
 b.forEach(pb=>{ if(!a.some(pa=>pa.id===pb.id)) out.push(pb); });
 return out;
}/* fix-webm-duration (MIT, yusukehirao) - injeta duracao no WebM p/ WhatsApp/Telegram */
(function (name, definition) {
    if (typeof define === 'function' && define.amd) { // RequireJS / AMD
        define(definition);
    } else if (typeof module !== 'undefined' && module.exports) { // CommonJS / Node.js
        module.exports = definition();
    } else { // Direct include
        window.ysFixWebmDuration = definition();
    }
})('fix-webm-duration', function () {
    /*
     * This is the list of possible WEBM file sections by their IDs.
     * Possible types: Container, Binary, Uint, Int, String, Float, Date
     */
    var sections = {
        0xa45dfa3: { name: 'EBML', type: 'Container' },
        0x286: { name: 'EBMLVersion', type: 'Uint' },
        0x2f7: { name: 'EBMLReadVersion', type: 'Uint' },
        0x2f2: { name: 'EBMLMaxIDLength', type: 'Uint' },
        0x2f3: { name: 'EBMLMaxSizeLength', type: 'Uint' },
        0x282: { name: 'DocType', type: 'String' },
        0x287: { name: 'DocTypeVersion', type: 'Uint' },
        0x285: { name: 'DocTypeReadVersion', type: 'Uint' },
        0x6c: { name: 'Void', type: 'Binary' },
        0x3f: { name: 'CRC-32', type: 'Binary' },
        0xb538667: { name: 'SignatureSlot', type: 'Container' },
        0x3e8a: { name: 'SignatureAlgo', type: 'Uint' },
        0x3e9a: { name: 'SignatureHash', type: 'Uint' },
        0x3ea5: { name: 'SignaturePublicKey', type: 'Binary' },
        0x3eb5: { name: 'Signature', type: 'Binary' },
        0x3e5b: { name: 'SignatureElements', type: 'Container' },
        0x3e7b: { name: 'SignatureElementList', type: 'Container' },
        0x2532: { name: 'SignedElement', type: 'Binary' },
        0x8538067: { name: 'Segment', type: 'Container' },
        0x14d9b74: { name: 'SeekHead', type: 'Container' },
        0xdbb: { name: 'Seek', type: 'Container' },
        0x13ab: { name: 'SeekID', type: 'Binary' },
        0x13ac: { name: 'SeekPosition', type: 'Uint' },
        0x549a966: { name: 'Info', type: 'Container' },
        0x33a4: { name: 'SegmentUID', type: 'Binary' },
        0x3384: { name: 'SegmentFilename', type: 'String' },
        0x1cb923: { name: 'PrevUID', type: 'Binary' },
        0x1c83ab: { name: 'PrevFilename', type: 'String' },
        0x1eb923: { name: 'NextUID', type: 'Binary' },
        0x1e83bb: { name: 'NextFilename', type: 'String' },
        0x444: { name: 'SegmentFamily', type: 'Binary' },
        0x2924: { name: 'ChapterTranslate', type: 'Container' },
        0x29fc: { name: 'ChapterTranslateEditionUID', type: 'Uint' },
        0x29bf: { name: 'ChapterTranslateCodec', type: 'Uint' },
        0x29a5: { name: 'ChapterTranslateID', type: 'Binary' },
        0xad7b1: { name: 'TimecodeScale', type: 'Uint' },
        0x489: { name: 'Duration', type: 'Float' },
        0x461: { name: 'DateUTC', type: 'Date' },
        0x3ba9: { name: 'Title', type: 'String' },
        0xd80: { name: 'MuxingApp', type: 'String' },
        0x1741: { name: 'WritingApp', type: 'String' },
        // 0xf43b675: { name: 'Cluster', type: 'Container' },
        0x67: { name: 'Timecode', type: 'Uint' },
        0x1854: { name: 'SilentTracks', type: 'Container' },
        0x18d7: { name: 'SilentTrackNumber', type: 'Uint' },
        0x27: { name: 'Position', type: 'Uint' },
        0x2b: { name: 'PrevSize', type: 'Uint' },
        0x23: { name: 'SimpleBlock', type: 'Binary' },
        0x20: { name: 'BlockGroup', type: 'Container' },
        0x21: { name: 'Block', type: 'Binary' },
        0x22: { name: 'BlockVirtual', type: 'Binary' },
        0x35a1: { name: 'BlockAdditions', type: 'Container' },
        0x26: { name: 'BlockMore', type: 'Container' },
        0x6e: { name: 'BlockAddID', type: 'Uint' },
        0x25: { name: 'BlockAdditional', type: 'Binary' },
        0x1b: { name: 'BlockDuration', type: 'Uint' },
        0x7a: { name: 'ReferencePriority', type: 'Uint' },
        0x7b: { name: 'ReferenceBlock', type: 'Int' },
        0x7d: { name: 'ReferenceVirtual', type: 'Int' },
        0x24: { name: 'CodecState', type: 'Binary' },
        0x35a2: { name: 'DiscardPadding', type: 'Int' },
        0xe: { name: 'Slices', type: 'Container' },
        0x68: { name: 'TimeSlice', type: 'Container' },
        0x4c: { name: 'LaceNumber', type: 'Uint' },
        0x4d: { name: 'FrameNumber', type: 'Uint' },
        0x4b: { name: 'BlockAdditionID', type: 'Uint' },
        0x4e: { name: 'Delay', type: 'Uint' },
        0x4f: { name: 'SliceDuration', type: 'Uint' },
        0x48: { name: 'ReferenceFrame', type: 'Container' },
        0x49: { name: 'ReferenceOffset', type: 'Uint' },
        0x4a: { name: 'ReferenceTimeCode', type: 'Uint' },
        0x2f: { name: 'EncryptedBlock', type: 'Binary' },
        0x654ae6b: { name: 'Tracks', type: 'Container' },
        0x2e: { name: 'TrackEntry', type: 'Container' },
        0x57: { name: 'TrackNumber', type: 'Uint' },
        0x33c5: { name: 'TrackUID', type: 'Uint' },
        0x3: { name: 'TrackType', type: 'Uint' },
        0x39: { name: 'FlagEnabled', type: 'Uint' },
        0x8: { name: 'FlagDefault', type: 'Uint' },
        0x15aa: { name: 'FlagForced', type: 'Uint' },
        0x1c: { name: 'FlagLacing', type: 'Uint' },
        0x2de7: { name: 'MinCache', type: 'Uint' },
        0x2df8: { name: 'MaxCache', type: 'Uint' },
        0x3e383: { name: 'DefaultDuration', type: 'Uint' },
        0x34e7a: { name: 'DefaultDecodedFieldDuration', type: 'Uint' },
        0x3314f: { name: 'TrackTimecodeScale', type: 'Float' },
        0x137f: { name: 'TrackOffset', type: 'Int' },
        0x15ee: { name: 'MaxBlockAdditionID', type: 'Uint' },
        0x136e: { name: 'Name', type: 'String' },
        0x2b59c: { name: 'Language', type: 'String' },
        0x6: { name: 'CodecID', type: 'String' },
        0x23a2: { name: 'CodecPrivate', type: 'Binary' },
        0x58688: { name: 'CodecName', type: 'String' },
        0x3446: { name: 'AttachmentLink', type: 'Uint' },
        0x1a9697: { name: 'CodecSettings', type: 'String' },
        0x1b4040: { name: 'CodecInfoURL', type: 'String' },
        0x6b240: { name: 'CodecDownloadURL', type: 'String' },
        0x2a: { name: 'CodecDecodeAll', type: 'Uint' },
        0x2fab: { name: 'TrackOverlay', type: 'Uint' },
        0x16aa: { name: 'CodecDelay', type: 'Uint' },
        0x16bb: { name: 'SeekPreRoll', type: 'Uint' },
        0x2624: { name: 'TrackTranslate', type: 'Container' },
        0x26fc: { name: 'TrackTranslateEditionUID', type: 'Uint' },
        0x26bf: { name: 'TrackTranslateCodec', type: 'Uint' },
        0x26a5: { name: 'TrackTranslateTrackID', type: 'Binary' },
        0x60: { name: 'Video', type: 'Container' },
        0x1a: { name: 'FlagInterlaced', type: 'Uint' },
        0x13b8: { name: 'StereoMode', type: 'Uint' },
        0x13c0: { name: 'AlphaMode', type: 'Uint' },
        0x13b9: { name: 'OldStereoMode', type: 'Uint' },
        0x30: { name: 'PixelWidth', type: 'Uint' },
        0x3a: { name: 'PixelHeight', type: 'Uint' },
        0x14aa: { name: 'PixelCropBottom', type: 'Uint' },
        0x14bb: { name: 'PixelCropTop', type: 'Uint' },
        0x14cc: { name: 'PixelCropLeft', type: 'Uint' },
        0x14dd: { name: 'PixelCropRight', type: 'Uint' },
        0x14b0: { name: 'DisplayWidth', type: 'Uint' },
        0x14ba: { name: 'DisplayHeight', type: 'Uint' },
        0x14b2: { name: 'DisplayUnit', type: 'Uint' },
        0x14b3: { name: 'AspectRatioType', type: 'Uint' },
        0xeb524: { name: 'ColourSpace', type: 'Binary' },
        0xfb523: { name: 'GammaValue', type: 'Float' },
        0x383e3: { name: 'FrameRate', type: 'Float' },
        0x61: { name: 'Audio', type: 'Container' },
        0x35: { name: 'SamplingFrequency', type: 'Float' },
        0x38b5: { name: 'OutputSamplingFrequency', type: 'Float' },
        0x1f: { name: 'Channels', type: 'Uint' },
        0x3d7b: { name: 'ChannelPositions', type: 'Binary' },
        0x2264: { name: 'BitDepth', type: 'Uint' },
        0x62: { name: 'TrackOperation', type: 'Container' },
        0x63: { name: 'TrackCombinePlanes', type: 'Container' },
        0x64: { name: 'TrackPlane', type: 'Container' },
        0x65: { name: 'TrackPlaneUID', type: 'Uint' },
        0x66: { name: 'TrackPlaneType', type: 'Uint' },
        0x69: { name: 'TrackJoinBlocks', type: 'Container' },
        0x6d: { name: 'TrackJoinUID', type: 'Uint' },
        0x40: { name: 'TrickTrackUID', type: 'Uint' },
        0x41: { name: 'TrickTrackSegmentUID', type: 'Binary' },
        0x46: { name: 'TrickTrackFlag', type: 'Uint' },
        0x47: { name: 'TrickMasterTrackUID', type: 'Uint' },
        0x44: { name: 'TrickMasterTrackSegmentUID', type: 'Binary' },
        0x2d80: { name: 'ContentEncodings', type: 'Container' },
        0x2240: { name: 'ContentEncoding', type: 'Container' },
        0x1031: { name: 'ContentEncodingOrder', type: 'Uint' },
        0x1032: { name: 'ContentEncodingScope', type: 'Uint' },
        0x1033: { name: 'ContentEncodingType', type: 'Uint' },
        0x1034: { name: 'ContentCompression', type: 'Container' },
        0x254: { name: 'ContentCompAlgo', type: 'Uint' },
        0x255: { name: 'ContentCompSettings', type: 'Binary' },
        0x1035: { name: 'ContentEncryption', type: 'Container' },
        0x7e1: { name: 'ContentEncAlgo', type: 'Uint' },
        0x7e2: { name: 'ContentEncKeyID', type: 'Binary' },
        0x7e3: { name: 'ContentSignature', type: 'Binary' },
        0x7e4: { name: 'ContentSigKeyID', type: 'Binary' },
        0x7e5: { name: 'ContentSigAlgo', type: 'Uint' },
        0x7e6: { name: 'ContentSigHashAlgo', type: 'Uint' },
        0xc53bb6b: { name: 'Cues', type: 'Container' },
        0x3b: { name: 'CuePoint', type: 'Container' },
        0x33: { name: 'CueTime', type: 'Uint' },
        0x37: { name: 'CueTrackPositions', type: 'Container' },
        0x77: { name: 'CueTrack', type: 'Uint' },
        0x71: { name: 'CueClusterPosition', type: 'Uint' },
        0x70: { name: 'CueRelativePosition', type: 'Uint' },
        0x32: { name: 'CueDuration', type: 'Uint' },
        0x1378: { name: 'CueBlockNumber', type: 'Uint' },
        0x6a: { name: 'CueCodecState', type: 'Uint' },
        0x5b: { name: 'CueReference', type: 'Container' },
        0x16: { name: 'CueRefTime', type: 'Uint' },
        0x17: { name: 'CueRefCluster', type: 'Uint' },
        0x135f: { name: 'CueRefNumber', type: 'Uint' },
        0x6b: { name: 'CueRefCodecState', type: 'Uint' },
        0x941a469: { name: 'Attachments', type: 'Container' },
        0x21a7: { name: 'AttachedFile', type: 'Container' },
        0x67e: { name: 'FileDescription', type: 'String' },
        0x66e: { name: 'FileName', type: 'String' },
        0x660: { name: 'FileMimeType', type: 'String' },
        0x65c: { name: 'FileData', type: 'Binary' },
        0x6ae: { name: 'FileUID', type: 'Uint' },
        0x675: { name: 'FileReferral', type: 'Binary' },
        0x661: { name: 'FileUsedStartTime', type: 'Uint' },
        0x662: { name: 'FileUsedEndTime', type: 'Uint' },
        0x43a770: { name: 'Chapters', type: 'Container' },
        0x5b9: { name: 'EditionEntry', type: 'Container' },
        0x5bc: { name: 'EditionUID', type: 'Uint' },
        0x5bd: { name: 'EditionFlagHidden', type: 'Uint' },
        0x5db: { name: 'EditionFlagDefault', type: 'Uint' },
        0x5dd: { name: 'EditionFlagOrdered', type: 'Uint' },
        0x36: { name: 'ChapterAtom', type: 'Container' },
        0x33c4: { name: 'ChapterUID', type: 'Uint' },
        0x1654: { name: 'ChapterStringUID', type: 'String' },
        0x11: { name: 'ChapterTimeStart', type: 'Uint' },
        0x12: { name: 'ChapterTimeEnd', type: 'Uint' },
        0x18: { name: 'ChapterFlagHidden', type: 'Uint' },
        0x598: { name: 'ChapterFlagEnabled', type: 'Uint' },
        0x2e67: { name: 'ChapterSegmentUID', type: 'Binary' },
        0x2ebc: { name: 'ChapterSegmentEditionUID', type: 'Uint' },
        0x23c3: { name: 'ChapterPhysicalEquiv', type: 'Uint' },
        0xf: { name: 'ChapterTrack', type: 'Container' },
        0x9: { name: 'ChapterTrackNumber', type: 'Uint' },
        0x0: { name: 'ChapterDisplay', type: 'Container' },
        0x5: { name: 'ChapString', type: 'String' },
        0x37c: { name: 'ChapLanguage', type: 'String' },
        0x37e: { name: 'ChapCountry', type: 'String' },
        0x2944: { name: 'ChapProcess', type: 'Container' },
        0x2955: { name: 'ChapProcessCodecID', type: 'Uint' },
        0x50d: { name: 'ChapProcessPrivate', type: 'Binary' },
        0x2911: { name: 'ChapProcessCommand', type: 'Container' },
        0x2922: { name: 'ChapProcessTime', type: 'Uint' },
        0x2933: { name: 'ChapProcessData', type: 'Binary' },
        0x254c367: { name: 'Tags', type: 'Container' },
        0x3373: { name: 'Tag', type: 'Container' },
        0x23c0: { name: 'Targets', type: 'Container' },
        0x28ca: { name: 'TargetTypeValue', type: 'Uint' },
        0x23ca: { name: 'TargetType', type: 'String' },
        0x23c5: { name: 'TagTrackUID', type: 'Uint' },
        0x23c9: { name: 'TagEditionUID', type: 'Uint' },
        0x23c4: { name: 'TagChapterUID', type: 'Uint' },
        0x23c6: { name: 'TagAttachmentUID', type: 'Uint' },
        0x27c8: { name: 'SimpleTag', type: 'Container' },
        0x5a3: { name: 'TagName', type: 'String' },
        0x47a: { name: 'TagLanguage', type: 'String' },
        0x484: { name: 'TagDefault', type: 'Uint' },
        0x487: { name: 'TagString', type: 'String' },
        0x485: { name: 'TagBinary', type: 'Binary' }
    };

    function doInherit(newClass, baseClass) {
        newClass.prototype = Object.create(baseClass.prototype);
        newClass.prototype.constructor = newClass;
    }

    function WebmBase(name, type) {
        this.name = name || 'Unknown';
        this.type = type || 'Unknown';
    }
    WebmBase.prototype.updateBySource = function() { };
    WebmBase.prototype.setSource = function(source) {
        this.source = source;
        this.updateBySource();
    };
    WebmBase.prototype.updateByData = function() { };
    WebmBase.prototype.setData = function(data) {
        this.data = data;
        this.updateByData();
    };

    function WebmUint(name, type) {
        WebmBase.call(this, name, type || 'Uint');
    }
    doInherit(WebmUint, WebmBase);
    function padHex(hex) {
        return hex.length % 2 === 1 ? '0' + hex : hex;
    }
    WebmUint.prototype.updateBySource = function() {
        // use hex representation of a number instead of number value
        this.data = '';
        for (var i = 0; i < this.source.length; i++) {
            var hex = this.source[i].toString(16);
            this.data += padHex(hex);
        }
    };
    WebmUint.prototype.updateByData = function() {
        var length = this.data.length / 2;
        this.source = new Uint8Array(length);
        for (var i = 0; i < length; i++) {
            var hex = this.data.substr(i * 2, 2);
            this.source[i] = parseInt(hex, 16);
        }
    };
    WebmUint.prototype.getValue = function() {
        return parseInt(this.data, 16);
    };
    WebmUint.prototype.setValue = function(value) {
        this.setData(padHex(value.toString(16)));
    };

    function WebmFloat(name, type) {
        WebmBase.call(this, name, type || 'Float');
    }
    doInherit(WebmFloat, WebmBase);
    WebmFloat.prototype.getFloatArrayType = function() {
        return this.source && this.source.length === 4 ? Float32Array : Float64Array;
    };
    WebmFloat.prototype.updateBySource = function() {
        var byteArray = this.source.reverse();
        var floatArrayType = this.getFloatArrayType();
        var floatArray = new floatArrayType(byteArray.buffer);
        this.data = floatArray[0];
    };
    WebmFloat.prototype.updateByData = function() {
        var floatArrayType = this.getFloatArrayType();
        var floatArray = new floatArrayType([ this.data ]);
        var byteArray = new Uint8Array(floatArray.buffer);
        this.source = byteArray.reverse();
    };
    WebmFloat.prototype.getValue = function() {
        return this.data;
    };
    WebmFloat.prototype.setValue = function(value) {
        this.setData(value);
    };

    function WebmContainer(name, type) {
        WebmBase.call(this, name, type || 'Container');
    }
    doInherit(WebmContainer, WebmBase);
    WebmContainer.prototype.readByte = function() {
        return this.source[this.offset++];
    };
    WebmContainer.prototype.readUint = function() {
        var firstByte = this.readByte();
        var bytes = 8 - firstByte.toString(2).length;
        var value = firstByte - (1 << (7 - bytes));
        for (var i = 0; i < bytes; i++) {
            // don't use bit operators to support x86
            value *= 256;
            value += this.readByte();
        }
        return value;
    };
    WebmContainer.prototype.updateBySource = function() {
        this.data = [];
        for (this.offset = 0; this.offset < this.source.length; this.offset = end) {
            var id = this.readUint();
            var len = this.readUint();
            var end = Math.min(this.offset + len, this.source.length);
            var data = this.source.slice(this.offset, end);

            var info = sections[id] || { name: 'Unknown', type: 'Unknown' };
            var ctr = WebmBase;
            switch (info.type) {
                case 'Container':
                    ctr = WebmContainer;
                    break;
                case 'Uint':
                    ctr = WebmUint;
                    break;
                case 'Float':
                    ctr = WebmFloat;
                    break;
            }
            var section = new ctr(info.name, info.type);
            section.setSource(data);
            this.data.push({
                id: id,
                idHex: id.toString(16),
                data: section
            });
        }
    };
    WebmContainer.prototype.writeUint = function(x, draft) {
        for (var bytes = 1, flag = 0x80; x >= flag && bytes < 8; bytes++, flag *= 0x80) { }

        if (!draft) {
            var value = flag + x;
            for (var i = bytes - 1; i >= 0; i--) {
                // don't use bit operators to support x86
                var c = value % 256;
                this.source[this.offset + i] = c;
                value = (value - c) / 256;
            }
        }

        this.offset += bytes;
    };
    WebmContainer.prototype.writeSections = function(draft) {
        this.offset = 0;
        for (var i = 0; i < this.data.length; i++) {
            var section = this.data[i],
                content = section.data.source,
                contentLength = content.length;
            this.writeUint(section.id, draft);
            this.writeUint(contentLength, draft);
            if (!draft) {
                this.source.set(content, this.offset);
            }
            this.offset += contentLength;
        }
        return this.offset;
    };
    WebmContainer.prototype.updateByData = function() {
        // run without accessing this.source to determine total length - need to know it to create Uint8Array
        var length = this.writeSections('draft');
        this.source = new Uint8Array(length);
        // now really write data
        this.writeSections();
    };
    WebmContainer.prototype.getSectionById = function(id) {
        for (var i = 0; i < this.data.length; i++) {
            var section = this.data[i];
            if (section.id === id) {
                return section.data;
            }
        }
        return null;
    };

    function WebmFile(source) {
        WebmContainer.call(this, 'File', 'File');
        this.setSource(source);
    }
    doInherit(WebmFile, WebmContainer);
    WebmFile.prototype.fixDuration = function(duration, options) {
        var logger = options && options.logger;
        if (logger === undefined) {
            logger = function(message) {
                console.log(message);
            };
        } else if (!logger) {
            logger = function() { };
        }

        var segmentSection = this.getSectionById(0x8538067);
        if (!segmentSection) {
            logger('[fix-webm-duration] Segment section is missing');
            return false;
        }

        var infoSection = segmentSection.getSectionById(0x549a966);
        if (!infoSection) {
            logger('[fix-webm-duration] Info section is missing');
            return false;
        }

        var timeScaleSection = infoSection.getSectionById(0xad7b1);
        if (!timeScaleSection) {
            logger('[fix-webm-duration] TimecodeScale section is missing');
            return false;
        }

        var durationSection = infoSection.getSectionById(0x489);
        if (durationSection) {
            if (durationSection.getValue() <= 0) {
                logger(`[fix-webm-duration] Duration section is present, but the value is ${durationSection.getValue()}`);
                durationSection.setValue(duration);
            } else {
                logger(`[fix-webm-duration] Duration section is present, and the value is ${durationSection.getValue()}`);
                return false;
            }
        } else {
            logger('[fix-webm-duration] Duration section is missing');
            // append Duration section
            durationSection = new WebmFloat('Duration', 'Float');
            durationSection.setValue(duration);
            infoSection.data.push({
                id: 0x489,
                data: durationSection
            });
        }

        // set default time scale to 1 millisecond (1000000 nanoseconds)
        timeScaleSection.setValue(1000000);
        infoSection.updateByData();
        segmentSection.updateByData();
        this.updateByData();

        return true;
    };
    WebmFile.prototype.toBlob = function(mimeType) {
        return new Blob([ this.source.buffer ], { type: mimeType || 'video/webm' });
    };

    function fixWebmDuration(blob, duration, callback, options) {
        // The callback may be omitted - then the third argument is options
        if (typeof callback === "object") {
            options = callback;
            callback = undefined;
        }

        if (!callback) {
            return new Promise(function(resolve) {
                fixWebmDuration(blob, duration, resolve, options);
            });
        }

        try {
            var reader = new FileReader();
            reader.onloadend = function() {
                try {
                    var file = new WebmFile(new Uint8Array(reader.result));
                    if (file.fixDuration(duration, options)) {
                        blob = file.toBlob(blob.type);
                    }
                } catch (ex) {
                    // ignore
                }
                callback(blob);
            };
            reader.readAsArrayBuffer(blob);
        } catch (ex) {
            callback(blob);
        }
    }

    // Support AMD import default
    fixWebmDuration.default = fixWebmDuration;

    return fixWebmDuration;
});


"use strict";
var Mp4Muxer = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __accessCheck = (obj, member, msg) => {
    if (!member.has(obj))
      throw TypeError("Cannot " + msg);
  };
  var __privateGet = (obj, member, getter) => {
    __accessCheck(obj, member, "read from private field");
    return getter ? getter.call(obj) : member.get(obj);
  };
  var __privateAdd = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };
  var __privateSet = (obj, member, value, setter) => {
    __accessCheck(obj, member, "write to private field");
    setter ? setter.call(obj, value) : member.set(obj, value);
    return value;
  };
  var __privateWrapper = (obj, member, setter, getter) => ({
    set _(value) {
      __privateSet(obj, member, value, setter);
    },
    get _() {
      return __privateGet(obj, member, getter);
    }
  });
  var __privateMethod = (obj, member, method) => {
    __accessCheck(obj, member, "access private method");
    return method;
  };

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    ArrayBufferTarget: () => ArrayBufferTarget,
    FileSystemWritableFileStreamTarget: () => FileSystemWritableFileStreamTarget,
    Muxer: () => Muxer,
    StreamTarget: () => StreamTarget
  });

  // src/misc.ts
  var bytes = new Uint8Array(8);
  var view = new DataView(bytes.buffer);
  var u8 = (value) => {
    return [(value % 256 + 256) % 256];
  };
  var u16 = (value) => {
    view.setUint16(0, value, false);
    return [bytes[0], bytes[1]];
  };
  var i16 = (value) => {
    view.setInt16(0, value, false);
    return [bytes[0], bytes[1]];
  };
  var u24 = (value) => {
    view.setUint32(0, value, false);
    return [bytes[1], bytes[2], bytes[3]];
  };
  var u32 = (value) => {
    view.setUint32(0, value, false);
    return [bytes[0], bytes[1], bytes[2], bytes[3]];
  };
  var i32 = (value) => {
    view.setInt32(0, value, false);
    return [bytes[0], bytes[1], bytes[2], bytes[3]];
  };
  var u64 = (value) => {
    view.setUint32(0, Math.floor(value / 2 ** 32), false);
    view.setUint32(4, value, false);
    return [bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7]];
  };
  var fixed_8_8 = (value) => {
    view.setInt16(0, 2 ** 8 * value, false);
    return [bytes[0], bytes[1]];
  };
  var fixed_16_16 = (value) => {
    view.setInt32(0, 2 ** 16 * value, false);
    return [bytes[0], bytes[1], bytes[2], bytes[3]];
  };
  var fixed_2_30 = (value) => {
    view.setInt32(0, 2 ** 30 * value, false);
    return [bytes[0], bytes[1], bytes[2], bytes[3]];
  };
  var ascii = (text, nullTerminated = false) => {
    let bytes2 = Array(text.length).fill(null).map((_, i) => text.charCodeAt(i));
    if (nullTerminated)
      bytes2.push(0);
    return bytes2;
  };
  var last = (arr) => {
    return arr && arr[arr.length - 1];
  };
  var lastPresentedSample = (samples) => {
    let result = void 0;
    for (let sample of samples) {
      if (!result || sample.presentationTimestamp > result.presentationTimestamp) {
        result = sample;
      }
    }
    return result;
  };
  var intoTimescale = (timeInSeconds, timescale, round = true) => {
    let value = timeInSeconds * timescale;
    return round ? Math.round(value) : value;
  };
  var rotationMatrix = (rotationInDegrees) => {
    let theta = rotationInDegrees * (Math.PI / 180);
    let cosTheta = Math.cos(theta);
    let sinTheta = Math.sin(theta);
    return [
      cosTheta,
      sinTheta,
      0,
      -sinTheta,
      cosTheta,
      0,
      0,
      0,
      1
    ];
  };
  var IDENTITY_MATRIX = rotationMatrix(0);
  var matrixToBytes = (matrix) => {
    return [
      fixed_16_16(matrix[0]),
      fixed_16_16(matrix[1]),
      fixed_2_30(matrix[2]),
      fixed_16_16(matrix[3]),
      fixed_16_16(matrix[4]),
      fixed_2_30(matrix[5]),
      fixed_16_16(matrix[6]),
      fixed_16_16(matrix[7]),
      fixed_2_30(matrix[8])
    ];
  };
  var deepClone = (x) => {
    if (!x)
      return x;
    if (typeof x !== "object")
      return x;
    if (Array.isArray(x))
      return x.map(deepClone);
    return Object.fromEntries(Object.entries(x).map(([key, value]) => [key, deepClone(value)]));
  };
  var isU32 = (value) => {
    return value >= 0 && value < 2 ** 32;
  };

  // src/box.ts
  var box = (type, contents, children) => ({
    type,
    contents: contents && new Uint8Array(contents.flat(10)),
    children
  });
  var fullBox = (type, version, flags, contents, children) => box(
    type,
    [u8(version), u24(flags), contents ?? []],
    children
  );
  var ftyp = (details) => {
    let minorVersion = 512;
    if (details.fragmented)
      return box("ftyp", [
        ascii("iso5"),
        // Major brand
        u32(minorVersion),
        // Minor version
        // Compatible brands
        ascii("iso5"),
        ascii("iso6"),
        ascii("mp41")
      ]);
    return box("ftyp", [
      ascii("isom"),
      // Major brand
      u32(minorVersion),
      // Minor version
      // Compatible brands
      ascii("isom"),
      details.holdsAvc ? ascii("avc1") : [],
      ascii("mp41")
    ]);
  };
  var mdat = (reserveLargeSize) => ({ type: "mdat", largeSize: reserveLargeSize });
  var free = (size) => ({ type: "free", size });
  var moov = (tracks, creationTime, fragmented = false) => box("moov", null, [
    mvhd(creationTime, tracks),
    ...tracks.map((x) => trak(x, creationTime)),
    fragmented ? mvex(tracks) : null
  ]);
  var mvhd = (creationTime, tracks) => {
    let duration = intoTimescale(Math.max(
      0,
      ...tracks.filter((x) => x.samples.length > 0).map((x) => {
        const lastSample = lastPresentedSample(x.samples);
        return lastSample.presentationTimestamp + lastSample.duration;
      })
    ), GLOBAL_TIMESCALE);
    let nextTrackId = Math.max(...tracks.map((x) => x.id)) + 1;
    let needsU64 = !isU32(creationTime) || !isU32(duration);
    let u32OrU64 = needsU64 ? u64 : u32;
    return fullBox("mvhd", +needsU64, 0, [
      u32OrU64(creationTime),
      // Creation time
      u32OrU64(creationTime),
      // Modification time
      u32(GLOBAL_TIMESCALE),
      // Timescale
      u32OrU64(duration),
      // Duration
      fixed_16_16(1),
      // Preferred rate
      fixed_8_8(1),
      // Preferred volume
      Array(10).fill(0),
      // Reserved
      matrixToBytes(IDENTITY_MATRIX),
      // Matrix
      Array(24).fill(0),
      // Pre-defined
      u32(nextTrackId)
      // Next track ID
    ]);
  };
  var trak = (track, creationTime) => box("trak", null, [
    tkhd(track, creationTime),
    mdia(track, creationTime)
  ]);
  var tkhd = (track, creationTime) => {
    let lastSample = lastPresentedSample(track.samples);
    let durationInGlobalTimescale = intoTimescale(
      lastSample ? lastSample.presentationTimestamp + lastSample.duration : 0,
      GLOBAL_TIMESCALE
    );
    let needsU64 = !isU32(creationTime) || !isU32(durationInGlobalTimescale);
    let u32OrU64 = needsU64 ? u64 : u32;
    let matrix;
    if (track.info.type === "video") {
      matrix = typeof track.info.rotation === "number" ? rotationMatrix(track.info.rotation) : track.info.rotation;
    } else {
      matrix = IDENTITY_MATRIX;
    }
    return fullBox("tkhd", +needsU64, 3, [
      u32OrU64(creationTime),
      // Creation time
      u32OrU64(creationTime),
      // Modification time
      u32(track.id),
      // Track ID
      u32(0),
      // Reserved
      u32OrU64(durationInGlobalTimescale),
      // Duration
      Array(8).fill(0),
      // Reserved
      u16(0),
      // Layer
      u16(0),
      // Alternate group
      fixed_8_8(track.info.type === "audio" ? 1 : 0),
      // Volume
      u16(0),
      // Reserved
      matrixToBytes(matrix),
      // Matrix
      fixed_16_16(track.info.type === "video" ? track.info.width : 0),
      // Track width
      fixed_16_16(track.info.type === "video" ? track.info.height : 0)
      // Track height
    ]);
  };
  var mdia = (track, creationTime) => box("mdia", null, [
    mdhd(track, creationTime),
    hdlr(track.info.type === "video" ? "vide" : "soun"),
    minf(track)
  ]);
  var mdhd = (track, creationTime) => {
    let lastSample = lastPresentedSample(track.samples);
    let localDuration = intoTimescale(
      lastSample ? lastSample.presentationTimestamp + lastSample.duration : 0,
      track.timescale
    );
    let needsU64 = !isU32(creationTime) || !isU32(localDuration);
    let u32OrU64 = needsU64 ? u64 : u32;
    return fullBox("mdhd", +needsU64, 0, [
      u32OrU64(creationTime),
      // Creation time
      u32OrU64(creationTime),
      // Modification time
      u32(track.timescale),
      // Timescale
      u32OrU64(localDuration),
      // Duration
      u16(21956),
      // Language ("und", undetermined)
      u16(0)
      // Quality
    ]);
  };
  var hdlr = (componentSubtype) => fullBox("hdlr", 0, 0, [
    ascii("mhlr"),
    // Component type
    ascii(componentSubtype),
    // Component subtype
    u32(0),
    // Component manufacturer
    u32(0),
    // Component flags
    u32(0),
    // Component flags mask
    ascii("mp4-muxer-hdlr", true)
    // Component name
  ]);
  var minf = (track) => box("minf", null, [
    track.info.type === "video" ? vmhd() : smhd(),
    dinf(),
    stbl(track)
  ]);
  var vmhd = () => fullBox("vmhd", 0, 1, [
    u16(0),
    // Graphics mode
    u16(0),
    // Opcolor R
    u16(0),
    // Opcolor G
    u16(0)
    // Opcolor B
  ]);
  var smhd = () => fullBox("smhd", 0, 0, [
    u16(0),
    // Balance
    u16(0)
    // Reserved
  ]);
  var dinf = () => box("dinf", null, [
    dref()
  ]);
  var dref = () => fullBox("dref", 0, 0, [
    u32(1)
    // Entry count
  ], [
    url()
  ]);
  var url = () => fullBox("url ", 0, 1);
  var stbl = (track) => {
    const needsCtts = track.compositionTimeOffsetTable.length > 1 || track.compositionTimeOffsetTable.some((x) => x.sampleCompositionTimeOffset !== 0);
    return box("stbl", null, [
      stsd(track),
      stts(track),
      stss(track),
      stsc(track),
      stsz(track),
      stco(track),
      needsCtts ? ctts(track) : null
    ]);
  };
  var stsd = (track) => fullBox("stsd", 0, 0, [
    u32(1)
    // Entry count
  ], [
    track.info.type === "video" ? videoSampleDescription(
      VIDEO_CODEC_TO_BOX_NAME[track.info.codec],
      track
    ) : soundSampleDescription(
      AUDIO_CODEC_TO_BOX_NAME[track.info.codec],
      track
    )
  ]);
  var videoSampleDescription = (compressionType, track) => box(compressionType, [
    Array(6).fill(0),
    // Reserved
    u16(1),
    // Data reference index
    u16(0),
    // Pre-defined
    u16(0),
    // Reserved
    Array(12).fill(0),
    // Pre-defined
    u16(track.info.width),
    // Width
    u16(track.info.height),
    // Height
    u32(4718592),
    // Horizontal resolution
    u32(4718592),
    // Vertical resolution
    u32(0),
    // Reserved
    u16(1),
    // Frame count
    Array(32).fill(0),
    // Compressor name
    u16(24),
    // Depth
    i16(65535)
    // Pre-defined
  ], [
    VIDEO_CODEC_TO_CONFIGURATION_BOX[track.info.codec](track),
    track.info.decoderConfig.colorSpace ? colr(track) : null
  ]);
  var COLOR_PRIMARIES_MAP = {
    "bt709": 1,
    // ITU-R BT.709
    "bt470bg": 5,
    // ITU-R BT.470BG
    "smpte170m": 6
    // ITU-R BT.601 525 - SMPTE 170M
  };
  var TRANSFER_CHARACTERISTICS_MAP = {
    "bt709": 1,
    // ITU-R BT.709
    "smpte170m": 6,
    // SMPTE 170M
    "iec61966-2-1": 13
    // IEC 61966-2-1
  };
  var MATRIX_COEFFICIENTS_MAP = {
    "rgb": 0,
    // Identity
    "bt709": 1,
    // ITU-R BT.709
    "bt470bg": 5,
    // ITU-R BT.470BG
    "smpte170m": 6
    // SMPTE 170M
  };
  var colr = (track) => box("colr", [
    ascii("nclx"),
    // Colour type
    u16(COLOR_PRIMARIES_MAP[track.info.decoderConfig.colorSpace.primaries]),
    // Colour primaries
    u16(TRANSFER_CHARACTERISTICS_MAP[track.info.decoderConfig.colorSpace.transfer]),
    // Transfer characteristics
    u16(MATRIX_COEFFICIENTS_MAP[track.info.decoderConfig.colorSpace.matrix]),
    // Matrix coefficients
    u8((track.info.decoderConfig.colorSpace.fullRange ? 1 : 0) << 7)
    // Full range flag
  ]);
  var avcC = (track) => track.info.decoderConfig && box("avcC", [
    // For AVC, description is an AVCDecoderConfigurationRecord, so nothing else to do here
    ...new Uint8Array(track.info.decoderConfig.description)
  ]);
  var hvcC = (track) => track.info.decoderConfig && box("hvcC", [
    // For HEVC, description is a HEVCDecoderConfigurationRecord, so nothing else to do here
    ...new Uint8Array(track.info.decoderConfig.description)
  ]);
  var vpcC = (track) => {
    if (!track.info.decoderConfig) {
      return null;
    }
    let decoderConfig = track.info.decoderConfig;
    if (!decoderConfig.colorSpace) {
      throw new Error(`'colorSpace' is required in the decoder config for VP9.`);
    }
    let parts = decoderConfig.codec.split(".");
    let profile = Number(parts[1]);
    let level = Number(parts[2]);
    let bitDepth = Number(parts[3]);
    let chromaSubsampling = 0;
    let thirdByte = (bitDepth << 4) + (chromaSubsampling << 1) + Number(decoderConfig.colorSpace.fullRange);
    let colourPrimaries = 2;
    let transferCharacteristics = 2;
    let matrixCoefficients = 2;
    return fullBox("vpcC", 1, 0, [
      u8(profile),
      // Profile
      u8(level),
      // Level
      u8(thirdByte),
      // Bit depth, chroma subsampling, full range
      u8(colourPrimaries),
      // Colour primaries
      u8(transferCharacteristics),
      // Transfer characteristics
      u8(matrixCoefficients),
      // Matrix coefficients
      u16(0)
      // Codec initialization data size
    ]);
  };
  var av1C = () => {
    let marker = 1;
    let version = 1;
    let firstByte = (marker << 7) + version;
    return box("av1C", [
      firstByte,
      0,
      0,
      0
    ]);
  };
  var soundSampleDescription = (compressionType, track) => box(compressionType, [
    Array(6).fill(0),
    // Reserved
    u16(1),
    // Data reference index
    u16(0),
    // Version
    u16(0),
    // Revision level
    u32(0),
    // Vendor
    u16(track.info.numberOfChannels),
    // Number of channels
    u16(16),
    // Sample size (bits)
    u16(0),
    // Compression ID
    u16(0),
    // Packet size
    fixed_16_16(track.info.sampleRate)
    // Sample rate
  ], [
    AUDIO_CODEC_TO_CONFIGURATION_BOX[track.info.codec](track)
  ]);
  var esds = (track) => {
    let description = new Uint8Array(track.info.decoderConfig.description);
    return fullBox("esds", 0, 0, [
      // https://stackoverflow.com/a/54803118
      u32(58753152),
      // TAG(3) = Object Descriptor ([2])
      u8(32 + description.byteLength),
      // length of this OD (which includes the next 2 tags)
      u16(1),
      // ES_ID = 1
      u8(0),
      // flags etc = 0
      u32(75530368),
      // TAG(4) = ES Descriptor ([2]) embedded in above OD
      u8(18 + description.byteLength),
      // length of this ESD
      u8(64),
      // MPEG-4 Audio
      u8(21),
      // stream type(6bits)=5 audio, flags(2bits)=1
      u24(0),
      // 24bit buffer size
      u32(130071),
      // max bitrate
      u32(130071),
      // avg bitrate
      u32(92307584),
      // TAG(5) = ASC ([2],[3]) embedded in above OD
      u8(description.byteLength),
      // length
      ...description,
      u32(109084800),
      // TAG(6)
      u8(1),
      // length
      u8(2)
      // data
    ]);
  };
  var dOps = (track) => {
    let preskip = 3840;
    let gain = 0;
    const description = track.info.decoderConfig?.description;
    if (description) {
      if (description.byteLength < 18) {
        throw new TypeError("Invalid decoder description provided for Opus; must be at least 18 bytes long.");
      }
      const view2 = ArrayBuffer.isView(description) ? new DataView(description.buffer, description.byteOffset, description.byteLength) : new DataView(description);
      preskip = view2.getUint16(10, true);
      gain = view2.getInt16(14, true);
    }
    return box("dOps", [
      u8(0),
      // Version
      u8(track.info.numberOfChannels),
      // OutputChannelCount
      u16(preskip),
      u32(track.info.sampleRate),
      // InputSampleRate
      fixed_8_8(gain),
      // OutputGain
      u8(0)
      // ChannelMappingFamily
    ]);
  };
  var stts = (track) => {
    return fullBox("stts", 0, 0, [
      u32(track.timeToSampleTable.length),
      // Number of entries
      track.timeToSampleTable.map((x) => [
        // Time-to-sample table
        u32(x.sampleCount),
        // Sample count
        u32(x.sampleDelta)
        // Sample duration
      ])
    ]);
  };
  var stss = (track) => {
    if (track.samples.every((x) => x.type === "key"))
      return null;
    let keySamples = [...track.samples.entries()].filter(([, sample]) => sample.type === "key");
    return fullBox("stss", 0, 0, [
      u32(keySamples.length),
      // Number of entries
      keySamples.map(([index]) => u32(index + 1))
      // Sync sample table
    ]);
  };
  var stsc = (track) => {
    return fullBox("stsc", 0, 0, [
      u32(track.compactlyCodedChunkTable.length),
      // Number of entries
      track.compactlyCodedChunkTable.map((x) => [
        // Sample-to-chunk table
        u32(x.firstChunk),
        // First chunk
        u32(x.samplesPerChunk),
        // Samples per chunk
        u32(1)
        // Sample description index
      ])
    ]);
  };
  var stsz = (track) => fullBox("stsz", 0, 0, [
    u32(0),
    // Sample size (0 means non-constant size)
    u32(track.samples.length),
    // Number of entries
    track.samples.map((x) => u32(x.size))
    // Sample size table
  ]);
  var stco = (track) => {
    if (track.finalizedChunks.length > 0 && last(track.finalizedChunks).offset >= 2 ** 32) {
      return fullBox("co64", 0, 0, [
        u32(track.finalizedChunks.length),
        // Number of entries
        track.finalizedChunks.map((x) => u64(x.offset))
        // Chunk offset table
      ]);
    }
    return fullBox("stco", 0, 0, [
      u32(track.finalizedChunks.length),
      // Number of entries
      track.finalizedChunks.map((x) => u32(x.offset))
      // Chunk offset table
    ]);
  };
  var ctts = (track) => {
    return fullBox("ctts", 0, 0, [
      u32(track.compositionTimeOffsetTable.length),
      // Number of entries
      track.compositionTimeOffsetTable.map((x) => [
        // Time-to-sample table
        u32(x.sampleCount),
        // Sample count
        u32(x.sampleCompositionTimeOffset)
        // Sample offset
      ])
    ]);
  };
  var mvex = (tracks) => {
    return box("mvex", null, tracks.map(trex));
  };
  var trex = (track) => {
    return fullBox("trex", 0, 0, [
      u32(track.id),
      // Track ID
      u32(1),
      // Default sample description index
      u32(0),
      // Default sample duration
      u32(0),
      // Default sample size
      u32(0)
      // Default sample flags
    ]);
  };
  var moof = (sequenceNumber, tracks) => {
    return box("moof", null, [
      mfhd(sequenceNumber),
      ...tracks.map(traf)
    ]);
  };
  var mfhd = (sequenceNumber) => {
    return fullBox("mfhd", 0, 0, [
      u32(sequenceNumber)
      // Sequence number
    ]);
  };
  var fragmentSampleFlags = (sample) => {
    let byte1 = 0;
    let byte2 = 0;
    let byte3 = 0;
    let byte4 = 0;
    let sampleIsDifferenceSample = sample.type === "delta";
    byte2 |= +sampleIsDifferenceSample;
    if (sampleIsDifferenceSample) {
      byte1 |= 1;
    } else {
      byte1 |= 2;
    }
    return byte1 << 24 | byte2 << 16 | byte3 << 8 | byte4;
  };
  var traf = (track) => {
    return box("traf", null, [
      tfhd(track),
      tfdt(track),
      trun(track)
    ]);
  };
  var tfhd = (track) => {
    let tfFlags = 0;
    tfFlags |= 8;
    tfFlags |= 16;
    tfFlags |= 32;
    tfFlags |= 131072;
    let referenceSample = track.currentChunk.samples[1] ?? track.currentChunk.samples[0];
    let referenceSampleInfo = {
      duration: referenceSample.timescaleUnitsToNextSample,
      size: referenceSample.size,
      flags: fragmentSampleFlags(referenceSample)
    };
    return fullBox("tfhd", 0, tfFlags, [
      u32(track.id),
      // Track ID
      u32(referenceSampleInfo.duration),
      // Default sample duration
      u32(referenceSampleInfo.size),
      // Default sample size
      u32(referenceSampleInfo.flags)
      // Default sample flags
    ]);
  };
  var tfdt = (track) => {
    return fullBox("tfdt", 1, 0, [
      u64(intoTimescale(track.currentChunk.startTimestamp, track.timescale))
      // Base Media Decode Time
    ]);
  };
  var trun = (track) => {
    let allSampleDurations = track.currentChunk.samples.map((x) => x.timescaleUnitsToNextSample);
    let allSampleSizes = track.currentChunk.samples.map((x) => x.size);
    let allSampleFlags = track.currentChunk.samples.map(fragmentSampleFlags);
    let allSampleCompositionTimeOffsets = track.currentChunk.samples.map((x) => intoTimescale(x.presentationTimestamp - x.decodeTimestamp, track.timescale));
    let uniqueSampleDurations = new Set(allSampleDurations);
    let uniqueSampleSizes = new Set(allSampleSizes);
    let uniqueSampleFlags = new Set(allSampleFlags);
    let uniqueSampleCompositionTimeOffsets = new Set(allSampleCompositionTimeOffsets);
    let firstSampleFlagsPresent = uniqueSampleFlags.size === 2 && allSampleFlags[0] !== allSampleFlags[1];
    let sampleDurationPresent = uniqueSampleDurations.size > 1;
    let sampleSizePresent = uniqueSampleSizes.size > 1;
    let sampleFlagsPresent = !firstSampleFlagsPresent && uniqueSampleFlags.size > 1;
    let sampleCompositionTimeOffsetsPresent = uniqueSampleCompositionTimeOffsets.size > 1 || [...uniqueSampleCompositionTimeOffsets].some((x) => x !== 0);
    let flags = 0;
    flags |= 1;
    flags |= 4 * +firstSampleFlagsPresent;
    flags |= 256 * +sampleDurationPresent;
    flags |= 512 * +sampleSizePresent;
    flags |= 1024 * +sampleFlagsPresent;
    flags |= 2048 * +sampleCompositionTimeOffsetsPresent;
    return fullBox("trun", 1, flags, [
      u32(track.currentChunk.samples.length),
      // Sample count
      u32(track.currentChunk.offset - track.currentChunk.moofOffset || 0),
      // Data offset
      firstSampleFlagsPresent ? u32(allSampleFlags[0]) : [],
      track.currentChunk.samples.map((_, i) => [
        sampleDurationPresent ? u32(allSampleDurations[i]) : [],
        // Sample duration
        sampleSizePresent ? u32(allSampleSizes[i]) : [],
        // Sample size
        sampleFlagsPresent ? u32(allSampleFlags[i]) : [],
        // Sample flags
        // Sample composition time offsets
        sampleCompositionTimeOffsetsPresent ? i32(allSampleCompositionTimeOffsets[i]) : []
      ])
    ]);
  };
  var mfra = (tracks) => {
    return box("mfra", null, [
      ...tracks.map(tfra),
      mfro()
    ]);
  };
  var tfra = (track, trackIndex) => {
    let version = 1;
    return fullBox("tfra", version, 0, [
      u32(track.id),
      // Track ID
      u32(63),
      // This specifies that traf number, trun number and sample number are 32-bit ints
      u32(track.finalizedChunks.length),
      // Number of entries
      track.finalizedChunks.map((chunk) => [
        u64(intoTimescale(chunk.startTimestamp, track.timescale)),
        // Time
        u64(chunk.moofOffset),
        // moof offset
        u32(trackIndex + 1),
        // traf number
        u32(1),
        // trun number
        u32(1)
        // Sample number
      ])
    ]);
  };
  var mfro = () => {
    return fullBox("mfro", 0, 0, [
      // This value needs to be overwritten manually from the outside, where the actual size of the enclosing mfra box
      // is known
      u32(0)
      // Size
    ]);
  };
  var VIDEO_CODEC_TO_BOX_NAME = {
    "avc": "avc1",
    "hevc": "hvc1",
    "vp9": "vp09",
    "av1": "av01"
  };
  var VIDEO_CODEC_TO_CONFIGURATION_BOX = {
    "avc": avcC,
    "hevc": hvcC,
    "vp9": vpcC,
    "av1": av1C
  };
  var AUDIO_CODEC_TO_BOX_NAME = {
    "aac": "mp4a",
    "opus": "Opus"
  };
  var AUDIO_CODEC_TO_CONFIGURATION_BOX = {
    "aac": esds,
    "opus": dOps
  };

  // src/target.ts
  var isTarget = Symbol("isTarget");
  var Target = class {
  };
  isTarget;
  var ArrayBufferTarget = class extends Target {
    constructor() {
      super(...arguments);
      this.buffer = null;
    }
  };
  var StreamTarget = class extends Target {
    constructor(options) {
      super();
      this.options = options;
      if (typeof options !== "object") {
        throw new TypeError("StreamTarget requires an options object to be passed to its constructor.");
      }
      if (options.onData) {
        if (typeof options.onData !== "function") {
          throw new TypeError("options.onData, when provided, must be a function.");
        }
        if (options.onData.length < 2) {
          throw new TypeError(
            "options.onData, when provided, must be a function that takes in at least two arguments (data and position). Ignoring the position argument, which specifies the byte offset at which the data is to be written, can lead to broken outputs."
          );
        }
      }
      if (options.chunked !== void 0 && typeof options.chunked !== "boolean") {
        throw new TypeError("options.chunked, when provided, must be a boolean.");
      }
      if (options.chunkSize !== void 0 && (!Number.isInteger(options.chunkSize) || options.chunkSize < 1024)) {
        throw new TypeError("options.chunkSize, when provided, must be an integer and not smaller than 1024.");
      }
    }
  };
  var FileSystemWritableFileStreamTarget = class extends Target {
    constructor(stream, options) {
      super();
      this.stream = stream;
      this.options = options;
      if (!(stream instanceof FileSystemWritableFileStream)) {
        throw new TypeError("FileSystemWritableFileStreamTarget requires a FileSystemWritableFileStream instance.");
      }
      if (options !== void 0 && typeof options !== "object") {
        throw new TypeError("FileSystemWritableFileStreamTarget's options, when provided, must be an object.");
      }
      if (options) {
        if (options.chunkSize !== void 0 && (!Number.isInteger(options.chunkSize) || options.chunkSize <= 0)) {
          throw new TypeError("options.chunkSize, when provided, must be a positive integer");
        }
      }
    }
  };

  // src/writer.ts
  var _helper, _helperView;
  var Writer = class {
    constructor() {
      this.pos = 0;
      __privateAdd(this, _helper, new Uint8Array(8));
      __privateAdd(this, _helperView, new DataView(__privateGet(this, _helper).buffer));
      /**
       * Stores the position from the start of the file to where boxes elements have been written. This is used to
       * rewrite/edit elements that were already added before, and to measure sizes of things.
       */
      this.offsets = /* @__PURE__ */ new WeakMap();
    }
    /** Sets the current position for future writes to a new one. */
    seek(newPos) {
      this.pos = newPos;
    }
    writeU32(value) {
      __privateGet(this, _helperView).setUint32(0, value, false);
      this.write(__privateGet(this, _helper).subarray(0, 4));
    }
    writeU64(value) {
      __privateGet(this, _helperView).setUint32(0, Math.floor(value / 2 ** 32), false);
      __privateGet(this, _helperView).setUint32(4, value, false);
      this.write(__privateGet(this, _helper).subarray(0, 8));
    }
    writeAscii(text) {
      for (let i = 0; i < text.length; i++) {
        __privateGet(this, _helperView).setUint8(i % 8, text.charCodeAt(i));
        if (i % 8 === 7)
          this.write(__privateGet(this, _helper));
      }
      if (text.length % 8 !== 0) {
        this.write(__privateGet(this, _helper).subarray(0, text.length % 8));
      }
    }
    writeBox(box2) {
      this.offsets.set(box2, this.pos);
      if (box2.contents && !box2.children) {
        this.writeBoxHeader(box2, box2.size ?? box2.contents.byteLength + 8);
        this.write(box2.contents);
      } else {
        let startPos = this.pos;
        this.writeBoxHeader(box2, 0);
        if (box2.contents)
          this.write(box2.contents);
        if (box2.children) {
          for (let child of box2.children)
            if (child)
              this.writeBox(child);
        }
        let endPos = this.pos;
        let size = box2.size ?? endPos - startPos;
        this.seek(startPos);
        this.writeBoxHeader(box2, size);
        this.seek(endPos);
      }
    }
    writeBoxHeader(box2, size) {
      this.writeU32(box2.largeSize ? 1 : size);
      this.writeAscii(box2.type);
      if (box2.largeSize)
        this.writeU64(size);
    }
    measureBoxHeader(box2) {
      return 8 + (box2.largeSize ? 8 : 0);
    }
    patchBox(box2) {
      let endPos = this.pos;
      this.seek(this.offsets.get(box2));
      this.writeBox(box2);
      this.seek(endPos);
    }
    measureBox(box2) {
      if (box2.contents && !box2.children) {
        let headerSize = this.measureBoxHeader(box2);
        return headerSize + box2.contents.byteLength;
      } else {
        let result = this.measureBoxHeader(box2);
        if (box2.contents)
          result += box2.contents.byteLength;
        if (box2.children) {
          for (let child of box2.children)
            if (child)
              result += this.measureBox(child);
        }
        return result;
      }
    }
  };
  _helper = new WeakMap();
  _helperView = new WeakMap();
  var _target, _buffer, _bytes, _maxPos, _ensureSize, ensureSize_fn;
  var ArrayBufferTargetWriter = class extends Writer {
    constructor(target) {
      super();
      __privateAdd(this, _ensureSize);
      __privateAdd(this, _target, void 0);
      __privateAdd(this, _buffer, new ArrayBuffer(2 ** 16));
      __privateAdd(this, _bytes, new Uint8Array(__privateGet(this, _buffer)));
      __privateAdd(this, _maxPos, 0);
      __privateSet(this, _target, target);
    }
    write(data) {
      __privateMethod(this, _ensureSize, ensureSize_fn).call(this, this.pos + data.byteLength);
      __privateGet(this, _bytes).set(data, this.pos);
      this.pos += data.byteLength;
      __privateSet(this, _maxPos, Math.max(__privateGet(this, _maxPos), this.pos));
    }
    finalize() {
      __privateMethod(this, _ensureSize, ensureSize_fn).call(this, this.pos);
      __privateGet(this, _target).buffer = __privateGet(this, _buffer).slice(0, Math.max(__privateGet(this, _maxPos), this.pos));
    }
  };
  _target = new WeakMap();
  _buffer = new WeakMap();
  _bytes = new WeakMap();
  _maxPos = new WeakMap();
  _ensureSize = new WeakSet();
  ensureSize_fn = function(size) {
    let newLength = __privateGet(this, _buffer).byteLength;
    while (newLength < size)
      newLength *= 2;
    if (newLength === __privateGet(this, _buffer).byteLength)
      return;
    let newBuffer = new ArrayBuffer(newLength);
    let newBytes = new Uint8Array(newBuffer);
    newBytes.set(__privateGet(this, _bytes), 0);
    __privateSet(this, _buffer, newBuffer);
    __privateSet(this, _bytes, newBytes);
  };
  var DEFAULT_CHUNK_SIZE = 2 ** 24;
  var MAX_CHUNKS_AT_ONCE = 2;
  var _target2, _sections, _chunked, _chunkSize, _chunks, _writeDataIntoChunks, writeDataIntoChunks_fn, _insertSectionIntoChunk, insertSectionIntoChunk_fn, _createChunk, createChunk_fn, _flushChunks, flushChunks_fn;
  var StreamTargetWriter = class extends Writer {
    constructor(target) {
      super();
      __privateAdd(this, _writeDataIntoChunks);
      __privateAdd(this, _insertSectionIntoChunk);
      __privateAdd(this, _createChunk);
      __privateAdd(this, _flushChunks);
      __privateAdd(this, _target2, void 0);
      __privateAdd(this, _sections, []);
      __privateAdd(this, _chunked, void 0);
      __privateAdd(this, _chunkSize, void 0);
      /**
       * The data is divided up into fixed-size chunks, whose contents are first filled in RAM and then flushed out.
       * A chunk is flushed if all of its contents have been written.
       */
      __privateAdd(this, _chunks, []);
      __privateSet(this, _target2, target);
      __privateSet(this, _chunked, target.options?.chunked ?? false);
      __privateSet(this, _chunkSize, target.options?.chunkSize ?? DEFAULT_CHUNK_SIZE);
    }
    write(data) {
      __privateGet(this, _sections).push({
        data: data.slice(),
        start: this.pos
      });
      this.pos += data.byteLength;
    }
    flush() {
      if (__privateGet(this, _sections).length === 0)
        return;
      let chunks = [];
      let sorted = [...__privateGet(this, _sections)].sort((a, b) => a.start - b.start);
      chunks.push({
        start: sorted[0].start,
        size: sorted[0].data.byteLength
      });
      for (let i = 1; i < sorted.length; i++) {
        let lastChunk = chunks[chunks.length - 1];
        let section = sorted[i];
        if (section.start <= lastChunk.start + lastChunk.size) {
          lastChunk.size = Math.max(lastChunk.size, section.start + section.data.byteLength - lastChunk.start);
        } else {
          chunks.push({
            start: section.start,
            size: section.data.byteLength
          });
        }
      }
      for (let chunk of chunks) {
        chunk.data = new Uint8Array(chunk.size);
        for (let section of __privateGet(this, _sections)) {
          if (chunk.start <= section.start && section.start < chunk.start + chunk.size) {
            chunk.data.set(section.data, section.start - chunk.start);
          }
        }
        if (__privateGet(this, _chunked)) {
          __privateMethod(this, _writeDataIntoChunks, writeDataIntoChunks_fn).call(this, chunk.data, chunk.start);
          __privateMethod(this, _flushChunks, flushChunks_fn).call(this);
        } else {
          __privateGet(this, _target2).options.onData?.(chunk.data, chunk.start);
        }
      }
      __privateGet(this, _sections).length = 0;
    }
    finalize() {
      if (__privateGet(this, _chunked)) {
        __privateMethod(this, _flushChunks, flushChunks_fn).call(this, true);
      }
    }
  };
  _target2 = new WeakMap();
  _sections = new WeakMap();
  _chunked = new WeakMap();
  _chunkSize = new WeakMap();
  _chunks = new WeakMap();
  _writeDataIntoChunks = new WeakSet();
  writeDataIntoChunks_fn = function(data, position) {
    let chunkIndex = __privateGet(this, _chunks).findIndex((x) => x.start <= position && position < x.start + __privateGet(this, _chunkSize));
    if (chunkIndex === -1)
      chunkIndex = __privateMethod(this, _createChunk, createChunk_fn).call(this, position);
    let chunk = __privateGet(this, _chunks)[chunkIndex];
    let relativePosition = position - chunk.start;
    let toWrite = data.subarray(0, Math.min(__privateGet(this, _chunkSize) - relativePosition, data.byteLength));
    chunk.data.set(toWrite, relativePosition);
    let section = {
      start: relativePosition,
      end: relativePosition + toWrite.byteLength
    };
    __privateMethod(this, _insertSectionIntoChunk, insertSectionIntoChunk_fn).call(this, chunk, section);
    if (chunk.written[0].start === 0 && chunk.written[0].end === __privateGet(this, _chunkSize)) {
      chunk.shouldFlush = true;
    }
    if (__privateGet(this, _chunks).length > MAX_CHUNKS_AT_ONCE) {
      for (let i = 0; i < __privateGet(this, _chunks).length - 1; i++) {
        __privateGet(this, _chunks)[i].shouldFlush = true;
      }
      __privateMethod(this, _flushChunks, flushChunks_fn).call(this);
    }
    if (toWrite.byteLength < data.byteLength) {
      __privateMethod(this, _writeDataIntoChunks, writeDataIntoChunks_fn).call(this, data.subarray(toWrite.byteLength), position + toWrite.byteLength);
    }
  };
  _insertSectionIntoChunk = new WeakSet();
  insertSectionIntoChunk_fn = function(chunk, section) {
    let low = 0;
    let high = chunk.written.length - 1;
    let index = -1;
    while (low <= high) {
      let mid = Math.floor(low + (high - low + 1) / 2);
      if (chunk.written[mid].start <= section.start) {
        low = mid + 1;
        index = mid;
      } else {
        high = mid - 1;
      }
    }
    chunk.written.splice(index + 1, 0, section);
    if (index === -1 || chunk.written[index].end < section.start)
      index++;
    while (index < chunk.written.length - 1 && chunk.written[index].end >= chunk.written[index + 1].start) {
      chunk.written[index].end = Math.max(chunk.written[index].end, chunk.written[index + 1].end);
      chunk.written.splice(index + 1, 1);
    }
  };
  _createChunk = new WeakSet();
  createChunk_fn = function(includesPosition) {
    let start = Math.floor(includesPosition / __privateGet(this, _chunkSize)) * __privateGet(this, _chunkSize);
    let chunk = {
      start,
      data: new Uint8Array(__privateGet(this, _chunkSize)),
      written: [],
      shouldFlush: false
    };
    __privateGet(this, _chunks).push(chunk);
    __privateGet(this, _chunks).sort((a, b) => a.start - b.start);
    return __privateGet(this, _chunks).indexOf(chunk);
  };
  _flushChunks = new WeakSet();
  flushChunks_fn = function(force = false) {
    for (let i = 0; i < __privateGet(this, _chunks).length; i++) {
      let chunk = __privateGet(this, _chunks)[i];
      if (!chunk.shouldFlush && !force)
        continue;
      for (let section of chunk.written) {
        __privateGet(this, _target2).options.onData?.(
          chunk.data.subarray(section.start, section.end),
          chunk.start + section.start
        );
      }
      __privateGet(this, _chunks).splice(i--, 1);
    }
  };
  var FileSystemWritableFileStreamTargetWriter = class extends StreamTargetWriter {
    constructor(target) {
      super(new StreamTarget({
        onData: (data, position) => target.stream.write({
          type: "write",
          data,
          position
        }),
        chunked: true,
        chunkSize: target.options?.chunkSize
      }));
    }
  };

  // src/muxer.ts
  var GLOBAL_TIMESCALE = 1e3;
  var SUPPORTED_VIDEO_CODECS = ["avc", "hevc", "vp9", "av1"];
  var SUPPORTED_AUDIO_CODECS = ["aac", "opus"];
  var TIMESTAMP_OFFSET = 2082844800;
  var FIRST_TIMESTAMP_BEHAVIORS = ["strict", "offset", "cross-track-offset"];
  var _options, _writer, _ftypSize, _mdat, _videoTrack, _audioTrack, _creationTime, _finalizedChunks, _nextFragmentNumber, _videoSampleQueue, _audioSampleQueue, _finalized, _validateOptions, validateOptions_fn, _writeHeader, writeHeader_fn, _computeMoovSizeUpperBound, computeMoovSizeUpperBound_fn, _prepareTracks, prepareTracks_fn, _generateMpeg4AudioSpecificConfig, generateMpeg4AudioSpecificConfig_fn, _createSampleForTrack, createSampleForTrack_fn, _addSampleToTrack, addSampleToTrack_fn, _validateTimestamp, validateTimestamp_fn, _finalizeCurrentChunk, finalizeCurrentChunk_fn, _finalizeFragment, finalizeFragment_fn, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn, _ensureNotFinalized, ensureNotFinalized_fn;
  var Muxer = class {
    constructor(options) {
      __privateAdd(this, _validateOptions);
      __privateAdd(this, _writeHeader);
      __privateAdd(this, _computeMoovSizeUpperBound);
      __privateAdd(this, _prepareTracks);
      // https://wiki.multimedia.cx/index.php/MPEG-4_Audio
      __privateAdd(this, _generateMpeg4AudioSpecificConfig);
      __privateAdd(this, _createSampleForTrack);
      __privateAdd(this, _addSampleToTrack);
      __privateAdd(this, _validateTimestamp);
      __privateAdd(this, _finalizeCurrentChunk);
      __privateAdd(this, _finalizeFragment);
      __privateAdd(this, _maybeFlushStreamingTargetWriter);
      __privateAdd(this, _ensureNotFinalized);
      __privateAdd(this, _options, void 0);
      __privateAdd(this, _writer, void 0);
      __privateAdd(this, _ftypSize, void 0);
      __privateAdd(this, _mdat, void 0);
      __privateAdd(this, _videoTrack, null);
      __privateAdd(this, _audioTrack, null);
      __privateAdd(this, _creationTime, Math.floor(Date.now() / 1e3) + TIMESTAMP_OFFSET);
      __privateAdd(this, _finalizedChunks, []);
      // Fields for fragmented MP4:
      __privateAdd(this, _nextFragmentNumber, 1);
      __privateAdd(this, _videoSampleQueue, []);
      __privateAdd(this, _audioSampleQueue, []);
      __privateAdd(this, _finalized, false);
      __privateMethod(this, _validateOptions, validateOptions_fn).call(this, options);
      options.video = deepClone(options.video);
      options.audio = deepClone(options.audio);
      options.fastStart = deepClone(options.fastStart);
      this.target = options.target;
      __privateSet(this, _options, {
        firstTimestampBehavior: "strict",
        ...options
      });
      if (options.target instanceof ArrayBufferTarget) {
        __privateSet(this, _writer, new ArrayBufferTargetWriter(options.target));
      } else if (options.target instanceof StreamTarget) {
        __privateSet(this, _writer, new StreamTargetWriter(options.target));
      } else if (options.target instanceof FileSystemWritableFileStreamTarget) {
        __privateSet(this, _writer, new FileSystemWritableFileStreamTargetWriter(options.target));
      } else {
        throw new Error(`Invalid target: ${options.target}`);
      }
      __privateMethod(this, _prepareTracks, prepareTracks_fn).call(this);
      __privateMethod(this, _writeHeader, writeHeader_fn).call(this);
    }
    addVideoChunk(sample, meta, timestamp, compositionTimeOffset) {
      if (!(sample instanceof EncodedVideoChunk)) {
        throw new TypeError("addVideoChunk's first argument (sample) must be of type EncodedVideoChunk.");
      }
      if (meta && typeof meta !== "object") {
        throw new TypeError("addVideoChunk's second argument (meta), when provided, must be an object.");
      }
      if (timestamp !== void 0 && (!Number.isFinite(timestamp) || timestamp < 0)) {
        throw new TypeError(
          "addVideoChunk's third argument (timestamp), when provided, must be a non-negative real number."
        );
      }
      if (compositionTimeOffset !== void 0 && !Number.isFinite(compositionTimeOffset)) {
        throw new TypeError(
          "addVideoChunk's fourth argument (compositionTimeOffset), when provided, must be a real number."
        );
      }
      let data = new Uint8Array(sample.byteLength);
      sample.copyTo(data);
      this.addVideoChunkRaw(
        data,
        sample.type,
        timestamp ?? sample.timestamp,
        sample.duration,
        meta,
        compositionTimeOffset
      );
    }
    addVideoChunkRaw(data, type, timestamp, duration, meta, compositionTimeOffset) {
      if (!(data instanceof Uint8Array)) {
        throw new TypeError("addVideoChunkRaw's first argument (data) must be an instance of Uint8Array.");
      }
      if (type !== "key" && type !== "delta") {
        throw new TypeError("addVideoChunkRaw's second argument (type) must be either 'key' or 'delta'.");
      }
      if (!Number.isFinite(timestamp) || timestamp < 0) {
        throw new TypeError("addVideoChunkRaw's third argument (timestamp) must be a non-negative real number.");
      }
      if (!Number.isFinite(duration) || duration < 0) {
        throw new TypeError("addVideoChunkRaw's fourth argument (duration) must be a non-negative real number.");
      }
      if (meta && typeof meta !== "object") {
        throw new TypeError("addVideoChunkRaw's fifth argument (meta), when provided, must be an object.");
      }
      if (compositionTimeOffset !== void 0 && !Number.isFinite(compositionTimeOffset)) {
        throw new TypeError(
          "addVideoChunkRaw's sixth argument (compositionTimeOffset), when provided, must be a real number."
        );
      }
      __privateMethod(this, _ensureNotFinalized, ensureNotFinalized_fn).call(this);
      if (!__privateGet(this, _options).video)
        throw new Error("No video track declared.");
      if (typeof __privateGet(this, _options).fastStart === "object" && __privateGet(this, _videoTrack).samples.length === __privateGet(this, _options).fastStart.expectedVideoChunks) {
        throw new Error(`Cannot add more video chunks than specified in 'fastStart' (${__privateGet(this, _options).fastStart.expectedVideoChunks}).`);
      }
      let videoSample = __privateMethod(this, _createSampleForTrack, createSampleForTrack_fn).call(this, __privateGet(this, _videoTrack), data, type, timestamp, duration, meta, compositionTimeOffset);
      if (__privateGet(this, _options).fastStart === "fragmented" && __privateGet(this, _audioTrack)) {
        while (__privateGet(this, _audioSampleQueue).length > 0 && __privateGet(this, _audioSampleQueue)[0].decodeTimestamp <= videoSample.decodeTimestamp) {
          let audioSample = __privateGet(this, _audioSampleQueue).shift();
          __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _audioTrack), audioSample);
        }
        if (videoSample.decodeTimestamp <= __privateGet(this, _audioTrack).lastDecodeTimestamp) {
          __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _videoTrack), videoSample);
        } else {
          __privateGet(this, _videoSampleQueue).push(videoSample);
        }
      } else {
        __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _videoTrack), videoSample);
      }
    }
    addAudioChunk(sample, meta, timestamp) {
      if (!(sample instanceof EncodedAudioChunk)) {
        throw new TypeError("addAudioChunk's first argument (sample) must be of type EncodedAudioChunk.");
      }
      if (meta && typeof meta !== "object") {
        throw new TypeError("addAudioChunk's second argument (meta), when provided, must be an object.");
      }
      if (timestamp !== void 0 && (!Number.isFinite(timestamp) || timestamp < 0)) {
        throw new TypeError(
          "addAudioChunk's third argument (timestamp), when provided, must be a non-negative real number."
        );
      }
      let data = new Uint8Array(sample.byteLength);
      sample.copyTo(data);
      this.addAudioChunkRaw(data, sample.type, timestamp ?? sample.timestamp, sample.duration, meta);
    }
    addAudioChunkRaw(data, type, timestamp, duration, meta) {
      if (!(data instanceof Uint8Array)) {
        throw new TypeError("addAudioChunkRaw's first argument (data) must be an instance of Uint8Array.");
      }
      if (type !== "key" && type !== "delta") {
        throw new TypeError("addAudioChunkRaw's second argument (type) must be either 'key' or 'delta'.");
      }
      if (!Number.isFinite(timestamp) || timestamp < 0) {
        throw new TypeError("addAudioChunkRaw's third argument (timestamp) must be a non-negative real number.");
      }
      if (!Number.isFinite(duration) || duration < 0) {
        throw new TypeError("addAudioChunkRaw's fourth argument (duration) must be a non-negative real number.");
      }
      if (meta && typeof meta !== "object") {
        throw new TypeError("addAudioChunkRaw's fifth argument (meta), when provided, must be an object.");
      }
      __privateMethod(this, _ensureNotFinalized, ensureNotFinalized_fn).call(this);
      if (!__privateGet(this, _options).audio)
        throw new Error("No audio track declared.");
      if (typeof __privateGet(this, _options).fastStart === "object" && __privateGet(this, _audioTrack).samples.length === __privateGet(this, _options).fastStart.expectedAudioChunks) {
        throw new Error(`Cannot add more audio chunks than specified in 'fastStart' (${__privateGet(this, _options).fastStart.expectedAudioChunks}).`);
      }
      let audioSample = __privateMethod(this, _createSampleForTrack, createSampleForTrack_fn).call(this, __privateGet(this, _audioTrack), data, type, timestamp, duration, meta);
      if (__privateGet(this, _options).fastStart === "fragmented" && __privateGet(this, _videoTrack)) {
        while (__privateGet(this, _videoSampleQueue).length > 0 && __privateGet(this, _videoSampleQueue)[0].decodeTimestamp <= audioSample.decodeTimestamp) {
          let videoSample = __privateGet(this, _videoSampleQueue).shift();
          __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _videoTrack), videoSample);
        }
        if (audioSample.decodeTimestamp <= __privateGet(this, _videoTrack).lastDecodeTimestamp) {
          __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _audioTrack), audioSample);
        } else {
          __privateGet(this, _audioSampleQueue).push(audioSample);
        }
      } else {
        __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _audioTrack), audioSample);
      }
    }
    /** Finalizes the file, making it ready for use. Must be called after all video and audio chunks have been added. */
    finalize() {
      if (__privateGet(this, _finalized)) {
        throw new Error("Cannot finalize a muxer more than once.");
      }
      if (__privateGet(this, _options).fastStart === "fragmented") {
        for (let videoSample of __privateGet(this, _videoSampleQueue))
          __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _videoTrack), videoSample);
        for (let audioSample of __privateGet(this, _audioSampleQueue))
          __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _audioTrack), audioSample);
        __privateMethod(this, _finalizeFragment, finalizeFragment_fn).call(this, false);
      } else {
        if (__privateGet(this, _videoTrack))
          __privateMethod(this, _finalizeCurrentChunk, finalizeCurrentChunk_fn).call(this, __privateGet(this, _videoTrack));
        if (__privateGet(this, _audioTrack))
          __privateMethod(this, _finalizeCurrentChunk, finalizeCurrentChunk_fn).call(this, __privateGet(this, _audioTrack));
      }
      let tracks = [__privateGet(this, _videoTrack), __privateGet(this, _audioTrack)].filter(Boolean);
      if (__privateGet(this, _options).fastStart === "in-memory") {
        let mdatSize;
        for (let i = 0; i < 2; i++) {
          let movieBox2 = moov(tracks, __privateGet(this, _creationTime));
          let movieBoxSize = __privateGet(this, _writer).measureBox(movieBox2);
          mdatSize = __privateGet(this, _writer).measureBox(__privateGet(this, _mdat));
          let currentChunkPos = __privateGet(this, _writer).pos + movieBoxSize + mdatSize;
          for (let chunk of __privateGet(this, _finalizedChunks)) {
            chunk.offset = currentChunkPos;
            for (let { data } of chunk.samples) {
              currentChunkPos += data.byteLength;
              mdatSize += data.byteLength;
            }
          }
          if (currentChunkPos < 2 ** 32)
            break;
          if (mdatSize >= 2 ** 32)
            __privateGet(this, _mdat).largeSize = true;
        }
        let movieBox = moov(tracks, __privateGet(this, _creationTime));
        __privateGet(this, _writer).writeBox(movieBox);
        __privateGet(this, _mdat).size = mdatSize;
        __privateGet(this, _writer).writeBox(__privateGet(this, _mdat));
        for (let chunk of __privateGet(this, _finalizedChunks)) {
          for (let sample of chunk.samples) {
            __privateGet(this, _writer).write(sample.data);
            sample.data = null;
          }
        }
      } else if (__privateGet(this, _options).fastStart === "fragmented") {
        let startPos = __privateGet(this, _writer).pos;
        let mfraBox = mfra(tracks);
        __privateGet(this, _writer).writeBox(mfraBox);
        let mfraBoxSize = __privateGet(this, _writer).pos - startPos;
        __privateGet(this, _writer).seek(__privateGet(this, _writer).pos - 4);
        __privateGet(this, _writer).writeU32(mfraBoxSize);
      } else {
        let mdatPos = __privateGet(this, _writer).offsets.get(__privateGet(this, _mdat));
        let mdatSize = __privateGet(this, _writer).pos - mdatPos;
        __privateGet(this, _mdat).size = mdatSize;
        __privateGet(this, _mdat).largeSize = mdatSize >= 2 ** 32;
        __privateGet(this, _writer).patchBox(__privateGet(this, _mdat));
        let movieBox = moov(tracks, __privateGet(this, _creationTime));
        if (typeof __privateGet(this, _options).fastStart === "object") {
          __privateGet(this, _writer).seek(__privateGet(this, _ftypSize));
          __privateGet(this, _writer).writeBox(movieBox);
          let remainingBytes = mdatPos - __privateGet(this, _writer).pos;
          __privateGet(this, _writer).writeBox(free(remainingBytes));
        } else {
          __privateGet(this, _writer).writeBox(movieBox);
        }
      }
      __privateMethod(this, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn).call(this);
      __privateGet(this, _writer).finalize();
      __privateSet(this, _finalized, true);
    }
  };
  _options = new WeakMap();
  _writer = new WeakMap();
  _ftypSize = new WeakMap();
  _mdat = new WeakMap();
  _videoTrack = new WeakMap();
  _audioTrack = new WeakMap();
  _creationTime = new WeakMap();
  _finalizedChunks = new WeakMap();
  _nextFragmentNumber = new WeakMap();
  _videoSampleQueue = new WeakMap();
  _audioSampleQueue = new WeakMap();
  _finalized = new WeakMap();
  _validateOptions = new WeakSet();
  validateOptions_fn = function(options) {
    if (typeof options !== "object") {
      throw new TypeError("The muxer requires an options object to be passed to its constructor.");
    }
    if (!(options.target instanceof Target)) {
      throw new TypeError("The target must be provided and an instance of Target.");
    }
    if (options.video) {
      if (!SUPPORTED_VIDEO_CODECS.includes(options.video.codec)) {
        throw new TypeError(`Unsupported video codec: ${options.video.codec}`);
      }
      if (!Number.isInteger(options.video.width) || options.video.width <= 0) {
        throw new TypeError(`Invalid video width: ${options.video.width}. Must be a positive integer.`);
      }
      if (!Number.isInteger(options.video.height) || options.video.height <= 0) {
        throw new TypeError(`Invalid video height: ${options.video.height}. Must be a positive integer.`);
      }
      const videoRotation = options.video.rotation;
      if (typeof videoRotation === "number" && ![0, 90, 180, 270].includes(videoRotation)) {
        throw new TypeError(`Invalid video rotation: ${videoRotation}. Has to be 0, 90, 180 or 270.`);
      } else if (Array.isArray(videoRotation) && (videoRotation.length !== 9 || videoRotation.some((value) => typeof value !== "number"))) {
        throw new TypeError(`Invalid video transformation matrix: ${videoRotation.join()}`);
      }
      if (options.video.frameRate !== void 0 && (!Number.isInteger(options.video.frameRate) || options.video.frameRate <= 0)) {
        throw new TypeError(
          `Invalid video frame rate: ${options.video.frameRate}. Must be a positive integer.`
        );
      }
    }
    if (options.audio) {
      if (!SUPPORTED_AUDIO_CODECS.includes(options.audio.codec)) {
        throw new TypeError(`Unsupported audio codec: ${options.audio.codec}`);
      }
      if (!Number.isInteger(options.audio.numberOfChannels) || options.audio.numberOfChannels <= 0) {
        throw new TypeError(
          `Invalid number of audio channels: ${options.audio.numberOfChannels}. Must be a positive integer.`
        );
      }
      if (!Number.isInteger(options.audio.sampleRate) || options.audio.sampleRate <= 0) {
        throw new TypeError(
          `Invalid audio sample rate: ${options.audio.sampleRate}. Must be a positive integer.`
        );
      }
    }
    if (options.firstTimestampBehavior && !FIRST_TIMESTAMP_BEHAVIORS.includes(options.firstTimestampBehavior)) {
      throw new TypeError(`Invalid first timestamp behavior: ${options.firstTimestampBehavior}`);
    }
    if (typeof options.fastStart === "object") {
      if (options.video) {
        if (options.fastStart.expectedVideoChunks === void 0) {
          throw new TypeError(`'fastStart' is an object but is missing property 'expectedVideoChunks'.`);
        } else if (!Number.isInteger(options.fastStart.expectedVideoChunks) || options.fastStart.expectedVideoChunks < 0) {
          throw new TypeError(`'expectedVideoChunks' must be a non-negative integer.`);
        }
      }
      if (options.audio) {
        if (options.fastStart.expectedAudioChunks === void 0) {
          throw new TypeError(`'fastStart' is an object but is missing property 'expectedAudioChunks'.`);
        } else if (!Number.isInteger(options.fastStart.expectedAudioChunks) || options.fastStart.expectedAudioChunks < 0) {
          throw new TypeError(`'expectedAudioChunks' must be a non-negative integer.`);
        }
      }
    } else if (![false, "in-memory", "fragmented"].includes(options.fastStart)) {
      throw new TypeError(`'fastStart' option must be false, 'in-memory', 'fragmented' or an object.`);
    }
    if (options.minFragmentDuration !== void 0 && (!Number.isFinite(options.minFragmentDuration) || options.minFragmentDuration < 0)) {
      throw new TypeError(`'minFragmentDuration' must be a non-negative number.`);
    }
  };
  _writeHeader = new WeakSet();
  writeHeader_fn = function() {
    __privateGet(this, _writer).writeBox(ftyp({
      holdsAvc: __privateGet(this, _options).video?.codec === "avc",
      fragmented: __privateGet(this, _options).fastStart === "fragmented"
    }));
    __privateSet(this, _ftypSize, __privateGet(this, _writer).pos);
    if (__privateGet(this, _options).fastStart === "in-memory") {
      __privateSet(this, _mdat, mdat(false));
    } else if (__privateGet(this, _options).fastStart === "fragmented") {
    } else {
      if (typeof __privateGet(this, _options).fastStart === "object") {
        let moovSizeUpperBound = __privateMethod(this, _computeMoovSizeUpperBound, computeMoovSizeUpperBound_fn).call(this);
        __privateGet(this, _writer).seek(__privateGet(this, _writer).pos + moovSizeUpperBound);
      }
      __privateSet(this, _mdat, mdat(true));
      __privateGet(this, _writer).writeBox(__privateGet(this, _mdat));
    }
    __privateMethod(this, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn).call(this);
  };
  _computeMoovSizeUpperBound = new WeakSet();
  computeMoovSizeUpperBound_fn = function() {
    if (typeof __privateGet(this, _options).fastStart !== "object")
      return;
    let upperBound = 0;
    let sampleCounts = [
      __privateGet(this, _options).fastStart.expectedVideoChunks,
      __privateGet(this, _options).fastStart.expectedAudioChunks
    ];
    for (let n of sampleCounts) {
      if (!n)
        continue;
      upperBound += (4 + 4) * Math.ceil(2 / 3 * n);
      upperBound += 4 * n;
      upperBound += (4 + 4 + 4) * Math.ceil(2 / 3 * n);
      upperBound += 4 * n;
      upperBound += 8 * n;
    }
    upperBound += 4096;
    return upperBound;
  };
  _prepareTracks = new WeakSet();
  prepareTracks_fn = function() {
    if (__privateGet(this, _options).video) {
      __privateSet(this, _videoTrack, {
        id: 1,
        info: {
          type: "video",
          codec: __privateGet(this, _options).video.codec,
          width: __privateGet(this, _options).video.width,
          height: __privateGet(this, _options).video.height,
          rotation: __privateGet(this, _options).video.rotation ?? 0,
          decoderConfig: null
        },
        // The fallback contains many common frame rates as factors
        timescale: __privateGet(this, _options).video.frameRate ?? 57600,
        samples: [],
        finalizedChunks: [],
        currentChunk: null,
        firstDecodeTimestamp: void 0,
        lastDecodeTimestamp: -1,
        timeToSampleTable: [],
        compositionTimeOffsetTable: [],
        lastTimescaleUnits: null,
        lastSample: null,
        compactlyCodedChunkTable: []
      });
    }
    if (__privateGet(this, _options).audio) {
      __privateSet(this, _audioTrack, {
        id: __privateGet(this, _options).video ? 2 : 1,
        info: {
          type: "audio",
          codec: __privateGet(this, _options).audio.codec,
          numberOfChannels: __privateGet(this, _options).audio.numberOfChannels,
          sampleRate: __privateGet(this, _options).audio.sampleRate,
          decoderConfig: null
        },
        timescale: __privateGet(this, _options).audio.sampleRate,
        samples: [],
        finalizedChunks: [],
        currentChunk: null,
        firstDecodeTimestamp: void 0,
        lastDecodeTimestamp: -1,
        timeToSampleTable: [],
        compositionTimeOffsetTable: [],
        lastTimescaleUnits: null,
        lastSample: null,
        compactlyCodedChunkTable: []
      });
      if (__privateGet(this, _options).audio.codec === "aac") {
        let guessedCodecPrivate = __privateMethod(this, _generateMpeg4AudioSpecificConfig, generateMpeg4AudioSpecificConfig_fn).call(
          this,
          2,
          // Object type for AAC-LC, since it's the most common
          __privateGet(this, _options).audio.sampleRate,
          __privateGet(this, _options).audio.numberOfChannels
        );
        __privateGet(this, _audioTrack).info.decoderConfig = {
          codec: __privateGet(this, _options).audio.codec,
          description: guessedCodecPrivate,
          numberOfChannels: __privateGet(this, _options).audio.numberOfChannels,
          sampleRate: __privateGet(this, _options).audio.sampleRate
        };
      }
    }
  };
  _generateMpeg4AudioSpecificConfig = new WeakSet();
  generateMpeg4AudioSpecificConfig_fn = function(objectType, sampleRate, numberOfChannels) {
    let frequencyIndices = [96e3, 88200, 64e3, 48e3, 44100, 32e3, 24e3, 22050, 16e3, 12e3, 11025, 8e3, 7350];
    let frequencyIndex = frequencyIndices.indexOf(sampleRate);
    let channelConfig = numberOfChannels;
    let configBits = "";
    configBits += objectType.toString(2).padStart(5, "0");
    configBits += frequencyIndex.toString(2).padStart(4, "0");
    if (frequencyIndex === 15)
      configBits += sampleRate.toString(2).padStart(24, "0");
    configBits += channelConfig.toString(2).padStart(4, "0");
    let paddingLength = Math.ceil(configBits.length / 8) * 8;
    configBits = configBits.padEnd(paddingLength, "0");
    let configBytes = new Uint8Array(configBits.length / 8);
    for (let i = 0; i < configBits.length; i += 8) {
      configBytes[i / 8] = parseInt(configBits.slice(i, i + 8), 2);
    }
    return configBytes;
  };
  _createSampleForTrack = new WeakSet();
  createSampleForTrack_fn = function(track, data, type, timestamp, duration, meta, compositionTimeOffset) {
    let presentationTimestampInSeconds = timestamp / 1e6;
    let decodeTimestampInSeconds = (timestamp - (compositionTimeOffset ?? 0)) / 1e6;
    let durationInSeconds = duration / 1e6;
    let adjusted = __privateMethod(this, _validateTimestamp, validateTimestamp_fn).call(this, presentationTimestampInSeconds, decodeTimestampInSeconds, track);
    presentationTimestampInSeconds = adjusted.presentationTimestamp;
    decodeTimestampInSeconds = adjusted.decodeTimestamp;
    if (meta?.decoderConfig) {
      if (track.info.decoderConfig === null) {
        track.info.decoderConfig = meta.decoderConfig;
      } else {
        Object.assign(track.info.decoderConfig, meta.decoderConfig);
      }
    }
    let sample = {
      presentationTimestamp: presentationTimestampInSeconds,
      decodeTimestamp: decodeTimestampInSeconds,
      duration: durationInSeconds,
      data,
      size: data.byteLength,
      type,
      // Will be refined once the next sample comes in
      timescaleUnitsToNextSample: intoTimescale(durationInSeconds, track.timescale)
    };
    return sample;
  };
  _addSampleToTrack = new WeakSet();
  addSampleToTrack_fn = function(track, sample) {
    if (__privateGet(this, _options).fastStart !== "fragmented") {
      track.samples.push(sample);
    }
    const sampleCompositionTimeOffset = intoTimescale(sample.presentationTimestamp - sample.decodeTimestamp, track.timescale);
    if (track.lastTimescaleUnits !== null) {
      let timescaleUnits = intoTimescale(sample.decodeTimestamp, track.timescale, false);
      let delta = Math.round(timescaleUnits - track.lastTimescaleUnits);
      track.lastTimescaleUnits += delta;
      track.lastSample.timescaleUnitsToNextSample = delta;
      if (__privateGet(this, _options).fastStart !== "fragmented") {
        let lastTableEntry = last(track.timeToSampleTable);
        if (lastTableEntry.sampleCount === 1) {
          lastTableEntry.sampleDelta = delta;
          lastTableEntry.sampleCount++;
        } else if (lastTableEntry.sampleDelta === delta) {
          lastTableEntry.sampleCount++;
        } else {
          lastTableEntry.sampleCount--;
          track.timeToSampleTable.push({
            sampleCount: 2,
            sampleDelta: delta
          });
        }
        const lastCompositionTimeOffsetTableEntry = last(track.compositionTimeOffsetTable);
        if (lastCompositionTimeOffsetTableEntry.sampleCompositionTimeOffset === sampleCompositionTimeOffset) {
          lastCompositionTimeOffsetTableEntry.sampleCount++;
        } else {
          track.compositionTimeOffsetTable.push({
            sampleCount: 1,
            sampleCompositionTimeOffset
          });
        }
      }
    } else {
      track.lastTimescaleUnits = 0;
      if (__privateGet(this, _options).fastStart !== "fragmented") {
        track.timeToSampleTable.push({
          sampleCount: 1,
          sampleDelta: intoTimescale(sample.duration, track.timescale)
        });
        track.compositionTimeOffsetTable.push({
          sampleCount: 1,
          sampleCompositionTimeOffset
        });
      }
    }
    track.lastSample = sample;
    let beginNewChunk = false;
    if (!track.currentChunk) {
      beginNewChunk = true;
    } else {
      let currentChunkDuration = sample.presentationTimestamp - track.currentChunk.startTimestamp;
      if (__privateGet(this, _options).fastStart === "fragmented") {
        let mostImportantTrack = __privateGet(this, _videoTrack) ?? __privateGet(this, _audioTrack);
        const chunkDuration = __privateGet(this, _options).minFragmentDuration ?? 1;
        if (track === mostImportantTrack && sample.type === "key" && currentChunkDuration >= chunkDuration) {
          beginNewChunk = true;
          __privateMethod(this, _finalizeFragment, finalizeFragment_fn).call(this);
        }
      } else {
        beginNewChunk = currentChunkDuration >= 0.5;
      }
    }
    if (beginNewChunk) {
      if (track.currentChunk) {
        __privateMethod(this, _finalizeCurrentChunk, finalizeCurrentChunk_fn).call(this, track);
      }
      track.currentChunk = {
        startTimestamp: sample.presentationTimestamp,
        samples: []
      };
    }
    track.currentChunk.samples.push(sample);
  };
  _validateTimestamp = new WeakSet();
  validateTimestamp_fn = function(presentationTimestamp, decodeTimestamp, track) {
    const strictTimestampBehavior = __privateGet(this, _options).firstTimestampBehavior === "strict";
    const noLastDecodeTimestamp = track.lastDecodeTimestamp === -1;
    const timestampNonZero = decodeTimestamp !== 0;
    if (strictTimestampBehavior && noLastDecodeTimestamp && timestampNonZero) {
      throw new Error(
        `The first chunk for your media track must have a timestamp of 0 (received DTS=${decodeTimestamp}).Non-zero first timestamps are often caused by directly piping frames or audio data from a MediaStreamTrack into the encoder. Their timestamps are typically relative to the age of thedocument, which is probably what you want.

If you want to offset all timestamps of a track such that the first one is zero, set firstTimestampBehavior: 'offset' in the options.
`
      );
    } else if (__privateGet(this, _options).firstTimestampBehavior === "offset" || __privateGet(this, _options).firstTimestampBehavior === "cross-track-offset") {
      if (track.firstDecodeTimestamp === void 0) {
        track.firstDecodeTimestamp = decodeTimestamp;
      }
      let baseDecodeTimestamp;
      if (__privateGet(this, _options).firstTimestampBehavior === "offset") {
        baseDecodeTimestamp = track.firstDecodeTimestamp;
      } else {
        baseDecodeTimestamp = Math.min(
          __privateGet(this, _videoTrack)?.firstDecodeTimestamp ?? Infinity,
          __privateGet(this, _audioTrack)?.firstDecodeTimestamp ?? Infinity
        );
      }
      decodeTimestamp -= baseDecodeTimestamp;
      presentationTimestamp -= baseDecodeTimestamp;
    }
    if (decodeTimestamp < track.lastDecodeTimestamp) {
      throw new Error(
        `Timestamps must be monotonically increasing (DTS went from ${track.lastDecodeTimestamp * 1e6} to ${decodeTimestamp * 1e6}).`
      );
    }
    track.lastDecodeTimestamp = decodeTimestamp;
    return { presentationTimestamp, decodeTimestamp };
  };
  _finalizeCurrentChunk = new WeakSet();
  finalizeCurrentChunk_fn = function(track) {
    if (__privateGet(this, _options).fastStart === "fragmented") {
      throw new Error("Can't finalize individual chunks if 'fastStart' is set to 'fragmented'.");
    }
    if (!track.currentChunk)
      return;
    track.finalizedChunks.push(track.currentChunk);
    __privateGet(this, _finalizedChunks).push(track.currentChunk);
    if (track.compactlyCodedChunkTable.length === 0 || last(track.compactlyCodedChunkTable).samplesPerChunk !== track.currentChunk.samples.length) {
      track.compactlyCodedChunkTable.push({
        firstChunk: track.finalizedChunks.length,
        // 1-indexed
        samplesPerChunk: track.currentChunk.samples.length
      });
    }
    if (__privateGet(this, _options).fastStart === "in-memory") {
      track.currentChunk.offset = 0;
      return;
    }
    track.currentChunk.offset = __privateGet(this, _writer).pos;
    for (let sample of track.currentChunk.samples) {
      __privateGet(this, _writer).write(sample.data);
      sample.data = null;
    }
    __privateMethod(this, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn).call(this);
  };
  _finalizeFragment = new WeakSet();
  finalizeFragment_fn = function(flushStreamingWriter = true) {
    if (__privateGet(this, _options).fastStart !== "fragmented") {
      throw new Error("Can't finalize a fragment unless 'fastStart' is set to 'fragmented'.");
    }
    let tracks = [__privateGet(this, _videoTrack), __privateGet(this, _audioTrack)].filter((track) => track && track.currentChunk);
    if (tracks.length === 0)
      return;
    let fragmentNumber = __privateWrapper(this, _nextFragmentNumber)._++;
    if (fragmentNumber === 1) {
      let movieBox = moov(tracks, __privateGet(this, _creationTime), true);
      __privateGet(this, _writer).writeBox(movieBox);
    }
    let moofOffset = __privateGet(this, _writer).pos;
    let moofBox = moof(fragmentNumber, tracks);
    __privateGet(this, _writer).writeBox(moofBox);
    {
      let mdatBox = mdat(false);
      let totalTrackSampleSize = 0;
      for (let track of tracks) {
        for (let sample of track.currentChunk.samples) {
          totalTrackSampleSize += sample.size;
        }
      }
      let mdatSize = __privateGet(this, _writer).measureBox(mdatBox) + totalTrackSampleSize;
      if (mdatSize >= 2 ** 32) {
        mdatBox.largeSize = true;
        mdatSize = __privateGet(this, _writer).measureBox(mdatBox) + totalTrackSampleSize;
      }
      mdatBox.size = mdatSize;
      __privateGet(this, _writer).writeBox(mdatBox);
    }
    for (let track of tracks) {
      track.currentChunk.offset = __privateGet(this, _writer).pos;
      track.currentChunk.moofOffset = moofOffset;
      for (let sample of track.currentChunk.samples) {
        __privateGet(this, _writer).write(sample.data);
        sample.data = null;
      }
    }
    let endPos = __privateGet(this, _writer).pos;
    __privateGet(this, _writer).seek(__privateGet(this, _writer).offsets.get(moofBox));
    let newMoofBox = moof(fragmentNumber, tracks);
    __privateGet(this, _writer).writeBox(newMoofBox);
    __privateGet(this, _writer).seek(endPos);
    for (let track of tracks) {
      track.finalizedChunks.push(track.currentChunk);
      __privateGet(this, _finalizedChunks).push(track.currentChunk);
      track.currentChunk = null;
    }
    if (flushStreamingWriter) {
      __privateMethod(this, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn).call(this);
    }
  };
  _maybeFlushStreamingTargetWriter = new WeakSet();
  maybeFlushStreamingTargetWriter_fn = function() {
    if (__privateGet(this, _writer) instanceof StreamTargetWriter) {
      __privateGet(this, _writer).flush();
    }
  };
  _ensureNotFinalized = new WeakSet();
  ensureNotFinalized_fn = function() {
    if (__privateGet(this, _finalized)) {
      throw new Error("Cannot add new video or audio chunks after the file has been finalized.");
    }
  };
  return __toCommonJS(src_exports);
})();
try{window.Mp4Muxer=Mp4Muxer;}catch(e){}

async function tpListaInterp(steps){
 const seq=tpState.frames, out=[];
 for(let i=0;i<seq.length-1;i++){
  for(let s=0;s<=steps;s++) out.push(tpMixPieces(seq[i].pieces, seq[i+1].pieces, s/steps));
 }
 out.push(seq[seq.length-1].pieces);
 return out;
}
function tpEhCelular(){
 return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'') ||
  !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches && window.innerWidth<900);
}
function tpBaixarVideo(blob, nome){
 const a=document.createElement('a');
 a.href=URL.createObjectURL(blob);
 a.download=nome;
 a.click();
 setTimeout(()=>URL.revokeObjectURL(a.href), 8000);
}
function tpMostrarShareBar(file){
 let bar=document.getElementById('tp-share-bar');
 if(!bar){
  bar=document.createElement('div');
  bar.id='tp-share-bar';
  bar.style.cssText='position:fixed;left:10px;right:10px;bottom:12px;z-index:99999;background:#111;color:#fff;border:2px solid #f9c614;border-radius:12px;padding:12px;display:flex;gap:8px;align-items:center;justify-content:space-between;font-weight:800;box-shadow:0 8px 24px #0008';
  document.body.appendChild(bar);
 }
 bar.innerHTML='<span>Vídeo pronto</span>';
 const b=document.createElement('button');
 b.type='button';
 b.textContent='Enviar no WhatsApp';
 b.style.cssText='background:#25d366;color:#fff;border:0;border-radius:8px;padding:10px 14px;font-weight:800;cursor:pointer';
 b.onclick=async function(){
  try{
   await navigator.share({ files:[file], title:'Jogada CFA Prosol', text:'Jogada da prancheta' });
   bar.remove();
  }catch(e){
   if(e && e.name==='AbortError'){ bar.remove(); return; }
   tpBaixarVideo(file, file.name);
  }
 };
 const x=document.createElement('button');
 x.type='button'; x.textContent='Fechar';
 x.style.cssText='background:transparent;color:#f9c614;border:0;font-weight:800;cursor:pointer';
 x.onclick=()=>bar.remove();
 bar.appendChild(b); bar.appendChild(x);
}
async function tpEntregarVideo(blob){
 const mp4=blob.type.indexOf('mp4')>=0;
 const nome=mp4?'jogada_cfa_prosol.mp4':'jogada_cfa_prosol.webm';
 const file=new File([blob], nome, {type: blob.type|| (mp4?'video/mp4':'video/webm')});
 if(tpEhCelular() && navigator.share){
  try{
   if(!navigator.canShare || navigator.canShare({files:[file]})){
    await navigator.share({ files:[file], title:'Jogada CFA Prosol', text:'Jogada da prancheta' });
    return;
   }
  }catch(e){
   if(e && e.name==='AbortError') return;
  }
  tpMostrarShareBar(file);
  return;
 }
 tpBaixarVideo(blob, nome);
}

async function tpExportMp4WebCodecs(canvas, ctx, lista, W, H, fps){
 if(typeof VideoEncoder==='undefined' || typeof VideoFrame==='undefined') return null;
 const Mux=window.Mp4Muxer;
 if(!Mux || !Mux.Muxer) return null;
 let codec='avc1.42001f';
 try{
  let ok=await VideoEncoder.isConfigSupported({codec,width:W,height:H,bitrate:2500000,avc:{format:'avc'}});
  if(!ok||!ok.supported){
   codec='avc1.4d001e';
   ok=await VideoEncoder.isConfigSupported({codec,width:W,height:H,bitrate:2500000,avc:{format:'avc'}});
   if(!ok||!ok.supported) return null;
  }
 }catch(e){ return null; }
 const muxer=new Mux.Muxer({
  target:new Mux.ArrayBufferTarget(),
  video:{ codec:'avc', width:W, height:H },
  fastStart:'in-memory',
  firstTimestampBehavior:'offset'
 });
 let encErr=null;
 const encoder=new VideoEncoder({
  output:(chunk, meta)=>muxer.addVideoChunk(chunk, meta),
  error:e=>{ encErr=e; }
 });
 encoder.configure({ codec, width:W, height:H, bitrate:2500000, framerate:fps, avc:{format:'avc'} });
 const dur=Math.round(1e6/fps);
 for(let n=0;n<lista.length;n++){
  tpDrawField(ctx,W,H); tpDrawPieces(ctx,W,H,lista[n]);
  const frame=new VideoFrame(canvas,{ timestamp:n*dur, duration:dur });
  encoder.encode(frame,{ keyFrame: n%12===0 });
  frame.close();
  if(encErr) throw encErr;
 }
 await encoder.flush();
 encoder.close();
 muxer.finalize();
 const buf=muxer.target.buffer;
 if(!buf || buf.byteLength<8000) return null;
 return new Blob([buf],{type:'video/mp4'});
}
async function tpExportMediaRecorder(canvas, ctx, lista, W, H, fps, preferMp4){
 if(typeof MediaRecorder==='undefined') return null;
 const stream=canvas.captureStream(0);
 const vtrack=stream.getVideoTracks()[0];
 tpDrawField(ctx,W,H); tpDrawPieces(ctx,W,H,lista[0]);
 try{ if(vtrack.requestFrame) vtrack.requestFrame(); }catch(e){}
 const types=preferMp4
  ? ['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp8','video/webm']
  : ['video/webm;codecs=vp8','video/webm'];
 let mime='';
 for(const t of types){ try{ if(MediaRecorder.isTypeSupported(t) && t.indexOf('mp4a')<0){ mime=t; break; } }catch(e){} }
 if(!mime) return null;
 const rec=new MediaRecorder(stream,{ mimeType:mime, videoBitsPerSecond:2500000 });
 const chunks=[];
 rec.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
 const stopped=new Promise(res=>{ rec.onstop=()=>res(); rec.onerror=()=>res(); });
 rec.start(200);
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 await wait(80);
 for(let n=0;n<lista.length;n++){
  tpDrawField(ctx,W,H); tpDrawPieces(ctx,W,H,lista[n]);
  try{ if(vtrack.requestFrame) vtrack.requestFrame(); }catch(e){}
  await wait(Math.round(1000/fps));
 }
 await wait(400);
 if(rec.state==='recording') rec.stop();
 await stopped;
 stream.getTracks().forEach(t=>{ try{t.stop();}catch(e){} });
 const size=chunks.reduce((s,c)=>s+c.size,0);
 if(size<8000) return null;
 const isMp4=mime.indexOf('mp4')>=0;
 let blob=new Blob(chunks,{type:isMp4?'video/mp4':'video/webm'});
 if(!isMp4 && typeof window.ysFixWebmDuration==='function'){
  const dur=lista.length*(1000/fps)+400;
  blob=await new Promise(res=>window.ysFixWebmDuration(blob,dur,fixed=>res(fixed||blob)));
 }
 return blob;
}
async function tpExportarVideo(){
 if(!tpState.frames || tpState.frames.length<2){
  alert('Salve pelo menos 2 telas para gerar o vídeo (o jogador anda de uma para a outra).');
  return;
 }
 await tpFieldJpegReady();
 const cel=tpEhCelular();
 const W=cel?854:1280, H=cel?480:720, fps=cel?12:15, steps=cel?12:18;
 const canvas=document.createElement('canvas');
 canvas.width=W; canvas.height=H;
 canvas.style.cssText='position:fixed;left:0;top:0;width:160px;height:90px;opacity:0.01;pointer-events:none;z-index:0';
 document.body.appendChild(canvas);
 const ctx=canvas.getContext('2d',{alpha:false});
 const lista=await tpListaInterp(steps);
 let blob=null;
 try{ blob=await tpExportMp4WebCodecs(canvas, ctx, lista, W, H, fps); }catch(e){ blob=null; }
 if(!blob || blob.size<8000){
  try{ blob=await tpExportMediaRecorder(canvas, ctx, lista, W, H, fps, true); }catch(e){ blob=null; }
 }
 if(!blob || blob.size<8000){
  try{ blob=await tpExportMediaRecorder(canvas, ctx, lista, W, H, fps, false); }catch(e){ blob=null; }
 }
 try{ document.body.removeChild(canvas); }catch(e){}
 if(!blob || blob.size<8000){
  alert('Não deu para gerar o vídeo. Use Chrome ou Edge (computador). No celular o navegador costuma bloquear gravação.');
  return;
 }
 await tpEntregarVideo(blob);
}

/* === CAMADA MOBILE: exportação e ajustes de interface sem alterar desktop === */
function prosolIsMobile(){
 return (window.matchMedia&&window.matchMedia('(max-width: 900px)').matches)||/Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent||'');
}
function prosolSanitizeFilename(nome){
 return String(nome||'arquivo').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_\-]+/gi,'_').replace(/_+/g,'_').replace(/^_|_$/g,'');
}
function prosolCloneComInputsComoTexto(elemento){
 const clone=elemento.cloneNode(true);
 const origInputs=elemento.querySelectorAll('input,textarea,select');
 const cloneInputs=clone.querySelectorAll('input,textarea,select');
 origInputs.forEach((inp,i)=>{
  const alvo=cloneInputs[i]; if(!alvo||!alvo.parentNode)return;
  const span=document.createElement('span');
  span.textContent=inp.tagName==='SELECT'?(inp.options[inp.selectedIndex]?.text||inp.value):inp.value;
  span.style.whiteSpace='pre-wrap';
  span.style.fontWeight='inherit';
  span.style.color='inherit';
  span.style.textAlign=getComputedStyle(inp).textAlign||'center';
  span.style.display='inline-block';
  span.style.width='100%';
  alvo.parentNode.replaceChild(span,alvo);
 });
 clone.querySelectorAll('.no-print,.campo-acoes,.close-btn,.campo-fechar,.novo-jogo-fechar').forEach(el=>el.remove());
 return clone;
}
function prosolExportElementPDF(elemento, filename, orientacao='portrait'){
 if(!elemento)return alert('Não encontrei o conteúdo para exportar.');
 if(typeof html2pdf==='undefined'){
  alert('Exportação em PDF indisponível neste dispositivo. Tente usar a opção de compartilhar/print do navegador.');
  return;
 }
 const wrapper=document.createElement('div');
 wrapper.style.background='#fff';
 wrapper.style.padding='0';
 wrapper.appendChild(prosolCloneComInputsComoTexto(elemento));
 const opt={
  margin:4,
  filename:prosolSanitizeFilename(filename)+'.pdf',
  image:{type:'jpeg',quality:0.98},
  html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff'},
  jsPDF:{unit:'mm',format:'a4',orientation:orientacao},
  pagebreak:{mode:['avoid-all','css','legacy']}
 };
 html2pdf().from(wrapper).set(opt).save();
}

function prosolPrepararWrapperPDF(elemento, orientacao='portrait', tipo='normal'){
 const wrapper=document.createElement('div');
 wrapper.style.background='#fff';
 wrapper.style.padding='0';
 wrapper.style.margin='0';
 wrapper.style.overflow='hidden';
 const clone=prosolCloneComInputsComoTexto(elemento);
 if(tipo==='convocacao-campo'){
  wrapper.style.width='297mm';
  wrapper.style.height='210mm';
  wrapper.style.maxHeight='210mm';
  clone.style.width='297mm';
  clone.style.height='210mm';
  clone.style.minHeight='210mm';
  clone.style.maxHeight='210mm';
  clone.style.overflow='hidden';
  clone.style.margin='0';
  clone.style.boxShadow='none';
  // Celular Compartilhar PDF: titulares +1% extra; logo +3%; X +2%; adversário +3%.
  if(typeof prosolIsMobile==='function' && prosolIsMobile()){
   clone.querySelectorAll('.campo-futebol .jogador-campo').forEach(el=>{
    el.style.fontSize='12.24px';
    el.querySelectorAll('span').forEach(sp=>{sp.style.fontSize='12.24px';sp.style.fontWeight='bold';});
    el.querySelectorAll('img').forEach(img=>{img.style.width='42.84px';});
   });
   clone.querySelectorAll('.campo-adversario').forEach(box=>{
    box.querySelectorAll(':scope > img').forEach(img=>{
     img.style.width='43.26px';
     img.style.height='43.26px';
    });
    box.querySelectorAll(':scope > b').forEach(b=>{
     b.style.fontSize='22.44px';
    });
    box.querySelectorAll(':scope > span, :scope > input').forEach(el=>{
     el.style.fontSize='14.42px';
     el.style.fontWeight='bold';
    });
   });
  }
 }
 wrapper.appendChild(clone);
 return wrapper;
}
function prosolOpcoesPDF(filename, orientacao='portrait', tipo='normal'){
 return {
  margin: tipo==='convocacao-campo' ? 0 : 4,
  filename:prosolSanitizeFilename(filename)+'.pdf',
  image:{type:'jpeg',quality:0.98},
  html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',scrollX:0,scrollY:0},
  jsPDF:{unit:'mm',format:'a4',orientation:orientacao},
  pagebreak:{mode: tipo==='convocacao-campo' ? ['avoid-all'] : ['avoid-all','css','legacy']}
 };
}
async function prosolCompartilharOuSalvarPDF(elemento, filename, orientacao='portrait', tipo='normal', titulo='CFA Prosol'){
 if(!elemento)return alert('Não encontrei o conteúdo para exportar.');
 if(typeof html2pdf==='undefined'){
  alert('Exportação em PDF indisponível neste dispositivo.');
  return;
 }
 const wrapper=prosolPrepararWrapperPDF(elemento,orientacao,tipo);
 const opt=prosolOpcoesPDF(filename,orientacao,tipo);
 try{
  const blob=await html2pdf().from(wrapper).set(opt).outputPdf('blob');
  const file=new File([blob],prosolSanitizeFilename(filename)+'.pdf',{type:'application/pdf'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
   await navigator.share({files:[file],title:titulo,text:'PDF gerado pelo CFA Prosol.'});
  }else{
   html2pdf().from(wrapper).set(opt).save();
  }
 }catch(e){
  console.error('Erro ao compartilhar PDF:',e);
  html2pdf().from(wrapper).set(opt).save();
 }
}
function prosolAjustarTextosMobileExportar(){
 if(!prosolIsMobile())return;
 document.querySelectorAll('button').forEach(btn=>{
  const t=(btn.textContent||'').trim();
  if(/imprimir/i.test(t)){
   const dentroConvocacao=btn.closest&&btn.closest('#campo-convocacao-modal');
   if(dentroConvocacao){
    btn.innerHTML=btn.innerHTML.replace(/IMPRIMIR/gi,'COMPARTILHAR PDF').replace(/Imprimir/gi,'Compartilhar PDF').replace(/🖨/g,'📤');
    btn.title='Compartilhar PDF';
   }else{
    btn.innerHTML=btn.innerHTML.replace(/IMPRIMIR/gi,'EXPORTAR PDF').replace(/Imprimir/gi,'Exportar PDF').replace(/🖨/g,'📄');
    btn.title='Exportar PDF';
   }
  }
 });
}
(function iniciarAjustesMobileProsol(){
 const start=()=>{
  prosolAjustarTextosMobileExportar();
  if(prosolIsMobile()){
   const obs=new MutationObserver(()=>prosolAjustarTextosMobileExportar());
   obs.observe(document.body,{childList:true,subtree:true});
  }
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();

if(typeof imprimirFichasTreino==='function'){
 const imprimirFichasTreinoDesktop=imprimirFichasTreino;
 imprimirFichasTreino=function(){
  if(!prosolIsMobile())return imprimirFichasTreinoDesktop();
  const el=document.getElementById('fichas-render-container');
  prosolExportElementPDF(el,'fichas_treino_cfa_prosol','landscape');
 };
}
if(typeof imprimirConvocacaoCampo==='function'){
 const imprimirConvocacaoCampoDesktop=imprimirConvocacaoCampo;
 imprimirConvocacaoCampo=function(){
  if(!prosolIsMobile())return imprimirConvocacaoCampoDesktop();
  const card=document.querySelector('#campo-convocacao-modal .campo-card');
  prosolCompartilharOuSalvarPDF(card,'convocacao_cfa_prosol','landscape','convocacao-campo','Convocação CFA Prosol');
 };
}
if(typeof printFicha==='function'){
 const printFichaDesktop=printFicha;
 printFicha=function(){
  if(!prosolIsMobile())return printFichaDesktop();
  if(typeof shareFichaPDF==='function')return shareFichaPDF();
  const el=document.getElementById('fichaExportContent');
  prosolExportElementPDF(el,'ficha_atleta_cfa_prosol','portrait');
 };
}


/* === CONTROLE DE PESO - TESTES FÍSICOS === */
let controlePesoData = { atletas: [], datas: [], pesos: {} };
let controlePesoSaveTimer = null;
let controlePesoOrdenacaoSelecao = 'padrao';
let controlePesoGorduraDir = 'desc';
let controlePesoSelecaoAberta = false;
let controlePesoResizeBound = false;
const CONTROLE_PESO_IDEAL_KEY = '__peso_ideal';
const CONTROLE_PESO_CATEGORIAS = [
 {id:'sub11',label:'1º Sub 11',anos:['2015','2016','2017','2018']},
 {id:'sub12',label:'Sub 12',anos:['2014']},
 {id:'sub13',label:'Sub 13',anos:['2013']},
 {id:'sub14',label:'Sub 14',anos:['2012']},
 {id:'sub16',label:'Sub 16',anos:['2011','2010','2009']}
];
function normalizarTextoPeso(valor){return String(valor||'').trim().replace(/\s+/g,' ');}
function valorPesoColunaFlex(row, termos){
 const chave=Object.keys(row||{}).find(k=>termos.some(t=>String(k).toLowerCase().includes(String(t).toLowerCase())));
 return chave ? row[chave] : '';
}
function identidadeAtletaPeso(index){
 const row=excelData[index]||{};
 const nomeCompleto=normalizarTextoPeso(valorPesoColunaFlex(row,['nome completo'])||valorColunaExata(row,'NOME COMPLETO')||valorPesoColunaFlex(row,['nome']));
 const apelido=normalizarTextoPeso(valorPesoColunaFlex(row,['apelido']))||nomeCompleto;
 const nascimento=normalizarTextoPeso(convertExcelDate(valorPesoColunaFlex(row,['data de nascimento','nascimento']))||valorPesoColunaFlex(row,['data de nascimento','nascimento']));
 const ano=normalizarTextoPeso(valorColunaExata(row,'Ano'));
 return {nomeCompleto,apelido,nascimento,ano};
}
function chaveAtletaPeso(id){return normalizarTextoPeso(id?.nomeCompleto||'')+'||'+normalizarTextoPeso(id?.nascimento||'');}
function localizarAtletaPeso(id){
 const chave=chaveAtletaPeso(id);
 if(!chave||chave==='||')return -1;
 return (excelData||[]).findIndex((_,i)=>chaveAtletaPeso(identidadeAtletaPeso(i))===chave);
}
function garantirControlePesoData(){
 if(!controlePesoData||typeof controlePesoData!=='object')controlePesoData={atletas:[],datas:[],pesos:{}};
 if(!Array.isArray(controlePesoData.atletas))controlePesoData.atletas=[];
 if(!Array.isArray(controlePesoData.datas))controlePesoData.datas=[];
 if(!controlePesoData.pesos||typeof controlePesoData.pesos!=='object')controlePesoData.pesos={};
}
function anoControlePesoAtleta(id){
 const idx=localizarAtletaPeso(id);
 if(idx>=0)return identidadeAtletaPeso(idx).ano;
 const m=String(id?.nascimento||'').match(/(\d{4})$/);
 return m?m[1]:'';
}
function nomeControlePesoLinha(id){
 const nome=id?.apelido||id?.nomeCompleto||'Atleta';
 const ano=anoControlePesoAtleta(id);
 return ano?`${nome} - ${ano}`:nome;
}
function ehDataPesoKey(k){return k && String(k)!==CONTROLE_PESO_IDEAL_KEY && !String(k).startsWith('__');}
function datasControlePesoOrdenadas(datas){
 return [...(datas||[])].sort((a,b)=>{
  const pa=String(a.label||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const pb=String(b.label||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const ta=pa?new Date(+pa[3],+pa[2]-1,+pa[1]).getTime():0;
  const tb=pb?new Date(+pb[3],+pb[2]-1,+pb[1]).getTime():0;
  return ta-tb;
 });
}
function parseKgPeso(valor){
 const n=parseFloat(String(valor||'').replace(',','.').trim());
 return (valor===''||valor==null||isNaN(n))?null:n;
}
function formatKgPeso(n){
 return Number(n).toLocaleString('pt-BR',{minimumFractionDigits:Number.isInteger(n)?0:1,maximumFractionDigits:1});
}
function ultimoPesoLancadoAtleta(pesos,datas){
 const mapa=pesos||{};
 for(let i=(datas||[]).length-1;i>=0;i--){
  const id=datas[i].id;
  const n=parseKgPeso(mapa[id]);
  if(n!==null)return n;
 }
 return null;
}
function htmlDeltaPesoIdeal(pesos,datas){
 const ideal=parseKgPeso((pesos||{})[CONTROLE_PESO_IDEAL_KEY]);
 const atual=ultimoPesoLancadoAtleta(pesos,datas);
 if(ideal===null||atual===null)return '';
 const diff=Math.round((atual-ideal)*10)/10;
 if(diff===0)return `<span class="peso-delta ok">no peso ideal</span>`;
 if(diff>0)return `<span class="peso-delta emagrecer">emagrecer ${formatKgPeso(diff)} kg</span>`;
 return `<span class="peso-delta engordar">engordar ${formatKgPeso(Math.abs(diff))} kg</span>`;
}
function categoriaControlePesoAno(ano){
 const a=String(ano||'');
 return CONTROLE_PESO_CATEGORIAS.find(c=>c.anos.includes(a))||{id:'outros',label:'Outros',anos:[]};
}
async function carregarControlePesoStorage(){
 try{
  const {data,error}=await _supabase.from('controle_peso').select('nome_completo,apelido,nascimento,pesos').order('apelido');
  if(error){console.warn('Controle de peso não carregado. Verifique se a tabela controle_peso existe:',error.message);return;}
  const atletas=[];
  const pesos={};
  const datasSet=new Set();
  (data||[]).forEach(r=>{
   const id={nomeCompleto:normalizarTextoPeso(r.nome_completo),apelido:normalizarTextoPeso(r.apelido),nascimento:normalizarTextoPeso(r.nascimento)};
   if(!id.nomeCompleto||!id.nascimento)return;
   atletas.push(id);
   const key=chaveAtletaPeso(id);
   pesos[key]=r.pesos&&typeof r.pesos==='object'?r.pesos:{};
   Object.keys(pesos[key]).forEach(d=>{if(ehDataPesoKey(d))datasSet.add(d);});
  });
  controlePesoData={
   atletas,
   datas:datasControlePesoOrdenadas(Array.from(datasSet).map(label=>({id:label,label}))),
   pesos
  };
  garantirControlePesoData();
 }catch(e){console.warn('Controle de peso não carregado:',e);}
}
async function salvarControlePesoStorage(){
 garantirControlePesoData();
 try{
  const rows=controlePesoData.atletas
   .filter(a=>a.nomeCompleto&&a.nascimento)
   .map(a=>{
    const key=chaveAtletaPeso(a);
    return {
     nome_completo:a.nomeCompleto,
     apelido:a.apelido||'',
     nascimento:a.nascimento,
     pesos:controlePesoData.pesos[key]||{},
     atualizado_em:new Date().toISOString()
    };
   });

  if(rows.length){
   const {error:upsertError}=await _supabase.from('controle_peso').upsert(rows,{onConflict:'nome_completo,nascimento'});
   if(upsertError){console.error('Erro ao salvar controle de peso:',upsertError);alert('Erro ao salvar controle de peso no Supabase.');return false;}
  }

  const ativos=new Set(rows.map(r=>normalizarTextoPeso(r.nome_completo)+'||'+normalizarTextoPeso(r.nascimento)));
  const {data:atuais,error:selectError}=await _supabase.from('controle_peso').select('id,nome_completo,nascimento');
  if(!selectError){
   const remover=(atuais||[]).filter(r=>!ativos.has(normalizarTextoPeso(r.nome_completo)+'||'+normalizarTextoPeso(r.nascimento)));
   for(const r of remover){await _supabase.from('controle_peso').delete().eq('id',r.id);}
  }
  return true;
 }catch(e){console.error(e);alert('Erro de conexão ao salvar controle de peso.');return false;}
}
function salvarControlePesoDebounced(){
 clearTimeout(controlePesoSaveTimer);
 controlePesoSaveTimer=setTimeout(()=>salvarControlePesoStorage(),700);
}
function ensurePesoButton(){
 let b=document.getElementById('btn-peso-pf-fab');
 if(!b){
  b=document.createElement('div');
  b.id='btn-peso-pf-fab';
  b.textContent='Peso';
  b.style.cssText='position:fixed;bottom:255px;right:30px;width:65px;height:65px;border-radius:50%;background:#8e44ad;color:#fff;display:none;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.4);cursor:pointer;font-weight:bold;font-size:12px;z-index:9999;text-align:center;user-select:none;transition:.2s;';
  b.onmouseover=()=>{b.style.transform='scale(1.1)';b.style.background='#783993';};
  b.onmouseout=()=>{b.style.transform='scale(1.0)';b.style.background='#8e44ad';};
  b.onclick=abrirControlePesoModal;
  document.body.appendChild(b);
 }
}
function aplicarVisibilidadeSelecaoPeso(){
 const layout=document.querySelector('#controle-peso-modal .controle-peso-layout');
 const btn=document.getElementById('btn-toggle-selecao-peso');
 const extra=document.getElementById('controle-peso-acoes-selecao');
 if(layout)layout.classList.toggle('selecao-aberta',!!controlePesoSelecaoAberta);
 if(btn){
  btn.classList.toggle('ativo',!!controlePesoSelecaoAberta);
  btn.textContent=controlePesoSelecaoAberta?'Ocultar seleção':'Selecionar atletas';
 }
 if(extra)extra.style.display=controlePesoSelecaoAberta?'inline-flex':'none';
}
function toggleSelecaoControlePeso(){
 controlePesoSelecaoAberta=!controlePesoSelecaoAberta;
 aplicarVisibilidadeSelecaoPeso();
 if(controlePesoSelecaoAberta)renderControlePesoSelecao();
}
function abrirControlePesoModal(){
 garantirControlePesoData();
 controlePesoSelecaoAberta=false;
 let m=document.getElementById('controle-peso-modal');
 if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='controle-peso-modal';document.body.appendChild(m)}
 const anos=['2009','2010','2011','2012','2013','2014','2015','2016','2017','2018'];
 m.innerHTML=`<div class="controle-peso-card"><div class="controle-peso-title"><b>Controle de Peso</b><button onclick="document.getElementById('controle-peso-modal').style.display='none'">×</button></div><div class="controle-peso-top"><div class="controle-peso-acoes"><button type="button" id="btn-toggle-selecao-peso" onclick="toggleSelecaoControlePeso()">Selecionar atletas</button><span id="controle-peso-acoes-selecao" style="display:none"><button type="button" onclick="adicionarSelecionadosControlePeso()">Adicionar selecionados</button><button type="button" onclick="removerSelecionadosControlePeso()">Remover selecionados</button></span><button type="button" onclick="adicionarDataControlePeso()">Adicionar data</button><select id="controle-peso-data-excluir"><option value="">Excluir data...</option>${controlePesoData.datas.map(d=>`<option value="${d.id}">${d.label}</option>`).join('')}</select><button type="button" class="perigo" onclick="excluirDataControlePeso()">Excluir data</button></div></div><div class="controle-peso-layout"><div class="controle-peso-selecao"><input id="controle-peso-busca" placeholder="Buscar atleta..." oninput="renderControlePesoSelecao()"><div class="controle-peso-anos">${anos.map(a=>`<label><input type="checkbox" class="controle-peso-ano" value="${a}" onchange="renderControlePesoSelecao()"> ${a}</label>`).join('')}</div><h4 class="controle-peso-selecao-header"><button type="button" id="peso-sort-padrao" onclick="ordenarControlePesoSelecao('padrao')">Selecionar atletas</button><button type="button" id="peso-sort-gordura" onclick="ordenarControlePesoSelecao('gordura')">% de Gordura</button></h4><div id="controle-peso-lista-selecao"></div></div><div class="controle-peso-tabela-wrap"><h4>Pesagens</h4><div id="controle-peso-tabela"></div></div></div></div>`;
 m.style.display='flex';
 aplicarVisibilidadeSelecaoPeso();
 renderControlePesoSelecao();
 renderControlePesoTabela();
}
function controlePesoAtletasAtivosKeys(){garantirControlePesoData();return new Set(controlePesoData.atletas.map(chaveAtletaPeso));}
function gorduraControlePesoNum(index){
 const gordura=getUltimaAvaliacao(excelData[index]||{}).gordura;
 const n=parseFloat(String(gordura||'').replace('%','').replace(',','.'));
 return isNaN(n)?NaN:n;
}
function ordenarControlePesoSelecao(tipo){
 if(tipo==='gordura'){
  if(controlePesoOrdenacaoSelecao==='gordura') controlePesoGorduraDir = controlePesoGorduraDir === 'desc' ? 'asc' : 'desc';
  else { controlePesoOrdenacaoSelecao='gordura'; controlePesoGorduraDir='desc'; }
 }else{
  controlePesoOrdenacaoSelecao='padrao';
 }
 renderControlePesoSelecao();
}
function atualizarHeaderOrdenacaoControlePeso(){
 const bPadrao=document.getElementById('peso-sort-padrao');
 const bGordura=document.getElementById('peso-sort-gordura');
 if(bPadrao)bPadrao.classList.toggle('active',controlePesoOrdenacaoSelecao==='padrao');
 if(bGordura){
  bGordura.classList.toggle('active',controlePesoOrdenacaoSelecao==='gordura');
  bGordura.textContent=controlePesoOrdenacaoSelecao==='gordura' ? `% de Gordura ${controlePesoGorduraDir==='desc'?'▼':'▲'}` : '% de Gordura';
 }
}
function getAtletasFiltradosControlePeso(){
 const anosSel=Array.from(document.querySelectorAll('#controle-peso-modal .controle-peso-ano:checked')).map(x=>x.value);
 const busca=(document.getElementById('controle-peso-busca')?.value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
 return (excelData||[]).map((row,index)=>({index,id:identidadeAtletaPeso(index)})).filter(item=>{
  if(anosSel.length&&!anosSel.includes(item.id.ano))return false;
  if(busca){
   const texto=`${item.id.nomeCompleto} ${item.id.apelido} ${item.id.ano}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
   if(!texto.includes(busca))return false;
  }
  return item.id.nomeCompleto&&item.id.nascimento;
 }).sort((a,b)=>{
  if(controlePesoOrdenacaoSelecao==='gordura'){
   const ga=gorduraControlePesoNum(a.index), gb=gorduraControlePesoNum(b.index);
   let r=0;
   if(isNaN(ga)&&isNaN(gb))r=0; else if(isNaN(ga))r=1; else if(isNaN(gb))r=-1; else r=ga-gb;
   if(controlePesoGorduraDir==='desc')r=-r;
   return r || parseInt(a.id.ano||9999)-parseInt(b.id.ano||9999) || a.id.apelido.localeCompare(b.id.apelido,'pt-BR');
  }
  return parseInt(a.id.ano||9999)-parseInt(b.id.ano||9999)||a.id.apelido.localeCompare(b.id.apelido,'pt-BR');
 });
}
function renderControlePesoSelecao(){
 atualizarHeaderOrdenacaoControlePeso();
 const box=document.getElementById('controle-peso-lista-selecao');if(!box)return;
 const ativos=controlePesoAtletasAtivosKeys();
 const atletas=getAtletasFiltradosControlePeso();
 if(!atletas.length){box.innerHTML='<p class="controle-peso-vazio">Nenhum atleta encontrado.</p>';return;}
 box.innerHTML=atletas.map(a=>{const gordura=(getUltimaAvaliacao(excelData[a.index]||{}).gordura||'-');return `<label class="controle-peso-athlete-option"><input type="checkbox" class="controle-peso-select-athlete" data-index="${a.index}" ${ativos.has(chaveAtletaPeso(a.id))?'checked':''}> <span class="peso-athlete-name">${escapeHtmlJogos(a.id.apelido)} <small>${escapeHtmlJogos(a.id.ano)}</small></span><span class="peso-athlete-gordura">${escapeHtmlJogos(gordura)}</span></label>`;}).join('');
}
function adicionarSelecionadosControlePeso(){
 garantirControlePesoData();
 const existentes=controlePesoAtletasAtivosKeys();
 document.querySelectorAll('#controle-peso-modal .controle-peso-select-athlete:checked').forEach(chk=>{
  const index=parseInt(chk.dataset.index,10);const id=identidadeAtletaPeso(index);const key=chaveAtletaPeso(id);
  if(id.nomeCompleto&&id.nascimento&&!existentes.has(key)){controlePesoData.atletas.push(id);existentes.add(key);}
 });
 renderControlePesoSelecao();renderControlePesoTabela();salvarControlePesoDebounced();
}
function removerSelecionadosControlePeso(){
 garantirControlePesoData();
 const remover=new Set();
 document.querySelectorAll('#controle-peso-modal .controle-peso-select-athlete:checked').forEach(chk=>{const id=identidadeAtletaPeso(parseInt(chk.dataset.index,10));remover.add(chaveAtletaPeso(id));});
 if(!remover.size)return alert('Marque atletas para remover do controle.');
 if(!confirm('Remover os atletas marcados do controle de peso? Os pesos lançados para eles também serão removidos.'))return;
 controlePesoData.atletas=controlePesoData.atletas.filter(a=>!remover.has(chaveAtletaPeso(a)));
 remover.forEach(k=>delete controlePesoData.pesos[k]);
 renderControlePesoSelecao();renderControlePesoTabela();salvarControlePesoDebounced();
}
function formatarDataPesoLabel(valor){
 const s=String(valor||'').trim();
 const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/); if(m)return `${m[3]}/${m[2]}/${m[1]}`;
 const m2=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/); if(m2)return `${String(m2[1]).padStart(2,'0')}/${String(m2[2]).padStart(2,'0')}/${m2[3]}`;
 return s;
}
function adicionarDataControlePeso(){
 garantirControlePesoData();
 const hoje=new Date().toISOString().slice(0,10);
 const entrada=prompt('Informe a data da pesagem (DD/MM/AAAA ou AAAA-MM-DD):',hoje);
 if(!entrada)return;
 const label=formatarDataPesoLabel(entrada);
 if(!label)return alert('Data inválida.');
 if(controlePesoData.datas.some(d=>d.label===label))return alert('Esta data já existe no controle.');
 controlePesoData.datas.push({id:label,label});
 controlePesoData.datas=datasControlePesoOrdenadas(controlePesoData.datas);
 controlePesoData.atletas.forEach(a=>{const key=chaveAtletaPeso(a);if(!controlePesoData.pesos[key])controlePesoData.pesos[key]={};if(controlePesoData.pesos[key][label]===undefined)controlePesoData.pesos[key][label]='';});
 renderControlePesoTabela();
 const sel=document.getElementById('controle-peso-data-excluir');if(sel)sel.innerHTML='<option value="">Excluir data...</option>'+controlePesoData.datas.map(d=>`<option value="${d.id}">${d.label}</option>`).join('');
 salvarControlePesoDebounced();
}
function excluirDataControlePeso(){
 garantirControlePesoData();
 const sel=document.getElementById('controle-peso-data-excluir');const id=sel?.value;
 if(!id)return alert('Selecione uma data para excluir.');
 const data=controlePesoData.datas.find(d=>d.id===id);
 if(!confirm('Excluir a data '+(data?.label||'selecionada')+' e todos os pesos dela?'))return;
 controlePesoData.datas=controlePesoData.datas.filter(d=>d.id!==id);
 Object.keys(controlePesoData.pesos).forEach(k=>{if(controlePesoData.pesos[k])delete controlePesoData.pesos[k][id];});
 renderControlePesoTabela();
 if(sel)sel.innerHTML='<option value="">Excluir data...</option>'+controlePesoData.datas.map(d=>`<option value="${d.id}">${d.label}</option>`).join('');
 salvarControlePesoDebounced();
}
function atualizarBadgeDeltaPeso(chave){
 document.querySelectorAll('[data-peso-delta]').forEach(el=>{
  if(el.getAttribute('data-peso-delta')===chave) el.innerHTML=htmlDeltaPesoIdeal(controlePesoData.pesos[chave]||{},controlePesoData.datas);
 });
}
function atualizarPesoControleAtleta(chave,dataId,valor){
 garantirControlePesoData();
 if(!controlePesoData.pesos[chave])controlePesoData.pesos[chave]={};
 controlePesoData.pesos[chave][dataId]=String(valor||'').trim();
 atualizarBadgeDeltaPeso(chave);
 salvarControlePesoDebounced();
}
function atualizarPesoIdealControleAtleta(chave,valor){
 garantirControlePesoData();
 if(!controlePesoData.pesos[chave])controlePesoData.pesos[chave]={};
 controlePesoData.pesos[chave][CONTROLE_PESO_IDEAL_KEY]=String(valor||'').trim();
 atualizarBadgeDeltaPeso(chave);
 salvarControlePesoDebounced();
}
function removerAtletaControlePeso(chave){
 garantirControlePesoData();
 const atleta=controlePesoData.atletas.find(a=>chaveAtletaPeso(a)===chave);
 if(!atleta)return;
 const nome=atleta.apelido||atleta.nomeCompleto||'atleta';
 if(!confirm('Remover '+nome+' do controle de peso? Os pesos lançados para este atleta também serão removidos.'))return;
 controlePesoData.atletas=controlePesoData.atletas.filter(a=>chaveAtletaPeso(a)!==chave);
 delete controlePesoData.pesos[chave];
 renderControlePesoSelecao();
 renderControlePesoTabela();
 salvarControlePesoDebounced();
}
function htmlLinhaControlePeso(a,datas){
 const key=chaveAtletaPeso(a); const pesos=controlePesoData.pesos[key]||{};
 const keyEncoded=encodeURIComponent(key);
 const ideal=pesos[CONTROLE_PESO_IDEAL_KEY]||'';
 return `<tr><td><button type="button" class="controle-peso-remove-row" title="Remover atleta" onclick="removerAtletaControlePeso(decodeURIComponent('${keyEncoded}'))">×</button><span class="peso-nome-ano">${escapeHtmlJogos(nomeControlePesoLinha(a))}</span><span class="peso-delta-wrap" data-peso-delta="${escapeHtmlJogos(key)}">${htmlDeltaPesoIdeal(pesos,datas)}</span></td><td><input type="number" step="0.1" class="peso-ideal-input" value="${escapeHtmlJogos(ideal)}" onchange="atualizarPesoIdealControleAtleta(decodeURIComponent('${keyEncoded}'),this.value)" placeholder="Kg"></td>${datas.map(d=>`<td><input type="number" step="0.1" value="${escapeHtmlJogos(pesos[d.id]||'')}" onchange="atualizarPesoControleAtleta(decodeURIComponent('${keyEncoded}'),'${d.id}',this.value)" placeholder="Kg"></td>`).join('')}</tr>`;
}
function renderControlePesoTabela(){
 garantirControlePesoData();
 const box=document.getElementById('controle-peso-tabela');if(!box)return;
 if(!controlePesoData.atletas.length){box.innerHTML='<p class="controle-peso-vazio">Nenhum atleta adicionado ao controle de peso.</p>';return;}
 const datas=controlePesoData.datas;
 const grupos=new Map();
 CONTROLE_PESO_CATEGORIAS.forEach(c=>grupos.set(c.id,{cat:c,atletas:[]}));
 grupos.set('outros',{cat:{id:'outros',label:'Outros'},atletas:[]});
 controlePesoData.atletas.forEach(a=>{
  const cat=categoriaControlePesoAno(anoControlePesoAtleta(a));
  if(!grupos.has(cat.id))grupos.set(cat.id,{cat,atletas:[]});
  grupos.get(cat.id).atletas.push(a);
 });
 const cards=[];
 grupos.forEach(g=>{
  if(!g.atletas.length)return;
  g.atletas.sort((a,b)=>nomeControlePesoLinha(a).localeCompare(nomeControlePesoLinha(b),'pt-BR'));
  const head=`<tr><th>Atleta</th><th>Peso ideal</th>${datas.map(d=>`<th>${d.label}</th>`).join('')}</tr>`;
  const rows=g.atletas.map(a=>htmlLinhaControlePeso(a,datas)).join('');
  cards.push(`<article class="controle-peso-cat-card cat-${g.cat.id}"><header><strong>${escapeHtmlJogos(g.cat.label)}</strong><span>${g.atletas.length} atleta(s)</span></header><div class="controle-peso-cat-table"><table class="controle-peso-table"><thead>${head}</thead><tbody>${rows}</tbody></table></div></article>`);
 });
 box.innerHTML=`<div class="controle-peso-cats">${cards.join('')}</div>`;
 ajustarLarguraColunaAtletaPeso();
}
function ajustarLarguraColunaAtletaPeso(){
 const box=document.getElementById('controle-peso-tabela');
 if(!box)return;
 if(window.innerWidth>900){
  box.style.removeProperty('--peso-atleta-col');
  return;
 }
 const nomes=[...box.querySelectorAll('.peso-nome-ano')];
 if(!nomes.length){box.style.removeProperty('--peso-atleta-col');return;}
 let max=0;
 nomes.forEach(n=>{max=Math.max(max,Math.ceil(n.scrollWidth||n.offsetWidth||0));});
 const largura=Math.max(92, Math.min(max+36, Math.floor(window.innerWidth*0.42)));
 box.style.setProperty('--peso-atleta-col', largura+'px');
 if(!controlePesoResizeBound){
  controlePesoResizeBound=true;
  window.addEventListener('resize',()=>{if(document.getElementById('controle-peso-modal')?.style.display==='flex')ajustarLarguraColunaAtletaPeso();});
 }
}

/* === GALERIA DE FOTOS DOS ATLETAS === */
function fotosCategoriasConfig(){
 return {
  sub11:{label:'Sub 11',anos:['2015','2016','2017','2018']},
  sub12:{label:'Sub 12',anos:['2014']},
  sub13:{label:'Sub 13',anos:['2013']},
  sub14:{label:'Sub 14',anos:['2012']},
  sub16:{label:'Sub 16',anos:['2009','2010','2011']}
 };
}

let fotosFiltrosAno = {};
function fotosFiltroAtual(catKey){
 const cat=fotosCategoriasConfig()[catKey];
 if(!cat)return {all:true,anos:[]};
 const filtro=fotosFiltrosAno[catKey];
 if(!filtro||filtro.all)return {all:true,anos:[...cat.anos]};
 const anos=(filtro.anos||[]).filter(a=>cat.anos.includes(a));
 return anos.length?{all:false,anos}:{all:true,anos:[...cat.anos]};
}
function fotosSetFiltroTodos(catKey){
 fotosFiltrosAno[catKey]={all:true,anos:[...((fotosCategoriasConfig()[catKey]||{}).anos||[])]};
 renderFotosCategoria(catKey);
}
function fotosToggleAno(catKey,ano){
 const cat=fotosCategoriasConfig()[catKey]; if(!cat)return;
 const atual=fotosFiltroAtual(catKey);
 let anos=atual.all?[ano]:[...atual.anos];
 if(!atual.all){
  if(anos.includes(ano)) anos=anos.filter(a=>a!==ano);
  else anos.push(ano);
 }
 anos=anos.filter(a=>cat.anos.includes(a));
 if(!anos.length || anos.length===cat.anos.length) fotosFiltrosAno[catKey]={all:true,anos:[...cat.anos]};
 else fotosFiltrosAno[catKey]={all:false,anos};
 renderFotosCategoria(catKey);
}
function iniciarLazyFotosAtletas(){
 // As fotos agora são exibidas diretamente em tamanho reduzido pelo CSS.
 // Não geramos miniatura via canvas porque isso exige carregar a imagem grande primeiro
 // e pode ficar mais lento em celulares.
 document.querySelectorAll('#fotos-atletas-modal img[data-index]').forEach(img=>img.removeAttribute('data-index'));
}

function fotosValorFlex(row, termos){
 const chave=Object.keys(row||{}).find(k=>termos.some(t=>String(k).toLowerCase().includes(String(t).toLowerCase())));
 return chave ? row[chave] : '';
}
function fotosAnoAtleta(row){return String(valorColunaExata(row,'Ano')||fotosValorFlex(row,['ano'])||'').trim();}
function fotosNomeCompleto(row){return String(fotosValorFlex(row,['nome completo'])||valorColunaExata(row,'NOME COMPLETO')||fotosValorFlex(row,['nome'])||'Sem Nome').trim();}
function fotosNascimento(row){return convertExcelDate(fotosValorFlex(row,['data de nascimento','nascimento'])||'');}
function fotosApelido(row){return String(fotosValorFlex(row,['apelido'])||'').trim();}
function fotosPosicao(row){return String(fotosValorFlex(row,['posição','posicao'])||'').toLowerCase();}
function fotosFotoOriginalAtleta(row){
 return String(fotosValorFlex(row,['foto','imagem'])||'').trim();
}
function fotosTemFotoAtleta(row){
 return fotosFotoOriginalAtleta(row).length > 0;
}
function fotosImagemAtleta(row){
 const foto=fotosFotoOriginalAtleta(row);
 if(foto)return foto;
 const pos=fotosPosicao(row);
 return pos.includes('goleiro')?'camiseta_goleiro.png':'camiseta_linha.png';
}
function fotosPlaceholderMiniatura(){
 return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="190"><rect width="100%" height="100%" fill="#f1f1f1"/><circle cx="80" cy="76" r="24" fill="#d0d0d0"/><rect x="38" y="114" width="84" height="44" rx="20" fill="#d0d0d0"/></svg>');
}

const fotosThumbCache = new Map();
const fotosThumbEmProcesso = new Map();
function fotosFallbackAtleta(row){return fotosPosicao(row).includes('goleiro')?'camiseta_goleiro.png':'camiseta_linha.png';}
function fotosChaveThumb(index){
 const row=excelData[index]||{};
 return `${fotosNomeCompleto(row)}|${fotosNascimento(row)}|${index}`;
}
function criarThumbnailFoto(src, maxW=160, maxH=190){
 return new Promise(resolve=>{
  if(!src || (!src.startsWith('data:image') && !src.startsWith('blob:'))){resolve(src);return;}
  const img=new Image();
  img.onload=()=>{
   try{
    const ratio=Math.min(maxW/img.naturalWidth, maxH/img.naturalHeight, 1);
    const w=Math.max(1, Math.round(img.naturalWidth*ratio));
    const h=Math.max(1, Math.round(img.naturalHeight*ratio));
    const canvas=document.createElement('canvas');
    canvas.width=w; canvas.height=h;
    const ctx=canvas.getContext('2d', {alpha:false});
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,w,h);
    ctx.drawImage(img,0,0,w,h);
    resolve(canvas.toDataURL('image/jpeg',0.72));
   }catch(e){console.warn('Falha ao gerar miniatura:',e);resolve(src);}
  };
  img.onerror=()=>resolve(src);
  img.src=src;
 });
}
async function obterThumbnailAtleta(index){
 const row=excelData[index]||{};
 const fallback=fotosFallbackAtleta(row);
 const foto=fotosFotoOriginalAtleta(row);
 if(!foto)return fallback;
 const chave=fotosChaveThumb(index);
 if(fotosThumbCache.has(chave))return fotosThumbCache.get(chave);
 if(fotosThumbEmProcesso.has(chave))return fotosThumbEmProcesso.get(chave);
 const promessa=criarThumbnailFoto(foto).then(thumb=>{const final=thumb||foto||fallback;fotosThumbCache.set(chave,final);fotosThumbEmProcesso.delete(chave);return final;});
 fotosThumbEmProcesso.set(chave,promessa);
 return promessa;
}
function fotosGrupoPosicao(row){
 const p=fotosPosicao(row);
 if(p.includes('goleiro'))return 'Goleiro';
 if(p.includes('zagueiro'))return 'Zagueiro';
 if(p.includes('lateral'))return 'Lateral';
 if(p.includes('volante'))return 'Volante';
 if(p.includes('meia'))return 'Meia';
 if(p.includes('atacante'))return 'Atacante';
 if(p.includes('extremo')||p.includes('ponta'))return 'Extremo';
 return 'Outros';
}
function fotosOrdemGrupo(label){
 return ['Goleiro','Zagueiro','Lateral','Volante','Meia','Atacante','Extremo','Outros'].indexOf(label);
}
function openFotosModal(){
 let modal=document.getElementById('fotos-atletas-modal');
 if(!modal){
  modal=document.createElement('div');
  modal.id='fotos-atletas-modal';
  modal.className='fotos-overlay';
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)closeFotosModal();});
 }
 modal.style.display='flex';
 renderFotosCategorias();
}
function closeFotosModal(){const modal=document.getElementById('fotos-atletas-modal');if(modal)modal.style.display='none';}

let fotosPreloadEmAndamento = false;
let fotosPreloadConcluido = false;
let fotosPreloadTotal = 0;
let fotosPreloadAtual = 0;
const fotosPreloadCache = new Map();
function fotosAtualizarStatusPreload(){
 const el=document.getElementById('fotos-preload-status');
 const btn=document.getElementById('fotos-preload-btn');
 if(el){
  if(fotosPreloadEmAndamento)el.textContent=`Carregando fotos... ${fotosPreloadAtual}/${fotosPreloadTotal}`;
  else if(fotosPreloadConcluido)el.textContent=`Fotos carregadas: ${fotosPreloadAtual}/${fotosPreloadTotal}`;
  else el.textContent='';
 }
 if(btn){
  btn.disabled=fotosPreloadEmAndamento;
  btn.textContent=fotosPreloadEmAndamento?'Carregando...':'Carregar fotos';
 }
}
function fotosPreloadUmaImagem(src){
 return new Promise(resolve=>{
  if(!src){resolve(false);return;}
  const img=new Image();
  img.onload=async()=>{
   try{ if(img.decode) await img.decode(); }catch(e){}
   resolve(true);
  };
  img.onerror=()=>resolve(false);
  img.src=src;
 });
}
async function carregarFotosAtletasAntecipado(){
 if(fotosPreloadEmAndamento)return;
 const itens=(excelData||[]).map((row,index)=>({row,index,src:fotosFotoOriginalAtleta(row)})).filter(x=>x.src);
 fotosPreloadTotal=itens.length;
 fotosPreloadAtual=0;
 fotosPreloadConcluido=false;
 fotosPreloadEmAndamento=true;
 fotosAtualizarStatusPreload();
 let cursor=0;
 const concorrencia=3;
 async function worker(){
  while(cursor<itens.length){
   const item=itens[cursor++];
   const key=fotosChaveThumb(item.index);
   if(!fotosPreloadCache.has(key)){
    await fotosPreloadUmaImagem(item.src);
    fotosPreloadCache.set(key,item.src);
   }
   fotosPreloadAtual++;
   fotosAtualizarStatusPreload();
   await new Promise(r=>setTimeout(r,10));
  }
 }
 await Promise.all(Array.from({length:Math.min(concorrencia,itens.length)},worker));
 fotosPreloadEmAndamento=false;
 fotosPreloadConcluido=true;
 fotosAtualizarStatusPreload();
}
function renderFotosCategorias(){
 const modal=document.getElementById('fotos-atletas-modal');if(!modal)return;
 const cats=fotosCategoriasConfig();
 modal.innerHTML=`<div class="fotos-categorias-card"><button class="fotos-close" onclick="closeFotosModal()">×</button><img src="logo.png" class="fotos-logo-main"><h2>CFA Prosol</h2><p>Fotos dos atletas</p><button id="fotos-preload-btn" class="fotos-preload-btn" onclick="carregarFotosAtletasAntecipado()">Carregar fotos</button><div id="fotos-preload-status" class="fotos-preload-status"></div><div class="fotos-cat-buttons">${Object.keys(cats).map(k=>`<button onclick="renderFotosCategoria('${k}')">${cats[k].label}</button>`).join('')}</div></div>`;
 fotosAtualizarStatusPreload();
}
function fotosAtletasCategoria(catKey, anosFiltro){
 const cat=fotosCategoriasConfig()[catKey];
 if(!cat)return [];
 const anos=(anosFiltro&&anosFiltro.length)?anosFiltro:cat.anos;
 return (excelData||[]).map((row,index)=>({row,index})).filter(item=>anos.includes(fotosAnoAtleta(item.row))).sort((a,b)=>{
  const ga=fotosOrdemGrupo(fotosGrupoPosicao(a.row)), gb=fotosOrdemGrupo(fotosGrupoPosicao(b.row));
  if(ga!==gb)return ga-gb;
  return fotosNomeCompleto(a.row).localeCompare(fotosNomeCompleto(b.row),'pt-BR');
 });
}
function renderFotosCategoria(catKey){
 const modal=document.getElementById('fotos-atletas-modal');if(!modal)return;
 const cat=fotosCategoriasConfig()[catKey];if(!cat)return;
 const filtro=fotosFiltroAtual(catKey);
 const atletas=fotosAtletasCategoria(catKey,filtro.anos);
 const grupos={};
 atletas.forEach(item=>{const g=fotosGrupoPosicao(item.row);if(!grupos[g])grupos[g]=[];grupos[g].push(item);});
 const filtrosAnos=cat.anos.length>1?`<div class="fotos-year-pills"><button class="${filtro.all?'active':''}" onclick="fotosSetFiltroTodos('${catKey}')">${cat.anos.join('/')}</button>${cat.anos.map(a=>`<button class="${(!filtro.all&&filtro.anos.includes(a))?'active':''}" onclick="fotosToggleAno('${catKey}','${a}')">${a}</button>`).join('')}</div>`:'';
 const conteudo=Object.keys(grupos).sort((a,b)=>fotosOrdemGrupo(a)-fotosOrdemGrupo(b)).map(grupo=>`<section class="fotos-pos-section"><h3>${grupo}</h3><div class="fotos-grid">${grupos[grupo].map(({row,index})=>{
  const nome=fotosNomeCompleto(row);
  const apelido=fotosApelido(row);
  const nasc=fotosNascimento(row);
  const ano=fotosAnoAtleta(row);
  const fallback=fotosFallbackAtleta(row);
  const temFoto=fotosTemFotoAtleta(row);
  const preloadKey=fotosChaveThumb(index);
  const srcInicial=temFoto?(fotosPreloadCache.get(preloadKey)||fotosFotoOriginalAtleta(row)):fallback;
  return `<article class="foto-atleta-card"><button type="button" class="foto-img-box" onclick="abrirFotoAtletaDetalhe(${index})" title="Ampliar foto"><img src="${escapeHtmlJogos(srcInicial)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fallback}'" alt="${escapeHtmlJogos(nome)}"></button>${apelido?`<strong class="foto-apelido">${escapeHtmlJogos(apelido)}</strong>`:''}<b>${escapeHtmlJogos(nome)}</b><span>${escapeHtmlJogos(nasc)}</span><small>${escapeHtmlJogos(ano)}</small></article>`;
 }).join('')}</div></section>`).join('')||'<p class="fotos-empty">Nenhum atleta encontrado nesta categoria/filtro.</p>';
 modal.innerHTML=`<div class="fotos-list-card"><div class="fotos-list-top"><button onclick="renderFotosCategorias()"><i class="fa-solid fa-arrow-left"></i> Voltar</button><strong>${cat.label}</strong><button onclick="closeFotosModal()">×</button></div>${filtrosAnos}<div class="fotos-list-body">${conteudo}</div></div>`;
 iniciarLazyFotosAtletas();
}


function abrirFotoAtletaDetalhe(index){
 const row=excelData[index]||{};
 const nome=fotosNomeCompleto(row);
 const apelido=fotosApelido(row);
 const nasc=fotosNascimento(row);
 const ano=fotosAnoAtleta(row);
 const pos=fotosValorFlex(row,['posição 1','posicao 1','posição','posicao'])||'-';
 const cidade=fotosValorFlex(row,['cidade'])||'-';
 const foto=fotosImagemAtleta(row)||fotosFallbackAtleta(row);
 const avals=(typeof relatorioIndividualMetricasAtleta==='function')?relatorioIndividualMetricasAtleta(index):[];
 const ult=avals[avals.length-1]||null;
 const ant=avals.length>1?avals[avals.length-2]:null;
 const fmt=(v)=>escapeHtmlJogos(v===undefined||v===null||String(v).trim()===''?'-':v);
 const delta=(key,menorMelhor=false,unit='')=>{
  if(!ult||!ant)return '';
  const a=relatoriosNum(ult[key]), b=relatoriosNum(ant[key]);
  if(isNaN(a)||isNaN(b))return '';
  const dif=a-b;
  if(Math.abs(dif)<0.0001)return '<em class="fd-delta neutro">0</em>';
  const bom=menorMelhor?dif<0:dif>0;
  const cls=bom?'bom':'ruim';
  const sinal=dif>0?'+':'';
  return `<em class="fd-delta ${cls}">${sinal}${dif.toFixed(2).replace('.',',')}${unit}</em>`;
 };
 const card=(label,key,unit='',menorMelhor=false)=>`<div class="fd-res-card"><span>${label}</span><strong>${fmt(ult?ult[key]:'')}${ult&&ult[key]?unit:''}</strong>${delta(key,menorMelhor,unit)}</div>`;
 const resumo=ult?`<div class="fd-section-title">Resumo da Última Avaliação</div><div class="fd-resumo-grid">${card('Peso','peso',' Kg')}${card('Altura','altura',' m')}${card('Alt. Predita','predita',' m')}${card('% Gordura','gordura','',true)}${card('Resistência','distancia',' m')}${card('Potência','melhorSalto',' m')}${card('Aceleração','aceleracao',' s',true)}${card('Velocidade','velocidade',' s',true)}${card('Agilidade','agilidade',' s',true)}</div>`:'<div class="fd-empty">Sem avaliações físicas cadastradas.</div>';
 const comparativo=avals.length?`<div class="fd-section-title">Comparativo das Avaliações</div><div class="fd-comp-wrap"><table class="fd-comparativo"><thead><tr><th>Data</th><th>Peso</th><th>Altura</th><th>Gordura</th><th>Dist.</th><th>Salto</th><th>Acel.</th><th>Veloc.</th><th>Agil.</th></tr></thead><tbody>${avals.map(a=>`<tr><td>${fmt(a.label)}</td><td>${fmt(a.peso)}</td><td>${fmt(a.altura)}</td><td>${fmt(a.gordura)}</td><td>${fmt(a.distancia)}</td><td>${fmt(a.melhorSalto)}</td><td>${fmt(a.aceleracao)}</td><td>${fmt(a.velocidade)}</td><td>${fmt(a.agilidade)}</td></tr>`).join('')}</tbody></table></div>`:'';
 let modal=document.getElementById('foto-detalhe-modal');
 if(!modal){modal=document.createElement('div');modal.id='foto-detalhe-modal';modal.className='foto-detalhe-overlay';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)fecharFotoAtletaDetalhe();});}
 modal.innerHTML=`<div class="foto-detalhe-card foto-detalhe-card-completo"><button class="foto-detalhe-close" onclick="fecharFotoAtletaDetalhe()">×</button><div class="foto-detalhe-img"><img src="${foto}" onerror="this.src='${fotosFallbackAtleta(row)}'" alt="${escapeHtmlJogos(nome)}"></div><div class="foto-detalhe-info"><h2>${escapeHtmlJogos(apelido||nome)}</h2><h3>${escapeHtmlJogos(nome)}</h3><div class="fd-basic-grid"><p><strong>Ano:</strong> ${escapeHtmlJogos(ano)}</p><p><strong>Nascimento:</strong> ${escapeHtmlJogos(nasc)}</p><p><strong>Posição:</strong> ${escapeHtmlJogos(pos)}</p><p><strong>Cidade:</strong> ${escapeHtmlJogos(cidade)}</p></div>${resumo}${comparativo}</div></div>`;
 modal.style.display='flex';
}
function fecharFotoAtletaDetalhe(){const modal=document.getElementById('foto-detalhe-modal');if(modal)modal.style.display='none';}


/* === Tooltips flutuantes das estatísticas de jogos === */
function inicializarTooltipFlutuanteEstatisticasJogos(){
    if (window.__tooltipEstatisticasJogosInicializado) return;
    window.__tooltipEstatisticasJogosInicializado = true;

    let tooltip = document.getElementById('estat-tooltip-flutuante');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'estat-tooltip-flutuante';
        tooltip.className = 'estat-tooltip-flutuante';
        document.body.appendChild(tooltip);
    }

    function posicionarTooltip(event) {
        if (!tooltip || tooltip.style.display !== 'block') return;
        const margem = 12;
        const rect = tooltip.getBoundingClientRect();
        let x = event.clientX + margem;
        let y = event.clientY + margem;

        if (x + rect.width > window.innerWidth - 8) {
            x = event.clientX - rect.width - margem;
        }
        if (y + rect.height > window.innerHeight - 8) {
            y = event.clientY - rect.height - margem;
        }
        tooltip.style.left = Math.max(8, x) + 'px';
        tooltip.style.top = Math.max(8, y) + 'px';
    }

    document.addEventListener('mouseover', (event) => {
        const alvo = event.target.closest && event.target.closest('.estat-tooltip');
        if (!alvo || !alvo.dataset.tooltip) return;
        tooltip.textContent = alvo.dataset.tooltip;
        tooltip.style.display = 'block';
        posicionarTooltip(event);
    });

    document.addEventListener('mousemove', (event) => {
        if (tooltip.style.display === 'block') posicionarTooltip(event);
    });

    document.addEventListener('mouseout', (event) => {
        const alvo = event.target.closest && event.target.closest('.estat-tooltip');
        if (!alvo) return;
        tooltip.style.display = 'none';
    });

    // No celular/tablet, toque para mostrar e toque fora para fechar.
    document.addEventListener('click', (event) => {
        const alvo = event.target.closest && event.target.closest('.estat-tooltip');
        if (!alvo) {
            if (tooltip) tooltip.style.display = 'none';
            return;
        }
        if (!alvo.dataset.tooltip) return;
        tooltip.textContent = alvo.dataset.tooltip;
        tooltip.style.display = 'block';
        posicionarTooltip(event);
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarTooltipFlutuanteEstatisticasJogos);
} else {
    inicializarTooltipFlutuanteEstatisticasJogos();
}


/* === TESTE MODERNO V3 SEGURO ===
   Casca visual dinâmica. Não altera banco, tabelas, Supabase ou regras internas. */
let modernV3ManualSidebarClosed=false;
function modernV3EnsureMenu(){
 const nav=document.getElementById('main-nav');
 if(!nav)return;
 let floatBtn=document.getElementById('modern-v3-menu-float');
 if(!floatBtn){
  floatBtn=document.createElement('button');
  floatBtn.id='modern-v3-menu-float';
  floatBtn.className='modern-v3-menu-float';
  floatBtn.type='button';
  floatBtn.innerHTML='☰ Menu';
  floatBtn.onclick=()=>modernV3OpenSidebar();
  document.body.appendChild(floatBtn);
 }
 if(nav.dataset.modernV3Ready==='1')return;
 nav.dataset.modernV3Ready='1';
 nav.classList.add('modern-v3-sidebar');
 nav.innerHTML=`
  <div class="modern-v3-brand"><img src="logo.png" alt="CFA Prosol"><div><strong>CFA Prosol</strong><span>Sistema Principal</span></div><button class="modern-v3-fullscreen-btn" onclick="toggleFullScreen()" title="Tela Cheia"><span class="mv3-ico">⛶</span><span>Tela Cheia</span></button></div>
  <button class="modern-v3-collapse-btn" onclick="modernV3CloseSidebar()"><span>Recolher menu</span><b>‹</b></button>
  <button class="modern-v3-home nav-btn active" onclick="modernV3Navigate('home',event)"><span class="mv3-ico">⌂</span><span>Painel inicial</span></button>
  <button class="modern-v3-group-title" onclick="modernV3ToggleGroup('mv3-atletas')"><span>Gestão de Atletas</span><b>▾</b></button>
  <div class="modern-v3-group" id="mv3-atletas">
   <button class="nav-btn" onclick="modernV3Navigate('atletas',event)"><span class="mv3-ico">👥</span><span>Atletas</span></button>
   <button class="nav-btn" onclick="modernV3Navigate('excel-db',event)"><span class="mv3-ico">🗄️</span><span>Banco de Dados</span></button>
   <button class="nav-btn" onclick="modernV3Action('fotos',event)"><span class="mv3-ico">📸</span><span>Fotos</span></button>
  </div>
  <button class="modern-v3-group-title" onclick="modernV3ToggleGroup('mv3-campo')"><span>Campo e Jogos</span><b>▾</b></button>
  <div class="modern-v3-group" id="mv3-campo">
   <button class="nav-btn" onclick="modernV3Navigate('convocacao',event)"><span class="mv3-ico">📋</span><span>Convocação</span></button>
   <button class="nav-btn" onclick="modernV3Navigate('jogos',event)"><span class="mv3-ico">⚽</span><span>Jogos</span></button>
   <button class="nav-btn" onclick="modernV3Navigate('prancheta',event)"><span class="mv3-ico">📐</span><span>Prancheta Virtual</span></button>
  </div>
  <button class="modern-v3-group-title" onclick="modernV3ToggleGroup('mv3-performance')"><span>Performance</span><b>▾</b></button>
  <div class="modern-v3-group" id="mv3-performance">
   <button class="nav-btn" onclick="modernV3Navigate('testes',event)"><span class="mv3-ico">🏃</span><span>Testes Físicos</span></button>
   <button class="nav-btn" onclick="modernV3Navigate('grupos',event)"><span class="mv3-ico">🧩</span><span>Separação de Grupos</span></button>
  </div>
  <button class="modern-v3-group-title" onclick="modernV3ToggleGroup('mv3-relatorios')"><span>Central de Relatórios</span><b>▾</b></button>
  <div class="modern-v3-group" id="mv3-relatorios">
   <button class="nav-btn" onclick="modernV3Action('relatorio-fisico',event)"><span class="mv3-ico">📊</span><span>Relatório Físico</span></button>
   <button class="nav-btn" onclick="modernV3Action('trabalho-diario',event)"><span class="mv3-ico">📄</span><span>Trabalho Diário</span></button>
   <button class="nav-btn" onclick="modernV3Action('planejamento',event)"><span class="mv3-ico">🗓️</span><span>Planejamento Semanal</span></button>
   <button class="nav-btn" onclick="modernV3Action('psr',event)"><span class="mv3-ico">💚</span><span>PSR</span></button>
   <button class="nav-btn" onclick="modernV3Action('pse',event)"><span class="mv3-ico">🔥</span><span>PSE</span></button>
   <button class="nav-btn" onclick="modernV3Action('goleiros',event)"><span class="mv3-ico">🧤</span><span>Goleiros</span></button>
   <button class="nav-btn" data-prep-alert="1" onclick="modernV3Action('preparacao-fisica',event)"><span class="mv3-ico">🩺</span><span>Preparação Física</span></button>
   <button class="nav-btn" onclick="modernV3Action('monitoramento-carga',event)"><span class="mv3-ico">📈</span><span>Monitoramento de Carga</span></button>
  </div>`;
 renderIndicadorPreparacaoFisica();
 atualizarIndicadorPreparacaoFisica();
}
function modernV3ToggleGroup(id){
 const g=document.getElementById(id);if(!g)return;
 g.classList.toggle('closed');
 const btn=g.previousElementSibling;if(btn)btn.classList.toggle('closed',g.classList.contains('closed'));
}
function modernV3IsHomeActive(){return !!document.getElementById('home-screen')?.classList.contains('active-screen');}
function modernV3IsMobileViewport(){
 const mm=(q)=>window.matchMedia&&window.matchMedia(q).matches;
 const ua=String(navigator.userAgent||'').toLowerCase();
 return mm('(max-width: 760px)') || mm('(pointer: coarse)') || mm('(hover: none)') || /android|iphone|ipad|ipod|mobile/.test(ua);
}
function modernV3ApplyMobileClass(){
 document.body.classList.toggle('modern-v3-mobile', modernV3IsMobileViewport());
}
function modernV3OpenSidebar(){modernV3ManualSidebarClosed=false;document.body.classList.remove('modern-v3-sidebar-collapsed');}
function modernV3CloseSidebar(){modernV3ManualSidebarClosed=true;document.body.classList.add('modern-v3-sidebar-collapsed');}
function modernV3AutoSidebar(screenId){
 modernV3ApplyMobileClass();
 if(screenId==='home'){
  modernV3ManualSidebarClosed=modernV3IsMobileViewport();
  document.body.classList.toggle('modern-v3-sidebar-collapsed', modernV3ManualSidebarClosed);
 }
 else {modernV3ManualSidebarClosed=false;document.body.classList.add('modern-v3-sidebar-collapsed');}
}
function modernV3SetActive(btn){
 document.querySelectorAll('#main-nav .nav-btn').forEach(b=>b.classList.remove('active'));
 if(btn&&btn.classList&&btn.classList.contains('nav-btn'))btn.classList.add('active');
}
function modernV3Navigate(screenId,event){
 if(typeof limparSelecaoAtletaCadastro==='function') limparSelecaoAtletaCadastro(false); else esconderTooltipAtletaCadastro();
 document.body.classList.add('app-v3-mode');modernV3EnsureMenu();modernV3SetActive(event&&event.currentTarget);
 // Módulos em modal: mantém a tela inicial ativa por trás e evita tela vazia ao fechar/cancelar.
 if(['convocacao','jogos','prancheta','relatorios'].includes(screenId)){
  modernV3PrepareHome();
  if(screenId==='convocacao') openConvocacaoModal();
  else if(screenId==='jogos') openJogosProfessorModal();
  else if(screenId==='prancheta') openPranchetaModal();
  else if(screenId==='relatorios') openRelatoriosMenuModal();
  modernV3AutoSidebar(screenId);
  return;
 }
 navigateTo(screenId,{target:event&&event.currentTarget});
 modernV3AutoSidebar(screenId);
}
function modernV3PrepareHome(){
 document.querySelectorAll('.screen').forEach(screen=>{screen.classList.remove('active-screen');screen.style.display='';});
 const home=document.getElementById('home-screen');if(home)home.classList.add('active-screen');
 const fichas=document.getElementById('fichas-treino-screen');if(fichas)fichas.style.display='none';
}
function modernV3VoltarInicio(){
 document.body.classList.add('app-v3-mode');
 modernV3EnsureMenu();
 modernV3PrepareHome();
 modernV3AutoSidebar('home');
 document.querySelectorAll('#main-nav .nav-btn').forEach(b=>b.classList.remove('active'));
 document.querySelector('#main-nav .modern-v3-home')?.classList.add('active');
 const main=document.querySelector('.main-content');if(main)main.scrollTo(0,0);
}
function modernV3Action(action,event){
 if(typeof limparSelecaoAtletaCadastro==='function') limparSelecaoAtletaCadastro(false); else esconderTooltipAtletaCadastro();
 document.body.classList.add('app-v3-mode');modernV3EnsureMenu();modernV3SetActive(event&&event.currentTarget);
 try{
  if(action==='fotos'){modernV3AutoSidebar('fotos');openFotosModal();return;}
  modernV3PrepareHome();
  modernV3AutoSidebar(action);
  if(action==='relatorio-fisico'){openRelatoriosModal();return;}
  if(action==='trabalho-diario'){openTrabalhoDiarioModal();return;}
  if(action==='planejamento'){openPlanejamentoSemanalModal();return;}
  if(action==='psr'){openRelatorioPsrPse('psr');return;}
  if(action==='pse'){openRelatorioPsrPse('pse');return;}
  if(action==='goleiros'){openGoleirosTecnicoModal();return;}
  if(action==='preparacao-fisica'){openPreparacaoFisicaQueixasModal();return;}
  if(action==='monitoramento-carga'){openMonitoramentoCargaModal();return;}
 }catch(e){console.error(e);alert('Não foi possível abrir este módulo.');}
}
function modernV3BuildHome(){
 const home=document.getElementById('home-screen');
 if(!home||home.dataset.modernV3Home==='1')return;
 home.dataset.modernV3Home='1';
 home.innerHTML=`<div class="modern-v3-dashboard">
  <section class="modern-v3-hero">
   <div><h1>CFA Prosol</h1><p>Gestão completa de atletas, performance, jogos, convocações e relatórios</p><div class="modern-v3-hero-reports"><button onclick="modernV3Action('relatorio-fisico',event)"><i>📊</i><strong>Relatório Físico</strong></button><button onclick="modernV3Action('trabalho-diario',event)"><i>📄</i><strong>Trabalho Diário</strong></button><button onclick="modernV3Action('planejamento',event)"><i>🗓️</i><strong>Planejamento</strong></button><button onclick="modernV3Action('psr',event)"><i>💚</i><strong>PSR</strong></button><button onclick="modernV3Action('pse',event)"><i>🔥</i><strong>PSE</strong></button><button onclick="modernV3Action('goleiros',event)"><i>🧤</i><strong>Goleiros</strong></button><button data-prep-alert="1" onclick="modernV3Action('preparacao-fisica',event)"><i>🩺</i><strong>Preparação Física</strong></button><button onclick="modernV3Action('monitoramento-carga',event)"><i>📈</i><strong>Monitoramento</strong></button></div></div>
   <img src="logo.png" alt="CFA Prosol">
  </section>
  <h3 class="modern-v3-block-title">Módulos principais</h3>
  <div class="modern-v3-grid">
   <button onclick="modernV3Navigate('atletas',event)"><i>👥</i><strong>Atletas</strong><small>Ficha, posições, edição e anotações.</small></button>
   <button onclick="modernV3Navigate('convocacao',event)"><i>📋</i><strong>Convocação</strong><small>Lista, campo e controle de convocados.</small></button>
   <button onclick="modernV3Navigate('jogos',event)"><i>⚽</i><strong>Jogos</strong><small>Jogos, estatísticas e relatórios.</small></button>
   <button onclick="modernV3Navigate('testes',event)"><i>🏃</i><strong>Testes físicos</strong><small>Avaliações físicas, dados e grupos.</small></button>
   <button onclick="modernV3Action('fotos',event)"><i>📸</i><strong>Fotos</strong><small>Galeria e fotos dos atletas.</small></button>
   <button onclick="modernV3Navigate('prancheta',event)"><i>📐</i><strong>Prancheta</strong><small>Organização tática virtual.</small></button>
  </div>
 </div>`;
 renderIndicadorPreparacaoFisica();
 atualizarIndicadorPreparacaoFisica();
}

function modernV3AnyModalOpen(){
 const selectors=['.escalacao-overlay','.relatorios-menu-overlay','.trabalho-diario-overlay','.trabalho-atletas-overlay','.relatorio-visualizacao-overlay','.rpp-overlay','.rpp-extra-overlay','.vba-modal-overlay','#convocacao-modal','#prancheta-modal','#jogos-professor-modal','#relatorios-modal','#trabalho-diario-modal','#planejamento-semanal-modal','#fotos-atletas-modal'];
 return selectors.some(sel=>Array.from(document.querySelectorAll(sel)).some(el=>{
  const st=getComputedStyle(el);
  return st.display!=='none' && st.visibility!=='hidden' && st.opacity!=='0';
 }));
}
function modernV3RestoreSidebarIfHomeFree(){
 setTimeout(()=>{
  if(modernV3IsHomeActive() && !modernV3AnyModalOpen() && !modernV3ManualSidebarClosed && !modernV3IsMobileViewport()) document.body.classList.remove('modern-v3-sidebar-collapsed');
 },160);
}
document.addEventListener('click',modernV3RestoreSidebarIfHomeFree,true);

function modernV3FecharModaisAbertos(){
 const ids=['jogos-professor-modal','prancheta-modal','convocacao-modal','relatorios-modal','relatorios-menu-modal','trabalho-diario-modal','planejamento-semanal-modal','fotos-atletas-modal','detalhes-jogo-salvo-modal','novo-jogo-modal','atletas-ativos-jogos-modal','carregar-jogo-salvo-modal','campo-convocacao-modal','add-athlete-modal','modal-anotacoes','fichaModal','controle-peso-modal','relatorio-psrpse-modal','relatorio-visualizacao-modal'];
 ids.forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
 document.querySelectorAll('.escalacao-overlay,.vba-modal-overlay,.mini-prancheta-overlay,.fotos-overlay').forEach(el=>{el.style.display='none';});
}
function modernV3HistoryInit(){
 if(window.__modernV3HistoryReady || !window.history || !history.pushState)return;
 window.__modernV3HistoryReady=true;
 try{
  history.replaceState({prosolBase:true},'',location.href);
  history.pushState({prosolApp:true},'',location.href);
 }catch(e){console.warn('Histórico indisponível:',e);return;}
 window.addEventListener('popstate',()=>{
  if(!document.body.classList.contains('app-v3-mode'))return;
  modernV3FecharModaisAbertos();
  modernV3VoltarInicio();
  setTimeout(()=>{try{history.pushState({prosolApp:true},'',location.href);}catch(e){}},0);
 });
}
window.addEventListener('resize',()=>{if(document.body.classList.contains('app-v3-mode')) modernV3AutoSidebar(modernV3IsHomeActive()?'home':'modulo');});
if(document.readyState==='loading'){
 document.addEventListener('DOMContentLoaded',()=>{modernV3EnsureMenu();modernV3BuildHome();});
}else{modernV3EnsureMenu();modernV3BuildHome();}
