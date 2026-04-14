window.renderizarGraficoEvolucaoDM = function(filtroValue) {
    if (!frotasManutencao || frotasManutencao.length === 0) return;
    
    const agora = new Date();
    const categoriasDias = [];
    const dadosDM = [];

    const msPorDia = 24 * 60 * 60 * 1000;
    const totalMsDisponivelPorDia = frotasManutencao.length * msPorDia;
    
    let diasARenderizar = 30; // padrão

    // VALIDA QUAL FOI A OPÇÃO ESCOLHIDA NO SELECT
    if (filtroValue === 'mes_atual') {
        const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0);
        const diffMs = agora.getTime() - primeiroDiaMes.getTime();
        diasARenderizar = Math.ceil(diffMs / msPorDia); 
    } else {
        diasARenderizar = parseInt(filtroValue);
    }

    // Iterar do dia mais antigo até hoje
    for (let i = diasARenderizar - 1; i >= 0; i--) {
        const dataDia = new Date(agora.getTime() - (i * msPorDia));
        const inicioDia = new Date(dataDia.getFullYear(), dataDia.getMonth(), dataDia.getDate(), 0, 0, 0);
        const fimDia = new Date(dataDia.getFullYear(), dataDia.getMonth(), dataDia.getDate(), 23, 59, 59, 999);
        
        let msManutencaoNesteDia = 0;

        frotasManutencao.forEach(frota => {
            let manutencaoCavalo = 0;
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

                const overlapInicio = osInicio > inicioDia ? osInicio : inicioDia;
                const overlapFim = osFim < fimDia ? osFim : fimDia;

                if (overlapInicio < overlapFim && os.status !== 'Agendada') {
                    manutencaoCavalo += (overlapFim - overlapInicio);
                }
            });
            
            if (manutencaoCavalo > msPorDia) manutencaoCavalo = msPorDia;
            msManutencaoNesteDia += manutencaoCavalo;
        });

        let dispNesteDia = totalMsDisponivelPorDia - msManutencaoNesteDia;
        if(dispNesteDia < 0) dispNesteDia = 0;
        
        let percentDM = (dispNesteDia / totalMsDisponivelPorDia) * 100;
        
        categoriasDias.push(`${String(dataDia.getDate()).padStart(2,'0')}/${String(dataDia.getMonth()+1).padStart(2,'0')}`);
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
            data: categoriasDias,
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
            name: 'DM Diário',
            type: 'line',
            data: dadosDM,
            smooth: true,
            
            // ---> ADICIONADO: Exibe a porcentagem em cima de cada ponto
            label: {
                show: true,
                position: 'top',
                formatter: '{c}%', // Mostra o valor seguido de %
                color: '#e2e8f0', // Cor clarinha para aparecer bem no fundo escuro
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