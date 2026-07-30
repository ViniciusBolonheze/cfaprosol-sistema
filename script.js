const SUPABASE_URL = 'https://jrudgjopfxfyyhnvgidz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VScGEvhYLgQSDGll2IQIsw_bsTQXRCO';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
let currentPfTab = 'antropometricas';
let selectedConvocados = new Set();

// Variável de controle para os Grupos
let gruposData = {
    'Grupo 1': [], 'Grupo 2': [], 'Grupo 3': [], 'Grupo 4': [], 'Grupo 5': [], 'Grupo 6': []
};
// Variável global para armazenar os exercícios que vêm do banco de dados
let exerciciosSalvosNaNuvem = {};
async function loadFromStorage() {
    try {
        const { data, error } = await _supabase.from('sistema_config').select('colunas, dados').eq('id', 1).single();
        if (!error && data) {
            if (data.colunas && data.colunas.length > 0) excelColumns = data.colunas;
            if (data.dados && data.dados.length > 0) excelData = data.dados;
        }
    } catch (err) { console.error('Erro de conexão:', err); }

    const savedConvocacao = localStorage.getItem(STORAGE_CONVOCACAO_KEY);
    if (savedConvocacao) {
        try { selectedConvocados = new Set(JSON.parse(savedConvocacao)); } catch(e) {}
    }

    initExcelTable();
    populateEvalSelect(); 
    ensureTestAddButton();
    ensureCalculadoraButton();
    ensureGruposButton(); // Inicializa o novo botão flutuante
    ensureConvocacaoModalDom();
    ensurePrintStyles();
    initGruposFilter(); // Inicializa checkboxes da aba de grupos
}

async function saveToStorage() {
    try {
        await _supabase.from('sistema_config').update({
            colunas: excelColumns, dados: excelData, atualizado_em: new Date()
        }).eq('id', 1);
    } catch (err) { console.error('Erro ao salvar:', err); }
}

document.addEventListener("DOMContentLoaded", () => { loadFromStorage(); });

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
    document.getElementById('login-screen').classList.remove('active-screen');
    document.getElementById('home-screen').classList.add('active-screen');
    document.getElementById('main-nav').style.display = 'flex';
    document.getElementById('yellow-bar-nav').style.display = 'block';
}

function navigateTo(screenId, event) {
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

        const itemDiv = document.createElement('div');
        itemDiv.className = 'athlete-item' + (selectedAthleteIndex === globalIndex ? ' selected' : '');
        if(selectedAthleteIndex === globalIndex) { itemDiv.style.backgroundColor = '#0984e3'; itemDiv.style.color = '#fff'; }
        
        // 3. Insere o nome junto com os ícones (ficha e/ou cruz vermelha)
        itemDiv.innerHTML = `<span>${nomeExibicao} ${iconeFicha} ${iconeLesao}</span> <span>${anoAtleta}</span>`;
        
        itemDiv.onclick = () => { selectedAthleteIndex = globalIndex; renderAtletasScreen(); };
        if (posLists[targetBox]) posLists[targetBox].appendChild(itemDiv);
    });
}

function deleteSelectedAthlete() {
    if (selectedAthleteIndex === null) { alert('Selecione um atleta na lista.'); return; }
    if (confirm('Deseja realmente excluir o atleta?')) { excelData.splice(selectedAthleteIndex, 1); selectedAthleteIndex = null; saveToStorage(); renderAtletasScreen(); }
}
function openAddAthleteModal() { uploadedPhotoBase64 = ''; document.getElementById('athlete-form').reset(); document.getElementById('add-athlete-modal').style.display = 'flex'; }
function closeAddAthleteModal() { document.getElementById('add-athlete-modal').style.display = 'none'; }
function previewAthletePhoto(input) {
    if (input.files && input.files[0]) { document.getElementById('file-label-text').textContent = input.files[0].name; const reader = new FileReader(); reader.onload = function(e) { uploadedPhotoBase64 = e.target.result; }; reader.readAsDataURL(input.files[0]); }
}
function saveNewAthlete(event) {
    event.preventDefault();
    let newRow = {}; excelColumns.forEach(col => { newRow[col] = ''; });
    newRow['Ano'] = document.getElementById('add-ano').value; newRow['NOME COMPLETO'] = document.getElementById('add-nome').value; newRow['APELIDO'] = document.getElementById('add-apelido').value; newRow['Data de nascimento'] = document.getElementById('add-nascimento').value; newRow['Posição 1'] = document.getElementById('add-posicao').value; newRow['CIDADE'] = document.getElementById('add-cidade').value; newRow['Contato'] = document.getElementById('add-contato').value; newRow['RG'] = document.getElementById('add-rg').value; newRow['Foto'] = uploadedPhotoBase64;
    excelData.push(newRow); saveToStorage(); closeAddAthleteModal(); renderAtletasScreen();
    alert('Salvo com sucesso!');
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
function renderTabelaAntropometrica(evalNum, selectedYear, headerRow, tbody) {
    const colunas = [
        ['Ano','ano'], ['NOME COMPLETO','nome'], ['DATA NASCIMENTO','nascimento'],
        ['DATA AVALIAÇÃO','data'], ['IDADE','idade'], ['ALTURA','altura'],
        ['ALT. SENTADO','sentado'], ['ALTURA PREDITA','predita'], ['PESO','peso'],
        ['SBE','sbe'], ['TRI','tri'], ['SPI','spi'], ['ABD','abd'],
        ['SOMA DOBRAS','soma'], ['% DE GORDURA','gordura']
    ];
    colunas.forEach(c => { const th=document.createElement('th'); th.textContent=c[0]; if(c[1]==='predita'||c[1]==='idade'||c[1]==='soma'||c[1]==='gordura') th.style.color='#168a32'; headerRow.appendChild(th); });
    excelData.forEach((row,rowIndex)=>{
        const ano=String(valorColunaExata(row,'Ano')||'').trim(); if(selectedYear!=='todos'&&ano!==selectedYear)return;
        const nascimento=convertExcelDate(valorColunaExata(row,'Data de nascimento'));
        const dataAval=convertExcelDate(valorAvaliacao(row,'Data',evalNum));
        const nums=['Dobras1_','Dobras2_','Dobras3_','Dobras4_'].map(b=>parseFloat(String(valorAvaliacao(row,b,evalNum)).replace(',','.'))||0);
        const soma=nums.reduce((a,b)=>a+b,0);
        const gordura=((soma*0.153+5.783)/100);
        const gorduraTexto=(gordura*100).toFixed(2).replace('.',',')+'%';
        const gorduraKey='PercentualGordura'+evalNum;
        if (row[gorduraKey] !== gordura) { row[gorduraKey]=gordura; }
        const valores={ano,nome:valorColunaExata(row,'NOME COMPLETO'),nascimento,data:dataAval,idade:calcularIdadeAvaliacao(nascimento,dataAval),altura:valorAvaliacao(row,'Altura',evalNum),sentado:valorAvaliacao(row,'alturasentado',evalNum),predita:(()=>{const r=alturaPreditaCalculada(calcularIdadeAvaliacao(nascimento,dataAval).replace(',','.'),parseFloat(String(valorAvaliacao(row,'peso',evalNum)).replace(',','.'))||0,parseFloat(String(valorAvaliacao(row,'Altura',evalNum)).replace(',','.'))||0,parseFloat(String(valorAvaliacao(row,'alturasentado',evalNum)).replace(',','.'))||0);return r.valor?(Math.floor(r.valor)/100).toFixed(2).replace('.',',')+' m':'-'})(),peso:valorAvaliacao(row,'peso',evalNum),sbe:nums[0]||'',tri:nums[1]||'',spi:nums[2]||'',abd:nums[3]||'',soma:soma ? soma.toFixed(1).replace('.',',') : '',gordura:gorduraTexto};
        const tr=document.createElement('tr');
        colunas.forEach((c,i)=>{const td=document.createElement('td'), key=c[1], fixed=['idade','predita','soma','gordura'].includes(key); if(key==='ano'||key==='nome'||key==='nascimento'){td.textContent=valores[key];td.style.background='#f4f6f7';}else if(fixed){td.textContent=valores[key];td.style.background='#e8f5e9';td.style.fontWeight='bold';}else{const input=document.createElement('input');input.type='text';input.value=valores[key];input.onchange=e=>{let base={data:'Data',altura:'Altura',sentado:'alturasentado',peso:'peso',sbe:'Dobras1_',tri:'Dobras2_',spi:'Dobras3_',abd:'Dobras4_'}[key];if(base){const k=base+evalNum;excelData[rowIndex][k]=e.target.value;saveToStorage();renderPfTable();}};td.appendChild(input);}tr.appendChild(td);}); tbody.appendChild(tr);
    });
    saveToStorage();
}

function renderPfTable() {
    const headerRow = document.getElementById('pf-header-row'); const tbody = document.getElementById('pf-tbody');
    if (!headerRow || !tbody) return; headerRow.innerHTML = ''; tbody.innerHTML = '';
    const evalNum = document.getElementById('pf-eval-select') ? document.getElementById('pf-eval-select').value : '1';
    const selectedYear = document.getElementById('pf-year-select') ? document.getElementById('pf-year-select').value : 'todos';
    if (currentPfTab === 'antropometricas') { renderTabelaAntropometrica(evalNum, selectedYear, headerRow, tbody); return; }

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

    excelData.forEach((row, rowIndex) => {
        let anoAtleta = Object.keys(row).find(k => k.toLowerCase() === 'ano'); anoAtleta = anoAtleta ? String(row[anoAtleta]).trim() : '';
        if (selectedYear !== 'todos' && anoAtleta !== selectedYear) return;
        const tr = document.createElement('tr');
        colsToDisplay.forEach(col => {
            const td = document.createElement('td');
            let val = row[col] !== undefined ? row[col] : (row[Object.keys(row).find(k => k.toLowerCase() === col.toLowerCase())] || '');
            if (col.toLowerCase().includes('data') || col.toLowerCase().includes('nascimento')) val = convertExcelDate(val);
            if (['Ano', 'NOME COMPLETO', 'Data de nascimento'].includes(col)) { td.textContent = val; td.style.backgroundColor = '#f4f6f7'; td.style.fontWeight = '600'; }
            else {
                const input = document.createElement('input'); input.type = 'text'; input.value = val;
                input.onchange = (e) => { excelData[rowIndex][Object.keys(row).find(k => k.toLowerCase() === col.toLowerCase()) || col] = e.target.value; saveToStorage(); };
                td.appendChild(input);
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
                        <td rowspan="3" class="side-label">MMI</td>
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
                        <td rowspan="3" class="side-label">Protocolo</td>
                        <td class="proto-header"><input type="text" value="Remada baixa"></td>
                        <td class="proto-header"><input type="text" value="Supino com elevação pélvica"></td>
                        <td class="proto-header"><input type="text" value="Remada serrote"></td>
                        <td class="proto-header"><input type="text" value="Abd remador"></td>
                        <td class="proto-header"><input type="text" value="Dumbbell Snatch"></td>
                        <td class="proto-header"><input type="text" value="Flexão"></td>
                    </tr>
                    <tr>
                        <td colspan="6" class="proto-banner">
                            Chegar ANTES ou ficar APÓS para realizar os PROTOCOLOS (Atletas marcados, deverão realizar)
                        </td>
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
                        <td rowspan="2" class="side-label">HIIT</td>
                        <td class="hiit-header"><input type="text" value="AGACHAMENTO COM SALTO"></td>
                        <td class="hiit-header"><input type="text" value="AVANÇO COM SALTO"></td>
                        <td class="hiit-header"><input type="text" value="POLICHINELO"></td>
                        <td class="hiit-header"><input type="text" value="ABDOMINAL"></td>
                        <td class="hiit-header"><input type="text" value="FLEXÃO"></td>
                        <td class="hiit-header"><input type="text" value="BURPEE"></td>
                    </tr>
                    <tr>
                        <td colspan="6" class="hiit-footer">
                            <input type="text" value="20 SEG. CADA EXERCÍCIO" style="font-weight: bold; text-align: center;">
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
                const inputs = card.querySelectorAll('input');
                const valoresSalvos = exerciciosSalvosNaNuvem[index];
                if (valoresSalvos && inputs) {
                    inputs.forEach((input, i) => {
                        if (valoresSalvos[i] !== undefined) {
                            input.value = valoresSalvos[i];
                            input.setAttribute('value', valoresSalvos[i]); // Fixa no HTML
                        }
                    });
                }
            });
        }
        // ==========================================

        document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
        document.getElementById('fichas-treino-screen').style.display = 'block';
        window.scrollTo(0, 0);

        // -> SALVA AUTOMATICAMENTE NO SUPABASE APÓS GERAR AS FICHAS
        salvarNoSupabase();
}

function voltarParaGrupos() {
    document.getElementById('fichas-treino-screen').style.display = 'none';
    document.getElementById('grupos-screen').style.display = 'block';
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
            const cols = tr.querySelectorAll('td');
            return cols.length >= 2 ? cols[1]?.textContent?.trim() : '';
        }).filter(nome => nome !== '');

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
                gData.atletas.forEach(nomeAtleta => {
                    const idx = excelData.findIndex(row => {
                        let apelido = Object.keys(row).find(k => k.toLowerCase().includes('apelido'));
                        let nome = Object.keys(row).find(k => k.toLowerCase().includes('nome'));
                        let valApelido = apelido && row[apelido] ? String(row[apelido]).trim() : '';
                        let valNome = nome && row[nome] ? String(row[nome]).trim() : '';
                        return valApelido === nomeAtleta || valNome === nomeAtleta;
                    });

                    if (idx !== -1) {
                        gruposData[gData.nomeGrupo].push({ index: idx, manualData: {} });
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


// 2. COLE O BLOCO ABAIXO LÁ NO FINAL DO SEU ARQUIVO JS:
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
            
            const tdAction = document.createElement('td');
            tdAction.innerHTML = `<button style="background:none; border:none; color:#e53935; cursor:pointer;" onclick="removerAtletaDoGrupo('${grupoNome}', ${item.index})"><i class="fa-solid fa-trash"></i></button>`;
            
            const tdNome = document.createElement('td'); tdNome.textContent = nomeExibicao; tdNome.style.fontWeight = 'bold';
            const tdAno = document.createElement('td'); tdAno.textContent = anoAtleta;

            const createInputCell = (field, value) => {
                const td = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'text';
                input.value = value;
                input.onchange = (e) => {
                    gruposData[grupoNome][arrIndex].manualData[field] = e.target.value;
                };
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
                    <div>
                        <button onclick="confirmarConvocacao()" style="padding: 10px 25px; border: none; background: #2ed573; color: #fff; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">Confirmar Convocação</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}
function openConvocacaoModal() { ensureConvocacaoModalDom(); renderConvocacaoScreen(); document.getElementById('convocacao-modal').style.display = 'flex'; }
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
function renderConvocacaoLists() {
    const selectedYears = Array.from(document.querySelectorAll('.conv-year-chk:checked')).map(chk => chk.value);
    const posLists = { 'goleiros': document.getElementById('conv-list-goleiros'), 'zagueiros': document.getElementById('conv-list-zagueiros'), 'laterais': document.getElementById('conv-list-laterais'), 'volantes': document.getElementById('conv-list-volantes'), 'meias': document.getElementById('conv-list-meias'), 'atacantes': document.getElementById('conv-list-atacantes'), 'extremos': document.getElementById('conv-list-extremos') };
    for (let key in posLists) { if (posLists[key]) posLists[key].innerHTML = ''; }

    document.querySelectorAll('.drop-box').forEach(box => {
        const cat = box.getAttribute('data-category');
        box.ondragover = (e) => e.preventDefault();
        box.ondrop = (e) => { e.preventDefault(); const globalIndex = parseInt(e.dataTransfer.getData('text/plain')); if (!isNaN(globalIndex)) handleAthleteDrop(globalIndex, cat); };
    });

    if (selectedYears.length === 0) return;

    excelData.forEach((row, globalIndex) => {
        let anoAtleta = Object.keys(row).find(k => k.toLowerCase() === 'ano'); anoAtleta = anoAtleta ? String(row[anoAtleta]).trim() : '';
        if (!selectedYears.includes(anoAtleta)) return;

        let nomeExibicao = Object.keys(row).find(k => k.toLowerCase().includes('apelido')); nomeExibicao = nomeExibicao && row[nomeExibicao] ? row[nomeExibicao] : '';
        if (!nomeExibicao) { let nm = Object.keys(row).find(k => k.toLowerCase().includes('nome')); nomeExibicao = nm && row[nm] ? row[nm] : 'Sem Nome'; }
        
        let posicao = Object.keys(row).find(k => k.toLowerCase().includes('posição') || k.toLowerCase().includes('posicao'));
        posicao = posicao ? String(row[posicao]).toLowerCase() : '';
        
        let targetBox = 'meias';
        if (posicao.includes('goleiro')) targetBox = 'goleiros'; else if (posicao.includes('zagueiro')) targetBox = 'zagueiros'; else if (posicao.includes('lateral')) targetBox = 'laterais'; else if (posicao.includes('volante')) targetBox = 'volantes'; else if (posicao.includes('atacante')) targetBox = 'atacantes'; else if (posicao.includes('extremo') || posicao.includes('ponta')) targetBox = 'extremos';

        const itemDiv = document.createElement('div');
        itemDiv.draggable = true; itemDiv.style.cssText = 'padding: 6px 8px; cursor: grab; display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px solid #f1f1f1; user-select: none;';
        itemDiv.ondragstart = (e) => { e.dataTransfer.setData('text/plain', globalIndex); };
        if (selectedConvocados.has(globalIndex)) { itemDiv.style.backgroundColor = '#0984e3'; itemDiv.style.color = '#fff'; }
        itemDiv.innerHTML = `<span>${nomeExibicao}</span> <span style="font-size: 11px; opacity: 0.8;">${anoAtleta}</span>`;
        itemDiv.onclick = (e) => {
            e.stopPropagation();
            if (selectedConvocados.has(globalIndex)) { selectedConvocados.delete(globalIndex); itemDiv.style.backgroundColor = 'transparent'; itemDiv.style.color = '#000'; }
            else { selectedConvocados.add(globalIndex); itemDiv.style.backgroundColor = '#0984e3'; itemDiv.style.color = '#fff'; }
        };
        if (posLists[targetBox]) posLists[targetBox].appendChild(itemDiv);
    });
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
    modal.innerHTML = `<div class="escalacao-card"><div class="escalacao-header"><span>ESCALAÇÃO DA CONVOCAÇÃO</span><button onclick="fecharEscalacaoConvocacao()">×</button></div><p class="escalacao-help">Defina o número e indique se cada atleta é titular ou reserva.</p><div class="escalacao-list">${atletas.map((a,i) => { const v=salvo[a.index]||{}; return `<div class="escalacao-row posicao-${a.ordem}"><span class="escalacao-name">${a.nome}</span><input class="escalacao-numero" data-index="${a.index}" value="${v.numero||''}" placeholder="#" type="number" min="1" max="99"><label><input type="radio" name="status-${a.index}" value="titular" ${v.status!=='reserva'?'checked':''}> Titular</label><label><input type="radio" name="status-${a.index}" value="reserva" ${v.status==='reserva'?'checked':''}> Reserva</label></div>`; }).join('')}</div><div class="escalacao-footer"><span id="escalacao-status"></span><button class="escalacao-field" onclick="salvarEscalacaoConvocacao(); abrirCampoConvocacao()">Confirmar e abrir campo</button></div></div>`;
    modal.style.display = 'flex';
    atualizarStatusEscalacao();
}
function atualizarStatusEscalacao() {
    const el=document.getElementById('escalacao-status'); if(!el)return;
    const titulares=document.querySelectorAll('#escalacao-convocacao-modal input[type="radio"][value="titular"]:checked').length;
    const reservas=document.querySelectorAll('#escalacao-convocacao-modal input[type="radio"][value="reserva"]:checked').length;
    el.textContent=`Titulares: ${titulares}  |  Reservas: ${reservas}`;
}
function salvarEscalacaoConvocacao() {
    const dados={};
    document.querySelectorAll('#escalacao-convocacao-modal .escalacao-row').forEach(row=>{const input=row.querySelector('.escalacao-numero');const idx=input.dataset.index;const radio=row.querySelector('input[type="radio"]:checked');dados[idx]={numero:input.value,status:radio?radio.value:'titular'};});
    localStorage.setItem('prosol_cfa_escalacao_v1',JSON.stringify(dados));
    atualizarStatusEscalacao();
    alert('Escalação salva com sucesso!');
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
document.addEventListener('DOMContentLoaded', () => {
    // Carrega automaticamente ao mudar a categoria
    const catSelect = document.getElementById('grupo-categoria-select');
    if (catSelect) {
        catSelect.addEventListener('change', async () => {
            await carregarDoSupabase();
        });
    }

    // Salva ao clicar no botão "Salvar Ficha"
    const btnSalvar = document.getElementById('btn-salvar-ficha');
    if (btnSalvar) {
        btnSalvar.addEventListener('click', async () => {
            await salvarNoSupabase();
        });
    }
});r('DOMContentLoaded', () => {
    // Carrega automaticamente ao mudar a categoria
    const catSelect = document.getElementById('grupo-categoria-select');
    if (catSelect) {
        catSelect.addEventListener('change', async () => {
            await carregarDoSupabase();
        });
    }

    // Salva ao clicar no botão "Salvar Ficha"
    const btnSalvar = document.getElementById('btn-salvar-ficha');
    if (btnSalvar) {
        btnSalvar.addEventListener('click', async () => {
            await salvarNoSupabase();
        });
    }
});
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

/* === PRANCHETA TÁTICA VIRTUAL === */
const sistemasTaticos = {
 '4-3-3': [[8,50],[24,18],[24,39],[24,61],[24,82],[48,25],[48,50],[48,75],[76,18],[82,50],[76,82]],
 '4-4-2': [[8,50],[24,18],[24,39],[24,61],[24,82],[48,15],[48,38],[48,62],[48,85],[78,38],[78,62]],
 '4-2-3-1': [[8,50],[24,18],[24,39],[24,61],[24,82],[43,35],[43,65],[62,18],[62,50],[62,82],[82,50]],
 '3-5-2': [[8,50],[25,28],[25,50],[25,72],[48,12],[48,32],[48,50],[48,68],[48,88],[78,38],[78,62]],
 '3-4-3': [[8,50],[25,28],[25,50],[25,72],[48,20],[48,40],[48,60],[48,80],[78,18],[82,50],[78,82]],
 '5-3-2': [[8,50],[24,12],[24,31],[24,50],[24,69],[24,88],[50,28],[50,50],[50,72],[80,38],[80,62]],
 '4-1-4-1': [[8,50],[24,18],[24,39],[24,61],[24,82],[42,50],[61,15],[61,38],[61,62],[61,85],[82,50]]
};
function renderPranchetaVirtual() {
 const box=document.getElementById('prancheta-content') || document.getElementById('generic-content'); if(!box)return;
 box.innerHTML=`<div class="board-toolbar"><strong>PRANCHETA TÁTICA</strong><label>Sistema: <select id="tactical-system">${Object.keys(sistemasTaticos).map(s=>`<option>${s}</option>`).join('')}</select></label><button onclick="resetPrancheta()">Restaurar</button><button onclick="clearPrancheta()">Limpar</button><button onclick="closePranchetaModal();navigateTo('home',event)">Voltar</button></div><div class="board-wrap"><div id="football-board"><div class="half-line"></div><div class="center-circle"></div><div class="goal top"></div><div class="goal bottom"></div><div id="board-players"></div></div></div><p class="board-tip">Arraste os jogadores para montar sua estratégia. Clique duas vezes no botão para renomeá-lo.</p>`;
 document.getElementById('tactical-system').onchange=resetPrancheta; resetPrancheta();
}
function resetPrancheta(){const area=document.getElementById('board-players'), sel=document.getElementById('tactical-system');if(!area||!sel)return;area.innerHTML='';(sistemasTaticos[sel.value]||[]).forEach((p,i)=>{const b=document.createElement('button');b.className='tactical-player';b.textContent=i===0?'G':String(i);b.title='Arraste para mover';b.style.left=p[0]+'%';b.style.top=p[1]+'%';makeTacticalDraggable(b);b.ondblclick=()=>{const n=prompt('Nome ou função do jogador:',b.textContent);if(n)b.textContent=n};area.appendChild(b)});}
function clearPrancheta(){const a=document.getElementById('board-players');if(a)a.innerHTML='';}
function makeTacticalDraggable(el){let drag=false;const move=e=>{if(!drag)return;const r=el.parentElement.getBoundingClientRect();let x=(e.clientX-r.left)/r.width*100,y=(e.clientY-r.top)/r.height*100;el.style.left=Math.max(3,Math.min(97,x))+'%';el.style.top=Math.max(3,Math.min(97,y))+'%'};el.onpointerdown=e=>{drag=true;el.setPointerCapture(e.pointerId);el.classList.add('dragging')};el.onpointermove=move;el.onpointerup=()=>{drag=false;el.classList.remove('dragging')};}


/* Prancheta virtual em janela modal independente */
function openPranchetaModal() {
    let modal = document.getElementById('prancheta-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'prancheta-modal';
        modal.className = 'prancheta-modal-overlay';
        modal.innerHTML = '<div class="prancheta-modal-box"><div id="prancheta-content"></div></div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', function(e) { if (e.target === modal) closePranchetaModal(); });
    }
    modal.style.display = 'flex';
    renderPranchetaVirtual();
}
function closePranchetaModal() {
    const modal = document.getElementById('prancheta-modal');
    if (modal) modal.style.display = 'none';
}

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
 modal.innerHTML=`<div class="campo-card"><div class="campo-top"><b>CONVOCAÇÃO — ESCALAÇÃO</b><div class="campo-acoes"><button onclick="salvarConvocacaoNuvem()">💾 Salvar Convocação</button><button onclick="imprimirConvocacaoCampo()">🖨 Imprimir</button><button onclick="exportarConvocacaoPDF()">📄 Exportar PDF</button><button onclick="fecharCampoConvocacao()">×</button></div></div><div class="campo-layout"><aside><h3>SUPLENTES</h3><div class="campo-reservas">${reservas.map(i=>{const r=excelData[i]||{};const nk=Object.keys(r).find(k=>k.toLowerCase().includes('apelido'))||Object.keys(r).find(k=>k.toLowerCase().includes('nome'));const dataKey=Object.keys(r).find(k=>k.toLowerCase().includes('nascimento')); const nascimento=dataKey?convertExcelDate(r[dataKey]):''; return `<div class="reserva-item"><span>${salvo[i].numero||''} - ${nk&&r[nk]||'Sem Nome'}</span><span class="reserva-data">${nascimento}</span></div>`}).join('')}</div><h3>COMISSÃO TÉCNICA</h3><label class="comissao-label">Técnico:<input class="campo-edit" placeholder=""></label><label class="comissao-label">Aux. Técnico:<input class="campo-edit" placeholder=""></label><label class="comissao-label">Prep. Físico:<input class="campo-edit" placeholder=""></label><label class="comissao-label">Trein. Goleiros:<input class="campo-edit" placeholder=""></label></aside><main><div class="campo-futebol"><div class="linha-meio"></div><div class="circulo-meio"></div>${titulares.map((a,i)=>`<div class="jogador-campo" style="left:${posicaoInicialCampo(a.num,i)[0]}%;top:${posicaoInicialCampo(a.num,i)[1]}%" data-x=""><img src="${a.pos.includes('goleiro')?'camiseta_goleiro.png':'camiseta_linha.png'}"><span>${a.num} ${a.nome}<small>${a.nascimento}</small></span></div>`).join('')}</div><div class="campo-detalhes"><div class="campo-faixa"><input placeholder="Horário"><span> - </span><input placeholder="Local"><span> - </span><input placeholder="Data"></div><div class="campo-info-jogo"><div class="campo-adversario"><img src="logo.png"><b>×</b><input placeholder="Nome do adversário"></div><div class="campo-horarios"><label>Apresentação: <input placeholder=""></label><label>Preleção: <input placeholder=""></label><label>Aquecimento: <input placeholder=""></label></div></div></div></main></div></div>`;
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
 document.body.classList.add('imprimindo-campo');
 const limpar=()=>{document.body.classList.remove('imprimindo-campo');window.removeEventListener('afterprint',limpar)};
 window.addEventListener('afterprint',limpar);window.print();setTimeout(limpar,1500);
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
 const dados={nome,anos,selecionados:[...selectedConvocados],escalacao:salvo,jogadores,comissao,horario:faixa[0]||'',local:faixa[1]||'',data:faixa[2]||'',adversario:document.querySelector('#campo-convocacao-modal .campo-adversario input')?.value||'',apresentacao:horarios[0]||'',prelecao:horarios[1]||'',aquecimento:horarios[2]||''};
 const {error}=await _supabase.from('convocacoes').upsert({nome,dados,atualizado_em:new Date().toISOString()},{onConflict:'nome'});if(error){alert('Erro ao salvar convocação.');console.error(error);return;}document.getElementById('salvar-convocacao-modal').style.display='none';alert('Convocação salva com sucesso!');
}


async function confirmarCarregamentoConvocacao(){
 const select=document.getElementById('convocacao-para-carregar');if(!select||!select.value)return alert('Selecione uma convocação.');
 const {data,error}=await _supabase.from('convocacoes').select('nome,dados').eq('nome',select.value).single();
 if(error||!data){alert('Não foi possível carregar a convocação.');return;}
 const d=data.dados||{};window.__convocacaoCarregada=d;selectedConvocados=new Set(d.selecionados||[]);localStorage.setItem(STORAGE_CONVOCACAO_KEY,JSON.stringify([...selectedConvocados]));localStorage.setItem('prosol_cfa_escalacao_v1',JSON.stringify(d.escalacao||{}));
 document.querySelectorAll('.conv-year-chk').forEach(c=>c.checked=(d.anos||[]).includes(c.value));renderConvocacaoLists();document.getElementById('carregar-convocacao-modal').style.display='none';abrirEscalacaoConvocacao();
}

async function abrirExcluirConvocacaoModal(){
 const {data,error}=await _supabase.from('convocacoes').select('nome').order('nome');
 if(error){alert('Erro ao consultar convocações.');return;} if(!data||!data.length){alert('Nenhuma convocação salva.');return;}
 let m=document.getElementById('excluir-convocacao-modal');if(!m){m=document.createElement('div');m.id='excluir-convocacao-modal';m.className='escalacao-overlay';document.body.appendChild(m);}
 m.innerHTML=`<div class="excluir-card"><h3>Excluir convocação</h3><select id="convocacao-para-excluir" size="8">${data.map(x=>`<option value="${x.nome.replace(/"/g,'&quot;')}">${x.nome}</option>`).join('')}</select><div><button onclick="excluirConvocacaoSelecionada()">Excluir</button><button onclick="document.getElementById('excluir-convocacao-modal').style.display='none'">Cancelar</button></div></div>`;m.style.display='flex';
}
async function excluirConvocacaoSelecionada(){const s=document.getElementById('convocacao-para-excluir');if(!s||!s.value)return alert('Selecione uma convocação.');if(!confirm('Excluir '+s.value+' permanentemente?'))return;const {error}=await _supabase.from('convocacoes').delete().eq('nome',s.value);if(error){alert('Erro ao excluir.');return;}document.getElementById('excluir-convocacao-modal').style.display='none';alert('Convocação excluída.');}
