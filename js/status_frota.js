window.renderizarStatusFrota = async function() {
    // 1. Atualiza dados globais (de os.js e conjuntos.js)
    if (typeof carregarDadosOS === 'function') await carregarDadosOS();
    
    const tbody = document.getElementById('tabelaStatusFrota');
    if (!tbody) return;

    let total = frotasManutencao.length;
    let parados = 0;
    let html = '';

    frotasManutencao.forEach(veiculo => {
        // Busca O.S. aberta para esta placa (usando o campo 'cavalo' da frota)
        const osAtiva = ordensServico.find(os => os.placa === veiculo.cavalo && os.status !== 'Concluída');

        if (osAtiva) {
            parados++;
            
            // Cálculos de tempo
            let dataParou = osAtiva.data_abertura ? window.formatarDataHoraBrasil(osAtiva.data_abertura) : 'N/D';
            let previsao = osAtiva.previsao ? window.formatarDataHoraBrasil(osAtiva.previsao) : '<span style="color:#666">NÃO INFORMADA</span>';
            let tempoH = '0h';

            if (osAtiva.data_abertura) {
                const diff = new Date() - new Date(osAtiva.data_abertura);
                tempoH = Math.floor(diff / (1000 * 60 * 60)) + "h " + Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)) + "m";
            }

            // Estilo do status
            let corStatus = osAtiva.prioridade === 'Urgente' ? '#ef4444' : '#facc15';

            html += `
                <tr>
                    <td style="font-weight: 800; color: var(--ccol-blue-bright); font-size: 1.1rem;">${veiculo.cavalo}</td>
                    <td style="font-weight: bold;">${veiculo.go || '-'}</td>
                    <td style="color: var(--text-primary); font-weight: 500;">${(osAtiva.problema || 'MANUTENÇÃO GERAL').toUpperCase()}</td>
                    <td style="text-align: center; font-size: 0.85rem;">${dataParou}</td>
                    <td style="text-align: center; font-weight: bold; color: var(--ccol-green-bright);">${previsao}</td>
                    <td style="text-align: center; font-weight: bold;">${tempoH}</td>
                    <td style="text-align: center;">
                        <span style="border: 1px solid ${corStatus}; color: ${corStatus}; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 800;">
                            ${osAtiva.status.toUpperCase()}
                        </span>
                    </td>
                </tr>
            `;
        }
    });

    if (parados === 0) {
        html = '<tr><td colspan="7" style="text-align:center; padding: 40px; color: #10b981; font-weight: bold;">✅ TODA A FROTA ESTÁ OPERANTE NO MOMENTO</td></tr>';
    }

    tbody.innerHTML = html;

    // 3. Atualiza os Cartões de Indicadores (KPIs)
    let operando = total - parados;
    let pOperando = total > 0 ? Math.round((operando / total) * 100) : 0;
    let pParado = total > 0 ? Math.round((parados / total) * 100) : 0;

    document.getElementById('kpiTotalStatus').innerText = total;
    document.getElementById('kpiOperandoStatus').innerText = operando;
    document.getElementById('kpiParadoStatus').innerText = parados;
    
    document.getElementById('percOperando').innerText = `${pOperando}% da frota disponível`;
    document.getElementById('percParado').innerText = `${pParado}% em manutenção`;
};