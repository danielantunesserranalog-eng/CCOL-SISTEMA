// ==================== MÓDULO: STATUS FROTA (DASHBOARD) ====================

window.renderizarStatusFrota = async function() {
    // Garante que os dados de OS e Frota estejam atualizados
    if (typeof carregarDadosOS === 'function') {
        await carregarDadosOS();
    }

    const tbody = document.getElementById('tabelaStatusFrota');
    if (!tbody) return;

    let totalFrota = frotasManutencao.length;
    let emOperacao = 0;
    let emManutencao = 0;

    let html = '';

    frotasManutencao.forEach((frota, index) => {
        // Busca se tem uma OS aberta para este cavalo
        const osAberta = ordensServico.find(os => os.placa === frota.cavalo && os.status !== 'Concluída');

        let descricao = 'EM OPERAÇÃO';
        let dataParou = '-';
        let dataRetorno = '-';
        let tempoParado = '-';
        let statusManu = 'LIBERADO';
        
        // Classes de CSS para o modo Dark (Dashboard)
        let bgRow = '';
        let corStatus = '#16a34a'; // Verde
        let bgStatus = 'rgba(22, 163, 74, 0.15)';

        if (osAberta) {
            emManutencao++;
            descricao = osAberta.problema ? osAberta.problema.toUpperCase() : 'MANUTENÇÃO';
            dataParou = osAberta.data_abertura ? window.formatarDataHoraBrasil(osAberta.data_abertura) : '-';
            dataRetorno = osAberta.previsao ? window.formatarDataHoraBrasil(osAberta.previsao) : 'SEM PREVISÃO';
            statusManu = osAberta.status.toUpperCase();

            // Cálculo do tempo parado
            if (osAberta.data_abertura) {
                const agora = new Date();
                const dataAbert = new Date(osAberta.data_abertura);
                const diffMs = agora - dataAbert;
                if (diffMs > 0) {
                    const horas = Math.floor(diffMs / (1000 * 60 * 60));
                    const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    tempoParado = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}h`;
                }
            }

            // Definição de cores (Amarelo para Normal, Vermelho para Urgente/Sinistro)
            if (osAberta.prioridade === 'Urgente') {
                bgRow = 'background-color: rgba(220, 38, 38, 0.1);';
                corStatus = '#ef4444'; // Vermelho
                bgStatus = 'rgba(239, 68, 68, 0.2)';
            } else {
                bgRow = 'background-color: rgba(250, 204, 21, 0.05);';
                corStatus = '#facc15'; // Amarelo
                bgStatus = 'rgba(250, 204, 21, 0.15)';
            }

        } else {
            emOperacao++;
        }

        html += `
            <tr style="${bgRow} border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="text-align: center; color: var(--text-secondary);">${index + 1}</td>
                <td style="text-align: center; font-weight: bold; color: var(--text-secondary);">${frota.go || '-'}</td>
                <td style="font-weight: 900; font-size: 1.1em; color: var(--ccol-blue-bright);">${frota.cavalo}</td>
                <td style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: ${osAberta ? 'bold' : 'normal'};" title="${descricao}">${descricao}</td>
                <td style="text-align: center;">${dataParou}</td>
                <td style="text-align: center;">${dataRetorno}</td>
                <td style="text-align: center; font-weight: bold;">${tempoParado}</td>
                <td style="text-align: center;">
                    <span style="background: ${bgStatus}; color: ${corStatus}; padding: 6px 12px; border-radius: 4px; font-weight: 800; font-size: 0.85rem; border: 1px solid ${corStatus}; display: block; white-space: nowrap;">
                        ${statusManu}
                    </span>
                </td>
            </tr>
        `;
    });

    if (frotasManutencao.length === 0) {
        html = '<tr><td colspan="8" style="text-align:center; padding: 30px;">Nenhuma frota cadastrada. Acesse "O.S." > "Cadastro Frota (O.S.)" para alimentar o sistema.</td></tr>';
    }

    tbody.innerHTML = html;

    // Atualiza os KPIs
    document.getElementById('kpiTotalStatus').innerText = totalFrota;
    document.getElementById('kpiOperandoStatus').innerText = emOperacao;
    document.getElementById('kpiParadoStatus').innerText = emManutencao;
}

// === FUNÇÃO PARA GERAR A VISÃO EXATA DA PLANILHA PARA WHATSAPP ===
window.imprimirStatusFrotaWhatsapp = async function() {
    if (typeof carregarDadosOS === 'function') await carregarDadosOS();

    let linhasTabela = '';

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
            descricao = osAberta.problema ? osAberta.problema.toUpperCase() : 'EM MANUTENÇÃO';
            dataParou = osAberta.data_abertura ? window.formatarDataHoraBrasil(osAberta.data_abertura) : '';
            dataRetorno = osAberta.previsao ? window.formatarDataHoraBrasil(osAberta.previsao) : '';
            statusManu = osAberta.status.toUpperCase();

            if (osAberta.data_abertura) {
                const agora = new Date();
                const diffMs = agora - new Date(osAberta.data_abertura);
                if (diffMs > 0) {
                    const horas = Math.floor(diffMs / (1000 * 60 * 60));
                    const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    tempoParado = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
                }
            }

            if (osAberta.prioridade === 'Urgente') {
                bgLinha = '#ff0000'; // Vermelho
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
                <td style="text-align: center;">GERAL</td>
                <td style="text-align: center;">${frota.go || ''}</td>
                <td style="text-align: center; font-weight: bold;">${frota.cavalo}</td>
                <td>${descricao}</td>
                <td style="text-align: center;">${dataParou}</td>
                <td style="text-align: center;">${dataRetorno}</td>
                <td style="text-align: center;">${tempoParado}</td>
                <td style="text-align: center; background-color: ${bgStatus}; color: ${corTextoStatus}; font-weight: bold;">${statusManu}</td>
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
                th, td { border: 1px solid #000; padding: 6px; }
                th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
                /* Oculta o botão na hora de bater o print real/salvar pdf */
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
                        <th style="width: 120px;">DATA HORA QUE PAROU</th>
                        <th style="width: 120px;">DATA HORA RETORNO</th>
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