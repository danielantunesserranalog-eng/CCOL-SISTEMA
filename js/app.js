// ==================== MÓDULO: NAVEGAÇÃO E INICIALIZAÇÃO DO DASHBOARD ====================

window.atualizarStats = function() {
    const statConjuntos = document.getElementById('statConjuntos');
    const statCaminhoes = document.getElementById('statCaminhoes');
    const statMotoristas = document.getElementById('statMotoristas');
    const statDisponiveis = document.getElementById('statDisponiveis');
    
    if (statConjuntos) statConjuntos.innerText = conjuntos.length;
    if (statCaminhoes) statCaminhoes.innerText = conjuntos.reduce((acc, c) => acc + (c.caminhoes?.length || 0), 0);
    if (statMotoristas) statMotoristas.innerText = motoristas.length;
    
    if (statDisponiveis) {
        const qtdeDisponiveis = motoristas.filter(m => !m.conjuntoId).length;
        statDisponiveis.innerText = qtdeDisponiveis;
    }
}

window.initDashboard = async function() {
    // 1. CARREGA OS DADOS DO BANCO PRIMEIRO
    await carregarDadosIniciais();
    
    if(typeof carregarDadosTreinamento === 'function') {
        await carregarDadosTreinamento(); 
    }
    
    atualizarStats();

    // 2. RENDERIZA O MENU E INICIA A TELA PADRÃO
    if (typeof window.renderizarMenu === 'function') {
        window.renderizarMenu();
    }
}