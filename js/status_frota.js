// Variável global para guardar o intervalo do relógio do Dashboard
let statusFrotaInterval = null;

window.renderizarStatusFrota = async function(atualizarBanco = true) {
    // 1. Atualiza dados globais (apenas na primeira chamada ou quando clica no botão atualizar)
    if (atualizarBanco && typeof carregarDadosOS === 'function') {
        await carregarDadosOS();
    }
    
    const tbody = document.getElementById('tabelaStatusFrota');
    if (!tbody) return;

    let total = frotasManutencao.length;
    let parados = 0; // Veículos em manutenção
    let sinistrados = 0; // Veículos em sinistro
    let html = '';
    const agora = new Date(); // Pega a hora exata deste segundo

    frotasManutencao.forEach(veiculo => {
        // Busca O.S. aberta para esta placa
        const osAtiva = ordensServico.find(os => os.placa === veiculo.cavalo && os.status !== 'Concluída');

        if (osAtiva) {
            let isSinistro = osAtiva.tipo === 'Sinistro';
            
            if (isSinistro) {
                sinistrados++;
            } else {
                parados++;
            }
            
            // Tratamento da Data de Abertura (igual ao Painel de TV)
            let stringEntrada = osAtiva.data_abertura;
            let dataParouStr = 'N/D';
            let tempoH = '00:00';

            if (stringEntrada) {
                // Remove fuso horário forçado para o navegador interpretar como hora local correta
                stringEntrada = stringEntrada.replace('Z', '').replace('+00:00', '');
                if (!stringEntrada.includes('T')) {
                    stringEntrada += 'T00:00:00';
                }
                
                const dataEntrada = new Date(stringEntrada);
                dataParouStr = window.formatarDataHoraBrasil ? window.formatarDataHoraBrasil(osAtiva.data_abertura) : dataEntrada.toLocaleString('pt-BR');
                
                // Cálculo exato do tempo no pátio (Agora - Data Entrada)
                const diffEntrada = agora - dataEntrada;
                
                if (diffEntrada > 0) {
                    const horasPatio = Math.floor(diffEntrada / (1000 * 60 * 60));
                    const minPatio = Math.floor((diffEntrada % (1000 * 60 * 60)) / (1000 * 60));
                    // Formata com Zero a esquerda (ex: 05:09h)
                    tempoH = `${String(horasPatio).padStart(2, '0')}:${String(minPatio).padStart(2, '0')}h`;
                }
            }

            let previsao = osAtiva.previsao ? (window.formatarDataHoraBrasil ? window.formatarDataHoraBrasil(osAtiva.previsao) : osAtiva.previsao) : '<span style="color:#666">NÃO INFORMADA</span>';

            // Estilo do status
            let corStatus = osAtiva.prioridade === 'Urgente' ? '#f97316' : '#facc15';
            let bgRow = osAtiva.prioridade === 'Urgente' ? 'background: rgba(249, 115, 22, 0.05);' : '';
            
            // Override para Sinistro
            if (isSinistro) {
                corStatus = '#ef4444'; // Vermelho alerta
                bgRow = 'background: rgba(239, 68, 68, 0.1);';
            }

            html += `
                <tr style="${bgRow}">
                    <td style="font-weight: 900; color: var(--ccol-blue-bright); font-size: 1.1rem;">${veiculo.cavalo}</td>
                    <td style="font-weight: bold; color: var(--text-secondary); text-align: center;">${veiculo.go || '-'}</td>
                    <td style="color: var(--text-primary); font-weight: 600; font-size: 0.9rem;">${(osAtiva.problema || (isSinistro ? 'SINISTRO' : 'MANUTENÇÃO GERAL')).toUpperCase()}</td>
                    <td style="text-align: center; font-size: 0.85rem; color: var(--text-secondary);">${dataParouStr}</td>
                    <td style="text-align: center; font-weight: bold; color: var(--ccol-green-bright);">${previsao}</td>
                    <td style="text-align: center; font-weight: 900; color: #fff; font-size: 1.1rem; font-family: monospace;">${tempoH}</td>
                    <td style="text-align: center;">
                        <span style="border: 1px solid ${corStatus}; background: rgba(0,0,0,0.2); color: ${corStatus}; padding: 6px 12px; border-radius: 4px; font-size: 0.75rem; font-weight: 800; display: inline-block;">
                            ${isSinistro ? 'SINISTRADO' : osAtiva.status.toUpperCase()}
                        </span>
                    </td>
                </tr>
            `;
        }
    });

    if (parados === 0 && sinistrados === 0) {
        html = '<tr><td colspan="7" style="text-align:center; padding: 40px; color: #10b981; font-weight: bold; font-size: 1.2rem;">✅ TODA A FROTA ESTÁ OPERANTE NO MOMENTO</td></tr>';
    }

    tbody.innerHTML = html;

    // 3. Atualiza os Cartões de Indicadores (KPIs)
    let operando = total - parados - sinistrados;
    let pOperando = total > 0 ? Math.round((operando / total) * 100) : 0;
    let pParado = total > 0 ? Math.round((parados / total) * 100) : 0;
    let pSinistro = total > 0 ? Math.round((sinistrados / total) * 100) : 0;

    document.getElementById('kpiTotalStatus').innerText = total;
    document.getElementById('kpiOperandoStatus').innerText = operando;
    document.getElementById('kpiParadoStatus').innerText = parados;
    if(document.getElementById('kpiSinistroStatus')) document.getElementById('kpiSinistroStatus').innerText = sinistrados;
    
    document.getElementById('percOperando').innerText = `${pOperando}% da frota disponível`;
    document.getElementById('percParado').innerText = `${pParado}% em manutenção`;
    if(document.getElementById('percSinistro')) document.getElementById('percSinistro').innerText = `${pSinistro}% sinistrado`;

    // Inicia o relógio para atualizar o tempo na tela a cada minuto automaticamente
    iniciarRelogioStatusFrota();
};

// Função para manter o "Tempo Parado" atualizando sozinho sem piscar a tela toda
function iniciarRelogioStatusFrota() {
    if (statusFrotaInterval) clearInterval(statusFrotaInterval);
    
    // Atualiza apenas os cálculos da tabela a cada 60 segundos, sem recarregar o banco
    statusFrotaInterval = setInterval(() => {
        // Verifica se a tela de status da frota ainda está aberta
        const tbody = document.getElementById('tabelaStatusFrota');
        if (tbody) {
            window.renderizarStatusFrota(false); // Atualiza a tela, mas false = não busca no banco
        } else {
            clearInterval(statusFrotaInterval);
        }
    }, 60000); // 60.000 ms = 1 minuto
}

// === FUNÇÃO PARA GERAR A VISÃO EXATA DA PLANILHA PARA WHATSAPP ===
window.imprimirStatusFrotaWhatsapp = async function() {
    if (typeof carregarDadosOS === 'function') await carregarDadosOS();

    let linhasTabela = '';
    const agora = new Date();

    frotasManutencao.forEach((frota, index) => {
        const osAberta = ordensServico.find(os => os.placa === frota.cavalo && os.status !== 'Concluída');

        let descricao = 'EM OPERAÇÃO';
        let dataParou = '';
        let dataRetorno = '';
        let tempoParado = '';
        let statusManu = 'LIBERADO';
        
        let bgLinha = '#ffffff';
        let bgStatus = '#00b050'; // Verde Excel
        let corTextoStatus = '#ffffff';

        if (osAberta) {
            let isSinistro = osAberta.tipo === 'Sinistro';
            
            descricao = osAberta.problema ? osAberta.problema.toUpperCase() : (isSinistro ? 'SINISTRO' : 'EM MANUTENÇÃO');
            dataRetorno = osAberta.previsao ? window.formatarDataHoraBrasil(osAberta.previsao) : '';
            statusManu = isSinistro ? 'SINISTRADO' : osAberta.status.toUpperCase();

            // Cálculo do tempo exato para o Print
            let stringEntrada = osAberta.data_abertura;
            if (stringEntrada) {
                stringEntrada = stringEntrada.replace('Z', '').replace('+00:00', '');
                if (!stringEntrada.includes('T')) stringEntrada += 'T00:00:00';
                
                const dataEntrada = new Date(stringEntrada);
                dataParou = window.formatarDataHoraBrasil(osAberta.data_abertura);
                
                const diffEntrada = agora - dataEntrada;
                if (diffEntrada > 0) {
                    const horasPatio = Math.floor(diffEntrada / (1000 * 60 * 60));
                    const minPatio = Math.floor((diffEntrada % (1000 * 60 * 60)) / (1000 * 60));
                    tempoParado = `${String(horasPatio).padStart(2, '0')}:${String(minPatio).padStart(2, '0')}`;
                }
            }

            // Cores do Print
            if (isSinistro) {
                bgLinha = '#8b0000'; // Vermelho escuro para Sinistro
                bgStatus = '#8b0000';
                corTextoStatus = '#ffffff';
            } else if (osAberta.prioridade === 'Urgente') {
                bgLinha = '#ff0000'; // Vermelho vivo
                bgStatus = '#ff0000';
                corTextoStatus = '#ffffff';
            } else {
                bgLinha = '#ffff00'; // Amarelo
                bgStatus = '#ffff00';
                corTextoStatus = '#000000';
            }
        }

        linhasTabela += `
            <tr style="background-color: ${bgLinha};">
                <td style="text-align: center;">${index + 1}</td>
                <td style="text-align: center; font-weight: bold;">GERAL</td>
                <td style="text-align: center; font-weight: bold;">${frota.go || ''}</td>
                <td style="text-align: center; font-weight: 900;">${frota.cavalo}</td>
                <td style="font-weight: bold; color: ${bgLinha === '#8b0000' ? '#ffffff' : '#000000'};">${descricao}</td>
                <td style="text-align: center; font-weight: bold; color: ${bgLinha === '#8b0000' ? '#ffffff' : '#000000'};">${dataParou}</td>
                <td style="text-align: center; font-weight: bold; color: ${bgLinha === '#8b0000' ? '#ffffff' : '#000000'};">${dataRetorno}</td>
                <td style="text-align: center; font-weight: bold; color: ${bgLinha === '#8b0000' ? '#ffffff' : '#000000'};">${tempoParado}</td>
                <td style="text-align: center; background-color: ${bgStatus}; color: ${corTextoStatus}; font-weight: 900;">${statusManu}</td>
            </tr>
        `;
    });

    const htmlImpressao = `
        <html>
        <head>
            <title>Status Frotas Operantes</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #fff; }
                .titulo-container { background-color: #00b050; padding: 15px; text-align: center; color: white; font-size: 32px; font-weight: bold; border: 2px solid #000; border-bottom: none; }
                table { width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 13px; }
                th, td { border: 1px solid #000; padding: 8px; }
                th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
                @media print { .btn-imprimir { display: none; } body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="titulo-container">
                STATUS FROTAS OPERANTES
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 30px;">QT</th>
                        <th style="width: 80px;">FRENTE</th>
                        <th style="width: 60px;">GO</th>
                        <th style="width: 80px;">PLACA</th>
                        <th>DESCRIÇÃO</th>
                        <th style="width: 130px;">DATA HORA QUE PAROU</th>
                        <th style="width: 130px;">PREVISÃO RETORNO</th>
                        <th style="width: 100px;">TEMPO PARADO (HR)</th>
                        <th style="width: 150px;">STATUS MANUTENÇÃO</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasTabela}
                </tbody>
            </table>
            
            <div style="text-align: center; margin-top: 30px;" class="btn-imprimir">
                <p style="color: #666; font-size: 14px;">Dica: Você pode tirar um Print (Captura de Tela) agora mesmo para mandar no WhatsApp!</p>
            </div>
        </body>
        </html>
    `;

    const janela = window.open('', '', 'width=1200,height=800');
    janela.document.write(htmlImpressao);
    janela.document.close();
}