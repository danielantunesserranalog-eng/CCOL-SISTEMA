window.renderizarGraficoEvolucaoDM = function(dataFiltro) {
    if (!frotasManutencao || frotasManutencao.length === 0) return;
    
    const agora = new Date();
    let dataBase = new Date(); // Começa assumindo o dia de hoje
    let ehHoje = true;

    // Se o usuário selecionou uma data no filtro do calendário
    if (dataFiltro && dataFiltro !== 'mes_atual' && dataFiltro.length > 5) {
        // Tenta criar a data considerando o timezone local para evitar offset
        const partesData = dataFiltro.split('-');
        if(partesData.length === 3) {
            dataBase = new Date(partesData[0], partesData[1] - 1, partesData[2]);
            // Verifica se a data selecionada é diferente do dia atual
            ehHoje = (dataBase.getDate() === agora.getDate() && 
                      dataBase.getMonth() === agora.getMonth() && 
                      dataBase.getFullYear() === agora.getFullYear());
        }
    } else {
        // Preenche o input date com o dia de hoje caso esteja vazio ao carregar a página
        const inputData = document.getElementById('filtroDataEvolucaoDM');
        if (inputData && !inputData.value) {
            const mesStr = String(agora.getMonth() + 1).padStart(2, '0');
            const diaStr = String(agora.getDate()).padStart(2, '0');
            inputData.value = `${agora.getFullYear()}-${mesStr}-${diaStr}`;
        }
    }

    const labelsX = [];
    const dadosLinhaDM = [];
    
    // Arrays para o Novo Gráfico de Barras
    const dadosBarraAtivos = [];
    const dadosBarraManut = [];
    const dadosBarraSOS = [];

    // Definindo o total de milissegundos em 1 hora
    const msPorHora = 60 * 60 * 1000;
    const totalFrota = frotasManutencao.length;
    const totalMsDisponivelPorHora = totalFrota * msPorHora;

    // Define até que hora o gráfico deve renderizar
    let horaLimite = 23;
    if (ehHoje) {
        horaLimite = agora.getHours();
    }

    // Variáveis para calcular a média do dia
    let somaDM = 0;
    let somaAtivos = 0;
    let somaManut = 0;
    let somaSOS = 0;
    let contagemHoras = 0;

    // Iterar das 00:00 até a hora limite calculada
    for (let i = 0; i <= horaLimite; i++) {
        const inicioHora = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate(), i, 0, 0, 0);
        const fimHora = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate(), i, 59, 59, 999);
        
        let msManutencaoNestaHora = 0;
        let qtdEmManutencao = 0;
        let qtdEmSOS = 0;

        frotasManutencao.forEach(frota => {
            let manutencaoCavalo = 0;
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
                    manutencaoCavalo += (overlapFim - overlapInicio);
                    
                    const tipoOS = (os.tipo || os.tipo_manutencao || '').toUpperCase();
                    const descOS = (os.descricao || '').toUpperCase();
                    const prioridadeOS = (os.prioridade || '').toUpperCase();

                    // LÓGICA CORRIGIDA: Captura S.O.S (com pontos), SOS (sem pontos) e SOCORRO
                    if (
                        tipoOS.includes('S.O.S') || 
                        tipoOS.includes('SOS') || 
                        tipoOS.includes('SOCORRO') ||
                        descOS.includes('S.O.S') || 
                        descOS.includes('SOS') || 
                        descOS.includes('SOCORRO') ||
                        prioridadeOS.includes('EMERGÊNCIA')
                    ) {
                        teveSOS = true;
                    } else {
                        teveManutencaoComum = true;
                    }
                }
            });
            
            if (manutencaoCavalo > msPorHora) manutencaoCavalo = msPorHora;
            msManutencaoNestaHora += manutencaoCavalo;

            // Se o caminhão teve um chamado de S.O.S nesta hora, a prioridade é marcar como SOS.
            if (teveSOS) {
                qtdEmSOS++;
            } else if (teveManutencaoComum) {
                qtdEmManutencao++;
            }
        });

        let dispNestaHora = totalMsDisponivelPorHora - msManutencaoNestaHora;
        if(dispNestaHora < 0) dispNestaHora = 0;
        
        let percentDM = (dispNestaHora / totalMsDisponivelPorHora) * 100;
        
        labelsX.push(`${String(i).padStart(2,'0')}:00`);
        dadosLinhaDM.push(percentDM.toFixed(2));

        let qtdAtivos = totalFrota - qtdEmManutencao - qtdEmSOS;
        if (qtdAtivos < 0) qtdAtivos = 0;

        dadosBarraAtivos.push(qtdAtivos);
        dadosBarraManut.push(qtdEmManutencao);
        dadosBarraSOS.push(qtdEmSOS);

        // Acumula para médias
        somaDM += percentDM;
        somaAtivos += qtdAtivos;
        somaManut += qtdEmManutencao;
        somaSOS += qtdEmSOS;
        contagemHoras++;
    }

    // =======================================================
    // ATUALIZAR OS CARDS DE MÉDIA NO HTML
    // =======================================================
    if (contagemHoras > 0) {
        const mediaDM = (somaDM / contagemHoras).toFixed(1) + '%';
        const mediaAtivos = Math.round(somaAtivos / contagemHoras);
        const mediaManut = Math.round(somaManut / contagemHoras);
        const mediaSOS = Math.round(somaSOS / contagemHoras);

        // Atualiza os painéis principais do topo
        const elAvgDM = document.getElementById('avgDM');
        const elAvgAtivos = document.getElementById('avgAtivos');
        const elAvgManut = document.getElementById('avgManut');
        const elAvgSOS = document.getElementById('avgSOS');
        
        if(elAvgDM) elAvgDM.innerText = mediaDM;
        if(elAvgAtivos) elAvgAtivos.innerText = mediaAtivos;
        if(elAvgManut) elAvgManut.innerText = mediaManut;
        if(elAvgSOS) elAvgSOS.innerText = mediaSOS;

        // Atualiza os novos indicadores internos que criamos hoje junto do gráfico
        const elAvgAtivosInterno = document.getElementById('avgAtivosInterno');
        const elAvgManutInterno = document.getElementById('avgManutInterno');
        const elAvgSOSInterno = document.getElementById('avgSOSInterno');

        if(elAvgAtivosInterno) elAvgAtivosInterno.innerText = mediaAtivos;
        if(elAvgManutInterno) elAvgManutInterno.innerText = mediaManut;
        if(elAvgSOSInterno) elAvgSOSInterno.innerText = mediaSOS;
    }

    if (typeof echarts === 'undefined') {
        console.warn('ECharts não carregado.');
        return;
    }

    // =======================================================
    // RENDERIZAR GRÁFICO 1: LINHA (EVOLUÇÃO DM)
    // =======================================================
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
                axisLabel: { color: '#94a3b8' }
            },
            yAxis: {
                type: 'value',
                min: 0,
                max: 100,
                axisLabel: { formatter: '{value}%', color: '#94a3b8' },
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
            },
            series: [{
                name: 'DM Horário',
                type: 'line',
                data: dadosLinhaDM,
                smooth: true,
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}%',
                    color: '#e2e8f0',
                    fontSize: 11,
                    fontWeight: 'bold'
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

    // =======================================================
    // RENDERIZAR GRÁFICO 2: BARRAS (STATUS DA FROTA)
    // =======================================================
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
                textStyle: { color: '#94a3b8' }, 
                top: 0 
            },
            grid: { 
                top: '15%', left: '3%', right: '3%', bottom: '5%', containLabel: true 
            },
            xAxis: { 
                type: 'category', 
                data: labelsX, 
                axisLabel: { color: '#64748b' } 
            },
            yAxis: { 
                type: 'value', 
                name: 'Quantidade de Veículos',
                nameTextStyle: { color: '#64748b', padding: [0, 0, 0, 50] },
                axisLabel: { color: '#64748b' }, 
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } 
            },
            series: [
                { 
                    name: 'Disponível', 
                    type: 'bar', 
                    itemStyle: { color: '#10b981' }, 
                    data: dadosBarraAtivos,
                    label: { show: true, position: 'top', color: '#10b981', formatter: (p) => p.value > 0 ? p.value : '' }
                },
                { 
                    name: 'Manutenção', 
                    type: 'bar', 
                    itemStyle: { color: '#f59e0b' }, 
                    data: dadosBarraManut,
                    label: { show: true, position: 'top', color: '#f59e0b', formatter: (p) => p.value > 0 ? p.value : '' }
                },
                { 
                    name: 'SOS', 
                    type: 'bar', 
                    itemStyle: { color: '#ef4444' }, 
                    data: dadosBarraSOS,
                    label: { show: true, position: 'top', color: '#ef4444', formatter: (p) => p.value > 0 ? p.value : '' }
                }
            ]
        };

        myChartBarras.setOption(optionBarras);
        window.addEventListener('resize', () => myChartBarras.resize());
    }
};