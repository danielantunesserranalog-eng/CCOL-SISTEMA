// ==================== MÓDULO: NAVEGAÇÃO E INICIALIZAÇÃO ====================

function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const activeContent = document.getElementById(`tab-${tabId}`);
            if (activeContent) activeContent.classList.add('active');
            
            if (tabId === 'motoristas') renderizarMotoristas();
            else if (tabId === 'caminhoes') renderizarConjuntos();
            else if (tabId === 'escala') renderizarEscala();
            else if (tabId === 'alocacao') renderizarAlocacao();
        });
    });
}

function popularSelectTurnos() {
    const turnosInfo = document.querySelector('.turnos-info');
    if (turnosInfo) turnosInfo.innerHTML = `<div style="width:100%">⏱️ Escalas de 12 horas disponíveis.</div>`;
}

// INICIALIZAÇÃO PRINCIPAL DA APLICAÇÃO
async function init() {
    initTabs();
    popularSelectTurnos();
    
    // Carrega dados (DB + Backup Local) do estado.js
    await carregarDadosIniciais();
    
    // Renderiza a interface
    renderizarEscala();
    renderizarMotoristas();
    renderizarConjuntos();
    renderizarAlocacao();
    atualizarStats();
    
    // Listeners Globais
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
        currentDatas = getDatasSemana(); 
        renderizarEscala();
    });

    // Listener para gerar o relatório PDF/Impressão
    const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
    if (btnGerarRelatorio) btnGerarRelatorio.addEventListener('click', () => {
        window.print();
    });
}

// Roda a inicialização assim que o HTML carregar
document.addEventListener('DOMContentLoaded', init);