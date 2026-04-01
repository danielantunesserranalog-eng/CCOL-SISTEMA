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
    
    statusFrotaInterval = setInterval(() => {
        const tbody = document.getElementById('tabelaStatusFrota');
        if (tbody) {
            window.renderizarStatusFrota(false);
        } else {
            clearInterval(statusFrotaInterval);
        }
    }, 60000); 
}

// === FUNÇÃO PARA GERAR IMAGEM IDENTICA AO EXCEL E BAIXAR (NOVO) ===
window.gerarImagemStatusFrota = async function() {
    if (typeof carregarDadosOS === 'function') await carregarDadosOS();

    let linhasTabela = '';
    const agora = new Date();

    // Helper formatar data (Ex: "10/02/2026 10:20")
    const formatDataPrint = (dataStr) => {
        if (!dataStr) return '-';
        if (dataStr.includes('T')) {
            const [d, h] = dataStr.split('T');
            return d.split('-').reverse().join('/') + ' ' + h.substring(0, 5);
        }
        return dataStr.split('-').reverse().join('/');
    };

    frotasManutencao.forEach((frota, index) => {
        const osAberta = ordensServico.find(os => os.placa === frota.cavalo && os.status !== 'Concluída');

        let descricao = 'EM OPERAÇÃO';
        let dataParou = '-';
        let dataRetorno = '-';
        let tempoParado = '-';
        let statusManu = 'LIBERADO';
        
        let bgLinha = '#ffffff';
        let bgStatus = '#00b050'; // Verde Excel
        let corTextoStatus = '#ffffff';
        let corTextoGeral = '#000000';

        if (osAberta) {
            let isSinistro = osAberta.tipo === 'Sinistro';
            
            descricao = osAberta.problema ? osAberta.problema.toUpperCase() : (isSinistro ? 'SINISTRO' : 'EM MANUTENÇÃO');
            dataRetorno = osAberta.previsao ? formatDataPrint(osAberta.previsao) : '-';
            statusManu = isSinistro ? 'SINISTRADO' : osAberta.status.toUpperCase();

            let stringEntrada = osAberta.data_abertura;
            if (stringEntrada) {
                stringEntrada = stringEntrada.replace('Z', '').replace('+00:00', '');
                if (!stringEntrada.includes('T')) stringEntrada += 'T00:00:00';
                
                const dataEntrada = new Date(stringEntrada);
                dataParou = formatDataPrint(stringEntrada);
                
                const diffEntrada = agora - dataEntrada;
                if (diffEntrada > 0) {
                    const horasPatio = Math.floor(diffEntrada / (1000 * 60 * 60));
                    const minPatio = Math.floor((diffEntrada % (1000 * 60 * 60)) / (1000 * 60));
                    tempoParado = `${String(horasPatio).padStart(2, '0')}:${String(minPatio).padStart(2, '0')}`;
                }
            }

            if (isSinistro || osAberta.prioridade === 'Urgente') {
                bgLinha = '#ff0000'; // Vermelho para sinistro/urgente
                bgStatus = '#ff0000';
                corTextoStatus = '#ffffff';
                corTextoGeral = '#ffffff';
            } else {
                bgLinha = '#ffff00'; // Amarelo
                bgStatus = '#ffff00';
                corTextoStatus = '#000000';
                corTextoGeral = '#000000';
            }
        }

        linhasTabela += `
            <tr style="background-color: ${bgLinha}; color: ${corTextoGeral};">
                <td style="text-align: center; border: 1px solid #000; padding: 4px; font-weight: bold;">${index + 1}</td>
                <td style="text-align: center; border: 1px solid #000; padding: 4px; font-weight: bold;">GERAL</td>
                <td style="text-align: center; border: 1px solid #000; padding: 4px; font-weight: bold;">${frota.go || '-'}</td>
                <td style="text-align: center; border: 1px solid #000; padding: 4px; font-weight: bold;">${frota.cavalo}</td>
                <td style="text-align: center; border: 1px solid #000; padding: 4px; font-weight: bold;">${descricao}</td>
                <td style="text-align: center; border: 1px solid #000; padding: 4px; font-weight: bold;">${dataParou}</td>
                <td style="text-align: center; border: 1px solid #000; padding: 4px; font-weight: bold;">${dataRetorno}</td>
                <td style="text-align: center; border: 1px solid #000; padding: 4px; font-weight: bold;">${tempoParado}</td>
                <td style="text-align: center; border: 1px solid #000; padding: 4px; background-color: ${bgStatus}; color: ${corTextoStatus}; font-weight: bold;">${statusManu}</td>
            </tr>
        `;
    });

    const htmlJanela = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Preview Tabela Frota</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 0; 
                    padding: 30px; 
                    background: #f0f2f5; 
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .wrapper {
                    background: #fff;
                    display: inline-block;
                    padding: 1px;
                }
                .titulo-container { 
                    background-color: #00b050; 
                    padding: 10px; 
                    text-align: center; 
                    color: white; 
                    font-size: 24px; 
                    font-weight: bold; 
                    border: 2px solid #000; 
                    border-bottom: none; 
                    margin: 0;
                    box-sizing: border-box;
                }
                table { 
                    border-collapse: collapse; 
                    border: 2px solid #000; 
                    font-size: 14px; 
                    width: max-content;
                    box-sizing: border-box;
                }
                th { 
                    background-color: #d9d9d9; 
                    font-weight: bold; 
                    text-align: center; 
                    border: 1px solid #000; 
                    padding: 6px;
                }
                .acoes {
                    margin-bottom: 25px;
                    text-align: center;
                }
                .btn-download {
                    background-color: #00b050;
                    color: #fff;
                    border: none;
                    padding: 12px 24px;
                    font-size: 16px;
                    font-weight: bold;
                    border-radius: 8px;
                    cursor: pointer;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    transition: 0.2s;
                }
                .btn-download:hover {
                    background-color: #008a3e;
                }
            </style>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
        </head>
        <body>
            <div class="acoes" id="acoes-print">
                <button class="btn-download" onclick="baixarImagem()">📸 BAIXAR IMAGEM AGORA (PNG)</button>
                <p style="color: #666; font-size: 14px; margin-top: 10px;">Abaixo é apenas uma visualização. Clique no botão verde para gerar o arquivo.</p>
            </div>

            <div class="wrapper" id="area-print">
                <div class="titulo-container">STATUS FROTAS OPERANTES</div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px;">QT</th>
                            <th style="width: 80px;">FRENTE</th>
                            <th style="width: 60px;">GO</th>
                            <th style="width: 100px;">PLACA</th>
                            <th style="width: 250px;">DESCRIÇÃO</th>
                            <th style="width: 150px;">DATA HORA QUE PAROU</th>
                            <th style="width: 150px;">PREVISÃO RETORNO</th>
                            <th style="width: 120px;">TEMPO PARADO (HR)</th>
                            <th style="width: 150px;">STATUS MANUTENÇÃO</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasTabela}
                    </tbody>
                </table>
            </div>

            <script>
                function baixarImagem() {
                    const area = document.getElementById('area-print');
                    const btnArea = document.getElementById('acoes-print');
                    
                    // Muda texto pra dar feedback
                    const btn = document.querySelector('.btn-download');
                    const textoOriginal = btn.innerHTML;
                    btn.innerHTML = '⏳ Gerando Imagem...';
                    
                    html2canvas(area, {
                        scale: 2, // Aumenta a resolução da imagem para ficar bem nítida
                        backgroundColor: '#ffffff'
                    }).then(canvas => {
                        const dataUrl = canvas.toDataURL('image/png');
                        const link = document.createElement('a');
                        link.download = 'Status_Frota_' + new Date().toISOString().slice(0,10) + '.png';
                        link.href = dataUrl;
                        link.click();
                        
                        btn.innerHTML = '✅ Baixado com sucesso!';
                        setTimeout(() => { btn.innerHTML = textoOriginal; }, 3000);
                    }).catch(err => {
                        alert('Ocorreu um erro ao gerar a imagem: ' + err);
                        btn.innerHTML = textoOriginal;
                    });
                }
            </script>
        </body>
        </html>
    `;

    const janela = window.open('', '_blank', 'width=1200,height=800');
    janela.document.write(htmlJanela);
    janela.document.close();
}