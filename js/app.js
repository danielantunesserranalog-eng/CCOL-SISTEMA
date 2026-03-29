// ==================== MÓDULO: NAVEGAÇÃO E INICIALIZAÇÃO ====================

function initTabs() {
    const tabs = document.querySelectorAll('.nav-item[data-tab], .dropdown-item[data-tab]');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabId = tab.getAttribute('data-tab');
            if(!tabId) return; 
            
            document.querySelectorAll('.nav-item, .dropdown-item').forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            if(tab.classList.contains('dropdown-item')) {
                tab.classList.add('active');
                tab.closest('.nav-dropdown').querySelector('.dropdown-toggle').classList.add('active');
                document.querySelector('.dropdown-menu').classList.remove('show');
            } else {
                tab.classList.add('active');
            }
            
            const activeContent = document.getElementById(`tab-${tabId}`);
            if (activeContent) activeContent.classList.add('active');
            
            if (tabId === 'motoristas') renderizarMotoristas();
            else if (tabId === 'caminhoes') renderizarConjuntos();
            else if (tabId === 'escala') renderizarEscala();
            else if (tabId === 'alocacao') renderizarAlocacao();
            else if (tabId === 'troca') renderizarTrocaTurno();
            else if (tabId === 'treinamento') renderizarCronogramaTreinamento();
        });
    });

    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    if (dropdownToggle && dropdownMenu) {
        dropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); 
            dropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!dropdownToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }
}

// INICIALIZAÇÃO PRINCIPAL DA APLICAÇÃO
window.atualizarStats = function() {
    const statConjuntos = document.getElementById('statConjuntos');
    const statCaminhoes = document.getElementById('statCaminhoes');
    const statMotoristas = document.getElementById('statMotoristas');
    const statEscalasHoje = document.getElementById('statEscalasHoje');
    
    if (statConjuntos) statConjuntos.innerText = conjuntos.length;
    if (statCaminhoes) statCaminhoes.innerText = conjuntos.reduce((acc, c) => acc + (c.caminhoes?.length || 0), 0);
    if (statMotoristas) statMotoristas.innerText = motoristas.length;
    
    if (statEscalasHoje && typeof window.getEscalaDiaComputada === 'function') {
        const hoje = new Date().toISOString().split('T')[0];
        statEscalasHoje.innerText = motoristas.filter(m => window.getEscalaDiaComputada(m, hoje).caminhao !== 'F').length;
    }
}

async function init() {
    initTabs();
    await carregarDadosIniciais();
    
    if(typeof carregarDadosTreinamento === 'function') {
        await carregarDadosTreinamento(); 
    }
    
    const dataInicioInput = document.getElementById('dataInicioEscala');
    if (dataInicioInput) {
        const hojeStr = new Date().toISOString().split('T')[0];
        dataInicioInput.value = hojeStr;
        
        dataInicioInput.addEventListener('change', (e) => {
            currentDatas = getDatasSemana(e.target.value);
            renderizarEscala();
        });
    }

    renderizarEscala();
    renderizarMotoristas();
    renderizarConjuntos();
    renderizarAlocacao();
    atualizarStats();
    
    const btnAddMotorista = document.getElementById('btnAddMotorista');
    if (btnAddMotorista) btnAddMotorista.addEventListener('click', adicionarMotorista);
    
    const btnAddConjunto = document.getElementById('btnAddConjunto');
    if (btnAddConjunto) btnAddConjunto.addEventListener('click', adicionarConjunto);
    
    const searchMotorista = document.getElementById('searchMotorista');
    if (searchMotorista) searchMotorista.addEventListener('input', renderizarMotoristas);
    
    const btnGerar = document.getElementById('btnGerarEscalaAuto');
    if (btnGerar) btnGerar.addEventListener('click', gerarEscala4x2);
    
    const btnZerar = document.getElementById('btnZerarEscala');
    if (btnZerar) btnZerar.addEventListener('click', zerarEscala);
    
    const filtroConjunto = document.getElementById('filtroConjuntoEscala');
    if (filtroConjunto) filtroConjunto.addEventListener('change', renderizarEscala);

    const refreshEscalaBtn = document.getElementById('refreshEscalaBtn');
    if (refreshEscalaBtn) refreshEscalaBtn.addEventListener('click', () => {
        const inputData = document.getElementById('dataInicioEscala');
        currentDatas = getDatasSemana(inputData ? inputData.value : null); 
        renderizarEscala();
    });

    const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
    if (btnGerarRelatorio) btnGerarRelatorio.addEventListener('click', () => {
        window.print();
    });
}

document.addEventListener('DOMContentLoaded', init);