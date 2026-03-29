// ==================== MÓDULO: NAVEGAÇÃO E INICIALIZAÇÃO ====================

function initTabs() {
    // CORREÇÃO: O sistema agora procura pela classe moderna '.nav-item'
    const tabs = document.querySelectorAll('.nav-item');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            // Remove a classe ativa de todas as abas
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Adiciona a classe ativa na aba clicada
            tab.classList.add('active');
            const activeContent = document.getElementById(`tab-${tabId}`);
            if (activeContent) activeContent.classList.add('active');
            
            // Renderiza os dados consoante a aba aberta para poupar processamento
            if (tabId === 'motoristas') renderizarMotoristas();
            else if (tabId === 'caminhoes') renderizarConjuntos();
            else if (tabId === 'escala') renderizarEscala();
            else if (tabId === 'alocacao') renderizarAlocacao();
        });
    });
}

// INICIALIZAÇÃO PRINCIPAL DA APLICAÇÃO
async function init() {
    // 1. Inicializa o menu de navegação
    initTabs();
    
    // 2. Carrega dados (DB + Backup Local) do estado.js
    await carregarDadosIniciais();
    
    // 3. Renderiza a interface
    renderizarEscala();
    renderizarMotoristas();
    renderizarConjuntos();
    renderizarAlocacao();
    atualizarStats();
    
    // ==================== LISTENERS GLOBAIS DE BOTÕES ====================
    
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