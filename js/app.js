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

/**
 * Exporta um gráfico do ECharts para uma imagem PNG de alta qualidade.
 * @param {string} idElemento - O ID do elemento HTML que contém o gráfico.
 * @param {string} nomeArquivo - O nome base para o arquivo de download.
 */
window.exportarGraficoPNG = function(idElemento, nomeArquivo) {
    const dom = document.getElementById(idElemento);
    if (!dom) {
        console.error("Elemento do gráfico não encontrado:", idElemento);
        return;
    }

    // Obtém a instância do ECharts vinculada ao DOM
    const chartInstance = echarts.getInstanceByDom(dom);

    if (!chartInstance) {
        alert("O gráfico ainda não foi carregado ou não está pronto para exportação.");
        return;
    }

    try {
        // Gera a URL da imagem (DataURL)
        const url = chartInstance.getDataURL({
            type: 'png',
            pixelRatio: 2, // Dobra a resolução para garantir nitidez (Alta Qualidade)
            backgroundColor: '#0f172a', // Cor de fundo do dashboard (Dark Blue)
            excludeComponents: ['toolbox', 'dataZoom'] // Opcional: remove botões internos do gráfico na imagem
        });

        // Cria um link temporário para o download
        const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const link = document.createElement('a');
        link.href = url;
        link.download = `${nomeArquivo}_${dataAtual}.png`;
        
        // Simula o clique para baixar
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (e) {
        console.error("Erro ao exportar gráfico:", e);
        alert("Não foi possível gerar a imagem. Tente atualizar a página.");
    }
};