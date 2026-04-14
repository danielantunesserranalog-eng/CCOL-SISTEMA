// ==========================================================================
// MÓDULO: IMPORTAÇÃO E GRÁFICO DE DM OPERACIONAL (EXCEL)
// ==========================================================================

// Função que é disparada quando você seleciona o arquivo Excel
window.processarImportacaoDM = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Altera o texto do botão para dar um feedback visual
    const btn = event.target.nextElementSibling;
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = "⏳ Lendo arquivo...";
    btn.disabled = true;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            // Lê a planilha garantindo que entenda as datas do Excel
            const workbook = XLSX.read(data, {type: 'array', cellDates: true});
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const linhasExcel = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            // Remove a primeira linha (cabeçalho)
            linhasExcel.shift();

            let dadosParaSalvar = [];

            linhasExcel.forEach(row => {
                // Pula linhas vazias
                if (row.length < 3) return;

                let dataValor = row[0];
                let carrosRodaram = parseInt(row[1]);
                let totalFrota = parseInt(row[2]);

                if (isNaN(carrosRodaram) || isNaN(totalFrota)) return;

                // Formatar a data para o padrão do banco (YYYY-MM-DD)
                let dataFormatada = "";
                if (dataValor instanceof Date) {
                    dataFormatada = dataValor.toISOString().split('T')[0];
                } else if (typeof dataValor === 'string') {
                    // Se vier como string "DD/MM/YYYY"
                    const partes = dataValor.split('/');
                    if (partes.length === 3) {
                        dataFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;
                    } else {
                        dataFormatada = dataValor; // tenta enviar como está
                    }
                }

                if (dataFormatada) {
                    dadosParaSalvar.push({
                        data_registro: dataFormatada,
                        carros_rodaram: carrosRodaram,
                        total_frota: totalFrota
                    });
                }
            });

            if (dadosParaSalvar.length === 0) {
                alert("Nenhuma linha válida encontrada. Verifique se as colunas estão na ordem: Data, Rodou, Total.");
                return;
            }

            btn.innerHTML = "☁️ Salvando no Banco...";

            // O comando UPSERT atualiza se a data já existir, ou insere se for nova!
            const { error } = await supabaseClient
                .from('dm_operacional')
                .upsert(dadosParaSalvar, { onConflict: 'data_registro' });

            if (error) throw error;

            alert(`✅ Sucesso! ${dadosParaSalvar.length} dias foram importados/atualizados no sistema.`);
            
            // Recarrega o gráfico se a tela estiver aberta
            const filtroAtual = document.getElementById('filtroPeriodoDM');
            if (filtroAtual && typeof renderizarGraficoOperacionalDM === 'function') {
                renderizarGraficoOperacionalDM(filtroAtual.value);
            }

        } catch (error) {
            console.error("Erro na importação:", error);
            alert("Erro ao processar o Excel. Verifique o formato do arquivo.");
        } finally {
            // Reseta o input e o botão
            event.target.value = '';
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        }
    };
    reader.readAsArrayBuffer(file);
};


// Função para buscar no banco e desenhar o gráfico
window.renderizarGraficoOperacionalDM = async function(filtroValue) {
    const chartDom = document.getElementById('graficoDmOperacional');
    if (!chartDom) return;
    
    if (typeof echarts === 'undefined') return;

    // Calcula as datas de corte baseado no filtro (Igual ao da Oficina)
    const agora = new Date();
    let dataInicio;

    if (filtroValue === 'mes_atual') {
        dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    } else {
        const dias = parseInt(filtroValue || 30);
        dataInicio = new Date(agora.getTime() - (dias * 24 * 60 * 60 * 1000));
    }

    const dataInicioStr = dataInicio.toISOString().split('T')[0];

    // Busca apenas as datas dentro do período selecionado
    const { data: dadosBD, error } = await supabaseClient
        .from('dm_operacional')
        .select('*')
        .gte('data_registro', dataInicioStr)
        .order('data_registro', { ascending: true });

    if (error || !dadosBD || dadosBD.length === 0) {
        let myChart = echarts.getInstanceByDom(chartDom) || echarts.init(chartDom);
        myChart.clear();
        chartDom.innerHTML = "<div style='display:flex; justify-content:center; align-items:center; height:100%; color:#94a3b8; font-weight:bold;'>Ainda não há planilhas importadas para este período.</div>";
        return;
    }

    // Se achou, limpa a mensagem de vazio
    if (chartDom.innerHTML.includes("Ainda não há")) {
        chartDom.innerHTML = "";
    }

    const categoriasDias = [];
    const seriePorcentagem = [];
    const serieDetalhes = []; // Guarda os números reais para mostrar quando passar o mouse

    dadosBD.forEach(reg => {
        // Formata data do banco "YYYY-MM-DD" para "DD/MM"
        const [ano, mes, dia] = reg.data_registro.split('-');
        categoriasDias.push(`${dia}/${mes}`);

        // Calcula a Porcentagem do DM Operacional
        const calcDM = ((reg.carros_rodaram / reg.total_frota) * 100).toFixed(1);
        seriePorcentagem.push(calcDM);
        
        serieDetalhes.push(`Rodaram ${reg.carros_rodaram} de ${reg.total_frota} veículos.`);
    });

    let myChart = echarts.getInstanceByDom(chartDom) || echarts.init(chartDom);

    const option = {
        tooltip: { 
            trigger: 'axis', 
            formatter: function(params) {
                const index = params[0].dataIndex;
                const valor = params[0].value;
                const detalhe = serieDetalhes[index];
                return `<strong style="color: #10b981;">DM Operacional: ${valor}%</strong><br><span style="font-size: 0.85rem; color: #64748b;">${detalhe}</span>`;
            }
        },
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
            name: 'DM Operacional',
            type: 'line',
            data: seriePorcentagem,
            smooth: true,
            
            // Números em cima da linha
            label: {
                show: true,
                position: 'top',
                formatter: '{c}%',
                color: '#e2e8f0',
                fontSize: 11,
                fontWeight: 'bold'
            },
            
            itemStyle: { color: '#10b981' }, // Cor verde para diferenciar da manutenção
            lineStyle: { width: 4 },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(16, 185, 129, 0.4)' },
                    { offset: 1, color: 'rgba(16, 185, 129, 0)' }
                ])
            }
        }]
    };

    myChart.setOption(option, true);
};