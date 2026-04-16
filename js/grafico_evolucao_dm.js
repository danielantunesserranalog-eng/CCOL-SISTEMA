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

    // Definindo o total de milissegundos em 1 hora
    const msPorHora = 60 * 60 * 1000;
    const totalMsDisponivelPorHora = frotasManutencao.length * msPorHora;

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

        frotasManutencao.forEach(frota => {
            let manutencaoCavalo = 0;
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
                }
            });
            
            // O tempo de manutenção em uma hora não pode ultrapassar o limite de 1 hora (evita bugs de registro de OS)
            if (manutencaoCavalo > msPorHora) manutencaoCavalo = msPorHora;
            msManutencaoNestaHora += manutencaoCavalo;
        });

        // Calcula a disponibilidade real descontando a manutenção
        let dispNestaHora = totalMsDisponivelPorHora - msManutencaoNestaHora;
        if(dispNestaHora < 0) dispNestaHora = 0;
        
        let percentDM = (dispNestaHora / totalMsDisponivelPorHora) * 100;
        
        // Adiciona a string da hora no eixo X (ex: "08:00") e o percentual no eixo Y
        categoriasHoras.push(`${String(i).padStart(2,'0')}:00`);
        dadosDM.push(percentDM.toFixed(2));
    }

    const chartDom = document.getElementById('graficoEvolucaoDM');
    if (!chartDom) return;
    
    if (typeof echarts === 'undefined') {
        console.warn('ECharts não carregado.');
        return;
    }
    
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
};