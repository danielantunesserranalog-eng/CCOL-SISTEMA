// =================================================================
// FUNÇÕES DO FILTRO GLOBAL 
// =================================================================
window.getDatasFiltroGlobal = function() {
    const selectFiltro = document.getElementById('filtroGlobalPeriodo');
    const filtro = selectFiltro ? selectFiltro.value : 'mes_atual';
    const hoje = new Date();
    let inicio = new Date(hoje);
    inicio.setHours(0,0,0,0);
    hoje.setHours(23,59,59,999);

    if (filtro === 'dia_atual') {
        // inicio já é hoje às 00:00
    } else if (filtro === 'semana_atual') {
        inicio.setDate(inicio.getDate() - inicio.getDay());
    } else if (filtro === 'mes_atual') {
        inicio.setDate(1);
    } else {
        let d = parseInt(filtro) || 30;
        inicio.setDate(inicio.getDate() - d + 1);
    }
    return { inicio: inicio, fim: hoje, valorBruto: filtro };
};

window.dispararFiltrosGlobais = function() {
    try { if(typeof renderizarGraficoEvolucaoDM === 'function') renderizarGraficoEvolucaoDM(); } catch(e){}
    try { if(typeof renderizarGraficoStatusFrotaHorario === 'function') renderizarGraficoStatusFrotaHorario(); } catch(e){}
    try { if(typeof renderizarGraficoEvolucaoDMDiaria === 'function') renderizarGraficoEvolucaoDMDiaria(); } catch(e){}
    try { if(typeof renderizarGraficoDMOperacional === 'function') renderizarGraficoDMOperacional(); } catch(e){}
    try { if(typeof renderizarDMIndividual === 'function') renderizarDMIndividual(); } catch(e){}
    
    const hiddenFiltroTabela = document.getElementById('filtroPeriodoDM');
    if(hiddenFiltroTabela) {
        let val = document.getElementById('filtroGlobalPeriodo').value;
        if(val === 'dia_atual') val = '1';
        else if(val === 'semana_atual') val = '7'; 
        hiddenFiltroTabela.value = val;
        try { if(typeof renderizarRelatorioDM === 'function') renderizarRelatorioDM(); } catch(e){}
    }
};

// =================================================================
// GRÁFICO 1: EVOLUÇÃO HORÁRIA DA DM (SEMPRE DIA ATUAL)
// =================================================================
window.renderizarGraficoEvolucaoDM = function() {
    try {
        if (!frotasManutencao || frotasManutencao.length === 0) return;
        
        const agora = new Date();
        let dataBase = new Date(); 
        let ehHoje = true;

        const labelsX = [];
        const dadosLinhaDM = [];

        const msPorHora = 60 * 60 * 1000;
        const totalFrota = frotasManutencao.length;
        const totalMsDisponivelPorHora = totalFrota * msPorHora;

        let horaLimite = 23;
        if (ehHoje) {
            horaLimite = agora.getHours();
        }

        // Parte 1: Calcular os pontos do gráfico de linha (hora a hora)
        for (let i = 0; i <= horaLimite; i++) {
            const inicioHora = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate(), i, 0, 0, 0);
            const fimHora = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate(), i, 59, 59, 999);
            
            let msManutencaoNestaHora = 0;

            frotasManutencao.forEach(frota => {
                let manutencaoCavalo = 0;
                const todasOSCavalo = ordensServico.filter(o => o.placa === frota.cavalo && o.status !== 'Agendada');
                
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

                    const overlapInicio = osInicio > inicioHora ? osInicio : inicioHora;
                    const overlapFim = osFim < fimHora ? osFim : fimHora;

                    if (overlapInicio < overlapFim) {
                        manutencaoCavalo += (overlapFim - overlapInicio);
                    }
                });
                
                if (manutencaoCavalo > msPorHora) manutencaoCavalo = msPorHora;
                msManutencaoNestaHora += manutencaoCavalo;
            });

            let dispNestaHora = totalMsDisponivelPorHora - msManutencaoNestaHora;
            if(dispNestaHora < 0) dispNestaHora = 0;
            
            let percentDM = (dispNestaHora / totalMsDisponivelPorHora) * 100;
            labelsX.push(`${String(i).padStart(2,'0')}:00`);
            dadosLinhaDM.push(percentDM.toFixed(2));
        }

        // Parte 2: Calcular a Média exata do dia (em milissegundos) para os KPIs do topo
        let msTotalDiaCalc = 24 * 60 * 60 * 1000;
        let inicioDiaCalc = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate(), 0, 0, 0, 0);
        let fimParaCalculoTotal = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate(), 23, 59, 59, 999);

        if (ehHoje) {
            msTotalDiaCalc = agora - inicioDiaCalc;
            fimParaCalculoTotal = agora;
        }

        if (msTotalDiaCalc > 0) {
            let msManutencaoComumDia = 0;
            let msSOSDia = 0;

            frotasManutencao.forEach(frota => {
                let manutComumCavalo = 0;
                let sosCavalo = 0;
                const todasOSCavalo = ordensServico.filter(o => o.placa === frota.cavalo && o.status !== 'Agendada');
                
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

                    const overlapInicio = osInicio > inicioDiaCalc ? osInicio : inicioDiaCalc;
                    const overlapFim = osFim < fimParaCalculoTotal ? osFim : fimParaCalculoTotal;

                    if (overlapInicio < overlapFim) {
                        const tipoOS = (os.tipo || os.tipo_manutencao || '').toUpperCase();
                        const descOS = (os.descricao || '').toUpperCase();
                        const prioridadeOS = (os.prioridade || '').toUpperCase();

                        if (
                            tipoOS.includes('S.O.S') || tipoOS.includes('SOS') || tipoOS.includes('SOCORRO') ||
                            descOS.includes('S.O.S') || descOS.includes('SOS') || descOS.includes('SOCORRO') ||
                            prioridadeOS.includes('EMERGÊNCIA')
                        ) {
                            sosCavalo += (overlapFim - overlapInicio);
                        } else {
                            manutComumCavalo += (overlapFim - overlapInicio);
                        }
                    }
                });
                
                if (manutComumCavalo + sosCavalo > msTotalDiaCalc) {
                    let proporcao = msTotalDiaCalc / (manutComumCavalo + sosCavalo);
                    manutComumCavalo *= proporcao;
                    sosCavalo *= proporcao;
                }

                msManutencaoComumDia += manutComumCavalo;
                msSOSDia += sosCavalo;
            });

            const totalMsDisponivelDia = totalFrota * msTotalDiaCalc;
            let msManutTotal = msManutencaoComumDia + msSOSDia;
            let dispNoDiaMs = totalMsDisponivelDia - msManutTotal;
            if (dispNoDiaMs < 0) dispNoDiaMs = 0;

            const mediaAtivosReal = Math.round(dispNoDiaMs / msTotalDiaCalc);
            const mediaManutReal = Math.round(msManutencaoComumDia / msTotalDiaCalc);
            const mediaSOSReal = Math.round(msSOSDia / msTotalDiaCalc);
            const percentDMReal = (dispNoDiaMs / totalMsDisponivelDia) * 100;

            const elAvgDM = document.getElementById('avgDM');
            const elAvgAtivos = document.getElementById('avgAtivos');
            const elAvgManut = document.getElementById('avgManut');
            const elAvgSOS = document.getElementById('avgSOS');
            
            if(elAvgDM) elAvgDM.innerText = percentDMReal.toFixed(1) + '%';
            if(elAvgAtivos) elAvgAtivos.innerText = mediaAtivosReal;
            if(elAvgManut) elAvgManut.innerText = mediaManutReal;
            if(elAvgSOS) elAvgSOS.innerText = mediaSOSReal;
        }

        if (typeof echarts === 'undefined') return;

        const chartDomLinha = document.getElementById('graficoEvolucaoDM');
        if (chartDomLinha) {
            let myChartLinha = echarts.getInstanceByDom(chartDomLinha);
            if (!myChartLinha) myChartLinha = echarts.init(chartDomLinha);

            const optionLinha = {
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis', formatter: '{b} <br/> DM Geral: {c}%' },
                grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: labelsX,
                    axisLabel: { color: '#ffffff', fontWeight: 'bold' }
                },
                yAxis: {
                    type: 'value',
                    min: 0,
                    max: 100,
                    axisLabel: { formatter: '{value}%', color: '#ffffff', fontWeight: 'bold' },
                    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
                },
                series: [{
                    name: 'DM Horário',
                    type: 'line',
                    data: dadosLinhaDM,
                    smooth: true,
                    label: {
                        show: true, position: 'top', formatter: '{c}%', color: '#e2e8f0', fontSize: 13, fontWeight: 'bold'
                    },
                    itemStyle: { color: '#3b82f6' },
                    lineStyle: { width: 4 },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(59, 130, 246, 0.4)' },
                            { offset: 1, color: 'rgba(59, 130, 246, 0)' }
                        ])
                    }
                }]
            };

            myChartLinha.setOption(optionLinha);
            window.addEventListener('resize', () => myChartLinha.resize());
        }
    } catch(e) {
        console.error("Erro na DM Evolução Diária:", e);
    }
};

// =================================================================
// GRÁFICO 1.5: STATUS FROTA HORÁRIO (BARRAS - DATA ESPECÍFICA)
// =================================================================
window.renderizarGraficoStatusFrotaHorario = function() {
    try {
        if (!frotasManutencao || frotasManutencao.length === 0) return;
        
        const agora = new Date();
        let dataBase = new Date(); 
        let ehHoje = true;

        const inputData = document.getElementById('filtroDataEspecificaHoraria');
        if (inputData && inputData.value) {
            const partesData = inputData.value.split('-');
            if(partesData.length === 3) {
                dataBase = new Date(partesData[0], partesData[1] - 1, partesData[2]);
                ehHoje = (dataBase.getDate() === agora.getDate() && 
                          dataBase.getMonth() === agora.getMonth() && 
                          dataBase.getFullYear() === agora.getFullYear());
            }
        } else if (inputData && !inputData.value) {
            const mesStr = String(agora.getMonth() + 1).padStart(2, '0');
            const diaStr = String(agora.getDate()).padStart(2, '0');
            inputData.value = `${agora.getFullYear()}-${mesStr}-${diaStr}`;
        }

        const labelsX = [];
        const dadosBarraAtivos = [];
        const dadosBarraManut = [];
        const dadosBarraSOS = [];

        const totalFrota = frotasManutencao.length;
        let horaLimite = 23;
        if (ehHoje) {
            horaLimite = agora.getHours();
        }

        // Parte 1: Gráfico de barras (status discreto por hora)
        for (let i = 0; i <= horaLimite; i++) {
            const inicioHora = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate(), i, 0, 0, 0);
            const fimHora = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate(), i, 59, 59, 999);
            
            let qtdEmManutencao = 0;
            let qtdEmSOS = 0;

            frotasManutencao.forEach(frota => {
                let teveManutencaoComum = false;
                let teveSOS = false;

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

                    const overlapInicio = osInicio > inicioHora ? osInicio : inicioHora;
                    const overlapFim = osFim < fimHora ? osFim : fimHora;

                    if (overlapInicio < overlapFim && os.status !== 'Agendada') {
                        const tipoOS = (os.tipo || os.tipo_manutencao || '').toUpperCase();
                        const descOS = (os.descricao || '').toUpperCase();
                        const prioridadeOS = (os.prioridade || '').toUpperCase();

                        if (
                            tipoOS.includes('S.O.S') || tipoOS.includes('SOS') || tipoOS.includes('SOCORRO') ||
                            descOS.includes('S.O.S') || descOS.includes('SOS') || descOS.includes('SOCORRO') ||
                            prioridadeOS.includes('EMERGÊNCIA')
                        ) {
                            teveSOS = true;
                        } else {
                            teveManutencaoComum = true;
                        }
                    }
                });

                if (teveSOS) {
                    qtdEmSOS++;
                } else if (teveManutencaoComum) {
                    qtdEmManutencao++;
                }
            });

            let qtdAtivos = totalFrota - qtdEmManutencao - qtdEmSOS;
            if (qtdAtivos < 0) qtdAtivos = 0;

            labelsX.push(`${String(i).padStart(2,'0')}:00`);
            dadosBarraAtivos.push(qtdAtivos);
            dadosBarraManut.push(qtdEmManutencao);
            dadosBarraSOS.push(qtdEmSOS);
        }

        // Parte 2: Calcular a Média exata do dia selecionado (para os KPIs internos baterem com a evolução diária)
        let msTotalDiaCalc = 24 * 60 * 60 * 1000;
        let inicioDiaCalc = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate(), 0, 0, 0, 0);
        let fimParaCalculoTotal = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate(), 23, 59, 59, 999);

        if (ehHoje) {
            msTotalDiaCalc = agora - inicioDiaCalc;
            fimParaCalculoTotal = agora;
        }

        if (msTotalDiaCalc > 0) {
            let msManutencaoComumDia = 0;
            let msSOSDia = 0;

            frotasManutencao.forEach(frota => {
                let manutComumCavalo = 0;
                let sosCavalo = 0;
                const todasOSCavalo = ordensServico.filter(o => o.placa === frota.cavalo && o.status !== 'Agendada');
                
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

                    const overlapInicio = osInicio > inicioDiaCalc ? osInicio : inicioDiaCalc;
                    const overlapFim = osFim < fimParaCalculoTotal ? osFim : fimParaCalculoTotal;

                    if (overlapInicio < overlapFim) {
                        const tipoOS = (os.tipo || os.tipo_manutencao || '').toUpperCase();
                        const descOS = (os.descricao || '').toUpperCase();
                        const prioridadeOS = (os.prioridade || '').toUpperCase();

                        if (
                            tipoOS.includes('S.O.S') || tipoOS.includes('SOS') || tipoOS.includes('SOCORRO') ||
                            descOS.includes('S.O.S') || descOS.includes('SOS') || descOS.includes('SOCORRO') ||
                            prioridadeOS.includes('EMERGÊNCIA')
                        ) {
                            sosCavalo += (overlapFim - overlapInicio);
                        } else {
                            manutComumCavalo += (overlapFim - overlapInicio);
                        }
                    }
                });
                
                if (manutComumCavalo + sosCavalo > msTotalDiaCalc) {
                    let proporcao = msTotalDiaCalc / (manutComumCavalo + sosCavalo);
                    manutComumCavalo *= proporcao;
                    sosCavalo *= proporcao;
                }

                msManutencaoComumDia += manutComumCavalo;
                msSOSDia += sosCavalo;
            });

            const totalMsDisponivelDia = totalFrota * msTotalDiaCalc;
            let msManutTotal = msManutencaoComumDia + msSOSDia;
            let dispNoDiaMs = totalMsDisponivelDia - msManutTotal;
            if (dispNoDiaMs < 0) dispNoDiaMs = 0;

            const mediaAtivosReal = Math.round(dispNoDiaMs / msTotalDiaCalc);
            const mediaManutReal = Math.round(msManutencaoComumDia / msTotalDiaCalc);
            const mediaSOSReal = Math.round(msSOSDia / msTotalDiaCalc);

            const elAvgAtivosInterno = document.getElementById('avgAtivosInterno');
            const elAvgManutInterno = document.getElementById('avgManutInterno');
            const elAvgSOSInterno = document.getElementById('avgSOSInterno');

            if(elAvgAtivosInterno) elAvgAtivosInterno.innerText = mediaAtivosReal;
            if(elAvgManutInterno) elAvgManutInterno.innerText = mediaManutReal;
            if(elAvgSOSInterno) elAvgSOSInterno.innerText = mediaSOSReal;
        }

        if (typeof echarts === 'undefined') return;

        const chartDomBarras = document.getElementById('graficoStatusFrotaHorario');
        if (chartDomBarras) {
            let myChartBarras = echarts.getInstanceByDom(chartDomBarras);
            if (!myChartBarras) myChartBarras = echarts.init(chartDomBarras);

            const optionBarras = {
                backgroundColor: 'transparent',
                tooltip: { 
                    trigger: 'axis', 
                    axisPointer: { type: 'shadow' } 
                },
                legend: { 
                    data: ['Disponível', 'Manutenção', 'SOS'], 
                    textStyle: { color: '#ffffff', fontWeight: 'bold' }, 
                    top: 0 
                },
                grid: { 
                    top: '15%', left: '3%', right: '3%', bottom: '5%', containLabel: true 
                },
                xAxis: { 
                    type: 'category', 
                    data: labelsX, 
                    axisLabel: { color: '#ffffff', fontWeight: 'bold' } 
                },
                yAxis: { 
                    type: 'value', 
                    name: 'Quantidade de Veículos',
                    nameTextStyle: { color: '#ffffff', padding: [0, 0, 0, 50], fontWeight: 'bold', fontSize: 13 },
                    axisLabel: { color: '#ffffff', fontWeight: 'bold' }, 
                    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } 
                },
                series: [
                    { 
                        name: 'Disponível', 
                        type: 'bar', 
                        itemStyle: { color: '#10b981' }, 
                        data: dadosBarraAtivos,
                        label: { show: true, position: 'top', color: '#10b981', fontWeight: 'bold', formatter: (p) => p.value > 0 ? p.value : '', fontSize: 12 }
                    },
                    { 
                        name: 'Manutenção', 
                        type: 'bar', 
                        itemStyle: { color: '#f59e0b' }, 
                        data: dadosBarraManut,
                        label: { show: true, position: 'top', color: '#f59e0b', fontWeight: 'bold', formatter: (p) => p.value > 0 ? p.value : '', fontSize: 12 }
                    },
                    { 
                        name: 'SOS', 
                        type: 'bar', 
                        itemStyle: { color: '#ef4444' }, 
                        data: dadosBarraSOS,
                        label: { show: true, position: 'top', color: '#ef4444', fontWeight: 'bold', formatter: (p) => p.value > 0 ? p.value : '', fontSize: 12 }
                    }
                ]
            };

            myChartBarras.setOption(optionBarras);
            window.addEventListener('resize', () => myChartBarras.resize());
        }
    } catch(e) {
        console.error("Erro na DM Status Frota Horário:", e);
    }
};

// =================================================================
// GRÁFICO 2: EVOLUÇÃO DIÁRIA DM (MÉDIA DISPONÍVEL / TOTAL)
// =================================================================
window.renderizarGraficoEvolucaoDMDiaria = function() {
    try {
        if (!frotasManutencao || frotasManutencao.length === 0) return;

        const filtroVal = window.getDatasFiltroGlobal ? window.getDatasFiltroGlobal().valorBruto : 'mes_atual';

        const hoje = new Date();
        hoje.setHours(23, 59, 59, 999);
        
        let dataInicio = new Date(hoje);
        dataInicio.setHours(0, 0, 0, 0);

        if (filtroVal === 'dia_atual') {
            // Mantém apenas hoje
        } else if (filtroVal === 'semana_atual') {
            const diaSemana = dataInicio.getDay(); 
            dataInicio.setDate(dataInicio.getDate() - diaSemana);
        } else if (filtroVal === 'mes_atual') {
            dataInicio.setDate(1); 
        } else if (filtroVal === '7') {
            dataInicio.setDate(dataInicio.getDate() - 6); 
        } else {
            let d = parseInt(filtroVal);
            if(isNaN(d)) d = 30;
            dataInicio.setDate(dataInicio.getDate() - d + 1);
        }

        const labelsDias = [];
        const dadosDMDiaria = [];
        const totalFrota = frotasManutencao.length;

        let atual = new Date(dataInicio);

        while (atual <= hoje) {
            const inicioDia = new Date(atual.getFullYear(), atual.getMonth(), atual.getDate(), 0, 0, 0);
            const fimDia = new Date(atual.getFullYear(), atual.getMonth(), atual.getDate(), 23, 59, 59, 999);
            
            let msTotalDia = 24 * 60 * 60 * 1000;
            let fimParaCalculo = fimDia;

            const ehHoje = (atual.toDateString() === new Date().toDateString());
            if (ehHoje) {
                const agora = new Date();
                msTotalDia = agora - inicioDia;
                fimParaCalculo = agora;
            }

            if (msTotalDia > 0) {
                const totalMsDisponivelDia = totalFrota * msTotalDia;
                let msManutencaoDia = 0;

                frotasManutencao.forEach(frota => {
                    let manutencaoCavalo = 0;
                    const todasOSCavalo = ordensServico.filter(o => o.placa === frota.cavalo && o.status !== 'Agendada');
                    
                    todasOSCavalo.forEach(os => {
                        let osInicioStr = os.data_abertura;
                        if (!osInicioStr) return;
                        if (!osInicioStr.includes('T')) osInicioStr += 'T00:00:00';
                        const osInicio = new Date(osInicioStr.replace('Z', '').replace('+00:00', ''));
                        
                        let osFim = new Date(); 
                        if (os.data_conclusao) {
                            let osFimStr = os.data_conclusao;
                            if (!osFimStr.includes('T')) osFimStr += 'T00:00:00';
                            osFim = new Date(osFimStr.replace('Z', '').replace('+00:00', ''));
                        }

                        const overlapInicio = osInicio > inicioDia ? osInicio : inicioDia;
                        const overlapFim = osFim < fimParaCalculo ? osFim : fimParaCalculo;

                        if (overlapInicio < overlapFim) {
                            manutencaoCavalo += (overlapFim - overlapInicio);
                        }
                    });

                    if (manutencaoCavalo > msTotalDia) manutencaoCavalo = msTotalDia;
                    msManutencaoDia += manutencaoCavalo;
                });

                let dispNoDiaMs = totalMsDisponivelDia - msManutencaoDia;
                if (dispNoDiaMs < 0) dispNoDiaMs = 0;

                let percentDM = (dispNoDiaMs / totalMsDisponivelDia) * 100;
                let mediaCavalosDisp = Math.round(dispNoDiaMs / msTotalDia);

                const diaStr = String(atual.getDate()).padStart(2, '0') + '/' + String(atual.getMonth() + 1).padStart(2, '0');
                labelsDias.push(diaStr);
                
                dadosDMDiaria.push({
                    value: percentDM.toFixed(2),
                    disp: mediaCavalosDisp,
                    total: totalFrota
                });
            }
            
            atual.setDate(atual.getDate() + 1);
        }

        if (typeof echarts === 'undefined') return;

        const chartDom = document.getElementById('graficoEvolucaoDMDiaria');
        if (chartDom) {
            let myChart = echarts.getInstanceByDom(chartDom);
            if (!myChart) myChart = echarts.init(chartDom);

            const option = {
                backgroundColor: 'transparent',
                tooltip: { 
                    trigger: 'axis', 
                    formatter: function (params) {
                        const d = params[0].data;
                        return `<b style="font-size:14px; border-bottom:1px solid #444; padding-bottom:4px; display:block; margin-bottom:4px;">${params[0].name}</b>` +
                               `Média Disponíveis: <span style="color:#10b981; font-weight:bold;">${d.disp}</span> / ${d.total} veículos<br/>` +
                               `Índice DM: <span style="color:#10b981; font-weight:bold;">${d.value}%</span>`;
                    }
                },
                grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: labelsDias,
                    axisLabel: { color: '#ffffff', fontWeight: 'bold' }
                },
                yAxis: {
                    type: 'value',
                    min: 0,
                    max: 100,
                    axisLabel: { formatter: '{value}%', color: '#ffffff', fontWeight: 'bold' },
                    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
                },
                series: [{
                    name: 'Média DM Diária',
                    type: 'line',
                    data: dadosDMDiaria,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 8,
                    label: {
                        show: true,
                        position: 'top',
                        formatter: function (params) {
                            return `${params.data.disp}/${params.data.total}\n(${params.data.value}%)`;
                        },
                        color: '#ffffff',
                        fontSize: 14,
                        fontWeight: '900',
                        align: 'center',
                        lineHeight: 18,
                        textBorderColor: 'rgba(0, 0, 0, 0.8)',
                        textBorderWidth: 3
                    },
                    itemStyle: { color: '#10b981' }, 
                    lineStyle: { width: 4 },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(16, 185, 129, 0.4)' },
                            { offset: 1, color: 'rgba(16, 185, 129, 0)' }
                        ])
                    }
                }]
            };

            myChart.setOption(option);
            window.removeEventListener('resize', myChart.resize);
            window.addEventListener('resize', () => myChart.resize());
        }
    } catch(e) {
        console.error("Erro na DM Evolução Diária Geral:", e);
    }
};

// =================================================================
// INICIALIZAÇÃO E ATUALIZAÇÃO AUTOMÁTICA DOS GRÁFICOS
// =================================================================

// 1. Intervalo para Inicialização "De Cara"
// Verifica se os dados já chegaram antes de marcar o gráfico como renderizado
setInterval(() => {
    // Se as frotas ainda não carregaram do banco, aguarda o próximo ciclo para não travar a renderização
    if (typeof frotasManutencao === 'undefined' || frotasManutencao.length === 0) return;

    const chartDomDiaria = document.getElementById('graficoEvolucaoDMDiaria');
    if (chartDomDiaria && chartDomDiaria.offsetWidth > 0 && !chartDomDiaria.getAttribute('data-rendered')) {
        chartDomDiaria.setAttribute('data-rendered', 'true');
        if (typeof window.renderizarGraficoEvolucaoDMDiaria === 'function') {
            window.renderizarGraficoEvolucaoDMDiaria();
        }
    }
    
    const chartDomBarras = document.getElementById('graficoStatusFrotaHorario');
    if (chartDomBarras && chartDomBarras.offsetWidth > 0 && !chartDomBarras.getAttribute('data-rendered')) {
        chartDomBarras.setAttribute('data-rendered', 'true');
        if (typeof window.renderizarGraficoStatusFrotaHorario === 'function') {
            window.renderizarGraficoStatusFrotaHorario();
        }
    }

    const chartDomLinha = document.getElementById('graficoEvolucaoDM');
    if (chartDomLinha && chartDomLinha.offsetWidth > 0 && !chartDomLinha.getAttribute('data-rendered')) {
        chartDomLinha.setAttribute('data-rendered', 'true');
        if (typeof window.renderizarGraficoEvolucaoDM === 'function') {
            window.renderizarGraficoEvolucaoDM();
        }
    }
}, 1000);

// 2. Intervalo para Atualização de acordo com o "Passar da Hora"
// Roda a cada 60 segundos (60000 ms) para incluir as novas horas no gráfico de barras e linha automaticamente
setInterval(() => {
    const chartDomBarras = document.getElementById('graficoStatusFrotaHorario');
    if (chartDomBarras && chartDomBarras.offsetWidth > 0 && typeof window.renderizarGraficoStatusFrotaHorario === 'function') {
        window.renderizarGraficoStatusFrotaHorario();
    }

    const chartDomLinha = document.getElementById('graficoEvolucaoDM');
    if (chartDomLinha && chartDomLinha.offsetWidth > 0 && typeof window.renderizarGraficoEvolucaoDM === 'function') {
        window.renderizarGraficoEvolucaoDM();
    }
}, 60000);