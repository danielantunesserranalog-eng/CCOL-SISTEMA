// ==================== js/os_impressao.js ====================
// Módulo exclusivo para a lógica e formatação de Impressão de O.S. (Cavalos e GO)

window.imprimirOS = async function(osId) {
    const os = ordensServico.find(o => o.id === osId);
    if (!os) return;
    
    // Busca a frota pelo Cavalo OU pelo GO (quando for manutenção apenas nas carretas)
    const frota = frotasManutencao.find(f => f.cavalo === os.placa || f.go === os.placa) || {};
    const infoAbertoPor = os.aberto_por || os.usuario || 'Não Informado';
    
    const numeroOSFormatado = String(os.id).padStart(4, '0');
    let dataAberturaFormatada = os.data_abertura;
    let dataConclusaoFormatada = os.data_conclusao || 'Em andamento';
    
    try {
        if(typeof formatarDataHoraBrasil === 'function') {
            dataAberturaFormatada = formatarDataHoraBrasil(os.data_abertura);
            if(os.data_conclusao) dataConclusaoFormatada = formatarDataHoraBrasil(os.data_conclusao);
        } else if (os.data_abertura) {
            dataAberturaFormatada = new Date(os.data_abertura).toLocaleString('pt-BR');
            if(os.data_conclusao) dataConclusaoFormatada = new Date(os.data_conclusao).toLocaleString('pt-BR');
        }
    } catch(e) {}
    
    let painelBorracharia = '';
    if (os.tipo === 'Borracharia (PNEU)') {
        painelBorracharia = `
            <div class="box-content" style="margin-top: 5px;">
                <strong>🛠️ DETALHES DE BORRACHARIA:</strong>
                Posição: <b>${os.pneu_posicao || '-'}</b> &nbsp;|&nbsp; Serviço: <b>${os.pneu_servico || '-'}</b> &nbsp;|&nbsp; Motivo: <b>${os.pneu_motivo || '-'}</b>
            </div>
        `;
    }

    // Tabela de Serviços (5 colunas perfeitamente alinhadas)
    let linhasServicos = '';
    for(let i=0; i<5; i++) {
        linhasServicos += `
        <tr style="height: 25px;">
            <td></td>
            <td style="text-align:center; font-size:10px; font-weight:bold; white-space: nowrap;">1 (&nbsp;&nbsp;)&nbsp;&nbsp;2 (&nbsp;&nbsp;)&nbsp;&nbsp;3 (&nbsp;&nbsp;)</td>
            <td></td>
            <td></td>
            <td></td>
        </tr>`;
    }

    // Tabela de Peças (6 colunas perfeitamente alinhadas)
    let linhasPecas = '';
    for(let i=0; i<5; i++) {
        linhasPecas += `
        <tr style="height: 25px;">
            <td></td>
            <td></td>
            <td style="text-align:center; font-size:10px; font-weight:bold; white-space: nowrap;">1 (&nbsp;&nbsp;)&nbsp;&nbsp;2 (&nbsp;&nbsp;)&nbsp;&nbsp;3 (&nbsp;&nbsp;)</td>
            <td></td>
            <td></td>
            <td></td>
        </tr>`;
    }

    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <base href="${baseUrl}">
            <title>OS ${os.placa} - #${numeroOSFormatado}</title>
            <style>
                @page { size: landscape; margin: 10mm; }
                body { 
                    font-family: Arial, sans-serif; 
                    font-size: 11px; 
                    color: #000; 
                    margin: 0; 
                    padding: 0; 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact; 
                }
                
                .header-container { display: flex; border: 2px solid #000; margin-bottom: 5px; }
                .header-left { padding: 10px; border-right: 2px solid #000; display: flex; align-items: center; justify-content: center; width: 140px; }
                .header-left img { max-height: 45px; max-width: 100%; object-fit: contain; }
                .header-center { flex: 1; text-align: center; padding: 10px; }
                .header-center h1 { margin: 0; font-size: 16px; text-transform: uppercase; }
                .header-center h2 { margin: 2px 0 0 0; font-size: 12px; font-weight: normal; }
                .header-right { padding: 10px; border-left: 2px solid #000; text-align: center; display: flex; flex-direction: column; justify-content: center; background: #f0f0f0; }
                .header-right strong { font-size: 18px; color: red; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
                th, td { border: 1px solid #000; padding: 3px 5px; font-size: 11px; text-align: left; }
                th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
                
                .info-table td { width: 25%; }
                
                .section-title { font-weight: bold; background-color: #f0f0f0; border: 1px solid #000; border-bottom: none; padding: 4px; font-size: 11px; text-align: center; text-transform: uppercase; margin-bottom: 0; }
                .box-content { border: 1px solid #000; padding: 5px; font-size: 11px; min-height: 35px; margin-bottom: 5px; }
                
                .assinaturas { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; margin-top: 20px; padding: 0 20px; text-align: center; }
                .linha-ass { border-top: 1px solid #000; padding-top: 4px; font-weight: bold; font-size: 11px; }
            </style>
        </head>
        <body>
            <div class="header-container">
                <div class="header-left">
                    <img src="assets/logoverde.png" alt="Serrana Log">
                </div>
                <div class="header-center">
                    <h1>ORDEM DE SERVIÇO DE MANUTENÇÃO E FROTAS</h1>
                    <h2>CCOL - Centro de Controle Operacional Logístico</h2>
                </div>
                <div class="header-right">
                    O.S. Nº<br>
                    <strong>${numeroOSFormatado}</strong>
                </div>
            </div>
            
            <table class="info-table">
                <tr>
                    <td><strong>Conjunto / GO:</strong> ${os.placa || '-'}</td>
                    <td><strong>Abertura:</strong> ${dataAberturaFormatada}</td>
                    <td><strong>Status:</strong> ${os.status}</td>
                    <td><strong>Emitido por:</strong> <span style="font-size: 13px; font-weight: bold;">${infoAbertoPor}</span></td>
                </tr>
                <tr>
                    <td><strong>Motorista Solicitante:</strong> ${os.motorista || '-'}</td>
                    <td><strong>Conclusão:</strong> ${dataConclusaoFormatada}</td>
                    <td><strong>Prioridade:</strong> ${os.prioridade || '-'}</td>
                    <td><strong>Tipo de Serviço:</strong> ${os.tipo || '-'}</td>
                </tr>
                <tr>
                    <td><strong>Hodômetro:</strong> ${os.hodometro || '-'}</td>
                    <td colspan="3" style="background-color: #f9fafb;">
                        <strong>Composição Vinculada:</strong> 
                        GO: <b>${frota.go || '-'}</b> &nbsp;|&nbsp; Carretas: <b>${frota.carreta1 || '-'} / ${frota.carreta2 || '-'} / ${frota.carreta3 || '-'}</b>
                    </td>
                </tr>
            </table>
            
            ${painelBorracharia}
            
            <div class="section-title">Diagnóstico Inicial do Condutor / Problema</div>
            <div class="box-content">
                ${os.problema ? os.problema.replace(/\n/g, '<br>') : ''}
            </div>
            
            <div class="section-title">Serviços Executados (Preenchimento da Oficina)</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 40%;">Descrição do Serviço</th>
                        <th style="width: 15%;">Carreta</th>
                        <th style="width: 15%;">Início</th>
                        <th style="width: 15%;">Fim</th>
                        <th style="width: 15%;">Mecânico</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasServicos}
                </tbody>
            </table>
            
            <div class="section-title">Materiais e Peças Utilizados (CCOL / Estoque)</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 12%;">Código</th>
                        <th style="width: 33%;">Descrição da Peça / Material Utilizado</th>
                        <th style="width: 15%;">Carreta</th>
                        <th style="width: 10%;">Qtd</th>
                        <th style="width: 15%;">Data/Hora Solicit.</th>
                        <th style="width: 15%;">Data/Hora Retirada</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasPecas}
                </tbody>
            </table>
            
            <div class="section-title" style="border-bottom: 1px solid #000; margin-bottom: 0;">Observações Gerais / Pendências</div>
            <div class="box-content" style="border-top: none; min-height: 25px; margin-bottom: 5px;">
                ${os.observacoes ? os.observacoes.replace(/\n/g, '<br>') : ''}
            </div>
            
            <div class="assinaturas">
                <div class="linha-ass">Motorista / Responsável</div>
                <div class="linha-ass">Mecânico / Oficina</div>
                <div class="linha-ass">CCOL / Gestor</div>
            </div>
            
            <script>
                window.onload = function() { setTimeout(() => { window.print(); }, 250); }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

window.imprimirTodasOSFiltradas = async function() {
    const numFilter = document.getElementById('filtroHistOSNum')?.value.trim();
    const placaFilter = document.getElementById('filtroHistPlaca')?.value;
    const motoristaFilter = document.getElementById('filtroHistMotorista')?.value;
    const tipoFilter = document.getElementById('filtroHistTipo')?.value;
    const mesAnoFilter = document.getElementById('filtroHistMesAno')?.value;
    const inicioFilter = document.getElementById('filtroHistDataInicio')?.value;
    const fimFilter = document.getElementById('filtroHistDataFim')?.value;

    let osParaImprimir = ordensServico.filter(os => {
        if (numFilter && os.id.toString() !== numFilter && (os.numero_os && os.numero_os.toString() !== numFilter)) return false;
        if (placaFilter && os.placa !== placaFilter) return false;
        if (motoristaFilter && os.motorista !== motoristaFilter) return false;
        if (tipoFilter && os.tipo !== tipoFilter) return false;

        if (mesAnoFilter && os.data_abertura) {
            const dataOs = new Date(os.data_abertura);
            const mesOs = String(dataOs.getMonth() + 1).padStart(2, '0');
            const anoOs = dataOs.getFullYear();
            if (`${mesOs}/${anoOs}` !== mesAnoFilter) return false;
        }

        if (inicioFilter || fimFilter) {
            const dataOs = new Date(os.data_abertura).toISOString().split('T')[0];
            if (inicioFilter && dataOs < inicioFilter) return false;
            if (fimFilter && dataOs > fimFilter) return false;
        }

        return true;
    });

    if (osParaImprimir.length === 0) {
        alert('Nenhuma O.S. encontrada com os filtros atuais para imprimir.');
        return;
    }

    if (osParaImprimir.length > 50) {
        if (!confirm(`Você está prestes a imprimir ${osParaImprimir.length} Ordens de Serviço de uma vez. Deseja continuar?`)) {
            return;
        }
    }

    let conteudoImpressao = '';
    const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);

    osParaImprimir.forEach((os, index) => {
        const frota = frotasManutencao.find(f => f.cavalo === os.placa || f.go === os.placa) || {};
        const infoAbertoPor = os.aberto_por || os.usuario || 'Não Informado';
        const numeroOSFormatado = String(os.id).padStart(4, '0');
        let dataAberturaFormatada = os.data_abertura;
        let dataConclusaoFormatada = os.data_conclusao || 'Em andamento';

        try {
            if(typeof formatarDataHoraBrasil === 'function') {
                dataAberturaFormatada = formatarDataHoraBrasil(os.data_abertura);
                if(os.data_conclusao) dataConclusaoFormatada = formatarDataHoraBrasil(os.data_conclusao);
            } else if (os.data_abertura) {
                dataAberturaFormatada = new Date(os.data_abertura).toLocaleString('pt-BR');
                if(os.data_conclusao) dataConclusaoFormatada = new Date(os.data_conclusao).toLocaleString('pt-BR');
            }
        } catch(e) {}

        let painelBorracharia = '';
        if (os.tipo === 'Borracharia (PNEU)') {
            painelBorracharia = `
                <div class="box-content" style="margin-top: 5px;">
                    <strong>🛠️ DETALHES DE BORRACHARIA:</strong>
                    Posição: <b>${os.pneu_posicao || '-'}</b> &nbsp;|&nbsp; Serviço: <b>${os.pneu_servico || '-'}</b> &nbsp;|&nbsp; Motivo: <b>${os.pneu_motivo || '-'}</b>
                </div>
            `;
        }

        // Tabela de Serviços (Lote)
        let linhasServicos = '';
        for(let i=0; i<5; i++) {
            linhasServicos += `
            <tr style="height: 25px;">
                <td></td>
                <td style="text-align:center; font-size:10px; font-weight:bold; white-space: nowrap;">1 (&nbsp;&nbsp;)&nbsp;&nbsp;2 (&nbsp;&nbsp;)&nbsp;&nbsp;3 (&nbsp;&nbsp;)</td>
                <td></td>
                <td></td>
                <td></td>
            </tr>`;
        }

        // Tabela de Peças (Lote)
        let linhasPecas = '';
        for(let i=0; i<5; i++) {
            linhasPecas += `
            <tr style="height: 25px;">
                <td></td>
                <td></td>
                <td style="text-align:center; font-size:10px; font-weight:bold; white-space: nowrap;">1 (&nbsp;&nbsp;)&nbsp;&nbsp;2 (&nbsp;&nbsp;)&nbsp;&nbsp;3 (&nbsp;&nbsp;)</td>
                <td></td>
                <td></td>
                <td></td>
            </tr>`;
        }

        const pageBreak = index < osParaImprimir.length - 1 ? 'page-break-after: always;' : '';

        conteudoImpressao += `
            <div class="os-page" style="${pageBreak}">
                <div class="header-container">
                    <div class="header-left">
                        <img src="assets/logoverde.png" alt="Serrana Log">
                    </div>
                    <div class="header-center">
                        <h1>ORDEM DE SERVIÇO DE MANUTENÇÃO E FROTAS</h1>
                        <h2>CCOL - Centro de Controle Operacional Logístico</h2>
                    </div>
                    <div class="header-right">
                        O.S. Nº<br>
                        <strong>${numeroOSFormatado}</strong>
                    </div>
                </div>
                
                <table class="info-table">
                    <tr>
                        <td><strong>Conjunto / GO:</strong> ${os.placa || '-'}</td>
                        <td><strong>Abertura:</strong> ${dataAberturaFormatada}</td>
                        <td><strong>Status:</strong> ${os.status}</td>
                        <td><strong>Emitido por:</strong> <span style="font-size: 13px; font-weight: bold;">${infoAbertoPor}</span></td>
                    </tr>
                    <tr>
                        <td><strong>Motorista Solicitante:</strong> ${os.motorista || '-'}</td>
                        <td><strong>Conclusão:</strong> ${dataConclusaoFormatada}</td>
                        <td><strong>Prioridade:</strong> ${os.prioridade || '-'}</td>
                        <td><strong>Tipo de Serviço:</strong> ${os.tipo || '-'}</td>
                    </tr>
                    <tr>
                        <td><strong>Hodômetro:</strong> ${os.hodometro || '-'}</td>
                        <td colspan="3" style="background-color: #f9fafb;">
                            <strong>Composição Vinculada:</strong> 
                            GO: <b>${frota.go || '-'}</b> &nbsp;|&nbsp; Carretas: <b>${frota.carreta1 || '-'} / ${frota.carreta2 || '-'} / ${frota.carreta3 || '-'}</b>
                        </td>
                    </tr>
                </table>
                
                ${painelBorracharia}
                
                <div class="section-title">Diagnóstico Inicial do Condutor / Problema</div>
                <div class="box-content">
                    ${os.problema ? os.problema.replace(/\n/g, '<br>') : ''}
                </div>
                <div class="section-title">Serviços Executados (Preenchimento da Oficina)</div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 40%;">Descrição do Serviço</th>
                            <th style="width: 15%;">Carreta</th>
                            <th style="width: 15%;">Início</th>
                            <th style="width: 15%;">Fim</th>
                            <th style="width: 15%;">Mecânico</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasServicos}
                    </tbody>
                </table>
                <div class="section-title">Materiais e Peças Utilizados (CCOL / Estoque)</div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 12%;">Código</th>
                            <th style="width: 33%;">Descrição da Peça / Material Utilizado</th>
                            <th style="width: 15%;">Carreta</th>
                            <th style="width: 10%;">Qtd</th>
                            <th style="width: 15%;">Data/Hora Solicit.</th>
                            <th style="width: 15%;">Data/Hora Retirada</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasPecas}
                    </tbody>
                </table>
                <div class="section-title" style="border-bottom: 1px solid #000; margin-bottom: 0;">Observações Gerais / Pendências</div>
                <div class="box-content" style="border-top: none; min-height: 25px; margin-bottom: 5px;">
                    ${os.observacoes ? os.observacoes.replace(/\n/g, '<br>') : ''}
                </div>
                <div class="assinaturas">
                    <div class="linha-ass">Motorista / Responsável</div>
                    <div class="linha-ass">Mecânico / Oficina</div>
                    <div class="linha-ass">CCOL / Gestor</div>
                </div>
            </div>
        `;
    });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <base href="${baseUrl}">
            <title>Impressão Lote - Ordens de Serviço</title>
            <style>
                @page { size: landscape; margin: 10mm; }
                body {
                    font-family: Arial, sans-serif;
                    font-size: 11px;
                    color: #000;
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                .os-page { width: 100%; }

                .header-container { display: flex; border: 2px solid #000; margin-bottom: 5px; }
                .header-left { padding: 10px; border-right: 2px solid #000; display: flex; align-items: center; justify-content: center; width: 140px; }
                .header-left img { max-height: 45px; max-width: 100%; object-fit: contain; }
                .header-center { flex: 1; text-align: center; padding: 10px; }
                .header-center h1 { margin: 0; font-size: 16px; text-transform: uppercase; }
                .header-center h2 { margin: 2px 0 0 0; font-size: 12px; font-weight: normal; }
                .header-right { padding: 10px; border-left: 2px solid #000; text-align: center; display: flex; flex-direction: column; justify-content: center; background: #f0f0f0; }
                .header-right strong { font-size: 18px; color: red; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
                th, td { border: 1px solid #000; padding: 3px 5px; font-size: 11px; text-align: left; }
                th { background-color: #f0f0f0; font-weight: bold; text-align: center; }

                .info-table td { width: 25%; }

                .section-title { font-weight: bold; background-color: #f0f0f0; border: 1px solid #000; border-bottom: none; padding: 4px; font-size: 11px; text-align: center; text-transform: uppercase; margin-bottom: 0; }
                .box-content { border: 1px solid #000; padding: 5px; font-size: 11px; min-height: 35px; margin-bottom: 5px; }

                .assinaturas { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; margin-top: 20px; padding: 0 20px; text-align: center; }
                .linha-ass { border-top: 1px solid #000; padding-top: 4px; font-weight: bold; font-size: 11px; }
            </style>
        </head>
        <body>
            ${conteudoImpressao}
            <script>
                window.onload = function() { setTimeout(() => { window.print(); }, 500); }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};