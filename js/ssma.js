// ==================== MÓDULO: SSMA (Saúde, Segurança e Meio Ambiente) ====================

window.calcularStatusSSMA = function(dataIso) {
    if (!dataIso) return { classe: 'color: var(--text-secondary);', texto: 'Sem Data' };

    // Pegar apenas a data, ignorando o horário para não dar diferença de fuso
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Precisamos ajustar o timezone da data que vem do banco (YYYY-MM-DD)
    const partes = dataIso.split('-');
    const vencimento = new Date(partes[0], partes[1] - 1, partes[2]);
    vencimento.setHours(0, 0, 0, 0);

    const diferencaTempo = vencimento.getTime() - hoje.getTime();
    const diferencaDias = Math.ceil(diferencaTempo / (1000 * 3600 * 24));

    // Lógica das cores conforme solicitado
    if (diferencaDias < 0) {
        return { classe: 'color: #ef4444; font-weight: bold;', texto: `Vencido há ${Math.abs(diferencaDias)} dias` };
    } else if (diferencaDias <= 60) {
        return { classe: 'color: #f59e0b; font-weight: bold;', texto: `Vence em ${diferencaDias} dias` };
    } else {
        return { classe: 'color: #10b981;', texto: `OK (${diferencaDias} dias)` };
    }
};

window.renderizarSSMA = function() {
    const tbody = document.getElementById('ssmaList');
    if (!tbody) return;

    const searchInput = document.getElementById('searchSsma');
    const termoBusca = searchInput?.value.toLowerCase() || '';
    
    // Filtrar e ordenar alfabeticamente
    const funcFiltrados = motoristas
        .filter(m => m.nome.toLowerCase().includes(termoBusca))
        .sort((a, b) => a.nome.localeCompare(b.nome));

    let html = '';

    funcFiltrados.forEach(m => {
        const cargasInfo = calcularStatusSSMA(m.venc_cargas_indivisiveis);
        const cnhInfo = calcularStatusSSMA(m.venc_cnh);
        const asoInfo = calcularStatusSSMA(m.venc_aso);
        const integracaoInfo = calcularStatusSSMA(m.venc_integracao);

        // Verifica se o funcionário tem algum alerta vermelho para destacar a linha inteira
        const temAlertaCritico = [cargasInfo, cnhInfo, asoInfo, integracaoInfo].some(info => info.texto.includes('Vencido há'));
        
        // Verifica se tem alerta amarelo
        const temAlertaAmarelo = [cargasInfo, cnhInfo, asoInfo, integracaoInfo].some(info => info.texto.includes('Vence em'));

        let backgroundTr = '';
        if (temAlertaCritico) {
            backgroundTr = 'background: rgba(239, 68, 68, 0.05);';
        } else if (temAlertaAmarelo) {
            backgroundTr = 'background: rgba(245, 158, 11, 0.05);';
        }

        html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); ${backgroundTr}">
                <td><strong style="font-size: 1.05rem; color: var(--text-primary);">${m.nome}</strong></td>
                <td>
                    <span style="${cargasInfo.classe}">${cargasInfo.texto}</span><br>
                    <small style="color: var(--text-secondary);">${m.venc_cargas_indivisiveis ? m.venc_cargas_indivisiveis.split('-').reverse().join('/') : '-'}</small>
                </td>
                <td>
                    <span style="${cnhInfo.classe}">${cnhInfo.texto}</span><br>
                    <small style="color: var(--text-secondary);">${m.venc_cnh ? m.venc_cnh.split('-').reverse().join('/') : '-'}</small>
                </td>
                <td>
                    <span style="${asoInfo.classe}">${asoInfo.texto}</span><br>
                    <small style="color: var(--text-secondary);">${m.venc_aso ? m.venc_aso.split('-').reverse().join('/') : '-'}</small>
                </td>
                <td>
                    <span style="${integracaoInfo.classe}">${integracaoInfo.texto}</span><br>
                    <small style="color: var(--text-secondary);">${m.venc_integracao ? m.venc_integracao.split('-').reverse().join('/') : '-'}</small>
                </td>
            </tr>
        `;
    });

    if (funcFiltrados.length === 0) {
        html = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Nenhum funcionário encontrado.</td></tr>';
    }

    tbody.innerHTML = html;
};