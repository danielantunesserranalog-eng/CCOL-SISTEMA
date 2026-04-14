// ==================== js/os_painel.js ====================
// Módulo de Painéis, Indicadores Gerenciais, Gráficos DM, Modo TV e Exportações

function renderizarRelatorioGerencialOS() {
    const osManutencao = ordensServico.filter(o => o.tipo !== 'Sinistro');

    if (osManutencao.length === 0) {
        if(document.getElementById('kpiTotalOS')) document.getElementById('kpiTotalOS').innerText = '0';
        if(document.getElementById('kpiAbertasOS')) document.getElementById('kpiAbertasOS').innerText = '0';
        if(document.getElementById('kpiConcluidasOS')) document.getElementById('kpiConcluidasOS').innerText = '0';
        if(document.getElementById('kpiTaxaOS')) document.getElementById('kpiTaxaOS').innerText = '0%';
        if(document.getElementById('kpiTempoMedioOS')) document.getElementById('kpiTempoMedioOS').innerText = '0h 0m';
        renderizarRelatorioDM();
        return;
    }

    const total = osManutencao.length;
    const abertas = osManutencao.filter(o => o.status === 'Aguardando Oficina' || o.status === 'Em Manutenção').length;
    const concluidas = osManutencao.filter(o => o.status === 'Concluída');
    const taxa = ((concluidas.length / total) * 100).toFixed(1);

    if(document.getElementById('kpiTotalOS')) document.getElementById('kpiTotalOS').innerText = total;
    if(document.getElementById('kpiAbertasOS')) document.getElementById('kpiAbertasOS').innerText = abertas;
    if(document.getElementById('kpiConcluidasOS')) document.getElementById('kpiConcluidasOS').innerText = concluidas.length;
    if(document.getElementById('kpiTaxaOS')) document.getElementById('kpiTaxaOS').innerText = taxa + '%';

    let tempoTotalMs = 0;
    let qtdValidas = 0;

    concluidas.forEach(o => {
        if (o.data_abertura && o.data_conclusao) {
            const inicio = new Date(o.data_abertura);
            const fim = new Date(o.data_conclusao);
            
            if (!isNaN(inicio) && !isNaN(fim) && fim > inicio) {
                tempoTotalMs += (fim - inicio);
                qtdValidas++;
            }
        }
    });

    let textoTempoMedio = '0h 0m';
    if (qtdValidas > 0) {
        const mediaMs = tempoTotalMs / qtdValidas;
        const mediaHoras = Math.floor(mediaMs / (1000 * 60 * 60));
        const mediaMinutos = Math.floor((mediaMs % (1000 * 60 * 60)) / (1000 * 60));
        textoTempoMedio = `${mediaHoras}h ${mediaMinutos}m`;
    }
    
    const elTempoMedio = document.getElementById('kpiTempoMedioOS');
    if (elTempoMedio) elTempoMedio.innerText = textoTempoMedio;

    const porCavalo = {};
    osManutencao.forEach(o => { porCavalo[o.placa] = (porCavalo[o.placa] || 0) + 1; });
    const topCavalos = Object.entries(porCavalo).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    const maxCavaloCount = topCavalos.length > 0 ? topCavalos[0][1] : 1;
    let htmlCavalos = '';
    topCavalos.forEach(([placa, qtd], index) => {
        const percent = (qtd / maxCavaloCount) * 100;
        let color = '#ef4444';
        if (index > 1) color = '#f59e0b';
        if (index > 3) color = 'var(--ccol-blue-bright)';
        
        htmlCavalos += `
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.85rem; color: #e2e8f0;">
                    <strong>${index + 1}º ${placa}</strong>
                    <span>${qtd} O.S.</span>
                </div>
                <div style="background: rgba(255,255,255,0.1); border-radius: 4px; height: 12px; overflow: hidden;">
                    <div style="background: ${color}; width: ${percent}%; height: 100%; border-radius: 4px;"></div>
                </div>
            </div>`;
    });
    const rankingEl = document.getElementById('rankingCavalosOS');
    if(rankingEl) rankingEl.innerHTML = htmlCavalos || '<p>Sem dados.</p>';

    const porTipo = {};
    osManutencao.forEach(o => { porTipo[o.tipo] = (porTipo[o.tipo] || 0) + 1; });
    const listaTipos = Object.entries(porTipo).sort((a, b) => b[1] - a[1]);
    
    let htmlTipos = '<ul style="list-style: none; padding: 0; margin: 0;">';
    listaTipos.forEach(([tipo, qtd]) => {
        const percGlobal = ((qtd / total) * 100).toFixed(1);
        htmlTipos += `
            <li style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; font-size: 0.9rem;">
                <span>${tipo}</span>
                <strong style="color: var(--ccol-blue-bright);">${qtd} <span style="font-size:0.75rem; color:var(--text-secondary);">(${percGlobal}%)</span></strong>
            </li>`;
    });
    htmlTipos += '</ul>';
    const tipoEl = document.getElementById('graficoTipoOS');
    if(tipoEl) tipoEl.innerHTML = htmlTipos;

    const porPrioridade = { 'Urgente': 0, 'Alta': 0, 'Normal': 0, 'Baixa': 0 };
    osManutencao.forEach(o => { if(porPrioridade[o.prioridade] !== undefined) porPrioridade[o.prioridade]++; });
    
    const colors = { 'Urgente': '#ef4444', 'Alta': '#f97316', 'Normal': '#eab308', 'Baixa': 'var(--ccol-green-bright)' };
    
    let htmlPrio = '';
    Object.keys(porPrioridade).forEach(p => {
        const qtd = porPrioridade[p];
        const percent = total > 0 ? (qtd / total) * 100 : 0;
        htmlPrio += `
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.85rem; color: #e2e8f0;">
                    <span>Prioridade <strong>${p}</strong></span>
                    <span>${qtd} ocorrências</span>
                </div>
                <div style="background: rgba(255,255,255,0.1); border-radius: 4px; height: 10px; overflow: hidden;">
                    <div style="background: ${colors[p]}; width: ${percent}%; height: 100%; border-radius: 4px;"></div>
                </div>
            </div>`;
    });
    const prioEl = document.getElementById('graficoPrioridadeOS');
    if(prioEl) prioEl.innerHTML = htmlPrio;

    renderizarRelatorioDM();
}

function renderizarDisponibilidadeMecanica() {
    const tbody = document.getElementById('tabelaDisponibilidade');
    if (!tbody) return;

    let totalCavalos = frotasManutencao.length;
    let manutencao = 0;
    let sinistrados = 0;
    let disponiveis = 0;
    
    const filtroDataInput = document.getElementById('filtroDataDisponibilidade')?.value;
    const isTempoReal = !filtroDataInput; 
    let tituloH4 = document.getElementById('tituloTabelaDisponibilidade');
    
    if (tituloH4) {
        if (isTempoReal) {
            tituloH4.innerHTML = `Situação da Frota (Tempo Real - ${new Date().toLocaleDateString('pt-BR')})`;
        } else {
            const d = new Date(filtroDataInput + 'T12:00:00');
            tituloH4.innerHTML = `Histórico (Retrato do dia ${d.toLocaleDateString('pt-BR')})`;
        }
    }

    let linhasHtml = [];

    frotasManutencao.forEach(frota => {
        let status = 'Disponível';
        let osVinculada = null;
        let dataInicioParadaStr = '-';
        let descricaoMotivo = 'Operacional / Disponível';
        let tempoParadoTexto = '-';
        
        let dataAlvoInicio, dataAlvoFim;

        if (isTempoReal) {
            osVinculada = ordensServico.find(o => o.placa === frota.cavalo && o.status !== 'Concluída' && o.status !== 'Agendada');
            dataAlvoFim = new Date();
        } else {
            const dataFiltroStr = filtroDataInput;
            const fimDoDiaFiltro = new Date(dataFiltroStr + 'T23:59:59');
            dataAlvoFim = fimDoDiaFiltro;

            osVinculada = ordensServico.find(o => {
                if (o.placa !== frota.cavalo) return false;
                if (!o.data_abertura) return false;
                
                let osInicioStr = o.data_abertura;
                if (!osInicioStr.includes('T')) osInicioStr += 'T00:00:00';
                const osInicio = new Date(osInicioStr.replace('Z', '').replace('+00:00', ''));

                if (osInicio > fimDoDiaFiltro) return false;
                if (o.status === 'Agendada' && o.data_conclusao === null) return false; 

                if (o.status === 'Concluída' && o.data_conclusao) {
                    let osFimStr = o.data_conclusao;
                    if (!osFimStr.includes('T')) osFimStr += 'T00:00:00';
                    const osFim = new Date(osFimStr.replace('Z', '').replace('+00:00', ''));
                    if (osFim < fimDoDiaFiltro) return false;
                }

                return true; 
            });
        }

        if (osVinculada) {
            let osInicioStr = osVinculada.data_abertura;
            if (osInicioStr) {
                if (!osInicioStr.includes('T')) osInicioStr += 'T00:00:00';
                dataAlvoInicio = new Date(osInicioStr.replace('Z', '').replace('+00:00', ''));
                dataInicioParadaStr = dataAlvoInicio.toLocaleString('pt-BR');
                
                const diffMs = dataAlvoFim - dataAlvoInicio;
                if (diffMs > 0) {
                    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffMin = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    tempoParadoTexto = `${diffHrs}h ${diffMin}m`;
                }
            }

            if (osVinculada.tipo === 'Sinistro' || osVinculada.status === 'Sinistrado') {
                status = 'Sinistrado';
                sinistrados++;
                descricaoMotivo = `[Sinistro] ${osVinculada.problema || 'Acidente/Avaria grave reportada'}`;
            } else {
                status = 'Oficina';
                manutencao++;
                descricaoMotivo = `[${osVinculada.tipo}] ${osVinculada.problema || 'Manutenção em andamento'}`;
            }
        } else {
            disponiveis++;
        }

        let bgRow = '';
        let statusBadge = `<span style="color: var(--ccol-green-bright); font-weight: bold;">✅ Disponível</span>`;
        if (status === 'Oficina') {
            bgRow = 'background: rgba(245, 158, 11, 0.05);';
            statusBadge = `<span style="color: #f59e0b; font-weight: bold;">🔧 Em Oficina</span>`;
        } else if (status === 'Sinistrado') {
            bgRow = 'background: rgba(239, 68, 68, 0.05);';
            statusBadge = `<span style="color: #ef4444; font-weight: bold;">🚨 Sinistrado</span>`;
        }

        linhasHtml.push({
            statusObj: status,
            html: `
            <tr style="${bgRow}">
                <td style="color: var(--ccol-blue-bright); font-weight: bold; font-size: 1.1rem;">${frota.cavalo}</td>
                <td>${frota.go || '-'}</td>
                <td>${statusBadge}</td>
                <td>${osVinculada ? `#${osVinculada.id}` : '-'}</td>
                <td>${dataInicioParadaStr}</td>
                <td style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${descricaoMotivo}">
                    ${descricaoMotivo}
                </td>
                <td style="color: #ef4444; font-weight: bold;">${tempoParadoTexto}</td>
            </tr>
            `
        });
    });

    linhasHtml.sort((a, b) => {
        const order = { 'Sinistrado': 1, 'Oficina': 2, 'Disponível': 3 };
        return order[a.statusObj] - order[b.statusObj];
    });

    tbody.innerHTML = linhasHtml.map(l => l.html).join('');

    const dmCalc = totalCavalos > 0 ? ((disponiveis / totalCavalos) * 100).toFixed(1) : 0;

    if (document.getElementById('kpiDispTotal')) document.getElementById('kpiDispTotal').innerText = totalCavalos;
    if (document.getElementById('kpiDispDisponiveis')) document.getElementById('kpiDispDisponiveis').innerText = disponiveis;
    if (document.getElementById('kpiDispManutencao')) document.getElementById('kpiDispManutencao').innerText = manutencao;
    if (document.getElementById('kpiDispSinistro')) document.getElementById('kpiDispSinistro').innerText = sinistrados;
    if (document.getElementById('kpiDispTaxa')) {
        const pTaxa = document.getElementById('kpiDispTaxa');
        pTaxa.innerText = dmCalc + '%';
        pTaxa.style.color = dmCalc >= 90 ? 'var(--ccol-green-bright)' : (dmCalc >= 80 ? '#f59e0b' : '#ef4444');
    }
}

function renderizarRelatorioDM() {
    const tbody = document.getElementById('tabelaRelatorioDM');
    if (!tbody) return;

    const filtroValue = document.getElementById('filtroPeriodoDM')?.value || '30';
    const agora = new Date();
    let inicioPeriodo;
    let totalMsPeriodo;
    let diasParaGrafico;

    if (filtroValue === 'mes_atual') {
        inicioPeriodo = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0);
        totalMsPeriodo = agora.getTime() - inicioPeriodo.getTime();
        diasParaGrafico = Math.ceil(totalMsPeriodo / (1000 * 60 * 60 * 24)); 
    } else {
        const dias = parseInt(filtroValue);
        totalMsPeriodo = dias * 24 * 60 * 60 * 1000;
        inicioPeriodo = new Date(agora.getTime() - totalMsPeriodo);
        diasParaGrafico = dias;
    }

    const totalHorasPeriodo = (totalMsPeriodo / (1000 * 60 * 60)).toFixed(1);
    let dmData = [];

    frotasManutencao.forEach(frota => {
        let manutencaoMs = 0;
        let statusAtual = `<span style="color: var(--ccol-green-bright); font-weight: bold;">✅ Disponível</span>`;
        
        const osAberta = ordensServico.find(o => o.placa === frota.cavalo && o.status !== 'Concluída');
        if (osAberta) {
             if (osAberta.tipo === 'Sinistro' || osAberta.status === 'Sinistrado') statusAtual = `<span style="color: #ef4444; font-weight: bold;">🚨 Sinistrado</span>`;
             else if (osAberta.status === 'Agendada') statusAtual = `<span style="color: #8b5cf6; font-weight: bold;">📅 Agendado</span>`;
             else statusAtual = `<span style="color: #f59e0b; font-weight: bold;">🔧 Em Oficina</span>`;
        }

        const todasOSCavalo = ordensServico.filter(o => o.placa === frota.cavalo);

        todasOSCavalo.forEach(os => {
            let osInicioStr = os.data_abertura;
            if (!osInicioStr) return; 

            if (!osInicioStr.includes('T')) osInicioStr += 'T00:00:00';
            const osInicio = new Date(osInicioStr.replace('Z', '').replace('+00:00', ''));
            let osFim = agora; 
            
            if (os.data_conclusao) {
                let osFimStr = os.data_conclusao;
                if (!osFimStr.includes('T')) osFimStr += 'T00:00:00';
                osFim = new Date(osFimStr.replace('Z', '').replace('+00:00', ''));
            }

            const overlapInicio = osInicio > inicioPeriodo ? osInicio : inicioPeriodo;
            const overlapFim = osFim < agora ? osFim : agora;

            if (overlapInicio < overlapFim && os.status !== 'Agendada') { 
                manutencaoMs += (overlapFim - overlapInicio);
            }
        });

        if (manutencaoMs > totalMsPeriodo) manutencaoMs = totalMsPeriodo;

        const disponivelMs = totalMsPeriodo - manutencaoMs;
        const dmPercent = totalMsPeriodo > 0 ? ((disponivelMs / totalMsPeriodo) * 100).toFixed(2) : 100;
        
        const horasManutencao = Math.floor(manutencaoMs / (1000 * 60 * 60));
        const minManutencao = Math.floor((manutencaoMs % (1000 * 60 * 60)) / (1000 * 60));
        
        const horasDisp = Math.floor(disponivelMs / (1000 * 60 * 60));
        const minDisp = Math.floor((disponivelMs % (1000 * 60 * 60)) / (1000 * 60));

        dmData.push({
            cavalo: frota.cavalo,
            totalHoras: `${totalHorasPeriodo}h`,
            manutencaoStr: `${horasManutencao}h ${minManutencao}m`,
            disponivelStr: `${horasDisp}h ${minDisp}m`,
            dm: parseFloat(dmPercent),
            statusAtual
        });
    });

    dmData.sort((a, b) => a.dm - b.dm);

    tbody.innerHTML = dmData.map(item => {
        let colorDM = 'var(--ccol-green-bright)'; 
        if (item.dm < 90) colorDM = '#f59e0b'; 
        if (item.dm < 80) colorDM = '#ef4444'; 

        return `
            <tr style="background: rgba(0,0,0,0.1);">
                <td style="color: var(--ccol-blue-bright); font-weight: bold; font-size: 1.1rem;">${item.cavalo}</td>
                <td style="color: var(--text-secondary);">${item.totalHoras}</td>
                <td style="color: #ef4444; font-weight: bold;">${item.manutencaoStr}</td>
                <td style="color: var(--ccol-green-bright);">${item.disponivelStr}</td>
                <td style="color: ${colorDM}; font-weight: 900; font-size: 1.2rem;">${item.dm}%</td>
                <td>${item.statusAtual}</td>
            </tr>
        `;
    }).join('');
    
    window.dmDataAtualExport = dmData;
    
    // MÁGICA DOS GRÁFICOS: O setTimeout garante que a aba estará aberta na tela antes do ECharts tentar desenhar!
    setTimeout(() => {
        if(typeof window.renderizarGraficoEvolucaoDM === 'function') {
            window.renderizarGraficoEvolucaoDM(filtroValue);
        }
        
        if(typeof window.renderizarGraficoDMOperacional === 'function') {
            const divGrafico = document.getElementById('graficoDmOperacional');
            if (divGrafico) divGrafico.removeAttribute('data-rendered');
            window.renderizarGraficoDMOperacional();
        }
    }, 250);
}

function exportarDisponibilidadeExcel() {
    const tbody = document.getElementById('tabelaDisponibilidade');
    if (!tbody || tbody.rows.length === 0) {
        alert("Não há dados de disponibilidade para exportar.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Placa (Cavalo);GO;Status;OS Vinculada;Inicio Parada;Motivo / Diagnostico;Tempo Indisponivel\n";

    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 7) {
            const linha = [
                `"${cols[0].innerText}"`,
                `"${cols[1].innerText}"`,
                `"${cols[2].innerText.replace('✅ ', '').replace('🔧 ', '').replace('🚨 ', '')}"`,
                `"${cols[3].innerText}"`,
                `"${cols[4].innerText}"`,
                `"${cols[5].innerText}"`,
                `"${cols[6].innerText}"`
            ].join(';');
            csvContent += linha + "\n";
        }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const inputFiltro = document.getElementById('filtroDataDisponibilidade');
    const dataExcel = (inputFiltro && inputFiltro.value) ? inputFiltro.value : new Date().toISOString().split('T')[0];
    
    link.setAttribute("download", `Relatorio_Disponibilidade_${dataExcel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportarRelatorioDMExcel() {
    if (!window.dmDataAtualExport || window.dmDataAtualExport.length === 0) {
        alert("Não há dados de DM para exportar.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Placa Cavalo;Tempo Total Período;Tempo Manutenção;Tempo Disponível;Índice DM (%)\n";

    window.dmDataAtualExport.forEach(item => {
        const linha = [
            item.cavalo,
            item.totalHoras,
            item.manutencaoStr,
            item.disponivelStr,
            item.dm
        ].join(';');
        csvContent += linha + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const select = document.getElementById('filtroPeriodoDM');
    const periodo = select ? select.options[select.selectedIndex].text : 'Relatorio';
    const nomeArquivo = `Relatorio_DM_${periodo.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute("download", nomeArquivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ---------------- FUNÇÕES DO PAINEL TV ----------------

function entrarModoTV() {
    const appLayout = document.getElementById('appLayout');
    const telaTV = document.getElementById('telaPainelTV');
    
    if (appLayout) appLayout.style.display = 'none';
    if (telaTV) telaTV.style.display = 'block';
    
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => console.warn("Fullscreen falhou:", err));
    }

    // Inicia o Relógio da TV
    atualizarRelogioTV();
    if (!window.tvClockInterval) {
        window.tvClockInterval = setInterval(atualizarRelogioTV, 1000);
    }

    // Desenha os cards imediatamente, aguardando 100ms para o DOM liberar a tela
    setTimeout(renderizarCardsTV, 100);

    // Configura a renovação dos dados a cada 15 segundos
    if (tvInterval) clearInterval(tvInterval);
    tvInterval = setInterval(() => {
        if(typeof carregarDadosOS === 'function') {
            carregarDadosOS().then(renderizarCardsTV);
        } else {
            renderizarCardsTV();
        }
    }, 15000);
}

function sairModoTV() {
    const appLayout = document.getElementById('appLayout');
    const telaTV = document.getElementById('telaPainelTV');
    
    if (appLayout) appLayout.style.display = 'flex';
    if (telaTV) telaTV.style.display = 'none';
    
    if (tvInterval) clearInterval(tvInterval);
    if (window.tvClockInterval) {
        clearInterval(window.tvClockInterval);
        window.tvClockInterval = null;
    }

    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.warn(err));
    }
}

function renderizarCardsTV() {
    const container = document.getElementById('tvCardsContainer');
    if (!container) return;

    const osAtivas = ordensServico.filter(o => 
        (o.status === 'Aguardando Oficina' || o.status === 'Em Manutenção') && 
        o.tipo !== 'Sinistro'
    );

    if (osAtivas.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh;">
                <h1 style="color: var(--ccol-green-bright); font-size: 4rem; margin: 0;">PÁTIO VAZIO ✅</h1>
                <p style="color: #94a3b8; font-size: 2rem;">Nenhum veículo aguardando manutenção.</p>
            </div>
        `;
        return;
    }

    osAtivas.sort((a, b) => {
        const pesoPri = { 'Urgente': 4, 'Alta': 3, 'Normal': 2, 'Baixa': 1 };
        const pA = pesoPri[a.prioridade] || 0;
        const pB = pesoPri[b.prioridade] || 0;
        if (pA !== pB) return pB - pA;
        return new Date(a.data_abertura) - new Date(b.data_abertura);
    });

    const agora = new Date();

    container.innerHTML = osAtivas.map(os => {
        let corPrioridade = '#3b82f6'; 
        if (os.prioridade === 'Urgente') corPrioridade = '#ef4444';
        else if (os.prioridade === 'Alta') corPrioridade = '#f97316';
        else if (os.prioridade === 'Baixa') corPrioridade = '#10b981';

        let diffHrs = 0;
        let diffMin = 0;
        
        if (os.data_abertura) {
            const inicio = new Date(os.data_abertura);
            const diffMs = agora - inicio;
            if(diffMs > 0) {
                diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                diffMin = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            }
        }
        
        let colorCronometro = '#fff';
        let alertaClass = '';
        if (diffHrs >= 24) { colorCronometro = '#ef4444'; alertaClass = 'piscar-alerta'; } 
        else if (diffHrs >= 12) { colorCronometro = '#f59e0b'; }

        const frotaVinculada = frotasManutencao.find(f => f.cavalo === os.placa) || {};
        const conjuntosBadge = [frotaVinculada.carreta1, frotaVinculada.carreta2, frotaVinculada.carreta3]
            .filter(Boolean)
            .map(c => `<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.2); margin-right: 5px;">${c}</span>`)
            .join('');

        let avisoPrevisao = '';
        let campoPrevisao = os.previsao_entrega || os.previsao; // Proteção extra para campos
        
        if (campoPrevisao) {
            const dataPrevisao = new Date(campoPrevisao);
            if (agora > dataPrevisao) {
                avisoPrevisao = `<div style="background: #7f1d1d; color: #fca5a5; padding: 5px; text-align: center; font-weight: bold; border-radius: 4px; margin-top: 10px; font-size: 0.9rem;">⚠️ PREVISÃO VENCIDA</div>`;
            } else {
                avisoPrevisao = `<div style="background: rgba(139, 92, 246, 0.2); color: #c4b5fd; padding: 5px; text-align: center; border: 1px solid #8b5cf6; border-radius: 4px; margin-top: 10px; font-size: 0.9rem;">PREVISÃO: ${formatarDataHoraBrasil(campoPrevisao)}</div>`;
            }
        }

        const textoStatus = os.status === 'Em Manutenção' ? '🔧 EM OFICINA' : '⏳ AGUARDANDO ATENDIMENTO';
        const bgStatus = os.status === 'Em Manutenção' ? '#1e3a8a' : '#1e293b'; 
        const borderStatus = os.status === 'Em Manutenção' ? '#3b82f6' : '#475569'; 

        return `
            <div class="${alertaClass}" style="background: ${bgStatus}; border: 3px solid ${borderStatus}; border-radius: 12px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div>
                        <div style="font-size: 1rem; color: #94a3b8; margin-bottom: 5px;">O.S. #${os.id} | ${textoStatus}</div>
                        <div style="font-size: 3rem; font-weight: 900; color: #fff; line-height: 1;">${os.placa}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="background: ${corPrioridade}; color: #fff; font-weight: bold; padding: 5px 15px; border-radius: 20px; font-size: 1.1rem; text-transform: uppercase;">
                            ${os.prioridade}
                        </div>
                    </div>
                </div>
                <div style="margin-bottom: 15px;">${conjuntosBadge}</div>
                <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 15px; margin-bottom: 15px; flex: 1;">
                    <div style="color: #60a5fa; font-weight: bold; font-size: 1.2rem; margin-bottom: 5px;">${os.tipo}</div>
                    <div style="color: #cbd5e1; font-size: 1.1rem;">Motorista: <strong style="color: #fff;">${os.motorista}</strong></div>
                    <div style="color: #94a3b8; font-size: 0.9rem; margin-top: 5px; max-height: 40px; overflow: hidden; text-overflow: ellipsis;">
                        Detalhe: ${os.problema || 'Nenhum detalhe reportado'}
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">
                    <div style="color: #94a3b8; font-size: 1rem;">
                        Entrada: <br><strong style="color: #fff;">${os.data_abertura ? new Date(os.data_abertura).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : '--:--'}</strong>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.9rem; color: #94a3b8;">TEMPO NO PÁTIO</div>
                        <div style="font-size: 2.2rem; font-weight: 900; color: ${colorCronometro}; font-family: monospace;">
                            ${String(diffHrs).padStart(2,'0')}:${String(diffMin).padStart(2,'0')}
                        </div>
                    </div>
                </div>
                ${avisoPrevisao}
            </div>
        `;
    }).join('');
}

function atualizarRelogioTV() {
    const elRelogio = document.getElementById('tvRelogio');
    const elData = document.getElementById('tvData');
    if (!elRelogio || !elData) return;

    const agora = new Date();
    elRelogio.innerText = agora.toLocaleTimeString('pt-BR');
    const opcoesData = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    elData.innerText = agora.toLocaleDateString('pt-BR', opcoesData).toUpperCase();
}