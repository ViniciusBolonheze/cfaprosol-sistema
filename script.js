const SUPABASE_URL = 'https://jrudgjopfxyyhnvgidz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VScGEvhYLgQSDGll2IQIsw_bsTQXRCO'; 

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STORAGE_CONVOCACAO_KEY = 'prosol_cfa_convocacao_v1';

let defaultColumns = [
    'Ano', 'NOME COMPLETO', 'APELIDO', 'Data de nascimento', 'Posição 1', 'Posição 2', 'CIDADE', 'Contato', 'RG', 'Foto', 
    'AVALIAÇÃO1', 'Data1', 'Altura1', 'alturasentado1', 'peso1', 'Dobras1_1', 'Dobras2_1', 'Dobras3_1', 'Dobras4_1', 'PercentualGordura1', 'alturapredita1', 'nivel1', 'distancia1', 'Salto1_1', 'Salto2_1', 'Salto3_1', 'MelhorSalto1', 'aceleração1_1', 'velocidade1_1', 'aceleração2_2', 'velocidade2_1', 'aceleração3_1', 'velocidade3_1', 'aceleração4_1', 'velocidade4_1', 'aceleração5_1', 'velocidade5_1', 'aceleração6_1', 'velocidade6_1', 'aceleração7_1', 'velocidade7_1', 'Aceleraçãofinal1', 'Velocidadefinal1', 'Volta1_1', 'Volta2_1', 'Agilidade1', 
    'AVALIAÇÃO2', 'Data2', 'Altura2', 'alturasentado2', 'peso2', 'Dobras1_2', 'Dobras2_2', 'Dobras3_2', 'Dobras4_2', 'PercentualGordura2', 'alturapredita2', 'nivel2', 'distancia2', 'Salto1_2', 'Salto2_2', 'Salto3_2', 'MelhorSalto2', 'aceleração1_2', 'velocidade1_2', 'aceleração2_2', 'velocidade2_2', 'aceleração3_2', 'velocidade3_2', 'aceleração4_2', 'velocidade4_2', 'aceleração5_2', 'velocidade5_2', 'aceleração6_2', 'velocidade6_2', 'aceleração7_2', 'velocidade7_2', 'Aceleraçãofinal2', 'Velocidadefinal2', 'Volta1_2', 'Volta2_2', 'Agilidade2'
];

let defaultData = [
    {
        'Ano': '2010', 'NOME COMPLETO': 'Bernardo Delgado Alaver Barroso', 'APELIDO': 'Bernardo', 'Data de nascimento': '23/02/2010', 'Posição 1': 'Volante', 'Posição 2': '1º volante', 'CIDADE': 'Londrina', 'Contato': '(43) 99999-0000', 'RG': '138052478', 'Foto': '',
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

async function loadFromStorage() {
    try {
        const { data, error } = await _supabase
            .from('sistema_config')
            .select('colunas, dados')
            .eq('id', 1)
            .single();

        if (error) {
            console.error('Erro ao carregar do Supabase:', error);
        } else if (data) {
            if (data.colunas && data.colunas.length > 0) excelColumns = data.colunas;
            if (data.dados && data.dados.length > 0) excelData = data.dados;
        }
    } catch (err) {
        console.error('Erro de conexão:', err);
    }

    const savedConvocacao = localStorage.getItem(STORAGE_CONVOCACAO_KEY);
    if (savedConvocacao) {
        try { selectedConvocados = new Set(JSON.parse(savedConvocacao)); } catch(e) {}
    }

    initExcelTable();
    ensureTestAddButton();
    ensureConvocacaoModalDom();
    ensurePrintStyles();
}

async function saveToStorage() {
    try {
        const { error } = await _supabase
            .from('sistema_config')
            .update({
                colunas: excelColumns,
                dados: excelData,
                atualizado_em: new Date()
            })
            .eq('id', 1);

        if (error) {
            console.error('Erro ao salvar no Supabase:', error);
        }
    } catch (err) {
        console.error('Erro ao salvar:', err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadFromStorage();
});

/* === ESTILOS E FUNÇÕES DE IMPRESSÃO / EXPORTAÇÃO === */
function ensurePrintStyles() {
    if (!document.getElementById('dynamic-print-style')) {
        const style = document.createElement('style');
        style.id = 'dynamic-print-style';
        style.innerHTML = `
            @media print {
                body > *:not(#fichaModal) {
                    display: none !important;
                }
                
                #fichaModal {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                    background: #fff !important;
                    display: block !important;
                    z-index: 9999 !important;
                }
                
                .modal-container {
                    box-shadow: none !important;
                    border: none !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                
                .modal-header, .close-btn, .print-hide, button {
                    display: none !important;
                }
                
                #fichaExportContent {
                    display: block !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                
                #fichaExportContent .modal-footer ~ .modal-footer {
                    display: none !important;
                }
                
                html, body {
                    background: #fff !important;
                    height: auto !important;
                    overflow: visible !important;
                }
                
                @page {
                    size: portrait;
                    margin: 10mm;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

function shareFichaPDF() {
    const element = document.getElementById('fichaExportContent');
    if (!element) return;

    if (typeof html2pdf !== 'undefined') {
        const opt = {
            margin:       10,
            filename:     'ficha_do_atleta.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().from(element).set(opt).outputPdf('blob').then((pdfBlob) => {
            const file = new File([pdfBlob], 'ficha_do_atleta.pdf', { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                    files: [file],
                    title: 'Ficha do Atleta',
                    text: 'Segue a ficha do atleta em PDF.'
                }).catch(err => {
                    console.log('Compartilhamento cancelado ou erro:', err);
                });
            } else {
                html2pdf().from(element).set(opt).save();
            }
        });
    } else {
        window.print();
    }
}

function printFicha() {
    window.print();
}
/* ============================================= */

function enterSystem() {
    const loginScreen = document.getElementById('login-screen');
    const homeScreen = document.getElementById('home-screen');
    const mainNav = document.getElementById('main-nav');
    const yellowBarNav = document.getElementById('yellow-bar-nav');

    if (loginScreen) loginScreen.classList.remove('active-screen');
    if (homeScreen) homeScreen.classList.add('active-screen');
    
    if (mainNav) mainNav.style.display = 'flex';
    if (yellowBarNav) yellowBarNav.style.display = 'block';
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
}

function navigateTo(screenId, event) {
    if (screenId === 'convocacao') {
        openConvocacaoModal();
        return;
    }

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active-screen'));

    const fab = document.getElementById('btn-add-athlete-pf-fab');
    if (fab) {
        fab.style.display = (screenId === 'testes') ? 'flex' : 'none';
    }

    if (screenId === 'home') {
        const homeScreen = document.getElementById('home-screen');
        if (homeScreen) homeScreen.classList.add('active-screen');
    } else if (screenId === 'excel-db') {
        const excelDbScreen = document.getElementById('excel-db-screen');
        if (excelDbScreen) excelDbScreen.classList.add('active-screen');
        renderExcelTable();
    } else if (screenId === 'atletas') {
        const atletasScreen = document.getElementById('atletas-screen');
        if (atletasScreen) atletasScreen.classList.add('active-screen');
        renderAtletasScreen();
        if (event && event.target && event.target.classList.contains('nav-btn')) {
            event.target.classList.add('active');
        }
    } else if (screenId === 'testes') {
        const testesScreen = document.getElementById('testes-screen');
        if (testesScreen) testesScreen.classList.add('active-screen');
        ensureTestAddButton();
        if (fab) fab.style.display = 'flex';
        renderPfTable();
        if (event && event.target && event.target.classList.contains('nav-btn')) {
            event.target.classList.add('active');
        }
    } else {
        const genericScreen = document.getElementById('generic-screen');
        if (genericScreen) genericScreen.classList.add('active-screen');
        const titles = {
            'prancheta': 'Prancheta Tática Virtual',
            'relatorios': 'Relatórios de Desempenho',
            'jogos': 'Controle de Jogos'
        };
        const genericTitle = document.getElementById('generic-title');
        if (genericTitle) genericTitle.innerText = titles[screenId] || 'Módulo em Desenvolvimento';
        if (event && event.target && event.target.classList.contains('nav-btn')) {
            event.target.classList.add('active');
        }
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            alert(`Erro ao habilitar tela cheia: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

function initExcelTable() {
    const headerRow = document.getElementById('excel-header-row');
    if (!headerRow) return;
    headerRow.innerHTML = '';
    
    const thNum = document.createElement('th');
    thNum.textContent = '#';
    headerRow.appendChild(thNum);

    excelColumns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        headerRow.appendChild(th);
    });
}

function convertExcelDate(value) {
    if (!value) return '';
    if (typeof value === 'string' && (value.includes('/') || value.includes('-'))) {
        return value;
    }
    let num = Number(value);
    if (!isNaN(num) && num > 1000 && num < 60000) {
        let utc_days = Math.floor(num - 25569);
        let utc_value = utc_days * 86400;
        let date_info = new Date(utc_value * 1000);
        
        let day = String(date_info.getUTCDate()).padStart(2, '0');
        let month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
        let year = date_info.getUTCFullYear();
        
        return `${day}/${month}/${year}`;
    }
    return value;
}

function formatGordura(val) {
    if (val === undefined || val === null || val === '' || val === '-') return '-';
    let clean = String(val).replace('%', '').trim().replace(',', '.');
    let num = parseFloat(clean);
    if (isNaN(num)) return val;

    if (num > 0 && num <= 1) {
        num = num * 100;
    }

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
        tdNum.textContent = rowIndex + 1;
        tdNum.style.backgroundColor = '#f2f2f2';
        tdNum.style.fontWeight = 'bold';
        tr.appendChild(tdNum);

        excelColumns.forEach(col => {
            const td = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'text';
            
            let val = row[col] !== undefined && row[col] !== null ? row[col] : '';
            if (col.toLowerCase().includes('data') || col.toLowerCase().includes('nascimento')) {
                val = convertExcelDate(val);
            }

            input.value = val;
            input.onchange = (e) => {
                excelData[rowIndex][col] = e.target.value;
                saveToStorage();
            };
            td.appendChild(input);
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

function addRowToExcel() {
    let newRow = {};
    excelColumns.forEach(col => {
        newRow[col] = '';
    });
    excelData.push(newRow);
    saveToStorage();
    renderExcelTable();
}

function importExcelFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            
            if (jsonData.length > 0) {
                excelColumns = Object.keys(jsonData[0]);
                excelData = jsonData;
                saveToStorage();
                renderExcelTable();
                alert(`Banco de dados importado e salvo com sucesso! ${jsonData.length} atletas carregados.`);
            } else {
                alert('O arquivo Excel parece estar vazio.');
            }
        } catch (error) {
            alert(`Erro ao ler o arquivo Excel: ${error.message}`);
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
}

function openFichaAtleta(globalIndex) {
    if (globalIndex === null || globalIndex === undefined || !excelData[globalIndex]) {
        alert('Selecione um atleta na lista primeiro clicando sobre o nome dele e depois clique em Ver Ficha Atleta.');
        return;
    }

    const row = excelData[globalIndex];

    function getVal(keys) {
        for (let key in row) {
            let kLow = key.toLowerCase();
            for (let target of keys) {
                if (kLow === target.toLowerCase() || kLow.includes(target.toLowerCase())) {
                    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
                        return row[key];
                    }
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
            if ((kLow === ('altura' + i) || kLow === ('peso' + i) || kLow === ('data' + i) || kLow === ('dobras1_' + i) || kLow === ('dobras1' + i)) && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '' && String(row[key]).trim() !== '-') {
                hasEvalData = true;
                break;
            }
        }
        if (hasEvalData) {
            maxEvalNum = i;
        }
    }
    const evalNum = maxEvalNum;

    function getEvalVal(baseNames) {
        for (let base of baseNames) {
            let candidates = [
                base + evalNum,
                base + '_' + evalNum
            ];
            for (let cand of candidates) {
                for (let key in row) {
                    if (key.toLowerCase() === cand.toLowerCase()) {
                        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '' && String(row[key]).trim() !== '-') {
                            return row[key];
                        }
                    }
                }
            }
        }
        return '-';
    }

    const nome = getVal(['NOME COMPLETO', 'nome']) !== '-' ? getVal(['NOME COMPLETO', 'nome']) : (getVal(['APELIDO']) !== '-' ? getVal(['APELIDO']) : 'Atleta Sem Nome');
    const posicao = getVal(['Posição 1', 'posicao1', 'posição']);
    const nascimento = convertExcelDate(getVal(['Data de nascimento', 'nascimento']));
    const cidade = getVal(['CIDADE', 'cidade']);
    const foto = getVal(['Foto', 'foto']);

    const altura = getEvalVal(['Altura', 'altura']);
    const peso = getEvalVal(['peso', 'peso']);
    const alturapredita = getEvalVal(['alturapredita', 'alturapredita']);
    const subescapular = getEvalVal(['Dobras1', 'dobras1']);
    const triciptal = getEvalVal(['Dobras2', 'dobras2']);
    const supraIliaca = getEvalVal(['Dobras3', 'dobras3']);
    const abdominal = getEvalVal(['Dobras4', 'dobras4']);
    const gorduraRaw = getEvalVal(['PercentualGordura', 'gordura', 'percentualgordura']);
    const gordura = formatGordura(gorduraRaw);
    const dataAvaliacao = convertExcelDate(getEvalVal(['Data', 'data']));

    const photoSrc = (foto && foto !== '-') ? foto : 'foto.jpg';

    const modalBody = document.getElementById('fichaModalBody');
    if (modalBody) {
        modalBody.innerHTML = `
            <div id="fichaExportContent" style="background: #fff; padding: 10px;">
                <div class="player-profile">
                    <img src="${photoSrc}" alt="${nome}" class="player-photo" crossorigin="anonymous" onerror="this.onerror=null; this.src='https://via.placeholder.com/110x140?text=Sem+Foto';">
                    <div class="player-details">
                        <h3>${nome}</h3>
                        <p><strong>Posição:</strong> ${posicao}</p>
                        <p><strong>Nascimento:</strong> ${nascimento}</p>
                        <p><strong>Cidade:</strong> ${cidade !== '-' ? cidade : 'Apucarana'}</p>
                        <p><strong>Clube:</strong> CFA Prosol</p>
                    </div>
                </div>

                <div class="metrics-section">
                    <h4>MEDIDAS ANTROPOMÉTRICAS ${dataAvaliacao !== '-' ? '(Avaliação ' + evalNum + ': ' + dataAvaliacao + ')' : '(Avaliação ' + evalNum + ')'}</h4>
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

                <div class="modal-footer" style="background-color: #f9f9f9; padding: 12px; font-size: 0.8rem; border-top: 1px solid #ddd; color: #555; margin-top: 15px;">
                    <p><strong>CEO Enzo Gardini:</strong> (43) 98807-1610</p>
                    <p><strong>Coordenador Geral Roberto Fonseca Júnior:</strong> (43) 99110-4544</p>
                    <p><strong>Secretaria CFA Prosol:</strong> (43) 99670-7654</p>
                    <p><strong>Instagram:</strong> @cfaprosol</p>
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 20px;" class="no-print">
                <button onclick="shareFichaPDF()" style="flex: 1; padding: 12px; background: #0984e3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">Compartilhar PDF</button>
                <button onclick="printFicha()" style="flex: 1; padding: 12px; background: #6c5ce7; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">Imprimir</button>
            </div>
        `;
    }

    const modal = document.getElementById('fichaModal');
    if (modal) modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('fichaModal');
    if (modal) modal.style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('fichaModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

function renderAtletasScreen() {
    const checkboxes = document.querySelectorAll('.year-chk');
    let selectedYears = [];
    checkboxes.forEach(chk => {
        if (chk.checked) selectedYears.push(chk.value);
    });

    const posLists = {
        'goleiros': document.getElementById('list-goleiros'),
        'zagueiros': document.getElementById('list-zagueiros'),
        'laterais': document.getElementById('list-laterais'),
        'volantes': document.getElementById('list-volantes'),
        'meias': document.getElementById('list-meias'),
        'atacantes': document.getElementById('list-atacantes'),
        'extremos': document.getElementById('list-extremos')
    };

    for (let key in posLists) {
        if (posLists[key]) posLists[key].innerHTML = '';
    }

    excelData.forEach((row, globalIndex) => {
        let anoAtleta = '';
        for (let key in row) {
            if (key.toLowerCase() === 'ano') {
                anoAtleta = String(row[key] || '').trim();
                break;
            }
        }

        if (selectedYears.length > 0 && !selectedYears.includes(anoAtleta)) {
            return;
        }

        let nomeExibicao = '';
        for (let key in row) {
            let kLow = key.toLowerCase();
            if (kLow.includes('apelido') && row[key]) {
                nomeExibicao = row[key];
                break;
            }
        }
        if (!nomeExibicao) {
            for (let key in row) {
                let kLow = key.toLowerCase();
                if (kLow.includes('nome') && row[key]) {
                    nomeExibicao = row[key];
                    break;
                }
            }
        }
        if (!nomeExibicao) nomeExibicao = 'Atleta Sem Nome';

        let posicaoAtleta = '';
        for (let key in row) {
            let kLow = key.toLowerCase();
            if (kLow.includes('posição') || kLow.includes('posicao')) {
                posicaoAtleta = String(row[key] || '').toLowerCase();
                break;
            }
        }

        let targetBox = 'meias';
        if (posicaoAtleta.includes('goleiro')) targetBox = 'goleiros';
        else if (posicaoAtleta.includes('zagueiro')) targetBox = 'zagueiros';
        else if (posicaoAtleta.includes('lateral')) targetBox = 'laterais';
        else if (posicaoAtleta.includes('volante')) targetBox = 'volantes';
        else if (posicaoAtleta.includes('meia')) targetBox = 'meias';
        else if (posicaoAtleta.includes('atacante')) targetBox = 'atacantes';
        else if (posicaoAtleta.includes('extremo') || posicaoAtleta.includes('ponta')) targetBox = 'extremos';

        const itemDiv = document.createElement('div');
        itemDiv.className = 'athlete-item';
        if (selectedAthleteIndex === globalIndex) {
            itemDiv.classList.add('selected');
            itemDiv.style.backgroundColor = '#0984e3';
            itemDiv.style.color = '#fff';
        }
        itemDiv.innerHTML = `<span>${nomeExibicao}</span> <span>${anoAtleta}</span>`;
        
        itemDiv.onclick = () => {
            selectedAthleteIndex = globalIndex;
            renderAtletasScreen();
        };

        if (posLists[targetBox]) {
            posLists[targetBox].appendChild(itemDiv);
        }
    });
}

function deleteSelectedAthlete() {
    if (selectedAthleteIndex === null || selectedAthleteIndex === undefined) {
        alert('Selecione um atleta na lista clicando sobre o nome dele antes de excluir.');
        return;
    }
    let athleteName = '';
    for (let key in excelData[selectedAthleteIndex]) {
        if (key.toLowerCase().includes('nome')) {
            athleteName = excelData[selectedAthleteIndex][key];
            break;
        }
    }
    if (confirm(`Deseja realmente excluir o atleta "${athleteName || 'Selecionado'}"?`)) {
        excelData.splice(selectedAthleteIndex, 1);
        selectedAthleteIndex = null;
        saveToStorage();
        renderAtletasScreen();
        alert('Atleta excluído com sucesso!');
    }
}

function openAddAthleteModal() {
    uploadedPhotoBase64 = '';
    const form = document.getElementById('athlete-form');
    if (form) form.reset();
    const lbl = document.getElementById('file-label-text');
    if (lbl) lbl.textContent = 'Selecionar Foto';
    const modal = document.getElementById('add-athlete-modal');
    if (modal) modal.style.display = 'flex';
}

function closeAddAthleteModal() {
    const modal = document.getElementById('add-athlete-modal');
    if (modal) modal.style.display = 'none';
}

function previewAthletePhoto(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const lbl = document.getElementById('file-label-text');
        if (lbl) lbl.textContent = file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedPhotoBase64 = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function saveNewAthlete(event) {
    event.preventDefault();

    const nome = document.getElementById('add-nome').value;
    const apelido = document.getElementById('add-apelido').value;
    const ano = document.getElementById('add-ano').value;
    const nascimento = document.getElementById('add-nascimento').value;
    const posicao = document.getElementById('add-posicao').value;
    const cidade = document.getElementById('add-cidade').value;
    const contato = document.getElementById('add-contato').value;
    const rg = document.getElementById('add-rg').value;

    let newRow = {};
    excelColumns.forEach(col => { newRow[col] = ''; });

    if (excelColumns.includes('Ano')) newRow['Ano'] = ano;
    if (excelColumns.includes('NOME COMPLETO')) newRow['NOME COMPLETO'] = nome;
    if (excelColumns.includes('APELIDO')) newRow['APELIDO'] = apelido;
    if (excelColumns.includes('Data de nascimento')) newRow['Data de nascimento'] = nascimento;
    if (excelColumns.includes('Posição 1')) newRow['Posição 1'] = posicao;
    if (excelColumns.includes('CIDADE')) newRow['CIDADE'] = cidade;
    if (excelColumns.includes('Contato')) newRow['Contato'] = contato;
    if (excelColumns.includes('RG')) newRow['RG'] = rg;
    if (excelColumns.includes('Foto')) newRow['Foto'] = uploadedPhotoBase64;

    excelData.push(newRow);
    saveToStorage();
    closeAddAthleteModal();
    renderAtletasScreen();
    
    const testesScreen = document.getElementById('testes-screen');
    if (testesScreen && testesScreen.classList.contains('active-screen')) {
        renderPfTable();
    }

    alert('Atleta adicionado e salvo com sucesso!');
}

function switchPfTab(tabName, eventObj) {
    currentPfTab = tabName;
    document.querySelectorAll('.pf-tab').forEach(t => t.classList.remove('active'));
    
    const targetEl = eventObj ? eventObj.target : (window.event ? window.event.target : null);
    if (targetEl) targetEl.classList.add('active');
    
    renderPfTable();
}

function ensureTestAddButton() {
    let fab = document.getElementById('btn-add-athlete-pf-fab');
    if (!fab) {
        fab = document.createElement('div');
        fab.id = 'btn-add-athlete-pf-fab';
        fab.innerHTML = '+ add';
        fab.style.position = 'fixed';
        fab.style.bottom = '30px';
        fab.style.right = '30px';
        fab.style.width = '65px';
        fab.style.height = '65px';
        fab.style.borderRadius = '50%';
        fab.style.backgroundColor = '#2ed573';
        fab.style.color = '#fff';
        fab.style.display = 'none';
        fab.style.alignItems = 'center';
        fab.style.justifyContent = 'center';
        fab.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
        fab.style.cursor = 'pointer';
        fab.style.fontWeight = 'bold';
        fab.style.fontSize = '13px';
        fab.style.zIndex = '9999';
        fab.style.userSelect = 'none';
        fab.style.transition = 'transform 0.2s, background-color 0.2s';
        
        fab.onmouseover = () => {
            fab.style.transform = 'scale(1.1)';
            fab.style.backgroundColor = '#26af5f';
        };
        fab.onmouseout = () => {
            fab.style.transform = 'scale(1.0)';
            fab.style.backgroundColor = '#2ed573';
        };
        fab.onclick = openAddAthleteModal;
        document.body.appendChild(fab);
    }
}

function renderPfTable() {
    const headerRow = document.getElementById('pf-header-row');
    const tbody = document.getElementById('pf-tbody');
    if (!headerRow || !tbody) return;
    headerRow.innerHTML = '';
    tbody.innerHTML = '';

    const evalSelect = document.getElementById('pf-eval-select');
    const yearSelect = document.getElementById('pf-year-select');
    const evalNum = evalSelect ? evalSelect.value : '1';
    const selectedYear = yearSelect ? yearSelect.value : 'todos';

    let baseCols = [];
    if (currentPfTab === 'antropometricas') {
        baseCols = ['Altura', 'alturapredita', 'alturasentado', 'peso', 'Dobras1', 'Dobras2', 'Dobras3', 'Dobras4'];
    } else if (currentPfTab === 'resistencia') {
        baseCols = ['nivel', 'distancia'];
    } else if (currentPfTab === 'potencia') {
        baseCols = ['Salto1', 'Salto2', 'Salto3', 'MelhorSalto'];
    } else if (currentPfTab === 'velocidade') {
        baseCols = [
            'Aceleraçãofinal', 'Velocidadefinal', 
            'aceleração1', 'velocidade1', 
            'aceleração2', 'velocidade2', 
            'aceleração3', 'velocidade3', 
            'aceleração4', 'velocidade4', 
            'aceleração5', 'velocidade5', 
            'aceleração6', 'velocidade6', 
            'aceleração7', 'velocidade7'
        ];
    } else if (currentPfTab === 'agilidade') {
        baseCols = ['Volta1', 'Volta2', 'Agilidade'];
    }

    let colsToDisplay = ['Ano', 'NOME COMPLETO', 'Data de nascimento', 'Data' + evalNum];
    baseCols.forEach(col => {
        colsToDisplay.push(col + evalNum);
    });

    colsToDisplay.forEach((col) => {
        const th = document.createElement('th');
        let label = col;
        let cleanCol = col.replace(evalNum, '');

        if (col === 'Data de nascimento') label = 'DATA NASCIMENTO';
        else if (col.startsWith('Data') && col !== 'Data de nascimento') label = 'DATA AVALIAÇÃO';
        else if (cleanCol === 'Altura') label = 'ALTURA';
        else if (cleanCol === 'alturapredita') {
            label = 'ALTURA PREDITA';
            th.style.color = '#4cd137';
        }
        else if (cleanCol === 'alturasentado') label = 'ALT. SENTADO';
        else if (cleanCol === 'peso') label = 'PESO';
        else if (cleanCol === 'Dobras1') label = 'SBE';
        else if (cleanCol === 'Dobras2') label = 'TRI';
        else if (cleanCol === 'Dobras3') label = 'SPI';
        else if (cleanCol === 'Dobras4') label = 'ABD';
        else if (cleanCol === 'nivel') label = 'NÍVEL';
        else if (cleanCol === 'distancia') label = 'DISTÂNCIA';
        else if (cleanCol === 'Salto1') label = 'SALTO 1';
        else if (cleanCol === 'Salto2') label = 'SALTO 2';
        else if (cleanCol === 'Salto3') label = 'SALTO 3';
        else if (cleanCol === 'MelhorSalto') label = 'FINAL';
        else if (cleanCol === 'Volta1') label = 'VOLTA 1';
        else if (cleanCol === 'Volta2') label = 'VOLTA 2';
        else if (cleanCol === 'Agilidade') label = 'AGILIDADE';
        else if (cleanCol === 'Aceleraçãofinal') label = 'MÉDIA ACELERAÇÃO';
        else if (cleanCol === 'Velocidadefinal') label = 'MÉDIA VELOCIDADE';
        else if (cleanCol.toLowerCase().includes('aceleração')) label = cleanCol.replace(/aceleração/i, 'ACELERAÇÃO ');
        else if (cleanCol.toLowerCase().includes('velocidade')) label = cleanCol.replace(/velocidade/i, 'VELOCIDADE ');

        th.textContent = label.toUpperCase();

        if (col === 'Ano') {
            th.style.position = 'sticky';
            th.style.left = '0px';
            th.style.zIndex = '5';
            th.style.backgroundColor = '#e1e1e1';
            th.style.minWidth = '60px';
        } else if (col === 'NOME COMPLETO') {
            th.style.position = 'sticky';
            th.style.left = '60px';
            th.style.zIndex = '5';
            th.style.backgroundColor = '#e1e1e1';
            th.style.minWidth = '220px';
        }

        headerRow.appendChild(th);
    });

    excelData.forEach((row, rowIndex) => {
        let anoAtleta = '';
        for (let key in row) {
            if (key.toLowerCase() === 'ano') {
                anoAtleta = String(row[key] || '').trim();
                break;
            }
        }

        if (selectedYear !== 'todos' && anoAtleta !== selectedYear) {
            return;
        }

        const tr = document.createElement('tr');
        colsToDisplay.forEach(col => {
            const td = document.createElement('td');

            let val = '';
            if (row[col] !== undefined && row[col] !== null) {
                val = row[col];
            } else {
                let foundKey = Object.keys(row).find(k => k.toLowerCase() === col.toLowerCase());
                if (foundKey) val = row[foundKey];
            }

            if (col.toLowerCase().includes('data') || col.toLowerCase().includes('nascimento')) {
                val = convertExcelDate(val);
            }

            const isReadOnlyField = (col === 'Ano' || col === 'NOME COMPLETO' || col === 'Data de nascimento');

            if (isReadOnlyField) {
                td.textContent = val;
                td.style.backgroundColor = '#f4f6f7';
                td.style.fontWeight = '600';
                td.style.color = '#333';
            } else {
                const input = document.createElement('input');
                input.type = 'text';
                input.value = val;
                input.onchange = (e) => {
                    let targetKey = col;
                    let foundKey = Object.keys(row).find(k => k.toLowerCase() === col.toLowerCase());
                    if (foundKey) targetKey = foundKey;
                    
                    excelData[rowIndex][targetKey] = e.target.value;
                    saveToStorage();
                };
                td.appendChild(input);
            }

            if (col === 'Ano') {
                td.style.position = 'sticky';
                td.style.left = '0px';
                td.style.zIndex = '2';
                td.style.backgroundColor = '#f4f6f7';
                td.style.minWidth = '60px';
            } else if (col === 'NOME COMPLETO') {
                td.style.position = 'sticky';
                td.style.left = '60px';
                td.style.zIndex = '2';
                td.style.backgroundColor = '#f4f6f7';
                td.style.minWidth = '220px';
            }

            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

function ensureConvocacaoModalDom() {
    let modal = document.getElementById('convocacao-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'convocacao-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            z-index: 10000;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

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
                        <button onclick="carregarConvocacaoSalva()" style="padding: 8px 15px; border: 1px solid #b2bec3; background: #fff; border-radius: 4px; cursor: pointer; font-weight: 600;">Carregar Convocacões</button>
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

function openConvocacaoModal() {
    ensureConvocacaoModalDom();
    renderConvocacaoScreen();
    document.getElementById('convocacao-modal').style.display = 'flex';
}

function closeConvocacaoModal() {
    const modal = document.getElementById('convocacao-modal');
    if (modal) modal.style.display = 'none';
}

function renderConvocacaoScreen() {
    const yearsBar = document.getElementById('convocacao-years-bar');
    if (!yearsBar) return;
    yearsBar.innerHTML = '';
    
    const anosDisponiveis = ['2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017'];
    anosDisponiveis.forEach(ano => {
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '5px';
        label.style.cursor = 'pointer';
        label.style.fontWeight = '500';

        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.value = ano;
        chk.checked = false;
        chk.className = 'conv-year-chk';
        chk.onchange = renderConvocacaoLists;

        label.appendChild(chk);
        label.appendChild(document.createTextNode(ano));
        yearsBar.appendChild(label);
    });

    renderConvocacaoLists();
}

function renderConvocacaoLists() {
    const checkboxes = document.querySelectorAll('.conv-year-chk');
    let selectedYears = [];
    checkboxes.forEach(chk => {
        if (chk.checked) selectedYears.push(chk.value);
    });

    const posLists = {
        'goleiros': document.getElementById('conv-list-goleiros'),
        'zagueiros': document.getElementById('conv-list-zagueiros'),
        'laterais': document.getElementById('conv-list-laterais'),
        'volantes': document.getElementById('conv-list-volantes'),
        'meias': document.getElementById('conv-list-meias'),
        'atacantes': document.getElementById('conv-list-atacantes'),
        'extremos': document.getElementById('conv-list-extremos')
    };

    for (let key in posLists) {
        if (posLists[key]) posLists[key].innerHTML = '';
    }

    document.querySelectorAll('.drop-box').forEach(box => {
        const cat = box.getAttribute('data-category');
        box.ondragover = (e) => e.preventDefault();
        box.ondrop = (e) => {
            e.preventDefault();
            const globalIndex = parseInt(e.dataTransfer.getData('text/plain'));
            if (!isNaN(globalIndex)) {
                handleAthleteDrop(globalIndex, cat);
            }
        };
    });

    if (selectedYears.length === 0) return;

    excelData.forEach((row, globalIndex) => {
        let anoAtleta = '';
        for (let key in row) {
            if (key.toLowerCase() === 'ano') {
                anoAtleta = String(row[key] || '').trim();
                break;
            }
        }

        if (!selectedYears.includes(anoAtleta)) {
            return;
        }

        let nomeExibicao = '';
        for (let key in row) {
            let kLow = key.toLowerCase();
            if (kLow.includes('apelido') && row[key]) {
                nomeExibicao = row[key];
                break;
            }
        }
        if (!nomeExibicao) {
            for (let key in row) {
                let kLow = key.toLowerCase();
                if (kLow.includes('nome') && row[key]) {
                    nomeExibicao = row[key];
                    break;
                }
            }
        }
        if (!nomeExibicao) nomeExibicao = 'Atleta Sem Nome';

        let posicaoAtleta = '';
        for (let key in row) {
            let kLow = key.toLowerCase();
            if (kLow.includes('posição') || kLow.includes('posicao')) {
                posicaoAtleta = String(row[key] || '').toLowerCase();
                break;
            }
        }

        let targetBox = 'meias';
        if (posicaoAtleta.includes('goleiro')) targetBox = 'goleiros';
        else if (posicaoAtleta.includes('zagueiro')) targetBox = 'zagueiros';
        else if (posicaoAtleta.includes('lateral')) targetBox = 'laterais';
        else if (posicaoAtleta.includes('volante')) targetBox = 'volantes';
        else if (posicaoAtleta.includes('meia')) targetBox = 'meias';
        else if (posicaoAtleta.includes('atacante')) targetBox = 'atacantes';
        else if (posicaoAtleta.includes('extremo') || posicaoAtleta.includes('ponta')) targetBox = 'extremos';

        const itemDiv = document.createElement('div');
        itemDiv.draggable = true;
        itemDiv.style.padding = '6px 8px';
        itemDiv.style.cursor = 'grab';
        itemDiv.style.display = 'flex';
        itemDiv.style.justifyContent = 'space-between';
        itemDiv.style.fontSize = '13px';
        itemDiv.style.borderBottom = '1px solid #f1f1f1';
        itemDiv.style.userSelect = 'none';

        itemDiv.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', globalIndex);
        };

        if (selectedConvocados.has(globalIndex)) {
            itemDiv.style.backgroundColor = '#0984e3';
            itemDiv.style.color = '#fff';
        }

        itemDiv.innerHTML = `<span>${nomeExibicao}</span> <span style="font-size: 11px; opacity: 0.8;">${anoAtleta}</span>`;
        
        itemDiv.onclick = (e) => {
            e.stopPropagation();
            if (selectedConvocados.has(globalIndex)) {
                selectedConvocados.delete(globalIndex);
                itemDiv.style.backgroundColor = 'transparent';
                itemDiv.style.color = '#000';
            } else {
                selectedConvocados.add(globalIndex);
                itemDiv.style.backgroundColor = '#0984e3';
                itemDiv.style.color = '#fff';
            }
        };

        if (posLists[targetBox]) {
            posLists[targetBox].appendChild(itemDiv);
        }
    });
}

function handleAthleteDrop(globalIndex, targetCategory) {
    if (targetCategory === 'goleiros') {
        updateAthletePositionInDatabase(globalIndex, 'Goleiro');
    } else if (targetCategory === 'zagueiros') {
        updateAthletePositionInDatabase(globalIndex, 'Zagueiro');
    } else if (targetCategory === 'meias') {
        updateAthletePositionInDatabase(globalIndex, 'Meia');
    } else if (targetCategory === 'atacantes') {
        updateAthletePositionInDatabase(globalIndex, 'Atacante');
    } else if (targetCategory === 'laterais') {
        showPositionChoiceModal(['Lateral Direito', 'Lateral Esquerdo'], (chosen) => {
            updateAthletePositionInDatabase(globalIndex, chosen);
        });
    } else if (targetCategory === 'volantes') {
        showPositionChoiceModal(['1º Volante', '2º Volante'], (chosen) => {
            updateAthletePositionInDatabase(globalIndex, chosen);
        });
    } else if (targetCategory === 'extremos') {
        showPositionChoiceModal(['Ponta Dir.', 'Ponta Esq.'], (chosen) => {
            updateAthletePositionInDatabase(globalIndex, chosen);
        });
    }
}

function showPositionChoiceModal(options, onSelect) {
    let choiceModal = document.getElementById('position-choice-modal');
    if (!choiceModal) {
        choiceModal = document.createElement('div');
        choiceModal.id = 'position-choice-modal';
        choiceModal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5);
            z-index: 10500; display: flex; align-items: center; justify-content: center;
        `;
        document.body.appendChild(choiceModal);
    }
    choiceModal.style.display = 'flex';
    choiceModal.innerHTML = `
        <div style="background: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); width: 320px; text-align: center;">
            <h3 style="margin-bottom: 20px; font-size: 16px; color: #333;">Escolha a Posição Específica</h3>
            <div id="position-choice-buttons" style="display: flex; flex-direction: column; gap: 12px;"></div>
            <button onclick="document.getElementById('position-choice-modal').style.display='none'" style="margin-top: 15px; padding: 8px 15px; background: #e74c3c; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Cancelar</button>
        </div>
    `;
    const btnContainer = document.getElementById('position-choice-buttons');
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.style.cssText = `padding: 12px; background: #0984e3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px;`;
        btn.onclick = () => {
            choiceModal.style.display = 'none';
            onSelect(opt);
        };
        btnContainer.appendChild(btn);
    });
}

function updateAthletePositionInDatabase(globalIndex, newPosition) {
    let row = excelData[globalIndex];
    if (!row) return;

    let posKey = 'Posição 1';
    let found = false;
    for (let key in row) {
        let kLow = key.toLowerCase();
        if (kLow.includes('posição') || kLow.includes('posicao')) {
            posKey = key;
            found = true;
            break;
        }
    }
    if (!found) {
        if (!excelColumns.includes('Posição 1')) {
            excelColumns.push('Posição 1');
        }
        posKey = 'Posição 1';
    }

    excelData[globalIndex][posKey] = newPosition;
    saveToStorage();
    renderConvocacaoLists();

    const atletasScreen = document.getElementById('atletas-screen');
    if (atletasScreen && atletasScreen.classList.contains('active-screen')) {
        renderAtletasScreen();
    }
}

function limparConvocacao() {
    selectedConvocados.clear();
    localStorage.removeItem(STORAGE_CONVOCACAO_KEY);
    renderConvocacaoLists();
    alert('Convocação limpa!');
}

function excluirAtletasSelecionadosConvocacao() {
    if (selectedConvocados.size === 0) {
        alert('Nenhum atleta selecionado na convocação. Clique sobre os atletas desejados para selecioná-los antes de excluir.');
        return;
    }

    if (confirm(`Deseja realmente excluir permanentemente os ${selectedConvocados.size} atleta(s) selecionado(s) da convocação e do banco de dados?`)) {
        const indicesParaRemover = Array.from(selectedConvocados).sort((a, b) => b - a);

        indicesParaRemover.forEach(index => {
            excelData.splice(index, 1);
        });

        selectedConvocados.clear();
        localStorage.removeItem(STORAGE_CONVOCACAO_KEY);
        saveToStorage();
        renderConvocacaoLists();

        const atletasScreen = document.getElementById('atletas-screen');
        if (atletasScreen && atletasScreen.classList.contains('active-screen')) {
            renderAtletasScreen();
        }
        const excelDbScreen = document.getElementById('excel-db-screen');
        if (excelDbScreen && excelDbScreen.classList.contains('active-screen')) {
            renderExcelTable();
        }

        alert('Atleta(s) excluído(s) com sucesso!');
    }
}

function confirmarConvocacao() {
    const indicesArray = Array.from(selectedConvocados);
    localStorage.setItem(STORAGE_CONVOCACAO_KEY, JSON.stringify(indicesArray));
    alert(`Convocação confirmada e salva com sucesso! Total de atletas convocados: ${indicesArray.length}`);
    closeConvocacaoModal();
}

function carregarConvocacaoSalva() {
    const saved = localStorage.getItem(STORAGE_CONVOCACAO_KEY);
    if (saved) {
        try {
            selectedConvocados = new Set(JSON.parse(saved));
            renderConvocacaoLists();
            alert(`Convocação carregada com sucesso! ${selectedConvocados.size} atletas selecionados.`);
        } catch(e) {
            alert('Erro ao carregar convocação salva.');
        }
    } else {
        alert('Nenhuma convocação salva encontrada.');
    }
}

function addNewEvaluation() {
    let nextEvalNum = 2;
    for (let i = 2; i <= 20; i++) {
        let exists = excelColumns.some(col => col.toLowerCase() === ('data' + i).toLowerCase() || col.toLowerCase() === ('avaliação' + i).toLowerCase());
        if (!exists) {
            nextEvalNum = i;
            break;
        }
    }

    const colunasParaAdicionar = [
        'AVALIAÇÃO' + nextEvalNum,
        'Data' + nextEvalNum,
        'Altura' + nextEvalNum,
        'alturasentado' + nextEvalNum,
        'peso' + nextEvalNum,
        'Dobras1_' + nextEvalNum,
        'Dobras2_' + nextEvalNum,
        'Dobras3_' + nextEvalNum,
        'Dobras4_' + nextEvalNum,
        'PercentualGordura' + nextEvalNum,
        'alturapredita' + nextEvalNum,
        'nivel' + nextEvalNum,
        'distancia' + nextEvalNum,
        'Salto1_' + nextEvalNum,
        'Salto2_' + nextEvalNum,
        'Salto3_' + nextEvalNum,
        'MelhorSalto' + nextEvalNum,
        'aceleração1_' + nextEvalNum,
        'velocidade1_' + nextEvalNum,
        'aceleração2_' + nextEvalNum,
        'velocidade2_' + nextEvalNum,
        'aceleração3_' + nextEvalNum,
        'velocidade3_' + nextEvalNum,
        'aceleração4_' + nextEvalNum,
        'velocidade4_' + nextEvalNum,
        'aceleração5_' + nextEvalNum,
        'velocidade5_' + nextEvalNum,
        'aceleração6_' + nextEvalNum,
        'velocidade6_' + nextEvalNum,
        'aceleração7_' + nextEvalNum,
        'velocidade7_' + nextEvalNum,
        'Aceleraçãofinal' + nextEvalNum,
        'Velocidadefinal' + nextEvalNum,
        'Volta1_' + nextEvalNum,
        'Volta2_' + nextEvalNum,
        'Agilidade' + nextEvalNum
    ];

    colunasParaAdicionar.forEach(novaCol => {
        if (!excelColumns.includes(novaCol)) {
            excelColumns.push(novaCol);
        }
    });

    excelData.forEach(row => {
        colunasParaAdicionar.forEach(novaCol => {
            if (novaCol.toUpperCase().includes('AVALIAÇÃO')) {
                row[novaCol] = 'Avaliação ' + nextEvalNum;
            } else if (row[novaCol] === undefined) {
                row[novaCol] = '';
            }
        });
    });

    saveToStorage();
    renderExcelTable();
    
    const evalSelect = document.getElementById('pf-eval-select');
    if (evalSelect) {
        let optionExists = false;
        for (let opt of evalSelect.options) {
            if (opt.value === String(nextEvalNum)) optionExists = true;
        }
        if (!optionExists) {
            let opt = document.createElement('option');
            opt.value = nextEvalNum;
            opt.textContent = 'Avaliação ' + nextEvalNum;
            evalSelect.appendChild(opt);
        }
        evalSelect.value = String(nextEvalNum);
    }

    renderPfTable();
    alert('Nova Avaliação (' + nextEvalNum + ') adicionada com sucesso!');
}

function deleteCurrentEvaluation() {
    const evalSelect = document.getElementById('pf-eval-select');
    if (!evalSelect) return;
    
    const evalNum = evalSelect.value;
    if (evalNum === '1') {
        alert('A Avaliação 1 é a base principal do sistema e não pode ser apagada.');
        return;
    }

    if (confirm('Deseja realmente apagar todas as colunas e dados referentes à Avaliação ' + evalNum + '?')) {
        excelColumns = excelColumns.filter(col => !col.endsWith(evalNum) && !col.toLowerCase().includes('avaliação' + evalNum));

        excelData.forEach(row => {
            Object.keys(row).forEach(key => {
                if (key.endsWith(evalNum) || key.toLowerCase().includes('avaliação' + evalNum)) {
                    delete row[key];
                }
            });
        });

        saveToStorage();
        renderExcelTable();

        for (let i = 0; i < evalSelect.options.length; i++) {
            if (evalSelect.options[i].value === evalNum) {
                evalSelect.remove(i);
                break;
            }
        }
        evalSelect.value = '1';
        renderPfTable();
        alert('Avaliação apagada com sucesso!');
    }
}