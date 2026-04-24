// ==================== js/dm_operacional.js ====================

async function processarImportacaoDM(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
        alert("A biblioteca de Excel ainda está carregando. Aguarde alguns segundos e tente novamente.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const registrosParaSalvar = [];
        
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row.length === 0 || !row[0]) continue;

            let dataStr = row[0];
            let rodou = parseInt(row[1]) || 0;
            let total = parseInt(row[2]) || 0;
            let dataFormatada = null;

            if (typeof dataStr === 'number') {
                const dateObj = new Date((dataStr - 25569) * 86400 * 1000);
                const d = dateObj.getUTCDate();
                const m = dateObj.getUTCMonth() + 1;
                const y = dateObj.getUTCFullYear();
                dataFormatada = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            } else if (typeof dataStr === 'string') {
                const strTratada = dataStr.trim().replace(/-/g, '/');
                const partes = strTratada.split('/');
                if (partes.length >= 3) {
                    let ano = partes[2].substring(0, 4);
                    if (ano.length === 2) ano = '20' + ano;
                    dataFormatada = `${ano}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
                }
            }

            if (dataFormatada && dataFormatada.length === 10 && dataFormatada.startsWith('20')) {
                registrosParaSalvar.push({
                    data_registro: dataFormatada,
                    carros_rodaram: rodou,
                    total_frota: total
                });
            }
        }

        if (registrosParaSalvar.length === 0) {
            alert("Nenhum dado válido encontrado. O padrão é: Data (DD/MM/AAAA) | Rodaram | Total.");
            document.getElementById('uploadDMExcel').value = "";
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('dm_operacional')
                .upsert(registrosParaSalvar, { onConflict: 'data_registro' });

            if (error) throw error;
            
            alert(`✅ Sucesso! ${registrosParaSalvar.length} dias atualizados/importados.`);
            
            const chartDiv = document.getElementById('graficoDmOperacional');
            if (chartDiv) chartDiv.removeAttribute('data-rendered');
            window.renderizarGraficoDMOperacional();
            
        } catch (error) {
            console.error("Erro na importação:", error);
            alert("Erro ao salvar no banco. Motivo: " + error.message);
        }
        
        document.getElementById('uploadDMExcel').value = "";
    };
    reader.readAsArrayBuffer(file);
}

window.renderizarGraficoDMOperacional = async function() {
    const divGrafico = document.getElementById('graficoDmOperacional');
    if (!divGrafico || divGrafico.offsetWidth === 0) return;

    let filtroPeriodo = 'mes_atual';
    if (window.getDatasFiltroGlobal) {
        filtroPeriodo = window.getDatasFiltroGlobal().valorBruto;
    }

    const hoje = new Date();
    let dataStrCorte = '';

    if (filtroPeriodo === 'mes_atual') {
        const y = hoje.getFullYear();
        const m = String(hoje.getMonth() + 1).padStart(2, '0');
        dataStrCorte = `${y}-${m}-01`;
    } else if (filtroPeriodo === 'semana_atual') {
        const d = new Date(hoje);
        d.setDate(d.getDate() - d.getDay());
        dataStrCorte = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } else if (filtroPeriodo === 'dia_atual') {
        dataStrCorte = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    } else {
        const dias = parseInt(filtroPeriodo) || 30;
        const dataPassada = new Date(hoje.getTime() - (dias * 24 * 60 * 60 * 1000));
        dataStrCorte = `${dataPassada.getFullYear()}-${String(dataPassada.getMonth() + 1).padStart(2, '0')}-${String(dataPassada.getDate()).padStart(2, '0')}`;
    }

    try {
        const { data, error } = await supabaseClient
            .from('dm_operacional')
            .select('*')
            .gte('data_registro', dataStrCorte)
            .order('data_registro', { ascending: false });

        if (error) {
            divGrafico.innerHTML = `<div style="color:#ef4444; display:flex; justify-content:center; align-items:center; height:100%; font-weight:bold; text-align:center; padding: 20px;">🚨 Erro ao ler banco de dados: ${error.message}</div>`;
            return;
        }

        if (typeof echarts !== 'undefined') {
            let chartExistente = echarts.getInstanceByDom(divGrafico);
            if (chartExistente) chartExistente.dispose();
        }

        if (!data || data.length === 0) {
            divGrafico.innerHTML = `<div style="color:#94a3b8; display:flex; justify-content:center; align-items:center; height:100%; border: 1px dashed rgba(255,255,255,0.1); border-radius: 8px; text-align:center; padding: 20px;">📂 Nenhum dado operacional encontrado neste período.</div>`;
            return;
        }

        divGrafico.innerHTML = '';
        const dadosOrdenados = data.reverse();

        const eixoXDias = [];
        const seriesData = [];

        dadosOrdenados.forEach(reg => {
            const partes = reg.data_registro.split('-');
            const formatada = `${partes[2]}/${partes[1]}`;
            eixoXDias.push(formatada);
            
            let pct = 0;
            if (reg.total_frota > 0) {
                pct = (reg.carros_rodaram / reg.total_frota) * 100;
            }
            
            seriesData.push({
                value: pct.toFixed(1),
                rodaram: reg.carros_rodaram,
                total: reg.total_frota
            });
        });

        if (typeof echarts === 'undefined') return;

        const chart = echarts.init(divGrafico);
        const option = {
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(0,0,0,0.85)',
                borderColor: '#10b981',
                textStyle: { color: '#fff' },
                formatter: function (params) {
                    const d = params[0].data;
                    return `<div style="font-weight:bold; margin-bottom:5px; border-bottom:1px solid #444;">Data: ${params[0].name}</div>` +
                           `<span style="color:#10b981;">●</span> DM Operacional: <b>${d.value}%</b><br/>` +
                           `<span style="color:#38bdf8;">●</span> Rodando: <b>${d.rodaram}</b> cam.<br/>` +
                           `<span style="color:#94a3b8;">●</span> Frota Total: <b>${d.total}</b> cam.`;
                }
            },
            grid: { left: '3%', right: '4%', bottom: '5%', containLabel: true },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: eixoXDias,
                axisLabel: { color: '#94a3b8' },
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
            },
            yAxis: {
                type: 'value',
                min: 0,
                max: 100,
                axisLabel: { color: '#94a3b8', formatter: '{value}%' },
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } }
            },
            series: [{
                name: 'DM Operacional',
                type: 'line',
                data: seriesData,
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                label: {
                    show: true,
                    position: 'top',
                    color: '#ffffff',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    fontWeight: 800,
                    textBorderColor: 'rgba(0, 0, 0, 0.8)',
                    textBorderWidth: 2.5,
                    formatter: function (params) {
                        return params.data.value + '%\n(' + params.data.rodaram + ' / ' + params.data.total + ')';
                    },
                    lineHeight: 16,
                    align: 'center'
                },
                itemStyle: { color: '#10b981' },
                lineStyle: { color: '#10b981', width: 3 },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(16, 185, 129, 0.4)' },
                        { offset: 1, color: 'rgba(16, 185, 129, 0.0)' }
                    ])
                }
            }]
        };

        chart.setOption(option);
        window.removeEventListener('resize', chart.resize); 
        window.addEventListener('resize', () => chart.resize());
    } catch (err) {
        console.error("Erro interno do gráfico", err);
    }
}

// ==================== DM INDIVIDUAL POR FROTA ====================

window.popularSelectPlacasDMInd = function() {
    const select = document.getElementById('filtroPlacaDMInd');
    if (!select) return;
    
    const currentVal = select.value;
    let pOptions = '<option value="">Selecione um Veículo...</option>';
    
    if (typeof frotasManutencao !== 'undefined' && frotasManutencao.length > 0) {
        const placas = [...new Set(frotasManutencao.map(f => f.cavalo))].filter(Boolean).sort();
        placas.forEach(p => {
            pOptions += `<option value="${p}">${p}</option>`;
        });
    } else if (typeof ordensServico !== 'undefined' && ordensServico.length > 0) {
        const placas = [...new Set(ordensServico.map(o => o.placa))].filter(Boolean).sort();
        placas.forEach(p => {
            pOptions += `<option value="${p}">${p}</option>`;
        });
    }
    
    select.innerHTML = pOptions;
    if (currentVal) select.value = currentVal;
};

window.renderizarDMIndividual = function() {
    try {
        const placa = document.getElementById('filtroPlacaDMInd').value;
        const divGrafico = document.getElementById('graficoDmIndividual');

        if (!placa || !divGrafico) return;

        let dataInicio, dataFim;
        
        const inputInicio = document.getElementById('dataInicioDMInd');
        const inputFim = document.getElementById('dataFimDMInd');
        let usouFiltroEspecifico = false;

        // Trata o caso do usuário ter selecionado pelo menos uma das datas
        if ((inputInicio && inputInicio.value) || (inputFim && inputFim.value)) {
            usouFiltroEspecifico = true;
            
            if (inputInicio && inputInicio.value) {
                const partesIni = inputInicio.value.split('-');
                dataInicio = new Date(partesIni[0], partesIni[1] - 1, partesIni[2], 0, 0, 0, 0);
            } else {
                dataInicio = new Date();
                dataInicio.setDate(dataInicio.getDate() - 30);
                dataInicio.setHours(0,0,0,0);
            }
            
            if (inputFim && inputFim.value) {
                const partesFim = inputFim.value.split('-');
                dataFim = new Date(partesFim[0], partesFim[1] - 1, partesFim[2], 23, 59, 59, 999);
            } else {
                dataFim = new Date();
                dataFim.setHours(23, 59, 59, 999);
            }
        } 
        
        // Se as datas específicas estiverem vazias, usa o Filtro Global
        if (!usouFiltroEspecifico) {
            if (window.getDatasFiltroGlobal) {
                const datas = window.getDatasFiltroGlobal();
                dataInicio = datas.inicio;
                dataFim = datas.fim;
            } else {
                dataFim = new Date();
                dataInicio = new Date();
                dataInicio.setDate(dataInicio.getDate() - 30);
            }
        }

        const hoje = new Date();

        if (dataInicio > dataFim) {
            // Evita erro ao preencher invertido
            const temp = dataInicio;
            dataInicio = dataFim;
            dataFim = temp;
        }

        const diasArray = [];
        const dmArray = [];
        
        let atual = new Date(dataInicio);
        while (atual <= dataFim) {
            if (atual > hoje && atual.toDateString() !== hoje.toDateString()) break;

            const diaInicio = new Date(atual.getFullYear(), atual.getMonth(), atual.getDate(), 0, 0, 0, 0);
            const diaFim = new Date(atual.getFullYear(), atual.getMonth(), atual.getDate(), 23, 59, 59, 999);
            
            let msTotalDia = 24 * 60 * 60 * 1000;
            let fimParaCalculo = diaFim;

            const ehHoje = atual.toDateString() === hoje.toDateString();
            if (ehHoje) {
                msTotalDia = hoje - diaInicio;
                fimParaCalculo = hoje;
            }

            let msManutencao = 0;
            const osDoVeiculo = ordensServico.filter(o => o.placa === placa && o.status !== 'Agendada');
            
            osDoVeiculo.forEach(os => {
                let osInicioStr = os.data_abertura;
                if (!osInicioStr) return;
                if (!osInicioStr.includes('T')) osInicioStr += 'T00:00:00';
                const osInicio = new Date(osInicioStr.replace('Z', '').replace('+00:00', ''));
                
                let osFimObj = hoje; 
                if (os.data_conclusao) {
                    let osFimStr = os.data_conclusao;
                    if (!osFimStr.includes('T')) osFimStr += 'T00:00:00';
                    osFimObj = new Date(osFimStr.replace('Z', '').replace('+00:00', ''));
                }

                const overlapInicio = osInicio > diaInicio ? osInicio : diaInicio;
                const overlapFim = osFimObj < fimParaCalculo ? osFimObj : fimParaCalculo;

                if (overlapInicio < overlapFim) {
                    msManutencao += (overlapFim - overlapInicio);
                }
            });

            if (msManutencao > msTotalDia) msManutencao = msTotalDia;
            
            const dmDia = msTotalDia > 0 ? ((msTotalDia - msManutencao) / msTotalDia) * 100 : 0;
            
            const labelDia = `${String(atual.getDate()).padStart(2, '0')}/${String(atual.getMonth() + 1).padStart(2, '0')}`;
            diasArray.push(labelDia);
            dmArray.push(dmDia.toFixed(1));
            
            atual.setDate(atual.getDate() + 1);
        }

        if (typeof echarts === 'undefined') return;

        let chart = echarts.getInstanceByDom(divGrafico);
        if (chart) chart.dispose();
        chart = echarts.init(divGrafico);

        const option = {
            tooltip: { 
                trigger: 'axis', 
                backgroundColor: 'rgba(0,0,0,0.85)',
                borderColor: '#a855f7',
                textStyle: { color: '#fff' },
                formatter: '{b} <br/> <span style="color:#a855f7;">●</span> DM do Veículo: <b>{c}%</b>' 
            },
            grid: { left: '3%', right: '4%', bottom: '5%', containLabel: true },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: diasArray,
                axisLabel: { color: '#94a3b8' },
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
            },
            yAxis: {
                type: 'value',
                min: 0,
                max: 100,
                axisLabel: { formatter: '{value}%', color: '#94a3b8' },
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } }
            },
            series: [{
                name: 'DM Individual',
                type: 'line',
                data: dmArray,
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                label: {
                    show: true, position: 'top', color: '#ffffff', fontWeight: 'bold', formatter: '{c}%'
                },
                itemStyle: { color: '#a855f7' },
                lineStyle: { width: 3, color: '#a855f7' },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(168, 85, 247, 0.4)' },
                        { offset: 1, color: 'rgba(168, 85, 247, 0)' }
                    ])
                }
            }]
        };

        chart.setOption(option);
        window.removeEventListener('resize', chart.resize); 
        window.addEventListener('resize', () => chart.resize());
    } catch(e) {
        console.error("Erro ao renderizar DM Individual:", e);
    }
};

window.exportarDMIndividualExcel = function() {
    const placa = document.getElementById('filtroPlacaDMInd').value;
    if (!placa) {
        alert("Selecione um veículo primeiro.");
        return;
    }

    const chart = echarts.getInstanceByDom(document.getElementById('graficoDmIndividual'));
    if (!chart) return;

    const option = chart.getOption();
    const datas = option.xAxis[0].data;
    const valores = option.series[0].data;

    const rows = [["Data", "Placa", "Disponibilidade Mecânica (%)"]];
    datas.forEach((d, i) => {
        rows.push([d, placa, valores[i]]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DM Individual");
    XLSX.writeFile(workbook, `DM_Individual_${placa}_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
};

setInterval(() => {
    const divGrafico = document.getElementById('graficoDmOperacional');
    if (divGrafico && divGrafico.offsetWidth > 0 && !divGrafico.getAttribute('data-rendered')) {
        divGrafico.setAttribute('data-rendered', 'true');
        window.renderizarGraficoDMOperacional();
    }

    const selectPlaca = document.getElementById('filtroPlacaDMInd');
    if (selectPlaca && !selectPlaca.getAttribute('data-populated')) {
        selectPlaca.setAttribute('data-populated', 'true');
        window.popularSelectPlacasDMInd();
    }
}, 1000);