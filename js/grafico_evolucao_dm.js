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

    const categoriasHoras = [];
    const dadosDM = [];
    
    // Arrays para o Novo Gráfico de Status da Frota
    const dadosAtivos = [];
    const dadosManutencao = [];
    const dadosSOS = [];

    // Definindo o total de milissegundos em 1 hora
    const msPorHora = 60 * 60 * 1000;
    const totalFrota = frotasManutencao.length;
    const totalMsDisponivelPorHora = totalFrota * msPorHora;

    // Define até que hora o gráfico deve renderizar
    // Se for o dia de hoje, vai apenas até a hora atual. Se for passado, vai até as 23h.
    let horaLimite = 23;
    if (ehHoje) {
        horaLimite = agora.getHours();
    }

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
                
                let osFim = agora; // Se não tem conclusão, a manutenção vai até "agora"
                if (os.data_conclusao) {
                    let osFimStr = os.data_conclusao;
                    if (!osFimStr.includes('T')) osFimStr += 'T00:00:00';
                    osFim = new Date(osFimStr.replace('Z', '').replace('+00:00', ''));
                }

                // Verifica se o tempo da OS se sobrepõe com a hora que estamos avaliando no loop
                const overlapInicio = osInicio > inicioHora ? osInicio : inicioHora;
                const overlapFim = osFim < fimHora ? osFim : fimHora;

                // Conta o tempo apenas se houver sobreposição e a OS não for apenas agendada
                if (overlapInicio < overlapFim && os.status !== 'Agendada') {
                    manutencaoCavalo += (overlapFim - overlapInicio);
                    
                    // Identifica se a O.S. sobreposta é do tipo SOS ou Rotina/Preventiva
                    const tipoOS = (os.tipo || os.tipo_manutencao || '').toUpperCase();
                    const descOS = (os.descricao || '').toUpperCase();
                    const prioridadeOS = (os.prioridade || '').toUpperCase();

                    // Regra de identificação: se a palavra SOS está envolvida ou Prioridade é Emergência
                    if (tipoOS.includes('SOS') || descOS.includes('SOS') || prioridadeOS.includes('EMERGÊNCIA')) {
                        teveSOS = true;
                    } else {
                        teveManutencaoComum = true;
                    }
                }
            });
            
            // O tempo de manutenção em uma hora não pode ultrapassar o limite de 1 hora (evita bugs de registro de OS)
            if (manutencaoCavalo > msPorHora) manutencaoCavalo = msPorHora;
            msManutencaoNestaHora += manutencaoCavalo;

            // Incrementa as contagens de veículos baseadas no status
            if (teveSOS) {
                qtdEmSOS++;
            } else if (teveManutencaoComum) {
                qtdEmManutencao++;
            }
        });

        // Calcula a disponibilidade real descontando a manutenção em Milissegundos
        let dispNestaHora = totalMsDisponivelPorHora - msManutencaoNestaHora;
        if(dispNestaHora < 0) dispNestaHora = 0;
        
        let percentDM = (dispNestaHora / totalMsDisponivelPorHora) * 100;
        
        // Adiciona a string da hora no eixo X (ex: "08:00") e o percentual no eixo Y
        categoriasHoras.push(`${String(i).padStart(2,'0')}:00`);
        dadosDM.push(percentDM.toFixed(2));

        // Consolida contagem de veículos físicos para o gráfico de Barras
        let qtdAtivos = totalFrota - qtdEmManutencao - qtdEmSOS;
        if (qtdAtivos < 0) qtdAtivos = 0;

        dadosAtivos.push(qtdAtivos);
        dadosManutencao.push(qtdEmManutencao);
        dadosSOS.push(qtdEmSOS);
    }

    // =================================================================
    // 1. RENDERIZA O GRÁFICO EXISTENTE: Evolução da DM em Linha (%)
    // =================================================================
    const chartDom = document.getElementById('graficoEvolucaoDM');
    if (chartDom && typeof echarts !== 'undefined') {
        let myChart = echarts.getInstanceByDom(chartDom);
        if (!myChart) myChart = echarts.init(chartDom);

        const option = {
            tooltip: { trigger: 'axis', formatter: '{b} <br/> DM Geral: {c}%' },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: categoriasHoras,
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
                data: dadosDM,
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

        myChart.setOption(option);
    }

    // =================================================================
    // 2. RENDERIZA O NOVO GRÁFICO: Status da Frota em Barras Verticais
    // =================================================================
    const chartStatusDom = document.getElementById('graficoStatusFrotaHorario');
    if (chartStatusDom && typeof echarts !== 'undefined') {
        let myStatusChart = echarts.getInstanceByDom(chartStatusDom);
        if (!myStatusChart) myStatusChart = echarts.init(chartStatusDom);

        const optionStatus = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' }
            },
            legend: {
                data: ['Disponível', 'Manutenção', 'SOS'],
                textStyle: { color: '#e2e8f0' }
            },
            grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
            xAxis: {
                type: 'category',
                data: categoriasHoras,
                axisLabel: { color: '#94a3b8' }
            },
            yAxis: {
                type: 'value',
                axisLabel: { color: '#94a3b8' },
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
            },
            series: [
                {
                    name: 'Disponível',
                    type: 'bar',
                    data: dadosAtivos,
                    itemStyle: { color: '#10b981' }, // Verde
                    label: { show: true, position: 'top', color: '#10b981', formatter: (p) => p.value > 0 ? p.value : '' }
                },
                {
                    name: 'Manutenção',
                    type: 'bar',
                    data: dadosManutencao,
                    itemStyle: { color: '#f59e0b' }, // Amarelo
                    label: { show: true, position: 'top', color: '#f59e0b', formatter: (p) => p.value > 0 ? p.value : '' }
                },
                {
                    name: 'SOS',
                    type: 'bar',
                    data: dadosSOS,
                    itemStyle: { color: '#ef4444' }, // Vermelho
                    label: { show: true, position: 'top', color: '#ef4444', formatter: (p) => p.value > 0 ? p.value : '' }
                }
            ]
        };

        myStatusChart.setOption(optionStatus);
    }
};